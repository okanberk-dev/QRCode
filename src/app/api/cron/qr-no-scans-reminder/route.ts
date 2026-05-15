// Wave C1 (CLAUDE.md §38.194) — QR oluştu ama tarama yok hatırlatması.
// Daily 09:00 UTC. Eligibility: at least one QrGeneration row ≥ 7 days
// ago AND zero QrScan rows for that restaurant. LifecycleEmailLog
// cooldown 14 days per restaurant.

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { sendQrNoScansReminderEmail } from '@/lib/email';
import { alreadySent, recordSent } from '@/lib/email/lifecycle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;

interface Summary {
  candidates: number;
  sent: number;
  skipped: number;
  failures: number;
  durationMs: number;
}

export async function runQrNoScansReminder(): Promise<Summary> {
  const start = Date.now();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';

  // Pull restaurants whose first QR was generated ≥ 7 days ago. We then
  // filter zero-scan + cooldown per-row to keep the SQL simple.
  const candidates = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      // §38.197 — Hesabı silinmek üzere planlanmış owner'a "QR'ın tarama
      // almıyor, yerini değiştir!" hatırlatması göndermez. 30g grace
      // boyunca lifecycle/marketing mail'ler suppressed.
      user: { scheduledDeletionAt: null },
      qrGenerations: { some: { createdAt: { lte: sevenDaysAgo } } },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      notificationEmail: true,
      user: { select: { email: true, name: true, locale: true } },
      qrGenerations: {
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: { select: { qrScans: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failures = 0;

  for (const r of candidates) {
    try {
      if (r._count.qrScans > 0) {
        skipped += 1;
        continue;
      }
      const recipient = r.notificationEmail || r.user?.email;
      if (!recipient) {
        skipped += 1;
        continue;
      }
      const already = await alreadySent({
        restaurantId: r.id,
        type: 'qr_no_scans_reminder',
        cooldownDays: 14,
      });
      if (already) {
        skipped += 1;
        continue;
      }
      const firstQrAt = r.qrGenerations[0]?.createdAt;
      if (!firstQrAt) {
        skipped += 1;
        continue;
      }
      const daysSinceQr = Math.floor((Date.now() - firstQrAt.getTime()) / (24 * 60 * 60 * 1000));
      const userLocale: 'tr' | 'en' = r.user?.locale === 'en' ? 'en' : 'tr';
      const ok = await sendQrNoScansReminderEmail({
        to: recipient,
        firstName: r.user?.name ?? null,
        restaurantName: r.name,
        daysSinceQr,
        qrUrl: `${appUrl}/${userLocale}/dashboard/qr`,
        locale: userLocale,
      });
      if (ok) {
        await recordSent({
          restaurantId: r.id,
          type: 'qr_no_scans_reminder',
          metadata: { daysSinceQr },
        });
        sent += 1;
      } else {
        failures += 1;
      }
      await new Promise((res) => setTimeout(res, 120));
    } catch (err) {
      failures += 1;
      console.error('[QR_NO_SCANS_REMINDER] per-restaurant failed', {
        restaurantId: r.id,
        errName: err instanceof Error ? err.name : 'unknown',
      });
      Sentry.captureException(err, {
        tags: { cron: 'qr-no-scans-reminder' },
        extra: { restaurantId: r.id },
      });
    }
  }

  return { candidates: candidates.length, sent, skipped, failures, durationMs: Date.now() - start };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runQrNoScansReminder();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[QR_NO_SCANS_REMINDER] cron failed', err);
    Sentry.captureException(err, { tags: { cron: 'qr-no-scans-reminder' } });
    return NextResponse.json({ error: 'cron_failed' }, { status: 500 });
  }
}
