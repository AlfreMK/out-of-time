import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { FUTURE_TILES } from '../game/tiledefs.ts';
import { FUTURE_MAP, FUTURE_MARKER_BASE } from './future-map.ts';
import { ERA_INFO } from './info.ts';
import { timeMachineMenu } from './shared.ts';
import type { EraDef, GateHandle, Line, WorldApi } from './types.ts';

const PARTS: ItemId[] = ['clock', 'tape'];

const BOT_CAUGHT: Line[] = [['Security Bot', 'INTRUDER DETECTED. ESCORTING YOU TO THE EXIT.'], 'You are politely but firmly marched out of the building.'];
const DRONE_CAUGHT: Line[] = [['Drone', 'RESTRICTED AREA. LEAVE NOW OR AUTHORITIES WILL BE NOTIFIED.'], 'The drone herds you back out into the street.'];
const CAMERA_CAUGHT: Line[] = [['Camera', 'UNAUTHORIZED PERSON DETECTED.'], 'An alarm wails. You slip away before security arrives.'];

/*
 * World 4: Tokyo, 2087, on a night of the June rainy season (tsuyu). The Chronos
 * Institute has become Chronos Corp and moved its headquarters from Geneva. The
 * technology is extrapolated from today's: optical lattice clocks and REBCO
 * superconducting tape already exist in labs. Teaches manipulating systems:
 * hacking terminals to switch off cameras and robots, and avoiding noisy puddles.
 */
