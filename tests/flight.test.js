import { describe, it, expect } from 'vitest';
import {
  createFlightState, stepFlight, startBarrelRoll, headingDegrees, forwardVector,
} from '../src/entities/flight.js';
import { FLIGHT } from '../src/config.js';

const fly = (s, input, seconds, ground) => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) stepFlight(s, input, dt, ground);
  return s;
};

describe('flight model', () => {
  it('holds cruise speed and heading with a centred stick', () => {
    const s = fly(createFlightState(), { stickX: 0, stickY: 0, boost: false }, 3);
    expect(s.speed).toBeCloseTo(FLIGHT.cruiseSpeed, 0);
    expect(headingDegrees(s)).toBeCloseTo(0, 3);
    expect(s.z).toBeLessThan(0); // heading 0 = north = -Z
  });

  it('boost accelerates toward boost speed', () => {
    const s = fly(createFlightState(), { stickX: 0, stickY: 0, boost: true }, 4);
    expect(s.speed).toBeGreaterThan(FLIGHT.cruiseSpeed + 100);
  });

  it('stick right banks right and turns the heading clockwise', () => {
    const s = fly(createFlightState(), { stickX: 1, stickY: 0, boost: false }, 2);
    expect(s.bank).toBeGreaterThan(0.5);
    const h = headingDegrees(s);
    expect(h).toBeGreaterThan(20);
    expect(h).toBeLessThan(180);
  });

  it('stick up pitches up and climbs, clamped at max pitch', () => {
    const s = createFlightState();
    const y0 = s.y;
    fly(s, { stickX: 0, stickY: 1, boost: false }, 3);
    expect(s.y).toBeGreaterThan(y0);
    expect(s.pitch).toBeLessThanOrEqual(FLIGHT.maxPitch + 1e-9);
  });

  it('a barrel roll spins a full turn, then resets', () => {
    const s = createFlightState();
    expect(startBarrelRoll(s, 1)).toBe(true);
    expect(startBarrelRoll(s, 1)).toBe(false); // already rolling
    let maxAngle = 0;
    const dt = 1 / 60;
    for (let t = 0; t < FLIGHT.rollDuration + 0.1; t += dt) {
      stepFlight(s, { stickX: 0, stickY: 0 }, dt);
      maxAngle = Math.max(maxAngle, s.rollAngle);
    }
    expect(maxAngle).toBeGreaterThan(Math.PI * 1.8);
    expect(s.rollT).toBe(0);
    expect(s.rollAngle).toBe(0);
  });

  it('never flies below the terrain clearance', () => {
    const s = createFlightState({ y: 300 });
    const ground = () => 280;
    fly(s, { stickX: 0, stickY: -1, boost: false }, 3, ground);
    expect(s.y).toBeGreaterThanOrEqual(280 + FLIGHT.minClearance - 1e-6);
  });

  it('forward vector is unit length', () => {
    const s = createFlightState({ yaw: 1.2, pitch: 0.4 });
    const f = forwardVector(s);
    expect(Math.hypot(f.x, f.y, f.z)).toBeCloseTo(1, 9);
  });
});
