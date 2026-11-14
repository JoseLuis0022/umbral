import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Autoalojada: la app es interna y no debe depender de una petición al CDN de
// Google en cada carga. Solo los subsets latin y latin-ext, redonda y cursiva
// REAL — el markdown del agente usa énfasis todo el tiempo y la oblicua
// sintética que dibuja el navegador cuando falta la cursiva se nota.
import './assets/fuentes/fuente.css'
import './index.css'
import App from './App.tsx'
import { registrarPrerender } from './lib/prerender'

/*
 * `/`, `/privacidad` y `/terminos` llegan con su contenido ya en el HTML
 * (prerender, ver scripts/prerender.mjs). React no lo hidrata: lo REEMPLAZA en
 * un solo commit. Antes se anota que venía prerenderizado, para que las
 * animaciones de entrada no oculten lo que ya estaba pintado. Por qué no
 * hidratar: src/lib/prerender.ts.
 */
const raiz = document.getElementById('root')!
registrarPrerender(raiz)

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: el service worker solo en la versión compilada. En desarrollo
// estorbaría a la recarga en caliente de Vite. Ver public/sw.js: el HTML va
// siempre a la red primero, así que nunca deja una versión vieja pegada.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
