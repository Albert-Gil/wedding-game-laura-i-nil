/**
 * Comprova el tempo de la marxa nupcial Wagner (node scripts/smoke-tempo.js)
 * beatDiv 2 => cada pas = corxera; bpm = velocitat de la negra (♩).
 */
const WagnerBridalChorus = require('../src/wagner_bridal_chorus.js');
const { wedding } = WagnerBridalChorus.buildTracks();
const eighthDur = 60 / (wedding.bpm * wedding.beatDiv);
const loopSec = wedding.len * eighthDur;
const fanfareSteps = 8;
const fanfareSec = fanfareSteps * eighthDur;
const firstBbSec = 4 * eighthDur;

console.log('Marxa nupcial Wagner — Treulich geführt (motor de joc)');
console.log('  BPM negra (♩):', wedding.bpm);
console.log('  Durada corxera:', eighthDur.toFixed(3), 's');
console.log('  1r Si♭ (fanfare):', firstBbSec.toFixed(2), 's');
console.log('  Bar 1 (8 corxeres):', fanfareSec.toFixed(2), 's');
console.log('  Bucle', wedding.len, 'corxeres:', loopSec.toFixed(1), 's');

const lead = wedding.lead;
const pitches = [];
for (const n of lead) {
  if (n && n !== 0) pitches.push(String(n));
  if (pitches.length === 4) break;
}
const fanfare = pitches.join(' ');
const expected = 'Bb4 Bb4 F5 Bb5';
let ok = true;

if (fanfare !== expected) {
  console.error('FAIL: fanfare obertura esperada', expected, 'obtingut', fanfare);
  ok = false;
}
if (firstBbSec < 1.2 || firstBbSec > 1.8) {
  console.error('FAIL: primer Si♭ fora de rang Moderato');
  ok = false;
}
if (loopSec < 22 || loopSec > 32) {
  console.error('FAIL: bucle fora de rang');
  ok = false;
}
if (ok) console.log('OK: tempo i fanfare Wagner dins del rang');

process.exit(ok ? 0 : 1);
