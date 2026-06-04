/* =====================================================================
   DIÀLEG — quadre de text amb efecte màquina d'escriure
   Reutilitzat per nivells i cinemàtiques.
   ===================================================================== */

class DialogueBox {
  constructor() {
    this.queue = [];
    this.active = false;
    this.line = null;
    this.shown = 0;     // caràcters mostrats
    this.speed = 38;    // caràcters/segon
    this.onDone = null;
    this.blink = 0;
  }

  // lines: array de { who, text, color } o strings (narrador).
  show(lines, onDone) {
    this.queue = lines.map(l => typeof l === 'string' ? { who: null, text: l } : l);
    this.onDone = onDone || null;
    this.active = true;
    this._next();
  }

  _next() {
    if (this.queue.length === 0) {
      this.active = false;
      this.line = null;
      const cb = this.onDone; this.onDone = null;
      if (cb) cb();
      return;
    }
    this.line = this.queue.shift();
    this.shown = 0;
  }

  // Avança: completa la línia o passa a la següent.
  advance() {
    if (!this.active || !this.line) return;
    if (this.shown < this.line.text.length) {
      this.shown = this.line.text.length;
    } else {
      AudioEngine.sfx('select');
      this._next();
    }
  }

  update(dt) {
    if (!this.active || !this.line) return;
    this.blink += dt;
    if (this.shown < this.line.text.length) {
      const prev = Math.floor(this.shown);
      this.shown = Math.min(this.line.text.length, this.shown + this.speed * dt);
      if (Math.floor(this.shown) > prev && this.line.text[prev] !== ' ') {
        AudioEngine.sfx('type');
      }
    }
  }

  render(ctx) {
    if (!this.active || !this.line) return;
    const boxH = 56;
    const y = VH - boxH - 6;
    const x = 8, w = VW - 16;

    // marc
    ctx.fillStyle = 'rgba(6,10,16,0.94)';
    ctx.fillRect(x, y, w, boxH);
    ctx.strokeStyle = '#8effc0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, boxH - 1);

    let ty = y + 12;
    if (this.line.who) {
      drawText(ctx, this.line.who, x + 8, ty, { size: 9, color: this.line.color || '#ffd166' });
      ty += 13;
    }

    // text amb ajust de línia
    const txt = this.line.text.substring(0, Math.floor(this.shown));
    this._wrapText(ctx, txt, x + 8, ty, w - 16, 11, this.line.who ? '#fff' : '#bfe9ff', !this.line.who);

    // fletxa de continuar
    if (this.shown >= this.line.text.length && Math.floor(this.blink * 2) % 2 === 0) {
      drawText(ctx, '▼', x + w - 14, y + boxH - 10, { size: 9, color: '#8effc0' });
    }
  }

  _wrapText(ctx, text, x, y, maxW, lh, color, italic) {
    ctx.font = `${italic ? 'italic ' : ''}8px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }
}
