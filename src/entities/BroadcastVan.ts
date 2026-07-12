import Phaser from 'phaser';
import { Enemy } from './Enemy';

// Level 1 boss — OmniCast's autonomous broadcast war-truck. Extends Enemy so
// it plugs into the same physics/collision/tint pipeline, but adds:
//  - much higher HP + larger silhouette
//  - a facing direction and positional weakness (only takes damage from behind)
//  - a two-phase state machine with a broadcast-wave projectile attack
//
// Attacks are driven by timers ticked in updateBoss(now, playerX, playerY),
// which GameScene calls each frame while phase === 'locked' on a boss room.
export class BroadcastVan extends Enemy {
  static readonly MAX_HP = 30;
  static readonly PHASE_2_HP = 15;

  facing: 1 | -1 = -1; // start facing left toward the player
  phaseNum: 1 | 2 = 1;

  private nextBroadcastAt = 0;
  private nextFacingCheckAt = 0;
  private blockedFlashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Fallback to enemy-visor texture until boss-broadcast-van.png is added to
    // public/assets/ — keeps dev builds working while art is generating.
    const key = scene.textures.exists('boss-broadcast-van')
      ? 'boss-broadcast-van'
      : 'enemy-visor';
    super(scene, x, y, key);
    this.hp = BroadcastVan.MAX_HP;
    // Larger silhouette than the Visor — bosses read as bigger.
    this.setScale(0.075);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(700, 700);
    body.setOffset(0, 400);
    body.setImmovable(true); // player collisions push the player, not the van
    this.setFlipX(this.facing === -1);
  }

  // GameScene calls this each frame during the boss fight. Handles facing +
  // attack scheduling. Movement is deliberately minimal — the van holds
  // position and forces the player to circle it to hit the vulnerable rear.
  updateBoss(now: number, playerX: number): { fireBroadcast: boolean } {
    // Enter phase 2 at 50% HP — attacks speed up.
    if (this.phaseNum === 1 && this.hp <= BroadcastVan.PHASE_2_HP) {
      this.phaseNum = 2;
    }

    // Turn to face the player every 1500ms. Not every frame — that makes
    // hitting the rear feel impossible.
    if (now >= this.nextFacingCheckAt) {
      this.nextFacingCheckAt = now + 1500;
      this.facing = playerX < this.x ? -1 : 1;
      this.setFlipX(this.facing === -1);
    }

    // Broadcast wave cadence — 3s in phase 1, 1.5s in phase 2.
    const broadcastInterval = this.phaseNum === 1 ? 3000 : 1500;
    if (now >= this.nextBroadcastAt) {
      this.nextBroadcastAt = now + broadcastInterval;
      return { fireBroadcast: true };
    }
    return { fireBroadcast: false };
  }

  // Positional weakness — only takes damage when hit from behind. Front /
  // side hits blink cyan (blocked shield) instead of pink (real damage).
  takeHitFrom(damage: number, now: number, attackerX: number): boolean {
    if (now < this.iframesUntil) return false;
    const isBehind = (this.facing === 1 && attackerX < this.x) ||
                     (this.facing === -1 && attackerX > this.x);
    if (!isBehind) {
      // Blocked — brief cyan shield flash, no damage taken.
      this.iframesUntil = now + 80;
      this.blockedFlashUntil = now + 80;
      this.setTint(0x00f6ff);
      return false;
    }
    // Real hit — pink damage flash.
    this.iframesUntil = now + 120;
    this.hp -= damage;
    this.hitFlashUntil = now + 90;
    this.setTint(0xff2d95);
    return this.hp <= 0;
  }

  updateFlash(now: number) {
    if (this.blockedFlashUntil && now > this.blockedFlashUntil) {
      this.blockedFlashUntil = 0;
      this.clearTint();
      return;
    }
    super.updateFlash(now);
  }

  hpFraction(): number {
    return Math.max(0, this.hp / BroadcastVan.MAX_HP);
  }
}
