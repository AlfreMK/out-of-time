import { ITEMS } from '../game/items.ts';
import type { ItemId } from '../game/state.ts';
import { ARAUCANIA_TILES } from '../game/tiledefs.ts';
import { ARAUCANIA_MAP, ARAUCANIA_MARKER_BASE } from './araucania-map.ts';
import { ERA_INFO } from './info.ts';
import { timeMachineMenu } from './shared.ts';
import type { ActorHandle, EraDef, Line, WorldApi } from './types.ts';

const PARTS: ItemId[] = ['gold', 'lodestone'];

const SOLDIER_CAUGHT: Line[] = [['Soldier', '¡Alto ahí! ¿Quién eres tú?'], 'Spanish soldiers drag you out of the fort and leave you in the quila.'];
const RIDER_CAUGHT: Line[] = [['Rider', '¡Un espía! ¡Un espía!'], 'The horseman chases you back into the forest.'];

/*
 * World 3: Araucanía, near Fort Tucapel, December 1553. Pedro de Valdivia had
 * built a line of forts in Mapuche territory; within weeks, the Mapuche led by
 * the young Lautaro (Leftraru) would defeat him at the Battle of Tucapel.
 * Lautaro had lived among the Spanish as Valdivia's groom and knew their habits.
 * Teaches cooperation: the pifilka whistle calls hidden scouts to create
 * diversions. Elias's earpiece translates Mapudungun and 16th-century Spanish.
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
    if (!w.flag('diag:araucania')) return 'Check the time machine.';
    if (!w.flag('fixed:araucania')) {
      if (!w.flag('ara:met')) return 'Find the Mapuche camp in the forest to the north.';
      const missing = PARTS.filter((p) => !w.has(p)).map((p) => ITEMS[p].name);
      if (missing.length === 0) return 'Bring the parts back to the time machine.';
      const extra = !w.has('lodestone') && !w.flag('got:charqui') ? ' A war dog guards the storehouse: Rayen in the camp may have something for it.' : '';
      return `Get ${missing.join(' and ')} from Fort Tucapel. Blow the pifilka near the scouts to distract the soldiers.${extra}`;
    }
    if (!w.flag('got:canelo')) return w.has('maqui') ? 'Bring the maqui to the machi.' : 'Help the machi: she needs maqui from the bushes by the stream, to the north.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    w.machine('M', useMachine);
    w.decor('9', 'burgundy');
    w.decor('5', 'rack');
    w.decor('6', 'pudu');
    w.decor('7', 'horse');

    // --- The Mapuche camp ---
    const lautaro = w.npc({ marker: 'L', look: 'lautaro', name: 'Lautaro', talk: talkToLautaro });
    w.npc({ marker: 'C', look: 'machi', name: 'Machi', talk: talkToMachi });
    w.npc({
      marker: 'G',
      look: 'lamngen',
      name: 'Rayen',
      talk: talkToRayen,
    });
    w.npc({ marker: 'Y', look: 'pichi', name: 'Ayelén', talk: talkToAyelen });
    w.npc({
      marker: 'V',
      look: 'pichi',
      name: 'Kid',
      talk: (w) => w.say(['Kid', 'This is palín! You hit the pali with your wüño, the curved stick. Our grandparents played it too.']),
    });
    const sentry = w.npc({
      marker: 'W',
      look: 'weichafe',
      name: 'Weichafe',
      facing: 'down',
      talk: (w) => w.say(['Weichafe', 'Lautaro says you are a friend. Then you are welcome in our ruka, peñi.']),
    });
    if (w.flag('ara:met')) void sentry.moveBy(-16, 0, 9999);

    // --- Hidden scouts who answer the pifilka ---
    w.ally({
      marker: 'A',
      look: 'weichafe',
      name: 'Scout',
      talk: (w) => w.say(['Scout', '(whispering) Blow the pifilka and we will sound the trutruka. The soldiers at the gate will come running.']),
    });
    w.ally({
      marker: 'B',
      look: 'weichafe',
      name: 'Scout',
      talk: (w) => w.say(['Scout', '(whispering) From here my horn reaches the north side of the fort.']),
    });
    if (w.flag('ara:paliReturned')) spawnAyelensBrother(w);

    // --- Side quests ---
    w.pickup({
      marker: '3',
      item: 'pali',
      lines: [['Elias', "A round wooden ball, carved from a knot of wood. This must be the children's pali."]],
    });
    w.pickup({
      marker: '4',
      item: 'maqui',
      lines: [['Elias', 'Maqui: dark berries and glossy leaves. The berries are still eaten and studied today for their antioxidants.']],
    });

    // --- Machine parts ---
    w.pickup({
      marker: '1',
      item: 'gold',
      lines: [
        ['Elias', 'A small chest of gold from the Quilacoya washings. The Spanish forced Mapuche laborers to pan for it.'],
        ['Elias', "Gold never corrodes: perfect electrical contacts. I'll take one nugget. Just one."],
      ],
    });
    w.pickup({
      marker: '2',
      item: 'lodestone',
      lines: [
        ['Elias', "The captain's compass case... with a lodestone inside."],
        ['Elias', 'Naturally magnetized magnetite. Navigators used these to re-magnetize compass needles. The machine can use it as a magnetic reference.'],
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
      caught: [['Soldier', '¡El perro ha encontrado algo! ¡Alto!'], 'The war dog barks until the soldiers chase you out of the fort.'],
    });

    // --- Area events ---
    w.trigger({
      area: { x: 3, y: 12, w: 12, h: 13 },
      once: 'ara:met',
      run: (w) => meetLautaro(w, lautaro, sentry),
    });
    w.trigger({
      area: 'U',
      once: 'ara:gateHint',
      run: (w) =>
        w.say(
          ['Elias', 'The front gate. Two arquebusiers watching it, and a lookout in the far corner.'],
          w.has('pifilka')
            ? ['Elias', "Time for Lautaro's signal. The scouts are hiding in the quila just outside."]
            : ['Elias', "I'd never get past them alone. Maybe the Mapuche know a way."],
        ),
    });
    w.trigger({
      area: { x: 42, y: 34, w: 1, h: 1 },
      once: 'ara:breachHint',
      run: (w) => w.say(['Elias', 'A gap the Mapuche cut in the palisade, with a drop outside. A way out, but not a way in.']),
    });

    for (const marker of ['S', 'P', 'Q', 'X']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      ['Elias', 'Araucarias, coihues, quila... and that smell of wet forest. This is southern Chile.'],
      ['Elias', 'The earpiece just picked up two languages: Mapudungun and sixteenth-century Spanish.'],
      ['Elias', 'The machine says 1553. The Spanish are building forts in Mapuche territory... This is a war zone.'],
    );
    w.toast('Check the time machine');
  } else {
    await w.say(['Elias', 'Back in Araucanía. Mari mari, forest.']);
  }
}

async function meetLautaro(w: WorldApi, lautaro: ActorHandle, sentry: ActorHandle): Promise<void> {
  sentry.emote('alert', 1.5);
  await w.say(
    ['Weichafe', '¡Wingka! Stop right there!'],
    ['Elias', "Whoa, wait! I'm not Spanish! Look at my clothes!"],
  );
  // Lautaro walks over to wherever Elias is standing.
  const dx = w.player.x - lautaro.x;
  const dy = w.player.y - lautaro.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 20) await lautaro.moveBy((dx / dist) * (dist - 18), (dy / dist) * (dist - 18), 70);
  await w.say(
    ['Lautaro', 'Lower your lance, peñi. His clothes are not from Spain, and neither is his way of speaking.'],
    ['Lautaro', 'I am Lautaro. Leftraru, in our tongue. I lived among the Spanish for years. I cared for Valdivia\'s horses.'],
    ['Lautaro', 'I learned how they fight, how they eat, how they sleep. Now I use it against them.'],
    ['Elias', '(Lautaro. In a few weeks he will defeat Valdivia at Tucapel. I should not say a word about it.)'],
    ['Elias', 'I need two things from the fort: a piece of gold, and the stone that makes their compass needles point north.'],
    ['Lautaro', 'The wingka guard their gold like a machi guards her kultrun. But they are few in Tucapel now, and nervous.'],
    ['Lautaro', 'My weichafe hide in the quila around the fort. Take this pifilka.'],
  );
  w.give('pifilka');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.pifilka.name}`);
  await w.say(
    ['Lautaro', 'When you blow it, they will sound the trutruka from their hiding place. The soldiers will run toward the noise.'],
    ['Lautaro', 'A soldier who chases noises does not watch his door.'],
    'Pifilka: select it with {cycle} and press {throw} to whistle. Hidden scouts nearby make a diversion at their position.',
  );
  await sentry.moveBy(-16, 0, 40);
  await lautaro.moveTo('L', 70);
  w.save();
}

async function talkToLautaro(w: WorldApi): Promise<void> {
  if (w.flag('fixed:araucania')) {
    await w.say(['Lautaro', 'Your strange machine hums again. Go well, peñi. We have our own battle coming.'], ['Elias', 'Pewkallal, Lautaro. Good luck.']);
    return;
  }
  if (w.has('gold') && w.has('lodestone')) {
    await w.say(['Lautaro', 'You came back from Tucapel with their gold and nobody saw you? You would make a fine weichafe.']);
    return;
  }
  await w.say(
    ['Lautaro', 'The gold is in the captain\'s house, in the north of the fort. Their compass box is in the storehouse by the barracks.'],
    ['Lautaro', 'Use the pifilka near the gate, where my scouts hide in the quila. Then go in quietly.'],
  );
}

async function talkToRayen(w: WorldApi): Promise<void> {
  if (!w.flag('ara:met')) {
    await w.say(['Rayen', 'Mari mari. You look lost, stranger.'], ['Elias', '(Mari mari: "hello" in Mapudungun.)']);
    return;
  }
  if (!w.flag('got:charqui')) {
    await w.say(
      ['Rayen', 'You are going to the wingka fort? Take some charqui: dried meat, for the road.'],
      ['Rayen', 'They say the Spanish keep a big war dog there. Dogs are dogs: a little meat and they forget their job.'],
    );
    w.give('charqui');
    w.sfx('pickup');
    w.toast(`Got: ${ITEMS.charqui.name}`);
    w.save();
    await w.say('Charqui: select it with {cycle} and press {throw} to toss it. Hungry animals will go after it.');
    return;
  }
  await w.say(['Rayen', 'This is a ruka. We build them with the door facing east, toward where the sun is born.']);
}

async function talkToAyelen(w: WorldApi): Promise<void> {
  if (w.flag('ara:paliReturned')) {
    await w.say(['Ayelén', 'Thanks again, peñi! My brother is watching the south side of the fort for you.']);
    return;
  }
  if (!w.has('pali')) {
    await w.say(
      ['Ayelén', 'Our pali flew over the estero and landed in the quila south of the wingka fort!'],
      ['Ayelén', "My brother is a scout, but he says he's busy. Can you get it back? We can't play palín without it."],
    );
    return;
  }
  w.take('pali');
  w.setFlag('ara:paliReturned');
  w.save();
  await w.say(
    ['Ayelén', 'Our pali! Chaltu may, peñi!'],
    ['Ayelén', "I'll tell my brother. He'll hide in the quila south of the fort and answer your pifilka, like the others."],
  );
  spawnAyelensBrother(w);
}

function spawnAyelensBrother(w: WorldApi): void {
  w.ally({
    marker: 'T',
    look: 'weichafe',
    name: "Ayelén's brother",
    talk: (w) => w.say(["Ayelén's brother", '(whispering) My little sister says you are a friend. From here my horn reaches the storehouse.']),
  });
}

async function talkToMachi(w: WorldApi): Promise<void> {
  if (w.flag('got:canelo')) {
    await w.say(['Machi', 'Keep the foye close. Lawen only works if you remember to use it.']);
    return;
  }
  if (!w.has('maqui')) {
    if (!w.flag('ara:metMachi')) {
      w.setFlag('ara:metMachi');
      await w.say(
        ['Machi', 'Mari mari, peñi. I am the machi of this lof. I keep the lawen, the medicine of plants.'],
        ['Machi', 'You have traveled far. Farther than the mountains. I can see it in your eyes.'],
        ['Machi', 'Years ago another traveler came, in silver clothes like yours. Sick, his gums bleeding. I gave him foye bark.'],
        ['Elias', '(Silver clothes... Pike?)'],
      );
    }
    await w.say(
      ['Machi', 'Today a weichafe came back wounded from the fort. For his wound I need maqui, leaves and berries.'],
      ['Machi', 'The bushes grow by the estero, to the north. Bring me some, and I will have something for you too.'],
    );
    return;
  }
  w.take('maqui');
  await w.say(['Machi', 'Good, good. This will help him heal.'], ['Machi', 'And for you: bark from the foye, our sacred tree. It heals the sickness that makes gums bleed and teeth fall out.']);
  w.give('canelo');
  w.sfx('pickup');
  w.toast(`Got: ${ITEMS.canelo.name}`);
  w.save();
  await w.say(
    ['Elias', 'Scurvy. Foye bark is rich in vitamin C.'],
    ['Elias', 'In 1578 an English captain, John Winter, used it to cure his crew. Botanists still call the tree Drimys winteri.'],
    ['Machi', 'We have known it much longer than any captain. Chaltu may, for listening.'],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag('fixed:araucania')) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag('diag:araucania')) {
    w.setFlag('diag:araucania');
    w.sfx('error');
    await w.say(
      'DIAGNOSTIC REPORT  ·  Year: 1553 AD  ·  Stability: 54%  ·  Damaged: contact plating (corroded), magnetic reference lost.',
      ['Elias', 'Corroded contacts: I need gold. It never oxidizes, which is why electronics still use it.'],
      ['Elias', 'And a magnetic reference: a lodestone would do. The Spanish carry them to re-magnetize their compasses.'],
      ['Elias', 'Gold and compasses in 1553 Chile mean one thing: a Spanish fort.'],
    );
  }
  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say(['Elias', `Still missing: ${missing.map((part) => ITEMS[part].name).join(', ')}.`]);
    return;
  }
  await w.say(['Elias', 'Gold contacts, lodestone reference... Here we go.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag('fixed:araucania');
  w.save();
  await w.say(
    'STABILITY 75%  ·  FORWARD JUMPS UNLOCKED  ·  NEW WINDOW DETECTED',
    ['Elias', 'Seventy-five percent! The machine can finally jump forward, past my own time.'],
  );
  if (!w.flag('got:canelo')) await w.say(['Elias', 'Before I go, maybe I should help the machi. She was worried about a wounded weichafe.']);
  await timeMachineMenu(w);
}
