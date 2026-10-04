# Out of Time

A small third-person stealth adventure about a scientist stranded across time, built with **TypeScript** and **Three.js**.

Dr. Andrew Ward of the Chronos Institute in Geneva, Switzerland, was running a routine one-hour test of the time machine. Something went wrong: the year display broke, the machine fell apart, and Andrew woke up 66 million years in the past. To get home he has to repair the machine with whatever each era offers, while avoiding everything that wants to eat him, arrest him or throw him out of a castle. Along the way he uncovers what the Institute has been hiding about Test Run #12 and its pilot, Aaron Pike.

The game aims to be **historically and scientifically accurate** wherever it can. The credits list the real history and science behind each era.

## Running it

Requirements: Node.js 20.19+ (tested with Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run build` | Typecheck and build a static site into `dist/` (relative paths, host it anywhere). |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |
| `npm run validate` | Check the level data: markers, walkable spawns, reachability, one-way ledges and puzzle gates. |

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` validates the levels, typechecks, builds and publishes `dist/` on every push to `main` (it can also be run manually from the Actions tab). One-time setup: in the repository, go to **Settings → Pages → Build and deployment** and choose **Source: GitHub Actions**. The build uses relative paths, so it works under `https://<user>.github.io/<repo>/`.

## Controls

Keyboard, gamepads (Xbox, PlayStation and other standard controllers) and touch screens all work. On-screen button prompts follow whichever you used last.

| Action | Keyboard | Xbox | PlayStation | Touch |
| --- | --- | --- | --- | --- |
| Move | WASD / Arrows | Left stick / D-pad | Left stick / D-pad | Joystick (drag anywhere on the left half) |
| Interact / advance dialogue | E / Space / Enter | A | ✕ | A |
| Sneak (silent footsteps) | Hold Shift | Hold B or LT (or tilt the stick gently) | Hold ○ or L2 (or tilt gently) | Hold B (or drag the joystick gently) |
| Use selected item | F | X or RT | □ or R2 | X |
| Switch item | Q | Y | △ | Y |
| Pause (journal, goal, inventory) | Esc / P | Menu | Options | Menu |
| Mute | M | | | Pause menu → Sound |

**Phones and tablets:** play in landscape (the game asks you to turn the phone sideways). On Android the ⛶ button goes fullscreen; on iPhone, *Share → Add to Home Screen* opens the game without the browser bars.

**Saving:** progress is stored in the browser (`localStorage`) every time you reach a checkpoint, pick something up or finish a story beat. Besides each era's fixed checkpoints, any quiet spot out of reach of every patrol (and away from sleeping beasts) becomes one as you walk through it, so being caught never sends you back past an enemy you already slipped by. **Continue** on the title screen resumes from your last checkpoint.

**Lost?** The pause menu shows your current goal and a **journal** with every line of dialogue so far (conversations repeated back to back show once). Scroll it with Up/Down (hold to keep going), page with Left/Right, or use the mouse wheel.

**Testing cheat:** type `letmetest` during play (like the old GTA codes) to toggle **god mode**: enemies can't see or catch you, hazards don't hurt you and you walk twice as fast. While it's on, the pause menu gets a **Debug** entry: give all items, unlock all eras, warp to any era, or repair the machine in the current era. God mode is never saved.

## How it plays

Each era follows the same loop: **explore → find materials → repair the machine → jump**. Each one also gives you something that changes how you can explore the other eras.

There is no combat. Enemies are moving puzzles:

- **Vision cones** are drawn on the ground. Staying inside one fills the suspicion meter; when it's full you're caught and sent back to the last checkpoint.
- **Cover** (ferns, bushes, quila thickets, dark alleys) hides you, unless an enemy is right next to you.
- **Noise matters.** Normal footsteps make a small noise ring, sneaking is silent, and bones and puddles always make noise. Guards and robots walk over to investigate sounds and tell you what they think in speech bubbles.

### 1. Late Cretaceous: Hell Creek, 66.5 million years ago (observe and hide)

- Sneak past feathered *Dakotaraptor* packs and a sleeping *T. rex* in a pitch-black cave.
- Heal **Pip**, a juvenile *Pachycephalosaurus*, who follows you and settles the head-butting debate by smashing boulders. Once the machine can carry two (after Cologne), come back for him and climb the rocky pass with the shield to find Pike's first cache and his nav module, which opens the next window. From then on Pip travels with you and his skull solves a puzzle in every era.
- Parts: hardened tree resin (not amber yet!), obsidian, meteoric iron.
- Locked area: a mountain pass under falling rocks. Come back with a shield.

### 2. Middle Ages: Cologne, 1248 (use objects)

- Help the villagers in the Archbishop's forest south of the village: sneak past the forester, his hound and a sleeping wild boar to fetch firewood for Agnes the baker (for rye bread, which bribes Brutus at the bell-founder's yard) and Jakob's spinning top from the mill (for his lucky pebbles and a secret).
- Bribe a dog with the bread so the bell-founder can cast a bronze gear, and throw pebbles to lure guards away from their posts.
- Meet **Albertus Magnus** in his tower lab (answer his riddle about mercury) and his student **Thomas Aquinas**.
- Escape through the archers' gallery while crossbowmen shoot down from balconies on the upper floor, then climb onto a landing outside the wall and jump down. It's one-way, so the exit can't be used as an entrance.
- Locked area: a sealed crypt with a glowing panel that clearly doesn't belong in 1248.

### 3. Araucanía: near Fort Tucapel, 1553 (cooperate)

