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
  g.fillEllipse(x, y + 8, 118, 14);
  g.fillStyle(palette.glow, 0.25);
  g.fillEllipse(x, y + 10, 140, 18);
  // Body silhouette — wedge with sloped windshield + rear
  g.fillStyle(palette.body, 1);
  g.beginPath();
  g.moveTo(x - 52 * front, y + 4);
  g.lineTo(x - 50 * front, y - 6);
  g.lineTo(x - 30 * front, y - 8);
  g.lineTo(x - 12 * front, y - 18);
  g.lineTo(x + 10 * front, y - 18);
  g.lineTo(x + 28 * front, y - 8);
  g.lineTo(x + 48 * front, y - 6);
  g.lineTo(x + 52 * front, y + 4);
  g.closePath();
  g.fillPath();
  // Body shadow under windows
  g.fillStyle(0x000000, 0.18);
  g.fillRect(x - 30, y - 4, 60, 8);
  // Windows
  g.fillStyle(palette.window, 1);
  g.beginPath();
  g.moveTo(x - 28 * front, y - 8);
  g.lineTo(x - 12 * front, y - 17);
  g.lineTo(x + 10 * front, y - 17);
  g.lineTo(x + 26 * front, y - 8);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.18);
  g.fillRect(x - 24 * front, y - 16, 18, 2);
  // Side trim line
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x - 46, y - 1, 92, 1);
  // Wheels
  g.fillStyle(0x05000d, 1);
  g.fillCircle(x - 30, y + 4, 5);
  g.fillCircle(x + 30, y + 4, 5);
  g.fillStyle(0x3a335a, 1);
  g.fillCircle(x - 30, y + 4, 2);
  g.fillCircle(x + 30, y + 4, 2);
  // Lights
  const headX = x + 48 * front;
  const tailX = x - 48 * front;
  g.fillStyle(0xffffff, 1);
  g.fillRect(headX - 2, y - 4, 4, 3);
  g.fillStyle(palette.light, 1);
  g.fillRect(tailX - 2, y - 4, 4, 3);
  g.fillStyle(palette.light, 0.35);
  g.fillCircle(tailX, y - 2, 6);
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
  const headY = GAME.groundY - 90 - Math.floor(rand() * 20);
  const bulbColor = rand() < 0.5 ? COLORS.windowWarm : COLORS.windowPink;
  g.fillStyle(0x3a335a, 1);
  g.fillRect(x - 1, headY, 2, GAME.groundY - headY);
  g.fillRect(x - 6, headY, 12, 2);
  const flicker = 0.85 + Math.sin(time * 0.004 + seed) * 0.1;
  g.fillStyle(bulbColor, 0.18 * flicker);
  g.fillCircle(x, headY + 6, 22);
  g.fillStyle(bulbColor, 0.4 * flicker);
  g.fillCircle(x, headY + 6, 12);
  g.fillStyle(bulbColor, 1);
  g.fillCircle(x, headY + 6, 4);
  g.fillStyle(bulbColor, 0.08);
  g.fillEllipse(x, GAME.groundY + 20, 80, 24);
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
  const h = 80 + Math.floor(rand() * 70);
  const w = 18 + Math.floor(rand() * 8);
  const topY = 150 + Math.floor(rand() * 30);
  g.fillStyle(0x2a2244, 1);
  g.fillRect(x - 1, topY - 18, 2, 18);
  g.fillStyle(0x1d1638, 1);
  g.fillRect(x - 5, topY - 4, 10, 4);
  g.fillStyle(color, 0.22);
  g.fillRect(x - w / 2 - 3, topY - 3, w + 6, h + 6);
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - w / 2, topY, w, h);
  const shouldFlicker = rand() < 0.18;
  const flick = shouldFlicker && Math.floor(time / 90) % 7 === 0 ? 0.35 : 1;
  g.lineStyle(2, color, flick);
  g.strokeRect(x - w / 2, topY, w, h);
  const glyphCount = 3 + Math.floor(rand() * 4);
  const slotH = (h - 12) / glyphCount;
  for (let i = 0; i < glyphCount; i++) {
    const gy = topY + 6 + i * slotH;
    const barCount = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < barCount; b++) {
      const by = gy + (b / barCount) * (slotH - 4);
      const bw = w - 6 - Math.floor(rand() * 4);
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
  const w = 80 + Math.floor(rand() * 40);
  const h = 22 + Math.floor(rand() * 14);
  const topY = 120 + Math.floor(rand() * 40);
  const borderColor = rand() < 0.5 ? COLORS.gridPink : COLORS.gridCyan;
  g.fillStyle(0x2a2244, 1);
  g.fillRect(x - 2, topY + h, 4, 18);
  g.fillStyle(borderColor, 0.2);
  g.fillRect(x - w / 2 - 3, topY - 3, w + 6, h + 6);
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - w / 2, topY, w, h);
  g.lineStyle(2, borderColor, 0.95);
  g.strokeRect(x - w / 2, topY, w, h);
  const lines = 2 + Math.floor(rand() * 2);
  const lineH = (h - 8) / lines;
  for (let i = 0; i < lines; i++) {
    const ly = topY + 4 + i * lineH + lineH * 0.35;
    const segments = 2 + Math.floor(rand() * 4);
    let cursorX = x - w / 2 + 4;
    for (let s = 0; s < segments; s++) {
      const segW = 6 + Math.floor(rand() * 14);
      const c = rand() < 0.5 ? COLORS.windowWarm : (rand() < 0.5 ? COLORS.windowPink : COLORS.windowCyan);
      g.fillStyle(c, 0.95);
      g.fillRect(cursorX, ly, segW, 2);
      cursorX += segW + 3;
      if (cursorX > x + w / 2 - 4) break;
    }
  }
}

