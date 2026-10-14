import * as Phaser from 'phaser';
import { assetUrl, gateMap, manifest } from '../assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    for (const a of manifest.assets) {
      const url = assetUrl(a.file);
      if (a.kind === 'spritesheet') {
        this.load.spritesheet(a.id, url, { frameWidth: a.frame![0], frameHeight: a.frame![1] });
      } else {
        this.load.image(a.id, url);
      }
    }
    this.cache.tilemap.add('gate', { format: Phaser.Tilemaps.Formats.TILED_JSON, data: gateMap });
  }

  create() {
    for (const a of manifest.assets) {
      if (a.kind !== 'spritesheet') continue;
      a.rows!.forEach((dir, r) => {
        const n = a.framesPerRow!;
        const frames = Array.from({ length: n }, (_, i) => r * n + i);
        this.anims.create({ key: `${a.id}-walk-${dir}`, frames: this.anims.generateFrameNumbers(a.id, { frames }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${a.id}-idle-${dir}`, frames: this.anims.generateFrameNumbers(a.id, { frames: [r * n] }), frameRate: 1 });
      });
    }
    this.scene.start('gate');
  }
}
