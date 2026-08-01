import { PLAYER_RADIUS, VIEW_SIZE } from './config.js';
import { settings } from './settings.js';
import { formatTime, isGoingBackwards } from './race.js';

const HALF_VIEW = VIEW_SIZE / 2;
/** Anything within this radius of the player can be on screen once rotated. */
const VIEW_RADIUS = Math.hypot(HALF_VIEW, HALF_VIEW);

const BAR_WIDTH = 34;
const BAR_HEIGHT = 4;
const SHIELD_COLOR = '#9fe8ff';
const STAMINA_COLOR = '#ffd166';
const OBSTACLE_FILL = '#2b3038';
const OBSTACLE_EDGE = '#3d444f';

const GRASS = '#16301f';
const GRASS_STRIPE = '#193621';
const TARMAC = '#3c4045';
const KERB_WIDTH = 9;
const HUD_FONT = 'ui-sans-serif, system-ui, sans-serif';
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
    if (!viewer) return;   // this seat is sitting out at the current player count

    ctx.fillStyle = VOID_FILL;
    ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    ctx.save();
    // Put the viewer at the centre, pointing up, with the world turned around
    // them. Everything between here and restore() is drawn in world units.
    ctx.translate(HALF_VIEW, HALF_VIEW);
    ctx.rotate(-viewer.heading - Math.PI / 2);
    ctx.translate(-viewer.x, -viewer.y);

    const racing = game.mode === 'race';

    if (racing) {
      drawGrass(ctx, viewer);
      drawTrack(ctx, game.track);
      for (const player of game.players) drawTrail(ctx, viewer, player);
      for (const player of game.players) drawCar(ctx, player);
    } else {
      drawWorld(ctx, viewer);
      drawGrid(ctx, viewer);
      drawObstacles(ctx, viewer, game.obstacles);
      for (const bullet of game.bullets) drawBullet(ctx, bullet);
      for (const player of game.players) {
        if (player.alive) drawPlayer(ctx, player);
      }
    }

    ctx.restore();

    // Everything below is drawn unrotated, so it stays readable whichever way
    // the viewer is facing.
    for (const player of game.players) {
      if (!racing && !player.alive) continue;
      const at = worldToView(viewer, player.x, player.y);

      if (isOnScreen(at)) {
        if (racing) drawNameTag(ctx, player, at, player === viewer);
        else drawBars(ctx, player, at);
      } else if (player !== viewer) {
        drawOffScreenMarker(ctx, player, at);
      }
    }

    if (racing) {
      drawMinimap(ctx, game, viewer);
      drawRaceHud(ctx, game, viewer);
    } else if (!viewer.alive) {
      drawRespawning(ctx, viewer);
    }
  };
}

/**
 * Corner minimap: the same world, much further out, turning with the driver so
 * up is always where they are heading. On a viewport this small you otherwise
 * meet a corner at the moment you have to be already turning into it.
 */
