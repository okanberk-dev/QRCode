import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { toolVisibility } from '../src/lib/feature-visibility';
import { RETIRED_PAGES, retiredPageRedirects } from '../src/lib/seo/retired-pages';
import routes from '../src/lib/seo/public-routes.generated.json';

test('surveys / audits show only when used, unless the operator overrides', () => {
  assert.deepEqual(toolVisibility({ surveys: 0, audits: 0 }, {}), { surveys: false, audits: false });
  assert.deepEqual(toolVisibility({ surveys: 2, audits: 0 }, {}), { surveys: true, audits: false });
  assert.deepEqual(toolVisibility({ surveys: 0, audits: 0 }, { FEATURE_SURVEYS: 'on', FEATURE_AUDITS: '1' }), {
    surveys: true,
    audits: true,
  });
  assert.deepEqual(toolVisibility({ surveys: 5, audits: 5 }, { FEATURE_SURVEYS: 'off', FEATURE_AUDITS: 'false' }), {
    surveys: false,
    audits: false,
  });
});

test('retired pages are 301s to pages that exist, and are gone from the sitemap', () => {
  const list = routes as unknown as string[];
  for (const r of RETIRED_PAGES) {
    assert.ok(!list.includes(r.from), `${r.from} still in sitemap routes`);
    assert.ok(!existsSync(path.join('src/app/[locale]', r.from, 'page.tsx')), `${r.from} page still exists`);
    assert.ok(existsSync(path.join('src/app/[locale]', r.to, 'page.tsx')), `${r.to} target missing`);
  }
  for (const r of retiredPageRedirects()) {
    assert.equal(r.statusCode, 301);
    assert.match(r.source, /^\/:locale\(tr\|en\)\//);
  }
});
