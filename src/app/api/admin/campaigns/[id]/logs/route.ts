// Stage 29 §38.105 — admin campaign log viewer endpoint.
//
// Owner /api/customer-campaigns/[id]/logs paterni paralel; admin global scope
// (cross-workspace). CustomerEmailLog row'larını paginate eder; admin
// moderation panel'inde delivery problemi diagnose etmek için kullanılır.
//
// IDOR: superadmin OR `campaigns:read`. Cache: private 15s/60sw (CLAUDE.md
// §38.100 paterni).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_LOG_STATUSES = ['pending', 'sent', 'failed', 'unsubscribed', 'all'] as const;

const QuerySchema = z
  .object({
    status: z.enum(VALID_LOG_STATUSES).optional().default('all'),
    page: z.coerce.number().int().min(1).max(10000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

const ADMIN_LOGS_CACHE_HEADER = 'private, s-maxage=15, stale-while-revalidate=60';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!(await hasPermission(admin.id, 'campaigns', 'read'))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Verify campaign exists (and admin can see metadata; RBAC zaten check
  // edildi, bu sadece 404 vs 200 ayrımı için).
  const campaign = await prisma.customerEmailCampaign.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, subject: true, status: true },
  });
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(req.url);
  const queryRaw = {
    status: url.searchParams.get('status') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  const parsed = QuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { status, page, limit } = parsed.data;

  const where: Prisma.CustomerEmailLogWhereInput = { campaignId: id };
  if (status !== 'all') {
    where.status = status;
  }

  const [logs, total] = await prisma.$transaction([
    prisma.customerEmailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        contactKey: true,
        email: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    prisma.customerEmailLog.count({ where }),
  ]);

  // Email mask — admin viewer tier aware: full email göster (forensic
  // delivery diagnose için lazım); KVKK §13.9 admin legitimate interest
  // (audit log retention). Owner endpoint'teki mask logic yok burada.
  const items = logs.map((log) => ({
    id: log.id,
    contactKey: log.contactKey,
    email: log.email,
    status: log.status,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json(
    {
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        status: campaign.status,
      },
      logs: items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    {
      headers: { 'Cache-Control': ADMIN_LOGS_CACHE_HEADER },
    },
  );
}
