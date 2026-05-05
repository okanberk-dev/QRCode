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
import { deepSubstitute } from '../placeholders';

const PLATFORM_LABEL_TR: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  trendyol: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
};
const SECTOR_LABEL_TR: Record<string, string> = {
  restaurant: 'Restoran',
  cafe: 'Kafe',
  hotel: 'Otel',
  clinic: 'Klinik',
  other: 'Diğer',
};
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
  const sectorLabel = isTr
    ? SECTOR_LABEL_TR[params.sector] ?? params.sector
    : params.sector;
  const planLabel = PLAN_LABEL[params.plan] ?? params.plan;
  const initial = (params.restaurantName || params.email || '?').charAt(0).toUpperCase();
  const timestamp = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const platformLabels = params.platforms
    .map((p) => (isTr ? PLATFORM_LABEL_TR[p] : p) ?? p)
    .join(', ');

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
  // Steps list color'ı koyu zemin için baştan beyaz set ediliyor — eski
  // .replace() regex hack'i (PULSE.graphite literal'ine bağımlıydı) kaldırıldı.
  const stepsSafeHtml = params.aiNextSteps
    .map(
      (s) =>
        `<li style="margin:0 0 8px;padding-left:6px;color:rgba(255,255,255,0.9);font-size:13.5px;line-height:1.55;">${escapeHtml(s)}</li>`,
    )
    .join('');

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
  const alertBar = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PULSE.graphite};border-radius:14px;margin:0 0 18px;">
      <tr>
        <td style="padding:14px 18px;color:${PULSE.pure};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                ${renderEyebrow(copy.alertEyebrow, PULSE.lime)}
                <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.65);font-family:${FONTS.mono};">${escapeHtml(timestamp)}</div>
              </td>
              <td style="vertical-align:middle;text-align:right;">
                ${renderStatusPill({
                  text: copy.statusPill,
                  dotColor: PULSE.lime,
                  textColor: PULSE.pure,
                  bgColor: 'rgba(255,255,255,0.08)',
                })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  // ─── HERO: business + email + ROI big number ───────────────────────────
  const hero = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;width:56px;padding-right:14px;">
          ${renderAvatarCircle({ initials: initial, size: 56, bg: PULSE.graphite, fg: PULSE.lime })}
        </td>
        <td style="vertical-align:middle;">
          ${renderEyebrow(isTr ? `${sectorLabel} · ${planLabel}` : `${sectorLabel} · ${planLabel}`, PULSE.n500)}
          <h1 style="margin:4px 0 2px;font-family:${FONTS.heading};font-size:24px;line-height:1.15;letter-spacing:-0.025em;color:${PULSE.graphite};font-weight:600;">${businessSafe}</h1>
          <a href="mailto:${encodeURI(params.email)}" style="font-family:${FONTS.mono};font-size:12.5px;color:${PULSE.graphite};text-decoration:underline;">${emailSafe}</a>
          ${phoneSafe ? `<span style="display:inline-block;margin-left:10px;font-family:${FONTS.mono};font-size:12.5px;color:${PULSE.n500};">· ${phoneSafe}</span>` : ''}
        </td>
      </tr>
    </table>
    ${spacer(18)}
    <div class="bz-roi-card" style="background:${PULSE.limeSoft};border:1px solid ${PULSE.limeDeep}33;border-radius:14px;padding:18px 20px;">
      ${renderEyebrow(copy.netGainEyebrow, PULSE.graphite)}
      <div class="bz-roi-bignum-sm" style="margin-top:6px;font-family:${FONTS.heading};font-size:32px;line-height:1.05;letter-spacing:-0.03em;color:${PULSE.graphite};font-weight:600;">${c}${fmt(Math.max(0, Math.round(params.netGain)))}</div>
      <div style="margin-top:8px;font-size:13px;color:${PULSE.n800};line-height:1.55;">
        12 ${isTr ? 'ayda' : 'mo'} ${params.roiMultiple.toFixed(1)}× ROI${params.paybackMonths ? ` · ${isTr ? 'amorti' : 'payback'} ~${params.paybackMonths} ${isTr ? 'ay' : 'mo'}` : ''} · ${c}${fmt(Math.round(params.monthlyUplift))}/${isTr ? 'ay' : 'mo'} ${isTr ? 'ek gelir' : 'uplift'}
      </div>
    </div>
  `;

  // ─── KPI row (4 cell, mobile stack via .grid-4) ────────────────────────
  const kpiRow = `
    <table role="presentation" class="stack-row grid-4" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${[
          { v: `+${fmt(params.reviewers)}`, l: isTr ? 'Yorum / ay' : 'Reviews / mo' },
          { v: fmt(params.filteredLowReviews), l: isTr ? 'Filtrelenen' : 'Filtered', accent: true },
          { v: params.projectedGoogle.toFixed(1), l: isTr ? 'Yeni ★' : 'New ★' },
          { v: `${params.aiHoursSaved.toFixed(1)} ${isTr ? 'sa' : 'h'}`, l: isTr ? 'AI tasarruf' : 'AI saved' },
        ]
          .map(
            (k) => `<td class="cell stack-col" valign="top" style="width:25%;padding:6px;">
              <div class="bz-roi-kpi-cell" style="background:${k.accent ? PULSE.limeSoft : PULSE.n50};border:1px solid ${k.accent ? PULSE.limeDeep + '33' : PULSE.n200};border-radius:12px;padding:14px;">
                <div class="bz-roi-kpi-val" style="font-family:${FONTS.heading};font-size:18px;line-height:1.1;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(k.v)}</div>
                <div style="margin-top:6px;font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.n500};">${escapeHtml(k.l)}</div>
              </div>
            </td>`,
          )
          .join('')}
      </tr>
    </table>
  `;

  // ─── AI INSIGHT card (graphite bg + lime accent) ───────────────────────
  // Priority actions section yalnız aiNextSteps doluyken render edilir;
  // boş array'de orphan başlık + boş <ol> görünmez.
  const prioritySection =
    params.aiNextSteps.length > 0
      ? `
      <div style="margin-top:16px;">
        <div style="font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:8px;">${isTr ? 'ÖNCELİK AKSİYONLAR' : 'PRIORITY ACTIONS'}</div>
        <ol style="margin:0;padding:0 0 0 22px;color:rgba(255,255,255,0.9);">${stepsSafeHtml}</ol>
      </div>`
      : '';
  const aiInsightCard = `
    <div style="background:${PULSE.graphite};border-radius:16px;padding:22px;color:${PULSE.pure};">
      ${renderEyebrow(insightSourceLabel, PULSE.lime)}
      <div style="margin-top:8px;font-size:13.5px;line-height:1.6;color:rgba(255,255,255,0.92);">${summarySafe}</div>
      <div style="margin-top:14px;padding:12px 14px;background:rgba(198,242,78,0.12);border-left:3px solid ${PULSE.lime};border-radius:8px;">
        <div style="font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.lime};margin-bottom:4px;">${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}</div>
        <div style="font-size:13px;line-height:1.55;color:${PULSE.pure};">${highlightSafe}</div>
      </div>
      ${prioritySection}
    </div>
  `;

  // ─── Scenario table ────────────────────────────────────────────────────
  const tableRow = (label: string, value: string, accent = false) => `
    <tr>
      <td style="padding:11px 14px;border-bottom:1px solid ${PULSE.n200};background:${PULSE.n50};font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.n500};width:42%;">${escapeHtml(label)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid ${PULSE.n200};font-size:13px;color:${PULSE.graphite};${accent ? `font-family:${FONTS.mono};font-weight:600;` : ''}">${value}</td>
    </tr>
  `;
  const scenarioTable = `
    <h2 style="margin:0 0 12px;font-family:${FONTS.heading};font-size:17px;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${copy.scenarioH2}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PULSE.n200};border-radius:12px;overflow:hidden;">
      ${tableRow(isTr ? 'Sektör' : 'Sector', escapeHtml(sectorLabel))}
      ${tableRow(isTr ? 'Aylık müşteri' : 'Monthly customers', fmt(params.monthlyCustomers))}
      ${tableRow(isTr ? 'Ortalama hesap' : 'Avg ticket', `${c}${fmt(params.avgTicket)}`)}
      ${tableRow(isTr ? 'Mevcut Google ★' : 'Current Google ★', params.currentGoogle.toFixed(1))}
      ${tableRow(isTr ? 'Aylık 1-3★ yorum' : '1-3★ reviews/mo', fmt(params.lowRatingsPerMonth))}
      ${tableRow(isTr ? 'Aktif platformlar' : 'Active platforms', escapeHtml(platformLabels || '—'))}
      ${tableRow(isTr ? 'Buaze planı' : 'Buaze plan', `${planLabel} · ${c}${fmt(params.planPrice)}/${isTr ? 'ay' : 'mo'}`)}
      ${tableRow(isTr ? 'Yıllık ek gelir' : 'Yearly uplift', `${c}${fmt(Math.round(params.yearlyUplift))}`, true)}
    </table>
  `;

  // ─── Quick action 3-grid (Reply / Call / Panel) ────────────────────────
  // tel: ve mailto: URL attribute'larında HTML-escape'li değer KULLANILMAZ —
  // & -> &amp; dönüşümü URL'i bozar. Raw email + raw phone (ASCII filter).
  const rawPhone = params.phone ? params.phone.replace(/[^+0-9]/g, '') : '';
  const callHref = rawPhone ? `tel:${rawPhone}` : '#';
  const panelHref = params.panelUrl || 'https://buaze.com/admin/customers';
  const replyHref = `mailto:${encodeURI(params.email)}?subject=${encodeURIComponent(
    isTr ? `Buaze ROI hesabınız hakkında — ${params.restaurantName}` : `About your Buaze ROI estimate — ${params.restaurantName}`,
  )}`;

  const quickAction = (label: string, sub: string, href: string, dark: boolean) => `
    <td class="cell stack-col" valign="top" style="width:33.33%;padding:5px;">
      <a href="${href}" style="display:block;background:${dark ? PULSE.graphite : PULSE.n50};border:1px solid ${dark ? PULSE.graphite : PULSE.n200};border-radius:12px;padding:14px;text-decoration:none;">
        <div style="font-family:${FONTS.heading};font-size:14px;font-weight:600;letter-spacing:-0.015em;color:${dark ? PULSE.lime : PULSE.graphite};">${escapeHtml(label)}</div>
        <div style="margin-top:4px;font-size:11.5px;color:${dark ? 'rgba(255,255,255,0.7)' : PULSE.n500};">${escapeHtml(sub)}</div>
      </a>
    </td>
  `;

  const quickActions = `
    ${renderEyebrow(copy.quickEyebrow, PULSE.n500)}
    ${spacer(8)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="stack-row">
      <tr>
        ${quickAction(copy.replyLabel, copy.replySub, replyHref, true)}
        ${quickAction(copy.callLabel, phoneSafe ? copy.callSubYes : copy.callSubNo, callHref, false)}
        ${quickAction(copy.panelLabel, copy.panelSub, panelHref, false)}
      </tr>
    </table>
  `;

  // Outer chrome — `bz-pad` wrapper aligns the lead alert with the rest of
  // the Pulse template family (low-rating-alert / contact-admin / …):
  // 36px/40px desktop padding, 24px/20px mobile via the @media rule in
  // layout.ts. Without this wrapper the alert bar + hero + KPI grid sat
  // flush against the email shell and looked visibly "shifted" compared to
  // peer admin alerts.
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 40px;">
          ${alertBar}
          ${hero}
          ${spacer(20)}
          ${kpiRow}
          ${spacer(18)}
          ${aiInsightCard}
          ${spacer(20)}
          ${scenarioTable}
          ${spacer(18)}
          ${quickActions}
          ${spacer(12)}
          <p style="margin:0;font-size:11px;color:${PULSE.n500};line-height:1.55;">${copy.footerDisclosure}</p>
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
