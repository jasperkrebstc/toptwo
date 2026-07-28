/**
 * Seeded random numbers.
 *
 * The map generator must produce the same map for the same seed every time —
 * on both players' screens, and on every reload — so it can't use Math.random.
 * This is mulberry32: tiny, fast, and good enough for scattering boxes.
 */
export function createRng(seed) {
  let state = (seed >>> 0) || 1;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max]. */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
