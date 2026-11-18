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
