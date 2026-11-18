// Mouse + keyboard input.
// Mouse position (relative to screen centre) steers. A quick click = barrel roll,
// holding the left button (or Shift) = boost. Space = camera, F / right-click = missile.

const CLICK_MAX_MS = 220;

export class Input {
  constructor(target) {
    this.stickX = 0;
    this.stickY = 0;
    this.mouseDown = false;
    this.downAt = 0;
    this.shift = false;
    this.events = []; // queued discrete actions: 'roll', 'camera', 'missile', 'sound', 'fullscreen'
    this.hasMouse = false;

    target.addEventListener('mousemove', (e) => {
      this.hasMouse = true;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      this.stickX = shape(nx);
      this.stickY = shape(-ny);
    });
    target.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.downAt = performance.now();
      } else if (e.button === 2) {
        this.events.push('missile');
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || !this.mouseDown) return;
      this.mouseDown = false;
      if (performance.now() - this.downAt < CLICK_MAX_MS) {
        this.events.push(this.stickX < -0.05 ? 'roll-left' : 'roll-right');
      }
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'Space': this.events.push('camera'); e.preventDefault(); break;
        case 'KeyF': this.events.push('missile'); break;
        case 'KeyM': this.events.push('sound'); break;
        case 'KeyQ': this.events.push('roll-left'); break;
        case 'KeyE': this.events.push('roll-right'); break;
        case 'ShiftLeft': case 'ShiftRight': this.shift = true; break;
        default: break;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift = false;
    });
  }

  get boost() {
    const held = this.mouseDown && performance.now() - this.downAt >= CLICK_MAX_MS;
    return held || this.shift;
  }

  drain() {
    const ev = this.events;
    this.events = [];
    return ev;
  }
}

/** Deadzone + gentle curve so small mouse offsets give fine control. */
export function shape(v) {
  const dead = 0.04;
  const a = Math.abs(v);
  if (a < dead) return 0;
  const t = Math.min(1, (a - dead) / (0.85 - dead));
  return Math.sign(v) * t * (0.35 + 0.65 * t);
}
