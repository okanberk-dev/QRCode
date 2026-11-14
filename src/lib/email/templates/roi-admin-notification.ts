// Sales notification — fires to NOTIFICATION_EMAIL when someone submits the
// ROI calculator form. Pulse mail (CLAUDE.md §21): dark alert bar + lead
// header + estimated time saved + KPI tiles + summary card + the values the
// visitor entered + 3 quick actions (Reply / Call / Panel).
//
// The figures are recomputed on the server from the visitor's inputs
// (src/lib/roi/roi-model.ts) — the same numbers the visitor received.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import {
  renderEyebrow,
  renderAvatarCircle,
  renderStatusPill,
  spacer,
} from '../components';
import { loadMailCopy } from '../copy-loader';
import {
  ROI_LIME_LINE_ON_SOFT,
  ROI_ON_DARK_55,
  ROI_ON_DARK_65,
  ROI_ON_DARK_75,
  ROI_ON_DARK_90,
  ROI_ON_DARK_DIVIDER,
  renderRoiBigNumber,
  renderRoiKpiGrid,
  renderRoiSteps,
  roiSectorLabel,
} from './roi-mail-parts';
import { deepSubstitute } from '../placeholders';
import {
  computeRoi,
  formatHours,
  formatUsd,
  normalizeRoiInputs,
  type RoiInputs,
  type RoiResult,
} from '@/lib/roi/roi-model';
import { resolveDisplayTimeZone } from '@/lib/timezone';

export interface RoiAdminNotificationParams {
  // Lead
  email: string;
  restaurantName: string;
  phone?: string | null;
  sector: string;
  /** Plan name chosen in the calculator; null = no plan. */
  planName?: string | null;
  /** Calculator inputs (normalised). Missing → calculator defaults. */
  inputs?: RoiInputs;
  /** Estimate computed from `inputs`. Missing → computed here. */
  estimate?: RoiResult;
  // Summary (AI or template)
  aiSummary: string;
  aiHighlight: string;
  aiNextSteps: string[];
  aiSource: 'ai' | 'template';
  // Optional admin panel deep link
  panelUrl?: string;
  ip?: string | null;

  // ── Legacy projection model (pre-2026-11). Accepted so older callers
  // still type-check; NONE of these values is rendered.
  monthlyCustomers?: number;
  avgTicket?: number;
  currentGoogle?: number;
  lowRatingsPerMonth?: number;
  platforms?: string[];
  plan?: string;
  planPrice?: number;
  currency?: string;
  scanned?: number;
  reviewers?: number;
  filteredLowReviews?: number;
  projectedGoogle?: number;
  newCustomers?: number;
  monthlyUplift?: number;
  yearlyUplift?: number;
  netGain?: number;
  roiMultiple?: number;
  paybackMonths?: number | null;
  aiHoursSaved?: number;
}

