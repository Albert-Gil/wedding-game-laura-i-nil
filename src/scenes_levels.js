/* =====================================================================
   MOTOR TOP-DOWN + NIVELLS 1..4
   Moviment, col·lisions, recol·lecció, perills, objectiu i sortida.
   ===================================================================== */

// Crea una escena de nivell a partir d'una configuració.
function createLevel(cfg) {
  return () => {
    const pw = expandPlayWorld(cfg.world.w, cfg.world.h);
    const padX = pw.padX;
    const padY = pw.padY;
    const world = { w: pw.w, h: pw.h };
    const contentWorld = { w: cfg.world.w, h: cfg.world.h };
    const parts = new Particles();
    const floaters = []; // textos flotants ("Cafè +20")
    let cam = { x: 0, y: 0 };
    let t = 0;
    let intro = 2.6;
    let shake = 0;
    let goalReached = false;
    let completing = false;
    let gameOver = false;
    const dlg = new DialogueBox();
    const defaultDmg = cfg.defaultDmg != null ? cfg.defaultDmg : 20;
    const spdMul = cfg.hazardSpdMul || 1;

    const player = {
      x: (cfg.start ? cfg.start.x : 60) + padX,
      y: (cfg.start ? cfg.start.y : cfg.world.h / 2) + padY,
      facing: 'down', moving: false,
      speed: cfg.speed || HERO_SPEED,
      energy: 100,
      invuln: 0,
      w: fs(10), h: fs(7),
    };

    function cloneItems() {
      return cfg.items.map(o => Object.assign({ bob: U.rand(0, 6), got: false }, o, { x: o.x + padX, y: o.y + padY }));
    }
    function cloneHazards() {
      return (cfg.hazards || []).map(o => Object.assign({
        bob: U.rand(0, 6), dir: U.rand(0, Math.PI * 2), near: false,
        t: U.rand(0, 6),
      }, o, { x: o.x + padX, y: o.y + padY, hx: o.x + padX, hy: o.y + padY }));
    }
    const obstacles = (cfg.obstacles || []).map(o => ({ x: o.x + padX, y: o.y + padY, w: o.w, h: o.h }));
    const decor = (cfg.decor || []).map(d => {
      const c = Object.assign({}, d);
      if (c.x != null) c.x += padX;
      if (c.y != null) c.y += padY;
      return c;
    });
    let items = cloneItems();
    let hazards = cloneHazards();
    let collected = 0;
    const goal = cfg.goal != null ? cfg.goal : items.filter(i => i.count !== false).length;

    let endNPC = cfg.endNPC ? Object.assign({}, cfg.endNPC, {
      appear: 0,
      x: cfg.endNPC.x + padX,
      y: cfg.endNPC.y + padY,
    }) : null;
    let exitGate = cfg.exit ? Object.assign({ glow: 0 }, cfg.exit, {
      x: cfg.exit.x + padX,
      y: cfg.exit.y + padY,
    }) : null;

    function rectOf(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }

    function tryMove(dx, dy) {
      // eix X
      player.x += dx;
      let pr = rectOf(player);
      for (const o of obstacles) {
        if (U.aabb(pr, o)) {
          if (dx > 0) player.x = o.x - player.w / 2;
          else if (dx < 0) player.x = o.x + o.w + player.w / 2;
          pr = rectOf(player);
        }
      }
      // eix Y
      player.y += dy;
      pr = rectOf(player);
      for (const o of obstacles) {
        if (U.aabb(pr, o)) {
          if (dy > 0) player.y = o.y;
          else if (dy < 0) player.y = o.y + o.h + player.h;
          pr = rectOf(player);
        }
      }
      const m = playAreaMargin('level');
      player.x = U.clamp(player.x, m.left, world.w - m.right);
      player.y = U.clamp(player.y, m.top, world.h - m.bottom);
    }

    function floater(text, x, y, color) {
      floaters.push({ text, x, y, vy: -22, t: 1.2, color: color || '#fff' });
    }

    function onCollect(it) {
      it.got = true;
      AudioEngine.sfx(it.big ? 'star' : 'pickup');
      parts.burst(it.x, it.y - 8, it.pc || ['#ffd166', '#fff', '#8effc0'], 12, { up: 30 });
      if (it.count !== false) { collected++; }
      if (it.float) floater(it.float, it.x, it.y - 14, it.fc || '#ffd166');
      if (cfg.onItem) cfg.onItem(it, { floater, collected, goal });
      if (it.ach) Achievements.unlock(it.ach);
      if (it.anthem === 'sabadell' && window.Assets) Assets.playSabadellHimne();
      checkGoal();
    }

    function checkGoal() {
      if (goalReached) return;
      if (collected >= goal) {
        goalReached = true;
        AudioEngine.sfx('powerup');
        if (endNPC) endNPC.appearing = true;
      }
    }

    function complete() {
      if (completing) return;
      completing = true;
      AudioEngine.sfx('win');
      if (cfg.ach) Achievements.unlock(cfg.ach);
      SM.go(cfg.next, cfg.nextOpts || {}, 1.6);
    }

    function triggerGameOver() {
      if (gameOver || completing) return;
      gameOver = true;
      player.energy = 0;
      AudioEngine.sfx('hurt');
    }

    function resetLevel(playSfx) {
      gameOver = false;
      completing = false;
      goalReached = false;
      collected = 0;
      floaters.length = 0;
      shake = 0;
      intro = 0;
      player.x = (cfg.start ? cfg.start.x : 60) + padX;
      player.y = (cfg.start ? cfg.start.y : cfg.world.h / 2) + padY;
      player.energy = 100;
      player.invuln = playSfx ? 1.5 : 0;
      player.facing = 'down';
      items = cloneItems();
      hazards = cloneHazards();
      if (endNPC) { endNPC.appear = 0; endNPC.appearing = false; }
      if (exitGate) exitGate.glow = 0;
      dlg.active = false;
      dlg.line = null;
      dlg.queue = [];
      if (playSfx) AudioEngine.sfx('select');
    }

    return {
      enter() {
        if (cfg.musicFile === 'wedding' && window.Assets) {
          AudioEngine.stopChiptune();
          Assets.playWeddingMarch();
        } else {
          AudioEngine.setTrack(cfg.track);
        }
        AudioEngine.resume();
        resetLevel(false);
        intro = 2.6;
      },
      update(dt) {
        t += dt;
        parts.update(dt);
        if (shake > 0) shake -= dt;
        for (const f of floaters) { f.t -= dt; f.y += f.vy * dt; }
        if (floaters.length) for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t <= 0) floaters.splice(i, 1);

        if (dlg.active) { dlg.update(dt); return; }
        if (gameOver) return;

        if (intro > 0) { intro -= dt; }

        let dx = Input.x, dy = Input.y;
        if (dx && dy) { const inv = 1 / Math.sqrt(2); dx *= inv; dy *= inv; }
        player.moving = (dx !== 0 || dy !== 0);
        if (dx > 0) player.facing = 'right'; else if (dx < 0) player.facing = 'left';
        else if (dy > 0) player.facing = 'down'; else if (dy < 0) player.facing = 'up';
        if (player.moving) tryMove(dx * player.speed * dt, dy * player.speed * dt);

        if (player.invuln > 0) player.invuln -= dt;

        // càmera
        cam.x = U.clamp(player.x - VW / 2, 0, Math.max(0, world.w - VW));
        cam.y = U.clamp(player.y - VH / 2 - 10, 0, Math.max(0, world.h - VH));

        // ítems
        for (const it of items) {
          if (it.got) continue;
          it.bob += dt;
          if (U.dist(player.x, player.y - fs(6), it.x, it.y - fs(6)) < (it.r || fs(13))) onCollect(it);
        }

        // perills
        for (const h of hazards) {
          h.t += dt; h.bob += dt;
          updateHazard(h, dt);
          const d = U.dist(player.x, player.y - fs(6), h.x, h.y - fs(6));
          if (d < fs(26)) {
            if (!h.near) h.near = true;
          } else if (h.near && d > fs(34)) {
            h.near = false;
            if (cfg.countDodges) { State.examsDodged++; if (State.examsDodged >= 8) Achievements.unlock('examens'); }
          }
          if (d < (h.r || fs(12)) && player.invuln <= 0) {
            player.invuln = 1.4;
            const dmg = h.dmg != null ? h.dmg : defaultDmg;
            player.energy = Math.max(0, player.energy - dmg);
            shake = 0.3;
            AudioEngine.sfx('hurt');
            parts.burst(player.x, player.y - 8, ['#ff6b6b', '#fff'], 8, { up: 20 });
            const ang = Math.atan2(player.y - h.y, player.x - h.x);
            tryMove(Math.cos(ang) * 14, Math.sin(ang) * 14);
            if (h.float) floater(h.float, player.x, player.y - 18, '#ff8a8a');
            if (cfg.onHazard) cfg.onHazard(h, { floater });
            if (player.energy <= 0) triggerGameOver();
          }
        }

        function updateHazard(h, dt) {
          const sp = (h.spd || 26) * spdMul;
          if (h.behavior === 'chase') {
            const ang = Math.atan2(player.y - h.y, player.x - h.x);
            h.x += Math.cos(ang) * sp * dt; h.y += Math.sin(ang) * sp * dt;
          } else if (h.behavior === 'patrolX') {
            h.x = h.hx + Math.sin(h.t * (h.freq || 1)) * (h.range || 50);
          } else if (h.behavior === 'patrolY') {
            h.y = h.hy + Math.sin(h.t * (h.freq || 1)) * (h.range || 40);
          } else { // wander
            if (U.chance(0.01)) h.dir = U.rand(0, Math.PI * 2);
            h.x += Math.cos(h.dir) * sp * dt; h.y += Math.sin(h.dir) * sp * dt;
            if (h.x < 12 || h.x > world.w - 12) h.dir = Math.PI - h.dir;
            if (h.y < 20 || h.y > world.h - 8) h.dir = -h.dir;
          }
          h.x = U.clamp(h.x, 12, world.w - 12);
          h.y = U.clamp(h.y, 20, world.h - 8);
        }

        // NPC final
        if (endNPC && endNPC.appearing) {
          endNPC.appear = Math.min(1, endNPC.appear + dt * 1.5);
          if (U.dist(player.x, player.y, endNPC.x, endNPC.y) < 22 && !completing && !dlg.active) {
            dlg.show(endNPC.dialogue, () => complete());
          }
        }
        // Porta de sortida
        if (exitGate && goalReached) {
          exitGate.glow += dt;
          if (U.dist(player.x, player.y, exitGate.x, exitGate.y) < 16 && !completing) {
            complete();
          }
        }
      },

      render(ctx) {
        const sx = shake > 0 ? U.randInt(-2, 2) : 0;
        const sy = shake > 0 ? U.randInt(-2, 2) : 0;
        const camX = cam.x - sx, camY = cam.y - sy;

        // fons
        cfg.drawBg(ctx, { x: camX - padX, y: camY - padY }, t, contentWorld);

        // recollir entitats per ordenar per profunditat (y)
        const ents = [];
        for (const d of decor) ents.push({ y: d.y, kind: 'decor', d });
        for (const it of items) if (!it.got) ents.push({ y: it.y, kind: 'item', it });
        for (const h of hazards) ents.push({ y: h.y, kind: 'haz', h });
        if (endNPC && endNPC.appear > 0) ents.push({ y: endNPC.y, kind: 'npc' });
        if (exitGate && goalReached) ents.push({ y: exitGate.y, kind: 'gate' });
        ents.push({ y: player.y, kind: 'player' });
        ents.sort((a, b) => a.y - b.y);

        for (const e of ents) {
          if (e.kind === 'decor') drawDecor(ctx, e.d, camX, camY);
          else if (e.kind === 'item') {
            const it = e.it;
            const yy = it.y - camY - 8 + Math.sin(it.bob * 3) * 2;
            // brillantor
            ctx.globalAlpha = 0.3 + Math.sin(it.bob * 3) * 0.1;
            ctx.fillStyle = it.pc ? (Array.isArray(it.pc) ? it.pc[0] : it.pc) : '#ffe9a0';
            ctx.beginPath(); ctx.arc(it.x - camX, yy, (it.big ? 11 : 8), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            drawEmoji(ctx, it.emoji, it.x - camX, yy, it.size || (it.big ? 18 : 14));
          }
          else if (e.kind === 'haz') {
            const h = e.h;
            const yy = h.y - camY - 6 + Math.sin(h.bob * 4) * 1.5;
            ctx.fillStyle = 'rgba(255,60,60,0.18)';
            ctx.beginPath(); ctx.arc(h.x - camX, yy, 9, 0, Math.PI * 2); ctx.fill();
            drawEmoji(ctx, h.emoji, h.x - camX, yy, h.size || 15);
          }
          else if (e.kind === 'npc') {
            ctx.globalAlpha = endNPC.appear;
            drawHero(ctx, HEROES[endNPC.hero], endNPC.x - camX, endNPC.y - camY, endNPC.facing || 'down', t, false);
            ctx.globalAlpha = 1;
            // cor sobre el cap
            const hy = endNPC.y - camY - 30 + Math.sin(t * 3) * 2;
            drawHeart(ctx, endNPC.x - camX, hy, 2, '#ff7a98');
          }
          else if (e.kind === 'gate') {
            const g = exitGate;
            const pulse = 0.5 + Math.sin(g.glow * 4) * 0.5;
            ctx.globalAlpha = 0.4 + pulse * 0.3;
            ctx.fillStyle = '#ffd166';
            ctx.beginPath(); ctx.arc(g.x - camX, g.y - camY - 10, 12, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            drawEmoji(ctx, g.emoji || '➡', g.x - camX, g.y - camY - 10, 18);
          }
          else if (e.kind === 'player') {
            const blink = player.invuln > 0 && player.invuln < 1.5 && Math.floor(t * 16) % 2 === 0;
            if (!blink) drawHero(ctx, HEROES[cfg.hero || 'nil'], player.x - camX, player.y - camY, player.facing, t, player.moving);
          }
        }

        // textos flotants
        for (const f of floaters) {
          ctx.globalAlpha = U.clamp(f.t, 0, 1);
          drawText(ctx, f.text, f.x - camX, f.y - camY, { size: 9, color: f.color, align: 'center', shadow: '#000' });
          ctx.globalAlpha = 1;
        }

        parts.render(ctx, { x: camX, y: camY });

        // ---- HUD ----
        drawLevelHUD(ctx, cfg, collected, goal, player, goalReached);

        // banner d'introducció
        if (intro > 0) {
          const a = U.clamp(Math.min(intro, 2.6 - intro) / 0.5, 0, 1);
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(0, VH / 2 - fs(24), VW, fs(48));
          drawCenterBlock(ctx, [cfg.banner, cfg.introSub || cfg.subtitle], VH / 2, {
            size: 12,
            lineColors: ['#fff', cfg.hudColor || '#8effc0'],
            shadow: '#000',
            sx: 1,
            sy: 1,
          });
          ctx.globalAlpha = 1;
        }

        // missatge d'objectiu complert
        if (goalReached && !completing) {
          if (Math.floor(t * 1.5) % 2 === 0)
            drawCenter(ctx, cfg.goalDoneHint || (endNPC ? '→ Troba la sortida!' : '→ Ves a la sortida!'), 24, { size: 9, color: '#ffd166', shadow: '#000' });
        }

        dlg.render(ctx);

        if (gameOver) drawGameOverOverlay(ctx);
      },

      onInput(a) {
        if (gameOver && (a === 'a' || a === 'tap' || a === 'any')) { resetLevel(true); return; }
        if (dlg.active && (a === 'a' || a === 'tap' || a === 'any')) { dlg.advance(); return; }
      },
    };
  };
}

// HUD comú dels nivells
function drawLevelHUD(ctx, cfg, collected, goal, player, goalReached) {
  const hudH = fs(14);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, VW, hudH);
  drawText(ctx, cfg.subtitle, fs(6), fs(7), { size: 8, color: cfg.hudColor || '#8effc0' });
  const label = `${cfg.tokenEmoji || '★'} ${collected}/${goal}`;
  drawText(ctx, label, VW - fs(6), fs(7), { size: 9, color: goalReached ? '#ffd166' : '#fff', align: 'right' });
  const ew = fs(40), ex = VW / 2 - ew / 2, ey = fs(4);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(ex, ey, ew, fs(5));
  ctx.fillStyle = player.energy > 35 ? '#7fe98a' : '#ff7a7a';
  ctx.fillRect(ex, ey, ew * (player.energy / 100), fs(5));
  drawText(ctx, 'ENERGIA', ex - fs(4), fs(7), { size: 6, color: 'rgba(255,255,255,0.6)', align: 'right' });
}

