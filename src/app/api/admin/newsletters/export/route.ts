import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_EXPORT_ROWS = 10_000;

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '30d';
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const localeFilter = url.searchParams.get('locale') ?? '';
  const sourceFilter = url.searchParams.get('source') ?? '';
  const status = url.searchParams.get('status') ?? 'all';

  const where: Record<string, unknown> = {};
  if (range !== 'all') {
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    where.createdAt = { gte: cutoff };
  }
  if (search) where.email = { contains: search, mode: 'insensitive' };
  if (localeFilter && localeFilter !== 'all') where.locale = localeFilter;
  if (sourceFilter && sourceFilter !== 'all') where.source = sourceFilter;
  if (status === 'active') where.unsubscribedAt = null;
  else if (status === 'cancelled') where.unsubscribedAt = { not: null };

  const rows = await prisma.newsletterSubscriber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT_ROWS,
    select: {
      email: true,
      locale: true,
      source: true,
      createdAt: true,
      unsubscribedAt: true,
    },
  });

  const csv = [
    'email,locale,source,subscribed_at,unsubscribed_at',
    ...rows.map((r) => [
      escapeCsv(r.email),
      r.locale,
      escapeCsv(r.source ?? ''),
      r.createdAt.toISOString(),
      r.unsubscribedAt ? r.unsubscribedAt.toISOString() : '',
    ].join(',')),
  ].join('\n');

  return new NextResponse('﻿' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

function escapeCsv(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
