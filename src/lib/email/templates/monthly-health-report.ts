// CLAUDE.md §X — Reputation OS Suite (monthly health report mail).
//
// Owner'a aylık olarak (her ayın 1'inde 09:00 UTC) gönderilen rapor.
// Buaze öncesi baseline + en güncel snapshot delta + 4 metric block + aksiyon
// önerileri. Pulse design, table-based (mail client uyumlu), tek dosya.
//
// Bu template "ops-internal" değil — son kullanıcıya gider. Yine de
// DB-driven copy override eklenmedi (gelecek scope); inline hardcoded TR
// + EN. Admin paneli isterse `MailTemplate.content` ile override yolu
// (CLAUDE.md §21.26) eklenebilir.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderButton, spacer } from '../components';
import { escapeHtml } from '../escape';
import { scoreLabel } from '@/lib/reputation/health-score';

export interface MonthlyHealthReportRecommendation {
  severity: 'critical' | 'warn' | 'tip';
  title: string;
  body: string;
}

export interface MonthlyHealthReportParams {
  ownerName: string | null;
  restaurantName: string;
  reportMonth: Date; // ay başlangıcı
  baseline: { score: number; capturedAt: Date } | null;
  latest: { score: number; capturedAt: Date } | null;
  previous: { score: number; capturedAt: Date } | null;
  // Metric'ler (latest snapshot'tan)
  metrics: {
    googleRating: number | null;
    googleReviewCount: number | null;
    googleMediaCount: number | null;
    googleUnansweredQs: number | null;
    feedbackTotal: number | null;
    feedbackAvgRating: number | null;
    feedbackReplied: number | null;
    feedbackLowRated: number | null;
  };
  // Önceki ay (previous monthly snapshot) ile delta
  delta: {
    googleReviewCount: number | null;
    feedbackTotal: number | null;
    feedbackAvgRating: number | null;
  };
  recommendations: MonthlyHealthReportRecommendation[];
  appUrl: string;
  /**
   * 1–3★ feedback the owner could answer (customer left an e-mail) and how
   * many got a reply (§58). When present the "Yanıt oranı" card uses it;
   * the snapshot's feedbackReplied / feedbackTotal divide by every rating,
   * high ratings that need no reply included.
   */
  replyBase?: { total: number; replied: number } | null;
}

const SEVERITY_COLORS: Record<MonthlyHealthReportRecommendation['severity'], { bg: string; fg: string; label: string }> = {
  critical: { bg: '#FEE2E2', fg: '#991B1B', label: 'KRİTİK' },
  warn: { bg: '#FEF3C7', fg: '#92400E', label: 'UYARI' },
  tip: { bg: PULSE.limeSoft, fg: PULSE.graphite, label: 'ÖNERİ' },
};

const SEVERITY_COLORS_EN: Record<MonthlyHealthReportRecommendation['severity'], { bg: string; fg: string; label: string }> = {
  critical: { bg: '#FEE2E2', fg: '#991B1B', label: 'CRITICAL' },
  warn: { bg: '#FEF3C7', fg: '#92400E', label: 'WARNING' },
  tip: { bg: PULSE.limeSoft, fg: PULSE.graphite, label: 'TIP' },
};

/** Whole number, compacted past 99,999 (12K / 3.4M) so it fits a half-width card on a phone. */
function compactNumber(n: number | null, fallback = '—'): string {
  if (n == null || !Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 100_000) return `${Math.round(n / 1000)}K`;
  return String(Math.round(n));
}

function fmtRating(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(1);
}

function fmtDelta(delta: number | null, suffix = ''): string {
  if (delta == null || !Number.isFinite(delta)) return '—';
  if (delta === 0) return `0${suffix}`;
  return `${delta > 0 ? '+' : ''}${delta}${suffix}`;
}

function deltaColor(delta: number | null, positiveIsGood = true): string {
  if (delta == null || delta === 0) return PULSE.n500;
  const isPositive = delta > 0;
  if (positiveIsGood) return isPositive ? '#16A34A' : '#DC2626';
  return isPositive ? '#DC2626' : '#16A34A';
}

