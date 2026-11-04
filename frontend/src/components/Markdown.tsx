import { memo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { cn } from '../lib/cn';
import { VisorImagen } from './VisorImagen';
import { useReducedMotion } from '../lib/useReducedMotion';
import { springSoft, dur, ease } from '../lib/motion';

// Array estable: `[remarkGfm]` escrito en línea es una referencia nueva en cada
// render y obliga a react-markdown a rehacer su cadena de procesado.
const REMARK_PLUGINS = [remarkGfm];

/**
 * Reubica las rutas de archivos servidos desde `public/` cuando la app no vive
 * en la raíz del dominio.
 *
 * El markdown —el de las guías y el que llega del agente— escribe sus imágenes
 * como `/guias/…`, que es la forma correcta de nombrarlas y la única que el
 * autor de un contenido puede conocer. Pero publicada en
 * https://tu-dominio.com/Umbral/, esa ruta apunta a la raíz del dominio,
 * fuera de la carpeta de la app, y todas las capturas salen rotas. Vite reescribe
 * las rutas del HTML y de lo que se importa desde `src/`, pero no puede tocar
 * una cadena que vive dentro de un texto markdown, así que se resuelve aquí.
 *
 * Solo se tocan las rutas absolutas del propio sitio: una URL completa
 * (https://…), un `data:` en línea o una ruta relativa se dejan intactas.
 */
function resolverRutaPublica(src: string): string {
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + src;
}

/**
 * Renderizador de markdown del proyecto. Lo usan las respuestas del asistente y
 * el contenido de las guías, así que vive fuera de `ui/` pero es compartido:
 * dos renderizadores distintos harían que el mismo markdown se viera diferente
 * en cada pantalla.
 *
 * Los estilos van explícitos por elemento en vez de con el plugin `typography`
 * de Tailwind, por dos razones: el plugin no está instalado, y sus tamaños no
 * son los de nuestra escala cerrada de siete valores.
 *
 * El resaltado de sintaxis se resuelve con estilos propios y no con un tema de
 * highlight.js: importar un CSS externo traería su propia paleta y rompería la
 * colorimetría institucional.
 */
/*
 * El mapa de componentes vive en el MÓDULO, no dentro de `Markdown`.
 *
 * Definido en línea creaba un objeto —y con él una función nueva por etiqueta—
 * en cada render. Para React eso no es "las mismas etiquetas con otro
 * contenido": es un TIPO de elemento distinto, así que desmontaba y volvía a
 * montar el árbol completo del markdown cada vez. Durante el streaming del chat
 * eso significaba tirar y reconstruir el DOM de cada respuesta ~60 veces por
 * segundo. Con el mapa estable, react-markdown reconcilia en vez de remontar.
 */
const COMPONENTES: Components = {
  // Los encabezados siguen la misma jerarquía que el resto del
  // sistema: un ## dentro de una respuesta del agente o de un
  // documento cumple exactamente la misma función que el h2 de una
  // tarjeta, y verlos en dos familias distintas rompería la lectura.
  h1: ({ children }) => <h1 className="mb-3 mt-6 font-ui text-22 text-text-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-6 font-ui text-15 font-semibold text-text-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-5 font-ui text-14 font-semibold text-text-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 flex list-disc flex-col gap-1.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 flex list-decimal flex-col gap-1.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:text-text-3">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-accent-fg underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-accent/40 pl-4 text-text-2 last:mb-0">{children}</blockquote>
  ),
  hr: () => <hr className="my-5 border-hairline" />,
  /*
   * Imágenes. Casi siempre son capturas de un procedimiento, así que van como
   * `figure` con su pie: el `alt` no puede ser lo único que describa el paso,
   * porque quien ve la imagen nunca lo lee.
   *
   * Se muestran a un ancho CONTENIDO, no a todo el ancho del bloque: una
   * captura de una ventana entera a 760 px domina la conversación y empuja
   * fuera de la pantalla el texto de los pasos. El detalle fino se recupera
   * ampliando, no ocupando más sitio.
   */
  img: ({ src, alt }) =>
    typeof src === 'string' ? <ImagenAmpliable src={resolverRutaPublica(src)} alt={alt} /> : null,
  table: ({ children }) => (
    // La tabla scrollea dentro de su propio contenedor: una tabla ancha
    // nunca debe empujar el ancho de la conversación.
    <div className="mb-3 overflow-x-auto rounded-celda border border-hairline last:mb-0">
      <table className="w-full border-collapse text-13">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-bg">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-hairline px-3 py-2 text-left font-ui text-12 font-semibold uppercase tracking-wide text-text-3">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-hairline px-3 py-2 align-top last:border-b-0">{children}</td>,
  code: ({ className: cls, children }) => {
    // react-markdown no distingue código en línea de bloque por prop:
    // el bloque siempre llega con `language-*` en className.
    const esBloque = /language-/.test(cls ?? '');
    if (!esBloque) {
      return (
        <code className="rounded-[4px] bg-bg px-1.5 py-0.5 font-mono text-13 text-accent-fg">{children}</code>
      );
    }
    return <BloqueCodigo lenguaje={(cls ?? '').replace('language-', '')}>{children}</BloqueCodigo>;
  },
  pre: ({ children }) => <>{children}</>,
};

/*
 * `memo`: el hilo del chat se vuelve a renderizar una vez por frame mientras
 * llega texto, y sin esto cada respuesta YA CERRADA volvía a analizar su
 * markdown completo en cada uno de esos frames. La cadena solo cambia en la
 * respuesta viva; comparar las props deja fuera a todas las demás.
 */
export const Markdown = memo(function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn('font-ui text-15 leading-relaxed text-text-1', className)}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTES}>
        {children}
      </ReactMarkdown>
    </div>
  );
});

