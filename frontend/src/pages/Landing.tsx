import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { IsotipoUmbral } from '../components/brand/Logo';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { PaginaPublica } from '../components/landing/PaginaPublica';
import { Accion, Contenedor, Encabezado, Revelar } from '../components/landing/primitivos';
import { Dispositivo, EntradaDispositivo } from '../components/landing/Dispositivo';
import { Preguntas } from '../components/landing/Preguntas';
import { BloqueCodigo } from '../components/landing/BloqueCodigo';
import { cn } from '../lib/cn';
import { useReducedMotion } from '../lib/useReducedMotion';
import { landing as copy } from '../copy';

/**
 * Landing pública: lo que ve en `/` quien no ha iniciado sesión.
 *
 * Página de producto, no plantilla de SaaS. Reglas (apple-feel-design y
 * umbral-sin-ia):
 *  - La escala la ponen el titular y los dispositivos, no los adornos: sin
 *    degradados de fondo, sin tarjetas flotantes, sin íconos en cuadritos.
 *    El ritmo sale de alternar bandas blancas, pizarra clara y UNA oscura.
 *  - Un solo botón primario (Probar la demo); lo demás es secundario o texto.
 *  - Un solo momento de movimiento al cargar (la Mac y el iPhone). Al bajar,
 *    cada bloque aparece una vez con un fundido corto, sin cascadas.
 *  - Cifras con fecha y fuente, todas comprobables.
 */
export default function Landing() {
  const { hash, key } = useLocation();
  const reducido = useReducedMotion();

  // El enrutador no desplaza a un #ancla: lo hace la página. Depende de `key`
  // para que pulsar dos veces el mismo enlace vuelva a llevar a la sección.
  useEffect(() => {
    if (!hash) return;
    const destino = document.getElementById(decodeURIComponent(hash.slice(1)));
    destino?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }, [hash, key, reducido]);

  return (
    <PaginaPublica>
      <main>
        <Portada />
        <Problema />
        <Funciones />
        <CasoReal />
        <Cifras />
        <ComoFunciona />
        <Desplegar />
        <SeccionPreguntas />
        <Equipo />
      </main>
    </PaginaPublica>
  );
}

/* ── Portada ─────────────────────────────────────────────────────────── */

function Portada() {
  const h = copy.hero;
  return (
    <section aria-labelledby="titulo-portada" className="overflow-hidden pb-4 pt-12 sm:pb-8 sm:pt-20">
      <Contenedor className="text-center">
        <h1 id="titulo-portada" className="mx-auto max-w-[960px] text-balance font-ui text-portada text-text-1">
          {h.titulo}
        </h1>
        <p className="mx-auto mt-6 max-w-[640px] text-balance font-ui text-18 font-normal text-text-2">{h.subtitulo}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Accion a="/registro" variante="primario">
            {h.probar}
          </Accion>
          <Accion href={copy.github}>
            {h.codigo}
            <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-text-2" />
          </Accion>
        </div>
        <p className="mx-auto mt-5 max-w-[520px] font-ui text-14 text-text-2">{h.nota}</p>
      </Contenedor>

      {/* La composición es más ancha que el texto: la laptop manda y el iPhone
          se apoya delante, a la derecha y un poco más abajo. */}
      <div className="mx-auto -mb-[4%] mt-12 w-full max-w-[1320px] px-2 sm:mt-16 sm:px-8">
        <div className="relative">
          <EntradaDispositivo className="w-[92%] sm:w-[90%]">
            <Dispositivo nombre="mac-chat" alt={h.altMac} prioridad sizes="(min-width: 1320px) 1120px, 88vw" />
          </EntradaDispositivo>
          <EntradaDispositivo
            retraso={0.18}
            desplazamiento={40}
            className="absolute bottom-[14%] right-[1%] w-[24%] sm:bottom-[12%] sm:right-[7%] sm:w-[20%]"
          >
            <Dispositivo nombre="iphone-chat" alt={h.altIphone} prioridad sizes="(min-width: 1320px) 260px, 22vw" />
          </EntradaDispositivo>
        </div>
      </div>
    </section>
  );
}

/* ── El problema ─────────────────────────────────────────────────────── */

