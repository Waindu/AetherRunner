/* ============================================================
   main.js — Game loop, init, state management, background
   ============================================================ */

'use strict';

// ---- Canvas setup ----
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = canvas.width  = 800;
const H = canvas.height = 600;

// ---- Game states ----
const STATE = { MENU: 0, PLAYING: 1, LEVELUP: 2, GAMEOVER: 3 };
let state = STATE.MENU;

// ---- Game objects ----
let player      = null;
let enemies     = [];
let projectiles = [];
let killCount   = 0;
let pendingCards = null;
let gameOverStats = null;
let lastTime    = 0;

// ---- Input ----
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (state === STATE.MENU) {
    if (e.code === 'Enter' || e.code === 'Space') startGame();
  } else if (state === STATE.LEVELUP) {
    if (e.code === 'Digit1') chooseCard(0);
    else if (e.code === 'Digit2') chooseCard(1);
    else if (e.code === 'Digit3') chooseCard(2);
  } else if (state === STATE.GAMEOVER) {
    if (e.code === 'Enter' || e.code === 'Space') startGame();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', e => {
  const rect  = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx    = (e.clientX - rect.left) * scaleX;
  const my    = (e.clientY - rect.top)  * scaleY;

  if (state === STATE.MENU) {
    startGame();
  } else if (state === STATE.LEVELUP) {
    const idx = UI.getCardAtPos(mx, my);
    if (idx >= 0) chooseCard(idx);
  } else if (state === STATE.GAMEOVER && _restartBtnBounds) {
    const b = _restartBtnBounds;
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      startGame();
    }
  }
});

canvas.addEventListener('mousemove', e => {
  if (state !== STATE.LEVELUP) return;
  const rect  = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const mx    = (e.clientX - rect.left) * scaleX;
  const my    = (e.clientY - rect.top)  * scaleY;
  UI.setHoveredCard(UI.getCardAtPos(mx, my));
});

let _restartBtnBounds = null;

// ---- Start / restart ----
function startGame() {
  // Clear everything
  enemies.length     = 0;
  projectiles.length = 0;
  killCount   = 0;
  pendingCards = null;
  gameOverStats = null;

  player = new Player(W / 2, H / 2);
  // Start with Gear Shot
  player.weapons.push(WeaponDefs['gear_shot']());

  Wave.reset();
  Particles.clear();

  state = STATE.PLAYING;
}

// ---- Level-up flow ----
function triggerLevelUp() {
  pendingCards = Upgrade.generateCards(player);
  UI.initLevelUpCards(pendingCards);
  state = STATE.LEVELUP;
}

function chooseCard(idx) {
  if (!pendingCards || idx >= pendingCards.length) return;
  const card = pendingCards[idx];
  const evoId = Upgrade.applyCard(card, player);
  if (evoId) {
    // Remove the two base weapons and add evolved
    const evo = EVOLUTIONS.find(e => e.result === evoId);
    if (evo) {
      player.weapons = player.weapons.filter(
        w => !evo.requires.includes(w.id)
      );
    }
    player.weapons.push(WeaponDefs[evoId]());
  }
  pendingCards = null;
  state = STATE.PLAYING;
}

// ---- Background (parallax factory silhouettes) ----
let bgOffset1 = 0;
let bgOffset2 = 0;

