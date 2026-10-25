// Admin sales notification — yeni ROI lead'i geldiğinde NOTIFICATION_EMAIL
// adresine fırlar. Pulse mail design (CLAUDE.md §21) — graphite hero +
// lead avatar/işletme + 4-stat KPI + AI insight kart + senaryo tablosu +
// 3 quick-action grid (Reply / Call / Panel).
//
// Eski düz HTML "Yeni ROI lead'i" mail (sendMail ile direkt gönderiliyordu)
// yerini alır. Operatör inbox'unda diğer Pulse alert'leriyle (low-rating,
// new-review, contact-admin) aynı görsel dili konuşur.

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
  roiPlatformList,
  roiSectorLabel,
} from './roi-mail-parts';
import { deepSubstitute } from '../placeholders';

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

export interface RoiAdminNotificationParams {
  // Lead
  email: string;
  restaurantName: string;
  phone?: string | null;
  // Inputs (raw projection)
  sector: string;
  monthlyCustomers: number;
  avgTicket: number;
  currentGoogle: number;
  lowRatingsPerMonth: number;
  platforms: string[];
  plan: string;
  planPrice: number;
  currency: string;
  // Outputs
  scanned: number;
  reviewers: number;
  filteredLowReviews: number;
  projectedGoogle: number;
  newCustomers: number;
  monthlyUplift: number;
  yearlyUplift: number;
  netGain: number;
  roiMultiple: number;
  paybackMonths: number | null;
  aiHoursSaved: number;
  // AI insight
  aiSummary: string;
  aiHighlight: string;
  aiNextSteps: string[];
  aiSource: 'ai' | 'template';
  // Optional admin panel deep link
  panelUrl?: string;
  ip?: string | null;
}

