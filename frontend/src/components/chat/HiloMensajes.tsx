import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStickToBottom } from 'use-stick-to-bottom';
import { ArrowDown, RotateCcw } from 'lucide-react';
import type { ArchivoCompartido, ItemProceso, Mensaje } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, salidaPanel, springPanel, springPress } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Banner, Button } from '../ui';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import {
  BurbujaUsuario,
  EsqueletoHilo,
  EsperaRespuesta,
  RespuestaAsistente,
  RespuestaEnVivo,
} from './BurbujaMensaje';
import { ArchivosMensaje } from './ArchivosMensaje';

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
  /** Archivos que el agente ya mandó en la respuesta en curso. */
  archivosEnVivo?: ArchivoCompartido[];
  /** Lo que tardó el primer token ("Pensó 8 s"). */
  pensoMs?: number | null;
  error: string | null;
  onReintentar: () => void;
  onRegenerar: () => void;
  /** Firma completa (id + reacción) para que la prop sea estable y `memo` sirva en las filas. */
  onReaccion: (mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
  /** Avisa si el hilo tiene scroll por encima (para la hairline de la cabecera). */
  onDesplazado?: (desplazado: boolean) => void;
  /** Qué pintar cuando no hay mensajes (el aviso de conversación inexistente). */
  vacio: ReactNode;
};

