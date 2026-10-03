import type { MusicTheme, SfxName } from '../engine/audio.ts';
import type { EmoteKind, NpcLook } from '../game/looks.ts';
import type { EraId, ItemId } from '../game/state.ts';
import type { TileSet } from '../game/tiledefs.ts';
import type { TileRect } from '../game/tilemap.ts';

/** A line of dialogue: plain strings are narration, tuples have a speaker. */
export type Line = string | readonly [speaker: string, text: string];

export type Script = (w: WorldApi) => Promise<void> | void;
export type Condition = (w: WorldApi) => boolean;
export type Facing = 'up' | 'down' | 'left' | 'right';

export type WatcherKind = 'raptor' | 'guard' | 'dog' | 'soldier' | 'rider' | 'camera' | 'drone' | 'bot';

export interface Barks {
  suspicious: string[];
  investigate: string[];
  giveUp: string[];
}

export interface WatcherSpec {
  kind: WatcherKind;
  /** Marker characters visited in order, looping. A single marker means a fixed post. */
  route: string;
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
}

export interface NpcSpec {
  marker: string;
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
  once?: string;
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
  openFlag?: string;
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

/** Set dressing that doesn't fit the tile grid. */
export type DecorKind = 'whale' | 'hachiko' | 'burgundy' | 'cologne' | 'hologram' | 'skull' | 'archer_n' | 'archer_s' | 'rack' | 'pudu' | 'horse' | 'torii' | 'megatherium';

export interface MusicZone {
  area: string | TileRect;
  theme: MusicTheme;
  when?: Condition;
}

export interface SleeperSpec {
  marker: string;
  caught: Line[];
}

export interface CompanionSpec {
  marker: string;
  name: string;
  following: boolean;
  /** Runs when the player interacts while the companion is resting. */
  talk: Script;
}

export interface ObstacleSpec {
  marker: string;
  look: 'boulder' | 'column';
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
  flag(name: string): boolean;
  setFlag(name: string, on?: boolean): void;
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
  npc(spec: NpcSpec): ActorHandle;
  pickup(spec: PickupSpec): void;
  trigger(spec: TriggerSpec): void;
  hazard(spec: HazardSpec): void;
  sleeper(spec: SleeperSpec): void;
  companion(spec: CompanionSpec): CompanionHandle;
  obstacle(spec: ObstacleSpec): ActorHandle;
  machine(marker: string, interact: Script): void;
  inspect(marker: string, label: string, interact: Script): void;
  checkpoint(marker: string): void;
  gate(spec: GateSpec): GateHandle;
  decor(marker: string, kind: DecorKind): void;
  ally(spec: AllySpec): ActorHandle;

  // Systems
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
