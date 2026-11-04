import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensaje, type OpcionesEnvio, type ResultadoEnvio } from '../services/chat.service';
import { describirActividad } from '../lib/actividad';

export type EstadoStream = 'inactivo' | 'esperando' | 'transmitiendo' | 'error';

/** Lo que necesita una petición; los callbacks los pone el hook. */
export type PeticionStream = Pick<OpcionesEnvio, 'mensajes' | 'conversacionId' | 'perfil' | 'adjuntos'>;

/**
 * Envoltura de React sobre `chat.service`. Aísla cuatro cosas que la pantalla
 * no debería resolver:
 *
 *  - **El coste de repintar por token.** Los fragmentos se acumulan en un ref
 *    y se vuelcan una vez por frame con `requestAnimationFrame`: el texto se ve
 *    idéntico y el presupuesto de frame se respeta.
 *
 *  - **La carrera entre transmisiones.** Si llega un envío nuevo mientras el
 *    anterior sigue vivo, el viejo se aborta y su resolución ya no toca el
 *    estado: se compara contra el controlador vigente antes de escribir.
 *
 *  - **El desmontaje a media transmisión.** Cambiar de pantalla aborta y no
 *    deja `setState` sobre un componente muerto.
 *
 *  - **La espera mientras el agente busca.** Antes de escribir, el agente lee
 *    el índice, el resumen de una clase, los apuntes… y eso tarda segundos.
 *    `actividad` dice en una frase QUÉ está haciendo, para que la espera se
 *    explique sola en vez de parecer que la app se colgó.
 */
export function useStreamingChat() {
  const [textoParcial, setTextoParcial] = useState('');
  const [estado, setEstado] = useState<EstadoStream>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [actividad, setActividad] = useState<string | null>(null);

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
      setActividad(null);
      setEstado('esperando');

      const resultado = await enviarMensaje({
        ...peticion,
        senal: propio.signal,
        alActividad: (a) => {
          // Se anuncia lo que EMPIEZA. Al terminar no se borra: la frase se
          // queda hasta que empiece otra cosa o llegue el texto.
          if (a.fase === 'inicio' && control.current === propio) setActividad(describirActividad(a));
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
      setActividad(null);
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
    setActividad(null);
    setEstado('inactivo');
  }, []);

  return {
    textoParcial,
    estado,
    error,
    actividad,
    activo: estado === 'esperando' || estado === 'transmitiendo',
    iniciar,
    detener,
    limpiar,
  };
}
