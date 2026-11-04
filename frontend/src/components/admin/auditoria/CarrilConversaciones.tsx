import { cn } from '../../../lib/cn';
import { formatoFechaCorta } from '../../../lib/fechas';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import type { ConversacionAuditada } from '../../../services/admin.service';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  /** Nombre completo de la fila. El nombre primero: es lo que se busca. */
  ayuda: (nombre: string, area: string, fecha: string, titulo: string) =>
    `${nombre} · ${area}\n${fecha} · ${titulo}`,
  riesgoAlto: 'Riesgo alto',
};

/**
 * Carril de auditoría: el avatar con las iniciales de cada persona.
 *
 * UNA FILA POR CONVERSACIÓN, no por persona. Es la misma lista de al lado con
 * el texto quitado, así que alguien con tres sesiones abiertas ocupa tres
 * filas: agruparlas convertiría el carril en otra lista distinta de la que hay
 * desplegada, y cambiar de elemento dejaría de ser el mismo gesto.
 *
 * Con iniciales repetidas —tres avatares "MG" seguidos— lo que distingue una
 * fila de otra es la ayuda emergente, que lleva fecha y título. Por eso el
 * carril nunca se entrega sin ella.
 *
 * La marca de riesgo alto sobrevive al plegado como un punto sobre el avatar:
 * es la única señal de la fila que sirve para DECIDIR a cuál entrar, y perderla
 * obligaría a desplegar para encontrar lo que hay que revisar.
 */
export function CarrilConversaciones({
  conversaciones,
  cargando,
  seleccionId,
  onSeleccionar,
}: {
  conversaciones: ConversacionAuditada[];
  cargando: boolean;
  seleccionId: string | null;
  onSeleccionar: (id: string) => void;
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
      {conversaciones.map((c) => {
        const riesgoAlto = c.analisis?.riesgo === 'alto';
        return (
          <ElementoCarril
            key={c.id}
            idSeleccion="auditoria-carril-seleccion"
            etiqueta={TEXTO.ayuda(
              c.usuario.nombre,
              c.usuario.area,
              formatoFechaCorta(c.ultimoMensajeEn),
              c.titulo
            )}
            activo={c.id === seleccionId}
            onClick={() => onSeleccionar(c.id)}
          >
            <span className="relative">
              <span
                aria-hidden
                className={cn(
                  // Mismo avatar que la fila desplegada, mismos colores de
                  // selección: el carril no estrena un código nuevo.
                  'flex h-8 w-8 items-center justify-center rounded-full font-ui text-12 font-semibold',
                  c.id === seleccionId ? 'bg-accent text-white' : 'bg-bg text-text-2'
                )}
              >
                {c.usuario.iniciales}
              </span>
              {riesgoAlto && (
                <span
                  aria-hidden
                  title={TEXTO.riesgoAlto}
                  // El anillo del color del panel recorta el punto contra el
                  // avatar: sin él, sobre un avatar rojo de selección, el punto
                  // terroso del riesgo se perdería.
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-status-red ring-2 ring-surface-1"
                />
              )}
            </span>
          </ElementoCarril>
        );
      })}
    </ListaCarril>
  );
}
