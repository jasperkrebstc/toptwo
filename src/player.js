import { BASE_SPEED, DIRECTIONS, PLAYER_RADIUS, WORLD_SIZE } from './config.js';
import { isDown, pressLog } from './input.js';
import { settings } from './settings.js';
import { spawnBullet } from './bullet.js';
import { regenShield } from './combat.js';

const DIRECTION_NAMES = Object.keys(DIRECTIONS);

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
    // and the direction bullets are fired along.
    facingX: 1,
    facingY: 0,
    fireCooldownLeft: 0,
    dashCooldownLeft: 0,
    dashTimeLeft: 0,
    dashDirX: 0,
    dashDirY: 0,
    dashSpeed: 0,
    health: settings.maxHealth,
    shield: settings.maxShield,
    // Seconds since this player last took damage; drives shield recovery.
    timeSinceHit: Infinity,
    alive: true,
    deadTimeLeft: 0,
    deaths: 0,
    // Press count per direction we've already reacted to, for double-tap detection.
    seenPresses: emptyPressCounts(),
  };
}

export function resetPlayer(player) {
  player.x = player.def.spawn.x;
  player.y = player.def.spawn.y;
  player.dx = 0;
  player.dy = 0;
  player.facingX = 1;
  player.facingY = 0;
  player.fireCooldownLeft = 0;
  player.dashCooldownLeft = 0;
  player.dashTimeLeft = 0;
  refillStats(player);
}

/** Back to full health and shield — on respawn, or when the max sliders move. */
export function refillStats(player) {
  player.health = settings.maxHealth;
  player.shield = settings.maxShield;
  player.timeSinceHit = Infinity;
  player.alive = true;
  player.deadTimeLeft = 0;
}

/** Advance one player by `dt` seconds. */
export function updatePlayer(player, dt, game) {
  if (!player.alive) {
    player.deadTimeLeft -= dt;
    if (player.deadTimeLeft <= 0) resetPlayer(player);
    return;
  }

  regenShield(player, dt);
  player.fireCooldownLeft = Math.max(0, player.fireCooldownLeft - dt);
  player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - dt);

  detectDash(player);

  if (player.dashTimeLeft > 0) {
    moveDashing(player, dt);
  } else {
    moveWalking(player, dt);
  }

  clampToWorld(player);
  handleShooting(player, game);
}

/**
 * A dash is two quick taps of the same direction key. We watch the press
 * count for each direction; when it changes, a new press happened, and if it
 * landed close enough behind the previous one it's a double tap.
 */
function detectDash(player) {
  for (const name of DIRECTION_NAMES) {
    const log = pressLog(player.def.keys[name]);
    if (log.count === player.seenPresses[name]) continue;

    player.seenPresses[name] = log.count;
    if (log.last - log.prev <= settings.doubleTapWindow) startDash(player, name);
  }
}

function startDash(player, directionName) {
  if (player.dashTimeLeft > 0 || player.dashCooldownLeft > 0) return;

  const dir = DIRECTIONS[directionName];
  player.dashDirX = dir.x;
  player.dashDirY = dir.y;
  player.facingX = dir.x;
  player.facingY = dir.y;
  player.dashTimeLeft = settings.dashDuration;
  player.dashCooldownLeft = settings.dashCooldown;
  // Freeze the speed now so moving the sliders mid-dash can't distort it.
  player.dashSpeed = settings.dashDistance / settings.dashDuration;
}

function moveDashing(player, dt) {
  const step = Math.min(dt, player.dashTimeLeft);
  player.x += player.dashDirX * player.dashSpeed * step;
  player.y += player.dashDirY * player.dashSpeed * step;
  player.dashTimeLeft -= dt;

  player.dx = player.dashDirX;
  player.dy = player.dashDirY;
}

function moveWalking(player, dt) {
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
}

function handleShooting(player, game) {
  const keys = player.def.keys.shoot;

  // A quick tap can go down and up between two frames, so asking "is it held
  // right now?" alone would silently drop shots. Check the press log for a new
  // press as well. Held keys still auto-fire at the cooldown rate.
  const log = pressLog(keys);
  const tapped = log.count !== player.seenPresses.shoot;
  player.seenPresses.shoot = log.count;

  if (player.fireCooldownLeft > 0) return;
  if (!tapped && !isDown(keys)) return;

  spawnBullet(game, player);
  player.fireCooldownLeft = settings.fireCooldown;
}

/** Keep the whole dot inside the square. */
function clampToWorld(player) {
  const r = player.radius;
  player.x = Math.min(WORLD_SIZE - r, Math.max(r, player.x));
  player.y = Math.min(WORLD_SIZE - r, Math.max(r, player.y));
}

function emptyPressCounts() {
  const counts = { shoot: 0 };
  for (const name of DIRECTION_NAMES) counts[name] = 0;
  return counts;
}
