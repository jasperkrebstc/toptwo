import { PLAYER_RADIUS, VIEW_SIZE } from './config.js';
import { settings } from './settings.js';

const HALF_VIEW = VIEW_SIZE / 2;
/** Anything within this radius of the player can be on screen once rotated. */
const VIEW_RADIUS = Math.hypot(HALF_VIEW, HALF_VIEW);

const BAR_WIDTH = 34;
const BAR_HEIGHT = 4;
const SHIELD_COLOR = '#9fe8ff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.07)';
const GRID_COLOR_MAJOR = 'rgba(255, 255, 255, 0.15)';
const WORLD_FILL = '#0e1013';
const WORLD_EDGE = '#3a4250';
const VOID_FILL = '#08090b';

/**
 * One camera per player. The viewer sits in the middle of their own canvas and
 * always points up the screen; the world rotates underneath them instead. The
 * background grid is what makes that rotation readable — without it, turning
 * on the spot would look like nothing happening at all.
 */
export function createViewRenderer(canvas, viewerId) {
  const ctx = canvas.getContext('2d');

  return function render(game) {
    const viewer = game.players.find((player) => player.id === viewerId);

    ctx.fillStyle = VOID_FILL;
    ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    ctx.save();
    // Put the viewer at the centre, pointing up, with the world turned around
    // them. Everything between here and restore() is drawn in world units.
    ctx.translate(HALF_VIEW, HALF_VIEW);
    ctx.rotate(-viewer.heading - Math.PI / 2);
    ctx.translate(-viewer.x, -viewer.y);

    drawWorld(ctx, viewer);
    drawGrid(ctx, viewer);
    for (const bullet of game.bullets) drawBullet(ctx, bullet);
    for (const player of game.players) {
      if (player.alive) drawPlayer(ctx, player);
    }

    ctx.restore();

    // Bars and off-screen markers are drawn unrotated, so they stay readable
    // whichever way the viewer is facing.
    for (const player of game.players) {
      if (!player.alive) continue;
      const at = worldToView(viewer, player.x, player.y);
      if (isOnScreen(at)) drawBars(ctx, player, at);
      else if (player !== viewer) drawOffScreenMarker(ctx, player, at);
    }

    if (!viewer.alive) drawRespawning(ctx, viewer);
  };
}

/** The playable square, with everything outside it visibly dead space. */
function drawWorld(ctx, viewer) {
  const size = settings.worldSize;
  ctx.fillStyle = WORLD_FILL;
  ctx.fillRect(0, 0, size, size);

  // Only bother with the border when it could actually be in shot.
  const nearEdge = viewer.x < VIEW_RADIUS || viewer.y < VIEW_RADIUS
    || viewer.x > size - VIEW_RADIUS || viewer.y > size - VIEW_RADIUS;
  if (!nearEdge) return;

  ctx.strokeStyle = WORLD_EDGE;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, size, size);
}

/**
 * Grid lines across the patch of world the camera can see. Every fifth line is
 * brighter, which makes distances easier to judge at a glance.
 */
function drawGrid(ctx, viewer) {
  const grid = settings.gridSize;
  const minX = Math.floor((viewer.x - VIEW_RADIUS) / grid) * grid;
  const maxX = viewer.x + VIEW_RADIUS;
  const minY = Math.floor((viewer.y - VIEW_RADIUS) / grid) * grid;
  const maxY = viewer.y + VIEW_RADIUS;

  ctx.lineWidth = 1;

  for (let x = minX; x <= maxX; x += grid) {
    ctx.strokeStyle = isMajor(x, grid) ? GRID_COLOR_MAJOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  for (let y = minY; y <= maxY; y += grid) {
    ctx.strokeStyle = isMajor(y, grid) ? GRID_COLOR_MAJOR : GRID_COLOR;
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }
}

function isMajor(coordinate, grid) {
  return Math.round(coordinate / grid) % 5 === 0;
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

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // The barrel: where this player is pointing, and where their shots go.
  const noseLength = player.radius * 2;
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + Math.cos(player.heading) * noseLength,
    player.y + Math.sin(player.heading) * noseLength,
  );
  ctx.stroke();
}

function drawBullet(ctx, bullet) {
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Health bar under the dot, with the shield as a thinner bar just above it.
 * The shield bar is skipped entirely when shields are turned off.
 */
function drawBars(ctx, player, at) {
  const left = at.x - BAR_WIDTH / 2;
  const healthY = at.y + PLAYER_RADIUS + 10;

  drawBar(ctx, left, healthY, player.health / settings.maxHealth, player.color);

  if (settings.maxShield > 0) {
    drawBar(ctx, left, healthY - BAR_HEIGHT - 2, player.shield / settings.maxShield, SHIELD_COLOR);
  }
}

function drawBar(ctx, x, y, fraction, color) {
  const filled = Math.max(0, Math.min(1, fraction));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);

  ctx.fillStyle = color;
  ctx.fillRect(x, y, BAR_WIDTH * filled, BAR_HEIGHT);
}

/**
 * An arrow pinned to the edge of the view, pointing at an opponent who is
 * somewhere off screen. Without it you'd have no idea which way to turn in a
 * world this much bigger than the window.
 */
function drawOffScreenMarker(ctx, player, at) {
  const dx = at.x - HALF_VIEW;
  const dy = at.y - HALF_VIEW;
  const length = Math.hypot(dx, dy) || 1;
  const radius = HALF_VIEW - 22;
  const x = HALF_VIEW + (dx / length) * radius;
  const y = HALF_VIEW + (dy / length) * radius;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = player.color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-7, 6);
  ctx.lineTo(-7, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawRespawning(ctx, viewer) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

  ctx.fillStyle = viewer.color;
  ctx.font = '600 20px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('respawning', HALF_VIEW, HALF_VIEW);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

/**
 * World point -> position on the viewer's canvas. Mirrors the ctx transform
 * above; needed because the bars and markers are drawn unrotated.
 */
function worldToView(viewer, worldX, worldY) {
  const dx = worldX - viewer.x;
  const dy = worldY - viewer.y;
  const angle = -viewer.heading - Math.PI / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: HALF_VIEW + dx * cos - dy * sin,
    y: HALF_VIEW + dx * sin + dy * cos,
  };
}

function isOnScreen(at) {
  const margin = PLAYER_RADIUS + 20;
  return at.x > -margin && at.x < VIEW_SIZE + margin
      && at.y > -margin && at.y < VIEW_SIZE + margin;
}
