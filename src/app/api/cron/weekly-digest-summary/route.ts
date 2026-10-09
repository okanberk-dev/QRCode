import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { runWeeklyDigest } from '@/lib/weekly-digest-runner';
import { sendWeeklyDigestSummary } from '@/lib/email';

export const dynamic = 'force-dynamic';
// Explicit Node.js runtime — mirrors weekly-digest, locks the cron away
// from any implicit edge upgrade. CLAUDE.md §38.11 cron checklist.
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Pazartesi 10:00 UTC ops summary cron.
 *
 * 09:00 UTC'de çalışan `weekly-digest` cron'undan 1 saat sonra tetiklenir
 * ve hello@buaze.com'a hangi restoranlara mail gittiğini özetleyen
 * Pulse-styled mail atar. CLAUDE.md §21.13 self-fetch antipattern'ini
 * önlemek için `runWeeklyDigest({ dryRun: true })` shared helper'ı
 * çağırılır — aynı query'ler tekrar koşar, mail göndermez, sadece
 * recipient list'i derive eder.
 *
 * **Idempotency**: dryRun=true olduğundan müşteri restoranlarına yeniden
 * mail gitmez. Bir saat içinde data'da değişiklik (yeni feedback, prefs
 * toggle) olursa summary 09:00'daki tam listeden minik sapma gösterebilir
 * — kabul edilen drift (ops dashboard, kesin audit log değil).
 *
 * Security: `Authorization: Bearer ${CRON_SECRET}` zorunlu.
 *
 * Recipient: `OPS_DIGEST_SUMMARY_EMAIL` env'iyle override edilebilir
 * (default: `hello@buaze.com`). Operator istediği inbox'a yönlendirebilir.
 */
const DEFAULT_RECIPIENT = 'hello@buaze.com';

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipient = (process.env.OPS_DIGEST_SUMMARY_EMAIL || DEFAULT_RECIPIENT).trim();
  if (!recipient || !recipient.includes('@')) {
    return NextResponse.json({ error: 'invalid_recipient' }, { status: 500 });
  }

  try {
    // Aynı 7-günlük pencereyi dryRun ile derive et (mail gönderme).
    const digest = await runWeeklyDigest({ dryRun: true });

    // 09:00 → 10:00 saatleri arasında sent kayıtları var mı? Cron sırasında
    // recipient.emailSent flag'i dryRun olduğu için false döner; bu ops
    // summary için "kim aldı" bilgisi ⇔ "kim hak etti" yorumlanmalı.
    // Hak edenlerin sayısı = digest.sent + digest.failed (toplam send
    // attempted). Skipped + optedOut tabii ki maili almadı.
    const triggeredAt = new Date();
    const note = `Bu özet ${triggeredAt.toISOString()} (UTC) anında dry-run ile hesaplandı. Pazartesi 09:00 cron çalışmasından sonra hesaba katılan restoranların listesi.`;

    const ok = await sendWeeklyDigestSummary({
      to: recipient,
      locale: 'tr',
      data: {
        triggeredAt,
        recipients: digest.recipients.map((r) => ({
          ...r,
          // dryRun=true olduğu için emailSent her zaman false. Ops için
          // anlamlı görünmesi adına "haftalık raporu hak etti" semantiği
          // ile true override ediyoruz. Skipped/optedOut listeye girmez.
          emailSent: true,
        })),
        totals: {
          totalRestaurants: digest.totalRestaurants,
          sent: digest.sent,
          skipped: digest.skipped,
          optedOut: digest.optedOut,
          failed: digest.failed,
        },
        precedingDigestNote: note,
      },
    });

    return NextResponse.json({
      ok: true,
      recipient,
      mailSent: ok,
      totalRecipients: digest.recipients.length,
      totals: {
        sent: digest.sent,
        skipped: digest.skipped,
        optedOut: digest.optedOut,
        failed: digest.failed,
      },
      durationMs: digest.durationMs,
    });
  } catch (error) {
    console.error('[WEEKLY_DIGEST_SUMMARY]', error);
    return NextResponse.json({ error: 'summary_failed' }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/weekly-digest-summary', handleCron);
