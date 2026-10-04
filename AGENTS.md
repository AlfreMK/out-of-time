# Out of Time: context for agents

Read this first when picking the project up in a new chat or with another agent. It captures what has been decided so far, so the user doesn't have to explain it again. `README.md` is the player/developer-facing overview; this file covers intent, preferences, decisions and gotchas.

## Working with the user

- **Chat in Spanish**, but **everything in the repo is American English**: code, comments, dialogue, README, commit messages.
- Stack is fixed: **TypeScript + Three.js + Vite**, no game framework. Keep dependencies minimal (runtime: only `three`). Follow the org rules: no secrets, no hardcoded credentials, safe defaults, suggest `npm audit`/Dependabot before deploying.
- **Historical and scientific accuracy is a top priority.** Every fact in dialogue, item names and visuals should be checkable (see "Accuracy decisions" below). When fiction is needed (Pike, Chronos, the time machine), keep it plausible and don't contradict known history.
- **Only the Araucanía era is set in Chile.** The other eras are elsewhere (Europe, Asia).
- The user plays the game and reports issues with short messages. They like things to feel "real": visible archers, believable ledges, longer distances, more to do.
- Rejected ideas: **no noclip / walking through walls**, even in debug mode.
- **No commits yet.** Ask before committing; if on `main`, branch first.

## The game