export async function renderRoiAdminNotification(
  params: RoiAdminNotificationParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const c = params.currency;

  const businessSafe = escapeHtml(params.restaurantName);
  const emailSafe = escapeHtml(params.email);
  const phoneSafe = params.phone ? escapeHtml(params.phone) : null;
  const sectorLabel = roiSectorLabel(params.sector, isTr);
  const planLabel = PLAN_LABEL[params.plan] ?? params.plan;
  const initial = (params.restaurantName || params.email || '?').charAt(0).toUpperCase();
  const timestamp = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const platformLabels = roiPlatformList(params.platforms);

  // DB-driven copy override (CLAUDE.md §21.26 Phase 2 pattern). Kritik
  // alarm chrome admin panelden edit edilebilir; geri kalan inline.
  const inlineDefault = isTr
    ? {
        subjectTemplate: '[Lead] ${restaurantName} · ${netGain}/yıl',
        preheaderPrefix: '${restaurantName} ROI hesabı yaptı: ${netGain}/yıl.',
        alertEyebrow: 'YENİ ROI LEAD\'İ',
        statusPill: '24 saat içinde dön',
        netGainEyebrow: 'YILLIK NET KAZANÇ',
        scenarioH2: 'Senaryosu',
        quickEyebrow: 'HIZLI AKSİYON',
        replyLabel: 'Yanıt yaz',
        replySub: 'E-posta gönder',
        callLabel: 'Telefonla ara',
        callSubYes: 'Numarayı çevir',
        callSubNo: 'Numara yok',
        panelLabel: 'Lead panel',
        panelSub: 'Tüm lead\'ler',
        footerDisclosure: 'Bu mail, kullanıcı ROI hesaplayıcı formunu doldurduğunda otomatik gönderilir. AI insight kullanıcı raporu mailinde + PDF kapağında da yer alır.',
      }
    : {
        subjectTemplate: '[Lead] ${restaurantName} · ${netGain}/yr',
        preheaderPrefix: '${restaurantName} ran an ROI estimate: ${netGain}/yr.',
        alertEyebrow: 'NEW ROI LEAD',
        statusPill: 'Reply within 24h',
        netGainEyebrow: 'ANNUAL NET GAIN',
        scenarioH2: 'Scenario',
        quickEyebrow: 'QUICK ACTION',
        replyLabel: 'Reply',
        replySub: 'Send email',
        callLabel: 'Call',
        callSubYes: 'Dial number',
        callSubNo: 'No number',
        panelLabel: 'Lead panel',
        panelSub: 'All leads',
        footerDisclosure: 'This message is sent automatically when a user submits the ROI calculator form. The same AI insight appears in the customer report mail + PDF cover.',
      };

  const merged = await loadMailCopy('roi-admin-notification', locale, inlineDefault);
  const netGainStr = c + fmt(Math.round(params.netGain));
  const vars = {
    restaurantName: params.restaurantName,
    netGain: netGainStr,
    roiMultiple: params.roiMultiple.toFixed(1),
    sectorLabel,
    planLabel,
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const subject = copyText.subjectTemplate;

  const summarySafe = escapeHtml(params.aiSummary);
  const highlightSafe = escapeHtml(params.aiHighlight);

  const insightSourceLabel = isTr
    ? params.aiSource === 'ai'
      ? 'AI ANALİZİ'
      : 'OTOMATIK ÖZET'
    : params.aiSource === 'ai'
      ? 'AI ANALYSIS'
      : 'AUTO SUMMARY';

  const previewSummary = params.aiSummary
    .slice(0, 110)
    .replace(/\s+/g, ' ')
    .trim();
  const preheader = `${copyText.preheaderPrefix} ${previewSummary}…`;

  // ─── HEAD: dark alert bar (timestamp + status pill) ────────────────────
  // Inner row stacks on phones (pill under the timestamp) — side by side the
  // eyebrow wrapped to two lines at 320px.
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

  // ─── HERO: business + email + ROI big number ───────────────────────────
  // Email / phone sit on their own lines (the old inline "· phone" dangled on
  // a third line on phones).
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
      ${renderRoiBigNumber(`${c}${fmt(Math.max(0, Math.round(params.netGain)))}`, { color: PULSE.graphite, size: 36, mt: 8 })}
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n800};">
        12 ${isTr ? 'ayda' : 'mo'} ${params.roiMultiple.toFixed(1)}× ROI${params.paybackMonths ? ` · ${isTr ? 'amorti' : 'payback'} ~${params.paybackMonths} ${isTr ? 'ay' : 'mo'}` : ''} · ${c}${fmt(Math.round(params.monthlyUplift))}/${isTr ? 'ay' : 'mo'} ${isTr ? 'ek gelir' : 'uplift'}
      </div>
    </div>
  `;

  // ─── KPI tiles (2×2, equal heights) ────────────────────────────────────
  const kpiRow = renderRoiKpiGrid([
    { value: `+${fmt(params.reviewers)}`, label: isTr ? 'Yorum / ay' : 'Reviews / mo' },
    { value: fmt(params.filteredLowReviews), label: isTr ? 'Filtrelenen' : 'Filtered', accent: true },
    { value: params.projectedGoogle.toFixed(1), label: isTr ? 'Yeni\u00A0★' : 'New\u00A0★' },
    { value: `${params.aiHoursSaved.toFixed(1)} ${isTr ? 'sa' : 'h'}`, label: isTr ? 'AI tasarruf' : 'AI saved' },
  ]);

  // ─── AI INSIGHT card (graphite bg + lime accent) ───────────────────────
  // Priority actions section yalnız aiNextSteps doluyken render edilir;
  // boş array'de orphan başlık görünmez.
  const prioritySection =
    params.aiNextSteps.length > 0
      ? `
      <div style="margin-top:20px;padding-top:18px;border-top:1px solid ${ROI_ON_DARK_DIVIDER};">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${ROI_ON_DARK_55};margin-bottom:14px;">${isTr ? 'ÖNCELİK AKSİYONLAR' : 'PRIORITY ACTIONS'}</div>
        ${renderRoiSteps(params.aiNextSteps, { dark: true })}
      </div>`
      : '';
  const aiInsightCard = `
    <div class="bz-roi-card" style="background:${PULSE.graphite};border-radius:16px;padding:24px;color:${PULSE.pure};">
      ${renderEyebrow(insightSourceLabel, PULSE.lime)}
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:14px;line-height:1.7;color:${ROI_ON_DARK_90};">${summarySafe}</div>
      <div style="margin-top:16px;padding:14px 16px;background:#212612;border-left:3px solid ${PULSE.lime};border-radius:8px;">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${PULSE.lime};margin-bottom:6px;">${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}</div>
        <div style="font-family:${FONTS.body};font-size:13.5px;line-height:1.6;color:${PULSE.pure};">${highlightSafe}</div>
      </div>
      ${prioritySection}
    </div>
  `;

  // ─── Scenario list ─────────────────────────────────────────────────────
  // Label left (sentence case — uppercase labels wrapped to two lines and left
  // orphan "★" at 375px), value right-aligned. The rounded border lives on a
  // wrapper div: border-radius + overflow on a collapsed-border table never
  // clipped the label column.
  // table-layout:fixed + explicit 52/48 split: the label column gets enough room
  // for "Mevcut Google ★" / "Monthly customers" on a 320px phone and the value
  // column cannot be squeezed to nothing by a long unbreakable value. Labels are
  // trusted constants (HTML); the "★" is glued to its word with U+00A0 / a
  // nowrap span so it never dangles alone on a second line.
  const nb = (t: string) => `<span style="white-space:nowrap;">${t}</span>`;
  const scenarioRow = (labelHtml: string, valueHtml: string, opts: { accent?: boolean; last?: boolean } = {}) => `
    <tr>
      <td valign="top" width="52%" style="width:52%;padding:12px 6px 12px 14px;${opts.last ? '' : `border-bottom:1px solid ${PULSE.n200};`}${opts.accent ? `background:${PULSE.limeSoft};` : ''}font-family:${FONTS.body};font-size:12.5px;line-height:1.5;color:${opts.accent ? PULSE.graphite : PULSE.n500};">${labelHtml}</td>
      <td valign="top" align="right" width="48%" style="width:48%;padding:12px 14px 12px 6px;text-align:right;${opts.last ? '' : `border-bottom:1px solid ${PULSE.n200};`}${opts.accent ? `background:${PULSE.limeSoft};` : ''}font-family:${FONTS.body};font-size:13.5px;line-height:1.5;color:${PULSE.graphite};font-weight:${opts.accent ? 600 : 500};">${valueHtml}</td>
    </tr>
  `;
  // Plan value: plan name over its (unbreakable) price. Two deliberate lines on
  // every width — a single "Growth · $899/mo" line wrapped to a dangling "·" on
  // phones.
  const planValue = `${escapeHtml(planLabel)}<br><span style="font-weight:400;font-size:12.5px;color:${PULSE.n500};white-space:nowrap;">${escapeHtml(`${c}${fmt(params.planPrice)}/${isTr ? 'ay' : 'mo'}`)}</span>`;
  const scenarioTable = `
    <h2 style="margin:0 0 12px;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${copy.scenarioH2}</h2>
    <div style="border:1px solid ${PULSE.n200};border-radius:12px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;">
        ${scenarioRow(isTr ? 'Sektör' : 'Sector', escapeHtml(sectorLabel))}
        ${scenarioRow(isTr ? 'Aylık müşteri' : 'Monthly customers', escapeHtml(fmt(params.monthlyCustomers)))}
        ${scenarioRow(isTr ? 'Ortalama hesap' : 'Avg ticket', escapeHtml(`${c}${fmt(params.avgTicket)}`))}
        ${scenarioRow(isTr ? 'Mevcut Google\u00A0★' : 'Current Google\u00A0★', escapeHtml(params.currentGoogle.toFixed(1)))}
        ${scenarioRow(isTr ? `Aylık ${nb('1-3★')} yorum` : `${nb('1-3★')} reviews/mo`, escapeHtml(fmt(params.lowRatingsPerMonth)))}
        ${scenarioRow(isTr ? 'Aktif platformlar' : 'Active platforms', escapeHtml(platformLabels || '—'))}
        ${scenarioRow(isTr ? 'Buaze planı' : 'Buaze plan', planValue)}
        ${scenarioRow(isTr ? 'Yıllık ek gelir' : 'Yearly uplift', escapeHtml(`${c}${fmt(Math.round(params.yearlyUplift))}`), { accent: true, last: true })}
      </table>
    </div>
  `;

  // ─── Quick action 3-grid (Reply / Call / Panel) ────────────────────────
  // tel: ve mailto: URL attribute'larında HTML-escape'li değer KULLANILMAZ —
  // & -> &amp; dönüşümü URL'i bozar. Raw email + raw phone (ASCII filter).
  const rawPhone = params.phone ? params.phone.replace(/[^+0-9]/g, '') : '';
  const callHref = rawPhone ? `tel:${rawPhone}` : '';
  // §38.197 — env-aware admin panel fallback. Hardcoded canonical
  // staging/preview deploy'larında yanlış host'a yönlendirir.
  const adminAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
  const panelHref = params.panelUrl || `${adminAppUrl}/admin/customers`;
  const replyHref = `mailto:${encodeURI(params.email)}?subject=${encodeURIComponent(
    isTr ? `Buaze ROI hesabınız hakkında — ${params.restaurantName}` : `About your Buaze ROI estimate — ${params.restaurantName}`,
  )}`;

  // No phone → a muted, non-clickable tile (the old tile linked to "#").
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
        ${quickAction(copy.replyLabel, copy.replySub, replyHref, 'dark')}
        ${quickAction(copy.callLabel, phoneSafe ? copy.callSubYes : copy.callSubNo, callHref, phoneSafe ? 'light' : 'muted')}
        ${quickAction(copy.panelLabel, copy.panelSub, panelHref, 'light')}
      </tr>
    </table>
  `;

  // Outer chrome — `bz-pad` wrapper aligns the lead alert with the rest of
  // the Pulse template family (low-rating-alert / contact-admin / …):
  // 36px/40px desktop padding, 28px/22px mobile via the @media rule in
  // layout.ts.
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
          ${aiInsightCard}
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

  // ─── Plain text fallback ───────────────────────────────────────────────
  const text = [
    isTr ? 'YENİ ROI LEAD\'İ' : 'NEW ROI LEAD',
    `${timestamp}`,
    '',
    `${params.restaurantName} (${sectorLabel} · ${planLabel})`,
    `${params.email}${phoneSafe ? ` · ${phoneSafe}` : ''}`,
    '',
    `${isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN'}: ${c}${fmt(Math.max(0, Math.round(params.netGain)))} (${params.roiMultiple.toFixed(1)}× ROI)${params.paybackMonths ? ` · ${isTr ? 'amorti' : 'payback'} ~${params.paybackMonths} ${isTr ? 'ay' : 'mo'}` : ''}`,
    `${isTr ? 'AYLIK EK GELİR' : 'MONTHLY UPLIFT'}: ${c}${fmt(Math.round(params.monthlyUplift))}`,
    '',
    `— ${insightSourceLabel} —`,
    params.aiSummary,
    '',
    `${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}: ${params.aiHighlight}`,
    '',
    `${isTr ? 'ÖNCELİK AKSİYONLAR' : 'PRIORITY ACTIONS'}:`,
    ...params.aiNextSteps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `— ${isTr ? 'SENARYO' : 'SCENARIO'} —`,
    `${isTr ? 'Aylık müşteri' : 'Monthly customers'}: ${fmt(params.monthlyCustomers)}`,
    `${isTr ? 'Ortalama hesap' : 'Avg ticket'}: ${c}${fmt(params.avgTicket)}`,
    `${isTr ? 'Mevcut Google ★' : 'Current Google ★'}: ${params.currentGoogle.toFixed(1)} → ${params.projectedGoogle.toFixed(1)}`,
    `${isTr ? '1-3★ yorum' : 'Low reviews'}: ${fmt(params.lowRatingsPerMonth)} → ${fmt(params.filteredLowReviews)} ${isTr ? 'filtrelendi' : 'filtered'}`,
    `${isTr ? 'Platform' : 'Platforms'}: ${platformLabels || '—'}`,
    `${isTr ? 'Plan' : 'Plan'}: ${planLabel} (${c}${fmt(params.planPrice)}/${isTr ? 'ay' : 'mo'})`,
    '',
    isTr ? `Yanıt yaz: ${replyHref}` : `Reply: ${replyHref}`,
    isTr ? `Lead panel: ${panelHref}` : `Lead panel: ${panelHref}`,
  ].join('\n');

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'BUAZE LEAD INBOX' : 'BUAZE LEAD INBOX',
    footer: { locale: isTr ? 'tr' : 'en' },
  });

  return { subject, html, text };
}
