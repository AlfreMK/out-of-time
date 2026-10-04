import { ERAS } from '../eras/index.ts';
import { EndingScene } from '../scenes/ending.ts';
import { IntroScene } from '../scenes/intro.ts';
import { TitleScene } from '../scenes/title.ts';
import { TravelScene } from '../scenes/travel.ts';
import type { Game } from './game.ts';
import { GameState, type EraId } from './state.ts';
import { World } from './world.ts';
import { progress } from './flags.ts';

/*
 * Scene transitions live here so scenes don't need to import each other.
 */

export function toTitle(game: Game): void {
  game.switchTo(new TitleScene(game));
}

export function newGame(game: Game): void {
  GameState.clear();
  game.state = new GameState();
  game.switchTo(new IntroScene(game, () => game.switchTo(new World(game, ERAS.prehistory), 1.6)), 1);
}

/** Resumes a saved game at its last checkpoint. */
export function continueGame(game: Game): void {
  const saved = GameState.load();
  if (!saved) {
    newGame(game);
    return;
  }
  game.state = saved;
  const cp = saved.checkpoint;
  const spawn = cp && cp.era === saved.era ? { x: cp.x, y: cp.y } : undefined;
  game.switchTo(new World(game, ERAS[saved.era], { spawn }));
}

/** Stability shown during a jump, based on how much of the machine is repaired. */
export function stability(state: GameState): number {
  if (state.flag(progress.fixed('ruins'))) return 100;
  if (state.flag(progress.fixed('future'))) return 90;
  if (state.flag(progress.fixed('araucania'))) return 75;
  if (state.flag(progress.fixed('medieval'))) return 54;
  if (state.flag(progress.fixed('prehistory'))) return 31;
  return 12;
}

export function startTravel(game: Game, from: EraId, to: EraId): void {
  const known = game.state.flag(progress.visited(to));
  game.switchTo(new TravelScene(game, from, to, stability(game.state), known, () => game.switchTo(new World(game, ERAS[to]), 0.8)), 0.8);
}

export function showEnding(game: Game): void {
  game.switchTo(
    new EndingScene(game, () => {
      toTitle(game);
    }),
    1.2,
  );
}
