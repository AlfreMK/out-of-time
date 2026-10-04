import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { ARAUCANIA_TILES } from '../game/tiledefs.ts';
import { ARAUCANIA_MAP, ARAUCANIA_MARKER_BASE } from './araucania-map.ts';
import { ERA_INFO } from './info.ts';
import { pipAlong, pipReaction, timeMachineMenu } from './shared.ts';
import type { ActorHandle, EraDef, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, progress } from '../game/flags.ts';

const PARTS: ItemId[] = ['gold', 'lodestone'];

const SOLDIER_CAUGHT: Line[] = [[Speaker.Soldier, '¡Alto ahí! ¿Quién eres tú?'], 'Spanish soldiers drag you out of the fort and leave you in the quila.'];
const RIDER_CAUGHT: Line[] = [[Speaker.Rider, '¡Un espía! ¡Un espía!'], 'The horseman chases you back into the forest.'];

/*
 * World 3: Araucanía, near Fort Tucapel, December 1553. Pedro de Valdivia had
 * built a line of forts in Mapuche territory; within weeks, the Mapuche led by
 * the young Lautaro (Leftraru) would defeat him at the Battle of Tucapel.
 * Lautaro had lived among the Spanish as Valdivia's groom and knew their habits.
 * Teaches cooperation: the pifilka whistle calls hidden scouts to create
 * diversions. Andrew's earpiece translates Mapudungun and 16th-century Spanish.
 */
