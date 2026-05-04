import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';

// Owner-scoped Customers CSV export (Phase 8b, CLAUDE.md §23.7 Phase 12).
// Mirrors /api/admin/customers/export structure but enforces owner scope via
// getScopedRestaurantIds. UTF-8 + BOM for TR characters in Excel.

const RANGE_PRESETS = { '7d': 7, '30d': 30, '90d': 90 } as const;

interface AggregateRow {
  restaurant_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  platform: string | null;
  last_rating: number | null;
  last_at: Date;
  feedback_count: bigint;
}

function parseRange(raw: string | null): Date | null {
  if (raw === 'all') return null;
  const days = RANGE_PRESETS[raw as keyof typeof RANGE_PRESETS] ?? 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toBool(raw: string | null) {
  return raw === '1' || raw === 'true';
}

function esc(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  // Owner-only endpoint — superadmin null scope (admin'in kendi /export'u var).
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get('range');
  const restaurantIdParam = searchParams.get('restaurantId');
  const searchParam = (searchParams.get('search') || '').trim().slice(0, 100) || null;
  const requireEmail = toBool(searchParams.get('hasEmail'));
  const requirePhone = toBool(searchParams.get('hasPhone'));
  const requireComment = toBool(searchParams.get('hasComment'));

  const rangeStart = parseRange(rangeParam);
  const restaurantId =
    restaurantIdParam && scopedIds.includes(restaurantIdParam) ? restaurantIdParam : null;

  // Inline filter builder — mirrors the list endpoint (CLAUDE.md §7).
  const parts: Prisma.Sql[] = [Prisma.sql`f.has_kvkk_consent = TRUE`];
  if (scopedIds.length === 0) {
    parts.push(Prisma.sql`FALSE`);
  } else {
    parts.push(Prisma.sql`f.restaurant_id IN (${Prisma.join(scopedIds)})`);
  }
  if (restaurantId) parts.push(Prisma.sql`f.restaurant_id = ${restaurantId}`);
  if (rangeStart) parts.push(Prisma.sql`f.created_at >= ${rangeStart}`);
  if (requireEmail) parts.push(Prisma.sql`f.email IS NOT NULL AND f.email <> ''`);
  if (requirePhone) parts.push(Prisma.sql`f.phone IS NOT NULL AND f.phone <> ''`);
  if (requireComment) parts.push(Prisma.sql`f.comment IS NOT NULL AND f.comment <> ''`);
  if (searchParam) {
    const like = `%${searchParam.toLowerCase()}%`;
    parts.push(Prisma.sql`(
      LOWER(COALESCE(f.name, '')) LIKE ${like}
      OR LOWER(COALESCE(f.email, '')) LIKE ${like}
      OR LOWER(COALESCE(f.phone, '')) LIKE ${like}
      OR LOWER(COALESCE(f.comment, '')) LIKE ${like}
    )`);
  }
  parts.push(Prisma.sql`
    COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), '')) IS NOT NULL
  `);
  const where = Prisma.join(parts, ' AND ');

  try {
    const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
      SELECT
        r.name AS restaurant_name,
        (ARRAY_AGG(f.name ORDER BY f.created_at DESC) FILTER (WHERE f.name IS NOT NULL AND f.name <> ''))[1] AS name,
        (ARRAY_AGG(f.email ORDER BY f.created_at DESC) FILTER (WHERE f.email IS NOT NULL AND f.email <> ''))[1] AS email,
        (ARRAY_AGG(f.phone ORDER BY f.created_at DESC) FILTER (WHERE f.phone IS NOT NULL AND f.phone <> ''))[1] AS phone,
        (ARRAY_AGG(f.branch ORDER BY f.created_at DESC) FILTER (WHERE f.branch IS NOT NULL AND f.branch <> ''))[1] AS branch,
        (ARRAY_AGG(f.platform ORDER BY f.created_at DESC) FILTER (WHERE f.platform IS NOT NULL))[1] AS platform,
        (ARRAY_AGG(f.rating ORDER BY f.created_at DESC))[1] AS last_rating,
        MAX(f.created_at) AS last_at,
        COUNT(*)::bigint AS feedback_count
      FROM feedback f
      LEFT JOIN restaurants r ON r.id = f.restaurant_id
      WHERE ${where}
      GROUP BY f.restaurant_id, r.name, COALESCE(NULLIF(LOWER(TRIM(f.email)), ''), NULLIF(TRIM(f.phone), ''))
      ORDER BY MAX(f.created_at) DESC
    `);

    const header = ['İsim', 'E-posta', 'Telefon', 'İşletme', 'Şube', 'Platform', 'Son Puan', 'Yorum Sayısı', 'Son Yorum'];
    const lines = [header.map(esc).join(',')];
    for (const r of rows) {
      lines.push([
        esc(r.name),
        esc(r.email),
        esc(r.phone),
        esc(r.restaurant_name),
        esc(r.branch),
        esc(r.platform),
        esc(r.last_rating),
        esc(Number(r.feedback_count)),
        esc(new Date(r.last_at).toISOString().slice(0, 10)),
      ].join(','));
    }
    const csv = '﻿' + lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="musterilerim-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[OWNER_CUSTOMERS_EXPORT]', error);
    return NextResponse.json({ error: 'CSV oluşturulamadı' }, { status: 500 });
  }
}
