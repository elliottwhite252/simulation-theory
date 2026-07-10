import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, HEX, GAME, ROOMS, MAX_CAMERA_X, CAR_PALETTE } from '../config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import {
  drawLamp, drawHangingSign, drawBillboard, drawStopSign,
  drawCone, drawManhole, drawAlley, drawCar,
} from '../render/props';
import { getSynth } from '../audio/synth';

type Phase = 'roaming' | 'locked' | 'cleared' | 'won' | 'gameover';

interface Building {
  x: number;
  w: number;
  h: number;
  color: number;
  windows: Array<{ x: number; y: number; color: number; bright: boolean }>;
}

interface Star {
  x: number;
  y: number;
  base: number; // base alpha
  phase: number; // twinkle phase
  speed: number;
}

interface ParkedCar {
  x: number; // world X — cars are now static parked decorations
  yOffset: number;
  paletteIdx: number;
  dir: 1 | -1;
}

interface StreetProp {
  x: number; // world X
  type: 'lamp' | 'hangingSign' | 'billboard' | 'stopSign' | 'cone' | 'manhole' | 'alley';
  seed: number;
}

const FAR_STRIP = 1200;
const NEAR_STRIP = 1000;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
  };

  // Camera layers. Everything visible goes into one of these so the two cameras
  // can each ignore the other's contents (world camera is zoomed; HUD camera is 1:1).
  private worldLayer!: Phaser.GameObjects.Layer;
  private hudLayer!: Phaser.GameObjects.Layer;

  // Nano Banana painted backdrop — one wide image covering the whole world.
  private bgLayer!: Phaser.GameObjects.TileSprite;
  private foregroundNeon!: Phaser.GameObjects.Graphics;

  private parkedCars: ParkedCar[] = [];

  private streetProps: StreetProp[] = [];

  // Skyline + stars data (generated once in create()).
  private farCity: Building[] = [];
  private nearCity: Building[] = [];
  private stars: Star[] = [];

  // HUD (fixed to camera).
  private scoreText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private goText!: Phaser.GameObjects.Text;
  private muteText?: Phaser.GameObjects.Text;

  // Melee visualization
  private meleeArc!: Phaser.GameObjects.Graphics;
  private burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private phase: Phase = 'roaming';
  private currentRoomIdx = 0;
  private score = 0;
  private health = 4;
  // Pending spawn telegraphs — keeps clearRoom from firing during the stagger window.
  private pendingSpawns = 0;

  constructor() {
    super('GameScene');
  }

  create() {
    this.score = 0;
    this.health = 4;
    this.phase = 'roaming';
    this.currentRoomIdx = 0;
    this.pendingSpawns = 0;

    // Camera layers — must be created before anything we add to them.
    this.worldLayer = this.add.layer();
    this.hudLayer = this.add.layer();

    // World + camera bounds
    this.physics.world.setBounds(0, 0, GAME.worldWidth, HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME.worldWidth, HEIGHT);

    // Generate procedural city + stars (deterministic via seeded RNG so each run looks consistent).
    this.farCity = this.generateBuildings({
      seed: 1337,
      stripWidth: FAR_STRIP,
      minW: 16, maxW: 32,
      minH: 35, maxH: 80,
      palette: [COLORS.bldgFarA, COLORS.bldgFarB, COLORS.bldgFarC],
      windowDensity: 0.55,
      windowSize: 1,
    });
    this.nearCity = this.generateBuildings({
      seed: 4242,
      stripWidth: NEAR_STRIP,
      minW: 28, maxW: 60,
      minH: 55, maxH: 120,
      palette: [COLORS.bldgNearA, COLORS.bldgNearB, COLORS.bldgNearC, COLORS.bldgNearD],
      windowDensity: 0.7,
      windowSize: 2,
    });
    this.stars = this.generateStars(110);

    // Painted city backdrop — tiled across the full world width so it scrolls
    // seamlessly as the camera moves. Native image height (1536) is scaled to the
    // canvas height (270), then repeats horizontally.
    this.bgLayer = this.add
      .tileSprite(0, 0, GAME.worldWidth, HEIGHT, 'bg-zone-1')
      .setOrigin(0, 0)
      .setDepth(-100);
    const bgTex = this.textures.get('bg-zone-1').getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const bgScale = HEIGHT / bgTex.height;
    this.bgLayer.setTileScale(bgScale, bgScale);

    // Foreground vignette + scanlines stay procedural — cheap CRT overlay.
    this.foregroundNeon = this.add.graphics().setScrollFactor(0).setDepth(-10);
    this.worldLayer.add([this.bgLayer, this.foregroundNeon]);

    this.streetProps = this.generateStreetProps();
    this.parkedCars = this.generateParkedCars();

    // Player
    this.player = new Player(this, 60, (GAME.floorTop + GAME.floorBottom) / 2);
    this.worldLayer.add(this.player);

    // Melee baton — drawn once in local coords, then just repositioned/flipped
    // each frame. No per-frame redraw of graphics commands.
    this.meleeArc = this.add.graphics().setDepth(5).setVisible(false);
    this.drawBatonShape(this.meleeArc);
    this.worldLayer.add(this.meleeArc);

    // Single shared particle emitter, pooled and reused for all bursts so we
    // don't allocate a new emitter on every hit.
    this.burstEmitter = this.add.particles(0, 0, 'px', {
      lifespan: 320,
      speed: { min: 40, max: 130 },
      scale: { start: 1, end: 0 },
      quantity: 1,
      blendMode: 'ADD',
      emitting: false,
    });
    this.worldLayer.add(this.burstEmitter);

    // Cameras: main is zoomed-in for arcade closeness; HUD camera is 1:1 on top.
    this.cameras.main.setZoom(1.6);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(40, HEIGHT);
    const hudCam = this.cameras.add(0, 0, WIDTH, HEIGHT);
    hudCam.setName('hud');
    this.cameras.main.ignore(this.hudLayer);
    hudCam.ignore(this.worldLayer);

    // Groups
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 48,
    });
    this.enemies = this.physics.add.group({ classType: Enemy });

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      this.bulletHitEnemy(
        bullet as Phaser.Physics.Arcade.Sprite,
        enemy as Enemy,
      );
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) => {
      this.enemyTouchPlayer(enemy as Enemy);
    });

    // Input
    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    };
    kb.on('keydown-X', () => this.tryMelee());
    kb.on('keydown-Z', () => this.tryShoot());
    kb.on('keydown-SPACE', () => this.tryShoot());
    this.input.on('pointerdown', () => this.tryShoot());

    // Soundtrack — start (or no-op if already playing) and bind mute toggle.
    const synth = getSynth();
    synth.start();
    kb.on('keydown-M', () => {
      synth.toggleMute();
      this.muteText?.setText(this.muteLabel());
    });

    this.buildHUD();
  }

  private muteLabel() {
    return getSynth().isMuted() ? '♪ M : muted' : '♪ M : mute';
  }

  // --------------------------- update loop ---------------------------
  update(time: number, _delta: number) {
    if (this.phase === 'gameover' || this.phase === 'won') return;

    // Player movement (4-dir)
    let vx = 0;
    let vy = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) vx -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) vx += 1;
    if (this.keys.up.isDown || this.keys.w.isDown) vy -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown) vy += 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    if (this.phase === 'locked') {
      const room = ROOMS[this.currentRoomIdx];
      const viewW = WIDTH / this.cameras.main.zoom;
      const lockLeft = room.cameraLockX;
      const lockRight = room.cameraLockX + viewW - 15;
      if (this.player.x > lockRight && vx > 0) vx = 0;
      if (this.player.x < lockLeft && vx < 0) vx = 0;
    }

    this.player.walk(vx * GAME.walkSpeed, vy * GAME.walkSpeed);

    // Enemy AI
    this.enemies.children.iterate((e) => {
      const enemy = e as Enemy;
      if (!enemy.active) return true;
      enemy.chase(this.player.x, this.player.y);
      enemy.updateFlash(time);
      return true;
    });

    // Bullet recycling
    this.bullets.children.iterate((b) => {
      const s = b as Phaser.Physics.Arcade.Sprite;
      if (!s || !s.active) return true;
      if (Math.abs(s.x - this.player.x) > WIDTH) s.disableBody(true, true);
      return true;
    });

    this.drawForegroundNeon();
    this.updateMeleeArc(time);
    this.handleMeleeHits(time);
    this.handleRoomState();

    this.score = Math.max(this.score, Math.floor(this.player.x));
    this.scoreText.setText(`SIGNAL: ${this.score}`);
  }

  // --------------------------- actions ---------------------------
  private tryShoot() {
    if (this.phase === 'gameover') {
      this.scene.start('MenuScene');
      return;
    }
    if (this.phase === 'won') return;
    const now = this.time.now;
    if (!this.player.tryShoot(now)) return;

    const dir = this.player.facing;
    const bullet = this.bullets.get(
      this.player.x + dir * 11,
      this.player.y - 1,
      'bullet',
    ) as Phaser.Physics.Arcade.Sprite | null;
    if (!bullet) return;
    bullet.enableBody(true, this.player.x + dir * 11, this.player.y - 1, true, true);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(dir * GAME.bulletSpeed, 0);
    bullet.setFlipX(dir === -1);
    bullet.setTint(COLORS.gridCyan);
    this.worldLayer.add(bullet);

    this.player.triggerShoot();
  }

  private tryMelee() {
    if (this.phase === 'gameover') {
      this.scene.start('MenuScene');
      return;
    }
    if (this.phase === 'won') return;
    const now = this.time.now;
    if (this.player.tryMelee(now)) {
      this.player.triggerMelee();
    }
  }

  // --------------------------- collisions ---------------------------
  private bulletHitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.disableBody(true, true);
    this.damageEnemy(enemy, GAME.bulletDamage);
  }

  private handleMeleeHits(now: number) {
    if (!this.player.isMeleeActive(now)) return;
    const reach = GAME.meleeReach;
    const cx = this.player.x + this.player.facing * (reach * 0.6);
    const cy = this.player.y;
    this.enemies.children.iterate((e) => {
      const enemy = e as Enemy;
      if (!enemy.active) return true;
      const dx = enemy.x - cx;
      const dy = enemy.y - cy;
      if (Math.hypot(dx, dy) < reach) {
        const body = enemy.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(this.player.facing * 130, -20);
        this.damageEnemy(enemy, GAME.meleeDamage);
      }
      return true;
    });
  }

  private damageEnemy(enemy: Enemy, dmg: number) {
    const now = this.time.now;
    const killed = enemy.takeHit(dmg, now);
    this.spawnBurst(enemy.x, enemy.y, COLORS.enemy, killed ? 16 : 6);
    if (killed) {
      enemy.destroy();
      this.score += 100;
    }
  }

  private enemyTouchPlayer(enemy: Enemy) {
    if (!enemy.active) return;
    const now = this.time.now;
    if (now < enemy.iframesUntil) return;
    enemy.iframesUntil = now + 600;
    this.health -= 1;
    this.hudText.setText(this.healthString());
    this.player.triggerHit();
    this.cameras.main.shake(180, 0.012);
    this.cameras.main.flash(110, 255, 45, 149);
    this.spawnBurst(this.player.x, this.player.y, COLORS.gridCyan, 8);
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(-this.player.facing * 100, -20);
    if (this.health <= 0) this.triggerGameOver();
  }

  // --------------------------- rooms ---------------------------
  private handleRoomState() {
    if (this.phase === 'roaming') {
      const room = ROOMS[this.currentRoomIdx];
      if (!room) {
        if (this.player.x > GAME.worldWidth - 30) this.triggerWin();
        return;
      }
      if (this.cameras.main.scrollX >= room.triggerX - 1) {
        this.lockRoom(room);
      }
    } else if (this.phase === 'locked') {
      let alive = 0;
      this.enemies.children.iterate((e) => {
        if ((e as Enemy).active) alive++;
        return true;
      });
      // Don't clear while spawns are still pending (telegraph in progress).
      if (alive === 0 && this.pendingSpawns === 0) this.clearRoom();
    } else if (this.phase === 'cleared') {
      if (this.cameras.main.scrollX < MAX_CAMERA_X) {
        const room = ROOMS[this.currentRoomIdx];
        const viewW = WIDTH / this.cameras.main.zoom;
        if (this.player.x > room.cameraLockX + viewW - 30) {
          this.currentRoomIdx++;
          this.goText.setVisible(false);
          this.phase = 'roaming';
          this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
          this.updateRoomLabel();
        }
      }
    }
  }

  private lockRoom(room: (typeof ROOMS)[number]) {
    this.phase = 'locked';
    this.cameras.main.stopFollow();
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: room.cameraLockX,
      duration: 350,
      ease: 'Sine.easeOut',
    });
    this.updateRoomLabel();
    this.flashLockBanner();
    this.spawnWave(room);
  }

  private clearRoom() {
    this.phase = 'cleared';
    this.goText.setVisible(true);
    this.tweens.add({
      targets: this.goText,
      alpha: { from: 1, to: 0.25 },
      duration: 380,
      yoyo: true,
      repeat: -1,
    });
  }

  private spawnWave(room: (typeof ROOMS)[number]) {
    const viewW = WIDTH / this.cameras.main.zoom;
    this.pendingSpawns = room.enemyCount;
    for (let i = 0; i < room.enemyCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const ex = side === 1
        ? room.cameraLockX + viewW - 10 - i * 7
        : room.cameraLockX + 10 + i * 7;
      const ey = Phaser.Math.Between(GAME.floorTop, GAME.floorBottom);
      // Stagger spawns — first at 300ms, then ~900ms between each, with a
      // 700ms telegraph before each enemy actually materializes.
      const startDelay = 300 + i * 900;
      this.time.delayedCall(startDelay, () => this.telegraphAndSpawn(ex, ey));
    }
  }

  private telegraphAndSpawn(x: number, y: number) {
    // Two stacked native Arc objects — Phaser animates scale/alpha at engine
    // level, no per-frame JS callback. Cheap and smooth.
    const outerRing = this.add
      .circle(x, y, 12, COLORS.enemy, 0.15)
      .setStrokeStyle(1, COLORS.enemy, 0.9)
      .setDepth(-5)
      .setScale(0.2);
    const innerDot = this.add
      .circle(x, y, 5, COLORS.enemy, 0.85)
      .setDepth(-5)
      .setScale(0.2);
    this.worldLayer.add(outerRing);
    this.worldLayer.add(innerDot);

    this.tweens.add({
      targets: [outerRing, innerDot],
      scale: 1,
      duration: 700,
      ease: 'Sine.easeIn',
    });
    this.tweens.add({
      targets: outerRing,
      alpha: { from: 0.9, to: 0.4 },
      duration: 700,
      ease: 'Sine.easeIn',
    });

    this.time.delayedCall(700, () => {
      outerRing.destroy();
      innerDot.destroy();
      // No particle burst here — the telegraph already provides the materialization beat.
      const enemy = new Enemy(this, x, y);
      this.enemies.add(enemy);
      this.worldLayer.add(enemy);
      this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
    });
  }

  // --------------------------- HUD + banners ---------------------------
  private buildHUD() {
    this.scoreText = this.add
      .text(8, 6, 'SIGNAL: 0', {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: HEX.text,
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setShadow(1, 1, HEX.textShadow, 0);

    this.hudText = this.add
      .text(WIDTH - 8, 6, this.healthString(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: HEX.textShadow,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setShadow(1, 1, HEX.text, 0);

    this.roomText = this.add
      .text(WIDTH / 2, 7, this.roomLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '8px',
        color: HEX.text,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000);

    this.goText = this.add
      .text(WIDTH - 30, HEIGHT / 2, 'GO →', {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: HEX.melee,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.muteText = this.add
      .text(WIDTH - 8, HEIGHT - 8, this.muteLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.text,
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.7);

    this.hudLayer.add([this.scoreText, this.hudText, this.roomText, this.goText, this.muteText]);
  }

  private updateRoomLabel() {
    this.roomText.setText(this.roomLabel());
  }

  private roomLabel() {
    if (this.currentRoomIdx >= ROOMS.length) return 'EXIT NODE';
    return `ZONE ${this.currentRoomIdx + 1} / ${ROOMS.length}`;
  }

  private flashLockBanner() {
    const banner = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 40, '!! INTRUSION DETECTED !!', {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: HEX.textShadow,
        stroke: HEX.text,
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);
    this.hudLayer.add(banner);
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => banner.destroy(),
    });
  }

  // --------------------------- end states ---------------------------
  private triggerWin() {
    this.phase = 'won';
    this.physics.pause();
    const title = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 10, 'SIMULATION BREACHED', {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: HEX.text,
        stroke: HEX.textShadow,
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    const sub = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 15, `FINAL SIGNAL: ${this.score}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    this.hudLayer.add([title, sub]);
    this.input.keyboard?.once('keydown', () => this.scene.start('MenuScene'));
    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
  }

  private triggerGameOver() {
    this.phase = 'gameover';
    this.physics.pause();
    const title = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 10, 'SIGNAL LOST', {
        fontFamily: 'Courier New, monospace',
        fontSize: '26px',
        color: HEX.textShadow,
        stroke: HEX.text,
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    const sub = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 15, `FINAL SIGNAL: ${this.score}`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
    const hint = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 35, 'press any key / click to retry', {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setAlpha(0.7);
    this.hudLayer.add([title, sub, hint]);
  }

  // --------------------------- city / sky generation ---------------------------
  private generateBuildings(opts: {
    seed: number;
    stripWidth: number;
    minW: number; maxW: number;
    minH: number; maxH: number;
    palette: number[];
    windowDensity: number;
    windowSize: number;
  }): Building[] {
    const rand = mulberry32(opts.seed);
    const out: Building[] = [];
    let x = 0;
    while (x < opts.stripWidth) {
      const w = Math.floor(opts.minW + rand() * (opts.maxW - opts.minW));
      const h = Math.floor(opts.minH + rand() * (opts.maxH - opts.minH));
      const color = opts.palette[Math.floor(rand() * opts.palette.length)];
      const windows: Building['windows'] = [];
      const padX = 2, padY = 3;
      const gridX = opts.windowSize + 2;
      const gridY = opts.windowSize + 2;
      for (let wy = padY; wy < h - padY; wy += gridY) {
        for (let wx = padX; wx < w - padX; wx += gridX) {
          if (rand() < opts.windowDensity) {
            const r = rand();
            const wc =
              r < 0.5 ? COLORS.windowWarm
              : r < 0.78 ? COLORS.windowCyan
              : r < 0.93 ? COLORS.windowPink
              : COLORS.windowWhite;
            windows.push({ x: wx, y: wy, color: wc, bright: rand() < 0.18 });
          }
        }
      }
      out.push({ x, w, h, color, windows });
      x += w - Math.floor(rand() * 2); // slight overlap so the skyline has no gaps
    }
    return out;
  }

  private generateStars(count: number): Star[] {
    const rand = mulberry32(99);
    const out: Star[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        x: Math.floor(rand() * WIDTH),
        y: Math.floor(rand() * (GAME.groundY - 20)),
        base: 0.4 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
        speed: 0.0015 + rand() * 0.002,
      });
    }
    return out;
  }

  // --------------------------- drawing ---------------------------
  private drawSky() {
    const g = this.skyLayer;
    g.clear();
    g.fillGradientStyle(
      COLORS.skyTop,
      COLORS.skyTop,
      COLORS.skyHorizon,
      COLORS.skyHorizon,
      1,
    );
    g.fillRect(0, 0, WIDTH, GAME.groundY);
  }

  private drawStars(time: number) {
    const g = this.starLayer;
    g.clear();
    for (const s of this.stars) {
      const a = Phaser.Math.Clamp(
        s.base + Math.sin(time * s.speed + s.phase) * 0.35,
        0.05,
        1,
      );
      g.fillStyle(COLORS.star, a);
      g.fillRect(s.x, s.y, 1, 1);
    }
  }

  private drawMoon() {
    const g = this.moonLayer;
    g.clear();
    // Moon drifts very slightly with camera for subtle parallax.
    const cx = WIDTH * 0.68 - this.cameras.main.scrollX * 0.04;
    const cy = 55;
    g.fillStyle(COLORS.moonHalo, 0.18);
    g.fillCircle(cx, cy, 29);
    g.fillStyle(COLORS.moonHalo, 0.3);
    g.fillCircle(cx, cy, 20);
    g.fillStyle(COLORS.moon, 1);
    g.fillCircle(cx, cy, 13);
    // Crater shadow for character.
    g.fillStyle(COLORS.moonHalo, 0.6);
    g.fillCircle(cx + 4, cy - 2, 2);
    g.fillCircle(cx - 3, cy + 3, 2);
  }

  private drawCity(
    g: Phaser.GameObjects.Graphics,
    city: Building[],
    stripWidth: number,
    parallaxFactor: number,
    baseY: number,
  ) {
    g.clear();
    const offset = (this.cameras.main.scrollX * parallaxFactor) % stripWidth;
    // Draw two passes so we tile seamlessly.
    for (let pass = 0; pass < 2; pass++) {
      const passShift = pass * stripWidth - offset;
      for (const b of city) {
        const bx = b.x + passShift;
        if (bx + b.w < -10 || bx > WIDTH + 10) continue;
        // Building body
        g.fillStyle(b.color, 1);
        g.fillRect(bx, baseY - b.h, b.w, b.h);
        // Top highlight (1px lighter line)
        g.fillStyle(0xffffff, 0.06);
        g.fillRect(bx, baseY - b.h, b.w, 1);
        // Windows
        for (const w of b.windows) {
          g.fillStyle(w.color, w.bright ? 1 : 0.65);
          g.fillRect(bx + w.x, baseY - b.h + w.y, 1, 1);
        }
      }
    }
  }

  private drawStreet() {
    const g = this.streetLayer;
    g.clear();
    const horizonY = GAME.groundY;

    // Asphalt covers from the back curb to the bottom of the canvas — one big street.
    g.fillStyle(COLORS.street, 1);
    g.fillRect(0, horizonY, WIDTH, HEIGHT - horizonY);

    // Subtle fog at the back of the street for that neon-bleed glow.
    g.fillStyle(COLORS.streetEdge, 0.5);
    g.fillRect(0, horizonY, WIDTH, 11);

    // Back curb (pink neon) — separates sidewalk/buildings from the street.
    g.fillStyle(COLORS.curbNeon, 0.95);
    g.fillRect(0, horizonY - 1, WIDTH, 1);
    g.fillStyle(COLORS.curbNeon, 0.25);
    g.fillRect(0, horizonY - 2, WIDTH, 1);

    // Front curb (cyan) at the bottom of the canvas.
    g.fillStyle(COLORS.gridCyan, 0.6);
    g.fillRect(0, HEIGHT - 2, WIDTH, 1);

    // Lane dashes down the middle of the street where the player walks.
    const scrollX = this.cameras.main.scrollX;
    const laneY = Math.floor((GAME.floorTop + GAME.floorBottom) / 2) - 1;
    g.fillStyle(COLORS.lane, 0.6);
    const len = 17;
    const gap = 25;
    const step = len + gap;
    const startWorldX = Math.floor(scrollX / step) * step;
    for (let wx = startWorldX; wx < scrollX + WIDTH + step; wx += step) {
      g.fillRect(wx - scrollX, laneY, len, 2);
    }
  }

  // --------------------------- street props ---------------------------
  private generateStreetProps(): StreetProp[] {
    const props: StreetProp[] = [];

    // Pass 1: sidewalk-level props (lamps, signs, billboards, stop signs).
    const sw = mulberry32(8888);
    let x = 30;
    while (x < GAME.worldWidth) {
      const r = sw();
      let type: StreetProp['type'];
      if (r < 0.40) type = 'lamp';
      else if (r < 0.72) type = 'hangingSign';
      else if (r < 0.90) type = 'billboard';
      else type = 'stopSign';
      props.push({ x: Math.floor(x), type, seed: Math.floor(sw() * 1e9) });
      x += 35 + sw() * 65;
    }

    // Pass 2: rare alleys punched through the skyline (every few screens).
    const al = mulberry32(3333);
    x = 175 + al() * 150;
    while (x < GAME.worldWidth - 100) {
      props.push({ x: Math.floor(x), type: 'alley', seed: Math.floor(al() * 1e9) });
      x += 360 + al() * 260;
    }

    // Pass 3: street-level decals (manholes + traffic cones, sometimes clustered).
    const rd = mulberry32(7777);
    x = 60;
    while (x < GAME.worldWidth) {
      const t = rd();
      if (t < 0.55) {
        props.push({ x: Math.floor(x), type: 'manhole', seed: Math.floor(rd() * 1e9) });
        x += 90 + rd() * 120;
      } else {
        const clusterSize = 1 + Math.floor(rd() * 3); // 1–3 cones in a row
        for (let i = 0; i < clusterSize; i++) {
          props.push({
            x: Math.floor(x + i * 11),
            type: 'cone',
            seed: Math.floor(rd() * 1e9),
          });
        }
        x += 20 + clusterSize * 11 + rd() * 100;
      }
    }

    return props;
  }

  private drawStreetProps(time: number) {
    const g = this.propsLayer;
    g.clear();
    const scrollX = this.cameras.main.scrollX;
    for (const p of this.streetProps) {
      const sx = p.x - scrollX;
      if (sx < -60 || sx > WIDTH + 60) continue;
      switch (p.type) {
        case 'lamp': drawLamp(g, sx, p.seed, time); break;
        case 'hangingSign': drawHangingSign(g, sx, p.seed, time); break;
        case 'billboard': drawBillboard(g, sx, p.seed); break;
        case 'stopSign': drawStopSign(g, sx); break;
        case 'cone': drawCone(g, sx, p.seed); break;
        case 'manhole': drawManhole(g, sx, p.seed); break;
        case 'alley': drawAlley(g, sx, p.seed); break;
      }
    }
  }

  // --------------------------- parked cars ---------------------------
  private generateParkedCars(): ParkedCar[] {
    const rand = mulberry32(5555);
    const cars: ParkedCar[] = [];
    let x = 110;
    while (x < GAME.worldWidth) {
      cars.push({
        x: Math.floor(x),
        yOffset: Math.floor(rand() * 4 - 2),
        paletteIdx: Math.floor(rand() * CAR_PALETTE.length),
        dir: rand() < 0.5 ? 1 : -1,
      });
      x += 100 + rand() * 110;
    }
    return cars;
  }

  private drawParkedCars() {
    const g = this.carLayer;
    g.clear();
    const scrollX = this.cameras.main.scrollX;
    for (const c of this.parkedCars) {
      const sx = c.x - scrollX;
      if (sx < -80 || sx > WIDTH + 80) continue;
      drawCar(g, sx, GAME.roadY + c.yOffset, c.dir, CAR_PALETTE[c.paletteIdx]);
    }
  }

  private drawForegroundNeon() {
    // Subtle vignette/scanlines for that CRT vibe.
    const g = this.foregroundNeon;
    g.clear();
    // Top vignette
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0, 0);
    g.fillRect(0, 0, WIDTH, 30);
    // Bottom vignette
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4);
    g.fillRect(0, HEIGHT - 30, WIDTH, 30);
  }

  // Draw the baton ONCE in local coords (facing right, origin at player position).
  // Subsequent frames just reposition + flip — no per-frame Graphics work.
  private drawBatonShape(g: Phaser.GameObjects.Graphics) {
    const reach = GAME.meleeReach;
    const handX = 5;
    const handY = -1;
    const tipX = reach + 3;
    const tipY = 0;
    const arcCx = reach * 0.6;
    const arcCy = 0;

    // Soft impact arc
    g.fillStyle(COLORS.gridCyan, 0.14);
    g.beginPath();
    g.arc(arcCx, arcCy, reach, -Math.PI / 2, Math.PI / 2, false);
    g.fillPath();
    g.lineStyle(1, COLORS.gridCyan, 0.5);
    g.strokePath();

    // Baton rod — three stacked thicknesses for the glow
    g.lineStyle(4, COLORS.gridCyan, 0.28);
    g.beginPath(); g.moveTo(handX, handY); g.lineTo(tipX, tipY); g.strokePath();
    g.lineStyle(2, COLORS.gridCyan, 1);
    g.beginPath(); g.moveTo(handX, handY); g.lineTo(tipX, tipY); g.strokePath();
    g.lineStyle(1, 0xffffff, 1);
    g.beginPath(); g.moveTo(handX, handY); g.lineTo(tipX, tipY); g.strokePath();

    // Tip flash
    g.fillStyle(COLORS.gridCyan, 0.5);
    g.fillCircle(tipX, tipY, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX, tipY, 2);

    // Grip cap
    g.fillStyle(0x1a1428, 1);
    g.fillCircle(handX - 1, handY, 2);
  }

  private updateMeleeArc(now: number) {
    const active = this.player.isMeleeActive(now);
    if (!active) {
      if (this.meleeArc.visible) this.meleeArc.setVisible(false);
      return;
    }
    this.meleeArc.setVisible(true);
    this.meleeArc.x = this.player.x;
    this.meleeArc.y = this.player.y;
    // Flip horizontally when facing left
    this.meleeArc.scaleX = this.player.facing;
  }

  private spawnBurst(x: number, y: number, tint: number, count = 14) {
    // Reuse the pooled emitter — no per-hit allocation.
    this.burstEmitter.setPosition(x, y);
    this.burstEmitter.setParticleTint(tint);
    this.burstEmitter.explode(count);
  }

  private healthString() {
    return `INTEGRITY: ${'#'.repeat(this.health)}${'.'.repeat(Math.max(0, 4 - this.health))}`;
  }
}

// Tiny seeded PRNG so the city looks consistent across runs.
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
