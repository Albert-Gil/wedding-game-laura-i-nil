/* =====================================================================
   LauraiNil_OS / Laura ❤ Nil — NUCLI DEL MOTOR
   Resolució virtual + bucle de joc + gestor d'escenes + utilitats.
   ===================================================================== */

// Resolució interna (es reescala a la pantalla; base de disseny 384×216).
const BASE_W = 384;
const BASE_H = 216;
const VW = 960;
const VH = 540;
const S = VW / BASE_W;       // 2.5× — joc, personatges, UI
const S_OS = 3.5;            // 3.5× — terminal LauraiNil_OS (més llegible)

// Velocitat de caminar dels personatges (px/s, espai de joc)
const HERO_SPEED = 112;      // nivells 1–2
const HERO_SPEED_MID = 120;  // nivell 3
const HERO_SPEED_FAST = 130; // nivell 4
const HERO_SPEED_COOP = 100; // caminada final (dos jugadors)
const HERO_SPEED_COOP_Y = 72;
const HERO_SPEED_BOSS = 155; // batalla final

function fs(n) { return Math.round(n * S); }
function fso(n) { return Math.round(n * S_OS); }

/** Omple fins a VW×VH quan el mapa és més petit (evita zona morta a baix-dreta). */
function expandPlayWorld(baseW, baseH) {
  const padX = Math.max(0, Math.round((VW - baseW) / 2));
  const padY = Math.max(0, Math.round((VH - baseH) / 2));
  return { w: baseW + padX * 2, h: baseH + padY * 2, padX, padY };
}

/** Marges de la zona jugable (coordenades de joc, independents del scale CSS). */
function playAreaMargin(kind) {
  switch (kind) {
    case 'boss':
      return { left: 12, right: 12, top: fs(28), bottom: fs(14) };
    case 'walk':
      // Caminada horitzontal (y ~150), no marges de pantalla completa
      return { left: 16, right: 16, top: 112, bottom: VH - 198 };
    case 'level':
    default:
      return { left: 8, right: 8, top: 16, bottom: 6 };
  }
}

const view = {
  canvas: null,
  ctx: null,
  scale: 1,
  ox: 0,
  oy: 0,
};

// Estat global compartit entre escenes.
const State = {
  tokensL1: 0, tokensL2: 0, tokensL3: 0,
  cafes: 0, emailsHit: 0, examsDodged: 0,
  bossDefeated: false,
  visitedTitle: false,
  flags: {},
};

