/* =====================================================================
   ESCENES DE TERMINAL — MarriageOS
   Fase 1 (boot + simulació), retorn final, revelació del regal, missatge.
   ===================================================================== */

// Colors del terminal
const T = {
  green: '#57ffa0',
  dim: '#2f9e63',
  amber: '#ffcf5a',
  red: '#ff6b6b',
  cyan: '#7fe9ff',
  white: '#dfffe9',
};

// ----- Constructors de passos (sucre sintàctic) -----
const step = {
  line: (text, opts = {}) => ({ type: 'line', text, color: opts.color || T.green, status: opts.status, statusColor: opts.statusColor, speed: opts.speed, indent: opts.indent || 0 }),
  wait: (d) => ({ type: 'wait', d }),
  bar: (label, d, opts = {}) => ({ type: 'bar', label, d, color: opts.color || T.green }),
  big: (text, opts = {}) => ({ type: 'big', text, color: opts.color || T.green, d: opts.d || 1.4, size: opts.size || 22 }),
  clear: () => ({ type: 'clear' }),
  glitch: (d = 0.9) => ({ type: 'glitch', d }),
  blank: () => ({ type: 'line', text: '', color: T.green }),
  fn: (fn) => ({ type: 'fn', fn }),
  prompt: (text) => ({ type: 'prompt', text }),
  go: (scene, opts, speed) => ({ type: 'go', scene, opts, speed }),
};

// =====================================================================
//  Runner de terminal
// =====================================================================
class TerminalRunner {
  constructor(program, cfg = {}) {
    this.program = program;
    this.i = -1;
    this.lines = [];           // {full, color, reveal, status, statusColor, done}
    this.cur = null;
    this.state = 'idle';
    this.timer = 0;
    this.cursorT = 0;
    this.big = null;           // {text, color, t, d, size}
    this.bar = null;           // {label, t, d, color}
    this.glitch = 0;
    this.waitingInput = false;
    this.promptText = '';
    this.defSpeed = cfg.speed || 55;
    this.scan = cfg.scan !== false;
    this.done = false;
    this._advance();
  }

  _advance() {
    this.i++;
    if (this.i >= this.program.length) { this.state = 'end'; this.done = true; return; }
    const s = this.program[this.i];
    this.cur = s;
    switch (s.type) {
      case 'line':
        this.lines.push({ full: s.text, color: s.color, reveal: 0, status: s.status, statusColor: s.statusColor || T.green, done: false, indent: s.indent });
        this.state = 'typing';
        this._spd = s.speed || this.defSpeed;
        break;
      case 'wait': this.state = 'wait'; this.timer = s.d; break;
      case 'bar': this.bar = { label: s.label, t: 0, d: s.d, color: s.color }; this.state = 'bar'; break;
      case 'big': this.big = { text: s.text, color: s.color, t: 0, d: s.d, size: s.size }; this.state = 'big'; AudioEngine.sfx('confirm'); break;
      case 'clear': this.lines = []; this._advance(); break;
      case 'glitch': this.glitch = s.d; this.state = 'glitch'; this.timer = s.d; AudioEngine.sfx('glitch'); break;
      case 'fn': try { s.fn(); } catch (e) {} this._advance(); break;
      case 'prompt': this.waitingInput = true; this.promptText = s.text; this.state = 'prompt'; break;
      case 'go': SM.go(s.scene, s.opts, s.speed); this.state = 'end'; this.done = true; break;
    }
  }

  skip() {
    if (this.state === 'typing' && this.lines.length) {
      const l = this.lines[this.lines.length - 1];
      if (l.reveal < l.full.length) { l.reveal = l.full.length; return; }
    }
    if (this.state === 'wait') { this.timer = 0; return; }
    if (this.state === 'bar' && this.bar) { this.bar.t = this.bar.d; return; }
    if (this.state === 'big' && this.big) { this.big.t = this.big.d; return; }
    if (this.state === 'prompt') { this.waitingInput = false; AudioEngine.sfx('confirm'); this._advance(); return; }
  }

