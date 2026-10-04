import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { RUINS_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { RUINS_MAP, RUINS_MARKER_BASE } from './ruins-map.ts';
import { goHome, pipAlong, pipReaction, timeMachineMenu } from './shared.ts';
import type { DecorKind, EraDef, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, progress } from '../game/flags.ts';

const PARTS: ItemId[] = ['core'];

const DRONE_CAUGHT: Line[] = [[Speaker.OldDrone, 'TRESPASS... TRESPASS... RESTRICTED... AREA...'], 'The rusty drone buzzes after you until you retreat.'];

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
  darkMusic: 'cave',
  musicZones: [{ area: { x: 8, y: 2, w: 28, h: 16 }, theme: 'mountain' }],
  map: RUINS_MAP,
  markerBase: RUINS_MARKER_BASE,
  tiles: RUINS_TILES,
  defaultTile: '#',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (!w.flag(Flag.RuinsColumn)) {
      if (!w.flag(Flag.PipAboard)) return 'A fallen column blocks the museum. Go back to the Cretaceous and bring Pip along.';
      if (!w.flag(Flag.RuinsPipDrank) && !w.has('water')) return 'Pip is too parched to charge the column. Find water: someone may be hiding from the heat down in the Metro.';
      return 'Have Pip move the fallen column at the museum entrance.';
    }
    if (!w.flag(Flag.RuinsLabOpen)) return 'Find Pike. His lab is behind the collapsed east gallery.';
    if (!w.has('core') && !w.flag(progress.fixed('ruins'))) {
      if (!w.flag(Flag.RuinsPikeCured)) {
        return w.has('canelo') ? 'Give Pike the foye bark.' : 'Pike has scurvy. The machi in Araucanía has foye bark (help her with the maqui first).';
      }
      if (!w.has('quartz')) {
        return w.flag(Flag.RuinsHallOpen)
          ? "Find the quartz among the mineral hall's showcases: a six-sided column that ends in a point. Don't wake the guide bot: avoid the broken glass."
          : "Pike needs a quartz crystal from the mineral hall. Its shutter is by the east gallery: Yuki's exploits might open it.";
      }
      return 'Bring the quartz crystal to Pike.';
    }
    if (!w.flag(progress.fixed('ruins'))) return 'Install the temporal core in the time machine.';
    return 'Go home. Enter the year you left.';
  },

  setup(w) {
    w.machine('M', useMachine);
    w.decor('B', 'whale');
    w.decor('X', 'skull');
    w.decor('O', 'megatherium');
    // What the old cases still hold: the meteorites, a few fossils and animals, and pieces from 2087.
    w.decor('6', 'exhibit_meteorite');
    w.decorEach('1', EXHIBITS.map((e) => e.kind));
    w.inspectEach('1', 'Showcase', (w, i) => w.say(...EXHIBITS[i].lines));

    // --- The Metro station: the nomad lives down here, where it's cooler ---
    w.npc({ marker: 'Y', look: 'trader', name: Speaker.Nomad, talk: talkToNomad });
    w.inspect('U', 'Cistern', (w) =>
      w.say(
        'A cistern, half full. Groundwater still seeps through the old tunnel walls, drop by drop.',
        [Speaker.Andrew, 'Twenty meters of earth overhead, and it stays cool down here. Smart place to wait out a drought.'],
      ),
    );
    w.inspect('W', 'Faded sign', (w) =>
      w.say('A faded sign: "Río Manzanares".', [Speaker.Andrew, 'The river that ran through Madrid. Now it is just a ribbon of sand.']),
    );
    w.decor('V', 'metrosign');
    w.inspect('V', 'Metro sign', (w) =>
      w.say(
        'A rusted, diamond-shaped sign: METRO.',
        [Speaker.Andrew, "Madrid's Metro opened in 1919, one of the oldest in the world. Something is moving down there... and I smell smoke."],
      ),
    );
    // A feral pack has made the tunnel its den.
    const DOG_CAUGHT: Line[] = ['A pack of feral dogs spots you in the dark and starts growling!', 'You back up the stairs until they lose interest.'];
    w.watcher({ kind: 'dog', route: 'IL', wait: 1.6, speed: 46, caught: DOG_CAUGHT });
    w.watcher({ kind: 'dog', route: 'LI', wait: 2.2, speed: 42, caught: DOG_CAUGHT });

    // --- Museum exhibits ---
    w.inspect('O', 'Megatherium', (w) =>
      w.say(
        'Megatherium americanum, a giant ground sloth from South America, as big as an elephant.',
        [Speaker.Andrew, 'This skeleton reached Madrid in 1788. It was the first fossil skeleton ever mounted for display, anywhere.'],
      ),
    );
    w.inspect('6', 'Meteorites', (w) =>
      w.say(
        'A showcase of meteorites with handwritten labels in Spanish. One is a chunk of iron-nickel, pitted and dark.',
        [Speaker.Andrew, 'Just like the one Pip helped me reach in Hell Creek. That feels like a lifetime ago.'],
      ),
    );
    // Pike's journal, on top of one of his book towers.
    w.inspect('3', "Pike's journal", (w) =>
      w.say(
        "A battered notebook on top of the books. Pike's handwriting, page after page.",
        [Speaker.Pike, '(written) Jump 1: Hell Creek. At dawn I watched a herd of Triceratops cross a river. Nobody will ever believe me.'],
        [Speaker.Pike, '(written) Jump 2: Cologne, 1248. A Dominican friar caught me reading his books. I said I was a scholar from Toledo. He was delighted.'],
        [Speaker.Pike, '(written) Jump 3: Araucanía. A Mapuche machi saved my life with foye bark. I should have taken more of it.'],
      ),
    );

    const pip = pipAlong(w, 'S');

    // --- The museum entrance ---
    if (!w.flag(Flag.RuinsColumn)) {
      const column = w.obstacle({
        marker: 'K',
        look: 'column',
        label: 'Fallen column',
        interact: async (w) => {
          if (!pip) {
            await w.say(
              [Speaker.Andrew, 'A marble column fell across the door. Tons of it.'],
              [Speaker.Andrew, "I can't budge it. But I know someone with a very thick skull..."],
              [Speaker.Andrew, 'The machine can carry two now. Time to visit Pip.'],
            );
            return;
          }
          if (!w.flag(Flag.RuinsPipDrank)) {
            if (!w.has('water')) {
              await w.say(
                [Speaker.Pip, '*pants, flopped in the shade*'],
                [Speaker.Andrew, "Pip, come on... He's not moving. This heat is too much for him."],
                [Speaker.Andrew, 'He needs water. In a drought like this one, someone must have found a source somewhere.'],
              );
              return;
            }
            w.take('water');
            w.setFlag(Flag.RuinsPipDrank);
            w.sfx('heal');
            await w.say([Speaker.Andrew, 'Here, buddy. Slowly...'], [Speaker.Pip, '*gulps the whole flask*'], [Speaker.Pip, '*shakes his dome, wide awake*']);
          }
          await w.say([Speaker.Andrew, 'Pip, one more time. For science.'], [Speaker.Pip, '*determined snort*']);
          await pip.moveBy(0, 20, 60);
          await w.wait(0.3);
          await pip.moveTo('K', 150);
          w.sfx('boom');
          w.shake(3, 0.7);
          column.remove();
          w.setFlag(Flag.RuinsColumn);
          w.save();
          await pip.moveBy(0, 14, 60);
          pip.emote('heart', 1.5);
          await w.say([Speaker.Andrew, 'Sixty-six and a half million years of evolution, and still the best door opener around.']);
        },
      });
    }

    // --- The mineral hall: a dark wing behind a security shutter, still watched by a guide bot ---
    const hallShutter = w.gate({ marker: '7', look: 'door', openFlag: Flag.RuinsHallOpen });
    w.inspect('8', 'Security console', async (w) => {
      if (hallShutter.isOpen) {
        await w.say('SHUTTER: OPEN  ·  GUIDE UNIT: STANDBY');
        return;
      }
      if (!w.flag(Flag.FutCanHack)) {
        w.sfx('error');
        await w.say([Speaker.Andrew, 'Chronos-era encryption. Without the right exploits, this console is a brick.']);
        return;
      }
      w.sfx('hack');
      await w.say(
        [Speaker.Andrew, "Two hundred years old, and still running Chronos firmware. Yuki's exploits should work..."],
        'SHUTTER: OPEN  ·  GUIDE UNIT: STANDBY',
        [Speaker.Andrew, 'Standby. So the guide robot is asleep in there... Let us keep it that way.'],
      );
      hallShutter.open();
      w.save();
    });
    // The guide bot sleeps in its corner: only crunching glass or a case's alarm wakes it.
    w.watcher({
      kind: 'bot',
      route: '0',
      facing: 'down',
      dormant: true,
      speed: 30,
      caught: [[Speaker.MuseumBot, 'THE MINERAL HALL IS... CLOSED. PLEASE... EXIT.'], 'The guide robot escorts you back to the gallery.'],
      barks: { suspicious: ['VISITOR... DETECTED?'], investigate: ['WAKING UP... WHO IS THERE?'], giveUp: ['MINERAL HALL... CLOSED. STANDBY.'] },
    });
    // Five showcases with faded labels. Only one holds quartz: the others punish a careless guess.
    const quartzTaken = w.flag(progress.got('quartz'));
    const specimens = w.decorEach(
      '9',
      CRYSTALS.map((c) => (c.quartz && quartzTaken ? null : c.kind)),
    );
    w.inspectEach('9', 'Showcase', async (w, index) => {
      const crystal = CRYSTALS[index];
      if (crystal.quartz && w.flag(progress.got('quartz'))) {
        await w.say('An empty case, and a clean square in the dust where the quartz used to sit.');
        return;
      }
      await w.say('The label is too faded to read. Only the crystal itself can tell you what it is.');
      if (w.has('quartz')) return;
      const pick = await w.choose('Take the crystal?', ['Take it', 'Leave it']);
      if (pick !== 0) return;
      if (!crystal.quartz) {
        // The case's old alarm still works, and the guide bot comes to see who broke in.
        w.sfx('alarm');
        w.shake(1.5, 0.5);
        w.alarm(170);
        await w.say('DISPLAY BREACH. DISPLAY BREACH.', [Speaker.Andrew, `${crystal.reveal} Not quartz... and now everything in here knows where I am.`]);
        return;
      }
      specimens[index]?.remove();
      w.give('quartz');
      w.sfx('pickup');
      w.toast(`Got: ${ITEMS.quartz.name}`);
      w.save();
      await w.say(
        [Speaker.Andrew, 'A six-sided column that tapers to a point, and it scratches the glass. Quartz.'],
        [Speaker.Andrew, 'Quartz is piezoelectric: squeeze it and it makes a voltage, and an electric field makes it vibrate at a precise frequency.'],
        [Speaker.Andrew, "That's why it keeps time in watches. And in Pike's core."],
      );
    });

    // --- Inside ---
    w.hazard({ area: 'Z', kind: 'rocks' });
    w.trigger({
      area: 'J',
      block: true,
      when: (w) => !w.has('shield'),
      run: (w) => w.say([Speaker.Andrew, 'Chunks of the ceiling keep falling in that gallery. I need something over my head.']),
    });
    w.trigger({
      area: 'J',
      once: Flag.RuinsGalleryHint,
      when: (w) => w.has('shield'),
      run: (w) => w.say([Speaker.Andrew, "The roof is coming down in pieces. Good thing I kept the Archbishop's shield."]),
    });
    const labDoor = w.gate({ marker: 'D', look: 'door', openFlag: Flag.RuinsLabOpen });
    // The access panel on the wall beside the door opens it with the power cell.
    const powerLabDoor = async (w: WorldApi): Promise<void> => {
      if (labDoor.isOpen) return;
      if (!w.has('powercell')) {
        await w.say([Speaker.Andrew, 'A heavy lab door, and a dead access panel beside it. It needs power.']);
        return;
      }
      w.sfx('hack');
      await w.say([Speaker.Andrew, "Yuki's Power Cell again. Let there be light."]);
      labDoor.open();
      w.save();
    };
    w.inspect('N', 'Door panel', powerLabDoor);
    w.npc({ marker: 'P', look: 'pike', name: Speaker.Pike, talk: talkToPike });

    // --- Leftover machines ---
    w.watcher({ kind: 'drone', route: 'AC', wait: 1.5, speed: 40, caught: DRONE_CAUGHT });
    w.watcher({ kind: 'drone', route: 'EF', wait: 1.8, speed: 38, caught: DRONE_CAUGHT });
    w.watcher({
      kind: 'bot',
      route: 'GH',
      wait: 2.4,
      speed: 24,
      caught: [[Speaker.MuseumBot, 'PLEASE... DO NOT TOUCH... THE EXHIBITS.'], 'The ancient guide robot escorts you back to the entrance.'],
      barks: { suspicious: ['VISITOR DETECTED?'], investigate: ['THIS WAY TO... THE EXHIBITS.'], giveUp: ['MUSEUM CLOSED. MUSEUM CLOSED.'] },
    });

    w.inspect('B', 'Whale skeleton', (w) =>
      w.say(
        'A whale skeleton, still hanging from the ceiling of the main hall.',
        [Speaker.Andrew, 'Whales: the largest animals that ever lived, bigger than any dinosaur. Even Pip would be impressed.'],
      ),
    );

    for (const marker of ['S', 'Q', 'R', 'T', '2']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      [Speaker.Andrew, 'Dust. Dead trees. Not a single light anywhere.'],
      [Speaker.Andrew, 'Madrid, 2240. That building... the Museo Nacional de Ciencias Naturales. Founded in 1771, and still standing.'],
      [Speaker.Andrew, "The drought finally won. Nobody's lived here for a long time. Except, maybe, Pike."],
    );
  }
  if (w.flag(Flag.PipAboard) && !w.flag(Flag.RuinsColumn)) {
    await w.say([Speaker.Andrew, 'Welcome to the future, Pip. Try not to eat anything.'], [Speaker.Pip, '*curious chirp*']);
    if (!w.flag(Flag.RuinsPipDrank)) await w.say([Speaker.Pip, '*pants and flops down in the shade*'], [Speaker.Andrew, 'This heat... Hang in there, buddy.']);
  }
  if (!w.flag(progress.diagnosed('ruins'))) await diagnose(w);
}