function Problema() {
  const p = copy.problema;
  return (
    <section aria-labelledby="titulo-problema" className="bg-bg py-24 sm:py-32">
      <Contenedor>
        <Encabezado id="titulo-problema" etiqueta={p.etiqueta} titulo={p.titulo} texto={p.texto} />
        <Revelar>
          <ol className="mt-14 grid max-w-[1000px] gap-x-12 sm:grid-cols-2 lg:mt-20">
            {p.piezas.map(([titulo, texto], i) => (
              <li key={titulo} className="border-t border-hairlineStrong pb-8 pt-6">
                <span className="font-ui text-14 tabular-nums text-text-2">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-ui text-22 text-text-1">{titulo}</h3>
                <p className="mt-2 max-w-[420px] font-ui text-16 text-text-2">{texto}</p>
              </li>
            ))}
          </ol>
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Funciones: texto y dispositivo grande, alternando ──────────────── */

function Funciones() {
  const f = copy.funciones;
  return (
    <section id="funciones" aria-labelledby="titulo-funciones" className="scroll-mt-14 overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-32">
      <Contenedor>
        <Encabezado id="titulo-funciones" etiqueta={f.etiqueta} titulo={f.titulo} />
        <Revelar>
          <dl className="mt-14 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {f.puntos.map(([titulo, texto]) => (
              <div key={titulo} className="border-t border-hairlineStrong py-6">
                <dt className="font-ui text-15 font-semibold text-text-1">{titulo}</dt>
                <dd className="mt-2 font-ui text-15 text-text-2">{texto}</dd>
              </div>
            ))}
          </dl>
        </Revelar>

        <div className="mt-20 flex flex-col gap-16 sm:mt-28 sm:gap-20">
          {f.vistas.map((vista, i) => {
            const derecha = i % 2 === 0; // el dispositivo a la derecha en la 1.ª y la 3.ª
            return (
              <div key={vista.imagen} className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
                <Revelar className={cn('order-2 lg:col-span-4', derecha ? 'lg:order-1' : 'lg:order-2 lg:col-start-9')}>
                  <p className="font-ui text-15 font-medium text-text-2">{vista.etiqueta}</p>
                  <h3 className="mt-3 font-ui text-28 tracking-[-0.02em] text-text-1 sm:text-40 sm:tracking-[-0.025em]">
                    {vista.titulo}
                  </h3>
                  <p className="mt-4 font-ui text-16 text-text-2">{vista.texto}</p>
                  <ul className="mt-6">
                    {vista.detalles.map((d) => (
                      <li key={d} className="border-t border-hairline py-3 font-ui text-15 text-text-1">
                        {d}
                      </li>
                    ))}
                  </ul>
                </Revelar>
                {/* El dispositivo se sale del contenedor hacia su lado: pesa más que el texto. */}
                <Revelar
                  como="figure"
                  className={cn(
                    'order-1 -mx-3 sm:mx-0 lg:col-span-8',
                    derecha ? 'lg:order-2 lg:-mr-20 xl:-mr-28' : 'lg:order-1 lg:col-start-1 lg:row-start-1 lg:-ml-20 xl:-ml-28'
                  )}
                >
                  <Dispositivo nombre={vista.imagen} alt={vista.alt} sizes="(min-width: 1024px) 880px, 94vw" />
                </Revelar>
              </div>
            );
          })}
        </div>
      </Contenedor>
    </section>
  );
}

/* ── El caso real ────────────────────────────────────────────────────── */

