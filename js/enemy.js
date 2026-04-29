/* ============================================================
   enemy.js — Enemy classes (5 automaton types + Boss)
   ============================================================ */

'use strict';

// ---- Base Enemy ----
class Enemy {
  constructor(x, y, type) {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.alive  = true;
    this.hitFlash = 0; // timer for damage flash

    // To be set by subclass
    this.maxHp  = 1;
    this.hp     = 1;
    this.speed  = 60;
    this.xp     = 5;
    this.radius = 12;
    this.damage = 10;   // contact damage to player
    this.color  = '#b87333';

    // Projectile cooldown (for ranged enemies)
    this.fireCooldown = 0;

    // Timer for zigzag/special behaviour
    this.behavTimer = 0;
    this.zigzagDir  = 1;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.15;
    Particles.sparks(this.x, this.y, '#ff9900', 4);
    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      this._onDeath();
    }
  }

  _onDeath() {
    Particles.explosion(this.x, this.y, this.radius * 2);
    Particles.gearBits(this.x, this.y, 8);
  }

  /**
   * Base update — chases player.
   * Subclasses override for special movement.
   */
  update(dt, player, projectiles) {
    if (!this.alive) return;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    this._moveToward(player.x, player.y, dt);
  }

  _moveToward(tx, ty, dt) {
    const { x: nx, y: ny } = Utils.normalise(tx - this.x, ty - this.y);
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Hit flash
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    }

    this._drawBody(ctx);

    ctx.restore();

    this._drawHpBar(ctx);
  }

  _drawBody(ctx) {
    // Default placeholder — subclasses override
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const barW = this.radius * 2.5;
    const barH = 4;
    const bx   = this.x - barW / 2;
    const by   = this.y - this.radius - 8;
    ctx.fillStyle = '#330000';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
  }
}

// ---- 1: Clockwork Drone ----
class ClockworkDrone extends Enemy {
  constructor(x, y) {
    super(x, y, 'drone');
    this.maxHp  = 20;
    this.hp     = 20;
    this.speed  = Utils.randFloat(85, 105);
    this.xp     = 5;
    this.radius = 11;
    this.damage = 8;
    this.color  = '#c0892c';
    this.gearRot = 0;
  }

  update(dt, player) {
    super.update(dt, player);
    this.gearRot += 3 * dt;
  }

  _drawBody(ctx) {
    // Hexagonal body
    ctx.fillStyle = '#8a5a1a';
    ctx.strokeStyle = '#d4860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = this.radius;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central gear
    ctx.save();
    ctx.rotate(this.gearRot);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.2;
    _drawEnemyGear(ctx, 0, 0, 5, 6);
    ctx.restore();

    // Red eye
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -this.radius + 2);
    ctx.lineTo(-8, -this.radius - 5);
    ctx.moveTo(5, -this.radius + 2);
    ctx.lineTo(8, -this.radius - 5);
    ctx.stroke();

