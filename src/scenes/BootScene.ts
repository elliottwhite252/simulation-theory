import Phaser from 'phaser';
import { COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Character sprites from Nano Banana — each PNG is 2752×1536 at native res.
    // We load the walk cycle as a plain image; it becomes a real spritesheet in create()
    // after the checkerboard background gets keyed out.
    this.load.image('iris-idle', '/assets/iris-idle.png');
    this.load.image('iris-shoot', '/assets/iris-shoot.png');
    this.load.image('iris-melee', '/assets/iris-melee.png');
    this.load.image('iris-hit', '/assets/iris-hit.png');
    this.load.image('iris-walk-raw', '/assets/iris-walk.png');
    this.load.image('enemy-visor', '/assets/enemy-visor.png');
    this.load.image('omnicast-logo', '/assets/omnicast-logo.png');
    this.load.image('bg-zone-1', '/assets/bg-zone-1.png');
  }

  create() {
    // Bullet and particle are still procedural.
    this.makeBulletTexture();
    this.makeParticleTexture();

    // Nano Banana bakes its "transparent" checkerboard as two neutral grays
    // (~rgb(106,107,107) and ~rgb(174,174,174)) instead of using an alpha channel.
    // We key them out at load time so every generated sprite just works.
    (['iris-idle', 'iris-shoot', 'iris-melee', 'iris-hit', 'enemy-visor', 'omnicast-logo', 'bg-zone-1'] as const)
      .forEach((k) => this.keyOutCheckerboard(k));
    this.keyOutCheckerboardSpritesheet('iris-walk-raw', 'iris-walk', 688, 1536);

    // Backdrop is heavily downsampled (2752→~484 wide); nearest-neighbor produces
    // vertical banding on fractional ratios. Linear filtering makes it smooth.
    // Character sprites stay on nearest-neighbor so pixel-art details stay crisp.
    this.textures.get('bg-zone-1').setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.anims.create({
      key: 'iris-walk',
      frames: this.anims.generateFrameNumbers('iris-walk', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.start('MenuScene');
  }

  private processCanvas(key: string): HTMLCanvasElement {
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const w = src.width;
    const h = src.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // Reject anything that isn't near-neutral gray — protects colored pixels.
      const spread = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      if (spread > 6) continue;
      const near106 = Math.abs(r - 106) < 14 && Math.abs(g - 106) < 14 && Math.abs(b - 106) < 14;
      const near174 = Math.abs(r - 174) < 14 && Math.abs(g - 174) < 14 && Math.abs(b - 174) < 14;
      if (near106 || near174) d[i + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  private keyOutCheckerboard(key: string) {
    const canvas = this.processCanvas(key);
    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  private keyOutCheckerboardSpritesheet(srcKey: string, dstKey: string, frameWidth: number, frameHeight: number) {
    const canvas = this.processCanvas(srcKey);
    this.textures.remove(srcKey);
    this.textures.addSpriteSheet(dstKey, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight });
  }

  private get palette() {
    return {
      HAIR:    0x2a1a30,
      BAND:    0xee1f3a,
      BAND_HL: 0xff6677,
      SKIN:    0xd0a070,
      SKIN_SH: 0xa07850,
      COAT:    0x9c7a5a,
      COAT_HL: 0xc0a080,
      COAT_SH: 0x6a5040,
      BUTTON:  0xb89050,
      PANTS:   0x1a0a40,
      BOOTS:   0x0a0414,
      EYES:    0x000000,
      GUN:     0x1a1428,
      GUN_HL:  0x6a6a8a,
    };
  }

  private drawPlayerBase(g: Phaser.GameObjects.Graphics) {
    const p = this.palette;

    // Forward-lean offsets — head leans most, tapering to nothing at the waist.
    const HEAD = 3;
    const SHOULDER = 2;
    const HAIR_FALL = 2;

    // Hair top
    g.fillStyle(p.HAIR, 1);
    g.fillRect(9 + HEAD, 0, 10, 3);

    // Side hair framing the face
    g.fillRect(7 + HEAD, 6, 2, 6);
    g.fillRect(19 + HEAD, 6, 2, 6);

    // Red sweatband
    g.fillStyle(p.BAND, 1);
    g.fillRect(8 + HEAD, 3, 12, 3);
    g.fillStyle(p.BAND_HL, 1);
    g.fillRect(8 + HEAD, 3, 12, 1);

    // Face
    g.fillStyle(p.SKIN, 1);
    g.fillRect(9 + HEAD, 6, 10, 6);
    g.fillStyle(p.SKIN_SH, 1);
    g.fillRect(9 + HEAD, 10, 10, 2);
    g.fillStyle(p.EYES, 1);
    g.fillRect(11 + HEAD, 8, 2, 1);
    g.fillRect(16 + HEAD, 8, 2, 1);
    g.fillStyle(0xb86070, 1);
    g.fillRect(13 + HEAD, 10, 2, 1);

    // Coat shoulders (shifted forward)
    g.fillStyle(p.COAT, 1);
    g.fillRect(3 + SHOULDER, 12, 22, 4);
    // Upper coat body (shifted forward, transitions at the waist)
    g.fillRect(4 + SHOULDER, 16, 20, 6);
    // Lower coat body (no shift — vertical from the waist down)
    g.fillRect(4, 22, 20, 10);
    // Hem
    g.fillRect(3, 32, 22, 5);
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(3, 36, 22, 1);

    // Long hair flowing past the shoulders — drapes back, partial shift
    g.fillStyle(p.HAIR, 1);
    g.fillRect(6 + HAIR_FALL, 12, 3, 8);
    g.fillRect(20 + HAIR_FALL, 12, 3, 8);
    g.fillRect(7 + HAIR_FALL, 20, 2, 2);
    g.fillRect(20 + HAIR_FALL, 20, 2, 2);

    // V-shape collar / lapels (shifted with shoulders)
    g.fillStyle(p.COAT_HL, 1);
    g.fillRect(10 + SHOULDER, 12, 8, 1);
    g.fillRect(11 + SHOULDER, 13, 6, 1);
    g.fillRect(12 + SHOULDER, 14, 4, 1);

    // Coat seam — leaned at top, vertical at the waist
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(13 + SHOULDER, 15, 2, 7);
    g.fillRect(13, 22, 2, 15);

    // Brass buttons
    g.fillStyle(p.BUTTON, 1);
    g.fillRect(13 + SHOULDER, 18, 2, 1);
    g.fillRect(13, 22, 2, 1);
    g.fillRect(13, 26, 2, 1);
    g.fillRect(13, 30, 2, 1);

    // Belt line (lower body, no shift)
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(4, 24, 20, 1);

    // Far (back) arm — stays in original back position (it's the trailing arm)
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(3, 16, 3, 14);
    g.fillStyle(p.SKIN_SH, 1);
    g.fillRect(3, 30, 3, 2);

    // Pants — walking stride
    g.fillStyle(p.PANTS, 1);
    g.fillRect(15, 37, 5, 5);
    g.fillRect(7, 37, 5, 3);

    // Boots
    g.fillStyle(p.BOOTS, 1);
    g.fillRect(14, 42, 10, 2);
    g.fillRect(6, 40, 6, 2);
  }

  private makePlayerTexture() {
    const g = this.add.graphics();
    const w = 28;
    const h = 44;
    const p = this.palette;

    this.drawPlayerBase(g);

    // Near (right) arm — attached to the leaned shoulder, hanging at the side.
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(23, 16, 1, 14);  // body-arm seam (shoulder shifted +2)
    g.fillStyle(p.COAT, 1);
    g.fillRect(24, 16, 3, 14);  // arm sleeve
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(26, 16, 1, 14);  // arm outer edge
    g.fillStyle(p.SKIN, 1);
    g.fillRect(24, 30, 3, 2);   // hand

    // Holstered weapon at the hip — waist level, no body lean here.
    g.fillStyle(p.GUN, 1);
    g.fillRect(18, 24, 3, 6);
    g.fillStyle(p.GUN_HL, 1);
    g.fillRect(18, 24, 3, 1);
    g.fillRect(18, 24, 1, 6);

    g.generateTexture('player', w, h);
    g.destroy();
  }

  private makePlayerShootTexture() {
    const g = this.add.graphics();
    const w = 28;
    const h = 44;
    const p = this.palette;

    this.drawPlayerBase(g);

    // Near (right) arm RAISED HORIZONTALLY from leaned shoulder, firing forward.
    g.fillStyle(p.COAT, 1);
    g.fillRect(24, 17, 3, 4);   // sleeve (shifted +2 with shoulder)
    g.fillStyle(p.COAT_HL, 1);
    g.fillRect(24, 17, 3, 1);
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(24, 20, 3, 1);

    // Cuff + hand
    g.fillStyle(p.COAT_SH, 1);
    g.fillRect(26, 18, 1, 3);
    g.fillStyle(p.SKIN, 1);
    g.fillRect(27, 19, 1, 2);

    // Pistol — compact to fit within sprite bounds with the leaned shoulder
    g.fillStyle(p.GUN, 1);
    g.fillRect(25, 18, 3, 1);   // top of slide
    g.fillRect(26, 19, 2, 1);   // barrel forward
    g.fillRect(25, 20, 2, 1);   // grip below
    g.fillStyle(p.GUN_HL, 1);
    g.fillRect(27, 18, 1, 1);   // front sight tip
    g.fillRect(25, 18, 1, 1);   // rear sight

    g.generateTexture('player-shoot', w, h);
    g.destroy();
  }

  private makeBulletTexture() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.bullet, 1);
    g.fillRect(0, 2, 14, 4);
    g.fillStyle(COLORS.gridCyan, 1);
    g.fillRect(0, 0, 14, 8);
    g.fillStyle(COLORS.bullet, 1);
    g.fillRect(2, 3, 10, 2);
    g.generateTexture('bullet', 14, 8);
    g.destroy();
  }

  private makeEnemyTexture() {
    const g = this.add.graphics();
    const w = 28;
    const h = 24;

    // OmniCast sensor drone — quad-rotor with single cyan camera eye.
    const BLADE = 0x4a4a5a;
    const HUB = 0x1a1428;
    const FRAME = 0x6a6a8a;
    const BODY = 0x1a1428;
    const BODY_HL = 0x3a3045;
    const CYAN = 0x00f6ff;
    const PUPIL = 0x0a0820;
    const GLINT = 0xffffff;
    const RED = 0xff2d3a;
    const AMBER = 0xffd166;
    const BRAND = 0xff2d95;
    const ANTENNA = 0x4a4a5a;

    // Top rotor blades (motion-blurred horizontal smears)
    g.fillStyle(BLADE, 1);
    g.fillRect(2, 0, 5, 1);
    g.fillRect(21, 0, 5, 1);
    g.fillRect(1, 1, 7, 1);
    g.fillRect(20, 1, 7, 1);

    // Top rotor hubs
    g.fillStyle(HUB, 1);
    g.fillRect(3, 2, 3, 2);
    g.fillRect(22, 2, 3, 2);

    // Frame arms (stair-stepped diagonals from hubs to body)
    g.fillStyle(FRAME, 1);
    g.fillRect(5, 4, 2, 1);
    g.fillRect(7, 5, 2, 1);
    g.fillRect(21, 4, 2, 1);
    g.fillRect(19, 5, 2, 1);

    // Antenna + red status LED on top of body
    g.fillStyle(ANTENNA, 1);
    g.fillRect(13, 5, 1, 1);
    g.fillStyle(RED, 1);
    g.fillRect(13, 4, 1, 1);

    // Main body
    g.fillStyle(BODY, 1);
    g.fillRect(8, 6, 12, 10);

    // Body top highlight strip
    g.fillStyle(BODY_HL, 1);
    g.fillRect(8, 7, 12, 1);

    // Side LEDs (red left, amber right)
    g.fillStyle(RED, 1);
    g.fillRect(7, 8, 1, 1);
    g.fillStyle(AMBER, 1);
    g.fillRect(20, 8, 1, 1);

    // Camera eye — cyan outer
    g.fillStyle(CYAN, 1);
    g.fillRect(10, 9, 8, 6);

    // Pupil
    g.fillStyle(PUPIL, 1);
    g.fillRect(13, 11, 2, 2);

    // White glint
    g.fillStyle(GLINT, 1);
    g.fillRect(13, 11, 1, 1);

    // OmniCast brand stripe on lower body
    g.fillStyle(BRAND, 1);
    g.fillRect(8, 15, 12, 1);

    // Bottom frame arms
    g.fillStyle(FRAME, 1);
    g.fillRect(7, 17, 2, 1);
    g.fillRect(5, 18, 2, 1);
    g.fillRect(19, 17, 2, 1);
    g.fillRect(21, 18, 2, 1);

    // Bottom rotor hubs
    g.fillStyle(HUB, 1);
    g.fillRect(3, 19, 3, 2);
    g.fillRect(22, 19, 3, 2);

    // Bottom rotor blades
    g.fillStyle(BLADE, 1);
    g.fillRect(2, 21, 5, 1);
    g.fillRect(21, 21, 5, 1);
    g.fillRect(1, 22, 7, 1);
    g.fillRect(20, 22, 7, 1);

    g.generateTexture('enemy', w, h);
    g.destroy();
  }

  private makeParticleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture('px', 3, 3);
    g.destroy();
  }
}
