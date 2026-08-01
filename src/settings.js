/**
 * Live-tunable settings.
 *
 * Adding a new dev control is a one-liner: append a definition to
 * SETTING_DEFS and a labelled slider + number box appears in the dev panel,
 * with persistence and reset handled for free. Read the current value from
 * anywhere with `settings.<id>`. Entries sharing a `group` are shown together
 * under a heading, in the order listed here.
 */

const STORAGE_KEY = 'toptwo.profiles.v1';
const LEGACY_KEY = 'toptwo.settings.v1';
const FIRST_PROFILE = 'Default';

/**
 * `modes` limits a setting to one game mode; leaving it off means it applies to
 * both. The dev panel only shows the settings that do something in the mode
 * you're currently in.
 */
export const SETTING_DEFS = [
  {
    id: 'playerCount',
    group: 'Match',
    label: 'Players',
    hint: 'How many players and viewports. Changing it restarts the round.',
    min: 2,
    max: 4,
    step: 1,
    default: 2,
  },
  {
    id: 'worldSize',
    group: 'Match',
    label: 'World size',
    hint: 'Side of the square world, in world units.',
    min: 500,
    max: 6000,
    step: 100,
    default: 2200,
  },
  {
    id: 'lapsToWin',
    group: 'Race',
    modes: ['race'],
    label: 'Laps to win',
    hint: 'First car to finish this many laps wins.',
    min: 1,
    max: 20,
    step: 1,
    default: 3,
  },
  {
    id: 'countdownSeconds',
    group: 'Race',
    modes: ['race'],
    label: 'Countdown (s)',
    hint: 'Lights-out delay after pressing Start.',
    min: 1,
    max: 10,
    step: 1,
    default: 3,
  },
  {
    id: 'trackSeed',
    group: 'Track',
    modes: ['race'],
    label: 'Track seed',
    hint: 'Change it for a completely different circuit.',
    min: 1,
    max: 9999,
    step: 1,
    default: 7,
  },
  {
    id: 'trackCorners',
    group: 'Track',
    modes: ['race'],
    label: 'Corners',
    hint: 'How many corners the circuit is built from.',
    min: 3,
    max: 16,
    step: 1,
    default: 8,
  },
  {
    id: 'trackCurviness',
    group: 'Track',
    modes: ['race'],
    label: 'Curviness',
    hint: 'How far corners wander from a perfect circle. 0 is a plain oval.',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.55,
  },
  {
    id: 'cornerSharpness',
    group: 'Track',
    modes: ['race'],
    label: 'Corner sharpness',
    hint: 'Low is sweeping and round; high gives tight corners joined by long straights.',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.55,
  },
  {
    id: 'trackWidth',
    group: 'Track',
    modes: ['race'],
    label: 'Track width',
    hint: 'Width of the tarmac, in world units.',
    min: 60,
    max: 600,
    step: 10,
    default: 240,
  },
  {
    id: 'offTrackSpeed',
    group: 'Track',
    modes: ['race'],
    label: 'Off-track speed',
    hint: 'Top speed multiplier on the grass. Low values punish running wide.',
    min: 0.05,
    max: 1,
    step: 0.05,
    default: 0.35,
  },
  {
    id: 'gridSize',
    group: 'World',
    modes: ['shoot'],
    label: 'Grid size',
    hint: 'Spacing of the background grid. Your only sense of speed.',
    min: 20,
    max: 500,
    step: 10,
    default: 100,
  },
  {
    id: 'worldSeed',
    modes: ['shoot'],
    group: 'World',
    label: 'Map seed',
    hint: 'Change it for a completely different map.',
    min: 1,
    max: 9999,
    step: 1,
    default: 1337,
  },
  {
    id: 'obstacleClusters',
    modes: ['shoot'],
    group: 'World',
    label: 'Cover clusters',
    hint: 'How many clumps of boxes to scatter. 0 for an open field.',
    min: 0,
    max: 80,
    step: 1,
    default: 16,
  },
  {
    id: 'clusterSize',
    modes: ['shoot'],
    group: 'World',
    label: 'Cluster size',
    hint: 'Boxes per clump. Bigger makes longer walls.',
    min: 1,
    max: 40,
    step: 1,
    default: 8,
  },
  {
    id: 'speedMultiplier',
    group: 'Movement',
    label: 'Top speed',
    hint: 'Multiplier on the base forward speed.',
    min: 0.1,
    max: 5,
    step: 0.05,
    default: 1,
  },
  {
    id: 'acceleration',
    group: 'Movement',
    label: 'Acceleration',
    hint: 'How hard the engine pushes. Lower = slower to get going.',
    min: 100,
    max: 3000,
    step: 50,
    default: 650,
  },
  {
    id: 'braking',
    group: 'Movement',
    label: 'Braking',
    hint: 'How quickly you coast to a stop with no input. Lower = more glide.',
    min: 0.2,
    max: 15,
    step: 0.1,
    default: 2.6,
  },
  {
    id: 'grip',
    group: 'Movement',
    label: 'Grip',
    hint: 'How hard the tyres bite. Low values let the back end slide out when you turn at speed.',
    min: 0.3,
    max: 30,
    step: 0.1,
    default: 7,
  },
  {
    id: 'turnSpeed',
    group: 'Movement',
    label: 'Turn speed (deg/s)',
    hint: 'Top rate A and D swing you around at.',
    min: 30,
    max: 720,
    step: 10,
    default: 200,
  },
  {
    id: 'turnAcceleration',
    group: 'Movement',
    label: 'Turn ramp-up (deg/s2)',
    hint: 'How fast the turn builds to that rate, and stops afterwards.',
    min: 100,
    max: 4000,
    step: 50,
    default: 900,
  },
  {
    id: 'sprintSpeedFactor',
    modes: ['shoot'],
    group: 'Movement',
    label: 'Sprint speed x',
    hint: 'Top speed multiplier while sprinting.',
    min: 1,
    max: 3,
    step: 0.05,
    default: 1.7,
  },
  {
    id: 'sprintTurnFactor',
    modes: ['shoot'],
    group: 'Movement',
    label: 'Sprint turn x',
    hint: 'Turn rate multiplier while sprinting. Below 1 makes sprinting commit you to a line.',
    min: 0.1,
    max: 1,
    step: 0.05,
    default: 0.5,
  },
  {
    id: 'bulletSpeed',
    modes: ['shoot'],
    group: 'Shooting',
    label: 'Bullet speed',
    hint: 'World units per second. Applies to bullets already in the air too.',
    min: 50,
    max: 2000,
    step: 10,
    default: 520,
  },
  {
    id: 'fireCooldown',
    modes: ['shoot'],
    group: 'Shooting',
    label: 'Fire cooldown (s)',
    hint: 'Time between shots while the shoot key is held.',
    min: 0.05,
    max: 2,
    step: 0.05,
    default: 0.35,
  },
  {
    id: 'recoilKick',
    modes: ['shoot'],
    group: 'Shooting',
    label: 'Recoil kick',
    hint: 'Backward shove per shot. It feeds the same momentum as driving, so braking and grip decide how far you slide.',
    min: 0,
    max: 900,
    step: 10,
    default: 130,
  },
  {
    id: 'damagePerBullet',
    modes: ['shoot'],
    group: 'Combat',
    label: 'Damage per bullet',
    hint: 'Taken off shield first, then health.',
    min: 1,
    max: 200,
    step: 1,
    default: 20,
  },
  {
    id: 'maxHealth',
    modes: ['shoot'],
    group: 'Combat',
    label: 'Player health',
    hint: 'Never regenerates. Changing this refills both players.',
    min: 10,
    max: 500,
    step: 5,
    default: 100,
  },
  {
    id: 'respawnDelay',
    modes: ['shoot'],
    group: 'Combat',
    label: 'Respawn delay (s)',
    hint: 'Pause after dying before returning at full health.',
    min: 0,
    max: 5,
    step: 0.1,
    default: 1,
  },
  {
    id: 'maxShield',
    modes: ['shoot'],
    group: 'Shield',
    label: 'Shield amount',
    hint: 'Absorbs damage before health does. Set to 0 for no shield.',
    min: 0,
    max: 500,
    step: 5,
    default: 50,
  },
  {
    id: 'shieldRegenDelay',
    modes: ['shoot'],
    group: 'Shield',
    label: 'Shield delay (s)',
    hint: 'Time without being hit before the shield starts recovering.',
    min: 0,
    max: 10,
    step: 0.1,
    default: 3,
  },
  {
    id: 'shieldRegenRate',
    modes: ['shoot'],
    group: 'Shield',
    label: 'Shield recovery / s',
    hint: 'Shield points restored per second once recovery starts.',
    min: 1,
    max: 300,
    step: 1,
    default: 25,
  },
  {
    id: 'maxStamina',
    modes: ['shoot'],
    group: 'Stamina',
    label: 'Stamina',
    hint: 'Pool that sidesteps and sprinting both draw from.',
    min: 10,
    max: 400,
    step: 5,
    default: 100,
  },
  {
    id: 'dashCost',
    modes: ['shoot'],
    group: 'Stamina',
    label: 'Sidestep cost',
    hint: 'Stamina spent per sidestep. A sidestep is refused if you cannot pay.',
    min: 0,
    max: 200,
    step: 5,
    default: 30,
  },
  {
    id: 'sprintCost',
    modes: ['shoot'],
    group: 'Stamina',
    label: 'Sprint cost / s',
    hint: 'Stamina drained per second of sprinting.',
    min: 0,
    max: 150,
    step: 1,
    default: 22,
  },
  {
    id: 'staminaRegenDelay',
    modes: ['shoot'],
    group: 'Stamina',
    label: 'Stamina delay (s)',
    hint: 'Pause after spending stamina before it starts coming back.',
    min: 0,
    max: 5,
    step: 0.1,
    default: 0.8,
  },
  {
    id: 'staminaRegenRate',
    modes: ['shoot'],
    group: 'Stamina',
    label: 'Stamina recovery / s',
    hint: 'Stamina restored per second once recovery starts.',
    min: 1,
    max: 300,
    step: 1,
    default: 28,
  },
  {
    id: 'dashDistance',
    modes: ['shoot'],
    group: 'Dash',
    label: 'Sidestep distance',
    hint: 'How far a sidestep carries you, in world units.',
    min: 20,
    max: 400,
    step: 5,
    default: 130,
  },
  {
    id: 'dashDuration',
    modes: ['shoot'],
    group: 'Dash',
    label: 'Sidestep duration (s)',
    hint: 'How long the sidestep takes. Shorter is snappier.',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    default: 0.12,
  },
  {
    id: 'dashCooldown',
    modes: ['shoot'],
    group: 'Dash',
    label: 'Sidestep cooldown (s)',
    hint: 'Wait before you can sidestep again, on top of the stamina cost.',
    min: 0,
    max: 5,
    step: 0.05,
    default: 1.2,
  },
  {
    id: 'doubleTapWindow',
    modes: ['shoot'],
    group: 'Dash',
    label: 'Double-tap window (ms)',
    hint: 'Max gap between the two taps that trigger a sidestep or a sprint.',
    min: 80,
    max: 600,
    step: 10,
    default: 260,
  },
];

