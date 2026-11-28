import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metaDescription } from '../src/lib/seo/meta-description';

test('metaDescription keeps short text and cuts long text at a word', () => {
  assert.equal(metaDescription('  Kısa  açıklama '), 'Kısa açıklama');
  const long = 'kelime '.repeat(40);
  const out = metaDescription(long);
  assert.ok(out.length <= 160);
  assert.ok(out.endsWith('kelime…'));
  assert.equal(metaDescription(null), '');
});
