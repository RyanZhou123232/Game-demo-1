// Thin white wingtip vapour trails: a ring buffer of recent wingtip positions per wing.

import * as THREE from 'three';

const tmp = new THREE.Vector3();

export class Contrails {
  constructor(scene, anchors, length = 140) {
    this.anchors = anchors;
    this.length = length;
    this.trails = anchors.map(() => {
      const positions = new Float32Array(length * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xf6f2f0, transparent: true, opacity: 0.85,
      }));
      line.frustumCulled = false;
      scene.add(line);
      return { line, positions, count: 0 };
    });
    this.timer = 0;
  }

  setVisible(v) {
    for (const t of this.trails) t.line.visible = v;
  }

  update(dt) {
    this.timer += dt;
    const sample = this.timer >= 1 / 30;
    if (sample) this.timer = 0;
    this.trails.forEach((t, i) => {
      this.anchors[i].getWorldPosition(tmp);
      if (sample) {
        // shift right by one point (newest at index 0)
        t.positions.copyWithin(3, 0, (this.length - 1) * 3);
        t.count = Math.min(this.length, t.count + 1);
      }
      t.positions[0] = tmp.x;
      t.positions[1] = tmp.y;
      t.positions[2] = tmp.z;
      t.line.geometry.setDrawRange(0, Math.max(2, t.count));
      t.line.geometry.attributes.position.needsUpdate = true;
    });
  }

  reset() {
    for (const t of this.trails) t.count = 0;
  }
}