function drawGameOverOverlay(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, VW, VH);
  const block = drawCenterBlock(ctx, ['ENERGIA ESGOTADA', 'Has perdut tota l\'energia.'], VH / 2 - fs(12), {
    size: 14,
    lineColors: ['#ff7a7a', '#fff'],
    shadow: '#000',
    sx: 1,
    sy: 1,
  });
  if (Math.floor(performance.now() / 600) % 2 === 0) {
    drawCenter(ctx, Input.hasTouch ? 'Toca per tornar a començar' : 'Prem A / Enter per tornar a començar', block.bottom + fs(20), { size: 9, color: '#ffd166' });
  }
  drawCenter(ctx, '(sense regeneració d\'energia)', block.bottom + fs(38), { size: 7, color: 'rgba(255,255,255,0.45)' });
}

// Dibuix de decorats segons tipus
function drawDecor(ctx, d, camX, camY) {
  const x = d.x - camX, y = d.y - camY;
  switch (d.type) {
    case 'tree': drawTree(ctx, x, y, d.scale || 1); break;
    case 'pine': drawPine(ctx, x, y, d.scale || 1); break;
    case 'building': drawBuilding(ctx, x - (d.w || 60) / 2, y, d.w || 60, d.h || 50, d.wall || '#d9c39a', d.roof || '#a85b3c'); break;
    case 'rock': ctx.fillStyle = d.c || '#8a8f99'; ctx.beginPath(); ctx.ellipse(x, y - 4, 8 * (d.scale || 1), 6 * (d.scale || 1), 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(x - 2, y - 6, 3 * (d.scale || 1), 2, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'sign': ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 1, y - 12, 2, 12); ctx.fillStyle = d.c || '#3f7fd6'; ctx.fillRect(x - 14, y - 22, 28, 11); drawText(ctx, d.text || '', x, y - 16, { size: 6, color: '#fff', align: 'center' }); break;
    case 'flower': ctx.fillStyle = d.c || '#ff7a98'; ctx.fillRect(x - 1, y - 3, 2, 3); ctx.fillStyle = '#3aae62'; ctx.fillRect(x, y, 1, 2); break;
    case 'tent': ctx.fillStyle = d.c || '#e0607f'; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x, y - 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x, y - 14); ctx.closePath(); ctx.fill(); break;
    case 'desk': ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 12, y - 8, 24, 8); ctx.fillStyle = '#9fb4c9'; ctx.fillRect(x - 8, y - 14, 12, 7); break;
    case 'umbrella': ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 1, y - 14, 2, 14); ctx.fillStyle = d.c || '#ff7a52'; ctx.beginPath(); ctx.arc(x, y - 14, 12, Math.PI, 0); ctx.fill(); break;
  }
}

