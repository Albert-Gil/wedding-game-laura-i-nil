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

      drawCenter(ctx, 'SIMULACIÓ ACTIVADA', fs(28), { size: 9, color: '#7fe9ff' });
      const logoY = fs(58);
      const logoPulse = 0.9 + Math.sin(t * 2) * 0.1;
      if (!Assets.drawLogo(ctx, VW / 2, logoY, fs(56), logoPulse)) {
        drawCenter(ctx, 'LAURA      NIL', logoY + fs(8), { size: 22, color: '#fff', shadow: '#ff5a7a', sx: 2, sy: 2 });
        drawHeart(ctx, VW / 2, logoY + fs(28), 6, '#ff5a7a');
      }
      drawCenter(ctx, 'una aventura de casament', fs(78), { size: 8, color: '#ffd166' });

      const bob = Math.sin(t * 3) * fs(2);
      drawHero(ctx, HEROES.nil, VW / 2 - fs(40), VH - fs(50) + bob, 'right', t, false);
      drawHero(ctx, HEROES.laura, VW / 2 + fs(40), VH - fs(50) - bob, 'left', t, false);
      drawHeart(ctx, VW / 2, VH - fs(72) + Math.sin(t * 2) * fs(2), 3, '#ff7a98');

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
        started = true; AudioEngine.resume(); AudioEngine.sfx('confirm'); SM.go('level1', {}, 2.0);
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
      AudioEngine.resume();
      AudioEngine.setTrack('wedding');
      Achievements.unlock('has_arribat');
    },
    update(dt) {
      t += dt; parts.update(dt);
      if (stage === 'walk') {
        nilX = U.lerp(nilX, nilTarget, dt * 3.2);
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
        const boxH = fs(52);
        const boxY = VH / 2 - boxH / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, boxY, VW, boxH);
        if (Math.floor(connectT * 4) % 2 === 0 || connectT > 1.2) {
          const block = drawCenterBlock(ctx, ['JUGADOR 2 CONNECTAT', 'Laura s\'uneix a l\'aventura'], VH / 2, {
            size: 12,
            lineColors: ['#7fe9ff', '#ffd166'],
            shadow: '#003',
            sx: 1,
            sy: 1,
          });
          drawHeart(ctx, (nilX + lauraX) / 2, block.top - fs(12) + Math.sin(t * 3) * fs(2), 4, '#ff5a7a');
        }
        ctx.globalAlpha = 1;
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
  const pw = expandPlayWorld(760, VH);
  const padX = pw.padX;
  const world = { w: pw.w };
  const nil = { x: 60 + padX, y: 150 };
  const laura = { x: 44 + padX, y: 156 };
  let facing = 'right';
  let cam = 0;
  const parts = new Particles();
  const archX = padX + 760 - 70;
  let reached = false, reachT = 0;
  const banners = [
    { x: 180 + padX, text: 'Sant Nicolau Survivors', shown: false },
    { x: 330 + padX, text: 'Experts en Aventures', shown: false },
    { x: 480 + padX, text: 'Campions de la Planificació', shown: false },
    { x: 620 + padX, text: 'Millor Equip', shown: false },
  ];
  let curBanner = null, bannerT = 0;
  let handWarnT = 0, handCooldown = 0, handAlt = false;
  let speech = null;
  const HAND_DIST = 40;
  const petals = [];
  for (let i = 0; i < 24; i++) {
    petals.push({
      x: U.rand(0, VW), y: U.rand(-20, VH), v: U.rand(10, 24), sway: U.rand(0, 6),
      c: U.pick(['#ff9ec2', '#ffd166', '#fff', '#c39bff']),
      letter: i % 2 ? 'n' : 'l',
    });
  }

  return {
    enter() {
      AudioEngine.resume();
      AudioEngine.setTrack('wedding');
    },
    update(dt) {
      t += dt; parts.update(dt);
      for (const p of petals) { p.y += p.v * dt; p.x += Math.sin(t + p.sway) * 6 * dt; if (p.y > VH + 10) { p.y = -10; p.x = U.rand(0, VW) + cam; } }

      if (!reached) {
        const m = playAreaMargin('walk');
        let dx = Input.x, dy = Input.y;
        if (dx || dy) {
          if (dx > 0) facing = 'right'; else if (dx < 0) facing = 'left';
          nil.x = U.clamp(nil.x + dx * HERO_SPEED_COOP * dt, m.left, world.w - m.right);
          nil.y = U.clamp(nil.y + dy * HERO_SPEED_COOP_Y * dt, m.top, VH - m.bottom);
        }
        // Laura segueix la Nil (de la maneta)
        laura.x = U.lerp(laura.x, nil.x - 16, dt * 4.6);
        laura.y = U.lerp(laura.y, nil.y + 6, dt * 4.6);

        const handDist = Math.hypot(nil.x - laura.x, nil.y - laura.y);
        if (handDist > HAND_DIST) {
          handWarnT += dt;
          if (handWarnT > 0.4 && handCooldown <= 0) {
            handCooldown = 4.8;
            handWarnT = 0;
            speech = handAlt
              ? { who: 'laura', text: 'Vaig tan ràpid com puc!', t: 2.8 }
              : { who: 'nil', text: 'Laura, espera\'m!', t: 2.8 };
            handAlt = !handAlt;
            AudioEngine.sfx('select');
          }
        } else {
          handWarnT = 0;
        }
        if (handCooldown > 0) handCooldown -= dt;
        if (speech) {
          speech.t -= dt;
          if (speech.t <= 0) speech = null;
        }

        cam = U.clamp(nil.x - VW / 2, 0, Math.max(0, world.w - VW));

        // banners pel camí
        for (const b of banners) {
          if (!b.shown && nil.x > b.x) { b.shown = true; curBanner = b.text; bannerT = 2.2; AudioEngine.sfx('select'); }
        }

        if (nil.x > archX - 10) {
          reached = true; reachT = 0;
          Achievements.unlock('equip');
          AudioEngine.sfx('win');
          parts.initialConfetti(archX, 138, 28, { spd: 95, up: 45 });
          parts.initialConfetti(nil.x, nil.y - fs(18), 18, { spd: 75, up: 55 });
          parts.initialConfetti(laura.x, laura.y - fs(18), 18, { spd: 75, up: 55 });
        }
      } else {
        reachT += dt;
        nil.x = U.lerp(nil.x, archX, dt * 3);
        laura.x = U.lerp(laura.x, archX - 12, dt * 3);
        if (U.chance(0.45)) {
          parts.initialConfetti(U.rand(cam + 20, cam + VW - 20), U.rand(24, 110), 5, { up: -15, grav: 48, spd: 58, life: 1.4 });
        }
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
      drawHeart(ctx, (nil.x + laura.x) / 2 - cam, Math.min(nil.y, laura.y) - fs(22) + Math.sin(t * 3) * fs(2), 3, '#ff5a7a');
      if (speech && speech.t > 0) {
        const sp = speech.who === 'nil' ? nil : laura;
        const sx = sp.x - cam;
        const sy = sp.y - fs(26);
        const col = speech.who === 'nil' ? '#3f7fd6' : '#e0607f';
        const tw = fs(92);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(sx - tw / 2, sy - fs(10), tw, fs(16));
        drawText(ctx, speech.text, sx, sy, { size: 7, color: col, align: 'center', shadow: '#000' });
      }

      // pètals / confeti d'inicials
      for (const p of petals) {
        const px = p.x - cam % VW;
        if (reached) {
          ctx.font = `bold ${fs(7)}px Georgia, "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = p.c;
          ctx.fillText(p.letter, px, p.y);
        } else {
          ctx.fillStyle = p.c;
          ctx.fillRect(px, p.y, 2, 2);
        }
      }
      parts.render(ctx, { x: cam, y: 0 });

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, VW, fs(14));
      drawText(ctx, 'JUGADOR 1: Nil   JUGADOR 2: Laura', 6, 7, { size: 8, color: '#fff' });
      drawText(ctx, 'Camineu junts cap a l\'altar →', VW - 6, 7, { size: 8, color: '#ffd166', align: 'right' });

      if (bannerT > 0 && curBanner) {
        ctx.globalAlpha = U.clamp(bannerT, 0, 1);
        drawCenter(ctx, '★ ' + curBanner + ' ★', fs(22), { size: 9, color: '#ffd166', shadow: '#000' });
        ctx.globalAlpha = 1;
      }
      if (reached) drawCenter(ctx, '❤', VH / 2 - fs(36), { size: 16, color: '#ff5a7a' });
    },
    onInput() {},
  };
});

// =====================================================================
//  FINAL — seqüència de text
// =====================================================================
registerScene('ending', () => {
  let t = 0, idx = 0, leaving = false;
  const seq = [
    { lines: ['LAURA ❤ NIL'], size: 24, color: '#fff', hold: 2.6, sfx: 'heart' },
    { lines: ['MISSIÓ COMPLETADA'], size: 16, color: '#ffd166', hold: 2.4, sfx: 'win' },
    { lines: ['Que sigueu molt feliços'], size: 16, color: '#ff8aa6', hold: 3.2, sfx: 'heart' },
    { lines: ['MARRIAGE MODE', 'UNLOCKED'], size: 16, color: '#ff8aa6', hold: 3.0, sfx: 'powerup' },
    { lines: ['Jugador 1: Nil', 'Jugador 2: Laura', 'Vides restants: ∞'], size: 11, color: '#fff', hold: 3.2, mono: true },
    { lines: ['"La veritable aventura', 'comença ara."'], size: 13, color: '#ffd166', hold: 3.4 },
  ];
  const parts = new Particles();

  function goToReturnOS() {
    if (leaving) return;
    leaving = true;
    SM.go('credits', {}, 2.4);
  }

  function advanceSlide() {
    if (leaving) return;
    idx++;
    if (idx >= seq.length) { goToReturnOS(); return; }
    t = 0;
    if (seq[idx].sfx) AudioEngine.sfx(seq[idx].sfx);
  }

  return {
    enter() {
      leaving = false; idx = 0; t = 0;
      AudioEngine.setTrack('weddingEnd'); AudioEngine.sfx('heart');
    },
    update(dt) {
      if (leaving) return;
      t += dt; parts.update(dt);
      if (idx === 0 && U.chance(0.08)) parts.burst(U.rand(0, VW), VH + 5, ['#ff7a98', '#ffd166'], 3, { up: 40, grav: 30 });
      if (idx < seq.length && t > seq[idx].hold) advanceSlide();
    },
    render(ctx) {
      ctx.fillStyle = '#08060f'; ctx.fillRect(0, 0, VW, VH);
      parts.render(ctx, { x: 0, y: 0 });
      if (leaving || idx >= seq.length) return;
      const s = seq[idx];
      const a = U.clamp(t / 0.6, 0, 1) * U.clamp((s.hold - t) / 0.5, 0, 1);
      ctx.globalAlpha = a;
      if (idx === 0 && Assets.drawLogo(ctx, VW / 2, VH / 2 - fs(20), fs(72), a)) {
        drawCenter(ctx, '13.06.2026', VH / 2 + fs(36), { size: 10, color: 'rgba(255,255,255,0.55)' });
      } else {
        const block = drawCenterBlock(ctx, s.lines, VH / 2, {
          size: s.size,
          color: s.color,
          shadow: 'rgba(0,0,0,0.6)',
          sx: 1,
          sy: 2,
        });
        if (idx === 0) drawHeart(ctx, VW / 2, block.top - fs(16), 6, '#ff5a7a');
      }
      ctx.globalAlpha = 1;
      if (idx === seq.length - 1 && Math.floor(t * 1.4) % 2 === 0) {
        const promptY = VH - fs(16);
        drawCenter(ctx, Input.hasTouch ? 'Toca per continuar' : 'Prem qualsevol tecla', promptY, { size: 7, color: 'rgba(255,255,255,0.45)' });
      }
    },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') {
        if (idx >= seq.length - 1 && t > 0.5) goToReturnOS();
        else if (t > 0.3) advanceSlide();
      }
    },
  };
});

// =====================================================================
//  CRÈDITS FINALS — foto lo-fi + firma
// =====================================================================
registerScene('credits', () => {
  let t = 0;
  let lofi = null;

  function buildLofiImage() {
    const img = Assets.images.creditsPhoto;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const out = document.createElement('canvas');
    out.width = 96;
    out.height = 96;
    const c = out.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(img, 0, 0, out.width, out.height);
    const id = c.getImageData(0, 0, out.width, out.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114));
      const tone = Math.round(g * 0.88 + 12);
      d[i] = tone;
      d[i + 1] = Math.round(tone * 0.92);
      d[i + 2] = Math.round(tone * 0.8);
    }
    c.putImageData(id, 0, 0);
    return out;
  }

  return {
    enter() {
      t = 0;
      AudioEngine.setTrack('weddingEnd');
      lofi = buildLofiImage();
    },
    update(dt) {
      t += dt;
    },
    render(ctx) {
      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, VW, VH);
      const a = U.clamp(t / 0.8, 0, 1);
      const w = fs(180), h = fs(180), x = Math.round(VW / 2 - w / 2), y = Math.round(VH / 2 - h / 2 - fs(18));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#111';
      ctx.fillRect(x - fs(4), y - fs(4), w + fs(8), h + fs(8));
      ctx.imageSmoothingEnabled = false;
      if (lofi) ctx.drawImage(lofi, x, y, w, h);
      else Assets.drawCreditsPhoto(ctx, x, y, w, h, a);
      ctx.globalAlpha = a * 0.2;
      for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
      ctx.restore();
      drawCenter(ctx, '(c) Unihevo Creations, 2026', y + h + fs(22), { size: 9, color: '#d9d2c3' });
      if (Math.floor(t * 1.8) % 2 === 0) {
        drawCenter(ctx, Input.hasTouch ? 'Toca per sortir' : 'Prem qualsevol tecla', VH - fs(14), { size: 7, color: 'rgba(255,255,255,0.45)' });
      }
    },
    onInput(a) {
      if (a === 'any' || a === 'tap' || a === 'a') SM.go('returnos', {}, 2.0);
    },
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
      const maxScroll = Math.max(0, ACH_DEFS.length * 26 - (VH - 50));
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
        ctx.fillRect(6, y - 8, VW - 12, 24);
        drawText(ctx, got ? '★' : (d.hidden ? '?' : '☆'), 12, y + 2, { size: 11, color: got ? '#ffd166' : '#566' });
        drawText(ctx, hidden ? '???' : d.title, 26, y - 1, { size: 8, color: got ? '#fff' : '#8a93a3' });
        drawText(ctx, hidden ? 'Assoliment ocult' : d.desc, 26, y + 9, { size: 6, color: got ? '#9fe9c0' : '#5a6273' });
        y += 26;
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
