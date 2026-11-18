// Dusk sky dome, a ring of distant snow-capped mountains, and a few streaky clouds
// near the horizon. Everything here follows the camera so it always looks distant.

import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { mulberry32 } from './noise.js';

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, h));
    float sun = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
    col += uSun * pow(sun, 24.0) * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sky {
  constructor(scene, sunDir) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(12000, 24, 12),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(PALETTE.skyTop) },
          uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
          uSun: { value: new THREE.Color(PALETTE.sun) },
          uSunDir: { value: sunDir.clone() },
        },
      }),
    );
    dome.renderOrder = -10;
    this.group.add(dome);

    this.group.add(this.buildMountainRing());
    this.group.add(this.buildHorizonClouds());
  }

  buildMountainRing() {
    // Rock faces and snowcaps are separate meshes drawn in a fixed order with no
    // depth writes. (Putting caps 5 m in front of rock 10 km away made the GPU's
    // depth test flip between them every frame, which looked like flickering.)
    const rand = mulberry32(99);
    const radius = 10000;
    const count = 90;
    const rock = { pos: [], col: [] };
    const snowCaps = { pos: [], col: [] };
    const haze = new THREE.Color(0xa898b4);
    const hazeDark = new THREE.Color(0x8e7f9e);
    const snow = new THREE.Color(0xeee6ee);
    const snowShade = new THREE.Color(0xd6cddc);
    const push = (buf, v, c) => { buf.pos.push(v.x, v.y, v.z); buf.col.push(c.r, c.g, c.b); };

    for (let i = 0; i < count; i++) {
      if (rand() < 0.25) continue;
      const a = (i / count) * Math.PI * 2 + rand() * 0.05;
      const w = 0.05 + rand() * 0.07;
      const height = 500 + rand() * 1500;
      const base = -200;
      const left = new THREE.Vector3(Math.cos(a - w) * radius, base, Math.sin(a - w) * radius);
      const right = new THREE.Vector3(Math.cos(a + w) * radius, base, Math.sin(a + w) * radius);
      const ap = a + (rand() - 0.5) * w;
      const peak = new THREE.Vector3(Math.cos(ap) * (radius - 200), height, Math.sin(ap) * (radius - 200));
      const mid = left.clone().lerp(right, 0.5);
      // two faces (lit + shadow) for a faceted look
      push(rock, left, haze); push(rock, mid, haze); push(rock, peak, haze);
      push(rock, mid, hazeDark); push(rock, right, hazeDark); push(rock, peak, hazeDark);
      if (height > 1100) {
        const t = 0.7;
        const l2 = left.clone().lerp(peak, t);
        const r2 = right.clone().lerp(peak, t);
        const m2 = mid.clone().lerp(peak, t);
        push(snowCaps, l2, snow); push(snowCaps, m2, snow); push(snowCaps, peak, snow);
        push(snowCaps, m2, snowShade); push(snowCaps, r2, snowShade); push(snowCaps, peak, snowShade);
      }
    }
    const group = new THREE.Group();
    [rock, snowCaps].forEach((buf, order) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true, fog: false, side: THREE.DoubleSide, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -9 + order; // rock first, then snow on top
      group.add(mesh);
    });
    return group;
  }

  buildHorizonClouds() {
    const rand = mulberry32(7);
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xf0c8a8, fog: false, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2;
      const r = 9000;
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(600 + rand() * 900, 40 + rand() * 40), mat);
      streak.position.set(Math.cos(a) * r, 1200 + rand() * 1600, Math.sin(a) * r);
      streak.lookAt(0, streak.position.y, 0);
      group.add(streak);
    }
    return group;
  }

  update(camera) {
    this.group.position.set(camera.position.x, 0, camera.position.z);
  }
}