  update(dt) {
    this.cursorT += dt;
    if (this.glitch > 0) this.glitch -= dt;

    switch (this.state) {
      case 'typing': {
        const l = this.lines[this.lines.length - 1];
        const prev = Math.floor(l.reveal);
        l.reveal = Math.min(l.full.length, l.reveal + this._spd * dt);
        if (Math.floor(l.reveal) > prev) {
          const ch = l.full[prev];
          if (ch && ch !== ' ') AudioEngine.sfx('type');
        }
        if (l.reveal >= l.full.length) {
          l.done = true;
          this.state = 'wait';
          this.timer = l.status ? 0.18 : 0.12;
        }
        break;
      }
      case 'wait':
        this.timer -= dt;
        if (this.timer <= 0) this._advance();
        break;
      case 'bar':
        this.bar.t += dt;
        if (this.bar.t >= this.bar.d) { this.bar = null; this._advance(); }
        break;
      case 'big':
        this.big.t += dt;
        if (this.big.t >= this.big.d) { this.big = null; this._advance(); }
        break;
      case 'glitch':
        this.timer -= dt;
        if (this.timer <= 0) { this.glitch = 0; this._advance(); }
        break;
    }
  }

  render(ctx) {
    // fons
    ctx.fillStyle = '#02050a';
    ctx.fillRect(0, 0, VW, VH);

    // glitch: desplaçaments aleatoris
    const gx = this.glitch > 0 ? U.randInt(-6, 6) : 0;

    // línies (auto-scroll a la part inferior visible)
    const lh = 11;
    const marginTop = 16, marginBottom = this.state === 'prompt' ? 34 : 12;
    const maxLines = Math.floor((VH - marginTop - marginBottom) / lh);
    const visible = this.lines.slice(-maxLines);
    let y = marginTop;
    ctx.textAlign = 'left';
    for (const l of visible) {
      const txt = l.full.substring(0, Math.floor(l.reveal));
      const jit = this.glitch > 0 && U.chance(0.3) ? U.randInt(-3, 3) : 0;
      drawText(ctx, txt, 14 + (l.indent || 0) + jit + gx, y, { size: 9, color: l.color });
      // estat a la dreta quan la línia està completa
      if (l.done && l.status) {
        const sx = VW - 18;
        drawText(ctx, l.status, sx, y, { size: 9, color: l.statusColor, align: 'right' });
      }
      y += lh;
    }

    // cursor parpellejant a la línia actual (mentre escriu o espera)
    if ((this.state === 'typing' || this.state === 'wait') && Math.floor(this.cursorT * 2) % 2 === 0 && visible.length) {
      const last = visible[visible.length - 1];
      ctx.font = '9px "Courier New", monospace';
      const tw = ctx.measureText(last.full.substring(0, Math.floor(last.reveal))).width;
      ctx.fillStyle = T.green;
      ctx.fillRect(14 + (last.indent || 0) + tw + 2 + gx, y - lh - 4, 6, 9);
    }

    // barra de càrrega
    if (this.bar) {
      const p = U.clamp(this.bar.t / this.bar.d, 0, 1);
      const w = 200, x = 14, by = y + 4;
      drawText(ctx, this.bar.label, x, by, { size: 9, color: this.bar.color });
      const bx = x, bbY = by + 10;
      ctx.strokeStyle = this.bar.color; ctx.strokeRect(bx + 0.5, bbY + 0.5, w, 8);
      const filled = Math.floor(p * 20);
      let s = '';
      for (let k = 0; k < 20; k++) s += k < filled ? '█' : '·';
      drawText(ctx, s, bx + 3, bbY + 5, { size: 8, color: this.bar.color });
      drawText(ctx, Math.floor(p * 100) + '%', bx + w + 8, bbY + 5, { size: 8, color: this.bar.color });
    }

    // text gran
    if (this.big) {
      const a = U.clamp(this.big.t / 0.3, 0, 1) * U.clamp((this.big.d - this.big.t) / 0.3, 0, 1);
      ctx.globalAlpha = a;
      drawCenter(ctx, this.big.text, VH / 2, { size: this.big.size, color: this.big.color, shadow: '#003322', sx: 2, sy: 2 });
      ctx.globalAlpha = 1;
    }

    // prompt parpellejant
    if (this.state === 'prompt' && Math.floor(this.cursorT * 1.6) % 2 === 0) {
      drawCenter(ctx, this.promptText, VH - 18, { size: 11, color: T.amber });
    }

    // overlay CRT (scanlines + vinyeta)
    if (this.scan) drawCRT(ctx, this.glitch);
  }
}

