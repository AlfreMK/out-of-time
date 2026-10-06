/**
 * Spanish (neutral Latin American), keyed by the English text: one dictionary per part of the game,
 * each one typed against its `…Text` in `keys.ts`.
 */
import { ARAUCANIA } from './araucania.ts';
import { FUTURE } from './future.ts';
import { MEDIEVAL } from './medieval.ts';
import { PREHISTORY } from './prehistory.ts';
import { RUINS } from './ruins.ts';
import { SCENES } from './scenes.ts';
import { UI } from './ui.ts';
import type { Text } from '../keys.ts';

export const ES = { ...PREHISTORY, ...MEDIEVAL, ...ARAUCANIA, ...FUTURE, ...RUINS, ...SCENES, ...UI } satisfies Record<Text, string>;
