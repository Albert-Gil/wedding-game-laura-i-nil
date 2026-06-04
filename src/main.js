/* =====================================================================
   MAIN — arrencada de LauraiNilOS / Laura ❤ Nil
   ===================================================================== */

function unlockAudio() {
  AudioEngine.ensureCtx();
  AudioEngine.resume();
}
window.addEventListener('load', () => {
  Achievements.load();
  AudioEngine.init();
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

  // Easter egg de teclat: tecla "r" reinicia els assoliments (per a proves/regals nous).
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && e.shiftKey && e.altKey) {
      Achievements.reset();
      location.reload();
    }
  });
});
