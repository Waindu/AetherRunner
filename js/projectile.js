/* ============================================================
   projectile.js — Projectile logic (player & enemy)
   ============================================================ */

'use strict';

class Projectile {
  /**
   * @param {object} opts
   * opts.x, opts.y        - start position
   * opts.angle            - direction (radians)
   * opts.speed            - px/s
   * opts.damage           - damage dealt
   * opts.radius           - collision radius
   * opts.range            - max travel distance (px)
   * opts.color            - draw color
   * opts.type             - 'bullet'|'gear'|'steam'|'tesla'|'cannon'|'bomb'|'enemy'
   * opts.pierce           - how many enemies it can pierce (default 0 = 1 hit)
   * opts.owner            - 'player' | 'enemy'
   * opts.ownerId          - reference to prevent self-hit
   */
  constructor(opts) {
    this.x      = opts.x;
    this.y      = opts.y;
    this.vx     = Math.cos(opts.angle) * opts.speed;
    this.vy     = Math.sin(opts.angle) * opts.speed;
    this.damage = opts.damage || 10;
    this.radius = opts.radius || 5;
    this.range  = opts.range  || 400;
    this.color  = opts.color  || '#ffd700';
    this.type   = opts.type   || 'bullet';
    this.pierce = opts.pierce ?? 0;
    this.owner  = opts.owner  || 'player';
    this.ownerId = opts.ownerId || null;
    this.alive  = true;
    this.travelledSq = 0;
    this.rangeSq     = this.range * this.range;
    this.rotation    = Utils.randFloat(0, Math.PI * 2);
    this.rotSpeed    = Utils.randFloat(-8, 8);
    this.hitSet      = new Set(); // entities already hit

    // Bomb specific
    this.gravity  = opts.gravity  || 0;
    this.fuseTime = opts.fuseTime || 0;
    this.explodeRadius = opts.explodeRadius || 0;

    // Electric arc (tesla)
    this.arcTargets = [];

    // Age (for effects)
    this.age = 0;
  }

  update(dt) {
    if (!this.alive) return;

    this.age += dt;
    this.vy   += this.gravity * dt;
    const px  = this.vx * dt;
    const py  = this.vy * dt;
    this.x   += px;
    this.y   += py;
    this.travelledSq += px * px + py * py;
    this.rotation    += this.rotSpeed * dt;

    if (this.travelledSq >= this.rangeSq) {
      this.alive = false;
    }

    // Fuse bomb
    if (this.fuseTime > 0) {
      this.fuseTime -= dt;
      if (this.fuseTime <= 0) {
        this.alive = false;
        Particles.explosion(this.x, this.y, this.explodeRadius);
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    switch (this.type) {
      case 'gear':       this._drawGear(ctx);      break;
      case 'steam':      this._drawSteam(ctx);     break;
      case 'cannon':     this._drawCannon(ctx);    break;
      case 'bomb':       this._drawBomb(ctx);      break;
      case 'enemy':      this._drawEnemy(ctx);     break;
      default:           this._drawBullet(ctx);    break;
    }

    ctx.restore();
  }

  _drawBullet(ctx) {
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawGear(ctx) {
    ctx.rotate(this.rotation);
    ctx.strokeStyle = this.color;
    ctx.fillStyle   = Utils.hexAlpha(this.color, 0.6);
    ctx.lineWidth   = 1.5;
    const r = this.radius;
    const inner = r * 0.55;
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
    // Centre hole
    ctx.beginPath();
    ctx.arc(0, 0, inner * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawSteam(ctx) {
    const r = this.radius * (1 + this.age * 2);
    ctx.globalAlpha = Math.max(0, 0.7 - this.age * 0.5);
    ctx.fillStyle   = '#c8bfb0';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawCannon(ctx) {
    ctx.rotate(this.rotation * 0.2);
    // Glowing blue-purple cannon ball
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, '#4a0080');
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBomb(ctx) {
    // Bomb body
    ctx.fillStyle   = '#333';
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Fuse spark
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(3, -this.radius - 6);
    ctx.stroke();
  }

  _drawEnemy(ctx) {
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#ff4400';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  onHit(target) {
    if (this.hitSet.has(target)) return false;
    this.hitSet.add(target);
    if (this.pierce <= 0) {
      this.alive = false;
    } else {
      this.pierce--;
    }
    return true;
  }
}
