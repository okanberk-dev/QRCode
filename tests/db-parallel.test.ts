import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parallelReads, startRead } from '../src/lib/db-parallel';

/** A Prisma-like lazy promise: the work starts only on the first `.then()`. */
function lazyQuery<T>(value: T, delayMs: number, log: { active: number; peak: number; started: string[] }, name: string) {
  let promise: Promise<T> | null = null;
  const run = () => {
    if (!promise) {
      log.started.push(name);
      log.active += 1;
      log.peak = Math.max(log.peak, log.active);
      promise = new Promise<T>((resolve) => {
        setTimeout(() => {
          log.active -= 1;
          resolve(value);
        }, delayMs);
      });
    }
    return promise;
  };
  return {
    then<A, B>(onFulfilled?: (v: T) => A, onRejected?: (e: unknown) => B) {
      return run().then(onFulfilled, onRejected);
    },
  } as PromiseLike<T>;
}

function newLog() {
  return { active: 0, peak: 0, started: [] as string[] };
}

test('parallelReads keeps input order and tuple results', async () => {
  const log = newLog();
  const [a, b, c] = await parallelReads([
    lazyQuery('a', 15, log, 'a'),
    lazyQuery(2, 1, log, 'b'),
    () => Promise.resolve(true),
  ]);
  assert.equal(a, 'a');
  assert.equal(b, 2);
  assert.equal(c, true);
});

test('parallelReads never runs more than the limit at once', async () => {
  const log = newLog();
  const tasks = Array.from({ length: 20 }, (_, i) => lazyQuery(i, 5, log, `q${i}`));
  const results = await parallelReads(tasks, 8);
  assert.deepEqual(results, Array.from({ length: 20 }, (_, i) => i));
  assert.equal(log.peak, 8);
  assert.equal(log.started.length, 20);
});

test('parallelReads overlaps independent queries', async () => {
  const log = newLog();
  const startedAt = Date.now();
  await parallelReads(Array.from({ length: 8 }, (_, i) => lazyQuery(i, 40, log, `q${i}`)));
  // Sequential would take ~320 ms; eight at once take ~40 ms.
  assert.ok(Date.now() - startedAt < 200);
  assert.equal(log.peak, 8);
});

test('parallelReads rejects on the first failure and skips unstarted queries', async () => {
  const log = newLog();
  const failing = () => Promise.reject(new Error('boom'));
  const tasks = [failing, ...Array.from({ length: 5 }, (_, i) => lazyQuery(i, 5, log, `q${i}`))];
  await assert.rejects(parallelReads(tasks, 1), /boom/);
  assert.deepEqual(log.started, []);
});

test('parallelReads handles an empty list', async () => {
  const results = await parallelReads([]);
  assert.deepEqual(results, []);
});

test('startRead starts the query immediately and keeps its rejection for the awaiter', async () => {
  const log = newLog();
  const query = startRead(lazyQuery('x', 5, log, 'x'));
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(log.started, ['x']);
  assert.equal(await query, 'x');

  const failed = startRead(Promise.reject(new Error('nope')));
  // No unhandled rejection even if nobody awaits it right away.
  await new Promise((resolve) => setTimeout(resolve, 5));
  await assert.rejects(failed, /nope/);
});
