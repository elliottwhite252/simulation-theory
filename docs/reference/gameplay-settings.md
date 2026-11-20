# Gameplay settings

These values control how Simulation Theory plays. Unless noted, they're in the `GAME` object in `src/config.ts`.

Units:

- **Speeds** are in pixels per second, at the game's internal resolution of 480 × 270.
- **Times** are in milliseconds.
- **Positions** are in pixels from the left or top of the level.

## Player

| Setting | Default | Description |
| --- | --- | --- |
| `walkSpeed` | 110 | How fast Iris walks. |
| `bulletSpeed` | 360 | How fast a shot travels. |
| `shootCooldown` | 220 | Minimum time between shots. |
| `bulletDamage` | 1 | Damage per shot. |
| `meleeCooldown` | 360 | Minimum time between melee attacks. |
| `meleeDuration` | 140 | How long a melee attack can land a hit. |
| `meleeReach` | 23 | How far a melee attack reaches. |
| `meleeDamage` | 2 | Damage per melee hit. |
| Integrity (health) | 4 | Hits Iris can take. Set in `src/scenes/GameScene.ts`, not `config.ts`. |

## Enemies

| Setting | Default | Description |
| --- | --- | --- |
| `enemyHp` | 2 | Hit points for a regular enemy. |
| `enemySpeed` | 43 | How fast enemies chase Iris. |

## Boss (Broadcast Van)

Set in `src/entities/BroadcastVan.ts`.

| Setting | Default | Description |
| --- | --- | --- |
| `MAX_HP` | 30 | Boss hit points. |
| `PHASE_2_HP` | 15 | At or below this, the boss attacks twice as often. |
| Facing check | 1,500 ms | How often the boss turns toward Iris. |
| Wave interval | 3,000 / 1,500 ms | Time between broadcast waves in phase 1 and phase 2. |

## Level and camera

| Setting | Default | Description |
| --- | --- | --- |
| `worldWidth` | 1,920 | Level width, equal to four screens. |
| `floorTop` | 213 | Top edge of the walkable street. |
| `floorBottom` | 260 | Bottom edge of the walkable street. |
| `groundY` | 180 | Where the sidewalk meets the street. Visual only. |
| `roadY` | 190 | Where parked cars sit. Visual only. |
| `MAX_CAMERA_X` | 1,440 | Furthest the camera can scroll. Calculated as `worldWidth` minus the screen width. |

## Background traffic

Cars that drive past in the background. Visual only, and they don't hurt the player.

| Setting | Default | Description |
| --- | --- | --- |
| `carSpawnMin` | 900 | Shortest time between cars. |
| `carSpawnMax` | 2,200 | Longest time between cars. |
| `carSpeedMin` | 55 | Slowest car speed. |
| `carSpeedMax` | 110 | Fastest car speed. |

## Rooms

See the field reference in [Add a room](../how-to/add-a-room.md#field-reference).
