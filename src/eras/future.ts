import type { ItemId } from '../game/state.ts';
import { FUTURE_TILES } from '../game/tiledefs.ts';
import { FUTURE_MAP, FUTURE_MARKER_BASE } from './future-map.ts';
import { ERA_INFO } from './info.ts';
import { pipAlong, pipReaction, timeMachineMenu } from './shared.ts';
import type { Barks, EraDef, GateHandle, Line, WorldApi } from './types.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag, progress } from '../game/flags.ts';
import { itemList, itemName, msg, tr, type Text } from '../i18n/index.ts';

const PARTS: ItemId[] = ['clock', 'tape'];

/** The depot door code: the year the Yamanote Line was completed as a loop (November 1925). */
const DEPOT_CODE = 1925;

const BOT_CAUGHT: Line[] = [[Speaker.SecurityBot, 'INTRUDER DETECTED. ESCORTING YOU TO THE EXIT.'], 'You are politely but firmly marched out of the building.'];
const DRONE_CAUGHT: Line[] = [[Speaker.Drone, 'RESTRICTED AREA. LEAVE NOW OR AUTHORITIES WILL BE NOTIFIED.'], 'The drone herds you back out into the street.'];
/** What a Chronos drone says when it starts to spot Andrew: a trespasser in a restricted district. */
const DRONE_BARKS = { suspicious: ['UNAUTHORIZED PERSON?', 'NO ACCESS PASS DETECTED?', 'IDENTIFY YOURSELF.'] } satisfies Partial<Barks>;
/** With Pip along, they also notice the unregistered "bio-print" trotting behind him. */
const DRONE_BARKS_PIP = { suspicious: [...DRONE_BARKS.suspicious, 'UNREGISTERED BIO-PRINT?', 'SPECIES NOT IN CATALOG?'] } satisfies Partial<Barks>;

