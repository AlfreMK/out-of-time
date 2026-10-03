import type { Facing } from '../eras/types.ts';

/** Visual style used by the 3D terrain builder. */
export type TileLook =
  // Late Cretaceous
  | 'cliff'
  | 'tree'
  | 'fern'
  | 'grass'
  | 'undergrowth'
  | 'dirt'
  | 'water'
  | 'stones'
  | 'sand'
  | 'cavefloor'
  | 'bones'
  | 'rubble'
  | 'crater'
  | 'gravel'
  // Middle Ages
  | 'mgrass'
  | 'bush'
  | 'road'
  | 'cobble'
  | 'castlewall'
  | 'stonefloor'
  | 'woodfloor'
  | 'doorway'
  | 'hole'
  | 'roof'
  | 'housewall'
  | 'housedoor'
  | 'moat'
  | 'bridge'
  | 'mtree'
  | 'crate'
  | 'hay'
  | 'forge'
  | 'barrel'
  | 'rack'
  | 'table'
  | 'well'
  | 'panel'
  | 'flowers'
  | 'ledgestone'
  | 'stairs'
  | 'balcony'
  // Araucanía
  | 'pgrass'
  | 'quila'
  | 'path'
  | 'coigue'
  | 'araucaria'
  | 'canelotree'
  | 'stream'
  | 'riverstones'
  | 'gravelbank'
  | 'ruka'
  | 'rewe'
  | 'campfire'
  | 'palisade'
  | 'earth'
  | 'adobe'
  | 'tileroof'
  | 'adobedoor'
  | 'copihue'
  | 'pottery'
  | 'rock'
  | 'ledgeearth'
  // Neo-Tokyo
  | 'asphalt'
  | 'sidewalk'
  | 'plaza'
  | 'neonblock'
  | 'glasstower'
  | 'lobby'
  | 'labfloor'
  | 'canal'
  | 'steelbridge'
  | 'puddle'
  | 'planter'
  | 'billboard'
  | 'vending'
  | 'techcrate'
  | 'server'
  | 'bench'
  | 'metro'
  | 'statue'
  | 'lamppost'
  | 'citytree'
  | 'railing'
  | 'alley'
  // The Long Drought
  | 'dust'
  | 'scrub'
  | 'crackedroad'
  | 'dune'
  | 'ruinwall'
  | 'deadtree'
  | 'debris'
  | 'bigrubble'
  | 'marble'
  | 'museumwall'
  | 'column'
  | 'wreck'
  | 'showcase'
  | 'fountain';

export interface TileDef {
  look: TileLook;
  solid: boolean;
  /** Standing here hides the player from vision cones. */
  hide?: boolean;
  /** Walking here always makes a noise of this radius (pixels), even when sneaking. */
  noise?: number;
  /** Covered in darkness unless lit by the player's lamp. */
  dark?: boolean;
  /** Thrown objects fly over it (water, low props). */
  low?: boolean;
  /** Does not block vision even though it is solid (water). */
  seeThrough?: boolean;
  /** One-way drop: you can only cross it moving in this direction (like old-school ledges). */
  ledge?: Facing;
  /** Raised tiles (stairs, landings), in tiles. Purely visual: characters are drawn higher. */
  height?: number;
}

export type TileSet = Record<string, TileDef>;

export const PREHISTORY_TILES: TileSet = {
  '#': { look: 'cliff', solid: true },
  t: { look: 'tree', solid: true },
  f: { look: 'fern', solid: true, low: true },
  '.': { look: 'grass', solid: false },
  // Grasslands didn't exist yet in the Cretaceous: cover comes from ferns and horsetails.
  ',': { look: 'undergrowth', solid: false, hide: true },
  ':': { look: 'dirt', solid: false },
  '~': { look: 'water', solid: true, low: true, seeThrough: true },
  o: { look: 'stones', solid: false },
  s: { look: 'sand', solid: false },
  c: { look: 'cavefloor', solid: false, dark: true },
  b: { look: 'bones', solid: false, dark: true, noise: 120 },
  r: { look: 'rubble', solid: false },
  x: { look: 'crater', solid: false },
  '^': { look: 'gravel', solid: false },
};