export function drawCone(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  // Cone sits in the back half of the street so player walking in front
  // doesn't create depth-ordering weirdness.
  const baseY = GAME.floorTop + 10 + Math.floor(rand() * 40);
  // Shadow on the asphalt
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(x, baseY + 2, 20, 5);
  // Cone body (orange-red triangle)
  g.fillStyle(0xff6633, 1);
  g.beginPath();
  g.moveTo(x, baseY - 16);
  g.lineTo(x - 8, baseY);
  g.lineTo(x + 8, baseY);
  g.closePath();
  g.fillPath();
  // Reflective white stripe
  g.fillStyle(0xffffff, 0.95);
  g.fillRect(x - 6, baseY - 7, 12, 2);
  // Inner side shading
  g.fillStyle(0x000000, 0.22);
  g.beginPath();
  g.moveTo(x, baseY - 16);
  g.lineTo(x, baseY);
  g.lineTo(x + 8, baseY);
  g.closePath();
  g.fillPath();
  // Tiny highlight
  g.fillStyle(0xffffff, 0.4);
  g.fillRect(x - 2, baseY - 14, 1, 12);
}

export function drawManhole(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  const y = GAME.floorTop + 20 + Math.floor(rand() * 60);
  // Faint neon halo
  g.fillStyle(0xff2d95, 0.16);
  g.fillEllipse(x, y, 38, 13);
  // Outer rim
  g.fillStyle(0x0d0820, 1);
  g.fillEllipse(x, y, 32, 11);
  // Cover surface
  g.fillStyle(0x231a3e, 1);
  g.fillEllipse(x, y, 26, 8);
  // Inner highlight
  g.fillStyle(0x3a2c5e, 1);
  g.fillEllipse(x, y - 1, 22, 5);
  // Pry-slots / pattern (grid of tiny dots)
  g.fillStyle(0x05000d, 1);
  for (let dy = -1; dy <= 1; dy += 2) {
    for (let dx = -8; dx <= 8; dx += 4) {
      g.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  // Central glyph (small cross)
  g.fillStyle(0x05000d, 1);
  g.fillRect(x - 3, y, 7, 1);
  g.fillRect(x, y - 2, 1, 5);
}

export function drawAlley(g: Phaser.GameObjects.Graphics, x: number, seed: number) {
  const rand = mulberry32(seed);
  const w = 36 + Math.floor(rand() * 26);
  const top = 130 + Math.floor(rand() * 50);
  const bottom = GAME.groundY;
  const h = bottom - top;
  // Pure dark gap punched through the skyline.
  g.fillStyle(0x05000d, 1);
  g.fillRect(x - w / 2, top, w, h);
  // Slightly lighter "wall" edges so the alley reads as 3D space.
  g.fillStyle(0x1a0a40, 1);
  g.fillRect(x - w / 2, top, 2, h);
  g.fillRect(x + w / 2 - 2, top, 2, h);
  // Soft top-down light shaft in the middle (suggests depth + light fixture).
  g.fillStyle(0xc0a8ff, 0.06);
  g.fillRect(x - 6, top, 12, h);
  g.fillStyle(0xc0a8ff, 0.12);
  g.fillRect(x - 2, top, 4, h);
  // Glowing sign — random pink or cyan, like a back-door bar.
  const signY = top + h * 0.35;
  const signColor = rand() < 0.5 ? 0xff2d3a : 0x00f6ff;
  g.fillStyle(signColor, 0.3);
  g.fillRect(x - 7, signY - 3, 14, 8);
  g.fillStyle(signColor, 1);
  g.fillRect(x - 6, signY - 2, 12, 6);
  // Inside the sign: a couple of dim bars suggesting characters
  g.fillStyle(0x0a0414, 1);
  g.fillRect(x - 4, signY - 1, 3, 1);
  g.fillRect(x, signY - 1, 3, 1);
  g.fillRect(x - 4, signY + 1, 8, 1);
  // Wisp of vapor near the bottom
  g.fillStyle(0x6677aa, 0.18);
  g.fillRect(x - w / 2 + 3, bottom - 14, w - 6, 5);
  g.fillStyle(0x6677aa, 0.1);
  g.fillRect(x - w / 2 + 3, bottom - 22, w - 6, 5);
  // Sometimes a dumpster silhouette at the bottom.
  if (rand() < 0.55) {
    const dwsX = x + (rand() < 0.5 ? -1 : 1) * (w / 2 - 14);
    g.fillStyle(0x2a1660, 1);
    g.fillRect(dwsX - 10, bottom - 11, 20, 9);
    g.fillStyle(0x130033, 1);
    g.fillRect(dwsX - 10, bottom - 11, 20, 2);
    g.fillStyle(0x1a0a40, 1);
    g.fillRect(dwsX - 10, bottom - 11, 2, 9);
  }
}

export function drawStopSign(g: Phaser.GameObjects.Graphics, x: number) {
  const poleTopY = GAME.groundY - 36;
  g.fillStyle(0x4a4263, 1);
  g.fillRect(x - 1, poleTopY, 2, GAME.groundY - poleTopY);
  const cx = x, cy = poleTopY - 2;
  const r = 9;
  g.fillStyle(0xff2d3a, 0.25);
  g.fillCircle(cx, cy, r + 4);
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
  g.fillRect(cx - 5, cy - 1, 10, 2);
}
