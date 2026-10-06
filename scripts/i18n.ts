/**
 * Collects the English text in the game's source into the `…Text` types of `src/i18n/keys.ts`, which
 * every dictionary must match exactly (`satisfies Record<…Text, string>`), so the typecheck catches
 * any missing, misspelled or outdated translation.
 *
 *   npm run i18n                    rewrites src/i18n/keys.ts from the source
 *   node scripts/i18n.ts            (part of `npm run validate`) fails if keys.ts is out of date, or
 *                                   if text is built with a template literal outside src/i18n
 *   node scripts/i18n.ts --missing  lists, as JSON, the text each Spanish dictionary still lacks
 *
 * "Text" is every string literal that reads like prose: it has a lowercase letter and either a space
 * or a capital first letter, or it's in capitals with a word of four letters or more. Identifiers,
 * markers, file paths, error messages and console output are skipped; `IGNORE` lists the rest that
 * never reaches the screen. Text built from values belongs in `src/i18n/messages.ts`, and names of
 * items, characters and eras are translated by id, so their files aren't scanned.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['src', 'src/eras', 'src/scenes', 'src/game', 'src/game/entities', 'src/engine'];
/** Files with no player-facing text (map rows, tile looks, rendering and audio internals). */
const SKIP = /(-map|tiledefs|looks|art|text|screen|audio|sprite|random|pathfinding|tilemap|types|flags|items|speakers|info)\.ts$/;
/** Prose-looking literals that never reach the screen. */
const IGNORE = new Set<string>([]);

const KEYS_FILE = 'src/i18n/keys.ts';

/** One dictionary per group of source files; the last group takes every file the others don't. */
const GROUPS: ReadonlyArray<{ type: string; dictionary: string; files: (file: string) => boolean }> = [
  { type: 'PrehistoryText', dictionary: 'prehistory', files: (f) => f === 'src/eras/prehistory.ts' },
  { type: 'MedievalText', dictionary: 'medieval', files: (f) => f === 'src/eras/medieval.ts' },
  { type: 'AraucaniaText', dictionary: 'araucania', files: (f) => f === 'src/eras/araucania.ts' },
  { type: 'FutureText', dictionary: 'future', files: (f) => f === 'src/eras/future.ts' },
  { type: 'RuinsText', dictionary: 'ruins', files: (f) => f === 'src/eras/ruins.ts' },
  { type: 'ScenesText', dictionary: 'scenes', files: (f) => f.startsWith('src/scenes/') || f === 'src/eras/shared.ts' },
  { type: 'UiText', dictionary: 'ui', files: () => true },
];

function sourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of DIRS) {
    for (const name of readdirSync(join(ROOT, dir))) {
      if (name.endsWith('.ts') && !SKIP.test(name)) files.push(join(ROOT, dir, name));
    }
  }
  return files;
}

/** Collects string and template literals from TypeScript source, skipping comments and regex literals. */
export function literals(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  let lastSignificant = '';

  const readQuoted = (quote: string): string => {
    let value = '';
    i++;
    while (i < src.length && src[i] !== quote) {
      if (src[i] === '\\') {
        value += unescape(src[i + 1]);
        i += 2;
      } else value += src[i++];
    }
    i++;
    return value;
  };

  /** Reads a template literal from its opening backtick; returns its pattern and scans nested code. */
  const readTemplate = (): string => {
    let value = '';
    let holes = 0;
    i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') {
        value += unescape(src[i + 1]);
        i += 2;
      } else if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        scanCode('}');
        i++;
        value += `{${holes++}}`;
      } else value += src[i++];
    }
    i++;
    return value;
  };

  const before = (n: number): string => src.slice(Math.max(0, i - n), i);

  const keep = (value: string): void => {
    const context = before(40);
    if (/(from\s*|import\(\s*)$/.test(context)) return;
    if (/(Error\(\s*|console\.\w+\([^)]*)$/.test(context)) return;
    out.push(value);
  };

  /** Scans code up to an unmatched `end` (or the end of the file). */
  function scanCode(end: string | null): void {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') i++;
      } else if (c === '/' && src[i + 1] === '*') {
        i = src.indexOf('*/', i + 2) + 2;
        if (i === 1) i = src.length;
      } else if (c === '/' && (lastSignificant === '' || '(,=:[!&|?{};+-*%<>~^'.includes(lastSignificant) || /\breturn$/.test(before(6)))) {
        // A regex literal: skip it, character classes included.
        i++;
        let inClass = false;
        while (i < src.length && (src[i] !== '/' || inClass)) {
          if (src[i] === '\\') i++;
          else if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          i++;
        }
        i++;
        while (/[a-z]/.test(src[i] ?? '')) i++;
        lastSignificant = ')';
      } else if (c === "'" || c === '"') {
        const start = i;
        const value = readQuoted(c);
        const saved = i;
        i = start;
        keep(value);
        i = saved;
        lastSignificant = ')';
      } else if (c === '`') {
        const start = i;
        const value = readTemplate();
        const saved = i;
        i = start;
        keep(value);
        i = saved;
        lastSignificant = ')';
      } else {
        if (c === '{' || c === '(' || c === '[') depth++;
        if (c === '}' || c === ')' || c === ']') {
          if (depth === 0 && c === end) return;
          depth--;
        }
        if (!/\s/.test(c)) lastSignificant = c;
        i++;
      }
    }
  }

  scanCode(null);
  return out;
}

