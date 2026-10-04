import type { EraId, ItemId } from './state.ts';

/**
 * Every story flag the game saves. Scripts use these values instead of raw strings,
 * so each flag is named in one place and a typo is a type error.
 */
export const Flag = {
  // The story arc: Pip, Pike's caches and the ending
  Completed: 'completed',
  EmitterInstalled: 'emitterInstalled',
  HomeGuess: 'home:guess',
  NavInstalled: 'navInstalled',
  PipAboard: 'pipAboard',
  PipFriend: 'pipFriend',
  SawPanel: 'sawPanel',
  // Hell Creek
  PipMet: 'pipMet',
  BoulderBroken: 'boulderBroken',
  PreCaveHint: 'pre:caveHint',
  PreForestHint: 'pre:forestHint',
  PreGorgeHint: 'pre:gorgeHint',
  PreMeadowHint: 'pre:meadowHint',
  PrePassShield: 'pre:passShield',
  PreValleyHint: 'pre:valleyHint',
  // Cologne, 1248
  Alarm: 'alarm',
  Escaped: 'escaped',
  MedBakerLore: 'med:bakerLore',
  MedBoarHint: 'med:boarHint',
  MedCourtyardHint: 'med:courtyardHint',
  MedCryptOpen: 'med:cryptOpen',
  MedForestHint: 'med:forestHint',
  MedKilnHint: 'med:kilnHint',
  MedMetAlbert: 'med:metAlbert',
  MedMetJakob: 'med:metJakob',
  MedMillHint: 'med:millHint',
  MedPipAgnes: 'med:pipAgnes',
  MedPipAlbert: 'med:pipAlbert',
  MedPipGertrud: 'med:pipGertrud',
  MedPipGuard: 'med:pipGuard',
  MedPipJakob: 'med:pipJakob',
  MedPipThomas: 'med:pipThomas',
  MedPipUlrich: 'med:pipUlrich',
  // Araucanía, 1553
  AraBreachHint: 'ara:breachHint',
  AraChest: 'ara:chest',
  AraGateHint: 'ara:gateHint',
  AraMet: 'ara:met',
  AraMetMachi: 'ara:metMachi',
  AraPaliReturned: 'ara:paliReturned',
  AraPipAyelen: 'ara:pipAyelen',
  AraPipKid: 'ara:pipKid',
  AraPipLautaro: 'ara:pipLautaro',
  AraPipMachi: 'ara:pipMachi',
  AraPipRayen: 'ara:pipRayen',
  AraRayenDog: 'ara:rayenDog',
  AraTrunk: 'ara:trunk',
  // Neo-Tokyo, 2087
  FutBlastDoor: 'fut:blastDoor',
  FutCanHack: 'fut:canHack',
  FutDepotHint: 'fut:depotHint',
  FutDepotOpen: 'fut:depotOpen',
  FutHeardYamanote: 'fut:heardYamanote',
  FutLabOpen: 'fut:labOpen',
  FutMetYuki: 'fut:metYuki',
  FutPipCommuter: 'fut:pipCommuter',
  FutPipCourier: 'fut:pipCourier',
  FutPipPriest: 'fut:pipPriest',
  FutPipVendor: 'fut:pipVendor',
  FutReadEma: 'fut:readEma',
  FutTowerHint: 'fut:towerHint',
  FutTowerOpen: 'fut:towerOpen',
  // Madrid, 2240
  RuinsColumn: 'ruins:column',
  RuinsGalleryHint: 'ruins:galleryHint',
  RuinsHallOpen: 'ruins:hallOpen',
  RuinsLabOpen: 'ruins:labOpen',
  RuinsMetPike: 'ruins:metPike',
  RuinsPikeCured: 'ruins:pikeCured',
  RuinsPipDrank: 'ruins:pipDrank',
  RuinsPipNomad: 'ruins:pipNomad',
  RuinsPipHome: 'ruins:pipHome',
} as const;

export type StoryFlag = (typeof Flag)[keyof typeof Flag];

const ERA_PREFIX: Record<EraId, string> = { prehistory: 'pre:', medieval: 'med:', araucania: 'ara:', future: 'fut:', ruins: 'ruins:' };

/** Era flags whose saved names predate the per-era prefixes. */
const ERA_EXTRAS: Record<EraId, StoryFlag[]> = {
  prehistory: [Flag.PipMet, Flag.PipFriend, Flag.PipAboard, Flag.BoulderBroken, Flag.NavInstalled],
  medieval: [Flag.Alarm, Flag.Escaped, Flag.SawPanel, Flag.EmitterInstalled],
  araucania: [],
  future: [],
  ruins: [Flag.HomeGuess],
};

/** Every story flag that belongs to one era (used by the debug "restart era"). */
export function eraFlags(era: EraId): StoryFlag[] {
  const prefixed = Object.values(Flag).filter((flag) => flag.startsWith(ERA_PREFIX[era]));
  return [...prefixed, ...ERA_EXTRAS[era]];
}

/** Flags derived from an era or an item, built with `progress`. */
export type ProgressFlag = `fixed:${EraId}` | `visited:${EraId}` | `diag:${EraId}` | `got:${ItemId}`;

export type FlagName = StoryFlag | ProgressFlag;

/** Builders for the per-era and per-item flags. */
export const progress = {
  /** The era's time machine is repaired. */
  fixed: (era: EraId) => `fixed:${era}` as const,
  /** The player has been to the era at least once. */
  visited: (era: EraId) => `visited:${era}` as const,
  /** The machine's diagnosis ran there, so the HUD lists the part names. */
  diagnosed: (era: EraId) => `diag:${era}` as const,
  /** The item was obtained at some point (even if it was used up since). */
  got: (item: ItemId) => `got:${item}` as const,
};
