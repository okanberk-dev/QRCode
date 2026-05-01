// ROI lead'i için kişiselleştirilmiş AI analizi.
// Hem admin sales mail'inde (operatör için lead-spesifik triage notu) hem
// kullanıcı raporu mail'inde + PDF'in kapağında (Buaze değer önerisini
// senaryosuna gömerek pekiştirir) kullanılır.
//
// OPENAI_API_KEY yoksa veya çağrı başarısızsa, deterministik template
// fallback'e düşer (CLAUDE.md §15 pattern). Mail / PDF asla "boş insight"
// göstermez — her zaman anlamlı çıktı döner.

import { chatCompletion, hasOpenAIKey } from '@/lib/openai';
import type { RoiPdfData } from '@/lib/roi/RoiPdf';

export interface RoiInsight {
  /** 2-3 cümle senaryo özeti — restoran sahibinin diliyle. */
  summary: string;
  /** En yüksek kaldıraç notu — Buaze'nin bu işletme için kilit faydası. */
  highlight: string;
  /** 3 öncelik aksiyon — operatörün ilk 30 günde yapacağı şeyler. */
  nextSteps: string[];
  /** 'ai' = OpenAI çağrısı başarılı; 'template' = deterministic fallback. */
  source: 'ai' | 'template';
}

interface InsightInput {
  data: RoiPdfData;
  locale: 'tr' | 'en';
}

const SECTOR_LABEL_TR: Record<string, string> = {
  restaurant: 'restoran',
  cafe: 'kafe',
  hotel: 'otel',
  clinic: 'klinik',
  other: 'işletme',
};
const SECTOR_LABEL_EN: Record<string, string> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  hotel: 'hotel',
  clinic: 'clinic',
  other: 'business',
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

export async function generateRoiInsight({ data, locale }: InsightInput): Promise<RoiInsight> {
  if (!hasOpenAIKey()) {
    return buildTemplateInsight({ data, locale });
  }

  const prompt = buildPrompt({ data, locale });

  // 8s timeout — /api/roi/save toplam 30s budget; PDF render 1-2s, mail
  // gönderimi 1-2s. AI'a 8s maxim; aşarsa fallback'e düş.
  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content:
          locale === 'tr'
            ? 'Sen Buaze restoran itibar yönetimi platformunun kıdemli müşteri başarı uzmanısın. Verilen ROI senaryosuna 3 cümlelik somut analiz + 1 cümlelik en güçlü kaldıraç + 3 öncelik aksiyonu üretirsin. Yanıtın geçerli JSON olmalı: {"summary":"...","highlight":"...","nextSteps":["...","...","..."]}. Yoksun emoji, abartı, jenerik laf. Restoran sahibine doğal Türkçe — sade, doğrudan, ölçülü.'
            : 'You are a senior customer-success specialist for Buaze restaurant reputation platform. For the given ROI scenario, produce a 3-sentence concrete analysis + a 1-sentence strongest leverage call-out + 3 priority actions. Respond in valid JSON: {"summary":"...","highlight":"...","nextSteps":["...","...","..."]}. No emoji, hype, or generic talk. Speak directly to the operator.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.4, maxTokens: 500, timeoutMs: 8_000 },
  );

  if (!raw) return buildTemplateInsight({ data, locale });

  const parsed = parseInsightJson(raw);
  if (!parsed) return buildTemplateInsight({ data, locale });

  return { ...parsed, source: 'ai' };
}

// ─── Prompt ────────────────────────────────────────────────────────────

