import { BULLET_RADIUS } from './config.js';
import { settings } from './settings.js';
import { headingVector } from './player.js';
import { segmentHitsObstacle } from './obstacles.js';

/**
 * Bullets travel in a straight line along the direction the shooter was
 * pointing, and vanish when they leave the world.
 */
export function spawnBullet(game, player) {
  const dir = headingVector(player);
  // Start at the edge of the dot so a bullet never appears on top of its owner.
  const offset = player.radius + BULLET_RADIUS + 1;
  const x = player.x + dir.x * offset;
  const y = player.y + dir.y * offset;

  game.bullets.push({
    ownerId: player.id,
    color: player.color,
    x,
    y,
    // Where the bullet was at the start of the step, so hit detection can
    // test the whole path it travelled rather than just its current spot.
    prevX: x,
    prevY: y,
    dx: dir.x,
    dy: dir.y,
    radius: BULLET_RADIUS,
  });
}

export function updateBullets(game, dt) {
  // Read the speed live so dragging the slider also affects bullets already
  // in the air — much easier to judge the feel of a value that way.
  const speed = settings.bulletSpeed;

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    bullet.prevX = bullet.x;
    bullet.prevY = bullet.y;
    bullet.x += bullet.dx * speed * dt;
    bullet.y += bullet.dy * speed * dt;

    if (isOutOfWorld(bullet) || hitsCover(bullet, game.obstacles)) {
      game.bullets.splice(i, 1);
    }
  }
}

/** Boxes stop bullets, so cover is real cover. */
function hitsCover(bullet, obstacles) {
  return segmentHitsObstacle(
    bullet.prevX, bullet.prevY, bullet.x, bullet.y, bullet.radius, obstacles,
  );
}

function isOutOfWorld(bullet) {
  const r = bullet.radius;
  const max = settings.worldSize + r;
  return bullet.x < -r || bullet.x > max || bullet.y < -r || bullet.y > max;
}
