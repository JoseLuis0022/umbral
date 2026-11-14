import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, CodeXml, Container, Gauge, ListChecks, Quote } from 'lucide-react';
import { IsotipoUmbral } from '../components/brand/Logo';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { PaginaPublica } from '../components/landing/PaginaPublica';
import { Accion, Contenedor, Encabezado, Revelar } from '../components/landing/primitivos';
import { Dispositivo, EntradaDispositivo } from '../components/landing/Dispositivo';
import { Preguntas } from '../components/landing/Preguntas';
import { BloqueCodigo } from '../components/landing/BloqueCodigo';
import { FuncionesPestanas } from '../components/landing/FuncionesPestanas';
import { Comparacion } from '../components/landing/Comparacion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { landing as copy } from '../copy';

/**
 * Landing pública: lo que ve en `/` quien no ha iniciado sesión.
 *
 * Página de producto, no plantilla de SaaS. Reglas (apple-feel-design y
 * umbral-sin-ia):
 *  - La escala la ponen el titular y los dispositivos, no los adornos: sin
 *    degradados de fondo, sin tarjetas flotantes, sin íconos en cuadritos.
 *    El ritmo sale de alternar bandas blancas, pizarra clara y UNA oscura
 *    (las funciones en pestañas: las capturas lucen sobre pizarra).
 *  - Un solo botón primario (Probar la demo); lo demás es secundario o texto.
 *  - Un solo momento de movimiento al cargar (los tres dispositivos). Al
 *    bajar, cada bloque aparece una vez con un fundido corto, sin cascadas;
 *    los dispositivos suben y crecen un poco más que el texto.
 *  - La portada completa (texto y dispositivos) cabe en 1440×900 sin scroll.
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
        <Confianza />
        <Problema />
        <Funciones />
        <CasoReal />
        <Cifras />
        <SeccionComparacion />
        <ComoFunciona />
        <Desplegar />
        <SeccionPreguntas />
        <Cierre />
      </main>
    </PaginaPublica>
  );
}

/* ── Portada ─────────────────────────────────────────────────────────── */

function Portada() {
  const h = copy.hero;
  return (
    <section aria-labelledby="titulo-portada" className="overflow-hidden">
      <Contenedor className="grid items-center gap-10 pb-10 pt-10 sm:pt-14 lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-4 lg:pb-14 lg:pt-10">
        <div className="max-w-[560px]">
          <h1 id="titulo-portada" className="text-balance font-ui text-portada text-text-1">
            {h.titulo}
          </h1>
          <p className="mt-6 font-ui text-18 font-normal text-text-2">{h.subtitulo}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Accion a="/registro" variante="primario">
              {h.probar}
            </Accion>
            <Accion href={copy.github}>
              {h.codigo}
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-text-2" />
            </Accion>
          </div>
          <p className="mt-5 font-ui text-14 text-text-2">{h.nota}</p>
        </div>

        {/* Tres dispositivos: el iPad atrás a la izquierda, la Mac al centro y
            el iPhone delante a la derecha, un poco más abajo. Las medidas son
            porcentajes del ancho del grupo, así la composición escala entera. */}
        <div className="relative -mx-2 pt-[9%] sm:mx-0 lg:-mr-12 xl:-mr-20">
          <EntradaDispositivo retraso={0.12} className="absolute left-0 top-0 w-[46%]">
            <Dispositivo nombre="ipad-tablero" alt={h.altIpad} prioridad sizes="(min-width: 1024px) 330px, 46vw" />
          </EntradaDispositivo>
          <EntradaDispositivo className="relative ml-[10%] w-[90%]">
            <Dispositivo nombre="mac-chat" alt={h.altMac} prioridad sizes="(min-width: 1024px) 680px, 90vw" />
          </EntradaDispositivo>
          <EntradaDispositivo retraso={0.24} desplazamiento={36} className="absolute bottom-[10%] right-[-2%] w-[21%]">
            <Dispositivo nombre="iphone-chat" alt={h.altIphone} prioridad sizes="(min-width: 1024px) 160px, 21vw" />
          </EntradaDispositivo>
        </div>
      </Contenedor>
    </section>
  );
}

/* ── Franja de confianza ─────────────────────────────────────────────── */

const ICONOS_CONFIANZA = [CodeXml, Quote, Gauge, Container, ListChecks];

