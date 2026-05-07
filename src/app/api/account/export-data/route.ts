import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { rateLimit, maybeSweep } from '@/lib/rate-limit';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Section 9 — KVKK / GDPR veri dışa aktarımı (Faz 3).
//
// Workspace user'ın tüm sahip olduğu kayıtları JSON olarak indirir:
// - User (parola hash + 2FA secret hariç)
// - restaurants (tam alanlar, BrandSettings dahil)
// - feedbacks (her restoran için)
// - menüCategories + menüItems (deletedAt: null)
// - apiKeys (secretHash hariç)
// - notificationPreferences
//
// Rate limit: 1/saat per user (büyük sorgu, abuse engeli).
// Content-Disposition: attachment ile indirme tetiklenir.

export async function POST(req: NextRequest) {
  maybeSweep();
  const payload = await getUserFromRequest(req);
  if (!payload) return ApiErrors.unauthorized();
  const userId = payload.userId;
  if (!userId) return ApiErrors.unauthorized();

  const rl = await rateLimit(`account:export:${userId}`, 1, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Saatte bir kez veri indirilebilir. Lütfen sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      trialEndsAt: true,
      locale: true,
      isActive: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      // passwordHash + totpSecret + twoFactorBackupCodes BİLEREK hariç
      restaurants: {
        include: {
          brandSettings: true,
          menuCategories: { where: { deletedAt: null } },
          menuItems: { where: { deletedAt: null } },
          feedbacks: true,
        },
      },
    },
  });
  if (!user) return ApiErrors.notFound('Kullanıcı bulunamadı');

  // Notification preferences ayrı sorgu (User'da relation yok).
  const notifications = await (prisma as { notificationPreference?: { findUnique: (a: unknown) => Promise<unknown> } }).notificationPreference?.findUnique?.({
    where: { userId },
  });

  // Stage A3 §38.95 — KVKK transparency: kendi audit log'u export'a dahil.
  // Last 2 years (KVKK retention boundary). Both self-actions and admin
  // actions targeting this user. Schema drift fail-soft → empty array.
  let auditLogs: Array<{
    id: string;
    action: string;
    actorSource: string;
    targetId: string | null;
    payload: unknown;
    createdAt: Date;
  }> = [];
  try {
    const auditWindowStart = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        createdAt: { gte: auditWindowStart },
        OR: [
          { actorId: userId, actorSource: 'user' },
          { targetId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        actorSource: true,
        targetId: true,
        payload: true,
        createdAt: true,
      },
    });
  } catch {
    auditLogs = [];
  }

  const fileName = `buaze-veri-${user.email.replace(/[^a-z0-9]/gi, '_')}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    note: 'KVKK / GDPR Veri Dışa Aktarımı — Buaze hesabınla ilişkili veriler.',
    user,
    notifications: notifications ?? null,
    auditLogs: auditLogs.map((e) => ({
      id: e.id,
      action: e.action,
      actorSource: e.actorSource,
      targetId: e.targetId,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
