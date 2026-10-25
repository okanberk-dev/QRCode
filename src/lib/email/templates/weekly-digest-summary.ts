import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderP, spacer } from '../components';
import type { WeeklyDigestRecipient } from '@/lib/weekly-digest-runner';

export interface WeeklyDigestSummaryParams {
  /** Mail'in tetiklendiği zaman (ISO timestamp). */
  triggeredAt: Date;
  recipients: WeeklyDigestRecipient[];
  totals: {
    totalRestaurants: number;
    sent: number;
    skipped: number;
    optedOut: number;
    failed: number;
  };
  /** Bir önceki cron çalışmasının (Pazartesi 09:00) durumu — `weekly-digest`
   *  endpoint'inden 1 saat sonra tetiklenir, bu yüzden recipients zaten
   *  mail almış olmalı. */
  precedingDigestNote?: string;
}

/**
 * Ops-internal weekly digest summary template — Pazartesi 10:00 UTC'de
 * hello@buaze.com'a gönderilir. Hangi restoranların `weekly-digest`
 * mailini aldığını + AI çıkarımı tetiklenip tetiklenmediğini özetler.
 *
 * Pulse design'a uygun ama ops-internal olduğu için DB-driven copy yok
 * (CLAUDE.md §21.26 — admin override edilemez, hardcoded inline copy).
 */
