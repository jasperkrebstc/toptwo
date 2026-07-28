import { WORLD_SIZE } from './config.js';

/**
 * Draws the world. Canvas pixels map 1:1 to world units, so nothing here
 * needs to know how big the canvas is on screen — CSS handles the scaling.
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  return function render(game) {
    ctx.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    for (const player of game.players) {
      drawPlayer(ctx, player);
    }
  };
}

function drawPlayer(ctx, player) {
  // The dot.
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // A short line showing which way it is looking — this is the direction
  // shots will travel once shooting is in.
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