export function renderMonthlyHealthReport(
  params: MonthlyHealthReportParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const fmtMonth = new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthStr = fmtMonth.format(params.reportMonth);

  const latestScore = params.latest?.score ?? null;
  const baselineScore = params.baseline?.score ?? null;
  const baselineDelta =
    latestScore != null && baselineScore != null ? latestScore - baselineScore : null;
  const previousDelta =
    latestScore != null && params.previous?.score != null
      ? latestScore - params.previous.score
      : null;

  const subject = isTr
    ? `Buaze Aylık Rapor · ${params.restaurantName} · ${monthStr}`
    : `Buaze Monthly Report · ${params.restaurantName} · ${monthStr}`;

  const preheader = isTr
    ? `${monthStr} sağlık skoru: ${latestScore ?? '—'} / 100. ${baselineDelta != null && baselineDelta > 0 ? `Buaze başlangıcından bu yana ${baselineDelta > 0 ? '+' : ''}${baselineDelta} puan.` : ''}`
    : `${monthStr} health score: ${latestScore ?? '—'} / 100.${baselineDelta != null && baselineDelta > 0 ? ` ${baselineDelta > 0 ? '+' : ''}${baselineDelta} since Buaze start.` : ''}`;

  // ─── Hero ──────────────────────────────────────────────────────────────
  const heroScoreSize = latestScore != null ? '64px' : '40px';
  const heroScoreColor = latestScore != null && latestScore >= 70 ? PULSE.lime : PULSE.pure;
  const greeting = isTr
    ? params.ownerName
      ? `Merhaba ${params.ownerName},`
      : 'Merhaba,'
    : params.ownerName
      ? `Hi ${params.ownerName},`
      : 'Hi,';

  // Thin progress bar under the score (table cell + px-height div: no flex/svg).
  const scoreBar =
    latestScore != null
      ? `
        ${spacer(14)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:360px;">
          <tr>
            <td style="background:${PULSE.n800};border-radius:100px;height:6px;line-height:6px;font-size:1px;">
              <div style="width:${Math.min(100, Math.max(2, Math.round(latestScore)))}%;background:${heroScoreColor};height:6px;border-radius:100px;line-height:6px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
        </table>`
      : '';

  const heroSection = `
    <tr>
      <td class="bz-pad" style="background:${PULSE.graphite};padding:40px 40px 36px;color:${PULSE.pure};">
        ${renderEyebrow(`BUAZE · ${monthStr.toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US')}`, PULSE.n400)}
        ${spacer(14)}
        <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:30px;font-weight:600;letter-spacing:-0.02em;line-height:1.2;color:${PULSE.pure};margin:0;">
          ${escapeHtml(greeting)}<br/>
          ${isTr
            ? `${escapeHtml(params.restaurantName)} için aylık <span style="color:${PULSE.lime};">sağlık raporu</span> hazır.`
            : `${escapeHtml(params.restaurantName)}'s monthly <span style="color:${PULSE.lime};">health report</span> is ready.`}
        </h1>
        ${spacer(28)}
        <div style="font-family:${FONTS.heading};font-size:${heroScoreSize};font-weight:600;letter-spacing:-0.02em;color:${heroScoreColor};line-height:1;">
          ${latestScore ?? '—'}<span style="font-size:24px;font-weight:500;letter-spacing:0;color:${PULSE.n400};">/100</span>
        </div>
        ${spacer(10)}
        <div style="font-family:${FONTS.label};font-size:11px;font-weight:600;letter-spacing:0.12em;line-height:1.4;color:${PULSE.n400};text-transform:uppercase;">
          ${latestScore != null ? scoreLabel(latestScore, locale) : isTr ? 'Veri Yok' : 'No Data'}
        </div>
        ${scoreBar}
        ${baselineDelta != null
          ? `
        ${spacer(18)}
        <div style="font-family:${FONTS.body};font-size:13px;line-height:1.7;color:${PULSE.n300};">
          ${isTr ? 'Buaze öncesinde' : 'Before Buaze'}: <strong style="color:${PULSE.pure};font-weight:600;">${baselineScore ?? '—'}</strong> →
          ${isTr ? 'şimdi' : 'now'}: <strong style="color:${PULSE.lime};font-weight:600;">${latestScore ?? '—'}</strong>
          <span style="color:${deltaColor(baselineDelta)};white-space:nowrap;">(${fmtDelta(baselineDelta)} ${isTr ? 'puan' : 'points'})</span>
        </div>`
          : ''}
      </td>
    </tr>
  `;

  // ─── 2×2 stat cards ───────────────────────────────────────────────────
  // Always two columns (even at 320px): four cells in a row cannot hold Poppins
  // numbers, and four stacked rows wasted a screen. The value leads so numbers
  // stay top-aligned even when a label wraps; big counts are compacted (12K).
  // The card IS the table cell (background + border + radius on the <td>), so
  // both cards in a row are always the same height even when one label wraps at
  // 320px. Needs border-collapse:separate on the table (inline, beats the
  // global collapse rule) for the radius; the gap is a spacer cell.
  const statCard = (label: string, value: string, sub: string | null = null) => `
      <td valign="top" width="50%" style="width:50%;background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:16px 14px;">
        <div style="font-family:${FONTS.heading};font-size:28px;font-weight:600;letter-spacing:-0.02em;color:${PULSE.graphite};line-height:1.1;">${escapeHtml(value)}</div>
        <div style="font-family:${FONTS.body};font-size:12px;font-weight:600;line-height:1.4;color:${PULSE.graphite};margin-top:8px;">${escapeHtml(label)}</div>
        ${sub ? `<div style="font-family:${FONTS.body};font-size:11px;line-height:1.5;color:${PULSE.n500};margin-top:2px;">${escapeHtml(sub)}</div>` : ''}
      </td>`;
  const statGap = `<td width="12" style="width:12px;min-width:12px;font-size:1px;line-height:1px;"><div style="width:12px;font-size:1px;line-height:1px;">&nbsp;</div></td>`;
  const statRow = (left: string, right: string) => `
    <tr>${left}${statGap}${right}</tr>`;

  const replyRate = params.replyBase
    ? params.replyBase.total > 0
      ? `%${Math.round((params.replyBase.replied / params.replyBase.total) * 100)}`
      : '—'
    : params.metrics.feedbackTotal && params.metrics.feedbackTotal > 0
      ? `%${Math.round(((params.metrics.feedbackReplied ?? 0) / params.metrics.feedbackTotal) * 100)}`
      : '—';

  const metricGrid = `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        ${renderEyebrow(isTr ? 'Bu ayın özeti' : 'This month at a glance')}
        ${spacer(16)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
          ${statRow(
            statCard(
              isTr ? 'Google puanı' : 'Google rating',
              fmtRating(params.metrics.googleRating),
              params.metrics.googleReviewCount != null
                ? `${compactNumber(params.metrics.googleReviewCount)} ${isTr ? 'yorum' : 'reviews'}`
                : null,
            ),
            statCard(
              isTr ? 'Buaze yorumları' : 'Buaze feedback',
              compactNumber(params.metrics.feedbackTotal),
              params.metrics.feedbackAvgRating != null
                ? `${isTr ? 'ortalama' : 'avg'} ${fmtRating(params.metrics.feedbackAvgRating)}`
                : null,
            ),
          )}
          <tr><td colspan="3" height="12" style="height:12px;font-size:1px;line-height:12px;">&nbsp;</td></tr>
          ${statRow(
            statCard(isTr ? 'Yanıt oranı' : 'Reply rate', replyRate, isTr ? 'müşteri yanıtı' : 'customer replies'),
            statCard(
              isTr ? 'Profil fotoğrafı' : 'Profile photos',
              compactNumber(params.metrics.googleMediaCount),
              isTr ? 'Google Business' : 'on Google',
            ),
          )}
        </table>
      </td>
    </tr>
  `;

  // ─── Geçen aya göre delta ──────────────────────────────────────────────
  const deltaRow = (label: string, valueHtml: string, last = false) => `
    <tr>
      <td valign="middle" style="padding:12px 12px 12px 0;${last ? '' : `border-bottom:1px solid ${PULSE.n200};`}font-family:${FONTS.body};font-size:13px;line-height:1.4;color:${PULSE.n600};">${label}</td>
      <td valign="middle" align="right" style="padding:12px 0;${last ? '' : `border-bottom:1px solid ${PULSE.n200};`}white-space:nowrap;">${valueHtml}</td>
    </tr>`;
  const deltaValue = (text: string, color: string) =>
    `<span style="font-family:${FONTS.heading};font-size:20px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;color:${color};">${escapeHtml(text)}</span>`;

  const deltaSection = params.delta && (
    params.delta.googleReviewCount != null ||
    params.delta.feedbackTotal != null ||
    params.delta.feedbackAvgRating != null
  )
    ? `
    <tr>
      <td class="bz-pad" style="padding:24px 40px 8px;">
        <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:16px;padding:20px 20px 16px;">
          ${renderEyebrow(isTr ? 'Geçen aya göre' : 'Vs last month')}
          ${spacer(4)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${deltaRow(isTr ? 'Yeni Google yorumu' : 'New Google reviews', deltaValue(fmtDelta(params.delta.googleReviewCount), deltaColor(params.delta.googleReviewCount)))}
            ${deltaRow(isTr ? 'Yeni Buaze yorumu' : 'New Buaze feedback', deltaValue(fmtDelta(params.delta.feedbackTotal), deltaColor(params.delta.feedbackTotal)))}
            ${deltaRow(
              isTr ? 'Ortalama puan' : 'Avg rating',
              deltaValue(
                params.delta.feedbackAvgRating != null
                  ? (params.delta.feedbackAvgRating > 0 ? '+' : '') + params.delta.feedbackAvgRating.toFixed(2)
                  : '—',
                deltaColor(params.delta.feedbackAvgRating),
              ),
              previousDelta == null,
            )}
          </table>
          ${previousDelta != null
            ? `
          <p style="font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n600};margin:12px 0 0;">
            ${isTr ? 'Sağlık skoru bu ay' : 'Health score this month'}
            <strong style="color:${deltaColor(previousDelta)};font-weight:600;white-space:nowrap;">${fmtDelta(previousDelta, isTr ? ' puan' : ' pts')}</strong>
            ${previousDelta >= 0 ? (isTr ? 'arttı.' : 'gained.') : (isTr ? 'düştü.' : 'dropped.')}
          </p>`
            : ''}
        </div>
      </td>
    </tr>
  `
    : '';

  // ─── Recommendations ──────────────────────────────────────────────────
  const sevPalette = isTr ? SEVERITY_COLORS : SEVERITY_COLORS_EN;
  const recRows = params.recommendations
    .slice(0, 5)
    .map((r) => {
      const sev = sevPalette[r.severity];
      return `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid ${PULSE.n200};vertical-align:top;">
            <span style="display:inline-block;background:${sev.bg};color:${sev.fg};font-family:${FONTS.label};font-size:10px;font-weight:600;letter-spacing:0.1em;line-height:1.4;padding:3px 10px;border-radius:100px;text-transform:uppercase;white-space:nowrap;">${sev.label}</span>
            <div style="font-family:${FONTS.heading};font-size:15px;font-weight:600;color:${PULSE.graphite};line-height:1.4;margin-top:10px;">${escapeHtml(r.title)}</div>
            <p style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};line-height:1.6;margin:6px 0 0;">${escapeHtml(r.body)}</p>
          </td>
        </tr>
      `;
    })
    .join('');

  const recsSection =
    params.recommendations.length > 0
      ? `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        ${renderEyebrow(isTr ? 'Sonraki adımlar' : 'Next steps')}
        ${spacer(10)}
        ${renderH2(isTr ? `${monthStr} için yapılması önerilenler` : `Recommended for ${monthStr}`)}
        ${spacer(8)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${PULSE.n200};">
          ${recRows}
        </table>
      </td>
    </tr>
  `
      : '';

  // ─── CTA ──────────────────────────────────────────────────────────────
  const ctaSection = `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 40px;">
        ${renderButton({
          href: `${params.appUrl}/tr/dashboard`,
          label: isTr ? 'Panelimde detayları gör →' : 'Open my panel →',
          variant: 'lime',
          size: 'lg',
        })}
        ${spacer(18)}
        <p style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};margin:0;line-height:1.6;">
          ${isTr
            ? 'Bu rapor her ayın 1\'inde Buaze tarafından otomatik üretilir. Yorum yönetimi, fotoğraf önerileri ve sağlık skorunu paneliniz üzerinden istediğiniz an inceleyebilirsiniz.'
            : 'This report is generated automatically by Buaze at the start of each month. View reviews, photo recommendations, and your health score anytime in your panel.'}
        </p>
      </td>
    </tr>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${heroSection}
      ${metricGrid}
      ${deltaSection}
      ${recsSection}
      ${ctaSection}
    </table>
  `;

  const html = pulseLayout({
    subject: escapeHtml(subject),
    preheader: escapeHtml(preheader),
    content,
    footer: { locale },
  });

  const text = [
    greeting,
    '',
    isTr
      ? `${params.restaurantName} için ${monthStr} sağlık raporu:`
      : `${params.restaurantName} health report for ${monthStr}:`,
    `${isTr ? 'Sağlık skoru' : 'Health score'}: ${latestScore ?? '—'} / 100`,
    baselineDelta != null
      ? `${isTr ? 'Buaze öncesinden bu yana' : 'Since Buaze start'}: ${fmtDelta(baselineDelta, isTr ? ' puan' : ' pts')}`
      : '',
    '',
    `${isTr ? 'Google puanı' : 'Google rating'}: ${fmtRating(params.metrics.googleRating)} (${params.metrics.googleReviewCount ?? '—'} ${isTr ? 'yorum' : 'reviews'})`,
    `${isTr ? 'Buaze yorum sayısı' : 'Buaze feedback count'}: ${params.metrics.feedbackTotal ?? '—'}`,
    `${isTr ? 'Profil fotoğrafı' : 'Profile photos'}: ${params.metrics.googleMediaCount ?? '—'}`,
    '',
    params.recommendations.length > 0
      ? `${isTr ? 'Sonraki adımlar' : 'Next steps'}:`
      : '',
    ...params.recommendations.slice(0, 5).map((r) => `- ${r.title}`),
    '',
    `${params.appUrl}/tr/dashboard`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
