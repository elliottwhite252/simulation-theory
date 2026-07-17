import Phaser from 'phaser';
import { WIDTH, HEIGHT, HEX } from '../config';
import { getSynth } from '../audio/synth';
import { OPENING_CUTSCENE } from '../cutscenes/opening';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Debug shortcut: ?skip=1 jumps straight into GameScene, bypassing the
    // menu and cutscene. Handy for iterating on gameplay/backdrops without
    // clicking through every time.
    if (new URLSearchParams(window.location.search).get('skip') === '1') {
      getSynth().start();
      this.scene.start('GameScene');
      return;
    }

    // Painted menu backdrop — scale-to-fit the game canvas.
    const bg = this.add
      .image(WIDTH / 2, HEIGHT / 2, 'bg-menu')
      .setOrigin(0.5, 0.5)
      .setDepth(-100);
    const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
    bg.setScale(scale);

    this.drawTitle();
  }

  private drawTitle() {
    // Title text is baked into the painted backdrop (bg-menu.png).
    const subY = 143;
    this.add
      .rectangle(WIDTH / 2, subY, 230, 13, 0x05000d, 0.85)
      .setStrokeStyle(1, 0xff2d95, 0.7)
      .setDepth(10);
    this.add
      .text(WIDTH / 2, subY, 'AN UNAUTHORIZED INTRUSION', {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: HEX.textShadow,
      })
      .setOrigin(0.5)
      .setDepth(11);

    const promptY = HEIGHT - 50;
    this.add
      .rectangle(WIDTH / 2, promptY, 220, 15, 0x05000d, 0.75)
      .setDepth(10);
    const prompt = this.add
      .text(WIDTH / 2, promptY, 'PRESS SPACE / CLICK TO JACK IN', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.25 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    const controlsY = HEIGHT - 30;
    this.add
      .rectangle(WIDTH / 2, controlsY, 320, 12, 0x05000d, 0.75)
      .setDepth(10);
    this.add
      .text(WIDTH / 2, controlsY, 'WASD / ARROWS  move      X  melee      Z / CLICK  shoot', {
        fontFamily: 'Courier New, monospace',
        fontSize: '8px',
        color: HEX.text,
      })
      .setOrigin(0.5)
      .setAlpha(0.95)
      .setDepth(11);

    const muteText = this.add
      .text(WIDTH - 8, HEIGHT - 8, this.muteLabel(), {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.text,
      })
      .setOrigin(1, 1)
      .setAlpha(0.75)
      .setDepth(10);

    const synth = getSynth();
    const startGame = () => {
      synth.start();
      this.scene.start('CutsceneScene', { config: OPENING_CUTSCENE });
    };
    // First user gesture: start the synth (audio context resume) AND advance.
    this.input.keyboard?.once('keydown-SPACE', startGame);
    this.input.keyboard?.once('keydown-ENTER', startGame);
    this.input.once('pointerdown', startGame);

    // M toggles mute regardless of which scene we're in.
    this.input.keyboard?.on('keydown-M', () => {
      synth.start();
      synth.toggleMute();
      muteText.setText(this.muteLabel());
    });
  }

  private muteLabel() {
    return getSynth().isMuted() ? '♪ M : muted' : '♪ M : mute';
  }
}