export const FUTURE: EraDef = {
  id: 'future',
  ...ERA_INFO.future,
  music: 'cyber',
  musicZones: [
    { area: { x: 27, y: 1, w: 20, h: 16 }, theme: 'tower' },
    { area: { x: 1, y: 1, w: 20, h: 14 }, theme: 'tower' },
  ],
  map: FUTURE_MAP,
  markerBase: FUTURE_MARKER_BASE,
  tiles: FUTURE_TILES,
  defaultTile: '#',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (!w.flag('diag:future')) return 'Check the time machine.';
    if (!w.flag('fut:metYuki')) return 'Find a way into the Chronos Corp tower. Someone is hiding in the dark alley next to it.';
    if (!w.flag('fixed:future')) {
      const steps: string[] = [];
      if (!w.flag('fut:canHack')) steps.push(w.has('deck') ? 'bring the cyberdeck back to Yuki' : "get Yuki's cyberdeck back from the locker in the maglev depot");
      else if (!w.has('clock')) steps.push(w.flag('fut:towerOpen') ? 'get the optical clock from the tower lab' : 'hack the junction box in the alley to get into the Chronos Corp tower');
      if (!w.has('tape')) steps.push('get the superconducting tape from the maglev depot (avoid the puddles)');
      return steps.length ? `To do: ${steps.join('; ')}.` : 'Bring the parts back to the time machine.';
    }
    if (!w.flag('got:notes')) return 'Take the Power Cell to the sealed crypt in Cologne, 1248.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    w.machine('M', useMachine);
    w.decor('7', 'hachiko');
    w.decor('8', 'hologram');

    // --- People ---
    w.decor('0', 'torii');
    w.npc({ marker: 'O', look: 'hacker', name: 'Hacker', talk: talkToYuki });
    w.npc({
      marker: 'N',
      look: 'priest',
      name: 'Priest',
      talk: (w) =>
        w.say(
          ['Priest', 'Welcome. Pass under the torii and you leave the noise of the city behind.'],
          ['Priest', 'Shrines like this one have stood in Tokyo through earthquakes, fires and wars. That tower is young.'],
          ['Elias', '(A kannushi, a Shinto priest. Some things in Tokyo outlast every corporation.)'],
        ),
    });
    w.npc({
      marker: 'V',
      look: 'vendor',
      name: 'Vendor',
      talk: (w) =>
        w.say(
          ['Vendor', 'Ramen! Shoyu, miso, tonkotsu. Hot broth is the only cure for tsuyu.'],
          ['Vendor', "It's tsuyu, the rainy season. It won't stop until July."],
        ),
    });
    w.npc({
      marker: 'Y',
      look: 'citizen',
      name: 'Commuter',
      talk: (w) =>
        w.say(
          ['Commuter', 'The Yamanote Line still loops around the city, like it has since 1925. Older than my great-grandparents.'],
          ['Commuter', 'Everything else in this city belongs to Chronos Corp now.'],
        ),
    });
    w.npc({
      marker: 'W',
      look: 'citizen',
      name: 'Courier',
      talk: (w) =>
        w.say(
          ['Courier', "Chronos drones can't see in the dark alleys, but they've got great microphones."],
          ['Courier', "Stay out of the puddles if you don't want company."],
        ),
    });
    w.inspect('7', 'Statue', (w) =>
      w.say(
        'A bronze statue of Hachikō, the Akita dog who waited at Shibuya Station every day for nearly ten years after his owner died.',
        ['Elias', 'Waiting for someone who never comes back. I think I know somebody like that.'],
      ),
    );

    // --- Security ---
    const towerGate = w.gate({ marker: '3', look: 'laser', openFlag: 'fut:towerOpen' });
    const labGate = w.gate({ marker: '4', look: 'laser', openFlag: 'fut:labOpen' });
    w.pickup({
      marker: '6',
      item: 'deck',
      lines: [['Elias', "A battered cyberdeck in an evidence bag, tagged CONFISCATED: Y. TANAKA. This must be Yuki's."]],
    });
    w.inspect('T', 'Junction box', (w) => hack(w, towerGate, 'Tower entrance'));
    w.inspect('U', 'Security terminal', (w) => hack(w, labGate, 'Lab door'));

    w.watcher({ kind: 'camera', route: 'A', facing: 'right', group: 'tower', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'camera', route: 'B', facing: 'left', group: 'tower', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'bot', route: 'CD', wait: 1.6, group: 'tower', caught: BOT_CAUGHT });
    w.watcher({ kind: 'bot', route: 'EF', wait: 2.0, group: 'tower', caught: BOT_CAUGHT });
    w.watcher({ kind: 'drone', route: 'GH', wait: 1.2, group: 'depot', caught: DRONE_CAUGHT });
    w.watcher({ kind: 'drone', route: 'IJ', wait: 1.4, group: 'depot', caught: DRONE_CAUGHT });
    w.watcher({ kind: 'camera', route: 'K', facing: 'left', group: 'depot', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'drone', route: 'LQ', wait: 2.0, group: 'street', caught: DRONE_CAUGHT });

    // --- Parts ---
    w.pickup({
      marker: '1',
      item: 'clock',
      lines: [
        ['Elias', 'An optical lattice clock: strontium atoms held in a grid of laser light, ticking about 430 trillion times a second.'],
        ['Elias', "It wouldn't lose a second in the whole age of the universe. Exactly the time reference my year display needs."],
      ],
    });
    w.pickup({
      marker: '2',
      item: 'tape',
      lines: [
        ['Elias', 'A spool of REBCO tape: a rare-earth barium copper oxide superconductor.'],
        ['Elias', 'Cooled with liquid nitrogen it has zero electrical resistance. The maglev trains float on magnets wound from this.'],
      ],
    });

    // --- Hints ---
    w.trigger({
      area: '5',
      once: 'fut:towerHint',
      run: (w) =>
        w.say(
          ['Elias', 'The Chronos Corp tower. So they moved the whole operation from Geneva to Tokyo.'],
          ['Elias', 'Laser barrier at the door, and a patrol bot out front. That junction box in the alley might control the door.'],
        ),
    });
    w.trigger({
      area: '9',
      once: 'fut:depotHint',
      run: (w) => w.say(['Elias', 'The maglev depot. Puddles everywhere, and drones with microphones. Splashing will carry even if I sneak.']),
    });

    for (const marker of ['S', 'P', 'R', 'X', 'Z']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      ['Elias', 'Rain... and neon. A river canal, crowds of umbrellas, and is that the Tokyo Skytree in the distance?'],
      ['Elias', "Tokyo. And the biggest tower on the block says CHRONOS CORP. It's... 2087."],
      ['Elias', 'Sixty-one years after I left. The Institute grew up, and it moved a long way from Geneva.'],
    );
    w.toast('Check the time machine');
  } else {
    await w.say(['Elias', 'Neo-Tokyo again. Mind the puddles.']);
  }
}

