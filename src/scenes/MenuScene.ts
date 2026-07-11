import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, HEX, GAME, CAR_PALETTE } from '../config';
import {
  drawLamp, drawHangingSign, drawBillboard, drawStopSign,
  drawCone, drawManhole, drawAlley, drawCar,
} from '../render/props';
import { getSynth } from '../audio/synth';
import { OPENING_CUTSCENE } from '../cutscenes/opening';

export class MenuScene extends Phaser.Scene {
  private starG!: Phaser.GameObjects.Graphics;
  private starData: Array<{ x: number; y: number; base: number; phase: number; speed: number }> = [];

  constructor() {
    super('MenuScene');
  }

  create() {
    this.starData = this.makeStars(120);
    this.drawSkyGradient();
    this.starG = this.add.graphics();
    this.drawCityStrip();
    this.drawSkylineProps();
    this.drawStreet();
    this.drawStreetDecals();
    this.drawParkedCars();
    this.drawTitle();
  }

  private drawSkylineProps() {
    const g = this.add.graphics();
    drawAlley(g, 65, 2001);
    drawHangingSign(g, 45, 1001, 0);
    drawBillboard(g, 110, 1002);
    drawLamp(g, 160, 1003, 0);
    drawHangingSign(g, 210, 1004, 0);
    drawStopSign(g, 260);
    drawHangingSign(g, 300, 1005, 0);
    drawAlley(g, 330, 2002);
    drawLamp(g, 350, 1006, 0);
    drawBillboard(g, 410, 1007);
    drawHangingSign(g, 455, 1008, 0);
  }

  private drawStreetDecals() {
    const g = this.add.graphics();
    drawManhole(g, 130, 3001);
    drawCone(g, 190, 3002);
    drawCone(g, 201, 3003);
    drawManhole(g, 290, 3004);
    drawCone(g, 390, 3005);
  }

  update(time: number) {
    this.starG.clear();
    for (const s of this.starData) {
      const a = Phaser.Math.Clamp(
        s.base + Math.sin(time * s.speed + s.phase) * 0.35,
        0.05,
        1,
      );
      this.starG.fillStyle(COLORS.star, a);
      this.starG.fillRect(s.x, s.y, 2, 2);
    }
  }

  private drawSkyGradient() {
    const g = this.add.graphics();
    g.fillGradientStyle(
      COLORS.skyTop,
      COLORS.skyTop,
      COLORS.skyHorizon,
      COLORS.skyHorizon,
      1,
    );
    g.fillRect(0, 0, WIDTH, GAME.groundY);

    // Moon
    const cx = WIDTH * 0.78;
    const cy = 45;
    g.fillStyle(COLORS.moonHalo, 0.18);
    g.fillCircle(cx, cy, 30);
    g.fillStyle(COLORS.moonHalo, 0.3);
    g.fillCircle(cx, cy, 21);
    g.fillStyle(COLORS.moon, 1);
    g.fillCircle(cx, cy, 14);
    g.fillStyle(COLORS.moonHalo, 0.6);
    g.fillCircle(cx + 5, cy - 2, 3);
    g.fillCircle(cx - 4, cy + 3, 2);
  }

  private drawCityStrip() {
    const g = this.add.graphics();
    const baseY = GAME.groundY;
    // Far layer
    this.drawBuildingRow(g, {
      seed: 1234,
      minW: 16, maxW: 32,
      minH: 30, maxH: 70,
      palette: [COLORS.bldgFarA, COLORS.bldgFarB, COLORS.bldgFarC],
      windowDensity: 0.5,
      baseY: baseY - 2,
      windowSize: 1,
    });
    // Near layer
    this.drawBuildingRow(g, {
      seed: 9012,
      minW: 30, maxW: 60,
      minH: 55, maxH: 110,
      palette: [COLORS.bldgNearA, COLORS.bldgNearB, COLORS.bldgNearC, COLORS.bldgNearD],
      windowDensity: 0.7,
      baseY,
      windowSize: 2,
    });
  }

