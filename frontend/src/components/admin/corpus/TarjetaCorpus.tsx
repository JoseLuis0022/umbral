import { motion } from 'framer-motion';
import { Pencil, Plus } from 'lucide-react';
import type { Corpus } from '../../../types';
import { cn } from '../../../lib/cn';
import { springSnappy } from '../../../lib/motion';
import { tamanoLegible } from '../../../lib/fechas';
import { Skeleton } from '../../ui';
import { admin as copy } from '../../../copy';
import { iconoDeCorpus } from './iconos';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  abrir: (nombre: string) => `Abrir la base ${nombre}`,
  editar: (nombre: string) => `Editar la base ${nombre}`,
};

/**
 * Ficha de una base en la tira selectora.
 *
 * Era una tarjeta de 150 px con descripción, etiquetas de agente y tres
 * métricas en columnas. Se redujo a una ficha de una línea por dos motivos:
 *
 * 1. Elegir base es un paso PREVIO, no el contenido de la pantalla. Los 250 px
 *    que se comía la tira salían del visor, que es donde de verdad se trabaja.
 * 2. Todo lo que se quitó (descripción, agentes, fecha) se ve ahora en
 *    `BarraCorpus`, para la base abierta y sin pagar alto por cada base.
 *
 * Alto y padding son idénticos en las tres variantes (`p-3` uniforme, icono de
 * 36 px, dos renglones de texto), y el ancho lo fija la tira: nada aquí puede
 * empujar el alto de la fila.
 *
 * EL LÁPIZ SOLO SALE EN LA FICHA ACTIVA, y ahí está SIEMPRE visible — no al
 * pasar el cursor. Dos razones:
 *
 * 1. En táctil no hay hover: un control que solo existe con el puntero encima
 *    es un control que no existe. Es la misma regla del menú de `FilaDocumento`.
 * 2. Los 36 px que ocupa se los quita al nombre, y no vale la pena pagarlos en
 *    las cinco fichas a la vez para una acción que se hace sobre la base que se
 *    está usando. Editar una base que no está abierta cuesta un paso más
 *    (elegirla), igual que abrir su system prompt.
 *
 * Mide 36 px y no 44 porque el alto útil de la ficha es exactamente 36 (60 de
 * ficha − 12 de padding arriba y abajo): un control mayor se comería el padding
 * uniforme. El objetivo grande sigue siendo la ficha entera, 220 × 60.
 */
export function TarjetaCorpus({
  corpus,
  activo,
  documentos,
  bytes,
  onSeleccionar,
  onEditar,
}: {
  corpus: Corpus;
  activo: boolean;
  documentos: number;
  bytes: number;
  onSeleccionar: () => void;
  onEditar: () => void;
}) {
  // El icono es un DATO de la base (`corpus.icono`), elegido al crearla, no un
  // mapa por id cableado aquí: una base nueva llega con el suyo y se distingue
  // de las demás desde el primer pintado. Si la clave guardada no existe en el
  // catálogo, `iconoDeCorpus` cae al neutro. Es decorativo: el nombre de la
  // base ya está escrito al lado, así que no lleva texto alternativo.
  const Icono = iconoDeCorpus(corpus.icono);

  return (
    <motion.div
      // `springSnappy` y −1 px, como `Card` y `Button`: el mismo gesto no puede
      // tener tres físicas distintas según dónde se pose el cursor.
      whileHover={{ y: -1 }}
      transition={springSnappy}
      className={cn(
        // rounded-control y no rounded-tarjeta: 20 px de radio sobre 60 px de
        // alto se lee como pastilla, y la pastilla completa está reservada.
        'group relative flex h-full items-center gap-3 rounded-control border p-3 shadow-1 transition-colors duration-150',
        activo ? 'border-accent bg-accent-soft' : 'border-hairline bg-surface-1 hover:shadow-2'
      )}
    >
      {/* Enlace extendido: la ficha entera selecciona con un solo botón real
          en el DOM, sin controles anidados dentro de otro control. */}
      <button
        type="button"
        onClick={onSeleccionar}
        aria-pressed={activo}
        className="absolute inset-0 rounded-control"
      >
        <span className="sr-only">{textos.abrir(corpus.nombre)}</span>
      </button>

      <span
        className={cn(
          'pointer-events-none flex h-9 w-9 shrink-0 items-center justify-center rounded-celda transition-colors duration-150',
          activo ? 'bg-accent text-white' : 'bg-bg text-text-2 group-hover:text-accent-fg'
        )}
      >
        <Icono size={18} strokeWidth={1.75} />
      </span>

      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate font-ui text-14 font-semibold text-text-1">{corpus.nombre}</p>
        {/* `truncate` incluye `white-space: nowrap`: la cifra y su unidad
            ("8.7 MB") no se pueden partir en dos renglones ni descuadrar la
            ficha. Si no cabe, se recorta con elipsis y el alto no cambia. */}
        <p className="truncate font-ui text-12 tabular-nums text-text-3">
          {copy.documentos(documentos)} · {tamanoLegible(bytes)}
        </p>
      </div>

      {/* `relative z-10` lo saca de debajo del enlace extendido, que cubre la
          ficha entera con `absolute inset-0`. No es un control ANIDADO en otro
          —son hermanos en el DOM—, así que sigue habiendo un solo botón por
          acción y el lector no anuncia un botón dentro de un botón. */}
      {activo && (
        <button
          type="button"
          onClick={onEditar}
          aria-label={textos.editar(corpus.nombre)}
          className={cn(
            'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-celda',
            'text-text-2 transition-colors duration-150 hover:bg-surface-1 hover:text-accent-fg',
            // El anillo se dibuja FUERA del botón, o sea encima del relleno de
            // la ficha activa, que es `accent-soft`: con el anillo tenue de
            // siempre el foco sería invisible justo aquí. Va el acento pleno
            // sobre chip blanco, que es la única combinación que se ve.
            'focus-visible:bg-surface-1 focus-visible:text-accent-fg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
          )}
        >
          <Pencil size={15} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  );
}

/** Última ficha de la tira. Borde punteado y sin relleno: se lee como un hueco
 *  por llenar, no como una base más. Mismo padding y mismo icono de 36 px que
 *  la ficha real, así que mide exactamente lo mismo. */
export function TarjetaNuevoCorpus({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={springSnappy}
      className="flex h-full w-full items-center gap-3 rounded-control border border-dashed border-hairlineStrong p-3 text-left transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-celda bg-bg text-text-2">
        <Plus size={18} />
      </span>
      <span className="truncate font-ui text-14 font-semibold text-text-1">{copy.nuevoCorpus}</span>
    </motion.button>
  );
}

/** El alto lo impone la tira (una sola clase para todas las fichas), así que
 *  el esqueleto solo se estira: es imposible que mida distinto que el dato
 *  real y que el layout brinque al cargar. */
export function TarjetaCorpusEsqueleto() {
  return <Skeleton className="h-full rounded-control" />;
}
