/* =====================================================================
   ENTRADA — teclat + controls tàctils (D-pad + botons A/B)
   Exposa un eix continu (x,y) i accions amb detecció de flanc.
   ===================================================================== */

const Input = {
  x: 0, y: 0,                 // eix continu -1..1
  dirs: { up: false, down: false, left: false, right: false },
  acts: { a: false, b: false, start: false },
  _pressed: {},               // flancs (es consumeixen aquest frame al codi de l'escena via pressed())
  hasTouch: false,

  init() {
    this.hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // ---- Teclat ----
    const keymap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      Space: 'a', KeyZ: 'a', Enter: 'a',
      KeyX: 'b', Escape: 'b', Backspace: 'b',
    };
    window.addEventListener('keydown', (e) => {
      this._firstGesture();
      const m = keymap[e.code];
      if (!m) return;
      e.preventDefault();
      if (m in this.dirs) this.dirs[m] = true;
      else { if (!this.acts[m]) this._fire(m); this.acts[m] = true; }
      // Qualsevol tecla compta com "start/confirma" per a escenes simples.
      this._fire('any');
      this._recalc();
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const m = keymap[e.code];
      if (!m) return;
      e.preventDefault();
      if (m in this.dirs) this.dirs[m] = false;
      else this.acts[m] = false;
      this._recalc();
    }, { passive: false });

    // ---- Tàctil: D-pad ----
    if (this.hasTouch) {
      document.getElementById('touch').classList.remove('hidden');
    }
    const hold = (el, on, off) => {
      const start = (e) => { e.preventDefault(); this._firstGesture(); on(); };
      const end = (e) => { e.preventDefault(); off(); };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', (e) => { if (e.buttons === 0) return; off(); });
    };
    document.querySelectorAll('.dbtn').forEach(btn => {
      const dir = btn.dataset.dir;
      hold(btn, () => { this.dirs[dir] = true; this._recalc(); }, () => { this.dirs[dir] = false; this._recalc(); });
    });
    document.querySelectorAll('.actbtn').forEach(btn => {
      const act = btn.dataset.act;
      hold(btn,
        () => { if (!this.acts[act]) this._fire(act); this.acts[act] = true; this._fire('any'); },
        () => { this.acts[act] = false; });
    });

    // Tap a la pantalla = acció "any" + "a" (per a escenes de text/cinemàtiques).
    view.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._firstGesture();
      this._fire('any');
      this._fire('tap');
    }, { passive: false });
    view.canvas.addEventListener('mousedown', () => {
      this._firstGesture();
      this._fire('any');
      this._fire('tap');
    });

    // Botons de cantonada
    document.getElementById('btnMute').addEventListener('click', (e) => {
      e.stopPropagation();
      this._firstGesture();
      AudioEngine.toggleMute();
    });
    document.getElementById('btnFull').addEventListener('click', (e) => {
      e.stopPropagation();
      const app = document.getElementById('app');
      if (!document.fullscreenElement) {
        (app.requestFullscreen || app.webkitRequestFullscreen || (()=>{})).call(app);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || (()=>{})).call(document);
      }
    });
  },

  _firstGesture() {
    AudioEngine.unlock();
  },

  _fire(action) {
    this._pressed[action] = true;
    SM.input(action, true);
  },

  _recalc() {
    this.x = (this.dirs.right ? 1 : 0) - (this.dirs.left ? 1 : 0);
    this.y = (this.dirs.down ? 1 : 0) - (this.dirs.up ? 1 : 0);
  },

  // Consumeix un flanc (true només una vegada per pulsació).
  pressed(action) {
    if (this._pressed[action]) { this._pressed[action] = false; return true; }
    return false;
  },

  clearPressed() { this._pressed = {}; },
};
