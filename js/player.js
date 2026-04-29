/* ============================================================
   player.js — Player class, movement, stats, drawing
   ============================================================ */

'use strict';

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;

    // --- Base stats ---
    this.maxHp       = 100;
    this.hp          = 100;
    this.speed       = 160;          // px/s
    this.armor       = 0;            // flat damage reduction
    this.xpMultiplier = 1.0;
    this.pickupRadius = 80;

    // --- Progression ---
    this.level = 1;
    this.xp    = 0;
    this.xpToNext = 20;              // scales with level

    // --- State ---
    this.facing    = 0;              // angle in radians
    this.alive     = true;
    this.invincible = 0;             // invincibility frames timer (s)
    this.blinkTimer = 0;

    // --- Visual ---
    this.steamTimer = 0;

    // --- Weapons list (set by Weapons module) ---
    this.weapons = [];
  }

  // ---- Movement ----

  move(dx, dy, dt, canvasW, canvasH) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len; dy /= len;
      this.facing = Math.atan2(dy, dx);
    }
    this.x = Utils.clamp(this.x + dx * this.speed * dt, this.radius, canvasW - this.radius);
    this.y = Utils.clamp(this.y + dy * this.speed * dt, this.radius, canvasH - this.radius);
  }

  // ---- Damage & Healing ----

  takeDamage(amount) {
    if (this.invincible > 0 || !this.alive) return;
    const dmg = Math.max(1, amount - this.armor);
    this.hp -= dmg;
    Particles.hit(this.x, this.y, '#ff4444');
    Particles.sparks(this.x, this.y, '#ff8800', 5);
    this.invincible = 0.5;   // half-second iframes
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      Particles.explosion(this.x, this.y, 40);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // ---- XP & Leveling ----

  gainXp(amount) {
    this.xp += amount * this.xpMultiplier;
    while (this.xp >= this.xpToNext) {
      this.xp      -= this.xpToNext;
      this.level   += 1;
      this.xpToNext = Math.floor(this.xpToNext * 1.35 + 10);
      return true; // level up!
    }
    return false;
  }

  // ---- Update ----

  update(dt) {
    if (this.invincible > 0) {
      this.invincible -= dt;
      this.blinkTimer += dt;
    } else {
      this.blinkTimer = 0;
    }

    // Passive steam particles while moving (called from main only when moving)
    this.steamTimer -= dt;
    if (this.steamTimer <= 0) {
      this.steamTimer = 0.2;
      Particles.steam(this.x + Utils.randFloat(-8, 8), this.y + Utils.randFloat(8, 16), 2);
    }
  }

  // ---- Draw ----

  draw(ctx) {
    // Blink while invincible
    if (this.invincible > 0 && Math.floor(this.blinkTimer * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    // --- Shadow ---
    ctx.save();
    ctx.rotate(-this.facing);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 16, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.restore();

    // --- Coat / body ---
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Chest plate / vest ---
    ctx.fillStyle = '#b87333';
    ctx.beginPath();
    ctx.rect(-6, -6, 12, 14);
    ctx.fill();

    // --- Rivets on vest ---
    ctx.fillStyle = '#ffd700';
    for (let ry of [-2, 4]) {
      for (let rx of [-4, 4]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Head ---
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI * 2);
    ctx.fill();

    // --- Goggles ---
    ctx.fillStyle = '#4fc3f7';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 1.5;
    for (const gx of [-3.5, 3.5]) {
      ctx.beginPath();
      ctx.arc(gx, -13, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Goggle bridge
    ctx.beginPath();
    ctx.moveTo(-0.7, -13);
    ctx.lineTo(0.7, -13);
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Top hat ---
    ctx.fillStyle = '#1a0f0a';
    ctx.fillRect(-7, -22, 14, 10);  // brim
    ctx.fillRect(-5, -32, 10, 12);  // crown
    // Hat band
    ctx.fillStyle = '#b87333';
    ctx.fillRect(-5, -22, 10, 2);

    // --- Gear on hat ---
    ctx.save();
    ctx.translate(5, -27);
    ctx.rotate(Date.now() * 0.002);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    _drawMiniGear(ctx, 0, 0, 3.5, 6);
    ctx.restore();

    // --- Arms (pipe wrench) ---
    // Right arm
    ctx.fillStyle = '#4a3520';
    ctx.save();
    ctx.translate(11, 0);
    ctx.rotate(0.4);
    ctx.fillRect(-2, -2, 4, 12);
    // Wrench head
    ctx.fillStyle = '#888';
    ctx.fillRect(-3, 8, 6, 5);
    ctx.fillRect(-2, 12, 8, 3);
    ctx.restore();

    // Left arm
    ctx.fillStyle = '#4a3520';
    ctx.save();
    ctx.translate(-11, 0);
    ctx.rotate(-0.4);
    ctx.fillRect(-2, -2, 4, 12);
    ctx.restore();

    // --- Legs ---
    ctx.fillStyle = '#2d2010';
    ctx.fillRect(-7, 10, 6, 10);
    ctx.fillRect(1, 10, 6, 10);
    // Boots
    ctx.fillStyle = '#1a0f0a';
    ctx.fillRect(-8, 18, 7, 5);
    ctx.fillRect(1, 18, 7, 5);

    ctx.restore();

    // --- Pickup radius (subtle glow ring) ---
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.pickupRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ---- Stat upgrade helpers ----

  upgradeMaxHp(amount) {
    this.maxHp += amount;
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  upgradeSpeed(amount) {
    this.speed += amount;
  }

  upgradeArmor(amount) {
    this.armor += amount;
  }

  upgradeXpMult(amount) {
    this.xpMultiplier += amount;
  }

  upgradePickupRadius(amount) {
    this.pickupRadius += amount;
  }
}

// ---- Gear drawing utility used by player draw ----
function _drawMiniGear(ctx, x, y, outerR, teeth) {
  const innerR = outerR * 0.6;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Centre hole
  ctx.beginPath();
  ctx.arc(x, y, innerR * 0.4, 0, Math.PI * 2);
  ctx.stroke();
}
