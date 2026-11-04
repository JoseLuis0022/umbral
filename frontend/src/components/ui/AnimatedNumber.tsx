import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, useInView, animate } from 'framer-motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { easeOutExpo } from '../../lib/motion';

/**
 * Estándar obligatorio para toda cifra grande del sistema (KPIs, contadores,
 * totales). Tres reglas de comportamiento, cada una por una razón concreta:
 *
 * 1. Se dispara cuando el elemento ENTRA en el viewport, no al montar la app.
 *    Si la tarjeta está bajo el pliegue, contarla al cargar significa que el
 *    usuario nunca ve el conteo: para cuando hace scroll, ya terminó.
 * 2. No cuenta desde 0. Arranca 10-15 puntos antes del valor final — un conteo
 *    largo se lee como barra de progreso, no como una cifra que "ya casi está
 *    resuelta". Con valores pequeños el clamp a 0 da un conteo corto normal.
 * 3. Desaceleración diseñada (ease-out expo), no spring: un spring avanza casi
 *    a ritmo parejo en el tramo medio y no transmite que los últimos números
 *    llegan más lento, que es justo lo que hace que el conteo se sienta que
 *    está "aterrizando".
 */
/* Un conteo más largo que el `reveal` del sistema (450 ms) a propósito: no
 * responde a un input y su gracia es justo la desaceleración final larga. Vive
 * aquí como constante nombrada y no como literal suelto dentro del `animate`. */
const DUR_CONTEO = 0.9;

/** Margen antes de dar por hecho que el KPI no va a entrar en vista. */
const MS_RESCATE = 1600;

export function AnimatedNumber({
  value,
  format = (n: number) => Math.round(n).toLocaleString('es-MX'),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '0px 0px -80px 0px' });
  const startOffset = useRef(10 + Math.round(Math.random() * 5)); // fijo por instancia
  const motionValue = useMotionValue(Math.max(0, value - startOffset.current));
  const rounded = useTransform(motionValue, (v: number) => format(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInView) return;
    if (reduced) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: DUR_CONTEO, ease: [...easeOutExpo] });
    return () => controls.stop();
  }, [isInView, value, reduced, motionValue]);

  /*
   * Red de seguridad, y no es paranoia: sin ella la animación podía dejar en
   * pantalla un número FALSO de forma permanente.
   *
   * El valor de reposo es `value - 10..15`, y solo se corrige cuando el
   * elemento entra en el viewport. Si nunca entra —una tarjeta que queda fuera
   * de la rejilla en un ancho intermedio, un panel plegado, un contenedor que
   * no llega a scrollear— el KPI se queda mostrando esa cifra rebajada como si
   * fuera el dato. Un "Riesgo alto: 3" leído como "0" no es una animación que
   * no se ejecutó: es información equivocada.
   *
   * Pasado el margen, el valor real se escribe aunque nadie lo haya mirado.
   */
  useEffect(() => {
    if (isInView) return;
    const t = setTimeout(() => motionValue.set(value), MS_RESCATE);
    return () => clearTimeout(t);
  }, [isInView, value, motionValue]);

  useEffect(() => rounded.on('change', (v) => {
    if (ref.current) ref.current.textContent = v;
  }), [rounded]);

  // Antes de entrar en vista se muestra el punto de partida, no el valor
  // final: así el conteo es real cuando el usuario lo ve, nunca un salto
  // desde una cifra ya resuelta de antemano.
  return (
    <span ref={containerRef}>
      <span ref={ref} className={className}>
        {format(Math.max(0, value - startOffset.current))}
      </span>
    </span>
  );
}
