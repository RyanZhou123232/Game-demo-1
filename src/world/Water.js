// Stylized sea: a big plane at sea level that follows the player. A custom shader
// paints two-tone water with short animated foam strokes, plus distance haze.

import * as THREE from 'three';
import { PALETTE, WORLD } from '../config.js';

const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  float strokes(vec2 xz, float scale, float speed) {
    vec2 p = xz / vec2(34.0, 11.0) * scale;
    float row = floor(p.y);
    p.x += uTime * speed * (0.6 + hash(vec2(row, 3.0)));
    vec2 cell = floor(p);
    vec2 f = fract(p);
    float r = hash(cell);
    float r2 = hash(cell + 17.0);
    float start = r * 0.5;
    float len = 0.25 + r2 * 0.3;
    float onX = step(start, f.x) * step(f.x, start + len);
    float onY = step(abs(f.y - 0.5), 0.09);
    return onX * onY * step(0.45, r2);
  }

  void main() {
    float big = vnoise(vWorld.xz / 900.0) * 0.6 + vnoise(vWorld.xz / 260.0) * 0.4;
    vec3 col = mix(uDeep, uShallow, smoothstep(0.35, 0.75, big));
    float dist = length(cameraPosition - vWorld);
    // Foam strokes only near the camera: far away each stroke is smaller than a
    // pixel and would just sparkle. Fade them out with distance.
    float near = 1.0 - smoothstep(500.0, 1800.0, dist);
    float s = max(strokes(vWorld.xz, 1.0, 0.12), strokes(vWorld.xz + 500.0, 0.6, -0.07) * 0.8);
    col = mix(col, uFoam, s * 0.8 * near);

    float fog = smoothstep(uFogNear, uFogFar, dist);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;

export class Water {
  constructor(scene) {
    const size = WORLD.chunkSize * (WORLD.chunkRadius * 2 + 3);
    const geo = new THREE.PlaneGeometry(size, size, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
        uShallow: { value: new THREE.Color(PALETTE.waterShallow) },
        uFoam: { value: new THREE.Color(PALETTE.foam) },
        uFog: { value: new THREE.Color(PALETTE.fog) },
        uFogNear: { value: WORLD.fogNear },
        uFogFar: { value: WORLD.fogFar },
      },
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = WORLD.seaLevel;
    scene.add(this.mesh);
  }

  update(dt, px, pz) {
    this.material.uniforms.uTime.value += dt;
    const snap = 200;
    this.mesh.position.x = Math.round(px / snap) * snap;
    this.mesh.position.z = Math.round(pz / snap) * snap;
  }
}
