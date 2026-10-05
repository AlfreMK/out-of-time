/**
 * Sanity checks for the level data, runnable with plain Node (type stripping):
 *   npm run validate
 *
 * It runs each era's real setup() against a recording mock of the world API,
 * then checks that every referenced marker exists, that characters and items
 * stand on walkable tiles, that every interesting spot is reachable from the
 * arrival point, and that each puzzle gate can't be bypassed. One-way ledges
 * are respected: you can only cross them in their direction.
 */
import { ERAS } from '../src/eras/index.ts';
import type { ActorHandle, ChatSpec, CompanionHandle, EraDef, GateHandle, Route, RoutePoint, WorldApi } from '../src/eras/types.ts';
import { FACING_VECTORS, TileMap, type TilePoint, type TileRect } from '../src/game/tilemap.ts';

const errors: string[] = [];
const fail = (era: string, message: string): void => {
  errors.push(`[${era}] ${message}`);
};

const noop = (): void => {};
const handle: ActorHandle = { x: 0, y: 0, moveTo: async () => {}, moveBy: async () => {}, emote: noop, remove: noop };
const companionHandle: CompanionHandle = { ...handle, following: false, follow: noop, rest: noop, regroup: noop };
const gateHandle: GateHandle = { isOpen: false, open: noop, close: noop };

interface Recorded {
  points: Array<{ marker: RoutePoint; what: string; mustWalk: boolean }>;
  /** Markers of characters that physically block their tile (people, the machine, the T. rex). */
  solids: RoutePoint[];
  areas: Array<{ area: string | TileRect; what: string }>;
  routes: Array<{ route: Route; name: string; kind: string; posted: boolean; id?: string; group?: string }>;
  chats: ChatSpec[];
  gates: string[];
  /** Hidden allies present from the start (not ones spawned later by a flag). */
  allies: string[];
}

function record(def: EraDef): Recorded {
  const rec: Recorded = { points: [], areas: [], routes: [], gates: [], solids: [], allies: [], chats: [] };
  const point = (marker: RoutePoint, what: string, mustWalk = true): void => {
    rec.points.push({ marker, what, mustWalk });
  };
  const api: WorldApi = {
    era: def.id,
    has: () => false,
    give: noop,
    take: noop,
    flag: () => false,
    setFlag: noop,
    save: noop,
    say: async () => {},
    choose: async () => 0,
    toast: noop,
    wait: async () => {},
    sfx: noop,
    music: noop,
    shake: noop,
    flash: noop,
    fadeOut: async () => {},
    fadeIn: async () => {},
    machineGlitch: noop,
    watcher: (spec) =>
      rec.routes.push({ route: spec.route, name: routeName(spec.route), kind: spec.kind, posted: spec.posted === true, id: spec.id, group: spec.group }),
    chat: (spec) => rec.chats.push(spec),
    npc: (spec) => (point(spec.marker, `npc ${spec.name}`), rec.solids.push(spec.marker), handle),
    pickup: (spec) => point(spec.marker, `pickup ${spec.item}`),
    trigger: (spec) => rec.areas.push({ area: spec.area, what: 'trigger' }),
    hazard: (spec) => rec.areas.push({ area: spec.area, what: `hazard ${spec.kind}` }),
    sleeper: (spec) => (point(spec.marker, 'sleeper'), rec.solids.push(spec.marker)),
    companion: (spec) => (point(spec.marker, `companion ${spec.name}`), companionHandle),
    obstacle: (spec) => (point(spec.marker, `obstacle ${spec.look}`), handle),
    machine: (marker) => (point(marker, 'machine', false), rec.solids.push(marker)),
    inspect: (marker) => point(marker, 'inspect', false),
    inspectEach: (marker) => point(marker, 'inspect', false),
    checkpoint: (marker) => point(marker, 'checkpoint'),
    gate: (spec) => (point(spec.marker, `gate ${spec.look}`), rec.gates.push(spec.marker), gateHandle),
    decor: (marker) => point(marker, 'decor', false),
    decorEach: (marker) => (point(marker, 'decor', false), []),
    ally: (spec) => (point(spec.marker, `ally ${spec.name}`), rec.allies.push(spec.marker), handle),
    disable: noop,
    alarm: noop,
    enterYear: async () => 0,
    player: handle,
    travel: async () => {},
    ending: async () => {},
  };
  def.setup(api);
  def.objective(api);
  return rec;
}

