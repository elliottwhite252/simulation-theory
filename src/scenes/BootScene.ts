import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * Generates placeholder textures procedurally so we don't need external art for the MVP.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.makePlayerTexture();
    this.makePlayerShootTexture();
    this.makeBulletTexture();
    this.makeEnemyTexture();
    this.makeParticleTexture();
    this.scene.start('MenuScene');
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
    const w = 32;
    const h = 40;
    g.fillStyle(COLORS.enemy, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(COLORS.enemyCore, 1);
    g.fillRect(8, 12, 4, 6);
    g.fillRect(20, 12, 4, 6);
    g.fillRect(10, 26, 12, 3);
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
