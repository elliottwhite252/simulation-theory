import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config';

// Semi-transparent virtual joystick + two thumb buttons for mobile play.
// Only instantiated on touch-capable devices (or when ?touch=1 in the URL for
// desktop testing). The GameScene reads vx/vy each frame and hooks onShoot /
// onMelee callbacks — TouchControls itself owns no game logic.
export class TouchControls {
  // Public input state — GameScene polls these each frame.
  vx = 0;
  vy = 0;

  // External callbacks fired on button press.
  onShoot?: () => void;
  onMelee?: () => void;

  private scene: Phaser.Scene;
  private joystickBase: Phaser.GameObjects.Arc;
  private joystickThumb: Phaser.GameObjects.Arc;
  private shootBtn: Phaser.GameObjects.Arc;
  private shootLabel: Phaser.GameObjects.Text;
  private meleeBtn: Phaser.GameObjects.Arc;
  private meleeLabel: Phaser.GameObjects.Text;

  // Multi-touch: track the pointer ID currently dragging the joystick so a
  // simultaneous button press doesn't steal it.
  private joyPointerId: number | null = null;
  private readonly joyCenter: { x: number; y: number };
  private readonly joyRadius = 32;
  private readonly deadzone = 0.15;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Joystick — bottom-left corner, safe distance from screen edge.
    this.joyCenter = { x: 42, y: HEIGHT - 42 };
    this.joystickBase = scene.add
      .circle(this.joyCenter.x, this.joyCenter.y, this.joyRadius, 0x00f6ff, 0.12)
      .setStrokeStyle(1.5, 0x00f6ff, 0.45)
      .setScrollFactor(0)
      .setDepth(2000);
    this.joystickThumb = scene.add
      .circle(this.joyCenter.x, this.joyCenter.y, this.joyRadius * 0.4, 0x00f6ff, 0.45)
      .setStrokeStyle(1, 0xffffff, 0.7)
      .setScrollFactor(0)
      .setDepth(2001);

    // Melee button — left of shoot, gold tinted (matches melee arc color).
    this.meleeBtn = this.makeButton(WIDTH - 76, HEIGHT - 42, 0xffd166);
    this.meleeLabel = this.makeButtonLabel(WIDTH - 76, HEIGHT - 42, 'X');

    // Shoot button — bottom-right corner, cyan tinted (matches bullet color).
    this.shootBtn = this.makeButton(WIDTH - 28, HEIGHT - 42, 0x00f6ff);
    this.shootLabel = this.makeButtonLabel(WIDTH - 28, HEIGHT - 42, 'Z');

    this.wireJoystick();
    this.wireButton(this.shootBtn, () => this.onShoot?.());
    this.wireButton(this.meleeBtn, () => this.onMelee?.());
  }

  private makeButton(x: number, y: number, color: number): Phaser.GameObjects.Arc {
    const btn = this.scene.add
      .circle(x, y, 20, color, 0.15)
      .setStrokeStyle(1.5, color, 0.55)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({
        hitArea: new Phaser.Geom.Circle(0, 0, 22),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
      });
    return btn;
  }

  private makeButtonLabel(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, text, {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.75)
      .setScrollFactor(0)
      .setDepth(2001);
  }

  private wireButton(btn: Phaser.GameObjects.Arc, fire: () => void) {
    btn.on('pointerdown', () => {
      btn.setAlpha(0.55);
      fire();
    });
    const reset = () => btn.setAlpha(1);
    btn.on('pointerup', reset);
    btn.on('pointerout', reset);
    btn.on('pointerupoutside', reset);
  }

  private wireJoystick() {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only capture pointers that land in the left half — right half is
      // reserved for the shoot/melee buttons.
      if (this.joyPointerId !== null) return;
      if (pointer.x > WIDTH * 0.5) return;
      this.joyPointerId = pointer.id;
      this.updateFromPointer(pointer);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joyPointerId) return;
      this.updateFromPointer(pointer);
    });

    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.joystickThumb.setPosition(this.joyCenter.x, this.joyCenter.y);
      this.vx = 0;
      this.vy = 0;
    };
    this.scene.input.on('pointerup', release);
    this.scene.input.on('pointerupoutside', release);
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer) {
    let dx = pointer.x - this.joyCenter.x;
    let dy = pointer.y - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.joyRadius) {
      dx = (dx / dist) * this.joyRadius;
      dy = (dy / dist) * this.joyRadius;
    }
    this.joystickThumb.setPosition(this.joyCenter.x + dx, this.joyCenter.y + dy);
    const nx = dx / this.joyRadius;
    const ny = dy / this.joyRadius;
    // Apply deadzone so a resting thumb doesn't dribble input.
    this.vx = Math.abs(nx) < this.deadzone ? 0 : nx;
    this.vy = Math.abs(ny) < this.deadzone ? 0 : ny;
  }

  // Convenience for adding all touch UI to a HUD layer at once.
  gameObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.joystickBase, this.joystickThumb,
      this.shootBtn, this.shootLabel,
      this.meleeBtn, this.meleeLabel,
    ];
  }

  destroy() {
    this.gameObjects().forEach((o) => o.destroy());
  }
}

// Detection helper — show touch controls on touch-capable devices, or when
// the URL includes ?touch=1 (useful for desktop dev/testing).
export function shouldShowTouchControls(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('touch') === '1') return true;
  return 'ontouchstart' in window || (window.matchMedia?.('(pointer: coarse)').matches ?? false);
}
