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
import {
  ROI_LIME_LINE_ON_SOFT,
  ROI_LIME_LINE_STRONG,
  ROI_ON_DARK_75,
  ROI_ON_DARK_DIVIDER,
  renderRoiBigNumber,
  renderRoiKpiGrid,
  renderRoiSteps,
  roiPlatformList,
} from './roi-mail-parts';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

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
  const platformLabels = roiPlatformList(params.platforms);

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
  const netGainStr = `${c}${fmt(Math.max(0, Math.round(params.netGain)))}`;

  // ─── HERO: greeting + headline + big number ────────────────────────────
  // Mobile class hooks: bz-roi-h1 (→24px), bz-roi-bignum / bz-roi-bignum-sm
  // (→32 / 26px), bz-roi-card (→18px padding). Inline base sizes are the
  // fallback for clients that strip <style>.
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
      ${renderRoiBigNumber(netGainStr, { color: PULSE.lime, size: 42 })}
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid ${ROI_ON_DARK_DIVIDER};font-family:${FONTS.body};font-size:13.5px;line-height:1.6;color:${ROI_ON_DARK_75};">
        ${escapeHtml(
          isTr
            ? `12 ayda Buaze yatırımının yaklaşık ${params.roiMultiple.toFixed(1)}× geri dönüşü${params.paybackMonths ? `, amorti süresi ~${params.paybackMonths} ay` : ''}. Aylık ek gelir: ${c}${fmt(Math.round(params.monthlyUplift))}.`
            : `~${params.roiMultiple.toFixed(1)}× return in 12 months${params.paybackMonths ? `, payback ~${params.paybackMonths} mo` : ''}. Monthly uplift: ${c}${fmt(Math.round(params.monthlyUplift))}.`,
        )}
      </div>
    </div>
  `;

  // ─── 2×2 KPI tiles ─────────────────────────────────────────────────────
  const kpiRow = renderRoiKpiGrid([
    { value: `+${fmt(params.reviewers)}`, label: isTr ? 'Yorum / ay' : 'Reviews / mo' },
    { value: fmt(params.filteredLowReviews), label: isTr ? 'Filtrelenen kötü' : 'Low filtered', accent: true },
    { value: params.projectedGoogle.toFixed(1), label: isTr ? 'Yeni Google\u00A0★' : 'New Google\u00A0★' },
    { value: `${params.aiHoursSaved.toFixed(1)} ${isTr ? 'sa' : 'h'}`, label: isTr ? 'AI tasarruf' : 'AI saved' },
  ]);

  // ─── AI INSIGHT card (lime soft bg) ────────────────────────────────────
  // Highlight label is graphite-grey, not limeDeep: limeDeep on white is ~1.7:1.
  const aiInsightCard = `
    <div class="bz-roi-card" style="background:${PULSE.limeSoft};border:1px solid ${ROI_LIME_LINE_STRONG};border-radius:16px;padding:24px;">
      ${renderEyebrow(isTr ? 'BUAZE ANALİZİ — SANA ÖZEL' : 'BUAZE ANALYSIS — TAILORED', PULSE.graphite)}
      <p style="margin:12px 0 16px;font-family:${FONTS.body};font-size:14.5px;line-height:1.7;color:${PULSE.graphite};">${summarySafe}</p>
      <div style="background:${PULSE.pure};border:1px solid ${ROI_LIME_LINE_STRONG};border-left:4px solid ${PULSE.limeDeep};border-radius:10px;padding:14px 16px;">
        <div style="font-family:${FONTS.label};font-size:10px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${PULSE.n600};margin-bottom:6px;">${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'}</div>
        <div style="font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${PULSE.graphite};font-weight:500;">${highlightSafe}</div>
      </div>
    </div>
  `;

  // ─── Buaze flow explainer ──────────────────────────────────────────────
  // Two stacked cards (pill on top, text below) instead of a 2-column table:
  // the 96px pill column left ~150px for text at 375px and the copy wrapped
  // every 3-4 words.
  const flowCard = (pill: string, pillBg: string, pillFg: string, title: string, body: string) => `
    <div style="background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:12px;padding:16px 18px;">
      <span style="display:inline-block;white-space:nowrap;padding:5px 12px;border-radius:999px;background:${pillBg};color:${pillFg};font-family:${FONTS.heading};font-size:13px;line-height:1.3;font-weight:600;">${pill}</span>
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:13px;line-height:1.65;color:${PULSE.n800};">
        <strong style="color:${PULSE.graphite};">${title}</strong> — ${body}
      </div>
    </div>
  `;
  const flowBlock = `
    <h2 style="margin:0 0 8px;text-wrap:balance;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'Buaze QR akışı: yorumlar nereye gider?' : 'Buaze QR flow: where reviews go'}</h2>
    <p style="margin:0 0 16px;font-family:${FONTS.body};font-size:13.5px;line-height:1.65;color:${PULSE.n500};">${escapeHtml(
      isTr
        ? 'Müşteri verdiği yıldıza göre iki ayrı akışa düşer. İçerik gizlenmez, müşteri istediği yere yorum yazma hakkını korur — Buaze yalnızca yönlendirir.'
        : 'Customers split into two flows by star rating. Nothing is hidden — they keep the right to leave a review anywhere; Buaze only routes.',
    )}</p>
    ${flowCard(
      '1-2-3 ★',
      PULSE.graphite,
      PULSE.pure,
      isTr ? 'Dahili form' : 'Internal form',
      escapeHtml(
        isTr
          ? 'Düşük puanın ~%85\'i Google\'a sızmaz, doğrudan admin paneline düşer. Müşteriyle özel iletişim kurarsın, sorunu çözebilirsin.'
          : '~85% of low ratings stay off Google, landing in the admin panel. You get a private channel to resolve the issue.',
      ),
    )}
    ${spacer(10)}
    ${flowCard(
      '4-5 ★',
      PULSE.lime,
      PULSE.graphite,
      isTr ? 'Seçili platform' : 'Selected platform',
      escapeHtml(
        isTr
          ? `Ağırlıklar şu platformlara normalize dağıtılır: ${platformLabels || 'Google'}. Yüksek puanlar arama görünürlüğünü ve dönüşümü birlikte yukarı çeker.`
          : `Weights are normalized and distributed across: ${platformLabels || 'Google'}. High ratings lift discovery and conversion together.`,
      ),
    )}
  `;

  // ─── Priority actions list ─────────────────────────────────────────────
  // Yalnız aiNextSteps doluyken render — boş array'de orphan başlık olmaz.
  const stepsBlock =
    params.aiNextSteps.length > 0
      ? `
    <h2 style="margin:0 0 16px;text-wrap:balance;font-family:${FONTS.heading};font-size:18px;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${isTr ? 'İlk 30 gün için 3 öncelik' : 'Three priorities for the first 30 days'}</h2>
    ${renderRoiSteps(params.aiNextSteps)}
  `
      : '';

  // ─── CTA card (lime) — primary "Schedule a demo" + secondary mailto ───
  // Secondary mailto button: kullanıcı doğrudan hello@buaze.com'a ulaşabilsin.
  // White bg + graphite border = lower visual weight (primary lime CTA'ya
  // rakip değil). encodeURIComponent subject için zorunlu. Both anchors carry
  // bz-btn → full-width 48px+ targets on phones; radius 14 (not a pill) so the
  // two-line secondary label doesn't turn into an oval.
  const mailtoSubject = encodeURIComponent(
    isTr
      ? `Buaze ROI raporum hakkında — ${params.restaurantName}`
      : `About my Buaze ROI report — ${params.restaurantName}`,
  );
  const ctaCard = `
    <div class="bz-roi-card" style="background:${PULSE.lime};border-radius:16px;padding:28px 26px;text-align:center;">
      ${renderEyebrow(copy.ctaEyebrow, PULSE.graphite)}
      <h2 style="margin:10px 0 8px;text-wrap:balance;font-family:${FONTS.heading};font-size:22px;line-height:1.25;letter-spacing:-0.01em;color:${PULSE.graphite};font-weight:600;">${copy.ctaTitle}</h2>
      <p style="margin:0 0 22px;font-family:${FONTS.body};font-size:13.5px;line-height:1.65;color:${PULSE.graphite};">${copy.ctaBody}</p>
      <div><a class="bz-btn" href="${escapeHtml(params.contactUrl)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:15px 28px;border-radius:14px;text-decoration:none;font-family:${FONTS.heading};font-size:14px;line-height:1.3;font-weight:600;margin:0 0 10px;">${copy.ctaPrimary} →</a></div>
      <div><a class="bz-btn" href="mailto:hello@buaze.com?subject=${mailtoSubject}" style="display:inline-block;background:${PULSE.pure};color:${PULSE.graphite};border:1px solid ${PULSE.graphite};padding:12px 22px;border-radius:14px;text-decoration:none;font-family:${FONTS.heading};font-size:13px;line-height:1.4;font-weight:600;margin:0 0 6px;">${copy.ctaSecondary}</a></div>
      <div style="margin-top:10px;font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n700};">${copy.ctaPlanLink}: <a href="${escapeHtml(params.pricingUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">buaze.com/pricing</a></div>
    </div>
  `;

  // ─── Risk-free strip — inline-block chips (Outlook/Gmail/Apple safe) ────
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

  // Outer chrome — `bz-pad` wrapper aligns ROI mails with the rest of the
  // Pulse template family (welcome / new-review / customer-reply / …):
  // 36px/40px desktop padding, 28px/22px mobile via the @media rule in
  // layout.ts.
  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 40px;">
          ${hero}
          ${spacer(22)}
          ${kpiRow}
          ${spacer(22)}
          ${aiInsightCard}
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
