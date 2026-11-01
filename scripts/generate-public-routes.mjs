#!/usr/bin/env node
// Writes src/lib/seo/public-routes.generated.json — the list of public
// marketing routes under src/app/[locale]/ that sitemap.xml must list.
//
// Why a generated file instead of walking the filesystem at request time:
// sitemap.xml is ISR (revalidate 1h) and regenerates inside the Vercel
// function, where src/ does not exist (only the compiled .next output is
// deployed). The old runtime walk silently returned nothing, so the live
// sitemap had no homepage, pricing, features or solutions pages at all —
// only blog, help and menu rows. A JSON import is bundled into the function.
//
// Runs before `next build` (package.json "build"), so production always
// matches the source tree. `npm test` (tests/public-routes.test.ts) fails if
// the committed file drifts from the tree during local work.
//
// Usage: node scripts/generate-public-routes.mjs [--check]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_LOCALE_DIR = path.join(ROOT, 'src', 'app', '[locale]');
export const OUTPUT_FILE = path.join(ROOT, 'src', 'lib', 'seo', 'public-routes.generated.json');

// Never public / never indexable.
const EXCLUDE_DIRS = new Set(['auth', 'dashboard', 'onboarding', 'accept-invite']);

// Rendered but `robots: noindex` — never list them.
const NOINDEX_PATHS = new Set(['help/search']);

// Directories whose page.tsx only redirects to a canonical sector page.
// Listing them would put redirecting URLs in the sitemap.
const REDIRECT_ALIASES = new Set([
  'solutions/otel',
  'solutions/klinik',
  'solutions/hukuk',
  'solutions/hotel',
  'solutions/clinic',
  'solutions/legal',
  'solutions/perakende',
  'solutions/spa',
]);

function isDynamicSegment(name) {
  return name.startsWith('[') || name.startsWith('(') || name.startsWith('_');
}

function walk(currentDir, relativePath, out) {
  let entries;
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return;
  }
  const hasPage = entries.some((e) => e.isFile() && e.name === 'page.tsx');
  if (hasPage && !REDIRECT_ALIASES.has(relativePath) && !NOINDEX_PATHS.has(relativePath)) {
    out.push(relativePath);
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (isDynamicSegment(entry.name)) continue;
    const child = relativePath === '' ? entry.name : `${relativePath}/${entry.name}`;
    walk(path.join(currentDir, entry.name), child, out);
  }
}

/** Sorted list of route paths relative to /[locale]/ ('' = home). */
export function walkPublicRoutes(appLocaleDir = APP_LOCALE_DIR) {
  const out = [];
  walk(appLocaleDir, '', out);
  return out.sort((a, b) => a.localeCompare(b));
}

function main() {
  const check = process.argv.includes('--check');
  const routes = walkPublicRoutes();
  if (routes.length === 0) {
    // Building from a tree without src/app/[locale] would wipe the sitemap.
    console.error('[generate-public-routes] no routes found — keeping the existing file');
    process.exit(check ? 1 : 0);
  }
  const next = `${JSON.stringify(routes, null, 2)}\n`;
  const current = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf8') : '';
  if (check) {
    if (current !== next) {
      console.error('[generate-public-routes] out of date — run: node scripts/generate-public-routes.mjs');
      process.exit(1);
    }
    console.log(`[generate-public-routes] up to date (${routes.length} routes)`);
    return;
  }
  if (current !== next) fs.writeFileSync(OUTPUT_FILE, next);
  console.log(`[generate-public-routes] ${routes.length} public routes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
