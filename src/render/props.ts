import Phaser from 'phaser';
import { COLORS, GAME } from '../config';

export interface CarPalette {
  body: number;
  window: number;
  glow: number;
  light: number;
}

export function drawCar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  dir: 1 | -1,
  palette: CarPalette,
) {
  const front = dir === 1 ? 1 : -1;
  // Neon underglow on the asphalt
  g.fillStyle(palette.glow, 0.45);
  g.fillEllipse(x, y + 4, 59, 7);
  g.fillStyle(palette.glow, 0.25);
  g.fillEllipse(x, y + 5, 70, 9);
  // Body silhouette — wedge with sloped windshield + rear
  g.fillStyle(palette.body, 1);
  g.beginPath();
  g.moveTo(x - 26 * front, y + 2);
  g.lineTo(x - 25 * front, y - 3);
  g.lineTo(x - 15 * front, y - 4);
  g.lineTo(x - 6 * front, y - 9);
  g.lineTo(x + 5 * front, y - 9);
  g.lineTo(x + 14 * front, y - 4);
  g.lineTo(x + 24 * front, y - 3);
  g.lineTo(x + 26 * front, y + 2);
  g.closePath();
  g.fillPath();
  // Body shadow under windows
  g.fillStyle(0x000000, 0.18);
  g.fillRect(x - 15, y - 2, 30, 4);
  // Windows
  g.fillStyle(palette.window, 1);
  g.beginPath();
  g.moveTo(x - 14 * front, y - 4);
  g.lineTo(x - 6 * front, y - 8);
  g.lineTo(x + 5 * front, y - 8);
  g.lineTo(x + 13 * front, y - 4);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.18);
  g.fillRect(x - 12 * front, y - 8, 9, 1);
  // Side trim line
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x - 23, y - 1, 46, 1);
  // Wheels
  g.fillStyle(0x05000d, 1);
  g.fillCircle(x - 15, y + 2, 3);
  g.fillCircle(x + 15, y + 2, 3);
  g.fillStyle(0x3a335a, 1);
  g.fillCircle(x - 15, y + 2, 1);
  g.fillCircle(x + 15, y + 2, 1);
  // Lights
  const headX = x + 24 * front;
  const tailX = x - 24 * front;
  g.fillStyle(0xffffff, 1);
  g.fillRect(headX - 1, y - 2, 2, 2);
  g.fillStyle(palette.light, 1);
  g.fillRect(tailX - 1, y - 2, 2, 2);
  g.fillStyle(palette.light, 0.35);
  g.fillCircle(tailX, y - 1, 3);
}

// Tiny seeded PRNG so identical inputs produce identical visuals across runs.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawLamp(
  g: Phaser.GameObjects.Graphics,
  x: number,
  seed: number,
  time: number,
) {
  const rand = mulberry32(seed);
  const headY = GAME.groundY - 45 - Math.floor(rand() * 10);
  const bulbColor = rand() < 0.5 ? COLORS.windowWarm : COLORS.windowPink;
  g.fillStyle(0x3a335a, 1);
  g.fillRect(x - 1, headY, 1, GAME.groundY - headY);
  g.fillRect(x - 3, headY, 6, 1);
  const flicker = 0.85 + Math.sin(time * 0.004 + seed) * 0.1;
  g.fillStyle(bulbColor, 0.18 * flicker);
  g.fillCircle(x, headY + 3, 11);
  g.fillStyle(bulbColor, 0.4 * flicker);
  g.fillCircle(x, headY + 3, 6);
  g.fillStyle(bulbColor, 1);
  g.fillCircle(x, headY + 3, 2);
  g.fillStyle(bulbColor, 0.08);
  g.fillEllipse(x, GAME.groundY + 10, 40, 12);
}

