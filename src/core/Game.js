// Wires everything together and runs the main loop.

import * as THREE from 'three';
import { PALETTE, WORLD, FLIGHT, COMBAT, MS_TO_KT, M_TO_FT } from '../config.js';
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
    this.kills = 0;

    this.rig = new CameraRig(this.camera);
    this.input = new Input(canvas.parentElement);
    this.sound = new Sound();
    this.started = false;
    this.time = 0;

    this.hud = new Hud(hudRoot, {
      onSound: () => this.hud.setSound(this.sound.toggle()),
      onFullscreen: () => this.toggleFullscreen(),
      onStart: () => { this.started = true; },
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
      if (ev === 'roll-left' || ev === 'roll-right') {
        if (this.player.barrelRoll(ev === 'roll-left' ? -1 : 1)) this.sound.roll();
      } else if (ev === 'camera') {
        this.rig.cycle();
        this.hud.setCamera(this.rig.index);
      } else if (ev === 'missile') {
        this.fireMissile();
      } else if (ev === 'sound') {
        this.hud.setSound(this.sound.toggle());
      }
    }
  }

  fireMissile() {
    if (!useMissile(this.magazine)) {
      this.hud.toast('RELOADING', 700);
      return;
    }
    this.missiles.fire(this.player, this.enemies);
    this.sound.missile();
  }

  step(dt) {
    this.time += dt;
    this.handleEvents();
    const input = this.started
      ? { stickX: this.input.stickX, stickY: this.input.stickY, boost: this.input.boost }
      : { stickX: Math.sin(this.time * 0.3) * 0.25, stickY: 0, boost: false }; // gentle attract-mode turn

    this.player.update(dt, input, this.groundHeight);
    const p = this.player.position;
    this.terrain.update(p.x, p.z);
    this.water.update(dt, p.x, p.z);
    this.clouds.update(dt, p.x, p.z);
    this.enemies.update(dt, p, this.player.state.yaw, this.groundHeight);
    this.missiles.update(dt, this.groundHeight, (enemy, pos) => {
      this.enemies.kill(enemy);
      this.particles.explosion(pos, 1);
      this.sound.explosion();
      this.kills = this.enemies.destroyed;
      this.hud.toast(this.kills >= COMBAT.enemyCount ? 'SQUADRON DOWN' : 'SPLASH ONE');
    });
    if (this.enemies.destroyed === 0) this.kills = 0;
    tickMagazine(this.magazine, dt);
    this.particles.update(dt);
    this.contrails.update(dt);

    this.rig.update(dt, this.player);
    this.sky.update(this.camera);
    this.contrails.setVisible(this.rig.mode !== 'COCKPIT');

    const s = this.player.state;
    const throttle = (s.speed - FLIGHT.minSpeed) / (FLIGHT.boostSpeed - FLIGHT.minSpeed);
    this.sound.update(Math.max(0, Math.min(1, throttle)));
    this.hud.update(headingDegrees(s), s.speed, this.kills);
    this.throttle = Math.max(0, Math.min(1, throttle));
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
