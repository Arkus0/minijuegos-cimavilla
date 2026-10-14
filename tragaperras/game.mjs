export const STAKE = 25;
export const SYMBOLS = ['cherry', 'lemon', 'watermelon', 'seven', 'bell'];
export const LABELS = ['Cerezas', 'Limón', 'Sandía', 'Siete', 'Campana'];
export const PAYOUTS = { cherry: 5, lemon: 10, watermelon: 20, seven: 50, bell: 100 };

// Physical strips: every stop, including a nudge, follows this printed order.
const C = 'cherry', L = 'lemon', W = 'watermelon', S = 'seven', B = 'bell';
export const STRIPS = [
  [C,L,C,W,L,C,S,L,C,W,C,B,L,C,W,L,S,C,L,W,C],
  [W,L,C,L,S,C,W,C,L,B,C,L,W,C,S,L,C,W,L,C,C],
  [L,C,W,C,L,W,S,C,L,C,B,L,C,W,L,S,C,L,W,C,C],
];
const READY = new Set(['idle', 'hold', 'nudge']);

export function score(symbols) {
  const [a, b, c] = symbols;
  if (a === b && b === c) return PAYOUTS[a] || 0;
  return a === C && b === C ? 2 : 0;
}

export class SlotGame {
  constructor({ pesetas = 500, seed = Date.now(), snapshot = null } = {}) {
    this.state = {
      version: 1, wallet: Math.max(0, Math.trunc(pesetas)), initialWallet: Math.max(0, Math.trunc(pesetas)),
      credits: 0, bank: 0, positions: [0, 1, 6], held: [false, false, false], mode: 'idle',
      nudges: 0, spins: 0, wins: 0, best: 0, lastWin: 0, totalWon: 0, pending: null,
      rng: (seed >>> 0) || 0x6d2b79f5,
    };
    if (snapshot && validSnapshot(snapshot)) {
      this.state = structuredClone(snapshot);
      // A reload cannot refund a paid spin or lose its already selected result.
      if (this.state.mode === 'spinning') this.finishSpin();
      if (this.state.mode === 'win') this.settleWin();
    }
  }

  random() {
    let x = this.state.rng;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state.rng = x >>> 0;
    return this.state.rng / 4294967296;
  }

  get symbols() { return this.state.positions.map((p, i) => STRIPS[i][p]); }
  get canSpin() { return READY.has(this.state.mode) && this.state.credits > 0; }
  get canCashOut() { return READY.has(this.state.mode) && this.state.credits + this.state.bank > 0; }
  get empty() { return this.state.wallet < STAKE && this.state.credits === 0 && this.state.bank === 0; }
  snapshot() { return structuredClone(this.state); }

  insertCoin() {
    if (!READY.has(this.state.mode) || this.state.wallet < STAKE) return false;
    this.state.wallet -= STAKE;
    this.state.credits += 1;
    return true;
  }

  beginSpin() {
    if (!this.canSpin) return null;
    const held = this.state.mode === 'hold' ? [...this.state.held] : [false, false, false];
    const targets = this.state.positions.map((p, i) => held[i] ? p : Math.floor(this.random() * STRIPS[i].length));
    this.state.credits--;
    this.state.spins++;
    this.state.mode = 'spinning';
    this.state.nudges = 0;
    this.state.lastWin = 0;
    this.state.pending = { targets, held };
    return structuredClone(this.state.pending);
  }

  finishSpin() {
    if (this.state.mode !== 'spinning' || !this.state.pending) return null;
    this.state.positions = [...this.state.pending.targets];
    this.state.pending = null;
    this.state.held = [false, false, false];
    return this.resolve(true);
  }

  resolve(fresh) {
    const reward = score(this.symbols);
    if (reward) {
      this.state.bank += reward;
      this.state.lastWin = reward;
      this.state.totalWon += reward * STAKE;
      this.state.best = Math.max(this.state.best, reward * STAKE);
      this.state.wins++;
      this.state.nudges = 0;
      this.state.mode = 'win';
      return { type: 'win', reward, symbols: this.symbols };
    }
    if (fresh) {
      const chance = this.random();
      if (chance < .22) {
        this.state.mode = 'nudge';
        this.state.nudges = 1 + Math.floor(this.random() * 3);
        return { type: 'nudge', nudges: this.state.nudges };
      }
      if (chance < .44) {
        this.state.mode = 'hold';
        return { type: 'hold' };
      }
    }
    this.state.mode = this.state.nudges > 0 ? 'nudge' : 'idle';
    return { type: this.state.mode === 'nudge' ? 'nudge' : 'loss', nudges: this.state.nudges };
  }

  toggleHold(index) {
    if (this.state.mode !== 'hold' || !Number.isInteger(index) || index < 0 || index > 2) return false;
    if (!this.state.held[index] && this.state.held.filter(Boolean).length >= 2) return false;
    this.state.held[index] = !this.state.held[index];
    return true;
  }

  nudge(index) {
    if (this.state.mode !== 'nudge' || this.state.nudges < 1 || !Number.isInteger(index) || index < 0 || index > 2) return null;
    this.state.positions[index] = (this.state.positions[index] + 1) % STRIPS[index].length;
    this.state.nudges--;
    return this.resolve(false);
  }

  settleWin() { if (this.state.mode === 'win') this.state.mode = 'idle'; }

  cashOut() {
    if (!this.canCashOut) return 0;
    const pesetas = (this.state.credits + this.state.bank) * STAKE;
    this.state.wallet += pesetas;
    this.state.credits = 0;
    this.state.bank = 0;
    this.state.held = [false, false, false];
    this.state.nudges = 0;
    this.state.mode = 'idle';
    return pesetas;
  }

  result() {
    const total = this.state.wallet + (this.state.credits + this.state.bank) * STAKE;
    return { tipo: 'fin', id: 'tragaperras', puntos: this.state.totalWon,
      ganado: this.state.wins > 0, pesetasDelta: total - this.state.initialWallet,
      partidas: this.state.spins, mejorPremio: this.state.best };
  }
}

export function validSnapshot(s) {
  if (!s || s.version !== 1 || !['idle','hold','nudge','spinning','win'].includes(s.mode)) return false;
  if (!['wallet','initialWallet','credits','bank','nudges','spins','wins','best','lastWin','totalWon','rng'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0)) return false;
  if (s.rng === 0 || s.rng > 0xffffffff || s.nudges > 3) return false;
  const positionsOK = p => Array.isArray(p) && p.length === 3 && p.every((v,i) => Number.isInteger(v) && v >= 0 && v < STRIPS[i].length);
  const holdsOK = h => Array.isArray(h) && h.length === 3 && h.every(v => typeof v === 'boolean') && h.filter(Boolean).length <= 2;
  if (!positionsOK(s.positions) || !holdsOK(s.held)) return false;
  if (s.mode === 'spinning') return !!s.pending && positionsOK(s.pending.targets) && holdsOK(s.pending.held);
  return s.pending === null;
}
