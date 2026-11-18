// Enemy squadron: dark jets that wander between waypoints near the player.

import * as THREE from 'three';
import { buildJet } from './jetModel.js';
import { COMBAT, PALETTE } from '../config.js';
import { applyOrientation } from './Player.js';

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
        state: { yaw: 0, pitch: 0, bank: 0 },
        target: new THREE.Vector3(),
        alive: false,
      });
    }
    this.respawnTimer = 0;
  }

  get destroyed() {
    return this.list.filter((e) => !e.alive).length;
  }

  spawnAll(playerPos, playerYaw, groundHeight) {
    this.list.forEach((e, i) => {
      const ang = playerYaw + (i - 1.5) * 0.35;
      const dist = 1800 + i * 450;
      e.pos.set(playerPos.x + Math.sin(ang) * dist, 0, playerPos.z - Math.cos(ang) * dist);
      e.pos.y = Math.max(playerPos.y, Math.max(0, groundHeight(e.pos.x, e.pos.z)) + 350);
      e.state.yaw = playerYaw + Math.PI * (0.3 + Math.random() * 0.4) * (i % 2 ? 1 : -1);
      e.alive = true;
      e.model.visible = true;
      this.pickTarget(e, playerPos, groundHeight);
    });
  }

  pickTarget(e, playerPos, groundHeight) {
    const a = Math.random() * Math.PI * 2;
    const r = 900 + Math.random() * 2200;
    const x = playerPos.x + Math.cos(a) * r;
    const z = playerPos.z + Math.sin(a) * r;
    const ground = Math.max(0, groundHeight(x, z));
    e.target.set(x, ground + 300 + Math.random() * 500, z);
  }

  kill(e) {
    e.alive = false;
    e.model.visible = false;
  }

  update(dt, playerPos, playerYaw, groundHeight) {
    if (!this.spawnedOnce) {
      this.spawnAll(playerPos, playerYaw, groundHeight);
      this.spawnedOnce = true;
    } else if (this.list.every((e) => !e.alive)) {
      // whole squadron down: a fresh wave arrives after a short pause
      this.respawnTimer += dt;
      if (this.respawnTimer >= COMBAT.respawnDelay) {
        this.spawnAll(playerPos, playerYaw, groundHeight);
        this.respawnTimer = 0;
      }
    }

    const speed = COMBAT.enemySpeed;
    for (const e of this.list) {
      if (!e.alive) continue;
      const to = e.target.clone().sub(e.pos);
      if (to.length() < 250 || e.pos.distanceTo(playerPos) > 6000) this.pickTarget(e, playerPos, groundHeight);

      const desiredYaw = Math.atan2(to.x, -to.z);
      let dyaw = desiredYaw - e.state.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const yawRate = Math.max(-0.6, Math.min(0.6, dyaw * 1.2));
      e.state.yaw += yawRate * dt;
      e.state.bank += (yawRate * 1.3 - e.state.bank) * Math.min(1, 2 * dt);
      const horiz = Math.hypot(to.x, to.z) || 1;
      const desiredPitch = Math.max(-0.4, Math.min(0.4, Math.atan2(to.y, horiz)));
      e.state.pitch += (desiredPitch - e.state.pitch) * Math.min(1, 1.5 * dt);

      const cp = Math.cos(e.state.pitch);
      e.pos.x += Math.sin(e.state.yaw) * cp * speed * dt;
      e.pos.y += Math.sin(e.state.pitch) * speed * dt;
      e.pos.z += -Math.cos(e.state.yaw) * cp * speed * dt;
      const floor = Math.max(0, groundHeight(e.pos.x, e.pos.z)) + 120;
      if (e.pos.y < floor) e.pos.y = floor;

      e.model.position.copy(e.pos);
      applyOrientation(e.model, e.state);
    }
  }
}
