import Phaser from 'phaser';
import { WIDTH, HEIGHT, HEX, GAME, ROOMS, MAX_CAMERA_X, COLORS } from '../config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BroadcastVan } from '../entities/BroadcastVan';
import { TouchControls, shouldShowTouchControls } from '../entities/TouchControls';
import { getSynth } from '../audio/synth';

type Phase = 'roaming' | 'locked' | 'cleared' | 'won' | 'gameover';

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

  // HUD (fixed to camera).
  private scoreText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private roomText!: Phaser.GameObjects.Text;
  private goText!: Phaser.GameObjects.Text;
  private muteText?: Phaser.GameObjects.Text;

  // Touch overlay — only instantiated on touch-capable devices (or ?touch=1).
  private touch?: TouchControls;

  // Boss fight state — populated when a boss room locks.
  private boss?: BroadcastVan;
  private broadcastWaves!: Phaser.Physics.Arcade.Group;
  private bossBarBg?: Phaser.GameObjects.Graphics;
  private bossBarFill?: Phaser.GameObjects.Graphics;
  private bossLabel?: Phaser.GameObjects.Text;

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

    // Painted backdrop — tiled across the full world width so it scrolls
    // seamlessly as the camera moves. Native image height (1536) is scaled to the
    // canvas height (270), then repeats horizontally. ?bg=zone2 swaps to the
    // subway backdrop for level-2 preview until the full Level 2 flow lands.
    const bgKey = new URLSearchParams(window.location.search).get('bg') === 'zone2'
      ? 'bg-zone-2'
      : 'bg-zone-1';
    this.bgLayer = this.add
      .tileSprite(0, 0, GAME.worldWidth, HEIGHT, bgKey)
      .setOrigin(0, 0)
      .setDepth(-100);
    const bgTex = this.textures.get(bgKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const bgScale = HEIGHT / bgTex.height;
    this.bgLayer.setTileScale(bgScale, bgScale);

    // Foreground vignette + scanlines stay procedural — cheap CRT overlay.
    this.foregroundNeon = this.add.graphics().setScrollFactor(0).setDepth(-10);
    this.worldLayer.add([this.bgLayer, this.foregroundNeon]);

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
    // Boss projectiles — cyan/pink sonic rings the Broadcast Van fires.
    this.broadcastWaves = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 8,
    });

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      this.bulletHitEnemy(
        bullet as Phaser.Physics.Arcade.Sprite,
        enemy as Enemy,
      );
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) => {
      this.enemyTouchPlayer(enemy as Enemy);
    });
    this.physics.add.overlap(this.player, this.broadcastWaves, (_p, wave) => {
      this.broadcastWaveHitPlayer(wave as Phaser.Physics.Arcade.Sprite);
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

    // Mobile / touch overlay — joystick + shoot/melee buttons. Auto-hidden on
    // desktop; forced visible with ?touch=1 for dev testing.
    if (shouldShowTouchControls()) {
      this.touch = new TouchControls(this);
      this.touch.onShoot = () => this.tryShoot();
      this.touch.onMelee = () => this.tryMelee();
      this.hudLayer.add(this.touch.gameObjects());
    }
  }

  private muteLabel() {
    return getSynth().isMuted() ? '♪ M : muted' : '♪ M : mute';
  }

  // --------------------------- update loop ---------------------------
  update(time: number, _delta: number) {
    if (this.phase === 'gameover' || this.phase === 'won') return;

    // Player movement (4-dir + analog stick)
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

    // Touch joystick overrides keyboard when actively engaged (analog input,
    // magnitude already normalized to -1..1 by TouchControls).
    if (this.touch && (this.touch.vx !== 0 || this.touch.vy !== 0)) {
      vx = this.touch.vx;
      vy = this.touch.vy;
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

    // Enemy AI — bosses skip chase (they hold position) but still update flash.
    this.enemies.children.iterate((e) => {
      const enemy = e as Enemy;
      if (!enemy.active) return true;
      if (!(enemy instanceof BroadcastVan)) {
        enemy.chase(this.player.x, this.player.y);
      }
      enemy.updateFlash(time);
      return true;
    });

    // Boss update + HP bar
    if (this.boss && this.boss.active) {
      const decision = this.boss.updateBoss(time, this.player.x);
      if (decision.fireBroadcast) this.fireBroadcastWave();
      this.updateBossHUD();
    }

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
    this.damageEnemy(enemy, GAME.bulletDamage, bullet.x);
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
        // Skip knockback for immovable enemies (bosses) — they anchor by
        // design and setVelocity would override that, launching them
        // off-screen with no chase AI to pull them back.
        if (!body.immovable) {
          body.setVelocity(this.player.facing * 130, -20);
        }
        this.damageEnemy(enemy, GAME.meleeDamage, this.player.x);
      }
      return true;
    });
  }

  private damageEnemy(enemy: Enemy, dmg: number, attackerX: number) {
    const now = this.time.now;
    let killed = false;
    if (enemy instanceof BroadcastVan) {
      // Positional-weakness routing — only rear hits register.
      killed = enemy.takeHitFrom(dmg, now, attackerX);
      // Purple burst on blocked (no damage), pink on real damage, gold on kill.
      const color = killed ? 0xffd166 : (enemy.hp === BroadcastVan.MAX_HP || now < enemy.iframesUntil - 60 ? 0x00f6ff : 0xff2d95);
      const count = killed ? 24 : 4;
      this.spawnBurst(enemy.x, enemy.y, color, count);
    } else {
      killed = enemy.takeHit(dmg, now);
      this.spawnBurst(enemy.x, enemy.y, COLORS.enemy, killed ? 16 : 6);
    }
    if (killed) {
      if (enemy === this.boss) {
        this.hideBossHUD();
        this.boss = undefined;
        this.cameras.main.flash(240, 255, 45, 149);
        this.score += 2000;
      } else {
        this.score += 100;
      }
      enemy.destroy();
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
    if (room.bossType === 'broadcastVan') {
      this.spawnBoss(room);
    } else {
      this.spawnWave(room);
    }
  }

  private spawnBoss(room: (typeof ROOMS)[number]) {
    // Boss spawns after a short delay so the "INTRUSION DETECTED" banner
    // clears first. Positioned right-of-center; player enters from the left.
    this.pendingSpawns = 1;
    const viewW = WIDTH / this.cameras.main.zoom;
    const bx = room.cameraLockX + viewW * 0.7;
    const by = GAME.floorBottom - 6;
    this.time.delayedCall(600, () => {
      const boss = new BroadcastVan(this, bx, by);
      this.enemies.add(boss);
      this.worldLayer.add(boss);
      this.boss = boss;
      this.showBossHUD();
      this.pendingSpawns = 0;
    });
  }

  private fireBroadcastWave() {
    if (!this.boss || !this.boss.active) return;
    const dir = this.boss.facing; // -1 fires left, 1 fires right
    const startX = this.boss.x + dir * 20;
    const startY = this.boss.y - 4;
    const wave = this.broadcastWaves.get(startX, startY, 'broadcast-wave') as Phaser.Physics.Arcade.Sprite | null;
    if (!wave) return;
    wave.enableBody(true, startX, startY, true, true);
    const body = wave.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setVelocity(dir * 90, 0);
    wave.setFlipX(dir === -1);
    wave.setTint(0xffffff);
    this.worldLayer.add(wave);
    // Auto-recycle after the wave leaves the room.
    this.time.delayedCall(2500, () => {
      if (wave.active) wave.disableBody(true, true);
    });
  }

  private broadcastWaveHitPlayer(wave: Phaser.Physics.Arcade.Sprite) {
    if (!wave.active) return;
    const now = this.time.now;
    // Reuse the same iframe window as enemy contact to prevent multi-tick hits.
    if (this.player.active === false) return;
    wave.disableBody(true, true);
    this.health -= 1;
    this.hudText.setText(this.healthString());
    this.player.triggerHit();
    this.cameras.main.shake(180, 0.012);
    this.cameras.main.flash(110, 255, 45, 149);
    this.spawnBurst(this.player.x, this.player.y, COLORS.gridCyan, 8);
    if (this.health <= 0) this.triggerGameOver();
    void now;
  }

  private createBossHUD() {
    if (this.bossBarBg) return;
    this.bossBarBg = this.add.graphics().setScrollFactor(0).setDepth(1002).setVisible(false);
    this.bossBarFill = this.add.graphics().setScrollFactor(0).setDepth(1003).setVisible(false);
    this.bossLabel = this.add
      .text(WIDTH / 2, 20, 'OC-BC-01 // BROADCAST UNIT', {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.textShadow,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1004)
      .setVisible(false);
    this.hudLayer.add([this.bossBarBg, this.bossBarFill, this.bossLabel]);
  }

  private showBossHUD() {
    this.createBossHUD();
    this.bossBarBg?.setVisible(true);
    this.bossBarFill?.setVisible(true);
    this.bossLabel?.setVisible(true);
    this.updateBossHUD();
  }

  private hideBossHUD() {
    this.bossBarBg?.setVisible(false);
    this.bossBarFill?.setVisible(false);
    this.bossLabel?.setVisible(false);
  }

  private updateBossHUD() {
    if (!this.bossBarBg || !this.bossBarFill || !this.boss) return;
    const barW = WIDTH - 100;
    const barH = 5;
    const barX = 50;
    const barY = 30;
    this.bossBarBg.clear();
    this.bossBarBg.fillStyle(0x05000d, 0.85);
    this.bossBarBg.fillRect(barX, barY, barW, barH);
    this.bossBarBg.lineStyle(1, 0x00f6ff, 0.9);
    this.bossBarBg.strokeRect(barX, barY, barW, barH);
    this.bossBarFill.clear();
    this.bossBarFill.fillStyle(0xff2d95, 0.95);
    this.bossBarFill.fillRect(barX + 1, barY + 1, (barW - 2) * this.boss.hpFraction(), barH - 2);
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
      // Alternate sides so pressure comes from both directions across the wave.
      // Spawn positions sit off-screen just past the room's visible edge —
      // Enemy.chase() naturally walks them into view so the player sees them
      // coming instead of materializing on top of them.
      const side = i % 2 === 0 ? 1 : -1;
      const ex = side === 1
        ? room.cameraLockX + viewW + 20
        : room.cameraLockX - 20;
      const ey = Phaser.Math.Between(GAME.floorTop, GAME.floorBottom);
      // Stagger arrivals — first at 300ms, ~900ms between each — so the wave
      // reads as a sequence, not a swarm.
      const startDelay = 300 + i * 900;
      this.time.delayedCall(startDelay, () => this.spawnEnemy(ex, ey));
    }
  }

  private spawnEnemy(x: number, y: number) {
    const enemy = new Enemy(this, x, y);
    this.enemies.add(enemy);
    this.worldLayer.add(enemy);
    this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
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

