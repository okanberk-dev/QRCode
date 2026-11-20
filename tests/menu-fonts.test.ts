// menu-design-final.md §10, §13 (chunk 2) — source-level guard for the menu
// font module: OFL Google fonts only, preload:false, latin + latin-ext, literal
// options, and every --font-m-* variable the typeface stacks use is declared.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MENU_TYPEFACES, TYPEFACES } from '../src/lib/menu-design';

const SRC = readFileSync(path.join(__dirname, '..', 'src', 'components', 'menu', 'menu-fonts.ts'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Every `Family({ ... })` call with its literal options text. */
function fontCalls(code: string): { family: string; options: string }[] {
  const out: { family: string; options: string }[] = [];
  const re = /\b([A-Z][A-Za-z_]+)\(\{([\s\S]*?)\}\);/g;
  for (let m = re.exec(code); m; m = re.exec(code)) out.push({ family: m[1], options: m[2] });
  return out;
}

const CALLS = fontCalls(CODE);
const IMPORTED = (CODE.match(/import\s*\{([^}]*)\}\s*from\s*'next\/font\/google'/)?.[1] ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

test('menu-fonts imports only from next/font/google and declares five families', () => {
  assert.deepEqual(IMPORTED.slice().sort(), ['Bricolage_Grotesque', 'Fraunces', 'Instrument_Serif', 'Newsreader', 'Playfair_Display']);
  assert.equal(CALLS.length, IMPORTED.length);
  for (const c of CALLS) assert.ok(IMPORTED.includes(c.family), `${c.family} is not imported from next/font/google`);
  assert.doesNotMatch(CODE, /localFont|next\/font\/local/);
  const imports = CODE.match(/from\s+'[^']+'/g) ?? [];
  assert.deepEqual(imports, ["from 'next/font/google'"]);
});

test('every font call uses preload:false, latin + latin-ext and literal options', () => {
  for (const { family, options } of CALLS) {
    assert.match(options, /\bpreload:\s*false\b/, `${family}: preload must be false`);
    assert.match(options, /subsets:\s*\[\s*'latin',\s*'latin-ext'\s*\]/, `${family}: subsets must be latin + latin-ext`);
    assert.match(options, /\bdisplay:\s*'swap'/, `${family}: display must be swap`);
    assert.match(options, /\bvariable:\s*'--font-m-[a-z]+'/, `${family}: variable must be a --font-m-* literal`);
    assert.doesNotMatch(options, /\.\.\./, `${family}: no spreads inside next/font options`);
  }
});

test('Clash Display never appears in the menu font module (except the warning comment)', () => {
  assert.doesNotMatch(CODE, /clash/i);
  assert.doesNotMatch(CODE, /--font-heading/);
});

test('every --font-m-* variable used by TYPEFACES is declared in menu-fonts.ts', () => {
  const declared = new Set(CALLS.map((c) => c.options.match(/variable:\s*'(--font-m-[a-z]+)'/)?.[1]).filter(Boolean));
  const used = new Set<string>();
  for (const k of MENU_TYPEFACES) {
    for (const stack of [TYPEFACES[k].display, TYPEFACES[k].body]) {
      for (const m of stack.matchAll(/--font-m-[a-z]+/g)) used.add(m[0]);
    }
  }
  assert.ok(used.size >= 5, 'the stacks reference the menu font variables');
  for (const v of used) assert.ok(declared.has(v), `${v} is used by a typeface stack but not declared`);
});

test('MENU_FONT_VARIABLES joins every declared family', () => {
  const m = CODE.match(/export const MENU_FONT_VARIABLES\s*=\s*`([^`]*)`/);
  assert.ok(m, 'MENU_FONT_VARIABLES is exported as a template literal');
  const names = [...m[1].matchAll(/\$\{(\w+)\.variable\}/g)].map((x) => x[1]);
  const consts = [...CODE.matchAll(/const (\w+) = [A-Z][A-Za-z_]+\(\{/g)].map((x) => x[1]);
  assert.deepEqual(names.slice().sort(), consts.slice().sort());
});
