import * as Phaser from 'phaser';
import { assetForGid, assetsById, gateMap, prop, type TiledLayer, type TiledObject } from '../assets';
import { DEPTH, TILE, VH, VW } from '../config';

type Rect = { x: number; y: number; w: number; h: number; name: string };
type Dir = 'down' | 'left' | 'right' | 'up';

const WALK_SPEED = 64; // px/s lógicos
const FOOT = { w: 12, h: 6 };

export interface GateState {
  cam: { x: number; y: number };
  walker: { x: number; y: number; dir: Dir };
  toggles: Record<string, boolean>;
  zoom: number;
  placeholders: string[];
}

export class GateScene extends Phaser.Scene {
  private walker!: Phaser.GameObjects.Sprite;
  private dir: Dir = 'down';
  private colliders: Rect[] = [];
  private overheads: Phaser.GameObjects.Image[] = [];
  private lightLayer: Phaser.GameObjects.GameObject[] = [];
  private dusk!: Phaser.GameObjects.Rectangle;
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter;
  private debug!: Phaser.GameObjects.Graphics;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private freeCam = false;
  private camPos = new Phaser.Math.Vector2();
  private toggles: Record<string, boolean> = { lights: true, rain: true, grid: false, collision: false, bounds: false, overheadFade: true };
  private mapW = 0;
  private mapH = 0;

  constructor() {
    super('gate');
  }

  create() {
    this.mapW = gateMap.width * TILE;
    this.mapH = gateMap.height * TILE;

    const map = this.make.tilemap({ key: 'gate' });
    const ts = map.addTilesetImage('suelo', 'suelo', TILE, TILE, 0, 0)!;
    map.createLayer('ground', ts, 0, 0)!.setDepth(DEPTH.ground);
    map.createLayer('ground-detail', ts, 0, 0)!.setDepth(DEPTH.groundDetail);

    for (const layer of gateMap.layers) {
      if (layer.type !== 'objectgroup') continue;
      this.buildObjectLayer(layer);
    }

    const spawn = this.objects('spawn')[0];
    this.walker = this.add.sprite(spawn.x, spawn.y, 'pj_prueba').setOrigin(0.5, 1);
    this.walker.play('pj_prueba-idle-down');

    // Atardecer + orbayu: subordinados al arte, se pueden apagar (L / R) para juzgar el arte base.
    this.dusk = this.add.rectangle(0, 0, VW, VH, 0x9b8fae).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.dusk).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.rain = this.add.particles(0, 0, 'fx_gota', {
      x: { min: -40, max: VW + 40 }, y: -8, lifespan: 900, speedY: { min: 240, max: 300 }, speedX: -40,
      quantity: 2, frequency: 16, alpha: { min: 0.35, max: 0.7 }, rotate: 8,
    }).setScrollFactor(0).setDepth(DEPTH.rain);

    this.debug = this.add.graphics().setDepth(DEPTH.debug);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.setRoundPixels(true);
    cam.startFollow(this.walker, true);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,L,R,G,C,B,O,F,H') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e.key.toUpperCase()));

