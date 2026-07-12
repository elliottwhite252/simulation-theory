import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, HEX } from '../config';

export interface CutscenePanel {
  // Nano Banana painted texture rendered full-bleed behind the dialog.
  textureKey: string;
  // Dialog lines advanced with SPACE.
  lines: string[];
}

export interface CutsceneConfig {
  panels: CutscenePanel[];
  nextScene: string;
}

const DIALOG_HEIGHT = 65;
const DIALOG_PADDING = 12;

export class CutsceneScene extends Phaser.Scene {
  private config!: CutsceneConfig;
  private panelIdx = 0;
  private lineIdx = 0;
  private charIdx = 0;
  private typewriterAccum = 0;
  private readonly CHAR_INTERVAL = 28; // ms per character

  private panelImage!: Phaser.GameObjects.Image;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogBox!: Phaser.GameObjects.Graphics;
  private continuePrompt!: Phaser.GameObjects.Text;

  constructor() {
    super('CutsceneScene');
  }

  init(data: { config: CutsceneConfig }) {
    this.config = data.config;
    this.panelIdx = 0;
    this.lineIdx = 0;
    this.charIdx = 0;
    this.typewriterAccum = 0;
  }

  create() {
    // Solid black backdrop behind everything so any letterboxing reads clean.
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000).setOrigin(0, 0);

    // Painted panel image — full-bleed, texture swapped per panel.
    this.panelImage = this.add
      .image(WIDTH / 2, HEIGHT / 2, this.config.panels[0].textureKey)
      .setOrigin(0.5, 0.5)
      .setDepth(0);

    // Dialog box overlays the bottom of the image.
    const dialogY = HEIGHT - DIALOG_HEIGHT - 5;
    this.dialogBox = this.add.graphics().setDepth(10);
    this.dialogBox.fillStyle(0x05000d, 0.9);
    this.dialogBox.fillRect(DIALOG_PADDING, dialogY, WIDTH - DIALOG_PADDING * 2, DIALOG_HEIGHT);
    this.dialogBox.lineStyle(1, COLORS.gridCyan, 0.7);
    this.dialogBox.strokeRect(DIALOG_PADDING, dialogY, WIDTH - DIALOG_PADDING * 2, DIALOG_HEIGHT);

    this.dialogText = this.add
      .text(DIALOG_PADDING + 10, dialogY + 11, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: HEX.text,
        wordWrap: { width: WIDTH - DIALOG_PADDING * 2 - 20 },
      })
      .setLineSpacing(2)
      .setDepth(11);

    this.continuePrompt = this.add
      .text(WIDTH - DIALOG_PADDING - 6, HEIGHT - 12, '▶ space', {
        fontFamily: 'Courier New, monospace',
        fontSize: '7px',
        color: HEX.text,
      })
      .setOrigin(1, 1)
      .setAlpha(0.55)
      .setDepth(11);

    this.add
      .text(DIALOG_PADDING, 9, 'ESC skips', {
        fontFamily: 'Courier New, monospace',
        fontSize: '6px',
        color: HEX.text,
      })
      .setAlpha(0.35)
      .setDepth(11);

    // Input
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard?.on('keydown-ESC', () => this.skip());

    this.renderPanel();
  }

  update(_time: number, delta: number) {
    const panel = this.config.panels[this.panelIdx];
    if (!panel) return;
    const line = panel.lines[this.lineIdx];
    if (line === undefined) return;
    if (this.charIdx >= line.length) {
      this.continuePrompt.setVisible(true);
      return;
    }
    this.continuePrompt.setVisible(false);
    this.typewriterAccum += delta;
    while (this.typewriterAccum >= this.CHAR_INTERVAL && this.charIdx < line.length) {
      this.charIdx++;
      this.typewriterAccum -= this.CHAR_INTERVAL;
    }
    this.dialogText.setText(line.substring(0, this.charIdx));
  }

  private renderPanel() {
    const panel = this.config.panels[this.panelIdx];
    this.panelImage.setTexture(panel.textureKey);
    // Fit-width scaling — with 2752×1536 source and 480×270 canvas, the aspect
    // ratios match within 0.1%, so this fills the whole screen edge-to-edge.
    const src = this.textures.get(panel.textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const scale = WIDTH / src.width;
    this.panelImage.setScale(scale);
  }

  private advance() {
    const panel = this.config.panels[this.panelIdx];
    if (!panel) return;
    const line = panel.lines[this.lineIdx];

    // If typewriter is mid-line, fast-forward to end of the line.
    if (line && this.charIdx < line.length) {
      this.charIdx = line.length;
      this.dialogText.setText(line);
      return;
    }

    // Advance to next line.
    this.lineIdx++;
    this.charIdx = 0;
    this.typewriterAccum = 0;

    if (this.lineIdx >= panel.lines.length) {
      // Move to next panel.
      this.lineIdx = 0;
      this.panelIdx++;
      if (this.panelIdx >= this.config.panels.length) {
        this.scene.start(this.config.nextScene);
        return;
      }
      this.renderPanel();
      this.dialogText.setText('');
    }
  }

  private skip() {
    this.scene.start(this.config.nextScene);
  }
}
