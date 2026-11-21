/**
 * Independent read queries without the sequential `$transaction([...])` tax.
 *
 * `prisma.$transaction([a, b, c])` (array form) runs its queries one after
 * another on one connection, wrapped in BEGIN/COMMIT: N queries cost N + 2
 * database round trips. That was the right call while the pool ran with
 * `connection_limit=1` (CLAUDE.md §14.1); with a larger pool, independent
 * reads can overlap. Postgres READ COMMITTED gives every statement its own
 * snapshot either way, so a read-only batch loses no consistency by leaving
 * the transaction. Keep `$transaction` for writes that need atomicity and for
 * interactive transactions (`FOR UPDATE`).
 *
 * Prisma queries are lazy: `prisma.x.findMany(...)` does not touch the
 * database until something calls `.then()` on it. `parallelReads` relies on
 * that to cap concurrency — a query in the list starts only when a worker
 * picks it up, so at most `limit` run at once and a smaller pool queues them
 * instead of hitting `pool_timeout`.
 */

/** Max concurrent queries one request may start through `parallelReads`. */
export const DB_PARALLEL_LIMIT = 8;

/**
 * A lazy query (Prisma promise) or a thunk that starts the work when called.
 * Use a thunk for anything that is not a Prisma promise (an async helper, a
 * `.catch()` soft-fail wrapper): a plain promise is already running and does
 * not count against the limit.
 */
type ReadTask = PromiseLike<unknown> | (() => PromiseLike<unknown>);

type ReadResult<X> = X extends () => infer R ? Awaited<R> : Awaited<X>;

/**
 * `Promise.all` for database reads, at most `limit` in flight. Results keep
 * the input order (tuple types are preserved). The first failure rejects the
 * whole call, like `Promise.all`; tasks not yet started are then skipped.
 */
export async function parallelReads<T extends readonly ReadTask[] | []>(
  tasks: T,
  limit: number = DB_PARALLEL_LIMIT,
): Promise<{ -readonly [K in keyof T]: ReadResult<T[K]> }> {
  const list = tasks as readonly ReadTask[];
  const results: unknown[] = new Array(list.length);
  let nextIndex = 0;
  let failed = false;

  async function worker() {
    while (!failed && nextIndex < list.length) {
      const index = nextIndex++;
      const task = list[index];
      try {
        results[index] = await (typeof task === 'function' ? task() : task);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, list.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results as { -readonly [K in keyof T]: ReadResult<T[K]> };
}

/**
 * Starts a query now and returns a promise to await later. Use it to overlap
 * a read with an earlier step whose result decides whether the read is used
 * at all (e.g. a session check). The rejection is marked as handled so an
 * early `redirect()` cannot leave an unhandled rejection behind; awaiting the
 * returned promise still throws the original error.
 */
export function startRead<T>(query: PromiseLike<T>): Promise<T> {
  const started = Promise.resolve(query);
  started.catch(() => {});
  return started;
}
