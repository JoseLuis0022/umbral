import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, RotateCcw } from 'lucide-react';
import type { ItemProceso, Mensaje } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Banner, Button } from '../ui';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import {
  BurbujaUsuario,
  EsqueletoHilo,
  EsqueletoRespuesta,
  RespuestaAsistente,
  RespuestaEnVivo,
} from './BurbujaMensaje';

/** Margen desde el fondo dentro del cual se considera que el usuario "está al día". */
const UMBRAL_FONDO = 72;

type Props = {
  /** Cambiar de conversación reinicia el scroll; por eso entra como prop y no se deduce. */
  conversacionId: string | null;
  mensajes: Mensaje[];
  cargando: boolean;
  /** Petición enviada, sin primer fragmento todavía: es el hueco del esqueleto. */
  esperando: boolean;
  /** Sub-agente trabajando. Solo llega con backend real y solo si hubo delegación. */
  actividad?: string | null;
  transmitiendo: boolean;
  textoParcial: string;
  /** Proceso en vivo del agente (razonamiento y pasos). */
  proceso?: ItemProceso[];
  error: string | null;
  soloLectura: boolean;
  onReintentar: () => void;
  onRegenerar: () => void;
  /** Firma completa (id + reacción) para que la prop sea estable y `memo` sirva en las filas. */
  onReaccion: (mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
  /** Qué pintar cuando no hay mensajes: saludo, o el aviso de conversación inexistente. */
  vacio: ReactNode;
};

/**
 * Hilo de la conversación: es el único elemento con scroll de la pantalla.
 *
 * El autoscroll se ANCLA a la intención del usuario, no al contenido. Mientras
 * esté al final, cada fragmento nuevo lo arrastra consigo; en cuanto sube a
 * releer algo, el hilo se queda quieto y aparece "Ir al último mensaje". Un
 * chat que te devuelve al fondo mientras relees es la forma más rápida de
 * volver inservible una respuesta larga.
 */
export function HiloMensajes({
  conversacionId,
  mensajes,
  cargando,
  esperando,
  actividad,
  transmitiendo,
  textoParcial,
  proceso = [],
  error,
  soloLectura,
  onReintentar,
  onRegenerar,
  onReaccion,
  vacio,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [alFondo, setAlFondo] = useState(true);
  const reducido = useReducedMotion();

  const ocupado = esperando || transmitiendo;
  const hayVivo = esperando || textoParcial.length > 0;
  const ultimaAsistente = mensajes.map((m) => m.rol).lastIndexOf('asistente');

  const irAlFondo = useCallback(
    (suave: boolean) => {
      const el = contenedor.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: suave && !reducido ? 'smooth' : 'auto' });
      setAlFondo(true);
    },
    [reducido]
  );

  // El scroll dispara decenas de eventos por gesto y aquí solo interesa un
  // booleano: se colapsa a una lectura por frame para no medir el layout 60
  // veces por segundo mientras además llega texto por streaming.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    let frame: number | null = null;
    const alScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const actual = contenedor.current;
        if (!actual) return;
        setAlFondo(actual.scrollHeight - actual.scrollTop - actual.clientHeight < UMBRAL_FONDO);
      });
    };
    el.addEventListener('scroll', alScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', alScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Abrir otra conversación cae directo al final, sin animación: ver el hilo
  // desplazarse solo desde arriba al abrirlo se lee como un fallo, no como
  // una transición.
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAlFondo(true);
  }, [conversacionId, cargando]);

  useEffect(() => {
    if (!alFondo) return;
    // Durante la transmisión el salto es seco: un `smooth` por fragmento se
    // encola contra sí mismo y el texto acaba temblando.
    irAlFondo(!transmitiendo);
  }, [mensajes.length, textoParcial, esperando, alFondo, transmitiendo, irAlFondo]);

  return (
    <div className="relative min-h-0 flex-1">
      {/* El contenedor es enfocable (un hilo largo se recorre con el teclado) y
          por eso necesita foco visible propio: un `outline` alrededor de una caja
          del alto de la pantalla se lee como un error, así que el anillo va por
          dentro. Lo que no se hace nunca es quitarlo sin reemplazo. */}
      <div
        ref={contenedor}
        role="log"
        aria-label={copyLocal.hiloEtiqueta}
        aria-busy={ocupado}
        tabIndex={0}
        className="h-full overflow-y-auto overscroll-contain px-4 lg:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {cargando ? (
          <div className="mx-auto w-full max-w-[760px] py-6">
            <EsqueletoHilo />
          </div>
        ) : mensajes.length === 0 && !hayVivo ? (
          // El saludo se centra en el alto disponible; el resto del hilo crece
          // desde arriba. De ahí que sean dos envoltorios y no uno.
          <div className="mx-auto flex h-full w-full max-w-[760px] items-center justify-center py-6">{vacio}</div>
        ) : (
          <div className="mx-auto w-full max-w-[760px] py-6">
            <div className="flex flex-col gap-8">
              {mensajes.map((m, i) =>
                m.rol === 'usuario' ? (
                  <BurbujaUsuario key={m.id} mensaje={m} />
                ) : (
                  <RespuestaAsistente
                    key={m.id}
                    mensaje={m}
                    esUltima={i === ultimaAsistente && !hayVivo}
                    soloLectura={soloLectura}
                    ocupado={ocupado}
                    onRegenerar={onRegenerar}
                    onReaccion={onReaccion}
                  />
                )
              )}

              {esperando && !textoParcial && <EsqueletoRespuesta actividad={actividad} proceso={proceso} />}
              {textoParcial && <RespuestaEnVivo texto={textoParcial} proceso={proceso} transmitiendo={transmitiendo} />}

              {/* El error no borra lo que ya se leyó: el fragmento parcial se
                  queda arriba y el aviso se suma debajo con el reintento.
                  Tono rojo de RIESGO (--status-red), nunca el color de marca. */}
              {error && (
                <div role="alert">
                  <Banner
                    tone="red"
                    className="flex-col items-start gap-3 sm:flex-row sm:items-center"
                    action={
                      <Button variant="secondary" size="sm" onClick={onReintentar}>
                        <RotateCcw size={14} /> {copyLocal.reintentar}
                      </Button>
                    }
                  >
                    {error}
                  </Banner>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {!alFondo && !cargando && (
          <motion.div
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: dur.fast, ease } }}
            transition={springSnappy}
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
          >
            <button
              type="button"
              onClick={() => irAlFondo(true)}
              className={cn(
                // rounded-control y no pastilla: la píldora completa está
                // reservada a StatusPill, que es lo que la hace reconocible.
                'pointer-events-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-hairline',
                'bg-surface-3/90 px-4 font-ui text-13 font-medium text-text-1 shadow-3 backdrop-blur-xl',
                'transition-colors duration-150 hover:bg-accent-soft hover:text-accent-fg md:min-h-[36px]'
              )}
            >
              <ArrowDown size={14} strokeWidth={2.5} />
              {copy.irAlUltimo}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
