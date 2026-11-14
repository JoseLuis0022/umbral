/*
 * Prerender de las páginas públicas, después de `vite build`.
 *
 * Una SPA entrega un <div id="root"></div> vacío: Google ejecuta el JS, pero la
 * mayoría de los rastreadores de IA (y las vistas previas de las redes) leen
 * solo el HTML. Este script toma el index.html compilado como plantilla y
 * escribe en la carpeta de salida:
 *
 *   index.html       `/`            la landing con su contenido y metadatos
 *   privacidad.html  `/privacidad`  la política de privacidad
 *   terminos.html    `/terminos`    los términos de uso
 *   app.html         todo lo demás  el shell vacío de la app, con noindex
 *
 * nginx (nginx.conf) sirve cada uno en su ruta. El markup sale de
 * src/prerender/entrada.tsx, compilada antes con `vite build --ssr`. Solo
 * necesita Node: corre dentro del `docker build` del frontend.
 *
 * Uso: node scripts/prerender.mjs [carpeta de salida, por defecto dist]
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

const DOMINIO = 'https://umbral.imperioon.com';
const salida = path.resolve(process.argv[2] ?? 'dist');
const moduloSsr = path.resolve('node_modules/.prerender/entrada.js');

// React y el enrutador en su versión de producción (sin avisos de desarrollo).
process.env.NODE_ENV ??= 'production';
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
// URL pública de la app (con la subcarpeta, si la hay), sin barra final.
const URL_PUBLICA = (env.VITE_URL_PUBLICA || DOMINIO).replace(/\/$/, '');

const { paginas, seo } = await import(pathToFileURL(moduloSsr).href);

const plantilla = await readFile(path.join(salida, 'index.html'), 'utf8');
const INICIO = plantilla.indexOf('<!-- seo:inicio');
const FIN_MARCA = '<!-- seo:fin -->';
const FIN = plantilla.indexOf(FIN_MARCA);
if (INICIO < 0 || FIN < 0 || !plantilla.includes('<!--app-->')) {
  throw new Error('index.html no tiene las marcas <!-- seo:inicio --> … <!-- seo:fin --> y <!--app-->');
}

const atr = (texto) =>
  String(texto).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const imagen = `${URL_PUBLICA}${seo.imagen.ruta}`;

function vistaPrevia({ url, titulo, descripcion }) {
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${atr(seo.sitio)}" />`,
    `<meta property="og:locale" content="es_MX" />`,
    `<meta property="og:url" content="${atr(url)}" />`,
    `<meta property="og:title" content="${atr(titulo)}" />`,
    `<meta property="og:description" content="${atr(descripcion)}" />`,
    `<meta property="og:image" content="${atr(imagen)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${seo.imagen.ancho}" />`,
    `<meta property="og:image:height" content="${seo.imagen.alto}" />`,
    `<meta property="og:image:alt" content="${atr(seo.imagen.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${atr(titulo)}" />`,
    `<meta name="twitter:description" content="${atr(descripcion)}" />`,
    `<meta name="twitter:image" content="${atr(imagen)}" />`,
    `<meta name="twitter:image:alt" content="${atr(seo.imagen.alt)}" />`,
  ];
}

/*
 * Quien ya tiene sesión y abre `/` va directo al chat: no debe ver la landing
 * pintada un instante. Antes del primer pintado, si hay token guardado (la
 * clave de src/services/api.ts, con el prefijo de services/simulacion.ts), se
 * oculta el contenido prerenderizado; React lo reemplaza y quita el velo al
 * montar (src/lib/prerender.ts). Si el JS no llegara a cargar, el velo se
 * levanta solo a los 4 s: mejor la landing que una página en blanco.
 * No hay Content-Security-Policy (nginx-seguridad.conf), así que el script
 * inline no necesita hash; si un día se añade, hay que incluir su hash.
 */
const VELO_SESION = [
  `<style>html[data-sesion] #root{visibility:hidden;animation:umbral-velo 0s 4s forwards}@keyframes umbral-velo{to{visibility:visible}}</style>`,
  `<script>try{var t=localStorage.getItem('umbral:token');if(t&&t!=='null')document.documentElement.setAttribute('data-sesion','')}catch(e){}</script>`,
];

function armar(cabeza, cuerpo) {
  const bloque = cabeza.map((linea) => `    ${linea}`).join('\n').trimStart();
  return (plantilla.slice(0, INICIO) + bloque + plantilla.slice(FIN + FIN_MARCA.length)).replace('<!--app-->', cuerpo);
}

for (const pagina of paginas) {
  const url = `${URL_PUBLICA}${pagina.ruta === '/' ? '/' : pagina.ruta}`;
  const cabeza = [
    ...(pagina.clave === 'inicio' ? VELO_SESION : []),
    `<title>${atr(pagina.titulo)}</title>`,
    `<meta name="description" content="${atr(pagina.descripcion)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<link rel="canonical" href="${atr(url)}" />`,
    `<meta name="author" content="${atr(seo.autor)}" />`,
    ...vistaPrevia({ url, titulo: pagina.tituloSocial, descripcion: pagina.descripcion }),
  ];
  await writeFile(path.join(salida, pagina.archivo), armar(cabeza, pagina.renderizar()));
  console.log(`prerender: ${pagina.ruta} → ${pagina.archivo}`);
}

// El shell de la app: sin contenido, fuera del índice. Conserva la vista
// previa genérica por si alguien comparte un enlace a /chat.
const shell = [
  `<title>${atr(seo.app.titulo)}</title>`,
  `<meta name="description" content="${atr(seo.app.descripcion)}" />`,
  `<meta name="robots" content="noindex, nofollow" />`,
  ...vistaPrevia({ url: `${URL_PUBLICA}/`, titulo: seo.paginas.inicio.tituloSocial, descripcion: seo.paginas.inicio.descripcion }),
];
await writeFile(path.join(salida, 'app.html'), armar(shell, ''));
console.log('prerender: resto de rutas → app.html (noindex)');

await rm(path.dirname(moduloSsr), { recursive: true, force: true });
