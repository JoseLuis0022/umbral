import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { MarcaPlana } from '../components/brand/Logo';
import { cn } from '../lib/cn';
import { dur, ease, springPress } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { landing as copy } from '../copy';

/**
 * Landing pública: lo que ve en `/` quien no ha iniciado sesión.
 *
 * Para reclutadores, desarrolladores y equipos que buscan llevar un agente a
 * producción. Reglas (apple-feel-design y las de diseño "que no se lea hecho con IA"):
 *  - Editorial y sobria: alineada a la izquierda, separada por líneas finas,
 *    sin tarjetas flotantes, sin degradados de fondo ni íconos en cuadritos.
 *  - Lo único "llamativo" son las capturas reales en sus dispositivos.
 *  - Un solo botón primario (Probar la demo); lo demás es secundario o texto.
 *  - Sin cascadas de entrada: solo la captura principal aparece con un fundido,
 *    para que no "salte" al terminar de cargar.
 *  - Cifras con fecha y fuente, todas comprobables.
 */

const RUTA_IMAGENES = `${import.meta.env.BASE_URL}landing/`;

const MotionLink = motion.create(Link);

const base =
  'inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 font-ui text-15 font-medium transition-colors duration-150';
const estilos = {
  primario: 'bg-accent text-white shadow-1 hover:bg-accent-strong',
  secundario: 'bg-surface-1 text-text-1 shadow-anillo hover:bg-tinta/[.04]',
};

