/* =====================================================================
   ASSETS — imatges + àudio (logo, himne Sabadell…)
   ===================================================================== */

const Assets = {
  images: {},
  sounds: {},
  _pixelCache: {},
  _sabadellPlaying: false,
  _sabadellTimer: null,
  _weddingPlaying: false,
  HIMNE_SABADELL_SRC: 'assets/himne-sabadell.mp3', // himne-versio-moderna-ce-sabadell-tall.mp3
  WEDDING_MARCH_SRC: 'assets/mendelssohn-wedding-march.mp3', // marxa nupcial real (MP3)

  loadImage(name, src) {
    return new Promise((resolve) => {
      let img = this.images[name];
      if (!img) {
        img = new Image();
        this.images[name] = img;
      }
      const done = (ok) => resolve(ok ? img : null);
      if (img.complete && img.naturalWidth) return done(true);
      img.onload = () => done(true);
      img.onerror = () => done(null);
      if (!img.src || !img.src.includes(src.replace(/^\//, ''))) img.src = src;
    });
  },

  loadSound(name, src) {
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = 'auto';
      this.sounds[name] = a;
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve(a);
      };
      a.addEventListener('canplaythrough', done, { once: true });
      a.addEventListener('loadeddata', done, { once: true });
      a.addEventListener('error', () => {
        if (settled) return;
        settled = true;
        delete this.sounds[name];
        resolve(null);
      }, { once: true });
      setTimeout(done, 4000);
      a.src = src;
      a.load();
    });
  },

  _getSabadellAudio() {
    const src = this.HIMNE_SABADELL_SRC;
    let a = this.sounds.sabadell;
    if (!a) {
      a = new Audio(src);
      a.preload = 'auto';
      this.sounds.sabadell = a;
    }
    if (!a.src || !a.src.endsWith('himne-sabadell.mp3')) {
      a.src = src;
      a.load();
    }
    return a;
  },

  _stopSabadellPlayback() {
    if (this._sabadellTimer != null) {
      clearTimeout(this._sabadellTimer);
      this._sabadellTimer = null;
    }
    const a = this.sounds.sabadell;
    if (a) {
      a.onended = null;
      try { a.pause(); } catch (e) {}
    }
    this._sabadellPlaying = false;
  },

  _getWeddingAudio() {
    let a = this.sounds.weddingMarch;
    if (!a) {
      a = new Audio(this.WEDDING_MARCH_SRC);
      a.preload = 'auto';
      this.sounds.weddingMarch = a;
    }
    if (!a.src || !a.src.endsWith('mendelssohn-wedding-march.mp3')) {
      a.src = this.WEDDING_MARCH_SRC;
      a.load();
    }
    a.loop = true;
    return a;
  },

  /** Atura la marxa nupcial real (en sortir de l'escena). */
  stopWeddingMarch() {
    this._weddingPlaying = false;
    const a = this.sounds.weddingMarch;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
  },

  /** Marxa nupcial real (MP3) en bucle: nivell del casament i caminada cap a l'arc. */
  playWeddingMarch() {
    const a = this._getWeddingAudio();
    if (window.AudioEngine) {
      AudioEngine.ensureCtx();
      if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
      AudioEngine.started = true;
      AudioEngine._stopMusicTimer();
    }
    this._weddingPlaying = true;

    const start = () => {
      if (!this._weddingPlaying) return;
      a.volume = (window.AudioEngine && AudioEngine.muted) ? 0 : 0.85;
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          const retry = () => {
            if (!this._weddingPlaying) return;
            a.volume = (window.AudioEngine && AudioEngine.muted) ? 0 : 0.85;
            a.play().catch(() => {});
          };
          a.addEventListener('canplay', retry, { once: true });
          a.load();
        });
      }
    };

    try { a.pause(); } catch (e) {}
    a.currentTime = 0;
    if (a.readyState >= 2) start();
    else {
      a.addEventListener('canplay', start, { once: true });
      a.load();
    }
    return true;
  },

  _primeEl(a) {
    const vol = a.volume;
    a.volume = 0.001;
    const p = a.play();
    if (!p || typeof p.then !== 'function') {
      a.volume = vol;
      return;
    }
    p.then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = vol;
    }).catch(() => { a.volume = vol; });
  },

  /** Desbloqueja reproducció HTML5 (iOS/Safari) després del primer gest. */
  primeAudio() {
    if (!this._sabadellPlaying) this._primeEl(this._getSabadellAudio());
    if (!this._weddingPlaying) this._primeEl(this._getWeddingAudio());
  },

  init() {
    return Promise.all([
      this.loadImage('logo', 'assets/logo.png'),
      this.loadImage('albert', 'assets/albert.png'),
      this.loadSound('sabadell', this.HIMNE_SABADELL_SRC),
      this.loadSound('weddingMarch', this.WEDDING_MARCH_SRC),
    ]);
  },

  /** Himne del CE Sabadell en recollir la pilota ⚽ (nivell 1). */
  playSabadellHimne() {
    const a = this._getSabadellAudio();
    this._stopSabadellPlayback();
    if (window.AudioEngine) {
      AudioEngine.ensureCtx();
      if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
      AudioEngine.started = true;
      AudioEngine._stopMusicTimer();
    }
    this._sabadellPlaying = true;
    const muted = window.AudioEngine && AudioEngine.muted;

    const onDone = () => {
      if (!this._sabadellPlaying) return;
      this._stopSabadellPlayback();
      if (window.AudioEngine && AudioEngine.track) AudioEngine._restartMusicTimer();
    };

    const start = () => {
      if (!this._sabadellPlaying) return;
      try { a.pause(); } catch (e) {}
      a.currentTime = 0;
      a.volume = muted ? 0 : 0.85;
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          const retry = () => {
            if (!this._sabadellPlaying) return;
            a.volume = muted ? 0 : 0.85;
            a.play().catch(onDone);
          };
          a.addEventListener('canplay', retry, { once: true });
          a.load();
        });
      }
    };

    a.onended = onDone;
    const scheduleFallback = () => {
      if (this._sabadellTimer != null) clearTimeout(this._sabadellTimer);
      const sec = (a.duration && isFinite(a.duration) && a.duration > 0) ? a.duration : 7.85;
      this._sabadellTimer = setTimeout(onDone, Math.round(sec * 1000) + 400);
    };
    a.addEventListener('loadedmetadata', scheduleFallback, { once: true });
    scheduleFallback();

    if (a.readyState >= 2) start();
    else {
      a.addEventListener('canplay', start, { once: true });
      a.load();
    }
    return true;
  },

  /** Retrat en estil pixel art (escala baixa + nearest-neighbor). */
  drawPixelPortrait(ctx, cx, cy, height, name = 'albert', alpha = 1) {
    const img = this.images[name];
    if (!img) return false;
    if (!img.complete || !img.naturalWidth) {
      if (!img.src) img.src = `assets/${name}.png`;
      return false;
    }
    const key = `${name}:${height}`;
    let cache = this._pixelCache[key];
    if (!cache) {
      const targetH = 40;
      const targetW = Math.max(1, Math.round(targetH * (img.width / img.height)));
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = targetH;
      const cctx = c.getContext('2d');
      cctx.imageSmoothingEnabled = false;
      cctx.drawImage(img, 0, 0, targetW, targetH);
      cache = { canvas: c, w: targetW, h: targetH };
      this._pixelCache[key] = cache;
    }
    const scale = height / cache.h;
    const dw = Math.round(cache.w * scale);
    const dh = Math.round(cache.h * scale);
    const x = Math.round(cx - dw / 2);
    const y = Math.round(cy - dh / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.drawImage(cache.canvas, x, y, dw, dh);
    ctx.restore();
    return true;
  },

  /** Dibuixa el logo centrat; mida = alçada en px de joc. */
  drawLogo(ctx, cx, cy, height, alpha = 1) {
    const img = this.images.logo;
    if (!img || !img.complete || !img.naturalWidth) return false;
    const w = height * (img.width / img.height);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - height / 2), Math.round(w), Math.round(height));
    ctx.restore();
    return true;
  },
};
