// Homing missiles for both sides, trailing low-poly smoke puffs.
// A target is any object with { pos: Vector3, alive: bool }.

import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { findLockTarget, steerToward } from './combat.js';

const tmp = new THREE.Vector3();

function buildMissileModel(hostile) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 3.6, 6),
    new THREE.MeshLambertMaterial({ color: hostile ? 0x5a5258 : 0xe8e2dc, flatShading: true }),
  );
  body.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.8, 6),
    new THREE.MeshLambertMaterial({ color: hostile ? 0xc23a2a : 0xd06a3a, flatShading: true }),
  );
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -2.2;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(hostile ? 0.6 : 0.45, 6, 4),
    new THREE.MeshBasicMaterial({ color: hostile ? 0xff6a4a : 0xffd27a }),
  );
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

  /**
   * Launch a missile.
   * opts: { pos, dir, speed, target, hostile, maxSpeed, turnRate, life, hitRadius }
   */
  launch(opts) {
    const model = buildMissileModel(opts.hostile);
    const m = {
      model,
      pos: opts.pos.clone(),
      dir: opts.dir.clone().normalize(),
      speed: opts.speed,
      target: opts.target ?? null,
      hostile: !!opts.hostile,
      maxSpeed: opts.maxSpeed ?? COMBAT.missileSpeed,
      turnRate: opts.turnRate ?? COMBAT.missileTurnRate,
      life: opts.life ?? COMBAT.missileLife,
      hitRadius: opts.hitRadius ?? COMBAT.missileHitRadius,
      puff: 0,
    };
    model.position.copy(m.pos);
    this.scene.add(model);
    this.active.push(m);
    return m;
  }

  /** Player fires: locks the best enemy ahead (or flies straight). */
  firePlayer(player, enemies) {
    const target = findLockTarget(player.position, player.forward, enemies.list,
      COMBAT.lockRange, COMBAT.lockConeDeg);
    const offset = new THREE.Vector3(this.side * 3.5, -1.2, 0).applyEuler(player.model.rotation);
    this.side *= -1;
    return this.launch({
      pos: player.position.clone().add(offset),
      dir: player.forward,
      speed: player.state.speed + 60,
      target,
    });
  }

  /** Hostile missiles currently chasing `target`. */
  chasing(target) {
    return this.active.filter((m) => m.hostile && m.target === target);
  }

  get hostileCount() {
    return this.active.reduce((n, m) => n + (m.hostile ? 1 : 0), 0);
  }

  clear() {
    for (const m of this.active) this.scene.remove(m.model);
    this.active.length = 0;
  }

  /** Advance missiles; calls onHit(target, position, missile) when one connects. */
  update(dt, groundHeight, onHit) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      m.life -= dt;
      m.speed = Math.min(m.maxSpeed, m.speed + 400 * dt);

      if (m.target && m.target.alive) {
        tmp.copy(m.target.pos).sub(m.pos).normalize();
        const d = steerToward(m.dir, tmp, m.turnRate * dt);
        m.dir.set(d.x, d.y, d.z);
      }
      m.pos.addScaledVector(m.dir, m.speed * dt);
      m.model.position.copy(m.pos);
      m.model.lookAt(tmp.copy(m.pos).sub(m.dir));

      m.puff += dt;
      while (m.puff > 0.03) {
        m.puff -= 0.03;
        const jitter = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        this.particles.spawn(m.pos, jitter, {
          size: 0.9, grow: 3.2, life: 1.8, color: m.hostile ? 0x8f8790 : 0xc4bec2,
        });
      }

      const hitGround = m.pos.y < Math.max(0, groundHeight(m.pos.x, m.pos.z));
      let done = m.life <= 0 || hitGround;
      if (m.target && m.target.alive && m.pos.distanceTo(m.target.pos) < m.hitRadius) {
        onHit(m.target, m.pos.clone(), m);
        done = true;
      } else if (done) {
        this.particles.explosion(m.pos, 0.35); // fizzle / ground impact
      }
      if (done) {
        this.scene.remove(m.model);
        this.active.splice(i, 1);
      }
    }
  }
}
