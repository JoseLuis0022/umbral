import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { Guia } from '../../../types';
import { cn } from '../../../lib/cn';
import { dur, ease } from '../../../lib/motion';
import { Button, IconButton, Tabs, type TabItem } from '../../ui';
import { admin as copy } from '../../../copy';
import { FormularioBoletin } from './FormularioBoletin';
import { VistaPreviaBoletin } from './VistaPreviaBoletin';

export type PestanaEditor = 'editar' | 'previa';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  panel: 'Editor del boletín',
  volver: 'Volver a la lista de boletines',
  sinTitulo: 'Boletín sin título',
  publicar: 'Publicar boletín',
  sucio: 'Cambios sin guardar',
  nuevo: 'Todavía no se ha publicado',
  editado: 'Editado desde administración',
  publicado: 'Publicado tal como se redactó',
  pestanas: [
    { value: 'editar', label: 'Editar' },
    { value: 'previa', label: 'Vista previa' },
  ] as TabItem[],
};

/**
 * Panel derecho: donde se redacta el boletín.
 *
 * La cabecera es fija y lleva el estado sucio junto a los dos botones que lo
 * resuelven —es donde la mirada ya está cuando decide— mientras el cuerpo
 * scrollea. Sin esto, escribir un paso de treinta renglones dejaría "Guardar
 * cambios" fuera de pantalla justo cuando hace falta.
 */
export function EditorBoletin({
  guia,
  esNuevo,
  marcaEditado,
  sucio,
  guardando,
  pestana,
  mostrarErrores,
  errorTitulo,
  errorPasos,
  puedeRestaurar,
  onPestana,
  onCampo,
  onGuardar,
  onDescartar,
  onEliminar,
  onRestaurar,
  onVolver,
  className,
}: {
  guia: Guia;
  esNuevo: boolean;
  marcaEditado: boolean;
  sucio: boolean;
  guardando: boolean;
  pestana: PestanaEditor;
  mostrarErrores: boolean;
  errorTitulo: string | null;
  errorPasos: string | null;
  puedeRestaurar: boolean;
  onPestana: (valor: PestanaEditor) => void;
  onCampo: (parcial: Partial<Guia>) => void;
  onGuardar: () => void;
  onDescartar: () => void;
  onEliminar: () => void;
  onRestaurar: () => void;
  onVolver: () => void;
  className?: string;
}) {
  const estadoLinea = esNuevo ? TEXTO.nuevo : marcaEditado ? TEXTO.editado : TEXTO.publicado;

  // Abrir un boletín no mueve el foco por sí solo: en móvil la lista
  // desaparece y quien navega con teclado o lector de pantalla se quedaría en
  // un botón que ya no existe. Se lleva al encabezado del editor, sin scroll,
  // para no pelearse con la cascada de entrada de la pantalla.
  const encabezado = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    encabezado.current?.focus({ preventScroll: true });
  }, [guia.id]);

  return (
    <section
      aria-label={TEXTO.panel}
      className={cn(
        'min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        className
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-3 py-3 sm:px-4">
        <IconButton aria-label={TEXTO.volver} onClick={onVolver} className="lg:hidden">
          <ArrowLeft size={18} />
        </IconButton>

        {/* En teléfono el título se queda con su renglón (junto a la flecha) y
            las acciones bajan al siguiente, alineadas a la derecha: compartir
            fila dejaba el título en tres letras y unos puntos suspensivos. */}
        <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-0">
          {/* tabIndex -1: destino de foco al abrir, no parada del tabulador. */}
          <h2
            ref={encabezado}
            tabIndex={-1}
            className={cn(
              'truncate font-ui text-15 font-semibold',
              guia.titulo.trim() ? 'text-text-1' : 'italic text-text-3'
            )}
          >
            {guia.titulo.trim() || TEXTO.sinTitulo}
          </h2>
          <p className="truncate font-ui text-12 text-text-3">{estadoLinea}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AnimatePresence initial={false}>
            {sucio && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur.fast, ease }}
                role="status"
                className="hidden items-center gap-2 font-ui text-12 text-text-2 sm:inline-flex"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-status-amber" aria-hidden />
                {TEXTO.sucio}
              </motion.span>
            )}
          </AnimatePresence>

          <Button variant="ghost" size="sm" type="button" onClick={onDescartar} disabled={!sucio || guardando}>
            {copy.descartar}
          </Button>
          {/* Único relleno de acento interactivo de la pantalla. */}
          <Button variant="primary" size="sm" type="button" onClick={onGuardar} disabled={!sucio} loading={guardando}>
            {esNuevo ? TEXTO.publicar : copy.guardarCambios}
          </Button>
        </div>
      </header>

      <div className="shrink-0 px-3 pt-3 sm:px-5">
        <Tabs
          items={TEXTO.pestanas}
          value={pestana}
          onChange={(v) => onPestana(v as PestanaEditor)}
          layoutId="boletines-pestanas"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {pestana === 'editar' ? (
          <FormularioBoletin
            guia={guia}
            guardando={guardando}
            mostrarErrores={mostrarErrores}
            errorTitulo={errorTitulo}
            errorPasos={errorPasos}
            esNuevo={esNuevo}
            puedeRestaurar={puedeRestaurar}
            onCampo={onCampo}
            onRestaurar={onRestaurar}
            onEliminar={onEliminar}
          />
        ) : (
          <VistaPreviaBoletin guia={guia} />
        )}
      </div>
    </section>
  );
}
