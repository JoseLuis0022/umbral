import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArchivoCompartido, ItemProceso } from '../types';
import { enviarMensaje, type OpcionesEnvio, type ResultadoEnvio } from '../services/chat.service';
import { describirActividad } from '../lib/actividad';
import { useReducedMotion } from '../lib/useReducedMotion';
import { chat as copyChat } from '../copy';

export type EstadoStream = 'inactivo' | 'esperando' | 'transmitiendo' | 'error';

/** Lo que necesita una petición; los callbacks los pone el hook. */
export type PeticionStream = Pick<
  OpcionesEnvio,
  'mensajes' | 'conversacionId' | 'perfil' | 'adjuntos' | 'imagenes' | 'documentos' | 'parametros'
>;

/*
 * Ritmo de revelado. La red llega a ráfagas (varios tokens juntos, y luego
 * segundos de silencio mientras el agente usa herramientas); si el texto se
 * pintara tal como llega, se vería a trompicones. El revelador separa las dos
 * cosas: la red llena un buffer y un bucle de rAF lo va mostrando.
 *
 *  - VACIADO_MS: el atraso se intenta vaciar en este tiempo. Con mucho texto
 *    pendiente, acelera; con poco, va al mínimo y se lee como escritura.
 *  - Siempre corta en el final de una palabra: nunca aparece media palabra.
 *  - Sin atraso, el bucle se APAGA (no gasta CPU mientras el agente trabaja) y
 *    se vuelve a encender con el siguiente fragmento.
 *
 * Son puntos de partida ajustables, no valores de ninguna fuente.
 */
const VACIADO_MS = 250;
const MIN_CPS = 45;
const MAX_CPS = 2400;
/** Si al terminar quedan más de estos caracteres sin mostrar, se muestran de golpe. */
const SALTO_FINAL = 4000;
/** Tope de espera al terminar: el usuario nunca espera más que esto por la animación. */
const ESPERA_FINAL_MAX_MS = 1200;

function cortarEnPalabra(texto: string, hasta: number): number {
  if (hasta >= texto.length) return texto.length;
  const espacio = texto.slice(hasta).search(/\s/);
  // Palabras larguísimas (una URL) no deben congelar el revelado.
  return espacio === -1 || espacio > 24 ? hasta : hasta + espacio;
}

/**
 * Envoltura de React sobre `chat.service`. Aísla lo que la pantalla no debería
 * resolver:
 *
 *  - **El ritmo del texto** (revelador de arriba): un `setState` por frame como
 *    máximo, del tamaño de lo nuevo, no de la respuesta entera.
 *  - **La carrera entre transmisiones**: si llega un envío nuevo mientras el
 *    anterior sigue vivo, el viejo se aborta y ya no toca el estado.
 *  - **El desmontaje a media transmisión**: cambiar de pantalla aborta.
 *  - **La espera mientras el agente busca**: `actividad` dice en una frase qué
 *    está haciendo, y `proceso` arma la línea de tiempo (razonamiento y pasos,
 *    en orden) para el panel "Proceso".
 */
export type ResultadoStream = ResultadoEnvio & { proceso: ItemProceso[] };

