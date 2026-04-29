import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { validateCampaignInput } from '@/lib/newsletter-campaigns';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));

  const where: Record<string, unknown> = {};
  if (status && status !== 'all') where.status = status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [total, rows] = await Promise.all([
    prisma.newsletterCampaign.count({ where }),
    prisma.newsletterCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('invalid_json');
  }

  const validated = validateCampaignInput(body);
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const created = await prisma.newsletterCampaign.create({
    data: validated.data,
  });

  return NextResponse.json({ ok: true, campaign: created });
}
