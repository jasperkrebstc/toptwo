# Top Two

A simple local-multiplayer top-down 2D arcade shooter. Two players, one
keyboard, one square world — shown as split-screen, a viewport per player.

Players handle like small tanks: you drive forward and back along the way you
are pointing, and steer to aim. Each player's own view keeps them centred and
pointing up the screen, with the world rotating underneath.

## Running it

The game uses ES modules, which browsers refuse to load over `file://`, so it
needs to be served. From the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works — `npx serve`, VS Code's Live Server extension, etc.)

## Controls

| | Drive | Turn | Shoot |
|---|---|---|---|
| Player 1 (blue) | `W` `S` | `A` `D` | `Space` |
| Player 2 (red) | `↑` `↓` | `←` `→` | `Right Shift` (or `Enter`) |

Turning is continuous, so you can aim at any angle — not just the eight the old
grid-style movement allowed. The barrel sticking out of each dot shows where
its shots will go.

**Shooting.** Tap to fire a single shot; hold to fire repeatedly at the fire
cooldown. Bullets fly straight, disappear at the wall, and damage the *other*
player on contact — your own bullets pass through you. Each shot shoves you
backwards; the kick decays rather than teleporting you, so a burst pushes you
further than a single shot.

**Health and shield.** Two bars sit under each dot: shield on top (light blue),
health below (the player's colour). Damage comes off the shield first and
overflows into health. The shield starts recovering once a player has gone
untouched for the shield delay, and any hit restarts that clock. Health never
recovers — only dying restores it. At zero health a player disappears for the
respawn delay, then returns at their spawn point at full health and shield.

**Dashing.** Double-tap a movement key to dash. `W W` lunges forward and `S S`
backwards; `A A` and `D D` sidestep left and right *without turning*, which is
the only way to move sideways. A ring appears around the dot while it's
dashing, and the dash is unavailable until its cooldown has passed.

**Finding each other.** The world is much bigger than one viewport. The
background grid is what makes your movement and rotation readable, and when
your opponent is off screen an arrow on the edge of your view points at them.

## Develop vs Play mode

The toggle in the top right switches between them. **Develop** shows the tuning
panels around the world; **Play** hides them and gives the world more room. The
choice is remembered between reloads.

Settings changes apply instantly and are saved to `localStorage`, so a reload
keeps your tuning. **Reset to defaults** puts everything back.

## Project layout

```
index.html          markup: top bar, dev panels, the two view canvases
css/style.css       all styling
src/
  main.js           wires everything together
  config.js         static config: view size, base speed, player defs + key bindings
  settings.js       live-tunable settings + persistence  <- add sliders here
  ui.js             builds the dev panel; Develop/Play toggle
  input.js          keyboard state: held keys + press history for double taps
  game.js           the game state and its update step
  player.js         player creation, driving, turning, dashing, shooting, recoil
  bullet.js         bullet spawning and flight
  combat.js         hit detection, damage, shield recovery, death
  render.js         one rotating camera per player: grid, entities, HUD
  loop.js           fixed-timestep game loop
```

### Adding a dev setting

Append one entry to `SETTING_DEFS` in `src/settings.js`:

```js
{ id: 'bulletSize', group: 'Shooting', label: 'Bullet size', min: 1, max: 20, step: 1, default: 4 }
```

A labelled slider + number box appears in the panel, the value persists, and
reset works — no UI code needed. Read it anywhere with `settings.bulletSize`.
Entries sharing a `group` are listed together under a heading.

### Notes on the architecture

- **Fixed timestep.** The simulation steps in 1/60s slices regardless of
  refresh rate, so the game feels the same on any monitor and fast bullets
  can't skip through things later.
- **Polled input, recorded presses.** Movement asks which keys are held, so
  diagonal movement falls out for free. Shooting and dashing instead read a
  press log written straight from the key events — a tap shorter than one
  frame would otherwise be missed entirely.
- **Key bindings are data** in `config.js`, so rebinding later is a config
  change, not a code change.
- **`heading` is the single source of truth** for where a player points. The
  cameras, bullets, recoil and dash directions all derive from it, so the aim
  you see is exactly the aim the simulation uses.
- **The camera rotates, the world doesn't.** Each view applies one canvas
  transform (translate to centre, rotate by `-heading - 90°`, translate to the
  player) and then draws everything in plain world coordinates. Bars and
  off-screen arrows are drawn after that transform is undone, so they stay
  upright and readable however the player is turned.
- **Swept hit detection.** A hit tests the whole segment a bullet crossed this
  step, not just where it ended up. At the top of the bullet-speed slider a
  bullet moves further per step than a player is wide, so a position-only
  check would let it pass straight through.
