import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import { ApiErrors } from '@/lib/api-errors';
import { writeAdminAuditLog } from '@/lib/audit-log';
import {
  resolveOwnerIdsForSegment,
  type OwnerSegmentPreset,
} from '@/lib/admin-owner-segments';
import { sendOwnerSegmentMail } from '@/lib/email/owner-segment-send';

/**
 * POST /api/admin/members/bulk — admin → owner toplu mail / future bulk
 *   action endpoint'i (Stage A5 §38.97).
 *
 * Auth: superadmin OR members:write permission (CLAUDE.md §38.94 RBAC).
 * Rate limit: 1 / dk / admin (mass-send abuse koruması, mail spend
 *   guard). 100 owner × 600ms = 60sn (Vercel maxDuration safe).
 * Batch limit: 500 id (segment 'all' büyük olabilir; Resend free tier
 *   günlük cap'in altında — operatör cap aşarsa Resend tarafında 429
 *   alırsa per-row failure raporlanır).
 *
 * Body (Zod `.strict()`):
 *   {
 *     action: 'send_email',
 *     segment: 'all'|'trial_expiring_3d'|'inactive_14d'|'high_volume'|'custom',
 *     ids?: string[]   // segment='custom' ise zorunlu, diğerlerinde optional intersect filter
 *     payload: { subject, body, locale? }
 *   }
 *
 * Response:
 *   { totalCount, sentCount, failedCount, action: 'send_email', segment }
 *
 * Audit: tek satır admin.owners.bulk.send_email (count + segment +
 *   subject preview, body redacted'a değil — admin yazdı, audit içeriği
 *   kabul; PII guard sadece userId per-row stripping).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 90; // 100 mail × 600ms throttle = 60sn + buffer

const SegmentEnum = z.enum([
  'all',
  'trial_expiring_3d',
  'inactive_14d',
  'high_volume',
  'custom',
]);

const Body = z.object({
  action: z.literal('send_email'),
  segment: SegmentEnum,
  ids: z.array(z.string().min(1)).max(500).optional(),
  payload: z.object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(8000),
    locale: z.enum(['tr', 'en']).optional(),
  }).strict(),
}).strict().refine((d) => {
  // segment='custom' için ids zorunlu + non-empty.
  if (d.segment === 'custom') {
    return Array.isArray(d.ids) && d.ids.length > 0;
  }
  return true;
}, { message: 'segment=custom için ids zorunlu (en az 1 id)' });

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized('Yetkisiz');

  // Members:write — bulk mail = mass write equivalent (transactional admin
  // ↔ owner iletişimi; superadmin OR grant'lı manager).
  if (!(await hasPermission(admin.id, 'members', 'write'))) {
    return ApiErrors.forbidden('Yetki yok');
  }
  // JWT payload `id` field jose-typed unknown; explicit narrow.
  const adminId = typeof admin.id === 'string' ? admin.id : null;
  if (!adminId) return ApiErrors.unauthorized('Yetkisiz');

  // Rate limit 1/dk/admin — mass-send abuse koruması (Resend free tier
  // 100 mail/saat, abuse frekansı kullanıcı hatasını korur).
  const rl = await rateLimit(`members-bulk-mail:${adminId}`, 1, 60_000);
  if (!rl.allowed) {
    return ApiErrors.tooManyRequests(
      'Toplu mail için bekleme süresi geçerli. 1 dk bekleyin.',
      'RATE_LIMIT_EXCEEDED',
      60,
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const { segment, ids, payload } = parsed.data;

  // Segment resolver — preset query + manuel intersection.
  const resolvedIds = await resolveOwnerIdsForSegment(
    segment as OwnerSegmentPreset,
    ids ?? [],
  );

  if (resolvedIds.length === 0) {
    return ApiErrors.badRequest(
      'Seçili segment + ID kombinasyonu boş; mail gönderilecek alıcı yok.',
      'NO_RECIPIENTS',
    );
  }

  // Hard cap 500 (Zod schema garantili ama defensive).
  const targetIds = resolvedIds.slice(0, 500);
  const truncated = resolvedIds.length > 500;

  // Pull recipient data (name + email + locale).
  const recipients = await prisma.user.findMany({
    where: { id: { in: targetIds }, role: 'restaurant_owner', isActive: true },
    select: { id: true, name: true, email: true, locale: true },
  });

  if (recipients.length === 0) {
    return ApiErrors.badRequest('Aktif alıcı bulunamadı', 'NO_ACTIVE_RECIPIENTS');
  }

  // Send pipeline (sequential + 600ms throttle).
  const result = await sendOwnerSegmentMail({
    recipients: recipients.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      locale: (r.locale === 'en' ? 'en' : 'tr') as 'tr' | 'en',
    })),
    subject: payload.subject,
    body: payload.body,
    // CLAUDE.md §38.132 — appUrl param boş → template locale-aware
    // dashboard URL inşa eder (`${NEXT_PUBLIC_APP_URL}/${locale}/dashboard`).
    // Eski caller `/dashboard` suffix env'siz veriyordu → recipient locale
    // prefix kaybediyordu, route 404 dönüyordu.
  });

  // Audit (CLAUDE.md §29.6 — destructive bulk forensic trail).
  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.owners.bulk.send_email',
    targetId: targetIds.join(','),
    payload: {
      segment,
      requestedCount: ids?.length ?? null,
      resolvedCount: resolvedIds.length,
      recipientCount: recipients.length,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      truncated,
      // Subject preview only (forensic context); body redacted.
      subjectPreview: payload.subject.slice(0, 80),
    },
  });

  return NextResponse.json({
    totalCount: result.totalCount,
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    action: 'send_email',
    segment,
    truncated,
  });
}
