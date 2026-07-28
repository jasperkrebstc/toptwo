import { createGame, refillPlayers, regenerateMap, update } from './game.js';
import { onSettingsChange } from './settings.js';
import { PLAYERS } from './config.js';
import { initInput } from './input.js';
import { startLoop } from './loop.js';
import { createViewRenderer } from './render.js';
import { initModeUI, initSettingsUI } from './ui.js';

const game = createGame();

// One camera per player, each drawing the same world from its own point of view.
const views = PLAYERS.map((def) => {
  const canvas = document.getElementById(def.canvasId);
  // Clicking a view hands keyboard focus back to the game, so keys always
  // work again after fiddling with a dev control.
  canvas.addEventListener('pointerdown', () => document.activeElement?.blur());
  return createViewRenderer(canvas, def.id);
});

initInput();

initSettingsUI(
  document.getElementById('settings-list'),
  document.getElementById('reset-settings'),
);
initModeUI(document.getElementById('mode-switch'));

// Raising a maximum should show up immediately while tuning, rather than only
// after the next death; changing the map settings should rebuild the map.
const REFILL_ON = new Set(['maxHealth', 'maxShield', 'maxStamina']);
const REGENERATE_ON = new Set([
  'worldSeed', 'worldSize', 'gridSize', 'obstacleClusters', 'clusterSize',
]);

onSettingsChange((id) => {
  if (id === null || REFILL_ON.has(id)) refillPlayers(game);
  if (id === null || REGENERATE_ON.has(id)) regenerateMap(game);
});

startLoop({
  update: (dt) => update(game, dt),
  render: () => {
    for (const render of views) render(game);
  },
});

// Debug hook: inspect and poke at live state from the browser console,
// e.g. `game.players[0].x = 100`.
window.game = game;
