import { memo } from 'react';
import type { Documento } from '../../../types';
import { cn } from '../../../lib/cn';
import { tamanoLegible } from '../../../lib/fechas';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import { ESTADO_DOC } from './estados';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  ayuda: (nombre: string, estado: string, tamano: string) => `${nombre}\n${estado} · ${tamano}`,
};

/**
 * Carril de corpus: la etiqueta de tipo (MD / PDF) que ya lleva la fila, ahora
 * teñida con el color de su estado de indexación.
 *
 * La etiqueta escrita se conserva por el mismo motivo por el que existe en la
 * fila desplegada: en una lista de .md y .pdf mezclados, un icono de documento
 * genérico no distingue nada. Y el color del estado se le suma porque, sin la
 * línea de estado al lado, "qué se está indexando y qué falló" desaparecería
 * del plegado — que es justo lo que se vigila mientras se sube un lote.
 */
export function CarrilArchivos({
  documentos,
  cargando,
  documentoActivoId,
  onSeleccionar,
}: {
  documentos: Documento[];
  cargando: boolean;
  documentoActivoId: string | null;
  onSeleccionar: (documento: Documento) => void;
}) {
  if (cargando) {
    return (
      <ul aria-hidden className="flex flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex h-11 items-center justify-center">
            <Skeleton className="h-7 w-9" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ListaCarril>
      {documentos.map((doc) => (
        <FilaCarril
          key={doc.id}
          documento={doc}
          activo={doc.id === documentoActivoId}
          onSeleccionar={onSeleccionar}
        />
      ))}
    </ListaCarril>
  );
}

function FilaCarrilBase({
  documento,
  activo,
  onSeleccionar,
}: {
  documento: Documento;
  activo: boolean;
  onSeleccionar: (documento: Documento) => void;
}) {
  const estado = ESTADO_DOC[documento.estado];
  const IconoEstado = estado.icono;

  return (
    <ElementoCarril
      idSeleccion="corpus-carril-seleccion"
      etiqueta={TEXTO.ayuda(documento.nombre, estado.etiqueta, tamanoLegible(documento.tamanoBytes))}
      activo={activo}
      onClick={() => onSeleccionar(documento)}
    >
      <span className="relative">
        <span
          aria-hidden
          className={cn(
            'flex h-7 w-9 items-center justify-center rounded-celda border font-ui text-12 font-semibold uppercase',
            estado.fondo,
            estado.texto,
            estado.borde
          )}
        >
          {documento.tipo}
        </span>
        {/* El estado se codifica DOS veces, color e icono, igual que en la
            fila desplegada: cuatro estados distinguidos solo por matiz no los
            separa nadie con una deficiencia de visión del color. El disco del
            color del panel lo recorta contra la etiqueta, que ya va teñida. */}
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1"
        >
          <IconoEstado
            size={11}
            strokeWidth={2.5}
            className={cn(estado.texto, documento.estado === 'procesando' && 'animate-spin')}
          />
        </span>
      </span>
    </ElementoCarril>
  );
}

/**
 * Mismo comparador explícito que `FilaDocumento`, y por el mismo motivo: el
 * objeto `documento` se sustituye entero en cada uno de los ~40 avances de
 * indexación, así que la comparación superficial por defecto daría siempre
 * "cambió" y `memo` no serviría de nada. Con el panel plegado, esta lista y la
 * desplegada están montadas a la vez; sin esto, un lote indexando volvería a
 * pintar las dos.
 */
const FilaCarril = memo(FilaCarrilBase, (previo, siguiente) => {
  const a = previo.documento;
  const b = siguiente.documento;
  return (
    previo.activo === siguiente.activo &&
    a.id === b.id &&
    a.nombre === b.nombre &&
    a.tipo === b.tipo &&
    a.estado === b.estado &&
    a.tamanoBytes === b.tamanoBytes &&
    previo.onSeleccionar === siguiente.onSeleccionar
  );
});
