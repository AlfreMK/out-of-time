import type { ItemId } from './state.ts';

export interface ItemInfo {
  name: string;
  /** Machine parts are listed in the HUD for the era that needs them. */
  kind: 'part' | 'tool' | 'quest' | 'lore';
}

export const ITEMS: Record<ItemId, ItemInfo> = {
  // Late Cretaceous. Amber takes millions of years to form, so in 66 Ma it's still just hardened resin.
  amber: { name: 'Hardened Resin', kind: 'part' },
  obsidian: { name: 'Obsidian', kind: 'part' },
  meteorite: { name: 'Meteoric Iron', kind: 'part' },
  fern: { name: 'Medicinal Fern', kind: 'quest' },
  recorder: { name: 'Field Recorder', kind: 'lore' },
  // Middle Ages
  bread: { name: 'Rye Bread', kind: 'tool' },
  pebbles: { name: 'Pebbles', kind: 'tool' },
  charcoal: { name: 'Charcoal', kind: 'quest' },
  gear: { name: 'Bronze Gear', kind: 'part' },
  quicksilver: { name: 'Quicksilver', kind: 'part' },
  shield: { name: 'Shield', kind: 'tool' },
  top: { name: 'Spinning Top', kind: 'quest' },
  firewood: { name: 'Firewood', kind: 'quest' },
  // Araucanía
  gold: { name: 'Gold Nugget', kind: 'part' },
  lodestone: { name: 'Lodestone', kind: 'part' },
  pifilka: { name: 'Pifilka', kind: 'tool' },
  canelo: { name: 'Foye Bark', kind: 'quest' },
  maqui: { name: 'Maqui', kind: 'quest' },
  pali: { name: 'Pali Ball', kind: 'quest' },
  charqui: { name: 'Charqui', kind: 'tool' },
  // Neo-Tokyo
  clock: { name: 'Optical Clock', kind: 'part' },
  tape: { name: 'Superconductor', kind: 'part' },
  powercell: { name: 'Power Cell', kind: 'tool' },
  deck: { name: 'Cyberdeck', kind: 'quest' },
  // The Long Drought
  notes: { name: "Pike's Notes", kind: 'lore' },
  core: { name: 'Temporal Core', kind: 'part' },
};

/** Items used with the throw/use button, in cycling order. */
export const TOOLS: readonly ItemId[] = ['pebbles', 'bread', 'charqui', 'pifilka'];

/** Thrown food lures animals (the dog in Cologne, the Spanish war dog). */
export const FOODS: readonly ItemId[] = ['bread', 'charqui'];
