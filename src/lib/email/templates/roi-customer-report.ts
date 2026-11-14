// ROI calculator estimate — sent to the visitor who filled in the /roi form.
// Pulse mail: estimated time saved (dark card) + 4 KPI tiles + written summary
// + the QR flow as the product works + next steps + trial CTA.
//
// Content rules (marketing spec D1 + D9): every figure comes from the values
// the visitor entered (src/lib/roi/roi-model.ts), recomputed on the server.
// The mail says it is an estimate, makes no rating / revenue / cohort claims
// and describes the QR flow exactly: below the business's threshold the
// customer can send private feedback first and the public review link is on
// the same screen.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, spacer } from '../components';
import {
  ROI_LIME_LINE_ON_SOFT,
  ROI_LIME_LINE_STRONG,
  ROI_ON_DARK_75,
  ROI_ON_DARK_DIVIDER,
  renderRoiBigNumber,
  renderRoiKpiGrid,
  renderRoiSteps,
} from './roi-mail-parts';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';
import {
  computeRoi,
  formatHours,
  formatUsd,
  normalizeRoiInputs,
  type RoiInputs,
  type RoiResult,
} from '@/lib/roi/roi-model';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';

export interface RoiCustomerReportParams {
  restaurantName: string;
  firstName?: string | null;
  /** Calculator inputs (normalised). Missing → calculator defaults. */
  inputs?: RoiInputs;
  /** Estimate computed from `inputs`. Missing → computed here. */
  estimate?: RoiResult;
  /** Plan name chosen in the calculator; null = no plan. */
  planName?: string | null;
  // AI / template summary
  aiSummary: string;
  aiHighlight: string;
  aiNextSteps: string[];
  aiSource?: 'ai' | 'template';
  /** PDF attached? (only the intro sentence changes) */
  hasPdf: boolean;
  contactUrl: string;
  pricingUrl: string;
  /** Free-trial sign-up URL. Missing → pricingUrl. */
  registerUrl?: string;

  // ── Legacy projection model (pre-2026-11). Accepted so older callers
  // still type-check; NONE of these values is rendered — they described
  // rating lifts, revenue and "filtered" reviews the product cannot promise.
  currency?: string;
  netGain?: number;
  roiMultiple?: number;
  monthlyUplift?: number;
  paybackMonths?: number | null;
  reviewers?: number;
  filteredLowReviews?: number;
  projectedGoogle?: number;
  currentGoogle?: number;
  newCustomers?: number;
  aiHoursSaved?: number;
  plan?: string;
  planPrice?: number;
  platforms?: string[];
}

