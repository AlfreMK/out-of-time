import { Game } from './game/game.ts';
import { TitleScene } from './scenes/title.ts';

const stage = document.getElementById('stage');
if (!stage) throw new Error('Missing #stage element.');

const game = new Game(stage);
game.start(new TitleScene(game));

// Development-only handle for debugging from the browser console. Stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game });
