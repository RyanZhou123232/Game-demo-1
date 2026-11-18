// DOM overlay: camera tag (top-left), heading/speed (top-right), bottom control bar,
// kill counter, sound + fullscreen buttons, start screen and short toasts.

import { MS_TO_KT, COMBAT, CAMERA_MODES } from '../config.js';

export function formatCameraTag(index) {
  return `${String(index + 1).padStart(2, '0')} / ${CAMERA_MODES[index]}`;
}

export function formatHeadingSpeed(headingDeg, speedMs) {
  const hdg = String(Math.round(headingDeg) % 360).padStart(3, '0');
  return `${hdg}°  ${Math.round(speedMs * MS_TO_KT)} KT`;
}

export class Hud {
  constructor(root, { onSound, onFullscreen, onStart }) {
    root.innerHTML = `
      <div class="tag left" id="camTag"></div>
      <div class="tag right" id="navTag"></div>
      <div class="toast" id="toast"></div>
      <div class="bar">
        <span class="logo">DUSK PATROL</span>
        <span class="hint"><b>Mouse</b>Steer</span>
        <span class="hint"><b>Click</b>Roll</span>
        <span class="hint"><b>Hold</b>Boost</span>
        <span class="hint"><b>Space</b>Camera</span>
        <span class="hint"><b>F / RMB</b>Missile</span>
        <span class="spacer"></span>
        <span class="kills"><span class="pips" id="pips"></span><span id="killText">0/${COMBAT.enemyCount}</span></span>
        <button id="soundBtn">\u{1F508}︎ SOUND OFF</button>
        <button id="fsBtn">⛶ FULLSCREEN</button>
      </div>
      <div class="start" id="start">
        <h1>DUSK PATROL</h1>
        <p>CLICK TO FLY</p>
        <p style="opacity:.7">MOUSE STEER · CLICK ROLL · HOLD BOOST · SPACE CAMERA · F MISSILE</p>
      </div>`;
    this.camTag = root.querySelector('#camTag');
    this.navTag = root.querySelector('#navTag');
    this.killText = root.querySelector('#killText');
    this.pips = root.querySelector('#pips');
    this.soundBtn = root.querySelector('#soundBtn');
    this.fsBtn = root.querySelector('#fsBtn');
    this.toastEl = root.querySelector('#toast');
    this.startEl = root.querySelector('#start');

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

  update(headingDeg, speedMs, kills) {
    this.navTag.textContent = formatHeadingSpeed(headingDeg, speedMs);
    if (kills !== this.lastKills) {
      this.lastKills = kills;
      this.killText.textContent = `${kills}/${COMBAT.enemyCount}`;
      [...this.pips.children].forEach((p, i) => p.classList.toggle('on', i < kills));
    }
  }
}
