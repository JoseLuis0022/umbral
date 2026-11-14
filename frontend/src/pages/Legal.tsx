import { Link } from 'react-router-dom';
import { PaginaPublica } from '../components/landing/PaginaPublica';
import { legal as copy } from '../copy';

/**
 * Páginas legales públicas: `/privacidad` y `/terminos`. Mismo encabezado y
 * pie que la landing, y tipografía de lectura (16/26 en 680 px, ≈72
 * caracteres por línea) porque es texto que se lee de corrido. Sin
 * animaciones: un documento legal no tiene nada que revelar.
 */
export function PaginaLegal({ documento }: { documento: 'privacidad' | 'terminos' }) {
  const doc = copy[documento];
  const otra = documento === 'privacidad' ? { a: '/terminos', texto: copy.otra.terminos } : { a: '/privacidad', texto: copy.otra.privacidad };

  return (
    <PaginaPublica>
      <main className="px-4 pb-24 pt-12 sm:px-8 sm:pb-32 sm:pt-20">
        <article className="mx-auto max-w-[680px]">
          <header>
            <h1 className="font-ui text-28 tracking-[-0.02em] text-text-1 sm:text-40 sm:tracking-[-0.025em]">{doc.titulo}</h1>
            <p className="mt-3 font-ui text-14 text-text-2">{copy.actualizado}</p>
            <p className="mt-8 font-ui text-18 font-normal text-text-2">{doc.intro}</p>
          </header>

          {doc.secciones.map((seccion) => (
            <section key={seccion.titulo} className="mt-12 border-t border-hairline pt-8">
              <h2 className="font-ui text-22 tracking-[-0.01em] text-text-1">{seccion.titulo}</h2>
              {seccion.parrafos?.map((p) => (
                <p key={p} className="mt-4 font-ui text-16 text-text-1">
                  {p}
                </p>
              ))}
              {seccion.lista && (
                <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-text-2">
                  {seccion.lista.map((item) => (
                    <li key={item} className="pl-1 font-ui text-16 text-text-1">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {seccion.cierre && <p className="mt-4 font-ui text-16 text-text-1">{seccion.cierre}</p>}
            </section>
          ))}

          <p className="mt-16 border-t border-hairline pt-8 font-ui text-15">
            <Link to={otra.a} className="font-medium text-accent-fg underline-offset-4 hover:underline">
              {otra.texto}
            </Link>
          </p>
        </article>
      </main>
    </PaginaPublica>
  );
}

export function Privacidad() {
  return <PaginaLegal documento="privacidad" />;
}

export function Terminos() {
  return <PaginaLegal documento="terminos" />;
}
