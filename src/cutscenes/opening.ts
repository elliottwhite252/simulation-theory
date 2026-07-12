import type { CutsceneConfig } from '../scenes/CutsceneScene';

// Three painted Nano Banana panels. Each panel loads its texture from
// public/assets/ via BootScene; the CutsceneScene renders it full-bleed with
// the dialog box overlaid on the bottom.
export const OPENING_CUTSCENE: CutsceneConfig = {
  nextScene: 'GameScene',
  panels: [
    {
      textureKey: 'cutscene-1',
      lines: [
        'The city runs on one signal.',
        'OmniCast owns ninety-four percent of every screen, every speaker, every billboard.',
        "Tonight, they're going for the last six.",
      ],
    },
    {
      textureKey: 'cutscene-2',
      lines: [
        'My sister tried to tell the truth.',
        'They made it look like a suicide.',
      ],
    },
    {
      textureKey: 'cutscene-3',
      lines: [
        "I'm Iris. She was Mira.",
        'I never listened when she was alive.',
        "I'll listen now.",
      ],
    },
  ],
};
