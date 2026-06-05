/**
 * Parser SMF — extreu melodia principal (veu aguda, monòfona).
 * Ús: node scripts/parse-midi.js <fitxer.mid> [--bars=16]
 */
const fs = require('fs');
const { parseTracks, trackToNotes, monophonicMelody } = require('./parse-midi-lib');

const path = process.argv[2];
const barsArg = process.argv.find(a => a.startsWith('--bars='));
const bars = barsArg ? parseInt(barsArg.split('=')[1], 10) : 16;

if (!path) {
  console.error('Usage: node scripts/parse-midi.js <file.mid> [--bars=16]');
  process.exit(1);
}

const buf = fs.readFileSync(path);
const { tpq, tracks } = parseTracks(buf);
const tempo = tracks[0]?.tempo || 500000;
const bpm = Math.round(60000000 / tempo);
const maxTick = bars * 4 * tpq;

const allNotes = [];
for (const tr of tracks) allNotes.push(...trackToNotes(tr.events, tpq));
allNotes.sort((a, b) => a.start - b.start);
const melody = monophonicMelody(allNotes, tpq, maxTick);

console.log('tpq', tpq, 'bpm (meta)', bpm, 'bars', bars);
console.log('melody events:', melody.length);
console.log(JSON.stringify(melody.slice(0, 48), null, 2));
