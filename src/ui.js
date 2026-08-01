import {
  SETTING_DEFS, settings, setSetting, resetSettings, onSettingsChange,
  listProfiles, activeProfile, switchProfile, createProfile, deleteProfile,
  onProfilesChange,
} from './settings.js';

const MODE_STORAGE_KEY = 'toptwo.mode.v1';

/**
 * Builds the dev panel from SETTING_DEFS. Each setting gets a slider and a
 * number box that stay in sync with each other and with the live value.
 */
export function initSettingsUI(listEl, resetButtonEl, getMode) {
  let controls = new Map();

  function build() {
    controls = new Map();
    listEl.replaceChildren();
    buildControls(listEl, controls, getMode());
    syncFromSettings(controls);
  }

  resetButtonEl.addEventListener('click', () => {
    resetSettings();
    resetButtonEl.blur();
  });

  onSettingsChange((id) => {
    // A bulk change (reset, or a profile switch) needs every control
    // refreshed; a single change was already reflected by the control the
    // user is holding.
    if (id === null) syncFromSettings(controls);
  });

  build();
  return build;   // called again when the game mode changes
}

function syncFromSettings(controls) {
  for (const { def, range, number } of controls.values()) {
    range.value = settings[def.id];
    number.value = format(settings[def.id], def.step);
  }
}

function buildControls(listEl, controls, mode) {
  let currentGroup = null;

  for (const def of SETTING_DEFS) {
    if (def.modes && !def.modes.includes(mode)) continue;

    if (def.group && def.group !== currentGroup) {
      currentGroup = def.group;
      const heading = document.createElement('h3');
      heading.className = 'settings-group';
      heading.textContent = def.group;
      listEl.append(heading);
    }

    const row = document.createElement('div');
    row.className = 'setting';

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.textContent = def.label;
    label.htmlFor = `setting-${def.id}-number`;

    const inputs = document.createElement('div');
    inputs.className = 'setting-row';

    const range = document.createElement('input');
    range.type = 'range';
    range.id = `setting-${def.id}-range`;
    range.min = def.min;
    range.max = def.max;
    range.step = def.step;

    const number = document.createElement('input');
    number.type = 'number';
    number.id = `setting-${def.id}-number`;
    number.min = def.min;
    number.max = def.max;
    number.step = def.step;

    inputs.append(range, number);
    row.append(label, inputs);

    if (def.hint) {
      const hint = document.createElement('p');
      hint.className = 'setting-hint';
      hint.textContent = def.hint;
      row.append(hint);
    }

    range.addEventListener('input', () => {
      const value = setSetting(def.id, range.value);
      number.value = format(value, def.step);
    });

    // A focused slider eats the arrow keys — which are Player 2's controls.
    // Hand focus back to the game as soon as the drag ends.
    range.addEventListener('change', () => range.blur());

    // Commit the typed value on change/blur so half-typed numbers don't fight
    // the clamp, and keep the slider following along while typing.
    number.addEventListener('input', () => {
      if (number.value === '') return;
      const value = setSetting(def.id, number.value);
      range.value = value;
    });
    number.addEventListener('change', () => {
      const value = setSetting(def.id, number.value);
      range.value = value;
      number.value = format(value, def.step);
    });

    number.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') number.blur();
    });

    controls.set(def.id, { def, range, number });
    listEl.append(row);
  }
}

/**
 * Profile picker: choose a saved set of values, branch off a new one, or drop
 * one. Edits always write straight into the selected profile, so there is
 * nothing to remember to save.
 */
export function initProfilesUI(root) {
  const select = root.querySelector('#profile-select');
  const newButton = root.querySelector('#profile-new');
  const deleteButton = root.querySelector('#profile-delete');

  function refresh() {
    const names = listProfiles();
    const active = activeProfile();

    select.replaceChildren(...names.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = name === active;
      return option;
    }));

    deleteButton.disabled = names.length <= 1;
  }

  select.addEventListener('change', () => {
    switchProfile(select.value);
    select.blur();
  });

  newButton.addEventListener('click', () => {
    const name = window.prompt('Name for the new profile', suggestName());
    newButton.blur();
    if (name === null) return;

    if (!createProfile(name)) {
      window.alert('That name is empty or already taken.');
    }
  });

  deleteButton.addEventListener('click', () => {
    const name = activeProfile();
    deleteButton.blur();
    if (window.confirm(`Delete the profile "${name}"?`)) deleteProfile(name);
  });

  onProfilesChange(refresh);
  refresh();
}

function suggestName() {
  const taken = new Set(listProfiles());
  for (let n = 2; ; n++) {
    const candidate = `Profile ${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Racing / Shooting toggle. Everything else keys off the stored mode. */
export function initGameModeUI(switchEl, getMode, setMode) {
  const buttons = [...switchEl.querySelectorAll('.mode-button')];

  function apply() {
    const mode = getMode();
    document.body.dataset.game = mode;
    for (const button of buttons) {
      button.classList.toggle('is-active', button.dataset.game === mode);
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      setMode(button.dataset.game);
      button.blur();
    });
  }

  apply();
  return apply;
}

/** Develop / Play toggle. Play mode just hides everything marked .dev-only. */
export function initModeUI(switchEl) {
  const buttons = [...switchEl.querySelectorAll('.mode-button')];

  function apply(mode) {
    document.body.classList.toggle('mode-develop', mode === 'develop');
    document.body.classList.toggle('mode-play', mode === 'play');
    for (const button of buttons) {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    }
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch { /* ignore */ }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      apply(button.dataset.mode);
      // Otherwise the button keeps focus and swallows the next Space press.
      button.blur();
    });
  }

  let saved = null;
  try {
    saved = localStorage.getItem(MODE_STORAGE_KEY);
  } catch { /* ignore */ }
  apply(saved === 'play' ? 'play' : 'develop');
}

function format(value, step) {
  const decimals = decimalsFor(step);
  return Number(value).toFixed(decimals);
}

function decimalsFor(step) {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}
