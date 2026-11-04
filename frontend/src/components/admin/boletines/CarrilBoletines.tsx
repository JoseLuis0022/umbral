import type { Guia } from '../../../types';
import { cn } from '../../../lib/cn';
import { CLASES_CATEGORIA, ICONO_CATEGORIA } from '../../guias';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import type { MarcaBoletin } from './ListaBoletines';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  sinTitulo: 'Boletín sin título',
  sinPublicar: 'Sin publicar',
  marcas: { nuevo: 'Nuevo', editado: 'Editado' } as Record<MarcaBoletin, string>,
  ayuda: (titulo: string, categoria: string, distintivo: string | null) =>
    `${titulo}\n${categoria}${distintivo ? ` · ${distintivo}` : ''}`,
};

/**
 * Carril de boletines: el icono de la categoría de cada boletín.
 *
 * Es la misma ficha de categoría que ya lleva la fila desplegada —mismo icono,
 * mismo color—, solo que sin el nombre al lado. Eso la vuelve reconocible sin
 * leerla: en un índice donde la mitad son de "Correo" y la otra mitad de
 * "Gobernanza", el color agrupa antes que cualquier texto.
 *
 * El punto de estado sobrevive al plegado porque contesta la pregunta con la
 * que se entra a esta pantalla: cuál me queda por publicar.
 */
export function CarrilBoletines({
  guias,
  marcas,
  idSinPublicar,
  cargando,
  seleccionId,
  onSeleccionar,
}: {
  guias: Guia[];
  marcas: Record<string, MarcaBoletin>;
  idSinPublicar: string | null;
  cargando: boolean;
  seleccionId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  if (cargando) {
    return (
      <ul aria-hidden className="flex flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex h-11 items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-celda" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ListaCarril>
      {guias.map((guia) => {
        const Icono = ICONO_CATEGORIA[guia.categoria];
        const marca = marcas[guia.id];
        const sinPublicar = guia.id === idSinPublicar;
        const distintivo = sinPublicar ? TEXTO.sinPublicar : marca ? TEXTO.marcas[marca] : null;
        // Ámbar = pide una acción (sin publicar, o editado sobre la semilla);
        // verde = creado aquí y ya publicado. Los mismos tonos del distintivo
        // de la fila desplegada.
        const tonoPunto = sinPublicar || marca === 'editado' ? 'bg-status-amber' : 'bg-status-green';

        return (
          <ElementoCarril
            key={guia.id}
            idSeleccion="boletines-carril-seleccion"
            etiqueta={TEXTO.ayuda(guia.titulo.trim() || TEXTO.sinTitulo, guia.categoria, distintivo)}
            activo={guia.id === seleccionId}
            onClick={() => onSeleccionar(guia.id)}
          >
            <span className="relative">
              <span
                aria-hidden
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-celda',
                  CLASES_CATEGORIA[guia.categoria]
                )}
              >
                <Icono size={15} strokeWidth={2} />
              </span>
              {distintivo && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-1',
                    tonoPunto
                  )}
                />
              )}
            </span>
          </ElementoCarril>
        );
      })}
    </ListaCarril>
  );
}
