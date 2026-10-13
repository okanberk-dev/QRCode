/**
 * Places budget guard — the DB-enforced daily ceiling.
 *
 * The real thing is one atomic Postgres statement
 * (`INSERT … ON CONFLICT DO UPDATE … WHERE count < cap RETURNING count`).
 * Here the database is replaced by a tiny fake that implements exactly that
 * contract (read the key, admit while below the limit, return no row at the
 * limit) so the surrounding logic can be pinned: fail-closed behaviour, the
 * cap-0 shortcut, scope validation, key format, ordering of the two counters.
 * The statement itself is exercised against a real database by the
 * verification script run alongside this change (not part of `npm test`,
 * CLAUDE.md §32.2).
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';

import {
  PLACES_CAP_DEFAULTS,
  __resetPlacesReportingForTests,
  makeDetailsReserver,
  placesSecondsUntilReset,
  placesUsageKey,
  placesUtcDay,
  reportPlacesFailure,
  reservePlacesBudget,
  reservePlacesCall,
  resolvePlacesCap,
  type PlacesBudgetDb,
} from '../src/lib/google-places-budget';

interface RecordedCall {
  key: string;
  limit: number;
  text: string;
}

function fakeDb(opts: { failWith?: unknown; rows?: unknown } = {}) {
  const store = new Map<string, number>();
  const calls: RecordedCall[] = [];
  const db: PlacesBudgetDb = {
    $queryRaw: async (query: Prisma.Sql) => {
      const [key, limit] = query.values as [string, number];
      calls.push({ key, limit, text: query.text });
      if (opts.failWith !== undefined) throw opts.failWith;
      if (opts.rows !== undefined) return opts.rows;
      // Read-modify-write with no await in between: atomic, like the statement.
      const current = store.get(key);
      if (current === undefined) {
        store.set(key, 1);
        return [{ count: 1 }];
      }
      if (current < limit) {
        store.set(key, current + 1);
        return [{ count: current + 1 }];
      }
      return [];
    },
  };
  return { db, store, calls };
}

const NOW = new Date('2026-10-13T12:00:00.000Z');
const NEXT_DAY = new Date('2026-10-14T00:00:01.000Z');

function withEnv(vars: Record<string, string | undefined>, run: () => Promise<void> | void) {
  return async () => {
    const saved: Record<string, string | undefined> = {};
    for (const k of Object.keys(vars)) saved[k] = process.env[k];
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      await run();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
}

const CAP_ENVS = {
  PLACES_DETAILS_DAILY_CAP: undefined,
  PLACES_DETAILS_RESTAURANT_DAILY_CAP: undefined,
  PLACES_SEARCH_DAILY_CAP: undefined,
  PLACES_SEARCH_RESTAURANT_DAILY_CAP: undefined,
};

beforeEach(() => {
  __resetPlacesReportingForTests();
});

afterEach(() => {
  mock.restoreAll();
});

describe('resolvePlacesCap', () => {
  it('uses the documented defaults when the env is unset or blank', () => {
    assert.equal(PLACES_CAP_DEFAULTS.details.global, 150);
    assert.equal(PLACES_CAP_DEFAULTS.details.scoped, 30);
    assert.equal(PLACES_CAP_DEFAULTS.search.global, 200);
    assert.equal(PLACES_CAP_DEFAULTS.search.scoped, 20);
    assert.equal(resolvePlacesCap('details', 'global', {}), 150);
    assert.equal(resolvePlacesCap('details', 'scoped', {}), 30);
    assert.equal(resolvePlacesCap('search', 'global', {}), 200);
    assert.equal(resolvePlacesCap('search', 'scoped', {}), 20);
    assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: '' }), 150);
    assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: '   ' }), 150);
  });

  it('reads each of the four env variables', () => {
    const env = {
      PLACES_DETAILS_DAILY_CAP: '11',
      PLACES_DETAILS_RESTAURANT_DAILY_CAP: '12',
      PLACES_SEARCH_DAILY_CAP: '13',
      PLACES_SEARCH_RESTAURANT_DAILY_CAP: '14',
    };
    assert.equal(resolvePlacesCap('details', 'global', env), 11);
    assert.equal(resolvePlacesCap('details', 'scoped', env), 12);
    assert.equal(resolvePlacesCap('search', 'global', env), 13);
    assert.equal(resolvePlacesCap('search', 'scoped', env), 14);
  });

  it('floors fractions, trims spaces and accepts 0 as "off"', () => {
    assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: '7.9' }), 7);
    assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: ' 25 ' }), 25);
    assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: '0' }), 0);
  });

  it('a value that is set but not a number DENIES (a typo must never remove the ceiling)', () => {
    for (const bad of ['abc', '12abc', 'Infinity', '-Infinity', 'NaN', '1e999']) {
      assert.equal(resolvePlacesCap('details', 'global', { PLACES_DETAILS_DAILY_CAP: bad }), 0, bad);
    }
  });

  it('a negative value stays non-positive (so it denies)', () => {
    assert.ok(resolvePlacesCap('search', 'scoped', { PLACES_SEARCH_RESTAURANT_DAILY_CAP: '-5' }) <= 0);
  });

  it('reads process.env by default', withEnv({ ...CAP_ENVS, PLACES_SEARCH_DAILY_CAP: '3' }, () => {
    assert.equal(resolvePlacesCap('search', 'global'), 3);
  }));
});

describe('day + key helpers', () => {
  it('uses the UTC calendar day, whatever the host time zone', () => {
    assert.equal(placesUtcDay(new Date('2026-10-13T23:59:59.999Z')), '2026-10-13');
    assert.equal(placesUtcDay(new Date('2026-10-14T00:00:00.000Z')), '2026-10-14');
    assert.equal(placesUtcDay(new Date('2026-01-01T00:00:00.000Z')), '2026-01-01');
  });

  it('counts the seconds to the next UTC midnight (never zero)', () => {
    assert.equal(placesSecondsUntilReset(new Date('2026-10-13T23:59:59.000Z')), 1);
    assert.equal(placesSecondsUntilReset(new Date('2026-10-14T00:00:00.000Z')), 86400);
    assert.equal(placesSecondsUntilReset(new Date('2026-10-13T12:00:00.000Z')), 43200);
    assert.equal(placesSecondsUntilReset(new Date('2026-12-31T12:00:00.000Z')), 43200, 'year rollover');
    assert.equal(placesSecondsUntilReset(new Date('2026-10-13T23:59:59.999Z')), 1, 'rounds up, minimum 1');
  });

  it('builds <kind>:<scope>:<day> keys', () => {
    assert.equal(placesUsageKey('details', 'g', NOW), 'details:g:2026-10-13');
    assert.equal(placesUsageKey('search', 'r:abc123', NOW), 'search:r:abc123:2026-10-13');
    assert.equal(placesUsageKey('search', 'a:user_9', NEXT_DAY), 'search:a:user_9:2026-10-14');
  });
});

describe('reservePlacesCall', () => {
  it('admits calls up to the cap and then denies, leaving the counter at the cap', async () => {
    const { db, store, calls } = fakeDb();
    const a = await reservePlacesCall('details', 'g', 2, { db, now: NOW });
    const b = await reservePlacesCall('details', 'g', 2, { db, now: NOW });
    const c = await reservePlacesCall('details', 'g', 2, { db, now: NOW });
    assert.deepEqual(a, { allowed: true, count: 1 });
    assert.deepEqual(b, { allowed: true, count: 2 });
    assert.deepEqual(c, { allowed: false, count: 2, reason: 'cap_reached' });
    assert.equal(store.get('details:g:2026-10-13'), 2);
    assert.equal(calls.length, 3);
  });

  it('is one parameterised statement with the guard in the UPDATE branch', async () => {
    const { db, calls } = fakeDb();
    await reservePlacesCall('search', 'r:cmv3eha9r00037dpuqll9tbq6', 20, { db, now: NOW });
    const [call] = calls;
    assert.equal(call!.key, 'search:r:cmv3eha9r00037dpuqll9tbq6:2026-10-13');
    assert.equal(call!.limit, 20);
    assert.match(call!.text, /INSERT INTO "google_places_usage"/);
    assert.match(call!.text, /ON CONFLICT \("key"\) DO UPDATE/);
    assert.match(call!.text, /WHERE "google_places_usage"\."count" < \$2/);
    assert.match(call!.text, /RETURNING "count"/);
    assert.equal(call!.text.includes('cmv3eha9r00037dpuqll9tbq6'), false, 'the key is a bound parameter, never inlined');
    assert.match(call!.text, /now\(\) AT TIME ZONE 'UTC'/);
  });

  it('floors a fractional cap before binding it', async () => {
    const { db, calls } = fakeDb();
    await reservePlacesCall('details', 'g', 7.9, { db, now: NOW });
    assert.equal(calls[0]!.limit, 7);
  });

  it('cap 0, negative, NaN or Infinity denies WITHOUT touching the database', async () => {
    for (const cap of [0, -1, -100, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const { db, calls } = fakeDb();
      const r = await reservePlacesCall('details', 'g', cap, { db, now: NOW });
      assert.deepEqual(r, { allowed: false, count: 0, reason: 'cap_disabled' }, String(cap));
      assert.equal(calls.length, 0, `${cap} must not reach the database`);
    }
  });

  it('rejects scopes that are not g / r:<id> / a:<id> without touching the database', async () => {
    const bad = [
      '',
      'x',
      'g2',
      'G',
      'r:',
      'a:',
      'r:has space',
      "r:a'; DROP TABLE google_places_usage;--",
      'r:a:b',
      'r:' + 'a'.repeat(65),
      'details:g',
      'r:ünïcode',
    ];
    for (const scope of bad) {
      const { db, calls } = fakeDb();
      const r = await reservePlacesCall('details', scope, 10, { db, now: NOW });
      assert.deepEqual(r, { allowed: false, count: 0, reason: 'bad_scope' }, JSON.stringify(scope));
      assert.equal(calls.length, 0);
    }
  });

  it('accepts cuid, uuid and underscore ids', async () => {
    for (const scope of ['g', 'r:cmv3eha9r00037dpuqll9tbq6', 'a:3f2b8c1e-9a7d-4c55-8e21-0b6d7f4a1c33', 'r:abc_DEF-123', 'r:' + 'a'.repeat(64)]) {
      const { db } = fakeDb();
      const r = await reservePlacesCall('search', scope, 5, { db, now: NOW });
      assert.equal(r.allowed, true, scope);
    }
  });

  it('FAILS CLOSED on a database error — it never throws and never admits', async () => {
    mock.method(console, 'error', () => {});
    for (const failWith of [new Error('connection terminated'), new Error('relation "google_places_usage" does not exist'), 'string failure', null]) {
      const { db } = fakeDb({ failWith });
      const r = await reservePlacesCall('details', 'g', 100, { db, now: NOW });
      assert.deepEqual(r, { allowed: false, count: 0, reason: 'db_error' });
    }
  });

  it('does not log the database message in full or any key / place content', async () => {
    const logged: unknown[][] = [];
    mock.method(console, 'error', (...args: unknown[]) => {
      logged.push(args);
    });
    const { db } = fakeDb({ failWith: new Error('x'.repeat(500)) });
    await reservePlacesCall('details', 'r:cmv3eha9r00037dpuqll9tbq6', 100, { db, now: NOW });
    const text = JSON.stringify(logged);
    assert.equal(text.includes('cmv3eha9r00037dpuqll9tbq6'), false, 'restaurant id must not be logged');
    assert.ok(text.length < 600, 'message is truncated');
  });

  it('treats an empty result as "cap reached" and a bigint count as a number', async () => {
    const empty = await reservePlacesCall('details', 'g', 5, { db: fakeDb({ rows: [] }).db, now: NOW });
    assert.deepEqual(empty, { allowed: false, count: 5, reason: 'cap_reached' });
    const big = await reservePlacesCall('details', 'g', 100, { db: fakeDb({ rows: [{ count: BigInt(5) }] }).db, now: NOW });
    assert.deepEqual(big, { allowed: true, count: 5 });
    const weird = await reservePlacesCall('details', 'g', 100, { db: fakeDb({ rows: 'not-an-array' }).db, now: NOW });
    assert.equal(weird.allowed, false, 'an unexpected result shape never admits');
  });

  it('keeps separate counters per kind, per scope and per UTC day', async () => {
    const { db, store } = fakeDb();
    await reservePlacesCall('details', 'g', 1, { db, now: NOW });
    await reservePlacesCall('search', 'g', 1, { db, now: NOW });
    await reservePlacesCall('details', 'r:one', 1, { db, now: NOW });
    await reservePlacesCall('details', 'r:two', 1, { db, now: NOW });
    const nextDay = await reservePlacesCall('details', 'g', 1, { db, now: NEXT_DAY });
    assert.equal(nextDay.allowed, true, 'a new UTC day starts a new counter');
    const sameDay = await reservePlacesCall('details', 'g', 1, { db, now: NOW });
    assert.equal(sameDay.allowed, false);
    assert.deepEqual([...store.keys()].sort(), [
      'details:g:2026-10-13',
      'details:g:2026-10-14',
      'details:r:one:2026-10-13',
      'details:r:two:2026-10-13',
      'search:g:2026-10-13',
    ]);
  });

  it('under a burst, exactly cap calls are admitted', async () => {
    const { db, store } = fakeDb();
    const results = await Promise.all(
      Array.from({ length: 25 }, () => reservePlacesCall('details', 'g', 4, { db, now: NOW })),
    );
    assert.equal(results.filter((r) => r.allowed).length, 4);
    assert.equal(store.get('details:g:2026-10-13'), 4);
  });

  it('the 80 percent global warning never changes the outcome', async () => {
    const { db } = fakeDb();
    const counts: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await reservePlacesCall('details', 'g', 5, { db, now: NOW });
      assert.equal(r.allowed, true);
      counts.push(r.count);
    }
    assert.deepEqual(counts, [1, 2, 3, 4, 5]);
  });
});

describe('makeDetailsReserver', () => {
  it('reserves the restaurant counter, then the global one, against the right caps', withEnv(
    { ...CAP_ENVS, PLACES_DETAILS_RESTAURANT_DAILY_CAP: '2', PLACES_DETAILS_DAILY_CAP: '3' },
    async () => {
      const { db, calls } = fakeDb();
      const reserve = makeDetailsReserver('cmvrestaurant1', { db, now: NOW });
      assert.deepEqual(await reserve('restaurant'), { allowed: true, systemic: false });
      assert.deepEqual(await reserve('global'), { allowed: true, systemic: false });
      assert.deepEqual(calls.map((c) => [c.key, c.limit]), [
        ['details:r:cmvrestaurant1:2026-10-13', 2],
        ['details:g:2026-10-13', 3],
      ]);
    },
  ));

  it('a business that used its quota is NOT systemic; a zero cap and a database error ARE', withEnv(
    { ...CAP_ENVS, PLACES_DETAILS_RESTAURANT_DAILY_CAP: '1' },
    async () => {
      mock.method(console, 'error', () => {});
      const { db } = fakeDb();
      const reserve = makeDetailsReserver('cmvrestaurant2', { db, now: NOW });
      await reserve('restaurant');
      assert.deepEqual(await reserve('restaurant'), { allowed: false, systemic: false });

      process.env.PLACES_DETAILS_RESTAURANT_DAILY_CAP = '0';
      assert.deepEqual(await makeDetailsReserver('cmvrestaurant3', { db: fakeDb().db, now: NOW })('restaurant'), {
        allowed: false,
        systemic: true,
      });

      process.env.PLACES_DETAILS_RESTAURANT_DAILY_CAP = '5';
      const broken = makeDetailsReserver('cmvrestaurant4', { db: fakeDb({ failWith: new Error('down') }).db, now: NOW });
      assert.deepEqual(await broken('restaurant'), { allowed: false, systemic: true });
      assert.deepEqual(await broken('global'), { allowed: false, systemic: true });
    },
  ));
});

describe('reservePlacesBudget (search)', () => {
  it('reserves the narrow scope first, then the global counter', withEnv(CAP_ENVS, async () => {
    const { db, calls } = fakeDb();
    assert.deepEqual(await reservePlacesBudget('search', { restaurantId: 'cmvrest1' }, { db, now: NOW }), { allowed: true });
    assert.deepEqual(calls.map((c) => c.key), ['search:r:cmvrest1:2026-10-13', 'search:g:2026-10-13']);
    assert.deepEqual(calls.map((c) => c.limit), [20, 200]);
  }));

  it('keys the create-business route by actor', withEnv(CAP_ENVS, async () => {
    const { db, calls } = fakeDb();
    await reservePlacesBudget('search', { actorId: 'user_42' }, { db, now: NOW });
    assert.equal(calls[0]!.key, 'search:a:user_42:2026-10-13');
  }));

  it('a business over its own quota is denied as "scope" and the global counter is NOT spent', withEnv(
    { ...CAP_ENVS, PLACES_SEARCH_RESTAURANT_DAILY_CAP: '2' },
    async () => {
      const { db, calls, store } = fakeDb();
      const who = { restaurantId: 'cmvrest2' };
      assert.equal((await reservePlacesBudget('search', who, { db, now: NOW })).allowed, true);
      assert.equal((await reservePlacesBudget('search', who, { db, now: NOW })).allowed, true);
      const callsBefore = calls.length;
      assert.deepEqual(await reservePlacesBudget('search', who, { db, now: NOW }), { allowed: false, denied: 'scope' });
      assert.equal(calls.length - callsBefore, 1, 'only the narrow counter is touched');
      assert.equal(store.get('search:g:2026-10-13'), 2);
    },
  ));

  it('the global ceiling denies as "global", even for a business with quota left', withEnv(
    { ...CAP_ENVS, PLACES_SEARCH_DAILY_CAP: '1' },
    async () => {
      const { db } = fakeDb();
      assert.equal((await reservePlacesBudget('search', { restaurantId: 'cmvrest3' }, { db, now: NOW })).allowed, true);
      assert.deepEqual(await reservePlacesBudget('search', { restaurantId: 'cmvrest4' }, { db, now: NOW }), {
        allowed: false,
        denied: 'global',
      });
    },
  ));

  it('a zero cap or a database error is reported as "global" (system problem), never "scope"', withEnv(
    { ...CAP_ENVS, PLACES_SEARCH_RESTAURANT_DAILY_CAP: '0' },
    async () => {
      mock.method(console, 'error', () => {});
      assert.deepEqual(
        await reservePlacesBudget('search', { restaurantId: 'cmvrest5' }, { db: fakeDb().db, now: NOW }),
        { allowed: false, denied: 'global' },
      );
      process.env.PLACES_SEARCH_RESTAURANT_DAILY_CAP = '5';
      assert.deepEqual(
        await reservePlacesBudget('search', { actorId: 'user_1' }, { db: fakeDb({ failWith: new Error('down') }).db, now: NOW }),
        { allowed: false, denied: 'global' },
      );
    },
  ));
});

describe('reportPlacesFailure — throttled, machine codes only', () => {
  it('reports once per kind + code + status per ten minutes', () => {
    const t0 = 1_000_000;
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'details', t0), true);
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'details', t0 + 5 * 60_000), false);
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'details', t0 + 9 * 60_000 + 59_000), false);
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'details', t0 + 10 * 60_000), true);
  });

  it('a different code, status or kind is a different fingerprint', () => {
    const t0 = 5_000_000;
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'details', t0), true);
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 400 }, 'details', t0 + 1), true);
    assert.equal(reportPlacesFailure({ code: 'BAD_CONFIG', status: 403 }, 'details', t0 + 2), true);
    assert.equal(reportPlacesFailure({ code: 'FORBIDDEN', status: 403 }, 'search', t0 + 3), true);
    assert.equal(reportPlacesFailure({ code: 'TIMEOUT' }, 'select', t0 + 4), true);
    assert.equal(reportPlacesFailure({ code: 'TIMEOUT' }, 'select', t0 + 5), false);
  });

  it('never throws, even when many fingerprints pile up', () => {
    const t0 = 9_000_000;
    for (let i = 0; i < 400; i++) {
      assert.doesNotThrow(() =>
        reportPlacesFailure({ code: 'UPSTREAM', status: 500 + i, reason: `r${i}` }, 'details', t0 + i),
      );
    }
    // After the window passes, an old fingerprint is reportable again.
    assert.equal(reportPlacesFailure({ code: 'UPSTREAM', status: 500 }, 'details', t0 + 11 * 60_000), true);
  });
});