const CAMERA_CAUGHT: Line[] = [[Speaker.Camera, 'UNAUTHORIZED PERSON DETECTED.'], 'An alarm wails. You slip away before security arrives.'];

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
  // The Yamanote Line runs along the viaduct; while a train passes, its roar covers splashes and steps.
  train: true,
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
    if (!w.flag(progress.diagnosed('future'))) return 'Check the time machine.';
    if (!w.flag(Flag.FutMetYuki)) return 'Find a way into the Chronos Corp tower. Someone is hiding in the dark alley next to it.';
    if (!w.flag(progress.fixed('future'))) {
      const steps: Text[] = [];
      if (!w.flag(Flag.FutCanHack)) {
        if (w.has('deck')) steps.push('bring the cyberdeck back to Yuki');
        else steps.push(w.flag(Flag.FutDepotOpen) ? "get Yuki's cyberdeck from the maglev depot (splash through its doorway while a train roars past)" : 'the maglev depot door needs a four-digit code: someone in the plaza south of the canal may know it');
      } else if (!w.has('clock')) {
        if (!w.flag(Flag.FutTowerOpen)) steps.push('hack the junction box in the alley to get into the Chronos Corp tower');
        else if (!w.flag(Flag.FutLabOpen)) steps.push('hack the security terminal in the tower lobby to open the lab');
        else steps.push(w.flag(Flag.FutBlastDoor) ? 'get the optical clock from the tower lab' : "a blast door is jammed behind the lab's laser: Pip's skull could move it");
      }
      if (!w.has('tape')) steps.push(w.flag(Flag.FutDepotOpen) ? 'get the superconducting tape from the maglev depot (avoid the puddles)' : 'get the superconducting tape from the maglev depot');
      return steps.length ? msg().toDo({ steps: steps.map(tr) }) : 'Bring the parts back to the time machine.';
    }
    if (!w.flag(progress.got('notes'))) return 'Take the Power Cell to the sealed crypt in Cologne, 1248.';
    return 'Use the time machine to travel.';
  },

  setup(w) {
    w.machine('M', useMachine);
    const pip = pipAlong(w, 'S');
    w.decor('7', 'hachiko');
    w.decor('8', 'hologram');

    // --- People ---
    w.decor('0', 'torii');
    w.npc({ marker: 'O', look: 'hacker', name: Speaker.Hacker, talk: talkToYuki });
    w.npc({
      marker: 'N',
      look: 'priest',
      name: Speaker.Priest,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.FutPipPriest,
          [Speaker.Priest, '...Oh. What an extraordinary companion you have.'],
          [Speaker.Priest, 'We say kami can dwell in anything: a rock, a tree, a waterfall. Why not in a creature older than these islands themselves?'],
          [Speaker.Andrew, '(He is not wrong. Pip is 66 million years old. Japan split from the mainland only 15 to 20 million years ago.)'],
          [Speaker.Pip, '*bows his dome politely*'],
        );
        await w.say(
          [Speaker.Priest, 'Welcome. Pass under the torii and you leave the noise of the city behind.'],
          [Speaker.Priest, 'Shrines like this one have stood in Tokyo through earthquakes, fires and wars. That tower is young.'],
          [Speaker.Andrew, '(A kannushi, a Shinto priest. Some things in Tokyo outlast every corporation.)'],
        );
      },
    });
    w.npc({
      marker: 'V',
      look: 'vendor',
      name: Speaker.Vendor,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.FutPipVendor,
          [Speaker.Vendor, 'Irasshai! Two customers... wait. Is that a DINOSAUR? A real one?'],
          [Speaker.Vendor, 'In my day we only had robot dogs! Does it eat ramen? I have chashu, the good kind.'],
          [Speaker.Andrew, 'He is probably a plant-eater. Probably.'],
          [Speaker.Pip, '*sniffs the stockpot hopefully*'],
          [Speaker.Vendor, 'Then extra green onions for the little one. On the house!'],
        );
        await w.say(
          [Speaker.Vendor, 'Irasshai! Ramen! Shoyu, miso, tonkotsu. Hot broth is the only cure for tsuyu.'],
          [Speaker.Vendor, 'My grandfather pushed a yatai like this one through Shinjuku. Chronos owns the street now, but not my broth.'],
          [Speaker.Vendor, "And it's tsuyu, the rainy season. It won't stop until July. Sit down, sit down."],
          [Speaker.Andrew, '(A ramen yatai by the canal bridge. Some things survive sixty years just fine.)'],
        );
      },
    });
    // Two more yatai beside the ramen stall (the map has no markers left, so their cooks stand by tile).
    w.npc({
      marker: [21, 29],
      look: 'vendor',
      name: Speaker.YakitoriCook,
      talk: (w) =>
        w.say(
          [Speaker.YakitoriCook, 'Negima, tsukune, kawa! Chicken and leek, meatballs, crispy skin, all grilled over binchōtan.'],
          [Speaker.YakitoriCook, 'White charcoal: burns hot and clean, no smoke taste. Well, almost no smoke.'],
          [Speaker.Andrew, "(Smells incredible. I doubt a card from 2026 works here, though.)"],
          ...(w.flag(Flag.PipAboard) ? ([[Speaker.Pip, '*stares at the skewers, drooling on the counter*']] as const) : []),
        ),
    });
    w.npc({
      marker: [24, 29],
      look: 'vendor',
      name: Speaker.TakoyakiVendor,
      talk: (w) =>
        w.say(
          [Speaker.TakoyakiVendor, 'Takoyaki! Octopus in batter, turned with a pick until every one is a perfect ball.'],
          [Speaker.TakoyakiVendor, 'They come from Osaka, back in the 1930s. Tokyo pretends it invented them anyway.'],
          [Speaker.Andrew, '(Crispy outside, molten inside. Some things are worth a time machine.)'],
        ),
    });
    // Advertising everywhere: video screens on the avenue's facades and the Chronos tower, vertical
    // neon signs, and billboards on the rooftops. Every brand is invented.
    // Sizes fit under each building's roofline; the billboards stand on the lowest roofs, where the
    // high camera still sees them from the street.
    w.sign({ at: [3, 16], style: 'screen', ads: ['neurocola', 'unagi', 'memory'], width: 4, height: 1.5, y: 1 });
    w.sign({ at: [9, 16], style: 'kanban', ads: ['karaoke'], width: 0.5, height: 1.67, y: 0.9 });
    w.sign({ at: [10, 16], style: 'kanban', ads: ['izakaya'], width: 0.5, height: 1.67, y: 0.9 });
    w.sign({ at: [13, 16], style: 'screen', ads: ['robodog', 'catrental'], width: 4, height: 1.5, y: 1 });
    w.sign({ at: [17, 16], style: 'kanban', ads: ['uranai'], width: 0.5, height: 1.67, y: 0.9 });
    w.sign({ at: [18, 16], style: 'rooftop', ads: ['pachinko'], width: 2, height: 1.2, y: 3.05 });
    w.sign({ at: [24, 14], style: 'rooftop', ads: ['cricket'], width: 2, height: 1.2, y: 3.6 });
    // The billboard on its pole by the avenue, and the one in the tower lobby.
    w.sign({ at: [19, 17], style: 'screen', ads: ['umbrella', 'neurocola'], width: 1.2, height: 0.75, y: 1.3, inset: 0.5 });
    w.sign({ at: [29, 3], style: 'screen', ads: ['chronos'], width: 1.2, height: 0.75, y: 1.3, inset: 0.5 });
    w.sign({ at: [28, 16], style: 'screen', ads: ['chronos', 'genetics'], width: 7, height: 1.8, y: 2.3, hideIndoors: true });
    w.sign({ at: [38, 16], style: 'screen', ads: ['kirara', 'orbit', 'umbrella'], width: 8, height: 1.8, y: 2.3, hideIndoors: true });
    w.inspect([5, 16], 'Video screen', (w) =>
      w.say(
        [Speaker.Andrew, 'Neuro Cola, lab-grown eel at half price, sixty-four terabytes of extra memory. Tokyo never did do subtle.'],
        [Speaker.Andrew, 'They all face the canal: the staff in here are a captive audience, so the ads shout across the water at the crowds in the plaza.'],
        [Speaker.Andrew, 'The cultured unagi makes sense, at least: the Japanese eel was already on the endangered list in my time.'],
      ),
    );
    w.inspect([15, 16], 'Video screen', (w) =>
      w.say(
        [Speaker.Andrew, 'A robot dog with a "loyal mode". Hachikō waited at Shibuya Station for nearly ten years without any firmware.'],
        [Speaker.Andrew, 'And cats rented by the hour. Cat cafés were already a thing in my day; I suppose this was the next step.'],
      ),
    );
    w.inspect([30, 16], 'Video screen', async (w) => {
      await w.say(
        [Speaker.Andrew, '"The future is already here." The Institute grew up, moved to Tokyo and hired a marketing department.'],
        [Speaker.Andrew, 'Chronos Genetics: designer pets, printed to order.'],
      );
      if (pip) await w.say([Speaker.Andrew, "So that's why some people here take Pip for a designer pet."]);
    });
    w.inspect([41, 16], 'Video screen', (w) =>
      w.say(
        [Speaker.Andrew, "Hoshi Kirara's dome tour, rides up a space elevator, and a subscription for umbrellas."],
        [Speaker.Andrew, 'A Japanese construction firm was already planning a space elevator for 2050 back in my time. Looks like someone built it.'],
      ),
    );

    // "No entry" boards at both bridges: north of the canal is Chronos Corp's district, hence the drones.
    for (const spot of [[12, 27], [33, 27]] as const) {
      w.decor(spot, 'restricted');
      w.inspect(spot, 'Sign', (w) =>
        w.say(
          'Tachiiri kinshi: NO ENTRY. RESTRICTED AREA, CHRONOS CORP. STAFF AND PERMIT HOLDERS ONLY. DRONE PATROLS IN OPERATION.',
          [Speaker.Andrew, "So everything north of the canal is Chronos Corp's: a company district, with its own shops for the staff. That's why the drones only patrol over there."],
        ),
      );
    }
    // People waiting out the rain under their umbrellas, a couple of them at Hachikō, the city's classic
    // meeting spot. Talk to them and they brush you off, politely or not.
    const passersBy: Array<readonly [readonly [number, number], Line[]]> = [
      [[23, 34], [[Speaker.PasserBy, "Sorry, I'm waiting for someone. We always meet at Hachikō."]]],
      [[25, 34], [[Speaker.PasserBy, '(Doesn\'t look up from the visor.) ...Busy.']]],
      [[11, 33], [[Speaker.PasserBy, "Sumimasen, I'll miss my train. Ask someone else."]]],
      [[20, 35], [[Speaker.PasserBy, 'Please, not now. My umbrella is dripping on you anyway.']]],
      [
        [30, 34],
        [
          [Speaker.PasserBy, "Don't bother. Everything north of the canal belongs to Chronos. Even the rain feels branded."],
          [Speaker.Andrew, '(Charming.)'],
        ],
      ],
    ];
    for (const [spot, lines] of passersBy) {
      w.decor(spot, 'pedestrian');
      w.inspect(spot, 'Passer-by', (w) => w.say(...lines));
    }
    w.npc({
      marker: 'Y',
      look: 'citizen',
      name: Speaker.Commuter,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.FutPipCommuter,
          [Speaker.Commuter, 'Nice bio-print. Chronos Genetics? I did not know they had a pachycephalosaurus in the catalog yet.'],
          [Speaker.Andrew, '...Yes. Chronos Genetics. Limited edition.'],
          [Speaker.Commuter, 'My neighbor has a mini triceratops. It ate his sofa.'],
        );
        w.setFlag(Flag.FutHeardYamanote);
        await w.say(
          [Speaker.Commuter, 'Hear that? The Yamanote Line. Round and round the city, all night long.'],
          [Speaker.Commuter, 'It became a full loop in 1925, when they linked Kanda and Ueno. Before that it was just a big C.'],
          [Speaker.Commuter, 'Older than my great-grandparents, and still on time. Everything else in this city belongs to Chronos Corp now.'],
          [Speaker.Commuter, "And loud. When a train goes over the viaduct you can't hear yourself think. Even the drones' microphones give up."],
          [Speaker.Andrew, '(A few seconds of cover, every time a train comes by. Good to know.)'],
        );
      },
    });
    w.npc({
      marker: 'W',
      look: 'citizen',
      name: Speaker.Courier,
      talk: async (w) => {
        await pipReaction(
          w,
          Flag.FutPipCourier,
          [Speaker.Courier, "Whoa! Is that thing registered? You don't have a pass either, do you? Neither of you is supposed to be on this side of the canal."],
          [Speaker.Andrew, 'He is a... support animal.'],
          [Speaker.Courier, 'Support animal. Sure. Keep him out of the light, then.'],
        );
        await w.say(
          [Speaker.Courier, "Delivery permit. Chronos staff order dinner like everyone else, so they let couriers in. You, though, I'd keep moving."],
          [Speaker.Courier, "Their drones can't see in the dark alleys, but they've got great microphones. Stay out of the puddles if you don't want company."],
        );
      },
    });
    w.inspect('7', 'Statue', (w) =>
      w.say(
        'A bronze statue of Hachikō, the Akita dog who waited at Shibuya Station every day for nearly ten years after his owner died.',
        [Speaker.Andrew, 'Waiting for someone who never comes back. I think I know somebody like that.'],
        ...(w.flag(Flag.PipAboard) ? ([[Speaker.Pip, '*sniffs the bronze dog, deeply suspicious*']] as const) : []),
      ),
    );

    // The maglev parked in the depot (by tile: the map has no markers left).
    w.inspect([5, 2], 'Maglev', (w) =>
      w.say(
        'An L-series maglev car, parked on its U-shaped guideway.',
        [Speaker.Andrew, 'Tokyo to Nagoya in about forty minutes, floating some ten centimeters over the track on superconducting magnets.'],
        [Speaker.Andrew, 'And whatever they wind those magnets from is stored in here somewhere.'],
      ),
    );

    // The Yamanote station hall against the viaduct (the map has no markers left, so by its tiles).
    for (const tile of [[17, 36], [18, 36]] as const) {
      w.inspect(tile, 'Station', (w) =>
        w.say(
          'A Yamanote Line station, built right against the viaduct. Its platforms are up on the tracks.',
          [Speaker.Andrew, "The yellow-green stripe is the line's color: uguisu, the green of the Japanese bush warbler."],
          [Speaker.Andrew, 'Every time a train is due, the station chimes, announces it and plays a little melody. Hard to miss.'],
        ),
      );
    }

    // --- Security ---
    const towerGate = w.gate({ marker: '3', look: 'laser', openFlag: Flag.FutTowerOpen });
    const labGate = w.gate({ marker: '4', look: 'laser', openFlag: Flag.FutLabOpen });
    w.pickup({
      marker: '6',
      item: 'deck',
      lines: [[Speaker.Andrew, "A battered cyberdeck in an evidence bag, tagged CONFISCATED: Y. TANAKA. This must be Yuki's."]],
    });

    // The depot's door wants a four-digit code. A forgetful night-shift worker left it, in a way, at the shrine.
    const depotDoor = w.gate({ marker: '9', look: 'door', openFlag: Flag.FutDepotOpen });
    w.inspect('9', 'Keypad', async (w) => {
      if (depotDoor.isOpen) return;
      w.sfx('beep');
      const code = await w.enterYear('DEPOT ACCESS CODE', 0);
      if (code !== DEPOT_CODE) {
        w.sfx('error');
        await w.say('ACCESS DENIED.', [Speaker.Andrew, 'Four digits. Someone who works here must have written it down somewhere...']);
        return;
      }
      w.sfx('door');
      depotDoor.open();
      w.save();
      // What Andrew says depends on whether he actually worked the code out.
      const reaction: Line = w.flag(Flag.FutReadEma)
        ? [Speaker.Andrew, 'The year the Yamanote became a loop. Thank you, K.']
        : w.flag(Flag.FutHeardYamanote)
          ? [Speaker.Andrew, 'Wait, it worked? I just tried the year that commuter kept going on about. Pure luck.']
          : [Speaker.Andrew, 'Wait... it worked? I typed a random year. That has to be the luckiest guess in the history of time travel.'];
      await w.say('ACCESS GRANTED.', reaction);
    });
    w.inspect('5', 'Ema', (w) => {
      w.setFlag(Flag.FutReadEma);
      return w.say(
        'Wooden ema plaques hang by the shrine, covered in wishes: exams, love, a cat called Mochi.',
        'One reads: "Kami-sama, please stop me forgetting the depot door code. Note to self: it is the year the Yamanote Line became a loop. — K., night shift"',
        [Speaker.Andrew, 'Writing your password on a shrine. Some things never change.'],
      );
    });
    w.inspect('8', 'Hologram', (w) =>
      w.say(
        'A three-story hologram of a virtual idol with long pink twin tails dances over the avenue: "HOSHI KIRARA ★ LIVE TONIGHT".',
        [Speaker.Andrew, 'Virtual idols were already filling concert halls in my time. Sixty years later, she is taller than the buildings.'],
        ...(w.flag(Flag.PipAboard) ? ([[Speaker.Pip, '*chirps along to the music, bobbing his dome*']] as const) : []),
      ),
    );

    // Past the lab's laser, a blast door jammed in a power fault. Only a very thick skull will move it.
    if (!w.flag(Flag.FutBlastDoor)) {
      const blastDoor = w.obstacle({
        marker: 'P',
        look: 'blastdoor',
        interact: async (w) => {
          if (!pip) {
            await w.say([Speaker.Andrew, 'A blast door, jammed halfway in a power fault. It will not budge for me.']);
            return;
          }
          await w.say(
            [Speaker.Andrew, 'A blast door, jammed in a power fault. The clock is right behind it.'],
            [Speaker.Andrew, 'Pip, remember that boulder in Hell Creek?'],
            [Speaker.Pip, '*determined snort*'],
          );
          await pip.moveBy(0, 18, 60);
          await w.wait(0.3);
          await pip.moveTo('P', 140);
          w.sfx('clang');
          w.shake(2.5, 0.5);
          blastDoor.remove();
          w.setFlag(Flag.FutBlastDoor);
          w.save();
          await pip.moveBy(0, 12, 60);
          pip.emote('heart', 1.5);
          await w.say([Speaker.Andrew, 'Sixty-six million years of skull engineering versus Chronos Corp steel. No contest.']);
        },
      });
    }
    w.inspect('T', 'Junction box', (w) => hack(w, towerGate, 'Tower entrance'));
    w.inspect('U', 'Security terminal', (w) => hack(w, labGate, 'Lab door'));

    w.watcher({ kind: 'camera', route: 'A', facing: 'right', group: 'tower', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'camera', route: 'B', facing: 'left', group: 'tower', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'bot', route: 'CD', wait: 1.6, group: 'tower', caught: BOT_CAUGHT });
    w.watcher({ kind: 'bot', route: 'EF', wait: 2.0, group: 'tower', caught: BOT_CAUGHT });
    w.watcher({ kind: 'drone', route: 'GH', wait: 1.2, group: 'depot', caught: DRONE_CAUGHT, barks: pip ? DRONE_BARKS_PIP : DRONE_BARKS });
    w.watcher({ kind: 'drone', route: 'IJ', wait: 1.4, group: 'depot', caught: DRONE_CAUGHT, barks: pip ? DRONE_BARKS_PIP : DRONE_BARKS });
    w.watcher({ kind: 'camera', route: 'K', facing: 'left', group: 'depot', caught: CAMERA_CAUGHT });
    w.watcher({ kind: 'drone', route: 'LQ', wait: 2.0, group: 'street', caught: DRONE_CAUGHT, barks: pip ? DRONE_BARKS_PIP : DRONE_BARKS });
    // Hovers back and forth in front of the depot: always close enough to hear a splash in its doorway.
    w.watcher({ kind: 'drone', route: [[9, 18], [14, 18]], wait: 1.2, group: 'street', caught: DRONE_CAUGHT, barks: pip ? DRONE_BARKS_PIP : DRONE_BARKS });

    // --- Parts ---
    w.pickup({
      marker: '1',
      item: 'clock',
      lines: [
        [Speaker.Andrew, 'An optical lattice clock: strontium atoms held in a grid of laser light, ticking about 430 trillion times a second.'],
        [Speaker.Andrew, "It wouldn't lose a second in the whole age of the universe. Exactly the time reference my year display needs."],
      ],
    });
    w.pickup({
      marker: '2',
      item: 'tape',
      lines: [
        [Speaker.Andrew, 'A spool of REBCO tape: a rare-earth barium copper oxide superconductor.'],
        [Speaker.Andrew, 'Cooled with liquid nitrogen it has zero electrical resistance. The maglev trains float on magnets wound from this.'],
      ],
    });

    // --- Hints ---
    w.trigger({
      area: { x: 34, y: 18, w: 5, h: 1 },
      once: Flag.FutTowerHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'The Chronos Corp tower. So they moved the whole operation from Geneva to Tokyo.'],
          [Speaker.Andrew, 'Laser barrier at the door, and a patrol bot out front. That junction box in the alley might control the door.'],
        ),
    });
    w.trigger({
      area: { x: 11, y: 16, w: 2, h: 1 },
      once: Flag.FutDepotHint,
      run: (w) =>
        w.say(
          [Speaker.Andrew, 'The maglev depot. Puddles everywhere, and drones with microphones. Splashing will carry even if I sneak.'],
          [Speaker.Andrew, "There's no way to the door without splashing, and that drone out front would hear it."],
          [Speaker.Andrew, 'Unless a Yamanote train drowns it out. I just have to time it.'],
          'While a train passes (watch the train board under the place name), your footsteps and splashes make no sound.',
        ),
    });

    for (const marker of ['S', 'R', 'X', 'Z']) w.checkpoint(marker);
    return arrive;
  },
};

