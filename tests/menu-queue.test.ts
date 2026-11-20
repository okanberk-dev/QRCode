// Menu Studio spec §5.3 — per-key serial queues and the bulk request pool.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSerialQueue, runPool } from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/menu-queue';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deterministic "random" delays (no flaky tests).
function delays(seed: number, n: number): number[] {
  const out: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(x % 15);
  }
  return out;
}

test('same key: FIFO order under random delays', async () => {
  const enqueue = createSerialQueue();
  const finished: number[] = [];
  const started: number[] = [];
  const waits = delays(7, 12);
  await Promise.all(
    waits.map((ms, i) =>
      enqueue('item:a', async () => {
        started.push(i);
        await sleep(ms);
        finished.push(i);
        return i;
      }),
    ),
  );
  const order = waits.map((_, i) => i);
  assert.deepEqual(started, order);
  assert.deepEqual(finished, order);
});

test('each task resolves with its own value', async () => {
  const enqueue = createSerialQueue();
  const values = await Promise.all([enqueue('k', async () => 'a'), enqueue('k', async () => 'b')]);
  assert.deepEqual(values, ['a', 'b']);
});

test('different keys run in parallel', async () => {
  const enqueue = createSerialQueue();
  let running = 0;
  let peak = 0;
  const task = async () => {
    running += 1;
    peak = Math.max(peak, running);
    await sleep(15);
    running -= 1;
  };
  await Promise.all([enqueue('item:a', task), enqueue('item:b', task), enqueue('cat:c', task)]);
  assert.equal(peak, 3);
});

test('a rejected task does not block the next one with the same key', async () => {
  const enqueue = createSerialQueue();
  const log: string[] = [];
  const failing = enqueue('item:a', async () => {
    await sleep(5);
    log.push('fail');
    throw new Error('boom');
  });
  const throwingSync = enqueue('item:a', () => {
    log.push('sync-throw');
    throw new Error('sync');
  });
  const next = enqueue('item:a', async () => {
    log.push('next');
    return 'ok';
  });
  await assert.rejects(failing, /boom/);
  await assert.rejects(throwingSync, /sync/);
  assert.equal(await next, 'ok');
  assert.deepEqual(log, ['fail', 'sync-throw', 'next']);
});

test('runPool: limit respected, results in input order, settled values', async () => {
  let running = 0;
  let peak = 0;
  const waits = delays(3, 10);
  const tasks = waits.map((ms, i) => async () => {
    running += 1;
    peak = Math.max(peak, running);
    await sleep(ms);
    running -= 1;
    if (i % 4 === 3) throw new Error(`fail ${i}`);
    return i * 10;
  });
  const results = await runPool(tasks, 4);
  assert.ok(peak <= 4, `peak ${peak}`);
  assert.equal(peak, 4);
  assert.equal(results.length, 10);
  results.forEach((r, i) => {
    if (i % 4 === 3) {
      assert.equal(r.status, 'rejected');
      if (r.status === 'rejected') assert.match(String(r.reason), new RegExp(`fail ${i}`));
    } else {
      assert.deepEqual(r, { status: 'fulfilled', value: i * 10 });
    }
  });
});

test('runPool: default limit 4, empty list, limit larger than the list', async () => {
  assert.deepEqual(await runPool([]), []);
  let running = 0;
  let peak = 0;
  const task = async () => {
    running += 1;
    peak = Math.max(peak, running);
    await sleep(5);
    running -= 1;
    return 1;
  };
  await runPool(Array.from({ length: 9 }, () => task));
  assert.equal(peak, 4);
  peak = 0;
  const two = await runPool([task, task], 10);
  assert.equal(two.length, 2);
  assert.equal(peak, 2);
});
