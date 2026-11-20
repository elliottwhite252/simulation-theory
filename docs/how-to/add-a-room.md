# Add a room

This guide shows you how to add an enemy encounter to the level. A room is a stretch of street where the camera locks and the player has to defeat every enemy before moving on.

**Time:** about 10 minutes
**You'll need:** the game running locally, and a basic understanding of [rooms and the camera](../concepts/rooms-and-camera.md).

## Step 1: Pick a position

Rooms are listed in order in the `ROOMS` array in `src/config.ts`:

```ts
export const ROOMS: RoomDef[] = [
  { triggerX: 240,  cameraLockX: 240,  enemyCount: 3 },
  { triggerX: 720,  cameraLockX: 720,  enemyCount: 4 },
  { triggerX: 1200, cameraLockX: 1200, enemyCount: 1, bossType: 'broadcastVan' },
];
```

`triggerX` is how far the camera has scrolled, in pixels, when the room locks. The level is 1,920 pixels wide, and the camera can scroll to a maximum of 1,440.

Space rooms at least one screen width (480 pixels) apart, so the player has room to walk between fights. In this example, you'll add a room at 960. That puts it between the second room and the boss.

## Step 2: Add the room

Insert a new entry in position order:

```ts
export const ROOMS: RoomDef[] = [
  { triggerX: 240,  cameraLockX: 240,  enemyCount: 3 },
  { triggerX: 720,  cameraLockX: 720,  enemyCount: 4 },
  { triggerX: 960,  cameraLockX: 960,  enemyCount: 5 },  // new room
  { triggerX: 1200, cameraLockX: 1200, enemyCount: 1, bossType: 'broadcastVan' },
];
```

!!! warning
    Keep the array sorted by `triggerX`. The game works through rooms in array order, so a room listed out of order won't trigger when you expect.

## Step 3: Test the room

1. Save `config.ts`. The browser reloads.
2. Play through the first two rooms.
3. Walk right. When the camera reaches 960, it should lock, and five enemies should appear.

If the new room locks right after the previous one with no walking in between, the two are too close together. Increase the new room's `triggerX`, or move the boss room further right.

## Field reference

| Field | Type | Description |
| --- | --- | --- |
| `triggerX` | number | Camera scroll position, in pixels, that locks the room. |
| `cameraLockX` | number | Where the camera holds while the room is locked. Usually the same as `triggerX`. |
| `enemyCount` | number | How many enemies spawn. Ignored when `bossType` is set. |
| `bossType` | `'broadcastVan'` (optional) | Spawns a boss instead of a wave. Only one boss type exists. |
