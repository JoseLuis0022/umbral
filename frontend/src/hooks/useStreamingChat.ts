import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensaje, type OpcionesEnvio, type ResultadoEnvio } from '../services/chat.service';

export type EstadoStream = 'inactivo' | 'esperando' | 'transmitiendo' | 'error';

/** Lo que necesita una petición; los callbacks los pone el hook. */
export type PeticionStream = Pick<OpcionesEnvio, 'mensajes' | 'conversacionId' | 'usuario' | 'adjuntos'>;

/**
 * Envoltura de React sobre `chat.service`. Aísla tres cosas que la pantalla no
 * debería resolver:
 *
 *  - **El coste de repintar por token.** Un `setState` por fragmento con
 *    retardos de 15 ms dispara ~66 renders por segundo de un hilo que ya tiene
 *    markdown, tablas y bloques de código dentro. Los fragmentos se acumulan en
 *    un ref y se vuelcan una vez por frame con `requestAnimationFrame`: el
 *    texto se ve idéntico y el presupuesto de frame se respeta.
 *
 *  - **La carrera entre transmisiones.** Si llega un envío nuevo mientras el
 *    anterior sigue vivo, el viejo se aborta y su resolución ya no toca el
 *    estado: se compara contra el controlador vigente antes de escribir.
 *
 *  - **El desmontaje a media transmisión.** Cambiar de pantalla aborta y no
 *    deja `setState` sobre un componente muerto.
 *
 *  - **La espera silenciosa del sistema multi-agente.** Cuando el orquestador
 *    delega en un sub-agente, pasan 3-4 segundos antes del primer carácter,
 *    porque el sub-agente responde primero y su texto NO se muestra (el
 *    orquestador lo repite al redactar la respuesta final). `agenteActivo` dice
 *    quién está trabajando en ese hueco, y así la espera se explica sola en vez
 *    de parecer que la app se colgó.
 */
export function useStreamingChat() {
  const [textoParcial, setTextoParcial] = useState('');
  const [estado, setEstado] = useState<EstadoStream>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [agenteActivo, setAgenteActivo] = useState<string | null>(null);

  const control = useRef<AbortController | null>(null);
  const buffer = useRef('');
  const frame = useRef<number | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      control.current?.abort();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const volcar = useCallback(() => {
    frame.current = null;
    setTextoParcial(buffer.current);
  }, []);

  const iniciar = useCallback(
    async (peticion: PeticionStream): Promise<ResultadoEnvio> => {
      control.current?.abort();
      const propio = new AbortController();
      control.current = propio;

      buffer.current = '';
      setTextoParcial('');
      setError(null);
      setAgenteActivo(null);
      setEstado('esperando');

      const resultado = await enviarMensaje({
        ...peticion,
        senal: propio.signal,
        alMetadatos: (meta) => {
          // Solo interesan los DELEGADOS. El nodo principal empieza y termina
          // en todas las respuestas: anunciarlo no informa de nada.
          if (meta.principal) return;
          setAgenteActivo(meta.fase === 'inicio' ? meta.nodeName ?? null : null);
        },
        alFragmento: (_fragmento, acumulado) => {
          buffer.current = acumulado;
          if (frame.current === null) frame.current = requestAnimationFrame(volcar);
          // Sale de "esperando" con el primer fragmento: es lo que retira los
          // skeletons. A partir del segundo, React descarta el mismo valor.
          setEstado((previo) => (previo === 'esperando' ? 'transmitiendo' : previo));
        },
      });

      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }

      // Otra transmisión ya tomó el relevo (o el componente murió): esta no
      // tiene derecho a escribir el estado.
      if (!montado.current || control.current !== propio) return resultado;

      control.current = null;
      setTextoParcial(resultado.texto);
      setError(resultado.error?.message ?? null);
      setAgenteActivo(null);
      setEstado(resultado.estado === 'error' ? 'error' : 'inactivo');
      return resultado;
    },
    [volcar]
  );

  /** Botón Detener. Lo transmitido hasta el corte se conserva. */
  const detener = useCallback(() => {
    control.current?.abort();
  }, []);

  /** Se llama al confirmar el mensaje en la conversación, para vaciar el borrador vivo. */
  const limpiar = useCallback(() => {
    buffer.current = '';
    setTextoParcial('');
    setError(null);
    setAgenteActivo(null);
    setEstado('inactivo');
  }, []);

  return {
    textoParcial,
    estado,
    error,
    /** Sub-agente que está trabajando ahora mismo, o `null`. */
    agenteActivo,
    activo: estado === 'esperando' || estado === 'transmitiendo',
    iniciar,
    detener,
    limpiar,
  };
}
