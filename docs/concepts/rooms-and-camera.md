# Rooms and the camera

Simulation Theory uses a **lock-and-clear** structure, borrowed from arcade beat-em-ups like *Turtles in Time* and *Streets of Rage 2*. The level is one long street. At set points the camera stops scrolling, enemies appear, and the player can't move forward until every enemy is defeated.

This page explains how that works and why it's designed this way.

## Why lock the camera?

In a free-scrolling game, a player can run past enemies. Locking the camera turns each encounter into a contained arena. The player has to fight, enemies can't escape off-screen, and the designer controls the pacing: fight, walk, fight, boss.

## The three states

The game is always in one of three states:

| State | What the camera does | What the player can do |
| --- | --- | --- |
| **Roaming** | Follows the player | Walk freely toward the next room |
| **Locked** | Holds still on the room | Fight. The player can't leave the screen. |
| **Cleared** | Still holds, and shows a **GO** sign | Walk to the right edge to continue |

The cycle looks like this:

1. **Roaming.** The camera follows Iris as she walks right.
2. **Locked.** When the camera reaches a room's `triggerX`, it stops following, slides to the room's `cameraLockX`, and the room's enemies spawn.
3. **Cleared.** When every enemy is defeated, and none are still waiting to spawn, the **GO** sign appears.
4. **Roaming again.** When Iris walks to the right edge of the screen, the camera starts following her again and the next room becomes active.

After the last room, walking to the right end of the level wins the game.

## Two cameras

The game uses two cameras at once:

- **The main camera** is zoomed in on the street and handles the follow-and-lock behavior.
- **The HUD camera** draws at normal scale on top. It shows the room label, Iris's integrity (health), and the boss health bar.

Keeping them separate means the HUD stays fixed and readable while the main camera moves and shakes.

## Where this lives in the code

- Room positions and enemy counts: `ROOMS` in `src/config.ts`
- State changes: `handleRoomState()`, `lockRoom()`, and `clearRoom()` in `src/scenes/GameScene.ts`

## Related

- [Add a room](../how-to/add-a-room.md)
- [The boss fight](boss-fight.md)
