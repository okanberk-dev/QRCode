import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAll } from '../src/lib/db-batch';

// A lazy thenable like a PrismaPromise: work starts only on .then().
function lazy<T>(value: T, log: string[], name: string, running: { now: number; max: number }) {
  return {
    then<R1 = T, R2 = never>(
      onFulfilled?: ((v: T) => R1 | PromiseLike<R1>) | null,
      onRejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> {
      log.push(`start:${name}`);
      running.now += 1;
      running.max = Math.max(running.max, running.now);
      return new Promise<T>((resolve) =>
        setTimeout(() => {
          running.now -= 1;
          resolve(value);
        }, 5),
      ).then(onFulfilled, onRejected);
    },
  };
}

test('readAll keeps order and typed results', async () => {
  const running = { now: 0, max: 0 };
  const log: string[] = [];
  const [a, b, c] = await readAll([
    lazy(1, log, 'a', running),
    lazy('two', log, 'b', running),
    lazy([3], log, 'c', running),
  ] as const);
  assert.equal(a, 1);
  assert.equal(b, 'two');
  assert.deepEqual(c, [3]);
});

test('readAll caps concurrency per chunk', async () => {
  const running = { now: 0, max: 0 };
  const log: string[] = [];
  const queries = Array.from({ length: 7 }, (_, i) => lazy(i, log, String(i), running));
  const out = await readAll(queries, 3);
  assert.deepEqual(out, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(running.max, 3);
});

test('readAll rejects when a read fails', async () => {
  await assert.rejects(readAll([Promise.resolve(1), Promise.reject(new Error('boom'))]), /boom/);
});

test('readAll with concurrency below 1 still runs sequentially', async () => {
  const running = { now: 0, max: 0 };
  const log: string[] = [];
  const out = await readAll([lazy('x', log, 'x', running), lazy('y', log, 'y', running)], 0);
  assert.deepEqual(out, ['x', 'y']);
  assert.equal(running.max, 1);
});
