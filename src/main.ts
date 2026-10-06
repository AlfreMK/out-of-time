import { Game } from './game/game.ts';
import { getLang, onLangChange, t } from './i18n/index.ts';
import { TitleScene } from './scenes/title.ts';

const stage = document.getElementById('stage');
if (!stage) throw new Error('Missing #stage element.');

// The page's own text (the "turn sideways" notice) and language follow the setting too.
const rotate = document.querySelector('.rotate');
const relabel = (): void => {
  document.documentElement.lang = getLang();
  if (rotate) rotate.textContent = t('Turn your phone sideways to play.');
};
relabel();
onLangChange(relabel);

const game = new Game(stage);
game.start(new TitleScene(game));

// Development-only handle for debugging from the browser console. Stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game });
