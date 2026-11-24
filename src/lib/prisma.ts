import { PrismaClient } from '@prisma/client';
import { effectiveDatabaseUrl } from './database-url';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const datasourceUrl = effectiveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });

// One client (one connection pool) per process, also in production: the
// session pooler caps clients, so a duplicated module must not open a
// second pool.
globalForPrisma.prisma = prisma;
