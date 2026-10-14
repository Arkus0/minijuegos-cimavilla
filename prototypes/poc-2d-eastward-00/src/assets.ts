import manifestJson from '../assets/manifest.json';
import gateMapRaw from '../maps/gate.tmj?raw';

export interface AssetDef {
  id: string;
  kind: 'image' | 'tileset' | 'spritesheet';
  file: string;
  size: [number, number];
  anchor?: [number, number];
  layer?: 'walls' | 'props' | 'overhead';
  collides?: boolean;
  status: 'placeholder' | 'tool' | 'integrated' | 'adapted';
  label?: string;
  tile?: number;
  columns?: number;
  tiles?: Record<string, number>;
  frame?: [number, number];
  rows?: string[];
  framesPerRow?: number;
  source?: string;
  license?: string;
  reuse?: string;
}

export const manifest = manifestJson as unknown as { spec: { tile: number; logical: [number, number] }; assets: AssetDef[] };
export const assetsById = new Map(manifest.assets.map((a) => [a.id, a]));
export const gateMap = JSON.parse(gateMapRaw) as TiledMap;

// Vite resuelve cada PNG a URL (o a data URI en la build de un solo fichero).
const urls = import.meta.glob('../assets/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function assetUrl(file: string): string {
  const url = urls['../assets/' + file];
  if (!url) throw new Error(`PNG no encontrado para ${file}; revisa assets/manifest.json`);
  return url;
}

export interface TiledProperty { name: string; type: string; value: string | number | boolean }
export interface TiledObject {
  id: number; name: string; x: number; y: number; width: number; height: number;
  gid?: number; point?: boolean; properties?: TiledProperty[];
}
export interface TiledLayer { id: number; name: string; type: 'tilelayer' | 'objectgroup'; objects?: TiledObject[]; data?: number[] }
export interface TiledTileset {
  firstgid: number; name: string; image?: string;
  tiles?: { id: number; image: string; properties?: TiledProperty[] }[];
}
export interface TiledMap { width: number; height: number; tilewidth: number; tileheight: number; layers: TiledLayer[]; tilesets: TiledTileset[] }

export function prop<T extends string | number | boolean>(o: { properties?: TiledProperty[] }, name: string, fallback?: T): T | undefined {
  const p = o.properties?.find((q) => q.name === name);
  return (p ? p.value : fallback) as T | undefined;
}

const FLIP_BITS = 0xe0000000; // volteo/rotación que Tiled codifica en el gid
export const isFlippedX = (gid: number) => (gid & 0x80000000) !== 0;

/** gid de un objeto-imagen de Tiled → id de asset del manifest. */
export function assetForGid(map: TiledMap, rawGid: number): AssetDef {
  const gid = (rawGid & ~FLIP_BITS) >>> 0;
  for (const ts of map.tilesets) {
    const t = ts.tiles?.find((tt) => ts.firstgid + tt.id === gid);
    if (t) {
      const id = prop<string>(t, 'asset');
      const a = id ? assetsById.get(id) : undefined;
      if (!a) throw new Error(`gid ${gid} sin asset en el manifest`);
      return a;
    }
  }
  throw new Error(`gid ${gid} no pertenece a ningún tileset de objetos`);
}
