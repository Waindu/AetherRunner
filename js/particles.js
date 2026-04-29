/* ============================================================
   particles.js — Particle effects: steam, sparks, gears, XP orbs
   ============================================================ */

'use strict';

const Particles = (() => {

  // Active particle pool
  const pool = [];

  // ---- Particle factory helpers ----

  function emit(x, y, opts) {
    const count = opts.count || 1;
    for (let i = 0; i < count; i++) {
      const angle = (opts.angle ?? Utils.randFloat(0, Math.PI * 2));
      const spread = opts.spread ?? Math.PI * 2;
      const a = angle + Utils.randFloat(-spread / 2, spread / 2);
      const speed = Utils.randFloat(opts.speedMin ?? 20, opts.speedMax ?? 80);
      pool.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1,
        decay: Utils.randFloat(opts.decayMin ?? 0.6, opts.decayMax ?? 1.4),
        size: Utils.randFloat(opts.sizeMin ?? 2, opts.sizeMax ?? 6),
        color: opts.color || '#ffd700',
        type: opts.type || 'circle',
        rotation: Utils.randFloat(0, Math.PI * 2),
        rotSpeed: Utils.randFloat(-4, 4),
        gravity: opts.gravity ?? 0,
        alpha: 1
      });
    }
  }

  /** Steam puff (white/grey expanding cloud) */
  function steam(x, y, count = 6) {
    emit(x, y, {
      count,
      speedMin: 10, speedMax: 40,
      sizeMin: 4, sizeMax: 14,
      decayMin: 0.3, decayMax: 0.7,
      color: '#c8bfb0',
      type: 'circle',
      gravity: -15
    });
  }

  /** Spark (tiny bright sparks) */
  function sparks(x, y, color = '#ffd700', count = 8) {
    emit(x, y, {
      count,
      speedMin: 40, speedMax: 120,
      sizeMin: 1.5, sizeMax: 3.5,
      decayMin: 1.2, decayMax: 2.4,
      color,
      type: 'line',
      gravity: 60
    });
  }

  /** Gear fragment spinning away */
  function gearBits(x, y, count = 5) {
    emit(x, y, {
      count,
      speedMin: 30, speedMax: 90,
      sizeMin: 3, sizeMax: 7,
      decayMin: 0.5, decayMax: 1.0,
      color: '#b87333',
      type: 'gear',
      gravity: 40
    });
  }

  /** Explosion smoke */
  function explosion(x, y, radius = 30) {
    // Smoke
    emit(x, y, {
      count: 14,
      speedMin: 20, speedMax: radius * 1.5,
      sizeMin: 6, sizeMax: 20,
      decayMin: 0.3, decayMax: 0.6,
      color: '#3d2b1a',
      type: 'circle',
      gravity: -10
    });
    // Flash sparks
    sparks(x, y, '#ff9900', 20);
    gearBits(x, y, 8);
  }

  /** XP orb glint */
  function xpGlint(x, y) {
    emit(x, y, {
      count: 4,
      speedMin: 10, speedMax: 30,
      sizeMin: 1, sizeMax: 3,
      decayMin: 1.5, decayMax: 2.5,
      color: '#ffd700',
      type: 'circle',
      gravity: -5
    });
  }

  /** Hit flash */
  function hit(x, y, color = '#ff4444') {
    emit(x, y, {
      count: 5,
      speedMin: 20, speedMax: 60,
      sizeMin: 2, sizeMax: 5,
      decayMin: 1.5, decayMax: 2.5,
      color,
      type: 'circle'
    });
  }

  /** Lightning arc (static decoration at position) */
  function lightning(x, y, count = 3) {
    emit(x, y, {
      count,
      speedMin: 5, speedMax: 25,
      sizeMin: 2, sizeMax: 4,
      decayMin: 2, decayMax: 3.5,
      color: '#4fc3f7',
      type: 'circle',
      spread: Math.PI * 2
    });
  }

  // ---- Draw helpers ----

  function drawGear(ctx, x, y, r) {
    const teeth = 6;
    const inner = r * 0.6;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i / (teeth * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : inner;
      if (i === 0) ctx.moveTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
      else ctx.lineTo(x + Math.cos(angle) * rad, y + Math.sin(angle) * rad);
    }
    ctx.closePath();
  }

  // ---- Update & Draw ----

  function update(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= p.decay * dt;
      p.rotation += p.rotSpeed * dt;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) pool.splice(i, 1);
    }
  }

  function draw(ctx) {
    ctx.save();
    for (const p of pool) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'line') {
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
        ctx.stroke();
      } else if (p.type === 'gear') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        drawGear(ctx, 0, 0, p.size);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function clear() {
    pool.length = 0;
  }

  return { steam, sparks, gearBits, explosion, xpGlint, hit, lightning, update, draw, clear };

})();
