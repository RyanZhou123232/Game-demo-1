// Big flat cream-coloured clouds made of squashed low-poly blobs. They live in a
// wrap-around box centred on the player, so there are always clouds nearby.

import * as THREE from 'three';
import { PALETTE, WORLD } from '../config.js';
import { mulberry32 } from './noise.js';

const BOX = 9000;

export class Clouds {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const rand = mulberry32(4242);
    const mat = new THREE.MeshLambertMaterial({
      color: PALETTE.cloud,
      emissive: new THREE.Color(PALETTE.cloudShade),
      emissiveIntensity: 0.55,
      flatShading: true,
    });
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);

    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const cloud = new THREE.Group();
      const parts = 4 + Math.floor(rand() * 6);
      const spread = 250 + rand() * 450;
      for (let k = 0; k < parts; k++) {
        const blob = new THREE.Mesh(blobGeo, mat);
        const r = 120 + rand() * 260;
        blob.scale.set(r * (1 + rand()), r * 0.22, r * (1 + rand()));
        blob.position.set((rand() - 0.5) * spread * 2, (rand() - 0.5) * 30, (rand() - 0.5) * spread * 2);
        blob.rotation.y = rand() * Math.PI;
        cloud.add(blob);
      }
      cloud.userData.base = new THREE.Vector3(
        (rand() - 0.5) * BOX,
        WORLD.cloudAltitude + (rand() - 0.5) * 500,
        (rand() - 0.5) * BOX,
      );
      cloud.position.copy(cloud.userData.base);
      this.group.add(cloud);
      this.clouds.push(cloud);
    }
  }

  update(dt, px, pz) {
    for (const c of this.clouds) {
      c.userData.base.x += dt * 6; // slow drift
      // wrap each cloud into the box around the player
      const b = c.userData.base;
      c.position.x = px + wrap(b.x - px, BOX);
      c.position.z = pz + wrap(b.z - pz, BOX);
      c.position.y = b.y;
    }
  }
}

export function wrap(v, size) {
  const h = size / 2;
  return ((((v + h) % size) + size) % size) - h;
}