function drawCRT(ctx, glitch = 0) {
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000';
  for (let y = 0; y < VH; y += 3) ctx.fillRect(0, y, VW, 1);
  ctx.globalAlpha = 1;
  // vinyeta
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  if (glitch > 0 && U.chance(0.5)) {
    ctx.fillStyle = 'rgba(120,255,180,0.08)';
    const yy = U.randInt(0, VH);
    ctx.fillRect(0, yy, VW, U.randInt(2, 10));
  }
}

// =====================================================================
//  Programa de BOOT (Fase 1)
// =====================================================================
function bootProgram() {
  const ok = { status: '[ OK ]', statusColor: T.green };
  return [
    step.wait(0.4),
    step.big('MarriageOS', { size: 30, d: 1.8, color: T.green }),
    step.line('MarriageOS v1.0', { color: T.cyan }),
    step.line('(c) 1994 Institut de l\'Amor Vertader', { color: T.dim }),
    step.blank(),
    step.line('Inicialitzant sistema...'),
    step.bar('Carregant nucli', 1.0),
    step.line('Carregant base de dades...'),
    step.line('Detectant ubicació...'),
    step.wait(0.5),
    step.line('Ubicació detectada: Sabadell, Catalunya', { color: T.cyan }),
    step.line('Buscant registres històrics...'),
    step.bar('Escanejant arxius', 0.9),
    step.line('Registres trobats.', { color: T.green }),
    step.line('Any de naixement detectat: 1994', { color: T.cyan }),
    step.blank(),
    step.line('Carregant Laura...', ok),
    step.line('Carregant Nil...', ok),
    step.line('Buscant connexions...'),
    step.wait(0.4),
    step.line('Connexió trobada: Escola Sant Nicolau', { color: T.cyan }),
    step.line('Analitzant compatibilitat...'),
    step.bar('Processant', 1.2),
    step.line('Compatibilitat detectada: 99.94%', { color: T.amber, status: '[ ALTA ]', statusColor: T.amber }),
    step.line('Verificant estabilitat emocional...', { status: '[ ESTABLE ]', statusColor: T.green }),
    step.line('Verificant historial d\'aventures...', { status: '[ EXCEL·LENT ]', statusColor: T.green }),
    step.line('Calculant probabilitat d\'èxit matrimonial...', { status: '[ ERROR ]', statusColor: T.red }),
    step.wait(0.5),
    step.line('Valor superior al límit mesurable.', { color: T.red }),
    step.wait(0.8),
    step.blank(),
    // ---- Simulacions absurdes ----
    step.line('Executant simulacions de la vida real...', { color: T.dim }),
    step.line('Simulant escapades de cap de setmana...', { status: '[ OK ]', statusColor: T.green }),
    step.line('Simulant viatges futurs...', { status: '[ OK ]', statusColor: T.green }),
    step.line('Simulant discussions sobre què sopar...', { status: '[ SENSE ACORD ]', statusColor: T.amber }),
    step.line('Simulant grups de WhatsApp familiars...', { status: '[ 247 MISSATGES ]', statusColor: T.amber }),
    step.line('Simulant visites a Ikea...', { status: '[ SUPERVIVENTS ]', statusColor: T.green }),
    step.line('Simulant repartiment de tasques domèstiques...', { status: '[ NEGOCIANT ]', statusColor: T.amber }),
    step.line('Simulant 50 anys de matrimoni...', { status: '[ OK ]', statusColor: T.green }),
    step.line('Simulant futures aventures...', { status: '[ INFINITES ]', statusColor: T.cyan }),
    step.line('Analitzant possibilitat de felicitat extrema...', { status: '[ AVÍS ]', statusColor: T.amber }),
    step.wait(0.4),
    step.line('Resultat estadísticament sospitós.', { color: T.amber }),
    step.wait(1.0),
    step.blank(),
    // ---- Transició ----
    step.line('Simulació preparada.', { color: T.green }),
    step.line('Inicialitzant entorn virtual...'),
    step.bar('Carregant motor gràfic', 1.1),
    step.line('Carregant memòries...', { status: '[ OK ]', statusColor: T.green }),
    step.line('Carregant aventures...', { status: '[ OK ]', statusColor: T.green }),
    step.wait(0.5),
    step.big('SIMULATION MODE ACTIVATED', { size: 13, d: 1.6, color: T.cyan }),
    step.glitch(1.0),
    step.go('title', {}, 1.6),
  ];
}