export function renderWeeklyDigestSummary(
  params: WeeklyDigestSummaryParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const fmtDate = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const dateStr = `${fmtDate.format(params.triggeredAt)} UTC`;

  const subject = isTr
    ? `[Ops] Haftalık digest özeti · ${params.totals.sent} restoran · ${dateStr}`
    : `[Ops] Weekly digest summary · ${params.totals.sent} restaurants · ${dateStr}`;
  const preheader = isTr
    ? `Pazartesi 09:00 raporu ${params.totals.sent}/${params.totals.totalRestaurants} restorana gitti.`
    : `Monday 09:00 digest reached ${params.totals.sent}/${params.totals.totalRestaurants} restaurants.`;

  // Top-stat hero — pure, no graphite splash (ops-internal kullanılır,
  // marketing değil). Numerik tabular-aligned.
  const totals = params.totals;
  const heroStats: Array<{ label: string; value: string; tone?: 'lime' | 'warn' | 'danger' }> = [
    {
      label: isTr ? 'Mail gönderildi' : 'Mail sent',
      value: String(totals.sent),
      tone: 'lime',
    },
    {
      label: isTr ? 'Yorum yok (atlandı)' : 'No reviews (skipped)',
      value: String(totals.skipped),
    },
    {
      label: isTr ? 'Bildirim kapalı' : 'Notifications off',
      value: String(totals.optedOut),
    },
    {
      label: isTr ? 'Hata' : 'Failed',
      value: String(totals.failed),
      tone: totals.failed > 0 ? 'danger' : undefined,
    },
  ];

  const heroCells = heroStats.map((s, i) => {
    const accent = s.tone === 'lime' ? PULSE.lime : s.tone === 'danger' ? PULSE.danger : s.tone === 'warn' ? PULSE.warning : PULSE.pure;
    return `
      <td class="stack-col" valign="top" style="width:25%;padding:0 16px;${i === 0 ? 'padding-left:0;' : ''}${i < heroStats.length - 1 ? `border-right:1px solid ${PULSE.n800};` : 'padding-right:0;'}">
        <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n400};text-transform:uppercase;">${s.label}</div>
        <div style="font-family:${FONTS.heading};font-size:32px;font-weight:500;letter-spacing:-0.025em;color:${accent};line-height:1;margin-top:6px;">${s.value}</div>
      </td>
    `;
  }).join('');

  // Recipient table — sent durumu, AI tetiklenmiş mi, restoran istatistiği.
  // Email adresini hidden tutmak için partial mask: ad@domain → a***@domain
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    return `${local.charAt(0)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
  };

  const recipientRows = params.recipients
    .slice() // immutable copy
    .sort((a, b) => b.total - a.total) // çok yorumlu üstte
    .map((r) => {
      const statusBg = r.emailSent ? PULSE.limeSoft : PULSE.n100;
      const statusFg = r.emailSent ? PULSE.graphite : PULSE.n600;
      const statusLabel = r.emailSent
        ? (isTr ? 'Gönderildi' : 'Sent')
        : (isTr ? 'Hata / dry' : 'Fail / dry');
      const aiBadge = r.hasAi
        ? `<span style="display:inline-block;background:${PULSE.graphite};color:${PULSE.lime};font-family:${FONTS.label};font-size:9px;letter-spacing:0.16em;padding:2px 6px;border-radius:4px;">AI</span>`
        : `<span style="display:inline-block;background:${PULSE.n100};color:${PULSE.n500};font-family:${FONTS.label};font-size:9px;letter-spacing:0.16em;padding:2px 6px;border-radius:4px;">—</span>`;
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid ${PULSE.n200};font-family:${FONTS.body};font-size:13px;font-weight:500;color:${PULSE.graphite};vertical-align:top;">
            ${escapeHtml(r.restaurantName)}
            <div style="font-family:${FONTS.label};font-size:10px;color:${PULSE.n500};font-weight:400;margin-top:2px;">${escapeHtml(maskEmail(r.recipientEmail))}</div>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid ${PULSE.n200};font-family:${FONTS.label};font-size:12px;color:${PULSE.graphite};text-align:right;vertical-align:top;">
            ${r.total}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid ${PULSE.n200};font-family:${FONTS.label};font-size:12px;color:${PULSE.graphite};text-align:right;vertical-align:top;">
            ${r.avgRating.toFixed(1)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid ${PULSE.n200};text-align:center;vertical-align:top;">
            ${aiBadge}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid ${PULSE.n200};text-align:right;vertical-align:top;">
            <span style="display:inline-block;background:${statusBg};color:${statusFg};font-family:${FONTS.label};font-size:9px;letter-spacing:0.16em;padding:2px 8px;border-radius:100px;text-transform:uppercase;">${statusLabel}</span>
          </td>
        </tr>
      `;
    }).join('');

  const tableHeader = `
    <tr>
      <th align="left" style="padding:8px;font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;border-bottom:2px solid ${PULSE.graphite};">
        ${isTr ? 'Restoran' : 'Restaurant'}
      </th>
      <th align="right" style="padding:8px;font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;border-bottom:2px solid ${PULSE.graphite};">
        ${isTr ? 'Yorum' : 'Reviews'}
      </th>
      <th align="right" style="padding:8px;font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;border-bottom:2px solid ${PULSE.graphite};">
        ${isTr ? 'Ort.' : 'Avg'}
      </th>
      <th align="center" style="padding:8px;font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;border-bottom:2px solid ${PULSE.graphite};">
        ${isTr ? 'AI' : 'AI'}
      </th>
      <th align="right" style="padding:8px;font-family:${FONTS.label};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;border-bottom:2px solid ${PULSE.graphite};">
        ${isTr ? 'Durum' : 'Status'}
      </th>
    </tr>
  `;

  const emptyTable = `
    <tr>
      <td colspan="5" style="padding:24px;text-align:center;font-family:${FONTS.body};font-size:13px;color:${PULSE.n500};">
        ${isTr ? 'Bu hafta hiçbir restoran rapor almadı.' : 'No restaurant received the digest this week.'}
      </td>
    </tr>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.graphite};padding:36px 40px;color:${PULSE.pure};">
          ${renderEyebrow(isTr ? 'Pazartesi · Ops Özeti' : 'Monday · Ops Summary', PULSE.n400)}
          ${spacer(12)}
          <h1 style="font-family:${FONTS.heading};font-size:34px;font-weight:500;letter-spacing:-0.025em;line-height:1.15;color:${PULSE.pure};margin:0;">
            ${isTr
              ? `<span style="color:${PULSE.lime};">${params.totals.sent}</span> restorana<br/>haftalık rapor gitti.`
              : `Weekly digest reached <span style="color:${PULSE.lime};">${params.totals.sent}</span><br/>restaurants.`}
          </h1>
          ${spacer(8)}
          <p style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.1em;color:${PULSE.n400};margin:0;">${dateStr}</p>
          ${spacer(28)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row" style="border-top:1px solid ${PULSE.n800};padding-top:18px;">
            <tr>${heroCells}</tr>
          </table>
        </td>
      </tr>

      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(isTr ? 'Gönderim listesi' : 'Recipient list')}
          ${spacer(8)}
          ${renderH2(isTr ? 'Bu Pazartesi rapor alan restoranlar' : 'Restaurants that got the digest this Monday')}
          ${spacer(16)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
            <thead>${tableHeader}</thead>
            <tbody>${params.recipients.length > 0 ? recipientRows : emptyTable}</tbody>
          </table>
        </td>
      </tr>

      <tr>
        <td class="bz-pad" style="padding:24px 40px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border-radius:12px;">
            <tr>
              <td style="padding:18px 20px;">
                ${renderP(
                  isTr
                    ? 'AI rozetli satırlar Pulse AI çıkarımı içeren mailleri gösterir. Diğer restoranlarda OPENAI_API_KEY eksik veya hafta içi yorum yetersiz olabilir.'
                    : 'Rows with AI badge include the Pulse AI inference. Others either lack OPENAI_API_KEY or had insufficient comments.',
                  { size: 12, color: PULSE.n600 },
                )}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: '',
    footer: { locale, unsubText: isTr ? 'Bu mail Buaze ops için otomatik üretildi.' : 'This mail is generated automatically for Buaze ops.' },
  });

  // Plain-text counterpart — daha az detaylı, mail client'lar için.
  const textRows = params.recipients
    .map((r) => `- ${r.restaurantName} · ${r.total} yorum · ort ${r.avgRating.toFixed(1)} · AI=${r.hasAi ? 'evet' : 'hayır'} · ${r.emailSent ? 'gönderildi' : 'gönderilmedi'}`)
    .join('\n');
  const text = `${isTr ? 'Pazartesi Ops Özeti' : 'Monday Ops Summary'}
${dateStr}

${isTr ? 'Mail gönderilen' : 'Sent'}: ${totals.sent}
${isTr ? 'Atlanan (yorum yok)' : 'Skipped (no reviews)'}: ${totals.skipped}
${isTr ? 'Bildirim kapalı' : 'Notifications off'}: ${totals.optedOut}
${isTr ? 'Hata' : 'Failed'}: ${totals.failed}

${isTr ? 'Restoran listesi' : 'Restaurant list'}:
${textRows || '—'}
${params.precedingDigestNote ? `\n${params.precedingDigestNote}` : ''}`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