function buildPrompt({ data, locale }: InsightInput): string {
  const isTr = locale === 'tr';
  const c = data.currency;
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const sector = isTr
    ? SECTOR_LABEL_TR[data.sector] ?? 'işletme'
    : SECTOR_LABEL_EN[data.sector] ?? 'business';
  const plan = PLAN_LABEL[data.plan] ?? data.plan;
  const platforms = data.platforms.length > 0 ? data.platforms.join(', ') : 'google';

  if (isTr) {
    return [
      `İşletme: ${data.restaurantName} (${sector})`,
      `Aylık müşteri: ${fmt(data.monthlyCustomers)} · Ortalama hesap: ${c}${fmt(data.avgTicket)}`,
      `Mevcut Google ★: ${data.currentGoogle.toFixed(1)} · Aylık 1-3★ kötü yorum: ${fmt(data.lowRatingsPerMonth)}`,
      `Aktif platformlar: ${platforms}`,
      `Seçili plan: ${plan} (${c}${fmt(data.planPrice)}/ay)`,
      '',
      `12 aylık projeksiyon (Buaze hesap modeli):`,
      `- QR taranma: ${fmt(data.scanned)}/ay → yorum: ${fmt(data.reviewers)}/ay`,
      `- Filtrelenen düşük yorum: ${fmt(data.filteredLowReviews)}/ay`,
      `- Yeni Google ★: ${data.projectedGoogle.toFixed(1)}`,
      `- Yeni müşteri: ${fmt(data.newCustomers)}/ay`,
      `- Aylık ek gelir: ${c}${fmt(Math.round(data.monthlyUplift))}`,
      `- Yıllık net kazanç: ${c}${fmt(Math.round(data.netGain))} (${data.roiMultiple.toFixed(1)}× ROI)`,
      `- Pulse AI tasarrufu: ${data.aiHoursSaved.toFixed(1)} sa/ay`,
      data.paybackMonths ? `- Plan amortismanı: ~${data.paybackMonths} ay` : '- Plan amortismanı belirgin değil',
      '',
      'Bu işletmeye özel 3 cümlelik somut analiz, 1 cümlelik en güçlü kaldıraç ve 3 öncelik aksiyonu üret. JSON yanıt ver.',
    ].join('\n');
  }

  return [
    `Business: ${data.restaurantName} (${sector})`,
    `Monthly customers: ${fmt(data.monthlyCustomers)} · Avg ticket: ${c}${fmt(data.avgTicket)}`,
    `Current Google ★: ${data.currentGoogle.toFixed(1)} · Monthly 1-3★ low reviews: ${fmt(data.lowRatingsPerMonth)}`,
    `Active platforms: ${platforms}`,
    `Selected plan: ${plan} (${c}${fmt(data.planPrice)}/mo)`,
    '',
    `12-month projection (Buaze model):`,
    `- QR scans: ${fmt(data.scanned)}/mo → reviews: ${fmt(data.reviewers)}/mo`,
    `- Filtered low reviews: ${fmt(data.filteredLowReviews)}/mo`,
    `- New Google ★: ${data.projectedGoogle.toFixed(1)}`,
    `- New customers: ${fmt(data.newCustomers)}/mo`,
    `- Monthly uplift: ${c}${fmt(Math.round(data.monthlyUplift))}`,
    `- Annual net gain: ${c}${fmt(Math.round(data.netGain))} (${data.roiMultiple.toFixed(1)}× ROI)`,
    `- Pulse AI time saved: ${data.aiHoursSaved.toFixed(1)} h/mo`,
    data.paybackMonths ? `- Plan payback: ~${data.paybackMonths} months` : '- Plan payback not significant',
    '',
    'Produce a 3-sentence concrete analysis specific to this business, 1-sentence strongest leverage, and 3 priority actions. Respond in JSON.',
  ].join('\n');
}

// ─── JSON parser (defensive) ───────────────────────────────────────────

function parseInsightJson(raw: string): Omit<RoiInsight, 'source'> | null {
  // OpenAI bazen ```json``` block içinde döner — strip.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      summary?: unknown;
      highlight?: unknown;
      nextSteps?: unknown;
    };
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const highlight = typeof parsed.highlight === 'string' ? parsed.highlight.trim() : '';
    const nextStepsRaw = Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [];
    const nextSteps = nextStepsRaw
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);

    if (!summary || !highlight || nextSteps.length < 2) return null;
    // Ensure 3 entries — pad with last if AI returned 2.
    while (nextSteps.length < 3) nextSteps.push(nextSteps[nextSteps.length - 1]);
    return { summary, highlight, nextSteps };
  } catch {
    return null;
  }
}

// ─── Deterministic template fallback ───────────────────────────────────