export function useStreamingChat() {
  const [textoParcial, setTextoParcial] = useState('');
  const [proceso, setProceso] = useState<ItemProceso[]>([]);
  const [estado, setEstado] = useState<EstadoStream>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);
  // Archivos que mandó el agente: se pintan en cuanto llegan, no al final.
  const [archivos, setArchivos] = useState<ArchivoCompartido[]>([]);
  const reducido = useReducedMotion();

  const control = useRef<AbortController | null>(null);
  const montado = useRef(true);

  // Revelador
  const objetivo = useRef('');
  const mostrado = useRef(0);
  const acumuladorCps = useRef(0);
  const ultimoFrame = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const alVaciar = useRef<(() => void) | null>(null);
  const reducidoRef = useRef(reducido);
  reducidoRef.current = reducido;

  // Proceso: sin ritmo artificial, un volcado por frame basta.
  const procesoRef = useRef<ItemProceso[]>([]);
  const frameProceso = useRef<number | null>(null);

  const detenerBucle = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    ultimoFrame.current = null;
  };

  const paso = useCallback((ahora: number) => {
    frame.current = null;
    const total = objetivo.current.length;
    const previo = ultimoFrame.current ?? ahora - 16;
    ultimoFrame.current = ahora;

    if (mostrado.current < total) {
      // Pestaña oculta o movimiento reducido: no hay a quién animarle.
      if (document.hidden || reducidoRef.current) {
        mostrado.current = total;
      } else {
        const atraso = total - mostrado.current;
        const cps = Math.min(MAX_CPS, Math.max(MIN_CPS, atraso / (VACIADO_MS / 1000)));
        acumuladorCps.current += (cps * Math.min(ahora - previo, 64)) / 1000;
        const avance = Math.floor(acumuladorCps.current);
        if (avance > 0) {
          acumuladorCps.current -= avance;
          mostrado.current = cortarEnPalabra(objetivo.current, mostrado.current + avance);
        }
      }
      setTextoParcial(objetivo.current.slice(0, mostrado.current));
    }

    if (mostrado.current >= objetivo.current.length) {
      ultimoFrame.current = null;
      const fin = alVaciar.current;
      alVaciar.current = null;
      fin?.();
      return; // sin atraso: el bucle se apaga hasta el próximo fragmento
    }
    frame.current = requestAnimationFrame(paso);
  }, []);

  const encenderBucle = useCallback(() => {
    if (frame.current === null) frame.current = requestAnimationFrame(paso);
  }, [paso]);

  /** Resuelve cuando ya se mostró todo lo recibido (o al agotar la espera). */
  const esperarVaciado = useCallback((): Promise<void> => {
    if (objetivo.current.length - mostrado.current > SALTO_FINAL) mostrado.current = objetivo.current.length;
    if (mostrado.current >= objetivo.current.length) return Promise.resolve();
    return new Promise((resolver) => {
      const tope = setTimeout(() => {
        mostrado.current = objetivo.current.length;
        alVaciar.current = null;
        resolver();
      }, ESPERA_FINAL_MAX_MS);
      alVaciar.current = () => {
        clearTimeout(tope);
        resolver();
      };
      encenderBucle();
    });
  }, [encenderBucle]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      control.current?.abort();
      detenerBucle();
      if (frameProceso.current !== null) cancelAnimationFrame(frameProceso.current);
    };
  }, []);

  const reiniciarBuffers = () => {
    detenerBucle();
    objetivo.current = '';
    mostrado.current = 0;
    acumuladorCps.current = 0;
    alVaciar.current = null;
    procesoRef.current = [];
  };

  const volcarProceso = () => {
    if (frameProceso.current !== null) return;
    frameProceso.current = requestAnimationFrame(() => {
      frameProceso.current = null;
      setProceso(procesoRef.current);
    });
  };

  const iniciar = useCallback(
    async (peticion: PeticionStream): Promise<ResultadoStream> => {
      control.current?.abort();
      const propio = new AbortController();
      control.current = propio;

      reiniciarBuffers();
      setTextoParcial('');
      setProceso([]);
      setArchivos([]);
      setError(null);
      setActividad(null);
      setEstado('esperando');

      const vigente = () => montado.current && control.current === propio;
      // Mientras algo se reintenta, la frase de estado lo dice; con lo primero
      // que llegue de verdad (paso, razonamiento o texto), se retira.
      let reintentando = false;
      const salirDeReintento = () => {
        if (!reintentando) return;
        reintentando = false;
        setActividad(null);
      };

      const resultado = await enviarMensaje({
        ...peticion,
        senal: propio.signal,
        alReintento: (r) => {
          if (!vigente()) return;
          reintentando = true;
          setActividad(copyChat.reintentando(r.motivo, r.intento, r.maximo));
          if (r.capa === 'agente') {
            // La consulta vuelve a empezar: los pasos del intento roto se borran.
            procesoRef.current = [];
            volcarProceso();
          }
        },
        alActividad: (a) => {
          if (!vigente()) return;
          salirDeReintento();
          const lista = procesoRef.current;
          if (a.fase === 'inicio') {
            // Se anuncia lo que EMPIEZA; la frase se queda hasta que empiece otra cosa.
            setActividad(describirActividad(a));
            procesoRef.current = [
              ...lista,
              {
                tipo: 'paso',
                id: a.id,
                clase: a.clase,
                nombre: a.nombre,
                descripcion: a.descripcion,
                detalle: a.detalle,
                estado: 'trabajando',
                dentroDe: a.dentroDe,
              },
            ];
          } else {
            procesoRef.current = lista.map((item) =>
              item.tipo === 'paso' && item.id === a.id ? { ...item, estado: a.ok === false ? 'fallo' : 'listo' } : item
            );
          }
          volcarProceso();
        },
        alArchivo: (archivo) => {
          if (!vigente()) return;
          setArchivos((previos) => [...previos, archivo]);
        },
        alPensamiento: (fragmento) => {
          if (!vigente()) return;
          salirDeReintento();
          // Pensamiento que sigue a otro se pega; si hubo un paso en medio,
          // abre un bloque nuevo: la línea de tiempo respeta el orden real.
          const lista = procesoRef.current;
          const ultimo = lista[lista.length - 1];
          procesoRef.current =
            ultimo?.tipo === 'pensamiento'
              ? [...lista.slice(0, -1), { tipo: 'pensamiento', texto: ultimo.texto + fragmento }]
              : [...lista, { tipo: 'pensamiento', texto: fragmento }];
          volcarProceso();
        },
        alFragmento: (_fragmento, acumulado) => {
          if (!vigente()) return;
          salirDeReintento();
          objetivo.current = acumulado;
          encenderBucle();
          // Sale de "esperando" con el primer fragmento: es lo que retira los
          // skeletons. A partir del segundo, React descarta el mismo valor.
          setEstado((previo) => (previo === 'esperando' ? 'transmitiendo' : previo));
        },
      });

      // Antes de confirmar el mensaje, se deja terminar de "escribir" lo que ya
      // llegó: si no, el último párrafo aparecería de golpe.
      if (vigente() && resultado.estado !== 'cancelado') await esperarVaciado();

      // Un paso que se quedó "trabajando" es uno cuyo fin nunca llegó (se
      // cortó la transmisión): se cierra para no dejar un spinner eterno.
      const proceso = procesoRef.current.map((item) =>
        item.tipo === 'paso' && item.estado === 'trabajando' ? { ...item, estado: 'listo' as const } : item
      );
      if (!vigente()) return { ...resultado, proceso };

      detenerBucle();
      control.current = null;
      setTextoParcial(resultado.texto);
      setProceso(proceso);
      setError(resultado.error?.message ?? null);
      setActividad(null);
      setEstado(resultado.estado === 'error' ? 'error' : 'inactivo');
      return { ...resultado, proceso };
    },
    [encenderBucle, esperarVaciado]
  );

  /** Botón Detener. Lo transmitido hasta el corte se conserva. */
  const detener = useCallback(() => {
    control.current?.abort();
  }, []);

  /** Se llama al confirmar el mensaje en la conversación, para vaciar el borrador vivo. */
  const limpiar = useCallback(() => {
    reiniciarBuffers();
    setTextoParcial('');
    setProceso([]);
    setArchivos([]);
    setError(null);
    setActividad(null);
    setEstado('inactivo');
  }, []);

  return {
    textoParcial,
    proceso,
    archivos,
    estado,
    error,
    actividad,
    activo: estado === 'esperando' || estado === 'transmitiendo',
    iniciar,
    detener,
    limpiar,
  };
}
