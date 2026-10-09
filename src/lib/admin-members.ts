import * as jose from 'jose';
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSecret } from '@/lib/auth';
import { neutralizeCsvFormula } from '@/lib/csv-safe';

// ─────────────────────────────────────────────────────────────────
// Search / filter / pagination — list query helpers
// ─────────────────────────────────────────────────────────────────

export interface ListMembersParams {
  search?: string;
  plan?: string;
  status?: 'active' | 'passive' | 'all';
  /**
   * Admin "Needs attention" deeplink filter (CLAUDE.md §11.36).
   * - `trial_expiring` → trial users whose trialEndsAt is within next 7 days
   * - `trial_expired`  → trial users whose trialEndsAt has passed
   * - `stale`          → restaurant_owner with no updatedAt in 14+ days
   * Status filter is forced to 'all' when attention is set so passive accounts
   * (e.g. trial_expired sometimes deactivated) still surface.
   */
  attention?: 'trial_expiring' | 'trial_expired' | 'stale';
  page?: number;
  perPage?: number;
}

export const VALID_PLANS = ['trial', 'monthly', 'yearly', 'free'] as const;
export const VALID_ATTENTIONS = ['trial_expiring', 'trial_expired', 'stale'] as const;

export const DEFAULT_PER_PAGE = 25;
export const MAX_PER_PAGE = 100;

/** Parse query params from a request URL into normalised list params. */
export function parseListMembersParams(searchParams: URLSearchParams): ListMembersParams {
  const search = searchParams.get('search')?.trim() || undefined;
  const planRaw = searchParams.get('plan')?.trim() || undefined;
  const statusRaw = searchParams.get('status')?.trim() || undefined;
  const attentionRaw = searchParams.get('attention')?.trim() || undefined;
  const pageRaw = searchParams.get('page');
  const perPageRaw = searchParams.get('perPage');

  const plan = planRaw && (VALID_PLANS as readonly string[]).includes(planRaw) ? planRaw : undefined;
  const attention = attentionRaw && (VALID_ATTENTIONS as readonly string[]).includes(attentionRaw)
    ? (attentionRaw as ListMembersParams['attention'])
    : undefined;
  const status: ListMembersParams['status'] =
    statusRaw === 'passive' ? 'passive' : statusRaw === 'all' ? 'all' : 'active';

  const page = Math.max(1, Number(pageRaw) || 1);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Number(perPageRaw) || DEFAULT_PER_PAGE));

  return { search, plan, status, attention, page, perPage };
}

/** Build Prisma where clause from list params. Restaurant-owners only. */
export function buildMembersWhere(params: ListMembersParams): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { role: 'restaurant_owner' };

  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.plan) {
    where.plan = params.plan;
  }

  if (params.attention) {
    const now = new Date();
    if (params.attention === 'trial_expiring') {
      const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.plan = 'trial';
      where.trialEndsAt = { gt: now, lte: sevenDaysAhead };
    } else if (params.attention === 'trial_expired') {
      where.plan = 'trial';
      where.trialEndsAt = { lte: now };
    } else if (params.attention === 'stale') {
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      where.updatedAt = { lt: fourteenDaysAgo };
    }
    return where;
  }

  if (params.status === 'active') {
    where.isActive = true;
  } else if (params.status === 'passive') {
    where.isActive = false;
  }
  return where;
}

// ─────────────────────────────────────────────────────────────────
// Invite / password-reset token (mirrors auth/forgot-password flow)
// ─────────────────────────────────────────────────────────────────

export function hashInviteCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateInviteCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function buildInviteToken(params: {
  userId: string;
  email: string;
  codeHash: string;
}): Promise<string> {
  return await new jose.SignJWT({
    purpose: 'pwr',
    userId: params.userId,
    email: params.email,
    codeHash: params.codeHash,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getSecret());
}

/**
 * Build a safe base URL from the request. Mirrors the logic in
 * /api/auth/forgot-password to keep invite + reset links identical
 * across deployment surfaces (preview / staging / prod custom domain).
 */
export function buildInviteBase(req: NextRequest): string {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');

  if (forwardedHost && !/localhost|127\.0\.0\.1/i.test(forwardedHost)) {
    const proto = forwardedProto || 'https';
    return `${proto}://${forwardedHost}`;
  }
  if (envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl)) {
    return envAppUrl;
  }
  return req.nextUrl.origin;
}

// ─────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────

/** Escape a field for CSV (RFC 4180 double-quote rules). */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Formula-injection guard (src/lib/csv-safe.ts); real numbers untouched.
  const s = typeof value === 'number' ? String(value) : neutralizeCsvFormula(String(value));
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build CSV row from key/value pairs (preserves header order). */
export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}
