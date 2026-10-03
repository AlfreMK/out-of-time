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

**Story.** Dr. Elias Ward of the Chronos Institute (Geneva, 2026) runs Test Run #47 and gets stranded in time. Each repair raises the machine's stability and opens the next "window". He uncovers that Test Run #12 (Dr. Aaron Pike, October 2019) was secretly manned. The ending happens 60 seconds after departure, back in the Geneva lab, with Nora (his colleague) and Pike.

**Final puzzle.** The player must enter the origin year **2026** (`HOME_YEAR` in `src/eras/shared.ts`). The clues: in 2087 Yuki's leaked Chronos file says #47 was lost 61 years earlier; Pike says #47 was scheduled 7 years after his run in 2019. (Nora only appears in the 2026 lab: the user found an aged Nora in 2087 odd, so she was replaced by Yuki.)

| # | Era (`EraId`) | Place / year | Mechanic it teaches | Machine parts | Reward / key item | Locked area (opened later) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `prehistory` | Hell Creek, Laramidia, 66.5 Ma | Observe & hide (cones, fern cover, sleeping T. rex, bone noise) | Hardened Resin, Obsidian, Meteoric Iron | **Pip** (juvenile *Pachycephalosaurus*) rams boulders | Mountain pass under rockfall → needs the **shield** → Pike's recorder |
| 2 | `medieval` | Cologne (Archbishop's castle), 1248 | Use objects (bread → dog, pebbles → guards) | Bronze Gear (bell-founder), Quicksilver (Albertus Magnus) | **Shield** (heater shield, Cologne cross) | Sealed crypt panel → needs the **power cell** (2087) → Pike's notes (unlocks 2240) |
| 3 | `araucania` | Near Fort Tucapel, Chile, Dec 1553 | Cooperate: **pifilka** whistle → hidden Mapuche scouts blow the trutruka as a diversion; charqui distracts the Spanish war dog | Gold Nugget, Lodestone (Spanish fort) | **Foye bark** from the machi, after bringing her maqui (cures Pike's scurvy) | n/a |
| 4 | `future` | Neo-Tokyo, 2087 (rainy season) | Manipulate systems: hack terminals to disable cameras/drones/bots (only after returning Yuki's cyberdeck from the depot); noisy puddles | Optical Clock, Superconductor (REBCO tape) | **Power cell** from Yuki | n/a |
| 5 | `ruins` | Madrid, 2240 (after a long drought) | Combine everything | Temporal Core (from Pike) | Ending | Needs Pip (fallen column), shield (falling debris), power cell (lab door), foye bark (Pike) |

Side content per era: Cologne (Jakob's spinning top → pebbles; Agnes's firewood → bread), Araucanía (the children's palín ball → an extra scout; Rayen's charqui; pudú, charqui rack, horse corral), Neo-Tokyo (Shinto shrine and priest, ramen stand), Madrid (dry Manzanares, Metro sign, nomad trader, feral dogs, Megatherium, Pike's three notes, meteorite showcase).

Progression flags: `fixed:<era>` (machine repaired), `visited:<era>`, `diag:<era>` (diagnosis seen, so the HUD lists part names), `got:<item>`. Era windows are discovered via `DISCOVERED_BY` in `shared.ts`. Pip only travels to 2240, via the "Take Pip along?" prompt in the prehistory time machine (`pipAboard`), and is returned home before the ending.

**Historical figures:** Albertus Magnus and Thomas Aquinas (1248 Cologne; Albert's mercury riddle), Lautaro/Leftraru (1553). Mentioned: Archbishop Konrad von Hochstaden, Valdivia, Caupolicán, Hachikō's statue (Shibuya).

**Debug cheat:** typing `letmetest` during play toggles god mode (undetectable, invulnerable, 2× speed) and adds a pause-menu **Debug** entry: give all items, unlock all eras, warp to era, repair this era's machine. Never saved.

## Accuracy decisions (keep consistent)

- Cretaceous: no grass (cover = ferns/horsetails), resin is not yet amber, *Dakotaraptor* is feathered and ~4.5–6 m (rendered at 1.6×), Pachycephalosaurus dome-butting is "debated", Chicxulub is ~0.5 Myr later, Quetzalcoatlus-like pterosaurs in the intro.
- 1248: old cathedral burned in April, foundation stone in August; Albert arrived in Cologne with Thomas that year; crossbows, heater shields, charcoal (not mineral coal), rye bread, a **bell-founder** casts bronze. Guards speak "Middle High German" rendered by Elias's **translator earpiece** as German-accented English ("zis", "ze").
- 1553: Lautaro served Valdivia as a groom; Battle of Tucapel on Dec 25, 1553 (Elias deliberately doesn't spoil it); rukas face east; foye = *Drimys winteri* (John Winter, 1578, scurvy); Spanish soldiers with morions, cuirasses, arquebuses, Cross of Burgundy; Spanish barks stay in Spanish; Mapudungun words (*mari mari, peñi, chaltu may, lof, lawen, weichafe, wingka, pewkallal*).
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

Key rule: **entities hold state, render/ draws it**, and **era scripts only use `WorldApi`** (no DOM imports), which is why `npm run validate` can run them in Node.

### Systems worth knowing

- **Maps**: ASCII rows; lowercase/symbols are tiles (per-era `TileSet` in `tiledefs.ts`), uppercase/digits are markers (`*_MARKER_BASE` gives the tile under each). A marker used twice is an area (bounding box). `TileDef` flags: `solid, hide, noise, dark, low, seeThrough, ledge (one-way direction), height (visual only)`.
- **Watchers** (`entities/watcher.ts`): kinds raptor/guard/soldier/rider/dog/camera/drone/bot; patrol via BFS between route markers; suspicion meter; `hear()` with per-kind hearing; barks; `group` + `w.disable(group, s)` for hacking.
- **Hazards**: `rocks` (falling, shield protects) and `arrows` (sideways, or from `shooters` markers = the archers on medieval balconies).
- **Allies + pifilka**, **gates** (laser/door/palisade with `openFlag`), **decor** (statues, flags, archers, whale), **companion** (Pip follows the player's trail).
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
- `MeshToonMaterial` has no `flatShading`; `pivot()` must not call `add()` with zero children.
- Map edits: keep row widths constant; markers replace tiles (set the base in `*_MARKER_BASE`).

## Ideas / not done yet

- Playtest balance on a real GPU; test with Xbox/PS controllers.
- More interior detail (castle, fort), more NPC life in towns, more ambient creatures.
- Possible extra eras or side quests (the user liked the medieval side quests: Jakob's spinning top, Agnes's firewood).
