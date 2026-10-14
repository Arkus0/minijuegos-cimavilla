// Decisiones de ASSET-SPEC §1: rejilla de 16 px, vista lógica de 480×270 y solo escalado entero.
export const VW = 480;
export const VH = 270;
export const TILE = 16;

export const DEPTH = {
  ground: -1000,
  groundDetail: -999,
  roofsBack: -500,
  overhead: 100000,
  dusk: 100001,
  lights: 100002,
  rain: 100003,
  debug: 200000,
} as const;
