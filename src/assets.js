/* =====================================================================
   ASSETS — càrrega d'imatges (logo de casament nl · 13.06.2026)
   ===================================================================== */

const Assets = {
  images: {},

  loadImage(name, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  init() {
    return this.loadImage('logo', 'assets/logo.png');
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
