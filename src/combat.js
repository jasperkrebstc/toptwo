import { settings } from './settings.js';

/**
 * Bullet-versus-player hits.
 *
 * Collision is swept, not point-in-circle: we test the whole segment the
 * bullet travelled this step against the player's circle. A bullet at the top
 * of the speed slider covers more ground per step than a player is wide, so a
 * simple position check would let it pass straight through.
 */
export function resolveHits(game) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];

    for (const player of game.players) {
      if (!player.alive) continue;
      if (player.id === bullet.ownerId) continue;   // your own bullets can't hit you

      const reach = player.radius + bullet.radius;
      const distance = distanceToSegment(
        player.x, player.y,
        bullet.prevX, bullet.prevY,
        bullet.x, bullet.y,
      );
      if (distance > reach) continue;

      applyDamage(player, settings.damagePerBullet);
      game.bullets.splice(i, 1);
      break;   // one bullet, one hit
    }
  }
}

/** Damage eats the shield first, and any leftover carries into health. */
export function applyDamage(player, amount) {
  player.timeSinceHit = 0;

  let remaining = amount;
  const absorbed = Math.min(player.shield, remaining);
  player.shield -= absorbed;
  remaining -= absorbed;

  if (remaining > 0) player.health -= remaining;
  if (player.health <= 0) kill(player);
}

function kill(player) {
  player.health = 0;
  player.shield = 0;
  player.alive = false;
  player.deadTimeLeft = settings.respawnDelay;
  player.deaths += 1;
}

/**
 * The shield recovers only after the player has gone untouched for the delay.
 * Health is deliberately not regenerated here — it comes back on death only.
 */
export function regenShield(player, dt) {
  player.timeSinceHit += dt;

  // Keep current values honest if the max sliders were lowered.
  player.shield = Math.min(player.shield, settings.maxShield);
  player.health = Math.min(player.health, settings.maxHealth);

  if (player.timeSinceHit < settings.shieldRegenDelay) return;
  if (player.shield >= settings.maxShield) return;

  player.shield = Math.min(
    settings.maxShield,
    player.shield + settings.shieldRegenRate * dt,
  );
}

/** Shortest distance from a point to the segment AB. */
function distanceToSegment(cx, cy, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;

  let t = 0;
  if (lengthSq > 0) {
    t = ((cx - ax) * abx + (cy - ay) * aby) / lengthSq;
    t = Math.max(0, Math.min(1, t));
  }

  return Math.hypot(cx - (ax + t * abx), cy - (ay + t * aby));
}
