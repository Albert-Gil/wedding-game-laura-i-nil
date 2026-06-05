/* =====================================================================
   ASSETS — imatges + àudio (logo, himne Sabadell…)
   ===================================================================== */

const Assets = {
  images: {},
  sounds: {},
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
      const done = () => { this.sounds[name] = a; resolve(a); };
      a.addEventListener('canplaythrough', done, { once: true });
      a.addEventListener('error', () => resolve(null), { once: true });
      a.src = src;
      a.load();
    });
  },

  init() {
    return Promise.all([
      this.loadImage('logo', 'assets/logo.png'),
      this.loadSound('sabadell', 'assets/himne-sabadell.mp3'),
    ]);
  },

  /** Himne del CE Sabadell en recollir la pilota ⚽ (nivell 1). */
  playSabadellHimne() {
    const a = this.sounds.sabadell;
    if (!a) return false;
    if (window.AudioEngine) {
      AudioEngine.resume();
      AudioEngine._stopMusicTimer();
    }
    this._sabadellPlaying = true;
    a.volume = (window.AudioEngine && AudioEngine.muted) ? 0 : 0.85;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    const resume = () => {
      if (!this._sabadellPlaying) return;
      this._sabadellPlaying = false;
      if (window.AudioEngine && AudioEngine.track) AudioEngine._restartMusicTimer();
    };
    a.onended = resume;
    setTimeout(resume, (a.duration && isFinite(a.duration) ? a.duration * 1000 : 12000) + 200);
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
