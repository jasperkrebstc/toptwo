/**
 * Static configuration: things that describe the game rather than things we
 * want to tweak live. Anything we want a slider for belongs in settings.js.
 */

/** The world is a square, measured in world units (also the canvas pixels). */
export const WORLD_SIZE = 720;

/** Base movement speed in world units per second, before the speed multiplier. */
export const BASE_SPEED = 220;

export const PLAYER_RADIUS = 10;
export const BULLET_RADIUS = 4;

/** The four directions, as unit vectors. Canvas y grows downward. */
export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * One entry per player. `keys` maps an action to the KeyboardEvent.code
 * values that trigger it, so re-binding later is a data change only.
 */
export const PLAYERS = [
  {
    id: 'p1',
    label: 'Player 1',
    color: '#5ea9ff',
    spawn: { x: WORLD_SIZE * 0.3, y: WORLD_SIZE * 0.5 },
    keys: {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      shoot: ['Space'],
    },
  },
  {
    id: 'p2',
    label: 'Player 2',
    color: '#ff7a6b',
    spawn: { x: WORLD_SIZE * 0.7, y: WORLD_SIZE * 0.5 },
    keys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      // Right Shift sits just above the arrow keys, so Player 2 can shoot
      // without moving their hand. Enter works too.
      shoot: ['ShiftRight', 'Enter', 'NumpadEnter'],
    },
  },
];
