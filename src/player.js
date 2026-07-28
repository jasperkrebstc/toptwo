import { BASE_SPEED, PLAYER_RADIUS, WORLD_SIZE } from './config.js';
import { isDown } from './input.js';
import { settings } from './settings.js';

/** Build a player instance from its static definition in config.js. */
export function createPlayer(def) {
  return {
    def,
    id: def.id,
    color: def.color,
    x: def.spawn.x,
    y: def.spawn.y,
    radius: PLAYER_RADIUS,
    // Movement direction this frame, normalised. Zero when standing still.
    dx: 0,
    dy: 0,
    // Last non-zero movement direction: this is what the player "looks" at,
    // and what bullets will be fired along once shooting exists.
    facingX: 1,
    facingY: 0,
  };
}

export function resetPlayer(player) {
  player.x = player.def.spawn.x;
  player.y = player.def.spawn.y;
  player.dx = 0;
  player.dy = 0;
  player.facingX = 1;
  player.facingY = 0;
}

/** Advance one player by `dt` seconds. */
export function updatePlayer(player, dt) {
  const keys = player.def.keys;

  let dx = 0;
  let dy = 0;
  if (isDown(keys.left)) dx -= 1;
  if (isDown(keys.right)) dx += 1;
  if (isDown(keys.up)) dy -= 1;   // canvas y grows downward
  if (isDown(keys.down)) dy += 1;

  // Normalise so diagonals aren't ~41% faster than the cardinals.
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
    player.facingX = dx;
    player.facingY = dy;
  }

  player.dx = dx;
  player.dy = dy;

  const speed = BASE_SPEED * settings.speedMultiplier;
  player.x += dx * speed * dt;
  player.y += dy * speed * dt;

  // Keep the whole dot inside the square.
  const r = player.radius;
  player.x = Math.min(WORLD_SIZE - r, Math.max(r, player.x));
  player.y = Math.min(WORLD_SIZE - r, Math.max(r, player.y));
}
