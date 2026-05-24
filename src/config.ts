export const WIDTH = 960;
export const HEIGHT = 540;

export const COLORS = {
  // Sky
  bgDeep: 0x05000d,
  skyTop: 0x1a0a40,
  skyMid: 0x2a1466,
  skyHorizon: 0x4b1488,
  star: 0xffffff,
  moon: 0xfaf5ff,
  moonHalo: 0xc0a8ff,

  // City buildings (cycled per building)
  bldgFarA: 0x1b1140,
  bldgFarB: 0x2a1660,
  bldgFarC: 0x3a1a78,
  bldgNearA: 0x4b1d96,
  bldgNearB: 0x6722b3,
  bldgNearC: 0x9c2bbf,
  bldgNearD: 0x2563d6,

  // Window glows
  windowWarm: 0xffd166,
  windowPink: 0xff5cb3,
  windowCyan: 0x6ee7ff,
  windowWhite: 0xffffff,

  // Street
  street: 0x0a0414,
  streetEdge: 0x1d0938,
  curbNeon: 0xff2d95,
  lane: 0xffd166,

  // Foreground neon
  gridPink: 0xff2d95,
  gridCyan: 0x00f6ff,

  // Actors
  player: 0x00f6ff,
  playerTrail: 0x8a2be2,
  bullet: 0xffffff,
  enemy: 0xff2d95,
  enemyCore: 0xffffff,
  text: 0x00f6ff,
  melee: 0xffd166,
};

export const HEX = {
  gridPink: '#ff2d95',
  gridCyan: '#00f6ff',
  text: '#00f6ff',
  textShadow: '#ff2d95',
  melee: '#ffd166',
};

export const GAME = {
  walkSpeed: 220,
  bulletSpeed: 720,
  shootCooldown: 220,
  meleeCooldown: 360,
  meleeDuration: 140,
  meleeReach: 46,
  meleeDamage: 2,
  bulletDamage: 1,
  enemyHp: 2,
  enemySpeed: 85,
  // World/camera
  worldWidth: 3840, // 4 screens wide
  // Playable "floor" Y band — the player walks IN the street.
  floorTop: 425,
  floorBottom: 520,
  // Visual back curb where the sidewalk meets the street.
  groundY: 360,
  // Where parked cars sit, tucked tight against the back curb.
  roadY: 380,
  // Car traffic
  carSpawnMin: 900,
  carSpawnMax: 2200,
  carSpeedMin: 110,
  carSpeedMax: 220,
};

export const CAR_PALETTE: Array<{ body: number; window: number; glow: number; light: number }> = [
  { body: 0xb6b8d0, window: 0x1a0a40, glow: 0x00f6ff, light: 0xff2d95 }, // chrome DeLorean
  { body: 0xff2d95, window: 0x1a0a40, glow: 0xff5cb3, light: 0xffd166 }, // pink
  { body: 0x6ee7ff, window: 0x1a0a40, glow: 0x00f6ff, light: 0xffd166 }, // cyan
  { body: 0xffd166, window: 0x1a0a40, glow: 0xff5cb3, light: 0xff2d95 }, // gold
  { body: 0x4b1d96, window: 0x1a0a40, glow: 0xff2d95, light: 0x00f6ff }, // purple
];

// Each room defines a camera-lock zone the player enters and an enemy wave.
export interface RoomDef {
  triggerX: number; // when camera scrollX reaches this, lock the room
  cameraLockX: number; // camera scrollX value during the lock
  enemyCount: number;
}

export const ROOMS: RoomDef[] = [
  { triggerX: 480,  cameraLockX: 480,  enemyCount: 3 },
  { triggerX: 1440, cameraLockX: 1440, enemyCount: 4 },
  { triggerX: 2400, cameraLockX: 2400, enemyCount: 5 },
];

// World is `worldWidth` wide but the camera can scroll up to (worldWidth - WIDTH).
export const MAX_CAMERA_X = GAME.worldWidth - WIDTH;
