import { createGame, update } from './game.js';
import { initInput } from './input.js';
import { startLoop } from './loop.js';
import { createRenderer } from './render.js';
import { initModeUI, initSettingsUI } from './ui.js';

const canvas = document.getElementById('game');
const game = createGame();
const render = createRenderer(canvas);

initInput();

// Clicking the world hands keyboard focus back to the game, so keys always
// work again after fiddling with a dev control.
canvas.addEventListener('pointerdown', () => document.activeElement?.blur());

initSettingsUI(
  document.getElementById('settings-list'),
  document.getElementById('reset-settings'),
);
initModeUI(document.getElementById('mode-switch'));

startLoop({
  update: (dt) => update(game, dt),
  render: () => render(game),
});

// Debug hook: inspect and poke at live state from the browser console,
// e.g. `game.players[0].x = 100`.
window.game = game;
