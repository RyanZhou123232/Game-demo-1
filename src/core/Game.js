// Wires everything together and runs the main loop.

import * as THREE from 'three';
import { PALETTE, WORLD, FLIGHT, COMBAT, THREAT, MS_TO_KT, M_TO_FT } from '../config.js';
import { createHeightfield } from '../world/heightfield.js';
import { Terrain } from '../world/Terrain.js';
import { Water } from '../world/Water.js';
import { Sky } from '../world/Sky.js';
import { Clouds } from '../world/Clouds.js';
import { Player } from '../entities/Player.js';
import { Enemies } from '../entities/Enemies.js';
import { Missiles } from '../entities/Missiles.js';
import { createMagazine, tickMagazine, useMissile, findLockTarget } from '../entities/combat.js';
import { headingDegrees } from '../entities/flight.js';
import {
  createMission, tickMission, applyDamage, crash, registerKill, nextWave, restartMission,
  groundWarning, isCrash, rollBreaksLock,
} from '../entities/mission.js';
import { Particles } from '../fx/Particles.js';
import { Contrails } from '../fx/Contrails.js';
import { PixelPass } from '../render/PixelPass.js';
import { CameraRig } from './CameraRig.js';
import { Input } from './Input.js';
import { Hud } from '../ui/Hud.js';
import { drawCockpit, drawTargets } from '../ui/Cockpit.js';
import { Sound } from '../audio/Sound.js';

const tmp = new THREE.Vector3();
const BAR_HEIGHT = 22; // keep in sync with --bar-h in hud.css

