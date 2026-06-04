/* =====================================================================
   MOTOR D'ÀUDIO — chiptune sintetitzat (Web Audio API)
   Música per escena + efectes de so. Tot generat, sense fitxers externs.
   ===================================================================== */

const AudioEngine = {
  ctx: null,
  master: null,
  musicGain: null,
  muted: false,
  started: false,

  // Seqüenciador
  track: null,
  step: 0,
  stepTimer: 0,
  stepDur: 0.13,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.master);
    } catch (e) { /* àudio no disponible */ }
    this.muted = localStorage.getItem('mos_muted') === '1';
    this.applyMute();
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
  },

  applyMute() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    const btn = document.getElementById('btnMute');
    if (btn) {
      btn.textContent = this.muted ? '♪̸' : '♪';
      btn.classList.toggle('off', this.muted);
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('mos_muted', this.muted ? '1' : '0');
    this.applyMute();
    if (window.Achievements) Achievements.unlock('silenci');
    return this.muted;
  },

  // ---- Notes ----
  // Freqüència d'una nota tipus "A4", "C#5", etc.
  freq(note) {
    if (note == null || note === 0) return 0;
    const names = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const m = /^([A-G]#?)(\d)$/.exec(note);
    if (!m) return 0;
    const semitone = names[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (semitone - 69) / 12);
  },

  blip(freq, dur, type = 'square', gain = 0.18, dest = null, attack = 0.005) {
    if (!this.ctx || freq <= 0) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, gain = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g); g.connect(this.master);
    src.start(t);
  },

  // ---- Efectes de so ----
  sfx(name) {
    if (!this.ctx) return;
    const m = this.master;
    switch (name) {
      case 'type': this.blip(U.rand(800, 1100), 0.03, 'square', 0.04, m); break;
      case 'pickup': this.blip(660, 0.06, 'square', 0.12, m); setTimeout(() => this.blip(990, 0.08, 'square', 0.12, m), 50); break;
      case 'star': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.08, 'triangle', 0.13, m), i * 45)); break;
      case 'hurt': this.blip(180, 0.18, 'sawtooth', 0.16, m); this.noise(0.12, 0.08); break;
      case 'select': this.blip(440, 0.05, 'square', 0.12, m); break;
      case 'confirm': this.blip(523, 0.06, 'square', 0.14, m); setTimeout(() => this.blip(784, 0.1, 'square', 0.14, m), 60); break;
      case 'glitch': for (let i = 0; i < 6; i++) setTimeout(() => { this.blip(U.rand(100, 1500), 0.04, 'sawtooth', 0.12, m); this.noise(0.05, 0.1); }, i * 35); break;
      case 'powerup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.09, 'square', 0.14, m), i * 55)); break;
      case 'bosshit': this.blip(U.rand(90, 140), 0.12, 'sawtooth', 0.18, m); this.noise(0.1, 0.12); break;
      case 'fire': this.blip(880, 0.05, 'triangle', 0.08, m); break;
      case 'heart': this.blip(587, 0.08, 'sine', 0.14, m); setTimeout(() => this.blip(880, 0.12, 'sine', 0.12, m), 70); break;
      case 'win': ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C6'].forEach((nt, i) => setTimeout(() => this.blip(this.freq(nt), 0.18, 'triangle', 0.16, m), i * 110)); break;
      case 'connect': [330, 440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.blip(f, 0.14, 'sine', 0.15, m), i * 80)); break;
    }
  },

  // ---- Música (patrons de passos) ----
  setTrack(name) {
    this.track = TRACKS[name] || null;
    this.step = 0;
    this.stepTimer = 0;
    if (this.track) {
      this.stepDur = 60 / (this.track.bpm * 4); // semicorxeres
      if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.track.vol || 0.5, this.ctx.currentTime, 0.3);
    } else if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }
  },

  update(dt) {
    if (!this.ctx || !this.track || this.muted) return;
    this.stepTimer += dt;
    while (this.stepTimer >= this.stepDur) {
      this.stepTimer -= this.stepDur;
      this.playStep(this.step);
      this.step = (this.step + 1) % this.track.len;
    }
  },

  playStep(i) {
    const tr = this.track;
    if (tr.lead) { const n = tr.lead[i % tr.lead.length]; if (n) this.blip(this.freq(n), this.stepDur * (tr.leadLen || 1.6), tr.leadWave || 'square', 0.12); }
    if (tr.harm) { const n = tr.harm[i % tr.harm.length]; if (n) this.blip(this.freq(n), this.stepDur * 1.4, tr.harmWave || 'triangle', 0.07); }
    if (tr.bass) { const n = tr.bass[i % tr.bass.length]; if (n) this.blip(this.freq(n), this.stepDur * 1.8, tr.bassWave || 'triangle', 0.16); }
    if (tr.drum && tr.drum[i % tr.drum.length]) {
      const d = tr.drum[i % tr.drum.length];
      if (d === 'k') this.blip(70, 0.12, 'sine', 0.22);
      else if (d === 'h') this.noise(0.03, 0.05);
      else if (d === 's') this.noise(0.08, 0.12);
    }
  },
};

