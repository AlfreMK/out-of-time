import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { PREHISTORY_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { PREHISTORY_MAP, PREHISTORY_MARKER_BASE } from './prehistory-map.ts';
import { timeMachineMenu } from './shared.ts';
import type { CompanionHandle, EraDef, Line, WorldApi } from './types.ts';

const PARTS: ItemId[] = ['amber', 'obsidian', 'meteorite'];

const RAPTOR_CAUGHT: Line[] = ['The Dakotaraptor spots you and lunges!', 'You scramble away and hide until it loses interest.'];

/*
 * World 1: the Late Cretaceous, about 66.5 million years ago, in the Hell Creek
 * area of Laramidia (today's Montana). Teaches observing and hiding: vision
 * cones, fern undergrowth, sneaking past a sleeping T. rex, and befriending
 * Pip, a juvenile Pachycephalosaurus. The mountain pass stays blocked until
 * the player returns with a shield.
 */
export const PREHISTORY: EraDef = {
  id: 'prehistory',
  ...ERA_INFO.prehistory,
  music: 'jungle',
  darkMusic: 'cave',
  musicZones: [
    { area: { x: 16, y: 14, w: 33, h: 14 }, theme: 'forest' },
    { area: { x: 16, y: 29, w: 12, h: 5 }, theme: 'forest' },
    { area: { x: 41, y: 30, w: 9, h: 6 }, theme: 'forest' },
    { area: { x: 20, y: 0, w: 24, h: 14 }, theme: 'mountain' },
  ],
  map: PREHISTORY_MAP,
  markerBase: PREHISTORY_MARKER_BASE,
  tiles: PREHISTORY_TILES,
  defaultTile: '#',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (!w.flag('diag:prehistory')) return 'Check the damaged time machine.';
    if (!w.flag('fixed:prehistory')) {
      const missing = PARTS.filter((p) => !w.has(p)).map((p) => ITEMS[p].name);
      if (missing.length === 0) return 'Bring the parts back to the time machine.';
      if (!w.flag('pipFriend') && !w.has('meteorite')) {
        return `Find: ${missing.join(', ')}. Something was whimpering in the valley past the east corridor.`;
      }
      return `Find: ${missing.join(', ')}.`;
    }
    if (w.has('shield') && !w.flag('got:recorder')) return 'Use the shield to climb the rocky pass north of the forest.';
    if (w.flag('fixed:future') && !w.flag('fixed:ruins') && w.flag('got:notes')) return 'Bring Pip along to 2240: his head could move that fallen column.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    const pip = w.companion({
      marker: 'P',
      name: 'Pip',
      following: w.flag('pipFriend'),
      talk: (w) => healPip(w, pip),
    });

    w.machine('M', (w) => useMachine(w, pip));

    // --- Machine parts and other items ---
    w.pickup({
      marker: '1',
      item: 'amber',
      lines: [
        ['Elias', "Hardened tree resin. In a few million years it'll become amber. Today it's simply a great electrical insulator."],
      ],
    });
    w.pickup({
      marker: '2',
      item: 'obsidian',
      lines: [['Elias', 'Obsidian: volcanic glass. With some patience I can grind it into a rough lens.'], ['Elias', 'Now let me tiptoe out of here...']],
    });
    w.pickup({
      marker: '3',
      item: 'meteorite',
      lines: [
        ['Elias', "Meteoric iron! Mostly iron and nickel, the alloy that falls from space. That's my conductor."],
        ['Elias', "Funny. In about half a million years, a much bigger rock lands in what'll be Mexico. Chicxulub. End of the dinosaurs."],
        ['Elias', 'Thanks, Pip. I could never have moved that boulder alone.'],
      ],
    });
    w.pickup({
      marker: '4',
      item: 'fern',
      lines: [
        ['Elias', 'These ferns have a sharp, resinous smell. Several living ferns produce antimicrobial compounds.'],
        ['Elias', "It's not a hospital, but it beats an open wound in a swamp."],
      ],
    });
    w.pickup({
      marker: '5',
      item: 'recorder',
      lines: [
        ['Elias', "A field recorder? Up here? That's Institute equipment!"],
        'You press play. A tired voice crackles through the static.',
        ['Pike', 'Dr. Aaron Pike, Test Run #12, October 2019. Day... I stopped counting.'],
        ['Pike', 'The Institute told the board this run was unmanned. It was not. They knew the core was unstable.'],
        ['Pike', "If someone from the Institute finds this: I'm not dead. I'm jumping forward, one window at a time."],
        ['Pike', "And if you're stranded like me... don't trust the return coordinates."],
        ['Elias', 'Test Run #12... they told us that was an unmanned probe.'],
        ['Elias', "What else hasn't the Institute told us?"],
      ],
      after: (w) => {
        if (w.flag('sawPanel')) return w.say(['Elias', 'That glowing panel in the crypt back in 1248... was that you, Pike?']);
      },
    });

    // --- Dangers ---
    // Meadow
    w.watcher({ kind: 'raptor', route: '67', wait: 1.6, caught: RAPTOR_CAUGHT });
    w.watcher({ kind: 'raptor', route: '89', wait: 1.2, caught: RAPTOR_CAUGHT });
    // Deep forest
    w.watcher({ kind: 'raptor', route: 'AB', wait: 1.0, caught: RAPTOR_CAUGHT });
    w.watcher({ kind: 'raptor', route: 'CD', wait: 1.4, caught: RAPTOR_CAUGHT });
    // The passages to the cave and the valley
    w.watcher({ kind: 'raptor', route: 'EF', wait: 1.4, caught: RAPTOR_CAUGHT });
    w.watcher({ kind: 'raptor', route: 'GI', wait: 1.4, caught: RAPTOR_CAUGHT });
    w.sleeper({
      marker: 'R',
      caught: ['The T. rex wakes up with a deafening ROAR!', 'You sprint out of the cave without looking back.'],
    });
    w.hazard({ area: 'H', kind: 'rocks' });

    if (!w.flag('boulderBroken')) {
      const boulder = w.obstacle({
        marker: 'K',
        look: 'boulder',
        label: 'Boulder',
        interact: async (w) => {
          if (!pip.following) {
            await w.say(
              ['Elias', 'A huge boulder blocks the way into the crater.'],
              ['Elias', "Something metallic glints behind it. I'd never move this thing on my own, though."],
            );
            return;
          }
          await w.say(
            ['Elias', "Pip, paleontologists still argue about whether pachycephalosaurs head-butted things. Want to settle it?"],
            ['Pip', '*determined snort*'],
          );
          await pip.moveBy(0, 18, 60);
          await w.wait(0.3);
          await pip.moveTo('K', 140);
          w.sfx('boom');
          w.shake(3, 0.6);
          boulder.remove();
          w.setFlag('boulderBroken');
          w.save();
          await pip.moveBy(0, 12, 60);
          pip.emote('heart', 1.5);
          await w.say(['Elias', "Well. That's one data point for the head-butting theory."]);
        },
      });
    }

    // --- Area events ---
    w.trigger({
      area: 'J',
      block: true,
      when: (w) => !w.has('shield'),
      run: (w) =>
        w.say(
          ['Elias', 'Rocks keep tumbling down this slope. One of those would flatten me.'],
          ['Elias', 'I need something to protect my head before I try climbing up there.'],
        ),
    });
    w.trigger({
      area: 'J',
      once: 'pre:passShield',
      when: (w) => w.has('shield'),
      run: (w) => w.say(['Elias', 'Shield up. Let the mountain do its worst.']),
    });
    w.trigger({
      area: 'U',
      once: 'pre:meadowHint',
      run: (w) =>
        w.say(
          ['Elias', 'Is that... a Dakotaraptor? Five meters of feathers and claws. Okay. Stay calm.'],
          ['Elias', "No grass anywhere: grasslands won't exist for millions of years. But those fern thickets should hide me."],
          'Ferns and bushes hide you. Stay out of the vision cones, and hold {sneak} to sneak quietly.',
        ),
    });
    w.trigger({
      area: 'Q',
      once: 'pre:caveHint',
      run: (w) =>
        w.say(
          ['Elias', "It's pitch black in there... and something huge is breathing."],
          ['Elias', 'Studies suggest T. rex heard low-pitched sounds very well. Cracking bones would carry far.'],
          'Walking makes noise. Hold {sneak} to sneak in silence, but bones crack no matter what.',
        ),
    });
    w.trigger({
      area: 'N',
      once: 'pre:forestHint',
      run: (w) => w.say(['Elias', 'More raptors in the forest. Dromaeosaurs probably hunted with keen eyes and ears. Patience, Elias.']),
    });
    w.trigger({
      area: 'L',
      once: 'pre:valleyHint',
      when: (w) => !w.flag('pipFriend'),
      run: (w) => w.say(['Elias', 'A quiet valley, away from the raptors. And... something is whimpering up by the crater.']),
    });
    w.trigger({
      area: 'T',
      once: 'pre:gorgeHint',
      run: (w) =>
        w.say(
          ['Elias', 'A narrow gorge, and a raptor pacing right across it. The only way west.'],
          ['Elias', "I'll wait until it turns its back, then slip past."],
        ),
    });

    for (const marker of ['S', 'W', 'Y', 'X', 'O', 'Z', 'V']) w.checkpoint(marker);

    return (w, firstVisit) => arrive(w, firstVisit, pip);
  },
};

