// Procedural low-poly fighter jet, built from simple shapes in code (no model file).
// Model space: nose points to -Z, up is +Y, right wing is +X. Length ~19 m.

import * as THREE from 'three';
import { PALETTE } from '../config.js';

function flatShape(points, thickness, material) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  // Shape is drawn in XY; lay it flat so Y(shape) becomes Z(world).
  geo.rotateX(Math.PI / 2);
  geo.translate(0, thickness / 2, 0);
  return new THREE.Mesh(geo, material);
}

function lathe(profile, segments, material) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  geo.rotateX(-Math.PI / 2); // lathe axis Y -> -Z (nose forward)
  return new THREE.Mesh(geo, material);
}

/**
 * Build a jet. Returns { group, flames: Mesh[], wingtips: Object3D[], canopy }.
 * colors: { body, dark, accent, canopy }
 */
export function buildJet(colors = {}) {
  const c = {
    body: colors.body ?? PALETTE.jetBody,
    dark: colors.dark ?? PALETTE.jetBodyDark,
    accent: colors.accent ?? PALETTE.jetAccent,
    canopy: colors.canopy ?? PALETTE.jetCanopy,
  };
  const lit = (color) => new THREE.MeshLambertMaterial({
    color, emissive: color, emissiveIntensity: 0.35, flatShading: true,
  });
  const mBody = lit(c.body);
  const mDark = lit(c.dark);
  const mAccent = lit(c.accent);
  const mCanopy = new THREE.MeshLambertMaterial({
    color: c.canopy, emissive: c.canopy, emissiveIntensity: 0.25, flatShading: true,
  });

  const group = new THREE.Group();

  // Fuselage: lathe profile from tail (y=0) to nose tip (y=19), 6 sides = faceted look.
  const fuselage = lathe(
    [[0, -0.2], [1.1, 0], [1.5, 2], [1.6, 7], [1.3, 12], [0.8, 15.5], [0.25, 18.4], [0, 19]],
    6, mBody,
  );
  fuselage.position.z = 9.5; // centre the jet around the origin
  fuselage.scale.set(1.15, 0.7, 1);
  group.add(fuselage);

  // Engine intakes / side bodies
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 9), mDark);
    pod.position.set(sx * 1.7, -0.15, 1.2);
    group.add(pod);
  }

  // Main wings (diamond / delta)
  const wingPts = [[0, -3.5], [7.6, 2.6], [7.6, 4.2], [0, 5.5]];
  for (const sx of [-1, 1]) {
    const wing = flatShape(wingPts.map(([x, z]) => [x * sx, z]), 0.35, mBody);
    wing.position.set(0, -0.1, 0);
    group.add(wing);
    const stripe = flatShape([[1.5 * sx, 1.5], [6.8 * sx, 3.2], [6.8 * sx, 3.9], [1.5 * sx, 3.0]], 0.4, mDark);
    group.add(stripe);
  }

  // Horizontal stabilizers
  const tailPts = [[0, 5.5], [4.2, 8.6], [4.2, 9.6], [0, 9.4]];
  for (const sx of [-1, 1]) {
    const st = flatShape(tailPts.map(([x, z]) => [x * sx, z]), 0.3, mDark);
    st.position.set(sx * 1.0, 0, 0);
    group.add(st);
  }

  // Twin canted vertical fins
  for (const sx of [-1, 1]) {
    const finShape = new THREE.Shape([
      new THREE.Vector2(0, 0), new THREE.Vector2(3.4, 0),
      new THREE.Vector2(4.4, 3.4), new THREE.Vector2(2.9, 3.4),
    ]);
    const geo = new THREE.ExtrudeGeometry(finShape, { depth: 0.25, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2);
    const fin = new THREE.Mesh(geo, mBody);
    fin.position.set(sx * 1.8, 0.4, 5.2);
    fin.rotation.z = -sx * 0.38;
    group.add(fin);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.4), mAccent);
    tip.position.set(sx * (1.8 + 1.3), 3.4, 8.6);
    tip.rotation.z = -sx * 0.38;
    group.add(tip);
  }

  // Canopy
  const canopy = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mCanopy);
  canopy.scale.set(0.75, 0.75, 3.0);
  canopy.position.set(0, 0.95, -4.8);
  group.add(canopy);

  // Nozzles + afterburner flames
  const flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: PALETTE.flame, transparent: true, opacity: 0.95 });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
  for (const sx of [-1, 1]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 1.4, 6), mDark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(sx * 0.95, -0.1, 9.9);
    group.add(nozzle);

    const flame = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.5, 6), flameMat);
    outer.rotation.x = Math.PI / 2;
    outer.position.z = 2.25;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.2, 5), coreMat);
    core.rotation.x = Math.PI / 2;
    core.position.z = 1.1;
    flame.add(outer, core);
    flame.position.set(sx * 0.95, -0.1, 10.5);
    group.add(flame);
    flames.push(flame);
  }

  // Wingtip anchors for contrails
  const wingtips = [-1, 1].map((sx) => {
    const o = new THREE.Object3D();
    o.position.set(sx * 7.6, -0.1, 3.4);
    group.add(o);
    return o;
  });

  return { group, flames, wingtips, canopy };
}

/** Animate afterburner flame length. throttle in [0, 1]. */
export function setFlameThrottle(flames, throttle, time) {
  for (let i = 0; i < flames.length; i++) {
    const flicker = 0.9 + 0.1 * Math.sin(time * 40 + i * 2.1);
    const len = (0.55 + throttle * 0.9) * flicker;
    flames[i].scale.set(1, 1, len);
  }
}