/** How a route reads in messages: "AB", or "A 24,10 C". */
const routeName = (route: Route): string => (typeof route === 'string' ? route : route.map((p) => (typeof p === 'string' ? p : `${p[0]},${p[1]}`)).join(' '));

type Blocked = (tx: number, ty: number) => boolean;

/** BFS that respects one-way ledges. `blocked` adds extra impassable tiles. */
function reachable(map: TileMap, from: TilePoint, to: TilePoint, blocked: Blocked = () => false): boolean {
  const seen = new Set<number>([from.ty * map.width + from.tx]);
  const queue: TilePoint[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.tx === to.tx && cur.ty === to.ty) return true;
    for (const d of Object.values(FACING_VECTORS)) {
      const nx = cur.tx + d.x;
      const ny = cur.ty + d.y;
      const key = ny * map.width + nx;
      if (!map.inBounds(nx, ny) || seen.has(key)) continue;
      const target = nx === to.tx && ny === to.ty;
      if (!target && (map.isSolid(nx, ny) || blocked(nx, ny))) continue;
      const into = map.def(nx, ny).ledge;
      const outOf = map.def(cur.tx, cur.ty).ledge;
      if (into && FACING_VECTORS[into].x * d.x + FACING_VECTORS[into].y * d.y < 0) continue;
      if (outOf && FACING_VECTORS[outOf].x * d.x + FACING_VECTORS[outOf].y * d.y < 0) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return false;
}

const inRect = (r: TileRect, tx: number, ty: number): boolean => tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;

function validate(def: EraDef): void {
  const map = new TileMap(def.map, def.tiles, def.markerBase, def.defaultTile);
  const widths = new Set(def.map.map((row) => row.length));
  if (widths.size !== 1) fail(def.id, `rows have different widths: ${[...widths].join(', ')}`);
  for (const row of def.map) {
    for (const ch of row) {
      if (/[A-Z0-9]/.test(ch)) {
        if (!(ch in def.markerBase)) fail(def.id, `marker "${ch}" has no base tile`);
      } else if (!(ch in def.tiles)) {
        fail(def.id, `unknown tile "${ch}"`);
      }
    }
  }
  if (!map.hasMarker(def.arrival)) {
    fail(def.id, `arrival marker "${def.arrival}" missing`);
    return;
  }

  const walkable = (tx: number, ty: number): boolean => map.inBounds(tx, ty) && !map.isSolid(tx, ty);
  const start = map.marker(def.arrival);
  const rec = record(def);
  const gateTiles = new Set(rec.gates.filter((m) => map.hasMarker(m)).map((m) => `${map.marker(m).tx},${map.marker(m).ty}`));
  // Solid characters block their tile, except people meant to step aside after talking.
  const MOVES_ASIDE: Record<string, string[]> = { araucania: ['W', 'L'], medieval: ['G'] };
  const solidTiles = new Set(
    rec.solids
      .filter((m) => !(typeof m === 'string' && (MOVES_ASIDE[def.id] ?? []).includes(m)))
      .map((m) => map.routeTiles([m])[0])
      .filter((p) => p !== null)
      .map((p) => `${p.tx},${p.ty}`),
  );
  const pastGates: Blocked = (tx, ty) => solidTiles.has(`${tx},${ty}`);

  for (const { marker, what, mustWalk } of rec.points) {
    const p = map.routeTiles([marker])[0];
    if (!p || !map.inBounds(p.tx, p.ty)) {
      fail(def.id, `${what}: marker "${routeName([marker])}" missing`);
      continue;
    }
    if (mustWalk && !walkable(p.tx, p.ty)) fail(def.id, `${what} at ${p.tx},${p.ty} is on a solid tile`);
    // Interact from a neighboring walkable tile (gates are assumed open here).
    const spots = [p, { tx: p.tx, ty: p.ty + 1 }, { tx: p.tx, ty: p.ty - 1 }, { tx: p.tx + 1, ty: p.ty }, { tx: p.tx - 1, ty: p.ty }];
    if (!spots.some((s) => walkable(s.tx, s.ty) && reachable(map, start, s, pastGates))) fail(def.id, `${what} at ${p.tx},${p.ty} is unreachable`);
  }
  for (const { area, what } of rec.areas) {
    if (typeof area === 'string') {
      if (!map.hasMarker(area)) fail(def.id, `${what}: area marker "${area}" missing`);
    } else if (area.x < 0 || area.y < 0 || area.x + area.w > map.width || area.y + area.h > map.height) {
      fail(def.id, `${what}: area out of bounds`);
    }
  }
  const checkRoute = (route: Route, what: string): TilePoint[] | null => {
    const points = map.routeTiles(route);
    if (points.some((p) => p === null)) {
      fail(def.id, `${what} "${routeName(route)}" uses a missing marker`);
      return null;
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      if (!walkable(a.tx, a.ty)) fail(def.id, `${what} "${routeName(route)}" point ${a.tx},${a.ty} is solid`);
      else if (!reachable(map, a, b)) fail(def.id, `${what} "${routeName(route)}" can't walk ${a.tx},${a.ty} -> ${b.tx},${b.ty}`);
    }
    return points as TilePoint[];
  };
  const routeTiles = new Map<Route, TilePoint[]>();
  for (const { route } of rec.routes) {
    const points = checkRoute(route, 'route');
    if (points) routeTiles.set(route, points);
  }
  // Chatting pairs: both exist, and somewhere on their rounds they stand close enough to talk (48 px).
  for (const chat of rec.chats) {
    const speakers = chat.between.map((id) => rec.routes.find((r) => r.id === id));
    if (speakers.some((r) => !r)) {
      fail(def.id, `chat between "${chat.between.join('" and "')}" names a missing watcher`);
      continue;
    }
    const [a, b] = speakers.map((r) => routeTiles.get(r!.route) ?? []);
    const close = a.some((p) => b.some((q) => Math.hypot(p.tx - q.tx, p.ty - q.ty) * 16 <= 48));
    if (!close) fail(def.id, `chat between "${chat.between.join('" and "')}": their stops are never within talking distance`);
    if (chat.talks.length === 0 || chat.talks.some((t) => t.length === 0)) fail(def.id, `chat between "${chat.between.join('" and "')}" has an empty conversation`);
  }

  const closedGates: Blocked = (tx, ty) => gateTiles.has(`${tx},${ty}`);
  const at = (m: string): TilePoint => map.marker(m);
  const not = (m: string): Blocked => (tx, ty) => tx === at(m).tx && ty === at(m).ty;
  const any = (...checks: Blocked[]): Blocked => (tx, ty) => checks.some((c) => c(tx, ty));

  const quiet: Blocked = (tx, ty) => map.def(tx, ty).noise !== undefined;
  /** Tiles swept by the patrols that pass `include`: the boxes between consecutive route points. */
  const lanesOf = (include: (route: string, kind: string) => boolean): Set<string> => {
    const lanes = new Set<string>();
    for (const { route, name, kind } of rec.routes) {
      if (!include(name, kind)) continue;
      const pts = routeTiles.get(route);
      if (!pts) continue;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        for (let x = Math.min(a.tx, b.tx); x <= Math.max(a.tx, b.tx); x++) {
          for (let y = Math.min(a.ty, b.ty); y <= Math.max(a.ty, b.ty); y++) lanes.add(`${x},${y}`);
        }
      }
    }
    return lanes;
  };

  if (def.id === 'prehistory') {
    if (!reachable(map, at('X'), at('2'), quiet)) fail(def.id, 'no bone-free route from the cave entrance to the obsidian');
    if (reachable(map, start, at('3'), not('K'))) fail(def.id, 'the meteorite is reachable without moving the boulder');
    // Raptors guard the passages: the cave and Pip can't be reached without crossing a patrol...
    const lanes = lanesOf((_, kind) => kind === 'raptor');
    const onLane: Blocked = (tx, ty) => lanes.has(`${tx},${ty}`);
    if (reachable(map, start, at('X'), onLane) === false) fail(def.id, 'the hub is cut off by raptor lanes');
    if (reachable(map, start, at('2'), onLane)) fail(def.id, 'the cave is reachable without crossing a raptor patrol');
    if (reachable(map, start, at('P'), onLane)) fail(def.id, 'Pip is reachable without crossing a raptor patrol');
    // ...but no raptor patrols right next to the injured Pip.
    const pip = at('P');
    for (const key of lanes) {
      const [x, y] = key.split(',').map(Number);
      if (Math.hypot(x - pip.tx, y - pip.ty) < 8) fail(def.id, `a raptor lane passes too close to Pip (${x},${y})`);
    }
    const pass = map.markerArea('J');
    if (reachable(map, start, at('5'), (tx, ty) => inRect(pass, tx, ty))) fail(def.id, 'the summit is reachable without crossing the mountain pass');
  }
  if (def.id === 'medieval') {
    const door = map.markerArea('N');
    const sealed = any((tx, ty) => inRect(door, tx, ty), not('O'), (tx, ty) => map.get(tx, ty) === 'h' && tx === 39 && ty === 14);
    if (reachable(map, at('Z'), at('4'), sealed)) fail(def.id, 'the tower can be entered from the escape route');
    if (!reachable(map, at('4'), at('Z'))) fail(def.id, 'the escape route from the tower to the outside is broken');

    // Pike's notebook is inside the crypt, behind its Institute door.
    if (reachable(map, start, at('Q'), closedGates)) fail(def.id, "Pike's notes are reachable with the crypt door closed");

    // Meister Ulrich's yard: one gate, and a lane that runs right through Brutus.
    const yardGate: Blocked = (tx, ty) => tx === 36 && ty === 33;
    if (reachable(map, start, at('2'), yardGate)) fail(def.id, "the charcoal is reachable without going through the yard's gate");
    if (reachable(map, start, at('2'), not('D'))) fail(def.id, 'the charcoal is reachable without getting past Brutus');
    if (Math.hypot(at('D').tx - 36, at('D').ty - 33) > 3) fail(def.id, 'Brutus is too far from the yard gate to guard it');

    // The Archbishop's forest: the bridge is the only way in...
    const bridge: Blocked = (tx, ty) => tx === 24 && (ty === 44 || ty === 45);
    for (const m of ['P', 'W']) {
      if (reachable(map, start, at(m), bridge)) fail(def.id, `forest pickup "${m}" is reachable without crossing the bridge`);
      if (!reachable(map, at('L'), at(m), quiet)) fail(def.id, `no brushwood-free route from the bridge to "${m}"`);
    }
    // ...the forester's ride must be crossed...
    const ride = lanesOf((route) => route === 'R0');
    for (const m of ['P', 'W']) {
      if (reachable(map, start, at(m), (tx, ty) => ride.has(`${tx},${ty}`))) fail(def.id, `forest pickup "${m}" is reachable without crossing the forester's ride`);
    }
    // ...and the mill means sneaking past the boar, which no patrol walks next to.
    const boar = at('9');
    // Passing the boar means walking within earshot of footsteps (~2 tiles), or onto brushwood it can hear.
    const nearBoar: Blocked = (tx, ty) => {
      const d = Math.hypot(tx - boar.tx, ty - boar.ty);
      const crack = map.def(tx, ty).noise;
      return d <= 2.2 || (crack !== undefined && d * 16 <= crack);
    };
    if (reachable(map, start, at('P'), nearBoar)) fail(def.id, 'the spinning top is reachable without sneaking past the boar');
    for (const key of ride) {
      const [x, y] = key.split(',').map(Number);
      if (Math.hypot(x - boar.tx, y - boar.ty) < 3) fail(def.id, `the forester's ride passes too close to the boar (${x},${y})`);
    }
  }
  if (def.id === 'araucania') {
    const gate = map.markerArea('U');
    if (reachable(map, start, at('1'), (tx, ty) => inRect(gate, tx, ty))) fail(def.id, 'the fort can be entered without passing the gate');
    if (!reachable(map, at('1'), at('X'), (tx, ty) => inRect(gate, tx, ty))) fail(def.id, 'the breach exit out of the fort is broken');
    // The Mapuche camp is only reachable through its south path, past the sentry.
    const campPath: Blocked = (tx, ty) => tx === 8 && ty === 24;
    if (reachable(map, start, at('L'), campPath)) fail(def.id, 'the camp can be entered without using the south path');
    // The maqui glade is closed by a fallen trunk that only Pip can move.
    if (reachable(map, start, at('4'), not('Z'))) fail(def.id, 'the maqui is reachable without moving the fallen trunk');
    // Ayelén's brother hides behind the storehouse: his trutruka (150 px) has to reach the war dog.
    if (Math.hypot(at('T').tx - at('R').tx, at('T').ty - at('R').ty) * 16 > 150) fail(def.id, "Ayelén's brother is too far from the war dog for his horn to matter");
  }
  if (def.id === 'future') {
    if (reachable(map, start, at('1'), closedGates)) fail(def.id, 'the lab is reachable with the laser gates closed');
    if (reachable(map, start, at('U'), closedGates)) fail(def.id, 'the lobby is reachable with the tower gate closed');
    for (const m of ['6', '2']) if (reachable(map, start, at(m), closedGates)) fail(def.id, `depot item "${m}" is reachable with the depot door closed`);
    if (reachable(map, start, at('1'), not('P'))) fail(def.id, 'the optical clock is reachable without getting past the blast door');
    // The depot doorway can't be crossed without splashing, and a street drone always hears it:
    // the way in is to wait for a train to drown the splash out.
    const door = at('9');
    if (reachable(map, start, door, quiet)) fail(def.id, 'the depot door is reachable without splashing through a puddle');
    if (!def.train) fail(def.id, 'the depot doorway needs a passing train to cover its puddles, but the era has no train');
    const doorway: TilePoint[] = [];
    for (let y = door.ty - 2; y <= door.ty + 2; y++) for (let x = door.tx - 2; x <= door.tx + 2; x++) if (map.def(x, y).noise) doorway.push({ tx: x, ty: y });
    const splash = map.def(doorway[0]?.tx ?? 0, doorway[0]?.ty ?? 0).noise ?? 0;
    const listening = rec.routes.some((r) => {
      if (r.kind !== 'drone' || r.group !== 'street') return false;
      const pts = routeTiles.get(r.route) ?? [];
      const lane = [...lanesOf((name) => name === r.name)].map((k) => k.split(',').map(Number));
      return pts.length > 0 && lane.every(([x, y]) => doorway.some((p) => Math.hypot(p.tx - x, p.ty - y) * 16 <= splash));
    });
    if (doorway.length === 0 || !listening) fail(def.id, 'no street drone keeps the depot doorway puddles within earshot all along its beat');
  }
  if (def.id === 'ruins') {
    if (reachable(map, start, at('P'), not('K'))) fail(def.id, "Pike's lab is reachable without moving the column");
    if (reachable(map, start, at('P'), closedGates)) fail(def.id, "Pike's lab is reachable with its door closed");
    if (reachable(map, start, at('9'), closedGates)) fail(def.id, 'the mineral hall is reachable with its shutter closed');
    // Every showcase can be reached without stepping on broken glass, threading in from the shutter.
    const inside = { tx: at('7').tx + 1, ty: at('7').ty };
    for (const c of map.markerAll('9')) {
      const spots = [
        { tx: c.tx + 1, ty: c.ty },
        { tx: c.tx - 1, ty: c.ty },
        { tx: c.tx, ty: c.ty + 1 },
        { tx: c.tx, ty: c.ty - 1 },
      ];
      if (!spots.some((s) => walkable(s.tx, s.ty) && reachable(map, inside, s, quiet))) fail(def.id, `no quiet way to the showcase at ${c.tx},${c.ty}`);
    }
    // The nomad's station: one way down, past the feral pack's beat along the tracks.
    const stairs: Blocked = (tx, ty) => map.def(tx, ty).look === 'metrostairs';
    if (reachable(map, start, at('Y'), stairs)) fail(def.id, 'the Metro station is reachable without taking the stairs');
    const pack = lanesOf((route, kind) => kind === 'dog' && route === 'IL');
    if (reachable(map, start, at('Y'), (tx, ty) => pack.has(`${tx},${ty}`))) fail(def.id, "the nomad is reachable without crossing the dogs' beat");
  }

  // A posted sentry only leaves for a war horn: some ally's horn (150 px) has to reach it, or it never moves.
  for (const { route, name, posted } of rec.routes) {
    const post = routeTiles.get(route)?.[0];
    if (!posted || !post) continue;
    const heard = rec.allies.some((a) => map.hasMarker(a) && Math.hypot(map.marker(a).tx - post.tx, map.marker(a).ty - post.ty) * 16 <= 150);
    if (!heard) fail(def.id, `the sentry posted at "${name}" is out of reach of every ally's horn, so nothing can move it`);
  }
  console.log(`${def.id}: ${map.width}x${map.height}, ${rec.points.length} spawns, ${rec.routes.length} patrols, ${rec.areas.length} areas`);
}

for (const def of Object.values(ERAS)) validate(def);

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  throw new Error('Map validation failed.');
}
console.log('All maps OK.');
