// The "look": render the 3D scene into a small low-resolution target, then draw it
// to the screen with gentle ordered (Bayer) dithering + colour quantisation and
// crisp nearest-neighbour upscaling. This is what gives the painterly pixel feel.
//
// Anti-flicker: the scene is rendered at 2x the pixel-art resolution and each
// output pixel averages a 2x2 block (one bilinear fetch at the block centre).
// That stops thin edges and tiny details from popping on and off as the camera moves.
//
// Crispness: the final pass runs at the screen's real device resolution, and each
// art pixel is a whole number of device pixels, so the browser never blurs it.

import * as THREE from 'three';
import { RENDER } from '../config.js';

const SUPERSAMPLE = 2;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uRes;       // pixel-art resolution (output pixels)
  uniform float uLevels;   // colour levels per channel
  uniform float uDither;   // 0 = no dither, 1 = full-strength dither
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
    // centre of the art pixel = centre of a 2x2 block in the supersampled target,
    // so linear filtering returns the average of the 4 samples
    vec3 c = texture2D(tScene, (px + 0.5) / uRes).rgb;
    // scene is rendered in linear light; encode to sRGB before dithering
    c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    float t = (bayer4(px) - 0.5) * uDither;
    c += t / uLevels;
    c = floor(c * uLevels + 0.5) / uLevels;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

/**
 * Work out the art resolution for a canvas. Pure helper (unit-tested).
 * Returns the art size and the whole number of device pixels per art pixel.
 */
export function artResolution(cssWidth, cssHeight, dpr, pixelScale) {
  const block = Math.max(1, Math.round(pixelScale * dpr));
  return {
    block,
    w: Math.max(1, Math.round((cssWidth * dpr) / block)),
    h: Math.max(1, Math.round((cssHeight * dpr) / block)),
  };
}

export class PixelPass {
  constructor(renderer) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        tScene: { value: this.target.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uLevels: { value: RENDER.colorLevels },
        uDither: { value: RENDER.ditherStrength },
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

  /**
   * Size everything for a canvas of cssWidth x cssHeight CSS pixels.
   * Returns the art resolution { w, h } (also used for the 2D overlay canvas).
   */
  setSize(cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    const art = artResolution(cssWidth, cssHeight, dpr, RENDER.pixelScale);
    // draw the final pass at exactly art * block device pixels
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(art.w * art.block, art.h * art.block, false);
    this.target.setSize(art.w * SUPERSAMPLE, art.h * SUPERSAMPLE);
    this.material.uniforms.uRes.value.set(art.w, art.h);
    return art;
  }

  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }
}
