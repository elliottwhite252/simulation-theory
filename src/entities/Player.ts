import Phaser from 'phaser';
import { GAME } from '../config';

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  meleeUntil = 0;
  lastMelee = 0;
  lastShot = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setSize(20, 32);
    this.setOffset(4, 8);
  }

  walk(vx: number, vy: number) {
    this.setVelocity(vx, vy);
    if (vx > 0.1) this.facing = 1;
    else if (vx < -0.1) this.facing = -1;
    this.setFlipX(this.facing === -1);
    // Constrain Y to floor band even if velocity carries us out.
    if (this.y < GAME.floorTop) this.y = GAME.floorTop;
    if (this.y > GAME.floorBottom) this.y = GAME.floorBottom;
  }

  isMeleeActive(now: number) {
    return now < this.meleeUntil;
  }

  tryMelee(now: number) {
    if (now - this.lastMelee < GAME.meleeCooldown) return false;
    this.lastMelee = now;
    this.meleeUntil = now + GAME.meleeDuration;
    return true;
  }

  tryShoot(now: number) {
    if (now - this.lastShot < GAME.shootCooldown) return false;
    this.lastShot = now;
    return true;
  }
}