// Pre-generate silhouette shapes once
const BG = (() => {
  const layer1 = _genSilhouette(0, 0.3, 18, 60, 180, '#1f1008');
  const layer2 = _genSilhouette(1, 0.6, 22, 80, 260, '#241406');
  function _genSilhouette(seed, density, count, minH, maxH, color) {
    const buildings = [];
    let x = 0;
    const rng = (() => { let s = seed * 999 + 1; return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; }; })();
    while (x < W * 2 + 200) {
      const w = rng() * 40 + 20;
      const h = rng() * (maxH - minH) + minH;
      buildings.push({ x, w, h, color });
      // Chimneys on some buildings
      const chimneys = [];
      if (rng() > 0.4) chimneys.push({ dx: rng() * w * 0.6 + w * 0.1, h: h + rng() * 30 + 10, w: 6 + rng() * 4 });
      if (rng() > 0.6) chimneys.push({ dx: rng() * w * 0.6 + w * 0.1, h: h + rng() * 20 + 5,  w: 5 + rng() * 3 });
      buildings[buildings.length - 1].chimneys = chimneys;
      // Windows
      const windows = [];
      if (h > 60) {
        const cols = Math.floor(w / 14);
        const rows = Math.floor(h / 18);
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (rng() > 0.5) {
              windows.push({ dx: c * 14 + 5, dy: r * 18 + 8 });
            }
          }
        }
      }
      buildings[buildings.length - 1].windows = windows;
      x += w + rng() * 10 + 2;
    }
    return buildings;
  }

  function drawLayer(blds, offX, baseY, ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const b of blds) {
      const bx = ((b.x - offX) % (W * 2 + 200) + (W * 2 + 200)) % (W * 2 + 200) - 200;
      if (bx > W + 50 || bx + b.w < -50) continue;

      // Building
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, baseY - b.h, b.w, b.h);

      // Chimneys
      for (const ch of b.chimneys) {
        ctx.fillRect(bx + ch.dx, baseY - ch.h, ch.w, ch.h - b.h);
      }

      // Windows (tiny amber squares)
      ctx.fillStyle = 'rgba(212,134,11,0.35)';
      for (const win of b.windows) {
        ctx.fillRect(bx + win.dx, baseY - b.h + win.dy, 5, 4);
      }
    }
    ctx.restore();
  }

  return { layer1, layer2, drawLayer };
})();

function drawBackground(dt) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0d0705');
  skyGrad.addColorStop(0.6, '#1a0f0a');
  skyGrad.addColorStop(1, '#251508');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars / embers
  _drawEmbers();

  // Parallax layers
  bgOffset1 += 8 * dt;
  bgOffset2 += 16 * dt;
  BG.drawLayer(BG.layer2, bgOffset2, H + 20, ctx, 0.9);
  BG.drawLayer(BG.layer1, bgOffset1, H, ctx, 1.0);

  // Ground line
  ctx.fillStyle = '#150a04';
  ctx.fillRect(0, H - 2, W, 2);
}

const EMBERS = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.7,
  s: Math.random() * 1.5 + 0.3,
  a: Math.random(),
  sp: Math.random() * 0.5 + 0.1,
  drift: (Math.random() - 0.5) * 10
}));

function _drawEmbers() {
  const t = Date.now() * 0.001;
  for (const e of EMBERS) {
    const flicker = 0.4 + Math.sin(t * e.sp * 6 + e.x) * 0.35;
    ctx.globalAlpha = flicker * e.a;
    ctx.fillStyle   = Math.random() > 0.8 ? '#4fc3f7' : '#d4860b';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
    ctx.fill();
    // Slowly drift upward
    e.y -= e.sp * 0.3;
    e.x += e.drift * 0.01;
    if (e.y < 0) { e.y = H * 0.7; e.x = Math.random() * W; }
  }
  ctx.globalAlpha = 1;
}

