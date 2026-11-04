import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaCorta, grupoDeFecha, haceCuanto, type GrupoHistorial } from '../../../lib/fechas';
import { chat as copyChat } from '../../../copy';
import type { ConversacionAuditada } from '../../../services/admin.service';
import { MarcaRiesgoAlto } from './IndicadorAnalisis';

const ORDEN_GRUPOS: GrupoHistorial[] = ['hoy', 'ayer', 'semana', 'anteriores'];

/**
 * Lista global de conversaciones: todas las personas, con nombre y área a la
 * vista. Es una facultad explícita de la herramienta, así que el nombre va
 * primero y con el peso más alto de la fila, no escondido como metadato.
 *
 * Las filas se separan con hairlines dentro de una sola superficie, no como
 * tarjetas sueltas: una lista de 18 tarjetas idénticas con la misma sombra se
 * lee como plantilla y además dificulta comparar filas entre sí.
 */
export function ListaConversaciones({
  conversaciones,
  seleccionId,
  onSeleccionar,
}: {
  conversaciones: ConversacionAuditada[];
  seleccionId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  // Agrupación por recencia, la misma regla que usa el historial del chat.
  const grupos = new Map<GrupoHistorial, ConversacionAuditada[]>();
  for (const c of conversaciones) {
    const g = grupoDeFecha(c.ultimoMensajeEn);
    const acumulado = grupos.get(g);
    if (acumulado) acumulado.push(c);
    else grupos.set(g, [c]);
  }

  return (
    <ul className="flex flex-col">
      {ORDEN_GRUPOS.filter((g) => grupos.has(g)).map((g) => (
        <Fragment key={g}>
          {/* Fondo OPACO, sin `backdrop-blur`. Son cabeceras de grupo pegadas
              dentro de una lista con scroll: un `backdrop-filter` re-muestrea lo
              que tiene detrás en cada frame de scroll, y aquí hay una por grupo
              (hasta cuatro) más la marca de selección deslizándose por debajo.
              El vidrio esmerilado se reserva para las capas flotantes de
              verdad, no para un rótulo de cuatro palabras. */}
          <li className="sticky top-0 z-10 border-b border-hairline bg-surface-1 px-4 py-1.5 font-ui text-12 font-medium text-text-3">
            {copyChat.grupos[g]}
          </li>
          {grupos.get(g)!.map((c) => (
            <FilaConversacion
              key={c.id}
              conversacion={c}
              seleccionada={c.id === seleccionId}
              onSeleccionar={onSeleccionar}
            />
          ))}
        </Fragment>
      ))}
    </ul>
  );
}

function FilaConversacion({
  conversacion,
  seleccionada,
  onSeleccionar,
}: {
  conversacion: ConversacionAuditada;
  seleccionada: boolean;
  onSeleccionar: (id: string) => void;
}) {
  const { usuario, analisis } = conversacion;
  const reducido = useReducedMotion();

  return (
    <li className="relative border-b border-hairline last:border-b-0">
      {seleccionada && (
        // layoutId: la marca de selección se DESLIZA de una fila a otra en vez
        // de parpadear en dos sitios, y así el ojo sigue el salto.
        <motion.span
          layoutId="auditoria-seleccion"
          // `springSnappy` y no `spring`: es el MISMO patrón que la pastilla del
          // SegmentedControl y el subrayado de Tabs —un indicador de selección
          // que se desliza— y hasta ahora era el único con otra física.
          // Y la preferencia se consulta aquí porque las animaciones de layout
          // son transforms de JS: ni el CSS global ni MotionConfig las alcanzan.
          transition={reducido ? { duration: dur.fast, ease } : springSnappy}
          className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={() => onSeleccionar(conversacion.id)}
        aria-current={seleccionada ? 'true' : undefined}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
          'focus-visible:relative focus-visible:z-20',
          seleccionada ? 'bg-accent-soft' : 'hover:bg-bg'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-ui text-12 font-semibold',
            seleccionada ? 'bg-accent text-white' : 'bg-bg text-text-2'
          )}
        >
          {usuario.iniciales}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-ui text-14 font-semibold text-text-1">{usuario.nombre}</span>
            <time
              dateTime={conversacion.ultimoMensajeEn}
              title={haceCuanto(conversacion.ultimoMensajeEn)}
              className="shrink-0 font-ui text-12 tabular-nums text-text-3"
            >
              {formatoFechaCorta(conversacion.ultimoMensajeEn)}
            </time>
          </span>
          <span className="truncate font-ui text-12 text-text-3">{usuario.area}</span>
          <span className="mt-1 flex items-start gap-1.5">
            {analisis?.riesgo === 'alto' && <MarcaRiesgoAlto />}
            <span className="line-clamp-2 font-ui text-13 text-text-2">{conversacion.titulo}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
