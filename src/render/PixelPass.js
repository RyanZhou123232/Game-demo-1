// The "look": render the 3D scene into a small low-resolution target, then draw it
// to the screen with ordered (Bayer) dithering + colour quantisation and crisp
// nearest-neighbour upscaling. This is what gives the painterly pixel-art feel.

import * as THREE from 'three';
import { RENDER } from '../config.js';

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uRes;      // low-res target size in pixels
  uniform float uLevels;
  varying vec2 vUv;

  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    for (int k = 0; k < 16; k++) { if (k == i) return float(m[k]) / 16.0; }
    return 0.0;
  }

  void main() {
    vec2 px = floor(vUv * uRes);
    vec3 c = texture2D(tScene, (px + 0.5) / uRes).rgb;
    // scene is rendered in linear light; encode to sRGB before dithering
    c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    float t = bayer4(px) - 0.5;
    c += t / uLevels;
    c = floor(c * uLevels + 0.5) / uLevels;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

export class PixelPass {
  constructor(renderer) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        tScene: { value: this.target.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uLevels: { value: RENDER.colorLevels },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /** width/height: CSS pixel size of the window. Returns the low-res size. */
  setSize(width, height) {
    const w = Math.max(1, Math.floor(width / RENDER.pixelScale));
    const h = Math.max(1, Math.floor(height / RENDER.pixelScale));
    this.target.setSize(w, h);
    this.material.uniforms.uRes.value.set(w, h);
    return { w, h };
  }

  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
