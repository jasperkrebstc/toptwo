import { settings } from './settings.js';
import { createRng } from './rng.js';

/** Distance between centreline samples, in world units. */
const SPACING = 9;

/**
 * Racetrack generation.
 *
 * Real circuits are straights joined by corners of varying radius, so that is
 * what we build rather than a wobbly loop:
 *
 *   1. Scatter corner vertices around a circle, in polar order. Keeping the
 *      angles strictly increasing keeps the polygon itself simple.
 *   2. Round off each vertex with a circular arc. What is left of each polygon
 *      edge becomes a straight, and the arc becomes the corner. Corner
 *      sharpness varies per corner, so a lap mixes hairpins with sweepers.
 *   3. Check the result really is a simple loop, and damp the jitter until it
 *      is — see generateTrack.
 *
 * Corner sharpness then does something meaningful: at 0 the arcs swallow the
 * edges whole and the track approaches a circle; at 1 they are tight hairpins
 * joined by long straights.
 */
export function generateTrack() {
  // Polar order stops the *polygon* crossing itself, but a deep inward notch
  // can still leave a reflex corner whose fillet bulges back over the loop. So
  // build, check, and damp the jitter until it comes out clean. Fully damped is
  // a plain oval, which cannot fail — so this always terminates with a
  // drivable circuit, and the same seed still gives the same track.
  for (let attempt = 0; attempt < 6; attempt++) {
    const track = buildTrack(1 - attempt * 0.18);
    if (!selfIntersects(track.samples) && fitsInWorld(track.samples)) return track;
  }
  return buildTrack(0);
}

/** Corner arcs can bulge past their vertex, so check the finished line too. */
function fitsInWorld(samples) {
  const size = settings.worldSize;
  const edge = settings.trackWidth / 2 + 4;

  return samples.every((p) => p.x > edge && p.y > edge
    && p.x < size - edge && p.y < size - edge);
}

function buildTrack(damping) {
  const rng = createRng(settings.trackSeed);
  const size = settings.worldSize;
  const centre = { x: size / 2, y: size / 2 };

  // Budget the radius so even the most outward-jittered corner keeps its kerb
  // inside the world; otherwise the track would run off the map and cars would
  // hit an invisible wall mid-corner.
  const curviness = settings.trackCurviness * damping;
  const margin = settings.trackWidth / 2 + 30;
  const outermost = Math.max(80, size / 2 - margin);
  const baseRadius = outermost / (1 + 0.42 * curviness);

  const vertices = relaxNotches(placeVertices(rng, centre, baseRadius, curviness), centre);
  const { path, straights } = roundCorners(vertices, rng, curviness);
  const samples = resample(path);

  addTangents(samples);

  // Start on the longest straight, the way a real circuit does.
  const startAt = longestStraightMidpoint(straights, samples);
  rotate(samples, startAt);

  return {
    centre,
    samples,
    spacing: SPACING,
    length: samples.length * SPACING,
    outline: buildOutline(samples),
  };
}

function placeVertices(rng, centre, baseRadius, curviness) {
  const corners = Math.round(settings.trackCorners);
  const vertices = [];

  for (let i = 0; i < corners; i++) {
    // Both jitters are bounded so the angles stay strictly increasing.
    const step = (Math.PI * 2) / corners;
    const angle = i * step + (rng() * 2 - 1) * step * 0.35 * curviness;
    const radius = baseRadius * (1 + (rng() * 2 - 1) * 0.42 * curviness);

    vertices.push({
      x: centre.x + Math.cos(angle) * radius,
      y: centre.y + Math.sin(angle) * radius,
    });
  }
  return vertices;
}

/**
 * Fill in notches that dip far below their neighbours. Those are what create
 * the reflex corners whose fillets fold back over the track, and pulling them
 * out costs far less character than damping every jitter on the circuit.
 */
function relaxNotches(vertices, centre) {
  const n = vertices.length;
  const angles = vertices.map((v) => Math.atan2(v.y - centre.y, v.x - centre.x));
  const radii = vertices.map((v) => Math.hypot(v.x - centre.x, v.y - centre.y));

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      const floor = Math.min(radii[(i - 1 + n) % n], radii[(i + 1) % n]) * 0.72;
      if (radii[i] < floor) radii[i] = floor;
    }
  }

  return radii.map((radius, i) => ({
    x: centre.x + Math.cos(angles[i]) * radius,
    y: centre.y + Math.sin(angles[i]) * radius,
  }));
}

