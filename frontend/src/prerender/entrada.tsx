import { StrictMode, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Landing from '../pages/Landing';
import { Privacidad, Terminos } from '../pages/Legal';
import { seo } from '../copy';
import { datosEstructurados } from './datosEstructurados';

/**
 * Entrada del prerender: `vite build --ssr` la compila para Node y
 * scripts/prerender.mjs la importa para escribir un HTML estático por página
 * pública. Sin navegador: `renderToString` + `StaticRouter`.
 *
 * Solo se renderiza la PÁGINA, sin los proveedores de App.tsx: las páginas
 * públicas no leen sesión, chat ni preferencias, y el cliente no hidrata este
 * markup sino que lo reemplaza (ver src/lib/prerender.ts).
 */
const PAGINAS: { clave: keyof typeof seo.paginas; archivo: string; elemento: ReactNode }[] = [
  { clave: 'inicio', archivo: 'index.html', elemento: <Landing /> },
  { clave: 'privacidad', archivo: 'privacidad.html', elemento: <Privacidad /> },
  { clave: 'terminos', archivo: 'terminos.html', elemento: <Terminos /> },
];

export const paginas = PAGINAS.map(({ clave, archivo, elemento }) => ({
  clave,
  archivo,
  ...seo.paginas[clave],
  renderizar: () =>
    renderToString(
      <StrictMode>
        <StaticRouter location={seo.paginas[clave].ruta}>{elemento}</StaticRouter>
      </StrictMode>
    ),
}));

export { seo, datosEstructurados };
