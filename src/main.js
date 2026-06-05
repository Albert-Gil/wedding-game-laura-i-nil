/* =====================================================================
   MAIN — arrencada de LauraiNil_OS / Laura ❤ Nil
   ===================================================================== */

function unlockAudio() {
  AudioEngine.ensureCtx();
  AudioEngine.resume();
  if (window.Assets) Assets.primeAudio();
}
window.addEventListener('load', () => {
  Achievements.load();
  AudioEngine.init();
  Assets.init();
  bootEngine('boot');     // defineix view + bucle
  Input.init();           // necessita view.canvas ja creat
  // Desbloqueig d'àudio (política del navegador): qualsevol interacció.
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((ev) => {
    document.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  });
  const cv = document.getElementById('game');
  if (cv) cv.addEventListener('click', unlockAudio, { passive: true });

  // Pista "toca per continuar" només en tàctil i durant escenes passives.
  const hint = document.getElementById('tapHint');
  setInterval(() => {
    const passive = ['boot', 'returnos', 'gift', 'finalmsg', 'ending'];
    if (Input.hasTouch && passive.includes(SM.currentName)) hint.classList.remove('hidden');
    else hint.classList.add('hidden');
  }, 400);

  // Dreceres secretes (ordinador i mòbil).
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && e.shiftKey && e.altKey) {
      Achievements.reset();
      location.reload();
      return;
    }
    if (e.code === 'KeyN' && e.shiftKey && e.altKey) {
      e.preventDefault();
      skipToNextScene();
    }
  });

  // A+B mantinguts (botons tàctils o Z+X / Space+X al teclat).
  let abHoldMs = 0;
  let abSkipLocked = false;
  setInterval(() => {
    if (Input.acts.a && Input.acts.b) {
      if (abSkipLocked) return;
      abHoldMs += 100;
      if (abHoldMs >= 3000) {
        abSkipLocked = true;
        abHoldMs = 0;
        skipToNextScene();
      }
    } else {
      abHoldMs = 0;
      abSkipLocked = false;
    }
  }, 100);
});
