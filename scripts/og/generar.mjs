/*
 * Genera frontend/public/og.png (1200×630) a partir de og.html.
 *
 *   node scripts/og/generar.mjs
 *
 * Requiere Google Chrome y playwright-core (por defecto el del CLI global de
 * Playwright; otro con PLAYWRIGHT=/ruta/a/playwright-core/index.mjs). Si cambia
 * la imagen, sube el `?v=` de `seo.imagen.ruta` en frontend/src/copy/index.ts:
 * las redes guardan la miniatura por URL durante días.
 */
import path from 'node:path';
import { statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLAYWRIGHT = process.env.PLAYWRIGHT ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
const { chromium } = await import(PLAYWRIGHT);

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.resolve(aqui, '../../frontend/public/og.png');

const navegador = await chromium.launch({ channel: 'chrome' });
try {
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await pagina.goto(pathToFileURL(path.join(aqui, 'og.html')).href);
  await pagina.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  const fuente = await pagina.evaluate(() => document.fonts.check('600 54px "Google Sans Variable"'));
  if (!fuente) throw new Error('No cargó Google Sans: la miniatura saldría con la fuente del sistema.');
  await pagina.screenshot({ path: salida, type: 'png' });
} finally {
  await navegador.close();
}
const kb = statSync(salida).size / 1024;
console.log(`og.png: ${kb.toFixed(0)} KB → ${salida}`);
if (kb > 300) console.warn('Aviso: pasa de 300 KB; algunas redes la recortan o no la muestran.');
