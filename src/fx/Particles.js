// Pooled low-poly particles (little cubes) for missile smoke and explosions.
// One InstancedMesh, so hundreds of puffs cost a single draw call.

import * as THREE from 'three';

const dummy = new THREE.Object3D();
const col = new THREE.Color();

export class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshLambertMaterial({ flatShading: true, emissive: 0x6a6268 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, col.setHex(0xffffff));
    scene.add(this.mesh);
    this.items = [];
    this.next = 0;
    for (let i = 0; i < max; i++) {
      this.items.push({ life: 0, maxLife: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        size: 1, grow: 0, rot: new THREE.Euler() });
    }
  }

  spawn(pos, vel, { size = 3, grow = 6, life = 1.5, color = 0xa49ea3 } = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const p = this.items[i];
    p.life = life;
    p.maxLife = life;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.size = size;
    p.grow = grow;
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.mesh.setColorAt(i, col.setHex(color));
    this.mesh.instanceColor.needsUpdate = true;
  }

  explosion(pos, scale = 1) {
    const colors = [0xffb347, 0xff7a3a, 0xffe08a, 0x5a4a50, 0x8a7a80];
    for (let k = 0; k < 40; k++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5)
        .normalize().multiplyScalar((30 + Math.random() * 90) * scale);
      this.spawn(pos, v, {
        size: (2.5 + Math.random() * 4) * scale,
        grow: 6 * scale,
        life: 0.6 + Math.random() * 1.0,
        color: colors[k % colors.length],
      });
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.items[i];
      if (p.life <= 0) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        this.mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - Math.min(1, 1.8 * dt));
      const t = 1 - Math.max(0, p.life) / p.maxLife; // 0 -> 1
      const s = (p.size + p.grow * t) * (t > 0.7 ? (1 - t) / 0.3 : 1);
      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.setScalar(Math.max(0, s));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
