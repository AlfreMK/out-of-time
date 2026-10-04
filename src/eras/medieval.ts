import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { MEDIEVAL_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { MEDIEVAL_MAP, MEDIEVAL_MARKER_BASE } from './medieval-map.ts';
import { pipAlong, pipReaction, timeMachineMenu } from './shared.ts';
import type { EraDef, GateHandle, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, progress } from '../game/flags.ts';

const PARTS: ItemId[] = ['gear', 'quicksilver'];

/** Andrew's translator earpiece renders Middle High German as heavily accented English. */
const GUARD_CAUGHT: Line[] = [[Speaker.Guard, 'Halt! Stehen bleiben, im Namen des Erzbischofs!'], 'The guards drag you out of the castle and toss you into the bushes.'];

/** The doorway from Brother Albert's tower into the archers' gallery. */
const GALLERY_DOOR = { x: 33, y: 5, w: 1, h: 1 };

/** The Archbishop's forest, south of the village: his hunting reserve, watched by a forester. */
const FOREST = { x: 0, y: 43, w: 48, h: 19 };

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
  musicZones: [
    { area: { x: 8, y: 1, w: 32, h: 20 }, theme: 'castle' },
    { area: FOREST, theme: 'forest' },
  ],
  map: MEDIEVAL_MAP,
  markerBase: MEDIEVAL_MARKER_BASE,
  tiles: MEDIEVAL_TILES,
  defaultTile: 't',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (w.flag(Flag.Alarm)) return w.has('shield') ? 'Escape through the archers’ gallery on the east side of the keep.' : 'Grab the shield in the armory, then escape through the archers’ gallery.';
    if (!w.flag(progress.diagnosed('medieval'))) return 'Check the time machine.';
    if (!w.flag(progress.fixed('medieval'))) {
      const steps: string[] = [];
      if (!w.has('gear')) {
        if (w.has('charcoal')) steps.push('bring the charcoal to the bell-founder');
        else if (!w.has('bread')) steps.push(w.has('firewood') ? 'bring the firewood to Agnes the baker' : 'Brutus needs bribing: Agnes the baker needs firewood from the woodcutter’s clearing in the forest');
        else steps.push('get the charcoal from the bell-founder’s yard (Brutus guards the gate: try the bread)');
      }
      if (!w.has('quicksilver')) {
        if (!w.has('pebbles')) steps.push(w.has('top') ? 'give Jakob back his spinning top' : 'find Jakob’s spinning top by the mill, deep in the forest south of the village');
        else steps.push('find the quicksilver in the castle tower');
      }
      return steps.length ? `To do: ${steps.join('; ')}.` : 'Bring the parts back to the time machine.';
    }
    if (w.has('powercell') && !w.flag(progress.got('notes'))) {
      return w.flag(Flag.MedCryptOpen) ? "Search Pike's hideout behind the door in the chapel." : 'Power the strange panel on the chapel crypt with the Power Cell.';
    }
    if (w.has('emitter')) return "Install Pike's Field Emitter in the time machine.";
    if (!w.flag(Flag.NavInstalled)) return 'The machine can carry two now. Go back to Hell Creek for Pip, and climb the rocky pass with the shield.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    // Coming back after a break: the castle has calmed down.
    if (w.flag(Flag.Alarm)) w.setFlag(Flag.Alarm, false);

    w.machine('M', useMachine);
    w.decor('V', 'cologne');
    pipAlong(w, 'S');

    // --- Villagers ---
    w.npc({ marker: 'B', look: 'baker', name: Speaker.Agnes, talk: talkToBaker });
    w.npc({ marker: 'K', look: 'founder', name: Speaker.MeisterUlrich, talk: talkToFounder });
    w.npc({ marker: 'T', look: 'kid', name: Speaker.Jakob, talk: talkToKid });
    w.npc({
      marker: 'E',
      look: 'elder',
      name: Speaker.OldGertrud,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.MedPipGertrud,
          [Speaker.OldGertrud, 'Holy saints... When I was a girl, the priest showed us bones of giants and dragons dug out of the hills.'],
          [Speaker.OldGertrud, 'I always thought it was a tale. Your little beast looks just like them.'],
          [Speaker.Andrew, '(Fossils. Medieval Europe explained them as the bones of dragons and giants. She is closer to the truth than she knows.)'],
        );
        await w.say(
          [Speaker.OldGertrud, 'You heard? The old cathedral burned down in April. Ash everywhere.'],
          [Speaker.OldGertrud, 'Archbishop Konrad swears he will lay the stone for a new one this August. Bigger than anything in France, he says.'],
          [Speaker.Andrew, "It will be. It'll take them six hundred years, but it will be."],
          [Speaker.OldGertrud, 'And that crypt behind me? Sealed since the night the sky burned, years ago. The door hums like a beehive.'],
        );
      },
    });
    w.npc({
      marker: 'G',
      look: 'guard',
      name: Speaker.GateGuard,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.MedPipGuard,
          [Speaker.GateGuard, 'Halt! Is zat... a DRAGON?'],
          [Speaker.GateGuard, 'Ze Archbishop said nozing about dragons. Nobody pays me enough for dragons.'],
          [Speaker.Pip, '*friendly chirp*'],
          [Speaker.GateGuard, '...Keep it away from ze horses.'],
        );
        await (w.flag(Flag.Escaped)
          ? w.say([Speaker.GateGuard, "Some fool broke into Brozer Albert's tower. Nobody gets in. Move along!"])
          : w.say(
              [Speaker.GateGuard, 'Halt! Only castle folk past zis gate.'],
              [Speaker.Andrew, "I'm a... traveling scholar?"],
              [Speaker.GateGuard, 'Zen go and travel somewhere else.'],
            ));
      },
    });
    w.npc({
      marker: 'Y',
      look: 'thomas',
      name: Speaker.BrotherThomas,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.MedPipThomas,
          [Speaker.BrotherThomas, '...'],
          [Speaker.BrotherThomas, 'Master Albert teaches that dragons are only great serpents, and that we must trust what we observe over what we are told.'],
          [Speaker.BrotherThomas, 'I observe that you have a small dragon. He will want to see it.'],
        );
        await w.say(
          [Speaker.BrotherThomas, '...'],
          [Speaker.BrotherThomas, 'Forgive me. I was thinking. The other students call me "the dumb ox" because I speak so little.'],
          [Speaker.BrotherThomas, 'Master Albert says one day this ox will bellow so loud the whole world will hear it.'],
          [Speaker.Andrew, '(Thomas Aquinas. He has no idea how right Albert is.)'],
        );
      },
    });
    w.npc({ marker: '4', look: 'albertus', name: Speaker.BrotherAlbert, facing: 'down', talk: talkToAlbert });

    // --- Side quests ---
    w.pickup({
      marker: 'P',
      item: 'top',
      lines: [[Speaker.Andrew, "A wooden spinning top with a red band. This must be Jakob's. The miller's boys threw it all the way out here?"]],
    });
    w.pickup({
      marker: 'W',
      item: 'firewood',
      lines: [[Speaker.Andrew, "The woodcutter's pile. An armful of split beech for Agnes's oven. Bakers burned through mountains of wood."]],
    });

    // --- The Archbishop's forest ---
    w.watcher({
      kind: 'guard',
      look: 'forester',
      route: 'R0',
      wait: 1.6,
      range: 84,
      caught: [[Speaker.Forester, 'Wilderer! Das ist der Wald des Erzbischofs!'], 'The forester marches you back to the edge of the forest.'],
      barks: {
        suspicious: ['Wer da? Ein Wilderer?', 'Was raschelt da?', 'Da im Gebüsch...'],
        investigate: ['Ich hab dich gehört!', 'Komm raus, Wilderer!', 'Das war kein Reh.'],
        giveUp: ['Nur ein Reh.', 'Bah. Ein Fuchs.', 'Der Wind in den Buchen.'],
      },
    });
    w.watcher({
      kind: 'dog',
      route: 'U',
      facing: 'up',
      sweep: 1.0,
      range: 64,
      caught: [[Speaker.Hound, 'WOOF! WOOF!'], "The woodcutter's hound chases you all the way back to the stream."],
    });
    w.sleeper({
      marker: '9',
      look: 'boar',
      sound: 'growl',
      caught: ['The wild boar wakes with a furious squeal and charges!', 'You scramble back to the stream without looking back.'],
    });
    w.trigger({
      area: { x: 24, y: 44, w: 1, h: 2 },
      once: Flag.MedForestHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, "The Archbishop's forest. A lord's hunting reserve: the game here belongs to him alone."],
          [Speaker.Andrew, 'Anyone caught wandering in is taken for a poacher. I had better not let the forester see me.'],
        ),
    });
    w.trigger({
      area: { x: 8, y: 52, w: 5, h: 3 },
      once: Flag.MedKilnHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'A charcoal kiln: a stack of wood buried under earth and turf, smoldering slowly for days.'],
          [Speaker.Andrew, "So this is where Meister Ulrich's charcoal comes from. Whole forests ended up in kilns like this."],
        ),
    });
    w.trigger({
      area: { x: 40, y: 50, w: 1, h: 1 },
      once: Flag.MedBoarHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'Something is snoring in that thicket... A wild boar. They sleep in dense cover during the day.'],
          [Speaker.Andrew, 'Sneak past it, and stay off the dry branches. I do not want to meet those tusks.'],
        ),
    });
    w.trigger({
      area: { x: 34, y: 56, w: 7, h: 5 },
      once: Flag.MedMillHint,
      run: (w) =>
        w.say([Speaker.Andrew, "A water mill. By 1248 there were mills on almost every stream in the Rhineland, grinding the village's grain."]),
    });

    // --- Items ---
    w.pickup({ marker: '2', item: 'charcoal', lines: [[Speaker.Andrew, 'A sack of charcoal. Founders need it for their furnaces. Sorry, Brutus.']] });
    w.pickup({
      marker: '3',
      item: 'shield',
      lines: [[Speaker.Andrew, "A heater shield with the Archbishop's black cross. Solid oak and leather. It might come in handy."]],
      after: (w) => {
        if (w.flag(Flag.Alarm)) return w.say([Speaker.Andrew, 'Perfect. Now, about those crossbow bolts...']);
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
      caught: [[Speaker.Brutus, 'WUFF! WUFF! GRRRR...'], "Meister Ulrich's apprentice runs over and shoos you away from the shed."],
    });

    // --- Castle escape: crossbowmen in the gallery's arrow-slit alcoves ---
    w.decor('5', 'archer_s');
    w.decor('6', 'archer_s');
    w.decor('7', 'archer_n');
    w.decor('1', 'archer_n');
    w.hazard({ area: { x: 34, y: 4, w: 5, h: 3 }, kind: 'arrows', shooters: '5671', when: (w) => w.flag(Flag.Alarm) });
    w.trigger({
      area: GALLERY_DOOR,
      block: true,
      when: (w) => !w.flag(Flag.Alarm),
      run: (w) => w.say([Speaker.Andrew, "The archers' gallery. Crossbowmen are posted in there; they'd spot me in a heartbeat."]),
    });
    w.trigger({
      area: GALLERY_DOOR,
      block: true,
      when: (w) => w.flag(Flag.Alarm) && !w.has('shield'),
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'Crossbow bolts are flying all over the gallery! I need something to block them...'],
          [Speaker.Andrew, 'The armory! There was a shield on the rack.'],
        ),
    });
    w.trigger({
      area: 'N',
      block: true,
      when: (w) => w.flag(Flag.Alarm),
      run: (w) =>
        w.say(
          [Speaker.Andrew, "Guards are flooding the courtyard! I can't go back out that way."],
          [Speaker.Andrew, 'The gallery on the east side of the keep drops down outside the walls.'],
        ),
    });
    w.trigger({
      area: { x: 41, y: 4, w: 1, h: 3 },
      when: (w) => w.flag(Flag.Alarm),
      run: async (w) => {
        w.setFlag(Flag.Alarm, false);
        w.setFlag(Flag.Escaped);
        w.music(null);
        w.save();
        await w.say([Speaker.Andrew, "Made it out! And that drop means there's no getting back in this way."], [Speaker.Andrew, 'Now back to the machine, before anyone gets curious.']);
      },
    });

    // --- Hints ---
    w.trigger({
      area: { x: 38, y: 14, w: 1, h: 1 },
      once: Flag.MedCourtyardHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, "Guards everywhere, and one standing right at the keep's door."],
          w.has('pebbles')
            ? [Speaker.Andrew, "Time to test Jakob's theory. A pebble in the right spot should lure that door guard away."]
            : [Speaker.Andrew, "If I could make a noise somewhere else, maybe they'd go check it out."],
        ),
    });

    // Pike's cache: an Institute door in the chapel wall. Behind it, a little crypt with his notebook.
    if (w.flag(progress.got('notes'))) w.setFlag(Flag.MedCryptOpen);
    const cryptDoor = w.gate({ marker: '8', look: 'door', openFlag: Flag.MedCryptOpen });
    w.inspect('8', 'Sealed door', (w) => openCrypt(w, cryptDoor));
    w.pickup({
      marker: 'Q',
      item: 'notes',
      lines: [
        'On a crate stamped CHRONOS INSTITUTE: a notebook in a plastic sleeve, next to a cot and an empty ration tin.',
        [Speaker.Pike, '(written) Cache #3. If you are reading this, you found a power source. Good. You are smarter than the Institute.'],
        [Speaker.Pike, '(written) The machine can only lock on to home with a temporal core. I built one, the only one outside the Institute.'],
        [Speaker.Pike, '(written) I hid it where it would be safe from them: Madrid, 2240. Long after they are gone.'],
        [Speaker.Pike, '(written) Your machine will never reach that far as it is. Take the spare field emitter in the crate and install it.'],
        [Speaker.Pike, '(written) Bring something for scurvy. I am running out of fruit.'],
      ],
      after: async (w) => {
        w.give('emitter');
        w.sfx('pickup');
        w.toast(`Got: ${ITEMS.emitter.name}`);
        w.save();
        await w.say(
          'Inside the crate, wrapped in a thermal blanket: a hand-wound coil in an Institute housing.',
          [Speaker.Andrew, 'A long-range field emitter. Once it is in the machine, it should reach 2240.'],
        );
      },
    });

    for (const marker of ['S', 'X', 'Z', 'L']) w.checkpoint(marker);

    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      [Speaker.Andrew, 'Ugh... that landing was rougher than the last one.'],
      [Speaker.Andrew, 'Stone walls, a black cross on the banners... The Archbishop of Cologne. The Holy Roman Empire, 1248.'],
      [Speaker.Andrew, 'My translator earpiece is struggling with Middle High German. Everyone is going to sound like an old war movie.'],
      [Speaker.Andrew, "Let's see what the machine needs this time."],
    );
  } else {
    await w.say([Speaker.Andrew, 'Back in 1248. Mind the guards, Andrew.']);
  }
  if (!w.flag(progress.diagnosed('medieval'))) await diagnose(w);
}

