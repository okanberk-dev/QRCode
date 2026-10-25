import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderP, spacer } from '../components';
import type { WeeklyDigestRecipient } from '@/lib/weekly-digest-runner';

/** Counts past 99,999 collapse to 123K / 1.2M so they fit a half-width stat card at 320px. */
function compactCount(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 100_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

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

  // Top-stat hero — 2×2 cards on the dark band (value first so numbers stay
  // top-aligned even when a label wraps). 2 columns on every width: four
  // stacked rows cost a full phone screen.
  const totals = params.totals;
  const heroStats: Array<{ label: string; value: string; tone?: 'lime' | 'warn' | 'danger' }> = [
    {
      label: isTr ? 'Mail gönderildi' : 'Mail sent',
      value: compactCount(totals.sent),
      tone: 'lime',
    },
    {
      label: isTr ? 'Yorum yok (atlandı)' : 'No reviews (skipped)',
      value: compactCount(totals.skipped),
    },
    {
      label: isTr ? 'Bildirim kapalı' : 'Notifications off',
      value: compactCount(totals.optedOut),
    },
    {
      label: isTr ? 'Hata' : 'Failed',
      value: compactCount(totals.failed),
      tone: totals.failed > 0 ? 'danger' : undefined,
    },
  ];

  // The card IS the table cell, so the two cards in a row stay the same height
  // when one label wraps ("Yorum yok (atlandı)" at 320-375px). The table is
  // border-collapse:separate (inline) so the cell radius renders; the gap is a
  // spacer cell.
  const heroCard = (s: (typeof heroStats)[number]) => {
    const accent = s.tone === 'lime' ? PULSE.lime : s.tone === 'danger' ? '#F87171' : s.tone === 'warn' ? PULSE.warning : PULSE.pure;
    return `
      <td valign="top" width="50%" style="width:50%;background:${PULSE.n800};border-radius:14px;padding:16px 14px;">
        <div style="font-family:${FONTS.heading};font-size:30px;font-weight:600;letter-spacing:-0.02em;color:${accent};line-height:1.1;">${s.value}</div>
        <div style="font-family:${FONTS.body};font-size:12px;font-weight:500;line-height:1.4;color:${PULSE.n400};margin-top:8px;">${s.label}</div>
      </td>`;
  };
  const heroGap = `<td width="12" style="width:12px;min-width:12px;font-size:1px;line-height:1px;"><div style="width:12px;font-size:1px;line-height:1px;">&nbsp;</div></td>`;
  const heroRow = (a: (typeof heroStats)[number], b: (typeof heroStats)[number]) => `
    <tr>${heroCard(a)}${heroGap}${heroCard(b)}</tr>`;
  const heroGrid = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
      ${heroRow(heroStats[0], heroStats[1])}
      <tr><td colspan="3" height="12" style="height:12px;font-size:1px;line-height:12px;">&nbsp;</td></tr>
      ${heroRow(heroStats[2], heroStats[3])}
    </table>`;

  // Recipient list — one stacked block per restaurant instead of a 5-column
  // table: Poppins at 320px cannot hold five columns, and a table that is wider
  // than the shell gets silently clipped. Name + masked e-mail on the left,
  // status pill on the right, review count / average / AI on a second line.
  // Email adresini hidden tutmak için partial mask: ad@domain → a***@domain
  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    return `${local.charAt(0)}${'*'.repeat(Math.min(6, Math.max(2, local.length - 1)))}@${domain}`;
  };

  const metricLabel = (text: string) =>
    `<span style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${text}</span>`;
  const metricValue = (text: string) =>
    `<strong style="font-family:${FONTS.body};font-size:13px;font-weight:600;color:${PULSE.graphite};">${text}</strong>`;
  const metricSep = `<span style="color:${PULSE.n300};padding:0 6px;">·</span>`;

  const recipientRows = params.recipients
    .slice() // immutable copy
    .sort((a, b) => b.total - a.total) // çok yorumlu üstte
    .map((r) => {
      const statusBg = r.emailSent ? PULSE.limeSoft : '#FEE2E2';
      const statusFg = r.emailSent ? PULSE.graphite : '#991B1B';
      const statusLabel = r.emailSent
        ? (isTr ? 'Gönderildi' : 'Sent')
        : (isTr ? 'Hata / dry' : 'Fail / dry');
      const aiBadge = r.hasAi
        ? `<span style="display:inline-block;background:${PULSE.graphite};color:${PULSE.lime};font-family:${FONTS.label};font-size:10px;font-weight:600;letter-spacing:0.08em;line-height:1.4;padding:2px 8px;border-radius:6px;white-space:nowrap;">AI</span>`
        : `<span style="display:inline-block;background:${PULSE.n100};color:${PULSE.n500};font-family:${FONTS.label};font-size:10px;font-weight:600;letter-spacing:0.08em;line-height:1.4;padding:2px 8px;border-radius:6px;white-space:nowrap;">AI —</span>`;
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid ${PULSE.n200};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="top" style="font-family:${FONTS.body};font-size:14px;font-weight:600;line-height:1.4;color:${PULSE.graphite};">${escapeHtml(r.restaurantName)}</td>
                <td valign="top" align="right" style="width:1%;padding-left:12px;white-space:nowrap;">
                  <span style="display:inline-block;background:${statusBg};color:${statusFg};font-family:${FONTS.label};font-size:10px;font-weight:600;letter-spacing:0.1em;line-height:1.4;padding:4px 10px;border-radius:100px;text-transform:uppercase;white-space:nowrap;">${statusLabel}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" class="bz-break" style="padding-top:4px;font-family:${FONTS.body};font-size:11px;font-weight:400;line-height:1.55;color:${PULSE.n500};">${escapeHtml(maskEmail(r.recipientEmail))}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:8px;line-height:1.9;">
                  ${metricLabel(isTr ? 'Yorum' : 'Reviews')} ${metricValue(String(r.total))}${metricSep}${metricLabel(isTr ? 'Ort.' : 'Avg')} ${metricValue(r.avgRating.toFixed(1))}${metricSep}${aiBadge}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }).join('');

  const emptyTable = `
    <tr>
      <td style="padding:24px 16px;text-align:center;background:${PULSE.n50};border-radius:12px;font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n500};">
        ${isTr ? 'Bu hafta hiçbir restoran rapor almadı.' : 'No restaurant received the digest this week.'}
      </td>
    </tr>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.graphite};padding:40px 40px 36px;color:${PULSE.pure};">
          ${renderEyebrow(isTr ? 'Pazartesi · Ops Özeti' : 'Monday · Ops Summary', PULSE.n400)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:34px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.pure};margin:0;">
            ${isTr
              ? `<span style="color:${PULSE.lime};">${params.totals.sent}</span> restorana<br/>haftalık rapor gitti.`
              : `Weekly digest reached <span style="color:${PULSE.lime};">${params.totals.sent}</span><br/>restaurants.`}
          </h1>
          ${spacer(10)}
          <p style="font-family:${FONTS.body};font-size:12px;line-height:1.55;letter-spacing:0.02em;color:${PULSE.n400};margin:0;">${dateStr}</p>
          ${spacer(28)}
          ${heroGrid}
        </td>
      </tr>

      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(isTr ? 'Gönderim listesi' : 'Recipient list')}
          ${spacer(10)}
          ${renderH2(isTr ? 'Bu Pazartesi rapor alan restoranlar' : 'Restaurants that got the digest this Monday')}
          ${spacer(12)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${params.recipients.length > 0 ? `border-top:1px solid ${PULSE.n200};` : ''}">
            ${params.recipients.length > 0 ? recipientRows : emptyTable}
          </table>
        </td>
      </tr>

      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;">
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