// ---------------------------------------------------------------------
// Utilitats
// ---------------------------------------------------------------------
const U = {
  clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  chance: (p) => Math.random() < p,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  aabb: (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
  ease: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

// Petita gestió de partícules reutilitzable.
class Particles {
  constructor() { this.list = []; }
  burst(x, y, color, n = 10, opts = {}) {
    const spd = opts.spd || 60;
    const life = opts.life || 0.6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = U.rand(spd * 0.3, spd);
      this.list.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.up || 0),
        life, t: life,
        color: Array.isArray(color) ? U.pick(color) : color,
        size: opts.size || U.rand(1, 3),
        grav: opts.grav != null ? opts.grav : 120,
        text: opts.text || null,
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.t -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter(p => p.t > 0);
  }
  render(ctx, cam = { x: 0, y: 0 }) {
    for (const p of this.list) {
      const a = U.clamp(p.t / p.life, 0, 1);
      ctx.globalAlpha = a;
      if (p.text) {
        ctx.font = `${Math.round(p.size)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x - cam.x, p.y - cam.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------
// Gestor d'escenes amb transició de fosa (fade).
// ---------------------------------------------------------------------
const Scenes = {}; // nom -> factory()
function registerScene(name, factory) { Scenes[name] = factory; }

const SM = {
  current: null,
  currentName: null,
  fade: 0,           // 0 visible, 1 negre
  fadeDir: 0,        // -1 aclarint, +1 enfosquint
  fadeSpeed: 2.2,
  pending: null,     // {name, opts}
  onFadeMid: null,

  start(name, opts) {
    this.current = Scenes[name]();
    this.currentName = name;
    if (this.current.enter) this.current.enter(opts || {});
    if (window.AudioEngine) AudioEngine.resume();
    this.fade = 1; this.fadeDir = -1;
  },

  // Transició suau cap a una altra escena.
  go(name, opts, speed) {
    if (this.pending) return;
    this.fadeSpeed = speed || 2.2;
    this.pending = { name, opts: opts || {} };
    this.fadeDir = 1;
  },

  update(dt) {
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * this.fadeSpeed * dt;
      if (this.fade >= 1 && this.fadeDir > 0) {
        this.fade = 1;
        if (this.pending) {
          const { name, opts } = this.pending;
          this.pending = null;
          this.current = Scenes[name]();
          this.currentName = name;
          if (this.current.enter) this.current.enter(opts);
          if (window.AudioEngine) AudioEngine.resume();
          this.fadeDir = -1;
        } else {
          this.fadeDir = 0;
        }
      }
      if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; }
    }
    if (this.current && this.current.update) this.current.update(dt);
  },

  render(ctx) {
    if (this.current && this.current.render) this.current.render(ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, VW, VH);
    }
  },

  input(action, down) {
    // Bloqueja entrada durant la transició.
    if (this.fadeDir > 0) return;
    if (this.current && this.current.onInput) this.current.onInput(action, down);
  },
};

// ---------------------------------------------------------------------
// Redimensionament responsiu (manté relació d'aspecte, omple pantalla).
// ---------------------------------------------------------------------
function resize() {
  const stage = document.getElementById('stage');
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  // Escala enter quan és possible per a un pixel-art net; si no, decimal.
  let scale = Math.min(sw / VW, sh / VH);
  if (scale >= 1) scale = Math.floor(scale * 100) / 100;
  const cw = Math.round(VW * scale);
  const ch = Math.round(VH * scale);
  view.canvas.style.width = cw + 'px';
  view.canvas.style.height = ch + 'px';
  view.scale = scale;
  view.ox = Math.round((sw - cw) / 2);
  view.oy = Math.round((sh - ch) / 2);
}

// ---------------------------------------------------------------------
// Inici del motor i bucle principal.
// ---------------------------------------------------------------------
function bootEngine(firstScene) {
  view.canvas = document.getElementById('game');
  view.canvas.width = VW;
  view.canvas.height = VH;
  view.ctx = view.canvas.getContext('2d');
  view.ctx.imageSmoothingEnabled = false;
  view.ctx.textBaseline = 'middle';

  window.addEventListener('resize', resize);
  resize();

  SM.start(firstScene);

  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // evita salts grans en canviar de pestanya
    SM.update(dt);
    if (window.AudioEngine) AudioEngine.update();
    if (window.Achievements) Achievements.update(dt);
    SM.render(view.ctx);
    if (window.Achievements) Achievements.renderToasts(view.ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------
// Helpers de dibuix de text reutilitzables.
// ---------------------------------------------------------------------
function drawText(ctx, txt, x, y, opts = {}) {
  const size = opts.raw ? (opts.size || 8) : (opts.os ? fso(opts.size || 8) : fs(opts.size || 8));
  const sx = opts.raw ? (opts.sx || 1) : fs(opts.sx || 1);
  const sy = opts.raw ? (opts.sy || 1) : fs(opts.sy || 1);
  ctx.font = `${size}px ${opts.font || '"Courier New", ui-monospace, monospace'}`;
  ctx.textAlign = opts.align || 'left';
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fillText(txt, x + sx, y + sy);
  }
  ctx.fillStyle = opts.color || '#fff';
  ctx.fillText(txt, x, y);
}

function drawCenter(ctx, txt, y, opts = {}) {
  drawText(ctx, txt, VW / 2, y, Object.assign({ align: 'center' }, opts));
}

function measureTextWidth(ctx, txt, opts = {}) {
  const size = opts.os ? fso(opts.size || 8) : (opts.raw ? (opts.size || 8) : fs(opts.size || 8));
  ctx.font = `${size}px ${opts.font || '"Courier New", ui-monospace, monospace'}`;
  return ctx.measureText(txt).width;
}

/** Vàries línies centrades; l'espaiat vertical usa fs() per no trepitjar-se. */
function drawCenterBlock(ctx, lines, centerY, opts = {}) {
  const size = opts.size || 12;
  const gap = opts.gap != null ? opts.gap : fso(5);
  const lineH = fs(size) + gap;
  const blockH = lines.length * lineH - gap;
  let y = centerY - blockH / 2 + fs(size) * 0.72;
  const colors = opts.lineColors;
  for (let i = 0; i < lines.length; i++) {
    drawCenter(ctx, lines[i], y, {
      size,
      color: colors ? (colors[i] || opts.color) : opts.color,
      shadow: opts.shadow,
      sx: opts.sx,
      sy: opts.sy,
      os: opts.os,
    });
    y += lineH;
  }
  return { top: centerY - blockH / 2, bottom: centerY + blockH / 2, lineH };
}

function fitFontSize(ctx, text, maxW, startSize, useOs = false) {
  let sz = startSize;
  while (sz > 6 && measureTextWidth(ctx, text, { size: sz, os: useOs }) > maxW) sz -= 1;
  return sz;
}
