/**
 * Which game we're playing. Racing and shooting share the same world, physics
 * and dev panel; the mode decides which mechanics and which settings exist.
 */
const STORAGE_KEY = 'toptwo.gamemode.v1';

export const MODES = ['race', 'shoot'];

let current = read();
const listeners = new Set();

export function getMode() {
  return current;
}

export function setMode(mode) {
  if (!MODES.includes(mode) || mode === current) return;

  current = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch { /* storage can be unavailable; the mode still works in-session */ }

  for (const fn of listeners) fn(current);
}

export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function read() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (MODES.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'race';
}
