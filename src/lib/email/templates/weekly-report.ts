import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { renderEyebrow, renderH2, renderP, renderButton, renderQuoteCard, spacer } from '../components';
import { escapeHtml } from '../escape';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

/** 1.2K / 3.4M — keeps 7-digit values inside a 37px chart column on 320px phones. */
function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

/**
 * 7-day column chart. Table cells + px-height divs only (no flex/svg). Labels
 * stay >=10px; values are compacted so every column fits at 320px.
 */
function renderWeekChart(values: number[], labels: string[]): string {
  const height = 120;
  const max = Math.max(...values, 1);
  const peak = values.indexOf(Math.max(...values));
  const cells = values.map((v, i) => {
    const isPeak = i === peak && max > 0;
    const barH = Math.max(6, Math.round((v / max) * height));
    return `<td valign="bottom" align="center" style="padding:0 3px;width:14.28%;">
      <div style="font-family:${FONTS.label};font-size:11px;line-height:1.2;color:${isPeak ? PULSE.graphite : PULSE.n500};font-weight:${isPeak ? 700 : 500};margin-bottom:6px;white-space:nowrap;">${compactNumber(v)}</div>
      <div style="background:${isPeak ? PULSE.lime : PULSE.n200};height:${barH}px;border-radius:6px;line-height:1px;font-size:1px;">&nbsp;</div>
      <div style="font-family:${FONTS.label};font-size:10px;line-height:1.2;color:${isPeak ? PULSE.graphite : PULSE.n500};letter-spacing:0.04em;font-weight:${isPeak ? 600 : 500};margin-top:8px;">${labels[i] ?? ''}</div>
    </td>`;
  }).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${cells}</tr></table>`;
}

/** One "label · bar · value" row (rating distribution, segments, aspects share it). */
function renderBarRow(opts: { label: string; labelWidth: number; value: string; pct: number; color: string }): string {
  const pct = Math.min(100, Math.max(0, opts.pct));
  return `
      <tr>
        <td valign="middle" style="width:${opts.labelWidth}px;padding:7px 10px 7px 0;font-family:${FONTS.label};font-size:13px;line-height:1.3;color:${PULSE.graphite};font-weight:600;white-space:nowrap;">${opts.label}</td>
        <td valign="middle" style="padding:7px 0;">
          <div style="background:${PULSE.n200};border-radius:100px;height:8px;line-height:8px;font-size:1px;overflow:hidden;">
            <div style="background:${opts.color};height:8px;width:${pct}%;border-radius:100px;line-height:8px;font-size:1px;">&nbsp;</div>
          </div>
        </td>
        <td valign="middle" align="right" style="width:1%;padding:7px 0 7px 12px;font-family:${FONTS.label};font-size:13px;line-height:1.3;color:${PULSE.n600};font-weight:500;white-space:nowrap;">${opts.value}</td>
      </tr>`;
}

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
  /** Pulse AI çıkarımı — `extractWeeklyInsight()` çıktısı. summary veya
   *  recommendation dolu ise mailde "PULSE AI ÇIKARIMI" section'ı render
   *  edilir; ikisi de boşsa section gizlenir (template fail-safe). */
  aiInsight?: {
    summary: string;
    recommendation: string;
    source: 'openai' | 'fallback';
  };
  /** Phase 8c+ (CLAUDE.md §38.21 + §38.48) — bu hafta yorum bırakan müşterilerin
   *  segment dağılımı. weekly-digest-runner deriveCustomerFields ile
   *  hesaplar. Tüm değerler 0 ise template section gizler (sadece anonim
   *  yorumlar veya hiç müşteri olmayan durum).
   *  §38.48 — `churned` alanı eklendi (CLAUDE.md §38.47 5-segment parity). */
  segmentCounts?: {
    vip: number;
    loyal: number;
    new: number;
    risk: number;
    churned: number;
  };
}

export async function renderWeeklyReport(
  params: WeeklyReportParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const formatDate = (d: Date) => d.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
  const periodStr = `${formatDate(params.period.from)}–${formatDate(params.period.to)}`;
  const weekNum = params.weekNumber ?? Math.ceil((params.period.to.getTime() - new Date(params.period.to.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  const subject = isTr
    ? `Bu hafta · ${params.stats.total} yorum, ${params.stats.avgRating} ortalama`
    : `This week · ${params.stats.total} reviews, ${params.stats.avgRating} avg`;
  const preheader = isTr
    ? `${escapeHtml(params.restaurantName)} · ${periodStr} haftalık özet`
    : `${escapeHtml(params.restaurantName)} · ${periodStr} weekly digest`;

  const positiveCount = params.stats.highRatings;
  const totalDeltaText = params.deltas?.totalDelta ?? (positiveCount > params.stats.total / 2 ? '+' : '');

  const inlineDefault = isTr ? {
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
    aiEyebrow: 'Pulse AI çıkarımı',
    aiTitle: 'Bu haftanın özeti',
    aiRecommendationLabel: 'Önümüzdeki hafta için öneri',
    segmentEyebrow: 'Müşteri segmentleri',
    segmentTitle: 'Bu hafta kim yorum bıraktı?',
    segmentVip: 'VIP',
    segmentLoyal: 'Düzenli',
    segmentNew: 'Yeni',
    segmentRisk: 'Risk',
    segmentChurned: 'Kayıp',
    segmentHint: 'Sadık + memnuniyetsiz dağılımı tek bakışta.',
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
    aiEyebrow: 'Pulse AI inference',
    aiTitle: 'This week\'s synthesis',
    aiRecommendationLabel: 'Recommendation for next week',
    segmentEyebrow: 'Customer segments',
    segmentTitle: 'Who reviewed this week?',
    segmentVip: 'VIP',
    segmentLoyal: 'Loyal',
    segmentNew: 'New',
    segmentRisk: 'Risk',
    segmentChurned: 'Churned',
    segmentHint: 'Loyal + at-risk distribution at a glance.',
  };

  // DB-merged + placeholder substitution. `eyebrow` is locked in editor
  // (admin override would lose `${weekNumber}` literal); but other fields
  // like `chartTitle`, `cta`, `detailLabel` can use `${restaurantName}`.
  const merged = await loadMailCopy('weekly-report', locale, inlineDefault);
  const vars = {
    restaurantName: params.restaurantName,
    totalReviews: params.stats.total,
    avgRating: params.stats.avgRating.toFixed(1),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

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
  // Side-by-side on every width (no stack-col): two short numbers fit a 320px
  // phone, and a stacked hero wasted a full screen. Big values step down on
  // mobile through bz-roi-bignum-sm so 7-digit stress values still fit.
  const heroStatCells = stats.map((s, i) => `
    <td valign="top" style="width:50%;${i === 0 ? `padding:0 16px 0 0;border-right:1px solid ${PULSE.n800};` : 'padding:0 0 0 20px;'}">
      <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;font-weight:600;color:${PULSE.n400};text-transform:uppercase;">${s.k}</div>
      <div class="bz-roi-bignum-sm" style="font-family:${FONTS.heading};font-size:36px;font-weight:600;letter-spacing:-0.02em;color:${PULSE.pure};line-height:1.1;margin-top:8px;">${s.v}</div>
      ${s.delta ? (() => {
        const down = /^[-−–]/.test(s.delta.trim());
        return `<div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;line-height:1.3;color:${down ? '#F87171' : PULSE.lime};font-weight:600;">${escapeHtml(s.delta)} ${down ? '↓' : '↑'}</div>`;
      })() : ''}
    </td>
  `).join('');

  // Rating distribution
  const distRows = [5, 4, 3, 2, 1].map((star) => {
    const count = params.stats.distribution[star] || 0;
    const pct = params.stats.total > 0 ? Math.round((count / params.stats.total) * 100) : 0;
    const barColor = star >= 4 ? PULSE.success : star === 3 ? PULSE.warning : PULSE.danger;
    return renderBarRow({ label: `${star}★`, labelWidth: 30, value: `${pct}% · ${count}`, pct, color: barColor });
  }).join('');

  // 7-day column chart
  const trendBlock = params.trend && params.trend.length === 7 ? `
    <tr>
      <td class="bz-pad" style="padding:36px 40px 8px;">
        ${renderEyebrow(copy.chartEyebrow)}
        ${spacer(10)}
        ${renderH2(copy.chartTitle)}
        ${spacer(22)}
        ${renderWeekChart(params.trend, isTr ? ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])}
      </td>
    </tr>` : '';

  // Quotes
  const quotesBlock = params.quotes && params.quotes.length > 0 ? `
    <tr>
      <td class="bz-pad" style="padding:36px 40px 8px;">
        ${renderEyebrow(copy.quotesEyebrow)}
        ${spacer(8)}
        ${params.quotes.slice(0, 3).map((q) => renderQuoteCard({
          stars: q.rating,
          name: q.name,
          platform: q.platform,
          text: q.text,
          warn: q.warn,
        })).join('')}
      </td>
    </tr>` : '';

  // Pulse AI çıkarımı block — yalnız `aiInsight.summary` veya
  // `aiInsight.recommendation` doluysa render edilir. CLAUDE.md §11 Pulse
  // tokens (graphite + lime accent) + email-safe table layout.
  const aiInsight = params.aiInsight;
  const hasAi = !!(aiInsight && (aiInsight.summary || aiInsight.recommendation));
  const aiBlock = hasAi ? `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.graphite};border-radius:16px;">
          <tr>
            <td style="padding:24px 24px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="8" valign="middle" style="width:8px;font-size:1px;line-height:1px;"><div style="width:8px;height:8px;background:${PULSE.lime};border-radius:100px;font-size:1px;line-height:8px;">&nbsp;</div></td>
                  <td valign="middle" style="padding-left:10px;font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;font-weight:600;color:${PULSE.lime};text-transform:uppercase;">${copy.aiEyebrow}</td>
                </tr>
              </table>
              <div style="font-family:${FONTS.heading};font-size:22px;font-weight:600;letter-spacing:-0.015em;color:${PULSE.pure};line-height:1.25;margin-top:12px;">${copy.aiTitle}</div>
              ${aiInsight!.summary ? `
                <p style="font-family:${FONTS.body};font-size:14px;line-height:1.65;color:${PULSE.n200};margin:14px 0 0;">${escapeHtml(aiInsight!.summary)}</p>
              ` : ''}
              ${aiInsight!.recommendation ? `
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;border-top:1px solid ${PULSE.n800};">
                  <tr>
                    <td style="padding-top:16px;">
                      <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;font-weight:600;color:${PULSE.n400};text-transform:uppercase;">${copy.aiRecommendationLabel}</div>
                      <p style="font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${PULSE.lime};margin:8px 0 0;font-weight:500;">${escapeHtml(aiInsight!.recommendation)}</p>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  // Phase 8c+ (CLAUDE.md §38.21 + §38.48) — segment counts. Tüm değerler 0
  // ise section gizlenir (anonim feedback haftası veya hiç müşteri yoksa).
  // Bar rows (not a 5-cell strip): a 5-up strip cannot fit Poppins at 320px and
  // stacked into a tall empty box. Each row = pill + proportional bar + count.
  const segCounts = params.segmentCounts;
  const segTotal = segCounts
    ? segCounts.vip + segCounts.loyal + segCounts.new + segCounts.risk + segCounts.churned
    : 0;
  const segmentBlock = segCounts && segTotal > 0 ? (() => {
    const segItems: Array<{ label: string; count: number; bg: string; fg: string; bar: string }> = [
      { label: copy.segmentVip, count: segCounts.vip, bg: PULSE.graphite, fg: PULSE.pure, bar: PULSE.graphite },
      { label: copy.segmentLoyal, count: segCounts.loyal, bg: PULSE.limeSoft, fg: PULSE.graphite, bar: PULSE.limeDeep },
      { label: copy.segmentNew, count: segCounts.new, bg: '#DBEAFE', fg: '#1E40AF', bar: '#2563EB' },
      { label: copy.segmentRisk, count: segCounts.risk, bg: '#FEE2E2', fg: '#991B1B', bar: PULSE.danger },
      // §38.48 — Churned ghost paletti (CLAUDE.md §38.47 SEGMENT_COLOR_MAP):
      // Risk = aktif memnuniyetsizlik kırmızı, Churned = sessiz bırakma muted.
      { label: copy.segmentChurned, count: segCounts.churned, bg: '#F5F5F5', fg: '#737373', bar: PULSE.n400 },
    ];
    const maxSeg = Math.max(...segItems.map((x) => x.count), 1);
    const segRows = segItems.map((seg) => renderBarRow({
      label: `<span style="display:inline-block;background:${seg.bg};color:${seg.fg};font-family:${FONTS.body};font-size:11px;font-weight:600;line-height:1.4;border-radius:100px;padding:3px 10px;white-space:nowrap;">${seg.label}</span>`,
      labelWidth: 84,
      value: String(seg.count),
      pct: Math.round((seg.count / maxSeg) * 100),
      color: seg.bar,
    })).join('');
    return `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        ${renderEyebrow(copy.segmentEyebrow)}
        ${spacer(8)}
        <div style="font-family:${FONTS.heading};font-size:18px;font-weight:600;letter-spacing:-0.01em;line-height:1.3;color:${PULSE.graphite};">${copy.segmentTitle}</div>
        ${spacer(8)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${segRows}</table>
        <div style="font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n500};margin-top:8px;">${copy.segmentHint}</div>
      </td>
    </tr>`;
  })() : '';

  // Aspect averages (0–5 scale bars)
  const aspectsItems: Array<[string, number | null]> = [
    [copy.aspectFood, params.stats.aspects.food],
    [copy.aspectService, params.stats.aspects.service],
    [copy.aspectAtm, params.stats.aspects.atmosphere],
  ];
  const aspectsBlock = aspectsItems.every(([, v]) => v === null) ? '' : `
    <tr>
      <td class="bz-pad" style="padding:32px 40px 8px;">
        ${renderEyebrow(isTr ? 'Boyut ortalamaları' : 'Aspect averages')}
        ${spacer(8)}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${aspectsItems.map(([label, val]) => renderBarRow({
            label,
            labelWidth: 84,
            value: val !== null ? val.toFixed(1) : '—',
            pct: val !== null ? (val / 5) * 100 : 0,
            color: val !== null && val < 3 ? PULSE.danger : val !== null && val < 4 ? PULSE.warning : PULSE.success,
          })).join('')}
        </table>
      </td>
    </tr>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="background:${PULSE.graphite};padding:40px 40px 36px;color:${PULSE.pure};">
          ${renderEyebrow(copy.eyebrow, PULSE.n400)}
          ${spacer(14)}
          <h1 class="bz-h1-lg" style="font-family:${FONTS.heading};font-size:42px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${PULSE.pure};margin:0;">
            ${copy.titleA}<br/>
            <span style="color:${PULSE.lime};">${copy.titleAccent}</span> ${copy.titleEnd}
          </h1>
          ${spacer(28)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${PULSE.n800};">
            <tr><td style="padding-top:22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>${heroStatCells}</tr>
              </table>
            </td></tr>
          </table>
        </td>
      </tr>
      ${trendBlock}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 8px;">
          ${renderEyebrow(isTr ? 'Puan dağılımı' : 'Rating distribution')}
          ${spacer(8)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${distRows}</table>
        </td>
      </tr>
      ${aiBlock}
      ${segmentBlock}
      ${aspectsBlock}
      ${quotesBlock}
      <tr>
        <td class="bz-pad" style="padding:32px 40px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.limeSoft};border-radius:16px;">
            <tr>
              <td style="padding:24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
                  <tr>
                    <td class="stack-col" valign="middle" style="padding:0 16px 0 0;">
                      ${renderH2(copy.detailLabel)}
                      ${spacer(6)}
                      ${renderP(copy.detailSub, { size: 13, color: PULSE.n700 })}
                    </td>
                    <td class="stack-col" valign="middle" align="right" style="padding:0;width:1%;white-space:nowrap;">
                      ${renderButton({ href: params.dashboardUrl, label: copy.cta, size: 'lg' })}
                    </td>
                  </tr>
                </table>
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
  const text = `${copyText.titleA} ${copyText.titleAccent} ${copyText.titleEnd}\n\n${copyText.statTotal}: ${params.stats.total}\n${copyText.statAvg}: ${params.stats.avgRating}\n\n${copyText.cta} ${params.dashboardUrl}`;
  return { subject, html, text };
}
