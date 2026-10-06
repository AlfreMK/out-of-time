import { ERA_IDS, type EraId } from '../game/state.ts';
import { glitchText } from './info.ts';
import { eraInfo, msg } from '../i18n/index.ts';
import type { CompanionHandle, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, type FlagName, progress } from '../game/flags.ts';

/** The year Andrew left. Players work it out from clues in 2087 and 2240. */
export const HOME_YEAR = 2026;

/**
 * Which flag reveals the coordinates of each era (the first era is where you start).
 * The story is linear: Cologne's repair only makes room for a passenger, so the
 * next window comes from Pike's nav module, found back in Hell Creek with Pip.
 */
const DISCOVERED_BY: Record<EraId, FlagName | null> = {
  prehistory: null,
  medieval: progress.fixed('prehistory'),
  araucania: Flag.NavInstalled,
  future: progress.fixed('araucania'),
  ruins: Flag.EmitterInstalled,
};

export type EraAccess = 'here' | 'visited' | 'detected' | 'locked';

export function eraAccess(w: WorldApi, era: EraId): EraAccess {
  if (era === w.era) return 'here';
  if (w.flag(progress.visited(era))) return 'visited';
  const flag = DISCOVERED_BY[era];
  if (flag === null || w.flag(flag)) return 'detected';
  return 'locked';
}

export interface MenuHooks {
  /** Runs right before jumping, e.g. to ask whether Pip comes along. */
  beforeJump?: (to: EraId) => Promise<void>;
}

/** The time machine's destination picker, available once navigation works. */
export async function timeMachineMenu(w: WorldApi, hooks: MenuHooks = {}): Promise<void> {
  if (w.has('navmodule')) await installNavModule(w);
  if (w.has('emitter')) await installEmitter(w);
  const now = Date.now() / 1000;
  const options: Array<{ label: string; run: () => Promise<void> }> = [];
  ERA_IDS.forEach((id, i) => {
    const info = eraInfo(id);
    const access = eraAccess(w, id);
    if (access === 'here') return;
    if (access === 'visited') {
      options.push({ label: `${info.name}  ·  ${info.year}`, run: () => jump(w, id, hooks) });
    } else if (access === 'detected') {
      options.push({
        label: msg().newWindow({ code: glitchText(9, now, i) }),
        run: async () => {
          await w.say('Unstable window detected. The destination will resolve on arrival.');
          await jump(w, id, hooks);
        },
      });
    } else {
      options.push({
        label: `${glitchText(9, now, i + 7)}  ·  ${glitchText(4, now, i + 3)}`,
        run: async () => {
          w.sfx('error');
          await w.say('NO STABLE WINDOW. These coordinates are still out of reach.');
        },
      });
    }
  });
  if (w.flag(progress.fixed('ruins'))) options.push({ label: 'Home  ·  enter the year', run: () => goHome(w) });
  options.push({ label: 'Stay here', run: async () => {} });

  const pick = await w.choose('SET DESTINATION', options.map((o) => o.label));
  await options[pick].run();
}

/** Pike's nav module holds the coordinates of the windows he jumped through: the next one is Araucanía. */
async function installNavModule(w: WorldApi): Promise<void> {
  w.take('navmodule');
  w.setFlag(Flag.NavInstalled);
  await w.say([Speaker.Andrew, "Pike's nav module... The connector still matches. Institute standard parts, bless them."]);
  w.machineGlitch(true);
  for (let i = 0; i < 3; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.save();
  await w.say('NAV LOG IMPORTED  ·  3 WINDOWS ON RECORD  ·  NEW WINDOW DETECTED', [Speaker.Andrew, "Pike's trail. He jumped from Hell Creek to Cologne, and then... somewhere else. Let's follow him."]);
}

/**
 * Pip rides along once the machine can carry two (after the Cologne repair) and
 * stays with Andrew until he is taken home at the very end.
 */
export function pipAlong(w: WorldApi, marker: string): CompanionHandle | null {
  if (!w.flag(Flag.PipAboard) || w.flag(Flag.RuinsPipHome)) return null;
  return w.companion({
    marker,
    name: Speaker.Pip,
    following: true,
    talk: () => {},
  });
}

/** The first time someone meets Pip, they react before anything else (once per `flag`). */
export async function pipReaction(w: WorldApi, flag: FlagName, ...lines: Line[]): Promise<void> {
  if (!w.flag(Flag.PipAboard) || w.flag(flag)) return;
  w.setFlag(flag);
  await w.say(...lines);
}

/** Pike's spare field emitter extends the machine's range: that is what opens the window to 2240. */
async function installEmitter(w: WorldApi): Promise<void> {
  w.take('emitter');
  w.setFlag(Flag.EmitterInstalled);
  await w.say([Speaker.Andrew, "Pike's field emitter goes in next to the coils... Easy..."]);
  w.machineGlitch(true);
  for (let i = 0; i < 3; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.save();
  await w.say('STABILITY 90%  ·  FIELD RANGE EXTENDED  ·  NEW WINDOW DETECTED', [Speaker.Andrew, 'There it is. A window two centuries past 2087. Madrid, 2240.']);
}

async function jump(w: WorldApi, to: EraId, hooks: MenuHooks): Promise<void> {
  await hooks.beforeJump?.(to);
  await w.say([Speaker.Andrew, 'Coordinates locked in. Here goes...']);
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(2, 1.4);
  await w.wait(1.2);
  w.flash('#ffffff', 0.6);
  await w.travel(to);
}

/** The final puzzle: the year dial works at last, but Andrew has to remember the year. */
export async function goHome(w: WorldApi): Promise<void> {
  await w.say(
    'TEMPORAL CORE ONLINE  ·  STABILITY 100%  ·  YEAR DIAL CALIBRATED',
    'ENTER ORIGIN YEAR.',
    [Speaker.Andrew, 'The year I left... After everything, I have to be sure.'],
  );
  const year = await w.enterYear('ORIGIN YEAR', w.flag(Flag.HomeGuess) ? HOME_YEAR - 10 : 2000);
  w.setFlag(Flag.HomeGuess);
  if (year !== HOME_YEAR) {
    w.sfx('error');
    const hint =
      year > 2087
        ? 'No, way too late. In 2087 I had already been missing for decades.'
        : year < 1990
          ? "That's long before the Institute even existed."
          : "Think, Andrew. In 2087 Yuki's leaked file said Test Run #47 was sixty-one years earlier. And Pike said Test Run #47 came seven years after his own, in 2019.";
    await w.say(msg().originMismatch({ year }), [Speaker.Andrew, hint]);
    return;
  }
  w.sfx('success');
  await w.say(
    msg().originMatch({ year }),
    [Speaker.Andrew, '2026. Home. Sixty seconds after I left, if the math holds.'],
    'Pike squeezes into the machine beside Andrew, his journal tucked under his arm.',
    [Speaker.Pike, 'Home, Ward. At last.'],
  );
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(3, 2);
  await w.wait(1.6);
  w.flash('#ffffff', 1);
  await w.ending();
}
