import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { dur, ease, spring } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Button, IconButton, Textarea } from '../../ui';
import { useListaOrdenable } from './useListaOrdenable';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Antes de empezar',
  ayuda: 'Lo que la persona necesita tener a la mano antes del primer paso. Se lee como lista; una idea por renglón.',
  agregar: 'Agregar requisito',
  placeholder: 'Tu cuenta @aurora.edu.mx activa.',
  etiqueta: (n: number) => `Requisito ${n}`,
  subir: (n: number) => `Subir el requisito ${n}`,
  bajar: (n: number) => `Bajar el requisito ${n}`,
  quitar: (n: number) => `Quitar el requisito ${n}`,
  vacio: 'Sin requisitos. Si el boletín no exige nada previo, déjalo así: el bloque no se publica.',
};

/**
 * Requisitos: una lista de cadenas que se ordena, se edita y se recorta.
 *
 * El control es un `Textarea` y no un `Input` porque en la semilla los
 * requisitos reales miden dos o tres renglones: con un campo de una línea, el
 * texto se lee por una rendija y nadie revisa lo que no puede ver entero.
 *
 * El reordenamiento va con botones y no con arrastre: un arrastre sin
 * equivalente de teclado deja fuera a quien no usa ratón, y aquí el orden es
 * contenido, no decoración.
 */
export function ListaRequisitos({
  requisitos,
  onCambiar,
  deshabilitado,
}: {
  requisitos: string[];
  onCambiar: (requisitos: string[]) => void;
  deshabilitado: boolean;
}) {
  const reducido = useReducedMotion();
  const lista = useListaOrdenable(requisitos, onCambiar);

  return (
    <section aria-labelledby="titulo-requisitos-editor" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-requisitos-editor" className="font-ui text-15 font-semibold text-text-1">
          {TEXTO.titulo}
        </h3>
        <p className="font-ui text-12 text-text-3">{TEXTO.ayuda}</p>
      </div>

      {requisitos.length === 0 ? (
        <p className="rounded-celda bg-bg px-3 py-2.5 font-ui text-13 text-text-3">{TEXTO.vacio}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {requisitos.map((requisito, i) => (
              <motion.li
                key={lista.claves[i]}
                // `layout="position"`: al reordenar, insertar o borrar, un
                // elemento de la lista solo cambia de SITIO. El layout completo
                // mide además su tamaño y corrige la escala de todo lo que
                // lleva dentro — y aquí dentro va un Textarea que crece con lo
                // que se escribe. Como cada tecla del formulario sube al padre
                // y baja re-renderizando esta lista, esa medición se repetía
                // por pulsación y por elemento.
                layout={reducido ? false : 'position'}
                initial={reducido ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
                transition={reducido ? { duration: dur.fast, ease } : spring}
                className="rounded-celda border border-hairline bg-bg p-2"
              >
                <Textarea
                  aria-label={TEXTO.etiqueta(i + 1)}
                  value={requisito}
                  onChange={(e) => lista.editar(i, e.target.value)}
                  placeholder={TEXTO.placeholder}
                  disabled={deshabilitado}
                  rows={2}
                  className="min-h-[64px] w-full text-14"
                />
                {/* La barra va DEBAJO del campo y no a su lado: los tres
                    controles conservan su target de 44 px en móvil sin
                    estirar el campo a la altura de tres botones apilados. */}
                <div className="mt-1 flex items-center justify-end gap-0.5">
                  <IconButton
                    aria-label={TEXTO.subir(i + 1)}
                    onClick={() => lista.mover(i, -1)}
                    disabled={deshabilitado || i === 0}
                  >
                    <ChevronUp size={16} />
                  </IconButton>
                  <IconButton
                    aria-label={TEXTO.bajar(i + 1)}
                    onClick={() => lista.mover(i, 1)}
                    disabled={deshabilitado || i === requisitos.length - 1}
                  >
                    <ChevronDown size={16} />
                  </IconButton>
                  <IconButton
                    aria-label={TEXTO.quitar(i + 1)}
                    onClick={() => lista.quitar(i)}
                    disabled={deshabilitado}
                    className="hover:bg-status-red-soft hover:text-status-red"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => lista.agregar('')}
        disabled={deshabilitado}
        className="self-start"
      >
        <Plus size={14} strokeWidth={2.5} />
        {TEXTO.agregar}
      </Button>
    </section>
  );
}
