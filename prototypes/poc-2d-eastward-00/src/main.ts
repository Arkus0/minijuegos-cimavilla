import * as Phaser from 'phaser';
import { VH, VW } from './config';
import { BootScene } from './scenes/BootScene';
import { GateScene } from './scenes/GateScene';
import { buildGallery } from './gallery';
import './style.css';

let forcedZoom = 0; // 0 = automático (máximo entero que cabe)

function autoZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / VW, window.innerHeight / VH)));
}

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VW,
  height: VH,
  backgroundColor: '#121014',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.NONE, zoom: autoZoom() },
  scene: [BootScene, GateScene],
});

function applyZoom() {
  game.scale.setZoom(forcedZoom || autoZoom());
}
window.addEventListener('resize', applyZoom);

const gallery = document.getElementById('gallery')!;
let galleryBuilt = false;
window.addEventListener('keydown', async (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const open = gallery.classList.toggle('open');
    if (open && !galleryBuilt) {
      galleryBuilt = true;
      await buildGallery(gallery);
    }
    if (open) game.scene.pause('gate');
    else game.scene.resume('gate');
  }
  if (/^[0-4]$/.test(e.key)) {
    forcedZoom = Number(e.key);
    applyZoom();
  }
});

(window as unknown as { __game: Phaser.Game }).__game = game;