export class Game {
  constructor({ canvas, overlay, hudRoot }) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.octx = overlay.getContext('2d');

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.pixelPass = new PixelPass(this.renderer);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fogNear, WORLD.fogFar);
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 2, 30000);

    const sunDir = new THREE.Vector3(-0.6, 0.35, -0.7).normalize();
    this.scene.add(new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 1.6));
    const sun = new THREE.DirectionalLight(PALETTE.sun, 2.2);
    sun.position.copy(sunDir).multiplyScalar(1000);
    this.scene.add(sun);

    this.field = createHeightfield(WORLD.seed);
    this.groundHeight = (x, z) => this.field.heightAt(x, z);
    this.terrain = new Terrain(this.scene, this.field);
    this.water = new Water(this.scene);
    this.sky = new Sky(this.scene, sunDir);
    this.clouds = new Clouds(this.scene);

    this.player = new Player(this.scene);
    const s = this.player.state;
    s.y = Math.max(FLIGHT.startAltitude, this.groundHeight(s.x, s.z) + 350);
    this.particles = new Particles(this.scene);
    this.contrails = new Contrails(this.scene, this.player.wingtips);
    this.enemies = new Enemies(this.scene);
    this.missiles = new Missiles(this.scene, this.particles);
    this.magazine = createMagazine(COMBAT.maxMissiles, COMBAT.missileReload);
    this.mission = createMission();
    this.warnTimer = 0;
    this.endTimer = 0;

    this.rig = new CameraRig(this.camera);
    this.input = new Input(canvas.parentElement);
    this.sound = new Sound();
    this.started = false;
    this.time = 0;

    this.hud = new Hud(hudRoot, {
      onSound: () => this.hud.setSound(this.sound.toggle()),
      onFullscreen: () => this.toggleFullscreen(),
      onStart: () => this.beginMission(),
      onEnd: () => this.continueAfterEnd(),
    });
    this.hud.setCamera(this.rig.index);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.terrain.update(s.x, s.z);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight - BAR_HEIGHT;
    const low = this.pixelPass.setSize(w, h);
    this.overlay.width = low.w;
    this.overlay.height = low.h;
    this.low = low;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  start() {
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.step(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  handleEvents() {
    for (const ev of this.input.drain()) {
      if (!this.started) continue;
      if (ev === 'camera') {
        this.rig.cycle();
        this.hud.setCamera(this.rig.index);
        continue;
      }
      if (ev === 'sound') {
        this.hud.setSound(this.sound.toggle());
        continue;
      }
      if (this.player.dead) continue;
      if (ev === 'roll-left' || ev === 'roll-right') {
        if (this.player.barrelRoll(ev === 'roll-left' ? -1 : 1)) {
          this.sound.roll();
          this.tryEvade();
        }
      } else if (ev === 'missile') {
        this.fireMissile();
      }
    }
  }

  fireMissile() {
    if (!useMissile(this.magazine)) {
      this.hud.toast('RELOADING', 700);
      return;
    }
    this.missiles.firePlayer(this.player, this.enemies);
    this.sound.missile();
  }

  // ---------------------------------------------------------------- mission flow

  beginMission() {
    this.started = true;
    restartMission(this.mission);
    this.enemies.spawnAll(this.player.position, this.player.state.yaw, this.groundHeight, 1);
    this.hud.setWave(1);
    this.hud.toast('WAVE 1', 1400);
  }

  /** Barrel roll: last-second dodge against close incoming missiles. */
  tryEvade() {
    let shaken = 0;
    for (const m of this.missiles.chasing(this.player.target)) {
      if (rollBreaksLock(m.pos.distanceTo(this.player.position))) {
        m.target = null; // flies straight on and fizzles
        shaken++;
      }
    }
    if (shaken) this.hud.toast(shaken > 1 ? 'MISSILES EVADED' : 'MISSILE EVADED', 1000);
  }

  playerDestroyed() {
    this.player.kill();
    this.particles.explosion(this.player.position, 1.4);
    this.sound.explosion();
    this.endTimer = 1.6; // let the explosion play before the screen
  }

  continueAfterEnd() {
    const p = this.player.position;
    if (this.mission.phase === 'dead') {
      // fresh start: new jet, wave 1
      this.missiles.clear();
      this.contrails.reset();
      this.player.reset(p.x, p.z, this.player.state.yaw, this.groundHeight);
      this.rig.initialised = false;
      restartMission(this.mission);
      this.magazine.count = this.magazine.max;
    } else {
      nextWave(this.mission);
    }
    this.enemies.spawnAll(this.player.position, this.player.state.yaw, this.groundHeight, this.mission.wave);
    this.hud.setWave(this.mission.wave);
    this.hud.toast(`WAVE ${this.mission.wave}`, 1400);
  }

  // ---------------------------------------------------------------- main step

  step(dt) {
    this.time += dt;
    this.handleEvents();
    const m = this.mission;
    const playing = this.started && m.phase === 'playing';
    const input = this.started
      ? { stickX: this.input.stickX, stickY: this.input.stickY, boost: this.input.boost }
      : { stickX: Math.sin(this.time * 0.3) * 0.25, stickY: 0, boost: false }; // gentle attract-mode turn

    if (!this.player.dead) this.player.update(dt, input, this.groundHeight);
    const p = this.player.position;
    const s = this.player.state;
    this.terrain.update(p.x, p.z);
    this.water.update(dt, p.x, p.z);
    this.clouds.update(dt, p.x, p.z);
    tickMission(m, dt);

    this.enemies.update(dt, {
      playerPos: p,
      playerYaw: s.yaw,
      playerForward: this.player.forward,
      playerSpeed: s.speed,
      groundHeight: this.groundHeight,
      engage: playing,
      grace: m.grace,
      hostileMissiles: this.missiles.hostileCount,
      onFire: (enemy) => {
        const d = this.enemies.difficulty;
        this.missiles.launch({
          pos: enemy.pos.clone().addScaledVector(enemy.forward, 12),
          dir: enemy.forward,
          speed: d.enemySpeed + 80,
          target: this.player.target,
          hostile: true,
          maxSpeed: d.missileSpeed,
          turnRate: d.missileTurnRate,
          life: THREAT.missileLife,
          hitRadius: THREAT.hitRadius,
        });
        this.sound.missile();
      },
    });

    this.missiles.update(dt, this.groundHeight, (target, pos) => {
      if (target === this.player.target) {
        this.particles.explosion(pos, 0.7);
        this.sound.hit();
        if (applyDamage(m, THREAT.missileDamage, 'MISSILE')) this.playerDestroyed();
        else this.hud.toast('HIT', 600);
        return;
      }
      this.enemies.kill(target);
      this.particles.explosion(pos, 1);
      this.sound.explosion();
      if (registerKill(m)) {
        this.hud.toast('SQUADRON DOWN', 1400);
        this.endTimer = 1.5;
      } else {
        this.hud.toast('SPLASH ONE');
      }
    });

    // terrain
    const altitude = s.y - Math.max(0, this.groundHeight(s.x, s.z));
    if (playing && !this.player.dead && isCrash(altitude) && crash(m)) this.playerDestroyed();

    // end screens appear after a short beat
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        if (m.phase === 'dead') {
          this.hud.showEnd('SHOT DOWN', m.cause === 'TERRAIN'
            ? `YOU HIT THE GROUND · REACHED WAVE ${m.wave}`
            : `DESTROYED BY A MISSILE · REACHED WAVE ${m.wave}`);
        } else if (m.phase === 'complete') {
          this.hud.showEnd('MISSION COMPLETE', `WAVE ${m.wave} CLEARED · NEXT WAVE IS FASTER`);
        }
      }
    }

    this.updateWarnings(dt, playing, altitude);

    tickMagazine(this.magazine, dt);
    this.particles.update(dt);
    this.contrails.update(dt);

    this.rig.update(dt, this.player, this.groundHeight);
    this.sky.update(this.camera);
    this.contrails.setVisible(this.rig.mode !== 'COCKPIT' && !this.player.dead);

    const throttle = (s.speed - FLIGHT.minSpeed) / (FLIGHT.boostSpeed - FLIGHT.minSpeed);
    this.throttle = Math.max(0, Math.min(1, throttle));
    this.sound.update(this.player.dead ? 0 : this.throttle);
    this.hud.update(headingDegrees(s), s.speed, m.kills);
    this.hud.setHealth(m.health / THREAT.maxHealth);
  }

  /** MISSILE / PULL UP warnings with beeps that speed up as danger grows. */
  updateWarnings(dt, playing, altitude) {
    if (!playing || this.player.dead) {
      this.hud.setWarning('');
      return;
    }
    const incoming = this.missiles.chasing(this.player.target);
    let nearest = Infinity;
    for (const mm of incoming) nearest = Math.min(nearest, mm.pos.distanceTo(this.player.position));
    const low = groundWarning(altitude, this.player.state.verticalSpeed);

    let text = '';
    let interval = 0;
    let freq = 0;
    if (incoming.length) {
      text = 'MISSILE';
      interval = Math.max(0.08, Math.min(0.6, nearest / 3000));
      freq = 1400;
    } else if (low) {
      text = 'PULL UP';
      interval = 0.35;
      freq = 700;
    }
    this.hud.setWarning(text);
    if (interval) {
      this.warnTimer -= dt;
      if (this.warnTimer <= 0) {
        this.sound.beep(freq);
        this.warnTimer = interval;
      }
    } else {
      this.warnTimer = 0;
    }
  }

  render() {
    this.pixelPass.render(this.scene, this.camera);
    this.drawOverlay();
  }

  drawOverlay() {
    const ctx = this.octx;
    const { w, h } = this.low;
    ctx.clearRect(0, 0, w, h);
    if (!this.started) return;

    // target brackets
    const lock = findLockTarget(this.player.position, this.player.forward, this.enemies.list,
      COMBAT.lockRange, COMBAT.lockConeDeg);
    const markers = [];
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      tmp.copy(e.pos).project(this.camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1) continue;
      const dist = e.pos.distanceTo(this.player.position);
      markers.push({
        x: (tmp.x * 0.5 + 0.5) * w,
        y: (-tmp.y * 0.5 + 0.5) * h,
        locked: e === lock,
        label: e === lock ? `${(dist / 1000).toFixed(1)}KM` : '',
      });
    }
    drawTargets(ctx, w, h, markers);

    if (this.rig.mode === 'COCKPIT') {
      const s = this.player.state;
      const fwd = { x: Math.sin(s.yaw), z: -Math.cos(s.yaw) };
      const right = { x: Math.cos(s.yaw), z: Math.sin(s.yaw) };
      const range = 6000;
      const radar = this.enemies.list.filter((e) => e.alive).map((e) => {
        const dx = e.pos.x - s.x, dz = e.pos.z - s.z;
        const rx = (dx * right.x + dz * right.z) / range;
        const fy = (dx * fwd.x + dz * fwd.z) / range;
        return { x: Math.max(-1, Math.min(1, rx)), y: Math.max(-1, Math.min(1, -fy)) };
      });
      drawCockpit(ctx, w, h, {
        heading: headingDegrees(s), pitch: s.pitch, bank: s.bank + s.rollAngle,
        speedKt: s.speed * MS_TO_KT, altFt: s.y * M_TO_FT, vs: s.verticalSpeed, g: s.g,
        missiles: this.magazine.count, throttle: this.throttle, radar, time: this.time,
      });
    }
  }
}