async function arrive(w: WorldApi, firstVisit: boolean): Promise<void> {
  await w.wait(0.5);
  if (firstVisit) {
    await w.say(
      [Speaker.Andrew, 'Rain... and neon. A river in a concrete channel, crowds of umbrellas, and a bronze statue of a dog. Is this Shibuya?'],
      [Speaker.Andrew, "Tokyo. And the biggest tower on the block says CHRONOS CORP. It's... 2087."],
      [Speaker.Andrew, 'Sixty-one years after I left. The Institute grew up, and it moved a long way from Geneva.'],
    );
    if (w.flag(Flag.PipAboard)) await w.say([Speaker.Pip, '*shakes the rain off his dome*'], [Speaker.Andrew, 'Neon, rain and robots, Pip. Stick close.']);
  } else {
    await w.say([Speaker.Andrew, 'Neo-Tokyo again. Mind the puddles.']);
  }
  if (!w.flag(progress.diagnosed('future'))) await diagnose(w);
}

async function hack(w: WorldApi, gate: GateHandle, label: Text): Promise<void> {
  if (!w.flag(Flag.FutCanHack)) {
    w.sfx('error');
    await w.say(
      [Speaker.Andrew, "Chronos encryption. My multitool doesn't stand a chance against this."],
      [Speaker.Andrew, w.flag(Flag.FutMetYuki) ? "Yuki's cyberdeck could crack it. It's locked up in the depot." : 'I need someone who knows their systems.'],
    );
    return;
  }
  w.sfx('hack');
  await w.say([Speaker.Andrew, 'Institute multitool, meet Chronos Corp firmware...']);
  w.disable('tower', 20);
  if (!gate.isOpen) gate.open();
  w.toast(msg().hacked({ door: tr(label) }));
}

