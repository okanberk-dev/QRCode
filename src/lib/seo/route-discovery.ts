import fs from 'node:fs';
import path from 'node:path';
import { ROUTE_OVERRIDES, type ChangeFreq } from './route-overrides';

// Auto-discover public marketing/landing routes by walking src/app/[locale]/.
// Any directory containing a page.tsx becomes a route — except those in
// EXCLUDE_DIRS (auth, dashboard, onboarding, accept-invite) or REDIRECT_ALIASES
// (paths whose page.tsx only re-exports redirect() and would emit duplicate
// canonical URLs). Dynamic segments ([slug], [id]) are surfaced separately
// so sitemap.ts can fetch them from Prisma / static arrays.
//
// Trade-off: filesystem walk happens at module-load time on Node runtime.
// sitemap.ts already pins `dynamic = 'force-dynamic'` + 1 h revalidate, and
// the walk runs once per cold start (not per request). On Vercel, the source
// tree is bundled with the function — process.cwd() resolves to the project
// root. Keep this file Node-only; do not import in edge runtime contexts.

export type DiscoveredRoute = {
  path: string;
  priority: number;
  changefreq: ChangeFreq;
};

const APP_LOCALE_DIR = path.join(process.cwd(), 'src', 'app', '[locale]');

const EXCLUDE_DIRS = new Set([
  'auth',
  'dashboard',
  'onboarding',
  'accept-invite',
]);

// Directories whose page.tsx only calls redirect() — listing them here is
// simpler than scanning file contents and unambiguous (CLAUDE.md §7
// abstraction discipline). Update if a new alias is added.
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

const DEFAULT_PRIORITY = 0.7;
const DEFAULT_CHANGEFREQ: ChangeFreq = 'monthly';

function isDynamicSegment(name: string): boolean {
  return name.startsWith('[') || name.startsWith('(') || name.startsWith('_');
}

function inferMetadata(routePath: string): { priority: number; changefreq: ChangeFreq } {
  const override = ROUTE_OVERRIDES[routePath];
  if (override?.priority !== undefined && override?.changefreq !== undefined) {
    return { priority: override.priority, changefreq: override.changefreq };
  }

  // Heuristic: solutions/* are sector landing pages — prioritize.
  let priority = DEFAULT_PRIORITY;
  let changefreq: ChangeFreq = DEFAULT_CHANGEFREQ;

  if (routePath.startsWith('solutions/')) {
    priority = 0.9;
  }

  return {
    priority: override?.priority ?? priority,
    changefreq: override?.changefreq ?? changefreq,
  };
}

function walk(currentDir: string, relativePath: string, out: DiscoveredRoute[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    // Directory missing in some build environments — skip silently.
    return;
  }

  // A directory becomes a route if it contains page.tsx (and is not excluded
  // / dynamic). Subdirectories are walked regardless so nested public routes
  // (e.g. solutions/restaurants, vs/individual-qr) are surfaced.
  const hasPage = entries.some((e) => e.isFile() && e.name === 'page.tsx');
  if (hasPage && relativePath !== '' && !REDIRECT_ALIASES.has(relativePath)) {
    out.push({ path: relativePath, ...inferMetadata(relativePath) });
  } else if (hasPage && relativePath === '') {
    // Root /[locale]/page.tsx — emit as the home route.
    out.push({ path: '', ...inferMetadata('') });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (isDynamicSegment(entry.name)) continue;

    const childRelative = relativePath === '' ? entry.name : `${relativePath}/${entry.name}`;
    walk(path.join(currentDir, entry.name), childRelative, out);
  }
}

let cached: DiscoveredRoute[] | null = null;

export function discoverPublicRoutes(): DiscoveredRoute[] {
  if (cached) return cached;
  const out: DiscoveredRoute[] = [];
  walk(APP_LOCALE_DIR, '', out);
  out.sort((a, b) => a.path.localeCompare(b.path));
  cached = out;
  return out;
}
