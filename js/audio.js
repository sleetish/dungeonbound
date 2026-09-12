// ---- Tiny WebAudio synth (SFX + looping chip music) -------------------------
const Sound = {
  ctx: null, enabled: true, master: null, musicGain: null,
  seqTimer: null, track: null, intensity: 0,
  // 0 calm, 1 tense (low HP), 2 boss phase: adds an arpeggio voice on top of the current track
  setIntensity(n) { this.intensity = U.clamp(n, 0, 2); },
  init() {
    if (this.ctx || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.25; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.45; this.musicGain.connect(this.master);
      if (this.track) { const t = this.track; this.track = null; this.play(t); }
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggle() { this.enabled = !this.enabled; if (this.master) this.master.gain.value = this.enabled ? 0.25 : 0; return this.enabled; },
  tone(freq, dur, type, vol, slide, when) {
    type = type || 'square'; vol = vol == null ? 0.5 : vol; slide = slide || 0; when = when || 0;
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    vol = vol == null ? 0.4 : vol;
    if (!this.ctx || !this.enabled) return;
    const n = Math.floor(this.ctx.sampleRate * dur); const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.master); s.start();
  },
  sfx(name) {
    switch (name) {
      case 'text': this.tone(880, 0.03, 'square', 0.12); break;
      case 'cursor': this.tone(660, 0.05, 'square', 0.25); break;
      case 'confirm': this.tone(523, 0.06, 'square', 0.3); this.tone(784, 0.08, 'square', 0.3, 0, 0.06); break;
      case 'cancel': this.tone(392, 0.08, 'square', 0.25, -100); break;
      case 'hit': this.noise(0.12, 0.5); this.tone(150, 0.12, 'sawtooth', 0.4, -80); break;
      case 'smash': this.noise(0.25, 0.7); this.tone(90, 0.3, 'sawtooth', 0.6, -60); this.tone(1200, 0.1, 'square', 0.3, -900, 0.05); break;
      case 'miss': this.tone(300, 0.1, 'triangle', 0.3, -200); break;
      case 'heal': for (let i = 0; i < 4; i++) this.tone(660 + i * 110, 0.12, 'triangle', 0.3, 0, i * 0.05); break;
      case 'magic': for (let i = 0; i < 6; i++) this.tone(400 + i * 90, 0.08, 'square', 0.25, 200, i * 0.04); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'square', 0.35, 0, i * 0.1)); break;
      case 'achieve': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.35, 0, i * 0.07)); break;
      case 'encounter': for (let i = 0; i < 8; i++) this.tone(200 + i * 60, 0.06, 'square', 0.3, 300, i * 0.05); break;
      case 'ko': this.tone(220, 0.4, 'sawtooth', 0.4, -180); break;
      case 'win': [523, 523, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.35, 0, i * 0.09)); break;
      case 'item': this.tone(1046, 0.08, 'square', 0.3); this.tone(1318, 0.12, 'square', 0.3, 0, 0.08); break;
      case 'coin': this.tone(1568, 0.06, 'square', 0.3); this.tone(2093, 0.1, 'square', 0.3, 0, 0.05); break;
      case 'stairs': [440, 392, 349, 294].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.3, 0, i * 0.1)); break;
      case 'error': this.tone(180, 0.15, 'square', 0.3); break;
      case 'run': for (let i = 0; i < 5; i++) this.tone(600 - i * 80, 0.05, 'square', 0.25, 0, i * 0.05); break;
    }
  },
  // ---- music: simple step sequencer -------------------------------------
  TRACKS: {
    overworld: { bpm: 132, bass: [110, 0, 110, 0, 131, 0, 98, 0, 110, 0, 110, 0, 147, 0, 131, 0],
      lead: [440, 494, 523, 0, 587, 0, 523, 494, 440, 0, 392, 440, 0, 330, 0, 0], type: 'square' },
    battle: { bpm: 168, bass: [82, 82, 0, 82, 98, 0, 82, 0, 73, 73, 0, 73, 87, 0, 98, 0],
      lead: [330, 0, 392, 440, 0, 392, 330, 0, 294, 0, 349, 392, 0, 349, 294, 262], type: 'sawtooth' },
    title: { bpm: 100, bass: [131, 0, 0, 0, 98, 0, 0, 0, 110, 0, 0, 0, 87, 0, 0, 0],
      lead: [523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 0, 523, 0, 0, 494, 0], type: 'triangle' },
    shop: { bpm: 120, bass: [131, 0, 165, 0, 131, 0, 165, 0, 147, 0, 175, 0, 147, 0, 175, 0],
      lead: [659, 0, 784, 659, 0, 523, 0, 0, 698, 0, 880, 698, 0, 587, 0, 0], type: 'triangle' },
    boss: { bpm: 180, bass: [65, 65, 78, 65, 65, 65, 73, 65, 62, 62, 73, 62, 62, 62, 87, 78],
      lead: [262, 0, 311, 262, 349, 0, 311, 0, 233, 0, 277, 233, 311, 0, 277, 0], type: 'sawtooth' },
  },
  play(trackName) {
    if (this.track === trackName) return;
    this.stop(); this.track = trackName;
    if (!this.ctx) return;
    const tr = this.TRACKS[trackName]; if (!tr) return;
    const stepDur = 60 / tr.bpm / 2; let step = 0; let next = this.ctx.currentTime + 0.05;
    const self = this;
    const schedule = () => {
      while (next < self.ctx.currentTime + 0.25) {
        const i = step % tr.bass.length;
        if (tr.bass[i] && self.enabled) self.mnote(tr.bass[i], stepDur * 0.9, 'triangle', 0.5, next);
        if (tr.lead[i] && self.enabled) self.mnote(tr.lead[i], stepDur * 0.7, tr.type, 0.22, next);
        if (self.intensity > 0 && self.enabled && tr.bass[i]) { // urgency voice: fast octave arpeggio over the bass
          const base = tr.bass[i] * 4; const arp = [base, base * 1.5, base * 2, base * 1.5][step % 4];
          self.mnote(arp, stepDur * 0.35, 'square', self.intensity === 2 ? 0.16 : 0.1, next);
          if (self.intensity === 2) self.mnote(arp * 1.26, stepDur * 0.3, 'square', 0.08, next + stepDur * 0.5);
        }
        next += stepDur; step++;
      }
    };
    schedule();
    this.seqTimer = setInterval(schedule, 100);
  },
  mnote(freq, dur, type, vol, t) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.01);
  },
  stop() { if (this.seqTimer) clearInterval(this.seqTimer); this.seqTimer = null; this.track = null; },
};