function drawMinimap(ctx, game, viewer) {
  const size = settings.minimapSize;
  if (size < 20) return;

  const radius = size / 2;
  const cx = VIEW_SIZE - radius - 14;
  const cy = radius + 14;
  const scale = size / settings.minimapRange;

  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 16, 12, 0.78)';
  ctx.fill();
  ctx.clip();

  // Same camera as the main view, just pulled much further back.
  ctx.translate(cx, cy);
  ctx.rotate(-viewer.heading - Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.translate(-viewer.x, -viewer.y);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.lineWidth = settings.trackWidth + 14 / scale;
  ctx.strokeStyle = 'rgba(216, 72, 60, 0.75)';
  ctx.stroke(game.track.outline);

  ctx.lineWidth = settings.trackWidth;
  ctx.strokeStyle = '#4a4f56';
  ctx.stroke(game.track.outline);

  drawMinimapStartLine(ctx, game.track, scale);

  for (const player of game.players) {
    if (player === viewer) continue;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 5 / scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // The driver sits at the centre, always pointing up.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = viewer.color;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.stroke();
}

function drawMinimapStartLine(ctx, track, scale) {
  const start = track.samples[0];
  const half = settings.trackWidth / 2;

  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(Math.atan2(start.tx, -start.ty));
  ctx.fillStyle = '#f2f2f4';
  ctx.fillRect(-half, -3 / scale, half * 2, 6 / scale);
  ctx.restore();
}

/* ----------------------------------------------------------------- racing --- */

function drawGrass(ctx, viewer) {
  const size = settings.worldSize;
  ctx.fillStyle = GRASS;
  ctx.fillRect(-size, -size, size * 3, size * 3);

  // Mown stripes, purely so the grass reads as ground moving past you.
  ctx.fillStyle = GRASS_STRIPE;
  const band = 90;
  const from = Math.floor((viewer.y - VIEW_RADIUS) / (band * 2)) * band * 2;
  for (let y = from; y < viewer.y + VIEW_RADIUS; y += band * 2) {
    ctx.fillRect(viewer.x - VIEW_RADIUS, y, VIEW_RADIUS * 2, band);
  }
}

/**
 * The road is one stroked path at several widths: kerbs underneath, tarmac on
 * top, centre line last. Much simpler than building an outline polygon, and it
 * gets the rounded corner joins for free.
 */
function drawTrack(ctx, track) {
  const width = settings.trackWidth;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Kerb: a white band, then red dashes over it, then the tarmac covers the
  // middle — leaving red-and-white edges on both sides.
  ctx.lineWidth = width + KERB_WIDTH * 2;
  ctx.strokeStyle = '#e8e8ea';
  ctx.setLineDash([]);
  ctx.stroke(track.outline);

  // Butt caps, not round: a round cap on a stroke this wide reaches half the
  // line width past each dash, which would close every gap and leave the kerb
  // a solid red band.
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#d8483c';
  ctx.setLineDash([34, 34]);
  ctx.stroke(track.outline);
  ctx.setLineDash([]);

  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = TARMAC;
  ctx.stroke(track.outline);

  ctx.lineCap = 'butt';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.setLineDash([34, 46]);
  ctx.stroke(track.outline);
  ctx.setLineDash([]);
  ctx.lineCap = 'round';

  drawStartLine(ctx, track);
}

function drawStartLine(ctx, track) {
  const start = track.samples[0];
  const half = settings.trackWidth / 2;
  const nx = -start.ty;
  const ny = start.tx;

  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(Math.atan2(ny, nx));

  // Two rows of chequer across the road.
  const squares = 14;
  const step = (half * 2) / squares;
  for (let i = 0; i < squares; i++) {
    for (let row = 0; row < 2; row++) {
      ctx.fillStyle = (i + row) % 2 === 0 ? '#f2f2f4' : '#20232a';
      ctx.fillRect(-half + i * step, -step + row * step, step, step);
    }
  }
  ctx.restore();
}

/**
 * Tyre marks. Segments are bucketed by opacity so each bucket is a single
 * path — four players' worth of individually stroked segments across four
 * viewports would cost far more than it is worth.
 */
function drawTrail(ctx, viewer, player) {
  if (player.trail.length < 2) return;

  const buckets = [[], [], [], []];

  for (let i = 1; i < player.trail.length; i++) {
    const a = player.trail[i - 1];
    const b = player.trail[i];

    if (Math.abs(b.x - viewer.x) > VIEW_RADIUS + 40) continue;
    if (Math.abs(b.y - viewer.y) > VIEW_RADIUS + 40) continue;

    const fade = 1 - b.age / 3.2;
    const strength = fade * (0.25 + b.slip * 0.75);
    const bucket = Math.min(3, Math.max(0, Math.floor(strength * 4)));
    buckets[bucket].push([a, b]);
  }

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0b0c0e';

  buckets.forEach((segments, index) => {
    if (segments.length === 0) return;

    ctx.globalAlpha = 0.12 + index * 0.14;
    ctx.lineWidth = 3 + index * 0.6;
    ctx.beginPath();
    for (const [a, b] of segments) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
}

/** A very simple open-wheel car, pointing along +x before rotation. */
function drawCar(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.heading);

  ctx.fillStyle = '#141619';
  ctx.fillRect(-16, -8, 5, 16);      // rear wing
  ctx.fillRect(11, -9, 4, 18);       // front wing
  ctx.fillRect(-11, -10, 8, 4);      // wheels
  ctx.fillRect(-11, 6, 8, 4);
  ctx.fillRect(4, -10, 7, 4);
  ctx.fillRect(4, 6, 7, 4);

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(6, -4.5);
  ctx.lineTo(-12, -5.5);
  ctx.lineTo(-12, 5.5);
  ctx.lineTo(6, 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-3, 0, 3.4, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawNameTag(ctx, player, at, isViewer) {
  if (isViewer) return;

  ctx.fillStyle = player.color;
  ctx.font = `600 11px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(player.def.label.replace('Player ', 'P'), at.x, at.y - 20);
  ctx.textAlign = 'start';
}

function drawRaceHud(ctx, game, viewer) {
  const race = game.race;
  const laps = Math.round(settings.lapsToWin);

  ctx.font = `600 13px ${HUD_FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`LAP ${Math.min(viewer.lap + 1, laps)}/${laps}`, 12, 22);

  ctx.font = `500 12px ${HUD_FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const current = race.phase === 'running' && !viewer.finished
    ? race.time - viewer.lapStartedAt
    : 0;
  ctx.fillText(formatTime(current), 12, 40);
  ctx.fillText(`BEST ${formatTime(viewer.bestLapTime)}`, 12, 56);

  if (race.bestLapBy) {
    const holder = game.players.find((p) => p.id === race.bestLapBy);
    ctx.fillStyle = holder ? holder.color : '#fff';
    ctx.fillText(`FASTEST ${formatTime(race.bestLap)}`, 12, 74);
  }

  if (race.phase === 'running' && !viewer.finished && game.track
      && isGoingBackwards(viewer, game.track)) {
    banner(ctx, 'WRONG WAY', '#ffb020', 20, HALF_VIEW * 0.55);
  }

  if (race.phase === 'ready') {
    banner(ctx, 'PRESS START', 'rgba(255,255,255,0.75)', 22, HALF_VIEW);
  } else if (race.phase === 'countdown') {
    banner(ctx, String(Math.ceil(race.countdown)), '#ffffff', 78, HALF_VIEW);
  } else if (race.goFlash > 0) {
    banner(ctx, 'GO', '#63d98a', 78, HALF_VIEW);
  } else if (race.phase === 'finished') {
    const winner = game.players.find((p) => p.id === race.winner);
    const won = race.winner === viewer.id;
    banner(ctx, won ? 'YOU WIN' : `${winner ? winner.def.label : 'Nobody'} WINS`,
           winner ? winner.color : '#fff', 30, HALF_VIEW);
  }
}

function banner(ctx, text, color, size, y) {
  ctx.font = `700 ${size}px ${HUD_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.strokeText(text, HALF_VIEW, y);
  ctx.fillStyle = color;
  ctx.fillText(text, HALF_VIEW, y);

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
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

/** Solid cover. Only the boxes that could be in shot are drawn. */
function drawObstacles(ctx, viewer, obstacles) {
  ctx.fillStyle = OBSTACLE_FILL;
  ctx.strokeStyle = OBSTACLE_EDGE;
  ctx.lineWidth = 1;

  for (const box of obstacles) {
    if (Math.abs(box.x + box.w / 2 - viewer.x) > VIEW_RADIUS + box.w) continue;
    if (Math.abs(box.y + box.h / 2 - viewer.y) > VIEW_RADIUS + box.h) continue;

    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
  }
}

function drawPlayer(ctx, player) {
  // A streak trailing the direction of travel while sprinting: it shows both
  // that you're sprinting and which way your momentum actually points, which
  // are different things the moment you start to drift.
  if (player.sprinting) {
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 1) {
      ctx.strokeStyle = player.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(
        player.x - (player.vx / speed) * player.radius * 2.6,
        player.y - (player.vy / speed) * player.radius * 2.6,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

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
  const step = BAR_HEIGHT + 2;

  drawBar(ctx, left, healthY, player.health / settings.maxHealth, player.color);
  drawBar(ctx, left, healthY + step, player.stamina / settings.maxStamina, STAMINA_COLOR);

  if (settings.maxShield > 0) {
    drawBar(ctx, left, healthY - step, player.shield / settings.maxShield, SHIELD_COLOR);
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
