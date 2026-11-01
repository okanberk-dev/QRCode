import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { walkPublicRoutes, OUTPUT_FILE } from '../scripts/generate-public-routes.mjs';
import { discoverPublicRoutes } from '../src/lib/seo/route-discovery';
import { isIndexableMenu } from '../src/lib/seo/indexable-menu';

test('committed public route manifest matches src/app/[locale]', () => {
  const fresh = walkPublicRoutes() as string[];
  const committed = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')) as string[];
  assert.deepEqual(
    committed,
    fresh,
    'run `node scripts/generate-public-routes.mjs` and commit the JSON',
  );
});

test('sitemap routes include the core marketing pages', () => {
  const paths = new Set(discoverPublicRoutes().map((r) => r.path));
  for (const p of ['', 'pricing', 'features', 'solutions', 'solutions/restaurants', 'blog', 'help', 'faq']) {
    assert.ok(paths.has(p), `missing route: "${p}"`);
  }
});

test('sitemap routes skip private, redirecting and noindex pages', () => {
  const paths = discoverPublicRoutes().map((r) => r.path);
  for (const p of paths) {
    assert.ok(!/^(auth|dashboard|onboarding|accept-invite)(\/|$)/.test(p), `private route listed: ${p}`);
  }
  for (const alias of ['solutions/otel', 'solutions/klinik', 'solutions/hotel', 'help/search']) {
    assert.ok(!paths.includes(alias), `alias/noindex route listed: ${alias}`);
  }
  const home = discoverPublicRoutes().find((r) => r.path === '');
  assert.equal(home?.priority, 1);
});

test('privacy policy is listed once per locale', () => {
  const routes = discoverPublicRoutes();
  assert.deepEqual(routes.find((r) => r.path === 'gizlilik')?.locales, ['tr']);
  assert.deepEqual(routes.find((r) => r.path === 'privacy')?.locales, ['en']);
});

test('isIndexableMenu keeps test and near-empty menus out of the index', () => {
  assert.equal(isIndexableMenu({ slug: 'deneme', name: 'Deneme', itemCount: 20 }), false);
  assert.equal(isIndexableMenu({ slug: 'mamas-burger', name: 'Test Kafe', itemCount: 20 }), false);
  assert.equal(isIndexableMenu({ slug: 'demo-menu', name: 'Menü', itemCount: 20 }), false);
  assert.equal(isIndexableMenu({ slug: 'mamas-burger', name: "Mama's Burger", itemCount: 2 }), false);
  assert.equal(isIndexableMenu({ slug: 'mamas-burger', name: "Mama's Burger", itemCount: 12 }), true);
  // Words that merely start with a test keyword are real names.
  assert.equal(isIndexableMenu({ slug: 'testi-kebap', name: 'Testi Kebap', itemCount: 12 }), true);
  assert.equal(isIndexableMenu({ slug: 'demokrasi-cafe', name: 'Demokrasi Cafe', itemCount: 12 }), true);
});
