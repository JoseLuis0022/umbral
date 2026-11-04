import { useId } from 'react';
import { cn } from '../../../lib/cn';
import { copyLab } from './copyLocal';

const MIN = 0;
const MAX = 1;
const PASO = 0.05;

/**
 * Deslizador de temperatura, 0 → 1 con paso de 0.05.
 *
 * Es un `input[type=range]` nativo y no un control a mano: trae gratis el
 * teclado (flechas, Inicio/Fin), el arrastre con inercia del sistema y el
 * anuncio correcto en lectores de pantalla. Lo único que se reemplaza es la
 * pintura — la pista se dibuja con un gradiente de fondo, así que el tramo
 * recorrido se ve en el color de marca sin un solo div extra.
 *
 * La caja del input mide 24 px de alto aunque la pista visible mida 6: es lo
 * que hace que el pulgar tenga dónde caer sin engordar el diseño.
 */
export function ControlTemperatura({
  valor,
  onCambiar,
  disabled,
}: {
  valor: number;
  onCambiar: (valor: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const porcentaje = ((valor - MIN) / (MAX - MIN)) * 100;

  return (
    <div className={cn('flex flex-col gap-1.5', disabled && 'opacity-60')}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-ui text-13 font-medium text-text-2">
          {copyLab.temperaturaEtiqueta}
        </label>
        <span className="font-mono text-13 tabular-nums text-text-1">{valor.toFixed(2)}</span>
      </div>

      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={PASO}
        value={valor}
        disabled={disabled}
        onChange={(e) => onCambiar(Number(e.target.value))}
        style={{
          backgroundImage: `linear-gradient(to right, var(--accent) ${porcentaje}%, var(--hairline) ${porcentaje}%)`,
          backgroundSize: '100% 6px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className={cn(
          'h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft',
          'disabled:cursor-not-allowed',
          // Pulgar: círculo blanco con hairline y sombra en capas, igual que
          // cualquier otra superficie flotante del sistema.
          '[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-hairlineStrong',
          '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-2 [&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95',
          '[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-hairlineStrong [&::-moz-range-thumb]:bg-white',
          '[&::-moz-range-track]:bg-transparent'
        )}
      />

      <div className="flex items-center justify-between font-ui text-12 text-text-3">
        <span>{copyLab.temperaturaMin}</span>
        <span>{copyLab.temperaturaMax}</span>
      </div>

      <p className="font-ui text-12 text-text-3">{copyLab.temperaturaAyuda}</p>
    </div>
  );
}
