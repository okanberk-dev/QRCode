// menu-design-final.md §9.3, §13 (chunk 2) — static guards for the public menu
// components: container queries only (no viewport breakpoints), no `${hex}AA`
// colour concatenation, no dead `animate-in` classes, no raw --font-heading
// (the scope re-points it to --font-menu-heading) and no injected HTML.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..', 'src', 'components', 'menu');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

/** Source with block and line comments removed (strings are left alone). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const FILES = walk(ROOT).map((file) => ({
  rel: path.relative(ROOT, file),
  tsx: file.endsWith('.tsx'),
  code: stripComments(readFileSync(file, 'utf8')),
}));

function offenders(re: RegExp, only: (f: (typeof FILES)[number]) => boolean = (f) => f.tsx): string[] {
  const out: string[] = [];
  for (const f of FILES.filter(only)) {
    f.code.split('\n').forEach((line, i) => {
      if (re.test(line)) out.push(`${f.rel}:${i + 1}: ${line.trim()}`);
    });
  }
  return out;
}

test('the guard sees the menu components', () => {
  const names = FILES.map((f) => f.rel);
  for (const want of ['PublicMenuView.tsx', 'ProductDetailModal.tsx', 'MenuSplash.tsx', path.join('parts', 'ItemList.tsx')]) {
    assert.ok(names.includes(want), `${want} is scanned`);
  }
});

test('no viewport breakpoint prefixes (container queries only)', () => {
  assert.deepEqual(offenders(/(?<![\w@/-])(sm|md|lg|xl|2xl):/), []);
});

test('no `${…}` immediately followed by two hex digits (no hex alpha concatenation)', () => {
  assert.deepEqual(offenders(/\$\{[^}]*\}[0-9a-fA-F]{2}/, () => true), []);
});

test('no dead animate-in classes', () => {
  assert.deepEqual(offenders(/animate-in/, () => true), []);
});

test('--font-heading is only ever re-pointed to --font-menu-heading', () => {
  const bad = offenders(/--font-heading/, () => true)
    .filter((l) => !/['"]--font-heading['"]\s*:\s*['"]var\(--font-menu-heading\)['"]/.test(l));
  assert.deepEqual(bad, []);
});

test('no dangerouslySetInnerHTML in the menu components', () => {
  assert.deepEqual(offenders(/dangerouslySetInnerHTML/, () => true), []);
});

test('Clash Display never reaches a menu component', () => {
  assert.deepEqual(offenders(/clash/i, (f) => !f.rel.endsWith('menu-fonts.ts')), []);
});