async function talkToBaker(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.MedPipAgnes,
    [Speaker.Agnes, 'Ach! Mother of God, what is zat beast?!'],
    ...(w.flag(progress.got('bread'))
      ? ([
          [Speaker.Agnes, '...It is small, at least. Is it hungry? Here, a crust of rye.'],
          [Speaker.Pip, '*munches happily*'],
        ] as const)
      : ([[Speaker.Agnes, '...It looks hungry. I would feed it, if my oven were not cold.']] as const)),
    [Speaker.Agnes, 'A dragon whelp, surely. Just keep it away from my hens.'],
  );
  if (!w.has('bread') && !w.has('firewood')) {
    await w.say(
      [Speaker.Agnes, 'Ach, look at you! Strange clothes, and thin as a rake.'],
      [Speaker.Agnes, "I would give you bread, but my oven is cold. Not a stick of wood left, and ze woodcutter is sick in bed."],
      [Speaker.Agnes, "His woodpile is in his clearing, in ze Archbishop's forest across ze stream. West of ze bridge, past ze forester's ride."],
      [Speaker.Agnes, 'Mind ze forester, and his hound. Bring me an armful and you shall have ze first loaf.'],
    );
    return;
  }
  if (!w.has('bread')) {
    w.take('firewood');
    await w.say([Speaker.Agnes, 'Wood! Bless you. Give me a moment to fire up ze oven...']);
    await w.fadeOut(0.4);
    w.sfx('rumble');
    await w.wait(0.8);
    await w.fadeIn(0.4);
    await w.say([Speaker.Agnes, 'Here, fresh rye bread. I always bake more than zis village can eat.']);
    w.give('bread');
    w.sfx('pickup');
    w.toast(`Got: ${ITEMS.bread.name}`);
    w.save();
    await w.say('Rye Bread: press {throw} to throw it in front of you. Animals love it. Press {cycle} to switch between items.');
    return;
  }
  if (!w.flag(Flag.MedBakerLore)) {
    w.setFlag(Flag.MedBakerLore);
    await w.say(
      [Speaker.Agnes, "You know, you're ze second stranger in odd clothes I've seen."],
      [Speaker.Agnes, 'Years ago a man in a silver coat came through. He kept talking to a little box, and ze box talked back!'],
      [Speaker.Agnes, 'Folks called him a wizard. One morning he was gone.'],
      [Speaker.Andrew, '...A silver coat. Like an Institute field suit?'],
    );
    return;
  }
  await w.say([Speaker.Agnes, 'Take as much bread as you need, dear.']);
}

