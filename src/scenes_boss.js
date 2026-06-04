/* =====================================================================
   BATALLA FINAL — MONSTRE DE LA PLANIFICACIÓ DEL CASAMENT
   Tipus shoot-'em-up: dispara amor/humor/cafè, esquiva el caos.
   ===================================================================== */

const BOSS_ATTACKS = [
  { name: 'CANVI DE TAULES', emoji: '📋', kind: 'rain', n: 6, spd: 70 },
  { name: 'PLUJA PREVISTA', emoji: '🌧', kind: 'rain', n: 9, spd: 90 },
  { name: "RSVP D'ÚLTIMA HORA", emoji: '💌', kind: 'aim', n: 3, spd: 75 },
  { name: 'PETICIÓ DE +1', emoji: '👥', kind: 'sides', n: 4, spd: 80 },
  { name: 'CANVI DE MENÚ', emoji: '🍽', kind: 'fan', n: 7, spd: 70 },
];

const WEAPONS = [
  { e: '❤', n: 'Amor', c: '#ff5a7a' },
  { e: '😂', n: 'Humor', c: '#ffd166' },
  { e: '🤝', n: 'Treball en equip', c: '#7fe98a' },
  { e: '☕', n: 'Cafè', c: '#caa24a' },
];

registerScene('boss', () => {
  const parts = new Particles();
  let t = 0, shake = 0, intro = 3.0, outro = 0;
  let phase = 'intro'; // intro -> fight -> defeated
  const boss = { x: VW / 2, y: 52, hp: 100, maxhp: 100, hit: 0, atkTimer: 2.4, warn: null, warnT: 0 };
  const player = { x: VW / 2, y: VH - 34, w: 12, h: 12, hearts: 3, maxHearts: 3, invuln: 0, fire: 0, weap: 0 };
  const pshots = []; // {x,y,vy,e,c}
  const bshots = []; // {x,y,vx,vy,e}
  let banner = 0;

  function fire(strong) {
    const w = WEAPONS[player.weap];
    pshots.push({ x: player.x, y: player.y - 8, vy: -180, e: w.e, c: w.c, dmg: strong ? 4 : 2.4 });
    AudioEngine.sfx('fire');
  }

  function bossAttack() {
    const a = U.pick(BOSS_ATTACKS);
    boss.warn = a.name; boss.warnT = 1.1;
    setTimeout(() => {}, 0);
    // programem la generació quan acabi l'avís via warnT a update
    boss.pendingAtk = a;
  }

  function spawnAttack(a) {
    AudioEngine.sfx('bosshit');
    if (a.kind === 'rain') {
      for (let i = 0; i < a.n; i++) {
        const x = U.rand(20, VW - 20);
        bshots.push({ x, y: -10 - i * 16, vx: U.rand(-8, 8), vy: a.spd, e: a.emoji });
      }
    } else if (a.kind === 'aim') {
      for (let i = 0; i < a.n; i++) {
        setTimeout(() => {
          const ang = Math.atan2(player.y - boss.y, player.x - boss.x) + U.rand(-0.2, 0.2);
          bshots.push({ x: boss.x, y: boss.y + 18 * BOSS_DRAW_SCALE, vx: Math.cos(ang) * a.spd, vy: Math.sin(ang) * a.spd, e: a.emoji });
        }, i * 220);
      }
    } else if (a.kind === 'sides') {
      // Entrada pels costats, repartida per tota la zona on es mou el jugador (abans només a dalt).
      const ins = touchPlayInset();
      const yMin = VH * 0.38 + fs(8);
      const yMax = VH - ins.bottom - fs(8);
      const span = yMax - yMin;
      for (let i = 0; i < a.n; i++) {
        const y = yMin + (span * (i + 0.5)) / a.n;
        bshots.push({ x: -12, y, vx: a.spd, vy: 0, e: a.emoji });
        bshots.push({ x: VW + 12, y, vx: -a.spd, vy: 0, e: a.emoji });
      }
    } else if (a.kind === 'fan') {
      for (let i = 0; i < a.n; i++) {
        const ang = Math.PI / 2 + (i - (a.n - 1) / 2) * 0.28;
        bshots.push({ x: boss.x, y: boss.y + 18 * BOSS_DRAW_SCALE, vx: Math.cos(ang) * a.spd, vy: Math.sin(ang) * a.spd, e: a.emoji });
      }
    }
  }

  return {
    enter() { AudioEngine.setTrack('boss'); },
    update(dt) {
      t += dt;
      parts.update(dt);
      if (shake > 0) shake -= dt;

      if (phase === 'intro') {
        intro -= dt;
        if (intro <= 0) { phase = 'fight'; banner = 1.2; }
        return;
      }

      if (phase === 'defeated') {
        outro += dt;
        // explosions
        if (outro < 2.2 && U.chance(0.3)) {
          parts.burst(boss.x + U.rand(-20, 20), boss.y + U.rand(-12, 12), ['#ffd166', '#ff7a98', '#fff', '#8effc0'], 14, { spd: 90 });
          AudioEngine.sfx('bosshit');
          shake = 0.2;
        }
        if (outro > 2.6) SM.go('reunion', {}, 1.8);
        return;
      }

      // --- FIGHT ---
      if (banner > 0) banner -= dt;
      boss.x = VW / 2 + Math.sin(t * 0.9) * 60;
      boss.y = 50 + Math.sin(t * 1.7) * 6;
      if (boss.hit > 0) boss.hit -= dt;

      // moviment jugador
      let dx = Input.x, dy = Input.y;
      const ins = touchPlayInset();
      player.x = U.clamp(player.x + dx * HERO_SPEED_BOSS * dt, ins.left, VW - ins.right);
      player.y = U.clamp(player.y + dy * HERO_SPEED_BOSS * dt, VH * 0.38, VH - ins.bottom);
      if (player.invuln > 0) player.invuln -= dt;

      // foc automàtic + manual
      player.fire -= dt;
      if (player.fire <= 0) { fire(false); player.fire = 0.34; }
      if (Input.pressed('a') || Input.pressed('tap')) fire(true);

      // avís d'atac del boss
      if (boss.warn) {
        boss.warnT -= dt;
        if (boss.warnT <= 0) { spawnAttack(boss.pendingAtk); boss.warn = null; }
      } else {
        boss.atkTimer -= dt;
        const rate = boss.hp < 35 ? 1.6 : boss.hp < 65 ? 2.2 : 2.8;
        if (boss.atkTimer <= 0) { bossAttack(); boss.atkTimer = rate; }
      }

      // projectils del jugador
      for (const s of pshots) { s.y += s.vy * dt; }
      for (let i = pshots.length - 1; i >= 0; i--) {
        const s = pshots[i];
        if (s.y < -10) { pshots.splice(i, 1); continue; }
        if (Math.abs(s.x - boss.x) < 30 * BOSS_DRAW_SCALE && Math.abs(s.y - boss.y) < 22 * BOSS_DRAW_SCALE && boss.hp > 0) {
          boss.hp -= s.dmg; boss.hit = 0.12;
          parts.burst(s.x, s.y, [s.c, '#fff'], 5, { spd: 50 });
          AudioEngine.sfx('bosshit');
          pshots.splice(i, 1);
          player.weap = (player.weap + 1) % WEAPONS.length;
          if (boss.hp <= 0) {
            boss.hp = 0; phase = 'defeated'; outro = 0;
            State.bossDefeated = true;
            Achievements.unlock('pressupost');
            AudioEngine.sfx('win');
          }
        }
      }

      // projectils del boss
      for (const s of bshots) { s.x += s.vx * dt; s.y += s.vy * dt; }
      for (let i = bshots.length - 1; i >= 0; i--) {
        const s = bshots[i];
        if (s.y > VH + 14 || s.x < -16 || s.x > VW + 16) { bshots.splice(i, 1); continue; }
        if (player.invuln <= 0 && U.dist(s.x, s.y, player.x, player.y) < 11) {
          player.hearts--; player.invuln = 1.1; shake = 0.3;
          AudioEngine.sfx('hurt');
          parts.burst(player.x, player.y, ['#ff6b6b', '#fff'], 8, { spd: 60 });
          bshots.splice(i, 1);
          if (player.hearts <= 0) {
            // sense game over (és un regal): recupera un cor i continua
            player.hearts = 1; player.invuln = 1.6;
          }
        }
      }
    },

    render(ctx) {
      const sx = shake > 0 ? U.randInt(-3, 3) : 0;
      const sy = shake > 0 ? U.randInt(-2, 2) : 0;
      ctx.save();
      ctx.translate(sx, sy);

      // fons dramàtic
      const g = ctx.createRadialGradient(VW / 2, boss.y, 20, VW / 2, VH, VH);
      g.addColorStop(0, '#3a1430'); g.addColorStop(1, '#0a0410');
      ctx.fillStyle = g; ctx.fillRect(-4, -4, VW + 8, VH + 8);
      // raigs de fons
      ctx.globalAlpha = 0.06; ctx.fillStyle = '#ff7a98';
      for (let i = 0; i < 8; i++) {
        const a = t * 0.3 + i * Math.PI / 4;
        ctx.save(); ctx.translate(VW / 2, boss.y); ctx.rotate(a);
        ctx.fillRect(0, -3, 300, 6); ctx.restore();
      }
      ctx.globalAlpha = 1;

      drawBossMonster(ctx, boss.x, boss.y, t, boss.hit > 0, boss.hp / boss.maxhp);

      // projectils
      for (const s of bshots) drawEmoji(ctx, s.e, s.x, s.y, 15);
      for (const s of pshots) drawEmoji(ctx, s.e, s.x, s.y, 13);

      // jugador (Nil)
      if (!(player.invuln > 0 && Math.floor(t * 16) % 2 === 0))
        drawHero(ctx, HEROES.nil, player.x, player.y + 8, 'up', t, true);

      parts.render(ctx, { x: 0, y: 0 });

      // ---- HUD del boss ----
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, fs(24));
      drawCenter(ctx, 'MONSTRE DE LA PLANIFICACIÓ DEL CASAMENT', fs(8), { size: 8, color: '#ff8aa6' });
      const bw = VW - fs(60), bx = fs(30), by = fs(15);
      ctx.fillStyle = '#3a1020'; ctx.fillRect(bx, by, bw, fs(6));
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(bx, by, bw * (boss.hp / boss.maxhp), fs(6));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, fs(1));
      ctx.strokeRect(bx + 0.5, by + 0.5, bw, fs(6));

      for (let i = 0; i < player.maxHearts; i++) {
        drawHeart(ctx, fs(12) + i * fs(12), VH - fs(12), 2, i < player.hearts ? '#ff5a7a' : 'rgba(255,255,255,0.2)');
      }
      // arma actual
      const w = WEAPONS[player.weap];
      drawText(ctx, 'Atac: ' + w.e + ' ' + w.n, VW - 6, VH - 10, { size: 8, color: w.c, align: 'right', shadow: '#000' });

      // avís d'atac
      if (boss.warn && Math.floor(t * 8) % 2 === 0) {
        drawCenter(ctx, '⚠ ' + boss.warn + ' ⚠', VH / 2 - 20, { size: 13, color: '#ffd166', shadow: '#000', sx: 1, sy: 1 });
      }

      ctx.restore();

      // banner d'intro
      if (phase === 'intro') {
        const a = U.clamp(Math.min(3.0 - intro, intro) / 0.6, 0, 1);
        ctx.globalAlpha = a;
        const introLines = ['BOSS FINAL', 'MONSTRE DE LA PLANIFICACIÓ'];
        const gap = fso(5);
        const lineH = fs(10) + gap;
        const boxH = introLines.length * lineH - gap + fs(16);
        const boxY = VH / 2 - boxH / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, boxY, VW, boxH);
        drawCenterBlock(ctx, introLines, VH / 2, {
          size: 10,
          lineColors: ['#ff8aa6', '#fff'],
          shadow: '#000',
          sx: 1,
          sy: 1,
        });
        ctx.globalAlpha = 1;
      }
      if (banner > 0 && phase === 'fight') {
        ctx.globalAlpha = U.clamp(banner, 0, 1);
        drawCenter(ctx, 'Dispara AMOR. Esquiva el CAOS!', VH * 0.4, { size: 9, color: '#8effc0', shadow: '#000' });
        ctx.globalAlpha = 1;
      }
      if (phase === 'defeated') {
        drawCenter(ctx, 'EL CAOS HA ESTAT DERROTAT!', VH / 2, { size: 13, color: '#ffd166', shadow: '#000', sx: 1, sy: 1 });
      }
    },

    onInput() {},
  };
});

