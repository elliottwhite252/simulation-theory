import Phaser from 'phaser';
import { WIDTH, HEIGHT, COLORS, HEX } from '../config';

export interface CutscenePanel {
  // Draw the panel content into the area (0,0)–(w,h).
  // The scene wraps the draw call so the content is clipped to the panel box.
  draw: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;
  // One or more dialog lines that appear under the panel, advanced with SPACE.
  lines: string[];
}

export interface CutsceneConfig {
  panels: CutscenePanel[];
  nextScene: string;
}

const PANEL_PADDING = 24;
const PANEL_TOP = 40;
const DIALOG_HEIGHT = 130;
const PANEL_BOTTOM = HEIGHT - DIALOG_HEIGHT - 20;

export class CutsceneScene extends Phaser.Scene {
  private config!: CutsceneConfig;
  private panelIdx = 0;
  private lineIdx = 0;
  private charIdx = 0;
  private typewriterAccum = 0;
  private readonly CHAR_INTERVAL = 28; // ms per character

  private panelG!: Phaser.GameObjects.Graphics;
  private panelFrame!: Phaser.GameObjects.Graphics;
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
    // Solid black backdrop for the letterbox feel.
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000).setOrigin(0, 0);

    // Panel area
    this.panelG = this.add.graphics();
    this.panelFrame = this.add.graphics();

    // Dialog box at the bottom
    this.dialogBox = this.add.graphics();
    const dialogY = HEIGHT - DIALOG_HEIGHT - 10;
    this.dialogBox.fillStyle(0x05000d, 0.95);
    this.dialogBox.fillRect(PANEL_PADDING, dialogY, WIDTH - PANEL_PADDING * 2, DIALOG_HEIGHT);
    this.dialogBox.lineStyle(2, COLORS.gridCyan, 0.7);
    this.dialogBox.strokeRect(PANEL_PADDING, dialogY, WIDTH - PANEL_PADDING * 2, DIALOG_HEIGHT);

    this.dialogText = this.add
      .text(PANEL_PADDING + 20, dialogY + 22, '', {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: HEX.text,
        wordWrap: { width: WIDTH - PANEL_PADDING * 2 - 40 },
      })
      .setLineSpacing(4);

    this.continuePrompt = this.add
      .text(WIDTH - PANEL_PADDING - 12, HEIGHT - 24, '▶ space', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        color: HEX.text,
      })
      .setOrigin(1, 1)
      .setAlpha(0.55);

    this.add
      .text(PANEL_PADDING, 18, 'ESC skips', {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        color: HEX.text,
      })
      .setAlpha(0.35);

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
    this.panelG.clear();
    this.panelFrame.clear();

    const panel = this.config.panels[this.panelIdx];
    const innerW = WIDTH - PANEL_PADDING * 2;
    const innerH = PANEL_BOTTOM - PANEL_TOP;

    // Translate so the panel's draw function works in (0,0)–(w,h) coords.
    this.panelG.translateCanvas(PANEL_PADDING, PANEL_TOP);
    panel.draw(this.panelG, innerW, innerH);
    this.panelG.translateCanvas(-PANEL_PADDING, -PANEL_TOP);

    // Neon frame around the panel
    this.panelFrame.lineStyle(2, COLORS.gridPink, 0.85);
    this.panelFrame.strokeRect(PANEL_PADDING, PANEL_TOP, innerW, innerH);
    this.panelFrame.lineStyle(1, COLORS.gridCyan, 0.35);
    this.panelFrame.strokeRect(PANEL_PADDING - 3, PANEL_TOP - 3, innerW + 6, innerH + 6);
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