/** Replace every sharp vertex with a tangent circular arc. */
function roundCorners(vertices, rng, curviness) {
  const n = vertices.length;
  const path = [];
  const straights = [];

  let previousExit = null;

  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    const toPrev = unit(sub(vertices[(i - 1 + n) % n], v));
    const toNext = unit(sub(vertices[(i + 1) % n], v));

    const half = Math.acos(clamp(dot(toPrev, toNext), -1, 1)) / 2;

    // Degenerate corner: nothing to round.
    if (!Number.isFinite(half) || half < 0.06 || half > Math.PI / 2 - 0.01) {
      if (previousExit) straights.push({ from: previousExit, to: v });
      path.push({ ...v });
      previousExit = { ...v };
      continue;
    }

    // Vary sharpness corner by corner, so a lap mixes hairpins with sweepers
    // the way a real circuit does instead of repeating one corner all the way
    // round. Curviness controls how much the corners differ from each other.
    const spread = 0.45 * curviness;
    const sharpness = clamp(
      settings.cornerSharpness + (rng() * 2 - 1) * spread, 0, 1,
    );

    // How far back along each edge the arc starts. Sharper corners bite less
    // of the edge, leaving more of it as straight.
    const reach = Math.min(length(sub(vertices[(i - 1 + n) % n], v)),
                           length(sub(vertices[(i + 1) % n], v))) * 0.5;
    const inset = reach * (1 - sharpness * 0.85);
    const radius = inset * Math.tan(half);

    const bisector = unit(add(toPrev, toNext));
    const arcCentre = {
      x: v.x + bisector.x * (radius / Math.sin(half)),
      y: v.y + bisector.y * (radius / Math.sin(half)),
    };

    const entry = { x: v.x + toPrev.x * inset, y: v.y + toPrev.y * inset };
    const exit = { x: v.x + toNext.x * inset, y: v.y + toNext.y * inset };

    if (previousExit) straights.push({ from: previousExit, to: entry });
    path.push(entry);

    let from = Math.atan2(entry.y - arcCentre.y, entry.x - arcCentre.x);
    const to = Math.atan2(exit.y - arcCentre.y, exit.x - arcCentre.x);
    let sweep = to - from;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;

    const steps = Math.max(3, Math.ceil((Math.abs(sweep) * radius) / SPACING));
    for (let s = 1; s <= steps; s++) {
      const a = from + (sweep * s) / steps;
      path.push({ x: arcCentre.x + Math.cos(a) * radius, y: arcCentre.y + Math.sin(a) * radius });
    }

    previousExit = exit;
  }

  // Close the loop back to the first arc entry.
  if (previousExit) straights.push({ from: previousExit, to: path[0] });

  return { path, straights };
}

/** Even spacing makes distance-along-track and lookups simple. */
function resample(path) {
  const out = [];
  let carry = 0;

  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    const segment = length(sub(b, a));
    if (segment < 1e-6) continue;

    for (let d = carry; d < segment; d += SPACING) {
      const t = d / segment;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    carry = ((carry - segment) % SPACING + SPACING) % SPACING;
  }
  return out;
}

function addTangents(samples) {
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const next = samples[(i + 1) % n];
    const prev = samples[(i - 1 + n) % n];
    const t = unit({ x: next.x - prev.x, y: next.y - prev.y });
    samples[i].tx = t.x;
    samples[i].ty = t.y;
  }
}

function longestStraightMidpoint(straights, samples) {
  let best = null;
  let bestLength = -1;

  for (const straight of straights) {
    const len = length(sub(straight.to, straight.from));
    if (len > bestLength) {
      bestLength = len;
      best = {
        x: (straight.from.x + straight.to.x) / 2,
        y: (straight.from.y + straight.to.y) / 2,
      };
    }
  }
  if (!best) return 0;

  return nearestIndex(samples, best.x, best.y);
}

function rotate(samples, start) {
  if (start <= 0) return;
  const head = samples.splice(0, start);
  samples.push(...head);
}

/** Cached Path2D of the centreline, stroked at various widths when drawing. */
function buildOutline(samples) {
  const path = new Path2D();
  samples.forEach((point, i) => {
    if (i === 0) path.moveTo(point.x, point.y);
    else path.lineTo(point.x, point.y);
  });
  path.closePath();
  return path;
}

/* ----------------------------------------------------------------- queries --- */

export function nearestIndex(samples, x, y) {
  let best = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < samples.length; i++) {
    const dx = samples[i].x - x;
    const dy = samples[i].y - y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** Distance from the centreline. Anything under half the width is on tarmac. */
export function distanceFromCentre(track, x, y) {
  const i = nearestIndex(track.samples, x, y);
  const point = track.samples[i];
  return Math.hypot(point.x - x, point.y - y);
}

export function isOnTrack(track, x, y) {
  return distanceFromCentre(track, x, y) <= settings.trackWidth / 2;
}

/** Exact check: does the closed polyline cross itself anywhere? */
function selfIntersects(samples) {
  const n = samples.length;

  for (let i = 0; i < n; i++) {
    const a1 = samples[i];
    const a2 = samples[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;    // adjacent across the seam
      if (segmentsCross(a1, a2, samples[j], samples[(j + 1) % n])) return true;
    }
  }
  return false;
}

function segmentsCross(p1, p2, p3, p4) {
  const side = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return side(p1, p2, p3) !== side(p1, p2, p4)
      && side(p3, p4, p1) !== side(p3, p4, p2);
}

/* ------------------------------------------------------------------- maths --- */

function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function dot(a, b) { return a.x * b.x + a.y * b.y; }
function length(v) { return Math.hypot(v.x, v.y); }
function unit(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
