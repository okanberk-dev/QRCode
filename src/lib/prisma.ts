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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