/** Yuki Tanaka: a hacker who leaked Chronos Corp's files, hiding in the alley by the tower. */
async function talkToYuki(w: WorldApi): Promise<void> {
  if (!w.flag(Flag.FutMetYuki)) {
    w.setFlag(Flag.FutMetYuki);
    await w.say(
      [Speaker.Hacker, "...Don't move. Who sent you? Chronos?"],
      [Speaker.Hacker, 'Wait. That face. That lab coat.'],
      ...(w.flag(Flag.PipAboard) ? ([[Speaker.Hacker, '...And is that a DINOSAUR?'], [Speaker.Andrew, 'Long story.']] as const) : []),
      [Speaker.Hacker, '"Dr. Andrew Ward. Test Run #47, Geneva." Sixty-one years ago. I have read your file a hundred times.'],
      [Speaker.Andrew, 'You know who I am?'],
      [Speaker.Yuki, "Yuki Tanaka. I leaked Chronos Corp's archives. Your file is the strangest thing in them, because most of it is gone."],
      [Speaker.Yuki, 'The launch log survived: Test Run #47, sixty-one years ago. Everything after the jump was wiped. Telemetry, reports, all of it.'],
      [Speaker.Andrew, 'Wiped? So nobody knows what happened to me?'],
      [Speaker.Yuki, 'If Chronos knows, they buried it deep. Lost, recovered, erased... the file does not say. Honestly? You are the first real answer I have found.'],
      [Speaker.Yuki, "They caught me last month and took my cyberdeck. Without it I can't touch their systems."],
      [Speaker.Yuki, 'It is in an evidence locker in their maglev depot, to the north. Bring it back and I will get you into that tower.'],
      [Speaker.Yuki, 'The depot door takes a code. The night shift keeps forgetting theirs; I bet one of them wrote it down somewhere.'],
    );
    return;
  }
  if (!w.flag(Flag.FutCanHack)) {
    if (!w.has('deck')) {
      await w.say([Speaker.Yuki, 'The depot is crawling with drones. Watch out for puddles: their microphones pick up every splash.']);
      return;
    }
    w.take('deck');
    w.setFlag(Flag.FutCanHack);
    w.sfx('hack');
    await w.say(
      [Speaker.Yuki, 'My deck! You are crazier than your file says.'],
      [Speaker.Yuki, 'There. I flashed my exploits onto your multitool. Chronos terminals and junction boxes will open for you now.'],
      [Speaker.Yuki, 'And take this. A prototype power cell I lifted from their lab. Something tells me you need it more than I do.'],
    );
    w.give('powercell');
    w.sfx('pickup');
    w.toast(msg().gotItem({ item: itemName('powercell') }));
    w.save();
    await w.say(
      [Speaker.Yuki, 'One more thing from the archives. In 2031 Chronos caught a single signal from an Institute beacon. From Cologne, in 1248.'],
      [Speaker.Yuki, 'It belongs to Test Run #12, October 2019. Officially an unmanned probe. They scrubbed the pilot\'s name, badly: Dr. Aaron Pike.'],
    );
    // Andrew only connects the dots with what he has already found himself.
    await w.say(
      w.has('recorder')
        ? [Speaker.Andrew, 'Pike! The voice on that recorder in the Cretaceous. He is still out there, jumping from window to window.']
        : [Speaker.Andrew, 'A manned test run, and the Institute told us it was a probe? What else did they hide?'],
      [Speaker.Yuki, 'The signal was only four words: "Cache sealed. Needs power."'],
      w.flag(Flag.SawPanel)
        ? [Speaker.Andrew, 'The sealed crypt in Cologne, with the dead panel! That has to be his cache.']
        : [Speaker.Andrew, 'A sealed cache somewhere in Cologne, 1248. If I go back, I should look for it.'],
      [Speaker.Yuki, 'Your year display needs an optical lattice clock: there is one in the tower lab. The depot is full of superconducting tape, too.'],
    );
    return;
  }
  if (w.flag(progress.fixed('future'))) {
    await w.say([Speaker.Yuki, 'Go home, Dr. Ward. And when you get there, tell everyone what Chronos did.']);
    return;
  }
  await w.say([Speaker.Yuki, 'Junction box first, then the lab terminal. The cameras restart after twenty seconds, so move fast.']);
}

