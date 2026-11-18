// DOM overlay: camera tag (top-left), heading/speed (top-right), bottom control bar,
// kill counter, hull bar, wave, warnings, sound + fullscreen buttons, start/end screens
// and short toasts.

import { MS_TO_KT, COMBAT, CAMERA_MODES } from '../config.js';

export function formatCameraTag(index) {
  return `${String(index + 1).padStart(2, '0')} / ${CAMERA_MODES[index]}`;
}

export function formatHeadingSpeed(headingDeg, speedMs) {
  const hdg = String(Math.round(headingDeg) % 360).padStart(3, '0');
  return `${hdg}°  ${Math.round(speedMs * MS_TO_KT)} KT`;
}

export class Hud {
  constructor(root, { onSound, onFullscreen, onStart, onEnd }) {
    root.innerHTML = `
      <div class="tag left" id="camTag"></div>
      <div class="tag right" id="navTag"></div>
      <div class="toast" id="toast"></div>
      <div class="warning" id="warning"></div>
      <div class="bar">
        <span class="logo">DUSK PATROL</span>
        <span class="hint"><b>Mouse</b>Steer</span>
        <span class="hint"><b>Click</b>Roll</span>
        <span class="hint"><b>Hold</b>Boost</span>
        <span class="hint"><b>Space</b>Camera</span>
        <span class="hint"><b>F / RMB</b>Missile</span>
        <span class="spacer"></span>
        <span class="wave" id="waveText">WAVE 1</span>
        <span class="hull"><span class="label">HULL</span><span class="meter"><span id="hullFill"></span></span></span>
        <span class="kills"><span class="pips" id="pips"></span><span id="killText">0/${COMBAT.enemyCount}</span></span>
        <button id="soundBtn">\u{1F508}︎ SOUND OFF</button>
        <button id="fsBtn">⛶ FULLSCREEN</button>
      </div>
      <div class="start" id="start">
        <h1>DUSK PATROL</h1>
        <p>CLICK TO FLY</p>
        <p style="opacity:.7">MOUSE STEER · CLICK ROLL · HOLD BOOST · SPACE CAMERA · F MISSILE</p>
        <p style="opacity:.7">ENEMIES FIRE BACK · BARREL ROLL AT THE LAST SECOND TO DODGE MISSILES</p>
      </div>
      <div class="start end hidden" id="end">
        <h1 id="endTitle"></h1>
        <p id="endSub"></p>
        <p class="blink">CLICK TO CONTINUE</p>
      </div>`;
    this.camTag = root.querySelector('#camTag');
    this.navTag = root.querySelector('#navTag');
    this.killText = root.querySelector('#killText');
    this.pips = root.querySelector('#pips');
    this.soundBtn = root.querySelector('#soundBtn');
    this.fsBtn = root.querySelector('#fsBtn');
    this.toastEl = root.querySelector('#toast');
    this.startEl = root.querySelector('#start');
    this.warningEl = root.querySelector('#warning');
    this.waveText = root.querySelector('#waveText');
    this.hullFill = root.querySelector('#hullFill');
    this.endEl = root.querySelector('#end');
    this.endTitle = root.querySelector('#endTitle');
    this.endSub = root.querySelector('#endSub');
    this.endEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (!this.endReady) return;
      this.hideEnd();
      onEnd?.();
    });

    for (let i = 0; i < COMBAT.enemyCount; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      this.pips.appendChild(pip);
    }
    const stop = (e) => e.stopPropagation();
    this.soundBtn.addEventListener('mousedown', stop);
    this.fsBtn.addEventListener('mousedown', stop);
    this.soundBtn.addEventListener('click', () => onSound());
    this.fsBtn.addEventListener('click', () => onFullscreen());
    this.startEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startEl.classList.add('hidden');
      onStart();
    });
    document.addEventListener('fullscreenchange', () => {
      this.fsBtn.textContent = document.fullscreenElement ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
    });
    this.lastKills = -1;
  }

  setCamera(index) {
    this.camTag.textContent = formatCameraTag(index);
  }

  setSound(on) {
    this.soundBtn.textContent = on ? '\u{1F50A}︎ SOUND ON' : '\u{1F508}︎ SOUND OFF';
  }

  toast(text, ms = 1600) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  setWave(n) {
    this.waveText.textContent = `WAVE ${n}`;
  }

  setHealth(frac) {
    const f = Math.max(0, Math.min(1, frac));
    this.hullFill.style.width = `${Math.round(f * 100)}%`;
    this.hullFill.classList.toggle('low', f < 0.35);
  }

  /** text: string to flash in the middle of the screen, or '' to hide. */
  setWarning(text) {
    if (text === this.lastWarning) return;
    this.lastWarning = text;
    this.warningEl.textContent = text;
    this.warningEl.classList.toggle('show', !!text);
  }

  showEnd(title, sub, delayMs = 900) {
    this.endTitle.textContent = title;
    this.endSub.textContent = sub;
    this.endEl.classList.remove('hidden');
    this.endReady = false; // ignore the click that may still be held from flying
    clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => { this.endReady = true; }, delayMs);
  }

  hideEnd() {
    this.endEl.classList.add('hidden');
  }

  update(headingDeg, speedMs, kills) {
    this.navTag.textContent = formatHeadingSpeed(headingDeg, speedMs);
    if (kills !== this.lastKills) {
      this.lastKills = kills;
      this.killText.textContent = `${kills}/${COMBAT.enemyCount}`;
      [...this.pips.children].forEach((p, i) => p.classList.toggle('on', i < kills));
    }
  }
}
