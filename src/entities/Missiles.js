// Homing missiles fired from the player's jet, trailing low-poly smoke puffs.

import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { findLockTarget, steerToward } from './combat.js';

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function buildMissileModel() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 3.6, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8e2dc, flatShading: true }),
  );
  body.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.8, 6),
    new THREE.MeshLambertMaterial({ color: 0xd06a3a, flatShading: true }),
  );
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -2.2;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  glow.position.z = 2.0;
  g.add(body, tip, glow);
  return g;
}

export class Missiles {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.active = [];
    this.side = 1;
  }

  /** Fire from the jet. Returns the locked target (or null). */
  fire(player, enemies) {
    const target = findLockTarget(player.position, player.forward, enemies.list,
      COMBAT.lockRange, COMBAT.lockConeDeg);
    const model = buildMissileModel();
    // launch from under alternating wings
    const offset = new THREE.Vector3(this.side * 3.5, -1.2, 0).applyEuler(player.model.rotation);
    this.side *= -1;
    const pos = player.position.clone().add(offset);
    model.position.copy(pos);
    this.scene.add(model);
    this.active.push({
      model, pos,
      dir: player.forward.clone(),
      speed: player.state.speed + 60,
      target, life: COMBAT.missileLife, puff: 0,
    });
    return target;
  }

  /** Advance missiles; calls onHit(enemy, position) when one connects. */
  update(dt, groundHeight, onHit) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      m.life -= dt;
      m.speed = Math.min(COMBAT.missileSpeed, m.speed + 400 * dt);

      if (m.target && m.target.alive) {
        tmp.copy(m.target.pos).sub(m.pos).normalize();
        const d = steerToward(m.dir, tmp, COMBAT.missileTurnRate * dt);
        m.dir.set(d.x, d.y, d.z);
      }
      m.pos.addScaledVector(m.dir, m.speed * dt);
      m.model.position.copy(m.pos);
      m.model.lookAt(tmp.copy(m.pos).sub(m.dir));
      m.model.up.copy(UP);

      m.puff += dt;
      while (m.puff > 0.03) {
        m.puff -= 0.03;
        const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        this.particles.spawn(m.pos, jitter, { size: 0.9, grow: 3.2, life: 1.8, color: 0xc4bec2 });
      }

      let done = m.life <= 0 || m.pos.y < Math.max(0, groundHeight(m.pos.x, m.pos.z));
      if (m.target && m.target.alive && m.pos.distanceTo(m.target.pos) < COMBAT.missileHitRadius) {
        onHit(m.target, m.pos.clone());
        done = true;
      }
      if (done) {
        if (m.life > 0 && !m.target?.alive) this.particles.explosion(m.pos, 0.4);
        this.scene.remove(m.model);
        this.active.splice(i, 1);
      }
    }
  }
}