export const ARAUCANIA: EraDef = {
  id: 'araucania',
  ...ERA_INFO.araucania,
  music: 'araucania',
  musicZones: [{ area: { x: 31, y: 8, w: 16, h: 27 }, theme: 'fort' }],
  map: ARAUCANIA_MAP,
  markerBase: ARAUCANIA_MARKER_BASE,
  tiles: ARAUCANIA_TILES,
  defaultTile: 't',
  arrival: 'S',
  parts: PARTS,

  objective(w) {
    if (!w.flag(progress.diagnosed('araucania'))) return 'Check the time machine.';
    if (!w.flag(progress.fixed('araucania'))) {
      if (!w.flag(Flag.AraMet)) return 'Find the Mapuche camp in the forest to the north.';
      const missing = PARTS.filter((p) => !w.has(p)).map((p) => ITEMS[p].name);
      if (missing.length === 0) return 'Bring the parts back to the time machine.';
      if (!w.has('pifilka')) {
        return w.has('pali')
          ? 'Bring the pali back to Ayelén: she will give you her pifilka.'
          : "Lautaro's scouts answer a pifilka. Ayelén has one, but first she wants her pali back: it landed in the quila south of the fort.";
      }
      const tips: string[] = [];
      if (!w.has('gold')) tips.push("The gold is locked in an iron strongbox in the captain's house: Pip's skull could crack it.");
      if (!w.has('lodestone')) tips.push('A war dog guards the storehouse: toss it some of the rye bread from Cologne.');
      return `Get ${missing.join(' and ')} from Fort Tucapel. Blow the pifilka near the scouts to distract the soldiers. ${tips.join(' ')}`.trim();
    }
    if (!w.flag(progress.got('canelo'))) {
      if (w.has('maqui')) return 'Bring the maqui to the machi.';
      return w.flag(Flag.AraTrunk) ? 'Help the machi: she needs maqui from the bushes by the estero, to the north.' : 'Help the machi: she needs maqui from the bushes by the estero, to the north. A fallen trunk blocks the way: maybe Pip can help.';
    }
    return 'Use the time machine to travel.';
  },

  setup(w) {
    w.machine('M', useMachine);
    const pip = pipAlong(w, 'S');

    // A storm brought down a coihue across the only way into the maqui glade.
    if (!w.flag(Flag.AraTrunk)) {
      const trunk = w.obstacle({
        marker: 'Z',
        look: 'log',
        interact: async (w) => {
          if (!pip) {
            await w.say([Speaker.Andrew, 'A coihue trunk, brought down by a storm. Far too heavy for me to move.']);
            return;
          }
          await w.say(
            [Speaker.Andrew, 'The maqui bushes are right behind this trunk. Pip, what do you say?'],
            [Speaker.Pip, '*determined snort*'],
            [Speaker.Andrew, '(Mapuche kids are going to tell stories about this for generations.)'],
          );
          await pip.moveBy(0, 18, 60);
          await w.wait(0.3);
          await pip.moveTo('Z', 140);
          w.sfx('boom');
          w.shake(3, 0.6);
          trunk.remove();
          w.setFlag(Flag.AraTrunk);
          w.save();
          await pip.moveBy(0, 12, 60);
          pip.emote('heart', 1.5);
          await w.say([Speaker.Andrew, 'Rolled it right off the path. Good boy.']);
        },
      });
    }
    w.decor('9', 'burgundy');
    w.decor('5', 'rack');
    w.decor('6', 'pudu');
    w.decor('7', 'horse');

    // --- The Mapuche camp ---
    const lautaro = w.npc({ marker: 'L', look: 'lautaro', name: Speaker.Lautaro, talk: talkToLautaro });
    w.npc({ marker: 'C', look: 'machi', name: Speaker.Machi, talk: talkToMachi });
    w.npc({
      marker: 'G',
      look: 'lamngen',
      name: Speaker.Rayen,
      talk: talkToRayen,
    });
    w.npc({ marker: 'Y', look: 'pichi', name: Speaker.Ayelen, talk: talkToAyelen });
    w.npc({
      marker: 'V',
      look: 'pichi',
      name: Speaker.Kid,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.AraPipKid,
          [Speaker.Kid, 'Peñi! Your animal has a head like a river stone! Can I touch it?'],
          [Speaker.Pip, '*leans in for a scratch*'],
        );
        await w.say([Speaker.Kid, 'This is palín! You hit the pali with your wüño, the curved stick. Our grandparents played it too.']);
      },
    });
    const sentry = w.npc({
      marker: 'W',
      look: 'weichafe',
      name: Speaker.Weichafe,
      facing: 'down',
      talk: (w) => {
        // Talking to him from outside the camp counts as walking in: he stops the stranger first.
        if (!w.flag(Flag.AraMet)) {
          w.setFlag(Flag.AraMet);
          return meetLautaro(w, lautaro, sentry);
        }
        return w.say([Speaker.Weichafe, 'Lautaro says you are a friend. Then you are welcome in our ruka, peñi.']);
      },
    });
    if (w.flag(Flag.AraMet)) void sentry.moveBy(-16, 0, 9999);

    // --- Hidden scouts who answer the pifilka ---
    w.ally({
      marker: 'A',
      look: 'weichafe',
      name: Speaker.Scout,
      talk: (w) => w.say([Speaker.Scout, '(whispering) Blow the pifilka and we will sound the trutruka. The soldiers at the gate will come running.']),
    });
    w.ally({
      marker: 'B',
      look: 'weichafe',
      name: Speaker.Scout,
      talk: (w) => w.say([Speaker.Scout, '(whispering) From here my horn reaches the north side of the fort.']),
    });
    if (w.flag(Flag.AraPaliReturned)) spawnAyelensBrother(w);

    // --- Side quests ---
    w.pickup({
      marker: '3',
      item: 'pali',
      lines: [[Speaker.Andrew, "A round wooden ball, carved from a knot of wood. This must be the children's pali."]],
    });
    w.pickup({
      marker: '4',
      item: 'maqui',
      lines: [[Speaker.Andrew, 'Maqui: dark berries and glossy leaves. The berries are still eaten and studied today for their antioxidants.']],
    });

    // --- Machine parts ---
    // The captain keeps the gold in an iron-bound strongbox that only Pip can crack.
    const gold = (): void =>
      w.pickup({
        marker: '1',
        item: 'gold',
        lines: [
          [Speaker.Andrew, 'Gold from the Quilacoya washings. The Spanish forced Mapuche laborers to pan for it.'],
          [Speaker.Andrew, "Gold never corrodes: perfect electrical contacts. I'll take one nugget. Just one."],
        ],
      });
    if (w.flag(Flag.AraChest) || w.flag(progress.got('gold'))) {
      gold();
    } else {
      const chest = w.obstacle({
        marker: '1',
        look: 'chest',
        interact: async (w) => {
          if (!pip) {
            await w.say([Speaker.Andrew, "The captain's strongbox: oak bound with iron, and a padlock the size of my fist. I can't open this by hand."]);
            return;
          }
          await w.say(
            [Speaker.Andrew, "The captain's strongbox. Oak, iron bands, a padlock the size of my fist."],
            [Speaker.Andrew, 'Pip... gently. Well, not too gently.'],
            [Speaker.Pip, '*determined snort*'],
          );
          await pip.moveBy(0, 18, 60);
          await w.wait(0.3);
          await pip.moveTo('1', 140);
          w.sfx('clang');
          w.shake(2.5, 0.5);
          chest.remove();
          w.setFlag(Flag.AraChest);
          gold();
          w.save();
          await pip.moveBy(0, 12, 60);
          pip.emote('heart', 1.5);
          await w.say([Speaker.Andrew, 'The lid flew right off. Now grab the gold, before someone comes to see what that noise was.']);
        },
      });
    }
    w.pickup({
      marker: '2',
      item: 'lodestone',
      lines: [
        [Speaker.Andrew, "The captain's compass case... with a lodestone inside."],
        [Speaker.Andrew, 'Naturally magnetized magnetite. Navigators used these to re-magnetize compass needles. The machine can use it as a magnetic reference.'],
      ],
    });

    // --- Spanish soldiers ---
    w.watcher({ kind: 'soldier', route: 'F', facing: 'left', sweep: 0.5, range: 92, caught: SOLDIER_CAUGHT });
    w.watcher({ kind: 'soldier', route: 'H', facing: 'left', sweep: 0.5, range: 92, caught: SOLDIER_CAUGHT });
    w.watcher({ kind: 'soldier', route: 'IJ', wait: 1.6, caught: SOLDIER_CAUGHT });
    w.watcher({ kind: 'soldier', route: 'KN', wait: 1.8, caught: SOLDIER_CAUGHT });
    w.watcher({ kind: 'soldier', route: 'O', facing: 'left', sweep: 1.0, range: 110, caught: SOLDIER_CAUGHT });
    w.watcher({ kind: 'rider', route: 'DE', wait: 1.5, caught: RIDER_CAUGHT });
    // The conquistadors used war dogs; this one guards the storehouse.
    w.watcher({
      kind: 'dog',
      route: 'R',
      facing: 'left',
      sweep: 1.0,
      range: 68,
      caught: [[Speaker.Soldier, '¡El perro ha encontrado algo! ¡Alto!'], 'The war dog barks until the soldiers chase you out of the fort.'],
    });

    // --- Area events ---
    w.trigger({
      area: { x: 3, y: 12, w: 12, h: 13 },
      once: Flag.AraMet,
      run: (w) => meetLautaro(w, lautaro, sentry),
    });
    w.trigger({
      area: 'U',
      once: Flag.AraGateHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'The front gate. Two arquebusiers watching it, and a lookout in the far corner.'],
          w.has('pifilka')
            ? [Speaker.Andrew, "Time for Ayelén's pifilka. The scouts are hiding in the quila just outside."]
            : [Speaker.Andrew, "I'd never get past them alone. Maybe the Mapuche know a way."],
        ),
    });
    w.trigger({
      area: { x: 42, y: 34, w: 1, h: 1 },
      once: Flag.AraBreachHint,
      run: (w) => w.say([Speaker.Andrew, 'A gap the Mapuche cut in the palisade, with a drop outside. A way out, but not a way in.']),
    });

    for (const marker of ['S', 'P', 'Q', 'X']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      [Speaker.Andrew, 'Araucarias, coihues, quila... and that smell of wet forest. This is southern Chile.'],
      [Speaker.Andrew, 'The earpiece just picked up two languages: Mapudungun and sixteenth-century Spanish.'],
      [Speaker.Andrew, 'The machine says 1553. The Spanish are building forts in Mapuche territory... This is a war zone.'],
    );
    if (w.flag(Flag.PipAboard)) await w.say([Speaker.Pip, '*sniffs the wet air*'], [Speaker.Andrew, 'Stay close, Pip. Nobody here has ever seen anything like you.']);
  } else {
    await w.say([Speaker.Andrew, 'Back in Araucanía. Mari mari, forest.']);
  }
  if (!w.flag(progress.diagnosed('araucania'))) await diagnose(w);
}