    // Antenna tips
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(-8, -this.radius - 5, 1.5, 0, Math.PI * 2);
    ctx.arc(8, -this.radius - 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- 2: Steam Golem ----
class SteamGolem extends Enemy {
  constructor(x, y) {
    super(x, y, 'golem');
    this.maxHp  = 80;
    this.hp     = 80;
    this.speed  = Utils.randFloat(38, 48);
    this.xp     = 20;
    this.radius = 22;
    this.damage = 20;
    this.color  = '#708090';
    this.steamTimer = 0;
    this.walkCycle  = 0;
  }

  update(dt, player) {
    super.update(dt, player);
    this.walkCycle  += dt * 3;
    this.steamTimer -= dt;
    if (this.steamTimer <= 0) {
      this.steamTimer = 0.5;
      Particles.steam(this.x, this.y - this.radius, 3);
    }
  }

  _drawBody(ctx) {
    const bob = Math.sin(this.walkCycle) * 2;

    // Legs
    ctx.fillStyle = '#4a5568';
    const legOff = Math.sin(this.walkCycle) * 6;
    ctx.fillRect(-16, 12 + bob, 10, 16 + legOff);
    ctx.fillRect(6, 12 + bob, 10, 16 - legOff);
    // Feet
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-18, 26 + bob + legOff, 13, 6);
    ctx.fillRect(5,   26 + bob - legOff, 13, 6);

    // Main torso — boiler body
    ctx.fillStyle = '#4a5568';
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0 + bob, this.radius * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Boiler rivets
    ctx.fillStyle = '#b87333';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = this.radius * 0.68;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r + bob, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boiler gauge
    ctx.fillStyle = '#1a0f0a';
    ctx.beginPath();
    ctx.arc(5, -2 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#ff2200';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, -2 + bob);
    ctx.lineTo(5 + Math.cos(-0.5) * 4, -2 + bob + Math.sin(-0.5) * 4);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#607080';
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;
    ctx.fillRect(-12, -this.radius - 10 + bob, 24, 18);
    ctx.strokeRect(-12, -this.radius - 10 + bob, 24, 18);

    // Eyes (glowing red)
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 8;
    ctx.fillRect(-10, -this.radius - 6 + bob, 6, 4);
    ctx.fillRect(4,   -this.radius - 6 + bob, 6, 4);
    ctx.shadowBlur = 0;

    // Smokestack
    ctx.fillStyle = '#2d3748';
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4, -this.radius - 24 + bob, 8, 16);
    ctx.strokeRect(-4, -this.radius - 24 + bob, 8, 16);

    // Arms
    ctx.fillStyle = '#4a5568';
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 2;
    const armSwing = Math.sin(this.walkCycle) * 0.3;
    ctx.save();
    ctx.translate(-this.radius, 0 + bob);
    ctx.rotate(armSwing);
    ctx.fillRect(-6, 0, 10, 22);
    ctx.restore();
    ctx.save();
    ctx.translate(this.radius - 4, 0 + bob);
    ctx.rotate(-armSwing);
    ctx.fillRect(-4, 0, 10, 22);
    ctx.restore();
  }
}

// ---- 3: Aether Turret ----
class AetherTurret extends Enemy {
  constructor(x, y) {
    super(x, y, 'turret');
    this.maxHp  = 40;
    this.hp     = 40;
    this.speed  = 0;    // static
    this.xp     = 15;
    this.radius = 16;
    this.damage = 12;
    this.color  = '#4fc3f7';
    this.fireCooldown = 2.0;
    this.aimAngle = 0;
    this.chargeTimer = 0;
    this.isCharging  = false;
    this.baseY  = y;
    this.hoverTimer = Math.random() * Math.PI * 2;
  }

  update(dt, player, projectiles) {
    if (!this.alive) return;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Hover
    this.hoverTimer += dt * 1.5;
    this.y = this.baseY + Math.sin(this.hoverTimer) * 5;

    // Aim at player
    this.aimAngle = Utils.angleTo(this.x, this.y, player.x, player.y);

    // Fire
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 2.5;
      if (projectiles) {
        this.isCharging = true;
        this.chargeTimer = 0.4;
      }
    }

