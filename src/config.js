/**
 * Static configuration: things that describe the game rather than things we
 * want to tweak live. Anything we want a slider for belongs in settings.js.
 */

/** Size of one player's viewport, in canvas pixels. All views are square. */
export const VIEW_SIZE = 520;

/** Base movement speed in world units per second, before the speed multiplier. */
export const BASE_SPEED = 220;

export const PLAYER_RADIUS = 10;
export const BULLET_RADIUS = 4;

/** Reverse is this fraction of the forward top speed. */
export const REVERSE_FACTOR = 0.55;

export const MAX_PLAYERS = 4;

/**
 * One entry per player, in seating order across the keyboard: P1 has the far
 * left of the keyboard, P4 the far right, and P2/P3 the middle. Each cluster is
 * an inverted-T with its shoot key inside the same zone, so four pairs of hands
 * never reach across each other.
 *
 * `keys` maps an action to KeyboardEvent.code values, so re-binding is a data
 * change only. `spawn` is a fraction of the world, since the world size is
 * tunable; the first two spawns are diagonally opposite so a two-player game
 * still starts them far apart.
 */
export const PLAYERS = [
  {
    id: 'p1',
    label: 'Player 1',
    color: '#5ea9ff',
    canvasId: 'view-p1',
    seat: 'far left',
    spawn: { fx: 0.25, fy: 0.25, heading: Math.PI * 0.25 },
    keys: {
      forward: ['KeyW'],
      back: ['KeyS'],
      turnLeft: ['KeyA'],
      turnRight: ['KeyD'],
      // Q sits inside P1's own cluster for a four-player game; Space still
      // works because nobody else claims it, and it's what two-player muscle
      // memory reaches for. Left Shift is deliberately not bound — five
      // presses of it pops up Windows Sticky Keys.
      shoot: ['KeyQ', 'Space'],
    },
  },
  {
    id: 'p2',
    label: 'Player 2',
    color: '#ff7a6b',
    canvasId: 'view-p2',
    seat: 'far right',
    spawn: { fx: 0.75, fy: 0.75, heading: Math.PI * 1.25 },
    keys: {
      forward: ['ArrowUp'],
      back: ['ArrowDown'],
      turnLeft: ['ArrowLeft'],
      turnRight: ['ArrowRight'],
      // Right Shift sits just above the arrow keys, so Player 2 can shoot
      // without moving their hand. Enter works too.
      shoot: ['ShiftRight', 'Enter', 'NumpadEnter'],
    },
  },
  {
    id: 'p3',
    label: 'Player 3',
    color: '#63d98a',
    canvasId: 'view-p3',
    seat: 'middle left',
    spawn: { fx: 0.75, fy: 0.25, heading: Math.PI * 0.75 },
    keys: {
      forward: ['KeyT'],
      back: ['KeyG'],
      turnLeft: ['KeyF'],
      turnRight: ['KeyH'],
      shoot: ['KeyB', 'KeyV'],
    },
  },
  {
    id: 'p4',
    label: 'Player 4',
    color: '#c58cff',
    canvasId: 'view-p4',
    seat: 'middle right',
    spawn: { fx: 0.25, fy: 0.75, heading: Math.PI * 1.75 },
    keys: {
      forward: ['KeyI'],
      back: ['KeyK'],
      turnLeft: ['KeyJ'],
      turnRight: ['KeyL'],
      shoot: ['KeyN', 'KeyM'],
    },
  },
];
