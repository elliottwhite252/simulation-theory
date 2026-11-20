# Tune the difficulty

This guide shows you how to make Simulation Theory easier or harder by changing a few values in one file. You don't need to change any game logic.

**Time:** about 5 minutes
**You'll need:** the game running locally. See the [Quickstart](../quickstart.md).

## How it works

Most gameplay values live in the `GAME` object in `src/config.ts`. The game reads them when a scene starts, so a change takes effect as soon as the page reloads. While `npm run dev` is running, Vite reloads the page for you each time you save.

## Make the game easier

1. Open `src/config.ts`.
2. Find the `GAME` object and change one or more of these values:

    ```ts
    export const GAME = {
      walkSpeed: 130,      // default 110 — Iris moves faster
      shootCooldown: 150,  // default 220 — fire more often
      meleeReach: 30,      // default 23 — melee hits from farther away
      enemySpeed: 35,      // default 43 — enemies close in more slowly
      // ...leave the other values as they are
    };
    ```

3. Save the file. The browser reloads.
4. Play the first room to check the change.

## Make the game harder

Change the values the other way. For example:

```ts
enemyHp: 3,        // default 2 — enemies take more hits
enemySpeed: 55,    // default 43 — enemies chase faster
bulletDamage: 1,   // keep at 1 so shots stay weaker than melee
```

To add more enemies to a room, change `enemyCount` in the `ROOMS` list. See [Add a room](add-a-room.md).

## Tips

- **Change one value at a time.** It's easier to tell which change made the difference.
- **Keep melee stronger than shooting.** Melee is riskier because you have to get close, so it should pay off. By default, `meleeDamage` is 2 and `bulletDamage` is 1.
- **Watch the timing values.** Values ending in `Cooldown` or `Duration` are in milliseconds. Speeds are in pixels per second at the game's 480 × 270 resolution.

!!! note
    Player health isn't in `config.ts` yet. Iris starts with 4 points of integrity, set in `src/scenes/GameScene.ts`.

## Related

- [Gameplay settings](../reference/gameplay-settings.md): every value and its default