    if (this.isCharging) {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        Particles.lightning(this.x, this.y, 5);
        if (projectiles) {
          projectiles.push(new Projectile({
            x: this.x, y: this.y,
            angle: this.aimAngle,
            speed: 200,
            damage: this.damage,
            radius: 6,
            range: 600,
            color: '#4fc3f7',
            type: 'enemy',
            owner: 'enemy'
          }));
        }
      }
    }
  }

  _drawBody(ctx) {
    // Base platform
    ctx.fillStyle = '#2d4a6a';
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    Utils.roundRect(ctx, -18, 8, 36, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = '#1a3a5a';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Charging effect
    if (this.isCharging) {
      ctx.strokeStyle = Utils.hexAlpha('#4fc3f7', 0.5 + Math.random() * 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + Math.random() * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Barrel
    ctx.save();
    ctx.rotate(this.aimAngle);
    ctx.fillStyle = '#2d4a6a';
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1.5;
    ctx.fillRect(0, -4, 22, 8);
    ctx.strokeRect(0, -4, 22, 8);
    // Barrel tip glow
    ctx.fillStyle = '#4fc3f7';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = this.isCharging ? 20 : 4;
    ctx.beginPath();
    ctx.arc(22, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Aether eye
    ctx.fillStyle = '#4fc3f7';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Decorative pipes
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-14, 14);
    ctx.moveTo(14, 6);
    ctx.lineTo(14, 14);
    ctx.stroke();
  }
}

// ---- 4: Gear Spider ----
class GearSpider extends Enemy {
  constructor(x, y) {
    super(x, y, 'spider');
    this.maxHp  = 30;
    this.hp     = 30;
    this.speed  = Utils.randFloat(120, 150);
    this.xp     = 10;
    this.radius = 12;
    this.damage = 10;
    this.color  = '#d4860b';
    this.zigzagDir  = Math.random() < 0.5 ? 1 : -1;
    this.behavTimer = Utils.randFloat(0.3, 0.7);
    this.legTimer   = 0;
  }

  update(dt, player) {
    if (!this.alive) return;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Zigzag movement
    this.behavTimer -= dt;
    if (this.behavTimer <= 0) {
      this.behavTimer = Utils.randFloat(0.3, 0.8);
      this.zigzagDir  = -this.zigzagDir;
    }

    const angle = Utils.angleTo(this.x, this.y, player.x, player.y);
    const perp  = angle + Math.PI / 2 * this.zigzagDir;
    const { x: nx, y: ny } = Utils.normalise(
      Math.cos(angle) + Math.cos(perp) * 0.6,
      Math.sin(angle) + Math.sin(perp) * 0.6
    );
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
    this.legTimer += dt * 10;
  }

  _drawBody(ctx) {
    const legAnim = Math.sin(this.legTimer) * 0.4;

    // Legs (8)
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const baseAngle = (i / 8) * Math.PI * 2;
      const legAngle  = baseAngle + (i % 2 === 0 ? legAnim : -legAnim);
      ctx.beginPath();
      ctx.moveTo(Math.cos(baseAngle) * 8, Math.sin(baseAngle) * 8);
      ctx.lineTo(Math.cos(legAngle) * (this.radius + 8), Math.sin(legAngle) * (this.radius + 8));
      ctx.stroke();
    }

    // Body — central gear
    ctx.strokeStyle = '#d4860b';
    ctx.fillStyle   = '#6b3f0a';
    ctx.lineWidth   = 2;
    const r = this.radius * 0.7;
    const inner = r * 0.6;
    const teeth = 8;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i / (teeth * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : inner;
      if (i === 0) ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
      else ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Abdomen
    ctx.fillStyle = '#4a2800';
    ctx.strokeStyle = '#d4860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 6, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes (4 small red ones)
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 4;
    for (const [ex, ey] of [[-4, -3], [0, -5], [4, -3], [0, -1]]) {
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

// ---- 5: Brass Titan (BOSS) ----
class BrassTitan extends Enemy {
  constructor(x, y) {
    super(x, y, 'boss');
    this.maxHp  = 500;
    this.hp     = 500;
    this.speed  = Utils.randFloat(50, 65);
    this.xp     = 100;
    this.radius = 38;
    this.damage = 35;
    this.color  = '#b87333';
    this.fireCooldown = 3.0;
    this.aimAngle = 0;
    this.walkCycle = 0;
    this.groundShakeTimer = 0;

    // Phase 2 below 50% HP
    this.enraged = false;
  }

  update(dt, player, projectiles) {
    if (!this.alive) return;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Enrage below 50%
    if (this.hp < this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      this.speed  *= 1.5;
      Particles.explosion(this.x, this.y, 60);
    }

    this._moveToward(player.x, player.y, dt);
    this.walkCycle += dt * 2;

    // Fire triple shot
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = this.enraged ? 1.5 : 2.5;
      this.aimAngle = Utils.angleTo(this.x, this.y, player.x, player.y);
      if (projectiles) {
        for (let spread of [-0.2, 0, 0.2]) {
          projectiles.push(new Projectile({
            x: this.x, y: this.y,
            angle: this.aimAngle + spread,
            speed: 220,
            damage: 18,
            radius: 8,
            range: 700,
            color: '#ff6600',
            type: 'enemy',
            owner: 'enemy'
          }));
        }
        Particles.explosion(this.x, this.y, 30);
      }
    }

    // Steam every frame (boss is dramatic)
    this.groundShakeTimer -= dt;
    if (this.groundShakeTimer <= 0) {
      this.groundShakeTimer = 0.3;
      Particles.steam(this.x + Utils.randFloat(-20, 20), this.y - this.radius, 4);
    }
  }

  _drawBody(ctx) {
    const bob = Math.sin(this.walkCycle) * 3;
    const r   = this.radius;

    // Shadow
    ctx.save();
    ctx.scale(1, 0.2);
    ctx.beginPath();
    ctx.arc(0, r * 5, r * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#7a5c22';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    const legSwing = Math.sin(this.walkCycle) * 8;
    // Left leg
    ctx.fillRect(-26, r * 0.3 + bob, 16, 28 + legSwing);
    // Right leg
    ctx.fillRect(10, r * 0.3 + bob, 16, 28 - legSwing);
    // Feet
    ctx.fillStyle = '#5a3d10';
    ctx.fillRect(-30, r * 0.3 + bob + 28 + legSwing, 22, 10);
    ctx.fillRect(8,   r * 0.3 + bob + 28 - legSwing, 22, 10);

    // Main torso
    ctx.fillStyle = '#8a6020';
    ctx.strokeStyle = '#d4a030';
    ctx.lineWidth = 3;
    Utils.roundRect(ctx, -r * 0.85, -r * 0.5 + bob, r * 1.7, r * 1.2, 6);
    ctx.fill();
    ctx.stroke();

    // Chest armour plates
    ctx.fillStyle = '#b87333';
    ctx.fillRect(-r * 0.6, -r * 0.4 + bob, r * 1.2, r * 0.5);
    // Centre emblem — large gear
    ctx.save();
    ctx.translate(0, -r * 0.1 + bob);
    ctx.rotate(this.walkCycle * 0.5);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    _drawEnemyGear(ctx, 0, 0, 14, 12);
    ctx.restore();

    // Shoulders
    ctx.fillStyle = '#7a5c22';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r + 4, -r * 0.2 + bob, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(r - 4, -r * 0.2 + bob, 14, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Arms
    const armSwing = Math.sin(this.walkCycle) * 0.5;
    ctx.fillStyle = '#7a5c22';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(-r + 4, -r * 0.2 + bob);
    ctx.rotate(armSwing);
    ctx.fillRect(-7, 12, 14, 30);
    ctx.strokeRect(-7, 12, 14, 30);
    // Left fist / cannon
    ctx.fillStyle = '#4a3010';
    ctx.fillRect(-10, 40, 20, 16);
    ctx.fillStyle = '#4fc3f7';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = this.enraged ? 20 : 6;
    ctx.beginPath();
    ctx.arc(-12, 48, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#7a5c22';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(r - 4, -r * 0.2 + bob);
    ctx.rotate(-armSwing);
    ctx.fillRect(-7, 12, 14, 30);
    ctx.strokeRect(-7, 12, 14, 30);
    ctx.fillStyle = '#4a3010';
    ctx.fillRect(-10, 40, 20, 16);
    ctx.restore();

    // Head
    ctx.fillStyle = '#8a6020';
    ctx.strokeStyle = '#d4a030';
    ctx.lineWidth = 3;
    ctx.fillRect(-20, -r - 28 + bob, 40, 30);
    ctx.strokeRect(-20, -r - 28 + bob, 40, 30);

    // Helmet crest
    ctx.fillStyle = '#d4a030';
    ctx.beginPath();
    ctx.moveTo(-10, -r - 28 + bob);
    ctx.lineTo(0,   -r - 42 + bob);
    ctx.lineTo(10,  -r - 28 + bob);
    ctx.closePath();
    ctx.fill();

    // Eyes (large glowing)
    const eyeColor = this.enraged ? '#ff0000' : '#ff6600';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = this.enraged ? 20 : 10;
    ctx.fillRect(-16, -r - 22 + bob, 10, 7);
    ctx.fillRect(6,   -r - 22 + bob, 10, 7);
    ctx.shadowBlur = 0;

    // Smokestacks (two on back — drawn in front for visibility)
    ctx.fillStyle = '#2d1a0a';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.fillRect(-32, -r - 24 + bob, 8, 20);
    ctx.strokeRect(-32, -r - 24 + bob, 8, 20);
    ctx.fillRect(24, -r - 28 + bob, 8, 24);
    ctx.strokeRect(24, -r - 28 + bob, 8, 24);
  }

  _drawHpBar(ctx) {
    // Boss has a bigger bar
    const barW = 200;
    const barH = 10;
    const bx   = this.x - barW / 2;
    const by   = this.y - this.radius - 18;
    ctx.fillStyle = '#330000';
    ctx.fillRect(bx, by, barW, barH);
    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct < 0.3 ? '#ff0000' : pct < 0.6 ? '#ff6600' : '#cc2222';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);
    // Boss label
    Utils.shadowText(ctx, 'BRASS TITAN', this.x, by - 5, {
      font: 'bold 11px "Courier New"',
      color: '#ffd700',
      shadowColor: '#000',
      shadowBlur: 4,
      align: 'center',
      baseline: 'bottom'
    });
  }
}

// ---- Utility shared by enemy drawers ----
function _drawEnemyGear(ctx, x, y, outerR, teeth) {
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
  ctx.beginPath();
  ctx.arc(x, y, innerR * 0.35, 0, Math.PI * 2);
  ctx.stroke();
}

// ---- Factory function ----
function createEnemy(type, x, y) {
  switch (type) {
    case 'drone':  return new ClockworkDrone(x, y);
    case 'golem':  return new SteamGolem(x, y);
    case 'turret': return new AetherTurret(x, y);
    case 'spider': return new GearSpider(x, y);
    case 'boss':   return new BrassTitan(x, y);
    default:       return new ClockworkDrone(x, y);
  }
}
