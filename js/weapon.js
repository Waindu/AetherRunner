/* ============================================================
   weapon.js — Weapon classes (6 auto-firing weapons + evolution)
   ============================================================ */

'use strict';

// ---- Weapon base ----
class Weapon {
  constructor(id, name, description, icon) {
    this.id          = id;
    this.name        = name;
    this.description = description;
    this.icon        = icon;     // a short emoji/char for HUD

    this.level       = 1;
    this.maxLevel    = 5;

    // Overridden by subclass
    this.cooldown    = 1.0;    // fire rate (s)
    this.timer       = 0;      // countdown to next fire
    this.damage      = 10;
    this.projectileSpeed = 300;
    this.range       = 400;
    this.pierce      = 0;
    this.multishot   = 1;      // number of projectiles per burst

    this.owner = null;         // set to player reference
  }

  // Called each frame
  update(dt, player, enemies, projectiles) {
    this.owner = player;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      this.fire(player, enemies, projectiles);
    }
  }

  fire(player, enemies, projectiles) {
    // Override in subclass
  }

  // Upgrade this weapon by one level (returns false if max)
  upgrade() {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this._applyLevelBonus();
    return true;
  }

  _applyLevelBonus() {
    // Default: increase damage and slightly reduce cooldown
    this.damage   = Math.round(this.damage * 1.3);
    this.cooldown = Math.max(this.cooldown * 0.85, 0.2);
  }

  // ---- Closest enemy helper ----
  _closestEnemy(player, enemies, maxRange = Infinity) {
    let best = null;
    let bestDist = maxRange * maxRange;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Utils.distSq(player.x, player.y, e.x, e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  _nClosestEnemies(player, enemies, n, maxRange = Infinity) {
    const list = enemies
      .filter(e => e.alive && Utils.distSq(player.x, player.y, e.x, e.y) < maxRange * maxRange)
      .sort((a, b) =>
        Utils.distSq(player.x, player.y, a.x, a.y) -
        Utils.distSq(player.x, player.y, b.x, b.y)
      );
    return list.slice(0, n);
  }
}

// ---- 1: Gear Shot ----
class GearShot extends Weapon {
  constructor() {
    super('gear_shot', 'Gear Shot', 'Spinning gear projectiles forward', '⚙');
    this.cooldown        = 0.6;
    this.damage          = 12;
    this.projectileSpeed = 320;
    this.range           = 380;
    this.multishot       = 1;
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},                                   // Lv1 baseline
      { damage: 18, multishot: 2 },         // Lv2
      { damage: 24, cooldown: 0.5 },        // Lv3
      { damage: 32, multishot: 3 },         // Lv4
      { damage: 44, pierce: 1 }             // Lv5
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)    this.damage    = b.damage;
    if (b.multishot) this.multishot = b.multishot;
    if (b.cooldown)  this.cooldown  = b.cooldown;
    if (b.pierce)    this.pierce    = b.pierce;
  }

  fire(player, enemies, projectiles) {
    const target = this._closestEnemy(player, enemies, 600);
    let baseAngle = target
      ? Utils.angleTo(player.x, player.y, target.x, target.y)
      : player.facing;

    for (let i = 0; i < this.multishot; i++) {
      const spread = this.multishot > 1 ? (i / (this.multishot - 1) - 0.5) * 0.45 : 0;
      projectiles.push(new Projectile({
        x: player.x, y: player.y,
        angle: baseAngle + spread,
        speed: this.projectileSpeed,
        damage: this.damage,
        radius: 8,
        range: this.range,
        color: '#d4860b',
        type: 'gear',
        pierce: this.pierce,
        owner: 'player'
      }));
    }
    Particles.sparks(player.x, player.y, '#d4860b', 3);
  }
}

