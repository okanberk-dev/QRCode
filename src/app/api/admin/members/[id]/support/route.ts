import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { latestChecksForRestaurants } from '@/lib/platform-link-test';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Masks an IP for display: 88.123.45.67 → 88.123.x.x (KVKK, §37.7). */
function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…';
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : null;
}

/**
 * Support summary for one business owner (superadmin): recent sign-ins,
 * mails that failed to reach the owner, broken platform links, Google
 * connection and card payments — the first things to check on a ticket.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [sessions, failedMails, restaurants, google, payments] = await Promise.all([
    prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { lastSeenAt: 'desc' },
      take: 5,
      select: { createdAt: true, lastSeenAt: true, userAgent: true, ipAddress: true, revokedAt: true },
    }),
    prisma.mailDeliveryLog.findMany({
      where: { recipient: user.email.toLowerCase(), status: { not: 'sent' }, createdAt: { gte: since30 } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { template: true, status: true, createdAt: true },
    }),
    prisma.restaurant.findMany({ where: { userId: id }, select: { id: true, name: true }, take: 50 }),
    prisma.googleIntegration.findUnique({
      where: { userId: id },
      select: { expiresAt: true, updatedAt: true },
    }),
    prisma.billingPayment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { status: true, amountMinor: true, billingCycle: true, failureReason: true, createdAt: true },
    }),
  ]);

  const names = new Map(restaurants.map((r) => [r.id, r.name]));
  const checks =
    restaurants.length > 0
      ? await latestChecksForRestaurants(restaurants.map((r) => r.id), new Date(Date.now() - 90 * DAY_MS))
      : [];
  const brokenLinks = checks
    .filter((c) => !c.ok)
    .map((c) => ({
      restaurant: names.get(c.restaurantId) ?? c.restaurantId,
      provider: c.provider,
      checkedAt: new Date(c.checkedAt).toISOString(),
    }));

  return NextResponse.json(
    {
      sessions: sessions.map((s) => ({
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
        device: (s.userAgent ?? '').slice(0, 120) || null,
        ip: maskIp(s.ipAddress),
        revoked: Boolean(s.revokedAt),
      })),
      failedMails: failedMails.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      brokenLinks,
      google: google
        ? { connected: true, tokenExpiresAt: google.expiresAt.toISOString(), updatedAt: google.updatedAt.toISOString() }
        : { connected: false },
      payments: payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
