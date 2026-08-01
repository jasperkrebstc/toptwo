# Top Two

A simple local-multiplayer top-down 2D game for two to four players on one
keyboard, in split-screen — a viewport per player.

Two modes, switched in the top bar:

- **Racing** — a procedurally generated circuit, a standing start, laps and
  fastest-lap times.
- **Shooting** — a deathmatch with cover, health, shields, sprinting and
  sidesteps.

Both share the same driving model. Cars handle with weight: they build speed,
carry momentum, and slide when you turn hard. Each player's own view keeps them
centred and pointing up the screen, with the world rotating underneath.

## Running it

The game uses ES modules, which browsers refuse to load over `file://`, so it
needs to be served. From the project root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works — `npx serve`, VS Code's Live Server extension, etc.)

## Controls

Set **Players** (2–4) in the dev panel; a viewport appears per player.

| | Seat | Drive | Turn | Shoot |
|---|---|---|---|---|
| Player 1 (blue) | far left | `W` `S` | `A` `D` | `Q` (or `Space`) |
| Player 2 (red) | far right | `↑` `↓` | `←` `→` | `Right Shift` (or `Enter`) |
| Player 3 (green) | middle left | `T` `G` | `F` `H` | `B` |
| Player 4 (purple) | middle right | `I` `K` | `J` `L` | `N` |

Seating runs left to right across the keyboard, so the clusters sit where the
hands do: Players 1 and 2 take the two ends, 3 and 4 the middle. Each player's
shoot key is inside their own cluster, so nobody reaches across anybody. In a
two-player game only P1 and P2 play, which keeps the original keys.

## Racing

Press **Start race** (or `Enter`) and the countdown runs: 3, 2, 1, GO. Controls
are dead until GO, so nobody can jump the start.

The circuit is generated from a seed. Tarmac is fast; the grass caps your speed
at a fraction of it, so running wide costs you the lap rather than ending it.
Cars leave rubber where they slide — the harder you're sideways, the darker the
mark.

A **minimap** in the corner of each view shows the same world much further
out, turning with the driver so up is always where they are heading — on a
viewport this small you otherwise meet a corner at the moment you should
already be turning into it. Rivals appear on it as dots. Its size and range
are sliders; size 0 hides it.

**Laps are counted as a full turn of the angle around the track's centre**,
accumulated frame by frame, rather than as a line crossing. Cheating is
impossible by construction: reversing back over the start line unwinds exactly
as much progress as it gained, and cutting across the infield never adds up to
a full turn. The first car to complete the set number of laps wins; each
player's best lap and the overall fastest lap are shown in their view.

Racing has no shooting, sprinting or sidesteps, and their settings disappear
from the dev panel.

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

**Sidestepping.** Double-tap `A` or `D` to sidestep left or right *without
turning* — the only way to move sideways. It costs stamina and has a cooldown,
and a ring shows on the dot while it runs.

**Sprinting.** Double-tap and hold forward to sprint: higher top speed, but
your turn rate drops, so sprinting commits you to a line. It drains stamina for
as long as it lasts, and ends when you let go, reverse, or run dry. A streak
trails the dot showing the direction you are actually travelling — which is not
the direction you're pointing once you start to drift.

**Stamina** is the amber bar, below health. Sidesteps and sprinting both draw
from it. It refills after a pause with no spending.

**Cover.** Clusters of boxes are scattered through the world from a seed. They
block players and stop bullets, so you can't shoot someone you can't see.
Change the seed for a completely different map; set cover clusters to 0 for an
open field.

**Finding each other.** The world is much bigger than one viewport. The
background grid is what makes your movement and rotation readable, and when
your opponent is off screen an arrow on the edge of your view points at them.

## Develop vs Play mode

The toggle in the top right switches between them. **Develop** shows the tuning
panels around the world; **Play** hides them and gives the world more room. The
choice is remembered between reloads.

Settings changes apply instantly and are saved to `localStorage`, so a reload
keeps your tuning. **Reset to defaults** puts everything back.

### Profiles

The picker at the top of the panel holds named sets of settings — "drifty",
"heavy tank", "chaos" — so you can flip between feels mid-session instead of
dragging a dozen sliders back.

- **New** copies the current values into a new profile and switches to it.
- Switching applies that profile's values immediately, rebuilding the map and
  the player roster if those differ.
