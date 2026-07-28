import { BULLET_RADIUS, WORLD_SIZE } from './config.js';
import { settings } from './settings.js';

/**
 * Bullets travel in a straight line along the direction the shooter was
 * looking, and vanish when they leave the world. They don't hit anything yet.
 */
export function spawnBullet(game, player) {
  // Start at the edge of the dot so a bullet never appears on top of its owner.
  const offset = player.radius + BULLET_RADIUS + 1;
  game.bullets.push({
    ownerId: player.id,
    color: player.color,
    x: player.x + player.facingX * offset,
    y: player.y + player.facingY * offset,
    dx: player.facingX,
    dy: player.facingY,
    radius: BULLET_RADIUS,
  });
}

export function updateBullets(game, dt) {
  // Read the speed live so dragging the slider also affects bullets already
  // in the air — much easier to judge the feel of a value that way.
  const speed = settings.bulletSpeed;

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    bullet.x += bullet.dx * speed * dt;
    bullet.y += bullet.dy * speed * dt;

    if (isOutOfWorld(bullet)) game.bullets.splice(i, 1);
  }
}

function isOutOfWorld(bullet) {
  const r = bullet.radius;
  return bullet.x < -r || bullet.x > WORLD_SIZE + r
      || bullet.y < -r || bullet.y > WORLD_SIZE + r;
}
