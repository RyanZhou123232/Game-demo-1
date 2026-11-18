// Arcade flight model. Pure functions on a plain state object (no Three.js), so it
// can be unit-tested. Angles in radians. Heading 0 = north (-Z), 90deg = east (+X).

import { FLIGHT } from '../config.js';

export function createFlightState(overrides = {}) {
  return {
    x: 0, y: FLIGHT.startAltitude, z: 0,
    yaw: 0, pitch: 0, bank: 0,
    speed: FLIGHT.cruiseSpeed,
    rollT: 0, rollDir: 1, rollAngle: 0,
    verticalSpeed: 0,
    g: 1,
    ...overrides,
  };
}

export function forwardVector(s) {
  const cp = Math.cos(s.pitch);
  return { x: Math.sin(s.yaw) * cp, y: Math.sin(s.pitch), z: -Math.cos(s.yaw) * cp };
}

export function rightVector(s) {
  return { x: Math.cos(s.yaw), y: 0, z: Math.sin(s.yaw) };
}

export function headingDegrees(s) {
  const d = (s.yaw * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

/** Begin a barrel roll if one is not already in progress. dir: +1 right, -1 left. */
export function startBarrelRoll(s, dir = 1) {
  if (s.rollT > 0) return false;
  s.rollT = FLIGHT.rollDuration;
  s.rollDir = dir >= 0 ? 1 : -1;
  return true;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Advance the flight state.
 * input: { stickX, stickY in [-1, 1], boost: bool }
 * groundHeight(x, z): terrain height for collision (sea is treated as 0).
 */
export function stepFlight(s, input, dt, groundHeight = () => 0) {
  const sx = clamp(input.stickX || 0, -1, 1);
  const sy = clamp(input.stickY || 0, -1, 1);

  // Bank follows the stick; yaw rate follows the bank (coordinated turn).
  const targetBank = sx * FLIGHT.maxBank;
  s.bank += (targetBank - s.bank) * Math.min(1, FLIGHT.bankResponse * dt);
  s.yaw += Math.sin(s.bank) * FLIGHT.turnRate * dt;

  // Pitch: direct rate control with a small deadzone that slowly levels the nose.
  const prevPitch = s.pitch;
  if (Math.abs(sy) < 0.08) s.pitch *= 1 - Math.min(1, 0.35 * dt);
  else s.pitch += sy * FLIGHT.pitchRate * dt;
  s.pitch = clamp(s.pitch, -FLIGHT.maxPitch, FLIGHT.maxPitch);

  // Speed: boost raises the target, climbing bleeds speed, diving adds it.
  let target = input.boost ? FLIGHT.boostSpeed : FLIGHT.cruiseSpeed;
  target -= Math.sin(s.pitch) * 70;
  const diff = target - s.speed;
  s.speed += clamp(diff, -FLIGHT.accel * dt, FLIGHT.accel * dt);
  s.speed = Math.max(FLIGHT.minSpeed, s.speed);

  // Barrel roll: a full 360deg spin of the visual bank plus a sideways hop.
  let slip = 0;
  if (s.rollT > 0) {
    s.rollT = Math.max(0, s.rollT - dt);
    const t = 1 - s.rollT / FLIGHT.rollDuration; // 0 -> 1
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    s.rollAngle = s.rollDir * eased * Math.PI * 2;
    slip = s.rollDir * FLIGHT.rollSideSlip * Math.sin(Math.PI * t);
    if (s.rollT === 0) s.rollAngle = 0;
  }

  const f = forwardVector(s);
  const r = rightVector(s);
  const prevY = s.y;
  s.x += (f.x * s.speed + r.x * slip) * dt;
  s.y += f.y * s.speed * dt;
  s.z += (f.z * s.speed + r.z * slip) * dt;

  // Keep a safe distance above the ground / sea; nudge the nose up if too low.
  const ground = Math.max(0, groundHeight(s.x, s.z));
  const floor = ground + FLIGHT.minClearance;
  if (s.y < floor) {
    s.y = floor;
    if (s.pitch < 0.08) s.pitch = 0.08;
  }
  s.y = Math.min(s.y, 5000);

  s.verticalSpeed = dt > 0 ? (s.y - prevY) / dt : 0;
  const pitchRate = dt > 0 ? (s.pitch - prevPitch) / dt : 0;
  s.g = 1 / Math.max(0.25, Math.cos(s.bank)) + Math.max(0, pitchRate) * s.speed / 9.81 * 0.15;
  return s;
}
