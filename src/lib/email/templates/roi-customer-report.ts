// Kullanıcıya gönderilen ROI raporu — lead form'u dolduran restoran
// sahibine kişiselleştirilmiş Pulse mail. AI insight + 4-stat KPI + Buaze
// QR akışı diyagramı + lime CTA kart.
//
// Eski generic `form-confirmation` ROI variant'ı yerine geçer (CLAUDE.md
// §21.6 form-confirmation hâlâ contact / career / newsletter için
// kullanılır; ROI artık dedikated). PDF email attachment ayrı; bu mail
// PDF olmadan da kendi başına anlamlı.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, spacer } from '../components';

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
};
const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

export interface RoiCustomerReportParams {
  restaurantName: string;
  firstName?: string | null;
  currency: string;
  // Outputs
  netGain: number;
  roiMultiple: number;
  monthlyUplift: number;
  paybackMonths: number | null;
  reviewers: number;
  filteredLowReviews: number;
  projectedGoogle: number;
  currentGoogle: number;
  newCustomers: number;
  aiHoursSaved: number;
  // Inputs
  plan: string;
  planPrice: number;
  platforms: string[];
  // AI insight (mevcut çağrıdan)
  aiSummary: string;
  aiHighlight: string;
  aiNextSteps: string[];
  // Has PDF attachment? (sadece copy değişir — "ekteki rapor" / "rapor")
  hasPdf: boolean;
  contactUrl: string;
  pricingUrl: string;
}

