// All sounds are synthesised with the Web Audio API — no audio files.
// Engine: filtered noise + low oscillator. Missile: noise whoosh. Explosion: noise boom.
// Starts muted (like the original); browsers only allow audio after a user click.

export class Sound {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // engine
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 500;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.25;
    noise.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
    noise.start();

    this.hum = ctx.createOscillator();
    this.hum.type = 'sawtooth';
    this.hum.frequency.value = 55;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 180;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.08;
    this.hum.connect(humFilter).connect(humGain).connect(this.master);
    this.hum.start();
  }

  toggle() {
    this.init();
    if (!this.ctx) return false;
    this.enabled = !this.enabled;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.setTargetAtTime(this.enabled ? 0.6 : 0, this.ctx.currentTime, 0.1);
    return this.enabled;
  }

  /** throttle in [0, 1] */
  update(throttle) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.engineFilter.frequency.setTargetAtTime(380 + throttle * 1400, t, 0.15);
    this.engineGain.gain.setTargetAtTime(0.18 + throttle * 0.22, t, 0.15);
    this.hum.frequency.setTargetAtTime(48 + throttle * 40, t, 0.2);
  }

  burst({ duration, freqStart, freqEnd, gain, type = 'bandpass' }) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freqStart, t);
    filter.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  missile() {
    this.burst({ duration: 0.9, freqStart: 2400, freqEnd: 500, gain: 0.5 });
  }

  explosion() {
    this.burst({ duration: 1.6, freqStart: 900, freqEnd: 60, gain: 1.0, type: 'lowpass' });
  }

  /** Short square-wave beep, used for missile and ground warnings. */
  beep(freq = 1200, duration = 0.08, gain = 0.18) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.setValueAtTime(0, t + duration);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  hit() {
    this.burst({ duration: 0.5, freqStart: 1800, freqEnd: 200, gain: 0.8, type: 'lowpass' });
  }

  roll() {
    this.burst({ duration: 0.5, freqStart: 700, freqEnd: 1500, gain: 0.25 });
  }
}
