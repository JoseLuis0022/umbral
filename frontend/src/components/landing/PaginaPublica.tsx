import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { MarcaPlana } from '../brand/Logo';
import { cn } from '../../lib/cn';
import { Contenedor } from './primitivos';
import { landing as copy } from '../../copy';

/**
 * Esqueleto de las páginas públicas (landing, privacidad y términos): un solo
 * contenedor con scroll —el body nunca hace scroll en esta app, ver
 * index.css— con la barra superior fija dentro y el pie al final.
 *
 * La barra arranca transparente sobre la portada y, en cuanto hay scroll, toma
 * un fondo translúcido con desenfoque y una línea fina: el contenido que pasa
 * por debajo se intuye, pero el texto de la barra se sigue leyendo. Es una
 * función (separar la navegación del contenido), no un adorno.
 */
export function PaginaPublica({ children }: { children: ReactNode }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [desplazada, setDesplazada] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    // Solo cambia el estado cuando cruza el umbral, no en cada evento de scroll.
    const alDesplazar = () => setDesplazada(el.scrollTop > 8);
    alDesplazar();
    el.addEventListener('scroll', alDesplazar, { passive: true });
    return () => el.removeEventListener('scroll', alDesplazar);
  }, []);

  return (
    <div ref={contenedor} id="pagina-publica" className="h-full w-full overflow-y-auto overflow-x-hidden bg-surface-1">
      <BarraSuperior desplazada={desplazada} />
      {children}
      <PiePagina />
    </div>
  );
}

const ENLACE_NAV =
  'inline-flex h-11 items-center rounded-control px-3 font-ui text-14 text-text-2 transition-colors duration-150 hover:text-text-1';

function BarraSuperior({ desplazada }: { desplazada: boolean }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-[background-color,box-shadow] duration-200 ease-umbral',
        desplazada
          ? // --surface-1 (#fff) al 82 % con desenfoque; la línea es la sombra de 1 px.
            'bg-[rgba(255,255,255,0.82)] shadow-[0_1px_0_var(--hairline)] backdrop-blur-xl backdrop-saturate-150'
          : 'bg-surface-1'
      )}
    >
      <Contenedor className="flex h-14 items-center justify-between gap-4">
        <Link to="/" aria-label={copy.nav.inicio} className="-ml-1 inline-flex h-11 items-center rounded-control px-1">
          <MarcaPlana />
        </Link>
        <nav aria-label={copy.nav.principal} className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <Link to="/#funciones" className={ENLACE_NAV}>
              {copy.nav.funciones}
            </Link>
            <Link to="/#como-funciona" className={ENLACE_NAV}>
              {copy.nav.comoFunciona}
            </Link>
            <Link to="/#preguntas" className={ENLACE_NAV}>
              {copy.nav.preguntas}
            </Link>
          </div>
          <a href={copy.github} target="_blank" rel="noreferrer" className={cn(ENLACE_NAV, 'hidden sm:inline-flex')}>
            {copy.nav.codigo}
          </a>
          <Link
            to="/login"
            className="ml-1 inline-flex h-11 items-center rounded-control px-4 font-ui text-14 font-medium text-accent-fg transition-colors duration-150 hover:bg-accent-soft"
          >
            {copy.nav.entrar}
          </Link>
        </nav>
      </Contenedor>
    </header>
  );
}

const ENLACE_PIE =
  'inline-flex min-h-11 items-center font-ui text-14 text-text-2 transition-colors duration-150 hover:text-text-1 sm:min-h-8';

function ColumnaPie({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className="font-ui text-13 font-semibold text-text-1">{titulo}</h2>
      <ul className="mt-2 sm:mt-3">{children}</ul>
    </div>
  );
}

function Externo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer" className={cn(ENLACE_PIE, 'gap-1')}>
        {children}
        <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
      </a>
    </li>
  );
}

function Interno({ a, children }: { a: string; children: ReactNode }) {
  return (
    <li>
      <Link to={a} className={ENLACE_PIE}>
        {children}
      </Link>
    </li>
  );
}

function PiePagina() {
  const p = copy.pie;
  return (
    <footer className="bg-bg shadow-[0_-1px_0_var(--hairline)]">
      <Contenedor className="pb-10 pt-12 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))_minmax(0,1.2fr)] lg:gap-8">
          <div className="max-w-[320px]">
            <MarcaPlana />
            <p className="mt-4 font-ui text-14 text-text-2">{p.descripcion}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:contents">
            <ColumnaPie titulo={p.producto}>
              <Interno a="/#funciones">{copy.nav.funciones}</Interno>
              <Interno a="/#como-funciona">{copy.nav.comoFunciona}</Interno>
              <Interno a="/#preguntas">{copy.nav.preguntas}</Interno>
              <Interno a="/registro">{p.probar}</Interno>
            </ColumnaPie>
            <ColumnaPie titulo={p.recursos}>
              <Externo href={copy.github}>{p.github}</Externo>
              <Externo href={copy.readme}>{p.documentacion}</Externo>
              <Externo href={copy.licencia}>{p.licencia}</Externo>
            </ColumnaPie>
            <ColumnaPie titulo={p.legal}>
              <Interno a="/privacidad">{p.privacidad}</Interno>
              <Interno a="/terminos">{p.terminos}</Interno>
            </ColumnaPie>
            <ColumnaPie titulo={p.contacto} className="col-span-2 sm:col-span-1">
              <li>
                <a href={`mailto:${copy.contacto}`} className={cn(ENLACE_PIE, '[overflow-wrap:anywhere]')}>
                  {copy.contacto}
                </a>
              </li>
            </ColumnaPie>
          </div>
        </div>
        <p className="mt-12 border-t border-hairline pt-6 font-ui text-13 text-text-2">{p.derechos}</p>
      </Contenedor>
    </footer>
  );
}
