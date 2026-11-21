/**
 * Run independent Prisma reads with bounded parallelism.
 *
 * `prisma.$transaction([...])` (array form) runs its queries one after the
 * other on one connection, plus BEGIN and COMMIT: N reads cost N + 2 round
 * trips. On self-host (one long-lived Node instance, `connection_limit=10`,
 * CLAUDE.md §14.1) each round trip to Supabase is the main cost of a panel
 * page, so independent reads should run side by side instead.
 *
 * Prisma queries are lazy: a query starts only when it is awaited, so the
 * chunks below really cap how many run at once. `concurrency` stays well under
 * the pool size because other requests share the same pool. With a pool of 1
 * this degrades to sequential reads without BEGIN/COMMIT.
 *
 * Use it only for reads that do not need one consistent snapshot; writes and
 * read-then-write sequences keep `$transaction`.
 */
export async function readAll<const P extends readonly PromiseLike<unknown>[]>(
  queries: P,
  concurrency = 5,
): Promise<{ -readonly [K in keyof P]: Awaited<P[K]> }> {
  const size = Math.max(1, Math.floor(concurrency));
  const results: unknown[] = new Array(queries.length);
  for (let start = 0; start < queries.length; start += size) {
    const chunk = queries.slice(start, start + size);
    const settled = await Promise.all(chunk);
    for (let i = 0; i < settled.length; i += 1) results[start + i] = settled[i];
  }
  return results as { -readonly [K in keyof P]: Awaited<P[K]> };
}
