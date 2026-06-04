/**
 * Comprovació ràpida de zones jugables (node scripts/smoke-bounds.js)
 */
const VW = 960;
const VH = 540;
const S = VW / 384;

function fs(n) { return Math.round(n * S); }

function expandPlayWorld(baseW, baseH) {
  const padX = Math.max(0, Math.round((VW - baseW) / 2));
  const padY = Math.max(0, Math.round((VH - baseH) / 2));
  return { w: baseW + padX * 2, h: baseH + padY * 2, padX, padY };
}

function playAreaMargin(kind) {
  switch (kind) {
    case 'boss':
      return { left: 12, right: 12, top: fs(28), bottom: fs(14) };
    case 'walk':
      return { left: 16, right: 16, top: 112, bottom: VH - 198 };
    case 'level':
    default:
      return { left: 8, right: 8, top: 16, bottom: 6 };
  }
}

function playableSize(worldW, worldH, kind) {
  const m = playAreaMargin(kind);
  return {
    w: worldW - m.left - m.right,
    h: worldH - m.top - m.bottom,
  };
}

let failed = 0;
function ok(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

// Nivells expandits han d'omplir la pantalla
const l1 = expandPlayWorld(660, 440);
ok(l1.w === VW && l1.h === VH, 'level1 expanded to full viewport');

const p1 = playableSize(l1.w, l1.h, 'level');
ok(p1.w >= VW * 0.95 && p1.h >= VH * 0.95, `level1 playable ${p1.w}x${p1.h} (near full screen)`);

// El bug antic (marges / scale petit) deixava <200px d'ample
const badInset = Math.round(168 / 0.4) + Math.round(158 / 0.4);
ok(badInset > VW - 200, 'old scaled inset was broken (sanity)');
ok(p1.w > VW - badInset, 'new level margins much wider than broken touch insets');

const boss = playableSize(VW, VH, 'boss');
ok(boss.w >= 900 && boss.h >= 380, `boss playable ${boss.w}x${boss.h}`);

const walk = playableSize(VW, VH, 'walk');
ok(walk.w >= 900 && walk.h >= 70 && walk.h <= 120, `final walk path band ${walk.w}x${walk.h}`);

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll bounds checks passed.');