A small third-person stealth adventure with a cel-shaded, chunky low-poly look (inspired by *Pizza Possum*/*Sifu*), a high follow camera, and no combat. Enemies are moving puzzles with vision cones, hearing and speech-bubble barks.

**Story.** Dr. Andrew Ward of the Chronos Institute (Geneva, 2026) runs Test Run #47 and gets stranded in time. Each repair raises the machine's stability and opens the next "window". He uncovers that Test Run #12 (Dr. Aaron Pike, October 2019) was secretly manned. The ending happens 60 seconds after departure, back in the Geneva lab, with Nora (his colleague) and Pike.

**Final puzzle.** The player must enter the origin year **2026** (`HOME_YEAR` in `src/eras/shared.ts`). The clues: in 2087 Yuki's leaked Chronos file says #47 launched 61 years earlier (everything after the jump was wiped, so nobody knows what happened to Andrew: no paradox with the ending; Yuki's Pike lines depend on whether Andrew has the recorder / saw the crypt panel); Pike says #47 was scheduled 7 years after his run in 2019. (Nora only appears in the 2026 lab: the user found an aged Nora in 2087 odd, so she was replaced by Yuki.)

| # | Era (`EraId`) | Place / year | Mechanic it teaches | Machine parts | Reward / key item | Locked area (opened later) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prehistory` | Hell Creek, Laramidia, 66.5 Ma | Observe & hide (cones, fern cover, sleeping T. rex, bone noise) | Hardened Resin, Obsidian, Meteoric Iron | **Pip** (juvenile *Pachycephalosaurus*) rams boulders | Mountain pass under rockfall → needs the **shield** → Pike's recorder |
| 2 | `medieval` | Cologne (Archbishop's castle), 1248 | Use objects (bread → dog, pebbles → guards) | Bronze Gear (bell-founder), Quicksilver (Albertus Magnus) | **Shield** (heater shield, Cologne cross) | Sealed Institute door in the chapel → the **power cell** (2087) opens it → walk into the dark crypt and pick up Pike's notes (with his spare **Field Emitter** in the crate), which installs itself the next time the machine menu opens and unlocks 2240 (`emitterInstalled`) |
| 3 | `araucania` | Near Fort Tucapel, Chile, Dec 1553 | Cooperate: **pifilka** whistle (Ayelén trades hers for the children's lost pali) → hidden Mapuche scouts blow the trutruka as a diversion; Pip cracks the captain's iron strongbox with the gold; the rye bread from Cologne distracts the Spanish war dog (Rayen no longer gives charqui) | Gold Nugget, Lodestone (Spanish fort) | **Foye bark** from the machi, after bringing her maqui (cures Pike's scurvy) | n/a |
| 4 | `future` | Neo-Tokyo, 2087 (rainy season) | Manipulate systems: the depot door needs a code (1925: an ema at the shrine says it's the year the Yamanote Line became a loop, and the commuter knows when that was); hack terminals to disable cameras/drones/bots (only after returning Yuki's cyberdeck from the depot); Pip rams the jammed blast door behind the lab's laser; noisy puddles | Optical Clock, Superconductor (REBCO tape) | **Power cell** from Yuki | n/a |
| 5 | `ruins` | Madrid, 2240 (after a long drought) | Combine everything: Pip is too parched to charge until he drinks (the nomad in the dark Metro station trades water for Cologne's rye bread, past a feral pack); hack the mineral hall's shutter with Yuki's exploits, thread between crunching broken glass so the sleeping guide bot (a `dormant` watcher: blind and deaf to footsteps, it wakes only for loud noises and powers down again at its post) stays asleep, and pick the real quartz out of five visible specimens (calcite, beryl, pyrite, quartz, fluorite; Pike: six-sided and pointed, beryl is flat-topped). A wrong pick sets off the case's alarm (`w.alarm`) | Temporal Core (Pike rebuilds its quartz oscillator) | Ending | Needs Pip (fallen column), shield (falling debris), power cell (lab door), foye bark + quartz (Pike) |

Side content per era: Cologne (the Archbishop's forest south of the village, entered by a single bridge: the forester patrols the ride, the woodcutter's hound guards the clearing with Agnes's firewood → bread, and a sleeping wild boar lies in the bend of a zigzag trail to the mill (the trail passes just north and then just south of it; the straight shortcut is dry brushwood within its earshot, validated) where Jakob's spinning top is → pebbles; the bread is mandatory to get past Brutus, who sits in the 1-tile lane of the bell-founder's fenced yard), Araucanía (the children's palín ball → Ayelén's pifilka + her brother as an extra scout, hidden in quila right behind the storehouse so his trutruka turns the war dog's head (validated: within 150 px of its post); Rayen's tip about the war dog; pudú, charqui rack, horse corral), Neo-Tokyo (a fenced Shinto shrine with a big torii, stone lanterns, a hall and an ema rack; the Yamanote Line viaduct along the bottom of the plaza with a passing train; a row of vending machines; a ramen yatai (counter, stools, noren, red akachōchin lanterns, steaming pot) by the west canal bridge; a giant hologram of Hoshi Kirara, an original virtual idol (pink twin tails, deliberately not Hatsune Miku);  the avenue has a planted median with lamps and zebra crossings at the bridges, and people/vending machines/billboards stand on the sidewalks, never in the road), Madrid (dry Manzanares, the Metro entrance leading down to a dark station with the nomad's camp, campfire and cistern, the feral pack in the tunnel, the mineral hall wing, Megatherium, whale skeleton; Pike's lab has his camp cot, towers of rescued books and his journal (the notes about his first three jumps); the main hall's cases show what they hold (the meteorite, an ammonite, a trilobite, a stuffed Iberian lynx, a dodo model, and from 2087 Yuki's cyberdeck labeled as the tool of the Chronos Leaks that brought the corporation down, an optical lattice clock and a Hoshi Kirara figure), among smashed cases, fallen ceiling, blown-in sand and litter).

Progression flags: `fixed:<era>` (machine repaired), `visited:<era>`, `diag:<era>` (diagnosis seen, so the HUD lists part names; each era's `diagnose()` runs automatically on arrival), `got:<item>`. Era windows are discovered via `DISCOVERED_BY` in `shared.ts`. **The story is linear on purpose** (out-of-order play caused soft-locks): Hell Creek → Cologne (its repair adds passenger capacity, no new window) → back to Hell Creek: the shield gets you up the rocky pass to Pike's cache #1 (recorder + **Nav Module**; installing it reveals Araucanía, `navInstalled`) and Pip boards (`pipAboard`) → Araucanía → Neo-Tokyo → Cologne crypt (Field Emitter) → Madrid. Pip then travels everywhere (`pipAlong()` in `shared.ts`); people react to him the first time they meet him (in Cologne most take him for a dragon: Agnes, Ulrich, Jakob, Gertrud, the gate guard, Thomas and Albert; in Araucanía Lautaro, the machi, Rayen, Ayelén, the kid and the sentry; Yuki, and in Neo-Tokyo the vendor, commuter, courier and priest via `pipReaction()`, plus puzzled drone barks) and solves a puzzle per era: boulder (Hell Creek), fallen coihue over the maqui glade and the captain's gold strongbox (Araucanía), jammed blast door in front of the optical clock (Neo-Tokyo), museum column (Madrid). He is returned home before the ending. Repairs consume their parts. The Madrid machine can always jump back to known windows, even without the core, so nothing strands the player there. `GameState` upgrades older saves (`upgrade()` in `state.ts`).

**Historical figures:** Albertus Magnus and Thomas Aquinas (1248 Cologne; Albert's mercury riddle), Lautaro/Leftraru (1553). Mentioned: Archbishop Konrad von Hochstaden, Valdivia, Caupolicán, Hachikō's statue (Shibuya).

**Debug cheat:** typing `letmetest` during play toggles god mode (undetectable, invulnerable, 2× speed) and adds a pause-menu **Debug** entry: give all items, unlock all eras, warp to era, repair this era's machine, and **restart this era** (takes back the era's items, by `ITEMS[item].era`, and flags, via `eraFlags(era)` in `flags.ts`, then reloads it from the arrival point). God mode is never saved.

## Accuracy decisions (keep consistent)

- 1248 forest: a lord's *Bannforst* (hunting reserve) where commoners risk being taken for poachers; wild boars rest in thickets by day; charcoal came from earth-covered kilns in the woods; water mills were common on Rhineland streams; wattle fences around village yards.
- Cretaceous: no grass (cover = ferns/horsetails), resin is not yet amber, *Dakotaraptor* is feathered and ~4.5–6 m (rendered at 1.6×), Pachycephalosaurus dome-butting is "debated", Chicxulub is ~0.5 Myr later, Quetzalcoatlus-like pterosaurs in the intro.
- 1248: old cathedral burned in April, foundation stone in August; Albert arrived in Cologne with Thomas that year; crossbows, heater shields, charcoal (not mineral coal), rye bread, a **bell-founder** casts bronze. Villagers speak "Middle High German" rendered by Andrew's **translator earpiece** as German-accented English ("zis", "ze"); guards' and the forester's barks and shouts stay in (modern, readable) German, like the Spanish soldiers' in Araucanía.
- 1553: Lautaro served Valdivia as a groom; Battle of Tucapel on Dec 25, 1553 (Andrew deliberately doesn't spoil it); rukas face east; foye = *Drimys winteri* (John Winter, 1578, scurvy); Spanish soldiers with morions, cuirasses, arquebuses, Cross of Burgundy; Spanish barks stay in Spanish; Mapudungun words (*mari mari, peñi, chaltu may, lof, lawen, weichafe, wingka, pewkallal*).
- 2087: the Yamanote loop was completed in November 1925 (Kanda–Ueno link); its trains are silver with a yellow-green stripe; ema are wooden wish plaques at Shinto shrines.
- 2240 exhibits: ammonites died out with the non-avian dinosaurs (66 Ma); trilobites lasted ~270 Myr until the end-Permian; the Iberian lynx fell below 100 in 2002 and recovered to the thousands by the 2020s; the last accepted dodo sighting was 1662.
- 2240: quartz is piezoelectric (quartz oscillators keep time in watches); most Madrid Metro stations lie some 15–20 m underground, cooler than the surface.
- 2087/2240: speculative but grounded in real tech (optical lattice clocks, REBCO, solid-state batteries) and real climate projections (drought and desertification risk in central Spain).

## Architecture

```
src/engine/    screen (WebGL + 2D UI layer at logical 320x180), input (keys, gamepad, glyphs, cheats), audio (procedural music themes + SFX), text
src/game/      game loop & fades, flow (scene transitions), world (the playable-era Scene: systems, HUD, pause, journal, debug),
               entities/ (state only: player, watcher, props), tilemap (markers, collision, ledges, LOS), state (save v2), ui
src/render/    three.js views: materials (toon, outline, silhouette), primitives, humans, creatures, machines, props3d, terrain (instanced), world-view, sets (cinematics)
src/eras/      one file per era + *-map.ts ASCII maps, types.ts (WorldApi/EraDef), shared.ts (machine menu, final puzzle), info.ts
src/scenes/    title, intro (3D cinematic), travel (tunnel), ending (lab + credits with accuracy notes)
scripts/       validate-maps.ts (runs in Node with type stripping)
```

Story flags come from the `Flag` const object in `src/game/flags.ts` (`w.flag(Flag.AraTrunk)`), and per-era/per-item flags from its builders (`progress.fixed(era)`, `progress.visited(era)`, `progress.diagnosed(era)`, `progress.got(item)`). `flag()`, `setFlag()`, `once` and `openFlag` only accept `FlagName`, so add new flags to `Flag` first; the saved string values must not change (old saves depend on them).

Dialogue speakers come from the `Speaker` const object in `src/game/speakers.ts` (`[Speaker.Andrew, '...']`); `Line` only accepts those names, so add new characters there first. NPC `name`s use it too.

Key rule: **entities hold state, render/ draws it**, and **era scripts only use `WorldApi`** (no DOM imports), which is why `npm run validate` can run them in Node.

### Systems worth knowing

- **Maps**: ASCII rows; lowercase/symbols are tiles (per-era `TileSet` in `tiledefs.ts`), uppercase/digits are markers (`*_MARKER_BASE` gives the tile under each). A marker used twice is an area (bounding box). `TileDef` flags: `solid, hide, noise, dark, low, seeThrough, ledge (one-way direction), height (visual only)`.
- **Watchers** (`entities/watcher.ts`): kinds raptor/guard/soldier/rider/dog/camera/drone/bot; patrol via BFS between route markers; suspicion meter; `hear()` with per-kind hearing; barks; `group` + `w.disable(group, s)` for hacking.
- **Hazards**: `rocks` (falling, shield protects) and `arrows` (sideways, or from `shooters` markers = the archers on medieval balconies).
- **Era API helpers**: `inspectEach(marker, label, (w, i) => …)` and `decorEach(marker, kinds)` act on every occurrence of a marker in reading order (the mineral hall's five showcases share `9`); `alarm(radius)` makes a noise at the player.
- **Allies + pifilka**, **gates** (laser/door/palisade with `openFlag`), **decor** (statues, flags, archers, whale), **companion** (Pip follows the player's trail).
- **Cutaway walls** (`terrain.ts`): wall tiles 1–2 rows south of an interior floor (`INTERIOR_LOOKS`) go in one group per floor look, which sinks only while the player stands on that floor (e.g. Pike's lab wall stays up while you walk the museum gallery, and sinks when you step onto the lab floor).
- **Music**: `EraDef.music`, `musicZones`, `darkMusic`; `w.music(theme|null)` overrides (alarm).
- **Saves**: `localStorage` key `out-of-time.save`, version 2 (items, flags, checkpoint, journal log), validated and migrated from v1. Checkpoints save on activation; Continue spawns at the last checkpoint.
- **UI**: dialogue box (records to the journal; `{interact}`-style tokens become device glyphs), auto-sizing choice menu, year picker, pause menu (goal from `EraDef.objective`, journal, controls by device, inventory).

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` (push to `main` or manual run): `npm ci` → `npm run validate` → `npm run build` → upload `dist/` → deploy. The repo setting **Pages → Source: GitHub Actions** must be enabled once. `vite.config.ts` uses `base: './'`, so the site works under a repo subpath. The `window.__game` dev hook is stripped from production builds.

## Testing

1. `npm run typecheck`, `npm run validate`, `npm run build` must all pass. The validator checks marker/tiles, walkable spawns, reachability (solid NPCs block their tile), patrol routes, one-way ledges, and per-era puzzle gates (e.g. the cave and Pip need a raptor crossing and Pip is ≥8 tiles from any patrol, the fort/tower/lab/museum can't be bypassed). **Add a validator check whenever you add a gate.**
2. Visual/flow testing: run `npx vite --port 5199`, then drive headless Chrome with `puppeteer-core` installed in the **scratchpad** (not the project), using `/Applications/Google Chrome.app/...` with `--use-angle=swiftshader --enable-unsafe-swiftshader`. In dev, `window.__game` is exposed. Load a state by writing a v2 save JSON to `localStorage['out-of-time.save']`, then `await import('/src/game/flow.ts')` and `continueGame(window.__game)`. Software rendering runs at ~10–14 fps (slower while shaders compile), so **space key presses ≥400 ms apart** and wait for `scene.constructor.name === 'World'` and `!game.transitioning`.
3. Not yet verified: a real gamepad, real-GPU frame rate and difficulty balance, the full credits scroll.

## Gotchas (learned the hard way)

- The shell is zsh with **`noclobber`** (use `>|` to overwrite), and **`rm`/`cp` are interactive aliases**: use `/bin/rm -f`, `/bin/cp -f`, or the command hangs (and can leave files half-edited while the user's dev server hot-reloads them).
- `tsconfig` uses `erasableSyntaxOnly`: no enums, no constructor parameter properties. Import local files **with the `.ts` extension**.
- A solid NPC on a 1-tile-wide doorway blocks the route (happened with Brother Thomas). Keep NPCs off chokepoints; the validator now catches it.
- Area-triggered cutscenes assume the player arrives from one side. Either enclose the area so there is a single entrance (the Mapuche camp has a rock ring, open only on its south path; validated), or move NPCs relative to the player (`moveBy` toward `w.player`) instead of to fixed markers.
- `Entity.height` is the character's size for overhead UI. Don't reuse the name in subclasses (the bolt uses `altitude`).
- Avoid coplanar faces in `terrain.ts` (z-fighting flickers, e.g. the brown house trim used to share the wall's top face): offset details slightly proud of the surface and inset overlapping blocks (cutaway stubs are 0.98 wide). The sun's shadow camera is snapped to whole texels (`world-view.ts`) so shadows don't shimmer as the camera moves.
- `MeshToonMaterial` has no `flatShading`; `pivot()` must not call `add()` with zero children.
- Map edits: keep row widths constant; markers replace tiles (set the base in `*_MARKER_BASE`). Markers are only `A-Z0-9`, and the medieval map uses all 36: use explicit `TileRect`s for trigger areas instead of new markers.
- The camera looks from the south at a high angle: a tall tile (tree, wall, roof) right south of something small hides it. Pickups (yellow glow + blue silhouette), the player (blue) and enemies (red silhouette, `addSilhouette()` in `entity-views.ts`) show through scenery, and vision cones draw on top, but keep patrol lanes readable anyway: no trees in the 2 rows right south of a patrol (the forester's ride has low blackberry brambles `v` instead).
- Inspect spots (signs, panels, statues) answer on their whole tile (`findInteractTarget`); before, the prompt only showed up in a tiny circle.
- Neo-Tokyo: buildings in the map's bottom row and the railway viaduct are drawn low on purpose, so they don't hide the plaza from the camera.
- Noisy tiles sound the moment the player steps onto them (`Player`), not only on the footstep timer, which used to let a fast walk skip a single bone, puddle or glass tile.
- Headless testing: Chrome may see a gamepad attached to the Mac, and its stick overrides the keyboard. Stub it with `page.evaluateOnNewDocument(() => { navigator.getGamepads = () => []; })`.

## Ideas / not done yet

- Playtest balance on a real GPU; test with Xbox/PS controllers.
- More interior detail (castle, fort), more NPC life in towns, more ambient creatures.
- Possible extra eras or side quests (the user liked the medieval side quests: Jakob's spinning top, Agnes's firewood).