registerScene('boot', () => {
  let runner;
  let started = false;
  return {
    enter() {
      AudioEngine.setTrack('terminal');
      runner = new TerminalRunner(bootProgram());
    },
    update(dt) { runner.update(dt); },
    render(ctx) {
      runner.render(ctx);
      if (!started) {
        // petita pista per accelerar
        if (Math.floor(performance.now() / 600) % 2 === 0)
          drawText(ctx, '[ toca / tecla per accelerar ]', 14, VH - 8, { size: 7, color: 'rgba(120,255,180,0.4)' });
      }
    },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') { started = true; runner.skip(); }
    },
  };
});

// =====================================================================
//  Retorn a MarriageOS (després del final)
// =====================================================================
function returnProgram() {
  return [
    step.wait(0.6),
    step.line('MarriageOS v1.0', { color: T.cyan }),
    step.line('Reconnectant amb el sistema...'),
    step.bar('Sincronitzant', 0.9),
    step.line('Recollint dades finals...'),
    step.line('Analitzant resultats...'),
    step.bar('Calculant', 1.0),
    step.line('Simulació completada.', { color: T.green }),
    step.wait(0.5),
    step.blank(),
    step.big('RESULTAT', { size: 16, d: 1.2, color: T.cyan }),
    step.line('RESULTAT: MATRIMONI APROVAT', { color: T.amber, status: '[ ✓ ]', statusColor: T.green }),
    step.line('Estat del sistema: OPERATIU', { status: '[ ONLINE ]', statusColor: T.green }),
    step.line('Temps estimat de funcionament: TOTA LA VIDA', { color: T.cyan }),
    step.wait(1.2),
    step.blank(),
    step.go('gift', {}, 1.4),
  ];
}
registerScene('returnos', () => {
  let runner;
  return {
    enter() { AudioEngine.setTrack('terminal'); runner = new TerminalRunner(returnProgram()); },
    update(dt) { runner.update(dt); },
    render(ctx) { runner.render(ctx); },
    onInput(a) { if (a === 'any' || a === 'tap' || a === 'a') runner.skip(); },
  };
});

