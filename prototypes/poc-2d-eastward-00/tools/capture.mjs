// Capturas sin retoque del ART-GATE: resolución nativa, 3 tamaños de ventana, prueba de costuras,
// recorrido en vídeo (tiempo real, WebM) y fotogramas para GIF nítido. Requiere `npm run build`.
// Uso: node tools/capture.mjs [etiqueta]   → reports/captures/<etiqueta>/
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv[2] ?? 'latest';
const OUT = join(ROOT, 'reports/captures', label);
const FRAMES = join(OUT, '_frames');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const req = createRequire(import.meta.url);
let pw;
try { pw = req('playwright'); } catch { pw = createRequire('/opt/node22/lib/node_modules/x.js')('playwright'); }

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; ; i++) {
  try { if ((await fetch(URL)).ok) break; } catch {}
  if (i > 60) throw new Error('vite preview no arrancó');
  await sleep(250);
}

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const log = { label, date: new Date().toISOString(), windows: [], seams: [], errors: [] };

async function open(width, height, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, ...extra });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => log.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__gate !== undefined, null, { timeout: 30000 });
  await page.evaluate(() => document.getElementById('hud').classList.add('off'));
  await sleep(300);
  return { ctx, page };
}

const canvasShot = (page, file) => page.locator('canvas').screenshot({ path: join(OUT, file) });
const settle = () => sleep(160);

// 1) Resolución nativa 480×270 (×1): sin luz / con luz, varias posiciones del recorrido.
{
  const { ctx, page } = await open(480, 270);
  const size = await page.evaluate(() => window.__gate.mapSize());
  const spots = [
    ['oeste', 120, 290], ['chigre', 232, 296], ['centro', 500, 340], ['este', size.w - 120, 300],
    ['sur_alero', 150, 450], ['calleja_norte', 400, 150], ['calleja_sur', 304, 455],
  ];
  for (const [name, x, y] of spots) {
    await page.evaluate(([x, y]) => window.__gate.setWalker(x, y, 'down'), [x, y]);
    await page.evaluate(() => { window.__gate.toggle('rain', false); window.__gate.toggle('lights', false); });
    await settle();
    await canvasShot(page, `nativo_${name}_base.png`);
    await page.evaluate(() => window.__gate.toggle('lights', true));
    await settle();
    await canvasShot(page, `nativo_${name}_luz.png`);
  }
  // Depuración: rejilla + colisiones + límites, para revisar anclajes y orden.
  await page.evaluate(() => { window.__gate.setWalker(232, 296, 'down'); window.__gate.toggle('lights', false); ['grid', 'collision', 'bounds'].forEach((k) => window.__gate.toggle(k, true)); });
  await settle();
  await canvasShot(page, 'nativo_debug.png');
  await page.evaluate(() => ['grid', 'collision', 'bounds'].forEach((k) => window.__gate.toggle(k, false)));

  // 2) Costuras: cámara en posiciones fraccionarias frente a las enteras.
  // setCamRaw = diagnóstico sin redondeo (documenta el problema); el juego nunca usa scroll fraccionario.
  for (const x of [200, 200.25, 200.5, 200.75, 201]) {
    await page.evaluate((x) => window.__gate.setCamRaw(x, 120), x);
    await settle();
    const file = `costura_x${String(x).replace('.', '_')}.png`;
    await canvasShot(page, file);
    log.seams.push({ camX: x, camY: 120, file, raw: true });
  }
  await ctx.close();
}

// 3) Tres tamaños de ventana (+1366×768, que no admite escala exacta).
for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080]]) {
  const { ctx, page } = await open(w, h);
  await page.evaluate(() => { window.__gate.setWalker(232, 296, 'down'); window.__gate.toggle('rain', false); });
  await settle();
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { zoom: window.__gate.state().zoom, cssW: r.width, cssH: r.height, x: r.x, y: r.y };
  });
  log.windows.push({ window: [w, h], ...info, integer: Number.isInteger(info.cssW / 480) && info.cssW / 480 === info.cssH / 270 });
  await page.screenshot({ path: join(OUT, `ventana_${w}x${h}.png`) });
  await ctx.close();
}

// 4) Recorrido: fotogramas nativos para GIF + vídeo WebM en tiempo real a ×2.
async function walkRoute(page, onTick) {
  await page.evaluate(() => { window.__gate.setWalker(40, 290, 'right'); window.__gate.toggle('rain', true); window.__gate.toggle('lights', true); });
  await settle();
  const legs = [['ArrowRight', 5500], ['ArrowUp', 2600], ['ArrowDown', 2600], ['ArrowRight', 2500], ['ArrowDown', 2800], ['ArrowLeft', 3000]];
  for (const [key, ms] of legs) {
    await page.keyboard.down(key);
    const t0 = Date.now();
    while (Date.now() - t0 < ms) await onTick();
    await page.keyboard.up(key);
  }
}
{
  const { ctx, page } = await open(480, 270);
  let n = 0;
  await page.evaluate(() => window.__gate.camSamples());
  await walkRoute(page, async () => {
    await page.locator('canvas').screenshot({ path: join(FRAMES, `f${String(n++).padStart(4, '0')}.png`) });
    await sleep(40);
  });
  log.gifFrames = n;
  const samples = await page.evaluate(() => window.__gate.camSamples());
  log.camDuringWalk = { frames: samples.length, nonInteger: samples.filter(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y)).length };
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: FRAMES, size: { width: 960, height: 540 } } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => window.__gate !== undefined);
  await page.evaluate(() => document.getElementById('hud').classList.add('off'));
  await walkRoute(page, () => sleep(50));
  // Pasada de cámara libre por toda la calle.
  await page.evaluate(() => window.__gate.setCam(0, 140));
  await page.keyboard.down('ArrowRight'); await sleep(4200); await page.keyboard.up('ArrowRight');
  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), join(OUT, 'recorrido_960x540.webm'));
}

// 5) Galería de assets aislados.
{
  const { ctx, page } = await open(1280, 900);
  await page.keyboard.press('Tab');
  await page.waitForSelector('#gallery .card');
  await sleep(500);
  await page.screenshot({ path: join(OUT, 'galeria.png'), fullPage: false });
  await page.locator('#gallery').evaluate((el) => { el.style.position = 'static'; el.style.overflow = 'visible'; document.body.style.overflow = 'visible'; document.getElementById('game').style.display = 'none'; });
  await page.screenshot({ path: join(OUT, 'galeria_completa.png'), fullPage: true });
  await ctx.close();
}

await browser.close();
server.kill();
writeFileSync(join(OUT, 'capture-log.json'), JSON.stringify(log, null, 1));
execFileSync('python3', [join(ROOT, 'tools/analyze-captures.py'), OUT], { stdio: 'inherit' });
console.log(`capturas en ${OUT}${log.errors.length ? ` · ${log.errors.length} errores de consola` : ''}`);
