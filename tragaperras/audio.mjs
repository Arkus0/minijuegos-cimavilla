// Original foley, short 1990s jingles and local voice samples. Playback starts on interaction.
export class MachineAudio {
  constructor() {
    this.muted = false; this.context = null; this.motor = null; this.volume = .42;
    this.samples = new Map(); this.voice = null; this.welcomed = false; this.lastAttract = 0;
    this.voiceTicket = 0;
  }

  async unlock() {
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain(); this.master.gain.value = this.muted ? 0 : this.volume;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 4;
        limiter.attack.value = .004; limiter.release.value = .2;
        this.master.connect(limiter).connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (!this.muted && !this.sampleReady) {
        this.sampleReady = Promise.all(Object.entries({ welcome: 'assets/audio/reclamo.mp3', prize: 'assets/audio/premio.mp3' }).map(async ([name, path]) => {
          try {
            const response = await fetch(path);
            if (!response.ok) return;
            const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
            this.samples.set(name, buffer);
          } catch { /* The jingles still work if a voice sample cannot load. */ }
        }));
      }
      // Optional samples load in the background; a slow download must never stall play.
    } catch { /* Audio is optional in embedded browsers. */ }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopVoice();
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

  bell(frequency, duration = .65, delay = 0, gain = .24) {
    // Slightly inharmonic partials: the small tinny speaker of a fruit machine.
    [[1,1],[2.01,.38],[2.99,.15],[4.15,.055]].forEach(([ratio, level]) =>
      this.tone(frequency * ratio, duration / Math.sqrt(ratio), delay, gain * level));
  }

  coin() { this.impact(1900, .1, .5); this.bell(2350, .25, .015, .13); this.tone(4100, .12, .06, .05); }
  payoutCoin() { this.impact(2300, .09, .44); this.bell(1850 + Math.random() * 700, .28, .015, .12); }
  click() { this.impact(600, .06, .32); this.tone(120, .065, 0, .13); }
  stop(index) {
    this.impact(220 + index * 85, .12, .7); this.tone(85, .13, 0, .15);
    this.bell([523,659,784][index], .32, .045, .12);
  }
  bonus() {
    this.stopVoice();
    [523,784,659,1047].forEach((f,i) => this.bell(f, .36, i * .115, .2));
    this.tone(131, .35, 0, .1, 'triangle');
  }
  welcome() {
    if (this.welcomed || this.muted) return;
    this.welcomed = true; this.attract(true);
  }
  attract(withVoice = false) {
    if (!this.context || this.context.state !== 'running' || this.muted) return;
    const now = performance.now();
    if (now - this.lastAttract < 26000 && this.lastAttract !== 0) return;
    this.lastAttract = now;
    [659,784,1047,784,1318].forEach((f,i) => this.bell(f, .36, i * .105, .13));
    this.tone(165,.42,0,.07,'triangle');
    if (withVoice) this.playVoice('welcome', .16);
  }
  anticipation() {
    this.stopVoice();
    [196,247,294,392].forEach((f,i) => this.tone(f,.55,i*.14,.11,'triangle'));
    this.bell(1568, .6, .4, .09);
  }
  win(big = false) {
    this.stopVoice();
    const notes = big ? [523,659,784,1047,784,1047,1318,1568,1318,1568,2093] : [523,659,784,1047,784,1047,1318];
    notes.forEach((f,i) => { this.bell(f,.6,i*.115,.2); this.tone(f/2,.2,i*.115,.075,'triangle'); });
    [131,165,196].forEach(f => this.tone(f,1.1,.12,.075,'triangle'));
    if (big) [523,659,784].forEach(f => this.bell(f,.95,1.2,.12));
    this.playVoice('prize', .36);
  }

  playVoice(name, delay = 0) {
    if (this.muted || !this.context) return;
    this.stopVoice();
    const ticket = this.voiceTicket, expiresAt = performance.now() + 2000;
    const play = () => {
      if (ticket !== this.voiceTicket || this.muted || !this.samples.has(name) || performance.now() > expiresAt) return;
      const source = this.context.createBufferSource(), high = this.context.createBiquadFilter();
      const low = this.context.createBiquadFilter(), gain = this.context.createGain();
      source.buffer = this.samples.get(name);
      high.type = 'highpass'; high.frequency.value = 290;
      low.type = 'lowpass'; low.frequency.value = 3800; low.Q.value = .7;
      gain.gain.value = .7;
      source.connect(high).connect(low).connect(gain).connect(this.master);
      this.voice = source;
      source.onended = () => { if (this.voice === source) this.voice = null; };
      source.start(this.context.currentTime + delay);
    };
    if (this.samples.has(name)) play();
    else if (this.sampleReady) this.sampleReady.then(play);
  }

  stopVoice() {
    this.voiceTicket++;
    if (!this.voice) return;
    try { this.voice.stop(); } catch { /* The sample may already have ended. */ }
    this.voice = null;
  }

  startMotor() {
    if (!this.context || !this.noise || this.motor) return;
    this.stopVoice();
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
    source.buffer = this.noise; source.loop = true;
    filter.type = 'lowpass'; filter.frequency.value = 650; gain.gain.value = .095;
    source.connect(filter).connect(gain).connect(this.master); source.start();
    const hum = this.context.createOscillator(); hum.frequency.value = 58; hum.type = 'triangle';
    const pulse = this.context.createOscillator(), depth = this.context.createGain();
    pulse.frequency.value = 24; pulse.type = 'square'; depth.gain.value = .018;
    pulse.connect(depth).connect(gain.gain); pulse.start();
    hum.connect(gain); hum.start(); this.motor = { source, gain, hum, pulse };
  }

  stopMotor() {
    if (!this.motor) return;
    const { source, gain, hum, pulse } = this.motor, now = this.context.currentTime;
    gain.gain.setTargetAtTime(0, now, .06); source.stop(now + .3); hum.stop(now + .3); pulse.stop(now + .3); this.motor = null;
  }

  pause(paused) {
    if (!this.context) return;
    if (paused) this.context.suspend().catch(() => {});
    else this.context.resume().catch(() => {});
  }
}
