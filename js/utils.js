/* ============================================================
   utils.js — Helper functions, collision detection, math
   ============================================================ */

'use strict';

const Utils = (() => {

  // ---- Math helpers ----

  /** Clamp a value between min and max */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /** Linear interpolation */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Distance between two points */
  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Distance squared (cheaper for comparisons) */
  function distSq(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  /** Angle from point a to point b (radians) */
  function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  /** Normalise a 2-D vector, returns {x,y} */
  function normalise(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  /** Random float in [min, max) */
  function randFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Random integer in [min, max] */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Shuffle array in-place (Fisher-Yates) */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- Collision detection ----

  /** Circle vs Circle overlap */
  function circleCircle(ax, ay, ar, bx, by, br) {
    return distSq(ax, ay, bx, by) < (ar + br) * (ar + br);
  }

  /** Circle vs Rectangle (AABB) overlap */
  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nearX = clamp(cx, rx, rx + rw);
    const nearY = clamp(cy, ry, ry + rh);
    return distSq(cx, cy, nearX, nearY) < cr * cr;
  }

  // ---- Canvas helpers ----

  /**
   * Draw a rounded rectangle path (no fill/stroke — caller decides).
   */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Draw text with a drop shadow.
   * opts: { color, shadowColor, shadowBlur, font, align, baseline }
   */
  function shadowText(ctx, text, x, y, opts = {}) {
    ctx.save();
    if (opts.font)      ctx.font      = opts.font;
    if (opts.align)     ctx.textAlign = opts.align;
    if (opts.baseline)  ctx.textBaseline = opts.baseline;
    ctx.shadowColor  = opts.shadowColor || '#000';
    ctx.shadowBlur   = opts.shadowBlur  ?? 6;
    ctx.fillStyle    = opts.color || '#fff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Spawn position on the edge of the canvas, just outside the visible area.
   * Returns {x, y}.
   */
  function edgeSpawnPos(canvasW, canvasH, margin = 30) {
    const side = randInt(0, 3);
    switch (side) {
      case 0: return { x: randFloat(0, canvasW),  y: -margin };          // top
      case 1: return { x: canvasW + margin,        y: randFloat(0, canvasH) }; // right
      case 2: return { x: randFloat(0, canvasW),  y: canvasH + margin }; // bottom
      default:return { x: -margin,                 y: randFloat(0, canvasH) }; // left
    }
  }

  // ---- Color helpers ----

  /** Parse hex color to {r,g,b} */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  /** rgba string from hex + alpha */
  function hexAlpha(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ---- Public API ----
  return {
    clamp, lerp, dist, distSq, angleTo, normalise,
    randFloat, randInt, randChoice, shuffle,
    circleCircle, circleRect,
    roundRect, shadowText,
    edgeSpawnPos, hexToRgb, hexAlpha
  };

})();
