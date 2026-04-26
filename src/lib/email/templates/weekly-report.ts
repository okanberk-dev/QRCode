import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderP, renderButton, renderBarChart, renderQuoteCard, spacer } from '../components';

export interface WeeklyReportParams {
  restaurantName: string;
  period: { from: Date; to: Date };
  stats: {
    total: number;
    avgRating: number;
    highRatings: number;
    lowRatings: number;
    distribution: Record<number, number>;
    conversionRate: number | null;
    aspects: { food: number | null; service: number | null; atmosphere: number | null };
  };
  /** Optional 7-day daily counts (Mon..Sun). When omitted the bar chart is hidden. */
  trend?: number[];
  /** Up to 3 representative quotes for the "Bu haftanın sözleri" section. */
  quotes?: Array<{ rating: number; name: string; platform?: string; text: string; warn?: boolean }>;
  /** Week-over-week deltas (string with %, e.g. "+18%"). Hidden when null. */
  deltas?: { totalDelta?: string | null; avgDelta?: string | null; responseDelta?: string | null };
  weekNumber?: number;
  dashboardUrl: string;
}

export function renderWeeklyReport(
  params: WeeklyReportParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const formatDate = (d: Date) => d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
  const periodStr = `${formatDate(params.period.from)}–${formatDate(params.period.to)}`;
  const weekNum = params.weekNumber ?? Math.ceil((params.period.to.getTime() - new Date(params.period.to.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  const subject = isTr
    ? `Bu hafta · ${params.stats.total} yorum, ${params.stats.avgRating} ortalama`
    : `This week · ${params.stats.total} reviews, ${params.stats.avgRating} avg`;
  const preheader = isTr
    ? `${params.restaurantName} · ${periodStr} haftalık özet`
    : `${params.restaurantName} · ${periodStr} weekly digest`;

  const positiveCount = params.stats.highRatings;
  const totalDeltaText = params.deltas?.totalDelta ?? (positiveCount > params.stats.total / 2 ? '+' : '');

  const copy = isTr ? {
    eyebrow: `Hafta ${weekNum} · Pazartesi raporu`,
    titleA: positiveCount > 0 ? 'Sessiz başlayan hafta,' : 'Hafta nasıl geçti?',
    titleAccent: totalDeltaText && totalDeltaText !== '' ? `${totalDeltaText}` : `${params.stats.total}`,
    titleEnd: 'yorumla bitti.',
    statTotal: 'Yeni yorum',
    statAvg: 'Ortalama puan',
    statResp: 'Yanıt süresi',
    chartEyebrow: 'Günlük dağılım',
    chartTitle: 'Cumartesi günü zirve yaptın.',
    quotesEyebrow: 'Bu haftanın sözleri',
    aspectFood: 'Yemek',
    aspectService: 'Servis',
    aspectAtm: 'Atmosfer',
    cta: 'Panele git →',
    detailLabel: 'Detaylı analiz seni bekliyor.',
    detailSub: 'Heatmap, sentiment ve aspect kırılımı panelde.',
  } : {
    eyebrow: `Week ${weekNum} · Monday report`,
    titleA: positiveCount > 0 ? 'A quiet week,' : 'How was the week?',
    titleAccent: totalDeltaText && totalDeltaText !== '' ? `${totalDeltaText}` : `${params.stats.total}`,
    titleEnd: 'reviews to close.',
    statTotal: 'New reviews',
    statAvg: 'Average rating',
    statResp: 'Response time',
    chartEyebrow: 'Daily distribution',
    chartTitle: 'Saturday hit the peak.',
    quotesEyebrow: 'This week\'s voices',
    aspectFood: 'Food',
    aspectService: 'Service',
    aspectAtm: 'Atmosphere',
    cta: 'See full details →',
    detailLabel: 'Deep-dive analytics inside.',
    detailSub: 'Heatmap, sentiment and aspect breakdown in the panel.',
  };

  // Hero stat grid — total + avg are real metrics, always shown. The third
  // "response time" cell from the JSX prototype rendered '1.4s' as a static
  // placeholder because backend doesn't track response latency yet. To avoid
  // a meaningless number every week, the cell is hidden and the grid drops
  // to 2 columns until a `responseDelta` value is actually populated by the
  // caller. When a real metric is available, push a third entry into `stats`.
  const stats: Array<{ k: string; v: string; delta?: string | null }> = [
    { k: copy.statTotal, v: String(params.stats.total), delta: params.deltas?.totalDelta },
    { k: copy.statAvg, v: params.stats.avgRating.toFixed(1), delta: params.deltas?.avgDelta },
  ];
  const heroStatCells = stats.map((s, i) => `
    <td class="stack-col" valign="top" style="width:${(100 / stats.length).toFixed(2)}%;padding:0 20px;${i === 0 ? 'padding-left:0;' : ''}${i < stats.length - 1 ? `border-right:1px solid ${PULSE.n800};` : 'padding-right:0;'}">
      <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n400};text-transform:uppercase;">${s.k}</div>
      <div style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;color:${PULSE.pure};line-height:1;margin-top:6px;">${s.v}</div>
      ${s.delta ? `<div style="margin-top:6px;font-size:12px;color:${PULSE.lime};font-weight:500;">${s.delta} ↑</div>` : ''}
    </td>
  `).join('');

  // Distribution table
  const distRows = [5, 4, 3, 2, 1].map((star) => {
    const count = params.stats.distribution[star] || 0;
    const pct = params.stats.total > 0 ? Math.round((count / params.stats.total) * 100) : 0;
    const barColor = star >= 4 ? PULSE.success : star === 3 ? PULSE.warning : PULSE.danger;
    return `
      <tr>
        <td style="width:34px;padding:6px 0;font-family:${FONTS.mono};font-size:12px;color:${PULSE.graphite};font-weight:600;">${star}★</td>
        <td style="padding:6px 0;">
          <div style="background:${PULSE.n200};border-radius:100px;height:8px;overflow:hidden;">
            <div style="background:${barColor};height:8px;width:${Math.max(pct, 0)}%;border-radius:100px;"></div>
          </div>
        </td>
        <td style="width:60px;padding:6px 0 6px 12px;text-align:right;font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};">${pct}% · ${count}</td>
      </tr>
    `;
  }).join('');

  // 7-day bar chart (jsx:43-62)
  const trendBlock = params.trend && params.trend.length === 7 ? `
    <tr>
      <td class="bz-pad" style="padding:36px 40px 8px;">
        ${renderEyebrow(copy.chartEyebrow)}
        ${spacer(12)}
        ${renderH2(copy.chartTitle)}
        ${spacer(20)}
        ${renderBarChart({
          values: params.trend,
          labels: isTr ? ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        })}
      </td>
    </tr>` : '';

  // Quotes (jsx:66-100)
  const quotesBlock = params.quotes && params.quotes.length > 0 ? `
    <tr>
      <td class="bz-pad" style="padding:36px 40px 8px;">
        ${renderEyebrow(copy.quotesEyebrow)}
        ${spacer(12)}
        ${params.quotes.slice(0, 3).map((q) => renderQuoteCard({
          stars: q.rating,
          name: q.name,
          platform: q.platform,
          text: q.text,
          warn: q.warn,
        })).join('')}
      </td>
    </tr>` : '';

  // Aspect averages
  const aspectsItems: Array<[string, number | null]> = [
    [copy.aspectFood, params.stats.aspects.food],
    [copy.aspectService, params.stats.aspects.service],
    [copy.aspectAtm, params.stats.aspects.atmosphere],
  ];
  const aspectsBlock = aspectsItems.every(([, v]) => v === null) ? '' : `
    <tr>
      <td class="bz-pad" style="padding:0 40px 24px;">
        ${renderEyebrow(isTr ? 'Boyut ortalamaları' : 'Aspect averages')}
        ${spacer(10)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
          <tr>
            ${aspectsItems.map(([label, val], i) => `
              <td class="stack-col" valign="top" style="width:33.33%;padding:14px 16px;${i < 2 ? `border-right:1px solid ${PULSE.n200};` : ''}background:${PULSE.n50};${i === 0 ? 'border-radius:14px 0 0 14px;' : ''}${i === 2 ? 'border-radius:0 14px 14px 0;' : ''}">
                <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;">${label}</div>
                <div style="font-family:${FONTS.heading};font-size:26px;font-weight:500;color:${PULSE.graphite};margin-top:4px;letter-spacing:-0.02em;">${val !== null ? val.toFixed(1) : '—'}</div>
              </td>
            `).join('')}
          </tr>
        </table>
      </td>
    </tr>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.graphite};padding:40px 40px 36px;color:${PULSE.pure};">
          ${renderEyebrow(copy.eyebrow, PULSE.n400)}
          ${spacer(14)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:42px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.pure};margin:0;">
            ${copy.titleA}<br/>
            <span style="color:${PULSE.lime};">${copy.titleAccent}</span> ${copy.titleEnd}
          </h1>
          ${spacer(28)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row" style="border-top:1px solid ${PULSE.n800};padding-top:20px;">
            <tr>${heroStatCells}</tr>
          </table>
        </td>
      </tr>
      ${trendBlock}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(isTr ? 'Puan dağılımı' : 'Rating distribution')}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${distRows}</table>
        </td>
      </tr>
      ${aspectsBlock}
      ${quotesBlock}
      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row" style="background:${PULSE.limeSoft};border-radius:14px;">
            <tr>
              <td class="stack-col" valign="middle" style="padding:24px;">
                ${renderH2(copy.detailLabel)}
                ${spacer(6)}
                ${renderP(copy.detailSub, { size: 13, color: PULSE.n700 })}
              </td>
              <td class="stack-col" valign="middle" align="right" style="padding:24px;">
                ${renderButton({ href: params.dashboardUrl, label: copy.cta, size: 'lg' })}
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
    footer: { locale, unsubText: isTr ? 'Haftalık raporu kapatmak için' : 'To stop the weekly report' },
  });
  const text = `${copy.titleA} ${copy.titleAccent} ${copy.titleEnd}\n\n${copy.statTotal}: ${params.stats.total}\n${copy.statAvg}: ${params.stats.avgRating}\n\n${copy.cta} ${params.dashboardUrl}`;
  return { subject, html, text };
}
