/* =====================================================================
   MAIN — arrencada de MarriageOS / Laura ❤ Nil
   ===================================================================== */

window.addEventListener('load', () => {
  Achievements.load();
  AudioEngine.init();
  bootEngine('boot');     // defineix view + bucle
  Input.init();           // necessita view.canvas ja creat

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
