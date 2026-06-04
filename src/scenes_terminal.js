/* =====================================================================
   ESCENES DE TERMINAL — LauraiNil_OS
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
  /** Atura fins que l'usuari cliqui o premi una tecla. */
  pause: (text) => ({ type: 'prompt', text: text || '[ Clica o prem una tecla per continuar ]' }),
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
    this.defSpeed = cfg.speed || 38; // caràcters/segon (més lent = més llegible)
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
      case 'big':
        this.big = {
          text: s.text, color: s.color, t: 0, d: s.d, size: s.size,
          waitClick: !!s.click, clickText: s.clickText,
        };
        this.state = 'big';
        AudioEngine.sfx('confirm');
        break;
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
    if (this.state === 'prompt') {
      this.waitingInput = false;
      if (this.big && this.big.waitClick) this.big = null;
      AudioEngine.resume();
      AudioEngine.sfx('confirm');
      this._advance();
      return;
    }
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
        if (this.big.t >= this.big.d) {
          if (this.big.waitClick) {
            this.state = 'prompt';
            this.promptText = this.big.clickText || '[ Clica o prem una tecla per continuar ]';
          } else {
            this.big = null;
            this._advance();
          }
        }
        break;
      case 'glitch':
        this.timer -= dt;
        if (this.timer <= 0) { this.glitch = 0; this._advance(); }
        break;
    }
  }

  _wrapText(ctx, text, maxW) {
    if (!text) return [''];
    if (ctx.measureText(text).width <= maxW) return [text];
    const out = [];
    let line = '';
    const words = text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const tryLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(tryLine).width <= maxW) {
        line = tryLine;
        continue;
      }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= maxW) {
        line = word;
        continue;
      }
      let chunk = '';
      for (const ch of word) {
        const next = chunk + ch;
        if (chunk && ctx.measureText(next).width > maxW) {
          out.push(chunk);
          chunk = ch;
        } else chunk = next;
      }
      line = chunk;
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }

  _layoutLines(ctx, fontStr, padX, statusPad, gx) {
    ctx.font = fontStr;
    const visual = [];
    for (const l of this.lines) {
      const indent = l.indent ? fso(l.indent) : 0;
      const lx = padX + indent + gx;
      const txt = l.full.substring(0, Math.floor(l.reveal));
      let maxW = VW - padX * 2 - indent;
      let statusOnLast = false;
      if (l.status) {
        const statusW = ctx.measureText(l.status).width;
        maxW = VW - padX * 2 - indent - statusW - statusPad;
        statusOnLast = l.done;
      }
      const rows = this._wrapText(ctx, txt, maxW);
      rows.forEach((row, i) => {
        visual.push({
          text: row,
          color: l.color,
          lx,
          status: statusOnLast && i === rows.length - 1 ? l.status : null,
          statusColor: l.statusColor,
          logical: l,
        });
      });
    }
    return visual;
  }

  render(ctx) {
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;

    ctx.fillStyle = '#02050a';
    ctx.fillRect(0, 0, VW, VH);
    if (this.scan) drawCRT(ctx, this.glitch, true);

    const gx = this.glitch > 0 ? U.randInt(-fso(6), fso(6)) : 0;
    const fontPx = fso(9);
    const lh = fso(16);
    const marginTop = fso(18);
    const marginBottom = this.state === 'prompt' ? fso(44) : (this.bar ? fso(28) : fso(14));
    const padX = fso(14);
    const statusPad = fso(8);
    const fontStr = `${fontPx}px "Courier New", ui-monospace, monospace`;
    const maxRows = Math.floor((VH - marginTop - marginBottom) / lh);
    const visual = this._layoutLines(ctx, fontStr, padX, statusPad, gx).slice(-maxRows);
    let y = marginTop;

    ctx.textBaseline = 'middle';
    ctx.font = fontStr;

    for (const row of visual) {
      const jit = this.glitch > 0 && U.chance(0.3) ? U.randInt(-fso(2), fso(2)) : 0;
      ctx.fillStyle = row.color;
      ctx.textAlign = 'left';
      ctx.fillText(row.text, row.lx + jit, y);
      if (row.status) {
        ctx.textAlign = 'right';
        ctx.fillStyle = row.statusColor;
        ctx.fillText(row.status, VW - padX, y);
        ctx.textAlign = 'left';
      }
      y += lh;
    }

    const typing = this.state === 'typing' || this.state === 'wait';
    if (typing && Math.floor(this.cursorT * 2) % 2 === 0 && visual.length) {
      const lastRow = visual[visual.length - 1];
      const lastLogical = this.lines[this.lines.length - 1];
      if (lastRow.logical === lastLogical) {
        const tw = ctx.measureText(lastRow.text).width;
        ctx.fillStyle = lastRow.color || T.green;
        ctx.textAlign = 'left';
        ctx.fillText('▌', lastRow.lx + tw + fso(1), y - lh);
      }
    }

    if (this.bar) {
      y += fso(4);
      const p = U.clamp(this.bar.t / this.bar.d, 0, 1);
      const w = Math.min(fso(220), VW - padX * 2);
      const x = padX;
      const by = y + fso(2);
      drawText(ctx, this.bar.label, x, by, { size: 9, color: this.bar.color, os: true });
      const bbY = by + fso(12);
      ctx.strokeStyle = this.bar.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, bbY + 0.5, w, fso(8));
      const filled = Math.floor(p * 20);
      let s = '';
      for (let k = 0; k < 20; k++) s += k < filled ? '█' : '·';
      drawText(ctx, s, x + fso(3), bbY + fso(5), { size: 8, color: this.bar.color, os: true });
      const pct = Math.floor(p * 100) + '%';
      drawText(ctx, pct, x + w + fso(6), bbY + fso(5), { size: 8, color: this.bar.color, os: true });
      y = bbY + fso(14);
    }

    if (this.big) {
      const a = U.clamp(this.big.t / 0.3, 0, 1) * U.clamp((this.big.d - this.big.t) / 0.3, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(2,5,10,0.55)';
      ctx.fillRect(0, 0, VW, VH);
      const bigSize = fitFontSize(ctx, this.big.text, VW - fso(32), this.big.size, true);
      drawCenter(ctx, this.big.text, VH / 2, {
        size: bigSize, color: this.big.color, shadow: '#003322',
        sx: 2, sy: 2, os: true,
      });
      ctx.globalAlpha = 1;
    }

    if (this.state === 'prompt' && Math.floor(this.cursorT * 1.6) % 2 === 0) {
      const promptSize = fitFontSize(ctx, this.promptText, VW - fso(24), 11, true);
      drawCenter(ctx, this.promptText, VH - fso(20), { size: promptSize, color: T.amber, os: true });
    }

    if (this.scan) drawCRT(ctx, this.glitch, false);
    ctx.imageSmoothingEnabled = smooth;
  }
}