// =====================================================================
//  Fons dels nivells
// =====================================================================
function grassBg(ctx, cam, t, world, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // textura de gespa (punts) en coordenades de món
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const step = 24;
  const ox = -(cam.x % step), oy = -(cam.y % step);
  for (let x = ox; x < VW; x += step) for (let y = oy; y < VH; y += step) {
    ctx.fillRect(x + 6, y + 10, 2, 1); ctx.fillRect(x + 14, y + 18, 1, 1);
  }
}

// =====================================================================
//  NIVELL 1 — SANT NICOLAU
// =====================================================================
registerScene('level1', createLevel({
  hero: 'nil',
  track: 'school',   // pati d'escola, juganer
  banner: 'NIVELL 1', subtitle: 'SANT NICOLAU', introSub: "ELS ANYS D'ESCOLA",
  hudColor: '#ffd166', tokenEmoji: '🤝',
  world: { w: 660, h: 440 },
  start: { x: 60, y: 380 },
  goal: 6, countDodges: true, defaultDmg: 22, hazardSpdMul: 1.15,
  ach: 'sant_nicolau',
  next: 'level2',
  drawBg: (ctx, cam, t, world) => {
    grassBg(ctx, cam, t, world, '#7ec850', '#5aa83e');
    // pista de joc (sorra)
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(120 - cam.x, 60 - cam.y, 220, 120);
  },
  decor: [
    { type: 'building', x: 330, y: 70, w: 150, h: 60, wall: '#e6d2a8', roof: '#b5523c' },
    { type: 'sign', x: 330, y: 120, text: 'SANT NICOLAU', c: '#c0392b' },
    { type: 'tree', x: 70, y: 120 }, { type: 'tree', x: 600, y: 150, scale: 1.2 },
    { type: 'tree', x: 560, y: 380 }, { type: 'tree', x: 110, y: 250 },
    { type: 'flower', x: 200, y: 300, c: '#ffd166' }, { type: 'flower', x: 210, y: 305, c: '#ff7a98' },
    { type: 'flower', x: 420, y: 360, c: '#fff' }, { type: 'flower', x: 430, y: 365, c: '#c39bff' },
    // Easter egg: pista de futbol de Sabadell
    { type: 'sign', x: 600, y: 300, text: 'GOL SUD', c: '#1b6fb3' },
  ],
  obstacles: [
    { x: 255, y: 20, w: 150, h: 52 }, // edifici escola
  ],
  items: [
    { x: 180, y: 260, emoji: '🤝', float: 'Amistat +1', pc: ['#ffd166'] },
    { x: 470, y: 230, emoji: '⭐', float: 'Amistat +1', pc: ['#ffd166'] },
    { x: 250, y: 360, emoji: '🤝', float: 'Amistat +1', pc: ['#ffd166'] },
    { x: 540, y: 110, emoji: '⭐', float: 'Amistat +1', pc: ['#ffd166'] },
    { x: 110, y: 180, emoji: '🤝', float: 'Amistat +1', pc: ['#ffd166'] },
    { x: 420, y: 390, emoji: '⭐', float: 'Amistat +1', pc: ['#ffd166'] },
    // Easter egg ocult (no compta per l'objectiu)
    { x: 610, y: 300, emoji: '⚽', count: false, float: 'Visca el Sabadell!', fc: '#1b6fb3', ach: 'sabadell', anthem: 'sabadell', pc: ['#1b6fb3'] },
  ],
  hazards: [
    { x: 300, y: 200, emoji: '📚', behavior: 'patrolX', range: 95, freq: 1.0, float: 'Deures!' },
    { x: 420, y: 300, emoji: '📝', behavior: 'wander', spd: 34, float: 'Examen!' },
    { x: 200, y: 150, emoji: '📝', behavior: 'wander', spd: 32, float: 'Examen!' },
    { x: 480, y: 380, emoji: '😴', behavior: 'patrolY', range: 60, freq: 1.2, float: 'Dilluns...' },
    { x: 350, y: 320, emoji: '⏰', behavior: 'patrolX', range: 70, freq: 1.1, float: 'Examens!' },
  ],
  onItem: (it, ctx) => {
    if (ctx.collected >= ctx.goal) Achievements.unlock('antic_alumne');
  },
  endNPC: {
    hero: 'laura', x: 330, y: 200, facing: 'down',
    dialogue: [
      { who: 'Laura', text: 'Hola.', color: '#e0607f' },
      { who: 'Nil', text: 'Hola.', color: '#3f7fd6' },
      "Cap dels dos ho sabia encara...",
      "però aquesta història acabava de començar.",
    ],
  },
  goalDoneHint: '→ Has trobat la Laura?',
}));

