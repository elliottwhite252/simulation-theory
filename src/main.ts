import Phaser from 'phaser';
import { COLORS } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { CutsceneScene } from './scenes/CutsceneScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: COLORS.bgDeep,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 270,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    // 4 concurrent pointers so joystick + shoot + melee can be pressed at the
    // same time (mobile). Desktop mouse still works — it's pointer #0.
    activePointers: 4,
  },
  scene: [BootScene, MenuScene, CutsceneScene, GameScene],
};

new Phaser.Game(config);
