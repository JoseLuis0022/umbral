import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Inbox, type LucideIcon } from 'lucide-react';
import { nestedFade } from '../../lib/motion';

/**
 * Estado vacío: SIEMPRE con una acción sugerida, nunca solo "No hay datos".
 * Un vacío sin salida deja al usuario adivinando si la pantalla está rota.
 *
 * Entra solo con opacidad: este componente casi siempre vive dentro de una
 * sección que PageEnter ya está animando, y un segundo spring con
 * desplazamiento encima se siente trabado.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      // Aparece en su sitio (sin desvanecido al montar): al navegar se sumaba
      // al parpadeo de la pantalla.
      initial={false}
      animate="visible"
      variants={nestedFade}
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-3">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h3 className="font-ui text-15 font-medium text-text-1">{title}</h3>
      {description && <p className="max-w-sm font-ui text-13 text-text-2">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}