function Seccion({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border-t border-hairline py-16 sm:py-24', className)} aria-label={etiqueta}>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        <p className="font-ui text-14 font-medium text-text-2">{etiqueta}</p>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function Captura({ nombre, alt, prioridad = false }: { nombre: string; alt: string; prioridad?: boolean }) {
  return (
    <img
      src={`${RUTA_IMAGENES}${nombre}.webp`}
      alt={alt}
      // Tamaño real del archivo: el navegador reserva el hueco y nada brinca al cargar.
      width={nombre === 'hero' ? 1720 : 1540}
      height={nombre === 'hero' ? 980 : 940}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
      className="block h-auto w-full select-none"
      draggable={false}
    />
  );
}

export default function Landing() {
  const reducido = useReducedMotion();
  const presion = reducido ? undefined : { scale: 0.97 };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-bg">
      <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-12">
        {/* ── Cabecera ─────────────────────────────────────────────── */}
        <header className="flex h-20 items-center justify-between">
          <MarcaPlana />
          <nav className="flex items-center gap-2">
            <a
              href={copy.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-control px-3 font-ui text-14 text-text-2 transition-colors duration-150 hover:bg-tinta/[.05] hover:text-text-1"
            >
              {copy.nav.codigo}
            </a>
            <MotionLink
              to="/login"
              whileTap={presion}
              transition={springPress}
              className="inline-flex h-10 items-center rounded-control bg-surface-1 px-4 font-ui text-14 font-medium text-text-1 shadow-anillo transition-colors duration-150 hover:bg-tinta/[.04]"
            >
              {copy.nav.entrar}
            </MotionLink>
          </nav>
        </header>

        <main>
          {/* ── Portada ──────────────────────────────────────────────── */}
          <section className="grid items-center gap-12 pb-16 pt-12 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-8">
            <div>
              <h1 className="font-ui text-display font-semibold text-text-1">{copy.hero.titulo}</h1>
              <p className="mt-6 max-w-[500px] font-ui text-16 text-text-2">{copy.hero.subtitulo}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MotionLink to="/registro" whileTap={presion} transition={springPress} className={cn(base, estilos.primario)}>
                  {copy.hero.probar}
                </MotionLink>
                <motion.a
                  href={copy.github}
                  target="_blank"
                  rel="noreferrer"
                  whileTap={presion}
                  transition={springPress}
                  className={cn(base, estilos.secundario)}
                >
                  {copy.hero.codigo}
                  <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-text-2" />
                </motion.a>
              </div>
              <p className="mt-6 max-w-[500px] font-ui text-13 text-text-2">{copy.hero.nota}</p>
            </div>
            {/* La captura se sale un poco del contenedor a la derecha en escritorio:
                la laptop pesa más que el texto, sin tarjeta alrededor. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur.reveal, ease }}
              className="lg:-mr-16 xl:-mr-24"
            >
              <Captura nombre="hero" alt={copy.hero.alt} prioridad />
            </motion.div>
          </section>

          {/* ── El problema ──────────────────────────────────────────── */}
          <Seccion etiqueta={copy.problema.etiqueta}>
            <h2 className="max-w-[720px] font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.problema.titulo}</h2>
            <p className="mt-4 max-w-[640px] font-ui text-16 text-text-2">{copy.problema.texto}</p>
            <ol className="mt-10 max-w-[760px]">
              {copy.problema.piezas.map(([titulo, texto], i) => (
                <li key={titulo} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-hairline py-6 last:border-b">
                  <span className="font-ui text-15 tabular-nums text-text-2">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-ui text-16 font-medium text-text-1">{titulo}</p>
                    <p className="mt-1 font-ui text-15 text-text-2">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Seccion>

          {/* ── Qué resuelve ─────────────────────────────────────────── */}
          <Seccion etiqueta={copy.resuelve.etiqueta}>
            <h2 className="max-w-[720px] font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.resuelve.titulo}</h2>
            <div className="mt-10 grid gap-x-12 sm:grid-cols-2">
              {copy.resuelve.puntos.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-hairline py-6">
                  <h3 className="font-ui text-16 font-semibold text-text-1">{titulo}</h3>
                  <p className="mt-2 font-ui text-15 text-text-2">{texto}</p>
                </div>
              ))}
            </div>
          </Seccion>

          {/* ── Para quien lo opera: capturas reales en sus dispositivos ── */}
          <Seccion etiqueta={copy.opera.etiqueta}>
            <div className="flex flex-col gap-16 sm:gap-24">
              {copy.opera.vistas.map((vista) => (
                <figure key={vista.imagen}>
                  <figcaption className="max-w-[560px]">
                    <h3 className="font-ui text-22 font-semibold tracking-[-0.01em] text-text-1">{vista.titulo}</h3>
                    <p className="mt-2 font-ui text-15 text-text-2">{vista.texto}</p>
                  </figcaption>
                  <div className="mt-8 lg:-mr-16 xl:-mr-24">
                    <Captura nombre={vista.imagen} alt={vista.alt} />
                  </div>
                </figure>
              ))}
            </div>
          </Seccion>

          {/* ── Cifras ───────────────────────────────────────────────── */}
          <Seccion etiqueta={copy.cifras.etiqueta}>
            <dl className="grid grid-cols-2 border-t border-hairline lg:grid-cols-4">
              {copy.cifras.datos.map(([valor, etiqueta], i) => (
                <div
                  key={valor}
                  className={cn(
                    'py-8 pr-6',
                    // Líneas solo entre columnas, nunca cajas.
                    i % 2 === 1 && 'border-l border-hairline pl-6',
                    i >= 2 && 'border-t border-hairline lg:border-t-0',
                    i === 2 && 'lg:border-l lg:pl-6'
                  )}
                >
                  <dt className="sr-only">{etiqueta}</dt>
                  <dd className="font-ui text-40 font-semibold tabular-nums tracking-[-0.02em] text-text-1">{valor}</dd>
                  <dd className="mt-2 font-ui text-14 text-text-2">{etiqueta}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 font-ui text-13 text-text-2">{copy.cifras.nota}</p>
          </Seccion>

          {/* ── Cómo funciona ────────────────────────────────────────── */}
          <Seccion etiqueta={copy.funciona.etiqueta}>
            <h2 className="max-w-[720px] font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.funciona.titulo}</h2>
            <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
              <ol>
                {copy.funciona.pasos.map(([titulo, texto], i) => (
                  <li key={titulo} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-hairline py-5 last:border-b">
                    <span className="font-ui text-15 tabular-nums text-text-2">{String(i + 1).padStart(2, '0')}</span>
                    <p className="font-ui text-15 text-text-2">
                      <span className="font-medium text-text-1">{titulo}.</span> {texto}
                    </p>
                  </li>
                ))}
              </ol>
              <dl className="self-start">
                {copy.funciona.stack.map(([capa, tecnologias]) => (
                  <div key={capa} className="border-t border-hairline py-4 last:border-b">
                    <dt className="font-ui text-13 font-medium text-text-2">{capa}</dt>
                    <dd className="mt-1 font-ui text-15 text-text-1">{tecnologias}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Seccion>

          {/* ── Para tu equipo ───────────────────────────────────────── */}
          <Seccion etiqueta={copy.equipo.etiqueta}>
            <h2 className="max-w-[720px] font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.equipo.titulo}</h2>
            <p className="mt-4 max-w-[640px] font-ui text-16 text-text-2">{copy.equipo.texto}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <motion.a
                href={`mailto:${copy.contacto}?subject=${encodeURIComponent('Umbral para mi equipo')}`}
                whileTap={presion}
                transition={springPress}
                className={cn(base, estilos.secundario)}
              >
                {copy.equipo.escribir}
              </motion.a>
              <span className="font-ui text-15 text-text-2">{copy.contacto}</span>
            </div>
          </Seccion>
        </main>

        {/* ── Pie ──────────────────────────────────────────────────── */}
        <footer className="flex flex-col gap-4 border-t border-hairline py-10 sm:flex-row sm:items-center sm:justify-between">
          <MarcaPlana />
          <p className="flex flex-wrap gap-x-6 gap-y-2 font-ui text-14 text-text-2">
            <span>{copy.pie.hecho}</span>
            <a href={copy.github} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-text-1 hover:underline">
              GitHub
            </a>
            <span>{copy.pie.licencia}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
