import Phaser from 'phaser';
import { COLORS } from '../config';
import type { CutsceneConfig } from '../scenes/CutsceneScene';

// Panel 1 — wide skyline at night, an OmniCast logo glowing on a building.
function drawSkylineWithLogo(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  // Sky gradient
  g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyHorizon, COLORS.skyHorizon, 1);
  g.fillRect(0, 0, w, h);

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 53) % w);
    const sy = ((i * 31) % (h * 0.55));
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(sx, sy, 2, 2);
  }

  // Moon
  const mx = w * 0.78, my = h * 0.22;
  g.fillStyle(COLORS.moonHalo, 0.18);
  g.fillCircle(mx, my, 38);
  g.fillStyle(COLORS.moon, 1);
  g.fillCircle(mx, my, 22);

  // Skyline
  const baseY = h * 0.95;
  const buildings: Array<[number, number, number, number]> = [
    [0, 140, 70, COLORS.bldgNearA],
    [60, 180, 90, COLORS.bldgNearB],
    [140, 210, 110, COLORS.bldgNearC],   // tall — will host logo
    [240, 150, 85, COLORS.bldgNearA],
    [320, 200, 100, COLORS.bldgNearD],
    [410, 170, 80, COLORS.bldgNearB],
    [480, 230, 120, COLORS.bldgNearC],
    [590, 160, 75, COLORS.bldgNearA],
    [660, 195, 95, COLORS.bldgNearD],
    [750, 145, 70, COLORS.bldgNearB],
  ];
  for (const [x, bh, bw, color] of buildings) {
    g.fillStyle(color, 1);
    g.fillRect(x, baseY - bh, bw, bh);
    // Windows
    for (let wy = 8; wy < bh - 8; wy += 8) {
      for (let wx = 4; wx < bw - 4; wx += 8) {
        if ((wx + wy) % 3 !== 0) {
          const hot = ((wx * 7 + wy * 3) % 5) === 0;
          g.fillStyle(hot ? COLORS.windowWarm : COLORS.windowCyan, hot ? 1 : 0.7);
          g.fillRect(x + wx, baseY - bh + wy, 2, 2);
        }
      }
    }
  }

  // OmniCast neon sign on the tallest mid building (x=140, bh=210)
  const signX = 145;
  const signY = baseY - 210 + 30;
  const signW = 100;
  const signH = 18;
  g.fillStyle(COLORS.gridPink, 0.18);
  g.fillRect(signX - 4, signY - 4, signW + 8, signH + 8);
  g.fillStyle(0x05000d, 1);
  g.fillRect(signX, signY, signW, signH);
  g.lineStyle(2, COLORS.gridPink, 1);
  g.strokeRect(signX, signY, signW, signH);
  // Faux "OMNICAST" — just bright bars suggesting letters
  for (let i = 0; i < 8; i++) {
    const lx = signX + 8 + i * 11;
    g.fillStyle(COLORS.gridPink, 1);
    g.fillRect(lx, signY + 5, 2, 8);
    g.fillRect(lx + 4, signY + 5, 2, 8);
  }

  // Asphalt at the bottom
  g.fillStyle(COLORS.street, 1);
  g.fillRect(0, baseY, w, h - baseY);
  g.fillStyle(COLORS.curbNeon, 0.95);
  g.fillRect(0, baseY - 1, w, 2);
}

