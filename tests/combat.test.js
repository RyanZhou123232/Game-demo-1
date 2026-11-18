import { describe, it, expect } from 'vitest';
import {
  findLockTarget, steerToward, createMagazine, tickMagazine, useMissile,
} from '../src/entities/combat.js';

const origin = { x: 0, y: 0, z: 0 };
const forward = { x: 0, y: 0, z: -1 };
const enemy = (x, y, z, alive = true) => ({ pos: { x, y, z }, alive });

describe('missile lock', () => {
  it('locks the enemy closest to the aim direction', () => {
    const centred = enemy(50, 0, -2000);
    const offside = enemy(800, 0, -1500);
    expect(findLockTarget(origin, forward, [offside, centred], 5000, 50)).toBe(centred);
  });

  it('ignores enemies behind, out of range or dead', () => {
    const behind = enemy(0, 0, 1000);
    const far = enemy(0, 0, -9000);
    const dead = enemy(0, 0, -1000, false);
    expect(findLockTarget(origin, forward, [behind, far, dead], 5000, 50)).toBeNull();
  });
});

describe('steerToward', () => {
  it('turns by at most maxAngle per step', () => {
    const d = steerToward({ x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: 0 }, 0.1);
    const angle = Math.acos(-d.z);
    expect(angle).toBeCloseTo(0.1, 6);
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 9);
  });

  it('snaps to the target when within maxAngle', () => {
    const d = steerToward({ x: 0, y: 0, z: -1 }, { x: 0.01, y: 0, z: -1 }, 0.5);
    expect(d.x).toBeGreaterThan(0);
  });
});

describe('magazine', () => {
  it('spends missiles and reloads over time', () => {
    const mag = createMagazine(2, 1);
    expect(useMissile(mag)).toBe(true);
    expect(useMissile(mag)).toBe(true);
    expect(useMissile(mag)).toBe(false);
    tickMagazine(mag, 1.5);
    expect(mag.count).toBe(1);
    tickMagazine(mag, 5);
    expect(mag.count).toBe(2);
  });
});
