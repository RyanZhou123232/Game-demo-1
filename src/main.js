import { Game } from './core/Game.js';

const game = new Game({
  canvas: document.getElementById('game'),
  overlay: document.getElementById('overlay'),
  hudRoot: document.getElementById('hud'),
});
game.start();

// Handy for debugging in the browser console: window.game
window.game = game;