/**
 * Hilo de la conversación: es el único elemento con scroll de la pantalla.
 *
 * El autoscroll se ANCLA a la intención del usuario, no al contenido. Mientras
 * esté al final, cada fragmento nuevo lo arrastra consigo; en cuanto sube a
 * releer algo, el hilo se queda quieto y aparece "Ir al último". Un chat que te
 * devuelve al fondo mientras relees es la forma más rápida de volver inservible
 * una respuesta larga.
 *
 * La mecánica es `use-stick-to-bottom` (MIT, el de bolt.new): sigue el fondo
 * con un resorte en vez de saltos secos por fragmento —que se encolaban y
 * hacían temblar el texto— y detecta que el usuario "escapó" del ancla aunque
 * el contenido siga creciendo bajo sus pies.
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
  archivosEnVivo = [],
  pensoMs,
  error,
  onReintentar,
  onRegenerar,
  onReaccion,
  onDesplazado,
  vacio,
}: Props) {
  const reducido = useReducedMotion();
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom({
    initial: 'instant',
    resize: reducido ? 'instant' : 'smooth',
  });

  const ocupado = esperando || transmitiendo;
  const hayVivo = esperando || textoParcial.length > 0;
  const ultimaAsistente = mensajes.map((m) => m.rol).lastIndexOf('asistente');
  const ultimoEsUsuario = mensajes[mensajes.length - 1]?.rol === 'usuario';

  // El Proceso de la respuesta viva es UNO solo aunque cambie de pieza (de la
  // espera al texto): si se abre mientras espera, sigue abierto al llegar el
  // primer token. Y el isotipo de la espera y el de la cabecera comparten
  // `layoutId` por turno, para que uno se encoja hasta ser el otro.
  const [procesoAbierto, setProcesoAbierto] = useState(false);
  const alternarProceso = useCallback(() => setProcesoAbierto((a) => !a), []);
  useEffect(() => {
    if (!hayVivo) setProcesoAbierto(false);
  }, [hayVivo]);
  const idIsotipo = `isotipo-respuesta-${conversacionId ?? 'nueva'}-${mensajes.length}`;

  // Abrir otra conversación cae directo al final, sin animación: ver el hilo
  // desplazarse solo desde arriba al abrirlo se lee como un fallo.
  useLayoutEffect(() => {
    void scrollToBottom('instant');
  }, [conversacionId, cargando, scrollToBottom]);

  // Enviar una pregunta SIEMPRE vuelve al final, aunque se estuviera releyendo
  // arriba: quien acaba de preguntar quiere ver la respuesta.
  useEffect(() => {
    if (ultimoEsUsuario) void scrollToBottom(reducido ? 'instant' : 'smooth');
  }, [mensajes.length, ultimoEsUsuario, reducido, scrollToBottom]);

  // La cabecera del chat dibuja su hairline solo cuando hay algo debajo: se
  // avisa una vez por frame como mucho, y solo cuando el booleano cambia.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onDesplazado) return;
    let frame: number | null = null;
    let previo: boolean | null = null;
    const leer = () => {
      frame = null;
      const ahora = el.scrollTop > 4;
      if (ahora !== previo) {
        previo = ahora;
        onDesplazado(ahora);
      }
    };
    const alScroll = () => {
      if (frame === null) frame = requestAnimationFrame(leer);
    };
    leer();
    el.addEventListener('scroll', alScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', alScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [scrollRef, onDesplazado]);

  const sinMensajes = mensajes.length === 0 && !hayVivo;

  return (
    <div className="relative min-h-0 flex-1">
      {/* El contenedor es enfocable (un hilo largo se recorre con el teclado) y
          por eso necesita foco visible propio: un `outline` alrededor de una caja
          del alto de la pantalla se lee como un error, así que el anillo va por
          dentro. Lo que no se hace nunca es quitarlo sin reemplazo. */}
      <div
        ref={scrollRef}
        role="log"
        aria-label={copyLocal.hiloEtiqueta}
        aria-busy={ocupado}
        tabIndex={0}
        className="h-full overflow-y-auto overscroll-contain px-4 lg:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <div ref={contentRef} className={cn('mx-auto w-full max-w-[680px]', sinMensajes && !cargando ? 'flex h-full items-center justify-center py-6' : 'pb-10 pt-6')}>
          {cargando ? (
            <EsqueletoHilo />
          ) : sinMensajes ? (
            vacio
          ) : (
            <div className="flex flex-col gap-7">
              {mensajes.map((m, i) =>
                m.rol === 'usuario' ? (
                  <BurbujaUsuario key={m.id} mensaje={m} />
                ) : (
                  <RespuestaAsistente
                    key={m.id}
                    mensaje={m}
                    esUltima={i === ultimaAsistente && !hayVivo}
                    ocupado={ocupado}
                    onRegenerar={onRegenerar}
                    onReaccion={onReaccion}
                  />
                )
              )}

              {esperando && !textoParcial && (
                <EsperaRespuesta
                  actividad={actividad}
                  proceso={proceso}
                  layoutId={idIsotipo}
                  procesoAbierto={procesoAbierto}
                  onAlternarProceso={alternarProceso}
                />
              )}
              {textoParcial && (
                <RespuestaEnVivo
                  texto={textoParcial}
                  proceso={proceso}
                  transmitiendo={transmitiendo}
                  pensoMs={pensoMs}
                  layoutId={idIsotipo}
                  procesoAbierto={procesoAbierto}
                  onAlternarProceso={alternarProceso}
                />
              )}
              {/* Las tarjetas aparecen en cuanto el agente manda el archivo,
                  aunque todavía no escriba: es lo primero que el usuario pidió. */}
              {hayVivo && archivosEnVivo.length > 0 && <ArchivosMensaje archivos={archivosEnVivo} className="-mt-3" />}

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
          )}
        </div>
      </div>

      {/* Desvanecido de 24 px sobre el composer: el texto se va por debajo en
          vez de cortarse contra una línea. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-bg to-transparent" />

      <AnimatePresence>
        {!isAtBottom && !cargando && !sinMensajes && (
          <motion.div
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: salidaPanel }}
            transition={reducido ? { duration: dur.fast, ease } : springPanel}
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
          >
            <motion.button
              type="button"
              onClick={() => void scrollToBottom(reducido ? 'instant' : 'smooth')}
              aria-label={copy.irAlUltimo}
              title={copy.irAlUltimo}
              whileTap={{ scale: 0.92 }}
              transition={springPress}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-text-2 shadow-menu transition-colors duration-[120ms] hover:text-text-1 md:h-9 md:w-9"
            >
              <ArrowDown size={16} strokeWidth={2.25} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
