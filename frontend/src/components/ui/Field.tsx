import { cloneElement, forwardRef, isValidElement, useId, useState, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { nestedFade, springSnappy } from '../../lib/motion';

/**
 * Envoltorio de campo: etiqueta + control + mensaje de ayuda o error.
 * La validación es INCREMENTAL (al salir del campo), nunca al enviar el
 * formulario: el usuario corrige un dato mientras lo tiene en la cabeza, no
 * diez minutos después frente a una lista de errores.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  /*
   * La etiqueta se ASOCIA al control: `htmlFor` + el mismo `id` en el hijo, y
   * el mensaje de ayuda o error por `aria-describedby`. Sin esto, un lector de
   * pantalla anunciaba un campo sin nombre y hacer clic en la etiqueta no
   * enfocaba nada. Si el hijo ya trae su `id`, se respeta.
   */
  const base = useId();
  const hijo = isValidElement(children) ? (children as ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>) : null;
  const idControl = hijo?.props.id ?? `${base}-control`;
  const idMensaje = `${base}-mensaje`;
  const control = hijo
    ? cloneElement(hijo, {
        id: idControl,
        'aria-describedby': error || hint ? idMensaje : hijo.props['aria-describedby'],
        'aria-invalid': error ? true : hijo.props['aria-invalid'],
      })
    : children;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={hijo ? idControl : undefined} className="font-ui text-13 font-medium text-text-2">
          {label}
          {required && <span className="ml-1 text-status-red">*</span>}
        </label>
      )}
      {control}

      {/*
        El renglón del mensaje está RESERVADO (min-h de una línea) y solo se
        cruza la opacidad. Antes se animaba `height: 0 → auto`, que es la
        propiedad más cara que se puede animar —fuerza layout y repintado del
        formulario entero en cada frame— y además empujaba todo lo de abajo: en
        el login, la tarjeta completa brincaba cada vez que aparecía o
        desaparecía el error, justo encima de la sacudida de error. Reservado el
        hueco, el salto desaparece y el fundido cuesta cero.

        Las claves son explícitas porque `AnimatePresence` identifica a sus
        hijos por clave: sin ellas el relevo error → ayuda no disparaba la
        salida de forma fiable.
      */}
      <div id={idMensaje} className="min-h-[16px]">
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p
              key="error"
              variants={nestedFade}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="font-ui text-12 text-status-red"
            >
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              variants={nestedFade}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="font-ui text-12 text-text-3"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// h-10 / px-3.5: con aire suficiente para el pulgar sin llegar a verse
// hinchado. El anillo de foco es el azul de marca al 9%, no el halo del navegador.
const baseInput =
  'h-10 w-full rounded-control border border-hairline bg-surface-1 px-3.5 font-ui text-15 text-text-1 placeholder:text-text-3 transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { valid?: boolean }
>(function Input({ className, readOnly, valid, onBlur, ...props }, ref) {
  const [justValidated, setJustValidated] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        readOnly={readOnly}
        onBlur={(e) => {
          // Palomita efímera al salir del campo: confirma que el dato quedó
          // aceptado sin dejar un adorno permanente en el formulario.
          if (valid !== undefined) {
            setJustValidated(true);
            setTimeout(() => setJustValidated(false), 800);
          }
          onBlur?.(e);
        }}
        className={cn(
          baseInput,
          readOnly && 'cursor-default border-transparent bg-bg text-text-2 focus:ring-0',
          className
        )}
        {...props}
      />
      <AnimatePresence>
        {justValidated && valid && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={springSnappy}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-status-green"
          >
            <Check size={16} strokeWidth={2.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseInput, 'h-auto min-h-[80px] resize-y py-2', className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(baseInput, 'appearance-none pr-9', className)} {...props}>
          {children}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-3"
        />
      </div>
    );
  }
);
