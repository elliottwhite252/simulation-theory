# Simulation Theory — Project Briefing

A handoff document. Paste this into a new Claude session, project knowledge, or any other context window where you want fresh-Claude to understand this game.

---

## What it is

**Simulation Theory** is a synthwave neon-city beat-em-up. Single-player, web-based, horizontal-scrolling, lock-and-clear room encounters in the style of TMNT IV: Turtles in Time and Streets of Rage 2.

**Story** (told via 3-panel opening cutscene): OmniCast owns 94% of every screen, speaker, and billboard in the city — tonight they go for the last 6%. The player is **Iris**, whose sister **Mira** was killed (made to look like suicide) for trying to expose them. Iris finds a USB drive Mira hid and the game starts.

**Current stage:** Early prototype, single playthrough. 3 zones, each spawning an enemy wave.

---

## Stack

| Layer | Choice |
| --- | --- |
| Engine | Phaser 3.80 |
| Language | TypeScript 5.4 |
| Bundler | Vite 5 |
| Audio | Web Audio API (procedural — no audio files) |
| Art | Procedural — no image/sprite/font files |
| Node | requires 20+ (Vite 5) |

`package.json` has only one runtime dependency: `phaser`. Everything else is dev-tooling.

**Run locally:** `npm install && npm run dev` → `http://localhost:5173`.

---

## Active work: 16-bit conversion (IN PROGRESS)

The project started as a "vector-style pixel art aspiring to 16-bit" look — anti-aliased shapes drawn at 960×540. Elliott pivoted to a **true 16-bit (SNES/Genesis era) target**.

**Reference points:** Streets of Rage 2/3, TMNT IV: Turtles in Time, Final Fight.

**Conversion done so far** (uncommitted, modified files: `main.ts`, `config.ts`, `MenuScene.ts`, `CutsceneScene.ts`, `GameScene.ts`, `cutscenes/opening.ts`, `render/props.ts`):

- Internal resolution dropped from 960×540 → **480×270** (in `main.ts`)
- `pixelArt: true` + `roundPixels: true` enabled — crisp nearest-neighbor scaling
- Mechanical sweep through all files halving:
  - World dimensions (`WIDTH`, `HEIGHT`, `worldWidth`)
  - Movement speeds (`walkSpeed`, `bulletSpeed`, `enemySpeed`, knockback velocities)
  - World coords (`floorTop`, `floorBottom`, `groundY`, `roadY`, `ROOMS.triggerX`)
  - All sprite/prop internal dimensions (lamp height, sign size, car body wedge, building min/max W/H, window grid, manhole, stop sign, cone, alley)
  - HUD text sizes (was 13–64px, now 7–32px) and positions
  - Cutscene panel padding, dialog box height, building x/y arrays, photo sizes
  - Moon radii, lane dash sizes, vignette band heights, particle burst speeds

**Verified working:** Menu scene renders cleanly at the new resolution. Pixel-art aesthetic landed.

**Not yet verified:** Cutscene panels (Panel 1 skyline, Panel 2 apartment/USB, Panel 3 doorway silhouette) and gameplay scene. These likely have layout quirks that need eyeballing.

**Known polish backlog (P3):**
- Title `strokeThickness: 2` reads chunky against the 32px font — drop to 1 or use a bitmap font
- Hanging-sign neon halos (2px outer) look thick at the new scale
- System Courier-New at 7–9px is fuzzy under nearest-neighbor scaling — proper 16-bit fix is a bitmap pixel font
- Cutscene Panel 2 photo sub-content (Nole silhouette, tower antenna ticks in evidence photos) was halved but specific micro-details may need re-tuning
- 16-color sub-palette restructuring (currently a flat `COLORS` blob) — proposed plan was to split into `player`, `enemyA`, `cityFar`, `cityNear`, `neon`, `street` named sub-palettes for SNES-budget feel
- Multi-frame player walk cycle (currently 1 static + 1 shoot pose)
- Chiptune-or-FM polish to `synth.ts` (currently FM-leaning synthwave — actually already close to Genesis)

---

## File layout

```
src/
├── main.ts                    # Phaser game config (pixelArt: true, 480×270)
├── config.ts                  # WIDTH/HEIGHT, COLORS palette, GAME tuning, ROOMS, CAR_PALETTE
├── audio/synth.ts             # Procedural 18-bar synthwave soundtrack (Web Audio)
├── render/props.ts            # Shared sprite renderers: drawCar, drawLamp, drawHangingSign,
│                              # drawBillboard, drawStopSign, drawCone, drawManhole, drawAlley
├── entities/
│   ├── Player.ts              # Arcade.Sprite, walk/melee/shoot state
│   └── Enemy.ts               # Arcade.Sprite, chase AI, hp/flash/iframes
├── cutscenes/
│   └── opening.ts             # 3-panel opening (OPENING_CUTSCENE config object)
└── scenes/
    ├── BootScene.ts           # Generates 5 procedural textures (player, player-shoot,
    │                          # bullet, enemy, particle), then → MenuScene
    ├── MenuScene.ts           # Title, skyline backdrop, "PRESS SPACE TO JACK IN"
    ├── CutsceneScene.ts       # Generic 3-panel cutscene player (typewriter dialog)
    └── GameScene.ts           # The main game — 3840×540 (now 1920×270) world,
                               # parallax city, 3 lock-and-clear rooms, dual camera (zoomed
                               # gameplay + 1:1 HUD overlay)
```

