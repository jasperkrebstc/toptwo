/**
 * Keyboard state.
 *
 * Two kinds of question get asked of this module:
 *   - "is this key down right now?" (isDown) — drives movement, which is what
 *     makes smooth diagonals fall out for free: hold W and D and both are
 *     simply true on the same frame.
 *   - "when was this key pressed?" (pressLog) — drives double-tap dashing.
 *     Presses are recorded from the events themselves rather than sampled per
 *     frame, so a very fast double tap can't slip between two frames.
 */

const down = new Set();

/** code -> { count, last, prev } where times are performance.now() ms. */
const presses = new Map();

/** Keys we swallow so the page doesn't scroll or re-trigger buttons while playing. */
const SWALLOWED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter',
]);

export function initInput(target = window) {
  target.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (SWALLOWED.has(e.code)) e.preventDefault();
    // Holding a key makes the OS fire repeats; those aren't new presses.
    if (e.repeat) return;
    down.add(e.code);
    recordPress(e.code);
  });

  target.addEventListener('keyup', (e) => {
    down.delete(e.code);
  });

  // Without this, alt-tabbing mid-move leaves a key "stuck" down forever.
  target.addEventListener('blur', () => down.clear());
}

/** True if any of the given KeyboardEvent.code values is currently held. */
export function isDown(codes) {
  for (const code of codes) {
    if (down.has(code)) return true;
  }
  return false;
}

/**
 * Press history for a set of codes: how many presses have happened in total,
 * and when the last two were. Callers detect "a new press happened" by
 * watching `count` change, then measure `last - prev` for a double tap.
 */
export function pressLog(codes) {
  let count = 0;
  let newest = null;
  for (const code of codes) {
    const log = presses.get(code);
    if (!log) continue;
    count += log.count;
    if (!newest || log.last > newest.last) newest = log;
  }
  return {
    count,
    last: newest ? newest.last : -Infinity,
    prev: newest ? newest.prev : -Infinity,
  };
}

function recordPress(code) {
  const log = presses.get(code) || { count: 0, last: -Infinity, prev: -Infinity };
  log.prev = log.last;
  log.last = performance.now();
  log.count += 1;
  presses.set(code, log);
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