function drawCRT(ctx, glitch = 0, underText = false) {
  if (underText) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    return;
  }
  ctx.globalAlpha = 0.028;
  ctx.fillStyle = '#000';
  for (let yy = 0; yy < VH; yy += 2) ctx.fillRect(0, yy, VW, 1);
  ctx.globalAlpha = 1;
  if (glitch > 0 && U.chance(0.5)) {
    ctx.fillStyle = 'rgba(120,255,180,0.06)';
    const gy = U.randInt(0, VH);
    ctx.fillRect(0, gy, VW, U.randInt(fso(2), fso(8)));
  }
}

// =====================================================================
//  Programa de BOOT (Fase 1)
// =====================================================================
function bootProgram() {
  const ok = { status: '[ OK ]', statusColor: T.green };
  return [
    step.pause('[ Clica per arrencar LauraiNil_OS ]'),
    step.big('LauraiNil_OS', { size: 30, d: 1.8, color: T.green, click: true }),
    step.line('LauraiNil_OS v1.0', { color: T.cyan }),
    step.line('(c) 1994 Institut de l\'Amor Vertader', { color: T.dim }),
    step.blank(),
    step.pause('[ Prem per inicialitzar el sistema ]'),
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
    step.pause('[ Prem per carregar els perfils ]'),
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
    step.wait(0.6),
    step.blank(),
    step.pause('[ Prem per executar les simulacions ]'),
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
    step.wait(0.5),
    step.blank(),
    step.pause('[ Prem per activar el mode simulació ]'),
    // ---- Transició ----
    step.line('Simulació preparada.', { color: T.green }),
    step.line('Inicialitzant entorn virtual...'),
    step.bar('Carregant motor gràfic', 1.1),
    step.line('Carregant memòries...', { status: '[ OK ]', statusColor: T.green }),
    step.line('Carregant aventures...', { status: '[ OK ]', statusColor: T.green }),
    step.wait(0.4),
    step.big('SIMULATION MODE ACTIVATED', { size: 13, d: 1.6, color: T.cyan, click: true, clickText: '[ Prem per entrar al joc ]' }),
    step.glitch(1.0),
    step.go('title', {}, 1.6),
  ];
}

registerScene('boot', () => {
  let runner;
  return {
    enter() {
      AudioEngine.setTrack('terminal');
      runner = new TerminalRunner(bootProgram());
    },
    update(dt) { runner.update(dt); },
    render(ctx) {
      runner.render(ctx);
      if (runner.state !== 'prompt' && runner.state !== 'end' && Math.floor(performance.now() / 600) % 2 === 0) {
        drawText(ctx, '[ tecla: accelerar línia ]', fso(14), VH - fso(8), { size: 7, color: 'rgba(120,255,180,0.35)', os: true });
      }
    },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') {
        AudioEngine.resume();
        runner.skip();
      }
    },
  };
});

