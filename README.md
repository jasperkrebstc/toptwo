# Top Two

A very simple local-multiplayer top-down 2D arcade shooter. Two players, one
keyboard, one square world.

Right now: two dots that move around a square. Everything else builds on top.

## Running it

The game uses ES modules, which browsers refuse to load over `file://`, so it
needs to be served. From the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works — `npx serve`, VS Code's Live Server extension, etc.)

## Controls

| | Move |
|---|---|
| Player 1 (blue) | `W` `A` `S` `D` |
| Player 2 (red) | `↑` `←` `↓` `→` |

Holding two keys moves diagonally at the same speed as a straight line. The
short line sticking out of each dot shows which way it is looking — the
direction shots will travel once shooting exists.

## Develop vs Play mode

The toggle in the top right switches between them. **Develop** shows the tuning
panels around the world; **Play** hides them and gives the world more room. The
choice is remembered between reloads.

Settings changes apply instantly and are saved to `localStorage`, so a reload
keeps your tuning. **Reset to defaults** puts everything back.

## Project layout

```
index.html          markup: top bar, dev panels, canvas
css/style.css       all styling
src/
  main.js           wires everything together
  config.js         static config: world size, base speed, player defs + key bindings
  settings.js       live-tunable settings + persistence  <- add sliders here
  ui.js             builds the dev panel; Develop/Play toggle
  input.js          keyboard state ("is this key down?")
  game.js           the game state and its update step
  player.js         player creation and per-frame movement
  render.js         drawing the world
  loop.js           fixed-timestep game loop
```

### Adding a dev setting

Append one entry to `SETTING_DEFS` in `src/settings.js`:

```js
{ id: 'bulletSpeed', label: 'Bullet speed', min: 50, max: 2000, step: 10, default: 600 }
```

A labelled slider + number box appears in the panel, the value persists, and
reset works — no UI code needed. Read it anywhere with `settings.bulletSpeed`.

### Notes on the architecture

- **Fixed timestep.** The simulation steps in 1/60s slices regardless of
  refresh rate, so the game feels the same on any monitor and fast bullets
  can't skip through things later.
- **Polled input.** The game asks which keys are held rather than reacting to
  key events; diagonal movement falls out of that for free.
- **Key bindings are data** in `config.js`, so rebinding later is a config
  change, not a code change.
- **Facing is the last movement direction**, stored on the player and already
  drawn — shooting only has to read it.
