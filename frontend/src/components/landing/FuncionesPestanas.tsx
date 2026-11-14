import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ease } from '../../lib/motion';
import { Dispositivo, IMAGENES, type NombreImagen } from './Dispositivo';
import { Revelar } from './primitivos';

type Pestana = {
  id: string;
  nombre: string;
  imagen: NombreImagen;
  alt: string;
  titulo: string;
  puntos: readonly string[];
};

/**
 * Funciones en pestañas, sobre la banda oscura (los dispositivos lucen más
 * sobre pizarra). Patrón de pestañas de WAI-ARIA: `tablist` con foco móvil
 * (solo la pestaña activa entra en el orden de tabulación), flechas, Inicio y
 * Fin para moverse, y activación al mover el foco.
 *
 * Los cuatro paneles van en el HTML (los inactivos con `hidden`): el
 * prerender los entrega a buscadores y lectores aunque no se vean. La imagen
 * es lo único que cambia con fundido cruzado: las dos capturas se apilan en un
 * hueco de proporción fija, así que nada brinca al cambiar.
 */
export function FuncionesPestanas({ pestanas, etiqueta }: { pestanas: readonly Pestana[]; etiqueta: string }) {
  const [activa, setActiva] = useState(0);
  const base = useId();
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const actual = pestanas[activa];
  const { ancho, alto } = IMAGENES[actual.imagen];

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const ultimo = pestanas.length - 1;
    const destino =
      e.key === 'ArrowRight' ? (activa === ultimo ? 0 : activa + 1)
      : e.key === 'ArrowLeft' ? (activa === 0 ? ultimo : activa - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? ultimo
      : null;
    if (destino === null) return;
    e.preventDefault();
    setActiva(destino);
    botones.current[destino]?.focus();
  }

  return (
    <div>
      <Revelar className="flex justify-center">
        <div
          role="tablist"
          aria-label={etiqueta}
          onKeyDown={alTeclear}
          className="-mx-4 flex max-w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 py-1 sm:mx-0 sm:max-w-full sm:px-1"
        >
          {pestanas.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-pestana-${p.id}`}
              aria-selected={i === activa}
              aria-controls={`${base}-panel-${p.id}`}
              tabIndex={i === activa ? 0 : -1}
              onClick={() => setActiva(i)}
              className={cn(
                'relative h-11 shrink-0 rounded-control px-4 font-ui text-15 font-medium transition-colors duration-150 focus-visible:outline-white',
                i === activa ? 'bg-white/[.1] text-white' : 'text-marca-pizarra-300 hover:text-white'
              )}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </Revelar>

      <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <Revelar variante="dispositivo" className="-mx-3 sm:mx-0 lg:-ml-20 xl:-ml-28">
          {/* Hueco de proporción fija: las dos capturas se apilan durante el fundido. */}
          <div className="relative" style={{ aspectRatio: `${ancho} / ${alto}` }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={actual.imagen}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease }}
              >
                <Dispositivo nombre={actual.imagen} alt={actual.alt} sizes="(min-width: 1024px) 820px, 94vw" />
              </motion.div>
            </AnimatePresence>
          </div>
        </Revelar>

        <Revelar>
          {pestanas.map((p, i) => (
            <div
              key={p.id}
              role="tabpanel"
              id={`${base}-panel-${p.id}`}
              aria-labelledby={`${base}-pestana-${p.id}`}
              hidden={i !== activa}
            >
              <h3 className="font-ui text-28 tracking-[-0.02em] text-white">{p.titulo}</h3>
              <ul className="mt-6">
                {p.puntos.map((punto) => (
                  <li key={punto} className="flex gap-3 border-t border-white/10 py-3.5 font-ui text-15 text-marca-pizarra-200">
                    <Check size={16} strokeWidth={2} aria-hidden="true" className="mt-[3px] shrink-0 text-marca-pizarra-400" />
                    {punto}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Revelar>
      </div>
    </div>
  );
}
