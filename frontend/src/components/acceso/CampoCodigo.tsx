import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * Campo del código de 6 dígitos del correo de verificación.
 *
 * Un solo input (no seis cajitas): pegar, borrar y el autocompletado de
 * iOS/Android ("one-time-code") funcionan sin trucos. Se queda solo con los
 * dígitos, así que pegar "472 923" también sirve. `alCompletar` se llama al
 * llegar a 6 dígitos para confirmar sin otro clic.
 */
export const CampoCodigo = forwardRef<
  HTMLInputElement,
  {
    valor: string;
    alCambiar: (v: string) => void;
    alCompletar?: (v: string) => void;
    invalido?: boolean;
    deshabilitado?: boolean;
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }
>(function CampoCodigo({ valor, alCambiar, alCompletar, invalido, deshabilitado, ...resto }, ref) {
  return (
    <input
      ref={ref}
      {...resto}
      value={valor}
      onChange={(e) => {
        const limpio = e.target.value.replace(/\D/g, '').slice(0, 6);
        alCambiar(limpio);
        if (limpio.length === 6 && limpio !== valor) alCompletar?.(limpio);
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      disabled={deshabilitado}
      spellCheck={false}
      className={cn(
        // Mismo borde y anillo de foco que el Input del sistema, en grande y
        // espaciado: se copia a mano mirando el teléfono.
        'h-14 w-full rounded-control border border-hairline bg-surface-1 px-4 pl-[calc(1rem+0.4em)] text-center font-mono text-28 font-semibold tracking-[0.4em] text-text-1',
        'transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft disabled:opacity-60',
        invalido && 'border-status-red focus:border-status-red'
      )}
    />
  );
});
