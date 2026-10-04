import { Flag, progress, type FlagName } from './flags.ts';
export type EraId = 'prehistory' | 'medieval' | 'araucania' | 'future' | 'ruins';

export type ItemId =
  // Late Cretaceous
  | 'amber'
  | 'obsidian'
  | 'meteorite'
  | 'fern'
  | 'recorder'
  // Middle Ages
  | 'bread'
  | 'pebbles'
  | 'charcoal'
  | 'gear'
  | 'quicksilver'
  | 'shield'
  | 'top'
  | 'firewood'
  // Araucanía
  | 'gold'
  | 'lodestone'
  | 'pifilka'
  | 'canelo'
  | 'maqui'
  | 'pali'
  | 'charqui'
  // Neo-Tokyo
  | 'clock'
  | 'tape'
  | 'powercell'
  | 'deck'
  // The Long Drought
  | 'notes'
  | 'water'
  | 'quartz'
  | 'emitter'
  | 'navmodule'
  | 'core';

/** Eras in story order. */
export const ERA_IDS: readonly EraId[] = ['prehistory', 'medieval', 'araucania', 'future', 'ruins'];

export const ITEM_IDS: readonly ItemId[] = [
  'amber',
  'obsidian',
  'meteorite',
  'fern',
  'recorder',
  'bread',
  'pebbles',
  'charcoal',
  'gear',
  'quicksilver',
  'shield',
  'top',
  'firewood',
  'gold',
  'lodestone',
  'pifilka',
  'canelo',
  'maqui',
  'pali',
  'charqui',
  'clock',
  'tape',
  'powercell',
  'deck',
  'notes',
  'water',
  'quartz',
  'emitter',
  'navmodule',
  'core',
];

/** Machine parts consumed by each era's repair. Older saves kept them in the bag. */
const INSTALLED_PARTS: Partial<Record<EraId, ItemId[]>> = {
  prehistory: ['amber', 'obsidian', 'meteorite'],
  medieval: ['gear', 'quicksilver'],
  araucania: ['gold', 'lodestone'],
  future: ['clock', 'tape'],
};

/** Brings saves from earlier versions of the story in line with the current, linear one. */
function upgrade(state: GameState): void {
  for (const era of ERA_IDS) {
    if (state.flag(progress.fixed(era))) for (const part of INSTALLED_PARTS[era] ?? []) state.take(part);
  }
  // Pike's caches hold upgrades now: the nav module (Hell Creek) and the field emitter (Cologne).
  if (state.flag(progress.visited('araucania'))) state.setFlag(Flag.NavInstalled);
  else if (state.flag(progress.got('recorder')) && !state.flag(Flag.NavInstalled)) state.give('navmodule');
  if (state.flag(progress.got('notes')) && !state.flag(Flag.EmitterInstalled)) state.give('emitter');
  // Pip travels with Andrew from the Cologne repair on.
  if (state.flag(Flag.PipFriend) && state.flag(progress.visited('araucania')) && !state.flag(Flag.RuinsPipHome)) state.setFlag(Flag.PipAboard);
}

const SAVE_KEY = 'out-of-time.save';
const LEGACY_SAVE_KEY = 'out-of-time.save.v1';
const MAX_LOG = 300;

/** A dialogue line kept in the journal: speaker (null for narration) and text. */
export type LogEntry = [speaker: string | null, text: string];

export interface Checkpoint {
  era: EraId;
  x: number;
  y: number;
}

interface SaveData {
  version: 2;
  era: EraId;
  items: ItemId[];
  flags: string[];
  checkpoint: Checkpoint | null;
  log: LogEntry[];
}

/** Everything that survives between eras and sessions. */
export class GameState {
  era: EraId = 'prehistory';
  readonly items = new Set<ItemId>();
  readonly flags = new Set<string>();
  /** Where to respawn when continuing a saved game. */
  checkpoint: Checkpoint | null = null;
  /** Every line of dialogue so far, for the journal in the pause menu. */
  readonly log: LogEntry[] = [];

  has(item: ItemId): boolean {
    return this.items.has(item);
  }

  give(item: ItemId): void {
    this.items.add(item);
  }

  take(item: ItemId): void {
    this.items.delete(item);
  }

  flag(name: FlagName): boolean {
    return this.flags.has(name);
  }

  setFlag(name: FlagName, on = true): void {
    if (on) this.flags.add(name);
    else this.flags.delete(name);
  }

  record(speaker: string | null, text: string): void {
    this.log.push([speaker, text]);
    if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
  }

  save(): void {
    const data: SaveData = {
      version: 2,
      era: this.era,
      items: [...this.items],
      flags: [...this.flags],
      checkpoint: this.checkpoint,
      log: this.log,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). The game still works without saves.
    }
  }

  static hasSave(): boolean {
    return GameState.load() !== null;
  }

  static load(): GameState | null {
    const raw = readStorage(SAVE_KEY) ?? readStorage(LEGACY_SAVE_KEY);
    if (!raw) return null;
    try {
      const data = migrate(JSON.parse(raw));
      if (!data) return null;
      const state = new GameState();
      state.era = data.era;
      data.items.forEach((item) => state.items.add(item));
      data.flags.forEach((flag) => state.flags.add(flag));
      state.checkpoint = data.checkpoint;
      state.log.push(...data.log.slice(-MAX_LOG));
      upgrade(state);
      return state;
    } catch {
      return null;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Saved data comes from the browser, so validate it before trusting it.
 * Older saves are upgraded to the current format.
 */
function migrate(value: unknown): SaveData | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 && v.version !== 2) return null;
  if (typeof v.era !== 'string' || !(ERA_IDS as readonly string[]).includes(v.era)) return null;
  if (!Array.isArray(v.items) || !Array.isArray(v.flags)) return null;

  const items = v.items
    .map((item) => (item === 'coal' ? 'charcoal' : item))
    .filter((item): item is ItemId => typeof item === 'string' && (ITEM_IDS as readonly string[]).includes(item));
  const flags = v.flags
    .filter((flag): flag is string => typeof flag === 'string' && flag.length < 64)
    .map((flag) => (flag === 'got:coal' ? 'got:charcoal' : flag));

  let checkpoint: Checkpoint | null = null;
  const cp = v.checkpoint as Record<string, unknown> | null | undefined;
  if (
    cp &&
    typeof cp === 'object' &&
    typeof cp.era === 'string' &&
    (ERA_IDS as readonly string[]).includes(cp.era) &&
    Number.isFinite(cp.x) &&
    Number.isFinite(cp.y)
  ) {
    checkpoint = { era: cp.era as EraId, x: cp.x as number, y: cp.y as number };
  }

  const log: LogEntry[] = Array.isArray(v.log)
    ? v.log
        .filter(
          (entry): entry is LogEntry =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            (entry[0] === null || (typeof entry[0] === 'string' && entry[0].length < 40)) &&
            typeof entry[1] === 'string' &&
            entry[1].length < 400,
        )
        .slice(-MAX_LOG)
    : [];

  return { version: 2, era: v.era as EraId, items, flags, checkpoint, log };
}