async function arrive(w: WorldApi, firstVisit: boolean, pip: CompanionHandle): Promise<void> {
  if (firstVisit) {
    await w.wait(0.6);
    await w.say(
      ['Elias', "First things first: let's see how bad the damage is."],
      'Move with WASD, the arrow keys or the left stick. Press {interact} to interact.',
    );
    w.toast('Check the time machine');
    return;
  }
  await w.wait(0.4);
  if (pip.following) {
    pip.emote('heart', 2);
    w.sfx('chirp');
    await w.say(['Pip', '*excited chirp*'], ['Elias', 'Pip! Did you miss me, buddy?']);
  }
  if (w.has('shield') && !w.flag('got:recorder')) {
    await w.say(['Elias', 'With this shield, I might finally make it up that rocky slope north of the forest.']);
  }
}

async function healPip(w: WorldApi, pip: CompanionHandle): Promise<void> {
  if (!w.has('fern')) {
    if (!w.flag('pipMet')) {
      w.setFlag('pipMet');
      await w.say(
        ['Elias', 'A young Pachycephalosaurus! See the bony dome on its head? It keeps thickening as they grow up.'],
        ['Elias', 'Some paleontologists think "Dracorex" and "Stygimoloch" were just juveniles like this one.'],
        ['Pip', '*weak whimper*'],
        ['Elias', "Its leg is cut pretty badly. Easy, little one. I'm not going to hurt you."],
        ['Elias', 'That wound needs cleaning. Maybe a medicinal plant...'],
        ['Elias', 'I saw some sharp-smelling ferns in the meadow south of the machine.'],
      );
    } else {
      await w.say(['Pip', '*whimper*'], ['Elias', "Hang in there. I'll find that fern."]);
    }
    return;
  }

  w.take('fern');
  await w.say(['Elias', 'Here, this fern should keep the wound clean. Hold still...']);
  w.sfx('heal');
  await w.wait(0.8);
  pip.follow();
  pip.emote('heart', 2);
  w.setFlag('pipFriend');
  w.save();
  w.toast('Pip joined you!');
  await w.say(
    ['Pip', '*happy chirp*'],
    ['Elias', 'There you go! You need a name... How about Pip?'],
    'Pip seems determined to follow you everywhere.',
  );
}

