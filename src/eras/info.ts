import type { EraId } from '../game/state.ts';

export interface EraInfo {
  name: string;
  place: string;
  year: string;
}

/** Display info for each era, shared by the HUD, time machine and travel screen. */
export const ERA_INFO: Record<EraId, EraInfo> = {
  prehistory: { name: 'Late Cretaceous', place: 'Hell Creek, Laramidia', year: '66,500,000 BC' },
  medieval: { name: 'Middle Ages', place: 'Cologne, Holy Roman Empire', year: '1248 AD' },
  araucania: { name: 'Araucanía', place: 'Near Fort Tucapel, Chile', year: '1553 AD' },
  future: { name: 'Neo-Tokyo', place: 'Tokyo, Japan', year: '2087 AD' },
  ruins: { name: 'The Long Drought', place: 'Madrid, Spain', year: '2240 AD' },
};

const GLITCH = '▓▒░█◊¤§¶ΣΔΨ#@%&?¿±';

/** Garbled text for eras the machine can't resolve yet. Changes slowly over time. */
export function glitchText(length: number, time: number, seed = 0): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    const n = Math.floor(Math.sin((i + 1) * 12.9898 + seed * 78.233 + Math.floor(time * 6) * 3.17) * 43758.5453);
    out += GLITCH[Math.abs(n) % GLITCH.length];
  }
  return out;
}
