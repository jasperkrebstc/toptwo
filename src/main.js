import { createGame, rebuildPlayers, refillPlayers, regenerateMap, update } from './game.js';
import { onSettingsChange, settings } from './settings.js';
import { PLAYERS } from './config.js';
import { initInput } from './input.js';
import { startLoop } from './loop.js';
import { createViewRenderer } from './render.js';
import { initModeUI, initProfilesUI, initSettingsUI } from './ui.js';

const game = createGame();

// One camera per player, each drawing the same world from its own point of view.
const views = PLAYERS.map((def) => {
  const canvas = document.getElementById(def.canvasId);
  // Clicking a view hands keyboard focus back to the game, so keys always
  // work again after fiddling with a dev control.
  canvas.addEventListener('pointerdown', () => document.activeElement?.blur());
  return {
    id: def.id,
    figure: canvas.closest('.view'),
    render: createViewRenderer(canvas, def.id),
  };
});

initInput();
initProfilesUI(document.getElementById('panel-left'));
initSettingsUI(
  document.getElementById('settings-list'),
  document.getElementById('reset-settings'),
);
initModeUI(document.getElementById('mode-switch'));

/** Show a viewport per player in the game, and lay them out in one or two rows. */
function syncViews() {
  const active = new Set(game.players.map((player) => player.id));
  for (const view of views) {
    view.figure.hidden = !active.has(view.id);
  }
  document.body.dataset.rows = game.players.length > 2 ? '2' : '1';
}

// Raising a maximum should show up immediately while tuning, rather than only
// after the next death; changing the map settings should rebuild the map.
const REFILL_ON = new Set(['maxHealth', 'maxShield', 'maxStamina']);
const REGENERATE_ON = new Set([
  'worldSeed', 'worldSize', 'gridSize', 'obstacleClusters', 'clusterSize',
]);

onSettingsChange((id) => {
  if (id === null || id === 'playerCount') {
    if (game.players.length !== Math.round(settings.playerCount)) {
      rebuildPlayers(game);
      syncViews();
    }
  }
  if (id === null || REFILL_ON.has(id)) refillPlayers(game);
  if (id === null || REGENERATE_ON.has(id)) regenerateMap(game);
});

syncViews();

startLoop({
  update: (dt) => update(game, dt),
  render: () => {
    for (const view of views) {
      if (!view.figure.hidden) view.render(game);
    }
  },
});

// Debug hook: inspect and poke at live state from the browser console,
// e.g. `game.players[0].x = 100`.
window.game = game;
