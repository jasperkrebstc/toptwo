/**
 * Fixed-timestep game loop.
 *
 * The simulation always advances in equal slices (STEP) no matter the
 * monitor's refresh rate, so the game feels identical on a 60Hz and a 144Hz
 * screen — and later, bullets can't tunnel through walls just because a frame
 * ran long. Rendering still happens once per animation frame.
 */

const STEP = 1 / 60;
/** Never simulate more than this much time in one frame (e.g. after a tab switch). */
const MAX_FRAME_TIME = 0.25;

export function startLoop({ update, render }) {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > MAX_FRAME_TIME) elapsed = MAX_FRAME_TIME;

    accumulator += elapsed;
    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