async function meetLautaro(w: WorldApi, lautaro: ActorHandle, sentry: ActorHandle): Promise<void> {
  sentry.emote('alert', 1.5);
  await w.say(
    [Speaker.Weichafe, '¡Wingka! Stop right there!'],
    [Speaker.Andrew, "Whoa, wait! I'm not Spanish! Look at my clothes!"],
  );
  if (w.flag(Flag.PipAboard)) await w.say([Speaker.Weichafe, '...And what is that creature?'], [Speaker.Andrew, 'Pip. He is... from very far away. Like me. He is friendly.']);
  // Lautaro walks over to wherever Andrew is standing.
  const dx = w.player.x - lautaro.x;
  const dy = w.player.y - lautaro.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 20) await lautaro.moveBy((dx / dist) * (dist - 18), (dy / dist) * (dist - 18), 70);
  await w.say(
    [Speaker.Lautaro, 'Lower your lance, peñi. His clothes are not from Spain, and neither is his way of speaking.'],
    [Speaker.Lautaro, 'I am Lautaro. Leftraru, in our tongue. I lived among the Spanish for years. I cared for Valdivia\'s horses.'],
    [Speaker.Lautaro, 'I learned how they fight, how they eat, how they sleep. Now I use it against them.'],
    [Speaker.Andrew, '(Lautaro. In a few weeks he will defeat Valdivia at Tucapel. I should not say a word about it.)'],
    [Speaker.Andrew, 'I need two things from the fort: a piece of gold, and the stone that makes their compass needles point north.'],
    [Speaker.Lautaro, 'The wingka guard their gold like a machi guards her kultrun. But they are few in Tucapel now, and nervous.'],
    [Speaker.Lautaro, 'My weichafe hide in the quila around the fort. When they hear a pifilka, they sound the trutruka, and the soldiers run toward the noise.'],
    [Speaker.Lautaro, 'A soldier who chases noises does not watch his door.'],
    [Speaker.Andrew, 'A pifilka... a whistle? Where do I get one?'],
    [Speaker.Lautaro, 'The children carve the best ones. Ask Ayelén, by the rukas. Though she has been sulking since they lost their pali.'],
  );
  await sentry.moveBy(-16, 0, 40);
  await lautaro.moveTo('L', 70);
  w.save();
}

