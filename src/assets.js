/* =====================================================================
   ASSETS — imatges + àudio (logo, himne Sabadell…)
   ===================================================================== */

const Assets = {
  images: {},
  sounds: {},
  _pixelCache: {},
  _sabadellPlaying: false,

  loadImage(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = src;
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

  /** Desbloqueja reproducció HTML5 (iOS/Safari) després del primer gest. */
  primeAudio() {
    const a = this.sounds.sabadell;
    if (!a) return;
    const vol = a.volume;
    a.volume = 0;
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

  init() {
    return Promise.all([
      this.loadImage('logo', 'assets/logo.png'),
      this.loadImage('albert', 'assets/albert.png'),
      this.loadSound('sabadell', 'assets/himne-sabadell.mp3'),
    ]);
  },

  /** Himne del CE Sabadell en recollir la pilota ⚽ (nivell 1). */
  playSabadellHimne() {
    const src = 'assets/himne-sabadell.mp3';
    let a = this.sounds.sabadell;
    if (!a) {
      a = new Audio(src);
      a.preload = 'auto';
      this.sounds.sabadell = a;
      a.src = src;
      a.load();
    }
    if (window.AudioEngine) {
      AudioEngine.ensureCtx();
      if (AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
      AudioEngine.started = true;
      AudioEngine._stopMusicTimer();
    }
    this._sabadellPlaying = true;
    const muted = window.AudioEngine && AudioEngine.muted;
    const start = () => {
      if (!this._sabadellPlaying) return;
      a.volume = muted ? 0 : 0.85;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          a.addEventListener('canplay', () => {
            a.volume = muted ? 0 : 0.85;
            a.play().catch(() => {});
          }, { once: true });
          a.load();
        });
      }
    };
    if (a.readyState >= 2) start();
    else {
      a.addEventListener('canplay', start, { once: true });
      a.load();
    }
    const resume = () => {
      if (!this._sabadellPlaying) return;
      this._sabadellPlaying = false;
      if (window.AudioEngine && AudioEngine.track) AudioEngine._restartMusicTimer();
    };
    a.onended = resume;
    setTimeout(resume, (a.duration && isFinite(a.duration) ? a.duration * 1000 : 12000) + 200);
    return true;
  },

  /** Retrat en estil pixel art (escala baixa + nearest-neighbor). */
  drawPixelPortrait(ctx, cx, cy, height, name = 'albert', alpha = 1) {
    const img = this.images[name];
    if (!img || !img.complete || !img.naturalWidth) return false;
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
