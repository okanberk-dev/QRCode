import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '30d';
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const localeFilter = url.searchParams.get('locale') ?? '';
  const sourceFilter = url.searchParams.get('source') ?? '';
  const status = url.searchParams.get('status') ?? 'all'; // all|active|cancelled
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));

  const where = buildWhere({ range, search, localeFilter, sourceFilter, status });

  const [total, rows, summaryActive, summaryAll, sourcesAgg] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        locale: true,
        source: true,
        createdAt: true,
        unsubscribedAt: true,
      },
    }),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
      take: 20,
    }),
  ]);

  const cancelled = summaryAll - summaryActive;
  const cancelRate = summaryAll > 0 ? Math.round((cancelled / summaryAll) * 1000) / 10 : 0;

  return NextResponse.json({
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary: {
      total: summaryAll,
      active: summaryActive,
      cancelled,
      cancelRate, // percentage with 1 decimal
    },
    facets: {
      sources: sourcesAgg
        .filter((s) => s.source !== null)
        .map((s) => ({ value: s.source as string, count: s._count._all })),
    },
  });
}

function buildWhere(opts: {
  range: string;
  search: string;
  localeFilter: string;
  sourceFilter: string;
  status: string;
}) {
  const where: Record<string, unknown> = {};
  if (opts.range !== 'all') {
    const days = opts.range === '7d' ? 7 : opts.range === '90d' ? 90 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    where.createdAt = { gte: cutoff };
  }
  if (opts.search) {
    where.email = { contains: opts.search, mode: 'insensitive' };
  }
  if (opts.localeFilter && opts.localeFilter !== 'all') {
    where.locale = opts.localeFilter;
  }
  if (opts.sourceFilter && opts.sourceFilter !== 'all') {
    where.source = opts.sourceFilter;
  }
  if (opts.status === 'active') {
    where.unsubscribedAt = null;
  } else if (opts.status === 'cancelled') {
    where.unsubscribedAt = { not: null };
  }
  return where;
}
