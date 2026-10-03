import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { MEDIEVAL_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { MEDIEVAL_MAP, MEDIEVAL_MARKER_BASE } from './medieval-map.ts';
import { timeMachineMenu } from './shared.ts';
import type { EraDef, Line, WorldApi } from './types.ts';

const PARTS: ItemId[] = ['gear', 'quicksilver'];

/** Elias's translator earpiece renders Middle High German as heavily accented English. */
const GUARD_CAUGHT: Line[] = [['Guard', 'Halt! You zere! Stop in ze name of ze Archbishop!'], 'The guards drag you out of the castle and toss you into the bushes.'];

/*
 * World 2: the Archbishop of Cologne's castle and its village, 1248.
 * That April the old cathedral burned; in August Archbishop Konrad von
 * Hochstaden laid the foundation stone of the new one. The same year the
 * Dominican scholar Albertus Magnus arrived in Cologne with his student,
 * Thomas Aquinas. Teaches using objects: bread for the dog, pebbles to lure
 * guards, and a shield for the crossbow bolts during the escape.
 */
export const MEDIEVAL: EraDef = {
  id: 'medieval',
  ...ERA_INFO.medieval,
  music: 'village',
  musicZones: [{ area: { x: 8, y: 1, w: 32, h: 20 }, theme: 'castle' }],
  map: MEDIEVAL_MAP,
  markerBase: MEDIEVAL_MARKER_BASE,
  tiles: MEDIEVAL_TILES,
  defaultTile: 't',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (w.flag('alarm')) return w.has('shield') ? 'Escape through the archers’ gallery on the east side of the keep.' : 'Grab the shield in the armory, then escape through the archers’ gallery.';
    if (!w.flag('diag:medieval')) return 'Check the time machine.';
    if (!w.flag('fixed:medieval')) {
      const steps: string[] = [];
      if (!w.has('gear')) {
        if (w.has('charcoal')) steps.push('bring the charcoal to the bell-founder');
        else if (!w.has('bread')) steps.push(w.has('firewood') ? 'bring the firewood to Agnes the baker' : 'the shed dog needs bribing: Agnes the baker needs firewood from the pile behind the chapel');
        else steps.push('get charcoal for the bell-founder (it’s by the shed, guarded by a dog: try the bread)');
      }
      if (!w.has('quicksilver')) {
        if (!w.has('pebbles')) steps.push(w.has('top') ? 'give Jakob back his spinning top' : 'find Jakob’s spinning top in the woods south of the village');
        else steps.push('find the quicksilver in the castle tower');
      }
      return steps.length ? `To do: ${steps.join('; ')}.` : 'Bring the parts back to the time machine.';
    }
    if (w.has('powercell') && !w.flag('got:notes')) return 'Power the strange panel on the chapel crypt with the Power Cell.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    // Coming back after a break: the castle has calmed down.
    if (w.flag('alarm')) w.setFlag('alarm', false);

    w.machine('M', useMachine);
    w.decor('V', 'cologne');

    // --- Villagers ---
    w.npc({ marker: 'B', look: 'baker', name: 'Agnes', talk: talkToBaker });
    w.npc({ marker: 'K', look: 'founder', name: 'Meister Ulrich', talk: talkToFounder });
    w.npc({ marker: 'T', look: 'kid', name: 'Jakob', talk: talkToKid });
    w.npc({
      marker: 'E',
      look: 'elder',
      name: 'Old Gertrud',
      talk: (w) =>
        w.say(
          ['Old Gertrud', 'You heard? The old cathedral burned down in April. Ash everywhere.'],
          ['Old Gertrud', 'Archbishop Konrad swears he will lay the stone for a new one this August. Bigger than anything in France, he says.'],
          ['Elias', "It will be. It'll take them six hundred years, but it will be."],
          ['Old Gertrud', 'And that crypt behind me? Sealed since the night the sky burned, years ago. The door hums like a beehive.'],
        ),
    });
    w.npc({
      marker: 'G',
      look: 'guard',
      name: 'Gate Guard',
      talk: (w) =>
        w.flag('escaped')
          ? w.say(['Gate Guard', "Some fool broke into Brozer Albert's tower. Nobody gets in. Move along!"])
          : w.say(
              ['Gate Guard', 'Halt! Only castle folk past zis gate.'],
              ['Elias', "I'm a... traveling scholar?"],
              ['Gate Guard', 'Zen go and travel somewhere else.'],
            ),
    });
    w.npc({
      marker: 'Y',
      look: 'thomas',
      name: 'Brother Thomas',
      talk: (w) =>
        w.say(
          ['Brother Thomas', '...'],
          ['Brother Thomas', 'Forgive me. I was thinking. The other students call me "the dumb ox" because I speak so little.'],
          ['Brother Thomas', 'Master Albert says one day this ox will bellow so loud the whole world will hear it.'],
          ['Elias', '(Thomas Aquinas. He has no idea how right Albert is.)'],
        ),
    });
    w.npc({ marker: '4', look: 'albertus', name: 'Brother Albert', facing: 'down', talk: talkToAlbert });

    // --- Side quests ---
    w.pickup({
      marker: 'P',
      item: 'top',
      lines: [['Elias', "A wooden spinning top with a red band. This must be Jakob's. The older boys threw it pretty far."]],
    });
    w.pickup({
      marker: 'W',
      item: 'firewood',
      lines: [['Elias', "The woodcutter's pile. An armful of split beech for Agnes's oven. Bakers burned through mountains of wood."]],
    });

    // --- Items ---
    w.pickup({ marker: '2', item: 'charcoal', lines: [['Elias', 'A sack of charcoal. Founders need it for their furnaces. Sorry, Brutus.']] });
    w.pickup({
      marker: '3',
      item: 'shield',
      lines: [['Elias', "A heater shield with the Archbishop's black cross. Solid oak and leather. It might come in handy."]],
      after: (w) => {
        if (w.flag('alarm')) return w.say(['Elias', 'Perfect. Now, about those crossbow bolts...']);
      },
    });

    // --- Guards and Brutus ---
    w.watcher({ kind: 'guard', route: 'O', facing: 'down', sweep: 0.45, range: 80, caught: GUARD_CAUGHT });
    w.watcher({ kind: 'guard', route: 'AC', wait: 1.6, caught: GUARD_CAUGHT });
    w.watcher({ kind: 'guard', route: 'FH', wait: 1.8, caught: GUARD_CAUGHT });
    w.watcher({ kind: 'guard', route: 'IJ', wait: 2.2, caught: GUARD_CAUGHT });
    w.watcher({
      kind: 'dog',
      route: 'D',
      facing: 'left',
      sweep: 1.0,
      range: 64,
      caught: [['Brutus', 'WOOF! WOOF! GRRRR...'], "Meister Ulrich's apprentice runs over and shoos you away from the shed."],
    });

    // --- Castle escape: crossbowmen in the gallery's arrow-slit alcoves ---
    w.decor('5', 'archer_s');
    w.decor('6', 'archer_s');
    w.decor('7', 'archer_n');
    w.decor('1', 'archer_n');
    w.hazard({ area: 'Q', kind: 'arrows', shooters: '5671', when: (w) => w.flag('alarm') });
    w.trigger({
      area: 'L',
      block: true,
      when: (w) => !w.flag('alarm'),
      run: (w) => w.say(['Elias', "The archers' gallery. Crossbowmen are posted in there; they'd spot me in a heartbeat."]),
    });
    w.trigger({
      area: 'L',
      block: true,
      when: (w) => w.flag('alarm') && !w.has('shield'),
      run: (w) =>
        w.say(
          ['Elias', 'Crossbow bolts are flying all over the gallery! I need something to block them...'],
          ['Elias', 'The armory! There was a shield on the rack.'],
        ),
    });
    w.trigger({
      area: 'N',
      block: true,
      when: (w) => w.flag('alarm'),
      run: (w) =>
        w.say(
          ['Elias', "Guards are flooding the courtyard! I can't go back out that way."],
          ['Elias', 'The gallery on the east side of the keep drops down outside the walls.'],
        ),
    });
    w.trigger({
      area: '9',
      when: (w) => w.flag('alarm'),
      run: async (w) => {
        w.setFlag('alarm', false);
        w.setFlag('escaped');
        w.music(null);
        w.save();
        await w.say(['Elias', "Made it out! And that drop means there's no getting back in this way."], ['Elias', 'Now back to the machine, before anyone gets curious.']);
      },
    });

    // --- Hints ---
    w.trigger({
      area: 'U',
      once: 'med:courtyardHint',
      run: (w) =>
        w.say(
          ['Elias', "Guards everywhere, and one standing right at the keep's door."],
          w.has('pebbles')
            ? ['Elias', "Time to test Jakob's theory. A pebble in the right spot should lure that door guard away."]
            : ['Elias', "If I could make a noise somewhere else, maybe they'd go check it out."],
        ),
    });

    w.inspect('8', 'Sealed door', openCrypt);

    for (const marker of ['S', 'X', 'Z']) w.checkpoint(marker);

    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      ['Elias', 'Ugh... that landing was rougher than the last one.'],
      ['Elias', 'Stone walls, a black cross on the banners... The Archbishop of Cologne. The Holy Roman Empire, 1248.'],
      ['Elias', 'My translator earpiece is struggling with Middle High German. Everyone is going to sound like an old war movie.'],
      ['Elias', "Let's see what the machine needs this time."],
    );
    w.toast('Check the time machine');
  } else {
    await w.say(['Elias', 'Back in 1248. Mind the guards, Elias.']);
  }
}