/** Live values, read directly by the game each frame. */
export const settings = {};

const listeners = new Set();
const profileListeners = new Set();

/**
 * Named profiles, so a set of values can be kept and switched between —
 * "fast and floaty" against "heavy tank", say. The active profile is written
 * to on every change, so tuning is never lost and there is no Save button to
 * forget.
 */
let store = { active: FIRST_PROFILE, profiles: {} };

function clamp(def, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def.default;
  return Math.min(def.max, Math.max(def.min, n));
}

function getDef(id) {
  return SETTING_DEFS.find((def) => def.id === id);
}

function defaultValues() {
  const values = {};
  for (const def of SETTING_DEFS) values[def.id] = def.default;
  return values;
}

/** Fill the live settings from a stored (possibly partial or stale) snapshot. */
function applyValues(values) {
  for (const def of SETTING_DEFS) {
    settings[def.id] = def.id in values ? clamp(def, values[def.id]) : def.default;
  }
}

function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && raw.profiles && Object.keys(raw.profiles).length > 0) return raw;
  } catch { /* fall through to a fresh store */ }

  // Carry over the single settings blob from before profiles existed.
  let legacy = null;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
  } catch { /* ignore */ }

  return {
    active: FIRST_PROFILE,
    profiles: { [FIRST_PROFILE]: legacy || defaultValues() },
  };
}

function writeStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Storage can be unavailable (private mode); tuning still works in-session. */
  }
}

function save() {
  store.profiles[store.active] = { ...settings };
  writeStore();
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

/** Restore every setting in the active profile to its default. */
export function resetSettings() {
  applyValues(defaultValues());
  save();
  emit(null);
}

/* -------------------------------------------------------------- profiles --- */

export function listProfiles() {
  return Object.keys(store.profiles);
}

export function activeProfile() {
  return store.active;
}

/** Load a profile's values. Unknown names are ignored. */
export function switchProfile(name) {
  if (!(name in store.profiles)) return;

  store.active = name;
  applyValues(store.profiles[name]);
  writeStore();
  emit(null);
  emitProfiles();
}

/** Copy the current values into a new profile and switch to it. */
export function createProfile(name) {
  const clean = name.trim();
  if (!clean || clean in store.profiles) return false;

  store.profiles[clean] = { ...settings };
  store.active = clean;
  writeStore();
  emitProfiles();
  return true;
}

/** Delete a profile. The last one is kept, since something has to be active. */
export function deleteProfile(name) {
  if (!(name in store.profiles)) return false;
  if (listProfiles().length <= 1) return false;

  delete store.profiles[name];
  if (store.active === name) {
    store.active = listProfiles()[0];
    applyValues(store.profiles[store.active]);
    emit(null);
  }
  writeStore();
  emitProfiles();
  return true;
}

/* -------------------------------------------------------------- listeners --- */

/** Subscribe to changes. The callback receives the changed id, or null for a bulk change. */
export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Subscribe to the profile list or selection changing. */
export function onProfilesChange(fn) {
  profileListeners.add(fn);
  return () => profileListeners.delete(fn);
}

function emit(id) {
  for (const fn of listeners) fn(id);
}

function emitProfiles() {
  for (const fn of profileListeners) fn();
}

store = readStore();
if (!(store.active in store.profiles)) store.active = listProfiles()[0];
applyValues(store.profiles[store.active]);