async function useMachine(w: WorldApi, pip: CompanionHandle): Promise<void> {
  if (w.flag('fixed:prehistory')) {
    await timeMachineMenu(w, {
      beforeJump: async (to) => {
        // Only at the very end can the machine safely carry two.
        if (to !== 'ruins' || !pip.following || !w.flag('fixed:future')) return;
        const pick = await w.choose('Take Pip along?', ['Yes, come on Pip!', 'No, stay here']);
        w.setFlag('pipAboard', pick === 0);
        if (pick === 0) await w.say(['Elias', "Just this once, buddy. I'll bring you right back home. Promise."], ['Pip', '*excited chirp*']);
      },
    });
    return;
  }

  if (!w.flag('diag:prehistory')) {
    w.setFlag('diag:prehistory');
    w.sfx('error');
    await w.say(
      'DIAGNOSTIC REPORT  ·  Year: unknown  ·  Stability: 12%  ·  Damaged: power conductor, focusing lens, core insulation.',
      ['Elias', 'A conductor, a lens and an insulator. In a world without a hardware store.'],
      ['Elias', 'Think, Elias. Hardened tree resin is a decent natural insulator...'],
      ['Elias', 'Obsidian is volcanic glass. I could grind it into a rough lens...'],
      ['Elias', 'And a conductor means metal. Pure iron, out here? Only if it fell from the sky. A meteorite.'],
    );
  }

  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say(['Elias', `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }

  await w.say(['Elias', "That's everything. Let's put this thing back together."]);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag('fixed:prehistory');
  w.save();
  await w.say(
    'STABILITY 31%  ·  Return to origin: FAILED  ·  Nearest stable window: ▓▓▓▓ AD.',
    ['Elias', "The year display is still broken. Wherever that is, it's a lot closer to home than this."],
  );
  if (pip.following) {
    await w.say(
      ['Pip', '*worried chirp*'],
      ['Elias', "I have to go, buddy. The machine can't carry both of us. Not yet."],
      ['Elias', "I'll come back. I promise."],
    );
    pip.emote('heart', 2);
  }
  await w.say(['Elias', 'Here goes nothing...']);
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(2, 1.4);
  await w.wait(1.2);
  w.flash('#ffffff', 0.6);
  await w.travel('medieval');
}
