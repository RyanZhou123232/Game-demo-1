// Pure combat helpers (plain {x,y,z} vectors, no Three.js) — unit-tested.

const len = (v) => Math.hypot(v.x, v.y, v.z);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (v) => {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

/**
 * Choose the enemy closest to the aim direction, inside range and a cone.
 * Returns the enemy object or null. Enemies need { pos: {x,y,z}, alive }.
 */
export function findLockTarget(origin, forward, enemies, range, coneDeg) {
  const cosCone = Math.cos((coneDeg * Math.PI) / 180);
  const f = norm(forward);
  let best = null;
  let bestScore = -Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const to = sub(e.pos, origin);
    const d = len(to);
    if (d > range || d < 1) continue;
    const c = dot(norm(to), f);
    if (c < cosCone) continue;
    const score = c - d / range * 0.3; // prefer centred, then closer
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/**
 * Rotate unit vector `dir` toward unit vector `desired` by at most maxAngle radians.
 * Returns a new unit vector.
 */
export function steerToward(dir, desired, maxAngle) {
  const a = norm(dir);
  const b = norm(desired);
  const c = Math.min(1, Math.max(-1, dot(a, b)));
  const angle = Math.acos(c);
  if (angle <= maxAngle || angle < 1e-6) return b;
  const t = maxAngle / angle;
  // spherical interpolation
  const s = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / s;
  const wb = Math.sin(t * angle) / s;
  return norm({ x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb });
}

export function distance(a, b) {
  return len(sub(a, b));
}

/** Simple missile magazine that refills over time. */
export function createMagazine(max, reload) {
  return { count: max, max, reload, timer: 0 };
}

export function tickMagazine(mag, dt) {
  if (mag.count >= mag.max) {
    mag.timer = 0;
    return mag;
  }
  mag.timer += dt;
  while (mag.timer >= mag.reload && mag.count < mag.max) {
    mag.timer -= mag.reload;
    mag.count++;
  }
  return mag;
}

export function useMissile(mag) {
  if (mag.count <= 0) return false;
  mag.count--;
  return true;
}
