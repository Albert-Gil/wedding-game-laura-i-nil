/* =====================================================================
   Wagner — Lohengrin WWV 75, Act III
   «Treulich geführt» (Bridal Chorus / Here Comes the Bride)

   Public domain. Opening instrumental phrase in sounding B♭ major.
   Transcribed from standard piano/vocal reductions (Cantorion / IMSLP).

   NOT Mendelssohn. The iconic fanfare is B♭–B♭–F–B♭, not four repeated
   tonic notes.

   Edit OPENING_MELODY below to adjust pitch or rhythm. Each entry is
   [noteName, durationInEighthNotes]. Use null or 0 for rests.
   ===================================================================== */

const WagnerBridalChorus = {
  /** ♩ = 88 (Moderato con moto — common edition marking). */
  bpm: 88,
  /** Motor step = corxera (beatDiv 2). */
  beatDiv: 2,

  /**
   * Opening phrase + first vocal strain (10 bars, 4/4).
   * Pitches verified against B♭-major piano reductions.
   */
  OPENING_MELODY: [
    // Bar 1 — fanfare: B♭ B♭ F B♭
    ['Bb4', 4], ['Bb4', 2], ['F5', 1], ['Bb5', 1],
    // Bar 2 — B♭5 … rest A G F
    ['Bb5', 3], [null, 1], ['A5', 2], ['G5', 1], ['F5', 1],
    // Bar 3 — E♭ F G F E♭
    ['Eb5', 1], ['F5', 2], ['G5', 2], ['F5', 1], ['Eb5', 2],
    // Bar 4 — D E♭ F G A♭
    ['D5', 1], ['Eb5', 2], ['F5', 2], ['G5', 1], ['Ab5', 2],
    // Bar 5 — B♭ C B♭
    ['Bb5', 3], ['C6', 2], ['Bb5', 3],
    // Bar 6 — A G F
    ['Ab5', 2], ['G5', 2], ['F5', 4],
    // Bar 7 — «Treu-lich ge-führt» (four F5)
    ['F5', 2], ['F5', 2], ['F5', 2], ['F5', 2],
    // Bar 8
    ['Eb5', 2], ['Eb5', 2], ['F5', 2], ['G5', 2],
    // Bar 9
    ['Ab5', 2], ['Ab5', 2], ['G5', 2], ['F5', 2],
    // Bar 10
    ['Eb5', 2], ['D5', 2], ['C5', 2], ['Bb4', 2],
  ],

  /** Roots per bar (B♭ major) for auto-generated bass/harm. */
  BAR_CHORDS: [
    'Bb', 'Bb', 'Eb', 'F', 'Bb',
    'Eb', 'Bb', 'Eb', 'F', 'Bb',
  ],

  /** Expand [note, eighthSteps] events into a step sequencer lead array. */
  expandMelody(events) {
    const lead = [];
    for (const [note, steps] of events) {
      const n = note || 0;
      const len = Math.max(1, Math.round(steps));
      for (let i = 0; i < len; i++) lead.push(i === 0 ? n : 0);
    }
    return lead;
  },

  /** Pad or trim arrays to target length. */
  fit(arr, len, fill = 0) {
    const out = arr.slice(0, len);
    while (out.length < len) out.push(fill);
    return out;
  },

  /** Build harm layer (chord fifth + third above root). */
  buildHarm(len, bars) {
    const triad = {
      Bb: ['Bb3', 'D4'],
      Eb: ['Eb3', 'G3'],
      F: ['F3', 'A3'],
    };
    const stepsPerBar = 8;
    const harm = [];
    for (let b = 0; b < bars; b++) {
      const chord = triad[this.BAR_CHORDS[b] || 'Bb'];
      for (let i = 0; i < stepsPerBar; i++) {
        harm.push(i % 4 === 0 ? chord[0] : (i % 4 === 2 ? chord[1] : 0));
      }
    }
    return this.fit(harm, len, 0);
  },

  /** Build bass (root on downbeats). */
  buildBass(len, bars) {
    const root = { Bb: 'Bb2', Eb: 'Eb2', F: 'F2' };
    const stepsPerBar = 8;
    const bass = [];
    for (let b = 0; b < bars; b++) {
      const r = root[this.BAR_CHORDS[b] || 'Bb'];
      for (let i = 0; i < stepsPerBar; i++) {
        bass.push(i === 0 || i === 4 ? r : 0);
      }
    }
    return this.fit(bass, len, 0);
  },

  /** Soft processional percussion (quarter-note kick + eighth hats). */
  buildDrum(len, soft = false) {
    const drum = [];
    for (let i = 0; i < len; i++) {
      if (i % 8 === 0) drum.push(soft ? 'h' : 'k');
      else if (i % 4 === 2) drum.push('h');
      else drum.push(0);
    }
    return drum;
  },

  /** Full chiptune track objects for AudioEngine.TRACKS. */
  buildTracks() {
    const lead = this.expandMelody(this.OPENING_MELODY);
    const len = lead.length;
    const bars = this.BAR_CHORDS.length;
    const harm = this.buildHarm(len, bars);
    const bass = this.buildBass(len, bars);
    const drum = this.buildDrum(len, false);
    const drumSoft = this.buildDrum(len, true);

    const wedding = {
      bpm: this.bpm,
      beatDiv: this.beatDiv,
      len,
      vol: 0.74,
      leadWave: 'square',
      leadLen: 1.45,
      leadGain: 0.3,
      brass: true,
      harmWave: 'triangle',
      harmGain: 0.1,
      bassGain: 0.26,
      bassWave: 'triangle',
      lead,
      harm,
      bass,
      drum,
    };

    const endLen = Math.min(len, 40);
    const weddingEnd = {
      bpm: 72,
      beatDiv: this.beatDiv,
      len: endLen,
      vol: 0.62,
      leadWave: 'square',
      leadLen: 1.65,
      leadGain: 0.26,
      brass: true,
      harmWave: 'triangle',
      harmGain: 0.08,
      bassGain: 0.18,
      lead: lead.slice(0, endLen),
      harm: harm.slice(0, endLen),
      bass: bass.slice(0, endLen),
      drum: drumSoft.slice(0, endLen),
    };

    return { wedding, weddingEnd };
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WagnerBridalChorus;
}