    this.applyToggles();
    this.exposeApi();
  }

  // ---------------------------------------------------------------------------
  private objects(name: string): TiledObject[] {
    return gateMap.layers.find((l) => l.name === name)?.objects ?? [];
  }

  private buildObjectLayer(layer: TiledLayer) {
    for (const o of layer.objects ?? []) {
      if (layer.name === 'collision') {
        if (prop(o, 'collides', false)) this.colliders.push({ x: o.x, y: o.y, w: o.width, h: o.height, name: o.name });
        continue;
      }
      if (layer.name === 'lights') {
        this.addLight(o);
        continue;
      }
      if (!o.gid) continue;
      const a = assetForGid(gateMap, o.gid);
      const img = this.add.image(o.x, o.y, a.id).setOrigin(0, 1);
      img.setData('asset', a.id).setData('layer', layer.name);
      if (layer.name === 'overhead') {
        img.setDepth(DEPTH.overhead);
        this.overheads.push(img);
      } else {
        img.setDepth(prop<number>(o, 'sortY', o.y)!);
      }
      if (layer.name === 'props' && a.collides) {
        this.colliders.push({ x: o.x + 2, y: o.y - 6, w: o.width - 4, h: 6, name: a.id });
      }
    }
  }

  private addLight(o: TiledObject) {
    const radius = prop<number>(o, 'radius', 48)!;
    const color = Phaser.Display.Color.HexStringToColor(prop<string>(o, 'color', '#f2b45a')!).color;
    const glow = this.add.image(o.x, o.y, 'fx_glow').setDepth(DEPTH.lights).setBlendMode(Phaser.BlendModes.ADD);
    glow.setScale((radius * 2) / glow.width).setTint(color).setAlpha(0.55);
    if (prop(o, 'flicker', false)) {
      // Parpadeo a escalones (no interpolado) para no meter brillos suaves impropios del pixel art.
      this.time.addEvent({ delay: 120, loop: true, callback: () => glow.setAlpha(Phaser.Math.RND.pick([0.5, 0.55, 0.55, 0.6])) });
    }
    this.lightLayer.push(glow);
  }

  // ---------------------------------------------------------------------------
  private onKey(k: string) {
    const flip = (name: string) => { this.toggles[name] = !this.toggles[name]; this.applyToggles(); };
    if (k === 'L') flip('lights');
    if (k === 'R') flip('rain');
    if (k === 'G') flip('grid');
    if (k === 'C') flip('collision');
    if (k === 'B') flip('bounds');
    if (k === 'O') flip('overheadFade');
    if (k === 'F') this.setFreeCam(!this.freeCam);
    if (k === 'H') document.getElementById('hud')?.classList.toggle('off');
  }

  private setFreeCam(on: boolean) {
    this.freeCam = on;
    const cam = this.cameras.main;
    if (on) {
      cam.stopFollow();
      this.camPos.set(cam.scrollX, cam.scrollY);
    } else {
      cam.startFollow(this.walker, true);
    }
  }

  private applyToggles() {
    this.dusk.setVisible(this.toggles.lights);
    this.lightLayer.forEach((g) => (g as Phaser.GameObjects.Image).setVisible(this.toggles.lights));
    this.rain.setVisible(this.toggles.rain);
    this.rain.emitting = this.toggles.rain;
    if (!this.toggles.overheadFade) this.overheads.forEach((o) => o.setAlpha(1));
  }

  // ---------------------------------------------------------------------------
  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;
    const k = this.keys, c = this.cursors;
    const ix = (k.D.isDown || c.right.isDown ? 1 : 0) - (k.A.isDown || c.left.isDown ? 1 : 0);
    const iy = (k.S.isDown || c.down.isDown ? 1 : 0) - (k.W.isDown || c.up.isDown ? 1 : 0);

    if (this.freeCam) {
      const cam = this.cameras.main;
      this.camPos.x = Phaser.Math.Clamp(this.camPos.x + ix * 120 * dt, 0, this.mapW - VW);
      this.camPos.y = Phaser.Math.Clamp(this.camPos.y + iy * 120 * dt, 0, this.mapH - VH);
      cam.setScroll(this.camPos.x, this.camPos.y);
      this.walker.anims.play(`pj_prueba-idle-${this.dir}`, true);
    } else {
      this.moveWalker(ix, iy, dt);
    }

    this.walker.setDepth(this.walker.y);
    this.updateOverheads();
    this.drawDebug();
    this.updateHud();
  }

  private moveWalker(ix: number, iy: number, dt: number) {
    if (ix || iy) {
      const len = Math.hypot(ix, iy);
      const dx = (ix / len) * WALK_SPEED * dt;
      const dy = (iy / len) * WALK_SPEED * dt;
      this.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : iy > 0 ? 'down' : iy < 0 ? 'up' : this.dir;
      if (!this.blocked(this.walker.x + dx, this.walker.y)) this.walker.x += dx;
      if (!this.blocked(this.walker.x, this.walker.y + dy)) this.walker.y += dy;
      this.walker.anims.play(`pj_prueba-walk-${this.dir}`, true);
    } else {
      this.walker.anims.play(`pj_prueba-idle-${this.dir}`, true);
    }
  }

  private footRect(x: number, y: number): Rect {
    return { x: x - FOOT.w / 2, y: y - FOOT.h, w: FOOT.w, h: FOOT.h, name: 'pies' };
  }

  private blocked(x: number, y: number): boolean {
    const f = this.footRect(x, y);
    if (f.y + f.h > this.mapH) return true;
    return this.colliders.some((r) => f.x < r.x + r.w && f.x + f.w > r.x && f.y < r.y + r.h && f.y + f.h > r.y);
  }

  private updateOverheads() {
    if (!this.toggles.overheadFade) return;
    const wb = this.walker.getBounds();
    for (const o of this.overheads) {
      const hit = Phaser.Geom.Intersects.RectangleToRectangle(wb, o.getBounds());
      o.setAlpha(hit ? 0.45 : 1);
    }
  }

  private drawDebug() {
    const g = this.debug;
    g.clear();
    const cam = this.cameras.main;
    if (this.toggles.grid) {
      g.lineStyle(1, 0xffffff, 0.18);
      const x0 = Math.floor(cam.scrollX / TILE) * TILE, y0 = Math.floor(cam.scrollY / TILE) * TILE;
      for (let x = x0; x <= cam.scrollX + VW; x += TILE) g.lineBetween(x + 0.5, cam.scrollY, x + 0.5, cam.scrollY + VH);
      for (let y = y0; y <= cam.scrollY + VH; y += TILE) g.lineBetween(cam.scrollX, y + 0.5, cam.scrollX + VW, y + 0.5);
    }
    if (this.toggles.collision) {
      g.lineStyle(1, 0xff4040, 0.9);
      for (const r of this.colliders) g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      const f = this.footRect(this.walker.x, this.walker.y);
      g.lineStyle(1, 0x40ff80, 1).strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
    }
    if (this.toggles.bounds) {
      for (const obj of this.children.list) {
        const img = obj as Phaser.GameObjects.Image;
        const layer = img.getData?.('layer');
        if (!layer) continue;
        const b = img.getBounds();
        g.lineStyle(1, layer === 'overhead' ? 0x40c0ff : layer === 'walls' ? 0xffd040 : 0xff80ff, 0.9);
        g.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);
        g.fillStyle(0xffffff, 1).fillRect(img.x - 1, img.y - 1, 3, 3);
      }
    }
  }

  private updateHud() {
    const hud = document.getElementById('hud');
    if (!hud || hud.classList.contains('off')) return;
    const cam = this.cameras.main;
    const on = (k: string) => (this.toggles[k] ? '<b>on</b>' : 'off');
    const ph = this.placeholderIds();
    hud.innerHTML =
      `ART-GATE · Cimavilla · escala ×${this.scale.zoom} · ${Math.round(this.game.loop.actualFps)} fps\n` +
      `${this.freeCam ? 'CÁMARA LIBRE' : 'CAMINANTE'} · cam ${Math.round(cam.scrollX)},${Math.round(cam.scrollY)} · pj ${Math.round(this.walker.x)},${Math.round(this.walker.y)}\n` +
      `WASD/flechas mover · F cámara libre · Tab galería · 1-4 escala, 0 auto · H ocultar\n` +
      `L luz ${on('lights')} · R orbayu ${on('rain')} · G rejilla ${on('grid')} · C colisión ${on('collision')} · B límites ${on('bounds')} · O tejados ${on('overheadFade')}\n` +
      (ph.length ? `PLACEHOLDERS (no son arte): ${ph.length}/${assetsById.size}` : 'Sin placeholders');
  }

  private placeholderIds(): string[] {
    return [...assetsById.values()].filter((a) => a.status === 'placeholder').map((a) => a.id);
  }

  // API determinista para capturas automatizadas (tools/capture.mjs).
  private exposeApi() {
    const api = {
      state: (): GateState => ({
        cam: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
        walker: { x: this.walker.x, y: this.walker.y, dir: this.dir },
        toggles: { ...this.toggles, freeCam: this.freeCam },
        zoom: this.scale.zoom,
        placeholders: this.placeholderIds(),
      }),
      setCam: (x: number, y: number) => { this.setFreeCam(true); this.camPos.set(x, y); this.cameras.main.setScroll(x, y); },
      setWalker: (x: number, y: number, dir: Dir = 'down') => { this.setFreeCam(false); this.walker.setPosition(x, y); this.dir = dir; },
      toggle: (name: string, on: boolean) => { this.toggles[name] = on; this.applyToggles(); },
      mapSize: () => ({ w: this.mapW, h: this.mapH }),
    };
    (window as unknown as { __gate: typeof api }).__gate = api;
  }
}
