/**
 * Static configuration: things that describe the game rather than things we
 * want to tweak live. Anything we want a slider for belongs in settings.js.
 */

/** Size of one player's viewport, in canvas pixels. Both views are square. */
export const VIEW_SIZE = 520;

/** Base movement speed in world units per second, before the speed multiplier. */
export const BASE_SPEED = 220;

export const PLAYER_RADIUS = 10;
export const BULLET_RADIUS = 4;

/** Reverse is this fraction of the forward top speed. */
export const REVERSE_FACTOR = 0.55;

/**
 * One entry per player. `keys` maps an action to the KeyboardEvent.code
 * values that trigger it, so re-binding later is a data change only.
 * `spawn` is a fraction of the world, since the world size is tunable.
 */
export const PLAYERS = [
  {
    id: 'p1',
    label: 'Player 1',
    color: '#5ea9ff',
    canvasId: 'view-p1',
    spawn: { fx: 0.35, fy: 0.5, heading: 0 },          // facing right, towards P2
    keys: {
      forward: ['KeyW'],
      back: ['KeyS'],
      turnLeft: ['KeyA'],
      turnRight: ['KeyD'],
      shoot: ['Space'],
    },
  },
  {
    id: 'p2',
    label: 'Player 2',
    color: '#ff7a6b',
    canvasId: 'view-p2',
    spawn: { fx: 0.65, fy: 0.5, heading: Math.PI },    // facing left, towards P1
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
];
