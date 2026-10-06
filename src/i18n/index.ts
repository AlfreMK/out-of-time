/**
 * Languages. The game is written in American English, and every other language is checked by the
 * type system:
 *
 * - **Text in the source** (dialogue, labels, objectives, barks) stays in English where it's written.
 *   `npm run i18n` collects it into the `…Text` types in `keys.ts`, and each dictionary is declared
 *   `satisfies Record<…Text, string>`, so a missing, misspelled or outdated entry fails the typecheck.
 *   Era scripts hand it over as plain strings and `tr()` translates it on its way to the screen (the
 *   journal stores the English, so switching language translates what's already written too); code
 *   that names a text directly uses `t()`, which only accepts a known one.
 * - **Text built from values** (`Got: Rye Bread`) comes from the `msg()` catalog in `messages.ts`:
 *   functions with named arguments, which every language implements with the same signatures.
 * - **Names of things with an id** (items, characters, eras) come from `itemName()`, `speakerName()`
 *   and `eraInfo()`, translated in records keyed by those ids.
 */
import { ERA_INFO, type EraInfo } from '../eras/info.ts';
import { ITEMS } from '../game/items.ts';
import type { SpeakerName } from '../game/speakers.ts';
import type { EraId, ItemId } from '../game/state.ts';
import { ES } from './es/index.ts';
import { ES_MESSAGES } from './es/messages.ts';
import { ES_NAMES } from './es/names.ts';
import type { Text } from './keys.ts';
import { MESSAGES, type Messages } from './messages.ts';

export type Lang = 'en' | 'es';

export const LANGS: ReadonlyArray<{ id: Lang; name: string }> = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
];

/** Translated names for everything the game refers to by id. */
export interface Names {
  items: Readonly<Record<ItemId, string>>;
  speakers: Readonly<Record<SpeakerName, string>>;
  eras: Readonly<Record<EraId, EraInfo>>;
}

interface Language {
  text: Readonly<Record<Text, string>>;
  messages: Messages;
  names: Names;
}

const LANGUAGES: Partial<Record<Lang, Language>> = {
  es: { text: ES, messages: ES_MESSAGES, names: ES_NAMES },
};

const STORAGE_KEY = 'out-of-time.lang';

let lang: Lang = load();
const listeners = new Set<() => void>();

function load(): Lang {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    return LANGS.some((l) => l.id === saved) ? (saved as Lang) : 'en';
  } catch {
    return 'en';
  }
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Private windows can refuse storage: the choice then lasts for this session only.
  }
  listeners.forEach((listener) => listener());
}

/** Runs whenever the language changes (for text that is drawn once, like the touch overlay). */
export function onLangChange(listener: () => void): void {
  listeners.add(listener);
}

/** Translates text that arrives as a plain string (from an era script); anything unknown comes back as is. */
export function tr(text: string): string {
  const dict: Readonly<Record<string, string>> | undefined = LANGUAGES[lang]?.text;
  return dict?.[text] ?? text;
}

/** Translates a text named in code: only text listed in `keys.ts` is accepted. */
export function t(text: Text): string {
  return LANGUAGES[lang]?.text[text] ?? text;
}

/** The catalog of text built from values, in the current language. */
export function msg(): Messages {
  return LANGUAGES[lang]?.messages ?? MESSAGES;
}

export function itemName(item: ItemId): string {
  return LANGUAGES[lang]?.names.items[item] ?? ITEMS[item].name;
}

/** Item names as a comma-separated list. */
export function itemList(items: readonly ItemId[]): string {
  return items.map(itemName).join(', ');
}

/** A character's name, from the `Speaker` value that dialogue lines and the journal carry. */
export function speakerName(speaker: string): string {
  const names: Readonly<Record<string, string>> | undefined = LANGUAGES[lang]?.names.speakers;
  return names?.[speaker] ?? speaker;
}

export function eraInfo(era: EraId): EraInfo {
  return LANGUAGES[lang]?.names.eras[era] ?? ERA_INFO[era];
}
