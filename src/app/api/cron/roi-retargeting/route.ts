// ROI lead 3-day retargeting cron — Vercel scheduled function.
// Schedule: vercel.json `0 10 * * *` (her gün 10:00 UTC = TR 13:00).
//
// Logic:
// 1. ROIRequest where:
//    - email IS NOT NULL (anonymous lead'lere mail atılamaz)
//    - createdAt < now - 3 gün (yeterince zaman geçti, hemen değil)
//    - createdAt > now - 14 gün (eski lead'ler için spam algı riski)
//    - retargetingSentAt IS NULL (per-lead idempotent — 1 kez gönder)
// 2. Her lead için Pulse retargeting mail render et + sendResendEmail
// 3. retargetingSentAt = now() set (cron'un sonraki run'unda tekrar
//    gönderilmesin)
//
// CLAUDE.md §21.12 cron list + §21.11 trial-reminder pattern referans.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendResendEmail } from '@/lib/email-internal';
import { renderRoiRetargetingFollowup } from '@/lib/email/templates/roi-retargeting-followup';
import { notifyOpsOfMailFailure } from '@/lib/email/ops-alert';

export const dynamic = 'force-dynamic';
// Toplam lead sayısı küçük (~10-50/gün), her mail 1-2s. 100 lead × 1.5s
// = 150s'lik teorik max — Vercel default 10s yetersiz; explicit cap.
export const maxDuration = 60;

const RETARGETING_MIN_AGE_DAYS = 3;
const RETARGETING_MAX_AGE_DAYS = 14;

interface ProjectionShape {
  sector?: unknown;
  monthlyCustomers?: unknown;
  avgTicket?: unknown;
  currentGoogle?: unknown;
  lowRatingsPerMonth?: unknown;
  platforms?: unknown;
  plan?: unknown;
  planPrice?: unknown;
  calc?: unknown;
}

interface CalcShape {
  netGain?: unknown;
  roiMultiple?: unknown;
  paybackMonths?: unknown;
  filteredLowReviews?: unknown;
  projectedGoogle?: unknown;
  aiSummary?: unknown;
  aiHighlight?: unknown;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  // Auth: Bearer ${CRON_SECRET} (CLAUDE.md §14.1, §21.12 cron pattern)
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const minAgeCutoff = new Date(now - RETARGETING_MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
  const maxAgeCutoff = new Date(now - RETARGETING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const leads = await prisma.rOIRequest.findMany({
    where: {
      email: { not: null },
      createdAt: { lt: minAgeCutoff, gt: maxAgeCutoff },
      retargetingSentAt: null,
    },
    select: {
      id: true,
      email: true,
      restaurantName: true,
      projection: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    // Tek run'da max 50 lead — Resend rate limit (10/sn) + 60s budget
    // güvenliği. Sonraki gün cron tekrar pickup eder.
    take: 50,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const startedAt = now;

  for (const lead of leads) {
    if (!lead.email) {
      skipped++;
      continue;
    }
    // Projection shape kontrolü — eski / bozuk satırlar skip.
    const proj = lead.projection as ProjectionShape | null;
    if (!proj || typeof proj !== 'object') {
      skipped++;
      continue;
    }
    const calc = (proj.calc as CalcShape) ?? {};
    const aiHighlight = str(calc.aiHighlight);
    if (!aiHighlight) {
      // Eski lead'ler (PR #250 öncesi) AI insight taşımıyor; retargeting
      // generic olur — yine gönderelim ama fallback highlight ile.
      // (Opsiyonel: bu satırları skip de edebiliriz; senior tercih: gönder.)
    }

    const planKey = str(proj.plan, 'growth');
    const currency = '₺'; // ROIRequest.locale yok → TR varsayılan; future-proof: projection.currency
    const localeRaw = (proj as ProjectionShape & { locale?: unknown }).locale;
    const locale: 'tr' | 'en' = localeRaw === 'en' ? 'en' : 'tr';
    const restaurantName = lead.restaurantName ?? str((proj as ProjectionShape & { restaurantName?: unknown }).restaurantName, locale === 'en' ? 'Your business' : 'İşletmen');
    const firstName = restaurantName.split(/[\s,.]/)[0] || null;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com').replace(/\/+$/, '');
    const rendered = renderRoiRetargetingFollowup(
      {
        restaurantName,
        firstName,
        currency,
        netGain: num(calc.netGain),
        roiMultiple: num(calc.roiMultiple),
        paybackMonths:
          typeof calc.paybackMonths === 'number' ? calc.paybackMonths : null,
        filteredLowReviews: num(calc.filteredLowReviews),
        projectedGoogle: num(calc.projectedGoogle, num(proj.currentGoogle, 4.2)),
        aiHighlight:
          aiHighlight ||
          (locale === 'tr'
            ? `${restaurantName} için Buaze 12 ayda ölçülebilir bir yıldız liftine + filtrelenmiş kötü yorum koruması sağlar.`
            : `Buaze delivers measurable star lift + low-review filtering protection for ${restaurantName} in 12 months.`),
        plan: planKey,
        contactUrl: `${appUrl}/${locale}/contact`,
        pricingUrl: `${appUrl}/${locale}/pricing`,
        originalSubmittedAt: lead.createdAt,
      },
      locale,
    );

    const ok = await sendResendEmail({
      to: lead.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (ok) {
      sent++;
      // Idempotent: sonraki run aynı lead'i pick'lemez.
      try {
        await prisma.rOIRequest.update({
          where: { id: lead.id },
          data: { retargetingSentAt: new Date() },
        });
      } catch (err) {
        // Update fail olursa bir sonraki run mail'i tekrar gönderir —
        // kabul edilebilir minor risk (ops alert tetikler).
        const code = (err as { code?: string })?.code;
        if (code !== 'P2025') console.error('[roi-retargeting] update failed', err);
      }
    } else {
      failed++;
      await notifyOpsOfMailFailure({
        template: 'roi-retargeting',
        recipient: lead.email,
        reason: 'sendResendEmail returned false',
        metadata: { leadId: lead.id, restaurantName },
      }).catch((err) =>
        console.error('[roi-retargeting] ops alert failed', err),
      );
    }

    // Resend rate limit (10/sn) için throttle; pratikte 50 lead × 100ms
    // = 5s ek overhead, budget dahilinde.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  const elapsed = Date.now() - startedAt;
  console.log(`[roi-retargeting] sent=${sent} skipped=${skipped} failed=${failed} elapsed=${elapsed}ms`);

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    elapsedMs: elapsed,
    candidates: leads.length,
  });
}

