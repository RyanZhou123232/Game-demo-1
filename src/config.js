// Central tuning values and the colour palette. Units: 1 world unit = 1 metre.

export const PALETTE = {
  skyTop: 0x8f7fa6,
  skyHorizon: 0xd9a8a6,
  fog: 0xb99aac,
  sun: 0xffd9b0,
  hemiSky: 0xc9b2d6,
  hemiGround: 0x6b4a3a,

  waterDeep: 0x2f6f86,
  waterShallow: 0x4f99a6,
  foam: 0xe9f1e6,

  sand: 0xe3c79a,
  grassLow: 0xc0703f,
  grassMid: 0xa65a35,
  ochre: 0xd99a4a,
  olive: 0x9a8a5a,
  rock: 0x9a7f86,
  rockDark: 0x8a7c96,
  snow: 0xf1ead8,

  treeA: 0x3e3a3a,
  treeB: 0xd97a3a,
  cloud: 0xf3dcc0,
  cloudShade: 0xe0bfa6,
  smoke: 0xa49ea3,

  jetBody: 0x6f7f9a,
  jetBodyDark: 0x4a5670,
  jetAccent: 0xe0a64a,
  jetCanopy: 0xf2c25a,
  enemyBody: 0x3b3640,
  enemyAccent: 0x8a4a3a,
  flame: 0xff8a3a,
};

export const WORLD = {
  chunkSize: 1600,
  chunkSegments: 56,
  chunkRadius: 3, // chunks in each direction from the player's chunk
  seed: 1337,
  seaLevel: 0,
  cloudAltitude: 700,
  fogNear: 1500,
  fogFar: 7600,
};

export const FLIGHT = {
  cruiseSpeed: 210, // m/s (~410 kt)
  boostSpeed: 380,
  minSpeed: 140,
  accel: 90, // m/s^2 toward target speed
  maxBank: (75 * Math.PI) / 180,
  bankResponse: 3.2, // 1/s, how fast bank follows the mouse
  turnRate: 0.85, // rad/s of yaw at full bank
  pitchRate: 1.0, // rad/s at full stick
  maxPitch: (70 * Math.PI) / 180,
  minClearance: 35, // metres above terrain
  rollDuration: 0.85, // seconds for a full barrel roll
  rollSideSlip: 40, // m/s sideways push during a roll
  startAltitude: 650,
};

export const COMBAT = {
  enemyCount: 4,
  enemySpeed: 150,
  missileSpeed: 620,
  missileTurnRate: 2.6,
  missileLife: 6,
  missileHitRadius: 30,
  lockRange: 5000,
  lockConeDeg: 50,
  maxMissiles: 4,
  missileReload: 2.5, // seconds per missile regained
  respawnDelay: 6, // seconds after all enemies down
};

export const RENDER = {
  pixelScale: 3, // render at 1/pixelScale resolution, then upscale
  colorLevels: 22, // colour steps per channel (fewer = more posterised)
  ditherStrength: 0.45, // 0 = no dither pattern, 1 = strong cross-hatch
};

export const CAMERA_MODES = ['CHASE', 'COCKPIT', 'OVERHEAD'];

export const MS_TO_KT = 1.943844;
export const M_TO_FT = 3.28084;
