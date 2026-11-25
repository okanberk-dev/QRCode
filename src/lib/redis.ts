/**
 * Coolify Redis (`buaze-redis`, internal network) — CLAUDE.md §56.
 *
 * One lazily created ioredis client per process. It never blocks or crashes a
 * request: commands fail fast while the connection is down
 * (`enableOfflineQueue: false`, short timeouts) and callers fall back to
 * their in-memory behaviour. `REDIS_URL` unset (local dev, tests) → null.
 * The connection string is never logged.
 */
import Redis from 'ioredis';

const globalForRedis = global as unknown as { buazeRedis?: Redis | null };

let warnedAt = 0;
function warn(message: string) {
  // At most one line a minute while Redis is unreachable.
  if (Date.now() - warnedAt < 60_000) return;
  warnedAt = Date.now();
  console.warn(`[redis] ${message} — falling back to in-process state`);
}

export function getRedis(): Redis | null {
  if (globalForRedis.buazeRedis !== undefined) return globalForRedis.buazeRedis;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    globalForRedis.buazeRedis = null;
    return null;
  }
  const client = new Redis(url, {
    connectTimeout: 1_000,
    commandTimeout: 300,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 5_000),
  });
  // Without an 'error' listener ioredis errors would crash the process.
  client.on('error', (err: Error) => warn(err.message.replace(/redis:\/\/\S+/g, 'redis://…')));
  globalForRedis.buazeRedis = client;
  return client;
}

/** Usable right now (connected); callers skip Redis otherwise. */
export function redisReady(client: Redis | null): client is Redis {
  return Boolean(client && client.status === 'ready');
}