async function talkToPike(w: WorldApi): Promise<void> {
  if (w.flag(progress.fixed('ruins')) || w.has('core')) {
    await w.say([Speaker.Pike, 'Go install that core. And then take us home, Ward.']);
    return;
  }
  if (!w.flag(Flag.RuinsMetPike)) {
    w.setFlag(Flag.RuinsMetPike);
    await w.say(
      [Speaker.Pike, "Another traveler? Here? ...And an Institute field suit. They finally sent someone after me."],
      [
        Speaker.Andrew,
        w.has('recorder')
          ? "Nobody sent me. I'm Andrew Ward, Test Run #47. I'm stranded too. I found your recorder, and your cache in 1248."
          : "Nobody sent me. I'm Andrew Ward, Test Run #47. I'm stranded too. Your cache in 1248 led me here.",
      ],
      [Speaker.Pike, 'Aaron Pike. Test Run #12, October 2019. For me that was... I honestly lost count. Decades of jumps.'],
      [Speaker.Pike, 'I came this far forward because nobody would be left to find me. The drought emptied the city long ago.'],
      [Speaker.Pike, "But I'm sick. My gums bleed, old wounds are reopening. Scurvy. There's been no fresh fruit on my road for years."],
    );
  }
  if (!w.flag(Flag.RuinsPikeCured)) {
    if (!w.has('canelo')) {
      await w.say(
        [Speaker.Pike, "Without vitamin C, I won't last long enough to help you."],
        [Speaker.Andrew, 'Vitamin C... The machi in Araucanía! The foye bark. I have to go back for it.'],
      );
      return;
    }
    w.take('canelo');
    w.setFlag(Flag.RuinsPikeCured);
    await w.say(
      [Speaker.Andrew, 'Here. Foye bark, a gift from a Mapuche machi in 1553. Brew it as a tea.'],
      [Speaker.Pike, "Winter's bark... Drimys winteri. Sailors used it against scurvy. Ward, you beautiful nerd."],
    );
    w.sfx('heal');
    await w.wait(0.8);
    w.save();
    await w.say(
      [Speaker.Pike, "Better already. Now, the bad news: my temporal core. Its quartz oscillator cracked on the last jump."],
      [Speaker.Pike, 'Without a clean crystal it cannot hold a frequency, and the machine will never lock on to one moment.'],
      [Speaker.Pike, "The museum's mineral hall had beautiful quartz. The east gallery, behind the old security shutter."],
      [Speaker.Pike, 'The labels have faded, so look at the shape: quartz grows as a six-sided column that ends in a point, like a pencil.'],
      [Speaker.Pike, 'The beryl is six-sided too, but flat on top. Do not bring me beryl. And the old cases still have alarms.'],
      [Speaker.Pike, 'Its console still runs Chronos firmware. The guide robot in there sleeps lightly: broken glass and alarms wake it.'],
    );
  }
  if (!w.has('quartz')) {
    await w.say([Speaker.Pike, 'The mineral hall, Ward. Quartz. Without it, the core is a paperweight.']);
    return;
  }
  w.take('quartz');
  await w.say(
    [Speaker.Pike, 'Perfect. Not a single flaw.'],
    'Pike cuts a sliver of the crystal and solders it into the core, muttering frequencies under his breath.',
  );
  for (let i = 0; i < 3; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.give('core');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.core.name}`);
  w.save();
  await w.say(
    [Speaker.Pike, 'Take this. My temporal core, the only one outside the Institute. It lets the machine lock on to a single moment.'],
    [Speaker.Pike, 'But it needs your exact origin year. Get it wrong and you end up somewhere else entirely.'],
    [Speaker.Pike, "#47... They scheduled #47 seven years after my run. Don't tell me you forgot your own year."],
    [Speaker.Andrew, '...Of course not. Probably.'],
    [Speaker.Pike, 'One more thing. The machine can carry two. Take me home with you, Ward. Please.'],
    [Speaker.Andrew, "Of course. Let's go home."],
  );
}

/** The main hall's exhibits, in reading order on the map (marker `1`): natural history, and a few pieces from 2087. */
const EXHIBITS: Array<{ kind: DecorKind; lines: Line[] }> = [
  {
    kind: 'exhibit_deck',
    lines: [
      'A battered cyberdeck. Label: "Tokyo, 2087. Used in the Chronos Leaks, the archive dump that brought down the Chronos Corporation."',
      [Speaker.Andrew, "Yuki's deck. She did it. Chronos fell... and the stickers are still on it."],
    ],
  },
  {
    kind: 'exhibit_clock',
    lines: [
      'An optical lattice clock. Label: "Tokyo, 2087. Strontium atoms in a lattice of laser light: it would not lose a second in the age of the universe."',
      [Speaker.Andrew, 'Its twin is ticking inside my machine right now.'],
    ],
  },
  {
    kind: 'exhibit_ammonite',
    lines: [
      'A fossil ammonite: a spiral-shelled cousin of octopus and squid.',
      [Speaker.Andrew, 'They vanished in the same extinction as the dinosaurs, 66 million years ago. Pip would have known them as seafood.'],
    ],
  },
  {
    kind: 'exhibit_trilobite',
    lines: [
      'A trilobite on a slab of shale.',
      [Speaker.Andrew, 'Sea arthropods that lasted almost 270 million years, until the great extinction at the end of the Permian.'],
    ],
  },
  {
    kind: 'exhibit_lynx',
    lines: [
      'A stuffed Iberian lynx. Its label reads: "In 2002 fewer than a hundred were left. By the 2020s, conservation had brought them back to the thousands."',
      [Speaker.Andrew, 'I hope they made it through the drought.'],
    ],
  },
  {
    kind: 'exhibit_idol',
    lines: [
      'A collector\'s figure of Hoshi Kirara, pink twin tails and all. Label: "Virtual idol, Tokyo, late 21st century. Her holograms filled whole avenues."',
      [Speaker.Andrew, 'I saw her. Three stories tall, dancing in the rain.'],
    ],
  },
  {
    kind: 'exhibit_dodo',
    lines: [
      'A model of a dodo, a flightless bird from Mauritius. The last widely accepted sighting was in 1662.',
      [Speaker.Andrew, 'Extinction is forever. Even with a time machine, apparently.'],
    ],
  },
]

/**
 * The mineral hall's showcases, in reading order on the map. Real minerals, told apart by their shape:
 * quartz grows as six-sided columns ending in a point; beryl is six-sided too, but flat-topped.
 */
const CRYSTALS: Array<{ kind: DecorKind; reveal: string; quartz?: boolean }> = [
  { kind: 'crystal_calcite', reveal: 'Calcite: Iceland spar, it splits light in two.' },
  { kind: 'crystal_beryl', reveal: 'Six sides, but flat on top: beryl, an emerald cousin.' },
  { kind: 'crystal_pyrite', reveal: "Pyrite. Fool's gold." },
  { kind: 'crystal_quartz', reveal: '', quartz: true },
  { kind: 'crystal_fluorite', reveal: 'Fluorite: the mineral fluorescence was named after.' },
]

/** The nomad hides from the heat in the old Metro, by a cistern. He trades water for food. */
async function talkToNomad(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.RuinsPipNomad,
    [Speaker.Nomad, 'Stay back! ...Is that a lizard? A big, two-legged lizard with a stone for a head?'],
    [Speaker.Nomad, 'In my grandfather\'s time the zoos kept strange beasts. I never thought I would see one walking down here.'],
  );
  if (w.flag(progress.got('water'))) {
    await w.say(
      [Speaker.Nomad, 'Most people went north generations ago, to the Cantabrian coast, where it still rains.'],
      [Speaker.Nomad, 'There is an old man living in the museum. He talks to machines. Leave him be... or bring him fruit.'],
    );
    return;
  }
  await w.say(
    [Speaker.Nomad, 'You found my hole. Down here the air stays cool, and the cistern still catches a little water.'],
    [Speaker.Nomad, 'Water for trade? Water is the only money left in Madrid. What have you got?'],
  );
  if (!w.has('bread')) {
    await w.say([Speaker.Andrew, 'Nothing you would want, I am afraid.'], [Speaker.Nomad, 'Then the water stays with me.']);
    return;
  }
  w.give('water');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.water.name}`);
  w.save();
  await w.say(
    [Speaker.Andrew, 'Rye bread? From... far away.'],
    [Speaker.Nomad, 'Bread. Real bread. Nobody has grown rye on this plateau in a century.'],
    [Speaker.Nomad, 'Here, a full flask. Clean, I filter it myself. You got the better deal, and I do not care.'],
  );
}

