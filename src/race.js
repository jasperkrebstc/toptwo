import { settings } from './settings.js';

const GO_FLASH = 1.1;

export function createRace() {
  return {
    phase: 'ready',      // ready -> countdown -> running -> finished
    time: 0,             // seconds since GO
    countdown: 0,
    goFlash: 0,
    winner: null,
    bestLap: null,
    bestLapBy: null,
  };
}

/** Line the cars up on the grid and hold them there until Start is pressed. */
export function resetRace(game) {
  const race = game.race;
  race.phase = 'ready';
  race.time = 0;
  race.countdown = 0;
  race.goFlash = 0;
  race.winner = null;
  race.bestLap = null;
  race.bestLapBy = null;

  placeOnGrid(game);
  game.inputLocked = true;
}

export function startRace(game) {
  resetRace(game);
  game.race.phase = 'countdown';
  game.race.countdown = settings.countdownSeconds;
}

/** Phase and clock. Runs before the players move. */
export function tickRace(game, dt) {
  const race = game.race;

  if (race.goFlash > 0) race.goFlash = Math.max(0, race.goFlash - dt);

  if (race.phase === 'countdown') {
    race.countdown -= dt;
    if (race.countdown <= 0) {
      race.phase = 'running';
      race.countdown = 0;
      race.goFlash = GO_FLASH;
    }
  } else if (race.phase === 'running') {
    race.time += dt;
  }

  game.inputLocked = race.phase !== 'running';
}

/**
 * Lap counting. Runs after the players have moved.
 *
 * A lap is a full turn of the angle around the track's centre, accumulated
 * frame by frame — not a line crossing. That makes cheating impossible by
 * construction: reversing over the start line unwinds exactly as much progress
 * as it gained, and there is no way to reach a full turn without actually
 * going round the middle.
 */
export function countLaps(game) {
  const race = game.race;
  if (race.phase !== 'running') return;

  const centre = game.track.centre;

  for (const player of game.players) {
    const angle = Math.atan2(player.y - centre.y, player.x - centre.x);

    let delta = angle - player.lastAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    player.lastAngle = angle;

    if (player.finished) continue;

    player.lapProgress += delta;
    if (player.lapProgress < Math.PI * 2) continue;

    player.lapProgress -= Math.PI * 2;
    player.lap += 1;

    const lapTime = race.time - player.lapStartedAt;
    player.lapStartedAt = race.time;
    player.lastLapTime = lapTime;

    if (player.bestLapTime === null || lapTime < player.bestLapTime) {
      player.bestLapTime = lapTime;
    }
    if (race.bestLap === null || lapTime < race.bestLap) {
      race.bestLap = lapTime;
      race.bestLapBy = player.id;
    }

    if (player.lap >= Math.round(settings.lapsToWin)) {
      player.finished = true;
      player.finishTime = race.time;
      if (!race.winner) {
        race.winner = player.id;
        race.phase = 'finished';
        game.inputLocked = true;
      }
    }
  }
}

/** True when the car is pointing back down the track. */
export function isGoingBackwards(player, track) {
  if (Math.hypot(player.vx, player.vy) < 40) return false;

  const sample = track.samples[player.trackIndex];
  return (player.vx * sample.tx + player.vy * sample.ty) < 0;
}

/**
 * Grid positions: staggered pairs behind the start line, the way a real grid
 * alternates sides.
 */
export function placeOnGrid(game) {
  const track = game.track;
  const total = track.samples.length;
  const offset = settings.trackWidth * 0.22;

  game.players.forEach((player, i) => {
    const back = 55 + Math.floor(i / 2) * 75;
    const index = (total - Math.round(back / track.spacing)) % total;
    const sample = track.samples[index];
    const side = i % 2 === 0 ? -1 : 1;

    // The normal is the tangent turned 90 degrees.
    player.x = sample.x - sample.ty * side * offset;
    player.y = sample.y + sample.tx * side * offset;
    player.heading = Math.atan2(sample.ty, sample.tx);

    player.vx = 0;
    player.vy = 0;
    player.angularVelocity = 0;
    player.dashTimeLeft = 0;
    player.dashVX = 0;
    player.dashVY = 0;
    player.sprinting = false;
    player.trail.length = 0;

    player.lap = 0;
    player.lapProgress = 0;
    player.lastAngle = Math.atan2(player.y - track.centre.y, player.x - track.centre.x);
    player.lapStartedAt = 0;
    player.lastLapTime = null;
    player.bestLapTime = null;
    player.finished = false;
    player.finishTime = null;
    player.trackIndex = index;
  });
}

/** Race clock formatting: 41.23, or 1:04.87 once past a minute. */
export function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '--.--';

  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  const padded = rest < 10 ? `0${rest.toFixed(2)}` : rest.toFixed(2);

  return minutes > 0 ? `${minutes}:${padded}` : rest.toFixed(2);
}