/** The machine's self-test: runs on arrival, so the HUD can list the parts right away. */
async function diagnose(w: WorldApi): Promise<void> {
  w.setFlag(progress.diagnosed('future'));
  w.sfx('error');
  await w.say(
    'DIAGNOSTIC REPORT  ·  Year: ▓▓▓▓  ·  Stability: 75%  ·  Damaged: chronometric reference, field coil superconductor.',
    [Speaker.Andrew, 'No time reference: that is why the year display never worked. I need a clock precise enough to measure a jump.'],
    [Speaker.Andrew, 'And the field coils need fresh superconductor. In 2087 there must be plenty of both... behind security.'],
  );
}

async function useMachine(w: WorldApi): Promise<void> {
  if (w.flag(progress.fixed('future'))) {
    await timeMachineMenu(w);
    return;
  }
  if (!w.flag(progress.diagnosed('future'))) await diagnose(w);
  const missing = PARTS.filter((part) => !w.has(part));
  if (missing.length > 0) {
    await w.say([Speaker.Andrew, msg().stillMissing({ items: itemList(missing) })]);
    return;
  }
  await w.say([Speaker.Andrew, 'Clock in, coils rewound... Moment of truth.']);
  w.machineGlitch(true);
  for (let i = 0; i < 4; i++) {
    w.sfx('hammer');
    await w.wait(0.35);
  }
  w.sfx('success');
  w.flash('#ffffff', 0.5);
  w.machineGlitch(false);
  w.setFlag(progress.fixed('future'));
  for (const part of PARTS) w.take(part);
  w.save();
  await w.say(
    'STABILITY 85%  ·  YEAR DISPLAY ONLINE: 2087 AD',
    [Speaker.Andrew, 'It shows the year! First time since the accident.'],
    [Speaker.Andrew, 'But to lock on to home, it needs a temporal core. Only the Institute could build those... and Pike.'],
  );
  if (!w.flag(progress.got('notes'))) await w.say([Speaker.Andrew, "Pike's cache in 1248 needs power. Yuki's Power Cell should do it."]);
  await timeMachineMenu(w);
}
