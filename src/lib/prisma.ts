import { PrismaClient } from '@prisma/client';
import { effectiveDatabaseUrl } from './database-url';
import { timedDb } from './server-timing';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const datasourceUrl = effectiveDatabaseUrl();

function createClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
  // Server-Timing `db` (CLAUDE.md §56): every query runs through timedDb,
  // which is a no-op outside a timed route. The extended client behaves like
  // the plain one for every API this codebase uses, so it keeps that type.
  return base.$extends({
    query: {
      $allOperations({ args, query }) {
        return timedDb(() => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma || createClient();

// One client (one connection pool) per process, also in production: the
// session pooler caps clients, so a duplicated module must not open a
// second pool.
globalForPrisma.prisma = prisma;
