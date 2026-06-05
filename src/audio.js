/* =====================================================================
   MOTOR D'ÀUDIO — chiptune + MP3 (AudioBuffer → BufferSource)
   Els MP3 es descodifiquen al desbloqueig; la reproducció no depèn de
   audio.play() i funciona des del bucle de joc (sense gest actiu).
   ===================================================================== */

/** Fitxers MP3 reals del joc. */
const FILE_TRACKS = {
  sabadell: { url: 'assets/himne-sabadell.mp3', gain: 1.3 },
  weddingMarch: { url: 'assets/mendelssohn-wedding-march.mp3', gain: 1.1, loop: true },
};

const AudioEngine = {
  ctx: null,
  master: null,
  muted: false,
  started: false,
  _unlocked: false,
  _musicTimer: null,
  _buffers: {},
  _loading: {},
  _sources: {},
  _currentFile: null,

  track: null,
  step: 0,
  stepDur: 0.13,

  init() {
    this.muted = localStorage.getItem('mos_muted') === '1';
    const btn = document.getElementById('btnMute');
    if (btn) {
      btn.textContent = this.muted ? '♪̸' : '♪';
      btn.classList.toggle('off', this.muted);
    }
  },

  /** Crea el context només després d'un gest de l'usuari (requisit dels navegadors). */
  ensureCtx() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyMute();
      return true;
    } catch (e) {
      return false;
    }
  },

  resume() {
    if (!this.ensureCtx()) return;
    const done = () => {
      this.started = true;
      this._restartMusicTimer();
    };
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      const p = this.ctx.resume();
      if (p && typeof p.then === 'function') p.then(done).catch(done);
      else done();
    } else done();
  },

  _stopMusicTimer() {
    if (this._musicTimer != null) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  },

  _restartMusicTimer() {
    this._stopMusicTimer();
    if (!this.ctx || !this.track || this.muted || !this.started) return;
    const ms = Math.max(40, Math.round(this.stepDur * 1000));
    this._musicTimer = setInterval(() => {
      if (!this.ctx || !this.track || this.muted) return;
      if (this.ctx.state !== 'running') {
        this.ctx.resume();
        return;
      }
      this.playStep(this.step);
      this.step = (this.step + 1) % this.track.len;
    }, ms);
  },

  applyMute() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    const btn = document.getElementById('btnMute');
    if (btn) {
      btn.textContent = this.muted ? '♪̸' : '♪';
      btn.classList.toggle('off', this.muted);
    }
    if (this.muted) this._stopMusicTimer();
    else this._restartMusicTimer();
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('mos_muted', this.muted ? '1' : '0');
    this.applyMute();
    if (window.Achievements) Achievements.unlock('silenci');
    return this.muted;
  },

  /** Desbloqueig únic després del primer gest: context + descodifica MP3. */
  unlock() {
    if (!this.ensureCtx()) return;
    this._waitRunning().then((ok) => {
      if (!ok) return;
      if (!this._unlocked) {
        this._unlocked = true;
        for (const [name, cfg] of Object.entries(FILE_TRACKS)) {
          this._loadFileBuffer(name, cfg);
        }
      }
      this.resume();
    });
  },

  freq(note) {
    if (note == null || note === 0) return 0;
    const flatMap = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E' };
    const flat = /^([A-G]b)(\d)$/.exec(note);
    if (flat) note = flatMap[flat[1]] + flat[2];
    const names = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const m = /^([A-G]#?)(\d)$/.exec(note);
    if (!m) return 0;
    const semitone = names[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (semitone - 69) / 12);
  },

  blip(freq, dur, type = 'square', gain = 0.18) {
    if (!this.ensureCtx() || freq <= 0 || gain <= 0) return;
    const t = this.ctx.currentTime;
    const rel = Math.max(dur, 0.05);
    const atk = 0.01;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + atk);
    g.gain.linearRampToValueAtTime(0.0001, t + rel);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + rel + 0.06);
  },

  noise(dur, gain = 0.2) {
    if (!this.ensureCtx() || gain <= 0) return;
    const t = this.ctx.currentTime;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  },

  sfx(name) {
    if (!this.ensureCtx()) return;
    if (this.ctx.state !== 'running') this.resume();
    switch (name) {
      case 'type': this.blip(U.rand(800, 1100), 0.03, 'square', 0.04); break;
      case 'pickup': this.blip(660, 0.06, 'square', 0.12); setTimeout(() => this.blip(990, 0.08, 'square', 0.12), 50); break;
      case 'star': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.08, 'triangle', 0.13), i * 45)); break;
      case 'hurt': this.blip(180, 0.18, 'sawtooth', 0.16); this.noise(0.12, 0.08); break;
      case 'select': this.blip(440, 0.05, 'square', 0.12); break;
      case 'confirm': this.blip(523, 0.06, 'square', 0.14); setTimeout(() => this.blip(784, 0.1, 'square', 0.14), 60); break;
      case 'glitch': for (let i = 0; i < 6; i++) setTimeout(() => { this.blip(U.rand(100, 1500), 0.04, 'sawtooth', 0.12); this.noise(0.05, 0.1); }, i * 35); break;
      case 'powerup': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.blip(f, 0.09, 'square', 0.14), i * 55)); break;
      case 'bosshit': this.blip(U.rand(90, 140), 0.12, 'sawtooth', 0.18); this.noise(0.1, 0.12); break;
      case 'fire': this.blip(880, 0.05, 'triangle', 0.08); break;
      case 'heart': this.blip(587, 0.08, 'sine', 0.14); setTimeout(() => this.blip(880, 0.12, 'sine', 0.12), 70); break;
      case 'win': ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C6'].forEach((nt, i) => setTimeout(() => this.blip(this.freq(nt), 0.18, 'triangle', 0.16), i * 110)); break;
      case 'connect': [330, 440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.blip(f, 0.14, 'sine', 0.15), i * 80)); break;
    }
  },

  // ---- MP3 descodificats → BufferSource (funciona fora del gest de l'usuari) ----
  /** Promise que es resol quan el context d'àudio està en marxa. */
  _waitRunning() {
    if (!this.ensureCtx()) return Promise.resolve(false);
    this.started = true;
    if (this.ctx.state === 'running') return Promise.resolve(true);
    const p = this.ctx.resume();
    if (p && typeof p.then === 'function') {
      return p.then(() => this.ctx.state === 'running').catch(() => false);
    }
    return Promise.resolve(this.ctx.state === 'running');
  },

  _loadFileBuffer(name, cfg) {
    if (this._buffers[name]) return Promise.resolve(this._buffers[name]);
    if (this._loading[name]) return this._loading[name];
    const p = this._waitRunning().then(async (ok) => {
      if (!ok || !this.ctx) return null;
      try {
        const res = await fetch(cfg.url);
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(ab.slice(0));
        this._buffers[name] = buf;
        return buf;
      } catch (e) {
        return null;
      } finally {
        delete this._loading[name];
      }
    });
    this._loading[name] = p;
    return p;
  },

  _startBuffer(name, cfg, opts) {
    const buf = this._buffers[name];
    if (!buf || !this.ctx || this.ctx.state !== 'running') return false;
    this.stopFile(name);
    this._stopMusicTimer();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts.loop != null ? !!opts.loop : !!cfg.loop;
    const g = this.ctx.createGain();
    g.gain.value = cfg.gain ?? 1;
    src.connect(g);
    g.connect(this.master);
    src.onended = () => {
      if (this._sources[name] && this._sources[name].source === src) {
        delete this._sources[name];
        if (this._currentFile === name) this._currentFile = null;
        if (opts.onended) opts.onended();
      }
    };
    this._sources[name] = { source: src, gainNode: g };
    this._currentFile = name;
    try {
      src.start(0);
      return true;
    } catch (e) {
      return false;
    }
  },

  /** Reprodueix un MP3 (BufferSource — no requereix gest actiu). */
  playFile(name, opts = {}) {
    const cfg = FILE_TRACKS[name];
    if (!cfg) return Promise.resolve(false);
    return this._waitRunning().then((ok) => {
      if (!ok) return false;
      if (this._buffers[name]) return this._startBuffer(name, cfg, opts);
      return this._loadFileBuffer(name, cfg).then((buf) => {
        if (!buf) return false;
        return this._startBuffer(name, cfg, opts);
      });
    });
  },

  stopFile(name) {
    const s = this._sources[name];
    if (s) {
      try { s.source.onended = null; s.source.stop(); } catch (e) {}
      delete this._sources[name];
    }
    if (this._currentFile === name) this._currentFile = null;
  },

  stopAllFiles() {
    for (const name of Object.keys(this._sources)) this.stopFile(name);
  },

  isFilePlaying(name) {
    return !!this._sources[name];
  },

  hasFileBuffer(name) {
    return !!this._buffers[name];
  },

  setTrack(name) {
    this._stopMusicTimer();
    this.stopAllFiles();
    this.track = TRACKS[name] || null;
    this.step = 0;
    if (this.track) {
      // beatDiv 2 = un pas per corxera; bpm = negra (♩) per minut.
      this.stepDur = 60 / (this.track.bpm * (this.track.beatDiv || 4));
      if (!this.ensureCtx()) return;
      if (this.started) {
        this._restartMusicTimer();
        if (!this.muted) this.playStep(0);
      } else this.resume();
    }
  },

  _noteOn(n) {
    return n != null && n !== 0 && n !== '';
  },

  _mg(mult) {
    if (this.muted || !this.track) return 0;
    return mult * (this.track.vol ?? 0.55);
  },

  update() {
    /* La música va per setInterval (_restartMusicTimer), no per dt del bucle. */
  },

  playStep(i) {
    const tr = this.track;
    const lg = tr.leadGain != null ? tr.leadGain : 0.22;
    if (tr.lead) {
      const n = tr.lead[i % tr.lead.length];
      if (this._noteOn(n)) {
        const dur = this.stepDur * (tr.leadLen || 1.6);
        const g = this._mg(lg);
        this.blip(this.freq(n), dur, tr.leadWave || 'square', g);
        if (tr.brass) {
          this.blip(this.freq(n) * 1.003, dur * 0.95, 'triangle', this._mg(lg * 0.4));
        }
      }
    }
    if (tr.harm) {
      const n = tr.harm[i % tr.harm.length];
      if (this._noteOn(n)) this.blip(this.freq(n), this.stepDur * 1.4, tr.harmWave || 'triangle', this._mg(tr.harmGain || 0.1));
    }
    if (tr.bass) {
      const n = tr.bass[i % tr.bass.length];
      if (this._noteOn(n)) this.blip(this.freq(n), this.stepDur * 1.8, tr.bassWave || 'triangle', this._mg(tr.bassGain || 0.24));
    }
    if (tr.drum) {
      const d = tr.drum[i % tr.drum.length];
      if (d === 'k') this.blip(70, 0.12, 'sine', this._mg(0.28));
      else if (d === 'h') this.noise(0.03, this._mg(0.1));
      else if (d === 's') this.noise(0.08, this._mg(0.16));
    }
  },
};

