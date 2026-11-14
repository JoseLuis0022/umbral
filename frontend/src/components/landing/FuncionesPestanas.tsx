import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ease, springLayout } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
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
 * cambia con fundido cruzado y una leve escala: las dos capturas se apilan en
 * un hueco de proporción fija, así que nada brinca al cambiar.
 *
 * Avance automático cada AVANCE_MS: la pestaña activa lleva una barra fina que
 * se llena y, al terminar, pasa a la siguiente. Se pausa mientras el puntero o
 * el foco están en la sección y cuando no se ve en pantalla; con movimiento
 * reducido no avanza sola (un carrusel que se mueve solo es justo lo que esa
 * preferencia pide evitar). El fondo de la pestaña activa se desliza de una a
 * otra (`layoutId`).
 */
const AVANCE_MS = 6000;

export function FuncionesPestanas({ pestanas, etiqueta }: { pestanas: readonly Pestana[]; etiqueta: string }) {
  const [activa, setActiva] = useState(0);
  const [encima, setEncima] = useState(false);
  const base = useId();
  const seccion = useRef<HTMLDivElement>(null);
  const enVista = useInView(seccion, { amount: 0.35 });
  const reducido = useReducedMotion();
  const automatico = !reducido;
  const pausado = encima || !enVista;
  const siguiente = () => setActiva((i) => (i + 1) % pestanas.length);
  // Solo se anima el panel cuando CAMBIA de pestaña: en el primer render (y en
  // el prerender) el texto sale visible, nunca con opacidad 0.
  const previa = useRef(activa);
  const huboCambio = useRef(false);
  if (previa.current !== activa) {
    previa.current = activa;
    huboCambio.current = true;
  }
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
    <div
      ref={seccion}
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
      }}
    >
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
                'relative h-11 shrink-0 overflow-hidden rounded-control px-4 font-ui text-15 font-medium transition-colors duration-150 focus-visible:outline-white',
                i === activa ? 'text-white' : 'text-marca-pizarra-300 hover:text-white'
              )}
            >
              {i === activa && (
                <motion.span
                  layoutId={`${base}-indicador`}
                  transition={reducido ? { duration: 0 } : springLayout}
                  className="absolute inset-0 rounded-control bg-white/[.1]"
                  aria-hidden="true"
                />
              )}
              <span className="relative">{p.nombre}</span>
              {i === activa && automatico && (
                // La barra se reinicia en cada cambio (key) y al llenarse avanza.
                <span
                  key={activa}
                  aria-hidden="true"
                  onAnimationEnd={siguiente}
                  className="absolute inset-x-3 bottom-1 h-[2px] origin-left rounded-full bg-white/60"
                  style={{
                    animation: `avance-pestana ${AVANCE_MS}ms linear forwards`,
                    animationPlayState: pausado ? 'paused' : 'running',
                  }}
                />
              )}
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
                initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducido ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.45, ease }}
              >
                <Dispositivo nombre={actual.imagen} alt={actual.alt} sizes="(min-width: 1024px) 820px, 94vw" />
              </motion.div>
            </AnimatePresence>
          </div>
        </Revelar>

        <Revelar>
          {pestanas.map((p, i) => (
            <motion.div
              // El panel activo entra con un fundido y una leve subida; los
              // demás quedan en el HTML con `hidden` (prerender y lectores).
              key={i === activa ? `${p.id}-activo` : p.id}
              initial={i === activa && huboCambio.current && !reducido ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease }}
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
            </motion.div>
          ))}
        </Revelar>
      </div>
    </div>
  );
}
