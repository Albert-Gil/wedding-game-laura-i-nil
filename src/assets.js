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
    AudioEngine._stopMusicTimer();
    const opts = {
      onended: () => {
        if (AudioEngine.track) AudioEngine._restartMusicTimer();
      },
    };
    if (!AudioEngine.playFileNow('sabadell', opts)) AudioEngine.requestFile('sabadell', opts);
    return true;
  },

  /** Marxa nupcial real (MP3) en bucle: nivell del casament i caminada cap a l'arc. */
  playWeddingMarch() {
    if (!window.AudioEngine) return false;
    AudioEngine._stopMusicTimer();
    // #region agent log
    fetch('http://127.0.0.1:7575/ingest/0601c362-6bbf-4fa6-b7b1-8f77e1b3c1ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f609e6'},body:JSON.stringify({sessionId:'f609e6',location:'assets.js:playWeddingMarch',message:'playWeddingMarch called',data:{ctxState:AudioEngine.ctx?AudioEngine.ctx.state:'null',hasBuffer:AudioEngine.hasFileBuffer('weddingMarch'),isLoading:!!AudioEngine._loading['weddingMarch'],unlocked:AudioEngine._unlocked,started:AudioEngine.started},timestamp:Date.now(),hypothesisId:'H-F H-G'})}).catch(()=>{});
    // #endregion
    const nowResult = AudioEngine.playFileNow('weddingMarch');
    // #region agent log
    fetch('http://127.0.0.1:7575/ingest/0601c362-6bbf-4fa6-b7b1-8f77e1b3c1ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f609e6'},body:JSON.stringify({sessionId:'f609e6',location:'assets.js:playWeddingMarch',message:'playFileNow result',data:{nowResult,isFilePlaying:AudioEngine.isFilePlaying('weddingMarch'),fileQueue:JSON.stringify(AudioEngine._fileQueue),currentFile:AudioEngine._currentFile},timestamp:Date.now(),hypothesisId:'H-F H-I'})}).catch(()=>{});
    // #endregion
    if (!nowResult) AudioEngine.requestFile('weddingMarch');
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