async function talkToBaker(w: WorldApi): Promise<void> {
  if (!w.has('bread') && !w.has('firewood')) {
    await w.say(
      ['Agnes', 'Ach, look at you! Strange clothes, and thin as a rake.'],
      ['Agnes', "I would give you bread, but my oven is cold. Not a stick of wood left, and ze woodcutter is sick in bed."],
      ['Agnes', 'His woodpile is behind ze chapel, on ze east side of ze village. Bring me an armful and you shall have ze first loaf.'],
    );
    return;
  }
  if (!w.has('bread')) {
    w.take('firewood');
    await w.say(['Agnes', 'Wood! Bless you. Give me a moment to fire up ze oven...']);
    await w.fadeOut(0.4);
    w.sfx('rumble');
    await w.wait(0.8);
    await w.fadeIn(0.4);
    await w.say(['Agnes', 'Here, fresh rye bread. I always bake more than zis village can eat.']);
    w.give('bread');
    w.sfx('pickup');
    w.toast(`Got: ${ITEMS.bread.name}`);
    w.save();
    await w.say('Rye Bread: press {throw} to throw it in front of you. Animals love it. Press {cycle} to switch between items.');
    return;
  }
  if (!w.flag('med:bakerLore')) {
    w.setFlag('med:bakerLore');
    await w.say(
      ['Agnes', "You know, you're ze second stranger in odd clothes I've seen."],
      ['Agnes', 'Years ago a man in a silver coat came through. He kept talking to a little box, and ze box talked back!'],
      ['Agnes', 'Folks called him a wizard. One morning he was gone.'],
      ['Elias', '...A silver coat. Like an Institute field suit?'],
    );
    return;
  }
  await w.say(['Agnes', 'Take as much bread as you need, dear.']);
}