- **Lautaro** (Leftraru) explains the plan: blow a *pifilka* whistle and his hidden scouts sound the *trutruka* to pull Spanish soldiers away from their posts.
- Find the children's lost pali so Ayelén gives you her pifilka, then slip into the palisade fort past arquebusiers, a mounted patrol and a Spanish war dog (distract it with the rye bread you brought from Cologne) for a lodestone and the gold, locked in the captain's iron strongbox until Pip's skull cracks it.
- Find the children's *pali* so they can keep playing palín: Ayelén's brother joins as an extra scout.
- Bring *maqui* to the **machi** for a wounded warrior and she gives you *foye* (canelo) bark, a Mapuche remedy for scurvy you'll need later.

### 4. Neo-Tokyo, 2087 (manipulate systems)

- A neon-lit Tokyo night in the June rainy season: Hachikō's statue, a Shinto shrine with a big torii and ema plaques, Yamanote Line trains rolling along a viaduct, rows of vending machines, a giant virtual-idol hologram over the avenue, and the Chronos Corp tower.
- **Yuki**, a hacker who leaked Chronos's files, recognizes you. Recover her cyberdeck from the maglev depot (its door code is hidden in plain sight, between the shrine and a talkative commuter) and she rigs your multitool to hack terminals (switching off cameras, drones and bots) and gives you a power cell, which opens the crypt in 1248. Avoid puddles that splash.
- Steal an optical lattice clock (the fix for the broken year display; Pip has to ram a jammed blast door behind the lab's laser) and superconducting tape.

### 5. The Long Drought: Madrid, 2240 (combine everything)

- A city emptied by drought: the dry bed of the Manzanares, a ruined Metro entrance, a nomad trader and packs of feral dogs.
- Inside the Museo Nacional de Ciencias Naturales: the Megatherium (the first fossil skeleton ever mounted, 1788) and Pike's notes about his own journey.
- Pip is too parched to charge in the heat: go down into the dark, abandoned Metro station, slip past a feral pack and trade the nomad your rye bread from Cologne for water.
- Break through with Pip, keep your shield up under the collapsing roof, power the doors, cure Pike's scurvy, hack your way into the blacked-out mineral hall for the quartz his core needs (mind the old guide robot), install the temporal core and **work out the year you left** from clues gathered along the way.

## Project structure

```
src/
  main.ts                 Entry point
  engine/                 Framework-agnostic basics: screen, keyboard + gamepad + touch input, procedural audio, text
  game/
    game.ts               Main loop and scene transitions
    flow.ts               New game, continue from checkpoint, travel, ending
    world.ts              A playable era: entities, stealth rules, triggers, hazards, HUD, pause menu, journal
    entities/             Player, watchers (dinosaurs, guards, soldiers, robots) and props; state only
    tilemap.ts            Grid, markers, collision, one-way ledges and line of sight
    state.ts              Inventory, flags, checkpoint and journal, with validated, versioned saves
    ui.ts                 Dialogue box, choice menu, year picker, panels
  render/
    materials.ts          Toon (cel-shaded) materials, outlines, x-ray silhouette
    primitives.ts         Box/ball/cylinder helpers that every model is built from
    humans.ts             Style-driven characters for every era
    creatures.ts          Dinosaurs, a dog and a horse
    machines.ts           The time machine, cameras, drones and robots
    props3d.ts            Items, gates and set dressing
    terrain.ts            Turns each tile map into instanced 3D scenery
    world-view.ts         Scene, lighting, weather, follow camera, vision cones, particles, cave darkness
    sets.ts               Hand-built sets for the title, intro, time tunnel and ending
  eras/
    *-map.ts              ASCII level layouts
    prehistory.ts …       One file per era: spawns, puzzles, music zones, objectives and story scripts
    shared.ts             Time machine destination menu and the final year puzzle
  scenes/                 Title, intro cinematic, time travel, ending
scripts/
  validate-maps.ts        Level data checks (runs in plain Node)
```

### Authoring levels

Levels are ASCII grids (one character per tile). Lowercase letters and symbols are tiles; **uppercase letters and digits are markers** that the era scripts refer to. A marker that appears twice defines a rectangular area. Each `*_MARKER_BASE` table says which tile sits under each marker.

Era files are declarative plus async story scripts, and they only talk to the `WorldApi` interface (`src/eras/types.ts`):

```ts
w.watcher({ kind: 'guard', route: 'AC', caught: GUARD_CAUGHT });
w.ally({ marker: 'A', look: 'weichafe', name: 'Scout', talk: scoutLines });
w.trigger({ area: 'L', block: true, when: (w) => !w.has('shield'), run: (w) => w.say(['Andrew', 'Crossbow bolts everywhere!']) });
```

Since era scripts never touch rendering code, `npm run validate` can run them in Node.

### Art and audio

Everything is generated in code: there are no image, model or audio files. Characters are low-poly primitives with cel-shaded materials and outlines, in a chunky, colorful style inspired by *Pizza Possum*. Music is synthesized with the Web Audio API and changes with the area you're in (open jungle, the T. rex cave, the castle, the Spanish fort, rainy Neo-Tokyo…).

### A note on languages

Andrew wears a translator earpiece, which explains why the guards in Cologne speak English with a heavy German accent (they're really speaking Middle High German). Spanish soldiers' speech bubbles stay in Spanish, and Mapudungun words (*mari mari*, *peñi*, *chaltu may*, *machi*, *ruka*, *foye*) are used where they fit.

## Dependencies and security

- Runtime: [`three`](https://threejs.org/) (actively maintained).
- Development: `typescript`, `vite`, `@types/three`.
- No secrets, accounts or network calls. The only storage is `localStorage` for saves, and saved data is validated (and migrated from older versions) before it's loaded.
- Before deploying, check dependencies with `npm audit` (or enable Dependabot / Snyk on the repository).
