/* =====================================================================
   SPRITES — pixel-art procedural (sense fitxers d'imatge)
   Herois paramètrics (Laura i Nil) + decorats + ítems.
   ===================================================================== */

const HERO_SCALE = S; // escala respecte al disseny original
// size 1 ≈ 14px; size 3 ≈ 42px (per sobre del cap, no tapar el personatge)
const HEART_SCALE = S * 0.5;
const BOSS_DRAW_SCALE = S * 1.2; // monstre final (cos ~150px d'ample)

const HEROES = {
  nil: {
    name: 'Nil',
    hair: '#d4b05a',
    hairDark: '#9a7830',
    hairLight: '#f0d080',
    skin: '#f2d0a8',
    skinDark: '#d9a878',
    shirt: '#4a8fe0',
    shirtDark: '#2e66b8',
    collar: '#7eb8ff',
    pants: '#3d4d5e',
    shoes: '#252f3a',
    eye: '#2560c8',
    cheek: '#e8a888',
  },
  laura: {
    name: 'Laura',
    hair: '#7a5230',
    hairDark: '#4e3018',
    hairLight: '#a07048',
    skin: '#f4d4b0',
    skinDark: '#deb088',
    shirt: '#e87090',
    shirtDark: '#b84868',
    collar: '#ffe8ef',
    pants: '#5c4268',
    shoes: '#3a2c48',
    eye: '#3a5cc0',
    cheek: '#eab890',
    ribbon: '#ff7a98',
    long: true,
  },
};

// Dibuixa un heroi (peus a y). x,y = coordenades de pantalla; sc escala només el sprite.
function drawHero(ctx, hero, x, y, facing, t, moving, scale = HERO_SCALE) {
  const h = hero;
  const sc = scale;
  const sx = Math.round(x);
  const sy = Math.round(y);
  const p = (px, py, w, hh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(
      sx + Math.round(px * sc),
      sy + Math.round(py * sc),
      Math.max(1, Math.round(w * sc)),
      Math.max(1, Math.round(hh * sc))
    );
  };

  const bob = moving ? Math.round(Math.sin(t * 12) * sc * 0.65) : 0;
  const step = moving ? Math.sin(t * 12) : 0;
  const top = -23 + bob;
  const arm = moving ? Math.round(step * 2) : 0;
  const lOff = Math.round(step * 2);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(sx, sy - Math.round(sc * 0.5), Math.round(9 * sc), Math.round(3.5 * sc), 0, 0, Math.PI * 2);
  ctx.fill();

  // Cames i sabates
  p(-4, -7, 4, 7 - Math.abs(lOff), h.pants);
  p(0, -7, 4, 7 - Math.abs(-lOff), h.pants);
  p(-4, -9 - Math.min(0, lOff), 4, 2, h.shoes);
  p(0, -9 - Math.min(0, -lOff), 4, 2, h.shoes);
  p(-3, -5, 2, 1, h.pants);
  p(1, -5, 2, 1, h.pants);

  // Cos i mànigues
  p(-5, top + 11, 10, 10, h.shirt);
  p(-5, top + 11, 10, 3, h.shirtDark);
  p(-4, top + 12, 8, 2, h.collar);
  p(-1, top + 14, 2, 5, h.shirtDark);
  p(-8, top + 12 + arm, 3, 6, h.shirt);
  p(5, top + 12 - arm, 3, 6, h.shirt);
  p(-8, top + 16 + arm, 2, 3, h.skin);
  p(5, top + 16 - arm, 2, 3, h.skin);
  p(-8, top + 18 + arm, 2, 1, h.skinDark);
  p(5, top + 18 - arm, 2, 1, h.skinDark);

  // Coll i cap
  p(-2, top + 9, 4, 3, h.skin);
  p(-4, top + 2, 8, 9, h.skin);
  p(-4, top + 8, 8, 2, h.skinDark);

  // Cabell (per direcció)
  if (facing === 'up') {
    p(-5, top, 10, 5, h.hair);
    p(-6, top + 3, 12, 6, h.hairDark);
    p(-2, top + 1, 4, 2, h.hairLight);
    if (h.long) {
      p(-6, top + 6, 3, 9, h.hairDark);
      p(3, top + 6, 3, 9, h.hairDark);
      p(-5, top + 8, 2, 6, h.hair);
      p(3, top + 8, 2, 6, h.hair);
    } else {
      p(-4, top + 5, 2, 4, h.hairDark);
      p(2, top + 5, 2, 4, h.hairDark);
    }
  } else if (facing === 'down') {
    p(-5, top, 10, 4, h.hair);
    p(-4, top, 3, 2, h.hairLight);
    p(1, top, 3, 2, h.hairLight);
    p(-5, top + 2, 2, 5, h.hair);
    p(3, top + 2, 2, 5, h.hair);
    if (h.long) {
      p(-6, top + 4, 3, 8, h.hairDark);
      p(3, top + 4, 3, 8, h.hairDark);
      p(-5, top + 6, 2, 5, h.hair);
      p(3, top + 6, 2, 5, h.hair);
    }
    if (h.ribbon) p(3, top + 1, 2, 2, h.ribbon);
    // Cara
    p(-4, top + 7, 1, 1, h.cheek);
    p(3, top + 7, 1, 1, h.cheek);
    p(-3, top + 5, 2, 2, '#fff');
    p(1, top + 5, 2, 2, '#fff');
    p(-2, top + 5, 1, 2, h.eye);
    p(2, top + 5, 1, 2, h.eye);
    p(-2, top + 5, 1, 1, '#1e3050');
    p(2, top + 5, 1, 1, '#1e3050');
    p(-1, top + 8, 2, 1, '#c06878');
    p(0, top + 8, 1, 1, '#e08898');
  } else {
    const left = facing === 'left';
    const hx = left ? -5 : 3;
    p(-5, top, 10, 4, h.hair);
    p(hx, top + 1, 3, 6, h.hair);
    p(hx + (left ? 0 : -1), top, 2, 2, h.hairLight);
    if (h.long) {
      p(hx, top + 5, 3, 9, h.hairDark);
      p(hx + (left ? -1 : 1), top + 7, 2, 6, h.hair);
    }
    if (h.ribbon && left) p(-4, top + 1, 2, 2, h.ribbon);
    // Perfil
    p(left ? -3 : 2, top + 6, 2, 2, h.skinDark);
    p(left ? -3 : 2, top + 5, 2, 2, '#fff');
    p(left ? -2 : 3, top + 5, 1, 2, h.eye);
    p(left ? -2 : 3, top + 5, 1, 1, '#1e3050');
    p(left ? -1 : 3, top + 8, 2, 1, '#c06878');
  }
}

