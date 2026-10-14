import { STRIPS, SYMBOLS } from './game.mjs';

export class MechanicalReels {
  constructor(canvases) {
    this.canvases = canvases;
    this.positions = [0, 1, 6];
    this.images = new Map();
    this.jobs = new Map();
    this.pausedAt = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer = new ResizeObserver(() => this.drawAll());
    canvases.forEach(c => this.observer.observe(c));
    this.ready = Promise.all(SYMBOLS.map(symbol => new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images.set(symbol, img); resolve(); };
      img.onerror = resolve;
      img.src = `assets/${symbol}.svg`;
    }))).then(() => this.drawAll());
  }

  setPositions(positions) { this.positions = [...positions]; this.drawAll(); }
  drawAll() { this.canvases.forEach((_, i) => this.draw(i)); }

  draw(index, velocity = 0) {
    const canvas = this.canvases[index], rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = w / dpr, height = h / dpr, center = height / 2;
    const bg = ctx.createLinearGradient(0, 0, width, 0);
    bg.addColorStop(0, '#c5c0ab'); bg.addColorStop(.18, '#eee8d4');
    bg.addColorStop(.56, '#fffbee'); bg.addColorStop(.9, '#e8e0c8'); bg.addColorStop(1, '#aaa38d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    const position = this.positions[index], nearest = Math.round(position);
    const radius = height * .60, size = Math.min(width * .83, height * .72);
    ctx.filter = velocity > 1 && !this.reduced ? `blur(${Math.min(velocity * .085, 4)}px)` : 'none';
    for (let offset = -2; offset <= 2; offset++) {
      const stop = nearest + offset, angle = (stop - position) * 1.05;
      if (Math.abs(angle) > 1.68) continue;
      const symbol = STRIPS[index][((stop % STRIPS[index].length) + STRIPS[index].length) % STRIPS[index].length];
      const img = this.images.get(symbol);
      const symbolHeight = size * Math.max(.07, Math.cos(angle));
      const y = center - Math.sin(angle) * radius;
      ctx.globalAlpha = Math.min(1, Math.max(.3, Math.cos(angle) + .28));
      if (img) ctx.drawImage(img, (width - size) / 2, y - symbolHeight / 2, size, symbolHeight);
      else {
        ctx.fillStyle = '#822b2b'; ctx.font = `bold ${size * .5}px Georgia`; ctx.textAlign = 'center';
        ctx.fillText(symbol === 'seven' ? '7' : symbol.slice(0, 1).toUpperCase(), width / 2, y + symbolHeight / 4);
      }
    }
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    const shadow = ctx.createLinearGradient(0, 0, 0, height);
    shadow.addColorStop(0, 'rgba(22,23,15,.72)'); shadow.addColorStop(.18, 'rgba(28,27,18,.2)');
    shadow.addColorStop(.38, 'rgba(24,22,17,0)'); shadow.addColorStop(.65, 'rgba(24,22,17,0)');
    shadow.addColorStop(.84, 'rgba(28,27,18,.22)'); shadow.addColorStop(1, 'rgba(22,23,15,.77)');
    ctx.fillStyle = shadow; ctx.fillRect(0, 0, width, height);
    // Reflections on the curved glass, independent of the printed strip.
    ctx.fillStyle = 'rgba(255,255,245,.1)';
    ctx.beginPath(); ctx.moveTo(width * .12, 0); ctx.lineTo(width * .29, 0);
    ctx.lineTo(width * .54, height); ctx.lineTo(width * .47, height); ctx.fill();
    ctx.strokeStyle = 'rgba(79,69,47,.035)';
    for (let y = 0; y < height; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }

  animate(index, target, { duration = 2200, turns = 2, onStop = () => {} } = {}) {
    return new Promise(resolve => {
      const length = STRIPS[index].length, start = this.positions[index];
      const delta = ((target - start) % length + length) % length + turns * length;
      this.jobs.set(index, { start, delta, target, duration: this.reduced ? Math.min(duration, 420) : duration,
        begun: performance.now(), last: start, onStop, resolve });
      this.startLoop();
    });
  }

  startLoop() {
    if (this.frame || this.pausedAt) return;
    const loop = now => {
      this.frame = 0;
      if (this.pausedAt) return;
      for (const [i, job] of this.jobs) {
        const t = Math.max(0, Math.min(1, (now - job.begun) / job.duration));
        // Smooth motor acceleration followed by a long mechanical deceleration.
        const eased = t - Math.sin(t * 2 * Math.PI) / (2 * Math.PI);
        this.positions[i] = job.start + job.delta * eased;
        const velocity = Math.abs(this.positions[i] - job.last) * 60;
        job.last = this.positions[i];
        this.draw(i, velocity);
        if (t >= 1) {
          this.positions[i] = job.target;
          this.draw(i);
          this.jobs.delete(i);
          job.onStop(i); job.resolve();
        }
      }
      if (this.jobs.size) this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  async spin(targets, held, onStop) {
    await this.ready;
    const suspense = STRIPS[0][targets[0]] === STRIPS[1][targets[1]];
    return Promise.all(targets.map((target, i) => held[i] ? Promise.resolve() :
      this.animate(i, target, { duration: 2250 + i * 580 + (i === 2 && suspense ? 650 : 0), turns: 2 + i, onStop })));
  }

  nudge(index, target, onStop) { return this.animate(index, target, { duration: 380, turns: 0, onStop }); }

  pause(paused) {
    if (paused && !this.pausedAt) {
      this.pausedAt = performance.now();
      cancelAnimationFrame(this.frame); this.frame = 0;
    } else if (!paused && this.pausedAt) {
      const elapsed = performance.now() - this.pausedAt;
      this.jobs.forEach(j => { j.begun += elapsed; });
      this.pausedAt = 0; this.startLoop();
    }
  }

  finishImmediately() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    for (const [i, job] of this.jobs) { this.positions[i] = job.target; job.resolve(); }
    this.jobs.clear(); this.drawAll();
  }
}