// =====================================================================
//  Revelació del REGAL
// =====================================================================
function giftProgram() {
  return [
    step.wait(0.4),
    step.line('Buscant patrocinadors...', { color: T.dim }),
    step.bar('Escanejant la xarxa', 1.0),
    step.wait(0.3),
    step.line('Patrocinador detectat.', { color: T.green }),
    step.blank(),
    step.line('Nom: Albert Gil Esmendia', { color: T.cyan }),
    step.line('Classificació: Wedding Investor', { color: T.amber }),
    step.line('Tipus: Contribució estratègica', { color: T.white }),
    step.wait(0.6),
    step.blank(),
    step.big('TRANSFER DETECTED', { size: 15, d: 1.4, color: T.amber }),
    step.fn(() => AudioEngine.sfx('powerup')),
    step.big('+250€', { size: 40, d: 1.8, color: T.green }),
    step.line('Contribució assignada a:', { color: T.dim }),
    step.line('FONS D\'AVENTURES FUTURES', { color: T.cyan, status: '[ ✓ ]', statusColor: T.green }),
    step.fn(() => Achievements.unlock('futur')),
    step.wait(1.0),
    step.blank(),
    step.line('"Gràcies per jugar."', { color: T.white }),
    step.line('Laura ❤ Nil', { color: T.amber }),
    step.line('Mas d\'Osor', { color: T.cyan }),
    step.line('13.06.2026', { color: T.cyan }),
    step.wait(1.4),
    step.go('finalmsg', {}, 2.2),
  ];
}
registerScene('gift', () => {
  let runner;
  return {
    enter() { AudioEngine.setTrack('love'); runner = new TerminalRunner(giftProgram()); },
    update(dt) { runner.update(dt); },
    render(ctx) { runner.render(ctx); },
    onInput(a) { if (a === 'any' || a === 'tap' || a === 'a') runner.skip(); },
  };
});

// =====================================================================
//  MISSATGE FINAL (text gran centrat, càlid)
// =====================================================================
registerScene('finalmsg', () => {
  const seq = [
    { text: 'El tutorial s\'ha completat.', size: 16, color: '#8effc0', hold: 2.6 },
    { text: 'El casament no és la meta.', size: 18, color: '#ffd166', hold: 2.8 },
    { text: 'És el començament.', size: 22, color: '#ff8aa6', hold: 3.2 },
  ];
  let idx = 0, t = 0, hearts = [];
  return {
    enter() {
      AudioEngine.setTrack('love');
      Achievements.unlock('complet');
      for (let i = 0; i < 16; i++) hearts.push({ x: U.rand(0, VW), y: U.rand(VH, VH * 2), s: U.rand(2, 4), v: U.rand(8, 20), p: U.rand(0, 6) });
    },
    update(dt) {
      t += dt;
      for (const h of hearts) { h.y -= h.v * dt; if (h.y < -10) { h.y = VH + 10; h.x = U.rand(0, VW); } }
      if (idx < seq.length - 1 && t > seq[idx].hold) { t = 0; idx++; AudioEngine.sfx('heart'); }
    },
    render(ctx) {
      ctx.fillStyle = '#0a0610';
      ctx.fillRect(0, 0, VW, VH);
      for (const h of hearts) {
        ctx.globalAlpha = 0.5;
        drawHeart(ctx, h.x, h.y, h.s, 'rgba(255,120,150,0.6)');
      }
      ctx.globalAlpha = 1;
      const cur = seq[idx];
      const a = U.clamp(t / 0.8, 0, 1);
      ctx.globalAlpha = a;
      // línies anteriors es queden tènues a sobre
      drawCenter(ctx, cur.text, VH / 2, { size: cur.size, color: cur.color, shadow: 'rgba(0,0,0,0.6)', sx: 1, sy: 2 });
      ctx.globalAlpha = 1;
      if (idx === seq.length - 1 && t > 2.5) {
        if (Math.floor(t * 1.4) % 2 === 0)
          drawCenter(ctx, 'Laura ❤ Nil  ·  13.06.2026  ·  Mas d\'Osor', VH - 22, { size: 8, color: 'rgba(255,255,255,0.7)' });
        drawCenter(ctx, 'Toca per tornar a jugar', VH - 10, { size: 7, color: 'rgba(255,255,255,0.35)' });
      }
    },
    onInput(a) {
      if ((a === 'any' || a === 'tap' || a === 'a') && idx === seq.length - 1 && t > 2.5) {
        SM.go('boot', {}, 1.5);
      }
    },
  };
});