// =====================================================================
//  Retorn a LauraiNil_OS (després del final)
// =====================================================================
function returnProgram() {
  return [
    step.pause('[ Clica per tornar a LauraiNil_OS ]'),
    step.wait(0.4),
    step.line('LauraiNil_OS v1.0', { color: T.cyan }),
    step.line('Reconnectant amb el sistema...'),
    step.bar('Sincronitzant', 0.9),
    step.line('Recollint dades finals...'),
    step.line('Analitzant resultats...'),
    step.bar('Calculant', 1.0),
    step.line('Simulació completada.', { color: T.green }),
    step.wait(0.5),
    step.blank(),
    step.big('RESULTAT', { size: 16, d: 1.2, color: T.cyan, click: true, clickText: '[ Prem per veure el resultat ]' }),
    step.line('RESULTAT: MATRIMONI APROVAT', { color: T.amber, status: '[ ✓ ]', statusColor: T.green }),
    step.line('Estat del sistema: OPERATIU', { status: '[ ONLINE ]', statusColor: T.green }),
    step.line('Temps estimat de funcionament: TOTA LA VIDA', { color: T.cyan }),
    step.wait(0.5),
    step.blank(),
    step.pause('[ Prem per continuar ]'),
    step.go('gift', {}, 1.4),
  ];
}
registerScene('returnos', () => {
  let runner;
  return {
    enter() { AudioEngine.setTrack('terminal'); runner = new TerminalRunner(returnProgram()); },
    update(dt) { runner.update(dt); },
    render(ctx) { runner.render(ctx); },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') { AudioEngine.resume(); runner.skip(); }
    },
  };
});

// =====================================================================
//  Revelació del REGAL
// =====================================================================
function giftProgram() {
  return [
    step.pause('[ Clica per revelar el regal ]'),
    step.wait(0.3),
    step.line('Buscant patrocinadors...', { color: T.dim }),
    step.bar('Escanejant la xarxa', 1.0),
    step.wait(0.3),
    step.line('Patrocinador detectat.', { color: T.green }),
    step.blank(),
    step.line('Nom: Dr. Albert Gil Esmendia (no soc metge)', { color: T.cyan }),
    step.line('Classificació: Wedding Investor', { color: T.amber }),
    step.line('Tipus: Contribució estratègica', { color: T.white }),
    step.wait(0.6),
    step.blank(),
    step.pause('[ Prem per la transferència ]'),
    step.big('TRANSFER DETECTED', { size: 15, d: 1.4, color: T.amber, click: true }),
    step.fn(() => AudioEngine.sfx('powerup')),
    step.big('+€€€€', { size: 40, d: 1.8, color: T.green, click: true }),
    step.line('Contribució assignada a:', { color: T.dim }),
    step.line('FONS D\'AVENTURES FUTURES', { color: T.cyan, status: '[ ✓ ]', statusColor: T.green }),
    step.fn(() => Achievements.unlock('futur')),
    step.wait(1.0),
    step.blank(),
    step.line('"Gràcies per jugar."', { color: T.white }),
    step.line('Laura ❤ Nil', { color: T.amber }),
    step.line('Mas d\'Osor', { color: T.cyan }),
    step.line('13.06.2026', { color: T.cyan }),
    step.wait(0.5),
    step.pause('[ Prem per el missatge final ]'),
    step.go('finalmsg', {}, 2.2),
  ];
}
registerScene('gift', () => {
  let runner;
  return {
    enter() { AudioEngine.setTrack('weddingEnd'); runner = new TerminalRunner(giftProgram()); },
    update(dt) { runner.update(dt); },
    render(ctx) { runner.render(ctx); },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') { AudioEngine.resume(); runner.skip(); }
    },
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
      AudioEngine.setTrack('weddingEnd');
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
      const mainSize = fitFontSize(ctx, cur.text, VW - fs(48), cur.size);
      const block = drawCenterBlock(ctx, [cur.text], VH / 2 - fso(6), {
        size: mainSize,
        color: cur.color,
        shadow: 'rgba(0,0,0,0.6)',
        sx: 1,
        sy: 2,
      });
      ctx.globalAlpha = 1;
      if (idx === seq.length - 1 && t > 2.5) {
        const footTop = Math.max(block.bottom + fs(24), VH - fs(52));
        drawCenter(ctx, 'Laura ❤ Nil', footTop, { size: 9, color: 'rgba(255,255,255,0.75)' });
        drawCenter(ctx, '13.06.2026 · Mas d\'Osor', footTop + fs(14), { size: 8, color: 'rgba(255,255,255,0.6)' });
        drawCenter(ctx, Input.hasTouch ? 'Toca per tornar a jugar' : 'Prem qualsevol tecla per tornar', footTop + fs(30), { size: 7, color: 'rgba(255,255,255,0.4)' });
      }
    },
    onInput(a) {
      if ((a === 'any' || a === 'tap' || a === 'a') && idx === seq.length - 1 && t > 2.5) {
        SM.go('boot', {}, 1.5);
      }
    },
  };
});
