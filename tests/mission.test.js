import { describe, it, expect } from 'vitest';
import {
  createMission, applyDamage, crash, registerKill, nextWave, restartMission, tickMission,
  waveDifficulty, groundWarning, isCrash, rollBreaksLock, shouldEnemyFire,
} from '../src/entities/mission.js';
import { THREAT, COMBAT } from '../src/config.js';

describe('health and damage', () => {
  it('three missile hits shoot the player down', () => {
    const m = createMission();
    expect(applyDamage(m, THREAT.missileDamage)).toBe(false);
    expect(applyDamage(m, THREAT.missileDamage)).toBe(false);
    expect(applyDamage(m, THREAT.missileDamage)).toBe(true);
    expect(m.phase).toBe('dead');
    expect(m.cause).toBe('MISSILE');
  });

  it('ignores damage once dead', () => {
    const m = createMission();
    crash(m);
    expect(applyDamage(m, 10)).toBe(false);
    expect(m.cause).toBe('TERRAIN');
  });

  it('regenerates only after a quiet period', () => {
    const m = createMission();
    applyDamage(m, 50);
    tickMission(m, THREAT.regenDelay - 1);
    expect(m.health).toBe(50);
    tickMission(m, 2);
    expect(m.health).toBeGreaterThan(50);
    tickMission(m, 1000);
    expect(m.health).toBe(THREAT.maxHealth);
  });
});

describe('waves', () => {
  it('completes the wave on the last kill and moves on', () => {
    const m = createMission();
    for (let i = 0; i < COMBAT.enemyCount - 1; i++) expect(registerKill(m)).toBe(false);
    expect(registerKill(m)).toBe(true);
    expect(m.phase).toBe('complete');
    nextWave(m);
    expect(m).toMatchObject({ wave: 2, kills: 0, phase: 'playing' });
    expect(m.grace).toBe(THREAT.spawnGrace);
  });

  it('restart resets everything', () => {
    const m = createMission();
    nextWave(m);
    applyDamage(m, 200);
    restartMission(m);
    expect(m).toMatchObject({ wave: 1, kills: 0, phase: 'playing', health: THREAT.maxHealth });
  });

  it('later waves are harder but capped', () => {
    const w1 = waveDifficulty(1);
    const w3 = waveDifficulty(3);
    expect(w3.enemySpeed).toBeGreaterThan(w1.enemySpeed);
    expect(w3.fireCooldown).toBeLessThan(w1.fireCooldown);
    expect(waveDifficulty(99).fireCooldown).toBeGreaterThanOrEqual(3);
    expect(waveDifficulty(99).missileTurnRate).toBeLessThanOrEqual(2.2);
  });
});

describe('ground', () => {
  it('warns when low or sinking fast, not when cruising high', () => {
    expect(groundWarning(40, 0)).toBe(true);
    expect(groundWarning(180, -30)).toBe(true);
    expect(groundWarning(800, -250)).toBe(true); // ~3 s to impact
    expect(groundWarning(600, 0)).toBe(false);
    expect(groundWarning(600, -20)).toBe(false);
  });

  it('crashes below the crash altitude', () => {
    expect(isCrash(THREAT.crashAltitude - 1)).toBe(true);
    expect(isCrash(100)).toBe(false);
  });
});

describe('evading and enemy fire', () => {
  it('a roll only breaks lock on close missiles', () => {
    expect(rollBreaksLock(THREAT.evadeRange + 100, () => 0)).toBe(false);
    expect(rollBreaksLock(300, () => 0)).toBe(true);
    expect(rollBreaksLock(300, () => 0.99)).toBe(false);
  });

  const ready = { cooldownReady: true, missilesInFlight: 0, maxMissiles: 2, grace: 0 };
  const enemy = { x: 0, y: 500, z: 0 };
  const fwd = { x: 0, y: 0, z: -1 };

  it('fires when the player is ahead and in range', () => {
    expect(shouldEnemyFire(enemy, fwd, { x: 50, y: 500, z: -1500 }, ready)).toBe(true);
  });

  it('holds fire when out of cone, out of range, on cooldown or during grace', () => {
    expect(shouldEnemyFire(enemy, fwd, { x: 1500, y: 500, z: -1000 }, ready)).toBe(false);
    expect(shouldEnemyFire(enemy, fwd, { x: 0, y: 500, z: -9000 }, ready)).toBe(false);
    expect(shouldEnemyFire(enemy, fwd, { x: 0, y: 500, z: -1500 }, { ...ready, cooldownReady: false })).toBe(false);
    expect(shouldEnemyFire(enemy, fwd, { x: 0, y: 500, z: -1500 }, { ...ready, grace: 2 })).toBe(false);
    expect(shouldEnemyFire(enemy, fwd, { x: 0, y: 500, z: -1500 }, { ...ready, missilesInFlight: 2 })).toBe(false);
  });
});