function Confianza() {
  const c = copy.confianza;
  return (
    <section aria-label={c.etiqueta} className="border-y border-hairline bg-bg">
      <Contenedor>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 py-8 sm:grid-cols-3 lg:grid-cols-5 lg:py-7">
          {c.puntos.map(([titulo, detalle], i) => {
            const Icono = ICONOS_CONFIANZA[i];
            return (
              <li key={titulo} className="flex items-start gap-3">
                <Icono size={20} strokeWidth={1.6} aria-hidden="true" className="mt-0.5 shrink-0 text-text-2" />
                <div>
                  <p className="font-ui text-15 font-semibold text-text-1">{titulo}</p>
                  <p className="mt-0.5 font-ui text-14 text-text-2">{detalle}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Contenedor>
    </section>
  );
}

/* ── El problema ─────────────────────────────────────────────────────── */

function Problema() {
  const p = copy.problema;
  return (
    <section aria-labelledby="titulo-problema" className="py-24 sm:py-28">
      <Contenedor>
        <Encabezado id="titulo-problema" etiqueta={p.etiqueta} titulo={p.titulo} texto={p.texto} />
        <Revelar>
          <ol className="mt-14 grid max-w-[1000px] gap-x-12 sm:grid-cols-2 lg:mt-20">
            {p.piezas.map(([titulo, texto], i) => (
              <li key={titulo} className="border-t border-hairlineStrong pb-6 pt-5 sm:pb-8 sm:pt-6">
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

/* ── Funciones: pestañas sobre la banda oscura ─────────────────────── */

function Funciones() {
  const f = copy.funciones;
  return (
    <section
      id="funciones"
      aria-labelledby="titulo-funciones"
      className="scroll-mt-14 overflow-hidden bg-marca-pizarra-900 py-24 sm:py-28"
    >
      <Contenedor>
        <Encabezado id="titulo-funciones" etiqueta={f.etiqueta} titulo={f.titulo} oscuro className="mx-auto text-center" />
        <div className="mt-10 lg:mt-12">
          <FuncionesPestanas pestanas={f.pestanas} etiqueta={f.etiquetaPestanas} />
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
    <section aria-labelledby="titulo-caso" className="py-24 sm:py-32">
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
          <div className="rounded-modal bg-bg p-6 sm:p-10">
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

/* ── Cifras ─────────────────────────────────────────── */

function Cifras() {
  const c = copy.cifras;
  return (
    <section aria-labelledby="titulo-cifras" className="bg-bg py-24 sm:py-28">
      <Contenedor>
        <Encabezado id="titulo-cifras" etiqueta={c.etiqueta} titulo={c.titulo} />
        <Revelar>
          <dl className="mt-14 grid grid-cols-2 gap-x-6 lg:mt-20 lg:grid-cols-4 lg:gap-x-8">
            {c.datos.map((d) => (
              <div key={d.etiqueta} className="border-t border-hairlineStrong pb-10 pt-6">
                <dt className="sr-only">{d.etiqueta}</dt>
                <dd className="font-ui text-display font-semibold tabular-nums text-text-1">
                  {d.prefijo}
                  <AnimatedNumber value={d.valor} format={(n) => n.toFixed(d.decimales)} />
                  {d.sufijo}
                </dd>
                <dd aria-hidden="true" className="mt-3 max-w-[240px] font-ui text-15 text-text-2">
                  {d.etiqueta}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-ui text-14 text-text-2">{c.nota}</p>
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Comparación ─────────────────────────────────────────────────────── */

function SeccionComparacion() {
  const c = copy.comparacion;
  return (
    <section aria-labelledby="titulo-comparacion" className="py-24 sm:py-28">
      <Contenedor>
        <Encabezado id="titulo-comparacion" etiqueta={c.etiqueta} titulo={c.titulo} texto={c.texto} />
        <Revelar className="mt-12 lg:mt-14">
          <Comparacion columnas={c.columnas} filas={c.filas} leyenda={c.leyenda} si={c.si} no={c.no} />
        </Revelar>
      </Contenedor>
    </section>
  );
}

/* ── Cómo funciona ───────────────────────────────────────────────────── */

function ComoFunciona() {
  const f = copy.funciona;
  return (
    <section id="como-funciona" aria-labelledby="titulo-funciona" className="scroll-mt-14 bg-bg py-24 sm:py-32">
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
    <section aria-labelledby="titulo-desplegar" className="py-24 sm:py-32">
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
    <section id="preguntas" aria-labelledby="titulo-preguntas" className="scroll-mt-14 bg-bg py-24 sm:py-32">
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

/* ── Cierre ──────────────────────────────────────────────────────────── */

function Cierre() {
  const c = copy.cierre;
  const e = copy.equipo;
  return (
    <section aria-labelledby="titulo-cierre" className="overflow-hidden pt-24 sm:pt-28">
      <Contenedor className="grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        <Revelar className="pb-4 lg:pb-24">
          <h2 id="titulo-cierre" className="font-ui text-display font-semibold text-text-1">
            {c.titulo}
          </h2>
          <p className="mt-5 max-w-[520px] font-ui text-18 font-normal text-text-2">{c.texto}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Accion a="/registro" variante="primario">
              {c.probar}
            </Accion>
            <Accion href={copy.github}>
              {c.codigo}
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-text-2" />
            </Accion>
          </div>
          <p className="mt-10 max-w-[520px] border-t border-hairline pt-6 font-ui text-15 text-text-2">
            {e.titulo}{' '}
            <a
              href={`mailto:${copy.contacto}?subject=${encodeURIComponent(e.asunto)}`}
              className="font-medium text-accent-fg underline-offset-4 hover:underline"
            >
              {e.escribir}
            </a>
          </p>
        </Revelar>
        {/* El iPad se asienta en el borde inferior de la sección, sobre el pie. */}
        <Revelar variante="dispositivo" className="-mb-[3%] lg:-mr-12">
          <Dispositivo nombre="ipad-chat" alt={c.alt} sizes="(min-width: 1024px) 620px, 94vw" />
        </Revelar>
      </Contenedor>
    </section>
  );
}
