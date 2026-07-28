import { BASE_SPEED, DASH_ACTIONS, PLAYER_RADIUS } from './config.js';
import { isDown, pressLog } from './input.js';
import { settings } from './settings.js';
import { spawnBullet } from './bullet.js';
import { regenShield } from './combat.js';

const DASH_ACTION_NAMES = Object.keys(DASH_ACTIONS);

/**
 * Players drive like little tanks: W and S go forward and back along the way
 * they are pointing, A and D swing that heading around. Everything else in the
 * game reads `heading` — bullets, recoil, dashes and both cameras.
 */
export function createPlayer(def) {
  const player = {
    def,
    id: def.id,
    color: def.color,
    x: 0,
    y: 0,
    heading: def.spawn.heading,
    radius: PLAYER_RADIUS,
    moving: 0,          // -1, 0 or 1: what W/S are asking for
    turning: 0,         // -1, 0 or 1: what A/D are asking for
    // Recoil is a velocity that decays, rather than a teleport, so a burst of
    // shots pushes you further than a single one.
    recoilVX: 0,
    recoilVY: 0,
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
  player.heading = spawn.heading;
  player.moving = 0;
  player.turning = 0;
  player.recoilVX = 0;
  player.recoilVY = 0;
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

/** Unit vector for the direction the player is pointing. */
export function headingVector(player) {
  return { x: Math.cos(player.heading), y: Math.sin(player.heading) };
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
    turn(player, dt);
    driveForward(player, dt);
  }

  applyRecoil(player, dt);
  clampToWorld(player);
  handleShooting(player, game);
}

/**
 * A dash is two quick taps of the same movement key. We watch the press count
 * for each action; when it changes, a new press happened, and if it landed
 * close enough behind the previous one it's a double tap. Tapping A or D twice
 * sidesteps rather than turning.
 */
function detectDash(player) {
  for (const name of DASH_ACTION_NAMES) {
    const log = pressLog(player.def.keys[name]);
    if (log.count === player.seenPresses[name]) continue;

    player.seenPresses[name] = log.count;
    if (log.last - log.prev <= settings.doubleTapWindow) startDash(player, name);
  }
}

function startDash(player, actionName) {
  if (player.dashTimeLeft > 0 || player.dashCooldownLeft > 0) return;

  const dir = DASH_ACTIONS[actionName](player.heading);
  player.dashDirX = dir.x;
  player.dashDirY = dir.y;
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
}

function turn(player, dt) {
  const keys = player.def.keys;

  let turning = 0;
  if (isDown(keys.turnLeft)) turning -= 1;
  if (isDown(keys.turnRight)) turning += 1;
  player.turning = turning;

  if (turning === 0) return;
  player.heading = normaliseAngle(
    player.heading + turning * degreesToRadians(settings.turnSpeed) * dt,
  );
}

function driveForward(player, dt) {
  const keys = player.def.keys;

  let moving = 0;
  if (isDown(keys.forward)) moving += 1;
  if (isDown(keys.back)) moving -= 1;
  player.moving = moving;

  if (moving === 0) return;

  const speed = BASE_SPEED * settings.speedMultiplier;
  player.x += Math.cos(player.heading) * moving * speed * dt;
  player.y += Math.sin(player.heading) * moving * speed * dt;
}

/** Slide along whatever recoil is left, then let it decay. */
function applyRecoil(player, dt) {
  if (player.recoilVX === 0 && player.recoilVY === 0) return;

  player.x += player.recoilVX * dt;
  player.y += player.recoilVY * dt;

  const decay = Math.exp(-settings.recoilSettle * dt);
  player.recoilVX *= decay;
  player.recoilVY *= decay;

  // Stop fussing over vanishingly small values.
  if (Math.hypot(player.recoilVX, player.recoilVY) < 1) {
    player.recoilVX = 0;
    player.recoilVY = 0;
  }
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

  player.recoilVX -= Math.cos(player.heading) * settings.recoilKick;
  player.recoilVY -= Math.sin(player.heading) * settings.recoilKick;
}

/** Keep the whole dot inside the square. */
function clampToWorld(player) {
  const r = player.radius;
  const max = settings.worldSize - r;
  player.x = Math.min(max, Math.max(r, player.x));
  player.y = Math.min(max, Math.max(r, player.y));
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
  for (const name of DASH_ACTION_NAMES) counts[name] = 0;
  return counts;
}
