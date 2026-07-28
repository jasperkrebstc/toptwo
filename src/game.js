import { PLAYERS } from './config.js';
import { createPlayer, resetPlayer, updatePlayer } from './player.js';
import { updateBullets } from './bullet.js';

/**
 * The whole game state lives here. Everything that will be added later
 * (pickups, scores) hangs off this object and gets stepped from update().
 */
export function createGame() {
  return {
    players: PLAYERS.map(createPlayer),
    bullets: [],
  };
}

/** Advance the world by a fixed `dt` in seconds. */
export function update(game, dt) {
  for (const player of game.players) {
    updatePlayer(player, dt, game);
  }
  updateBullets(game, dt);
}

export function resetGame(game) {
  for (const player of game.players) resetPlayer(player);
  game.bullets.length = 0;
}
