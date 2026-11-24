import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveDatabaseUrl, resolveDatabaseUrl } from '../src/lib/database-url';

const TX = 'postgres://postgres.ref:p%40ss%2Fw0rd@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20';

test('switches the Supabase transaction pooler to the session pooler', () => {
  const out = new URL(resolveDatabaseUrl(TX, undefined)!);
  assert.equal(out.port, '5432');
  assert.equal(out.hostname, 'aws-1-us-east-1.pooler.supabase.com');
  assert.equal(out.searchParams.get('pgbouncer'), null);
  assert.equal(out.searchParams.get('connection_limit'), '5');
  assert.equal(out.searchParams.get('pool_timeout'), '20');
  // The password survives untouched (still percent-encoded).
  assert.equal(out.password, 'p%40ss%2Fw0rd');
  assert.equal(out.username, 'postgres.ref');
});

test('keeps a smaller connection limit', () => {
  const out = new URL(resolveDatabaseUrl(TX.replace('connection_limit=10', 'connection_limit=3'), '')!);
  assert.equal(out.searchParams.get('connection_limit'), '3');
});

test('DATABASE_POOL_MODE=transaction leaves the address as it is', () => {
  assert.equal(resolveDatabaseUrl(TX, 'transaction'), TX);
  assert.equal(resolveDatabaseUrl(TX, ' Transaction '), TX);
});

test('leaves other addresses alone', () => {
  for (const url of [
    'postgres://u:p@localhost:5432/db',
    'postgres://u:p@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
    'postgres://u:p@db.example.com:6543/postgres?pgbouncer=true',
    'not a url',
  ]) {
    assert.equal(resolveDatabaseUrl(url, undefined), url);
  }
  assert.equal(resolveDatabaseUrl(undefined, undefined), undefined);
});

test('next build keeps the transaction pooler (worker processes would exceed the session cap)', () => {
  assert.equal(effectiveDatabaseUrl({ DATABASE_URL: TX, NEXT_PHASE: 'phase-production-build' }), TX);
  assert.equal(effectiveDatabaseUrl({ DATABASE_URL: TX, IS_NEXT_WORKER: 'true' }), TX);
  assert.equal(new URL(effectiveDatabaseUrl({ DATABASE_URL: TX })!).port, '5432');
});