function buildTemplateInsight({ data, locale }: InsightInput): RoiInsight {
  const isTr = locale === 'tr';
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');
  const c = data.currency;
  const plan = PLAN_LABEL[data.plan] ?? data.plan;
  const sector = isTr
    ? SECTOR_LABEL_TR[data.sector] ?? 'işletme'
    : SECTOR_LABEL_EN[data.sector] ?? 'business';

  // Hangi kaldıraç en yüksek? Heuristic önceliklendirme:
  // - lowRatingsPerMonth >= 8 → filtreleme baskın
  // - currentGoogle <= 4.0 → headroom + filtreleme her ikisi
  // - reviewers >= 100 → Pulse AI zaman tasarrufu öne çıkar
  // - aksi → çoklu platform yönlendirme
  let leverageKey: 'filter' | 'rating' | 'ai' | 'platform' = 'platform';
  if (data.lowRatingsPerMonth >= 8) leverageKey = 'filter';
  else if (data.currentGoogle <= 4.0) leverageKey = 'rating';
  else if (data.reviewers >= 100) leverageKey = 'ai';

  const T = {
    tr: {
      summary: `${data.restaurantName} (${sector}) için ${plan} planı 12 ayda yaklaşık ${c}${fmt(Math.round(data.netGain))} net kazanç + ${data.roiMultiple.toFixed(1)}× ROI yansıtıyor. Aylık ${fmt(data.monthlyCustomers)} müşteriden ${fmt(data.reviewers)} yeni yorum çekilirken, mevcut ${fmt(data.lowRatingsPerMonth)} kötü yorumun ${fmt(data.filteredLowReviews)}'i Google'a sızmadan işletme sahibinin gelen kutusuna düşer. Sonuç: Google ortalaması ${data.currentGoogle.toFixed(1)} → ${data.projectedGoogle.toFixed(1)} ★, aylık ${fmt(data.newCustomers)} ek müşteri.`,
      highlight: {
        filter: `En yüksek kaldıraç: ayda ${fmt(data.filteredLowReviews)} kötü yorumun Google'a sızmadan filtrelenmesi — itibar koruması doğrudan dönüşüme yansır.`,
        rating: `En yüksek kaldıraç: mevcut ${data.currentGoogle.toFixed(1)} ★ ortalamasının headroom'u büyük; Buaze ile 90 gün içinde ${data.projectedGoogle.toFixed(1)}'e ulaşmak realistik.`,
        ai: `En yüksek kaldıraç: Pulse AI ile aylık ${data.aiHoursSaved.toFixed(1)} saatlik yanıt süresi tasarrufu — ekibin yorum yanıtlamak yerine müşteri deneyimine zaman ayırır.`,
        platform: `En yüksek kaldıraç: yüksek puanlı yorum akışının ${data.platforms.length} platforma normalize dağılımı — Google dışı kanallarda da görünürlük artar.`,
      }[leverageKey],
      nextSteps: [
        'İlk 7 gün: QR\'ı masa altlığı + kasa yanına yerleştir, kapı çıkışına ekran üstü tabela; tarama oranını ölç.',
        `Plan ${plan} → ${c}${fmt(data.planPrice)}/ay; Pulse AI taslak yanıtlarını ilk 2 hafta her yorum için onayla — model işletme tonuna kalibre olsun.`,
        `Aktif platformların (${data.platforms.length} adet) URL'lerini admin panelden gir; yüksek puanlı akışın doğru yerlere gitmesi için.`,
      ],
    },
    en: {
      summary: `For ${data.restaurantName} (${sector}), the ${plan} plan projects roughly ${c}${fmt(Math.round(data.netGain))} annual net gain at ${data.roiMultiple.toFixed(1)}× ROI. Monthly ${fmt(data.monthlyCustomers)} customers convert into ${fmt(data.reviewers)} new reviews, while ${fmt(data.filteredLowReviews)} of the current ${fmt(data.lowRatingsPerMonth)} low ratings stay off Google by routing to the internal form. Result: Google average ${data.currentGoogle.toFixed(1)} → ${data.projectedGoogle.toFixed(1)} ★, ${fmt(data.newCustomers)} extra customers/month.`,
      highlight: {
        filter: `Strongest leverage: filtering ${fmt(data.filteredLowReviews)} low reviews/month from leaking to Google — reputation protection translates directly into bookings.`,
        rating: `Strongest leverage: your ${data.currentGoogle.toFixed(1)} ★ has meaningful headroom; reaching ${data.projectedGoogle.toFixed(1)} within 90 days is realistic with Buaze.`,
        ai: `Strongest leverage: Pulse AI saves ${data.aiHoursSaved.toFixed(1)} hours/month of reply work — the team spends that time on guest experience instead.`,
        platform: `Strongest leverage: high-rating flow distributes across ${data.platforms.length} platforms — visibility grows beyond Google alone.`,
      }[leverageKey],
      nextSteps: [
        'Days 1-7: place QR on table tents + cashier + exit; measure scan rate.',
        `${plan} plan at ${c}${fmt(data.planPrice)}/mo — approve every Pulse AI draft for the first 2 weeks so the model calibrates to your tone.`,
        `Add URLs for all ${data.platforms.length} active platforms in the admin panel so high-rating flow routes correctly.`,
      ],
    },
  };

  const block = isTr ? T.tr : T.en;
  return {
    summary: block.summary,
    highlight: block.highlight,
    nextSteps: block.nextSteps,
    source: 'template',
  };
}