export function drawHangingSign(
  g: Phaser.GameObjects.Graphics,
  x: number,
  seed: number,
  time: number,
) {
  const rand = mulberry32(seed);
  const palette = [COLORS.gridPink, COLORS.gridCyan, COLORS.windowWarm, COLORS.windowPink];
  const color = palette[Math.floor(rand() * palette.length)];
  const h = 40 + Math.floor(rand() * 35);
  const w = 9 + Math.floor(rand() * 4);
  const topY = 75 + Math.floor(rand() * 15);
  g.fillStyle(0x2a2244, 1);
  g.fillRect(x - 1, topY - 9, 1, 9);
  g.fillStyle(0x1d1638, 1);
  g.fillRect(x - 3, topY - 2, 6, 2);
  g.fillStyle(color, 0.22);
  g.fillRect(x - w / 2 - 2, topY - 2, w + 4, h + 4);
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - w / 2, topY, w, h);
  const shouldFlicker = rand() < 0.18;
  const flick = shouldFlicker && Math.floor(time / 90) % 7 === 0 ? 0.35 : 1;
  g.lineStyle(1, color, flick);
  g.strokeRect(x - w / 2, topY, w, h);
  const glyphCount = 3 + Math.floor(rand() * 4);
  const slotH = (h - 6) / glyphCount;
  for (let i = 0; i < glyphCount; i++) {
    const gy = topY + 3 + i * slotH;
    const barCount = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < barCount; b++) {
      const by = gy + (b / barCount) * (slotH - 2);
      const bw = w - 3 - Math.floor(rand() * 2);
      const bx = x - bw / 2;
      g.fillStyle(color, 0.85);
      g.fillRect(bx, by, bw, 1);
    }
  }
}

export function drawBillboard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  seed: number,
) {
  const rand = mulberry32(seed);
  const w = 40 + Math.floor(rand() * 20);
  const h = 11 + Math.floor(rand() * 7);
  const topY = 60 + Math.floor(rand() * 20);
  const borderColor = rand() < 0.5 ? COLORS.gridPink : COLORS.gridCyan;
  g.fillStyle(0x2a2244, 1);
  g.fillRect(x - 1, topY + h, 2, 9);
  g.fillStyle(borderColor, 0.2);
  g.fillRect(x - w / 2 - 2, topY - 2, w + 4, h + 4);
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - w / 2, topY, w, h);
  g.lineStyle(1, borderColor, 0.95);
  g.strokeRect(x - w / 2, topY, w, h);
  const lines = 2 + Math.floor(rand() * 2);
  const lineH = (h - 4) / lines;
  for (let i = 0; i < lines; i++) {
    const ly = topY + 2 + i * lineH + lineH * 0.35;
    const segments = 2 + Math.floor(rand() * 4);
    let cursorX = x - w / 2 + 2;
    for (let s = 0; s < segments; s++) {
      const segW = 3 + Math.floor(rand() * 7);
      const c = rand() < 0.5 ? COLORS.windowWarm : (rand() < 0.5 ? COLORS.windowPink : COLORS.windowCyan);
      g.fillStyle(c, 0.95);
      g.fillRect(cursorX, ly, segW, 1);
      cursorX += segW + 2;
      if (cursorX > x + w / 2 - 2) break;
    }
  }
}

export function drawCone(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  // Cone sits in the back half of the street so player walking in front
  // doesn't create depth-ordering weirdness.
  const baseY = GAME.floorTop + 5 + Math.floor(rand() * 20);
  // Shadow on the asphalt
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(x, baseY + 1, 10, 3);
  // Cone body (orange-red triangle)
  g.fillStyle(0xff6633, 1);
  g.beginPath();
  g.moveTo(x, baseY - 8);
  g.lineTo(x - 4, baseY);
  g.lineTo(x + 4, baseY);
  g.closePath();
  g.fillPath();
  // Reflective white stripe
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(x - 3, baseY - 4, 6, 1);
  // Inner side shading
  g.fillStyle(0x000000, 0.22);
  g.beginPath();
  g.moveTo(x, baseY - 8);
  g.lineTo(x, baseY);
  g.lineTo(x + 4, baseY);
  g.closePath();
  g.fillPath();
  // Tiny highlight
  g.fillStyle(0xffffff, 0.4);
  g.fillRect(x - 1, baseY - 7, 1, 6);
}

