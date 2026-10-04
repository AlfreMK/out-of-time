import type { EraId, ItemId } from './state.ts';

export interface ItemInfo {
  name: string;
  /** Machine parts are listed in the HUD for the era that needs them. */
  kind: 'part' | 'tool' | 'quest' | 'lore';
  /** Where the item is found (the debug "restart era" takes it back). */
  era: EraId;
}

export const ITEMS: Record<ItemId, ItemInfo> = {
  // Late Cretaceous. Amber takes millions of years to form, so in 66 Ma it's still just hardened resin.
  amber: { name: 'Hardened Resin', kind: 'part', era: 'prehistory' },
  obsidian: { name: 'Obsidian', kind: 'part', era: 'prehistory' },
  meteorite: { name: 'Meteoric Iron', kind: 'part', era: 'prehistory' },
  fern: { name: 'Medicinal Fern', kind: 'quest', era: 'prehistory' },
  recorder: { name: 'Field Recorder', kind: 'lore', era: 'prehistory' },
  // Pike's, left in his first cache: it stores the coordinates of every window he jumped through.
  navmodule: { name: 'Nav Module', kind: 'quest', era: 'prehistory' },
  // Middle Ages
  bread: { name: 'Rye Bread', kind: 'tool', era: 'medieval' },
  pebbles: { name: 'Pebbles', kind: 'tool', era: 'medieval' },
  charcoal: { name: 'Charcoal', kind: 'quest', era: 'medieval' },
  gear: { name: 'Bronze Gear', kind: 'part', era: 'medieval' },
  quicksilver: { name: 'Quicksilver', kind: 'part', era: 'medieval' },
  shield: { name: 'Shield', kind: 'tool', era: 'medieval' },
  top: { name: 'Spinning Top', kind: 'quest', era: 'medieval' },
  firewood: { name: 'Firewood', kind: 'quest', era: 'medieval' },
  // Araucanía
  gold: { name: 'Gold Nugget', kind: 'part', era: 'araucania' },
  lodestone: { name: 'Lodestone', kind: 'part', era: 'araucania' },
  pifilka: { name: 'Pifilka', kind: 'tool', era: 'araucania' },
  canelo: { name: 'Foye Bark', kind: 'quest', era: 'araucania' },
  maqui: { name: 'Maqui', kind: 'quest', era: 'araucania' },
  pali: { name: 'Pali Ball', kind: 'quest', era: 'araucania' },
  // Neo-Tokyo
  clock: { name: 'Optical Clock', kind: 'part', era: 'future' },
  tape: { name: 'Superconductor', kind: 'part', era: 'future' },
  powercell: { name: 'Power Cell', kind: 'tool', era: 'future' },
  deck: { name: 'Cyberdeck', kind: 'quest', era: 'future' },
  // The Long Drought
  notes: { name: "Pike's Notes", kind: 'lore', era: 'medieval' },
  // Traded from the nomad for rye bread: Pip won't charge anything in this heat without a drink.
  water: { name: 'Water Flask', kind: 'quest', era: 'ruins' },
  // From the museum's mineral hall: Pike rebuilds his core's oscillator with it.
  quartz: { name: 'Quartz Crystal', kind: 'quest', era: 'ruins' },
  // Pike's spare, left in his 1248 cache: it extends the machine's reach far enough for 2240.
  emitter: { name: 'Field Emitter', kind: 'quest', era: 'medieval' },
  core: { name: 'Temporal Core', kind: 'part', era: 'ruins' },
};

/** Items used with the throw/use button, in cycling order. */
export const TOOLS: readonly ItemId[] = ['pebbles', 'bread', 'pifilka'];

/** Thrown food lures animals (Cologne's rye bread works on Brutus and on the Spanish war dog). */
export const FOODS: readonly ItemId[] = ['bread'];
