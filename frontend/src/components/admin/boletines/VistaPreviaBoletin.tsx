import { LifeBuoy, MessageSquareText, Star } from 'lucide-react';
import type { Guia } from '../../../types';
import { cn } from '../../../lib/cn';
import { Banner } from '../../ui';
import { Markdown } from '../../Markdown';
import { CLASES_CATEGORIA, ICONO_CATEGORIA, PasosGuia } from '../../guias';
import { alDia as copyAlDia } from '../../../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  aviso: 'Así se lee en Al día. Los bloques vacíos se señalan aquí, pero no se publican.',
  sinTitulo: 'Boletín sin título',
  sinResumen: 'Sin resumen. Es la línea que se lee en la tarjeta de la galería.',
  sinPasos: 'Sin pasos. El cuerpo del boletín está en blanco.',
  pasoSinTitulo: (n: number) => `Paso ${n} (sin título)`,
  sinSiAlgoFalla: 'Sin contenido. Este bloque no aparecerá en el boletín publicado.',
  sinPregunta: 'Sin pregunta sugerida. El botón del asistente abrirá el chat en blanco.',
  ctaTitulo: '¿Te quedó una duda?',
  ctaDetalle: 'Abrimos el asistente con esta pregunta ya escrita. Puedes cambiarla antes de enviarla.',
  botonInerte: 'Vista previa: este botón no está activo aquí.',
};

/**
 * Vista previa del boletín, con la misma composición que /al-dia/:guiaId: una
 * sola columna de 44rem, el mismo orden de bloques y las mismas piezas
 * (`PasosGuia`, `Markdown`, la paleta de categorías). Se importan de "Al día"
 * en vez de reconstruirse: una vista previa que se pinta con su propio código
 * deja de ser una vista previa en cuanto la pantalla pública cambia.
 *
 * Las dos diferencias son deliberadas y están ahí porque esto es un editor:
 * los bloques vacíos se señalan (en el boletín publicado simplemente no
 * existen) y el botón del asistente es una imagen, no un control — no tiene
 * sentido abrir el chat desde el panel de redacción.
 */
export function VistaPreviaBoletin({ guia }: { guia: Guia }) {
  const Icono = ICONO_CATEGORIA[guia.categoria];
  // `PasosGuia` usa el título como `key`. Dos pasos sin título darían la misma
  // clave y React reutilizaría el nodo equivocado, así que aquí se sustituye
  // por un rótulo que además dice lo que hay que arreglar antes de publicar.
  const pasosVisibles = guia.pasos
    .map((paso, i) => ({
      titulo: paso.titulo.trim() || TEXTO.pasoSinTitulo(i + 1),
      contenido: paso.contenido,
    }))
    .filter((_, i) => guia.pasos[i].titulo.trim() || guia.pasos[i].contenido.trim());

  return (
    <div className="mx-auto flex max-w-[44rem] flex-col px-5 py-6">
      <Banner tone="neutral" className="mb-6">
        {TEXTO.aviso}
      </Banner>

      <header>
        <span
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-celda px-2 font-ui text-12 font-medium',
            CLASES_CATEGORIA[guia.categoria]
          )}
        >
          <Icono size={13} strokeWidth={2} aria-hidden />
          {guia.categoria}
        </span>

        <h1 className={cn('mt-4 font-ui text-28', guia.titulo.trim() ? 'text-text-1' : 'italic text-text-3')}>
          {guia.titulo.trim() || TEXTO.sinTitulo}
        </h1>

        {guia.resumen.trim() ? (
          <p className="mt-4 font-ui text-15 text-text-2">{guia.resumen}</p>
        ) : (
          <p className="mt-4 font-ui text-15 italic text-text-3">{TEXTO.sinResumen}</p>
        )}

        <div className="mt-6 flex items-center justify-between gap-4 border-b border-hairline pb-6">
          <span className="font-ui text-13 text-text-3">{copyAlDia.minutos(guia.minutosLectura)}</span>
          <span className="inline-flex items-center gap-1.5 rounded-control bg-accent-soft px-3 py-1.5 font-ui text-13 font-medium tabular-nums text-accent-fg">
            <Star size={14} strokeWidth={2} aria-hidden />
            {guia.estrellas}
          </span>
        </div>
      </header>

      {guia.requisitos.some((r) => r.trim()) && (
        <section
          aria-labelledby="previa-requisitos"
          className="mt-8 rounded-tarjeta border border-hairline bg-surface-1 p-5"
        >
          <h2 id="previa-requisitos" className="font-ui text-15 font-semibold text-text-1">
            {copyAlDia.requisitos}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {guia.requisitos
              .filter((r) => r.trim())
              .map((requisito, i) => (
                <li key={i} className="flex gap-3 font-ui text-15 text-text-2">
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="min-w-0 flex-1">{requisito}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="previa-pasos" className="mt-10">
        <h2 id="previa-pasos" className="sr-only">
          {copyAlDia.pasos}
        </h2>
        {pasosVisibles.length > 0 ? (
          <PasosGuia pasos={pasosVisibles} />
        ) : (
          <p className="font-ui text-15 italic text-text-3">{TEXTO.sinPasos}</p>
        )}
      </section>

      <section
        aria-labelledby="previa-si-algo-falla"
        className="mt-10 rounded-tarjeta border border-hairline bg-bg p-5"
      >
        <h2 id="previa-si-algo-falla" className="flex items-center gap-2 font-ui text-15 font-semibold text-text-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-celda bg-status-amber-soft text-status-amber">
            <LifeBuoy size={14} strokeWidth={2} aria-hidden />
          </span>
          {copyAlDia.siAlgoFalla}
        </h2>
        {guia.siAlgoFalla.trim() ? (
          <Markdown className="mt-4 text-text-2">{guia.siAlgoFalla}</Markdown>
        ) : (
          <p className="mt-4 font-ui text-15 italic text-text-3">{TEXTO.sinSiAlgoFalla}</p>
        )}
      </section>

      <section className="mt-10 rounded-tarjeta border border-hairline bg-surface-1 p-5 shadow-1">
        <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.ctaTitulo}</h2>
        <p className="mt-1 font-ui text-13 text-text-3">{TEXTO.ctaDetalle}</p>
        {guia.preguntaSugerida.trim() ? (
          <blockquote className="mt-4 border-l-2 border-accent/40 pl-4 font-ui text-15 text-text-2">
            {guia.preguntaSugerida}
          </blockquote>
        ) : (
          <p className="mt-4 font-ui text-15 italic text-text-3">{TEXTO.sinPregunta}</p>
        )}
        {/* Un <span>, no un <button>: replica el aspecto del botón publicado
            sin ser un control que no lleva a ninguna parte. Las clases se
            repiten del sistema porque un Button deshabilitado se pinta gris y
            dejaría de parecerse a lo que la comunidad va a ver. */}
        <span
          aria-hidden
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-control bg-accent px-4 font-ui text-14 font-semibold text-white shadow-1"
        >
          <MessageSquareText size={14} strokeWidth={2} />
          {copyAlDia.preguntarAsistente}
        </span>
        <span className="sr-only">{TEXTO.botonInerte}</span>
      </section>
    </div>
  );
}
