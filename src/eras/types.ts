import type { MusicTheme, SfxName } from '../engine/audio.ts';
import type { EmoteKind, NpcLook } from '../game/looks.ts';
import type { SpeakerName } from '../game/speakers.ts';
import type { EraId, ItemId } from '../game/state.ts';
import type { TileSet } from '../game/tiledefs.ts';
import type { TileRect } from '../game/tilemap.ts';
import type { FlagName } from '../game/flags.ts';

/** A line of dialogue: plain strings are narration, tuples have a speaker (always from `Speaker`). */
export type Line = string | readonly [speaker: SpeakerName, text: string];

export type Script = (w: WorldApi) => Promise<void> | void;
export type Condition = (w: WorldApi) => boolean;
export type Facing = 'up' | 'down' | 'left' | 'right';

export type WatcherKind = 'raptor' | 'anzu' | 'guard' | 'dog' | 'soldier' | 'rider' | 'camera' | 'drone' | 'bot';

export interface Barks {
  suspicious: string[];
  investigate: string[];
  giveUp: string[];
  /** A `posted` watcher shrugging off a small noise. */
  holdPost: string[];
}

/** A route stop: a marker character, or a tile's coordinates for maps whose 36 markers are all taken. */
export type RoutePoint = string | readonly [tx: number, ty: number];

/** Stops visited in order, looping: a string of marker characters, or a list of stops. */
export type Route = string | readonly RoutePoint[];

export interface WatcherSpec {
  kind: WatcherKind;
  /** Stops visited in order, looping. A single stop means a fixed post. */
  route: Route;
  /** Names this watcher so a `ChatSpec` can pair it with another one. */
  id?: string;
  /** Direction faced at a fixed post. */
  facing?: Facing;
  /** How far (radians) the gaze sweeps left and right while standing still. */
  sweep?: number;
  /** Seconds spent looking around at each route point. */
  wait?: number;
  speed?: number;
  /** Vision range in pixels. */
  range?: number;
  /** Full field-of-view angle in radians. */
  fov?: number;
  /** Shown when this watcher catches the player. */
  caught: Line[];
  /** Watchers in the same group can be switched off together (e.g. by hacking a terminal). */
  group?: string;
  /** Speech bubbles, overriding the defaults for this kind. */
  barks?: Partial<Barks>;
  /** Starts powered down: blind and deaf to footsteps, it only wakes for a loud noise (glass, an alarm), then goes back to sleep at its post. */
  dormant?: boolean;
  /**
   * Holds a fixed post: a small noise (a thrown pebble, crunching glass) only draws a remark, and footsteps only
   * make it turn its head. Only a big commotion (the scouts' trutruka, a flock bursting out of cover) makes it leave.
   */
  posted?: boolean;
  /** Runs when a `posted` watcher shrugs off a small noise (e.g. Andrew realizing pebbles won't work here). */
  onHoldPost?: Script;
  /** Draws a guard as another character (e.g. the forester). Doesn't change how it behaves. */
  look?: NpcLook;
}

/**
 * Two watchers who chat whenever both stand still close together (a patrol stopping by a posted guard).
 * Their lines alternate in speech bubbles; any suspicion or noise breaks the conversation off.
 */
export interface ChatSpec {
  /** The `WatcherSpec.id`s of the two speakers; the first one opens every conversation. */
  between: readonly [string, string];
  /** Conversations, played in turn and then from the start again. Lines alternate between the two. */
  talks: ReadonlyArray<readonly string[]>;
  /**
   * Whether chatting takes their eyes off the job (facing each other, with shorter, narrower cones).
   * Posted sentries keep watching their post while they talk.
   */
  distracted: boolean;
}

export interface NpcSpec {
  /** A marker, or a tile's coordinates for maps whose markers are all taken. */
  marker: RoutePoint;
  look: NpcLook;
  name: string;
  facing?: Facing;
  talk: Script;
}

export interface PickupSpec {
  marker: string;
  item: ItemId;
  /** Lines shown when picked up. */
  lines?: Line[];
  /** Runs after the item is added to the inventory. */
  after?: Script;
}

export interface TriggerSpec {
  /** Marker whose bounding box defines the area, or an explicit tile rectangle. */
  area: string | TileRect;
  /** The trigger only fires while this is true. */
  when?: Condition;
  /** Fires only once per save, stored as a flag with this name. */
  once?: FlagName;
  /** Pushes the player back out of the area (an invisible wall with a reason). */
  block?: boolean;
  run: Script;
}