async function talkToFounder(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.MedPipUlrich,
    [Speaker.MeisterUlrich, 'Ha! Look at ze skull on zat creature. Round and thick, like a church bell.'],
    [Speaker.MeisterUlrich, 'If it held still long enough, I could cast a helmet in its shape. Ze Archbishop would pay a fortune.'],
    [Speaker.Pip, '*taps his dome on the anvil: CLANG*'],
  );
  if (w.flag(progress.got('gear'))) {
    await w.say([Speaker.MeisterUlrich, 'Fine work, zat gear, if I say so myself. Same bronze we use for church bells.']);
    return;
  }
  if (!w.has('charcoal')) {
    await w.say(
      [Speaker.MeisterUlrich, 'A bronze gear? Ja, I could cast one. I cast bells, a gear is nozing.'],
      [Speaker.MeisterUlrich, 'But my furnace needs charcoal, and lots of it. Bronze melts at a terrible heat.'],
      [Speaker.MeisterUlrich, 'Zere is a sack in my yard down ze road, but Brutus guards ze gate. Zat dog bites everyone but me.'],
      [Speaker.MeisterUlrich, "And I can't leave ze furnace. Bring me ze charcoal and I make your gear."],
    );
    if (!w.has('bread')) await w.say([Speaker.Andrew, 'Hmm. Maybe Brutus can be bribed...']);
    return;
  }
  w.take('charcoal');
  await w.say([Speaker.MeisterUlrich, 'Charcoal! You got past Brutus? Ha! Give me a moment.']);
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
  await w.say([Speaker.MeisterUlrich, "One bronze gear, cast and filed. Copper and tin, ze right mix. Mind ze edges, zey're still warm."]);
}

