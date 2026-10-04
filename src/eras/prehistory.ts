import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { PREHISTORY_TILES } from '../game/tiledefs.ts';
import { ERA_INFO } from './info.ts';
import { PREHISTORY_MAP, PREHISTORY_MARKER_BASE } from './prehistory-map.ts';
import { timeMachineMenu } from './shared.ts';
import type { CompanionHandle, EraDef, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, progress } from '../game/flags.ts';

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
    if (!w.flag(progress.diagnosed('prehistory'))) return 'Check the damaged time machine.';
    if (!w.flag(progress.fixed('prehistory'))) {
      const missing = PARTS.filter((p) => !w.has(p)).map((p) => ITEMS[p].name);
      if (missing.length === 0) return 'Bring the parts back to the time machine.';
      if (!w.flag(Flag.PipFriend) && !w.has('meteorite')) {
        return `Find: ${missing.join(', ')}. Something was whimpering in the valley past the east corridor.`;
      }
      return `Find: ${missing.join(', ')}.`;
    }
    if (w.flag(progress.fixed('medieval')) && !w.flag(progress.got('recorder'))) return 'Climb the rocky pass north of the forest, with the shield over your head. Something metallic glints at the top.';
    if (w.has('navmodule')) return "Install Pike's nav module in the time machine, and take Pip along.";
    return 'Use the time machine to travel.';
  },

  setup(w) {
    const pip = w.companion({
      marker: 'P',
      name: Speaker.Pip,
      following: w.flag(Flag.PipFriend),
      talk: (w) => healPip(w, pip),
    });

    w.machine('M', (w) => useMachine(w, pip));

    // --- Machine parts and other items ---
    w.pickup({
      marker: '1',
      item: 'amber',
      lines: [
        [Speaker.Andrew, "Hardened tree resin. In a few million years it'll become amber. Today it's simply a great electrical insulator."],
      ],
    });
    w.pickup({
      marker: '2',
      item: 'obsidian',
      lines: [[Speaker.Andrew, 'Obsidian: volcanic glass. With some patience I can grind it into a rough lens.'], [Speaker.Andrew, 'Now let me tiptoe out of here...']],
    });
    w.pickup({
      marker: '3',
      item: 'meteorite',
      lines: [
        [Speaker.Andrew, "Meteoric iron! Mostly iron and nickel, the alloy that falls from space. That's my conductor."],
        [Speaker.Andrew, "Funny. In about half a million years, a much bigger rock lands in what'll be Mexico. Chicxulub. End of the dinosaurs."],
        [Speaker.Andrew, 'Thanks, Pip. I could never have moved that boulder alone.'],
      ],
    });
    w.pickup({
      marker: '4',
      item: 'fern',
      lines: [
        [Speaker.Andrew, 'These ferns have a sharp, resinous smell. Several living ferns produce antimicrobial compounds.'],
        [Speaker.Andrew, "It's not a hospital, but it beats an open wound in a swamp."],
      ],
    });
    w.pickup({
      marker: '5',
      item: 'recorder',
      lines: [
        [Speaker.Andrew, "A field recorder? Up here? That's Institute equipment!"],
        'You press play. A tired voice crackles through the static.',
        [Speaker.Pike, 'Dr. Aaron Pike, Test Run #12, October 2019. Day... I stopped counting.'],
        [Speaker.Pike, 'The Institute told the board this run was unmanned. It was not. They knew the core was unstable.'],
        [Speaker.Pike, "If someone from the Institute finds this: I'm not dead. I'm jumping forward, one window at a time."],
        [Speaker.Pike, "And if you're stranded like me... don't trust the return coordinates."],
        [Speaker.Andrew, 'Test Run #12... they told us that was an unmanned probe.'],
        [Speaker.Andrew, "What else hasn't the Institute told us?"],
      ],
      after: async (w) => {
        if (w.flag(Flag.SawPanel)) await w.say([Speaker.Andrew, 'That glowing panel in the crypt back in 1248... was that you, Pike?']);
        w.give('navmodule');
        w.sfx('pickup');
        w.toast(`Got: ${ITEMS.navmodule.name}`);
        w.save();
        await w.say(
          'Wedged under the recorder: an Institute navigation module, scratched but intact.',
          [Speaker.Andrew, 'Pike\'s nav module. It logs the coordinates of every window he jumped through.'],
          [Speaker.Andrew, 'If I plug it into my machine, I can follow his trail.'],
        );
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

    if (!w.flag(Flag.BoulderBroken)) {
      const boulder = w.obstacle({
        marker: 'K',
        look: 'boulder',
        label: 'Boulder',
        interact: async (w) => {
          if (!pip.following) {
            await w.say(
              [Speaker.Andrew, 'A huge boulder blocks the way into the crater.'],
              [Speaker.Andrew, "Something metallic glints behind it. I'd never move this thing on my own, though."],
            );
            return;
          }
          await w.say(
            [Speaker.Andrew, "Pip, paleontologists still argue about whether pachycephalosaurs head-butted things. Want to settle it?"],
            [Speaker.Pip, '*determined snort*'],
          );
          await pip.moveBy(0, 18, 60);
          await w.wait(0.3);
          await pip.moveTo('K', 140);
          w.sfx('boom');
          w.shake(3, 0.6);
          boulder.remove();
          w.setFlag(Flag.BoulderBroken);
          w.save();
          await pip.moveBy(0, 12, 60);
          pip.emote('heart', 1.5);
          await w.say([Speaker.Andrew, "Well. That's one data point for the head-butting theory."]);
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
          [Speaker.Andrew, 'Rocks keep tumbling down this slope. One of those would flatten me.'],
          [Speaker.Andrew, 'I need something to protect my head before I try climbing up there.'],
        ),
    });
    w.trigger({
      area: 'J',
      once: Flag.PrePassShield,
      when: (w) => w.has('shield'),
      run: (w) => w.say([Speaker.Andrew, 'Shield up. Let the mountain do its worst.']),
    });
    w.trigger({
      area: 'U',
      once: Flag.PreMeadowHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'Is that... a Dakotaraptor? Five meters of feathers and claws. Okay. Stay calm.'],
          [Speaker.Andrew, "No grass anywhere: grasslands won't exist for millions of years. But those fern thickets should hide me."],
          'Ferns and bushes hide you. Stay out of the vision cones, and hold {sneak} to sneak quietly.',
        ),
    });
    w.trigger({
      area: 'Q',
      once: Flag.PreCaveHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, "It's pitch black in there... and something huge is breathing."],
          [Speaker.Andrew, 'Studies suggest T. rex heard low-pitched sounds very well. Cracking bones would carry far.'],
          'Walking makes noise. Hold {sneak} to sneak in silence, but bones crack no matter what.',
        ),
    });
    w.trigger({
      area: 'N',
      once: Flag.PreForestHint,
      run: (w) => w.say([Speaker.Andrew, 'More raptors in the forest. Dromaeosaurs probably hunted with keen eyes and ears. Patience, Andrew.']),
    });
    w.trigger({
      area: 'L',
      once: Flag.PreValleyHint,
      when: (w) => !w.flag(Flag.PipFriend),
      run: (w) => w.say([Speaker.Andrew, 'A quiet valley, away from the raptors. And... something is whimpering up by the crater.']),
    });
    w.trigger({
      area: 'T',
      once: Flag.PreGorgeHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'A narrow gorge, and a raptor pacing right across it. The only way west.'],
          [Speaker.Andrew, "I'll wait until it turns its back, then slip past."],
        ),
    });

    for (const marker of ['S', 'W', 'Y', 'X', 'O', 'Z', 'V']) w.checkpoint(marker);

    return (w, firstVisit) => arrive(w, firstVisit, pip);
  },
};

