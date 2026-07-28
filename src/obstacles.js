import { PLAYERS } from './config.js';
import { settings } from './settings.js';
import { createRng, pick, randomInt } from './rng.js';

/** Boxes never spawn within this distance of a spawn point. */
const SPAWN_CLEARANCE = 220;

const NEIGHBOURS = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

/**
 * Scatters clusters of grid-aligned boxes through the world.
 *
 * Each cluster is a short random walk over grid cells, which is what makes
 * them come out as connected clumps and stubby walls rather than as confetti —
 * scattered single boxes give you nothing to hide behind.
 */
export function generateObstacles() {
  const grid = settings.gridSize;
  const cells = Math.floor(settings.worldSize / grid);
  if (cells < 4) return [];

  const rng = createRng(settings.worldSeed);
  const taken = new Set();

  for (let cluster = 0; cluster < settings.obstacleClusters; cluster++) {
    let x = randomInt(rng, 1, cells - 2);
    let y = randomInt(rng, 1, cells - 2);

    for (let step = 0; step < settings.clusterSize; step++) {
      taken.add(`${x},${y}`);
      const dir = pick(rng, NEIGHBOURS);
      x = Math.min(cells - 2, Math.max(1, x + dir.x));
      y = Math.min(cells - 2, Math.max(1, y + dir.y));
    }
  }

  const boxes = [];
  for (const key of taken) {
    const [cx, cy] = key.split(',').map(Number);
    const box = { x: cx * grid, y: cy * grid, w: grid, h: grid };
    if (!blocksASpawn(box)) boxes.push(box);
  }
  return boxes;
}

function blocksASpawn(box) {
  for (const def of PLAYERS) {
    const sx = def.spawn.fx * settings.worldSize;
    const sy = def.spawn.fy * settings.worldSize;
    const nearestX = clamp(sx, box.x, box.x + box.w);
    const nearestY = clamp(sy, box.y, box.y + box.h);
    if (Math.hypot(sx - nearestX, sy - nearestY) < SPAWN_CLEARANCE) return true;
  }
  return false;
}

/**
 * Pushes a circular body out of any box it overlaps, and kills the part of its
 * velocity heading into that box — so you slide along a wall instead of
 * sticking to it.
 */
export function resolveObstacleCollisions(body, obstacles) {
  for (const box of obstacles) {
    const nearestX = clamp(body.x, box.x, box.x + box.w);
    const nearestY = clamp(body.y, box.y, box.y + box.h);

    const dx = body.x - nearestX;
    const dy = body.y - nearestY;
    const distance = Math.hypot(dx, dy);

    let nx;
    let ny;
    let push;

    if (distance > 0) {
      if (distance >= body.radius) continue;
      nx = dx / distance;
      ny = dy / distance;
      push = body.radius - distance;
    } else {
      // The centre is inside the box — a fast sidestep can land there. Leave
      // by whichever face is closest, clearing the radius as well.
      const out = shortestWayOut(body, box);
      nx = out.nx;
      ny = out.ny;
      push = out.depth + body.radius;
    }

    body.x += nx * push;
    body.y += ny * push;

    stopInto(body, 'vx', 'vy', nx, ny);
    stopInto(body, 'dashVX', 'dashVY', nx, ny);
  }
}

/** Cancel the part of a velocity that points into the surface. */
function stopInto(body, xKey, yKey, nx, ny) {
  if (body[xKey] === undefined) return;

  const into = body[xKey] * nx + body[yKey] * ny;
  if (into >= 0) return;

  body[xKey] -= into * nx;
  body[yKey] -= into * ny;
}

/** Nearest face of a box the body's centre is currently inside, and how deep. */
function shortestWayOut(body, box) {
  const left = body.x - box.x;
  const right = box.x + box.w - body.x;
  const top = body.y - box.y;
  const bottom = box.y + box.h - body.y;
  const smallest = Math.min(left, right, top, bottom);

  if (smallest === left) return { nx: -1, ny: 0, depth: left };
  if (smallest === right) return { nx: 1, ny: 0, depth: right };
  if (smallest === top) return { nx: 0, ny: -1, depth: top };
  return { nx: 0, ny: 1, depth: bottom };
}

/**
 * True if the segment travelled this step clips any box. Boxes are inflated by
 * the bullet's radius so a bullet grazing a corner still stops.
 */
export function segmentHitsObstacle(x0, y0, x1, y1, radius, obstacles) {
  for (const box of obstacles) {
    if (segmentHitsBox(x0, y0, x1, y1, box, radius)) return true;
  }
  return false;
}

/** Slab method, clipped to the segment's own 0..1 range. */
function segmentHitsBox(x0, y0, x1, y1, box, radius) {
  const minX = box.x - radius;
  const minY = box.y - radius;
  const maxX = box.x + box.w + radius;
  const maxY = box.y + box.h + radius;

  const dx = x1 - x0;
  const dy = y1 - y0;

  let enter = 0;
  let exit = 1;

  for (const axis of [
    { start: x0, delta: dx, min: minX, max: maxX },
    { start: y0, delta: dy, min: minY, max: maxY },
  ]) {
    if (Math.abs(axis.delta) < 1e-9) {
      if (axis.start < axis.min || axis.start > axis.max) return false;
      continue;
    }
    let t1 = (axis.min - axis.start) / axis.delta;
    let t2 = (axis.max - axis.start) / axis.delta;
    if (t1 > t2) [t1, t2] = [t2, t1];

    enter = Math.max(enter, t1);
    exit = Math.min(exit, t2);
    if (enter > exit) return false;
  }

  return true;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
