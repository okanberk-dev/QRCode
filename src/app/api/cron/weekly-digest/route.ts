import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/weekly-digest-runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Weekly digest cron — Pazartesi 09:00 UTC.
 *
 * Aktif restoranların son 7 günlük yorum + aspect istatistiklerini özetleyip
 * `weekly-report` Pulse mail template'i ile gönderir. 2026-05'ten beri
 * Pulse AI çıkarımı (`extractWeeklyInsight`) inline olarak mail'e
 * gömülür — gpt-4o-mini, ~$0.0002/restoran, 24h cache.
 *
 * Logic `src/lib/weekly-digest-runner.ts`'ta — cron handler sadece auth +
 * JSON wrap yapar. CLAUDE.md §21.13: cron logic'i lib'a, route handler
 * thin (Next.js `route.ts` non-HTTP export'lara izin vermez).
 *
 * Security: `Authorization: Bearer ${CRON_SECRET}` zorunlu.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyDigest();
    // recipient detaylarını cron response'unda göstermeyelim (Vercel logs
    // KVKK riski + log payload size). Sadece counts.
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      skipped: result.skipped,
      optedOut: result.optedOut,
      failed: result.failed,
      total: result.totalRestaurants,
      recipientCount: result.recipients.length,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error('[WEEKLY_DIGEST]', error);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
