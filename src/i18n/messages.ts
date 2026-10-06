/**
 * Text built from values, in English. Each language implements the same `Messages` type, so a
 * missing message or a changed argument fails the typecheck. Values that are text themselves (item
 * names, era script lines) arrive already translated.
 */
export const MESSAGES = {
  // Items
  gotItem: ({ item }: { item: string }) => `Got: ${item}`,
  takeItem: ({ item }: { item: string }) => `Take ${item}`,
  stillMissing: ({ items }: { items: string }) => `Still missing: ${items}.`,
  toDo: ({ steps }: { steps: readonly string[] }) => `To do: ${steps.join('; ')}.`,

  // Hell Creek
  findParts: ({ items }: { items: string }) => `Find: ${items}.`,
  findPartsAndFern: ({ items }: { items: string }) =>
    `Find: ${items}. Pip's wound needs the sharp-smelling fern by the Anzu's nest, at the south end of the meadow.`,
  findPartsAndPip: ({ items }: { items: string }) => `Find: ${items}. Something was whimpering in the valley past the east corridor.`,

  // Araucanía
  partsFromFort: ({ items, tips }: { items: readonly string[]; tips: readonly string[] }) =>
    `Get ${items.join(' and ')} from Fort Tucapel. Blow the pifilka near the scouts to distract the soldiers. ${tips.join(' ')}`.trim(),

  // Neo-Tokyo
  hacked: ({ door }: { door: string }) => `${door} unlocked · Cameras and bots offline for 20 s`,

  // Madrid
  notQuartz: ({ reveal }: { reveal: string }) => `${reveal} Not quartz... and now everything in here knows where I am.`,

  // The time machine
  newWindow: ({ code }: { code: string }) => `${code}  ·  NEW WINDOW`,
  originMismatch: ({ year }: { year: number }) => `ORIGIN YEAR ${year}: NO MATCH WITH THE DEPARTURE SIGNATURE.`,
  originMatch: ({ year }: { year: number }) => `ORIGIN YEAR ${year}: SIGNATURE MATCH.`,
  stability: ({ percent, warning }: { percent: number; warning: boolean }) => `STABILITY ${percent}%${warning ? '  ·  WARNING' : ''}`,

  // Cinematics
  skip: ({ key }: { key: string }) => `${key}: skip`,
  yearReadout: ({ value }: { value: string }) => `YEAR: ${value}`,
  coordinatesReadout: ({ value }: { value: string }) => `COORDINATES: ${value}`,
  statusReadout: ({ value }: { value: string }) => `STATUS: ${value}`,
  pressKey: ({ key }: { key: string }) => `Press ${key}`,
  pressKeyForTitle: ({ key }: { key: string }) => `Press ${key} to return to the title`,

  // Title screen and pause menu
  padHints: ({ stick, interact, sneak, use, cycle, pause }: PadHints) =>
    `${stick} move · ${interact} interact · ${sneak} sneak · ${use} use · ${cycle} switch · ${pause} pause`,
  controlMove: ({ how }: { how: string }) => `Move ........ ${how}`,
  controlInteract: ({ key, keyboard }: { key: string; keyboard: boolean }) => `Interact .... ${key}${keyboard ? ' / Space' : ''}`,
  controlSneak: ({ key, pad }: { key: string; pad: boolean }) => `Sneak ....... Hold ${key}${pad ? ' / tilt gently' : ''}`,
  controlUse: ({ key }: { key: string }) => `Use item .... ${key} (hold: throw far)`,
  controlSwitch: ({ key, device }: { key: string; device: string }) =>
    `Switch item . ${key}${device === 'touch' ? ' / tap it' : device === 'keyboard' ? ' / Q / wheel' : ''}`,
  controlPause: ({ key }: { key: string }) => `Pause ....... ${key}`,
  journalHelp: ({ key }: { key: string }) => `Up/Down scroll · Left/Right page · ${key} close`,
};

export interface PadHints {
  stick: string;
  interact: string;
  sneak: string;
  use: string;
  cycle: string;
  pause: string;
}

export type Messages = { readonly [K in keyof typeof MESSAGES]: (typeof MESSAGES)[K] };
