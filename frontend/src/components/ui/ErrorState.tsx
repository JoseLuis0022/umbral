import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { nestedFade } from '../../lib/motion';
import { Button } from './Button';

/**
 * Estado de error: mensaje humano (qué pasó + qué hacer) y reintento en un
 * solo tap. Nunca un stack trace ni un código de error a secas — el usuario
 * no puede hacer nada con "Error 500".
 */
export function ErrorState({
  title = 'No pudimos cargar esta información',
  description = 'Revisa tu conexión e intenta de nuevo.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={nestedFade}
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-red-soft text-status-red">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </span>

      <h3 className="font-ui text-15 font-medium text-text-1">{title}</h3>
      <p className="max-w-sm font-ui text-13 text-text-2">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-1" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </motion.div>
  );
}
