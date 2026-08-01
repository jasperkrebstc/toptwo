import { MAX_PLAYERS, PLAYERS } from './config.js';
import { settings } from './settings.js';
import { getMode } from './mode.js';
import { createPlayer, refillStats, resetPlayer, updatePlayer, updateTrail } from './player.js';
import { updateBullets } from './bullet.js';
import { resolveHits } from './combat.js';
import { generateObstacles } from './obstacles.js';
import { generateTrack } from './track.js';
import { countLaps, createRace, resetRace, tickRace } from './race.js';

/**
 * The whole game state lives here. Both modes share the players, the physics
 * and the dev panel; the mode decides which of the rest is in play.
 */
export function createGame() {
  const game = {
    mode: getMode(),
    players: [],
    bullets: [],
    obstacles: [],
    track: null,
    race: createRace(),
    inputLocked: false,
  };
  rebuild(game);
  return game;
}

/** Build the world for the current mode from scratch. */
export function rebuild(game) {
  game.mode = getMode();
  game.players = activePlayerDefs().map(createPlayer);
  game.bullets.length = 0;

  if (game.mode === 'race') {
    game.obstacles = [];
    game.track = generateTrack();
    resetRace(game);
  } else {
    game.track = null;
    game.obstacles = generateObstacles();
    game.inputLocked = false;
  }
}

function activePlayerDefs() {
  const count = Math.min(MAX_PLAYERS, Math.max(2, Math.round(settings.playerCount)));
  return PLAYERS.slice(0, count);
}

/** Advance the world by a fixed `dt` in seconds. */
export function update(game, dt) {
  if (game.mode === 'race') {
    tickRace(game, dt);
    for (const player of game.players) {
      updatePlayer(player, dt, game);
      updateTrail(player, dt);
    }
    countLaps(game);
    return;
  }

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

/** Top players back up — used when the health or shield maximum changes. */
export function refillPlayers(game) {
  for (const player of game.players) refillStats(player);
}

/** Rebuild the roster after the player count changes. */
export function rebuildPlayers(game) {
  game.players = activePlayerDefs().map(createPlayer);
  game.bullets.length = 0;
  if (game.mode === 'race') resetRace(game);
}

/** Rebuild the map — used when the seed or any map setting changes. */
export function regenerateMap(game) {
  if (game.mode === 'race') {
    game.track = generateTrack();
    resetRace(game);
    return;
  }
  game.obstacles = generateObstacles();
  game.bullets.length = 0;
}
