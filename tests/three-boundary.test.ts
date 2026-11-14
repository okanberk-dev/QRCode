import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * three.js must never reach a page's initial JavaScript (CLAUDE.md §50).
 * Only files under src/components/marketing/three/scenes/ may import values
 * from 'three', and those scene modules may only be loaded through
 * ThreeStage's dynamic import map. A single static import elsewhere would
 * add ~130 KB gzip to every page that renders it.
 */

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const SCENES_DIR = join('src', 'components', 'marketing', 'three', 'scenes') + sep;
const THREE_STAGE = join('src', 'components', 'marketing', 'three', 'ThreeStage.tsx');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|cts|js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((full) => ({ rel: relative(ROOT, full), text: readFileSync(full, 'utf8') }));

test("only scene modules import values from 'three'", () => {
  const offenders: string[] = [];
  for (const { rel, text } of files) {
    if (rel.startsWith(SCENES_DIR)) continue;
    const valueImport = /^\s*import\s+(?!type\b)[^;]*?from\s+['"]three(?:\/[^'"]*)?['"]/m.test(text);
    const sideEffectImport = /^\s*import\s+['"]three(?:\/[^'"]*)?['"]/m.test(text);
    const dynamicOrRequire = /(?:import|require)\(\s*['"]three(?:\/[^'"]*)?['"]\s*\)/.test(text);
    if (valueImport || sideEffectImport || dynamicOrRequire) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `value imports of 'three' outside scenes/: ${offenders.join(', ')}`);
});

test('scene modules load only through ThreeStage dynamic imports', () => {
  const offenders: string[] = [];
  for (const { rel, text } of files) {
    if (rel.startsWith(SCENES_DIR)) continue;
    const mentionsScenes = /['"][^'"]*three\/scenes\/[^'"]*['"]|['"]\.\/scenes\/[^'"]*['"]/.test(text);
    if (!mentionsScenes) continue;
    if (rel === THREE_STAGE) {
      const staticImport = /^\s*import\s+[^;]*?from\s+['"]\.\/scenes\//m.test(text);
      if (staticImport) offenders.push(`${rel} (static import)`);
      continue;
    }
    offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `scene modules referenced outside ThreeStage: ${offenders.join(', ')}`);
});
