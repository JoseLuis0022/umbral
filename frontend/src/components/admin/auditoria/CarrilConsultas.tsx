import { cn } from '../../../lib/cn';
import { formatoFechaCorta } from '../../../lib/fechas';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import { inicialesDe, nombreDe, type ConsultaAuditada } from '../../../services/auditoria.service';

/**
 * Carril de auditoría (la lista plegada): el avatar de quien preguntó, una
 * fila por consulta. La ayuda emergente lleva fecha y pregunta, que es lo que
 * distingue dos avatares iguales seguidos. Un punto rojo marca las que
 * terminaron con error, para no tener que desplegar para encontrarlas.
 */
export function CarrilConsultas({
  consultas,
  cargando,
  seleccionId,
  onSeleccionar,
}: {
  consultas: ConsultaAuditada[];
  cargando: boolean;
  seleccionId: number | null;
  onSeleccionar: (id: number) => void;
}) {
  if (cargando) {
    return (
      <ul aria-hidden className="flex flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex h-11 items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ListaCarril>
      {consultas.map((c) => (
        <ElementoCarril
          key={c.id}
          idSeleccion="auditoria-carril-seleccion"
          etiqueta={`${nombreDe(c.usuario)}\n${formatoFechaCorta(c.creadoEn)} · ${c.pregunta.slice(0, 120)}`}
          activo={c.id === seleccionId}
          onClick={() => onSeleccionar(c.id)}
        >
          <span className="relative">
            <span
              aria-hidden
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full font-ui text-12 font-semibold',
                c.id === seleccionId ? 'bg-accent text-white' : 'bg-bg text-text-2'
              )}
            >
              {inicialesDe(c.usuario)}
            </span>
            {c.estado === 'error' && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-status-red ring-2 ring-surface-1"
              />
            )}
          </span>
        </ElementoCarril>
      ))}
    </ListaCarril>
  );
}
