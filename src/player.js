import { BASE_SPEED, PLAYER_RADIUS, REVERSE_FACTOR } from './config.js';
import { isDown, pressLog } from './input.js';
import { settings } from './settings.js';
import { spawnBullet } from './bullet.js';
import { regenShield } from './combat.js';
import { resolveObstacleCollisions } from './obstacles.js';

/** Double-tapping these sidesteps; they never dash forward or back. */
const SIDESTEP_ACTIONS = ['turnLeft', 'turnRight'];
/** Every action whose taps we track, for double-tap detection. */
const TAP_ACTIONS = [...SIDESTEP_ACTIONS, 'forward'];

/**
 * Players drive like little tanks.
 *
 * All movement runs through one velocity vector. The engine pushes along the
 * heading, braking bleeds off speed when you let go, and grip bleeds off the
 * sideways component — which is the whole trick behind drifting: turning
 * changes where you point, not where you are already travelling, so at low
 * grip the old direction survives for a moment and you slide. Recoil and
 * sidesteps are impulses into the same vector, so everything composes.
 */
export function createPlayer(def) {
  const player = {
    def,
    id: def.id,
    color: def.color,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: def.spawn.heading,
    angularVelocity: 0,
    radius: PLAYER_RADIUS,
    moving: 0,          // -1, 0 or 1: what W/S are asking for
    turning: 0,         // -1, 0 or 1: what A/D are asking for
    sprinting: false,
    // A sidestep is a short-lived extra velocity, added on top of driving.
    dashTimeLeft: 0,
    dashVX: 0,
    dashVY: 0,
    dashCooldownLeft: 0,
    fireCooldownLeft: 0,
    health: settings.maxHealth,
    shield: settings.maxShield,
    stamina: settings.maxStamina,
    // Seconds since this player last took damage / spent stamina.
    timeSinceHit: Infinity,
    timeSinceStamina: Infinity,
    alive: true,
    deadTimeLeft: 0,
    deaths: 0,
    // Press count per action we've already reacted to, for double-tap detection.
    seenPresses: emptyPressCounts(),
  };
  resetPlayer(player);
  player.deaths = 0;
  return player;
}

export function resetPlayer(player) {
  const spawn = player.def.spawn;
  player.x = spawn.fx * settings.worldSize;
  player.y = spawn.fy * settings.worldSize;
  player.vx = 0;
  player.vy = 0;
  player.heading = spawn.heading;
  player.angularVelocity = 0;
  player.moving = 0;
  player.turning = 0;
  player.sprinting = false;
  player.dashTimeLeft = 0;
  player.dashCooldownLeft = 0;
  player.fireCooldownLeft = 0;
  refillStats(player);
}

/** Back to full health, shield and stamina. */
export function refillStats(player) {
  player.health = settings.maxHealth;
  player.shield = settings.maxShield;
  player.stamina = settings.maxStamina;
  player.timeSinceHit = Infinity;
  player.timeSinceStamina = Infinity;
  player.alive = true;
  player.deadTimeLeft = 0;
}

/** Unit vector for the direction the player is pointing. */
export function headingVector(player) {
  return { x: Math.cos(player.heading), y: Math.sin(player.heading) };
}

/** How fast the player is actually travelling, whichever way they point. */
export function speedOf(player) {
  return Math.hypot(player.vx, player.vy);
}

/** Advance one player by `dt` seconds. */
export function updatePlayer(player, dt, game) {
  if (!player.alive) {
    player.deadTimeLeft -= dt;
    if (player.deadTimeLeft <= 0) resetPlayer(player);
    return;
  }

  regenShield(player, dt);
  regenStamina(player, dt);
  player.fireCooldownLeft = Math.max(0, player.fireCooldownLeft - dt);
  player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - dt);

  readTaps(player, dt);
  turn(player, dt);
  drive(player, dt);
  integrate(player, dt, game);
  handleShooting(player, game);
}

/* ---------------------------------------------------------------- input --- */

/**
 * Double-tapping A or D sidesteps; double-tapping W drops into a sprint, which
 * then holds for as long as W is held and stamina lasts.
 */
function readTaps(player, dt) {
  for (const action of TAP_ACTIONS) {
    const log = pressLog(player.def.keys[action]);
    if (log.count === player.seenPresses[action]) continue;

    player.seenPresses[action] = log.count;
    if (log.last - log.prev > settings.doubleTapWindow) continue;

    if (action === 'forward') startSprint(player);
    else startSidestep(player, action);
  }

  updateSprint(player, dt);
}

function startSprint(player) {
  if (player.stamina <= 0) return;
  player.sprinting = true;
}

/** Sprinting ends when you let go, reverse, or run the tank dry. */
function updateSprint(player, dt) {
  if (!player.sprinting) return;

  const stillAsking = isDown(player.def.keys.forward) && !isDown(player.def.keys.back);
  if (!stillAsking || !spendStamina(player, settings.sprintCost * dt)) {
    player.sprinting = false;
  }
}

function startSidestep(player, action) {
  if (player.dashTimeLeft > 0 || player.dashCooldownLeft > 0) return;
  if (!spendStamina(player, settings.dashCost)) return;

  // Left of the heading for A, right for D.
  const sign = action === 'turnLeft' ? -1 : 1;
  const dirX = -Math.sin(player.heading) * sign;
  const dirY = Math.cos(player.heading) * sign;
  const speed = settings.dashDistance / settings.dashDuration;

  player.dashVX = dirX * speed;
  player.dashVY = dirY * speed;
  player.dashTimeLeft = settings.dashDuration;
  player.dashCooldownLeft = settings.dashCooldown;
}

