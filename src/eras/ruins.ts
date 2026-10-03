import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { RUINS_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { RUINS_MAP, RUINS_MARKER_BASE } from './ruins-map.ts';
import { goHome, timeMachineMenu } from './shared.ts';
import type { CompanionHandle, EraDef, Line, WorldApi } from './types.ts';

const PARTS: ItemId[] = ['core'];

const DRONE_CAUGHT: Line[] = [['Old drone', 'TRESPASS... TRESPASS... RESTRICTED... AREA...'], 'The rusty drone buzzes after you until you retreat.'];

/*
 * World 5: Madrid, 2240. Climate models project growing drought and
 * desertification risk for central Spain; here a long drought finally emptied
 * the city. Aaron Pike, the pilot of Test Run #12, hides in the ruins of the
 * Museo Nacional de Ciencias Naturales (founded in 1771). Combines everything:
 * Pip's head, the shield, the power cell and the
 * Mapuche foye bark.
 */
export const RUINS: EraDef = {
  id: 'ruins',
  ...ERA_INFO.ruins,
  music: 'ruins',
  musicZones: [{ area: { x: 8, y: 2, w: 28, h: 16 }, theme: 'mountain' }],
  map: RUINS_MAP,
  markerBase: RUINS_MARKER_BASE,
  tiles: RUINS_TILES,
  defaultTile: '#',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (!w.flag('ruins:column')) {
      return w.flag('pipAboard') ? 'Have Pip move the fallen column at the museum entrance.' : 'A fallen column blocks the museum. Go back to the Cretaceous and bring Pip along.';
    }
    if (!w.flag('ruins:labOpen')) return 'Find Pike. His lab is behind the collapsed east gallery.';
    if (!w.has('core') && !w.flag('fixed:ruins')) {
      return w.has('canelo') ? 'Give Pike the foye bark.' : 'Pike has scurvy. The machi in Araucanía has foye bark (help her with the maqui first).';
    }
    if (!w.flag('fixed:ruins')) return 'Install the temporal core in the time machine.';
    return 'Go home. Enter the year you left.';
  },

  setup(w) {
    w.machine('M', useMachine);
    w.decor('B', 'whale');
    w.decor('X', 'skull');
    w.decor('O', 'megatherium');

    // --- Around the museum ---
    w.npc({
      marker: 'Y',
      look: 'trader',
      name: 'Nomad',
      talk: (w) =>
        w.say(
          ['Nomad', 'Water for trade? No? Then you are the strangest traveler I have met this year.'],
          ['Nomad', 'Most people went north generations ago, to the Cantabrian coast, where it still rains.'],
          ['Nomad', 'There is an old man living in the museum. He talks to machines. Leave him be... or bring him fruit.'],
        ),
    });
    w.inspect('W', 'Faded sign', (w) =>
      w.say('A faded sign: "Río Manzanares".', ['Elias', 'The river that ran through Madrid. Now it is just a ribbon of sand.']),
    );
    w.inspect('V', 'Metro sign', (w) =>
      w.say(
        'A rusted, diamond-shaped sign: METRO.',
        ['Elias', 'Madrid\'s Metro opened in 1919, one of the oldest in the world. The stairs below are full of sand.'],
      ),
    );
    const DOG_CAUGHT: Line[] = ['A pack of feral dogs spots you and starts growling!', 'You back away slowly until they lose interest.'];
    w.watcher({ kind: 'dog', route: 'IL', wait: 1.6, speed: 46, caught: DOG_CAUGHT });
    w.watcher({ kind: 'dog', route: 'LI', wait: 2.2, speed: 42, caught: DOG_CAUGHT });

    // --- Museum exhibits ---
    w.inspect('O', 'Megatherium', (w) =>
      w.say(
        'Megatherium americanum, a giant ground sloth from South America, as big as an elephant.',
        ['Elias', 'This skeleton reached Madrid in 1788. It was the first fossil skeleton ever mounted for display, anywhere.'],
      ),
    );
    w.inspect('6', 'Meteorites', (w) =>
      w.say(
        'A showcase of meteorites with handwritten labels in Spanish. One is a chunk of iron-nickel, pitted and dark.',
        ['Elias', 'Just like the one Pip helped me reach in Hell Creek. That feels like a lifetime ago.'],
      ),
    );
    w.inspect('3', "Pike's note", (w) =>
      w.say(['Pike', '(note in a showcase) Jump 1: Hell Creek. At dawn I watched a herd of Triceratops cross a river. Nobody will ever believe me.']),
    );
    w.inspect('4', "Pike's note", (w) =>
      w.say(['Pike', '(note in a showcase) Jump 2: Cologne, 1248. A Dominican friar caught me reading his books. I said I was a scholar from Toledo. He was delighted.']),
    );
    w.inspect('5', "Pike's note", (w) =>
      w.say(['Pike', '(note in a showcase) Jump 3: Araucanía. A Mapuche machi saved my life with foye bark. I should have taken more of it.']),
    );

    let pip: CompanionHandle | null = null;
    if (w.flag('pipAboard') && !w.flag('ruins:pipHome')) {
      pip = w.companion({ marker: 'S', name: 'Pip', following: true, talk: () => {} });
    }

    // --- The museum entrance ---
    if (!w.flag('ruins:column')) {
      const column = w.obstacle({
        marker: 'K',
        look: 'column',
        label: 'Fallen column',
        interact: async (w) => {
          if (!pip) {
            await w.say(
              ['Elias', 'A marble column fell across the door. Tons of it.'],
              ['Elias', "I can't budge it. But I know someone with a very thick skull..."],
              ['Elias', 'The machine can carry two now. Time to visit Pip.'],
            );
            return;
          }
          await w.say(['Elias', 'Pip, one more time. For science.'], ['Pip', '*determined snort*']);
          await pip.moveBy(0, 20, 60);
          await w.wait(0.3);
          await pip.moveTo('K', 150);
          w.sfx('boom');
          w.shake(3, 0.7);
          column.remove();
          w.setFlag('ruins:column');
          w.save();
          await pip.moveBy(0, 14, 60);
          pip.emote('heart', 1.5);
          await w.say(['Elias', 'Sixty-six and a half million years of evolution, and still the best door opener around.']);
        },
      });
    }

    // --- Inside ---
    w.hazard({ area: 'Z', kind: 'rocks' });
    w.trigger({
      area: 'J',
      block: true,
      when: (w) => !w.has('shield'),
      run: (w) => w.say(['Elias', 'Chunks of the ceiling keep falling in that gallery. I need something over my head.']),
    });
    w.trigger({
      area: 'J',
      once: 'ruins:galleryHint',
      when: (w) => w.has('shield'),
      run: (w) => w.say(['Elias', "The roof is coming down in pieces. Good thing I kept the Archbishop's shield."]),
    });
    const labDoor = w.gate({ marker: 'D', look: 'door', openFlag: 'ruins:labOpen' });
    w.inspect('N', 'Door panel', async (w) => {
      if (labDoor.isOpen) return;
      if (!w.has('powercell')) {
        await w.say(['Elias', 'A dead door panel. It needs power.']);
        return;
      }
      w.sfx('hack');
      await w.say(['Elias', "Yuki's Power Cell again. Let there be light."]);
      labDoor.open();
      w.save();
    });
    w.npc({ marker: 'P', look: 'pike', name: 'Pike', talk: talkToPike });

    // --- Leftover machines ---
    w.watcher({ kind: 'drone', route: 'AC', wait: 1.5, speed: 40, caught: DRONE_CAUGHT });
    w.watcher({ kind: 'drone', route: 'EF', wait: 1.8, speed: 38, caught: DRONE_CAUGHT });
    w.watcher({
      kind: 'bot',
      route: 'GH',
      wait: 2.4,
      speed: 24,
      caught: [['Museum bot', 'PLEASE... DO NOT TOUCH... THE EXHIBITS.'], 'The ancient guide robot escorts you back to the entrance.'],
      barks: { suspicious: ['VISITOR DETECTED?'], investigate: ['THIS WAY TO... THE EXHIBITS.'], giveUp: ['MUSEUM CLOSED. MUSEUM CLOSED.'] },
    });

    w.inspect('B', 'Whale skeleton', (w) =>
      w.say(
        'A whale skeleton, still hanging from the ceiling of the main hall.',
        ['Elias', 'Whales: the largest animals that ever lived, bigger than any dinosaur. Even Pip would be impressed.'],
      ),
    );

    for (const marker of ['S', 'Q', 'R', 'T']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      ['Elias', 'Dust. Dead trees. Not a single light anywhere.'],
      ['Elias', 'Madrid, 2240. That building... the Museo Nacional de Ciencias Naturales. Founded in 1771, and still standing.'],
      ['Elias', "The drought finally won. Nobody's lived here for a long time. Except, maybe, Pike."],
    );
  } else if (w.flag('pipAboard') && !w.flag('ruins:column')) {
    await w.say(['Elias', 'Welcome to the future, Pip. Try not to eat anything.'], ['Pip', '*curious chirp*']);
  }
}

