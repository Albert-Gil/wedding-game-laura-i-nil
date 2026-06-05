/**
 * Biblioteca parser SMF (compartida per parse-midi.js i generate-mendelssohn.js).
 */
function readVarLen(buf, pos) {
  let v = 0;
  while (buf[pos] & 0x80) {
    v = (v << 7) | (buf[pos++] & 0x7f);
  }
  return { value: (v << 7) | buf[pos++], pos };
}

function midiToName(n) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[n % 12] + (Math.floor(n / 12) - 1);
}

function parseTracks(buf) {
  let pos = 0;
  if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('Not MIDI');
  pos = 4;
  const hdrLen = buf.readUInt32BE(pos); pos += 4 + hdrLen;
  const nTracks = buf.readUInt16BE(10);
  const division = buf.readUInt16BE(12);
  const tpq = division & 0x8000 ? 480 : division;
  const tracks = [];

  for (let t = 0; t < nTracks; t++) {
    if (buf.toString('ascii', pos, pos + 4) !== 'MTrk') break;
    pos += 4;
    const trkLen = buf.readUInt32BE(pos); pos += 4;
    const end = pos + trkLen;
    const events = [];
    let tick = 0;
    let status = 0;
    let tempo = 500000;
    while (pos < end) {
      const vl = readVarLen(buf, pos);
      tick += vl.value;
      pos = vl.pos;
      let b = buf[pos];
      if (b & 0x80) { status = b; pos++; }
      else b = status;
      const cmd = status >> 4;
      if (cmd === 0x9) {
        const note = buf[pos++];
        const vel = buf[pos++];
        if (vel) events.push({ tick, type: 'on', note, vel });
        else events.push({ tick, type: 'off', note });
      } else if (cmd === 0x8) {
        const note = buf[pos++];
        pos++;
        events.push({ tick, type: 'off', note });
      } else if (status === 0xff) {
        const meta = buf[pos++];
        const ml = readVarLen(buf, pos);
        const dataStart = ml.pos;
        pos = dataStart + ml.value;
        if (meta === 0x51 && ml.value === 3) {
          const d = buf.slice(dataStart, pos);
          tempo = (d[0] << 16) | (d[1] << 8) | d[2];
        }
      } else if (cmd === 0xb || cmd === 0xe) pos += 2;
      else if (cmd === 0xc || cmd === 0xd) pos += 1;
      else pos += 1;
    }
    tracks.push({ events, tempo });
    pos = end;
  }
  return { tpq, tracks };
}

function trackToNotes(events, tpq) {
  const eighth = tpq / 2;
  const sorted = events.slice().sort((a, b) => a.tick - b.tick);
  const active = new Map();
  const notes = [];
  for (const e of sorted) {
    if (e.type === 'on') active.set(e.note, e.tick);
    else {
      const start = active.get(e.note);
      if (start != null) {
        notes.push({
          note: e.note,
          start,
          end: e.tick,
          durEighth: Math.max(1, Math.round((e.tick - start) / eighth)),
        });
        active.delete(e.note);
      }
    }
  }
  return notes.sort((a, b) => a.start - b.start);
}

function monophonicMelody(notes, tpq, maxTick) {
  const eighth = tpq / 2;
  const segments = [];
  for (const n of notes) {
    if (maxTick && n.start >= maxTick) break;
    segments.push({ ...n, end: maxTick ? Math.min(n.end, maxTick) : n.end });
  }
  if (!segments.length) return [];

  const points = new Set();
  for (const s of segments) {
    points.add(s.start);
    points.add(s.end);
  }
  const times = [...points].sort((a, b) => a - b);
  const melody = [];
  let cur = 0;
  for (let i = 0; i < times.length - 1; i++) {
    const t0 = times[i];
    const t1 = times[i + 1];
    if (t1 <= t0) continue;
    const active = segments.filter(s => s.start <= t0 && s.end > t0);
    if (!active.length) continue;
    const top = active.reduce((a, b) => (a.note > b.note ? a : b));
    const durEighth = Math.max(1, Math.round((t1 - t0) / eighth));
    if (t0 > cur) melody.push([null, Math.max(1, Math.round((t0 - cur) / eighth))]);
    const name = midiToName(top.note);
    if (melody.length && melody[melody.length - 1][0] === name) {
      melody[melody.length - 1][1] += durEighth;
    } else {
      melody.push([name, durEighth]);
    }
    cur = t1;
  }
  return melody;
}

module.exports = { parseTracks, trackToNotes, monophonicMelody, midiToName, readVarLen };
