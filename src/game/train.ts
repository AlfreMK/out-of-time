/**
 * The Yamanote Line timetable in Neo-Tokyo, on the world's game clock (it stops while paused).
 * Both the 3D train and the gameplay read it, so what you see and what you hear never drift apart.
 *
 * Real Yamanote trains come every few minutes; the game squeezes that into a short loop.
 */

/** Seconds with no train in sight. The first train comes this long after arriving. */
const AWAY = 14;
/** Seconds of warning: the station's chime, announcement and melody, then the rails starting to hum. */
export const TRAIN_APPROACH = 6;
/** Seconds the train takes to cross the map; its roar drowns out the player's noises. */
export const TRAIN_PASS = 10;
export const TRAIN_PERIOD = AWAY + TRAIN_APPROACH + TRAIN_PASS;

export type TrainPhase = 'away' | 'approaching' | 'passing';

export interface TrainState {
  phase: TrainPhase;
  /** 0..1 through the current phase. */
  progress: number;
  /** Seconds left in the current phase. */
  remaining: number;
}

export function trainState(time: number): TrainState {
  const t = time % TRAIN_PERIOD;
  if (t < AWAY) return { phase: 'away', progress: t / AWAY, remaining: AWAY - t };
  if (t < AWAY + TRAIN_APPROACH) return { phase: 'approaching', progress: (t - AWAY) / TRAIN_APPROACH, remaining: AWAY + TRAIN_APPROACH - t };
  const passed = t - AWAY - TRAIN_APPROACH;
  return { phase: 'passing', progress: passed / TRAIN_PASS, remaining: TRAIN_PASS - passed };
}