async function talkToLautaro(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.AraPipLautaro,
    [Speaker.Lautaro, 'The wingka brought horses and dogs as big as calves, and we learned to fight both.'],
    [Speaker.Lautaro, 'But your creature... If the soldiers in Tucapel ever see it, they will think the land itself has risen against them.'],
  );
  if (w.flag(progress.fixed('araucania'))) {
    await w.say([Speaker.Lautaro, 'Your strange machine hums again. Go well, peñi. We have our own battle coming.'], [Speaker.Andrew, 'Pewkallal, Lautaro. Good luck.']);
    return;
  }
  if (w.has('gold') && w.has('lodestone')) {
    await w.say([Speaker.Lautaro, 'You came back from Tucapel with their gold and nobody saw you? You would make a fine weichafe.']);
    return;
  }
  if (!w.has('pifilka')) {
    await w.say([Speaker.Lautaro, 'Without a pifilka my scouts will not know when to make noise. Help Ayelén with her pali, and she will help you.']);
    return;
  }
  await w.say(
    [Speaker.Lautaro, "The gold is in the captain's house, in the north of the fort, locked in an iron chest. Their compass box is in the storehouse by the barracks."],
    [Speaker.Lautaro, 'Use the pifilka near the gate, where my scouts hide in the quila. Then go in quietly.'],
  );
}

