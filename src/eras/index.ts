import type { EraId } from '../game/state.ts';
import { ARAUCANIA } from './araucania.ts';
import { FUTURE } from './future.ts';
import { MEDIEVAL } from './medieval.ts';
import { PREHISTORY } from './prehistory.ts';
import { RUINS } from './ruins.ts';
import type { EraDef } from './types.ts';

export const ERAS: Record<EraId, EraDef> = {
  prehistory: PREHISTORY,
  medieval: MEDIEVAL,
  araucania: ARAUCANIA,
  future: FUTURE,
  ruins: RUINS,
};