async function arrive(w: WorldApi, firstVisit: boolean, pip: CompanionHandle): Promise<void> {
  if (firstVisit) {
    await w.wait(0.6);
    await w.say([Speaker.Andrew, "First things first: let's see how bad the damage is."]);
    await diagnose(w);
    await w.say('Move with {move}. Press {interact} to interact.');
    return;
  }
  if (!w.flag(progress.diagnosed('prehistory'))) await diagnose(w);
  await w.wait(0.4);
  if (pip.following) {
    pip.emote('heart', 2);
    w.sfx('chirp');
    await w.say([Speaker.Pip, '*excited chirp*'], [Speaker.Andrew, 'Pip! Did you miss me, buddy?']);
  }
  if (w.flag(progress.fixed('medieval')) && !w.flag(progress.got('recorder'))) {
    await w.say(
      [Speaker.Andrew, 'The machine can carry two now. You are coming with me this time, Pip.'],
      [Speaker.Andrew, 'But first, that rocky slope north of the forest. With the shield over my head, I can finally climb it.'],
    );
  }
}

async function healPip(w: WorldApi, pip: CompanionHandle): Promise<void> {
  if (!w.has('fern')) {
    if (!w.flag(Flag.PipMet)) {
      w.setFlag(Flag.PipMet);
      await w.say(
        [Speaker.Andrew, 'A young Pachycephalosaurus! See the bony dome on its head? It keeps thickening as they grow up.'],
        [Speaker.Andrew, 'Some paleontologists think "Dracorex" and "Stygimoloch" were just juveniles like this one.'],
        [Speaker.Pip, '*weak whimper*'],
        [Speaker.Andrew, "Its leg is cut pretty badly. Easy, little one. I'm not going to hurt you."],
        [Speaker.Andrew, 'That wound needs cleaning. Maybe a medicinal plant...'],
        [Speaker.Andrew, 'I saw some sharp-smelling ferns in the meadow south of the machine.'],
      );
    } else {
      await w.say([Speaker.Pip, '*whimper*'], [Speaker.Andrew, "Hang in there. I'll find that fern."]);
    }
    return;
  }

  w.take('fern');
  await w.say([Speaker.Andrew, 'Here, this fern should keep the wound clean. Hold still...']);
  w.sfx('heal');
  await w.wait(0.8);
  pip.follow();
  pip.emote('heart', 2);
  w.setFlag(Flag.PipFriend);
  w.save();
  w.toast('Pip joined you!');
  await w.say(
    [Speaker.Pip, '*happy chirp*'],
    [Speaker.Andrew, 'There you go! You need a name... How about Pip?'],
    'Pip seems determined to follow you everywhere.',
  );
}