async function talkToKid(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.MedPipJakob,
    [Speaker.Jakob, 'A DRAGON! You have a baby dragon! Can I ride it? Can it breathe fire?'],
    [Speaker.Andrew, 'No fire. But he is very good at head-butting things.'],
    [Speaker.Jakob, 'Ze miller\'s boys will never touch my top again!'],
  );
  if (w.has('pebbles')) {
    await w.say([Speaker.Jakob, "Zere's a hole in ze castle's east wall, behind ze bushes! Don't tell anyone."]);
    return;
  }
  if (!w.has('top')) {
    if (!w.flag(Flag.MedMetJakob)) {
      w.setFlag(Flag.MedMetJakob);
      await w.say(
        [Speaker.Jakob, 'Whoa, your clothes are so weird! Are you a wizard?'],
        [Speaker.Andrew, "Uh... sort of. I'm a natural philosopher."],
        [Speaker.Jakob, 'Like Brozer Albert in ze tower? He keeps toads and stinky metals up zere.'],
        [Speaker.Andrew, 'I need to get inside the castle. Any ideas?'],
        [Speaker.Jakob, 'Maybe I know a secret. Maybe I know two!'],
        [Speaker.Jakob, "But ze miller's boys threw my spinning top into ze Archbishop's forest, by ze mill. I'm not allowed to go zere."],
        [Speaker.Jakob, 'Ze forester chases everyone out. And zere are boars!'],
        [Speaker.Jakob, 'Find my top and I tell you everysing.'],
      );
    } else {
      await w.say([Speaker.Jakob, 'Did you find my top? Cross ze stream south of ze square, and go east to ze mill. It has a red band!']);
    }
    return;
  }
  w.take('top');
  await w.say(
    [Speaker.Jakob, 'My top! You found it!'],
    [Speaker.Jakob, "Okay, secret number one: ze guards always go look when zey hear a noise. Zey're so dumb."],
    [Speaker.Jakob, 'Here, take my lucky pebbles. Throw one and watch zem run!'],
  );
  w.give('pebbles');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.pebbles.name}`);
  w.save();
  await w.say(
    'Pebbles: press {throw} to throw one in front of you. Guards walk over to check out the noise.',
    [Speaker.Jakob, "Oh, and zere's a hole in ze castle's east wall, behind ze bushes. I sneak in for apples."],
  );
}

/** Albertus Magnus: a scientist meeting a scientist. He trades quicksilver for a good answer. */
async function talkToAlbert(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.MedPipAlbert,
    [Speaker.BrotherAlbert, 'By all ze saints! A living beast, with a skull of horn like a ram, but walking on two legs like a bird!'],
    [Speaker.BrotherAlbert, 'I have written twenty-six books on animals, and none of zem has zis. I must start a twenty-seventh.'],
    [Speaker.Andrew, '(De animalibus: Albert\'s great book on animals really does run to twenty-six books.)'],
  );
  if (w.flag(progress.got('quicksilver'))) {
    await w.say([Speaker.BrotherAlbert, 'Go, go! Before ze guards find you here. And may your strange philosophy serve you well.']);
    return;
  }
  if (!w.flag(Flag.MedMetAlbert)) {
    w.setFlag(Flag.MedMetAlbert);
    await w.say(
      [Speaker.BrotherAlbert, 'Hm? A visitor who climbs in through ze windows instead of using ze door. How unusual.'],
      [Speaker.BrotherAlbert, 'I am Albert, of ze Order of Preachers. Some call me Albertus. I study stones, plants, animals... and metals.'],
      [Speaker.Andrew, '(Albertus Magnus. One of the greatest naturalists of the Middle Ages.)'],
      [Speaker.Andrew, 'Brother Albert, I need quicksilver. It is... for a machine.'],
      [Speaker.BrotherAlbert, 'A machine! Wonderful. Zen answer me one riddle, and ze quicksilver is yours.'],
    );
  }
  await w.say([Speaker.BrotherAlbert, 'Quicksilver is a metal, yet it flows like water. Why?']);
  const pick = await w.choose('Why is quicksilver liquid?', [
    'It is cursed by the alchemists.',
    'Its melting point is so low that it stays liquid even in the cold.',
    'It is silver dissolved in water.',
  ]);
  if (pick !== 1) {
    await w.say(
      [Speaker.BrotherAlbert, 'Hmm, no. I have tested zat, and it is not so. Every metal melts in ze fire, ja?'],
      [Speaker.BrotherAlbert, 'Zink about how hot a fire must be for each one. Come back when you have an answer.'],
    );
    return;
  }
  await w.say(
    [Speaker.Andrew, 'Mercury melts at about minus thirty-nine degrees. Lead needs over three hundred. Mercury is simply a metal whose melting point is very, very low.'],
    [Speaker.BrotherAlbert, 'Ha! Every metal has its own fire. Ja, ja! I have written somesing like zis.'],
    [Speaker.BrotherAlbert, 'Take it, my friend. But careful: its vapors are poison. Never heat it near your face.'],
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
  w.setFlag(Flag.Alarm);
  await w.say(
    [Speaker.Guard, 'EINDRINGLING! Ein Eindringling im Turm von Bruder Albert!'],
    [Speaker.BrotherAlbert, 'Ach, ze guards heard us talking. You cannot go back down through ze courtyard.'],
    [Speaker.BrotherAlbert, 'Take ze archers’ gallery behind my door to ze east. It drops down outside ze walls.'],
    [Speaker.BrotherAlbert, 'Ze crossbowmen will shoot at anysing zat moves, so keep your head covered!'],
  );
}

/** The sealed crypt is Pike's hidden cache. Its door only opens with power from the future. */
async function openCrypt(w: WorldApi, door: GateHandle): Promise<void> {
  w.setFlag(Flag.SawPanel);
  if (door.isOpen) {
    if (w.flag(progress.got('notes'))) await w.say("Pike's crypt. Empty now, except for dust and a faint hum.");
    return;
  }
  if (!w.has('powercell')) {
    await w.say(
      [Speaker.Andrew, 'Wait... is that a metal door? With a panel full of blinking lights?'],
      [Speaker.Andrew, 'This is 1248! Nobody here could build something like this.'],
      [Speaker.Andrew, "It's dead, though, and nothing I have can power it... not yet."],
    );
    if (w.has('recorder')) await w.say([Speaker.Andrew, 'Pike... was this you?']);
    return;
  }
  await w.say([Speaker.Andrew, "The Power Cell's connector fits the panel. Let's wake it up."]);
  w.sfx('hack');
  await w.wait(0.6);
  w.sfx('door');
  w.shake(1.5, 0.6);
  door.open();
  w.setFlag(Flag.MedCryptOpen);
  w.save();
  await w.say('The door slides up into the wall. Behind it, steps lead down into a tiny, dark room.', [Speaker.Andrew, 'A hideout under the chapel. Pike, you clever devil.']);
}

/** The machine's self-test: runs on arrival, so the HUD can list the parts right away. */
async function diagnose(w: WorldApi): Promise<void> {
  w.setFlag(progress.diagnosed('medieval'));
  w.sfx('error');
  await w.say(
    'DIAGNOSTIC REPORT  ·  Year: 1248 AD  ·  Stability: 31%  ·  Damaged: drive gear, core coolant.',
    [Speaker.Andrew, 'A gear and a coolant. A bell-founder could cast a bronze gear...'],
    [Speaker.Andrew, 'And for coolant: quicksilver. Mercury is a liquid metal that carries heat well, and medieval alchemists collected it.'],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag(progress.fixed('medieval'))) {
    await timeMachineMenu(w);
    return;
  }

  if (!w.flag(progress.diagnosed('medieval'))) await diagnose(w);

  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say([Speaker.Andrew, `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }

  await w.say([Speaker.Andrew, 'Gear in, coolant in... Moment of truth.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag(progress.fixed('medieval'));
  for (const part of PARTS) w.take(part);
  w.save();
  await w.say(
    'STABILITY 54%  ·  PASSENGER CAPACITY: 2  ·  NO NEW WINDOW IN RANGE',
    [Speaker.Andrew, 'Room for a passenger... Pip! I promised I would go back for him.'],
    [Speaker.Andrew, 'No new window, though. Only places I have already been. And that rocky pass in Hell Creek... with this shield, I could finally climb it.'],
  );
  await timeMachineMenu(w);
}