function unescape(c: string | undefined): string {
  switch (c) {
    case 'n':
      return '\n';
    case 't':
      return '\t';
    default:
      return c ?? '';
  }
}

/** Whether a literal reads like text for the player. */
export function isProse(value: string): boolean {
  if (IGNORE.has(value)) return false;
  const letters = value.replace(/\{\d+\}/g, '');
  if (letters === '...') return true; // a speechless line
  // All-caps text (HUD headings, robot barks, machine readouts) needs a real word, so map markers don't count.
  if (!/[a-z]/.test(letters)) return /[A-Z]{4,}/.test(letters) || /^[\d,]+ (AD|BC)$/.test(letters);
  if (/^[a-z][\w-]*(\.[\w-]+)+$/.test(letters)) return false; // file names, dotted keys
  if (/^(rgba?|hsla?|translate)\(|^(bold )?[\d.]+px |^\(pointer|^[\w-]+:\w|^[a-z]+-[a-z]+ /.test(letters)) return false; // CSS, flags
  // A capital after any opening punctuation counts too ('...Ow.', '(Charming.)').
  return letters.includes(' ') || /^[.…(¿¡"']*[A-ZÁÉÍÓÚÑ]/.test(letters.trim()) || /^(\*\w+\*|\([a-z ]+\))$/.test(letters); // or Pip's *noises*, or (a note)
}

export function sourceText(): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  for (const file of sourceFiles()) {
    const found = [...new Set(literals(readFileSync(file, 'utf8')).filter(isProse))];
    if (found.length > 0) byFile.set(relative(ROOT, file), found);
  }
  return byFile;
}

/** The text of each group, in order of appearance. */
export function groupedText(byFile: Map<string, string[]>): Map<string, string[]> {
  const groups = new Map<string, string[]>(GROUPS.map((g) => [g.type, []]));
  for (const [file, texts] of byFile) {
    const group = GROUPS.find((g) => g.files(file))!;
    const list = groups.get(group.type)!;
    for (const text of texts) if (!list.includes(text)) list.push(text);
  }
  return groups;
}

/** A TypeScript string literal in the project's style (single quotes). */
export function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function keysFile(groups: Map<string, string[]>): string {
  const types = [...groups].map(([type, texts]) => `export type ${type} =\n${texts.map((t) => `  | ${quote(t)}`).join('\n') || '  never'};\n`);
  return `/**
 * The English text in the source, one type per dictionary. Generated by \`npm run i18n\`: don't edit
 * by hand. Each dictionary in src/i18n/<lang>/ is declared \`satisfies Record<…Text, string>\`.
 */
${types.join('\n')}
export type Text = ${[...groups.keys()].join(' | ')};
`;
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  const byFile = sourceText();
  const templates = [...byFile].flatMap(([file, texts]) => texts.filter((t) => /\{\d+\}/.test(t)).map((t) => `  ${file}: ${JSON.stringify(t)}`));
  const groups = groupedText(new Map([...byFile].map(([f, texts]) => [f, texts.filter((t) => !/\{\d+\}/.test(t))])));
  const generated = keysFile(groups);
  const total = [...groups.values()].reduce((n, t) => n + t.length, 0);

  if (process.argv.includes('--missing')) {
    const { ES } = await import('../src/i18n/es/index.ts');
    const dict: Readonly<Record<string, string>> = ES;
    const missing = Object.fromEntries(
      [...groups].map(([type, texts]) => [GROUPS.find((g) => g.type === type)!.dictionary, texts.filter((t) => dict[t] === undefined)]),
    );
    console.log(JSON.stringify(missing, null, 2));
  } else if (process.argv.includes('--write')) {
    writeFileSync(join(ROOT, KEYS_FILE), generated);
    console.log(`Wrote ${KEYS_FILE} (${total} texts).`);
  } else {
    let failed = false;
    if (templates.length > 0) {
      console.error(`Text built with template literals: move it to src/i18n/messages.ts.\n${templates.join('\n')}`);
      failed = true;
    }
    if (readFileSync(join(ROOT, KEYS_FILE), 'utf8') !== generated) {
      console.error(`${KEYS_FILE} is out of date: run \`npm run i18n\`, then translate what the typecheck reports.`);
      failed = true;
    }
    if (failed) process.exit(1);
    console.log(`Translations OK (${total} texts).`);
  }
}
