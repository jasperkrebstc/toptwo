import { WORLD_SIZE } from './config.js';

/**
 * Draws the world. Canvas pixels map 1:1 to world units, so nothing here
 * needs to know how big the canvas is on screen — CSS handles the scaling.
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  return function render(game) {
    ctx.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    for (const bullet of game.bullets) {
      drawBullet(ctx, bullet);
    }
    for (const player of game.players) {
      drawPlayer(ctx, player);
    }
  };
}

function drawPlayer(ctx, player) {
  // A ring while dashing, so the dash is readable at a glance when tuning it.
  if (player.dashTimeLeft > 0) {
    ctx.strokeStyle = player.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 1.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The dot.
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // A short line showing which way it is looking — the direction shots travel.
  const noseLength = player.radius * 1.8;
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + player.facingX * noseLength,
    player.y + player.facingY * noseLength,
  );
  ctx.stroke();
}

function drawBullet(ctx, bullet) {
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
}
