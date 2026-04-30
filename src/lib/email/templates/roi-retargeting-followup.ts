// ROI lead 3-day follow-up — retargeting mail.
// Lead form'u 3 gün önce dolduran kullanıcıya hatırlatma. Pulse design;
// AI insight kısa reprise + güçlü demo CTA. Tipik conversion lift +%15-20
// (B2B SaaS retargeting benchmark).
//
// Cron: /api/cron/roi-retargeting (vercel.json schedule, 0 10 * * *)
// Per-lead idempotent: cron set edince ROIRequest.retargetingSentAt = now;
// bir daha pick'lemez.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, spacer } from '../components';

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

export interface RoiRetargetingFollowupParams {
  restaurantName: string;
  firstName?: string | null;
  currency: string;
  // Outputs (orijinal projeksiyondan)
  netGain: number;
  roiMultiple: number;
  paybackMonths: number | null;
  filteredLowReviews: number;
  projectedGoogle: number;
  // AI highlight (kısa reprise)
  aiHighlight: string;
  plan: string;
  contactUrl: string;
  pricingUrl: string;
  /** Original lead'in oluşturulma tarihi — copy'de "3 gün önce" yerine
   *  "30 Nisan'da" gibi insanca tarih için. */
  originalSubmittedAt: Date;
}

