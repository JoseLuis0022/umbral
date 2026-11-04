import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../ui';
import { dur, ease } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaLarga, formatoHora } from '../../../lib/fechas';
import { admin as copy } from '../../../copy';
import type { ConversacionAuditada } from '../../../services/admin.service';
import { BarraAnalisis } from './BarraAnalisis';
import { Transcripcion } from './Transcripcion';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  volver: 'Volver a la lista',
  mensajes: (n: number) => `${n} ${n === 1 ? 'mensaje' : 'mensajes'}`,
  iniciada: (fecha: string, hora: string) => `Iniciada el ${fecha} a las ${hora}`,
};

/**
 * Detalle de una conversación auditada: barra de análisis, resumen ejecutivo,
 * separador punteado y transcripción completa.
 *
 * Todo vive en UNA superficie continua en vez de tres tarjetas apiladas. Lo que
 * se está leyendo es un documento —veredicto, síntesis y evidencia—, y trocearlo
 * en tarjetas idénticas rompería esa lectura de arriba abajo.
 */
export function DetalleConversacion({
  conversacion,
  onVolver,
}: {
  conversacion: ConversacionAuditada;
  /** Solo se usa en móvil: en escritorio los dos paneles conviven. */
  onVolver: () => void;
}) {
  const reducido = useReducedMotion();
  const { usuario, analisis, mensajes } = conversacion;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center border-b border-hairline px-3 py-2 lg:hidden">
        <Button variant="ghost" size="sm" onClick={onVolver} className="gap-1 px-2">
          <ChevronLeft size={16} aria-hidden />
          {TEXTO.volver}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BarraAnalisis titulo={conversacion.titulo} analisis={analisis} />

        <motion.div
          // Clave por id: al saltar de una conversación a otra el contenido
          // hace su propia entrada y no parece que solo cambió el texto.
          key={conversacion.id}
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease }}
          className="flex flex-col gap-6 px-5 py-6 lg:px-6"
        >
          {/* Identidad completa a la vista: el administrador audita personas,
              no sesiones anónimas. Atenuarla haría inútil la pantalla. */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-13 font-semibold text-accent-fg"
            >
              {usuario.iniciales}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="truncate font-ui text-14 font-semibold text-text-1">{usuario.nombre}</p>
              <p className="truncate font-ui text-12 text-text-2">{usuario.area}</p>
              <p className="truncate font-ui text-12 text-text-3">{usuario.correo}</p>
            </div>
            <p className="ml-auto hidden shrink-0 text-right font-ui text-12 tabular-nums text-text-3 sm:block">
              {TEXTO.iniciada(formatoFechaLarga(conversacion.creadoEn), formatoHora(conversacion.creadoEn))}
            </p>
          </div>

          {analisis && (
            <section className="flex flex-col gap-1.5">
              <h3 className="font-ui text-13 font-medium text-text-2">{copy.resumenEjecutivo}</h3>
              <p className="max-w-[68ch] font-ui text-15 leading-relaxed text-text-1">{analisis.resumen}</p>
            </section>
          )}

          {/* Separador punteado: marca el corte entre la interpretación y la
              evidencia cruda, sin el peso de una línea sólida. */}
          <div className="border-t border-dashed border-hairlineStrong" role="separator" />

          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-ui text-13 font-medium text-text-2">{copy.transcripcion}</h3>
              <span className="font-ui text-12 tabular-nums text-text-3">{TEXTO.mensajes(mensajes.length)}</span>
            </div>
            <Transcripcion mensajes={mensajes} autor={usuario} />
          </section>
        </motion.div>
      </div>
    </div>
  );
}