// ---- 2: Steam Burst ----
class SteamBurst extends Weapon {
  constructor() {
    super('steam_burst', 'Steam Burst', 'AoE steam cloud around player', '💨');
    this.cooldown = 1.8;
    this.damage   = 18;
    this.range    = 100;       // AoE radius
    this.timer    = 0.5;       // small initial delay
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},
      { damage: 28, range: 120 },
      { damage: 38, cooldown: 1.5 },
      { damage: 52, range: 145 },
      { damage: 70, cooldown: 1.2, range: 170 }
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)   this.damage   = b.damage;
    if (b.range)    this.range    = b.range;
    if (b.cooldown) this.cooldown = b.cooldown;
  }

  update(dt, player, enemies, projectiles) {
    this.owner = player;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      this.fire(player, enemies, projectiles);
    }
  }

  fire(player, enemies) {
    // Damage all enemies in radius
    let hit = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Utils.dist(player.x, player.y, e.x, e.y) <= this.range + e.radius) {
        e.takeDamage(this.damage);
        hit = true;
      }
    }
    // Always emit steam visual
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      Particles.steam(
        player.x + Math.cos(a) * this.range * 0.6,
        player.y + Math.sin(a) * this.range * 0.6,
        2
      );
    }
    if (hit) Particles.sparks(player.x, player.y, '#c8bfb0', 8);
  }

  draw(ctx, player) {
    // Draw AoE ring briefly after firing
    if (this.timer > this.cooldown - 0.2) {
      const age  = this.cooldown - this.timer;
      const pct  = age / 0.2;
      ctx.save();
      ctx.globalAlpha = 0.3 * (1 - pct);
      ctx.strokeStyle = '#c8bfb0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, this.range * pct, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---- 3: Tesla Coil ----
class TeslaCoil extends Weapon {
  constructor() {
    super('tesla_coil', 'Tesla Coil', 'Chain lightning between nearby enemies', '⚡');
    this.cooldown = 1.4;
    this.damage   = 14;
    this.range    = 180;
    this.chains   = 3;
    this._arcs    = [];      // [{x1,y1,x2,y2,life}]
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},
      { damage: 22, chains: 4 },
      { damage: 30, cooldown: 1.2 },
      { damage: 42, chains: 6 },
      { damage: 60, chains: 8, cooldown: 0.9 }
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)   this.damage   = b.damage;
    if (b.chains)   this.chains   = b.chains;
    if (b.cooldown) this.cooldown = b.cooldown;
  }

  update(dt, player, enemies, projectiles) {
    this.owner = player;
    this.timer -= dt;
    // Decay arcs
    for (let i = this._arcs.length - 1; i >= 0; i--) {
      this._arcs[i].life -= dt * 4;
      if (this._arcs[i].life <= 0) this._arcs.splice(i, 1);
    }
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      this.fire(player, enemies, projectiles);
    }
  }

  fire(player, enemies) {
    const nearby = this._nClosestEnemies(player, enemies, this.chains, this.range);
    if (nearby.length === 0) return;

    // Arc from player to first, then chain
    let prevX = player.x, prevY = player.y;
    for (const e of nearby) {
      e.takeDamage(this.damage);
      this._arcs.push({ x1: prevX, y1: prevY, x2: e.x, y2: e.y, life: 1 });
      Particles.lightning(e.x, e.y, 3);
      prevX = e.x; prevY = e.y;
    }
  }

  draw(ctx) {
    for (const arc of this._arcs) {
      ctx.save();
      ctx.globalAlpha = arc.life;
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur  = 12;
      // Jagged lightning
      ctx.beginPath();
      const segments = 8;
      ctx.moveTo(arc.x1, arc.y1);
      for (let i = 1; i < segments; i++) {
        const t   = i / segments;
        const lx  = arc.x1 + (arc.x2 - arc.x1) * t + Utils.randFloat(-10, 10);
        const ly  = arc.y1 + (arc.y2 - arc.y1) * t + Utils.randFloat(-10, 10);
        ctx.lineTo(lx, ly);
      }
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---- 4: Aether Cannon ----
class AetherCannon extends Weapon {
  constructor() {
    super('aether_cannon', 'Aether Cannon', 'Slow powerful piercing shot', '🔫');
    this.cooldown        = 2.5;
    this.damage          = 55;
    this.projectileSpeed = 180;
    this.range           = 700;
    this.pierce          = 10;   // pierces everything
    this.timer           = 1.0;
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},
      { damage: 85 },
      { damage: 115, cooldown: 2.0 },
      { damage: 155 },
      { damage: 220, cooldown: 1.6 }
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)   this.damage   = b.damage;
    if (b.cooldown) this.cooldown = b.cooldown;
  }

  fire(player, enemies, projectiles) {
    const target = this._closestEnemy(player, enemies, 800);
    const angle  = target
      ? Utils.angleTo(player.x, player.y, target.x, target.y)
      : player.facing;

    projectiles.push(new Projectile({
      x: player.x, y: player.y,
      angle,
      speed:  this.projectileSpeed,
      damage: this.damage,
      radius: 14,
      range:  this.range,
      color:  '#9b59b6',
      type:   'cannon',
      pierce: this.pierce,
      owner:  'player'
    }));
    Particles.explosion(player.x, player.y, 15);
  }
}

