/**
 * Live-tunable settings.
 *
 * Adding a new dev control is a one-liner: append a definition to
 * SETTING_DEFS and a labelled slider + number box appears in the dev panel,
 * with persistence and reset handled for free. Read the current value from
 * anywhere with `settings.<id>`.
 */

const STORAGE_KEY = 'toptwo.settings.v1';

export const SETTING_DEFS = [
  {
    id: 'speedMultiplier',
    label: 'Player speed',
    hint: 'Multiplier on the base movement speed.',
    min: 0.1,
    max: 5,
    step: 0.05,
    default: 1,
  },
];

/** Live values, read directly by the game each frame. */
export const settings = {};

const listeners = new Set();

function clamp(def, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def.default;
  return Math.min(def.max, Math.max(def.min, n));
}

function getDef(id) {
  return SETTING_DEFS.find((def) => def.id === id);
}

function load() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    stored = {};
  }
  for (const def of SETTING_DEFS) {
    settings[def.id] = def.id in stored ? clamp(def, stored[def.id]) : def.default;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* Storage can be unavailable (private mode); tuning still works in-session. */
  }
}

/** Set one setting, persist it and notify listeners. Returns the clamped value. */
export function setSetting(id, value) {
  const def = getDef(id);
  if (!def) return undefined;
  settings[id] = clamp(def, value);
  save();
  emit(id);
  return settings[id];
}

/** Restore every setting to its default. */
export function resetSettings() {
  for (const def of SETTING_DEFS) settings[def.id] = def.default;
  save();
  emit(null);
}

/** Subscribe to changes. The callback receives the changed id, or null for a bulk change. */
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(id) {
  for (const fn of listeners) fn(id);
}

load();
