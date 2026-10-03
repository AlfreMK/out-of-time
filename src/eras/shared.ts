import { ERA_IDS, type EraId } from '../game/state.ts';
import { ERA_INFO, glitchText } from './info.ts';
import type { WorldApi } from './types.ts';

/** The year Elias left. Players work it out from clues in 2087 and 2240. */
export const HOME_YEAR = 2026;

/** Which flag reveals the coordinates of each era (the first era is where you start). */
const DISCOVERED_BY: Record<EraId, string | null> = {
  prehistory: null,
  medieval: 'fixed:prehistory',
  araucania: 'fixed:medieval',
  future: 'fixed:araucania',
  ruins: 'got:notes',
};

export type EraAccess = 'here' | 'visited' | 'detected' | 'locked';

export function eraAccess(w: WorldApi, era: EraId): EraAccess {
  if (era === w.era) return 'here';
  if (w.flag(`visited:${era}`)) return 'visited';
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
  const now = Date.now() / 1000;
  const options: Array<{ label: string; run: () => Promise<void> }> = [];
  ERA_IDS.forEach((id, i) => {
    const info = ERA_INFO[id];
    const access = eraAccess(w, id);
    if (access === 'here') return;
    if (access === 'visited') {
      options.push({ label: `${info.name}  ·  ${info.year}`, run: () => jump(w, id, hooks) });
    } else if (access === 'detected') {
      options.push({
        label: `${glitchText(9, now, i)}  ·  NEW WINDOW`,
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
  if (w.flag('fixed:ruins')) options.push({ label: 'Home  ·  enter the year', run: () => goHome(w) });
  options.push({ label: 'Stay here', run: async () => {} });

  const pick = await w.choose('SET DESTINATION', options.map((o) => o.label));
  await options[pick].run();
}

async function jump(w: WorldApi, to: EraId, hooks: MenuHooks): Promise<void> {
  await hooks.beforeJump?.(to);
  await w.say(['Elias', 'Coordinates locked in. Here goes...']);
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(2, 1.4);
  await w.wait(1.2);
  w.flash('#ffffff', 0.6);
  await w.travel(to);
}

/** The final puzzle: the year dial works at last, but Elias has to remember the year. */
export async function goHome(w: WorldApi): Promise<void> {
  await w.say(
    'TEMPORAL CORE ONLINE  ·  STABILITY 100%  ·  YEAR DIAL CALIBRATED',
    'ENTER ORIGIN YEAR.',
    ['Elias', 'The year I left... After everything, I have to be sure.'],
  );
  const year = await w.enterYear('ORIGIN YEAR', w.flag('home:guess') ? HOME_YEAR - 10 : 2000);
  w.setFlag('home:guess');
  if (year !== HOME_YEAR) {
    w.sfx('error');
    const hint =
      year > 2087
        ? 'No, way too late. In 2087 I had already been missing for decades.'
        : year < 1990
          ? "That's long before the Institute even existed."
          : "Think, Elias. In 2087 Yuki's leaked file said I was lost sixty-one years earlier. And Pike said Test Run #47 came seven years after his own, in 2019.";
    await w.say(`ORIGIN YEAR ${year}: NO MATCH WITH THE DEPARTURE SIGNATURE.`, ['Elias', hint]);
    return;
  }
  w.sfx('success');
  await w.say(
    `ORIGIN YEAR ${year}: SIGNATURE MATCH.`,
    ['Elias', '2026. Home. Sixty seconds after I left, if the math holds.'],
  );
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(3, 2);
  await w.wait(1.6);
  w.flash('#ffffff', 1);
  await w.ending();
}
