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
    this.load.image('bg-menu', '/assets/bg-menu.png');
  }

  create() {
    // Bullet and particle stay procedural — tiny primitives, no need for PNGs.
    this.makeBulletTexture();
    this.makeParticleTexture();

    // Nano Banana bakes its "transparent" checkerboard as two neutral grays
    // (~rgb(106,107,107) and ~rgb(174,174,174)) instead of using an alpha channel.
    // We key them out at load time so every generated sprite just works.
    (['iris-idle', 'iris-shoot', 'iris-melee', 'iris-hit', 'enemy-visor', 'omnicast-logo', 'bg-zone-1', 'bg-menu'] as const)
      .forEach((k) => this.keyOutCheckerboard(k));
    this.keyOutCheckerboardSpritesheet('iris-walk-raw', 'iris-walk', 688, 1536);

    // Backdrop is heavily downsampled (2752→~484 wide); nearest-neighbor produces
    // vertical banding on fractional ratios. Linear filtering makes it smooth.
    // Character sprites stay on nearest-neighbor so pixel-art details stay crisp.
    this.textures.get('bg-zone-1').setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.textures.get('bg-menu').setFilter(Phaser.Textures.FilterMode.LINEAR);

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

  private makeParticleTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture('px', 3, 3);
    g.destroy();
  }
}