  private drawBuildingRow(
    g: Phaser.GameObjects.Graphics,
    opts: {
      seed: number;
      minW: number; maxW: number;
      minH: number; maxH: number;
      palette: number[];
      windowDensity: number;
      baseY: number;
      windowSize: number;
    },
  ) {
    const { seed, minW, maxW, minH, maxH, palette, windowDensity, baseY, windowSize } = opts;
    const rand = mulberry32(seed);
    let x = 0;
    while (x < WIDTH + 20) {
      const w = Math.floor(minW + rand() * (maxW - minW));
      const h = Math.floor(minH + rand() * (maxH - minH));
      const color = palette[Math.floor(rand() * palette.length)];
      g.fillStyle(color, 1);
      g.fillRect(x, baseY - h, w, h);
      g.fillStyle(0xffffff, 0.06);
      g.fillRect(x, baseY - h, w, 1);
      // Windows
      const padX = 2, padY = 3;
      const gridX = windowSize + 2, gridY = windowSize + 2;
      for (let wy = padY; wy < h - padY; wy += gridY) {
        for (let wx = padX; wx < w - padX; wx += gridX) {
          if (rand() < windowDensity) {
            const r = rand();
            const wc =
              r < 0.5 ? COLORS.windowWarm
              : r < 0.78 ? COLORS.windowCyan
              : r < 0.93 ? COLORS.windowPink
              : COLORS.windowWhite;
            g.fillStyle(wc, rand() < 0.18 ? 1 : 0.7);
            g.fillRect(x + wx, baseY - h + wy, 1, 1);
          }
        }
      }
      x += w - Math.floor(rand() * 2);
    }
  }

  private drawParkedCars() {
    const g = this.add.graphics();
    const cars: Array<{ x: number; dir: 1 | -1; paletteIdx: number }> = [
      { x: 80, dir: 1, paletteIdx: 0 }, // chrome
      { x: 230, dir: -1, paletteIdx: 2 }, // cyan
      { x: 370, dir: 1, paletteIdx: 1 }, // pink
    ];
    for (const c of cars) {
      drawCar(g, c.x, GAME.roadY, c.dir, CAR_PALETTE[c.paletteIdx]);
    }
  }

  private drawStreet() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.street, 1);
    g.fillRect(0, GAME.groundY, WIDTH, HEIGHT - GAME.groundY);
    // Back curb (pink).
    g.fillStyle(COLORS.curbNeon, 0.95);
    g.fillRect(0, GAME.groundY - 1, WIDTH, 2);
    // Front curb (cyan).
    g.fillStyle(COLORS.gridCyan, 0.6);
    g.fillRect(0, HEIGHT - 4, WIDTH, 2);
    // Lane dashes down the middle of the street.
    g.fillStyle(COLORS.lane, 0.6);
    const len = 17, gap = 25;
    const laneY = Math.floor((GAME.floorTop + GAME.floorBottom) / 2) - 1;
    const step = len + gap;
    for (let x = 0; x < WIDTH; x += step) {
      g.fillRect(x, laneY, len, 2);
    }
  }

  private drawTitle() {
    const title = this.add
      .text(WIDTH / 2, 35, 'SIMULATION\nTHEORY', {
        fontFamily: 'Courier New, monospace',
        fontSize: '32px',
        color: HEX.text,
        align: 'center',
        stroke: HEX.textShadow,
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setShadow(2, 2, HEX.textShadow, 0, true, true)
      .setDepth(10);

    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.75 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });

    const subY = 115;
    this.add
      .rectangle(WIDTH / 2, subY, 230, 13, 0x05000d, 0.85)
      .setStrokeStyle(1, 0xff2d95, 0.7)
      .setDepth(10);
    this.add
      .text(WIDTH / 2, subY, 'AN UNAUTHORIZED INTRUSION', {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: HEX.textShadow,
      })
      .setOrigin(0.5)
      .setDepth(11);

    const prompt = this.add
      .text(WIDTH / 2, HEIGHT - 50, 'PRESS SPACE / CLICK TO JACK IN', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.25 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(WIDTH / 2, HEIGHT - 30, 'WASD / ARROWS  move      X  melee      Z / CLICK  shoot', {
        fontFamily: 'Courier New, monospace',
        fontSize: '8px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(10);

    const muteText = this.add
      .text(WIDTH - 8, HEIGHT - 8, this.muteLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.text,
      })
      .setOrigin(1, 1)
      .setAlpha(0.75)
      .setDepth(10);

    const synth = getSynth();
    const startGame = () => {
      synth.start();
      this.scene.start('CutsceneScene', { config: OPENING_CUTSCENE });
    };
    // First user gesture: start the synth (audio context resume) AND advance.
    this.input.keyboard?.once('keydown-SPACE', startGame);
    this.input.keyboard?.once('keydown-ENTER', startGame);
    this.input.once('pointerdown', startGame);

    // M toggles mute regardless of which scene we're in.
    this.input.keyboard?.on('keydown-M', () => {
      synth.start(); // resume context if it never started
      synth.toggleMute();
      muteText.setText(this.muteLabel());
    });
  }

  private muteLabel() {
    return getSynth().isMuted() ? '♪ M : muted' : '♪ M : mute';
  }

  private makeStars(count: number) {
    const rand = mulberry32(7);
    const out: typeof this.starData = [];
    for (let i = 0; i < count; i++) {
      out.push({
        x: Math.floor(rand() * WIDTH),
        y: Math.floor(rand() * (GAME.groundY - 30)),
        base: 0.4 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        speed: 0.0015 + rand() * 0.002,
      });
    }
    return out;
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