export async function renderRoiCustomerReport(
  params: RoiCustomerReportParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const lang: 'tr' | 'en' = isTr ? 'tr' : 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const hours = (n: number) => formatHours(n, lang);

  const inputs = params.inputs ?? normalizeRoiInputs({}, lang);
  const est = params.estimate ?? computeRoi(inputs);
  const hasPlan = est.planMonthlyUsd !== null && est.monthlyDifferenceUsd !== null;
  const planName = (params.planName || '').trim();
  const planLabel = planName || 'Buaze';

  // Greeting: the form does not collect a first name, so greet the team.
  const firstName = (params.firstName || '').trim();
  const greetingLine = firstName
    ? isTr
      ? `Merhaba ${firstName},`
      : `Hi ${firstName},`
    : isTr
      ? `Merhaba ${params.restaurantName} ekibi,`
      : `Hi ${params.restaurantName} team,`;

  // DB-driven copy override (CLAUDE.md §21.26). Keys are unchanged so the
  // admin editor keeps working; `netGainEyebrow` now labels the time-saved
  // card and `calibrationFooter` holds the estimate disclaimer.
  const inlineDefault = isTr
    ? {
        subjectTemplate: '${restaurantName} için tahmini Buaze raporunuz',
        preheaderPrefix: 'Tahmini zaman tasarrufu ve kısa bir özet.',
        heroEyebrow: 'TAHMİNİ RAPOR · ROI HESAPLAYICI',
        heroIntroPdf:
          '${restaurantName} için hesaplayıcıya girdiğiniz değerlerle hazırladığımız tahmin aşağıda; ayrıntılı PDF ektedir. Rakamlar sizin girdiğiniz değerlere dayanır.',
        heroIntroNoPdf:
          '${restaurantName} için hesaplayıcıya girdiğiniz değerlerle hazırladığımız tahmin aşağıda. Rakamlar sizin girdiğiniz değerlere dayanır.',
        netGainEyebrow: 'TAHMİNİ ZAMAN TASARRUFU',
        ctaEyebrow: 'SIRADAKİ ADIM',
        ctaTitle: 'Buaze’yi 14 gün ücretsiz deneyin',
        ctaBody:
          'Kurulumda yardım isterseniz bize yazın; sorularınızı birlikte yanıtlayalım. Deneme için kredi kartı gerekmez.',
        ctaPrimary: 'Ücretsiz deneyin',
        ctaSecondary: `Bize yazın · ${SUPPORT_EMAIL}`,
        ctaPlanLink: 'Planları görün',
        riskFree1: '14 gün ücretsiz',
        riskFree2: 'Kredi kartı gerekmez',
        riskFree3: 'İstediğiniz zaman iptal',
        calibrationFooter:
          'Bu rapor girdiğiniz değerlere dayanan bir tahmindir; Buaze müşteri verisine ya da araştırmaya dayanmaz. Daha fazla yorumun ya da daha iyi bir puanın gelire etkisi hesaba katılmadı.',
      }
    : {
        subjectTemplate: 'Your Buaze estimate for ${restaurantName}',
        preheaderPrefix: 'Estimated time saved and a short summary.',
        heroEyebrow: 'ESTIMATE · ROI CALCULATOR',
        heroIntroPdf:
          'Here is the estimate for ${restaurantName}, based on the values you entered in the calculator; the detailed PDF is attached. The figures come from your own values.',
        heroIntroNoPdf:
          'Here is the estimate for ${restaurantName}, based on the values you entered in the calculator. The figures come from your own values.',
        netGainEyebrow: 'ESTIMATED TIME SAVED',
        ctaEyebrow: 'NEXT STEP',
        ctaTitle: 'Try Buaze free for 14 days',
        ctaBody:
          'If you would like help with setup, write to us and we will answer your questions. No credit card is needed for the trial.',
        ctaPrimary: 'Start your free trial',
        ctaSecondary: `Write to us · ${SUPPORT_EMAIL}`,
        ctaPlanLink: 'See the plans',
        riskFree1: '14 days free',
        riskFree2: 'No credit card required',
        riskFree3: 'Cancel anytime',
        calibrationFooter:
          'This report is an estimate based on the values you entered, not on Buaze customer data or research. It leaves out any revenue effect of more reviews or a better rating.',
      };

  const merged = await loadMailCopy('roi-customer-report', locale, inlineDefault);
  // `netGain` / `roiMultiple` stay available for admin-edited copy written for
  // the old model: they map to the yearly difference and the time-value /
  // plan-price ratio of the new estimate.
  const vars = {
    restaurantName: params.restaurantName,
    planLabel,
    netGain:
      est.yearlyDifferenceUsd !== null
        ? formatUsd(est.yearlyDifferenceUsd, { signed: true })
        : formatUsd(est.timeValueUsd * 12),
    roiMultiple:
      est.planMonthlyUsd && est.planMonthlyUsd > 0 ? (est.timeValueUsd / est.planMonthlyUsd).toFixed(1) : '—',
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const subject = copyText.subjectTemplate;
  const previewSummary = params.aiSummary.slice(0, 110).replace(/\s+/g, ' ').trim();
  const preheader = `${copyText.preheaderPrefix} ${previewSummary}…`;
  const heroIntro = params.hasPdf ? copy.heroIntroPdf : copy.heroIntroNoPdf;
  const heroIntroText = params.hasPdf ? copyText.heroIntroPdf : copyText.heroIntroNoPdf;

  const hoursLine = isTr ? `${hours(est.hoursSaved)} saat / ay` : `${hours(est.hoursSaved)} h / month`;
  const valueLine = isTr
    ? `Bu sürenin tahmini değeri ${formatUsd(est.timeValueUsd)} / ay.${hasPlan ? ` ${planName ? `${planName} planı` : 'Plan'} ${formatUsd(est.planMonthlyUsd!)} / ay; tahmini aylık fark ${formatUsd(est.monthlyDifferenceUsd!, { signed: true })}.` : ''}`
    : `Estimated value of that time: ${formatUsd(est.timeValueUsd)} / month.${hasPlan ? ` ${planName ? `${planName} plan` : 'Plan'} ${formatUsd(est.planMonthlyUsd!)} / month; estimated monthly difference ${formatUsd(est.monthlyDifferenceUsd!, { signed: true })}.` : ''}`;

  // ─── HERO: greeting + intro + time saved ───────────────────────────────
  // Mobile class hooks: bz-roi-h1 (→24px), bz-roi-bignum / bz-roi-bignum-sm
  // (→32 / 26px), bz-roi-card (→18px padding).
  const hero = `
    ${renderEyebrow(copy.heroEyebrow, PULSE.n500)}
    <h1 class="bz-roi-h1" style="margin:10px 0 0;text-wrap:balance;font-family:${FONTS.heading};font-size:28px;line-height:1.2;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">
      ${escapeHtml(greetingLine)}
    </h1>
    <p style="margin:14px 0 24px;font-family:${FONTS.body};font-size:15px;line-height:1.65;color:${PULSE.n800};">
      ${heroIntro}
    </p>
    <div class="bz-roi-card" style="background:${PULSE.graphite};color:${PULSE.pure};border-radius:16px;padding:26px;">
      ${renderEyebrow(copy.netGainEyebrow, PULSE.lime)}
      ${renderRoiBigNumber(hoursLine, { color: PULSE.lime, size: 42 })}
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid ${ROI_ON_DARK_DIVIDER};font-family:${FONTS.body};font-size:13.5px;line-height:1.6;color:${ROI_ON_DARK_75};">
        ${escapeHtml(valueLine)}
      </div>
    </div>
  `;

  // ─── 2×2 KPI tiles ─────────────────────────────────────────────────────
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

  // ─── Summary card (lime soft) ──────────────────────────────────────────
  // Highlight label is graphite-grey, not limeDeep: limeDeep on white is ~1.7:1.
  const summaryEyebrow =
    params.aiSource === 'ai'
      ? isTr
        ? 'BUAZE ÖZETİ · YAPAY ZEKÂ İLE HAZIRLANDI'
        : 'BUAZE SUMMARY · WRITTEN WITH AI'
      : isTr
        ? 'BUAZE ÖZETİ'
        : 'BUAZE SUMMARY';
  const insightCard = `
    <div class="bz-roi-card" style="background:${PULSE.limeSoft};border:1px solid ${ROI_LIME_LINE_STRONG};border-radius:16px;padding:24px;">
      ${renderEyebrow(summaryEyebrow, PULSE.graphite)}
      <p style="margin:12px 0 16px;font-family:${FONTS.body};font-size:14.5px;line-height:1.7;color:${PULSE.graphite};">${escapeHtml(params.aiSummary)}</p>
      <div style="background:${PULSE.pure};border:1px solid ${ROI_LIME_LINE_STRONG};border-left:4px solid ${PULSE.limeDeep};border-radius:10px;padding:14px 16px;">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${PULSE.n600};margin-bottom:6px;">${isTr ? 'ÖNE ÇIKAN NOKTA' : 'KEY POINT'}</div>
        <div style="font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${PULSE.graphite};font-weight:500;">${escapeHtml(params.aiHighlight)}</div>
      </div>
    </div>
  `;

  // ─── QR flow, as the product works (spec D1) ───────────────────────────
  // Stacked cards (pill on top, text below): a 2-column table left ~150px
  // for the text at 375px.
  const flowCard = (pill: string, pillBg: string, pillFg: string, body: string) => `
    <div style="background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:12px;padding:16px 18px;">
      <span style="display:inline-block;white-space:nowrap;padding:5px 12px;border-radius:999px;background:${pillBg};color:${pillFg};font-family:${FONTS.heading};font-size:13px;line-height:1.3;font-weight:600;">${pill}</span>
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:13px;line-height:1.65;color:${PULSE.n800};">${body}</div>
    </div>
  `;
  const flowIntro = isTr
    ? 'Müşteri QR kodu okutur ve puan verir. Yönlendirme eşiğini siz belirlersiniz (varsayılan 5 yıldız). Buaze hiçbir yorumu silmez, gizlemez ya da değiştirmez.'
    : 'The customer scans the QR code and gives a rating. You set the redirect threshold (5 stars by default). Buaze never deletes, hides or edits a review.';
  const flowHigh = isTr
    ? 'Seçtiğiniz platformun yorum sayfası açılır; müşteri yorumunu orada, kendi hesabıyla yazar.'
    : 'Your chosen platform’s review page opens; the customer writes the review there, with their own account.';
  const flowLow = isTr
    ? 'Müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür. 1-3 yıldızlı geri bildirimde size anında e-posta gelir.'
    : 'The customer can first send you private feedback; the public review link is shown on the same screen. Feedback rated 1-3 stars sends you an instant e-mail.';
  const flowBlock = `
    <h2 style="margin:0 0 8px;text-wrap:balance;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'Buaze QR akışı nasıl çalışır' : 'How the Buaze QR flow works'}</h2>
    <p style="margin:0 0 16px;font-family:${FONTS.body};font-size:13.5px;line-height:1.65;color:${PULSE.n500};">${escapeHtml(flowIntro)}</p>
    ${flowCard(isTr ? 'Eşik ve üzeri' : 'At or above', PULSE.lime, PULSE.graphite, escapeHtml(flowHigh))}
    ${spacer(10)}
    ${flowCard(isTr ? 'Eşiğin altı' : 'Below', PULSE.graphite, PULSE.pure, escapeHtml(flowLow))}
  `;

  // ─── Suggestions (only when present — no orphan heading) ───────────────
  const stepsBlock =
    params.aiNextSteps.length > 0
      ? `
    <h2 style="margin:0 0 16px;text-wrap:balance;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'İlk 30 gün için öneriler' : 'Suggestions for the first 30 days'}</h2>
    ${renderRoiSteps(params.aiNextSteps)}
  `
      : '';

  // ─── CTA card (lime) — trial + mailto + plans ──────────────────────────
  // Both anchors carry bz-btn → full-width 48px+ targets on phones; radius 14
  // (not a pill) so a two-line label does not turn into an oval.
  const trialHref = params.registerUrl || params.pricingUrl;
  const mailtoSubject = encodeURIComponent(
    isTr ? `Buaze tahmini raporum — ${params.restaurantName}` : `My Buaze estimate — ${params.restaurantName}`,
  );
  const ctaCard = `
    <div class="bz-roi-card" style="background:${PULSE.lime};border-radius:16px;padding:28px 26px;text-align:center;">
      ${renderEyebrow(copy.ctaEyebrow, PULSE.graphite)}
      <h2 style="margin:10px 0 8px;text-wrap:balance;font-family:${FONTS.heading};font-size:22px;line-height:1.25;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${copy.ctaTitle}</h2>
      <p style="margin:0 0 22px;font-family:${FONTS.body};font-size:13.5px;line-height:1.65;color:${PULSE.graphite};">${copy.ctaBody}</p>
      <div><a class="bz-btn" href="${escapeHtml(trialHref)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:15px 28px;border-radius:14px;text-decoration:none;font-family:${FONTS.heading};font-size:14px;line-height:1.3;font-weight:600;margin:0 0 10px;">${copy.ctaPrimary} →</a></div>
      <div><a class="bz-btn" href="mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}" style="display:inline-block;background:${PULSE.pure};color:${PULSE.graphite};border:1px solid ${PULSE.graphite};padding:12px 22px;border-radius:14px;text-decoration:none;font-family:${FONTS.heading};font-size:13px;line-height:1.4;font-weight:600;margin:0 0 6px;">${copy.ctaSecondary}</a></div>
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n700};">${escapeHtml(SUPPORT_HOURS[lang])}</div>
      <div style="margin-top:6px;font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n700};"><a href="${escapeHtml(params.pricingUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">${copy.ctaPlanLink}</a> · <a href="${escapeHtml(params.contactUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">${isTr ? 'İletişim' : 'Contact'}</a></div>
    </div>
  `;

  // ─── Trial facts — inline-block chips (Outlook/Gmail/Apple safe) ────────
  // nowrap per chip: the row may wrap BETWEEN chips, never inside one.
  const riskFree = `
    <div style="text-align:center;">
      ${[copy.riskFree1, copy.riskFree2, copy.riskFree3]
        .map(
          (label) => `<span style="display:inline-block;white-space:nowrap;margin:4px 4px;padding:8px 13px;background:${PULSE.limeSoft};border:1px solid ${ROI_LIME_LINE_ON_SOFT};border-radius:999px;font-family:${FONTS.label};font-size:12px;color:${PULSE.graphite};font-weight:500;line-height:1.2;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${PULSE.limeDeep};vertical-align:middle;margin-right:7px;"></span><span style="vertical-align:middle;">${label}</span></span>`,
        )
        .join('')}
    </div>
  `;

  // Outer chrome — `bz-pad` aligns ROI mails with the rest of the Pulse
  // template family (36px/40px desktop, 28px/22px mobile via layout.ts).
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 40px;">
          ${hero}
          ${spacer(22)}
          ${kpiRow}
          ${spacer(22)}
          ${insightCard}
          ${spacer(28)}
          ${flowBlock}
          ${spacer(28)}
          ${stepsBlock}
          ${stepsBlock ? spacer(28) : ''}
          ${ctaCard}
          ${spacer(14)}
          ${riskFree}
          ${spacer(22)}
          <p style="margin:0;padding-top:18px;border-top:1px solid ${PULSE.n200};font-family:${FONTS.body};font-size:11px;color:${PULSE.n500};line-height:1.65;">
            ${copy.calibrationFooter}
          </p>
        </td>
      </tr>
    </table>
  `;

  // ─── Plain text ────────────────────────────────────────────────────────
  // `null` = line omitted; '' = paragraph break (runs of breaks collapse).
  const textLines: (string | null)[] = [
    greetingLine,
    '',
    heroIntroText,
    '',
    `${copyText.netGainEyebrow}: ${hoursLine}`,
    valueLine,
    `${isTr ? 'Tahmini puan / ay' : 'Estimated ratings / month'}: ${fmt(est.ratingsPerMonth)}`,
    `${isTr ? 'Yanıt / ay' : 'Replies / month'}: ${fmt(est.repliesPerMonth)}`,
    `${isTr ? 'Elle yanıt süresi' : 'Reply time by hand'}: ${hours(est.hoursManual)} ${isTr ? 'saat / ay' : 'h / month'}`,
    `${isTr ? 'Taslakla yanıt süresi' : 'Reply time with drafts'}: ${hours(est.hoursWithDrafts)} ${isTr ? 'saat / ay' : 'h / month'}`,
    '',
    `— ${isTr ? 'BUAZE ÖZETİ' : 'BUAZE SUMMARY'} —`,
    params.aiSummary,
    '',
    `${isTr ? 'ÖNE ÇIKAN NOKTA' : 'KEY POINT'}: ${params.aiHighlight}`,
    '',
    ...(params.aiNextSteps.length > 0
      ? [
          `${isTr ? 'İLK 30 GÜN İÇİN ÖNERİLER' : 'SUGGESTIONS FOR THE FIRST 30 DAYS'}:`,
          ...params.aiNextSteps.map((s, i) => `${i + 1}. ${s}`),
          '',
        ]
      : []),
    `${isTr ? 'BUAZE QR AKIŞI' : 'THE BUAZE QR FLOW'}: ${flowIntro}`,
    `- ${isTr ? 'Eşik ve üzeri' : 'At or above'}: ${flowHigh}`,
    `- ${isTr ? 'Eşiğin altı' : 'Below'}: ${flowLow}`,
    '',
    `${copyText.ctaTitle}: ${trialHref}`,
    `${isTr ? 'Bize yazın' : 'Write to us'}: ${SUPPORT_EMAIL} (${SUPPORT_HOURS[lang]})`,
    `${copyText.ctaPlanLink}: ${params.pricingUrl}`,
    `${isTr ? 'İletişim' : 'Contact'}: ${params.contactUrl}`,
    '',
    params.hasPdf ? (isTr ? 'Ayrıntılı PDF ektedir.' : 'The detailed PDF is attached.') : null,
    copyText.calibrationFooter,
  ];
  const text = textLines
    .filter((line): line is string => line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'BUAZE TAHMİNİ RAPOR' : 'BUAZE ESTIMATE',
    footer: { locale: lang },
  });

  return { subject, html, text };
}
