import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatServerTiming, timed, timedDb, withServerTiming } from '../src/lib/server-timing';
import { embedGoogleSlug, embedOptionsFromQuery, embedVariant, parseEmbedVariant } from '../src/lib/embed-variant';

test('withServerTiming adds auth/db/total and counts overlapping queries once', async () => {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const handler = withServerTiming(async () => {
    await timed('auth', () => wait(5));
    await Promise.all([timedDb(() => wait(20)), timedDb(() => wait(20))]);
    return new Response('ok');
  });
  const res = await handler();
  const header = res.headers.get('server-timing') ?? '';
  const parts = Object.fromEntries(
    header.split(', ').map((p) => {
      const [name, dur] = p.split(';dur=');
      return [name, Number(dur)];
    }),
  );
  assert.ok(parts.auth >= 4);
  assert.ok(parts.db >= 18 && parts.db < 35, `db ${parts.db}`);
  assert.ok(parts.total >= parts.db);
});

test('timing helpers are no-ops outside a scope', async () => {
  assert.equal(await timed('auth', async () => 7), 7);
  assert.equal(await timedDb(async () => 8), 8);
});

test('formatServerTiming', () => {
  assert.equal(formatServerTiming(new Map([['db', 1.234]]), 3), 'db;dur=1.2, total;dur=3.0');
});

test('embed widget variant round-trips and clamps', () => {
  assert.equal(embedVariant(embedOptionsFromQuery({})), 'light-5-tr');
  assert.equal(embedVariant(embedOptionsFromQuery({ theme: 'dark', limit: '30', lang: 'en' })), 'dark-10-en');
  assert.equal(embedVariant(embedOptionsFromQuery({ theme: 'x', limit: '0' })), 'light-5-tr');
  assert.deepEqual(parseEmbedVariant('dark-3-en'), { theme: 'dark', limit: 3, lang: 'en' });
  assert.deepEqual(parseEmbedVariant('garbage'), { theme: 'light', limit: 5, lang: 'tr' });
  assert.equal(embedGoogleSlug('/embed/laffogato/google'), 'laffogato');
  assert.equal(embedGoogleSlug('/embed/laffogato/google/'), 'laffogato');
  assert.equal(embedGoogleSlug('/embed/laffogato/google/dark-3-en'), null);
  assert.equal(embedGoogleSlug('/embed/laffogato'), null);
});

test('embed widget rewrites cover every present/missing combination, then a default', async () => {
  const { embedGoogleRewrites } = await import('../src/lib/embed-variant');
  const rules = embedGoogleRewrites();
  assert.equal(rules.length, 9);
  assert.equal(rules[0].destination, '/embed/:slug/google/:theme-:limit-:lang');
  assert.equal(rules[7].destination, '/embed/:slug/google/light-5-tr');
  assert.equal(rules[8].has, undefined);
  assert.equal(rules[8].missing, undefined);
});