// =====================================================================
//  NIVELL 2 — ELS ANYS D'AVENTURES
// =====================================================================
registerScene('level2', createLevel({
  hero: 'nil',
  track: 'adventure', // muntanya, mar, èpic
  banner: 'NIVELL 2', subtitle: "ANYS D'AVENTURES", introSub: "ELS ANYS D'AVENTURES",
  hudColor: '#7fe9ff', tokenEmoji: '🏔',
  world: { w: 820, h: 460 },
  start: { x: 50, y: 430 },
  goal: 5, defaultDmg: 24, hazardSpdMul: 1.2,
  ach: 'exploradors',
  next: 'level3',
  drawBg: (ctx, cam, t, world) => {
    // cel degradat segons l'alçada (capvespre a dalt)
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#ffb37a'); g.addColorStop(0.4, '#9fd0e6'); g.addColorStop(1, '#6fa86a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // muntanyes (zona superior-dreta)
    ctx.fillStyle = '#8a9bb5';
    for (let i = 0; i < 4; i++) {
      const mx = 480 + i * 90 - cam.x; const my = 120 - cam.y;
      ctx.beginPath(); ctx.moveTo(mx - 60, my); ctx.lineTo(mx, my - 80); ctx.lineTo(mx + 60, my); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx - 16, my - 58); ctx.lineTo(mx, my - 80); ctx.lineTo(mx + 16, my - 58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a9bb5';
    }
    // llac (zona inferior-esquerra) caiac
    ctx.fillStyle = '#4fa3c7';
    ctx.fillRect(20 - cam.x, 320 - cam.y, 240, 130);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 8; i++) ctx.fillRect(30 + i * 26 - cam.x, (340 + (i % 3) * 20) - cam.y, 14, 2);
    // neu (zona superior-esquerra)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0 - cam.x, 0 - cam.y, 240, 110);
  },
  decor: [
    { type: 'pine', x: 120, y: 130, scale: 1.1 }, { type: 'pine', x: 180, y: 90 }, { type: 'pine', x: 70, y: 110 },
    { type: 'tent', x: 320, y: 250, c: '#e0607f' }, { type: 'tent', x: 360, y: 270, c: '#3f7fd6' },
    { type: 'rock', x: 600, y: 300, scale: 1.4 }, { type: 'rock', x: 660, y: 360 },
    { type: 'umbrella', x: 200, y: 430, c: '#ff7a52' },
    { type: 'pine', x: 720, y: 420 }, { type: 'pine', x: 760, y: 200 },
  ],
  obstacles: [
    { x: 20, y: 320, w: 240, h: 14 }, // vora del llac (no entrar a l'aigua per dalt)
  ],
  items: [
    { x: 600, y: 80, emoji: '🏔', big: true, float: 'Cim conquerit!', fc: '#fff', ach: 'muntanya', pc: ['#cfe6ff'] },
    { x: 120, y: 400, emoji: '🚣', big: true, float: 'Ruta en caiac!', fc: '#7fe9ff', pc: ['#7fe9ff'] },
    { x: 80, y: 70, emoji: '🎿', big: true, float: "Escapada d'hivern!", fc: '#fff', pc: ['#fff'] },
    { x: 420, y: 130, emoji: '🌅', big: true, float: 'Capvespre perfecte!', fc: '#ffb37a', pc: ['#ffb37a'] },
    { x: 720, y: 320, emoji: '✈', big: true, float: 'Nova aventura!', fc: '#fff', pc: ['#cfe6ff'] },
    // Easter egg: un cap de setmana més (ocult)
    { x: 760, y: 90, emoji: '⛺', count: false, float: 'Un cap de setmana més!', fc: '#ffd166', ach: 'no_descans', pc: ['#ffd166'] },
  ],
  hazards: [
    { x: 400, y: 300, emoji: '🌧', behavior: 'wander', spd: 30, float: 'Pluja!' },
    { x: 550, y: 220, emoji: '🥾', behavior: 'patrolX', range: 85, freq: 1.0, float: 'Ampolla!' },
    { x: 280, y: 180, emoji: '💨', behavior: 'chase', spd: 24, float: 'Vent de muntanya!', dmg: 20 },
    { x: 650, y: 380, emoji: '🌊', behavior: 'patrolY', range: 55, freq: 1.1, float: 'Onada!' },
  ],
  exit: { x: 770, y: 440, emoji: '➡' },
  onItem: (it, ctx) => {
    if (ctx.collected >= ctx.goal) Achievements.unlock('escapades');
  },
  goalDoneHint: '→ Cap a la nova etapa!',
}));

