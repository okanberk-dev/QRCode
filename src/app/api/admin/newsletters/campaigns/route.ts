import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 50;
const MAX_POSTS = 6;
const ALLOWED_LOCALES = new Set(['tr', 'en', 'both']);
const CREATE_STATUSES = new Set(['draft', 'scheduled']);

export async function GET(req: NextRequest) {
  const admin: any = await getAdminFromRequest(req);
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
  const admin: any = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  let body: any = {};
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

export interface ValidatedCampaign {
  data: {
    title: string;
    intro: string;
    postIds: string[];
    locale: string;
    status: string;
    scheduledAt: Date | null;
  };
}

export function validateCampaignInput(body: any): ValidatedCampaign | { error: string } {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) return { error: 'invalid_title' };

  const intro = typeof body.intro === 'string' ? body.intro.trim() : '';
  if (!intro || intro.length > 2000) return { error: 'invalid_intro' };

  const rawPostIds = Array.isArray(body.postIds) ? body.postIds : [];
  const postIds = rawPostIds.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);
  if (postIds.length === 0 || postIds.length > MAX_POSTS) return { error: 'invalid_post_count' };

  const locale = typeof body.locale === 'string' ? body.locale : 'tr';
  if (!ALLOWED_LOCALES.has(locale)) return { error: 'invalid_locale' };

  const requestedStatus = typeof body.status === 'string' ? body.status : 'draft';
  if (!CREATE_STATUSES.has(requestedStatus)) return { error: 'invalid_status' };

  let scheduledAt: Date | null = null;
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) return { error: 'invalid_scheduledAt' };
    if (d.getTime() < Date.now() - 60_000) return { error: 'scheduledAt_in_past' };
    scheduledAt = d;
  }

  // If scheduledAt provided, status auto-elevated. Pure 'scheduled' without
  // a date is rejected so the UI can\'t orphan a campaign that never fires.
  const status = scheduledAt ? 'scheduled' : requestedStatus === 'scheduled' ? 'draft' : requestedStatus;

  return {
    data: { title, intro, postIds, locale, status, scheduledAt },
  };
}
