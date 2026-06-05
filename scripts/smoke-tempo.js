/**
 * Comprova el tempo de la marxa nupcial Mendelssohn (node scripts/smoke-tempo.js)
 */
const MendelssohnWeddingMarch = require('../src/mendelssohn_wedding_march.js');
const { wedding } = MendelssohnWeddingMarch.buildTracks();
const eighthDur = 60 / (wedding.bpm * wedding.beatDiv);
const loopSec = wedding.len * eighthDur;
const fourCs = 4 * eighthDur;

console.log('Marxa nupcial Mendelssohn (motor de joc)');
console.log('  BPM negra (♩):', wedding.bpm);
console.log('  Durada corxera:', eighthDur.toFixed(3), 's');
console.log('  4 Do inicials:', fourCs.toFixed(2), 's');
console.log('  Bucle', wedding.len, 'corxeres:', loopSec.toFixed(1), 's');

const lead = wedding.lead;
const pitches = [];
for (const n of lead) {
  if (n && n !== 0) pitches.push(String(n));
  if (pitches.length === 4) break;
}
const opening = pitches.join(' ');
let ok = true;

if (opening !== 'C4 C4 C4 C4') {
  console.error('FAIL: obertura esperada C4 C4 C4 C4, obtingut', opening);
  ok = false;
}
if (fourCs < 1.15 || fourCs > 1.45) {
  console.error('FAIL: 4 Do inicials fora de rang a ♩=96');
  ok = false;
}
if (ok) console.log('OK: tempo i obertura Mendelssohn');

process.exit(ok ? 0 : 1);