// ---------------------------------------------------------------------
// Pistes musicals (chiptune). Cada lletra és una nota; "0"/null = silenci.
// ---------------------------------------------------------------------
const _ = 0;
const TRACKS = {
  // Terminal: ambient lent i misteriós.
  terminal: {
    bpm: 84, len: 16, vol: 0.4, leadWave: 'triangle',
    lead: ['A4', _, _, 'E4', _, 'A4', _, _, 'C5', _, _, 'B4', _, 'E4', _, _],
    bass: ['A2', _, _, _, 'A2', _, _, _, 'F2', _, _, _, 'E2', _, _, _],
    drum: ['h', _, _, _, 'h', _, _, _, 'h', _, _, _, 'h', _, _, _],
  },
  // Títol: heroic i nostàlgic.
  title: {
    bpm: 120, len: 16, vol: 0.5,
    lead: ['E5', _, 'G5', _, 'A5', _, 'B5', _, 'A5', _, 'G5', _, 'E5', _, 'D5', _],
    harm: ['C5', _, _, _, 'F4', _, _, _, 'E4', _, _, _, 'G4', _, _, _],
    bass: ['C3', _, 'C3', _, 'F2', _, 'F2', _, 'A2', _, 'A2', _, 'G2', _, 'G2', _],
    drum: ['k', _, 'h', _, 's', _, 'h', _, 'k', _, 'h', _, 's', _, 'h', 'h'],
  },
  // Nivell 1 escola: alegre i juganer.
  school: {
    bpm: 132, len: 16, vol: 0.45,
    lead: ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', 'F5', 'E5', 'C5', 'G4', 'C5', 'E5', _],
    bass: ['C3', _, 'G2', _, 'F2', _, 'C3', _, 'G2', _, 'C3', _, 'G2', _, 'C3', _],
    drum: ['k', _, 'h', _, 's', _, 'h', _, 'k', _, 'h', 'k', 's', _, 'h', _],
  },
  // Nivell 2 aventures: èpic i obert.
  adventure: {
    bpm: 124, len: 16, vol: 0.48,
    lead: ['D5', _, 'F5', 'A5', _, 'G5', 'F5', _, 'E5', _, 'G5', _, 'D5', _, 'A4', _],
    harm: ['A4', _, _, _, 'D5', _, _, _, 'C5', _, _, _, 'A4', _, _, _],
    bass: ['D3', _, 'D3', _, 'B2', _, 'B2', _, 'G2', _, 'G2', _, 'A2', _, 'A2', _],
    drum: ['k', _, 'h', _, 's', _, 'h', _, 'k', 'k', 'h', _, 's', _, 'h', _],
  },
  // Nivell 3 vida adulta: groovy i una mica cansat.
  adult: {
    bpm: 108, len: 16, vol: 0.42, leadWave: 'square',
    lead: ['A4', _, 'C5', _, 'A4', _, 'G4', _, 'E4', _, 'G4', _, 'A4', _, _, _],
    bass: ['A2', _, 'A2', 'E2', 'F2', _, 'F2', _, 'C3', _, 'C3', _, 'E2', _, 'E2', _],
    drum: ['k', _, 'h', 'h', 's', _, 'h', _, 'k', _, 'h', 'h', 's', _, 'h', _],
  },
  // Nivell 4 caos: ràpid i frenètic.
  chaos: {
    bpm: 168, len: 16, vol: 0.46,
    lead: ['E5', 'E5', 'B4', 'C5', 'D5', 'D5', 'A4', 'B4', 'C5', 'C5', 'G4', 'A4', 'B4', 'A4', 'G4', 'F4'],
    bass: ['E2', 'E2', 'E2', 'E2', 'A2', 'A2', 'A2', 'A2', 'C3', 'C3', 'C3', 'C3', 'B2', 'B2', 'B2', 'B2'],
    drum: ['k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 's', 's', 's'],
  },
  // Boss: tens i èpic.
  boss: {
    bpm: 150, len: 16, vol: 0.5, leadWave: 'sawtooth',
    lead: ['A4', _, 'A4', 'C5', 'B4', _, 'B4', 'D5', 'C5', _, 'E5', _, 'A5', _, 'G5', 'F5'],
    harm: ['E4', _, _, _, 'E4', _, _, _, 'F4', _, _, _, 'E4', _, _, _],
    bass: ['A2', 'A2', _, 'A2', 'A2', 'A2', _, 'A2', 'F2', 'F2', _, 'F2', 'E2', 'E2', 'E2', 'E2'],
    drum: ['k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 'h', 'k', 's', 'k', 's'],
  },
  // Retrobament/final: càlid i emotiu.
  love: {
    bpm: 92, len: 16, vol: 0.5, leadWave: 'triangle', leadLen: 2.4,
    lead: ['C5', _, _, 'E5', _, 'G5', _, _, 'F5', _, 'E5', _, 'D5', _, _, _],
    harm: ['G4', _, _, _, 'C5', _, _, _, 'A4', _, _, _, 'G4', _, _, _],
    bass: ['C3', _, _, _, 'A2', _, _, _, 'F2', _, _, _, 'G2', _, _, _],
    drum: ['h', _, _, _, _, _, _, _, 'h', _, _, _, _, _, _, _],
  },
};
