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
import { renderEyebrow, renderH2, spacer } from '../components';
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

function fmtNum(n: number | null, fallback = '—'): string {
  if (n == null || !Number.isFinite(n)) return fallback;
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

  const heroSection = `
    <tr>
      <td class="bz-pad" style="background:${PULSE.graphite};padding:36px 40px;color:${PULSE.pure};">
        ${renderEyebrow(isTr ? `BUAZE · ${monthStr.toUpperCase()}` : `BUAZE · ${monthStr.toUpperCase()}`, PULSE.n400)}
        ${spacer(12)}
        <h1 style="font-family:${FONTS.heading};font-size:30px;font-weight:500;letter-spacing:-0.025em;line-height:1.15;color:${PULSE.pure};margin:0;">
          ${escapeHtml(greeting)}<br/>
          ${isTr
            ? `${escapeHtml(params.restaurantName)} için aylık <span style="color:${PULSE.lime};">sağlık raporu</span> hazır.`
            : `${escapeHtml(params.restaurantName)}'s monthly <span style="color:${PULSE.lime};">health report</span> is ready.`}
        </h1>
        ${spacer(24)}
        <div style="font-family:${FONTS.heading};font-size:${heroScoreSize};font-weight:500;letter-spacing:-0.04em;color:${heroScoreColor};line-height:1;">
          ${latestScore ?? '—'}<span style="font-size:24px;color:${PULSE.n400};">/100</span>
        </div>
        ${spacer(8)}
        <p style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.16em;color:${PULSE.n400};margin:0;text-transform:uppercase;">
          ${latestScore != null ? scoreLabel(latestScore, locale) : isTr ? 'Veri Yok' : 'No Data'}
        </p>
        ${baselineDelta != null
          ? `
        ${spacer(16)}
        <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n300};">
          ${isTr ? 'Buaze öncesinde' : 'Before Buaze'}: <strong style="color:${PULSE.pure};">${baselineScore ?? '—'}</strong> →
          ${isTr ? 'şimdi' : 'now'}: <strong style="color:${PULSE.lime};">${latestScore ?? '—'}</strong>
          <span style="color:${deltaColor(baselineDelta)};">(${fmtDelta(baselineDelta)} ${isTr ? 'puan' : 'points'})</span>
        </div>`
          : ''}
      </td>
    </tr>
  `;

  // ─── 4-stat grid ──────────────────────────────────────────────────────
  const statCell = (label: string, value: string, sub: string | null = null, accent?: string) => `
    <td class="stack-col" valign="top" style="width:25%;padding:0 12px;">
      <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;color:${PULSE.n500};text-transform:uppercase;">${escapeHtml(label)}</div>
      <div style="font-family:${FONTS.heading};font-size:28px;font-weight:500;letter-spacing:-0.025em;color:${accent ?? PULSE.graphite};line-height:1;margin-top:6px;">${escapeHtml(value)}</div>
      ${sub ? `<div style="font-family:${FONTS.body};font-size:11px;color:${PULSE.n500};margin-top:4px;">${escapeHtml(sub)}</div>` : ''}
    </td>
  `;

  const metricGrid = `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        ${renderEyebrow(isTr ? 'Bu ayın özeti' : 'This month at a glance')}
        ${spacer(20)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
          <tr>
            ${statCell(
              isTr ? 'Google puanı' : 'Google rating',
              fmtRating(params.metrics.googleRating),
              params.metrics.googleReviewCount != null
                ? `${params.metrics.googleReviewCount} ${isTr ? 'yorum' : 'reviews'}`
                : null,
              PULSE.graphite,
            )}
            ${statCell(
              isTr ? 'Buaze yorumları' : 'Buaze feedback',
              fmtNum(params.metrics.feedbackTotal),
              params.metrics.feedbackAvgRating != null
                ? `${isTr ? 'ortalama' : 'avg'} ${fmtRating(params.metrics.feedbackAvgRating)}`
                : null,
            )}
            ${statCell(
              isTr ? 'Yanıt oranı' : 'Reply rate',
              params.metrics.feedbackTotal && params.metrics.feedbackTotal > 0
                ? `%${Math.round(((params.metrics.feedbackReplied ?? 0) / params.metrics.feedbackTotal) * 100)}`
                : '—',
              isTr ? 'müşteri yanıtı' : 'customer replies',
            )}
            ${statCell(
              isTr ? 'Profil fotoğrafı' : 'Profile photos',
              fmtNum(params.metrics.googleMediaCount),
              isTr ? 'Google Business' : 'on Google',
            )}
          </tr>
        </table>
      </td>
    </tr>
  `;

  // ─── Geçen aya göre delta ──────────────────────────────────────────────
  const deltaSection = params.delta && (
    params.delta.googleReviewCount != null ||
    params.delta.feedbackTotal != null ||
    params.delta.feedbackAvgRating != null
  )
    ? `
    <tr>
      <td class="bz-pad" style="padding:8px 40px 8px;">
        ${spacer(16)}
        <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:12px;padding:18px 20px;">
          ${renderEyebrow(isTr ? 'Geçen aya göre' : 'Vs last month')}
          ${spacer(8)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              <td valign="top" style="padding:0 10px 0 0;">
                <div style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${isTr ? 'Yeni Google yorumu' : 'New Google reviews'}</div>
                <div style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${deltaColor(params.delta.googleReviewCount)};margin-top:2px;">${fmtDelta(params.delta.googleReviewCount)}</div>
              </td>
              <td valign="top" style="padding:0 10px;">
                <div style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${isTr ? 'Yeni Buaze yorumu' : 'New Buaze feedback'}</div>
                <div style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${deltaColor(params.delta.feedbackTotal)};margin-top:2px;">${fmtDelta(params.delta.feedbackTotal)}</div>
              </td>
              <td valign="top" style="padding:0 0 0 10px;">
                <div style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${isTr ? 'Ortalama puan' : 'Avg rating'}</div>
                <div style="font-family:${FONTS.heading};font-size:22px;font-weight:500;color:${deltaColor(params.delta.feedbackAvgRating)};margin-top:2px;">${params.delta.feedbackAvgRating != null ? (params.delta.feedbackAvgRating > 0 ? '+' : '') + params.delta.feedbackAvgRating.toFixed(2) : '—'}</div>
              </td>
            </tr>
          </table>
          ${previousDelta != null
            ? `
          ${spacer(12)}
          <p style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};margin:0;">
            ${isTr ? 'Sağlık skoru bu ay' : 'Health score this month'}
            <strong style="color:${deltaColor(previousDelta)};">${fmtDelta(previousDelta, isTr ? ' puan' : ' pts')}</strong>
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
          <td style="padding:14px 16px;border-bottom:1px solid ${PULSE.n200};vertical-align:top;">
            <span style="display:inline-block;background:${sev.bg};color:${sev.fg};font-family:${FONTS.label};font-size:9px;letter-spacing:0.16em;padding:2px 8px;border-radius:100px;text-transform:uppercase;margin-bottom:8px;">${sev.label}</span>
            <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};line-height:1.35;">${escapeHtml(r.title)}</div>
            <p style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n600};line-height:1.5;margin:6px 0 0;">${escapeHtml(r.body)}</p>
          </td>
        </tr>
      `;
    })
    .join('');

  const recsSection =
    params.recommendations.length > 0
      ? `
    <tr>
      <td class="bz-pad" style="padding:24px 40px 8px;">
        ${renderEyebrow(isTr ? 'Sonraki adımlar' : 'Next steps')}
        ${spacer(8)}
        ${renderH2(isTr ? `${monthStr} için yapılması önerilenler` : `Recommended for ${monthStr}`)}
        ${spacer(12)}
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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${PULSE.lime};border-radius:100px;">
              <a href="${params.appUrl}/tr/dashboard" style="display:inline-block;font-family:${FONTS.body};font-size:14px;font-weight:600;color:${PULSE.graphite};text-decoration:none;padding:12px 24px;">
                ${isTr ? 'Panelimde detayları gör →' : 'Open my panel →'}
              </a>
            </td>
          </tr>
        </table>
        ${spacer(16)}
        <p style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};margin:0;line-height:1.5;">
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
    subject,
    preheader,
    content,
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