// =====================================================================
//  NIVELL 3 — LA VIDA ADULTA
// =====================================================================
registerScene('level3', createLevel({
  hero: 'nil',
  track: 'adult',     // oficina / cafè, lofi
  banner: 'NIVELL 3', subtitle: 'VIDA ADULTA', introSub: 'LA VIDA ADULTA',
  hudColor: '#caa24a', tokenEmoji: '❤',
  world: { w: 620, h: 420 },
  start: { x: 60, y: 380 },
  goal: 7, speed: HERO_SPEED_MID, defaultDmg: 26, hazardSpdMul: 1.25,
  ach: 'vida_adulta',
  next: 'level4',
  drawBg: (ctx, cam, t, world) => {
    // terra d'oficina (rajoles)
    ctx.fillStyle = '#cdd6e0'; ctx.fillRect(0, 0, VW, VH);
    ctx.strokeStyle = 'rgba(120,140,160,0.4)';
    const step = 28; const ox = -(cam.x % step), oy = -(cam.y % step);
    for (let x = ox; x <= VW; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
    for (let y = oy; y <= VH; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
    // catifa de la cafeteria
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(420 - cam.x, 300 - cam.y, 160, 100);
  },
  decor: [
    { type: 'desk', x: 150, y: 140 }, { type: 'desk', x: 300, y: 180 }, { type: 'desk', x: 220, y: 280 },
    { type: 'sign', x: 480, y: 300, text: 'CAFÈ', c: '#7a5a3a' },
    { type: 'building', x: 100, y: 70, w: 70, h: 28, wall: '#9fb4c9', roof: '#5a6b7a' },
  ],
  obstacles: [
    { x: 138, y: 132, w: 24, h: 8 }, { x: 288, y: 172, w: 24, h: 8 }, { x: 208, y: 272, w: 24, h: 8 },
  ],
  items: [
    { x: 480, y: 350, emoji: '☕', float: 'Cafè +20', fc: '#caa24a', kind: 'cafe', pc: ['#caa24a'] },
    { x: 520, y: 330, emoji: '☕', float: 'Cafè +20', fc: '#caa24a', kind: 'cafe', pc: ['#caa24a'] },
    { x: 200, y: 120, emoji: '📈', float: 'Experiència +5', fc: '#7fe98a', pc: ['#7fe98a'] },
    { x: 360, y: 250, emoji: '❤', float: 'Parella +10', fc: '#ff7a98', pc: ['#ff7a98'] },
    { x: 90, y: 250, emoji: '☕', float: 'Cafè +20', fc: '#caa24a', kind: 'cafe', pc: ['#caa24a'] },
    { x: 440, y: 130, emoji: '📈', float: 'Productivitat +5', fc: '#7fe98a', pc: ['#7fe98a'] },
    { x: 560, y: 380, emoji: '❤', float: 'Parella +10', fc: '#ff7a98', pc: ['#ff7a98'] },
    { x: 300, y: 380, emoji: '☕', count: false, float: 'Cafè +20', fc: '#caa24a', kind: 'cafe', pc: ['#caa24a'] },
  ],
  hazards: [
    { x: 250, y: 150, emoji: '📧', behavior: 'chase', spd: 28, float: 'Email!', dmg: 22 },
    { x: 400, y: 200, emoji: '📅', behavior: 'patrolX', range: 100, freq: 1.1, float: 'Reunió!', dmg: 24 },
    { x: 180, y: 320, emoji: '💸', behavior: 'wander', spd: 38, float: 'Despesa!', dmg: 26 },
    { x: 500, y: 120, emoji: '😴', behavior: 'patrolY', range: 70, freq: 1.2, float: 'Falta de son...', dmg: 24 },
    { x: 320, y: 280, emoji: '📧', behavior: 'chase', spd: 26, float: 'Més emails!', dmg: 22 },
  ],
  exit: { x: 580, y: 70, emoji: '➡' },
  onItem: (it, ctx) => {
    if (it.kind === 'cafe') { State.cafes++; if (State.cafes >= 8) Achievements.unlock('cafe'); }
  },
  onHazard: (h) => {
    if (h.emoji === '📧') { State.emailsHit++; }
  },
  goalDoneHint: '→ Cap a la propera aventura!',
}));

// =====================================================================
//  NIVELL 4 — PLANIFICANT EL CASAMENT (caòtic)
// =====================================================================
registerScene('level4', createLevel({
  hero: 'nil',
  track: 'wedding',   // Mendelssohn — marxa nupcial
  musicFile: 'wedding', // reprodueix l'MP3 real de la marxa nupcial
  banner: 'NIVELL 4', subtitle: 'EL CASAMENT', introSub: 'PLANIFICANT EL CASAMENT',
  hudColor: '#ff8aa6', tokenEmoji: '✅',
  world: { w: 600, h: 420 },
  start: { x: 50, y: 380 },
  goal: 6, speed: HERO_SPEED_FAST, defaultDmg: 28, hazardSpdMul: 1.3,
  ach: 'whatsapp',
  next: 'boss',
  drawBg: (ctx, cam, t, world) => {
    // suro/taulell de planificació
    ctx.fillStyle = '#caa06a'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    const step = 20; const ox = -(cam.x % step), oy = -(cam.y % step);
    for (let x = ox; x < VW; x += step) for (let y = oy; y < VH; y += step) ctx.fillRect(x, y, 1, 1);
    // post-its de colors
    const notes = [[80, 90, '#ffd166'], [260, 60, '#ff9ec2'], [430, 110, '#9fe0ff'], [180, 240, '#b6ff9e'], [500, 300, '#ffd166']];
    for (const [nx, ny, c] of notes) { ctx.fillStyle = c; ctx.fillRect(nx - cam.x, ny - cam.y, 22, 22); }
  },
  decor: [
    { type: 'sign', x: 300, y: 50, text: '13.06.2026', c: '#c0392b' },
  ],
  obstacles: [],
  items: [
    { x: 150, y: 120, emoji: '✅', float: 'Tasca feta!', fc: '#b6ff9e', pc: ['#b6ff9e'] },
    { x: 470, y: 160, emoji: '💍', float: 'Anells!', fc: '#ffd166', pc: ['#ffd166'] },
    { x: 90, y: 300, emoji: '💐', float: 'Flors!', fc: '#ff9ec2', pc: ['#ff9ec2'] },
    { x: 520, y: 330, emoji: '🎂', float: 'Pastís!', fc: '#fff', pc: ['#fff'] },
    { x: 300, y: 220, emoji: '✅', float: 'Tasca feta!', fc: '#b6ff9e', pc: ['#b6ff9e'] },
    { x: 250, y: 360, emoji: '🎵', float: 'Música!', fc: '#9fe0ff', pc: ['#9fe0ff'] },
  ],
  hazards: [
    { x: 200, y: 100, emoji: '📱', behavior: 'chase', spd: 36, float: 'Grup família!', dmg: 26 },
    { x: 400, y: 250, emoji: '📋', behavior: 'wander', spd: 46, float: 'Taules!', dmg: 24 },
    { x: 320, y: 150, emoji: '📧', behavior: 'wander', spd: 42, float: 'Proveïdor!', dmg: 22 },
    { x: 150, y: 300, emoji: '💸', behavior: 'chase', spd: 32, float: 'Pressupost!', dmg: 28 },
    { x: 480, y: 90, emoji: '📞', behavior: 'patrolX', range: 95, freq: 1.5, float: 'Última hora!', dmg: 24 },
    { x: 350, y: 360, emoji: '💌', behavior: 'wander', spd: 40, float: 'Canvi RSVP!', dmg: 22 },
    { x: 260, y: 200, emoji: '📱', behavior: 'chase', spd: 34, float: 'WhatsApp!', dmg: 26 },
  ],
  exit: { x: 560, y: 60, emoji: '⚔' },
  goalDoneHint: '→ Prepara\'t per la batalla final!',
}));
