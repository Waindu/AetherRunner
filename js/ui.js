/* ============================================================
   ui.js — HUD, menu, level-up screen, game over screen
   ============================================================ */

'use strict';

const UI = (() => {

  // ---- Card animation state ----
  let cards      = [];
  let cardAnims  = [];    // {y, targetY, alpha}
  const CARD_W   = 200;
  const CARD_H   = 260;
  const CARD_GAP = 24;

  // ---- Vignette cache ----
  let vignetteGrad = null;

  // ---- Menu ----
  function drawMenu(ctx, W, H) {
    // Background overlay
    ctx.fillStyle = 'rgba(10,5,2,0.88)';
    ctx.fillRect(0, 0, W, H);

    // Title
    const now = Date.now() * 0.001;
    const wobble = Math.sin(now * 1.5) * 3;

    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Glow
    ctx.shadowColor = '#d4860b';
    ctx.shadowBlur  = 40;
    ctx.font        = 'bold 54px "Courier New"';
    ctx.fillStyle   = '#ffd700';
    ctx.fillText('AETHER', W / 2, H / 2 - 90 + wobble);

    ctx.shadowColor = '#b87333';
    ctx.shadowBlur  = 20;
    ctx.font        = 'bold 36px "Courier New"';
    ctx.fillStyle   = '#d4860b';
    ctx.fillText('RUNNER', W / 2, H / 2 - 42 + wobble);
    ctx.shadowBlur  = 0;

    // Subtitle
    ctx.font      = '14px "Courier New"';
    ctx.fillStyle = '#8a6020';
    ctx.fillText('— Steampunk Roguelike —', W / 2, H / 2 + 5);

    // Start prompt (blinking)
    const blink = Math.floor(now * 2) % 2 === 0;
    if (blink) {
      ctx.font      = '18px "Courier New"';
      ctx.fillStyle = '#e8c9a0';
      ctx.shadowColor = '#d4860b';
      ctx.shadowBlur  = 8;
      ctx.fillText('[ PRESS ENTER OR CLICK TO START ]', W / 2, H / 2 + 60);
    }
    ctx.shadowBlur = 0;

    // Controls
    ctx.font      = '13px "Courier New"';
    ctx.fillStyle = '#6b5030';
    ctx.fillText('WASD / Arrow Keys  ·  Weapons fire automatically', W / 2, H / 2 + 100);
    ctx.fillText('Survive as long as possible!', W / 2, H / 2 + 120);

    // Gear decoration
    ctx.restore();

    _drawDecorativeGears(ctx, W, H, now);
  }

  function _drawDecorativeGears(ctx, W, H, t) {
    const gears = [
      { x: 90,  y: 120, r: 34, teeth: 12, speed: 0.4 },
      { x: W - 90, y: 130, r: 28, teeth: 10, speed: -0.5 },
      { x: 60,  y: H - 80, r: 22, teeth: 8,  speed: 0.7 },
      { x: W - 70, y: H - 90, r: 26, teeth: 10, speed: -0.3 }
    ];
    for (const g of gears) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(t * g.speed);
      ctx.strokeStyle = '#6b3f0a';
      ctx.fillStyle   = 'rgba(100,60,10,0.3)';
      ctx.lineWidth   = 2;
      const inner = g.r * 0.6;
      ctx.beginPath();
      for (let i = 0; i < g.teeth * 2; i++) {
        const a   = (i / (g.teeth * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? g.r : inner;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, inner * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---- HUD ----
  function drawHUD(ctx, player, killCount, W) {
    const PAD = 12;

    // ---- HP bar ----
    const hpBarW  = 180;
    const hpBarH  = 14;
    const hpFrac  = player.hp / player.maxHp;
    const hpColor = hpFrac > 0.5 ? '#cc2222' : hpFrac > 0.25 ? '#ff6600' : '#ff0000';

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    Utils.roundRect(ctx, PAD, PAD, hpBarW + 4, hpBarH + 4, 3);
    ctx.fill();

    ctx.fillStyle = '#440000';
    ctx.fillRect(PAD + 2, PAD + 2, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(PAD + 2, PAD + 2, hpBarW * hpFrac, hpBarH);
    // HP text
    ctx.font         = 'bold 10px "Courier New"';
    ctx.fillStyle    = '#fff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#000';
    ctx.shadowBlur   = 3;
    ctx.fillText(`HP  ${Math.ceil(player.hp)} / ${player.maxHp}`, PAD + 2 + hpBarW / 2, PAD + 2 + hpBarH / 2);
    ctx.shadowBlur = 0;

    // ---- XP bar ----
    const xpBarY  = PAD + hpBarH + 8;
    const xpBarW  = 180;
    const xpBarH  = 8;
    const xpFrac  = player.xp / player.xpToNext;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    Utils.roundRect(ctx, PAD, xpBarY, xpBarW + 4, xpBarH + 4, 3);
    ctx.fill();

    ctx.fillStyle = '#2a1a00';
    ctx.fillRect(PAD + 2, xpBarY + 2, xpBarW, xpBarH);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(PAD + 2, xpBarY + 2, xpBarW * xpFrac, xpBarH);

    // Level label
    ctx.font         = 'bold 12px "Courier New"';
    ctx.fillStyle    = '#ffd700';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = '#000';
    ctx.shadowBlur   = 4;
    ctx.fillText(`LVL ${player.level}`, PAD, xpBarY + xpBarH + 6);
    ctx.shadowBlur   = 0;

    // ---- Timer (top center) ----
    const elapsed = Wave.getGameTime();
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
    ctx.font         = 'bold 22px "Courier New"';
    ctx.fillStyle    = '#e8e0d0';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = '#b87333';
    ctx.shadowBlur   = 8;
    ctx.fillText(`${mm}:${ss}`, W / 2, PAD);
    ctx.shadowBlur   = 0;

    // ---- Kill counter (top right) ----
    ctx.font         = '13px "Courier New"';
    ctx.fillStyle    = '#b87333';
    ctx.textAlign    = 'right';
    ctx.shadowColor  = '#000';
    ctx.shadowBlur   = 3;
    ctx.fillText(`☠ ${killCount}`, W - PAD, PAD);
    ctx.shadowBlur   = 0;

    // ---- Weapons list (top right below kill count) ----
    ctx.font         = '11px "Courier New"';
    ctx.fillStyle    = '#d4860b';
    let weapY = PAD + 22;
    for (const w of player.weapons) {
      ctx.textAlign    = 'right';
      ctx.fillText(`${w.icon} ${w.name} Lv.${w.level}`, W - PAD, weapY);
      weapY += 15;
    }

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ---- Level-up screen ----
  function initLevelUpCards(cardList) {
    cards     = cardList;
    cardAnims = cards.map((_, i) => {
      const targetX = _cardX(i, cards.length);
      return { x: targetX, startY: 700, y: 700, targetY: _cardY(), alpha: 0 };
    });
  }

  function _cardX(i, total) {
    const totalW = total * CARD_W + (total - 1) * CARD_GAP;
    const startX = (800 - totalW) / 2;
    return startX + i * (CARD_W + CARD_GAP);
  }

  function _cardY() { return 160; }

  function updateLevelUpCards(dt) {
    for (const a of cardAnims) {
      a.y     = Utils.lerp(a.y, a.targetY, Math.min(1, dt * 8));
      a.alpha = Utils.lerp(a.alpha, 1, Math.min(1, dt * 6));
    }
  }

  function drawLevelUp(ctx, W, H) {
    // Dark overlay
    ctx.fillStyle = 'rgba(8,4,1,0.82)';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.font         = 'bold 30px "Courier New"';
    ctx.fillStyle    = '#ffd700';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#d4860b';
    ctx.shadowBlur   = 20;
    ctx.fillText('— LEVEL UP —', W / 2, 80);
    ctx.shadowBlur   = 0;

    ctx.font      = '14px "Courier New"';
    ctx.fillStyle = '#a08060';
    ctx.fillText('Choose an upgrade', W / 2, 116);

    // Cards
    for (let i = 0; i < cards.length; i++) {
      drawCard(ctx, cards[i], cardAnims[i], i);
    }
  }

  function drawCard(ctx, card, anim, idx) {
    ctx.save();
    ctx.globalAlpha = anim.alpha;
    ctx.translate(anim.x, anim.y);

    // Hover effect — done in drawLevelUp via mouse tracking
    const hovered = _hoveredCard === idx;
    const scale   = hovered ? 1.05 : 1.0;
    ctx.scale(scale, scale);
    ctx.translate(hovered ? -CARD_W * 0.025 : 0, hovered ? -CARD_H * 0.025 : 0);

    // Card background
    const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    grad.addColorStop(0, hovered ? '#3a2010' : '#251508');
    grad.addColorStop(1, hovered ? '#1e1008' : '#150a04');
    Utils.roundRect(ctx, 0, 0, CARD_W, CARD_H, 8);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? '#ffd700' : '#b87333';
    ctx.lineWidth   = hovered ? 2.5 : 1.5;
    Utils.roundRect(ctx, 0, 0, CARD_W, CARD_H, 8);
    ctx.stroke();

    // Icon
    ctx.font         = '40px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, CARD_W / 2, 54);

    // Name
    ctx.font         = 'bold 13px "Courier New"';
    ctx.fillStyle    = hovered ? '#ffd700' : '#e8c9a0';
    ctx.textBaseline = 'top';
    ctx.fillText(card.name, CARD_W / 2, 96);

    // Separator
    ctx.strokeStyle = hovered ? '#ffd700' : '#6b3f0a';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(20, 118);
    ctx.lineTo(CARD_W - 20, 118);
    ctx.stroke();

    // Description (word-wrap)
    ctx.font         = '11px "Courier New"';
    ctx.fillStyle    = '#a08060';
    _wrapText(ctx, card.description, CARD_W / 2, 128, CARD_W - 24, 16);

    // Press hint
    ctx.font         = '10px "Courier New"';
    ctx.fillStyle    = hovered ? '#ffd700' : '#6b4a1a';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`[ ${idx + 1} ]  Click to choose`, CARD_W / 2, CARD_H - 10);

    ctx.restore();
  }

  let _hoveredCard = -1;

  function setHoveredCard(idx) { _hoveredCard = idx; }

  function getCardAtPos(mouseX, mouseY) {
    for (let i = 0; i < cards.length; i++) {
      const a = cardAnims[i];
      if (mouseX >= a.x && mouseX <= a.x + CARD_W &&
          mouseY >= a.y && mouseY <= a.y + CARD_H) {
        return i;
      }
    }
    return -1;
  }

  // Simple word-wrap for canvas
  function _wrapText(ctx, text, cx, startY, maxW, lineH) {
    const words  = text.split(' ');
    let line     = '';
    let y        = startY;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, y);
        line = word;
        y   += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, y);
  }

  // ---- Game Over screen ----
  function drawGameOver(ctx, W, H, stats) {
    ctx.fillStyle = 'rgba(5,2,0,0.92)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font      = 'bold 46px "Courier New"';
    ctx.fillStyle = '#cc2222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur  = 24;
    ctx.fillText('SYSTEM FAILURE', W / 2, H / 2 - 130);
    ctx.shadowBlur  = 0;

    // Subtitle
    ctx.font      = '16px "Courier New"';
    ctx.fillStyle = '#8a6020';
    ctx.fillText('The automatons have overwhelmed the engineer.', W / 2, H / 2 - 82);

    // Stats box
    ctx.fillStyle = 'rgba(20,10,4,0.7)';
    Utils.roundRect(ctx, W / 2 - 160, H / 2 - 50, 320, 150, 8);
    ctx.fill();
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth   = 1.5;
    Utils.roundRect(ctx, W / 2 - 160, H / 2 - 50, 320, 150, 8);
    ctx.stroke();

    ctx.font         = '15px "Courier New"';
    ctx.fillStyle    = '#e8c9a0';
    ctx.textBaseline = 'top';
    const lines = [
      `⏱  Time survived : ${stats.time}`,
      `☠  Kills          : ${stats.kills}`,
      `⭐  Level reached  : ${stats.level}`,
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H / 2 - 38 + i * 28);
    });

    // Restart button
    const btnW = 220, btnH = 44;
    const btnX = W / 2 - btnW / 2, btnY = H / 2 + 120;
    ctx.fillStyle   = '#3a1a06';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 2;
    Utils.roundRect(ctx, btnX, btnY, btnW, btnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font         = 'bold 16px "Courier New"';
    ctx.fillStyle    = '#ffd700';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#d4860b';
    ctx.shadowBlur   = 10;
    ctx.fillText('[ RESTART ]', W / 2, btnY + btnH / 2);
    ctx.shadowBlur   = 0;

    // Return button bounds for click detection
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  // ---- Vignette ----
  function drawVignette(ctx, W, H) {
    if (!vignetteGrad) {
      vignetteGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
    }
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- Screen shake ----
  let shakeTime = 0, shakeAmt = 0;

  function triggerShake(amount, duration) {
    shakeAmt = amount;
    shakeTime = duration;
  }

  function applyShake(ctx, dt) {
    if (shakeTime <= 0) return;
    shakeTime = Math.max(0, shakeTime - dt);
    const s = shakeAmt * (shakeTime > 0 ? 1 : 0);
    ctx.translate(
      Utils.randFloat(-s, s),
      Utils.randFloat(-s, s)
    );
  }

  return {
    drawMenu,
    drawHUD,
    drawLevelUp,
    drawGameOver,
    drawVignette,
    initLevelUpCards,
    updateLevelUpCards,
    setHoveredCard,
    getCardAtPos,
    triggerShake,
    applyShake,
    get cards() { return cards; }
  };

})();
