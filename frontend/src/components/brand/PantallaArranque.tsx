import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { easeOutExpo, springRebote } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { marca } from '../../copy';

/**
 * Animación de arranque: el isotipo se arma y "cruza el umbral".
 *
 *   0.00 s  el escalón se traza (600 ms)
 *   0.15 s  los nodos de los extremos aparecen con rebote
 *   0.70 s  el nodo del umbral sube del nivel bajo a su sitio y sale una onda
 *   0.85 s  aparece el nombre
 *   1.60 s  la pantalla se desvanece hacia la app
 *
 * Una vez por sesión del navegador (sessionStorage), y cada vez que la app se
 * abre INSTALADA (modo standalone: ahí es su splash). Con movimiento reducido
 * no se muestra: una animación de bienvenida es puro adorno.
 */
const CLAVE = 'umbral:arranque';
const DURACION_MS = 1600;

// Se decide UNA vez por carga de la página y se recuerda aquí: en desarrollo,
// StrictMode llama dos veces al inicializador del estado, y la segunda
// llamada veía la marca que dejó la primera y la escondía.
let decision: boolean | null = null;

function debeMostrarse(): boolean {
  if (decision === null) decision = decidir();
  return decision;
}

function decidir(): boolean {
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches;
  if (instalada) return true;
  try {
    if (sessionStorage.getItem(CLAVE)) return false;
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    return false; // sin almacenamiento (modo privado estricto): mejor no repetirla en cada carga
  }
  return true;
}

export function PantallaArranque() {
  const reducido = useReducedMotion();
  const [visible, setVisible] = useState(() => !reducido && debeMostrarse());

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), DURACION_MS);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="arranque"
          aria-hidden
          className="fixed inset-0 z-[200] flex items-center justify-center bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: easeOutExpo } }}
        >
          <motion.div
            className="flex flex-col items-center gap-5"
            exit={{ scale: 1.04, transition: { duration: 0.35, ease: easeOutExpo } }}
          >
            <svg viewBox="0 0 24 24" className="h-20 w-20 text-text-1" focusable="false">
              <motion.path
                d="M3 17h9V7h9"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: easeOutExpo }}
              />
              {[
                { cx: 4, cy: 17, delay: 0.15 },
                { cx: 20, cy: 7, delay: 0.45 },
              ].map((n) => (
                <motion.circle
                  key={n.cx}
                  cx={n.cx}
                  cy={n.cy}
                  r={2.1}
                  fill="currentColor"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springRebote, delay: n.delay }}
                />
              ))}
              {/* La onda al cruzar */}
              <motion.circle
                cx={12}
                cy={12}
                r={4.6}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.2}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.6, 1], opacity: [0, 0.6, 0.4] }}
                transition={{ duration: 0.7, delay: 0.85, times: [0, 0.6, 1], ease: easeOutExpo }}
              />
              {/* El nodo del umbral: nace abajo y sube a su sitio con rebote. */}
              <motion.circle
                cx={12}
                r={2.5}
                fill="var(--accent)"
                initial={{ cy: 17, opacity: 0 }}
                animate={{ cy: 12, opacity: 1 }}
                transition={{ cy: { ...springRebote, delay: 0.7 }, opacity: { duration: 0.15, delay: 0.6 } }}
              />
            </svg>
            <motion.span
              className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springRebote, delay: 0.85 }}
            >
              {marca.nombre}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
