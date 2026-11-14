import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { seo } from '../copy';

/**
 * Título de la pestaña según la ruta. Las páginas públicas llevan el mismo
 * título que su HTML prerenderizado; cada pantalla de la app, «Pantalla ·
 * Umbral». `ruta` llega SIN el basename (lo quita el enrutador).
 */
export function tituloDeRuta(ruta: string): string {
  const publica = Object.values(seo.paginas).find((p) => p.ruta === ruta);
  if (publica) return publica.titulo;
  const clave = Object.keys(seo.pantallas)
    .filter((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`))
    .sort((a, b) => b.length - a.length)[0];
  return clave ? `${seo.pantallas[clave]} · ${seo.sitio}` : seo.app.titulo;
}

/** Mantiene `document.title` al día al navegar. Va dentro del enrutador. */
export function useTituloDocumento() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = tituloDeRuta(pathname);
  }, [pathname]);
}
