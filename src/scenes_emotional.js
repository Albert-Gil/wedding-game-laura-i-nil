/* =====================================================================
   ESCENES EMOCIONALS — Títol, Retrobament, Caminada final, Final
   + Pantalla d'assoliments.
   ===================================================================== */

// Cel de capvespre reutilitzable (Mas d'Osor)
function sunsetSky(ctx, camX, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#ff9e5e');
  g.addColorStop(0.35, '#ffb37a');
  g.addColorStop(0.6, '#f3a3a0');
  g.addColorStop(1, '#7d6f9c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // sol
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.beginPath(); ctx.arc(VW * 0.5 - camX * 0.1, VH * 0.42, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,220,0.25)';
  ctx.beginPath(); ctx.arc(VW * 0.5 - camX * 0.1, VH * 0.42, 40, 0, Math.PI * 2); ctx.fill();
  // turons llunyans
  ctx.fillStyle = 'rgba(90,70,110,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, VH * 0.62);
  for (let i = 0; i <= VW; i += 20) ctx.lineTo(i, VH * 0.6 + Math.sin((i + camX * 0.2) * 0.02) * 10);
  ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill();
}

// =====================================================================
//  TÍTOL — "SIMULACIÓ ACTIVADA / PREMEU START"
// =====================================================================
registerScene('title', () => {
  let t = 0, started = false, idleAch = false;
  const stars = [];
  for (let i = 0; i < 40; i++) stars.push({ x: U.rand(0, VW), y: U.rand(0, VH * 0.6), s: U.rand(0.5, 1.5), p: U.rand(0, 6) });
  return {
    enter() {
      AudioEngine.setTrack('title');
      State.visitedTitle = true;
      AudioEngine.sfx('powerup');
    },
    update(dt) {
      t += dt;
      if (t > 12 && !idleAch) { idleAch = true; Achievements.unlock('paciencia'); }
    },
    render(ctx) {
      // cel nocturn retro
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#1a1140'); g.addColorStop(1, '#3a1f4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      for (const s of stars) { ctx.globalAlpha = 0.4 + Math.sin(t * 2 + s.p) * 0.4; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
      ctx.globalAlpha = 1;
      // terra
      ctx.fillStyle = '#23304a'; ctx.fillRect(0, VH - 40, VW, 40);

      // títol gran
      drawCenter(ctx, 'SIMULACIÓ ACTIVADA', 40, { size: 9, color: '#7fe9ff' });
      // logotip cor
      drawCenter(ctx, 'LAURA      NIL', 64, { size: 22, color: '#fff', shadow: '#ff5a7a', sx: 2, sy: 2 });
      drawHeart(ctx, VW / 2, 60, 4, '#ff5a7a');
      drawCenter(ctx, 'una aventura de casament', 84, { size: 8, color: '#ffd166' });

      // herois al peu
      const bob = Math.sin(t * 3);
      drawHero(ctx, HEROES.nil, VW / 2 - 26, VH - 38 + bob, 'right', t, false);
      drawHero(ctx, HEROES.laura, VW / 2 + 26, VH - 38 - bob, 'left', t, false);
      drawHeart(ctx, VW / 2, VH - 56 + Math.sin(t * 2) * 2, 2, '#ff7a98');

      // PREMEU START
      if (Math.floor(t * 1.4) % 2 === 0)
        drawCenter(ctx, Input.hasTouch ? 'TOCA PER COMENÇAR' : 'PREMEU START', VH - 14, { size: 12, color: '#ffd166', shadow: '#000', sx: 1, sy: 1 });

      // pista assoliments
      drawText(ctx, Input.hasTouch ? 'B: Assoliments' : 'X: Assoliments', 6, VH - 8, { size: 7, color: 'rgba(255,255,255,0.5)' });
      drawText(ctx, Achievements.countUnlocked() + '/' + ACH_DEFS.length + ' ★', VW - 6, VH - 8, { size: 7, color: 'rgba(255,255,255,0.5)', align: 'right' });
    },
    onInput(a) {
      if (a === 'b') { SM.go('achievements', { from: 'title' }, 2.4); return; }
      if ((a === 'a' || a === 'tap' || a === 'any') && !started) {
        started = true; AudioEngine.sfx('confirm'); SM.go('level1', {}, 2.0);
      }
    },
  };
});

// =====================================================================
//  RETROBAMENT — Mas d'Osor + Jugador 2 connectat
// =====================================================================
registerScene('reunion', () => {
  let t = 0;
  let stage = 'walk'; // walk -> dialogue -> connect -> hold
  let nilX = -20;
  const lauraX = VW / 2 + 18;
  const nilTarget = VW / 2 - 18;
  let connectT = 0;
  const dlg = new DialogueBox();
  const parts = new Particles();

  return {
    enter() {
      AudioEngine.setTrack('love');
      Achievements.unlock('has_arribat');
    },
    update(dt) {
      t += dt; parts.update(dt);
      if (stage === 'walk') {
        nilX = U.lerp(nilX, nilTarget, dt * 2);
        if (nilX > nilTarget - 2) {
          nilX = nilTarget; stage = 'dialogue';
          dlg.show([
            { who: 'Laura', text: 'Has arribat.', color: '#e0607f' },
            { who: 'Nil', text: 'Ha valgut la pena.', color: '#3f7fd6' },
          ], () => { stage = 'connect'; connectT = 0; AudioEngine.sfx('connect'); Achievements.unlock('jugador2'); });
        }
      } else if (stage === 'dialogue') {
        dlg.update(dt);
      } else if (stage === 'connect') {
        connectT += dt;
        if (U.chance(0.2)) parts.burst(lauraX, VH - 34, ['#ffd166', '#ff7a98', '#fff', '#7fe9ff'], 6, { up: 30 });
        if (connectT > 3.4) SM.go('finalwalk', {}, 2.0);
      }
    },
    render(ctx) {
      sunsetSky(ctx, 0, t);
      // Mas d'Osor (mas de pedra)
      drawBuilding(ctx, VW / 2 - 55, VH - 44, 70, 40, '#c9b08a', '#7a4a3a');
      drawPine(ctx, 40, VH - 40, 1.4); drawPine(ctx, VW - 40, VH - 36, 1.2);
      // gespa
      ctx.fillStyle = '#6a8f5a'; ctx.fillRect(0, VH - 30, VW, 30);
      // arc de casament al centre-dreta
      drawArch(ctx, VW / 2 + 70, VH - 30);
      // rètol de la data
      ctx.fillStyle = '#5a3f2a'; ctx.fillRect(VW / 2 - 30, VH - 30, 2, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(VW / 2 - 46, VH - 48, 34, 14);
      drawText(ctx, '13.06.2026', VW / 2 - 29, VH - 41, { size: 7, color: '#c0143c', align: 'center' });

      // herois
      drawHero(ctx, HEROES.nil, nilX, VH - 30, 'right', t, stage === 'walk');
      if (stage === 'connect' || stage === 'dialogue' || stage === 'walk')
        drawHero(ctx, HEROES.laura, lauraX, VH - 30, 'left', t, false);

      parts.render(ctx, { x: 0, y: 0 });
      dlg.render(ctx);

      // JUGADOR 2 CONNECTAT
      if (stage === 'connect') {
        const a = U.clamp(connectT / 0.5, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, VH / 2 - 22, VW, 44);
        if (Math.floor(connectT * 4) % 2 === 0 || connectT > 1.2)
          drawCenter(ctx, 'JUGADOR 2 CONNECTAT', VH / 2 - 4, { size: 14, color: '#7fe9ff', shadow: '#003', sx: 1, sy: 1 });
        drawCenter(ctx, 'Laura s\'uneix a l\'aventura', VH / 2 + 12, { size: 8, color: '#ffd166' });
        ctx.globalAlpha = 1;
        // cor entre tots dos
        drawHeart(ctx, (nilX + lauraX) / 2, VH - 50 + Math.sin(t * 3) * 2, 3, '#ff5a7a');
      }
    },
    onInput(a) {
      if (stage === 'dialogue' && (a === 'a' || a === 'tap' || a === 'any')) dlg.advance();
    },
  };
});

// =====================================================================
//  CAMINADA FINAL — tots dos jugables, cap a l'altar
// =====================================================================
registerScene('finalwalk', () => {
  let t = 0;
  const world = { w: 760 };
  const nil = { x: 60, y: 150 };
  const laura = { x: 44, y: 156 };
  let facing = 'right';
  let cam = 0;
  const parts = new Particles();
  const archX = world.w - 70;
  let reached = false, reachT = 0;
  const banners = [
    { x: 180, text: 'Sant Nicolau Survivors', shown: false },
    { x: 330, text: 'Experts en Aventures', shown: false },
    { x: 480, text: 'Campions de la Planificació', shown: false },
    { x: 620, text: 'Millor Equip', shown: false },
  ];
  let curBanner = null, bannerT = 0;
  const petals = [];
  for (let i = 0; i < 24; i++) petals.push({ x: U.rand(0, VW), y: U.rand(-20, VH), v: U.rand(10, 24), sway: U.rand(0, 6), c: U.pick(['#ff9ec2', '#ffd166', '#fff', '#c39bff']) });

  return {
    enter() { AudioEngine.setTrack('love'); },
    update(dt) {
      t += dt; parts.update(dt);
      for (const p of petals) { p.y += p.v * dt; p.x += Math.sin(t + p.sway) * 6 * dt; if (p.y > VH + 10) { p.y = -10; p.x = U.rand(0, VW) + cam; } }

      if (!reached) {
        let dx = Input.x, dy = Input.y;
        if (dx || dy) {
          if (dx > 0) facing = 'right'; else if (dx < 0) facing = 'left';
          nil.x = U.clamp(nil.x + dx * 70 * dt, 20, world.w - 10);
          nil.y = U.clamp(nil.y + dy * 50 * dt, 120, 180);
        }
        // Laura segueix la Nil (de la maneta)
        laura.x = U.lerp(laura.x, nil.x - 16, dt * 4);
        laura.y = U.lerp(laura.y, nil.y + 6, dt * 4);

        cam = U.clamp(nil.x - VW / 2, 0, Math.max(0, world.w - VW));

        // banners pel camí
        for (const b of banners) {
          if (!b.shown && nil.x > b.x) { b.shown = true; curBanner = b.text; bannerT = 2.2; AudioEngine.sfx('select'); }
        }

        if (nil.x > archX - 10) {
          reached = true; reachT = 0;
          Achievements.unlock('equip');
          AudioEngine.sfx('win');
        }
      } else {
        reachT += dt;
        nil.x = U.lerp(nil.x, archX, dt * 3);
        laura.x = U.lerp(laura.x, archX - 12, dt * 3);
        if (U.chance(0.4)) parts.burst(U.rand(cam, cam + VW), U.rand(40, 120), ['#ff9ec2', '#ffd166', '#fff', '#7fe9ff', '#c39bff'], 8, { up: -20, grav: 60 });
        if (reachT > 3.0) SM.go('ending', {}, 2.4);
      }
      if (bannerT > 0) bannerT -= dt;
    },
    render(ctx) {
      sunsetSky(ctx, cam, t);
      // prat
      ctx.fillStyle = '#6a8f5a'; ctx.fillRect(0, VH - 60, VW, 60);
      // flors pel camí
      ctx.fillStyle = '#fff';
      for (let i = 0; i < world.w; i += 30) {
        const fx = i - cam; if (fx < -5 || fx > VW + 5) continue;
        ctx.fillStyle = ['#ff9ec2', '#ffd166', '#fff', '#c39bff'][i / 30 % 4 | 0];
        ctx.fillRect(fx, 175 + (i % 3) * 4, 2, 2);
      }
      // arbres
      drawPine(ctx, 120 - cam, 130, 1); drawPine(ctx, 420 - cam, 120, 1.2); drawPine(ctx, 300 - cam, 185);
      // arc al final
      drawArch(ctx, archX - cam, 175);
      // catifa cap a l'arc
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(0 - cam + 40, VH); ctx.lineTo(archX - cam - 8, 175); ctx.lineTo(archX - cam + 8, 175); ctx.lineTo(VW, VH); ctx.fill();

      // herois (ordre per y)
      const list = [{ h: HEROES.laura, x: laura.x, y: laura.y }, { h: HEROES.nil, x: nil.x, y: nil.y }].sort((a, b) => a.y - b.y);
      for (const e of list) drawHero(ctx, e.h, e.x - cam, e.y, facing, t, !reached && (Input.x || Input.y));
      // maneta (cor entre tots dos)
      drawHeart(ctx, (nil.x + laura.x) / 2 - cam, Math.min(nil.y, laura.y) - 22 + Math.sin(t * 3) * 1.5, 1.5, '#ff5a7a');

      // pètals
      for (const p of petals) { ctx.fillStyle = p.c; ctx.fillRect(p.x - cam % VW, p.y, 2, 2); }
      parts.render(ctx, { x: cam, y: 0 });

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, VW, 14);
      drawText(ctx, 'JUGADOR 1: Nil   JUGADOR 2: Laura', 6, 7, { size: 8, color: '#fff' });
      drawText(ctx, 'Camineu junts cap a l\'altar →', VW - 6, 7, { size: 8, color: '#ffd166', align: 'right' });

      if (bannerT > 0 && curBanner) {
        ctx.globalAlpha = U.clamp(bannerT, 0, 1);
        drawCenter(ctx, '★ ' + curBanner + ' ★', 30, { size: 10, color: '#ffd166', shadow: '#000' });
        ctx.globalAlpha = 1;
      }
      if (reached) drawCenter(ctx, '❤', VH / 2 - 30, { size: 20, color: '#ff5a7a' });
    },
    onInput() {},
  };
});

// =====================================================================
//  FINAL — seqüència de text
// =====================================================================
registerScene('ending', () => {
  let t = 0, idx = 0;
  const seq = [
    { lines: ['LAURA ❤ NIL'], size: 24, color: '#fff', hold: 2.6, sfx: 'heart' },
    { lines: ['MISSIÓ COMPLETADA'], size: 16, color: '#ffd166', hold: 2.4, sfx: 'win' },
    { lines: ['TUTORIAL COMPLETAT'], size: 14, color: '#7fe9ff', hold: 2.4 },
    { lines: ['MARRIAGE MODE', 'UNLOCKED'], size: 16, color: '#ff8aa6', hold: 3.0, sfx: 'powerup' },
    { lines: ['Jugador 1: Nil', 'Jugador 2: Laura', 'Vides restants: ∞'], size: 11, color: '#fff', hold: 3.2, mono: true },
    { lines: ['"La veritable aventura', 'comença ara."'], size: 13, color: '#ffd166', hold: 3.4 },
  ];
  const parts = new Particles();
  return {
    enter() { AudioEngine.setTrack('love'); AudioEngine.sfx('heart'); },
    update(dt) {
      t += dt; parts.update(dt);
      if (idx === 0 && U.chance(0.08)) parts.burst(U.rand(0, VW), VH + 5, ['#ff7a98', '#ffd166'], 3, { up: 40, grav: 30 });
      if (t > seq[idx].hold) {
        idx++;
        if (idx >= seq.length) { SM.go('returnos', {}, 2.4); return; }
        t = 0;
        if (seq[idx].sfx) AudioEngine.sfx(seq[idx].sfx);
      }
    },
    render(ctx) {
      ctx.fillStyle = '#08060f'; ctx.fillRect(0, 0, VW, VH);
      parts.render(ctx, { x: 0, y: 0 });
      const s = seq[idx];
      const a = U.clamp(t / 0.6, 0, 1) * U.clamp((s.hold - t) / 0.5, 0, 1);
      ctx.globalAlpha = a;
      const total = s.lines.length;
      s.lines.forEach((ln, i) => {
        const y = VH / 2 - (total - 1) * (s.size * 0.7) + i * (s.size + 4);
        drawCenter(ctx, ln, y, { size: s.size, color: s.color, shadow: 'rgba(0,0,0,0.6)', sx: 1, sy: 2 });
      });
      ctx.globalAlpha = 1;
      if (idx === 0) drawHeart(ctx, VW / 2, VH / 2 - 26, 3, '#ff5a7a');
    },
    onInput() {},
  };
});

// =====================================================================
//  PANTALLA D'ASSOLIMENTS
// =====================================================================
registerScene('achievements', () => {
  let from = 'title';
  let scroll = 0;
  return {
    enter(opts) { from = (opts && opts.from) || 'title'; AudioEngine.setTrack('title'); },
    update(dt) {
      scroll += Input.y * 60 * dt;
      const maxScroll = Math.max(0, ACH_DEFS.length * 22 - (VH - 50));
      scroll = U.clamp(scroll, 0, maxScroll);
    },
    render(ctx) {
      ctx.fillStyle = '#10131f'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#1a1f30'; ctx.fillRect(0, 0, VW, 20);
      drawText(ctx, 'ASSOLIMENTS', 8, 10, { size: 11, color: '#ffd166' });
      drawText(ctx, Achievements.countUnlocked() + '/' + ACH_DEFS.length, VW - 8, 10, { size: 10, color: '#8effc0', align: 'right' });

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 22, VW, VH - 40); ctx.clip();
      let y = 30 - scroll;
      for (const d of ACH_DEFS) {
        const got = Achievements.has(d.id);
        const hidden = d.hidden && !got;
        ctx.fillStyle = got ? 'rgba(120,255,180,0.10)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(6, y - 8, VW - 12, 20);
        drawText(ctx, got ? '★' : (d.hidden ? '?' : '☆'), 12, y + 2, { size: 11, color: got ? '#ffd166' : '#566' });
        drawText(ctx, hidden ? '???' : d.title, 26, y - 1, { size: 8, color: got ? '#fff' : '#8a93a3' });
        drawText(ctx, hidden ? 'Assoliment ocult' : d.desc, 26, y + 8, { size: 6, color: got ? '#9fe9c0' : '#5a6273' });
        y += 22;
      }
      ctx.restore();

      ctx.fillStyle = '#10131f'; ctx.fillRect(0, VH - 16, VW, 16);
      drawCenter(ctx, Input.hasTouch ? 'B: Tornar  ·  ▲▼: desplaçar' : 'X/ESC: Tornar  ·  ↑↓: desplaçar', VH - 8, { size: 7, color: 'rgba(255,255,255,0.55)' });
    },
    onInput(a) {
      if (a === 'b' || a === 'tap') { AudioEngine.sfx('select'); SM.go(from, {}, 2.4); }
    },
  };
});
