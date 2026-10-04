/** Character looks shared by era scripts and the 3D models. */
export type NpcLook =
  // Middle Ages (Cologne, 1248)
  | 'baker'
  | 'founder'
  | 'kid'
  | 'elder'
  | 'guard'
  | 'albertus'
  | 'thomas'
  | 'forester'
  // Araucanía (1553)
  | 'lautaro'
  | 'machi'
  | 'weichafe'
  | 'lamngen'
  | 'pichi'
  // Neo-Tokyo (2087)
  | 'nora'
  | 'citizen'
  | 'vendor'
  | 'hacker'
  | 'priest'
  // The Long Drought (2240)
  | 'pike'
  | 'trader';

/** Little icons that pop up above characters. */
export type EmoteKind = 'alert' | 'question' | 'heart' | 'zzz' | 'note';