**No assets directory.** All visuals are `Phaser.GameObjects.Graphics.fillRect/fillCircle/etc.` calls. All audio is `OscillatorNode` + `BufferSource(whiteNoise)` + custom plate-reverb-via-feedback-delay.

---

## Rendering architecture

- **Two cameras** in GameScene: `cameras.main` is zoomed at 1.6× and follows the player; a separate HUD camera renders at 1:1 over the top. World layer / HUD layer ignore each other's camera respectively.
- **Backdrop layers** (all `setScrollFactor(0)`, redrawn each frame): sky → stars → moon → far city (parallax 0.18) → near city (parallax 0.42) → street → props → cars → foreground neon/vignette.
- **Parallax city** uses tiled "strips" (`FAR_STRIP = 1200`, `NEAR_STRIP = 1000`) — buildings generated once with seeded mulberry32 PRNG, drawn twice per frame with a wrap offset for seamless tiling.
- **Street props** (lamps, signs, billboards, cones, manholes, alleys) generated once across the full world with mulberry32 seeds; only props within `[-60, WIDTH+60]` of camera scroll are drawn each frame.
- **Particle bursts** use a single pooled emitter (`burstEmitter`) — no per-hit allocation.
- **Melee baton** is drawn once at scene-create as a single `Graphics` object, then just repositioned + flipped each frame (no per-frame redraw of graphics commands).

---

## Gameplay

| Action | Key |
| --- | --- |
| Walk (4-directional in the street) | WASD / Arrow keys |
| Shoot | Z / Click |
| Melee | X |
| Confirm on menu / advance cutscene | Space |
| Mute music | M |
| Skip cutscene | Esc |

**Phase machine** in GameScene: `roaming` → `locked` (room triggered, camera locks, wave spawns) → `cleared` (wave done, "GO →" indicator, player walks right past edge) → `roaming` next zone. After zone 3 cleared: `won`. On 4 hits taken: `gameover`.

**Player** has 4 HP (`INTEGRITY: ####`), score = max-x-reached-so-far (`SIGNAL: 1234`).

**Enemy** chases player, has 2 HP, gets knocked back on hit, has iframes after touching player.

---

## Audio

`src/audio/synth.ts` is ~490 lines. Self-contained. Singleton (`getSynth()`).

- **Progression:** 16-bar loop in C major with borrowed bVI (Ab) for "thriller" feel. C → Ab → F → G, two bars each, then climax accelerates to one chord per bar for last 4 bars.
- **Voices:** detuned saw pad, sub-bass arp (square + sub-sine), click-attack kick, white-noise hat + clap, synthetic plate reverb (parallel feedback delays + lowpass).
- **Build:** 8-phase energy ramp — bare arp + pad → hi-hat → kick → clap → open hat → 16th hats.
- **Mute toggle** is global, hot-swappable mid-playback.

Audio is **already close to Genesis FM territory** — minimal work needed for the 16-bit conversion. The 8-bit pitch would have meant gutting it; the 16-bit pitch means tweaking.

---

## Story / setting (for the cutscene panels)

**Panel 1:** Wide skyline at night. OmniCast logo neon sign on the tallest building. Voiceover:
> "The city runs on one signal."
> "OmniCast owns ninety-four percent of every screen, every speaker, every billboard."
> "Tonight, they're going for the last six."

**Panel 2:** Mira's apartment — corkboard with photos around a central pinned photo of "Nole" (the OmniCast exec, with a red circle around his head and a red X across him), red string connecting evidence photos. Dim desk + laptop in shadow. Huge glowing cyan USB drive in foreground.
> "My sister tried to tell the truth."
> "They made it look like a suicide."

**Panel 3:** Iris's silhouette in a backlit doorway. Trench coat, red sweatband (visible against backlight). USB drive on the floor at her feet.
> "I'm Iris. She was Mira."
> "I never listened when she was alive."
> "I'll listen now."

---

## How fresh-Claude should pick this up

If you're a new Claude session reading this:

1. **First** read `src/config.ts` — it's the source of truth for dimensions, colors, gameplay tuning, and room definitions.
2. **Then** `src/main.ts` and `src/scenes/BootScene.ts` — entry points.
3. **For visual work:** `src/render/props.ts` is where most of the procedural drawing lives. `src/scenes/GameScene.ts` is large (~1000 lines) but well-organized into clear regions (// --------- markers).
4. **For game state work:** the `Phase` type and `handleRoomState()` in GameScene.
5. **Don't** assume there are sprite files anywhere — there aren't. All graphics are fillRect calls.
6. **Don't** assume audio files exist — soundtrack is all OscillatorNodes in `synth.ts`.

The active work right now is **completing the 16-bit conversion** — verifying cutscene + gameplay render correctly at 480×270, then polishing (bitmap font, palette restructuring, multi-frame walk cycle).