async function talkToFounder(w: WorldApi): Promise<void> {
  if (w.flag('got:gear')) {
    await w.say(['Meister Ulrich', 'Fine work, zat gear, if I say so myself. Same bronze we use for church bells.']);
    return;
  }
  if (!w.has('charcoal')) {
    await w.say(
      ['Meister Ulrich', 'A bronze gear? Ja, I could cast one. I cast bells, a gear is nozing.'],
      ['Meister Ulrich', 'But my furnace needs charcoal, and lots of it. Bronze melts at a terrible heat.'],
      ['Meister Ulrich', 'Zere is a sack by my shed down ze road, but Brutus guards it. Zat dog bites everyone but me.'],
      ['Meister Ulrich', "And I can't leave ze furnace. Bring me ze charcoal and I make your gear."],
    );
    if (!w.has('bread')) await w.say(['Elias', 'Hmm. Maybe Brutus can be bribed...']);
    return;
  }
  w.take('charcoal');
  await w.say(['Meister Ulrich', 'Charcoal! You got past Brutus? Ha! Give me a moment.']);
  await w.fadeOut(0.4);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  await w.fadeIn(0.4);
  w.give('gear');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.gear.name}`);
  w.save();
  await w.say(['Meister Ulrich', "One bronze gear, cast and filed. Copper and tin, ze right mix. Mind ze edges, zey're still warm."]);
}

async function talkToKid(w: WorldApi): Promise<void> {
  if (w.has('pebbles')) {
    await w.say(['Jakob', "Zere's a hole in ze castle's east wall, behind ze bushes! Don't tell anyone."]);
    return;
  }
  if (!w.has('top')) {
    if (!w.flag('med:metJakob')) {
      w.setFlag('med:metJakob');
      await w.say(
        ['Jakob', 'Whoa, your clothes are so weird! Are you a wizard?'],
        ['Elias', "Uh... sort of. I'm a natural philosopher."],
        ['Jakob', 'Like Brozer Albert in ze tower? He keeps toads and stinky metals up zere.'],
        ['Elias', 'I need to get inside the castle. Any ideas?'],
        ['Jakob', 'Maybe I know a secret. Maybe I know two!'],
        ['Jakob', "But ze miller's boys threw my spinning top into ze woods south of ze village, and I'm not allowed to go zere alone."],
        ['Jakob', 'Find my top and I tell you everysing.'],
      );
    } else {
      await w.say(['Jakob', 'Did you find my top? Ze woods are south, past ze square. It has a red band!']);
    }
    return;
  }
  w.take('top');
  await w.say(
    ['Jakob', 'My top! You found it!'],
    ['Jakob', "Okay, secret number one: ze guards always go look when zey hear a noise. Zey're so dumb."],
    ['Jakob', 'Here, take my lucky pebbles. Throw one and watch zem run!'],
  );
  w.give('pebbles');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.pebbles.name}`);
  w.save();
  await w.say(
    'Pebbles: press {throw} to throw one in front of you. Guards walk over to check out the noise.',
    ['Jakob', "Oh, and zere's a hole in ze castle's east wall, behind ze bushes. I sneak in for apples."],
  );
}