async function talkToRayen(w: WorldApi): Promise<void> {
  if (!w.flag(Flag.AraMet)) {
    await w.say([Speaker.Rayen, 'Mari mari. You look lost, stranger.'], [Speaker.Andrew, '(Mari mari: "hello" in Mapudungun.)']);
    return;
  }
  await pipReaction(
    w,
    Flag.AraPipRayen,
    [Speaker.Rayen, 'Your animal looks hungry. Here, piñones, the seeds of the pewen. Everyone likes piñones.'],
    [Speaker.Pip, '*crunches happily*'],
    [Speaker.Andrew, '(Araucaria seeds. Pachycephalosaurs probably ate plants... and Pip clearly agrees.)'],
  );
  if (!w.flag(Flag.AraRayenDog)) {
    w.setFlag(Flag.AraRayenDog);
    await w.say(
      [Speaker.Rayen, 'You are going to the wingka fort? They keep a big war dog by the storehouse.'],
      [Speaker.Rayen, 'Dogs are dogs: give it something to eat and it forgets its job.'],
      [Speaker.Andrew, 'I still have rye bread from Cologne. Seven centuries fresh... more or less.'],
    );
    return;
  }
  await w.say([Speaker.Rayen, 'This is a ruka. We build them with the door facing east, toward where the sun is born.']);
}

