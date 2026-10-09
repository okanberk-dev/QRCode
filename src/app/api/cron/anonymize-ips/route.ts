import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
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
 * Anonymizes ipAddress for rows older than RETENTION_DAYS (default 90) across
 * every public-submission table that collects it. IP is stored only for
 * rate-limiting and abuse detection — once that window passes there is no
 * operational reason to keep it, and indefinite retention violates the
 * data-minimization principle.
 *
 * Covered: Feedback, QrScan, EmbedView, SurveyResponse, AuditResponse.
 * All five schema comments already declared this retention window; only
 * Feedback was actually being swept, so the other four kept visitor IPs
 * indefinitely.
 *
 * NOT covered (deliberately):
 *   - LegalConsent.ipAddress — the IP *is* the consent evidence (KVKK açık
 *     rıza ispatı); erasing it destroys the record it exists to prove.
 *   - UserSession.ipAddress — surfaced in the owner's "active sessions" UI
 *     and tied to session lifecycle, not visitor telemetry.
 *
 * Trigger: Vercel Cron (recommended schedule: weekly) or any external scheduler
 * with the same Authorization header used by /api/cron/weekly-digest.
 *
 * Security: CRON_SECRET header required — refuses every request otherwise.
 */
async function handleCron(req: NextRequest) {
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

  const where = { ipAddress: { not: null }, createdAt: { lt: cutoff } } as const;
  const data = { ipAddress: null } as const;

  // Per-table isolation: one failing table (schema drift on a preview deploy,
  // for example) must not stop the remaining tables from being swept.
  const tables: Array<[string, () => Promise<{ count: number }>]> = [
    ['feedback', () => prisma.feedback.updateMany({ where, data })],
    ['qrScan', () => prisma.qrScan.updateMany({ where, data })],
    ['embedView', () => prisma.embedView.updateMany({ where, data })],
    ['surveyResponse', () => prisma.surveyResponse.updateMany({ where, data })],
    ['auditResponse', () => prisma.auditResponse.updateMany({ where, data })],
  ];

  const anonymizedByTable: Record<string, number> = {};
  const failed: string[] = [];
  let anonymized = 0;

  for (const [name, run] of tables) {
    try {
      const result = await run();
      anonymizedByTable[name] = result.count;
      anonymized += result.count;
    } catch (error) {
      failed.push(name);
      console.error(`[cron/anonymize-ips] ${name} failed:`, (error as Error).message);
    }
  }

  if (failed.length === tables.length) {
    return NextResponse.json({ error: 'job_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    // `anonymized` stays the total so existing dashboards keep working.
    anonymized,
    anonymizedByTable,
    failed,
    cutoff: cutoff.toISOString(),
    retentionDays,
  });
}

export const GET = withCronGuard('/api/cron/anonymize-ips', handleCron);
