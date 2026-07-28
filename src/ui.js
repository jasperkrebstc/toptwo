import { SETTING_DEFS, settings, setSetting, resetSettings, onSettingsChange } from './settings.js';

const MODE_STORAGE_KEY = 'toptwo.mode.v1';

/**
 * Builds the dev panel from SETTING_DEFS. Each setting gets a slider and a
 * number box that stay in sync with each other and with the live value.
 */
export function initSettingsUI(listEl, resetButtonEl) {
  const controls = new Map();
  let currentGroup = null;

  for (const def of SETTING_DEFS) {
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

  function syncFromSettings() {
    for (const { def, range, number } of controls.values()) {
      range.value = settings[def.id];
      number.value = format(settings[def.id], def.step);
    }
  }

  resetButtonEl.addEventListener('click', () => {
    resetSettings();
    resetButtonEl.blur();
  });

  onSettingsChange((id) => {
    // A bulk change (reset) needs every control refreshed; a single change
    // was already reflected by the control the user is holding.
    if (id === null) syncFromSettings();
  });

  syncFromSettings();
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
