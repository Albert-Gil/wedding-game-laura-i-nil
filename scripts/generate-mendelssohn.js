/**
 * Genera src/mendelssohn_wedding_march.js des d'un fitxer MIDI.
 * node scripts/generate-mendelssohn.js <file.mid> [--bars=8]
 */
const fs = require('fs');
const path = require('path');
const { parseTracks, trackToNotes, monophonicMelody } = require('./parse-midi-lib');

const midiPath = process.argv[2] || path.join(__dirname, '../assets/mendelssohn-wedding-march.mid');
const barsArg = process.argv.find((a) => a.startsWith('--bars='));
const BARS = barsArg ? parseInt(barsArg.split('=')[1], 10) : 8;
const MAX_MIDI = 96; // fins a C7 — no retalla la melodia del MIDI

const buf = fs.readFileSync(midiPath);
const { tpq, tracks } = parseTracks(buf);
const tempoUs = tracks.find((t) => t.tempo)?.tempo || 500000;
const BPM = Math.round(60000000 / tempoUs);
const maxTick = BARS * 4 * tpq;

const allNotes = [];
for (const tr of tracks) allNotes.push(...trackToNotes(tr.events, tpq));
allNotes.sort((a, b) => a.start - b.start);

let melody = monophonicMelody(allNotes, tpq, maxTick);
melody = melody.filter(([n]) => {
  if (!n) return true;
  const names = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return false;
  const midi = names[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return midi <= MAX_MIDI;
});

const compact = [];
for (const [n, d] of melody) {
  if (compact.length && compact[compact.length - 1][0] === n) {
    compact[compact.length - 1][1] += d;
  } else {
    compact.push([n, d]);
  }
}
melody = compact;

const barCount = Math.ceil(BARS);
const barChords = [];
for (let i = 0; i < barCount; i++) {
  if (i < 4) barChords.push('C');
  else if (i < 8) barChords.push('G');
  else if (i < 12) barChords.push('F');
  else barChords.push('C');
}

const fmt = (arr) => arr.map(([n, d]) => {
  const note = n == null ? 'null' : `'${n}'`;
  return `    [${note}, ${d}]`;
}).join(',\n');

const out = `/* =====================================================================
   Mendelssohn — Wedding March Op. 61 No. 2
   Melodia extreta de ${path.basename(midiPath)} (♩=${BPM}, ${BARS} compassos).
   Regenera: node scripts/generate-mendelssohn.js assets/mendelssohn-wedding-march.mid
   ===================================================================== */

const MendelssohnWeddingMarch = {
  bpm: ${BPM},
  beatDiv: 2,

  OPENING_MELODY: [
${fmt(melody)}
  ],

  BAR_CHORDS: ${JSON.stringify(barChords)},

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
`;

const dest = path.join(__dirname, '../src/mendelssohn_wedding_march.js');
fs.writeFileSync(dest, out);
const eighths = melody.reduce((s, [, d]) => s + d, 0);
console.log('Wrote', dest);
console.log('BPM from MIDI:', BPM, '| Events:', melody.length, '| Eighths:', eighths);
console.log('Loop sec:', (eighths * 60 / (BPM * 2)).toFixed(2));
