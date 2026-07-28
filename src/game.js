import { PLAYERS } from './config.js';
import { createPlayer, resetPlayer, updatePlayer } from './player.js';

/**
 * The whole game state lives here. Everything that will be added later
 * (bullets, pickups, scores) hangs off this object and gets stepped from
 * update() below.
 */
export function createGame() {
  return {
    players: PLAYERS.map(createPlayer),
  };
}

/** Advance the world by a fixed `dt` in seconds. */
export function update(game, dt) {
  for (const player of game.players) {
    updatePlayer(player, dt);
  }
}

export function resetGame(game) {
  for (const player of game.players) resetPlayer(player);
}
