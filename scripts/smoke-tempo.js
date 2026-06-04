/**
 * Comprova el tempo de la marxa nupcial (node scripts/smoke-tempo.js)
 * beatDiv 2 => cada pas = corxera; bpm = velocitat de la negra (♩).
 */
const wedding = { bpm: 96, beatDiv: 2, len: 64 };
const eighthDur = 60 / (wedding.bpm * wedding.beatDiv);
const loopSec = wedding.len * eighthDur;
const fourCs = 4 * eighthDur;

console.log('Marxa nupcial Mendelssohn (motor de joc)');
console.log('  BPM negra (♩):', wedding.bpm);
console.log('  Durada corxera:', eighthDur.toFixed(3), 's');
console.log('  4 Do inicials:', fourCs.toFixed(2), 's (esperat ~1.2–1.3s a ♩=96)');
console.log('  Bucle 64 corxeres:', loopSec.toFixed(1), 's');

let ok = true;
if (fourCs < 1.15 || fourCs > 1.45) {
  console.error('FAIL: obertura massa rapida o lenta');
  ok = false;
}
if (loopSec < 18 || loopSec > 26) {
  console.error('FAIL: bucle fora de rang maestoso');
  ok = false;
}
if (ok) console.log('OK: tempo dins del rang de partitura piano (~q=96)');

process.exit(ok ? 0 : 1);
