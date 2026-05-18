# Simulation Theory

An 80s synthwave neon-city beat-em-up. Inspired by Muse's *Simulation Theory* album, the TMNT arcade games, and Blade Runner's rainy-future cityscapes.

Built with [Phaser 3](https://phaser.io) + TypeScript + [Vite](https://vitejs.dev). All visuals are drawn procedurally — no external art assets. The soundtrack is generated live via the Web Audio API.

## Run it locally

Requires **Node 20+** (the project uses Vite 5).

```bash
git clone https://github.com/elliottwhite252/simulation-theory.git
cd simulation-theory
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Controls

| Key | Action |
| --- | --- |
| `WASD` / Arrow keys | Walk (4-directional on the street) |
| `Z` / Click | Shoot |
| `X` | Melee |
| `Space` | Confirm on the title screen |
| `M` | Toggle music mute |

## What's in it

**City rendering**
- Two parallax layers of procedurally generated skyscrapers with lit windows in pink / cyan / yellow / white
- Moon with halo, twinkling stars
- Hanging neon signs with faux-glyph text, billboards with multicolor "ads", glowing lamp posts, stop signs
- Alleys punched through the skyline with back-door bar signs, dumpster silhouettes, vapor wisps
- Parked DeLoreans along the back curb with neon underglow
- Traffic cones and manhole decals on the asphalt

**Gameplay**
- TMNT-style camera: dual cameras (zoomed-in main view + 1:1 HUD), 4-direction movement, lock-and-clear room encounters
- 3 zones, each spawning an enemy wave that must be cleared before advancing
- Player has a trench coat, red sweatband, walking pose, and a pistol that swings out from the hip when firing

**Soundtrack**
- 18-bar procedural synthwave track in C major with a borrowed ♭VI for that "thriller" flavor
- Progressive 8-phase build: bare arp + pad → hi-hat → kick → clap → open hat → 16th-note hats
- Climax accelerates the chord progression (1 chord/bar instead of 2) for the last 4 bars
- All voices synthesized live: detuned sawtooth pad, sub-bass arp, click-attack kick, white-noise hat + clap, synthetic plate reverb

## Stack

- [Phaser 3](https://phaser.io) — game engine
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — dev server + build
- Web Audio API — procedural soundtrack
- No image, audio, or font assets — everything is drawn or synthesized at runtime

## Project layout

```
src/
├── main.ts              # Phaser game config
├── config.ts            # Colors, world dims, gameplay tuning
├── audio/synth.ts       # Procedural soundtrack engine
├── render/props.ts      # Shared renderers (cars, signs, cones, etc.)
├── entities/            # Player, Enemy
└── scenes/              # Boot, Menu, Game
```

## Status

Early prototype. Built one feature at a time in a single playthrough. Lots of polish ahead — animation frames, more enemy variety, weapon variety, boss encounters, victory screen tuning, etc.
