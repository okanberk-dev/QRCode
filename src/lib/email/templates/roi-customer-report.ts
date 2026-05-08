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

export async function renderRoiCustomerReport(
  params: RoiCustomerReportParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const c = params.currency;
  const planLabel = PLAN_LABEL[params.plan] ?? params.plan;
  // Greeting fallback: form firstName toplamıyor (gelecek scope). Yoksa
  // selamı işletme adı + " ekibi"/"team" ile kur — eski "Merhaba merhaba,"
  // ve restaurantName.split(/[\s,.]/)[0] türetimi (route.ts:226) bug'ları
  // ortadan kalkar. Kişiselleştirme korunur, awkward selamlama olmaz.
  const firstName = (params.firstName || '').trim();
  const greetingLine = firstName
    ? isTr
      ? `Merhaba ${firstName},`
      : `Hi ${firstName},`
    : isTr
      ? `Merhaba ${params.restaurantName} ekibi,`
      : `Hi ${params.restaurantName} team,`;
  const platformLabels = params.platforms
    .map((p) => (isTr ? PLATFORM_LABEL_TR[p] : p) ?? p)
    .join(', ');

  // DB-driven copy override (CLAUDE.md §21.26 Phase 2 pattern). Kritik
  // pazarlama copy'si (subject/preheader/eyebrow/CTA/risk-free strip)
  // admin panelden edit edilebilir; geri kalan template chrome inline.
  const inlineDefault = isTr
    ? {
        subjectTemplate: '${restaurantName} için 12 aylık ROI raporun hazır',
        preheaderPrefix: 'Yıllık net kazanç, ROI çarpanı + Buaze analizi.',
        heroEyebrow: 'BUAZE ROI RAPORU · 12 AY',
        heroIntroPdf: '${restaurantName} için girdiğin senaryoyu, Buaze hesap modeliyle 12 aylık projeksiyona dönüştürdük. Aşağıda ana sonuçlar; detaylı PDF mailin ekinde.',
        heroIntroNoPdf: '${restaurantName} için girdiğin senaryoyu, Buaze hesap modeliyle 12 aylık projeksiyona dönüştürdük. Aşağıda ana sonuçlar; detayları aşağıda.',
        netGainEyebrow: 'YILLIK NET KAZANÇ',
        ctaEyebrow: 'SIRADAKİ ADIM',
        ctaTitle: '30 dk canlı kurulum + soru-cevap',
        ctaBody: 'Bu projeksiyonu birlikte gözden geçirelim. ${planLabel} planını işletmene uyarlayalım, ilk QR\'ı sahanda devreye alalım. Kredi kartı sormuyoruz; 30 gün ücretsiz.',
        ctaPrimary: 'Demo daveti gönder',
        ctaSecondary: '✉ Bize doğrudan yaz · hello@buaze.com',
        ctaPlanLink: 'Ya da planları gör',
        riskFree1: '30 gün ücretsiz',
        riskFree2: 'Kredi kartı yok',
        riskFree3: 'İstediğin an iptal',
        calibrationFooter: 'Bu rapor BrightLocal 2024 yerel arama verileri ve ~2.400 Buaze müşteri kohortu üzerinde kalibre edildi. Tahmini değerlerdir; gerçek sonuçlar işletmenin yorum yanıt disiplinine ve operasyonel uygulamaya göre değişir.',
      }
    : {
        subjectTemplate: 'Your 12-month ROI report for ${restaurantName} is ready',
        preheaderPrefix: 'Annual net gain, ROI multiple + Buaze analysis.',
        heroEyebrow: 'BUAZE ROI REPORT · 12 MO',
        heroIntroPdf: 'We turned your scenario for ${restaurantName} into a 12-month projection using the Buaze model. Highlights below; detailed PDF is attached.',
        heroIntroNoPdf: 'We turned your scenario for ${restaurantName} into a 12-month projection using the Buaze model. Highlights below; details follow.',
        netGainEyebrow: 'ANNUAL NET GAIN',
        ctaEyebrow: 'NEXT STEP',
        ctaTitle: '30-min live setup & Q&A',
        ctaBody: "Let's walk through this projection together, tailor the ${planLabel} plan, and ship your first QR. No credit card; 30-day free trial.",
        ctaPrimary: 'Schedule a demo',
        ctaSecondary: '✉ Email us directly · hello@buaze.com',
        ctaPlanLink: 'Or browse plans',
        riskFree1: '30-day free',
        riskFree2: 'No credit card',
        riskFree3: 'Cancel anytime',
        calibrationFooter: 'Calibrated on BrightLocal 2024 local search data and ~2,400 Buaze accounts. Numbers are estimates; actuals vary with your reply discipline and operational rollout.',
      };

  const merged = await loadMailCopy('roi-customer-report', locale, inlineDefault);
  const vars = {
    restaurantName: params.restaurantName,
    planLabel,
    netGain: c + fmt(Math.max(0, Math.round(params.netGain))),
    roiMultiple: params.roiMultiple.toFixed(1),
  };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const subject = copyText.subjectTemplate;
  const previewSummary = params.aiSummary.slice(0, 110).replace(/\s+/g, ' ').trim();
  const preheader = `${copyText.preheaderPrefix} ${previewSummary}…`;
  const heroIntro = params.hasPdf ? copy.heroIntroPdf : copy.heroIntroNoPdf;

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
  // Mobile class hook'lar: bz-roi-h1 (30→24px), bz-roi-bignum (42→32px),
  // bz-roi-card (24→18px padding). Inline base = Gmail clipping fallback.
  const hero = `
    ${renderEyebrow(copy.heroEyebrow, PULSE.n500)}
    <h1 class="bz-roi-h1" style="margin:8px 0 0;font-family:${FONTS.heading};font-size:30px;line-height:1.1;letter-spacing:-0.025em;color:${PULSE.graphite};font-weight:600;">
      ${escapeHtml(greetingLine)}
    </h1>
    <p style="margin:14px 0 22px;font-size:15px;line-height:1.6;color:${PULSE.n800};">
      ${heroIntro}
    </p>
    <div class="bz-roi-card" style="background:${PULSE.graphite};color:${PULSE.pure};border-radius:16px;padding:24px;">
      ${renderEyebrow(copy.netGainEyebrow, PULSE.lime)}
      <div class="bz-roi-bignum" style="margin-top:8px;font-family:${FONTS.heading};font-size:42px;line-height:1;letter-spacing:-0.03em;color:${PULSE.lime};font-weight:600;">${c}${fmt(Math.max(0, Math.round(params.netGain)))}</div>
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
  // Yalnız aiNextSteps doluyken render — boş array'de orphan başlık olmaz.
  const stepsBlock =
    params.aiNextSteps.length > 0
      ? `
    <h2 style="margin:0 0 14px;font-family:${FONTS.heading};font-size:18px;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'İlk 30 gün için 3 öncelik' : 'Three priorities for the first 30 days'}</h2>
    <ol style="margin:0;padding:0 0 0 4px;list-style:none;">${stepsSafeHtml}</ol>
  `
      : '';

  // ─── CTA card (lime) — primary "Schedule a demo" + secondary mailto ───
  // Secondary mailto button: kullanıcı doğrudan hello@buaze.com'a ulaşabilsin.
  // White bg + graphite border = lower visual weight (primary lime CTA'ya
  // rakip değil). encodeURIComponent subject için zorunlu.
  const mailtoSubject = encodeURIComponent(
    isTr
      ? `Buaze ROI raporum hakkında — ${params.restaurantName}`
      : `About my Buaze ROI report — ${params.restaurantName}`,
  );
  const ctaCard = `
    <div class="bz-roi-card" style="background:${PULSE.lime};border-radius:16px;padding:26px;text-align:center;">
      ${renderEyebrow(copy.ctaEyebrow, PULSE.graphite)}
      <h2 style="margin:8px 0 6px;font-family:${FONTS.heading};font-size:22px;line-height:1.2;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${copy.ctaTitle}</h2>
      <p style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:${PULSE.graphite};">${copy.ctaBody}</p>
      <a href="${escapeHtml(params.contactUrl)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${FONTS.heading};font-size:14px;font-weight:600;letter-spacing:-0.01em;">${copy.ctaPrimary} →</a>
      <div style="margin-top:12px;">
        <a href="mailto:hello@buaze.com?subject=${mailtoSubject}" style="display:inline-block;background:${PULSE.pure};color:${PULSE.graphite};border:1px solid ${PULSE.graphite};padding:11px 22px;border-radius:999px;text-decoration:none;font-family:${FONTS.heading};font-size:13px;font-weight:600;letter-spacing:-0.005em;">
          ${copy.ctaSecondary}
        </a>
      </div>
      <div style="margin-top:14px;font-size:11.5px;color:${PULSE.graphite};opacity:0.75;">${copy.ctaPlanLink}: <a href="${escapeHtml(params.pricingUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">buaze.com/pricing</a></div>
    </div>
  `;

  // ─── Risk-free strip — inline-block chip pattern (mobile-friendly wrap) ─
  // Eski <table class="stack-row"> mobilde 3 pill'i full-width 3 satıra
  // dönüştürüyordu (kullanıcı orantısız geniş bulmuştu). Tek <div> +
  // inline-block <span> chip'leri Outlook/Gmail/Apple Mail uyumlu, mobilde
  // doğal flex-wrap davranışı.
  const riskFree = `
    <div style="text-align:center;">
      ${[copy.riskFree1, copy.riskFree2, copy.riskFree3]
        .map(
          (label) => `<span style="display:inline-block;margin:4px 5px;padding:7px 12px;background:${PULSE.limeSoft};border:1px solid ${PULSE.limeDeep}33;border-radius:999px;font-size:11.5px;color:${PULSE.graphite};font-weight:500;line-height:1;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${PULSE.limeDeep};vertical-align:middle;margin-right:6px;"></span>${label}
          </span>`,
        )
        .join('')}
    </div>
  `;

  // Outer chrome — `bz-pad` wrapper aligns ROI mails with the rest of the
  // Pulse template family (welcome / new-review / customer-reply / …):
  // 36px/40px desktop padding, 24px/20px mobile via the @media rule in
  // layout.ts. Without this wrapper the cards sat flush against the email
  // shell and looked visibly "shifted" compared to peer mails.
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 40px;">
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
            ${copy.calibrationFooter}
          </p>
        </td>
      </tr>
    </table>
  `;

  // ─── Plain text fallback ───────────────────────────────────────────────
  const text = [
    greetingLine,
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
    ...(params.aiNextSteps.length > 0
      ? [
          `${isTr ? 'İLK 30 GÜN — 3 ÖNCELİK' : 'FIRST 30 DAYS — 3 PRIORITIES'}:`,
          ...params.aiNextSteps.map((s, i) => `${i + 1}. ${s}`),
          '',
        ]
      : []),
    isTr
      ? `Demo daveti: ${params.contactUrl}`
      : `Schedule a demo: ${params.contactUrl}`,
    isTr
      ? `Bize doğrudan yaz: hello@buaze.com`
      : `Email us directly: hello@buaze.com`,
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
