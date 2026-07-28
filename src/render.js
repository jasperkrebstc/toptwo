import { WORLD_SIZE } from './config.js';
import { settings } from './settings.js';

const BAR_WIDTH = 34;
const BAR_HEIGHT = 4;
const SHIELD_COLOR = '#9fe8ff';

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
      if (!player.alive) continue;
      drawPlayer(ctx, player);
      drawBars(ctx, player);
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

/**
 * Health bar under the dot, with the shield as a thinner bar just above it.
 * The shield bar is skipped entirely when shields are turned off.
 */
function drawBars(ctx, player) {
  const left = player.x - BAR_WIDTH / 2;
  const healthY = player.y + player.radius + 8;

  drawBar(ctx, left, healthY, player.health / settings.maxHealth, player.color);

  if (settings.maxShield > 0) {
    drawBar(ctx, left, healthY - BAR_HEIGHT - 2, player.shield / settings.maxShield, SHIELD_COLOR);
  }
}

function drawBar(ctx, x, y, fraction, color) {
  const filled = Math.max(0, Math.min(1, fraction));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);

  ctx.fillStyle = color;
  ctx.fillRect(x, y, BAR_WIDTH * filled, BAR_HEIGHT);
}

function drawBullet(ctx, bullet) {
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
}
