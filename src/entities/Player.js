// The player's jet: flight state + procedural model + contrails.

import * as THREE from 'three';
import { buildJet, setFlameThrottle } from './jetModel.js';
import { createFlightState, stepFlight, startBarrelRoll, forwardVector } from './flight.js';
import { FLIGHT } from '../config.js';

export function applyOrientation(object, s, extraRoll = 0) {
  object.rotation.order = 'YXZ';
  object.rotation.set(s.pitch, -s.yaw, -(s.bank + extraRoll));
}

export class Player {
  constructor(scene) {
    this.state = createFlightState();
    const jet = buildJet();
    this.model = jet.group;
    this.flames = jet.flames;
    this.wingtips = jet.wingtips;
    scene.add(this.model);
    this.position = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.boosting = false;
    this.time = 0;
    this.dead = false;
    // what enemy missiles home in on
    this.target = { pos: this.position, alive: true };
  }

  /** Put a fresh jet in the air at (x, z), safely above the ground. */
  reset(x, z, yaw, groundHeight) {
    this.state = createFlightState({ x, z, yaw });
    this.state.y = Math.max(FLIGHT.startAltitude, Math.max(0, groundHeight(x, z)) + 400);
    this.dead = false;
    this.target.alive = true;
    this.update(0, { stickX: 0, stickY: 0, boost: false }, groundHeight);
  }

  kill() {
    this.dead = true;
    this.target.alive = false;
    this.model.visible = false;
  }

  barrelRoll(dir) {
    return startBarrelRoll(this.state, dir);
  }

  update(dt, input, groundHeight) {
    this.time += dt;
    this.boosting = input.boost;
    stepFlight(this.state, input, dt, groundHeight);
    const s = this.state;
    this.position.set(s.x, s.y, s.z);
    const f = forwardVector(s);
    this.forward.set(f.x, f.y, f.z);
    this.model.position.copy(this.position);
    applyOrientation(this.model, s, s.rollAngle);
    const throttle = (s.speed - FLIGHT.minSpeed) / (FLIGHT.boostSpeed - FLIGHT.minSpeed);
    setFlameThrottle(this.flames, Math.max(0, Math.min(1, throttle)), this.time);
    this.model.updateMatrixWorld(true);
  }
}
