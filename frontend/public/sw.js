/*
 * Service worker de Umbral: lo mínimo para que la app se pueda instalar y
 * abra aunque la red falle un momento, SIN servir nunca una versión vieja.
 *
 *  - Navegación (el HTML): RED PRIMERO. La copia guardada solo se usa sin
 *    conexión. Así un despliegue nuevo se ve en la siguiente carga, siempre.
 *  - /assets/*: caché primero. Vite les pone un hash en el nombre, así que un
 *    archivo nunca cambia de contenido: guardarlo es seguro.
 *  - /api/* y todo lo demás: directo a la red, sin tocar la caché. Las
 *    respuestas del chat (SSE) y la sesión jamás se guardan.
 *
 * Las páginas públicas (`/`, `/privacidad`, `/terminos`) llegan
 * PRERENDERIZADAS; el resto de rutas reciben el shell vacío (`app.html`). Cada
 * HTML se guarda con su propia clave: sin conexión, una ruta privada nunca
 * recibe la landing guardada, sino el shell. El shell se pide al instalar,
 * para que exista aunque solo se haya visitado la landing.
 *
 * Cambiar VERSION borra las cachés anteriores al activarse.
 */
const VERSION = 'umbral-v2';
const CACHE_HTML = `${VERSION}-html`;
const CACHE_ASSETS = `${VERSION}-assets`;

// Rutas con HTML propio, relativas al alcance del SW (la app puede vivir en /umbral/).
const PUBLICAS = ['', 'privacidad', 'terminos'];
const alcance = () => new URL(self.registration.scope);
const SHELL = () => new URL('app.html', alcance()).href;

function claveHtml(url) {
  const relativa = url.pathname
    .slice(alcance().pathname.length)
    .replace(/\/$/, '')
    .replace(/\.html$/, '')
    .replace(/^index$/, ''); // /index.html es la landing: nunca debe guardarse como shell
  return PUBLICAS.includes(relativa) ? new URL(relativa, alcance()).href : SHELL();
}

self.addEventListener('install', (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    (async () => {
      try {
        const respuesta = await fetch(SHELL(), { cache: 'no-cache' });
        if (respuesta.ok) await (await caches.open(CACHE_HTML)).put(SHELL(), respuesta);
      } catch {
        /* sin red al instalar: se guardará en la próxima navegación a la app */
      }
    })()
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  if (peticion.mode === 'navigate') {
    const clave = claveHtml(url);
    evento.respondWith(
      (async () => {
        try {
          const respuesta = await fetch(peticion);
          if (respuesta.ok) (await caches.open(CACHE_HTML)).put(clave, respuesta.clone());
          return respuesta;
        } catch {
          const cache = await caches.open(CACHE_HTML);
          // La copia de esa misma página; si no la hay, el shell (React decide la pantalla).
          const guardada = (await cache.match(clave)) ?? (await cache.match(SHELL()));
          return guardada ?? Response.error();
        }
      })()
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    evento.respondWith(
      (async () => {
        const guardada = await caches.match(peticion, { cacheName: CACHE_ASSETS });
        if (guardada) return guardada;
        const respuesta = await fetch(peticion);
        if (respuesta.ok) (await caches.open(CACHE_ASSETS)).put(peticion, respuesta.clone());
        return respuesta;
      })()
    );
  }
});