export async function renderRoiAdminNotification(
  params: RoiAdminNotificationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const lang: 'tr' | 'en' = isTr ? 'tr' : 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const pct = (n: number) => (isTr ? `%${Math.round(n)}` : `${Math.round(n)}%`);
  const hours = (n: number) => formatHours(n, lang);

  const inputs = params.inputs ?? normalizeRoiInputs({}, lang);
  const est = params.estimate ?? computeRoi(inputs);
  const hasPlan = est.planMonthlyUsd !== null && est.monthlyDifferenceUsd !== null;
  const planName = (params.planName || '').trim();
  const planLabel = planName || (isTr ? 'Plan seçilmedi' : 'No plan selected');

  const businessSafe = escapeHtml(params.restaurantName);
  const emailSafe = escapeHtml(params.email);
  const phoneSafe = params.phone ? escapeHtml(params.phone) : null;
  const sectorLabel = roiSectorLabel(params.sector, isTr);
  const initial = (params.restaurantName || params.email || '?').charAt(0).toUpperCase();
  // Business-local time, not the serverless process TZ (CLAUDE.md §46).
  const timestamp = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolveDisplayTimeZone(),
  });

  // DB-driven copy override (CLAUDE.md §21.26). Keys are unchanged so the
  // admin editor keeps working; `netGainEyebrow` now labels the time-saved
  // card and `scenarioH2` the values table.
  const inlineDefault = isTr
    ? {
        subjectTemplate: '[Lead] ${restaurantName} · ROI hesabı',
        preheaderPrefix: '${restaurantName} ROI hesaplayıcıyı kullandı.',
        alertEyebrow: 'YENİ ROI TALEBİ',
        statusPill: '1 iş günü içinde yanıtla',
        netGainEyebrow: 'TAHMİNİ ZAMAN TASARRUFU',
        scenarioH2: 'Girdiği değerler',
        quickEyebrow: 'HIZLI AKSİYON',
        replyLabel: 'Yanıt yaz',
        replySub: 'E-posta gönder',
        callLabel: 'Telefonla ara',
        callSubYes: 'Numarayı çevir',
        callSubNo: 'Numara yok',
        panelLabel: 'Müşteri paneli',
        panelSub: 'Tüm talepler',
        footerDisclosure:
          'ROI hesaplayıcı formu gönderildiğinde otomatik gelir. Rakamlar, ziyaretçinin girdiği değerlerden sunucuda hesaplanan tahminlerdir; aynı özet ziyaretçinin raporunda da yer alır.',
      }
    : {
        subjectTemplate: '[Lead] ${restaurantName} · ROI estimate',
        preheaderPrefix: '${restaurantName} used the ROI calculator.',
        alertEyebrow: 'NEW ROI REQUEST',
        statusPill: 'Reply within 1 business day',
        netGainEyebrow: 'ESTIMATED TIME SAVED',
        scenarioH2: 'Values entered',
        quickEyebrow: 'QUICK ACTION',
        replyLabel: 'Reply',
        replySub: 'Send email',
        callLabel: 'Call',
        callSubYes: 'Dial number',
        callSubNo: 'No number',
        panelLabel: 'Customer panel',
        panelSub: 'All requests',
        footerDisclosure:
          'Sent automatically when someone submits the ROI calculator form. The figures are estimates computed on the server from the visitor’s values; the same summary is in their report.',
      };

  const merged = await loadMailCopy('roi-admin-notification', locale, inlineDefault);
  // `netGain` / `roiMultiple` stay available for admin-edited copy written for
  // the old model (see roi-customer-report.ts).
  const vars = {
    restaurantName: params.restaurantName,
    netGain:
      est.yearlyDifferenceUsd !== null
        ? formatUsd(est.yearlyDifferenceUsd, { signed: true })
        : formatUsd(est.timeValueUsd * 12),
    roiMultiple:
      est.planMonthlyUsd && est.planMonthlyUsd > 0 ? (est.timeValueUsd / est.planMonthlyUsd).toFixed(1) : '—',
    sectorLabel,
    planLabel,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const subject = copyText.subjectTemplate;

  const insightSourceLabel = isTr
    ? params.aiSource === 'ai'
      ? 'YAPAY ZEKÂ ÖZETİ'
      : 'OTOMATİK ÖZET'
    : params.aiSource === 'ai'
      ? 'AI SUMMARY'
      : 'AUTO SUMMARY';

  const previewSummary = params.aiSummary.slice(0, 110).replace(/\s+/g, ' ').trim();
  const preheader = `${copyText.preheaderPrefix} ${previewSummary}…`;

  const hoursLine = isTr ? `${hours(est.hoursSaved)} saat / ay` : `${hours(est.hoursSaved)} h / month`;
  const valueParts = [
    isTr
      ? `Tahmini değeri ${formatUsd(est.timeValueUsd)} / ay`
      : `Estimated value ${formatUsd(est.timeValueUsd)} / month`,
    hasPlan ? `${isTr ? 'Plan' : 'Plan'} ${formatUsd(est.planMonthlyUsd!)} / ${isTr ? 'ay' : 'month'}` : null,
    hasPlan
      ? `${isTr ? 'Fark' : 'Difference'} ${formatUsd(est.monthlyDifferenceUsd!, { signed: true })} / ${isTr ? 'ay' : 'month'}`
      : null,
  ].filter((part): part is string => part !== null);
  const valueLine = valueParts.join(' · ');

  // ─── HEAD: dark alert bar (timestamp + status pill) ────────────────────
  // Inner row stacks on phones (pill under the timestamp).
  const alertBar = `
    <div style="background:${PULSE.graphite};border-radius:14px;padding:16px 18px;">
      <table role="presentation" class="stack-row" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="stack-col" valign="middle">
            ${renderEyebrow(copy.alertEyebrow, PULSE.lime)}
            <div style="margin-top:4px;font-family:${FONTS.label};font-size:12px;line-height:1.5;color:${ROI_ON_DARK_65};">${escapeHtml(timestamp)}</div>
          </td>
          <td class="stack-col" valign="middle" align="right" style="text-align:right;">
            ${renderStatusPill({
              text: copy.statusPill,
              dotColor: PULSE.lime,
              textColor: PULSE.pure,
              bgColor: '#262626',
            })}
          </td>
        </tr>
      </table>
    </div>
  `;

  // ─── HERO: business + email + time saved ───────────────────────────────
  const hero = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="top" width="60" style="vertical-align:top;width:60px;padding-right:12px;">
          ${renderAvatarCircle({ initials: initial, size: 48, bg: PULSE.graphite, fg: PULSE.lime })}
        </td>
        <td valign="top" style="vertical-align:top;">
          ${renderEyebrow(escapeHtml(`${sectorLabel} · ${planLabel}`), PULSE.n500)}
          <h1 style="margin:6px 0 0;font-family:${FONTS.heading};font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${businessSafe}</h1>
          <a href="mailto:${encodeURI(params.email)}" style="display:block;padding:9px 0;font-family:${FONTS.body};font-size:12.5px;line-height:1.55;color:${PULSE.graphite};text-decoration:underline;">${emailSafe}</a>
          ${phoneSafe ? `<div class="bz-break" style="font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n600};">${phoneSafe}</div>` : ''}
        </td>
      </tr>
    </table>
    ${spacer(20)}
    <div class="bz-roi-card" style="background:${PULSE.limeSoft};border:1px solid ${ROI_LIME_LINE_ON_SOFT};border-radius:14px;padding:20px 22px;">
      ${renderEyebrow(copy.netGainEyebrow, PULSE.graphite)}
      ${renderRoiBigNumber(hoursLine, { color: PULSE.graphite, size: 36, mt: 8 })}
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n800};">
        ${escapeHtml(valueLine)}
      </div>
    </div>
  `;

  // ─── KPI tiles (2×2, equal heights) ────────────────────────────────────
  const kpiRow = renderRoiKpiGrid([
    { value: fmt(est.ratingsPerMonth), label: isTr ? 'Tahmini puan / ay' : 'Est. ratings / mo' },
    { value: fmt(est.repliesPerMonth), label: isTr ? 'Yanıt / ay' : 'Replies / mo' },
    { value: `${hours(est.hoursManual)} ${isTr ? 'sa' : 'h'}`, label: isTr ? 'Elle yanıt / ay' : 'By hand / mo' },
    {
      value: `${hours(est.hoursWithDrafts)} ${isTr ? 'sa' : 'h'}`,
      label: isTr ? 'Taslakla / ay' : 'With drafts / mo',
      accent: true,
    },
  ]);

  // ─── Summary card (graphite bg + lime accent) ──────────────────────────
  // The suggestions section renders only when there are suggestions.
  const prioritySection =
    params.aiNextSteps.length > 0
      ? `
      <div style="margin-top:20px;padding-top:18px;border-top:1px solid ${ROI_ON_DARK_DIVIDER};">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${ROI_ON_DARK_55};margin-bottom:14px;">${isTr ? 'ÖNERİLER' : 'SUGGESTIONS'}</div>
        ${renderRoiSteps(params.aiNextSteps, { dark: true })}
      </div>`
      : '';
  const insightCard = `
    <div class="bz-roi-card" style="background:${PULSE.graphite};border-radius:16px;padding:24px;color:${PULSE.pure};">
      ${renderEyebrow(insightSourceLabel, PULSE.lime)}
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:14px;line-height:1.7;color:${ROI_ON_DARK_90};">${escapeHtml(params.aiSummary)}</div>
      <div style="margin-top:16px;padding:14px 16px;background:#212612;border-left:3px solid ${PULSE.lime};border-radius:8px;">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${PULSE.lime};margin-bottom:6px;">${isTr ? 'ÖNE ÇIKAN NOKTA' : 'KEY POINT'}</div>
        <div style="font-family:${FONTS.body};font-size:13.5px;line-height:1.6;color:${PULSE.pure};">${escapeHtml(params.aiHighlight)}</div>
      </div>
      ${prioritySection}
    </div>
  `;

  // ─── Values the visitor entered ────────────────────────────────────────
  // Label left (sentence case), value right. table-layout:fixed + 54/46 split
  // so a long value can never squeeze the label column to nothing at 320px.
  const scenarioRow = (label: string, value: string, opts: { accent?: boolean; last?: boolean } = {}) => `
    <tr>
      <td valign="top" width="54%" style="width:54%;padding:12px 4px 12px 12px;${opts.last ? '' : `border-bottom:1px solid ${PULSE.n200};`}${opts.accent ? `background:${PULSE.limeSoft};` : ''}font-family:${FONTS.body};font-size:12.5px;line-height:1.5;color:${opts.accent ? PULSE.graphite : PULSE.n500};">${escapeHtml(label)}</td>
      <td valign="top" align="right" width="46%" style="width:46%;padding:12px 12px 12px 4px;text-align:right;${opts.last ? '' : `border-bottom:1px solid ${PULSE.n200};`}${opts.accent ? `background:${PULSE.limeSoft};` : ''}font-family:${FONTS.body};font-size:13.5px;line-height:1.5;color:${PULSE.graphite};font-weight:${opts.accent ? 600 : 500};">${escapeHtml(value)}</td>
    </tr>
  `;
  const minutes = (n: number) => (isTr ? `${n} dk` : `${n} min`);
  const planValue = hasPlan
    ? `${planName ? `${planName} · ` : ''}${formatUsd(est.planMonthlyUsd!)} / ${isTr ? 'ay' : 'mo'}`
    : isTr
      ? 'Seçilmedi'
      : 'Not selected';
  const rows: { label: string; value: string }[] = [
    { label: isTr ? 'İşletme türü' : 'Type of business', value: sectorLabel },
    { label: isTr ? 'Aylık müşteri' : 'Customers / month', value: fmt(inputs.monthlyCustomers) },
    { label: isTr ? 'Puan veren müşteri oranı' : 'Share who rate', value: pct(inputs.ratingRatePct) },
    { label: isTr ? 'Yanıt yazılan oran' : 'Share replied to', value: pct(inputs.replySharePct) },
    { label: isTr ? 'Elle yanıt süresi' : 'Reply time by hand', value: minutes(inputs.minutesManual) },
    { label: isTr ? 'Taslakla yanıt süresi' : 'Reply time with draft', value: minutes(inputs.minutesWithDraft) },
    { label: isTr ? 'Saatlik maliyet' : 'Hourly cost', value: formatUsd(inputs.hourlyCostUsd) },
    { label: isTr ? 'Plan' : 'Plan', value: planValue },
  ];
  const lastRow = hasPlan
    ? {
        label: isTr ? 'Tahmini aylık fark' : 'Est. monthly difference',
        value: formatUsd(est.monthlyDifferenceUsd!, { signed: true }),
      }
    : {
        label: isTr ? 'Tasarrufun tahmini değeri' : 'Est. value of time saved',
        value: `${formatUsd(est.timeValueUsd)} / ${isTr ? 'ay' : 'mo'}`,
      };
  const scenarioTable = `
    <h2 style="margin:0 0 12px;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${copy.scenarioH2}</h2>
    <div style="border:1px solid ${PULSE.n200};border-radius:12px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;">
        ${rows.map((row) => scenarioRow(row.label, row.value)).join('')}
        ${scenarioRow(lastRow.label, lastRow.value, { accent: true, last: true })}
      </table>
    </div>
  `;

  // ─── Quick action 3-grid (Reply / Call / Panel) ────────────────────────
  // tel: / mailto: attributes take the RAW values (HTML-escaping would turn
  // & into &amp; and break the URL); the phone is ASCII-filtered.
  const rawPhone = params.phone ? params.phone.replace(/[^+0-9]/g, '') : '';
  const callHref = rawPhone ? `tel:${rawPhone}` : '';
  // §38.197 — env-aware admin panel fallback.
  const adminAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const panelHref = params.panelUrl || `${adminAppUrl}/admin/customers`;
  const replyHref = `mailto:${encodeURI(params.email)}?subject=${encodeURIComponent(
    isTr ? `Buaze ROI hesabınız hakkında — ${params.restaurantName}` : `About your Buaze ROI estimate — ${params.restaurantName}`,
  )}`;

  // No phone → a muted, non-clickable tile.
  const quickAction = (label: string, sub: string, href: string, tone: 'dark' | 'light' | 'muted') => {
    const bg = tone === 'dark' ? PULSE.graphite : tone === 'muted' ? PULSE.n100 : PULSE.n50;
    const border = tone === 'dark' ? PULSE.graphite : PULSE.n200;
    const titleColor = tone === 'dark' ? PULSE.lime : tone === 'muted' ? PULSE.n400 : PULSE.graphite;
    const subColor = tone === 'dark' ? ROI_ON_DARK_75 : tone === 'muted' ? PULSE.n400 : PULSE.n500;
    const inner = `<div style="font-family:${FONTS.heading};font-size:14px;line-height:1.3;font-weight:600;color:${titleColor};">${escapeHtml(label)}</div>
        <div style="margin-top:4px;font-family:${FONTS.body};font-size:12px;line-height:1.45;color:${subColor};">${escapeHtml(sub)}</div>`;
    const boxStyle = `display:block;background:${bg};border:1px solid ${border};border-radius:12px;padding:15px 16px;text-decoration:none;`;
    return `
    <td class="cell stack-col" valign="top" style="width:33.33%;padding:5px;">
      ${href ? `<a href="${href}" style="${boxStyle}">${inner}</a>` : `<div style="${boxStyle}">${inner}</div>`}
    </td>
  `;
  };

  const quickActions = `
    ${renderEyebrow(copy.quickEyebrow, PULSE.n500)}
    ${spacer(8)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="stack-row">
      <tr>
        ${quickAction(copyText.replyLabel, copyText.replySub, replyHref, 'dark')}
        ${quickAction(copyText.callLabel, phoneSafe ? copyText.callSubYes : copyText.callSubNo, callHref, phoneSafe ? 'light' : 'muted')}
        ${quickAction(copyText.panelLabel, copyText.panelSub, panelHref, 'light')}
      </tr>
    </table>
  `;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 40px;">
          ${alertBar}
          ${spacer(22)}
          ${hero}
          ${spacer(20)}
          ${kpiRow}
          ${spacer(22)}
          ${insightCard}
          ${spacer(28)}
          ${scenarioTable}
          ${spacer(24)}
          ${quickActions}
          ${spacer(18)}
          <p style="margin:0;padding-top:18px;border-top:1px solid ${PULSE.n200};font-family:${FONTS.body};font-size:11px;color:${PULSE.n500};line-height:1.65;">${copy.footerDisclosure}</p>
        </td>
      </tr>
    </table>
  `;

  // ─── Plain text ────────────────────────────────────────────────────────
  const text = [
    copyText.alertEyebrow,
    timestamp,
    '',
    `${params.restaurantName} (${sectorLabel} · ${planLabel})`,
    `${params.email}${params.phone ? ` · ${params.phone}` : ''}`,
    '',
    `${copyText.netGainEyebrow}: ${hoursLine}`,
    valueLine,
    '',
    `— ${insightSourceLabel} —`,
    params.aiSummary,
    '',
    `${isTr ? 'ÖNE ÇIKAN NOKTA' : 'KEY POINT'}: ${params.aiHighlight}`,
    '',
    ...(params.aiNextSteps.length > 0
      ? [`${isTr ? 'ÖNERİLER' : 'SUGGESTIONS'}:`, ...params.aiNextSteps.map((s, i) => `${i + 1}. ${s}`), '']
      : []),
    `— ${copyText.scenarioH2} —`,
    ...rows.map((row) => `${row.label}: ${row.value}`),
    `${lastRow.label}: ${lastRow.value}`,
    '',
    `${copyText.replyLabel}: ${replyHref}`,
    `${copyText.panelLabel}: ${panelHref}`,
    '',
    copyText.footerDisclosure,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: 'BUAZE LEAD INBOX',
    footer: { locale: lang },
  });

  return { subject, html, text };
}
