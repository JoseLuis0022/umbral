import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PasoGuia } from '../../../types';
import { cn } from '../../../lib/cn';
import { dur, ease, spring } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Button, IconButton, Input, Textarea } from '../../ui';
import { Markdown } from '../../Markdown';
import { useListaOrdenable } from './useListaOrdenable';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Pasos',
  ayuda:
    'El cuerpo del boletín. Cada paso admite markdown: **negritas**, listas, tablas y bloques de código con ```.',
  sangria: 'No sangres el markdown: cuatro espacios al inicio de un renglón lo convierten en bloque de código.',
  agregar: 'Agregar paso',
  tituloPaso: (n: number) => `Título del paso ${n}`,
  contenidoPaso: (n: number) => `Contenido del paso ${n}`,
  placeholderTitulo: 'Abre tu bandeja y filtra por remitente',
  placeholderContenido: 'Escribe aquí lo que hay que hacer, en markdown.',
  subir: (n: number) => `Subir el paso ${n}`,
  bajar: (n: number) => `Bajar el paso ${n}`,
  quitar: (n: number) => `Quitar el paso ${n}`,
  verPaso: (n: number) => `Ver el paso ${n} como se publica`,
  editarPaso: (n: number) => `Volver a editar el paso ${n}`,
  vistaPrevia: 'Vista previa',
  editar: 'Editar',
  vacioContenido: 'Este paso está vacío. Escribe su contenido para que se publique.',
  sinPasos: 'Un boletín sin pasos no se puede publicar. Agrega el primero.',
  caracteres: (n: number) => `${n.toLocaleString('es-MX')} caracteres`,
};

/**
 * Los pasos: el campo más importante del boletín y por eso el que se lleva el
 * espacio. Cada paso es una tarjeta con su número, su título y su markdown.
 *
 * Además de la vista previa global de la pantalla, cada paso tiene su propio
 * conmutador Editar/Vista previa. No es redundante: escribir una tabla de
 * markdown y tener que salir del formulario entero para comprobarla rompe el
 * hilo; aquí se verifica el párrafo sin moverse de sitio.
 */
export function EditorPasos({
  pasos,
  onCambiar,
  deshabilitado,
  invalido,
}: {
  pasos: PasoGuia[];
  onCambiar: (pasos: PasoGuia[]) => void;
  deshabilitado: boolean;
  /** Verdadero cuando ningún paso tiene contenido y ya se intentó guardar. */
  invalido: boolean;
}) {
  const reducido = useReducedMotion();
  const lista = useListaOrdenable(pasos, onCambiar);
  // Qué pasos están en vista previa. Vive por clave, no por índice: al
  // reordenar, la previsualización viaja con su paso.
  const [enPrevia, setEnPrevia] = useState<Record<string, boolean>>({});

  return (
    <section aria-labelledby="titulo-pasos-editor" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="titulo-pasos-editor" className="font-ui text-15 font-semibold text-text-1">
          {TEXTO.titulo}
        </h3>
        <p className="font-ui text-12 text-text-3">{TEXTO.ayuda}</p>
        <p className="font-ui text-12 text-text-3">{TEXTO.sangria}</p>
      </div>

      {pasos.length === 0 && (
        <p
          className={cn(
            'rounded-celda px-3 py-2.5 font-ui text-13',
            invalido ? 'bg-status-red-soft text-status-red' : 'bg-bg text-text-3'
          )}
        >
          {TEXTO.sinPasos}
        </p>
      )}

      <ol className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {pasos.map((paso, i) => {
            const clave = lista.claves[i];
            const previa = Boolean(enPrevia[clave]);
            return (
              <motion.li
                key={clave}
                // `layout="position"`: al reordenar, insertar o borrar, un
                // elemento de la lista solo cambia de SITIO. El layout completo
                // mide además su tamaño y corrige la escala de todo lo que
                // lleva dentro — y aquí dentro va un Textarea que crece con lo
                // que se escribe. Como cada tecla del formulario sube al padre
                // y baja re-renderizando esta lista, esa medición se repetía
                // por pulsación y por elemento.
                layout={reducido ? false : 'position'}
                initial={reducido ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
                transition={reducido ? { duration: dur.fast, ease } : spring}
                className="rounded-tarjeta border border-hairline bg-bg p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-13 font-semibold tabular-nums text-accent-fg"
                  >
                    {i + 1}
                  </span>
                  <Input
                    aria-label={TEXTO.tituloPaso(i + 1)}
                    value={paso.titulo}
                    onChange={(e) => lista.editar(i, { ...paso, titulo: e.target.value })}
                    placeholder={TEXTO.placeholderTitulo}
                    disabled={deshabilitado}
                    className="h-9 flex-1 text-14 font-semibold"
                  />
                </div>

                <div className="mt-2">
                  {previa ? (
                    <div className="min-h-[132px] rounded-control border border-hairline bg-surface-1 px-3.5 py-3">
                      {paso.contenido.trim() ? (
                        <Markdown className="text-14 text-text-2">{paso.contenido}</Markdown>
                      ) : (
                        <p className="font-ui text-13 italic text-text-3">{TEXTO.vacioContenido}</p>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      aria-label={TEXTO.contenidoPaso(i + 1)}
                      value={paso.contenido}
                      onChange={(e) => lista.editar(i, { ...paso, contenido: e.target.value })}
                      placeholder={TEXTO.placeholderContenido}
                      disabled={deshabilitado}
                      spellCheck
                      className="min-h-[132px] w-full font-mono text-13 leading-relaxed"
                    />
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-ui text-12 tabular-nums text-text-3">
                    {TEXTO.caracteres(paso.contenido.length)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setEnPrevia((p) => ({ ...p, [clave]: !previa }))}
                      aria-label={previa ? TEXTO.editarPaso(i + 1) : TEXTO.verPaso(i + 1)}
                      aria-pressed={previa}
                      className="font-normal text-text-2"
                    >
                      {previa ? <Pencil size={14} /> : <Eye size={14} />}
                      <span className="hidden sm:inline">{previa ? TEXTO.editar : TEXTO.vistaPrevia}</span>
                    </Button>
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
                      disabled={deshabilitado || i === pasos.length - 1}
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
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => lista.agregar({ titulo: '', contenido: '' })}
        disabled={deshabilitado}
        className="self-start"
      >
        <Plus size={14} strokeWidth={2.5} />
        {TEXTO.agregar}
      </Button>
    </section>
  );
}