/**
 * Imagen de una respuesta o de un documento.
 *
 * Entra en DOS tiempos, no de golpe. La figura aparece al montarse, así que el
 * hueco existe desde el principio y el texto de abajo no salta cuando llegue el
 * mapa de bits; y la imagen se funde encima al terminar de decodificarse. Una
 * captura de medio megabyte que aparece de golpe a mitad de una respuesta que
 * se está escribiendo se lee como un fallo, no como contenido.
 *
 * El visor se monta por imagen y no una vez por bloque a propósito: el mapa de
 * componentes de `ReactMarkdown` vive fuera del render para no recrearse en
 * cada pasada, así que no puede cerrarse sobre el estado del padre. Cerrado no
 * pinta nada, de modo que tener uno por figura no cuesta nada.
 */
function ImagenAmpliable({ src, alt }: { src: string; alt?: string }) {
  const [cargada, setCargada] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const reducido = useReducedMotion();

  return (
    <>
      <motion.figure
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducido ? { duration: dur.base, ease } : springSoft}
        className="mb-4 mt-1 flex flex-col gap-2 last:mb-0"
      >
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label={alt ? `Ampliar: ${alt}` : 'Ampliar la imagen'}
          className="block w-full max-w-[560px] cursor-zoom-in overflow-hidden rounded-tarjeta border border-hairline bg-bg transition-colors duration-150 hover:border-accent/40"
        >
          <motion.img
            src={src}
            alt={alt ?? ''}
            loading="lazy"
            decoding="async"
            onLoad={() => setCargada(true)}
            initial={false}
            animate={{ opacity: cargada ? 1 : 0, scale: cargada || reducido ? 1 : 1.02 }}
            transition={{ duration: dur.base, ease }}
            className="block w-full"
          />
        </button>
        {alt && <figcaption className="max-w-[560px] font-ui text-12 text-text-3">{alt}</figcaption>}
      </motion.figure>

      <VisorImagen src={ampliada ? src : null} alt={alt} onCerrar={() => setAmpliada(false)} />
    </>
  );
}

function BloqueCodigo({ lenguaje, children }: { lenguaje: string; children: ReactNode }) {
  const [copiado, setCopiado] = useState(false);
  const texto = String(children).replace(/\n$/, '');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      // El portapapeles puede estar bloqueado por permisos del navegador; el
      // bloque de código sigue siendo seleccionable a mano.
    }
  }

  return (
    <div className="group relative mb-3 overflow-hidden rounded-celda border border-hairline bg-bg last:mb-0">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="font-ui text-12 text-text-3">{lenguaje || 'código'}</span>
        <button
          type="button"
          onClick={copiar}
          className="flex items-center gap-1 rounded-[6px] px-1.5 py-1 font-ui text-12 text-text-2 transition-colors hover:bg-accent-soft hover:text-accent-fg"
        >
          {copiado ? <Check size={12} /> : <Copy size={12} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5">
        <code className="font-mono text-13 leading-relaxed text-text-1">{texto}</code>
      </pre>
    </div>
  );
}
