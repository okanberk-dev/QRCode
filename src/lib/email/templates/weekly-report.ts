import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderP, renderButton, renderStatGrid, spacer } from '../components';

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
  trend?: number[];
  dashboardUrl: string;
}

export function renderWeeklyReport(params: WeeklyReportParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const formatDate = (d: Date) => d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
  const periodStr = `${formatDate(params.period.from)} – ${formatDate(params.period.to)}`;

  const subject = isTr
    ? `Bu hafta · ${params.stats.total} yorum, ${params.stats.avgRating} ortalama`
    : `This week · ${params.stats.total} reviews, ${params.stats.avgRating} avg`;
  const preheader = isTr
    ? `${params.restaurantName} · ${periodStr} haftalık özet`
    : `${params.restaurantName} · ${periodStr} weekly digest`;

  const copy = isTr ? {
    eyebrow: `Hafta · ${periodStr}`,
    title: 'Haftalık nabız.',
    sub: 'Ekibinin bu haftaki performansı ve dikkat etmen gereken noktalar.',
    statTotal: 'Yeni yorum',
    statAvg: 'Ortalama puan',
    statResp: 'Pozitif yorum',
    distLabel: 'Puan dağılımı',
    aspectsLabel: 'Boyut ortalamaları',
    aspectFood: 'Yemek',
    aspectService: 'Servis',
    aspectAtm: 'Atmosfer',
    cta: 'Panelde tüm detayı gör →',
    detailLabel: 'Detaylı analiz seni bekliyor.',
    detailSub: 'Heatmap, sentiment ve aspect kırılımı panelde.',
  } : {
    eyebrow: `Week · ${periodStr}`,
    title: 'Your weekly pulse.',
    sub: 'Your team\'s performance this week and what deserves attention.',
    statTotal: 'New reviews',
    statAvg: 'Average rating',
    statResp: 'Positive reviews',
    distLabel: 'Rating distribution',
    aspectsLabel: 'Aspect averages',
    aspectFood: 'Food',
    aspectService: 'Service',
    aspectAtm: 'Atmosphere',
    cta: 'See full details →',
    detailLabel: 'Deep-dive analytics inside.',
    detailSub: 'Heatmap, sentiment and aspect breakdown in the panel.',
  };

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

  const aspectsHtml = (() => {
    const items: Array<[string, number | null]> = [
      [copy.aspectFood, params.stats.aspects.food],
      [copy.aspectService, params.stats.aspects.service],
      [copy.aspectAtm, params.stats.aspects.atmosphere],
    ];
    if (items.every(([, v]) => v === null)) return '';
    return `
      <tr>
        <td class="bz-pad" style="padding:0 40px 24px;">
          ${renderEyebrow(copy.aspectsLabel)}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            <tr>
              ${items.map(([label, val], i) => `
                <td class="stack-col" valign="top" style="width:33.33%;padding:14px 16px;${i < 2 ? `border-right:1px solid ${PULSE.n200};` : ''}background:${PULSE.n50};${i === 0 ? 'border-radius:14px 0 0 14px;' : ''}${i === 2 ? 'border-radius:0 14px 14px 0;' : ''}">
                  <div style="font-family:${FONTS.mono};font-size:10px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;">${label}</div>
                  <div style="font-family:${FONTS.heading};font-size:26px;font-weight:500;color:${PULSE.graphite};margin-top:4px;letter-spacing:-0.02em;">${val !== null ? val.toFixed(1) : '—'}</div>
                </td>
              `).join('')}
            </tr>
          </table>
        </td>
      </tr>
    `;
  })();

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.graphite};padding:40px 40px 36px;color:${PULSE.pure};">
          ${renderEyebrow(copy.eyebrow, PULSE.n400)}
          ${spacer(14)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:40px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.pure};margin:0;">
            ${copy.title}
          </h1>
          ${spacer(10)}
          <div style="font-family:${FONTS.body};font-size:14px;color:${PULSE.n300};line-height:1.6;max-width:480px;">${copy.sub}</div>
          ${spacer(24)}
          <div style="border-top:1px solid ${PULSE.n800};padding-top:20px;">
            ${renderStatGrid([
              { label: copy.statTotal, value: String(params.stats.total) },
              { label: copy.statAvg, value: params.stats.avgRating.toFixed(1) },
              { label: copy.statResp, value: String(params.stats.highRatings) },
            ], { dark: true })}
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(copy.distLabel)}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${distRows}</table>
        </td>
      </tr>
      ${aspectsHtml}
      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          <div style="background:${PULSE.limeSoft};border-radius:14px;padding:22px 24px;">
            ${renderH2(copy.detailLabel)}
            ${spacer(6)}
            ${renderP(copy.detailSub, { size: 13, color: PULSE.n700 })}
            ${spacer(16)}
            ${renderButton({ href: params.dashboardUrl, label: copy.cta, size: 'lg' })}
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Haftalık' : 'Weekly', footer: { locale } });
  const text = `${copy.title}\n${copy.sub}\n\n${copy.statTotal}: ${params.stats.total}\n${copy.statAvg}: ${params.stats.avgRating}\n${copy.statResp}: ${params.stats.highRatings}\n\n${copy.cta} ${params.dashboardUrl}`;
  return { subject, html, text };
}
