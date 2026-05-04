import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Runtime + maxDuration explicit declared so Vercel Pro does not fall back
// to the 60s default function timeout — single updateMany finishes in
// <1s today but defending against future growth (millions of feedback
// rows) is cheap. CLAUDE.md §38.11 cron checklist disciplini.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * KVKK / GDPR IP retention cron.
 *
 * Anonymizes Feedback.ipAddress for rows older than RETENTION_DAYS (default
 * 90). IP is stored only for rate-limiting and abuse detection — once that
 * window passes there is no operational reason to keep it, and indefinite
 * retention violates the data-minimization principle.
 *
 * Trigger: Vercel Cron (recommended schedule: weekly) or any external scheduler
 * with the same Authorization header used by /api/cron/weekly-digest.
 *
 * Security: CRON_SECRET header required — refuses every request otherwise.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const retentionDays = Number(process.env.IP_RETENTION_DAYS ?? '90');
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    return NextResponse.json({ error: 'invalid_retention' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.feedback.updateMany({
      where: {
        ipAddress: { not: null },
        createdAt: { lt: cutoff },
      },
      data: { ipAddress: null },
    });

    return NextResponse.json({
      ok: true,
      anonymized: result.count,
      cutoff: cutoff.toISOString(),
      retentionDays,
    });
  } catch (error) {
    console.error('[cron/anonymize-ips] failed:', error);
    return NextResponse.json({ error: 'job_failed' }, { status: 500 });
  }
}
