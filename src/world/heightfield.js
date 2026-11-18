// Pure terrain math: height and ground colour for any (x, z). No Three.js here,
// so it can be unit-tested and reused by flight collision.

import { createNoise2D, fbm, ridged } from './noise.js';
import { PALETTE, WORLD } from '../config.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createHeightfield(seed = WORLD.seed) {
  const nContinent = createNoise2D(seed);
  const nHills = createNoise2D(seed + 1);
  const nMask = createNoise2D(seed + 2);
  const nRidge = createNoise2D(seed + 3);
  const nRiver = createNoise2D(seed + 4);
  const nPatch = createNoise2D(seed + 5);

  function heightAt(x, z) {
    const base = fbm(nContinent, x / 5200, z / 5200, 3);
    const land = smoothstep(-0.12, 0.12, base);
    const hills = (fbm(nHills, x / 1300, z / 1300, 5) * 0.5 + 0.5) * 220;
    const mask = smoothstep(0.05, 0.45, fbm(nMask, x / 7000, z / 7000, 2));
    const r = ridged(nRidge, x / 2400, z / 2400, 4);
    const mountains = r * r * 1350 * mask;

    let h = land * (25 + hills + mountains) - (1 - land) * 90;

    // Rivers: narrow bands where a noise field crosses zero, faded out in the mountains.
    const river = Math.abs(fbm(nRiver, x / 3600, z / 3600, 3));
    const cut = (1 - smoothstep(0.02, 0.1, river)) * (1 - mask * 0.85);
    h = h * (1 - cut) + -30 * cut;
    return h;
  }

  /** Slope estimate (0 = flat, larger = steeper) from central differences. */
  function slopeAt(x, z, e = 12) {
    const dx = heightAt(x + e, z) - heightAt(x - e, z);
    const dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }

  /** Painterly patch value in [0, 1] used for ground blotches and tree density. */
  function patchAt(x, z) {
    return fbm(nPatch, x / 420, z / 420, 3) * 0.5 + 0.5;
  }

  return { heightAt, slopeAt, patchAt };
}

/** Pick a ground colour from height, slope and patch value. Returns a hex int. */
export function groundColor(h, slope, patch) {
  if (h < 6) return PALETTE.sand;
  if (h > 900 + patch * 200) return PALETTE.snow;
  if (slope > 1.5 || h > 700) return h > 800 ? PALETTE.rockDark : PALETTE.rock;
  if (h < 14) return PALETTE.sand;
  if (patch > 0.68) return PALETTE.olive;
  if (patch > 0.56) return PALETTE.ochre;
  if (patch < 0.3) return PALETTE.grassMid;
  return PALETTE.grassLow;
}

export function classifyGround(h) {
  if (h < WORLD.seaLevel) return 'water';
  if (h < 14) return 'beach';
  if (h > 1050) return 'snow';
  return 'land';
}
