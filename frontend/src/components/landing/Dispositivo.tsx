import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { ease, springEscena } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { esServidor, llegoPrerenderizada } from '../../lib/prerender';

/**
 * Capturas reales de Umbral dentro de su dispositivo (PNG transparente a 2×,
 * convertido a WebP). Medidas REALES de cada archivo: con `width` y `height`
 * el navegador reserva el hueco antes de que llegue la imagen y nada brinca
 * (CLS ≈ 0). Si se regenera una imagen, se actualiza aquí su tamaño.
 */
export const IMAGENES = {
  'mac-chat': { ancho: 2820, alto: 1957 },
  'iphone-chat': { ancho: 1059, alto: 1929 },
  'mac-tablero': { ancho: 2820, alto: 1957 },
  'mac-auditoria': { ancho: 2820, alto: 1957 },
  'mac-corpus': { ancho: 2820, alto: 1957 },
} as const;

export type NombreImagen = keyof typeof IMAGENES;

const RUTA = `${import.meta.env.BASE_URL}landing/`;

export function Dispositivo({
  nombre,
  alt,
  prioridad = false,
  sizes,
  className,
}: {
  nombre: NombreImagen;
  alt: string;
  prioridad?: boolean;
  sizes: string;
  className?: string;
}) {
  const { ancho, alto } = IMAGENES[nombre];
  return (
    <img
      src={`${RUTA}${nombre}.webp`}
      alt={alt}
      width={ancho}
      height={alto}
      sizes={sizes}
      loading={prioridad ? 'eager' : 'lazy'}
      // En minúsculas: React 18 no conoce `fetchPriority` y avisa en consola.
      {...{ fetchpriority: prioridad ? 'high' : 'auto' }}
      decoding="async"
      draggable={false}
      className={cn('block h-auto w-full select-none', className)}
    />
  );
}

/**
 * Entrada de la portada: el ÚNICO momento de movimiento al cargar. La Mac
 * aparece con un fundido y sube un poco; el iPhone llega un instante después,
 * desde un poco más abajo, como si se apoyara delante. Espera a que la imagen
 * esté decodificada: animar un hueco vacío y que la foto aparezca de golpe al
 * final es justo lo que la entrada quería evitar.
 *
 * Sin entrada cuando el HTML vino prerenderizado: la Mac ya estaba en
 * pantalla, y hacerla desaparecer para volver a entrar sería un parpadeo. En
 * el servidor, visible (ver src/lib/prerender.ts).
 */
export function EntradaDispositivo({
  children,
  retraso = 0,
  desplazamiento = 24,
  className,
}: {
  children: ReactNode;
  retraso?: number;
  desplazamiento?: number;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const caja = useRef<HTMLDivElement>(null);
  const [lista, setLista] = useState(false);
  const [sinEntrada] = useState(() => esServidor || llegoPrerenderizada());

  useEffect(() => {
    if (sinEntrada) return;
    const img = caja.current?.querySelector('img');
    if (!img) return setLista(true);
    if (img.complete) return setLista(true);
    const listo = () => setLista(true);
    img.addEventListener('load', listo, { once: true });
    img.addEventListener('error', listo, { once: true });
    // Red de seguridad: con una red lenta, mejor aparecer que esperar para siempre.
    const t = setTimeout(listo, 2500);
    return () => {
      img.removeEventListener('load', listo);
      img.removeEventListener('error', listo);
      clearTimeout(t);
    };
  }, [sinEntrada]);

  return (
    <motion.div
      ref={caja}
      className={className}
      initial={sinEntrada ? false : reducido ? { opacity: 0 } : { opacity: 0, y: desplazamiento }}
      animate={lista && !sinEntrada ? { opacity: 1, y: 0 } : undefined}
      transition={
        reducido
          ? { duration: 0.3, ease }
          : { y: { ...springEscena, delay: retraso }, opacity: { duration: 0.6, ease, delay: retraso } }
      }
    >
      {children}
    </motion.div>
  );
}
