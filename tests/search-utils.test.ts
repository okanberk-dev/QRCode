import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findMatch,
  matchesQuery,
  snippetAround,
  isPanelHref,
  readRecent,
  rememberRecent,
  clearRecent,
  readableOn,
  businessAvatarColor,
  RECENT_LIMIT,
} from '../src/components/panel/search/search-utils';

// Minimal in-memory localStorage so the recent-list helpers run under node.
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
}

test('findMatch folds Turkish letters and accents, range points at the original text', () => {
  assert.deepEqual(findMatch('İşletme Kadıköy', 'isletme'), [0, 7]);
  assert.deepEqual(findMatch('Iğdır şubesi', 'igdir'), [0, 5]);
  assert.deepEqual(findMatch('Café Moda', 'cafe'), [0, 4]);
  const text = 'Harika bir ŞUBE';
  const [s, e] = findMatch(text, 'sube')!;
  assert.equal(text.slice(s, e), 'ŞUBE');
  assert.equal(findMatch('Kadıköy', 'ankara'), null);
  assert.equal(findMatch('Kadıköy', '   '), null);
});

test('matchesQuery: empty query matches, otherwise any field', () => {
  assert.equal(matchesQuery(['a', null], ''), true);
  assert.equal(matchesQuery([null, 'Üsküdar şubesi'], 'uskudar'), true);
  assert.equal(matchesQuery(['Beşiktaş'], 'kadikoy'), false);
});

test('snippetAround keeps the match visible in long comments', () => {
  const short = 'Kısa yorum';
  assert.equal(snippetAround(short, 'yorum'), short);
  const long = `${'Başlangıç metni '.repeat(12)}servis çok yavaştı ${'son '.repeat(30)}`;
  const snip = snippetAround(long, 'yavaştı', 120);
  assert.ok(snip.includes('yavaştı'));
  assert.ok(snip.startsWith('…'));
  assert.ok(snip.length <= 121);
});

test('isPanelHref accepts panel paths only', () => {
  assert.equal(isPanelHref('/tr/dashboard', '/tr/dashboard'), true);
  assert.equal(isPanelHref('/tr/dashboard/qr?new=1', '/tr/dashboard'), true);
  assert.equal(isPanelHref('/admin/reviews', '/admin'), true);
  assert.equal(isPanelHref('//evil.com/admin', '/admin'), false);
  assert.equal(isPanelHref('https://evil.com/admin', '/admin'), false);
  assert.equal(isPanelHref('/admin/../tr/pricing', '/admin'), false);
  assert.equal(isPanelHref('/administrator', '/admin'), false);
  assert.equal(isPanelHref('/tr/pricing', '/tr/dashboard'), false);
});

test('recent list: newest first, deduplicated, capped, rejects foreign paths', () => {
  const store = installStorage();
  const key = 'test:recent';
  clearRecent(key);
  for (let i = 0; i < RECENT_LIMIT + 2; i += 1) {
    rememberRecent(key, '/admin', { href: `/admin/p${i}`, label: `P${i}`, kind: 'page' });
  }
  rememberRecent(key, '/admin', { href: '/admin/p3', label: 'P3', kind: 'page' });
  const list = readRecent(key, '/admin');
  assert.equal(list.length, RECENT_LIMIT);
  assert.equal(list[0].href, '/admin/p3');
  assert.equal(new Set(list.map((e) => e.href)).size, list.length);

  const before = readRecent(key, '/admin');
  rememberRecent(key, '/admin', { href: 'https://evil.com', label: 'x', kind: 'page' });
  assert.deepEqual(readRecent(key, '/admin'), before);

  store.set(key, '{not json');
  assert.deepEqual(readRecent(key, '/admin'), []);
  clearRecent(key);
  assert.equal(store.has(key), false);
});

test('readableOn and businessAvatarColor', () => {
  assert.equal(readableOn('#5D3EBC'), '#FFFFFF');
  assert.equal(readableOn('#FFD400'), '#111110');
  assert.equal(businessAvatarColor('#C6F24E'), null);
  assert.equal(businessAvatarColor('nope'), null);
  assert.equal(businessAvatarColor('#1E3A8A'), '#1E3A8A');
});