/* -------------------------------------------------------------- physics --- */

/** Angular velocity ramps toward the requested rate instead of snapping. */
function turn(player, dt) {
  const keys = player.def.keys;

  let input = 0;
  if (isDown(keys.turnLeft)) input -= 1;
  if (isDown(keys.turnRight)) input += 1;
  player.turning = input;

  const factor = player.sprinting ? settings.sprintTurnFactor : 1;
  const target = input * degreesToRadians(settings.turnSpeed) * factor;
  const step = degreesToRadians(settings.turnAcceleration) * dt;

  if (player.angularVelocity < target) {
    player.angularVelocity = Math.min(target, player.angularVelocity + step);
  } else {
    player.angularVelocity = Math.max(target, player.angularVelocity - step);
  }

  player.heading = normaliseAngle(player.heading + player.angularVelocity * dt);
}

/**
 * Split the velocity into "along the heading" and "sideways", push on the
 * first and let grip eat the second, then put it back together.
 */
function drive(player, dt) {
  const keys = player.def.keys;

  let input = 0;
  if (isDown(keys.forward)) input += 1;
  if (isDown(keys.back)) input -= 1;
  player.moving = input;

  const cos = Math.cos(player.heading);
  const sin = Math.sin(player.heading);
  let forward = player.vx * cos + player.vy * sin;
  let lateral = -player.vx * sin + player.vy * cos;

  const boost = player.sprinting ? settings.sprintSpeedFactor : 1;
  const topSpeed = BASE_SPEED * settings.speedMultiplier * boost;
  const cap = input < 0 ? topSpeed * REVERSE_FACTOR : topSpeed;

  const wasAt = forward;
  if (input !== 0) {
    forward += input * settings.acceleration * dt;
    // The engine can reach the cap but never push past it. If we were already
    // over — a recoil shove, or a sprint that just ended — hold that surplus
    // here and let the settle step below bleed it off.
    if (input > 0) forward = Math.min(forward, Math.max(cap, wasAt));
    else forward = Math.max(forward, Math.min(-cap, wasAt));
  } else {
    forward *= Math.exp(-settings.braking * dt);
  }

  // Anything still above the cap eases back down, so the drop out of a sprint
  // can be felt rather than just seen.
  const settle = Math.exp(-settings.braking * dt);
  if (forward > cap) forward = Math.max(cap, forward * settle);
  if (forward < -cap) forward = Math.min(-cap, forward * settle);

  lateral *= Math.exp(-settings.grip * dt);

  player.vx = forward * cos - lateral * sin;
  player.vy = forward * sin + lateral * cos;
}

/**
 * Move, then get pushed back out of anything solid.
 *
 * A long, short sidestep can cover more ground in one step than a box is wide,
 * which would let it jump clean through cover. Split the move into hops no
 * bigger than the player so every box on the way gets a chance to stop them.
 */
function integrate(player, dt, game) {
  const reach = Math.hypot(player.vx + player.dashVX, player.vy + player.dashVY) * dt;
  const hops = Math.min(32, Math.max(1, Math.ceil(reach / (player.radius * 0.8))));
  const hopDt = dt / hops;

  for (let hop = 0; hop < hops; hop++) {
    player.x += (player.vx + player.dashVX) * hopDt;
    player.y += (player.vy + player.dashVY) * hopDt;
    resolveObstacleCollisions(player, game.obstacles);
    clampToWorld(player);
  }

  if (player.dashTimeLeft > 0) {
    player.dashTimeLeft -= dt;
    if (player.dashTimeLeft <= 0) {
      player.dashTimeLeft = 0;
      player.dashVX = 0;
      player.dashVY = 0;
    }
  }
}

/* ------------------------------------------------------------- stamina --- */

function regenStamina(player, dt) {
  player.timeSinceStamina += dt;
  player.stamina = Math.min(player.stamina, settings.maxStamina);

  if (player.timeSinceStamina < settings.staminaRegenDelay) return;
  if (player.stamina >= settings.maxStamina) return;

  player.stamina = Math.min(
    settings.maxStamina,
    player.stamina + settings.staminaRegenRate * dt,
  );
}

/** Spend if affordable. Returns false — and takes nothing — if it isn't. */
function spendStamina(player, amount) {
  if (amount <= 0) return true;
  if (player.stamina < amount) return false;

  player.stamina -= amount;
  player.timeSinceStamina = 0;
  return true;
}

/* ------------------------------------------------------------- shooting --- */

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

  // Recoil is just an impulse into the same velocity everything else uses.
  player.vx -= Math.cos(player.heading) * settings.recoilKick;
  player.vy -= Math.sin(player.heading) * settings.recoilKick;
}

/* --------------------------------------------------------------- helpers --- */

/** Keep the whole dot inside the square, and stop dead at the edge. */
function clampToWorld(player) {
  const r = player.radius;
  const max = settings.worldSize - r;

  if (player.x < r) { player.x = r; player.vx = Math.max(0, player.vx); player.dashVX = Math.max(0, player.dashVX); }
  if (player.x > max) { player.x = max; player.vx = Math.min(0, player.vx); player.dashVX = Math.min(0, player.dashVX); }
  if (player.y < r) { player.y = r; player.vy = Math.max(0, player.vy); player.dashVY = Math.max(0, player.dashVY); }
  if (player.y > max) { player.y = max; player.vy = Math.min(0, player.vy); player.dashVY = Math.min(0, player.dashVY); }
}

function normaliseAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function emptyPressCounts() {
  const counts = { shoot: 0 };
  for (const action of TAP_ACTIONS) counts[action] = 0;
  return counts;
}
