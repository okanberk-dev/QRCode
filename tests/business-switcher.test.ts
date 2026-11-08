import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterBusinesses,
  foldSearchText,
  groupSwitcherBusinesses,
  parseRecentBusinesses,
  pushRecentBusiness,
  RECENT_BUSINESS_MAX,
} from '../src/lib/business-switcher';

const list = [
  { id: 'a', name: 'Kadıköy Şube', category: 'Restoran', slug: 'kadikoy' },
  { id: 'b', name: 'Şişli Şube', category: 'Restoran', slug: 'sisli' },
  { id: 'c', name: 'İzmir Alsancak', category: 'Kafe', slug: 'izmir-alsancak' },
  { id: 'd', name: 'Ankara Kızılay', category: 'Restoran', slug: 'ankara' },
  { id: 'e', name: 'Beşiktaş Kafe', category: 'Kafe', slug: 'besiktas' },
  { id: 'f', name: 'Bursa Nilüfer', category: 'Restoran', slug: 'bursa' },
];

test('foldSearchText removes Turkish accents and case', () => {
  assert.equal(foldSearchText('Şişli ŞUBE'), 'sisli sube');
  assert.equal(foldSearchText('İZMİR'), 'izmir');
  assert.equal(foldSearchText('KIZILAY'), 'kizilay');
  assert.equal(foldSearchText('  Beşiktaş   Kafe '), 'besiktas kafe');
});

test('filterBusinesses matches accent-free and ranks name prefixes first', () => {
  assert.deepEqual(filterBusinesses(list, 'sisli').map((b) => b.id), ['b']);
  assert.deepEqual(filterBusinesses(list, 'IZMIR').map((b) => b.id), ['c']);
  // "kafe": "Beşiktaş Kafe" has a word starting with it; "İzmir Alsancak" only matches its category.
  assert.deepEqual(filterBusinesses(list, 'kafe').map((b) => b.id), ['e', 'c']);
  // Slug match.
  assert.deepEqual(filterBusinesses(list, 'alsancak').map((b) => b.id), ['c']);
  assert.equal(filterBusinesses(list, '').length, list.length);
  assert.equal(filterBusinesses(list, 'zzz').length, 0);
});

test('pushRecentBusiness keeps most recent first without duplicates', () => {
  assert.deepEqual(pushRecentBusiness([], 'a'), ['a']);
  assert.deepEqual(pushRecentBusiness(['a', 'b'], 'b'), ['b', 'a']);
  const many = pushRecentBusiness(['a', 'b', 'c', 'd'], 'e');
  assert.equal(many.length, RECENT_BUSINESS_MAX);
  assert.equal(many[0], 'e');
  assert.ok(!many.includes('d'));
});

test('parseRecentBusinesses tolerates junk', () => {
  assert.deepEqual(parseRecentBusinesses(null), []);
  assert.deepEqual(parseRecentBusinesses('not json'), []);
  assert.deepEqual(parseRecentBusinesses('{"a":1}'), []);
  assert.deepEqual(parseRecentBusinesses('["a", 3, "", "b"]'), ['a', 'b']);
});

test('groupSwitcherBusinesses shows recents only for long lists without a query', () => {
  const grouped = groupSwitcherBusinesses(list, '', ['d', 'missing', 'a']);
  assert.deepEqual(grouped.recent.map((b) => b.id), ['d', 'a']);
  assert.deepEqual(grouped.all.map((b) => b.id), ['b', 'c', 'e', 'f']);

  const short = groupSwitcherBusinesses(list.slice(0, 3), '', ['c']);
  assert.equal(short.recent.length, 0);
  assert.equal(short.all.length, 3);

  const searching = groupSwitcherBusinesses(list, 'şube', ['a']);
  assert.equal(searching.recent.length, 0);
  assert.deepEqual(searching.all.map((b) => b.id), ['a', 'b']);
});
