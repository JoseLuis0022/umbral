import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Button } from '../ui';
import { chat as copy } from '../../copy';

/**
 * Ocupa el lugar exacto de la barra de entrada cuando la conversación ya se
 * cerró (cinco horas sin actividad).
 *
 * Se sustituye, no se deshabilita: un campo de texto atenuado invita a
 * escribir y luego no deja, que es la peor versión de las dos. Y el aviso no
 * es un callejón sin salida — el botón arranca una sesión nueva con el tema ya
 * cargado, así que retomar la conversación cuesta un clic y no volver a
 * explicarse.
 */
export function AvisoSoloLectura({ onNuevaSesion }: { onNuevaSesion: () => void }) {
  const reducido = useReducedMotion();

  return (
    <motion.div
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="flex flex-col gap-3 rounded-tarjeta border border-hairline bg-surface-1 px-4 py-3.5 shadow-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-celda bg-bg text-text-2"
        >
          <Lock size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-ui text-14 font-medium text-text-1">{copy.soloLecturaTitulo}</p>
          <p className="mt-0.5 font-ui text-13 text-text-2">{copy.soloLecturaDetalle}</p>
        </div>
      </div>

      {/* Única acción primaria de la pantalla en este modo: con la barra de
          entrada fuera, no hay otro rojo con el que competir. */}
      <Button size="sm" className="shrink-0" onClick={onNuevaSesion}>
        {copy.soloLecturaAccion}
      </Button>
    </motion.div>
  );
}
