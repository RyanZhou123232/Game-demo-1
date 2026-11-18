import { describe, it, expect } from 'vitest';
import { formatCameraTag, formatHeadingSpeed } from '../src/ui/Hud.js';
import { nextMode } from '../src/core/CameraRig.js';
import { shape } from '../src/core/Input.js';
import { CAMERA_MODES } from '../src/config.js';

describe('HUD text', () => {
  it('formats the camera tag like the original ("01 / CHASE")', () => {
    expect(formatCameraTag(0)).toBe('01 / CHASE');
    expect(formatCameraTag(2)).toBe('03 / OVERHEAD');
  });

  it('formats heading and speed in knots', () => {
    expect(formatHeadingSpeed(7.4, 210)).toBe('007°  408 KT');
    expect(formatHeadingSpeed(359.9, 0)).toBe('000°  0 KT');
  });
});

describe('camera modes', () => {
  it('cycles through every mode and wraps around', () => {
    let i = 0;
    const seen = [];
    for (let k = 0; k < CAMERA_MODES.length; k++) {
      seen.push(CAMERA_MODES[i]);
      i = nextMode(i);
    }
    expect(seen).toEqual(['CHASE', 'COCKPIT', 'OVERHEAD']);
    expect(i).toBe(0);
  });
});

describe('mouse stick shaping', () => {
  it('has a deadzone, keeps sign and saturates at 1', () => {
    expect(shape(0.02)).toBe(0);
    expect(shape(0.5)).toBeGreaterThan(0);
    expect(shape(-0.5)).toBeLessThan(0);
    expect(shape(1)).toBe(1);
  });
});