function CasoReal() {
  const c = copy.caso;
  const e = c.ejemplo;
  return (
    <section aria-labelledby="titulo-caso" className="bg-bg py-24 sm:py-32">
      <Contenedor className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
        <div>
          <Encabezado id="titulo-caso" etiqueta={c.etiqueta} titulo={c.titulo} texto={c.texto} />
          <Revelar>
            <dl className="mt-10">
              {c.puntos.map(([titulo, texto]) => (
                <div key={titulo} className="border-t border-hairlineStrong py-5">
                  <dt className="font-ui text-15 font-semibold text-text-1">{titulo}</dt>
                  <dd className="mt-1 font-ui text-15 text-text-2">{texto}</dd>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>

        {/* Un fragmento del chat tal como se ve: es el producto, no una ilustración. */}
        <Revelar como="figure">
          <div className="rounded-modal bg-surface-1 p-6 shadow-anillo sm:p-10">
            <p className="ml-auto max-w-[85%] rounded-burbuja bg-burbuja px-4 py-3 font-ui text-15 text-text-1">{e.pregunta}</p>
            <p className="mt-8 flex items-center gap-2 font-ui text-13 text-text-2">
              <IsotipoUmbral acento className="h-4 w-4 text-text-2" />
              {e.proceso}
            </p>
            <p className="mt-3 font-ui text-16 text-text-1">
              {e.respuesta}{' '}
              <span className="inline-flex items-center rounded-xs bg-accent-soft px-1.5 font-ui text-13 font-medium text-accent-fg">
                {e.cita}
              </span>
              .
            </p>
          </div>
          <figcaption className="mt-4 font-ui text-13 text-text-2">{e.leyenda}</figcaption>
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Cifras: la banda oscura ─────────────────────────────────────────── */

function Cifras() {
  const c = copy.cifras;
  return (
    <section aria-labelledby="titulo-cifras" className="bg-marca-pizarra-900 py-24 sm:py-32">
      <Contenedor>
        <Encabezado id="titulo-cifras" etiqueta={c.etiqueta} titulo={c.titulo} oscuro />
        <Revelar>
          <dl className="mt-14 grid grid-cols-2 gap-x-6 lg:mt-20 lg:grid-cols-4 lg:gap-x-8">
            {c.datos.map((d) => (
              <div key={d.etiqueta} className="border-t border-white/15 pb-10 pt-6">
                <dt className="sr-only">{d.etiqueta}</dt>
                <dd className="font-ui text-display font-semibold tabular-nums text-white">
                  {d.prefijo}
                  <AnimatedNumber value={d.valor} format={(n) => n.toFixed(d.decimales)} />
                  {d.sufijo}
                </dd>
                <dd aria-hidden="true" className="mt-3 max-w-[240px] font-ui text-15 text-marca-pizarra-300">
                  {d.etiqueta}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-ui text-14 text-marca-pizarra-300">{c.nota}</p>
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Cómo funciona ───────────────────────────────────────────────────── */

function ComoFunciona() {
  const f = copy.funciona;
  return (
    <section id="como-funciona" aria-labelledby="titulo-funciona" className="scroll-mt-14 py-24 sm:py-32">
      <Contenedor>
        <Encabezado id="titulo-funciona" etiqueta={f.etiqueta} titulo={f.titulo} />
        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-20">
          <Revelar>
            <ol>
              {f.pasos.map(([titulo, texto], i) => (
                <li
                  key={titulo}
                  className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-t border-hairlineStrong py-6 last:border-b sm:grid-cols-[56px_200px_minmax(0,1fr)] sm:items-baseline sm:gap-6"
                >
                  <span className="font-ui text-14 tabular-nums text-text-2">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-ui text-22 text-text-1">{titulo}</h3>
                  <p className="col-start-2 font-ui text-16 text-text-2 sm:col-start-3">{texto}</p>
                </li>
              ))}
            </ol>
          </Revelar>
          <Revelar>
            <h3 className="font-ui text-15 font-semibold text-text-1">{f.stackTitulo}</h3>
            <dl className="mt-4">
              {f.stack.map(([capa, tecnologias]) => (
                <div key={capa} className="border-t border-hairline py-4 last:border-b">
                  <dt className="font-ui text-13 font-medium text-text-2">{capa}</dt>
                  <dd className="mt-1 font-ui text-15 text-text-1">{tecnologias}</dd>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>
      </Contenedor>
    </section>
  );
}

/* ── Despliégalo en tu servidor ──────────────────────────────────────── */

function Desplegar() {
  const d = copy.desplegar;
  return (
    <section aria-labelledby="titulo-desplegar" className="bg-bg py-24 sm:py-32">
      <Contenedor>
        <Encabezado id="titulo-desplegar" etiqueta={d.etiqueta} titulo={d.titulo} />
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16">
          <Revelar className="min-w-0">
            <ol>
              {d.pasos.map(([titulo, texto], i) => (
                <li
                  key={titulo}
                  className="grid grid-cols-[32px_minmax(0,1fr)] gap-4 border-t border-hairlineStrong py-5 last:border-b"
                >
                  <span className="font-ui text-14 tabular-nums text-text-2">{i + 1}</span>
                  <div>
                    <h3 className="font-ui text-15 font-semibold text-text-1">{titulo}</h3>
                    <p className="mt-1 font-ui text-15 text-text-2">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Revelar>
          <Revelar className="min-w-0">
            <BloqueCodigo lineas={d.codigo} etiqueta={d.etiquetaCodigo} textoCopiar={d.copiar} textoCopiado={d.copiado} />
            <p className="mt-4 font-ui text-14 text-text-2">
              {d.nota}{' '}
              <a
                href={copy.readme}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-accent-fg underline-offset-4 hover:underline"
              >
                {d.leerGuia}
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </p>
          </Revelar>
        </div>
      </Contenedor>
    </section>
  );
}

/* ── Preguntas frecuentes ────────────────────────────────────────────── */

function SeccionPreguntas() {
  const p = copy.preguntas;
  return (
    <section id="preguntas" aria-labelledby="titulo-preguntas" className="scroll-mt-14 py-24 sm:py-32">
      <Contenedor className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-16">
        <Revelar>
          <p className="font-ui text-15 font-medium text-text-2">{p.etiqueta}</p>
          <h2 id="titulo-preguntas" className="mt-3 font-ui text-display font-semibold text-text-1">
            {p.titulo}
          </h2>
        </Revelar>
        <Revelar>
          <Preguntas lista={p.lista} />
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Para tu equipo ──────────────────────────────────────────────────── */

function Equipo() {
  const e = copy.equipo;
  return (
    <section aria-labelledby="titulo-equipo" className="bg-bg py-24 sm:py-32">
      <Contenedor>
        <Encabezado id="titulo-equipo" etiqueta={e.etiqueta} titulo={e.titulo} texto={e.texto} />
        <Revelar className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Accion href={`mailto:${copy.contacto}?subject=${encodeURIComponent(e.asunto)}`}>{e.escribir}</Accion>
          <span className="break-all font-ui text-15 text-text-2">{copy.contacto}</span>
        </Revelar>
      </Contenedor>
    </section>
  );
}