export interface HazardSpec {
  area: string | TileRect;
  /** Falling rocks or debris from above, or projectiles flying sideways (arrows, darts). */
  kind: 'rocks' | 'arrows';
  when?: Condition;
  /** Marker characters where the archers stand; bolts fly from them across the area. */
  shooters?: string;
}

export interface GateSpec {
  marker: string;
  look: 'laser' | 'door' | 'palisade';
  /** Starts open when this flag is set. */
  openFlag?: FlagName;
}

export interface GateHandle {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
}

/** A hidden ally who answers the pifilka whistle by making a racket at their post. */
export interface AllySpec {
  marker: string;
  name: string;
  look: NpcLook;
  talk: Script;
}

/**
 * A flock of small birds pecking on the ground. Walking up to them (not sneaking) sends them up with
 * a racket that carries like a war horn: even a `posted` watcher leaves its post to look. They land
 * again a while later.
 */
export interface FlockSpec {
  at: RoutePoint;
  /** Runs when the player sneaks close enough to look at them. */
  talk: Script;
}

/** A harmless animal that grazes around its spot and bolts when someone walks up to it (sneak to get close). */
export interface CritterSpec {
  at: RoutePoint;
  kind: 'thescelosaurus';
  talk: Script;
}

/** The (invented) products and services Neo-Tokyo's signs advertise; their artwork lives in render/signs.ts. */
export type AdId =
  | 'neurocola'
  | 'unagi'
  | 'memory'
  | 'robodog'
  | 'catrental'
  | 'cricket'
  | 'chronos'
  | 'genetics'
  | 'orbit'
  | 'kirara'
  | 'umbrella'
  | 'pachinko'
  | 'karaoke'
  | 'izakaya'
  | 'uranai';

/**
 * An advertising sign: a video screen on a facade (cycling through its ads), a vertical neon sign
 * (tategaki), or a billboard on a rooftop. Signs lean back so they read from the high camera.
 */
export interface SignSpec {
  /** The building tile it hangs on; a sign wider than one tile spans east from here. */
  at: RoutePoint;
  style: 'screen' | 'kanban' | 'rooftop';
  ads: AdId[];
  /** Size in tiles. */
  width: number;
  height: number;
  /** Height of its bottom edge above the street, in tiles. */
  y: number;
  /** Hidden while the player is inside a building (its wall drops away, the sign would float). */
  hideIndoors?: boolean;
  /** How far (tiles) north of the tile's south face it hangs: 0.5 puts it on a pole in the tile's middle. */
  inset?: number;
}

/** Set dressing that doesn't fit the tile grid. */
export type DecorKind = 'pedestrian' | 'restricted' | 'whale' | 'hachiko' | 'burgundy' | 'cologne' | 'hologram' | 'skull' | 'archer_n' | 'archer_s' | 'rack' | 'pudu' | 'horse' | 'torii' | 'megatherium' | 'crystal_calcite' | 'crystal_beryl' | 'crystal_pyrite' | 'crystal_quartz' | 'crystal_fluorite' | 'exhibit_meteorite' | 'exhibit_ammonite' | 'exhibit_trilobite' | 'exhibit_lynx' | 'exhibit_dodo' | 'exhibit_deck' | 'exhibit_clock' | 'exhibit_idol' | 'metrosign' | 'anzunest' | 'edmontosaurus' | 'champsosaurus' | 'dragonflies' | 'ankylosaurus';

export interface MusicZone {
  area: string | TileRect;
  theme: MusicTheme;
  when?: Condition;
}

export interface SleeperSpec {
  marker: string;
  /** What is asleep: the T. rex (two tiles wide) or a wild boar (one tile). Defaults to the T. rex. */
  look?: 'rex' | 'boar';
  caught: Line[];
  /** Played when it wakes up. Defaults to a roar. */
  sound?: SfxName;
}

export interface CompanionSpec {
  marker: string;
  name: string;
  following: boolean;
  /** Runs when the player interacts while the companion is resting. */
  talk: Script;
}

export type ObstacleLook = 'boulder' | 'column' | 'log' | 'blastdoor' | 'chest';

export interface ObstacleSpec {
  marker: string;
  look: ObstacleLook;
  interact: Script;
  label?: string;
}

/** Handle to a spawned character that scripts can move around. */
export interface ActorHandle {
  readonly x: number;
  readonly y: number;
  moveTo(marker: string, speed?: number): Promise<void>;
  moveBy(dx: number, dy: number, speed?: number): Promise<void>;
  emote(kind: EmoteKind, seconds?: number): void;
  remove(): void;
}

