import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { dur, ease } from '../../lib/motion';

const TONES = {
  amber: { classes: 'bg-status-amber-soft text-status-amber border-status-amber/20', icon: AlertTriangle },
  blue: { classes: 'bg-status-blue-soft text-status-blue border-status-blue/20', icon: Info },
  red: { classes: 'bg-status-red-soft text-status-red border-status-red/20', icon: XCircle },
  green: { classes: 'bg-status-green-soft text-status-green border-status-green/20', icon: CheckCircle2 },
  neutral: { classes: 'bg-bg text-text-2 border-hairline', icon: Info },
} as const;

// Alerta EN LÍNEA, nunca a pantalla completa ni como banda roja gigante: una
// advertencia que tapa la interfaz se cierra sin leerse.
export function Banner({
  tone = 'amber',
  icon,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  icon?: LucideIcon;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const config = TONES[tone];
  const Icon = icon ?? config.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.fast, ease }}
      className={cn(
        'flex items-center justify-between gap-3 rounded-tarjeta border px-4 py-2.5 font-ui text-13',
        config.classes,
        className
      )}
    >
      <span className="flex items-center gap-2">
        <Icon size={16} strokeWidth={2} className="shrink-0" />
        <span>{children}</span>
      </span>
      {action}
    </motion.div>
  );
}
