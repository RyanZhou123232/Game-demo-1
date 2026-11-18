// Enemy squadron: dark jets that patrol near the player and, once the fight is on,
// turn to chase the player and fire homing missiles when lined up.

import * as THREE from 'three';
import { buildJet } from './jetModel.js';
import { COMBAT, PALETTE, THREAT } from '../config.js';
import { applyOrientation } from './Player.js';
import { shouldEnemyFire, waveDifficulty } from './mission.js';

const tmpTo = new THREE.Vector3();

export class Enemies {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    for (let i = 0; i < COMBAT.enemyCount; i++) {
      const jet = buildJet({ body: PALETTE.enemyBody, dark: 0x2a262e, accent: PALETTE.enemyAccent, canopy: 0x9a5a3a });
      jet.flames.forEach((f) => f.scale.set(1, 1, 0.5));
      scene.add(jet.group);
      this.list.push({
        model: jet.group,
        pos: new THREE.Vector3(),
        forward: new THREE.Vector3(0, 0, -1),
        state: { yaw: 0, pitch: 0, bank: 0 },
        target: new THREE.Vector3(),
        alive: false,
        mode: 'patrol', // 'patrol' | 'engage' | 'breakoff'
        cooldown: 0,
        breakTimer: 0,
      });
    }
    this.difficulty = waveDifficulty(1);
    this.spawnedOnce = false;
  }

  get destroyed() {
    return this.list.filter((e) => !e.alive).length;
  }

  get aliveCount() {
    return this.list.length - this.destroyed;
  }

  spawnAll(playerPos, playerYaw, groundHeight, wave = 1) {
    this.difficulty = waveDifficulty(wave);
    this.spawnedOnce = true;
    this.list.forEach((e, i) => {
      const ang = playerYaw + (i - 1.5) * 0.35;
      const dist = 2600 + i * 450;
      e.pos.set(playerPos.x + Math.sin(ang) * dist, 0, playerPos.z - Math.cos(ang) * dist);
      e.pos.y = Math.max(playerPos.y, Math.max(0, groundHeight(e.pos.x, e.pos.z)) + 350);
      e.state.yaw = playerYaw + Math.PI * (0.3 + Math.random() * 0.4) * (i % 2 ? 1 : -1);
      e.state.pitch = 0;
      e.state.bank = 0;
      e.alive = true;
      e.mode = 'patrol';
      e.cooldown = 2 + Math.random() * 4; // stagger first shots
      e.model.visible = true;
      this.pickTarget(e, playerPos, groundHeight);
    });
  }

  pickTarget(e, center, groundHeight, minR = 900, maxR = 3100) {
    const a = Math.random() * Math.PI * 2;
    const r = minR + Math.random() * (maxR - minR);
    const x = center.x + Math.cos(a) * r;
    const z = center.z + Math.sin(a) * r;
    const ground = Math.max(0, groundHeight(x, z));
    e.target.set(x, ground + 300 + Math.random() * 500, z);
  }

  kill(e) {
    e.alive = false;
    e.model.visible = false;
  }

  /**
   * ctx: { playerPos, playerYaw, playerForward, playerSpeed, groundHeight,
   *        engage: bool, grace: number, hostileMissiles: number, onFire(enemy) }
   */
  update(dt, ctx) {
    const { playerPos, playerForward, playerSpeed, groundHeight } = ctx;
    if (!this.spawnedOnce) this.spawnAll(playerPos, ctx.playerYaw, groundHeight);
    const diff = this.difficulty;

    for (const e of this.list) {
      if (!e.alive) continue;
      const dist = e.pos.distanceTo(playerPos);
      e.cooldown = Math.max(0, e.cooldown - dt);

      // --- choose behaviour ---
      if (e.mode === 'breakoff') {
        e.breakTimer -= dt;
        if (e.breakTimer <= 0) e.mode = 'patrol';
      } else if (ctx.engage && dist < THREAT.breakOffRange) {
        // too close: peel away to set up another pass
        e.mode = 'breakoff';
        e.breakTimer = 4;
        this.pickTarget(e, e.pos, groundHeight, 1200, 1800);
      } else if (ctx.engage && dist < THREAT.engageRange) {
        e.mode = 'engage';
      } else {
        e.mode = 'patrol';
      }

      if (e.mode === 'engage') {
        // aim a little ahead of the player
        const lead = Math.min(2.5, dist / 900);
        e.target.copy(playerPos).addScaledVector(playerForward, playerSpeed * lead);
      } else if (e.mode === 'patrol') {
        tmpTo.copy(e.target).sub(e.pos);
        if (tmpTo.length() < 250 || dist > 6000) this.pickTarget(e, playerPos, groundHeight);
      }

      // --- steer toward the target (limited turn rate: the player can out-turn them) ---
      const to = tmpTo.copy(e.target).sub(e.pos);
      const desiredYaw = Math.atan2(to.x, -to.z);
      let dyaw = desiredYaw - e.state.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const maxRate = e.mode === 'engage' ? 0.7 : 0.6;
      const yawRate = Math.max(-maxRate, Math.min(maxRate, dyaw * 1.4));
      e.state.yaw += yawRate * dt;
      e.state.bank += (yawRate * 1.3 - e.state.bank) * Math.min(1, 2 * dt);
      const horiz = Math.hypot(to.x, to.z) || 1;
      const desiredPitch = Math.max(-0.45, Math.min(0.45, Math.atan2(to.y, horiz)));
      e.state.pitch += (desiredPitch - e.state.pitch) * Math.min(1, 1.5 * dt);

      const speed = diff.enemySpeed * (e.mode === 'engage' ? 1.25 : 1);
      const cp = Math.cos(e.state.pitch);
      e.forward.set(Math.sin(e.state.yaw) * cp, Math.sin(e.state.pitch), -Math.cos(e.state.yaw) * cp);
      e.pos.addScaledVector(e.forward, speed * dt);
      const floor = Math.max(0, groundHeight(e.pos.x, e.pos.z)) + 120;
      if (e.pos.y < floor) e.pos.y = floor;

      e.model.position.copy(e.pos);
      applyOrientation(e.model, e.state);

      // --- fire ---
      if (e.mode === 'engage' && shouldEnemyFire(e.pos, e.forward, playerPos, {
        cooldownReady: e.cooldown <= 0,
        missilesInFlight: ctx.hostileMissiles,
        maxMissiles: diff.maxEnemyMissiles,
        grace: ctx.grace,
      })) {
        e.cooldown = diff.fireCooldown * (0.8 + Math.random() * 0.4);
        ctx.hostileMissiles += 1;
        ctx.onFire(e);
      }
    }
  }
}
