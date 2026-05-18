import Phaser from 'phaser';
import { GAME } from '../config';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp = GAME.enemyHp;
  hitFlashUntil = 0;
  iframesUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setSize(26, 32);
    this.setOffset(3, 6);

    // Subtle glitch flicker baseline.
    scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.7 },
      duration: 180,
      yoyo: true,
      repeat: -1,
    });
  }

  chase(targetX: number, targetY: number) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.setVelocity((dx / len) * GAME.enemySpeed, (dy / len) * GAME.enemySpeed);
    this.setFlipX(dx < 0);
  }

  takeHit(damage: number, now: number) {
    if (now < this.iframesUntil) return false;
    this.iframesUntil = now + 120;
    this.hp -= damage;
    this.hitFlashUntil = now + 90;
    this.setTint(0xffffff);
    return this.hp <= 0;
  }

  updateFlash(now: number) {
    if (this.hitFlashUntil && now > this.hitFlashUntil) {
      this.hitFlashUntil = 0;
      this.clearTint();
    }
  }
}
