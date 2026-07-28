/**
 * Keyboard state.
 *
 * The game asks "is this key down right now?" rather than reacting to events,
 * which is what makes smooth diagonal movement fall out for free: if both W
 * and D are held, both are simply true on the same frame.
 */

const down = new Set();

/** Keys we swallow so the page doesn't scroll while playing. */
const SWALLOWED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);

export function initInput(target = window) {
  target.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (SWALLOWED.has(e.code)) e.preventDefault();
    down.add(e.code);
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

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
