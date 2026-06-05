/* =====================================================================
   CE Sabadell — «Honor al Sabadell» (Adolf Cabané / Lluís Papell)
   Fragment ~4 s del refrany oficial per l'easter egg de la pilota ⚽.

   Edit STINGER_MELODY per ajustar notes o durada (corxeres).
   Tonalitat: Mi♭ major (sonor).
   ===================================================================== */

const SabadellHimno = {
  bpm: 116,
  beatDiv: 2,
  /** Durada objectiu ≈ 4 s (16 corxeres × 1 pas). */
  STINGER_MELODY: [
    ['G4', 1], ['Bb4', 1], ['Eb5', 1], ['F5', 1],
    ['G5', 1], ['G5', 1], ['Ab5', 1], ['Bb5', 1],
    ['Ab5', 1], ['G5', 1], ['F5', 1], ['Eb5', 1],
    ['F5', 1], ['G5', 1], ['Ab5', 1], ['Bb5', 1],
  ],

  stepMs() {
    return 1000 * 60 / (this.bpm * this.beatDiv);
  },

  expandMelody(events) {
    const out = [];
    for (const [note, steps] of events) {
      const len = Math.max(1, Math.round(steps));
      for (let i = 0; i < len; i++) out.push(i === 0 ? (note || 0) : 0);
    }
    return out;
  },

  /** Programa el fragment d'himne (~4 s) via Web Audio API. */
  play() {
    if (!window.AudioEngine) return;
    AudioEngine.resume();
    const ms = this.stepMs();
    const lead = this.expandMelody(this.STINGER_MELODY);
    let delay = 0;
    AudioEngine._stopMusicTimer();
    for (let i = 0; i < lead.length; i++) {
      const n = lead[i];
      if (n) {
        const at = delay;
        setTimeout(() => {
          if (AudioEngine.muted) return;
          const dur = ms / 1000 * 1.4;
          AudioEngine.blip(AudioEngine.freq(n), dur, 'square', 0.26);
          if (/[56]/.test(String(n))) {
            AudioEngine.blip(AudioEngine.freq(n) * 0.501, dur * 0.9, 'triangle', 0.11);
          }
          if (i % 4 === 0) AudioEngine.blip(90, 0.08, 'sine', 0.14);
        }, at);
      }
      delay += ms;
    }
    setTimeout(() => {
      if (AudioEngine.track) AudioEngine._restartMusicTimer();
    }, delay + 80);
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SabadellHimno;
}