// ---- 5: Clockwork Blades ----
class ClockworkBlades extends Weapon {
  constructor() {
    super('clockwork_blades', 'Clockwork Blades', 'Orbiting blades around player', '🗡');
    this.cooldown = 99999;   // not projectile-based
    this.damage   = 20;
    this.range    = 60;      // orbit radius
    this.bladeCount = 3;
    this.orbitAngle = 0;
    this.orbitSpeed = 2.5;   // rad/s
    this._hitCooldown = new Map();  // enemyId → timer
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},
      { damage: 30, bladeCount: 4 },
      { damage: 42, orbitSpeed: 3.0 },
      { damage: 58, bladeCount: 5 },
      { damage: 80, bladeCount: 6, orbitSpeed: 3.8 }
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)      this.damage      = b.damage;
    if (b.bladeCount)  this.bladeCount  = b.bladeCount;
    if (b.orbitSpeed)  this.orbitSpeed  = b.orbitSpeed;
  }

  update(dt, player, enemies) {
    this.owner = player;
    this.orbitAngle += this.orbitSpeed * dt;

    // Decay hit cooldowns
    for (const [key, val] of this._hitCooldown) {
      const next = val - dt;
      if (next <= 0) this._hitCooldown.delete(key);
      else this._hitCooldown.set(key, next);
    }

    // Check collision with enemies
    for (let i = 0; i < this.bladeCount; i++) {
      const a  = this.orbitAngle + (i / this.bladeCount) * Math.PI * 2;
      const bx = player.x + Math.cos(a) * this.range;
      const by = player.y + Math.sin(a) * this.range;

      for (const e of enemies) {
        if (!e.alive) continue;
        if (this._hitCooldown.has(e)) continue;
        if (Utils.circleCircle(bx, by, 10, e.x, e.y, e.radius)) {
          e.takeDamage(this.damage);
          this._hitCooldown.set(e, 0.5);
          Particles.sparks(bx, by, '#ffd700', 5);
        }
      }
    }
  }

  draw(ctx, player) {
    for (let i = 0; i < this.bladeCount; i++) {
      const a  = this.orbitAngle + (i / this.bladeCount) * Math.PI * 2;
      const bx = player.x + Math.cos(a) * this.range;
      const by = player.y + Math.sin(a) * this.range;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + this.orbitAngle * 3);
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#d4860b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;

      // Diamond/rhombus blade
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Orbit trail
      ctx.beginPath();
      ctx.arc(player.x, player.y, this.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,134,11,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ---- 6: Pipe Bomb ----
class PipeBomb extends Weapon {
  constructor() {
    super('pipe_bomb', 'Pipe Bomb', 'Explosive arc bombs', '💣');
    this.cooldown = 3.0;
    this.damage   = 60;
    this.range    = 80;     // explosion radius
    this.timer    = 1.5;
  }

  _applyLevelBonus() {
    const bonuses = [null,
      {},
      { damage: 90,  range: 95  },
      { damage: 120, cooldown: 2.5 },
      { damage: 160, range: 115 },
      { damage: 220, cooldown: 2.0, range: 135 }
    ];
    const b = bonuses[this.level];
    if (!b) return;
    if (b.damage)   this.damage   = b.damage;
    if (b.range)    this.range    = b.range;
    if (b.cooldown) this.cooldown = b.cooldown;
  }

  fire(player, enemies, projectiles) {
    // Target the cluster of enemies or the closest
    const target = this._closestEnemy(player, enemies, 500);
    const angle  = target
      ? Utils.angleTo(player.x, player.y, target.x, target.y)
      : player.facing;

    const bomb = new Projectile({
      x: player.x, y: player.y,
      angle,
      speed: 260,
      damage: this.damage,
      radius: 8,
      range: 200,
      color: '#b87333',
      type: 'bomb',
      owner: 'player',
      gravity: 180,
      fuseTime: 0.8,
      explodeRadius: this.range
    });

    // Override onHit: when bomb "dies" via range/fuse, explode
    const explodeRadius = this.range;
    const dmg = this.damage;
    bomb._explodeEnemy = (enemyList) => {
      for (const e of enemyList) {
        if (!e.alive) continue;
        if (Utils.dist(bomb.x, bomb.y, e.x, e.y) <= explodeRadius + e.radius) {
          e.takeDamage(dmg);
        }
      }
      Particles.explosion(bomb.x, bomb.y, explodeRadius);
    };

    projectiles.push(bomb);
  }
}

// ---- Evolved Weapons ----
// GearShot(Lv5) + SteamBurst(Lv5) → Aether Engine
class AetherEngine extends Weapon {
  constructor() {
    super('aether_engine', 'Aether Engine', '⚙+💨 EVOLVED: Gear shrapnel in all directions', '🌀');
    this.cooldown  = 0.5;
    this.damage    = 70;
    this.range     = 450;
    this.level     = 5;
    this.maxLevel  = 5;
    this.multishot = 8;
  }

  fire(player, enemies, projectiles) {
    for (let i = 0; i < this.multishot; i++) {
      const angle = (i / this.multishot) * Math.PI * 2;
      projectiles.push(new Projectile({
        x: player.x, y: player.y,
        angle,
        speed:  320,
        damage: this.damage,
        radius: 9,
        range:  this.range,
        color:  '#d4860b',
        type:   'gear',
        pierce: 2,
        owner:  'player'
      }));
    }
    Particles.steam(player.x, player.y, 6);
  }
}

// TeslaCoil(Lv5) + AetherCannon(Lv5) → Galvanic Destroyer
class GalvanicDestroyer extends Weapon {
  constructor() {
    super('galvanic_destroyer', 'Galvanic Destroyer', '⚡+🔫 EVOLVED: Electric cannon that chains', '🌩');
    this.cooldown  = 1.2;
    this.damage    = 300;
    this.range     = 700;
    this.pierce    = 20;
    this.level     = 5;
    this.maxLevel  = 5;
    this._arcs     = [];
  }

  update(dt, player, enemies, projectiles) {
    this.owner = player;
    this.timer -= dt;
    for (let i = this._arcs.length - 1; i >= 0; i--) {
      this._arcs[i].life -= dt * 3;
      if (this._arcs[i].life <= 0) this._arcs.splice(i, 1);
    }
    if (this.timer <= 0) {
      this.timer = this.cooldown;
      this.fire(player, enemies, projectiles);
    }
  }

  fire(player, enemies, projectiles) {
    const target = this._closestEnemy(player, enemies, 800);
    const angle  = target
      ? Utils.angleTo(player.x, player.y, target.x, target.y)
      : player.facing;
    projectiles.push(new Projectile({
      x: player.x, y: player.y,
      angle,
      speed:  200,
      damage: this.damage,
      radius: 18,
      range:  this.range,
      color:  '#4fc3f7',
      type:   'cannon',
      pierce: this.pierce,
      owner:  'player'
    }));
    // Chain arcs to nearby
    const nearby = this._nClosestEnemies(player, enemies, 5, 220);
    let prev = { x: player.x, y: player.y };
    for (const e of nearby) {
      e.takeDamage(120);
      this._arcs.push({ x1: prev.x, y1: prev.y, x2: e.x, y2: e.y, life: 1 });
      prev = e;
    }
    Particles.explosion(player.x, player.y, 25);
  }

  draw(ctx) {
    for (const arc of this._arcs) {
      ctx.save();
      ctx.globalAlpha = arc.life;
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur  = 16;
      ctx.beginPath();
      const segments = 10;
      ctx.moveTo(arc.x1, arc.y1);
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        ctx.lineTo(
          arc.x1 + (arc.x2 - arc.x1) * t + Utils.randFloat(-15, 15),
          arc.y1 + (arc.y2 - arc.y1) * t + Utils.randFloat(-15, 15)
        );
      }
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---- Weapon registry ----
const WeaponDefs = {
  gear_shot:           () => new GearShot(),
  steam_burst:         () => new SteamBurst(),
  tesla_coil:          () => new TeslaCoil(),
  aether_cannon:       () => new AetherCannon(),
  clockwork_blades:    () => new ClockworkBlades(),
  pipe_bomb:           () => new PipeBomb(),
  // evolutions (not obtainable directly)
  aether_engine:       () => new AetherEngine(),
  galvanic_destroyer:  () => new GalvanicDestroyer()
};

const BASE_WEAPON_IDS = [
  'gear_shot', 'steam_burst', 'tesla_coil',
  'aether_cannon', 'clockwork_blades', 'pipe_bomb'
];

// Evolution map: [weaponIdA, weaponIdB] → evolvedId
const EVOLUTIONS = [
  { requires: ['gear_shot', 'steam_burst'],    result: 'aether_engine' },
  { requires: ['tesla_coil', 'aether_cannon'], result: 'galvanic_destroyer' }
];

/**
 * Check if player weapons qualify for an evolution.
 * Returns evolved weapon id or null.
 */
function checkEvolution(playerWeapons) {
  for (const evo of EVOLUTIONS) {
    const [a, b] = evo.requires;
    const wA = playerWeapons.find(w => w.id === a);
    const wB = playerWeapons.find(w => w.id === b);
    if (wA && wA.level >= wA.maxLevel && wB && wB.level >= wB.maxLevel) {
      // Not already evolved
      if (!playerWeapons.find(w => w.id === evo.result)) {
        return evo.result;
      }
    }
  }
  return null;
}
