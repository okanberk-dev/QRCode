/**
 * Guard for the Pano panel design (CLAUDE.md §63, docs/design/DASHBOARD_DESIGN.md):
 * panel code uses black + Pulse lime, not a retired accent (lumin lime,
 * Fintora green, Getir purple), and no `pulse-eyebrow` labels. Customer-facing
 * data defaults (a business's brand colour, menu accent, survey accent,
 * loyalty card swatches) may still name those hex values; they are listed
 * below on purpose.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const PANEL_DIRS = [
  'src/app/admin',
  'src/app/[locale]/dashboard',
  'src/components/dashboard',
  'src/components/admin',
  'src/components/panel',
];

// Files whose matches are data (customer brand / menu / survey / card colours).
const DATA_DEFAULTS = new Set([
  'src/app/[locale]/dashboard/loyalty/_components/ProgramEditor.tsx',
  'src/app/[locale]/dashboard/restaurants/[id]/menu/_components/data/useMenuData.ts',
  'src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-constants.ts',
  'src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-theme.ts',
  'src/app/[locale]/dashboard/restaurants/[id]/menu/_components/studio/MenuStudio.tsx',
  'src/app/[locale]/dashboard/surveys/_components/SurveyEditorClient.tsx',
  'src/app/[locale]/dashboard/surveys/_components/survey-editor-state.ts',
  'src/app/admin/restaurants/RestaurantsClient.tsx',
  'src/app/admin/restaurants/[id]/menu/page.tsx',
  'src/app/admin/restaurants/[id]/page.tsx',
  'src/components/dashboard/BrandIdentityCard.tsx',
  // Official platform brand colours (the Getir chip is purple).
  'src/components/dashboard/ChannelDistribution.tsx',
  // Compares a stored business colour with the old default brand colour.
  'src/components/panel/search/search-utils.ts',
]);

// Retired panel accents: lumin lime, the Fintora green (2026-11-28, one day)
// and the Getir purple ramp. The panel accent is black + Pulse lime, which
// panel code reaches through tokens (`bg-pn-olive`, `var(--pn-green)`) or
// the lime hex itself.
const BANNED = /#(?:D7FE03|78FC90|5CF07A|5D3EBC|4C2FA3|3B1F8F|EFEAFB|DCD3F6|A68FEB)\b|pulse-eyebrow/i;

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
}

test('panel files use the black + lime palette, not a retired accent or pulse-eyebrow', () => {
  const files: string[] = [];
  for (const dir of PANEL_DIRS) walk(join(ROOT, dir), files);
  const offenders: string[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (DATA_DEFAULTS.has(rel)) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (BANNED.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(offenders, [], `Use pn-* tokens (bg-pn-accent, text-pn-ink…) instead:\n${offenders.join('\n')}`);
});

test('the panel shell has no sidebar component and no back button', () => {
  const files: string[] = [];
  walk(join(ROOT, 'src/components/panel/pano'), files);
  const names = files.map((f) => relative(ROOT, f));
  assert.ok(names.some((n) => n.endsWith('PanelRail.tsx')), 'PanelRail is the left column');
  assert.ok(!names.some((n) => n.endsWith('PageBackButton.tsx')), 'the breadcrumb replaced the back button');
});
