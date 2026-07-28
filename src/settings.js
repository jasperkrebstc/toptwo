/**
 * Live-tunable settings.
 *
 * Adding a new dev control is a one-liner: append a definition to
 * SETTING_DEFS and a labelled slider + number box appears in the dev panel,
 * with persistence and reset handled for free. Read the current value from
 * anywhere with `settings.<id>`. Entries sharing a `group` are shown together
 * under a heading, in the order listed here.
 */

const STORAGE_KEY = 'toptwo.settings.v1';

export const SETTING_DEFS = [
  {
    id: 'worldSize',
    group: 'World',
    label: 'World size',
    hint: 'Side of the square world, in world units.',
    min: 500,
    max: 6000,
    step: 100,
    default: 2200,
  },
  {
    id: 'gridSize',
    group: 'World',
    label: 'Grid size',
    hint: 'Spacing of the background grid. Your only sense of speed.',
    min: 20,
    max: 500,
    step: 10,
    default: 100,
  },
  {
    id: 'worldSeed',
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