async function talkToPike(w: WorldApi): Promise<void> {
  if (w.flag('fixed:ruins') || w.has('core')) {
    await w.say(['Pike', 'Go install that core. And then take us home, Ward.']);
    return;
  }
  if (!w.flag('ruins:metPike')) {
    w.setFlag('ruins:metPike');
    await w.say(
      ['Pike', "Another traveler? Here? ...And an Institute field suit. They finally sent someone after me."],
      ['Elias', "Nobody sent me. I'm Elias Ward, Test Run #47. I'm stranded too. I found your recorder, and your cache in 1248."],
      ['Pike', 'Aaron Pike. Test Run #12, October 2019. For me that was... I honestly lost count. Decades of jumps.'],
      ['Pike', 'I came this far forward because nobody would be left to find me. The drought emptied the city long ago.'],
      ['Pike', "But I'm sick. My gums bleed, old wounds are reopening. Scurvy. There's been no fresh fruit on my road for years."],
    );
  }
  if (!w.has('canelo')) {
    await w.say(
      ['Pike', 'Without vitamin C, I won\'t last long enough to help you.'],
      ['Elias', 'Vitamin C... The machi in Araucanía! The foye bark. I have to go back for it.'],
    );
    return;
  }
  w.take('canelo');
  await w.say(
    ['Elias', 'Here. Foye bark, a gift from a Mapuche machi in 1553. Brew it as a tea.'],
    ['Pike', "Winter's bark... Drimys winteri. Sailors used it against scurvy. Ward, you beautiful nerd."],
  );
  w.sfx('heal');
  await w.wait(0.8);
  w.give('core');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.core.name}`);
  w.save();
  await w.say(
    ['Pike', 'Take this. My temporal core, the only one outside the Institute. It lets the machine lock on to a single moment.'],
    ['Pike', 'But it needs your exact origin year. Get it wrong and you end up somewhere else entirely.'],
    ['Pike', "#47... They scheduled #47 seven years after my run. Don't tell me you forgot your own year."],
    ['Elias', '...Of course not. Probably.'],
    ['Pike', 'One more thing. The machine can carry two. Take me home with you, Ward. Please.'],
    ['Elias', "Of course. Let's go home."],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag('fixed:ruins')) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag('diag:ruins')) {
    w.setFlag('diag:ruins');
    w.sfx('error');
    await w.say(
      'DIAGNOSTIC REPORT  ·  Year: 2240 AD  ·  Stability: 90%  ·  Missing: temporal core (destination lock).',
      ['Elias', "Everything works except the one thing that matters: locking on to home. Pike's core."],
    );
  }
  if (!w.has('core')) {
    if (w.flag('ruins:metPike')) await w.say(['Elias', 'I still need the temporal core from Pike.']);
    else await w.say(['Elias', 'Pike must be somewhere around here. The museum, maybe?']);
    return;
  }
  await w.say(['Elias', 'The temporal core... Careful... There.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.take('core');
  w.setFlag('fixed:ruins');
  w.save();
  if (w.flag('pipAboard') && !w.flag('ruins:pipHome')) {
    w.setFlag('ruins:pipHome');
    await w.say(
      ['Elias', 'Before anything else, one promise to keep.'],
      'Elias takes Pip back to Hell Creek, 66.5 million years ago, and comes back to 2240 a moment later.',
      ['Elias', "He ran straight into the ferns without looking back. That's how it should be. Goodbye, buddy."],
    );
  }
  await goHome(w);
}
