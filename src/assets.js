/* =====================================================================
   ASSETS — imatges (logo…). Àudio gestionat per AudioEngine.
   ===================================================================== */

const Assets = {
  images: {},

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

  init() {
    return this.loadImage('logo', 'assets/logo.png');
  },

  /** Himne del CE Sabadell en recollir la pilota ⚽ (nivell 1). */
  playSabadellHimne() {
    if (!window.AudioEngine) return false;
    AudioEngine.playFileNow('sabadell', {
      onended: () => {
        if (AudioEngine.track) AudioEngine._restartMusicTimer();
      },
    });
    return true;
  },

  /** Marxa nupcial real (MP3) en bucle: nivell del casament i caminada cap a l'arc. */
  playWeddingMarch() {
    if (!window.AudioEngine) return false;
    AudioEngine.playFileNow('weddingMarch');
    return true;
  },

  stopWeddingMarch() {
    if (window.AudioEngine) AudioEngine.stopFile('weddingMarch');
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
