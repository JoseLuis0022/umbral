import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { getStatusFamily, getStatusClasses, type StatusFamily } from '../../lib/status';

const DOT_COLOR: Record<StatusFamily, string> = {
  green: 'bg-status-green',
  blue: 'bg-status-blue',
  amber: 'bg-status-amber',
  red: 'bg-status-red',
  gray: 'bg-status-gray',
};

/**
 * Píldora de estatus. Es el ÚNICO componente del sistema con radio de pastilla
 * completa — por eso se reconoce como "estatus" de un vistazo, sin leerlo.
 *
 * Al cambiar de valor hace crossfade de color, nunca reaparece de golpe.
 *
 * `variant="dot"` es el patrón de leyenda (punto de color + etiqueta, sin
 * fondo): úsalo en leyendas y filtros. El default (fondo suave) es para
 * celdas de tabla y encabezados.
 */
export function StatusPill({
  label,
  tone,
  variant = 'pill',
  className,
}: {
  label: string;
  tone?: StatusFamily;
  variant?: 'pill' | 'dot';
  className?: string;
}) {
  const family = tone ?? getStatusFamily(label);

  if (variant === 'dot') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-ui text-13 text-text-2', className)}>
        <span className={cn('h-2 w-2 rounded-full', DOT_COLOR[family])} />
        {label}
      </span>
    );
  }

  return (
    <motion.span
      /*
       * Sin `layout`. Lo llevaba, y no servía para nada: el `key={label}` de
       * abajo REMONTA la píldora al cambiar de valor, así que no hay caja
       * anterior con la que interpolar. Lo único que quedaba era el coste —
       * medir la caja en cada render— multiplicado por cada píldora de cada
       * fila de cada tabla del panel de administración.
       */
      key={label}
      /* Sin aparición al montar: una tabla con 50 píldoras que se
         desvanecían a la vez en cada visita era una de las "olas" del
         parpadeo al entrar a Auditoría. Aparecen en su sitio. */
      initial={false}
      className={cn(
        'inline-flex h-[26px] items-center whitespace-nowrap rounded-pastilla px-3.5 font-ui text-12 font-medium',
        getStatusClasses(label, tone),
        className
      )}
    >
      {label}
    </motion.span>
  );
}
