import { assetUrl, manifest, type AssetDef } from './assets';

// Galería de inspección: assets aislados a 1× y 3×, hoja completa y pruebas de mosaico,
// en DOM con canvas sin suavizado (sin filtros de Phaser ni de post-proceso).

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = ko;
    im.src = src;
  });
}

function canvas(w: number, h: number, scale: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function scaled(im: HTMLImageElement, scale: number, bg = true): HTMLCanvasElement {
  const [c, ctx] = canvas(im.width, im.height, scale);
  if (bg) {
    // Damero para ver la transparencia real.
    for (let y = 0; y < c.height; y += 8 * scale) for (let x = 0; x < c.width; x += 8 * scale) {
      ctx.fillStyle = ((x + y) / (8 * scale)) % 2 ? '#3a3540' : '#2c2832';
      ctx.fillRect(x, y, 8 * scale, 8 * scale);
    }
  }
  ctx.drawImage(im, 0, 0, im.width * scale, im.height * scale);
  return c;
}

function tileMosaic(im: HTMLImageElement, a: AssetDef, names: string[], cols: number, rows: number, scale: number, seed: number): HTMLCanvasElement {
  const t = a.tile!;
  const [c, ctx] = canvas(cols * t, rows * t, scale);
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const idx = a.tiles![names[Math.floor(rnd() * names.length)]];
    const sx = (idx % a.columns!) * t, sy = Math.floor(idx / a.columns!) * t;
    ctx.drawImage(im, sx, sy, t, t, x * t * scale, y * t * scale, t * scale, t * scale);
  }
  return c;
}

function card(title: string, a: AssetDef | null, ...nodes: Node[]): HTMLElement {
  const d = document.createElement('section');
  d.className = 'card';
  const h = document.createElement('h3');
  h.textContent = title;
  if (a) {
    const badge = document.createElement('span');
    badge.className = 'badge ' + a.status;
    badge.textContent = a.status === 'placeholder' ? 'PLACEHOLDER — no es arte' : a.status;
    h.append(' ', badge);
  }
  d.append(h);
  if (a) {
    const p = document.createElement('p');
    p.textContent = `${a.file} · ${a.size[0]}×${a.size[1]} px · ${a.source ?? '?'} · licencia: ${a.license ?? '?'}`;
    d.append(p);
  }
  const row = document.createElement('div');
  row.className = 'row';
  row.append(...nodes);
  d.append(row);
  return d;
}

export async function buildGallery(root: HTMLElement) {
  root.innerHTML = '<h2>Galería del ART-GATE · assets aislados sin filtros (1× y 3×) · Tab para volver</h2>';
  for (const a of manifest.assets) {
    if (a.status === 'tool') continue;
    const im = await loadImg(assetUrl(a.file));
    if (a.kind === 'tileset') {
      const names = Object.keys(a.tiles!);
      const canto = names.filter((n) => n.startsWith('canto_') && n !== 'canto_musgo');
      root.append(card(`${a.id} — hoja completa`, a, scaled(im, 1), scaled(im, 3)));
      const tiles = names.map((n) => {
        const fig = document.createElement('figure');
        fig.append(tileMosaic(im, a, [n], 3, 3, 2, 1));
        const cap = document.createElement('figcaption');
        cap.textContent = `${n} 3×3`;
        fig.append(cap);
        return fig;
      });
      root.append(card(`${a.id} — mosaico 3×3 de cada tile (costuras)`, null, ...tiles));
      root.append(card(`${a.id} — combinación aleatoria A y B de variantes de canto (repetición)`, null,
        tileMosaic(im, a, canto, 20, 8, 2, 7), tileMosaic(im, a, canto, 20, 8, 2, 4242)));
    } else {
      root.append(card(a.id, a, scaled(im, 1), scaled(im, 3)));
    }
  }
}
