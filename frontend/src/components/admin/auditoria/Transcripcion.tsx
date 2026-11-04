import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Markdown } from '../../Markdown';
import { cn } from '../../../lib/cn';
import { dur, ease, stagger } from '../../../lib/motion';
import { formatoHora } from '../../../lib/fechas';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { marca } from '../../../copy';
import type { Mensaje, Usuario } from '../../../types';

/**
 * Transcripción completa de una conversación auditada.
 *
 * Los dos turnos se distinguen con TRES señales neutras —alineación, relleno y
 * elevación— y ninguna saturada: la persona va a la derecha sobre el lienzo
 * cálido (`bg-bg`, sin sombra); el asistente va a la izquierda sobre superficie
 * blanca con hairline y sombra 1, como si estuviera un plano por encima. Dos
 * colores fuertes enfrentados convertirían la lectura en un semáforo y
 * competirían con los indicadores de riesgo, que sí necesitan color.
 */
export function Transcripcion({ mensajes, autor }: { mensajes: Mensaje[]; autor: Usuario }) {
  const reducido = useReducedMotion();

  return (
    <ol className="flex flex-col gap-5">
      {mensajes.map((mensaje, i) => (
        <BurbujaMensaje
          key={mensaje.id}
          mensaje={mensaje}
          autor={autor}
          indice={i}
          reducido={reducido}
        />
      ))}
    </ol>
  );
}

function BurbujaMensaje({
  mensaje,
  autor,
  indice,
  reducido,
}: {
  mensaje: Mensaje;
  autor: Usuario;
  indice: number;
  reducido: boolean;
}) {
  const esPersona = mensaje.rol === 'usuario';
  const nombre = esPersona ? autor.nombre : marca.nombre;

  return (
    <motion.li
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      // El stagger se corta a los ocho primeros mensajes: encadenar retrasos en
      // una transcripción larga haría esperar al auditor por algo que ya está.
      transition={{ duration: dur.base, ease, delay: Math.min(indice, 8) * stagger.tight }}
      className={cn('flex gap-3', esPersona ? 'flex-row-reverse' : 'flex-row')}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-ui text-12 font-semibold',
          esPersona ? 'bg-accent-soft text-accent-fg' : 'border border-hairline bg-surface-1 text-text-2'
        )}
      >
        {esPersona ? autor.iniciales : <Sparkles size={14} strokeWidth={2} />}
      </span>

      <div className={cn('flex min-w-0 max-w-[min(680px,88%)] flex-col gap-1', esPersona && 'items-end')}>
        <div className={cn('flex items-baseline gap-2 px-1', esPersona && 'flex-row-reverse')}>
          <span className="truncate font-ui text-12 font-medium text-text-2">{nombre}</span>
          <time
            dateTime={mensaje.creadoEn}
            className="shrink-0 font-ui text-12 tabular-nums text-text-3"
          >
            {formatoHora(mensaje.creadoEn)}
          </time>
        </div>

        <div
          className={cn(
            'w-full overflow-hidden rounded-tarjeta px-4 py-3',
            esPersona
              ? 'border border-hairline bg-bg'
              : 'border border-hairline bg-surface-1 shadow-1'
          )}
        >
          <Markdown className="text-14">{mensaje.contenido}</Markdown>
        </div>
      </div>
    </motion.li>
  );
}
