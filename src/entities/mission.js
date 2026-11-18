// Mission rules: health, damage, crashes, kills, waves and difficulty.
// Pure logic (no Three.js / DOM) so every rule can be unit-tested.

import { COMBAT, THREAT } from '../config.js';

export function createMission() {
  return {
    phase: 'playing', // 'playing' | 'dead' | 'complete'
    health: THREAT.maxHealth,
    wave: 1,
    kills: 0,
    cause: '', // what ended the run: 'MISSILE' | 'TERRAIN'
    grace: THREAT.spawnGrace, // seconds before enemies may fire
    sinceDamage: 0,
  };
}

/** Per-wave difficulty: each wave is a bit faster and more aggressive. */
export function waveDifficulty(wave) {
  const w = Math.max(0, wave - 1);
  return {
    enemySpeed: Math.min(230, COMBAT.enemySpeed + 15 * w),
    fireCooldown: Math.max(3, THREAT.fireCooldown - 0.8 * w),
    missileSpeed: Math.min(600, THREAT.missileSpeed + 20 * w),
    missileTurnRate: Math.min(2.2, THREAT.missileTurnRate + 0.15 * w),
    maxEnemyMissiles: Math.min(4, THREAT.maxEnemyMissiles + Math.floor(w / 2)),
  };
}

export function tickMission(m, dt) {
  if (m.grace > 0) m.grace = Math.max(0, m.grace - dt);
  if (m.phase !== 'playing') return m;
  m.sinceDamage += dt;
  if (m.sinceDamage > THREAT.regenDelay && m.health < THREAT.maxHealth) {
    m.health = Math.min(THREAT.maxHealth, m.health + THREAT.regenRate * dt);
  }
  return m;
}

/** Apply damage. Returns true if this hit destroyed the player. */
export function applyDamage(m, amount, cause = 'MISSILE') {
  if (m.phase !== 'playing') return false;
  m.health = Math.max(0, m.health - amount);
  m.sinceDamage = 0;
  if (m.health <= 0) {
    m.phase = 'dead';
    m.cause = cause;
    return true;
  }
  return false;
}

export function crash(m) {
  if (m.phase !== 'playing') return false;
  m.health = 0;
  m.phase = 'dead';
  m.cause = 'TERRAIN';
  return true;
}

/** Count a kill. Returns true when the whole wave is down. */
export function registerKill(m, enemyCount = COMBAT.enemyCount) {
  if (m.phase === 'dead') return false;
  m.kills += 1;
  if (m.kills >= enemyCount && m.phase === 'playing') {
    m.phase = 'complete';
    return true;
  }
  return false;
}

export function nextWave(m) {
  m.wave += 1;
  m.kills = 0;
  m.phase = 'playing';
  m.grace = THREAT.spawnGrace;
  return m;
}

export function restartMission(m) {
  Object.assign(m, createMission());
  return m;
}

/** Ground proximity warning. altitude = metres above ground/sea. */
export function groundWarning(altitude, verticalSpeed) {
  if (altitude < 60) return true;
  if (altitude < 220 && verticalSpeed < -12) return true;
  // time to impact under 4 seconds
  return verticalSpeed < 0 && altitude / -verticalSpeed < 4;
}

/** True if the player's altitude counts as hitting the ground. */
export function isCrash(altitude) {
  return altitude < THREAT.crashAltitude;
}

/**
 * Does a barrel roll shake off a missile? Only works when the missile is close
 * (a last-second dodge), and not every time. rand: () => [0, 1).
 */
export function rollBreaksLock(distance, rand = Math.random) {
  if (distance > THREAT.evadeRange) return false;
  return rand() < THREAT.evadeChance;
}

/** Should an enemy fire at the player now? Vectors are plain {x, y, z}. */
export function shouldEnemyFire(enemyPos, enemyForward, playerPos, opts) {
  const { cooldownReady, missilesInFlight, maxMissiles, grace } = opts;
  if (!cooldownReady || grace > 0 || missilesInFlight >= maxMissiles) return false;
  const dx = playerPos.x - enemyPos.x;
  const dy = playerPos.y - enemyPos.y;
  const dz = playerPos.z - enemyPos.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > THREAT.fireRange || dist < 300) return false;
  const fl = Math.hypot(enemyForward.x, enemyForward.y, enemyForward.z) || 1;
  const cos = (dx * enemyForward.x + dy * enemyForward.y + dz * enemyForward.z) / (dist * fl);
  return cos > Math.cos((THREAT.fireConeDeg * Math.PI) / 180);
}
