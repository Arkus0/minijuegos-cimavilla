// Verifica que manifest, mapa Tiled y PNG son coherentes: rutas, dimensiones e índices.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [], warnings = [];

function pngSize(path) {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} no es PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const man = JSON.parse(readFileSync(join(ROOT, 'assets/manifest.json'), 'utf8'));
const byId = new Map(man.assets.map((a) => [a.id, a]));
for (const a of man.assets) {
  const p = join(ROOT, 'assets', a.file);
  if (!existsSync(p)) { errors.push(`${a.id}: falta ${a.file}`); continue; }
  const [w, h] = pngSize(p);
  if (w !== a.size[0] || h !== a.size[1]) errors.push(`${a.id}: PNG ${w}×${h} ≠ manifest ${a.size.join('×')}`);
  for (const k of ['source', 'license', 'reuse', 'status']) if (!a[k]) errors.push(`${a.id}: falta '${k}' (procedencia obligatoria)`);
  if (a.kind === 'tileset') {
    if (w % a.tile || h % a.tile) errors.push(`${a.id}: no es múltiplo de ${a.tile}`);
    const count = (w / a.tile) * (h / a.tile);
    for (const [n, i] of Object.entries(a.tiles)) if (i >= count) errors.push(`${a.id}: tile ${n}=${i} fuera de rango (${count})`);
  }
  if (a.kind === 'spritesheet') {
    if (w % a.frame[0] || h % a.frame[1]) errors.push(`${a.id}: no divisible en frames ${a.frame.join('×')}`);
    if (h / a.frame[1] !== a.rows.length || w / a.frame[0] !== a.framesPerRow) errors.push(`${a.id}: filas/columnas no cuadran`);
  }
  if (a.status === 'placeholder') warnings.push(`${a.id}: PLACEHOLDER`);
}

const mapPath = join(ROOT, 'maps/gate.tmj');
const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const gidAsset = new Map();
let tileCount = 0;
for (const ts of map.tilesets) {
  if (ts.image) {
    const p = resolve(dirname(mapPath), ts.image);
    if (!existsSync(p)) errors.push(`tileset ${ts.name}: falta ${ts.image}`);
    else {
      const [w, h] = pngSize(p);
      if (w !== ts.imagewidth || h !== ts.imageheight) errors.push(`tileset ${ts.name}: ${w}×${h} ≠ mapa ${ts.imagewidth}×${ts.imageheight}`);
    }
    tileCount = ts.tilecount;
  }
  for (const t of ts.tiles ?? []) {
    const p = resolve(dirname(mapPath), t.image);
    if (!existsSync(p)) errors.push(`objeto gid ${ts.firstgid + t.id}: falta ${t.image}`);
    const id = t.properties?.find((q) => q.name === 'asset')?.value;
    if (!byId.has(id)) errors.push(`objeto gid ${ts.firstgid + t.id}: asset '${id}' no está en el manifest`);
    gidAsset.set(ts.firstgid + t.id, byId.get(id));
  }
}
for (const l of map.layers) {
  if (l.type === 'tilelayer') {
    if (l.data.length !== map.width * map.height) errors.push(`capa ${l.name}: tamaño de datos incorrecto`);
    for (const g of l.data) if (g < 0 || g > tileCount) { errors.push(`capa ${l.name}: gid ${g} fuera del tileset`); break; }
  } else {
    for (const o of l.objects) {
      if (!o.gid) continue;
      const a = gidAsset.get(o.gid);
      if (!a) { errors.push(`capa ${l.name}: objeto ${o.id} con gid desconocido ${o.gid}`); continue; }
      if (o.width !== a.size[0] || o.height !== a.size[1]) errors.push(`capa ${l.name}: ${a.id} con tamaño ${o.width}×${o.height} ≠ ${a.size.join('×')}`);
    }
  }
}

for (const w of warnings) console.log('aviso ', w);
for (const e of errors) console.log('ERROR ', e);
console.log(`\n${man.assets.length} assets, ${map.layers.length} capas · ${errors.length} errores · ${warnings.length} placeholders`);
process.exit(errors.length ? 1 : 0);