export function renderRoiCustomerReport(
  params: RoiCustomerReportParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const c = params.currency;
  const planLabel = PLAN_LABEL[params.plan] ?? params.plan;
  const firstName = (params.firstName || '').trim();
  const greetingName = firstName || (isTr ? 'merhaba' : 'hello');
  const platformLabels = params.platforms
    .map((p) => (isTr ? PLATFORM_LABEL_TR[p] : p) ?? p)
    .join(', ');

  const subject = isTr
    ? `${params.restaurantName} için 12 aylık ROI raporun hazır`
    : `Your 12-month ROI report for ${params.restaurantName} is ready`;

  const previewSummary = params.aiSummary.slice(0, 110).replace(/\s+/g, ' ').trim();
  const preheader = isTr
    ? `Yıllık ${c}${fmt(Math.max(0, Math.round(params.netGain)))} net kazanç, ${params.roiMultiple.toFixed(1)}× ROI. ${previewSummary}…`
    : `${c}${fmt(Math.max(0, Math.round(params.netGain)))} annual net gain, ${params.roiMultiple.toFixed(1)}× ROI. ${previewSummary}…`;

  const summarySafe = escapeHtml(params.aiSummary);
  const highlightSafe = escapeHtml(params.aiHighlight);
  const stepsSafeHtml = params.aiNextSteps
    .map(
      (s, i) =>
        `<li style="margin:0 0 10px;padding-left:8px;color:${PULSE.graphite};font-size:14px;line-height:1.6;">
          <span style="font-family:${FONTS.mono};font-weight:700;color:${PULSE.limeDeep};margin-right:4px;">${String(i + 1).padStart(2, '0')}.</span>
          ${escapeHtml(s)}
        </li>`,
    )
    .join('');

  // ─── HERO: greeting + headline + big number ────────────────────────────
  const hero = `
    ${renderEyebrow(isTr ? 'BUAZE ROI RAPORU · 12 AY' : 'BUAZE ROI REPORT · 12 MO', PULSE.n500)}
    <h1 style="margin:8px 0 0;font-family:${FONTS.heading};font-size:30px;line-height:1.1;letter-spacing:-0.025em;color:${PULSE.graphite};font-weight:600;">
      ${escapeHtml(isTr ? `Merhaba ${greetingName},` : `Hi ${greetingName},`)}
    </h1>
    <p style="margin:14px 0 22px;font-size:15px;line-height:1.6;color:${PULSE.n800};">
      ${escapeHtml(
        isTr
          ? `${params.restaurantName} için girdiğin senaryoyu, Buaze hesap modeliyle bir 12 aylık projeksiyona dönüştürdük. Aşağıda ana sonuçlar; ${params.hasPdf ? 'detaylı PDF mailin ekinde' : 'detayları aşağıda'}.`
          : `We turned your scenario for ${params.restaurantName} into a 12-month projection using the Buaze model. Highlights below; ${params.hasPdf ? 'detailed PDF is attached' : 'details follow'}.`,
      )}
    </p>
    <div style="background:${PULSE.graphite};color:${PULSE.pure};border-radius:16px;padding:24px;">
      ${renderEyebrow(isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN', PULSE.lime)}
      <div style="margin-top:8px;font-family:${FONTS.heading};font-size:42px;line-height:1;letter-spacing:-0.03em;color:${PULSE.lime};font-weight:600;">${c}${fmt(Math.max(0, Math.round(params.netGain)))}</div>
      <div style="margin-top:12px;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,0.75);">
        ${escapeHtml(
          isTr
            ? `12 ayda Buaze yatırımının yaklaşık ${params.roiMultiple.toFixed(1)}× geri dönüşü${params.paybackMonths ? `, amorti süresi ~${params.paybackMonths} ay` : ''}. Aylık ek gelir: ${c}${fmt(Math.round(params.monthlyUplift))}.`
            : `~${params.roiMultiple.toFixed(1)}× return in 12 months${params.paybackMonths ? `, payback ~${params.paybackMonths} mo` : ''}. Monthly uplift: ${c}${fmt(Math.round(params.monthlyUplift))}.`,
        )}
      </div>
    </div>
  `;

  // ─── 4-stat KPI grid ───────────────────────────────────────────────────
  const kpiRow = `
    <table role="presentation" class="stack-row grid-4" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${[
          { v: `+${fmt(params.reviewers)}`, l: isTr ? 'Yorum / ay' : 'Reviews / mo' },
          { v: fmt(params.filteredLowReviews), l: isTr ? 'Filtrelenen kötü' : 'Low filtered', accent: true },
          { v: params.projectedGoogle.toFixed(1), l: isTr ? 'Yeni Google ★' : 'New Google ★' },
          { v: `${params.aiHoursSaved.toFixed(1)} sa`, l: isTr ? 'AI tasarruf' : 'AI saved' },
        ]
          .map(
            (k) => `<td class="cell stack-col" valign="top" style="width:25%;padding:6px;">
              <div style="background:${k.accent ? PULSE.limeSoft : PULSE.n50};border:1px solid ${k.accent ? PULSE.limeDeep + '33' : PULSE.n200};border-radius:12px;padding:14px;">
                <div style="font-family:${FONTS.heading};font-size:18px;line-height:1.1;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(k.v)}</div>
                <div style="margin-top:6px;font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.n500};">${escapeHtml(k.l)}</div>
              </div>
            </td>`,
          )
          .join('')}
      </tr>
    </table>
  `;

  // ─── AI INSIGHT card (lime soft bg) ────────────────────────────────────
  const aiInsightCard = `
    <div style="background:${PULSE.limeSoft};border:1px solid ${PULSE.limeDeep}55;border-radius:16px;padding:22px;">
      ${renderEyebrow(isTr ? 'BUAZE ANALİZİ — SANA ÖZEL' : 'BUAZE ANALYSIS — TAILORED', PULSE.graphite)}
      <p style="margin:10px 0 14px;font-size:14.5px;line-height:1.65;color:${PULSE.graphite};">${summarySafe}</p>
      <div style="background:${PULSE.pure};border:1px solid ${PULSE.limeDeep}55;border-left:4px solid ${PULSE.limeDeep};border-radius:10px;padding:14px 16px;">
        <div style="font-family:${FONTS.mono};font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:${PULSE.limeDeep};margin-bottom:6px;">${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}</div>
        <div style="font-size:14px;line-height:1.6;color:${PULSE.graphite};font-weight:500;">${highlightSafe}</div>
      </div>
    </div>
  `;

  // ─── Buaze flow explainer ──────────────────────────────────────────────
  const flowBlock = `
    <h2 style="margin:0 0 8px;font-family:${FONTS.heading};font-size:18px;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'Buaze QR akışı: yorumlar nereye gider?' : 'Buaze QR flow: where reviews go'}</h2>
    <p style="margin:0 0 14px;font-size:13.5px;line-height:1.6;color:${PULSE.n500};">${escapeHtml(
      isTr
        ? 'Müşteri verdiği yıldıza göre iki ayrı akışa düşer. İçerik gizlenmez, müşteri istediği yere yorum yazma hakkını korur — Buaze yalnızca yönlendirir.'
        : 'Customers split into two flows by star rating. Nothing is hidden — they keep the right to leave a review anywhere; Buaze only routes.',
    )}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PULSE.n200};border-radius:12px;overflow:hidden;background:${PULSE.pure};">
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid ${PULSE.n200};vertical-align:top;width:96px;">
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${PULSE.graphite};color:${PULSE.pure};font-family:${FONTS.heading};font-size:13px;font-weight:600;letter-spacing:-0.01em;">1-2-3 ★</span>
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid ${PULSE.n200};font-size:13px;line-height:1.55;color:${PULSE.n800};">
          <strong style="color:${PULSE.graphite};">${isTr ? 'Dahili form' : 'Internal form'}</strong> — ${escapeHtml(
            isTr
              ? 'Düşük puanın ~%85\'i Google\'a sızmaz, doğrudan admin paneline düşer. Müşteriyle özel iletişim kurarsın, sorunu çözebilirsin.'
              : '~85% of low ratings stay off Google, landing in the admin panel. You get a private channel to resolve the issue.',
          )}
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px;vertical-align:top;width:96px;">
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${PULSE.limeDeep};color:${PULSE.graphite};font-family:${FONTS.heading};font-size:13px;font-weight:600;letter-spacing:-0.01em;">4-5 ★</span>
        </td>
        <td style="padding:14px 16px;font-size:13px;line-height:1.55;color:${PULSE.n800};">
          <strong style="color:${PULSE.graphite};">${isTr ? 'Seçili platform' : 'Selected platform'}</strong> — ${escapeHtml(
            isTr
              ? `${platformLabels || 'Google'}'a normalize ağırlıklarla dağılır. Yüksek puanlar arama görünürlüğünü ve dönüşümü birlikte yukarı çeker.`
              : `Distributed across ${platformLabels || 'Google'} with normalized weights. High ratings lift discovery and conversion together.`,
          )}
        </td>
      </tr>
    </table>
  `;

  // ─── Priority actions list ─────────────────────────────────────────────
  const stepsBlock = `
    <h2 style="margin:0 0 14px;font-family:${FONTS.heading};font-size:18px;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'İlk 30 gün için 3 öncelik' : 'Three priorities for the first 30 days'}</h2>
    <ol style="margin:0;padding:0 0 0 4px;list-style:none;">${stepsSafeHtml}</ol>
  `;

  // ─── CTA card (lime) ──────────────────────────────────────────────────
  const ctaCard = `
    <div style="background:${PULSE.lime};border-radius:16px;padding:26px;text-align:center;">
      ${renderEyebrow(isTr ? 'SIRADAKİ ADIM' : 'NEXT STEP', PULSE.graphite)}
      <h2 style="margin:8px 0 6px;font-family:${FONTS.heading};font-size:22px;line-height:1.2;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(
        isTr ? '30 dk canlı kurulum + soru-cevap' : '30-min live setup & Q&A',
      )}</h2>
      <p style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:${PULSE.graphite};">${escapeHtml(
        isTr
          ? `Bu projeksiyonu birlikte gözden geçirelim. ${planLabel} planını işletmene uyarlayalım, ilk QR'ı sahanda devreye alalım. Kredi kartı sormuyoruz; 30 gün ücretsiz.`
          : `Let's walk through this projection together, tailor the ${planLabel} plan, and ship your first QR. No credit card; 30-day free trial.`,
      )}</p>
      <a href="${escapeHtml(params.contactUrl)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${FONTS.heading};font-size:14px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(isTr ? 'Demo daveti gönder' : 'Schedule a demo')} →</a>
      <div style="margin-top:14px;font-size:11.5px;color:${PULSE.graphite};opacity:0.75;">${escapeHtml(
        isTr ? 'Ya da planları gör' : 'Or browse plans',
      )}: <a href="${escapeHtml(params.pricingUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">${isTr ? 'buaze.com/fiyatlandirma' : 'buaze.com/pricing'}</a></div>
    </div>
  `;

  // ─── Risk-free strip ──────────────────────────────────────────────────
  const riskFree = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="stack-row">
      <tr>
        ${[
          isTr ? '30 gün ücretsiz' : '30-day free',
          isTr ? 'Kredi kartı yok' : 'No credit card',
          isTr ? 'İstediğin an iptal' : 'Cancel anytime',
        ]
          .map(
            (label) => `<td class="stack-col" valign="middle" style="width:33.33%;padding:4px;text-align:center;">
              <span style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:${PULSE.limeSoft};border:1px solid ${PULSE.limeDeep}33;border-radius:999px;font-size:11.5px;color:${PULSE.graphite};font-weight:500;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${PULSE.limeDeep};"></span>
                ${escapeHtml(label)}
              </span>
            </td>`,
          )
          .join('')}
      </tr>
    </table>
  `;

  const content = `
    ${hero}
    ${spacer(20)}
    ${kpiRow}
    ${spacer(20)}
    ${aiInsightCard}
    ${spacer(22)}
    ${flowBlock}
    ${spacer(22)}
    ${stepsBlock}
    ${spacer(22)}
    ${ctaCard}
    ${spacer(16)}
    ${riskFree}
    ${spacer(20)}
    <p style="margin:0;font-size:11px;color:${PULSE.n500};line-height:1.55;">
      ${escapeHtml(
        isTr
          ? 'Bu rapor BrightLocal 2024 yerel arama verileri ve ~2.400 Buaze müşteri kohortu üzerinde kalibre edildi. Tahmini değerlerdir; gerçek sonuçlar işletmenin yorum yanıt disiplinine ve operasyonel uygulamaya göre değişir.'
          : 'Calibrated on BrightLocal 2024 local search data and ~2,400 Buaze accounts. Numbers are estimates; actuals vary with your reply discipline and operational rollout.',
      )}
    </p>
  `;

  // ─── Plain text fallback ───────────────────────────────────────────────
  const text = [
    isTr
      ? `Merhaba ${greetingName},`
      : `Hi ${greetingName},`,
    '',
    isTr
      ? `${params.restaurantName} için 12 aylık ROI projeksiyonun hazır.`
      : `Your 12-month ROI projection for ${params.restaurantName} is ready.`,
    '',
    `${isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN'}: ${c}${fmt(Math.max(0, Math.round(params.netGain)))} (${params.roiMultiple.toFixed(1)}× ROI)${params.paybackMonths ? ` · ${isTr ? 'amorti' : 'payback'} ~${params.paybackMonths} ${isTr ? 'ay' : 'mo'}` : ''}`,
    `${isTr ? 'AYLIK EK GELİR' : 'MONTHLY UPLIFT'}: ${c}${fmt(Math.round(params.monthlyUplift))}`,
    `${isTr ? 'YENİ GOOGLE' : 'NEW GOOGLE'} ★: ${params.currentGoogle.toFixed(1)} → ${params.projectedGoogle.toFixed(1)}`,
    `${isTr ? 'AI TASARRUF' : 'AI SAVED'}: ${params.aiHoursSaved.toFixed(1)} ${isTr ? 'saat/ay' : 'h/mo'}`,
    '',
    `— ${isTr ? 'BUAZE ANALİZİ' : 'BUAZE ANALYSIS'} —`,
    params.aiSummary,
    '',
    `${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}: ${params.aiHighlight}`,
    '',
    `${isTr ? 'İLK 30 GÜN — 3 ÖNCELİK' : 'FIRST 30 DAYS — 3 PRIORITIES'}:`,
    ...params.aiNextSteps.map((s, i) => `${i + 1}. ${s}`),
    '',
    isTr
      ? `Demo daveti: ${params.contactUrl}`
      : `Schedule a demo: ${params.contactUrl}`,
    isTr ? `Planlar: ${params.pricingUrl}` : `Plans: ${params.pricingUrl}`,
    '',
    params.hasPdf
      ? isTr
        ? 'Detaylı PDF rapor ektedir.'
        : 'Detailed PDF report is attached.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'BUAZE ROI RAPORU' : 'BUAZE ROI REPORT',
    footer: { locale: isTr ? 'tr' : 'en' },
  });

  return { subject, html, text };
}