export interface CompanionHandle extends ActorHandle {
  readonly following: boolean;
  follow(): void;
  rest(): void;
  /** Teleports next to the player. */
  regroup(): void;
}

/** Everything era scripts can do with the running world. */
export interface WorldApi {
  readonly era: EraId;

  // Inventory & progress
  has(item: ItemId): boolean;
  give(item: ItemId): void;
  take(item: ItemId): void;
  flag(name: FlagName): boolean;
  setFlag(name: FlagName, on?: boolean): void;
  save(): void;

  // Presentation
  say(...lines: Line[]): Promise<void>;
  choose(prompt: string, options: string[]): Promise<number>;
  toast(text: string): void;
  wait(seconds: number): Promise<void>;
  sfx(name: SfxName): void;
  /** Forces a theme (e.g. an alarm); null goes back to the area's own music. */
  music(theme: MusicTheme | null): void;
  shake(power: number, seconds: number): void;
  flash(color: string, seconds: number): void;
  fadeOut(seconds?: number): Promise<void>;
  fadeIn(seconds?: number): Promise<void>;
  machineGlitch(on: boolean): void;

  // Spawning (used from EraDef.setup)
  watcher(spec: WatcherSpec): void;
  chat(spec: ChatSpec): void;
  npc(spec: NpcSpec): ActorHandle;
  pickup(spec: PickupSpec): void;
  trigger(spec: TriggerSpec): void;
  hazard(spec: HazardSpec): void;
  sleeper(spec: SleeperSpec): void;
  companion(spec: CompanionSpec): CompanionHandle;
  obstacle(spec: ObstacleSpec): ActorHandle;
  machine(marker: string, interact: Script): void;
  /** An inspect spot on a marker, or on a tile's coordinates for maps whose markers are all taken. */
  inspect(marker: RoutePoint, label: string, interact: Script): void;
  /** One inspect spot at every occurrence of a marker; `interact` gets the spot's index in reading order. */
  inspectEach(marker: string, label: string, interact: (w: WorldApi, index: number) => Promise<void> | void): void;
  checkpoint(marker: string): void;
  gate(spec: GateSpec): GateHandle;
  /** Set dressing on a marker, or on a tile's coordinates. */
  decor(marker: RoutePoint, kind: DecorKind): void;
  /** Set dressing at every occurrence of a marker, in reading order; `null` leaves a spot empty. */
  decorEach(marker: string, kinds: Array<DecorKind | null>): Array<ActorHandle | null>;
  ally(spec: AllySpec): ActorHandle;
  flock(spec: FlockSpec): void;
  sign(spec: SignSpec): void;
  critter(spec: CritterSpec): void;

  // Systems
  /** A loud noise where the player stands (an alarm, a crash): watchers in earshot come to look. */
  alarm(radius: number): void;
  /** Switches off every watcher in a group for a while (cameras, robots). */
  disable(group: string, seconds: number): void;
  /** Asks the player for a four-digit year. */
  enterYear(prompt: string, start: number): Promise<number>;

  // Player & flow
  readonly player: ActorHandle;
  /** Starts the travel sequence to another era. */
  travel(to: EraId): Promise<void>;
  /** Plays the ending. */
  ending(): Promise<void>;
}

export interface EraDef {
  id: EraId;
  name: string;
  place: string;
  year: string;
  /** Default music, plus optional themes for specific areas. */
  music: MusicTheme;
  musicZones?: MusicZone[];
  /** Music while standing on dark tiles (caves). */
  darkMusic?: MusicTheme;
  /** A train runs on the map's viaduct on a fixed timetable; while it passes, it drowns out the player's noises. */
  train?: boolean;
  map: readonly string[];
  markerBase: Record<string, string>;
  tiles: TileSet;
  defaultTile: string;
  /** Where the player appears when arriving by time machine. */
  arrival: string;
  /** Machine parts needed in this era (shown in the HUD). */
  parts: ItemId[];
  /** The current goal, shown in the pause menu so players never feel lost. */
  objective(w: WorldApi): string;
  /**
   * Spawns everything in the era. May return a script that runs every time the
   * player arrives, so it can use handles created during setup.
   */
  setup(w: WorldApi): ArriveScript | void;
}

export type ArriveScript = (w: WorldApi, firstVisit: boolean) => Promise<void> | void;