async function hack(w: WorldApi, gate: GateHandle, label: string): Promise<void> {
  if (!w.flag('fut:canHack')) {
    w.sfx('error');
    await w.say(
      ['Elias', "Chronos encryption. My multitool doesn't stand a chance against this."],
      ['Elias', w.flag('fut:metYuki') ? "Yuki's cyberdeck could crack it. It's locked up in the depot." : 'I need someone who knows their systems.'],
    );
    return;
  }
  w.sfx('hack');
  await w.say(['Elias', 'Institute multitool, meet Chronos Corp firmware...']);
  w.disable('tower', 20);
  if (!gate.isOpen) gate.open();
  w.toast(`${label} unlocked · Cameras and bots offline for 20 s`);
}

/** Yuki Tanaka: a hacker who leaked Chronos Corp's files, hiding in the alley by the tower. */
async function talkToYuki(w: WorldApi): Promise<void> {
  if (!w.flag('fut:metYuki')) {
    w.setFlag('fut:metYuki');
    await w.say(
      ['Hacker', "...Don't move. Who sent you? Chronos?"],
      ['Hacker', 'Wait. That face. That lab coat.'],
      ['Hacker', '"Test Run #47. Dr. Elias Ward, Geneva. Lost sixty-one years ago." I have read your file a hundred times.'],
      ['Elias', 'You know who I am?'],
      ['Yuki', "Yuki Tanaka. I leaked Chronos Corp's archives. Your disappearance is the oldest secret they keep."],
      ['Yuki', "They caught me last month and took my cyberdeck. Without it I can't touch their systems."],
      ['Yuki', 'It is in an evidence locker in their maglev depot, to the north. Bring it back and I will get you into that tower.'],
    );
    return;
  }
  if (!w.flag('fut:canHack')) {
    if (!w.has('deck')) {
      await w.say(['Yuki', 'The depot is crawling with drones. Watch out for puddles: their microphones pick up every splash.']);
      return;
    }
    w.take('deck');
    w.setFlag('fut:canHack');
    w.sfx('hack');
    await w.say(
      ['Yuki', 'My deck! You are crazier than your file says.'],
      ['Yuki', 'There. I flashed my exploits onto your multitool. Chronos terminals and junction boxes will open for you now.'],
      ['Yuki', 'And take this. A prototype power cell I lifted from their lab. Something tells me you need it more than I do.'],
    );
    w.give('powercell');
    w.sfx('pickup');
    w.toast(`Got: ${ITEMS.powercell.name}`);
    w.save();
    await w.say(
      ['Yuki', "One more thing from the archives. In 2031 Chronos caught a single signal from Pike's beacon. From Cologne, in 1248."],
      ['Yuki', 'Four words: "Cache sealed. Needs power."'],
      ['Elias', 'The crypt with the glowing panel! It was Pike!'],
      ['Yuki', 'Your year display needs an optical lattice clock: there is one in the tower lab. The depot is full of superconducting tape, too.'],
    );
    return;
  }
  if (w.flag('fixed:future')) {
    await w.say(['Yuki', 'Go home, Dr. Ward. And when you get there, tell everyone what Chronos did.']);
    return;
  }
  await w.say(['Yuki', 'Junction box first, then the lab terminal. The cameras restart after twenty seconds, so move fast.']);
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag('fixed:future')) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag('diag:future')) {
    w.setFlag('diag:future');
    w.sfx('error');
    await w.say(
      'DIAGNOSTIC REPORT  ·  Year: ▓▓▓▓  ·  Stability: 75%  ·  Damaged: chronometric reference, field coil superconductor.',
      ['Elias', 'No time reference: that is why the year display never worked. I need a clock precise enough to measure a jump.'],
      ['Elias', 'And the field coils need fresh superconductor. In 2087 there must be plenty of both... behind security.'],
    );
  }
  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say(['Elias', `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }
  await w.say(['Elias', 'Clock in, coils rewound... Moment of truth.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag('fixed:future');
  w.save();
  await w.say(
    'STABILITY 90%  ·  YEAR DISPLAY ONLINE: 2087 AD  ·  PASSENGER CAPACITY: 2',
    ['Elias', 'It shows the year! First time since the accident.'],
    ['Elias', 'But to lock on to home, it needs a temporal core. Only the Institute could build those... and Pike.'],
  );
  if (!w.flag('got:notes')) await w.say(['Elias', "Pike's cache in 1248 needs power. Yuki's Power Cell should do it."]);
  await timeMachineMenu(w);
}
