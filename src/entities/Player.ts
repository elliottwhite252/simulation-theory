import Phaser from 'phaser';
import { GAME } from '../config';

type PlayerState = 'idle' | 'walk' | 'shoot' | 'melee' | 'hit';

const PLAYER_SCALE = 0.035;
const HIT_DURATION = 260;

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  meleeUntil = 0;
  lastMelee = 0;
  lastShot = 0;
  private state: PlayerState = 'idle';
  private stateUntil = 0;
  private hitUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'iris-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.setScale(PLAYER_SCALE);
    // Tighten the hit box relative to the scaled sprite (roughly the torso column).
    body.setSize(220, 900);
    body.setOffset(230, 500);
  }

  walk(vx: number, vy: number) {
    this.setVelocity(vx, vy);
    if (vx > 0.1) this.facing = 1;
    else if (vx < -0.1) this.facing = -1;
    this.setFlipX(this.facing === -1);
    if (this.y < GAME.floorTop) this.y = GAME.floorTop;
    if (this.y > GAME.floorBottom) this.y = GAME.floorBottom;

    const now = this.scene.time.now;
    if (now < this.stateUntil) return;
    const moving = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;
    this.setPlayerState(moving ? 'walk' : 'idle');
  }

  private setPlayerState(next: PlayerState) {
    if (this.state === next) return;
    this.state = next;
    if (next === 'walk') {
      this.play('iris-walk', true);
    } else {
      this.stop();
      this.setTexture(`iris-${next}`);
    }
  }

  triggerShoot() {
    this.setPlayerState('shoot');
    this.stateUntil = this.scene.time.now + 180;
  }

  triggerMelee() {
    this.setPlayerState('melee');
    this.stateUntil = this.scene.time.now + GAME.meleeDuration;
  }

  triggerHit() {
    this.setPlayerState('hit');
    const now = this.scene.time.now;
    this.hitUntil = now + HIT_DURATION;
    this.stateUntil = this.hitUntil;
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
