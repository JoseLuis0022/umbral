// Capturas de la app (Playwright, 2x) y marcos de dispositivo (devices.css).
//
// Lo llama capturar.sh con el front y el backend ya levantados. Escribe:
//   <pantallas>/*.png   la app tal cual, a deviceScaleFactor 2
//   <marcos>/*.png      el dispositivo con la pantalla y su sombra, fondo transparente
//
// node capturar.mjs --playwright <playwright-core/index.mjs> --url http://127.0.0.1:4221 \
//   --pantallas <carpeta> --marcos <carpeta> --plantilla marco.html

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argumentos = Object.fromEntries(
  process.argv.slice(2).reduce((pares, valor, i, todos) => (i % 2 === 0 ? [...pares, [valor.replace(/^--/, ''), todos[i + 1]]] : pares), []),
);
const { chromium } = await import(pathToFileURL(argumentos.playwright).href);
const URL_APP = argumentos.url;
const CORREO = 'ana.torres@ejemplo.com';
const CONTRASENA = 'demostracion-umbral-2026';
const CONVERSACION = '/chat/c-demo-mediana';

// Viewport lógico de la app dentro de cada dispositivo. El iPhone reserva la
// barra de estado (arriba) y el indicador de inicio (abajo) dentro de los
// 390×830 de pantalla de devices.css.
const MAC = { width: 1440, height: 900 };
const IPHONE = { width: 390, height: 830 - 48 - 22 };

const navegador = await chromium.launch({ channel: 'chrome' });
let fondoIphone = '#ffffff';

/* ─────────────────────────────── Capturas ─────────────────────────────── */

async function nuevaSesion(viewport, movil) {
  const contexto = await navegador.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: movil,
    hasTouch: movil,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => console.warn('  error en la página:', e.message));
  await pagina.goto(`${URL_APP}/login`);
  await pagina.fill('input[type=email]', CORREO);
  await pagina.fill('input[type=password]', CONTRASENA);
  await pagina.click('button[type=submit]');
  await pagina.waitForURL((u) => !u.pathname.startsWith('/login'));
  return { contexto, pagina };
}

/** Espera a que la pantalla quede quieta: red, fuentes y animaciones de entrada. */
async function asentar(pagina) {
  await pagina.waitForLoadState('networkidle');
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(1200);
}

/** El chat abre al final de la conversación; para la foto se quiere desde la pregunta. */
async function alPrincipio(pagina) {
  await pagina.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      const estilo = getComputedStyle(el);
      if (/(auto|scroll)/.test(estilo.overflowY) && el.scrollHeight > el.clientHeight) el.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  });
  // Lejos del final aparece el botón "Ir al último mensaje": en la foto sobra.
  await pagina.addStyleTag({ content: 'button[aria-label="Ir al último mensaje"] { visibility: hidden !important; }' });
  await pagina.waitForTimeout(500);
}

/** Color de fondo de la cabecera de la app: lo usa la barra de estado del iPhone. */
async function colorDeFondo(pagina) {
  return pagina.evaluate(() => {
    for (let el = document.elementFromPoint(4, 4); el; el = el.parentElement) {
      const fondo = getComputedStyle(el).backgroundColor;
      if (fondo && fondo !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(fondo)) return fondo;
    }
    return '#ffffff';
  });
}

async function foto(pagina, nombre) {
  // Sin cursor parpadeando ni foco visible en la foto.
  await pagina.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await pagina.mouse.move(0, 0);
  const ruta = path.join(argumentos.pantallas, `${nombre}.png`);
  await pagina.screenshot({ path: ruta });
  console.log(`  pantalla ${nombre}`);
}

async function capturarApp() {
  const mac = await nuevaSesion(MAC, false);
  const p = mac.pagina;

  await p.goto(URL_APP + CONVERSACION);
  await asentar(p);
  await alPrincipio(p);
  await foto(p, 'mac-chat');

  await p.goto(`${URL_APP}/admin/tablero`);
  await asentar(p);
  await foto(p, 'mac-tablero');

  await p.goto(`${URL_APP}/admin/conversaciones`);
  await asentar(p);
  await p.getByText('¿Por qué el filtro de mediana', { exact: false }).first().click();
  await asentar(p);
  await foto(p, 'mac-auditoria');

  await p.goto(`${URL_APP}/admin/corpus`);
  await asentar(p);
  await p.getByRole('button', { name: /Apuntes/ }).first().click();
  await asentar(p);
  await p.getByText('Filtros de orden y mediana').first().click();
  await asentar(p);
  await foto(p, 'mac-corpus');
  await mac.contexto.close();

  const iphone = await nuevaSesion(IPHONE, true);
  await iphone.pagina.goto(URL_APP + CONVERSACION);
  await asentar(iphone.pagina);
  await alPrincipio(iphone.pagina);
  await foto(iphone.pagina, 'iphone-chat');
  fondoIphone = await colorDeFondo(iphone.pagina);
  await iphone.contexto.close();
}

/* ──────────────────────────────── Marcos ──────────────────────────────── */

// Escala del lienzo del marco: MacBook de 740 px CSS → ~2500 px de dispositivo
// (la pantalla de 2880 px se reduce, así que queda nítida); iPhone de 428 px
// CSS → 856 px, justo la resolución de su captura a 2x.
const MARCOS = [
  { nombre: 'mac-chat', dispositivo: 'mac', escala: 3.4 },
  { nombre: 'mac-tablero', dispositivo: 'mac', escala: 3.4 },
  { nombre: 'mac-auditoria', dispositivo: 'mac', escala: 3.4 },
  { nombre: 'mac-corpus', dispositivo: 'mac', escala: 3.4 },
  { nombre: 'iphone-chat', dispositivo: 'iphone', escala: 2 },
];

async function enmarcar() {
  const plantilla = await readFile(argumentos.plantilla, 'utf8');
  for (const { nombre, dispositivo, escala } of MARCOS) {
    const contexto = await navegador.newContext({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: escala });
    const pagina = await contexto.newPage();
    const imagen = pathToFileURL(path.join(argumentos.pantallas, `${nombre}.png`)).href;
    const html = plantilla.replaceAll('__DISPOSITIVO__', dispositivo).replaceAll('__PANTALLA__', imagen).replaceAll('__FONDO__', fondoIphone);
    // Desde file:// para que la página pueda cargar la captura local.
    const temporal = path.join(argumentos.marcos, `${nombre}.html`);
    await writeFile(temporal, html);
    await pagina.goto(pathToFileURL(temporal).href);
    await pagina.waitForLoadState('networkidle');
    await pagina.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    await pagina.locator('#lienzo').screenshot({ path: path.join(argumentos.marcos, `${nombre}.png`), omitBackground: true });
    console.log(`  marco ${nombre}`);
    await contexto.close();
  }
}

/* ──────────────────────────────── Programa ─────────────────────────────── */

try {
  await capturarApp();
  await enmarcar();
} finally {
  await navegador.close();
}
