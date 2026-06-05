/* =====================================================================
   Mendelssohn — Wedding March Op. 61 No. 2
   Melodia extreta de mendelssohn-wedding-march.mid (♩=155, 8 compassos).
   Regenera: node scripts/generate-mendelssohn.js assets/mendelssohn-wedding-march.mid
   ===================================================================== */

const MendelssohnWeddingMarch = {
  bpm: 155,
  beatDiv: 2,

  OPENING_MELODY: [
    ['C4', 1],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['C4', 7],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['C4', 7],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['C4', 1],
    [null, 1],
    ['E4', 3],
    [null, 1],
    ['E4', 1],
    [null, 1],
    ['E4', 1],
    [null, 1],
    ['E4', 3],
    [null, 1],
    ['E4', 1],
    [null, 1],
    ['E4', 1],
    [null, 1],
    ['G4', 3],
    [null, 1],
    ['G4', 1],
    [null, 1],
    ['G4', 1],
    [null, 1],
    ['G4', 4],
    ['C6', 4],
    ['B5', 3],
    ['F#5', 1],
    ['A5', 2],
    ['G5', 2],
    ['F5', 2],
    ['D5', 2],
    ['C5', 1],
    ['D5', 3],
    ['C5', 1],
    ['D5', 3],
    ['C5', 1],
    ['D5', 3],
    ['C5', 1],
    ['D5', 3],
    ['C5', 1],
    ['D5', 3],
    ['C5', 2],
    ['B4', 1],
    ['D5', 3],
    ['G4', 2],
    ['D5', 1],
    ['E5', 2],
    ['C4', 1],
    ['E4', 1],
    ['G4', 1],
    ['C5', 1]
  ],

  BAR_CHORDS: ["C","C","C","C","G","G","G","G"],

  expandMelody(events) {
    const lead = [];
    for (const [note, steps] of events) {
      const n = note || 0;
      const len = Math.max(1, Math.round(steps));
      for (let i = 0; i < len; i++) lead.push(i === 0 ? n : 0);
    }
    return lead;
  },

  fit(arr, len, fill = 0) {
    const out = arr.slice(0, len);
    while (out.length < len) out.push(fill);
    return out;
  },

  buildHarm(len, bars) {
    const triad = { C: ['C4', 'E4'], G: ['G3', 'B3'], F: ['F3', 'A3'] };
    const stepsPerBar = 8;
    const harm = [];
    for (let b = 0; b < bars; b++) {
      const chord = triad[this.BAR_CHORDS[b] || 'C'];
      for (let i = 0; i < stepsPerBar; i++) {
        harm.push(i % 4 === 0 ? chord[0] : (i % 4 === 2 ? chord[1] : 0));
      }
    }
    return this.fit(harm, len, 0);
  },

  buildBass(len, bars) {
    const root = { C: 'C3', G: 'G2', F: 'F2' };
    const stepsPerBar = 8;
    const bass = [];
    for (let b = 0; b < bars; b++) {
      const r = root[this.BAR_CHORDS[b] || 'C'];
      for (let i = 0; i < stepsPerBar; i++) bass.push(i === 0 || i === 4 ? r : 0);
    }
    return this.fit(bass, len, 0);
  },

  buildDrum(len, soft = false) {
    const drum = [];
    for (let i = 0; i < len; i++) {
      if (i % 8 === 0) drum.push(soft ? 'h' : 'k');
      else if (i % 4 === 2) drum.push('h');
      else drum.push(0);
    }
    return drum;
  },

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
      vol: 0.72,
      leadWave: 'sine',
      leadLen: 1.15,
      leadGain: 0.36,
      brass: false,
      harmWave: 'triangle',
      harmGain: 0.09,
      bassGain: 0.24,
      bassWave: 'triangle',
      lead, harm, bass, drum,
    };

    const endLen = Math.min(len, 40);
    const weddingEnd = {
      bpm: Math.round(this.bpm * 0.84),
      beatDiv: this.beatDiv,
      len: endLen,
      vol: 0.65,
      leadWave: 'sine',
      leadLen: 1.25,
      leadGain: 0.3,
      brass: false,
      harmWave: 'triangle',
      harmGain: 0.07,
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
  module.exports = MendelssohnWeddingMarch;
}
