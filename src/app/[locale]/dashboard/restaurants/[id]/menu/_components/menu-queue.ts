/**
 * Write ordering for the builder (Menu Studio, spec §5.3).
 *
 * - `createSerialQueue()`: one FIFO per key (`item:<id>`, `cat:<id>`,
 *   `append:<categoryId>`, `order:items:<categoryId>`, `order:categories`,
 *   `theme`). Tasks with the same key run one after another, so a quick
 *   on → off → on lands on the server in that order and appends to one
 *   category never race for the same sortOrder. Different keys run in
 *   parallel. A failed task never blocks the next one.
 * - `runPool()`: N independent requests with at most `limit` in flight
 *   (bulk actions), results in input order.
 *
 * No timers, no coalescing. Pure (node:test).
 */

export type SerialQueue = <T>(key: string, task: () => Promise<T>) => Promise<T>;

export function createSerialQueue(): SerialQueue {
  const tails = new Map<string, Promise<void>>();
  return function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    const result = previous.then(task);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    tails.set(key, tail);
    void tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return result;
  };
}

/** Run `tasks` with at most `limit` running at once; settled results in input order. */
export async function runPool<T>(tasks: (() => Promise<T>)[], limit = 4): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  const workers = Array.from({ length: Math.max(1, Math.min(Math.floor(limit) || 1, tasks.length)) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Per-key "latest wins" tokens. `begin(key)` returns a check that stays true
 * only until the next `begin` for the same key, so a slow older task can tell
 * it was superseded before it writes (row photo uploads, spec §8.7).
 */
export function createLatestGate(): (key: string) => () => boolean {
  const seq = new Map<string, number>();
  return (key) => {
    const mine = (seq.get(key) ?? 0) + 1;
    seq.set(key, mine);
    return () => seq.get(key) === mine;
  };
}