// Cor suau en alta resolució (size ≈ unitats lògiques: 2 HUD, 3 sobre NPC, 4–5 escena).
function drawHeart(ctx, x, y, size, color = '#ff5a7a') {
  const sc = size * HEART_SCALE;
  const cx = Math.round(x);
  const cy = Math.round(y);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 2.5);
  ctx.bezierCurveTo(0, -1, -5.5, -1, -5.5, 2.5);
  ctx.bezierCurveTo(-5.5, 5.5, 0, 9.5, 0, 11.5);
  ctx.bezierCurveTo(0, 9.5, 5.5, 5.5, 5.5, 2.5);
  ctx.bezierCurveTo(5.5, -1, 0, -1, 0, 2.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-2, 1.5, 1.2, 1.8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---- Decorats (escala amb S) ----
function drawTree(ctx, x, y, scale = 1) {
  const s = scale * S;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 10 * s);
  ctx.fillStyle = '#2f8f4e';
  ctx.beginPath(); ctx.arc(x, y - 16 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3fae62';
  ctx.beginPath(); ctx.arc(x - 4 * s, y - 18 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * s, y - 14 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
}

function drawPine(ctx, x, y, scale = 1) {
  const s = scale * S;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(x, y, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 6 * s);
  ctx.fillStyle = '#2c7a44';
  for (let i = 0; i < 3; i++) {
    const w = (10 - i * 2.5) * s;
    const yy = y - (6 + i * 6) * s;
    ctx.beginPath();
    ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x, yy - 8 * s); ctx.closePath(); ctx.fill();
  }
}

function drawBuilding(ctx, x, y, w, h, wall, roof) {
  const sw = w * S / 2.5, sh = h * S / 2.5;
  ctx.fillStyle = wall; ctx.fillRect(x, y - sh, sw, sh);
  ctx.fillStyle = roof; ctx.fillRect(x - 2 * S, y - sh - fs(6), sw + fs(4), fs(8));
  ctx.fillStyle = '#bfe3ff';
  for (let wx = x + fs(4); wx < x + sw - fs(6); wx += fs(12)) {
    for (let wy = y - sh + fs(6); wy < y - fs(8); wy += fs(12)) {
      ctx.fillRect(wx, wy, fs(6), fs(7));
      ctx.fillStyle = '#7fb8d6'; ctx.fillRect(wx, wy + fs(3), fs(6), 1); ctx.fillStyle = '#bfe3ff';
    }
  }
}

function drawCloud(ctx, x, y, sc = 1) {
  const s = sc * S;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 5 * s, 0, Math.PI * 2);
  ctx.arc(x + 6 * s, y + 1, 6 * s, 0, Math.PI * 2);
  ctx.arc(x + 13 * s, y, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawArch(ctx, x, y) {
  const sc = S;
  ctx.strokeStyle = '#caa24a';
  ctx.lineWidth = fs(4);
  ctx.beginPath();
  ctx.moveTo(x - 18 * sc, y);
  ctx.lineTo(x - 18 * sc, y - 34 * sc);
  ctx.quadraticCurveTo(x, y - 52 * sc, x + 18 * sc, y - 34 * sc);
  ctx.lineTo(x + 18 * sc, y);
  ctx.stroke();
  const flowers = ['#ff7a98', '#ffd166', '#ff5a7a', '#fff', '#c39bff'];
  for (let i = 0; i <= 10; i++) {
    const tt = i / 10;
    const px = U.lerp(x - 18 * sc, x + 18 * sc, tt);
    const ay = y - 34 * sc - Math.sin(tt * Math.PI) * 18 * sc;
    ctx.fillStyle = flowers[i % flowers.length];
    ctx.fillRect(Math.round(px) - 2, Math.round(ay) - 2, fs(3), fs(3));
  }
  ctx.fillStyle = '#3aae62';
  ctx.fillRect(x - 20 * sc, y - 2, fs(6), fs(3));
  ctx.fillRect(x + 14 * sc, y - 2, fs(6), fs(3));
}

function drawEmoji(ctx, emoji, x, y, size = 14) {
  const px = fs(size);
  ctx.font = `${px}px serif`;
  ctx.textAlign = 'center';
  const prevB = ctx.textBaseline;
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.textBaseline = prevB;
}