async function talkToAyelen(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.AraPipAyelen,
    [Speaker.Ayelen, 'Is that your animal? Its head is perfect for palín! Can it play on our team?'],
    [Speaker.Pip, '*proud snort*'],
  );
  if (w.flag(Flag.AraPaliReturned)) {
    await w.say([Speaker.Ayelen, 'Thanks again, peñi! My brother is hiding behind the storehouse, by the south palisade.']);
    return;
  }
  if (!w.has('pali')) {
    await w.say(
      [Speaker.Ayelen, 'Our pali flew over the estero and landed in the quila south of the wingka fort!'],
      [Speaker.Ayelen, "My brother is a scout, but he says he's busy. Can you get it back? We can't play palín without it."],
    );
    if (w.flag(Flag.AraMet)) await w.say([Speaker.Ayelen, 'Bring it back and you can have my pifilka. I carved it myself!']);
    return;
  }
  w.take('pali');
  w.setFlag(Flag.AraPaliReturned);
  w.give('pifilka');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.pifilka.name}`);
  w.save();
  await w.say(
    [Speaker.Ayelen, 'Our pali! Chaltu may, peñi!'],
    [Speaker.Ayelen, 'Here, my pifilka, like I promised. Blow it near the fort and the weichafe will make the trutruka roar.'],
    'Pifilka: select it with {cycle} and press {throw} to whistle. Hidden scouts nearby make a diversion at their position.',
    [Speaker.Ayelen, "And I'll tell my brother. He'll hide in the quila behind the wingka storehouse and answer your pifilka, like the others."],
  );
  spawnAyelensBrother(w);
}

function spawnAyelensBrother(w: WorldApi): void {
  w.ally({
    marker: 'T',
    look: 'weichafe',
    name: Speaker.AyelensBrother,
    talk: (w) =>
      w.say(
        [Speaker.AyelensBrother, '(whispering) My little sister says you are a friend.'],
        [Speaker.AyelensBrother, '(whispering) The storehouse is right behind this palisade. When my horn sounds, even the wingka war dog turns its head.'],
      ),
  });
}

async function talkToMachi(w: WorldApi): Promise<void> {
  await pipReaction(
    w,
    Flag.AraPipMachi,
    [Speaker.Machi, 'This one is very old. Older than the pewen, older than the mountains. I can feel it.'],
    [Speaker.Machi, 'Treat it well, peñi. The ngen, the spirits who guard the land, are watching.'],
    [Speaker.Andrew, '(Sixty-six million years old. She is not wrong.)'],
  );
  if (w.flag(progress.got('canelo'))) {
    await w.say([Speaker.Machi, 'Keep the foye close. Lawen only works if you remember to use it.']);
    return;
  }
  if (!w.has('maqui')) {
    if (!w.flag(Flag.AraMetMachi)) {
      w.setFlag(Flag.AraMetMachi);
      await w.say(
        [Speaker.Machi, 'Mari mari, peñi. I am the machi of this lof. I keep the lawen, the medicine of plants.'],
        [Speaker.Machi, 'You have traveled far. Farther than the mountains. I can see it in your eyes.'],
        [Speaker.Machi, 'Years ago another traveler came, in silver clothes like yours. Sick, his gums bleeding. I gave him foye bark.'],
        [Speaker.Andrew, '(Silver clothes... Pike?)'],
      );
    }
    await w.say(
      [Speaker.Machi, 'Today a weichafe came back wounded from the fort. For his wound I need maqui, leaves and berries.'],
      [Speaker.Machi, 'The bushes grow by the estero, to the north. Bring me some, and I will have something for you too.'],
    );
    return;
  }
  w.take('maqui');
  await w.say([Speaker.Machi, 'Good, good. This will help him heal.'], [Speaker.Machi, 'And for you: bark from the foye, our sacred tree. It heals the sickness that makes gums bleed and teeth fall out.']);
  w.give('canelo');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.canelo.name}`);
  w.save();
  await w.say(
    [Speaker.Andrew, 'Scurvy. Foye bark is rich in vitamin C.'],
    [Speaker.Andrew, 'In 1578 an English captain, John Winter, used it to cure his crew. Botanists still call the tree Drimys winteri.'],
    [Speaker.Machi, 'We have known it much longer than any captain. Chaltu may, for listening.'],
  );
}

/** The machine's self-test: runs on arrival, so the HUD can list the parts right away. */
async function diagnose(w: WorldApi): Promise<void> {
  w.setFlag(progress.diagnosed('araucania'));
  w.sfx('error');
  await w.say(
    'DIAGNOSTIC REPORT  ·  Year: 1553 AD  ·  Stability: 54%  ·  Damaged: contact plating (corroded), magnetic reference lost.',
    [Speaker.Andrew, 'Corroded contacts: I need gold. It never oxidizes, which is why electronics still use it.'],
    [Speaker.Andrew, 'And a magnetic reference: a lodestone would do. The Spanish carry them to re-magnetize their compasses.'],
    [Speaker.Andrew, 'Gold and compasses in 1553 Chile mean one thing: a Spanish fort.'],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag(progress.fixed('araucania'))) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag(progress.diagnosed('araucania'))) await diagnose(w);
  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say([Speaker.Andrew, `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }
  await w.say([Speaker.Andrew, 'Gold contacts, lodestone reference... Here we go.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag(progress.fixed('araucania'));
  for (const part of PARTS) w.take(part);
  w.save();
  await w.say(
    'STABILITY 75%  ·  FORWARD JUMPS UNLOCKED  ·  NEW WINDOW DETECTED',
    [Speaker.Andrew, 'Seventy-five percent! The machine can finally jump forward, past my own time.'],
  );
  if (!w.flag(progress.got('canelo'))) await w.say([Speaker.Andrew, 'Before I go, maybe I should help the machi. She was worried about a wounded weichafe.']);
  await timeMachineMenu(w);
}
