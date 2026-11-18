// Chunked terrain around the player. Each chunk is a flat-shaded mesh with one
// colour per triangle, plus instanced trees. Chunks are built as the player moves.

import * as THREE from 'three';
import { WORLD, PALETTE } from '../config.js';
import { groundColor } from './heightfield.js';
import { mulberry32 } from './noise.js';

const tmpColor = new THREE.Color();

export class Terrain {
  constructor(scene, field) {
    this.scene = scene;
    this.field = field;
    this.chunks = new Map(); // key "cx,cz" -> THREE.Group
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.treeGeo = new THREE.ConeGeometry(5, 18, 5);
    this.treeGeo.translate(0, 9, 0);
    this.treeMat = new THREE.MeshLambertMaterial({ flatShading: true });
    this.center = null;
  }

  update(px, pz) {
    const size = WORLD.chunkSize;
    const cx = Math.floor(px / size);
    const cz = Math.floor(pz / size);
    const key = `${cx},${cz}`;
    if (key === this.center) return;
    this.center = key;

    const R = WORLD.chunkRadius;
    const wanted = new Set();
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const k = `${cx + dx},${cz + dz}`;
        wanted.add(k);
        if (!this.chunks.has(k)) {
          const chunk = this.buildChunk(cx + dx, cz + dz);
          this.scene.add(chunk);
          this.chunks.set(k, chunk);
        }
      }
    }
    for (const [k, chunk] of this.chunks) {
      if (!wanted.has(k)) {
        this.scene.remove(chunk);
        chunk.traverse((o) => {
          if (o.geometry && o.geometry !== this.treeGeo) o.geometry.dispose();
        });
        this.chunks.delete(k);
      }
    }
  }

  buildChunk(cx, cz) {
    const { heightAt, slopeAt, patchAt } = this.field;
    const size = WORLD.chunkSize;
    const seg = WORLD.chunkSegments;
    const step = size / seg;
    const x0 = cx * size;
    const z0 = cz * size;

    // Height grid (seg+1)^2, sampled with a little jitter-free regularity.
    const n = seg + 1;
    const hs = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        hs[j * n + i] = heightAt(x0 + i * step, z0 + j * step);
      }
    }

    const positions = new Float32Array(seg * seg * 6 * 3);
    const colors = new Float32Array(seg * seg * 6 * 3);
    let p = 0;
    const pushTri = (ax, ay, az, bx, by, bz, qx, qy, qz) => {
      const mx = (ax + bx + qx) / 3;
      const my = (ay + by + qy) / 3;
      const mz = (az + bz + qz) / 3;
      // slope from triangle normal
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = qx - ax, vy = qy - ay, vz = qz - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const slope = Math.hypot(nx, nz) / Math.max(1e-6, Math.abs(ny));
      tmpColor.setHex(groundColor(my, slope, patchAt(mx, mz)));
      for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [qx, qy, qz]]) {
        positions[p] = x; positions[p + 1] = y; positions[p + 2] = z;
        colors[p] = tmpColor.r; colors[p + 1] = tmpColor.g; colors[p + 2] = tmpColor.b;
        p += 3;
      }
    };

    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const xa = x0 + i * step, xb = xa + step;
        const za = z0 + j * step, zb = za + step;
        const h00 = hs[j * n + i], h10 = hs[j * n + i + 1];
        const h01 = hs[(j + 1) * n + i], h11 = hs[(j + 1) * n + i + 1];
        pushTri(xa, h00, za, xa, h01, zb, xb, h10, za);
        pushTri(xb, h10, za, xa, h01, zb, xb, h11, zb);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.material);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(this.buildTrees(cx, cz, heightAt, slopeAt, patchAt));
    return group;
  }

  buildTrees(cx, cz, heightAt, slopeAt, patchAt) {
    const size = WORLD.chunkSize;
    const rand = mulberry32((cx * 73856093) ^ (cz * 19349663) ^ WORLD.seed);
    const attempts = 520;
    const mats = [];
    const cols = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const pos = new THREE.Vector3();
    for (let a = 0; a < attempts; a++) {
      const x = cx * size + rand() * size;
      const z = cz * size + rand() * size;
      const h = heightAt(x, z);
      if (h < 18 || h > 800) continue;
      const patch = patchAt(x, z);
      if (rand() > patch * 1.1) continue;
      if (slopeAt(x, z) > 0.9) continue;
      const sc = 0.6 + rand() * 0.9;
      s.set(sc, sc * (0.8 + rand() * 0.6), sc);
      pos.set(x, h - 2, z);
      m.compose(pos, q, s);
      mats.push(m.clone());
      cols.push(rand() < 0.55 ? PALETTE.treeB : PALETTE.treeA);
    }
    const inst = new THREE.InstancedMesh(this.treeGeo, this.treeMat, Math.max(1, mats.length));
    inst.count = mats.length;
    mats.forEach((mat, i) => {
      inst.setMatrixAt(i, mat);
      inst.setColorAt(i, tmpColor.setHex(cols[i]));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return inst;
  }
}