// ---------------------------------------------------------------------
// Pistes musicals (chiptune). Cada lletra és una nota; "0"/null = silenci.
// ---------------------------------------------------------------------
const _ = 0;
const TRACKS = {
  terminal: {
    bpm: 84, len: 16, vol: 0.4, leadWave: 'triangle',
    lead: ['A4', _, _, 'E4', _, 'A4', _, _, 'C5', _, _, 'B4', _, 'E4', _, _],
    bass: ['A2', _, _, _, 'A2', _, _, _, 'F2', _, _, _, 'E2', _, _, _],
    drum: ['h', _, _, _, 'h', _, _, _, 'h', _, _, _, 'h', _, _, _],
  },
  title: {
    bpm: 116, len: 32, vol: 0.5, leadWave: 'triangle', leadLen: 1.8,
    lead: [
      'E5', _, 'G5', 'A5', 'B5', _, 'A5', 'G5', 'E5', _, 'D5', 'E5', 'G5', _, 'A5', 'B5',
      'C6', _, 'B5', 'A5', 'G5', _, 'E5', 'D5', 'C5', _, 'D5', 'E5', 'G5', _, 'A5', 'G5',
      'E5', _, 'G5', 'A5', 'B5', _, 'D6', 'B5', 'A5', _, 'G5', 'E5', 'D5', _, 'E5', 'G5',
      'A5', _, 'B5', 'C6', 'B5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', _, 'C6', 'G5',
    ],
    harm: [
      'C5', 'E5', 'C5', 'E5', 'D5', 'F5', 'D5', 'F5', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5',
      'G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'B4',
      'C5', 'E5', 'C5', 'E5', 'G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5',
      'G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'E5',
    ],
    bass: [
      'C3', _, 'G2', _, 'A2', _, 'E2', _, 'C3', _, 'G2', _, 'A2', _, 'E2', _,
      'G2', _, 'D3', _, 'C3', _, 'G2', _, 'A2', _, 'E2', _, 'A2', _, 'E2', _,
      'C3', _, 'G2', _, 'G2', _, 'D3', _, 'C3', _, 'G2', _, 'A2', _, 'E2', _,
      'C3', _, 'G2', _, 'A2', _, 'E2', _, 'A2', _, 'E2', _, 'C3', _, 'G2', 'C3',
    ],
    drum: ['k', _, 'h', _, 'k', _, 'h', 'h', 'k', _, 'h', _, 'k', _, 'h', 's',
      'k', _, 'h', _, 'k', _, 'h', 'h', 'k', _, 'h', _, 'k', _, 'h', 's',
      'k', _, 'h', _, 'k', _, 'h', 'h', 'k', _, 'h', _, 'k', _, 'h', 's',
      'k', _, 'h', 'h', 'k', 'k', 'h', _, 'k', 's', 'h', 'k', _, 'h', 'k'],
  },
  school: {
    bpm: 128, len: 32, vol: 0.5, leadWave: 'square', leadLen: 1.4,
    lead: [
      'G5', 'G5', 'E5', 'C5', 'D5', 'E5', 'G5', _, 'G5', 'A5', 'G5', 'E5', 'C5', _, 'E5', 'G5',
      'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'A5', 'B5', 'A5', 'G5', 'E5', 'C5', 'D5', 'E5',
      'G5', _, 'G5', 'E5', 'C5', 'E5', 'G5', 'B5', 'C6', 'B5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5',
      'E5', 'G5', 'A5', 'G5', 'E5', 'C5', 'G4', 'C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'C5', 'G4', 'C5',
    ],
    harm: [
      'C5', 'E5', 'C5', 'E5', 'F4', 'A4', 'F4', 'A4', 'C5', 'E5', 'C5', 'E5', 'G4', 'B4', 'G4', 'B4',
      'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5', 'F4', 'A4', 'F4', 'A4',
      'C5', 'E5', 'C5', 'E5', 'G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5',
      'C5', 'E5', 'C5', 'E5', 'G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'G4', 'B4', 'G4', 'C5',
    ],
    bass: [
      'C3', 'G2', 'C3', 'G2', 'F2', 'C3', 'F2', 'C3', 'C3', 'G2', 'C3', 'G2', 'G2', 'D3', 'G2', 'D3',
      'A2', 'E2', 'A2', 'E2', 'G2', 'D3', 'G2', 'D3', 'A2', 'E2', 'A2', 'E2', 'F2', 'C3', 'F2', 'C3',
      'C3', 'G2', 'C3', 'G2', 'G2', 'D3', 'G2', 'D3', 'C3', 'G2', 'C3', 'G2', 'A2', 'E2', 'A2', 'E2',
      'C3', 'G2', 'C3', 'G2', 'G2', 'D3', 'G2', 'C3', 'C3', 'G2', 'C3', 'G2', 'G2', 'D3', 'G2', 'C3',
    ],
    drum: ['k', 'h', 'k', 'h', 'k', 'h', 'k', 's', 'k', 'h', 'k', 'h', 'k', 'h', 'k', 's',
      'k', 'h', 'k', 'h', 'k', 'h', 'k', 's', 'k', 'h', 'k', 'h', 'k', 'h', 'k', 's'],
  },
  adventure: {
    bpm: 118, len: 32, vol: 0.52, leadWave: 'triangle', leadLen: 2.0,
    lead: [
      'D5', _, 'F5', 'A5', 'D6', _, 'A5', 'F5', 'D5', _, 'E5', 'G5', 'B5', _, 'E5', 'G5',
      'A5', _, 'G5', 'F5', 'E5', 'D5', 'A4', _, 'B4', 'D5', 'F5', 'A5', _, 'G5', 'F5',
      'D5', _, 'F5', 'A5', 'D6', 'F6', 'D6', 'A5', 'F5', 'D5', 'A4', 'D5', 'F5', 'A5', 'D6', 'A5',
      'G5', 'F5', 'E5', 'D5', 'A4', _, 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'A5', 'G5', 'F5', 'D5',
    ],
    harm: [
      'A4', 'D5', 'A4', 'D5', 'A4', 'D5', 'A4', 'D5', 'E4', 'G4', 'E4', 'G4', 'E4', 'G4', 'E4', 'G4',
      'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'B4', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5',
      'A4', 'D5', 'A4', 'D5', 'G4', 'B4', 'G4', 'B4', 'A4', 'D5', 'A4', 'D5', 'F4', 'A4', 'F4', 'A4',
      'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'D5',
    ],
    bass: [
      'D3', _, 'D3', _, 'A2', _, 'D3', _, 'E2', _, 'E2', _, 'G2', _, 'E2', _,
      'A2', _, 'A2', _, 'G2', _, 'G2', _, 'G2', _, 'G2', _, 'A2', _, 'A2', _,
      'D3', _, 'D3', _, 'G2', _, 'G2', _, 'D3', _, 'D3', _, 'A2', _, 'D3', _,
      'G2', _, 'G2', _, 'A2', _, 'A2', _, 'E2', _, 'E2', _, 'A2', _, 'D3', 'A2',
    ],
    drum: ['k', _, 'h', _, 's', _, 'h', 'k', 'k', _, 'h', _, 's', _, 'h', 'k',
      'k', _, 'h', _, 'k', 'h', 's', _, 'h', 'k', 'k', _, 'h', _, 's', _, 'h',
      'k', _, 'h', 'k', 'k', 'k', 'h', 's', 'k', _, 'h', _, 'k', 'h', 's', 'k',
      'k', _, 'h', _, 'k', _, 'h', 's', 'k', 'k', 'h', 'k', 's', 'h', 'k', 's'],
  },
  adult: {
    bpm: 96, len: 32, vol: 0.48, leadWave: 'square', leadLen: 2.2, harmWave: 'triangle',
    lead: [
      'A4', _, 'C5', 'E5', 'A4', _, 'G4', 'E4', 'A4', _, 'C5', 'D5', 'E5', _, 'G4', 'A4',
      'F4', _, 'A4', 'C5', 'F4', _, 'E4', 'C4', 'D4', _, 'F4', 'G4', 'A4', _, 'G4', 'F4',
      'A4', _, 'C5', 'E5', 'G4', _, 'A4', 'C5', 'E5', _, 'D5', 'C5', 'A4', _, 'G4', 'A4',
      'E4', _, 'G4', 'A4', 'C5', _, 'A4', 'G4', 'E4', _, 'A4', 'C5', 'E5', _, 'A4', 'E4',
    ],
    harm: [
      'C5', _, 'E5', _, 'C5', _, 'E5', _, 'D5', _, 'F5', _, 'D5', _, 'F5', _,
      'F4', _, 'A4', _, 'F4', _, 'A4', _, 'G4', _, 'B4', _, 'G4', _, 'B4', _,
      'C5', _, 'E5', _, 'A4', _, 'C5', _, 'C5', _, 'E5', _, 'A4', _, 'C5', _,
      'A4', _, 'C5', _, 'F4', _, 'A4', _, 'C5', _, 'E5', _, 'A4', _, 'C5', _,
    ],
    bass: [
      'A2', _, 'E2', _, 'A2', _, 'E2', _, 'D3', _, 'A2', _, 'D3', _, 'A2', _,
      'F2', _, 'C3', _, 'F2', _, 'C3', _, 'G2', _, 'D3', _, 'G2', _, 'D3', _,
      'A2', _, 'E2', _, 'C3', _, 'G2', _, 'A2', _, 'E2', _, 'A2', _, 'E2', _,
      'A2', _, 'E2', _, 'F2', _, 'C3', _, 'A2', _, 'E2', _, 'A2', _, 'E2', 'A2',
    ],
    drum: ['k', _, _, 'h', 'k', _, 'h', _, 'k', _, _, 'h', 's', _, 'h', _, 'k',
      'k', _, 'h', _, 'k', _, 'h', 'h', 'k', _, _, 'h', 'k', _, 'h', _, 'k',
      'k', _, 'h', _, 'k', _, 'h', _, 'k', _, 'h', 'h', 's', _, 'h', 'k',
      'k', _, 'h', _, 'k', _, 'h', _, 'k', 'h', 'k', 's', 'h', 'k', 'h', 'k'],
  },
  chaos: {
    bpm: 152, len: 16, vol: 0.44, leadWave: 'sawtooth', leadLen: 1.2,
    lead: ['E5', 'B4', 'C5', 'D5', 'E5', 'B4', 'C5', 'D5', 'A4', 'E4', 'F4', 'G4', 'A4', 'G4', 'F4', 'E4'],
    harm: ['G4', 'B4', 'G4', 'B4', 'C5', 'E5', 'C5', 'E5', 'A4', 'C5', 'A4', 'C5', 'F4', 'A4', 'F4', 'A4'],
    bass: ['E2', 'E2', 'A2', 'A2', 'C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'E2', 'E2', 'F2', 'F2', 'E2', 'E2'],
    drum: ['k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 's', 'k', 's', 'h', 'k', 's', 's'],
  },
  boss: {
    bpm: 148, len: 32, vol: 0.52, leadWave: 'sawtooth', leadLen: 1.3,
    lead: [
      'A4', 'C5', 'B4', 'D5', 'C5', 'E5', 'D5', 'F5', 'E5', 'G5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5',
      'C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'G5', 'F5', 'E5', 'D5',
      'E5', 'G5', 'F5', 'A5', 'G5', 'B5', 'A5', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4',
      'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'A5', 'G5', 'E5', 'D5', 'C5', 'B4', 'A4',
    ],
    harm: [
      'E4', 'G4', 'E4', 'G4', 'F4', 'A4', 'F4', 'A4', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5',
      'F4', 'A4', 'F4', 'A4', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5', 'G4', 'B4', 'G4', 'B4',
      'E4', 'G4', 'E4', 'G4', 'G4', 'B4', 'G4', 'B4', 'A4', 'C5', 'A4', 'C5', 'F4', 'A4', 'F4', 'A4',
      'E4', 'G4', 'E4', 'G4', 'F4', 'A4', 'F4', 'A4', 'G4', 'B4', 'G4', 'B4', 'E4', 'G4', 'E4', 'G4',
    ],
    bass: [
      'A2', 'A2', 'E2', 'E2', 'F2', 'F2', 'C3', 'C3', 'G2', 'G2', 'D3', 'D3', 'A2', 'A2', 'E2', 'E2',
      'F2', 'F2', 'C3', 'C3', 'G2', 'G2', 'D3', 'D3', 'A2', 'A2', 'E2', 'E2', 'F2', 'F2', 'E2', 'E2',
      'A2', 'A2', 'G2', 'G2', 'F2', 'F2', 'E2', 'E2', 'A2', 'A2', 'E2', 'E2', 'F2', 'F2', 'E2', 'E2',
      'A2', 'E2', 'A2', 'E2', 'F2', 'C3', 'F2', 'C3', 'G2', 'D3', 'G2', 'D3', 'A2', 'E2', 'A2', 'E2',
    ],
    drum: ['k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 'k', 'k', 's', 'h', 'k',
      'k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 'k', 'k', 's', 'h', 'k',
      'k', 'k', 's', 'h', 'k', 'h', 's', 'k', 'k', 's', 'k', 's', 'h', 'k', 's', 's',
      'k', 'k', 's', 'h', 'k', 'k', 's', 'k', 'k', 's', 'k', 's', 's', 'k', 's', 's'],
  },
  love: {
    bpm: 92, len: 16, vol: 0.5, leadWave: 'triangle', leadLen: 2.4,
    lead: ['C5', _, _, 'E5', _, 'G5', _, _, 'F5', _, 'E5', _, 'D5', _, _, _],
    harm: ['G4', _, _, _, 'C5', _, _, _, 'A4', _, _, _, 'G4', _, _, _],
    bass: ['C3', _, _, _, 'A2', _, _, _, 'F2', _, _, _, 'G2', _, _, _],
    drum: ['h', _, _, _, _, _, _, _, 'h', _, _, _, _, _, _, _],
  },
  /* Mendelssohn Op. 61 — des de assets/mendelssohn-wedding-march.mid */
  ...MendelssohnWeddingMarch.buildTracks(),
};
