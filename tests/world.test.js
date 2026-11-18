import { describe, it, expect } from 'vitest';
import { createNoise2D, fbm, mulberry32 } from '../src/world/noise.js';
import { createHeightfield, groundColor, classifyGround } from '../src/world/heightfield.js';
import { wrap } from '../src/world/Clouds.js';
import { PALETTE } from '../src/config.js';

describe('noise', () => {
  it('is deterministic for the same seed', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(42);
    for (let i = 0; i < 50; i++) expect(a(i * 0.37, i * 1.13)).toBe(b(i * 0.37, i * 1.13));
  });

  it('differs between seeds', () => {
    const a = createNoise2D(1);
    const b = createNoise2D(2);
    let diff = 0;
    for (let i = 0; i < 50; i++) diff += Math.abs(a(i * 0.5, i * 0.7) - b(i * 0.5, i * 0.7));
    expect(diff).toBeGreaterThan(1);
  });

  it('stays within [-1, 1]', () => {
    const n = createNoise2D(7);
    const rand = mulberry32(3);
    for (let i = 0; i < 5000; i++) {
      const v = fbm(n, rand() * 1000, rand() * 1000, 5);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('heightfield', () => {
  const field = createHeightfield(1337);

  it('produces both sea and land around the start area', () => {
    const kinds = new Set();
    for (let x = -8000; x <= 8000; x += 400) {
      for (let z = -8000; z <= 8000; z += 400) kinds.add(classifyGround(field.heightAt(x, z)));
    }
    expect(kinds.has('water')).toBe(true);
    expect(kinds.has('land')).toBe(true);
  });

  it('is deterministic', () => {
    const other = createHeightfield(1337);
    expect(other.heightAt(123, -456)).toBe(field.heightAt(123, -456));
  });

  it('colours low ground as sand and high ground as snow', () => {
    expect(groundColor(2, 0.1, 0.5)).toBe(PALETTE.sand);
    expect(groundColor(1500, 0.3, 0.5)).toBe(PALETTE.snow);
  });
});

describe('cloud wrapping', () => {
  it('wraps values into [-size/2, size/2)', () => {
    expect(wrap(0, 100)).toBe(0);
    expect(wrap(60, 100)).toBe(-40);
    expect(wrap(-60, 100)).toBe(40);
    expect(wrap(250, 100)).toBe(-50);
  });
});