export const MEDIEVAL_TILES: TileSet = {
  '.': { look: 'mgrass', solid: false },
  ',': { look: 'bush', solid: false, hide: true },
  ':': { look: 'road', solid: false },
  '=': { look: 'cobble', solid: false },
  '#': { look: 'castlewall', solid: true },
  _: { look: 'stonefloor', solid: false },
  '-': { look: 'woodfloor', solid: false },
  d: { look: 'doorway', solid: false },
  h: { look: 'hole', solid: false },
  r: { look: 'roof', solid: true },
  m: { look: 'housewall', solid: true },
  n: { look: 'housedoor', solid: true },
  '~': { look: 'moat', solid: true, low: true, seeThrough: true },
  '+': { look: 'bridge', solid: false },
  t: { look: 'mtree', solid: true },
  c: { look: 'crate', solid: true, low: true },
  y: { look: 'hay', solid: true, low: true },
  o: { look: 'forge', solid: true, low: true },
  b: { look: 'barrel', solid: true, low: true },
  s: { look: 'rack', solid: true },
  u: { look: 'table', solid: true, low: true },
  q: { look: 'well', solid: true, low: true },
  p: { look: 'panel', solid: true },
  '*': { look: 'flowers', solid: false },
  // The escape route: a step up inside the outer wall, then a raised landing you can only jump down from.
  '[': { look: 'stairs', solid: false, height: 0.6 },
  '>': { look: 'ledgestone', solid: false, ledge: 'right', height: 1.2 },
  // Upper-floor balconies in the gallery walls, where the crossbowmen stand.
  '%': { look: 'balcony', solid: true, height: 1.3 },
};

export const ARAUCANIA_TILES: TileSet = {
  '.': { look: 'pgrass', solid: false },
  // Quila (Chusquea quila), a native bamboo that grows in dense thickets.
  ',': { look: 'quila', solid: false, hide: true },
  ':': { look: 'path', solid: false },
  t: { look: 'coigue', solid: true },
  a: { look: 'araucaria', solid: true },
  k: { look: 'canelotree', solid: true },
  '~': { look: 'stream', solid: true, low: true, seeThrough: true },
  o: { look: 'riverstones', solid: false },
  s: { look: 'gravelbank', solid: false },
  r: { look: 'ruka', solid: true },
  w: { look: 'rewe', solid: true, low: true },
  f: { look: 'campfire', solid: true, low: true },
  p: { look: 'palisade', solid: true },
  _: { look: 'earth', solid: false },
  h: { look: 'adobe', solid: true },
  x: { look: 'tileroof', solid: true },
  n: { look: 'adobedoor', solid: true },
  '*': { look: 'copihue', solid: false },
  m: { look: 'pottery', solid: true, low: true },
  '#': { look: 'rock', solid: true },
  v: { look: 'ledgeearth', solid: false, ledge: 'down', height: 0.7 },
  u: { look: 'earth', solid: false, height: 0.35 },
};

export const FUTURE_TILES: TileSet = {
  '.': { look: 'asphalt', solid: false },
  ':': { look: 'sidewalk', solid: false },
  '=': { look: 'plaza', solid: false },
  '#': { look: 'neonblock', solid: true },
  g: { look: 'glasstower', solid: true },
  _: { look: 'lobby', solid: false },
  '-': { look: 'labfloor', solid: false },
  d: { look: 'doorway', solid: false },
  '~': { look: 'canal', solid: true, low: true, seeThrough: true },
  '+': { look: 'steelbridge', solid: false },
  // Splashing through puddles is loud, even when sneaking.
  p: { look: 'puddle', solid: false, noise: 80 },
  ',': { look: 'planter', solid: false, hide: true },
  h: { look: 'billboard', solid: true },
  v: { look: 'vending', solid: true },
  // Taiyaki stand.
  k: { look: 'vending', solid: true, low: true },
  c: { look: 'techcrate', solid: true, low: true },
  s: { look: 'server', solid: true },
  u: { look: 'table', solid: true, low: true },
  m: { look: 'metro', solid: true },
  o: { look: 'statue', solid: true },
  b: { look: 'bench', solid: true, low: true },
  l: { look: 'lamppost', solid: true, low: true },
  t: { look: 'citytree', solid: true },
  r: { look: 'railing', solid: true, low: true, seeThrough: true },
  // Unlit alleys: the shadows hide you.
  x: { look: 'alley', solid: false, hide: true },
};

export const RUINS_TILES: TileSet = {
  '.': { look: 'dust', solid: false },
  ',': { look: 'scrub', solid: false, hide: true },
  ':': { look: 'crackedroad', solid: false },
  s: { look: 'dune', solid: false },
  '#': { look: 'ruinwall', solid: true },
  t: { look: 'deadtree', solid: true },
  r: { look: 'debris', solid: false },
  q: { look: 'bigrubble', solid: true, low: true },
  '=': { look: 'marble', solid: false },
  w: { look: 'museumwall', solid: true },
  c: { look: 'column', solid: true },
  _: { look: 'labfloor', solid: false },
  d: { look: 'doorway', solid: false },
  v: { look: 'wreck', solid: true, low: true },
  k: { look: 'showcase', solid: true, low: true },
  g: { look: 'fountain', solid: true, low: true },
  l: { look: 'lamppost', solid: true, low: true },
};