// Monstre: bola de paperassa/estrès amb cara enfadada.
function drawBossMonster(ctx, x, y, t, hit, hpFrac) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(t * 4) * 0.04;
  ctx.scale(pulse * BOSS_DRAW_SCALE, pulse * BOSS_DRAW_SCALE);

  // cos
  ctx.fillStyle = hit ? '#ffffff' : '#7a3a5a';
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hit ? '#ffd1e0' : '#5e2c46';
  ctx.beginPath(); ctx.ellipse(0, 6, 26, 16, 0, 0, Math.PI * 2); ctx.fill();

  // "documents" sortint del cos (caos)
  const icons = ['📋', '📧', '💸', '📱', '📅'];
  for (let i = 0; i < 5; i++) {
    const a = t * 1.2 + i * (Math.PI * 2 / 5);
    const r = 30 + Math.sin(t * 3 + i) * 3;
    drawEmoji(ctx, icons[i], Math.cos(a) * r, Math.sin(a) * r * 0.7 - 4, 12);
  }

  // ulls enfadats
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-10, -4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c0143c';
  const ll = Math.sin(t * 2) * 1.5;
  ctx.beginPath(); ctx.arc(-10 + ll, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10 + ll, -3, 2.4, 0, Math.PI * 2); ctx.fill();
  // celles
  ctx.strokeStyle = '#2a0a18'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, -11); ctx.lineTo(-5, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, -11); ctx.lineTo(5, -7); ctx.stroke();
  // boca (més enfadada com menys vida)
  ctx.strokeStyle = '#2a0a18'; ctx.lineWidth = 2;
  ctx.beginPath();
  const m = U.lerp(4, -4, 1 - hpFrac);
  ctx.moveTo(-9, 8); ctx.quadraticCurveTo(0, 8 + m, 9, 8); ctx.stroke();
  // dents
  ctx.fillStyle = '#fff'; ctx.fillRect(-6, 7, 3, 3); ctx.fillRect(3, 7, 3, 3);

  ctx.restore();
}
