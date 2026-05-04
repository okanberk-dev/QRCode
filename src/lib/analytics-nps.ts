// Phase 8c+ §38.34 — NPS (Net Promoter Score) saf hesap helper.
// Tasarım kaynağı: .design-owner-2026/project/page-analytics.jsx KPI 4-card
// "NPS SKORU 64 +12" + "Promoter %78".
//
// Buaze rating 1-5 → standart 0-10 NPS scale heuristic mapping:
//   - 5★ → promoter (P) — 9-10 NPS bracket
//   - 4★ → passive — 7-8 NPS bracket
//   - 1-3★ → detractor (D) — 0-6 NPS bracket
//
// NPS = (P% - D%) — sonuç -100..+100 range.
// Boş input → tüm field 0 (UI tarafında "—" render edilebilir).
//
// Saf fonksiyon — DB çağrısı yok, caller `prisma.feedback.findMany({
// select: { rating: true } })` ile çekip helper'a geçer. Test edilebilir.

export interface NpsInput {
  rating: number;
}

export interface NpsResult {
  /** -100..+100; 0 input → 0. */
  npsScore: number;
  /** rating === 5 count. */
  promoters: number;
  /** rating === 4 count. */
  passives: number;
  /** rating ≤ 3 count. */
  detractors: number;
  /** Toplam değerlendirilen feedback (rating > 0 olanlar). */
  total: number;
  /** promoters / total × 100 (0..100). UI "Promoter %78" gösterimi için. */
  promoterPct: number;
}

export function calculateNPS(feedbacks: NpsInput[]): NpsResult {
  const empty: NpsResult = {
    npsScore: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    total: 0,
    promoterPct: 0,
  };
  if (feedbacks.length === 0) return empty;

  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let total = 0;

  for (const f of feedbacks) {
    const r = f.rating;
    // rating 0 / null / NaN — feedback rating taşımıyor, NPS hesabına dahil değil
    if (!Number.isFinite(r) || r <= 0) continue;
    total += 1;
    if (r >= 5) promoters += 1;
    else if (r >= 4) passives += 1;
    else detractors += 1; // 1-3
  }

  if (total === 0) return empty;

  const promoterPct = (promoters / total) * 100;
  const detractorPct = (detractors / total) * 100;
  // NPS klasik formülü: P% - D% (passives ignore edilir)
  const npsScore = Math.round(promoterPct - detractorPct);

  return {
    npsScore,
    promoters,
    passives,
    detractors,
    total,
    promoterPct: Math.round(promoterPct),
  };
}
