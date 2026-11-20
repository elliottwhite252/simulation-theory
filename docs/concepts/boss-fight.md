# The boss fight

The level ends with a fight against the **Broadcast Van**, OmniCast's armored broadcast truck. Regular enemies just chase the player. The van is built to make the player think about positioning.

## How to beat it

The van is shielded everywhere except the back. Hits to its front or sides flash **cyan** and do no damage. Hits from behind flash **pink** and count.

The van doesn't move much. Instead, it turns to face Iris every 1.5 seconds. That pause is your window: get behind it, attack, and move again before it turns.

Melee does twice the damage of a shot, so getting close is the fastest way to win. It's also the riskiest.

## The two phases

The van has 30 hit points.

| Phase | When | Broadcast wave attack |
| --- | --- | --- |
| 1 | 30 to 16 HP | Every 3 seconds |
| 2 | 15 HP and below | Every 1.5 seconds |

A broadcast wave is a projectile. If it hits Iris, she loses 1 point of integrity, the same as touching an enemy. Iris has 4 points, so the fourth hit ends the game.

## Design notes

- **Why only from behind?** A boss that just has more hit points is a longer version of the same fight. A weak point makes the player move, read the van's facing, and time their attacks.
- **Why turn every 1.5 seconds instead of constantly?** Turning instantly would make the back impossible to reach. The delay gives a readable rhythm the player can learn.
- **Why speed up in phase 2?** It raises the pressure as the fight nears the end, without adding a new attack the player has never seen.

## Where this lives in the code

- Boss behavior: `src/entities/BroadcastVan.ts`
- Wave spawning and the health bar: `src/scenes/GameScene.ts`

## Related

- [Rooms and the camera](rooms-and-camera.md)
- [Gameplay settings](../reference/gameplay-settings.md)