/** The machine's self-test: runs on arrival, so the HUD can list the parts right away. */
async function diagnose(w: WorldApi): Promise<void> {
  w.setFlag(progress.diagnosed('ruins'));
  w.sfx('error');
  await w.say(
    'DIAGNOSTIC REPORT  ·  Year: 2240 AD  ·  Stability: 90%  ·  Missing: temporal core (destination lock).',
    [Speaker.Andrew, "Everything works except the one thing that matters: locking on to home. Pike's core."],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag(progress.fixed('ruins'))) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag(progress.diagnosed('ruins'))) await diagnose(w);
  if (!w.has('core')) {
    if (w.flag(Flag.RuinsMetPike)) await w.say([Speaker.Andrew, 'I still need the temporal core from Pike. Without it, home is out of reach.']);
    else await w.say([Speaker.Andrew, 'Pike must be somewhere around here. The museum, maybe?']);
    // The machine still reaches every window it already knows, so nothing can strand Andrew here.
    await timeMachineMenu(w);
    return;
  }
  await w.say([Speaker.Andrew, 'The temporal core... Careful... There.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.take('core');
  w.setFlag(progress.fixed('ruins'));
  w.save();
  if (w.flag(Flag.PipAboard) && !w.flag(Flag.RuinsPipHome)) {
    w.setFlag(Flag.RuinsPipHome);
    await w.say(
      [Speaker.Andrew, 'Before anything else, one promise to keep.'],
      'Andrew takes Pip back to Hell Creek, 66.5 million years ago, and comes back to 2240 a moment later.',
      [Speaker.Andrew, "He ran straight into the ferns without looking back. That's how it should be. Goodbye, buddy."],
    );
  }
  await goHome(w);
}