/** Albertus Magnus: a scientist meeting a scientist. He trades quicksilver for a good answer. */
async function talkToAlbert(w: WorldApi): Promise<void> {
  if (w.has('quicksilver')) {
    await w.say(['Brother Albert', 'Go, go! Before ze guards find you here. And may your strange philosophy serve you well.']);
    return;
  }
  if (!w.flag('med:metAlbert')) {
    w.setFlag('med:metAlbert');
    await w.say(
      ['Brother Albert', 'Hm? A visitor who climbs in through ze windows instead of using ze door. How unusual.'],
      ['Brother Albert', 'I am Albert, of ze Order of Preachers. Some call me Albertus. I study stones, plants, animals... and metals.'],
      ['Elias', '(Albertus Magnus. One of the greatest naturalists of the Middle Ages.)'],
      ['Elias', 'Brother Albert, I need quicksilver. It is... for a machine.'],
      ['Brother Albert', 'A machine! Wonderful. Zen answer me one riddle, and ze quicksilver is yours.'],
    );
  }
  await w.say(['Brother Albert', 'Quicksilver is a metal, yet it flows like water. Why?']);
  const pick = await w.choose('Why is quicksilver liquid?', [
    'It is cursed by the alchemists.',
    'Its melting point is so low that it stays liquid even in the cold.',
    'It is silver dissolved in water.',
  ]);
  if (pick !== 1) {
    await w.say(
      ['Brother Albert', 'Hmm, no. I have tested zat, and it is not so. Every metal melts in ze fire, ja?'],
      ['Brother Albert', 'Zink about how hot a fire must be for each one. Come back when you have an answer.'],
    );
    return;
  }
  await w.say(
    ['Elias', 'Mercury melts at about minus thirty-nine degrees. Lead needs over three hundred. Mercury is simply a metal whose melting point is very, very low.'],
    ['Brother Albert', 'Ha! Every metal has its own fire. Ja, ja! I have written somesing like zis.'],
    ['Brother Albert', 'Take it, my friend. But careful: its vapors are poison. Never heat it near your face.'],
  );
  w.give('quicksilver');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.quicksilver.name}`);
  await soundTheAlarm(w);
}

async function soundTheAlarm(w: WorldApi): Promise<void> {
  w.sfx('alarm');
  w.shake(2, 0.6);
  w.music('tension');
  w.setFlag('alarm');
  await w.say(
    ['Guard', 'INTRUDER! Zere is an intruder in Brozer Albert\'s tower!'],
    ['Brother Albert', 'Ach, ze guards heard us talking. You cannot go back down through ze courtyard.'],
    ['Brother Albert', 'Take ze archers’ gallery behind my door to ze east. It drops down outside ze walls.'],
    ['Brother Albert', 'Ze crossbowmen will shoot at anysing zat moves, so keep your head covered!'],
  );
}

/** The sealed crypt is Pike's hidden cache. It only opens with power from the future. */
async function openCrypt(w: WorldApi): Promise<void> {
  w.setFlag('sawPanel');
  if (w.flag('got:notes')) {
    await w.say("Pike's crypt. Empty now, except for dust and a faint hum.");
    return;
  }
  if (!w.has('powercell')) {
    await w.say(
      ['Elias', 'Wait... is that a metal panel? With blinking lights?'],
      ['Elias', 'This is 1248! Nobody here could build something like this.'],
      ['Elias', "It's dead, though, and nothing I have can power it... not yet."],
    );
    if (w.has('recorder')) await w.say(['Elias', 'Pike... was this you?']);
    return;
  }
  await w.say(['Elias', "The Power Cell's connector fits the panel. Let's wake it up."]);
  w.sfx('hack');
  await w.wait(0.6);
  w.sfx('door');
  w.shake(1.5, 0.6);
  await w.fadeOut(0.5);
  await w.wait(0.6);
  w.give('notes');
  await w.fadeIn(0.5);
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.notes.name}`);
  w.save();
  await w.say(
    'Behind the door: a tiny room with Institute crates, a cot, and a notebook in a plastic sleeve.',
    ['Pike', '(written) Cache #3. If you are reading this, you found a power source. Good. You are smarter than the Institute.'],
    ['Pike', '(written) The machine can only lock on to home with a temporal core. I built one, the only one outside the Institute.'],
    ['Pike', '(written) I hid it where it would be safe from them: Madrid, 2240. Long after they are gone.'],
    ['Pike', '(written) Coordinates attached. Bring something for scurvy. I am running out of fruit.'],
    ['Elias', '2240... The machine should be able to find that window now.'],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag('fixed:medieval')) {
    await timeMachineMenu(w);
    return;
  }

  if (!w.flag('diag:medieval')) {
    w.setFlag('diag:medieval');
    w.sfx('error');
    await w.say(
      'DIAGNOSTIC REPORT  ·  Year: 1248 AD  ·  Stability: 31%  ·  Damaged: drive gear, core coolant.',
      ['Elias', 'A gear and a coolant. A bell-founder could cast a bronze gear...'],
      ['Elias', 'And for coolant: quicksilver. Mercury is a liquid metal that carries heat well, and medieval alchemists collected it.'],
    );
  }

  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say(['Elias', `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }

  await w.say(['Elias', 'Gear in, coolant in... Moment of truth.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag('fixed:medieval');
  w.save();
  await w.say(
    'STABILITY 54%  ·  INTER-ERA NAVIGATION: ONLINE  ·  NEW WINDOW DETECTED',
    ['Elias', "I can jump between places I've already been... and there's a new window. The year display is still garbage, though."],
  );
  await timeMachineMenu(w);
}
