/* ============================================================
   wave.js — Wave / spawner system and progression
   ============================================================ */

'use strict';

const Wave = (() => {

  // State
  let spawnTimer  = 0;
  let spawnRate   = 1.8;    // seconds between spawns
  let spawnBatch  = 1;      // enemies per spawn event
  let gameTime    = 0;      // total elapsed seconds

  // Boss schedule in seconds
  const BOSS_TIMES = [180, 360, 600, 900, 1200];
  let nextBossIdx  = 0;

  // XP orbs pool
  const xpOrbs = [];

  // Available enemy types (unlocked over time)
  let availableTypes = ['drone'];

  // ---- Helpers ----

  function spawnEnemy(enemies, canvasW, canvasH) {
    const type = Utils.randChoice(availableTypes);
    const pos  = Utils.edgeSpawnPos(canvasW, canvasH, 40);
    enemies.push(createEnemy(type, pos.x, pos.y));
  }

  function spawnBoss(enemies, canvasW, canvasH) {
    const pos = Utils.edgeSpawnPos(canvasW, canvasH, 40);
    enemies.push(createEnemy('boss', pos.x, pos.y));
  }

  // ---- XP Orb helpers ----

  function dropXpOrb(x, y, amount) {
    xpOrbs.push({
      x, y,
      vx: Utils.randFloat(-40, 40),
      vy: Utils.randFloat(-60, -20),
      value: amount,
      radius: 6 + Math.min(amount / 20, 8),
      life: 1,
      glowTimer: Math.random() * Math.PI * 2,
      alive: true
    });
  }

  function updateXpOrbs(dt, player) {
    let xpGained = false;
    for (const orb of xpOrbs) {
      if (!orb.alive) continue;
      orb.glowTimer += dt * 3;

      // Friction / gravity
      orb.vx *= Math.pow(0.85, dt * 60);
      orb.vy  = orb.vy * Math.pow(0.9, dt * 60) + 20 * dt;
      orb.x  += orb.vx * dt;
      orb.y  += orb.vy * dt;

      // Auto-collect if in pickup radius
      const d = Utils.dist(player.x, player.y, orb.x, orb.y);
      if (d < player.pickupRadius + orb.radius) {
        // Fly toward player
        const { x: nx, y: ny } = Utils.normalise(player.x - orb.x, player.y - orb.y);
        const speed = Math.max(200, (player.pickupRadius - d) * 5);
        orb.x += nx * speed * dt;
        orb.y += ny * speed * dt;

        if (Utils.dist(player.x, player.y, orb.x, orb.y) < player.radius) {
          orb.alive = false;
          Particles.xpGlint(orb.x, orb.y);
          const levelled = player.gainXp(orb.value);
          xpGained = xpGained || levelled;
        }
      }
    }

    // Remove dead orbs
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
      if (!xpOrbs[i].alive) xpOrbs.splice(i, 1);
    }

    return xpGained; // true if player levelled up
  }

  function drawXpOrbs(ctx) {
    for (const orb of xpOrbs) {
      if (!orb.alive) continue;
      const glow = 0.7 + Math.sin(orb.glowTimer) * 0.3;
      ctx.save();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 12 * glow;
      // Core
      ctx.fillStyle = '#ffd700';
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Outer ring
      ctx.fillStyle = '#fffbe6';
      ctx.globalAlpha = glow * 0.4;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ---- Main update ----

  function update(dt, enemies, canvasW, canvasH) {
    gameTime += dt;

    // Unlock enemy types by time
    if (gameTime >= 60  && !availableTypes.includes('spider'))  availableTypes.push('spider');
    if (gameTime >= 120 && !availableTypes.includes('golem'))   availableTypes.push('golem');
    if (gameTime >= 240 && !availableTypes.includes('turret'))  availableTypes.push('turret');

    // Difficulty ramp every 60s
    const diffStage = Math.floor(gameTime / 60);
    spawnRate  = Math.max(0.4, 1.8 - diffStage * 0.18);
    spawnBatch = 1 + Math.floor(diffStage * 0.8);

    // Spawn regular enemies
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = spawnRate;
      for (let i = 0; i < spawnBatch; i++) {
        spawnEnemy(enemies, canvasW, canvasH);
      }
    }

    // Boss spawns
    if (nextBossIdx < BOSS_TIMES.length && gameTime >= BOSS_TIMES[nextBossIdx]) {
      spawnBoss(enemies, canvasW, canvasH);
      nextBossIdx++;
    }
  }

  function reset() {
    spawnTimer  = 1.0;
    spawnRate   = 1.8;
    spawnBatch  = 1;
    gameTime    = 0;
    nextBossIdx = 0;
    availableTypes = ['drone'];
    xpOrbs.length = 0;
  }

  function getGameTime() { return gameTime; }

  return {
    update,
    reset,
    getGameTime,
    dropXpOrb,
    updateXpOrbs,
    drawXpOrbs,
    get xpOrbs() { return xpOrbs; }
  };

})();
