import { describe, it, expect } from 'vitest';
import { artResolution } from '../src/render/PixelPass.js';

describe('art resolution', () => {
  it('uses whole device pixels per art pixel on a normal screen', () => {
    expect(artResolution(1920, 1058, 1, 3)).toEqual({ block: 3, w: 640, h: 353 });
  });

  it('keeps art pixels crisp on a 150% scaled screen (block is an integer)', () => {
    const r = artResolution(1680, 1000, 1.5, 3);
    expect(Number.isInteger(r.block)).toBe(true);
    expect(r.block).toBe(5); // round(3 * 1.5) = 4.5 -> 5
    expect(r.w).toBe(504);
  });

  it('never returns zero size', () => {
    expect(artResolution(0, 0, 1, 3)).toEqual({ block: 3, w: 1, h: 1 });
  });
});
