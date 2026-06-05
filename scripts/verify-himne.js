/**
 * Comprova que l'himne del Sabadell (MP3) és vàlid i coincideix amb el tall oficial.
 * node scripts/verify-himne.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const MP3 = path.join(__dirname, '../assets/himne-sabadell.mp3');
const EXPECTED_SHA256 = 'c0348dcb18e1fde1028978d54032b11b84a86a6542bc36af14a288fade1a5215';
const EXPECTED_DURATION = 7.85;
const DURATION_TOL = 0.15;

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

if (!fs.existsSync(MP3)) fail('No existeix ' + MP3);

const buf = fs.readFileSync(MP3);
const hash = crypto.createHash('sha256').update(buf).digest('hex');
if (hash !== EXPECTED_SHA256) {
  fail('SHA256 no coincideix (esperat himne-versio-moderna-ce-sabadell-tall.mp3)');
}

const head = buf.slice(0, 3).toString('ascii');
const isMp3 = head === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
if (!isMp3) fail('Capçalera MP3 no reconeguda');

let duration = null;
try {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${MP3}"`,
    { encoding: 'utf8' },
  ).trim();
  duration = parseFloat(out);
} catch (e) {
  fail('ffprobe no disponible o error llegint durada');
}

if (!Number.isFinite(duration) || Math.abs(duration - EXPECTED_DURATION) > DURATION_TOL) {
  fail(`Durada ${duration}s (esperat ~${EXPECTED_DURATION}s)`);
}

console.log('OK: himne-sabadell.mp3');
console.log('  Mida:', buf.length, 'bytes');
console.log('  SHA256:', hash.slice(0, 16) + '…');
console.log('  Durada:', duration.toFixed(2), 's');
