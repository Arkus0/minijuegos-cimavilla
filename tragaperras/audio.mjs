// Original procedural foley. Nothing is downloaded or played before interaction.
export class MachineAudio {
  constructor() { this.muted = false; this.context = null; this.motor = null; this.volume = .32; }

  async unlock() {
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Audio is optional in embedded browsers. */ }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.context.currentTime, .06);
  }

  tone(frequency, duration = .14, delay = 0, gain = .24, type = 'sine') {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime + delay, osc = this.context.createOscillator(), envelope = this.context.createGain();
    osc.type = type; osc.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(gain, now + .006);
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(envelope).connect(this.master); osc.start(now); osc.stop(now + duration + .02);
  }

  impact(frequency = 350, duration = .09, gain = .35) {
    if (!this.context || !this.noise) return;
    const now = this.context.currentTime, source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter(), envelope = this.context.createGain();
    source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 1.3;
    envelope.gain.setValueAtTime(gain, now); envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    source.connect(filter).connect(envelope).connect(this.master); source.start(now); source.stop(now + duration);
  }

  coin() { this.impact(1900, .1, .5); this.tone(2700, .18, .015, .16); this.tone(4100, .12, .06, .08); }
  click() { this.impact(600, .06, .32); this.tone(120, .065, 0, .13); }
  stop(index) { this.impact(220 + index * 85, .12, .7); this.tone(85, .13, 0, .15); }
  bonus() { [523, 659, 784].forEach((f,i) => this.tone(f, .23, i * .09, .15, 'triangle')); }
  win(big = false) {
    const notes = big ? [523,659,784,1047,784,1047,1318,1568] : [659,784,1047,1318];
    notes.forEach((f,i) => { this.tone(f,.42,i*.13,.23,'triangle'); this.tone(f*2,.32,i*.13,.05); });
  }

  startMotor() {
    if (!this.context || !this.noise || this.motor) return;
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; source.loop = true;
    filter.type = 'lowpass'; filter.frequency.value = 650; gain.gain.value = .095;
    source.connect(filter).connect(gain).connect(this.master); source.start();
    const hum = this.context.createOscillator(); hum.frequency.value = 58; hum.type = 'triangle';
    hum.connect(gain); hum.start(); this.motor = { source, gain, hum };
  }

  stopMotor() {
    if (!this.motor) return;
    const { source, gain, hum } = this.motor, now = this.context.currentTime;
    gain.gain.setTargetAtTime(0, now, .06); source.stop(now + .3); hum.stop(now + .3); this.motor = null;
  }

  pause(paused) {
    if (!this.context) return;
    if (paused) this.context.suspend().catch(() => {});
    else this.context.resume().catch(() => {});
  }
}