// ---- Main game update ----
function update(dt) {
  // --- Player movement ---
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['KeyA']) dx -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
  if (keys['ArrowUp']    || keys['KeyW']) dy -= 1;
  if (keys['ArrowDown']  || keys['KeyS']) dy += 1;

  player.move(dx, dy, dt, W, H);
  player.update(dt);

  // --- Weapons ---
  for (const w of player.weapons) {
    w.update(dt, player, enemies, projectiles);
  }

  // --- Bomb explosions ---
  for (const p of projectiles) {
    if (!p.alive && p._explodeEnemy) {
      p._explodeEnemy(enemies);
      p._explodeEnemy = null;  // prevent double-trigger
    }
  }

  // --- Enemies ---
  for (const e of enemies) {
    if (!e.alive) continue;
    e.update(dt, player, projectiles);

    // Contact damage to player
    if (Utils.circleCircle(player.x, player.y, player.radius, e.x, e.y, e.radius)) {
      player.takeDamage(e.damage * dt * 2);   // rate-based contact damage
    }
  }

  // --- Enemy projectiles hit player ---
  for (const p of projectiles) {
    if (!p.alive || p.owner !== 'enemy') continue;
    if (Utils.circleCircle(player.x, player.y, player.radius, p.x, p.y, p.radius)) {
      player.takeDamage(p.damage);
      p.alive = false;
    }
    // Cull off-screen
    if (p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) p.alive = false;
  }

  // --- Player projectiles hit enemies ---
  for (const p of projectiles) {
    if (!p.alive || p.owner !== 'player') continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (p.hitSet.has(e)) continue;
      if (Utils.circleCircle(p.x, p.y, p.radius, e.x, e.y, e.radius)) {
        if (p.onHit(e)) {
          e.takeDamage(p.damage);
        }
      }
    }
    // Cull off-screen
    if (p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) p.alive = false;
  }

  // --- Update all projectiles ---
  for (const p of projectiles) p.update(dt);

  // --- Remove dead entities ---
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) {
      const e = enemies[i];
      Wave.dropXpOrb(e.x, e.y, e.xp);
      killCount++;
      enemies.splice(i, 1);
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].alive) projectiles.splice(i, 1);
  }

  // --- XP orbs ---
  const levelled = Wave.updateXpOrbs(dt, player);
  if (levelled) triggerLevelUp();

  // --- Wave spawner ---
  Wave.update(dt, enemies, W, H);

  // --- Particles ---
  Particles.update(dt);

  // --- Boss screen shake ---
  const hasBoss = enemies.some(e => e.type === 'boss');
  if (hasBoss) UI.triggerShake(1.5, 0.05);

  // --- Death ---
  if (!player.alive) {
    const elapsed = Wave.getGameTime();
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
    gameOverStats = {
      time: `${mm}:${ss}`,
      kills: killCount,
      level: player.level
    };
    state = STATE.GAMEOVER;
  }
}

// ---- Main render ----
function render() {
  ctx.save();
  UI.applyShake(ctx, 1 / 60);

  drawBackground(1 / 60);

  if (state === STATE.PLAYING || state === STATE.LEVELUP) {
    // Draw XP orbs
    Wave.drawXpOrbs(ctx);

    // Draw weapon orbital effects (blades, arcs)
    for (const w of player.weapons) {
      if (w.draw) w.draw(ctx, player);
    }

    // Draw projectiles
    for (const p of projectiles) p.draw(ctx);

    // Draw enemies
    for (const e of enemies) e.draw(ctx);

    // Draw player
    player.draw(ctx);

    // Particles
    Particles.draw(ctx);

    // Vignette
    UI.drawVignette(ctx, W, H);

    // HUD
    UI.drawHUD(ctx, player, killCount, W);

    if (state === STATE.LEVELUP) {
      UI.updateLevelUpCards(1 / 60);
      UI.drawLevelUp(ctx, W, H);
    }
  }

  ctx.restore();

  if (state === STATE.MENU) {
    drawBackground(0);
    UI.drawVignette(ctx, W, H);
    UI.drawMenu(ctx, W, H);
  }

  if (state === STATE.GAMEOVER) {
    drawBackground(0);
    UI.drawVignette(ctx, W, H);
    _restartBtnBounds = UI.drawGameOver(ctx, W, H, gameOverStats);
  }
}

// ---- Game loop ----
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  if (state === STATE.PLAYING) update(dt);

  render();

  requestAnimationFrame(gameLoop);
}

// ---- Boot ----
(function init() {
  // Hide loading screen after a brief moment
  const loading = document.getElementById('loading');
  if (loading) {
    const bar = document.getElementById('loading-bar');
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 30 + 10, 100);
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (loading) loading.classList.add('hidden');
          setTimeout(() => { if (loading) loading.style.display = 'none'; }, 500);
        }, 200);
      }
    }, 80);
  }

  requestAnimationFrame(ts => {
    lastTime = ts;
    requestAnimationFrame(gameLoop);
  });
})();