// Panel 2 — Mira's apartment, rebuilt.
// Upper: corkboard with photos pinned around Nole, red string connecting them.
// Middle: dim desk + laptop pushed to the side, in shadow.
// Floor: chalk outline where her body was.
// Foreground: huge glowing USB drive — eye anchor.
function drawApartment(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  // Room background — flat very dark backdrop
  g.fillStyle(0x05000d, 1);
  g.fillRect(0, 0, w, h);
  // Slightly lighter back wall up top
  g.fillStyle(0x0d0824, 1);
  g.fillRect(0, 0, w, h * 0.62);

  // Angled moonlight beam from upper-left — single dramatic light source
  g.fillStyle(COLORS.moonHalo, 0.06);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(w * 0.45, 0);
  g.lineTo(w * 0.72, h);
  g.lineTo(0, h);
  g.closePath();
  g.fillPath();
  g.fillStyle(COLORS.moonHalo, 0.08);
  g.beginPath();
  g.moveTo(w * 0.05, 0);
  g.lineTo(w * 0.3, 0);
  g.lineTo(w * 0.55, h);
  g.lineTo(w * 0.3, h);
  g.closePath();
  g.fillPath();

  // ============================================================
  // CORKBOARD — fills upper area, anchors environmental storytelling
  // ============================================================
  const boardX = w * 0.14;
  const boardY = 18;
  const boardW = w * 0.72;
  const boardH = h * 0.5;
  // Cork board base
  g.fillStyle(0x4a3220, 1);
  g.fillRect(boardX, boardY, boardW, boardH);
  // Cork texture (small dots)
  for (let i = 0; i < 80; i++) {
    const px = boardX + 4 + ((i * 37) % (boardW - 8));
    const py = boardY + 4 + ((i * 53) % (boardH - 8));
    g.fillStyle(0x3a2618, 1);
    g.fillRect(px, py, 1, 1);
  }
  // Frame edge highlight + shadow
  g.fillStyle(0x6a4830, 1);
  g.fillRect(boardX, boardY, boardW, 2);
  g.fillStyle(0x1a0e08, 1);
  g.fillRect(boardX, boardY + boardH - 2, boardW, 2);
  g.fillRect(boardX, boardY, 2, boardH);
  g.fillRect(boardX + boardW - 2, boardY, 2, boardH);

  // ---- Central NOLE photo (the target) ----
  const noleW = 80;
  const noleH = 100;
  const noleX = boardX + boardW / 2 - noleW / 2;
  const noleY = boardY + boardH / 2 - noleH / 2 - 4;
  // Photo paper
  g.fillStyle(0xe8e0d0, 1);
  g.fillRect(noleX, noleY, noleW, noleH);
  g.fillStyle(0xc8c0b0, 1);
  g.fillRect(noleX, noleY + noleH - 12, noleW, 12); // "name plate" strip at bottom
  // Nole silhouette inside the photo
  g.fillStyle(0x1a1a26, 1);
  g.fillRect(noleX + 18, noleY + 50, 44, 38); // shoulders / suit
  g.fillRect(noleX + 34, noleY + 42, 12, 10); // neck
  g.fillRect(noleX + 25, noleY + 16, 30, 28); // head
  // Slight collar / tie hint
  g.fillStyle(0xe8e0d0, 1);
  g.fillRect(noleX + 38, noleY + 52, 4, 14);
  // Eyes — barely visible
  g.fillStyle(0xe8e0d0, 0.6);
  g.fillRect(noleX + 30, noleY + 28, 3, 2);
  g.fillRect(noleX + 47, noleY + 28, 3, 2);
  // Photo border
  g.lineStyle(1, 0x000000, 0.6);
  g.strokeRect(noleX, noleY, noleW, noleH);
  // Red circle around his head — TARGET
  g.lineStyle(3, COLORS.gridPink, 1);
  g.strokeCircle(noleX + 40, noleY + 30, 18);
  // Red X across the photo
  g.lineStyle(3, COLORS.gridPink, 0.9);
  g.beginPath();
  g.moveTo(noleX + 6, noleY + 8);
  g.lineTo(noleX + noleW - 6, noleY + noleH - 12);
  g.strokePath();
  g.beginPath();
  g.moveTo(noleX + noleW - 6, noleY + 8);
  g.lineTo(noleX + 6, noleY + noleH - 12);
  g.strokePath();
  // Push-pin in the center top
  g.fillStyle(COLORS.gridPink, 1);
  g.fillCircle(noleX + noleW / 2, noleY + 4, 3);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(noleX + noleW / 2 - 1, noleY + 3, 1);

  // ---- Other evidence photos around Nole ----
  const photos = [
    { x: boardX + 30,                y: boardY + 20,  w: 70, h: 56, kind: 'tower' as const },
    { x: boardX + 30,                y: boardY + 95,  w: 80, h: 50, kind: 'doc'   as const },
    { x: boardX + boardW - 100,      y: boardY + 20,  w: 70, h: 65, kind: 'tower' as const },
    { x: boardX + boardW - 110,      y: boardY + 100, w: 80, h: 50, kind: 'screen' as const },
  ];
  for (const p of photos) {
    // Tape strip at the top
    g.fillStyle(0xeae8c4, 0.85);
    g.fillRect(p.x + p.w / 2 - 6, p.y - 5, 12, 7);
    // Photo paper
    g.fillStyle(0xe8e0d0, 1);
    g.fillRect(p.x, p.y, p.w, p.h);
    g.lineStyle(1, 0x000000, 0.5);
    g.strokeRect(p.x, p.y, p.w, p.h);
    // Content silhouette
    g.fillStyle(0x33334a, 1);
    if (p.kind === 'tower') {
      // Broadcasting tower — vertical with antenna struts
      const tx = p.x + p.w / 2;
      g.fillRect(tx - 1, p.y + 6, 3, p.h - 14);
      g.fillRect(tx - 14, p.y + p.h - 12, 28, 4);
      g.lineStyle(1, 0x33334a, 1);
      for (let i = 0; i < 3; i++) {
        const ly = p.y + 14 + i * 12;
        g.beginPath(); g.moveTo(tx, ly); g.lineTo(tx - 10, ly + 8); g.strokePath();
        g.beginPath(); g.moveTo(tx, ly); g.lineTo(tx + 10, ly + 8); g.strokePath();
      }
    } else if (p.kind === 'doc') {
      // Document with redacted text lines
      for (let i = 0; i < 6; i++) {
        const ly = p.y + 6 + i * 7;
        const width = (i % 3 === 0) ? p.w * 0.4 : p.w * 0.75;
        g.fillRect(p.x + 4, ly, width, 1);
        // A couple of redactions
        if (i === 2) { g.fillStyle(0x000000, 1); g.fillRect(p.x + 4, ly - 1, 18, 3); g.fillStyle(0x33334a, 1); }
        if (i === 4) { g.fillStyle(0x000000, 1); g.fillRect(p.x + 28, ly - 1, 22, 3); g.fillStyle(0x33334a, 1); }
      }
    } else if (p.kind === 'screen') {
      // OmniCast logo / screen
      g.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
      g.fillStyle(COLORS.gridPink, 0.85);
      for (let i = 0; i < 6; i++) {
        const lx = p.x + 12 + i * 5;
        g.fillRect(lx, p.y + p.h / 2 - 4, 2, 8);
      }
      g.fillStyle(0x33334a, 1);
    }
  }

  // ---- RED STRING connecting evidence photos to Nole ----
  g.lineStyle(2, 0xd6233a, 0.85);
  const noleCx = noleX + noleW / 2;
  const noleCy = noleY + noleH / 2;
  for (const p of photos) {
    g.beginPath();
    g.moveTo(p.x + p.w / 2, p.y + p.h / 2);
    g.lineTo(noleCx, noleCy);
    g.strokePath();
  }

  // ============================================================
  // FLOOR + DESK
  // ============================================================
  const floorY = h * 0.68;
  g.fillStyle(0x100828, 1);
  g.fillRect(0, floorY, w, h - floorY);
  // Floor grain
  g.fillStyle(0x070418, 1);
  g.fillRect(0, floorY, w, 2);

  // Small dim desk pushed to the right side of the wall, with laptop
  const deskW = 140;
  const deskH = 8;
  const deskX = w * 0.7;
  const deskY = floorY - 18;
  g.fillStyle(0x2a1c10, 1);
  g.fillRect(deskX, deskY, deskW, deskH);
  g.fillStyle(0x4a3424, 1);
  g.fillRect(deskX, deskY, deskW, 1);
  g.fillStyle(0x1a1008, 1);
  g.fillRect(deskX + 6, deskY + deskH, 4, floorY - deskY - deskH);
  g.fillRect(deskX + deskW - 10, deskY + deskH, 4, floorY - deskY - deskH);
  // Tiny laptop on desk — secondary detail
  const lapW = 50;
  const lapBaseH = 4;
  const lapScreenH = 24;
  const lapX = deskX + 12;
  const lapBaseY = deskY - lapBaseH;
  g.fillStyle(0x1a1a26, 1);
  g.fillRect(lapX, lapBaseY, lapW, lapBaseH);
  g.fillRect(lapX + 2, lapBaseY - lapScreenH, lapW - 4, lapScreenH);
  g.fillStyle(0x0a1430, 1);
  g.fillRect(lapX + 4, lapBaseY - lapScreenH + 2, lapW - 8, lapScreenH - 4);
  // Subtle static lines on screen
  for (let i = 0; i < lapScreenH - 4; i += 3) {
    if ((i / 3) % 2 === 0) {
      g.fillStyle(0x223060, 0.5);
      g.fillRect(lapX + 4, lapBaseY - lapScreenH + 2 + i, lapW - 8, 1);
    }
  }

  // (Floor intentionally left empty — lighting + the corkboard + the dialog
  // carry the tone. Restraint is the senior move here.)

  // ============================================================
  // HUGE USB DRIVE — foreground hero element (centered now that the
  // chalk outline is gone, owns the foreground unchallenged)
  // ============================================================
  const usbX = w * 0.42;
  const usbY = floorY + 60;
  // Massive cyan glow halo
  g.fillStyle(COLORS.gridCyan, 0.08);
  g.fillCircle(usbX, usbY, 70);
  g.fillStyle(COLORS.gridCyan, 0.16);
  g.fillCircle(usbX, usbY, 45);
  g.fillStyle(COLORS.gridCyan, 0.32);
  g.fillCircle(usbX, usbY, 24);
  // Drive body — 3x previous size
  const usbW = 68;
  const usbH = 26;
  g.fillStyle(0x0a0414, 1);
  g.fillRect(usbX - usbW / 2, usbY - usbH / 2, usbW, usbH);
  g.fillStyle(0x1a1428, 1);
  g.fillRect(usbX - usbW / 2 + 2, usbY - usbH / 2 + 2, usbW - 4, 3);
  // Metal connector sticking out the front
  g.fillStyle(0xc0c0d0, 1);
  g.fillRect(usbX + usbW / 2, usbY - 9, 26, 18);
  g.fillStyle(0x808090, 1);
  g.fillRect(usbX + usbW / 2 + 2, usbY - 7, 22, 2);
  g.fillRect(usbX + usbW / 2 + 2, usbY + 5, 22, 2);
  // Bright highlight stripe
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(usbX - usbW / 2 + 10, usbY - usbH / 2 + 5, 18, 2);
  // Cyan LED indicator
  g.fillStyle(COLORS.gridCyan, 1);
  g.fillCircle(usbX + usbW / 2 - 8, usbY, 3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(usbX + usbW / 2 - 8, usbY, 1);
}

// Panel 3 — Iris's silhouette in the doorway, looking at the USB drive on the floor.
function drawIrisInDoorway(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  // Dark interior beyond doorway
  g.fillStyle(0x05000d, 1);
  g.fillRect(0, 0, w, h);

  // Doorway frame — bright rectangle behind her (hall light)
  const doorW = 120, doorH = h * 0.78;
  const doorX = w / 2 - doorW / 2;
  const doorY = h * 0.1;
  g.fillStyle(COLORS.skyHorizon, 1);
  g.fillRect(doorX, doorY, doorW, doorH);
  // Door frame highlight
  g.lineStyle(3, COLORS.gridPink, 0.9);
  g.strokeRect(doorX, doorY, doorW, doorH);
  g.fillStyle(COLORS.gridPink, 0.18);
  g.fillRect(doorX - 6, doorY - 6, doorW + 12, doorH + 12);

  // Iris silhouette — backlit, dark on bright doorway
  const irisX = w / 2;
  const irisGroundY = doorY + doorH - 4;
  const sx = irisX - 14;
  const sy = irisGroundY - 92;

  // Body silhouette (trench coat shape)
  g.fillStyle(0x0a0414, 1);
  // Head
  g.fillRect(sx + 9, sy, 10, 12);
  // Sweatband (red still visible against backlight)
  g.fillStyle(COLORS.gridPink, 0.95);
  g.fillRect(sx + 8, sy + 3, 12, 3);
  // Body / coat
  g.fillStyle(0x0a0414, 1);
  g.fillRect(sx + 3, sy + 12, 22, 4);   // shoulders
  g.fillRect(sx + 4, sy + 16, 20, 38);  // coat body
  g.fillRect(sx + 3, sy + 54, 22, 14);  // coat flare
  // Legs
  g.fillRect(sx + 8, sy + 68, 5, 18);
  g.fillRect(sx + 15, sy + 68, 5, 18);
  // Boots
  g.fillRect(sx + 7, sy + 86, 7, 4);
  g.fillRect(sx + 14, sy + 86, 7, 4);

  // Floor
  const floorY = h * 0.88;
  g.fillStyle(0x100828, 1);
  g.fillRect(0, floorY, w, h - floorY);

  // USB drive at Iris's feet — small catching the doorway light
  const ux = irisX - 4;
  const uy = floorY - 6;
  g.fillStyle(0x05000d, 1);
  g.fillRect(ux, uy, 14, 7);
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(ux + 2, uy + 1, 4, 1);
}

export const OPENING_CUTSCENE: CutsceneConfig = {
  nextScene: 'GameScene',
  panels: [
    {
      draw: drawSkylineWithLogo,
      lines: [
        'The city runs on one signal.',
        'OmniCast owns ninety-four percent of every screen, every speaker, every billboard.',
        "Tonight, they're going for the last six.",
      ],
    },
    {
      draw: drawApartment,
      lines: [
        'My sister tried to tell the truth.',
        'They made it look like a suicide.',
      ],
    },
    {
      draw: drawIrisInDoorway,
      lines: [
        "I'm Iris. She was Mira.",
        'I never listened when she was alive.',
        "I'll listen now.",
      ],
    },
  ],
};
