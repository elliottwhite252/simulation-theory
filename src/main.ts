import Phaser from 'phaser';
import { COLORS, GAME } from './config';
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
      gravity: { x: 0, y: GAME.gravity },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, CutsceneScene, GameScene],
};

new Phaser.Game(config);