/** The machine's self-test: runs on arrival, so the HUD can list the parts right away. */
async function diagnose(w: WorldApi): Promise<void> {
  w.setFlag(progress.diagnosed('prehistory'));
  w.sfx('error');
  await w.say(
    'DIAGNOSTIC REPORT  ·  Year: unknown  ·  Stability: 12%  ·  Damaged: power conductor, focusing lens, core insulation.',
    [Speaker.Andrew, 'A conductor, a lens and an insulator. In a world without a hardware store.'],
    [Speaker.Andrew, 'Think, Andrew. Hardened tree resin is a decent natural insulator...'],
    [Speaker.Andrew, 'Obsidian is volcanic glass. I could grind it into a rough lens...'],
    [Speaker.Andrew, 'And a conductor means metal. Pure iron, out here? Only if it fell from the sky. A meteorite.'],
  );
}

async function useMachine(w: WorldApi, pip: CompanionHandle): Promise<void> {
  if (w.flag(progress.fixed('prehistory'))) {
    await timeMachineMenu(w, {
      beforeJump: async () => {
        // Since the Cologne repair the machine can carry two, and Pip won't be left behind again.
        if (!w.flag(progress.fixed('medieval')) || w.flag(Flag.PipAboard)) return;
        if (!pip.following) pip.follow();
        w.setFlag(Flag.PipAboard);
        await w.say([Speaker.Andrew, "Come on, Pip. I'll bring you back home at the end. Promise."], [Speaker.Pip, '*excited chirp*']);
      },
    });
    return;
  }

  if (!w.flag(progress.diagnosed('prehistory'))) await diagnose(w);

  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say([Speaker.Andrew, `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }

  await w.say([Speaker.Andrew, "That's everything. Let's put this thing back together."]);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag(progress.fixed('prehistory'));
  for (const part of PARTS) w.take(part);
  w.save();
  await w.say(
    'STABILITY 31%  ·  Return to origin: FAILED  ·  Nearest stable window: ▓▓▓▓ AD.',
    [Speaker.Andrew, "The year display is still broken. Wherever that is, it's a lot closer to home than this."],
  );
  if (pip.following) {
    await w.say(
      [Speaker.Pip, '*worried chirp*'],
      [Speaker.Andrew, "I have to go, buddy. The machine can't carry both of us. Not yet."],
      [Speaker.Andrew, "I'll come back. I promise."],
    );
    pip.emote('heart', 2);
  }
  await w.say([Speaker.Andrew, 'Here goes nothing...']);
  w.machineGlitch(true);
  w.sfx('warp');
  w.shake(2, 1.4);
  await w.wait(1.2);
  w.flash('#ffffff', 0.6);
  await w.travel('medieval');
}
