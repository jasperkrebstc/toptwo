import { MAX_PLAYERS, PLAYERS } from './config.js';
import { settings } from './settings.js';
import { createPlayer, refillStats, resetPlayer, updatePlayer } from './player.js';
import { updateBullets } from './bullet.js';
import { resolveHits } from './combat.js';
import { generateObstacles } from './obstacles.js';

/**
 * The whole game state lives here. Everything that will be added later
 * (pickups, scores) hangs off this object and gets stepped from update().
 */
export function createGame() {
  return {
    players: activePlayerDefs().map(createPlayer),
    bullets: [],
    obstacles: generateObstacles(),
  };
}

function activePlayerDefs() {
  const count = Math.min(MAX_PLAYERS, Math.max(2, Math.round(settings.playerCount)));
  return PLAYERS.slice(0, count);
}

/** Rebuild the roster after the player count changes. */
export function rebuildPlayers(game) {
  game.players = activePlayerDefs().map(createPlayer);
  game.bullets.length = 0;
}

/** Advance the world by a fixed `dt` in seconds. */
export function update(game, dt) {
  for (const player of game.players) {
    updatePlayer(player, dt, game);
  }
  updateBullets(game, dt);
  resolveHits(game);
}

export function resetGame(game) {
  for (const player of game.players) resetPlayer(player);
  game.bullets.length = 0;
}

/** Top both players back up — used when the health or shield maximum changes. */
export function refillPlayers(game) {
  for (const player of game.players) refillStats(player);
}

/** Rebuild the map — used when the seed or any map setting changes. */
export function regenerateMap(game) {
  game.obstacles = generateObstacles();
  game.bullets.length = 0;
}