export function renderRoiRetargetingFollowup(
  params: RoiRetargetingFollowupParams,
  locale: 'tr' | 'en' = 'tr',
): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const c = params.currency;
  const planLabel = PLAN_LABEL[params.plan] ?? params.plan;
  const firstName = (params.firstName || '').trim();
  const greetingName = firstName || (isTr ? 'merhaba' : 'hello');

  const dayDiff = Math.max(
    1,
    Math.round((Date.now() - params.originalSubmittedAt.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const dayPhrase = isTr
    ? dayDiff <= 1
      ? 'dün'
      : `${dayDiff} gün önce`
    : dayDiff <= 1
      ? 'yesterday'
      : `${dayDiff} days ago`;

  const subject = isTr
    ? `${params.restaurantName}: hesabın hâlâ aklında mı?`
    : `${params.restaurantName}: still thinking about your projection?`;

  const previewHighlight = params.aiHighlight.slice(0, 100).replace(/\s+/g, ' ').trim();
  const preheader = isTr
    ? `${dayPhrase} hesapladığın ${c}${fmt(Math.max(0, Math.round(params.netGain)))}/yıl projeksiyonu. ${previewHighlight}…`
    : `The ${c}${fmt(Math.max(0, Math.round(params.netGain)))}/yr projection you ran ${dayPhrase}. ${previewHighlight}…`;

  const highlightSafe = escapeHtml(params.aiHighlight);

  // ─── HERO: hatırlatma + büyük rakam ────────────────────────────────────
  const hero = `
    ${renderEyebrow(isTr ? 'HATIRLATMA · 3-GÜN FOLLOW-UP' : 'REMINDER · 3-DAY FOLLOW-UP', PULSE.n500)}
    <h1 style="margin:8px 0 0;font-family:${FONTS.heading};font-size:30px;line-height:1.1;letter-spacing:-0.025em;color:${PULSE.graphite};font-weight:600;">
      ${escapeHtml(isTr ? `Merhaba ${greetingName},` : `Hi ${greetingName},`)}
    </h1>
    <p style="margin:14px 0 22px;font-size:15px;line-height:1.6;color:${PULSE.n800};">
      ${escapeHtml(
        isTr
          ? `${params.restaurantName} için ${dayPhrase} bir 12 aylık ROI projeksiyonu hesapladın. Hesabın hâlâ aklında mı diye merak ettik — sonuçları kısa hatırlatma:`
          : `You ran a 12-month ROI projection for ${params.restaurantName} ${dayPhrase}. Just a quick reminder of what came out:`,
      )}
    </p>
    <div style="background:${PULSE.graphite};color:${PULSE.pure};border-radius:16px;padding:24px;">
      ${renderEyebrow(isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN', PULSE.lime)}
      <div style="margin-top:8px;font-family:${FONTS.heading};font-size:42px;line-height:1;letter-spacing:-0.03em;color:${PULSE.lime};font-weight:600;">${c}${fmt(Math.max(0, Math.round(params.netGain)))}</div>
      <div style="margin-top:12px;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,0.75);">
        ${escapeHtml(
          isTr
            ? `${params.roiMultiple.toFixed(1)}× ROI${params.paybackMonths ? `, amorti ~${params.paybackMonths} ay` : ''} · Yeni Google ★ ${params.projectedGoogle.toFixed(1)} · Aylık ${fmt(params.filteredLowReviews)} kötü yorum filtreleneceği projeksiyon.`
            : `${params.roiMultiple.toFixed(1)}× ROI${params.paybackMonths ? `, payback ~${params.paybackMonths} mo` : ''} · New Google ★ ${params.projectedGoogle.toFixed(1)} · ~${fmt(params.filteredLowReviews)} low reviews/mo projected to be filtered.`,
        )}
      </div>
    </div>
  `;

  // ─── AI highlight reprise (lime soft) ──────────────────────────────────
  const insightCard = `
    <div style="background:${PULSE.limeSoft};border:1px solid ${PULSE.limeDeep}55;border-radius:14px;padding:18px 20px;">
      ${renderEyebrow(isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE', PULSE.limeDeep)}
      <p style="margin:8px 0 0;font-size:14.5px;line-height:1.6;color:${PULSE.graphite};font-weight:500;">${highlightSafe}</p>
    </div>
  `;

  // ─── 2 soru: kafa açıcı (dürüst, satışçı değil) ────────────────────────
  const twoQuestions = `
    <h2 style="margin:0 0 12px;font-family:${FONTS.heading};font-size:18px;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(
      isTr ? 'İki kafa açıcı soru:' : 'Two questions to consider:',
    )}</h2>
    <ol style="margin:0 0 4px;padding:0 0 0 22px;color:${PULSE.n800};">
      <li style="margin:0 0 10px;font-size:14px;line-height:1.6;">
        ${escapeHtml(
          isTr
            ? `${params.restaurantName} şu an ayda ne kadar düşük puanlı yorum alıyor? Bunların ${planLabel} planıyla ~%85'i Google'a sızmadan dahili form'a düşüyor.`
            : `How many low-rating reviews does ${params.restaurantName} get monthly? With the ${planLabel} plan, ~85% would land internally instead of leaking to Google.`,
        )}
      </li>
      <li style="margin:0 0 10px;font-size:14px;line-height:1.6;">
        ${escapeHtml(
          isTr
            ? 'Şu an yorumlara yanıt yazmaya kim, ne kadar zaman ayırıyor? AI Co-Pilot taslakları yanıt başına ~4 dakika kazandırıyor.'
            : 'Who replies to reviews today, and how long does it take? AI Co-Pilot drafts save ~4 min per reply.',
        )}
      </li>
    </ol>
  `;

  // ─── CTA card ──────────────────────────────────────────────────────────
  const ctaCard = `
    <div style="background:${PULSE.lime};border-radius:16px;padding:26px;text-align:center;">
      ${renderEyebrow(isTr ? 'SIRADAKİ ADIM' : 'NEXT STEP', PULSE.graphite)}
      <h2 style="margin:8px 0 6px;font-family:${FONTS.heading};font-size:22px;line-height:1.2;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(
        isTr ? '15 dakikalık demo: rakamları sahanda gör' : '15-min demo: see the numbers on your floor',
      )}</h2>
      <p style="margin:0 0 18px;font-size:13.5px;line-height:1.55;color:${PULSE.graphite};">${escapeHtml(
        isTr
          ? `${planLabel} planını işletmene uyarlayalım, ilk QR'ı senin masandan tarayacak müşterinle test edelim. Kredi kartı yok; 30 gün ücretsiz deneme açık.`
          : `Let's tailor the ${planLabel} plan to your floor and test the first QR with a real customer at your table. No card; 30-day free trial.`,
      )}</p>
      <a href="${escapeHtml(params.contactUrl)}" style="display:inline-block;background:${PULSE.graphite};color:${PULSE.pure};padding:14px 26px;border-radius:999px;text-decoration:none;font-family:${FONTS.heading};font-size:14px;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(isTr ? 'Demo daveti gönder' : 'Schedule a demo')} →</a>
      <div style="margin-top:14px;font-size:11.5px;color:${PULSE.graphite};opacity:0.75;">
        ${escapeHtml(isTr ? 'Ya da planları gör' : 'Or browse plans')}: <a href="${escapeHtml(params.pricingUrl)}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">${isTr ? 'buaze.com/fiyatlandirma' : 'buaze.com/pricing'}</a>
      </div>
    </div>
  `;

  // ─── Soft opt-out: müşteri "ilgilenmiyor" diyebilsin (etik retargeting) ─
  const softOptOut = `
    <p style="margin:0;font-size:11px;color:${PULSE.n500};line-height:1.55;text-align:center;">
      ${escapeHtml(
        isTr
          ? 'Bu hatırlatma sadece bir kez gönderilir. Hesap ilgini çekmediyse mesajı görmezden gelebilirsin — tekrar göndermeyiz.'
          : 'This is a one-time reminder. If the projection isn’t for you, just ignore — we won’t follow up again.',
      )}
    </p>
  `;

  const content = `
    ${hero}
    ${spacer(20)}
    ${insightCard}
    ${spacer(22)}
    ${twoQuestions}
    ${spacer(20)}
    ${ctaCard}
    ${spacer(16)}
    ${softOptOut}
  `;

  // ─── Plain text ────────────────────────────────────────────────────────
  const text = [
    isTr ? `Merhaba ${greetingName},` : `Hi ${greetingName},`,
    '',
    isTr
      ? `${params.restaurantName} için ${dayPhrase} hesapladığın 12 aylık ROI projeksiyonu hâlâ aklında mı?`
      : `Still thinking about the 12-month ROI projection you ran for ${params.restaurantName} ${dayPhrase}?`,
    '',
    `${isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN'}: ${c}${fmt(Math.max(0, Math.round(params.netGain)))} (${params.roiMultiple.toFixed(1)}× ROI)${params.paybackMonths ? ` · ${isTr ? 'amorti' : 'payback'} ~${params.paybackMonths} ${isTr ? 'ay' : 'mo'}` : ''}`,
    `${isTr ? 'YENİ GOOGLE' : 'NEW GOOGLE'} ★: ${params.projectedGoogle.toFixed(1)}`,
    `${isTr ? 'AYLIK FİLTRELENECEK KÖTÜ YORUM' : 'LOW REVIEWS FILTERED/MO'}: ${fmt(params.filteredLowReviews)}`,
    '',
    `— ${isTr ? 'EN GÜÇLÜ KALDIRAÇ' : 'STRONGEST LEVERAGE'} —`,
    params.aiHighlight,
    '',
    isTr
      ? `15 dk demo daveti: ${params.contactUrl}`
      : `Schedule a 15-min demo: ${params.contactUrl}`,
    isTr ? `Planlar: ${params.pricingUrl}` : `Plans: ${params.pricingUrl}`,
    '',
    isTr
      ? 'Bu hatırlatma sadece bir kez gönderilir. İlgini çekmediyse görmezden gelebilirsin.'
      : 'One-time reminder — feel free to ignore if not for you.',
  ].join('\n');

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'BUAZE · 3-GÜN FOLLOW-UP' : 'BUAZE · 3-DAY FOLLOW-UP',
    footer: { locale: isTr ? 'tr' : 'en' },
  });

  return { subject, html, text };
}