export function drawManhole(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  const y = GAME.floorTop + 10 + Math.floor(rand() * 30);
  // Faint neon halo
  g.fillStyle(0xff2d95, 0.16);
  g.fillEllipse(x, y, 19, 7);
  // Outer rim
  g.fillStyle(0x0d0820, 1);
  g.fillEllipse(x, y, 16, 6);
  // Cover surface
  g.fillStyle(0x231a3e, 1);
  g.fillEllipse(x, y, 13, 4);
  // Inner highlight
  g.fillStyle(0x3a2c5e, 1);
  g.fillEllipse(x, y - 1, 11, 3);
  // Pry-slots / pattern (grid of tiny dots)
  g.fillStyle(0x05000d, 1);
  for (let dy = -1; dy <= 1; dy += 2) {
    for (let dx = -4; dx <= 4; dx += 2) {
      g.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  // Central glyph (small cross)
  g.fillStyle(0x05000d, 1);
  g.fillRect(x - 2, y, 4, 1);
  g.fillRect(x, y - 1, 1, 3);
}

export function drawAlley(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  const w = 18 + Math.floor(rand() * 13);
  const top = 65 + Math.floor(rand() * 25);
  const bottom = GAME.groundY;
  const h = bottom - top;
  // Pure dark gap punched through the skyline.
  g.fillStyle(0x05000d, 1);
  g.fillRect(x - w / 2, top, w, h);
  // Slightly lighter "wall" edges so the alley reads as 3D space.
  g.fillStyle(0x1a0a40, 1);
  g.fillRect(x - w / 2, top, 1, h);
  g.fillRect(x + w / 2 - 1, top, 1, h);
  // Soft top-down light shaft in the middle (suggests depth + light fixture).
  g.fillStyle(0xc0a8ff, 0.06);
  g.fillRect(x - 3, top, 6, h);
  g.fillStyle(0xc0a8ff, 0.12);
  g.fillRect(x - 1, top, 2, h);
  // Glowing sign — random pink or cyan, like a back-door bar.
  const signY = top + h * 0.35;
  const signColor = rand() < 0.5 ? 0xff2d3a : 0x00f6ff;
  g.fillStyle(signColor, 0.3);
  g.fillRect(x - 4, signY - 2, 7, 4);
  g.fillStyle(signColor, 1);
  g.fillRect(x - 3, signY - 1, 6, 3);
  // Inside the sign: a couple of dim bars suggesting characters
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - 2, signY, 1, 1);
  g.fillRect(x, signY, 1, 1);
  g.fillRect(x - 2, signY + 1, 4, 1);
  // Wisp of vapor near the bottom
  g.fillStyle(0x6677aa, 0.18);
  g.fillRect(x - w / 2 + 2, bottom - 7, w - 4, 3);
  g.fillStyle(0x6677aa, 0.1);
  g.fillRect(x - w / 2 + 2, bottom - 11, w - 4, 3);
  // Sometimes a dumpster silhouette at the bottom.
  if (rand() < 0.55) {
    const dwsX = x + (rand() < 0.5 ? -1 : 1) * (w / 2 - 7);
    g.fillStyle(0x2a1660, 1);
    g.fillRect(dwsX - 5, bottom - 5, 10, 4);
    g.fillStyle(0x130033, 1);
    g.fillRect(dwsX - 5, bottom - 5, 10, 1);
    g.fillStyle(0x1a0a40, 1);
    g.fillRect(dwsX - 5, bottom - 5, 1, 4);
  }
}

export function drawStopSign(g: Phaser.GameObjects.Graphics, x: number) {
  const poleTopY = GAME.groundY - 18;
  g.fillStyle(0x4a4263, 1);
  g.fillRect(x - 1, poleTopY, 1, GAME.groundY - poleTopY);
  const cx = x, cy = poleTopY - 1;
  const r = 5;
  g.fillStyle(0xff2d3a, 0.25);
  g.fillCircle(cx, cy, r + 2);
  g.fillStyle(0xee2233, 1);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = Math.PI / 8 + i * (Math.PI / 4);
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
  g.lineStyle(1, 0xffffff, 0.5);
  g.strokePath();
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(cx - 2, cy, 5, 1);
}
