import { Fragment, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaCorta, formatoHora, grupoDeFecha, haceCuanto, type GrupoHistorial } from '../../../lib/fechas';
import { chat as copyChat, auditoria as copy } from '../../../copy';
import { formatoUsd } from '../laboratorio/formato';
import { StatusPill } from '../../ui';
import { inicialesDe, nombreDe, type ConsultaAuditada } from '../../../services/auditoria.service';

const ORDEN_GRUPOS: GrupoHistorial[] = ['hoy', 'ayer', 'semana', 'anteriores'];

/**
 * Lista global de consultas: una fila por PREGUNTA, de cualquier persona.
 *
 * El nombre va primero y con el peso más alto: la auditoría es de personas.
 * Debajo, la pregunta tal cual (dos renglones) y, a la derecha, cuánto costó;
 * solo se marca el estado cuando NO fue una respuesta completa, que es lo que
 * hay que mirar.
 */
export function ListaConsultas({
  consultas,
  seleccionId,
  onSeleccionar,
}: {
  consultas: ConsultaAuditada[];
  seleccionId: number | null;
  onSeleccionar: (id: number) => void;
}) {
  const grupos = new Map<GrupoHistorial, ConsultaAuditada[]>();
  for (const c of consultas) {
    const g = grupoDeFecha(c.creadoEn);
    const acumulado = grupos.get(g);
    if (acumulado) acumulado.push(c);
    else grupos.set(g, [c]);
  }

  return (
    <ul className="flex flex-col">
      {ORDEN_GRUPOS.filter((g) => grupos.has(g)).map((g) => (
        <Fragment key={g}>
          <li className="sticky top-0 z-10 border-b border-hairline bg-surface-1 px-4 py-1.5 font-ui text-12 font-medium text-text-3">
            {copyChat.grupos[g]}
          </li>
          {grupos.get(g)!.map((c) => (
            <FilaConsulta key={c.id} consulta={c} seleccionada={c.id === seleccionId} onSeleccionar={onSeleccionar} />
          ))}
        </Fragment>
      ))}
    </ul>
  );
}

const FilaConsulta = memo(function FilaConsulta({
  consulta,
  seleccionada,
  onSeleccionar,
}: {
  consulta: ConsultaAuditada;
  seleccionada: boolean;
  onSeleccionar: (id: number) => void;
}) {
  const reducido = useReducedMotion();
  const hoy = grupoDeFecha(consulta.creadoEn) === 'hoy';

  return (
    <li className="relative border-b border-hairline last:border-b-0">
      {seleccionada && (
        <motion.span
          layoutId="auditoria-seleccion"
          transition={reducido ? { duration: dur.fast, ease } : springSnappy}
          className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={() => onSeleccionar(consulta.id)}
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
          {inicialesDe(consulta.usuario)}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-ui text-14 font-semibold text-text-1">{nombreDe(consulta.usuario)}</span>
            <time
              dateTime={consulta.creadoEn}
              title={haceCuanto(consulta.creadoEn)}
              className="shrink-0 font-ui text-12 tabular-nums text-text-3"
            >
              {hoy ? formatoHora(consulta.creadoEn) : formatoFechaCorta(consulta.creadoEn)}
            </time>
          </span>
          <span className="mt-0.5 line-clamp-2 font-ui text-13 text-text-2">{consulta.pregunta}</span>
          <span className="mt-1.5 flex items-center justify-between gap-2">
            {consulta.estado !== 'completa' ? (
              <StatusPill
                label={copy.estados[consulta.estado]}
                tone={consulta.estado === 'error' ? 'red' : 'amber'}
              />
            ) : (
              <span className="truncate font-ui text-12 text-text-3">{consulta.modelo ?? consulta.perfil}</span>
            )}
            <span className="shrink-0 font-ui text-12 tabular-nums text-text-3">
              {consulta.costoUsd != null ? formatoUsd(consulta.costoUsd) : copy.sinDato}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
});
