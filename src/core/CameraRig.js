// Camera modes: CHASE (behind the jet), COCKPIT (pilot's seat), OVERHEAD (top-down).

import * as THREE from 'three';
import { CAMERA_MODES } from '../config.js';

const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export function nextMode(index, count = CAMERA_MODES.length) {
  return (index + 1) % count;
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.index = 0;
    this.smoothPos = new THREE.Vector3();
    this.initialised = false;
  }

  get mode() {
    return CAMERA_MODES[this.index];
  }

  cycle() {
    this.index = nextMode(this.index);
    this.initialised = false;
    return this.mode;
  }

  update(dt, player, groundHeight = () => 0) {
    const cam = this.camera;
    const s = player.state;
    const p = player.position;
    const f = player.forward;

    if (player.dead) {
      // Wreck camera: slow orbit around the crash/explosion, always above the ground.
      this.orbit = (this.orbit ?? s.yaw + Math.PI) + dt * 0.25;
      const r = 170;
      const x = p.x + Math.sin(this.orbit) * r;
      const z = p.z - Math.cos(this.orbit) * r;
      const y = Math.max(p.y, Math.max(0, groundHeight(x, z))) + 70;
      cam.position.set(x, y, z);
      cam.up.set(0, 1, 0);
      cam.lookAt(p);
      cam.fov = 60;
      cam.updateProjectionMatrix();
      player.model.visible = false;
      return;
    }
    this.orbit = undefined;

    if (this.mode === 'CHASE') {
      // Behind and above, in the heading frame (doesn't spin with barrel rolls).
      const flatF = tmpLook.set(Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      tmpPos.copy(p)
        .addScaledVector(flatF, -17)
        .addScaledVector(f, -4)
        .add(new THREE.Vector3(0, 7, 0));
      if (!this.initialised) { this.smoothPos.copy(tmpPos); this.initialised = true; }
      this.smoothPos.lerp(tmpPos, 1 - Math.exp(-dt * 7));
      cam.position.copy(this.smoothPos);
      cam.up.set(Math.sin(s.bank) * 0.25 * Math.cos(s.yaw), 1, Math.sin(s.bank) * 0.25 * Math.sin(s.yaw)).normalize();
      cam.lookAt(tmpLook.copy(p).addScaledVector(f, 40).add(new THREE.Vector3(0, 1, 0)));
      cam.fov = 62 + (s.speed - 210) * 0.03;
    } else if (this.mode === 'COCKPIT') {
      // Sit in the cockpit and inherit the jet's full orientation (including rolls).
      player.model.getWorldQuaternion(tmpQ);
      cam.position.copy(p).add(new THREE.Vector3(0, 1.5, -4.2).applyQuaternion(tmpQ));
      cam.quaternion.copy(tmpQ);
      cam.fov = 70;
    } else {
      // OVERHEAD: straight down from high above, heading pointing up the screen.
      cam.position.set(p.x, p.y + 190, p.z);
      cam.up.set(Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      cam.lookAt(p.x, p.y, p.z);
      cam.fov = 55;
    }
    cam.updateProjectionMatrix();
    player.model.visible = this.mode !== 'COCKPIT' && !player.dead;
  }
}
