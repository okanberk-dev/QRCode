import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { sanitizeAuditPayload, actionLabel } from '@/lib/audit-log';
import { neutralizeCsvFormula } from '@/lib/csv-safe';

// Stage A3 §38.95 — admin audit log CSV export.
//
// Filters mirror the list endpoint (range / actorSource / action / actorId).
// HARD_LIMIT 5000 row + UTF-8 BOM (Excel TR-safe).
// Rate limit 5/dk/actor (CLAUDE.md §38.78 paterni reuse).

export const dynamic = 'force-dynamic';

const HARD_LIMIT = 5000;
const RANGE_DAYS: Record<'7d' | '30d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function csvEscape(value: unknown): string {
  if (value == null) return '';
  // Formula-injection guard (src/lib/csv-safe.ts) before quoting.
  const str = neutralizeCsvFormula(typeof value === 'string' ? value : JSON.stringify(value));
  // Always wrap in quotes; escape internal quotes by doubling.
  return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'audit_logs', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate limit — CLAUDE.md §14.2 paterni.
  const limit = await rateLimit(`audit-logs-export:${adminId}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: limit.retryAfterSeconds ?? 60 },
      { status: 429 },
    );
  }

  // Parse filters from query (relaxed — no Zod since this is GET-only flat
  // params; client UI controls valid combinations).
  const params = req.nextUrl.searchParams;
  const range = (params.get('range') || '30d') as '7d' | '30d' | '90d' | 'custom';
  const actorSource = params.get('actorSource') || 'all';
  const action = params.get('action') || '';
  const actorId = params.get('actorId') || '';
  const targetId = params.get('targetId') || '';
  const customStart = params.get('customStart');
  const customEnd = params.get('customEnd');

  let windowStart: Date;
  const windowEnd: Date = new Date();
  if (range === 'custom' && customStart && customEnd) {
    windowStart = new Date(customStart);
  } else {
    const days = RANGE_DAYS[range as '7d' | '30d' | '90d'] || 30;
    windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  const where: Prisma.AdminAuditLogWhereInput = {
    createdAt: { gte: windowStart, lte: windowEnd },
  };
  if (actorSource === 'admin' || actorSource === 'user') {
    where.actorSource = actorSource;
  }
  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }
  if (actorId) where.actorId = actorId;
  if (targetId) where.targetId = targetId;

  let entries: Array<{
    id: string;
    // Stage A — actorId nullable (KVKK hard-delete anonimizasyon).
    actorId: string | null;
    actorSource: string;
    action: string;
    targetId: string | null;
    payload: unknown;
    createdAt: Date;
  }> = [];

  try {
    entries = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: HARD_LIMIT,
      select: {
        id: true,
        actorId: true,
        actorSource: true,
        action: true,
        targetId: true,
        payload: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error('[admin/audit-logs/export]', err);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  // Resolve actor labels (bulk fetch). Stage A — null actorId atlanır.
  const adminIds = Array.from(
    new Set(
      entries
        .filter((e) => e.actorSource === 'admin' && e.actorId)
        .map((e) => e.actorId as string),
    ),
  );
  const userIds = Array.from(
    new Set(
      entries
        .filter((e) => e.actorSource === 'user' && e.actorId)
        .map((e) => e.actorId as string),
    ),
  );
  let adminUsers: Array<{ id: string; username: string; email: string | null }> = [];
  let users: Array<{ id: string; email: string; name: string | null }> = [];
  try {
    [adminUsers, users] = await Promise.all([
      adminIds.length
        ? prisma.adminUser.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, username: true, email: true },
          })
        : Promise.resolve([] as typeof adminUsers),
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : Promise.resolve([] as typeof users),
    ]);
  } catch (err) {
    console.error('[admin/audit-logs/export actor resolve]', err);
  }
  const adminMap = new Map(adminUsers.map((a) => [a.id, a]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  // 8 columns: Date / Actor / Source / Action / Target / Payload / IP / UA
  // (IP + UA aren't in AdminAuditLog schema yet — empty placeholders for
  // future schema extension if requested. Spec calls for the columns.)
  const headers = ['Tarih', 'Aktör', 'Kaynak', 'Aksiyon', 'Aksiyon Açıklaması', 'Hedef', 'Payload', 'IP', 'UA'];

  const lines = [headers.map(csvEscape).join(',')];
  for (const e of entries) {
    // Stage A — anonimleştirilmiş satırlarda actorId null; label sütununa
    // "—" yazılır, audit izi korunur.
    let actorLabel: string = e.actorId ?? '—';
    if (e.actorSource === 'admin' && e.actorId) {
      const a = adminMap.get(e.actorId);
      if (a) actorLabel = a.username;
    } else if (e.actorSource === 'user' && e.actorId) {
      const u = userMap.get(e.actorId);
      if (u) actorLabel = u.name || u.email;
    }
    const sanitizedPayload = sanitizeAuditPayload(e.payload);
    lines.push(
      [
        csvEscape(e.createdAt.toISOString()),
        csvEscape(actorLabel),
        csvEscape(e.actorSource),
        csvEscape(e.action),
        csvEscape(actionLabel(e.action, 'tr')),
        csvEscape(e.targetId || ''),
        csvEscape(sanitizedPayload),
        csvEscape(''), // IP — schema field yok, future
        csvEscape(''), // UA — schema field yok, future
      ].join(','),
    );
  }

  // UTF-8 BOM — Excel TR-safe (CLAUDE.md §38.50 paterni reuse).
  const csv = '﻿' + lines.join('\r\n');
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${date}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
