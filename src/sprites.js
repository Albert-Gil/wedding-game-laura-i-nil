/* =====================================================================
   SPRITES — pixel-art procedural (sense fitxers d'imatge)
   Herois paramètrics (Laura i Nil) + decorats + ítems.
   ===================================================================== */

// Definicions dels protagonistes. Ulls blaus tots dos.
const HEROES = {
  nil: {
    name: 'Nil',
    hair: '#caa24a',     // ros / castany clar
    hairDark: '#9c7a2e',
    skin: '#f0c9a0',
    skinDark: '#d9a878',
    shirt: '#3f7fd6',    // explorador, blau
    shirtDark: '#2c5fa3',
    pants: '#3a4a5a',
    eye: '#2a72d6',
  },
  laura: {
    name: 'Laura',
    hair: '#6b4423',     // castany
    hairDark: '#4e3018',
    skin: '#f2cda6',
    skinDark: '#dcae82',
    shirt: '#e0607f',    // càlid, rosa-vermell
    shirtDark: '#b8475f',
    pants: '#5a3f6b',
    eye: '#2a72d6',
    long: true,          // cabell llarg
  },
};

// Dibuixa un heroi centrat horitzontalment a (x, y=peus), mirant 'facing'.
// t = temps per a animació; moving = si camina.
function drawHero(ctx, hero, x, y, facing, t, moving) {
  const h = hero;
  const p = (px, py, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + px), Math.round(y + py), w, hh); };

  const bob = moving ? Math.round(Math.sin(t * 12) * 1) : 0;
  const step = moving ? Math.sin(t * 12) : 0;
  const top = -22 + bob;

  // Ombra
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y - 1), 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cames (animació de passa)
  const lOff = Math.round(step * 2);
  p(-4, -6, 3, 6 - Math.abs(lOff), h.pants);
  p(1, -6, 3, 6 - Math.abs(-lOff), h.pants);
  // Sabates
  p(-4, -2 - Math.min(0, lOff), 3, 2, '#222');
  p(1, -2 - Math.min(0, -lOff), 3, 2, '#222');

  // Cos / samarreta
  p(-5, top + 10, 10, 9, h.shirt);
  p(-5, top + 10, 10, 2, h.shirtDark);
  // Braços
  const arm = moving ? Math.round(step * 2) : 0;
  p(-7, top + 11 + arm, 2, 6, h.skin);
  p(5, top + 11 - arm, 2, 6, h.skin);

  // Cap
  p(-4, top + 2, 8, 8, h.skin);
  p(-4, top + 8, 8, 2, h.skinDark); // mentó/ombra

  // Cabell
  if (facing === 'down' || facing === 'up') {
    p(-5, top, 10, 4, h.hair);
    p(-5, top + 2, 2, 4, h.hair);
    p(3, top + 2, 2, 4, h.hair);
    if (h.long) { p(-5, top + 4, 2, 7, h.hairDark); p(3, top + 4, 2, 7, h.hairDark); }
  } else {
    const dir = facing === 'left' ? -1 : 1;
    p(-5, top, 10, 4, h.hair);
    p(dir < 0 ? -5 : 3, top + 2, 2, 5, h.hair);
    if (h.long) p(dir < 0 ? -5 : 3, top + 4, 2, 8, h.hairDark);
  }

  // Cara (ulls)
  if (facing === 'down') {
    p(-3, top + 5, 2, 2, '#fff'); p(1, top + 5, 2, 2, '#fff');
    p(-2, top + 5, 1, 2, h.eye); p(1, top + 5, 1, 2, h.eye);
    p(-1, top + 8, 3, 1, '#c9607a'); // somriure
  } else if (facing === 'left') {
    p(-3, top + 5, 2, 2, '#fff'); p(-2, top + 5, 1, 2, h.eye);
  } else if (facing === 'right') {
    p(1, top + 5, 2, 2, '#fff'); p(2, top + 5, 1, 2, h.eye);
  }
}

// Cor flotant (per a cinemàtiques)
function drawHeart(ctx, x, y, s, color = '#ff5a7a') {
  ctx.fillStyle = color;
  ctx.fillRect(x - s, y - s, s, s);
  ctx.fillRect(x, y - s, s, s);
  ctx.fillRect(x - s * 2, y, s, s);
  ctx.fillRect(x + s, y, s, s);
  ctx.fillRect(x - s * 2, y, s * 4, s);
  ctx.fillRect(x - s, y + s, s * 3, s);
  ctx.fillRect(x - s, y + s, s, s);
  ctx.fillRect(x, y + s, s, s);
  ctx.fillRect(x - s * 0.5, y + s * 2, s, s);
}

// ---- Decorats ----
function drawTree(ctx, x, y, scale = 1) {
  const s = scale;
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
  const s = scale;
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
  ctx.fillStyle = wall; ctx.fillRect(x, y - h, w, h);
  ctx.fillStyle = roof; ctx.fillRect(x - 2, y - h - 6, w + 4, 8);
  // finestres
  ctx.fillStyle = '#bfe3ff';
  for (let wx = x + 4; wx < x + w - 6; wx += 12) {
    for (let wy = y - h + 6; wy < y - 8; wy += 12) {
      ctx.fillRect(wx, wy, 6, 7);
      ctx.fillStyle = '#7fb8d6'; ctx.fillRect(wx, wy + 3, 6, 1); ctx.fillStyle = '#bfe3ff';
    }
  }
}

// Núvol simple
function drawCloud(ctx, x, y, s = 1) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 5 * s, 0, Math.PI * 2);
  ctx.arc(x + 6 * s, y + 1, 6 * s, 0, Math.PI * 2);
  ctx.arc(x + 13 * s, y, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// Arc de casament (per al final)
function drawArch(ctx, x, y) {
  ctx.strokeStyle = '#caa24a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 18, y - 34);
  ctx.quadraticCurveTo(x, y - 52, x + 18, y - 34);
  ctx.lineTo(x + 18, y);
  ctx.stroke();
  // flors
  const flowers = ['#ff7a98', '#ffd166', '#ff5a7a', '#fff', '#c39bff'];
  for (let i = 0; i <= 10; i++) {
    const tt = i / 10;
    const px = U.lerp(x - 18, x + 18, tt);
    const py = -52 + y + Math.sin(tt * Math.PI) * 18 * (tt < 0.5 ? 1 : 1);
    const ay = y - 34 - Math.sin(tt * Math.PI) * 18;
    ctx.fillStyle = flowers[i % flowers.length];
    ctx.fillRect(Math.round(px) - 1, Math.round(ay) - 1, 3, 3);
  }
  ctx.fillStyle = '#3aae62';
  ctx.fillRect(x - 20, y - 2, 6, 3);
  ctx.fillRect(x + 14, y - 2, 6, 3);
}

// Dibuixa un emoji/ítem amb una mida concreta, centrat a (x,y).
function drawEmoji(ctx, emoji, x, y, size = 14) {
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  const prevB = ctx.textBaseline;
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.textBaseline = prevB;
}