- Edits write straight into the selected profile. There is no Save button
  because there is nothing to forget to press.
- **Reset to defaults** only affects the profile you're in.

## Project layout

```
index.html          markup: top bar, dev panels, the two view canvases
css/style.css       all styling
src/
  main.js           wires everything together
  config.js         static config: view size, base speed, player defs + key bindings
  settings.js       live-tunable settings, profiles, persistence  <- add sliders here
  ui.js             builds the dev panel, the profile picker, Develop/Play toggle
  input.js          keyboard state: held keys + press history for double taps
  game.js           the game state and its update step
  player.js         driving, turning, sprinting, sidestepping, shooting, stamina
  bullet.js         bullet spawning and flight
  combat.js         hit detection, damage, shield recovery, death
  obstacles.js      seeded map generation + collision against boxes
  track.js          seeded racetrack generation and on-track queries
  race.js           grid, countdown, lap counting, timing
  mode.js           which game is being played
  rng.js            seeded random numbers
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

### How the track is generated

Radial noise gives you a blob and a spline through random points gives uniform
wiggle. Neither looks like a circuit. Real ones are **straights joined by
corners of different radius**, so `track.js` builds exactly that:

1. **Corner vertices around a circle, in polar order.** Strictly increasing
   angles keep the underlying polygon simple.
2. **Each vertex is rounded with a tangent circular arc.** What survives of
   each polygon edge is a straight; the arc is the corner. Sharpness varies
   corner to corner, so a lap mixes hairpins with sweepers instead of repeating
   one corner all the way round.
3. **Notches are relaxed.** A vertex dipping far below its neighbours makes a
   reflex corner whose fillet folds back over the track. Pulling those out
   costs far less character than damping every jitter on the circuit.
4. **The result is verified.** The finished centreline is checked for
   self-crossings and for fitting inside the world, and the jitter is damped
   until it passes. Fully damped is a plain oval, which cannot fail, so
   generation always terminates with a drivable circuit — and the same seed
   always gives the same track.

`Corner sharpness` then means something real: at 0 the arcs swallow the edges
and the circuit approaches a circle; at 1 they are tight corners joined by long
straights. The start line is placed on the longest straight, as on a real
circuit.

### The movement model

Everything a player does moves one velocity vector. That is the whole engine,
and it is worth understanding before adding to it, because new mechanics should
almost always be expressed as a force or an impulse on this vector rather than
as another special case.

Each step, in `player.js`:

1. **Split** the velocity into the part along the heading (`forward`) and the
   part across it (`lateral`).
2. **Push** `forward` with the engine when W or S is held, capped at top speed;
   with no input it decays by `braking`.
3. **Bleed** `lateral` away at the `grip` rate.
4. **Recombine** and integrate.

Drifting falls out of step 3 for free. Turning changes where you *point*, not
where you are already *travelling*, so the moment you turn, part of your old
velocity becomes lateral. At high grip it vanishes immediately and the car
sticks to its nose; at low grip it survives and you slide. There is no separate
"drift mode" — one slider moves continuously between the two feels.

Everything else is an impulse into the same vector:

- **Recoil** subtracts along the heading when you fire, so braking and grip
  decide how far you slide, and firing while reversing genuinely speeds you up.
- **Sidesteps** add a temporary sideways velocity for their duration, on top of
  normal driving, so you can sidestep while still moving forward.
- **Walls and boxes** cancel only the component of velocity pointing into the
  surface, which is what makes you slide along cover instead of sticking to it.

Turning has its own miniature version of the same idea: an angular velocity
that ramps toward the requested rate rather than snapping to it.

This is the base to build on. Knockback from explosions, being shoved by
another player, ice patches, conveyor floors, a tow rope — all of them are
impulses or per-region changes to `braking`/`grip`, not new systems.

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
  check would let it pass straight through. The same segment test decides
  whether a bullet is stopped by cover.
- **Sub-stepped movement.** A player's move is split into hops no longer than
  their own radius before collisions are resolved. A long, fast sidestep would
  otherwise jump clean through a box between two frames.
- **The map is a pure function of the seed.** Same seed, same map, every
  reload — no state to save, and every player is guaranteed to see the same
  world. The same is true of the racetrack.
- **Modes share everything they can.** Both run the same players, physics,
  cameras and dev panel; the mode picks which mechanics run and which settings
  exist (`modes: ['race']` on a setting definition hides it elsewhere).
