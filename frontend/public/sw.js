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
 * Cambiar VERSION borra las cachés anteriores al activarse.
 */
const VERSION = 'umbral-v1';
const CACHE_HTML = `${VERSION}-html`;
const CACHE_ASSETS = `${VERSION}-assets`;

self.addEventListener('install', () => self.skipWaiting());

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
    evento.respondWith(
      (async () => {
        try {
          const respuesta = await fetch(peticion);
          const cache = await caches.open(CACHE_HTML);
          cache.put('shell', respuesta.clone());
          return respuesta;
        } catch {
          const guardada = await caches.match('shell', { cacheName: CACHE_HTML });
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
