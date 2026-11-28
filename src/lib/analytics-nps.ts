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

export type NpsBucketKind = 'promoter' | 'passive' | 'detractor';

/**
 * Tek bir puanın NPS kovası — admin BI dağılımı + KPI aynı tanımı kullanır
 * (5★ promoter, 4★ passive, 1-3★ detractor). Geçersiz/0 puan → null.
 */
export function npsBucketForRating(rating: number): NpsBucketKind | null {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  if (rating >= 5) return 'promoter';
  if (rating >= 4) return 'passive';
  return 'detractor';
}

/**
 * Puan başına sayım listesinden NPS (ör. `prisma.feedback.groupBy({ by:
 * ['rating'] })` çıktısı). `calculateNPS` ile birebir aynı sonucu verir;
 * büyük pencerelerde satır satır dizi kurmadan hesaplamak için.
 */
export function calculateNPSFromCounts(
  counts: Array<{ rating: number; count: number }>,
): NpsResult {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const { rating, count } of counts) {
    if (!Number.isFinite(count) || count <= 0) continue;
    const bucket = npsBucketForRating(rating);
    if (bucket === 'promoter') promoters += count;
    else if (bucket === 'passive') passives += count;
    else if (bucket === 'detractor') detractors += count;
  }
  const total = promoters + passives + detractors;
  if (total === 0) {
    return { npsScore: 0, promoters: 0, passives: 0, detractors: 0, total: 0, promoterPct: 0 };
  }
  const promoterPct = (promoters / total) * 100;
  const detractorPct = (detractors / total) * 100;
  // NPS klasik formülü: P% - D% (passives ignore edilir)
  return {
    npsScore: Math.round(promoterPct - detractorPct),
    promoters,
    passives,
    detractors,
    total,
    promoterPct: Math.round(promoterPct),
  };
}

export function calculateNPS(feedbacks: NpsInput[]): NpsResult {
  return calculateNPSFromCounts(feedbacks.map((f) => ({ rating: f.rating, count: 1 })));
}

/**
 * "Memnuniyet farkı" card (2026-11-28): the NPS-style score in plain words.
 * Value is signed ("+31", "−12", "0"); the line under it shows the two
 * shares the score comes from. `null` when there are no ratings.
 */
export function satisfactionDisplay(result: NpsResult, isTr: boolean): { value: string; subtitle: string } | null {
  if (result.total <= 0) return null;
  const s = result.npsScore;
  const value = `${s > 0 ? '+' : s < 0 ? '−' : ''}${Math.abs(s)}`;
  const happy = Math.round((result.promoters / result.total) * 100);
  const unhappy = Math.round((result.detractors / result.total) * 100);
  // Star bands are in the card's ⓘ; the line stays short enough for one row.
  const subtitle = isTr
    ? `%${happy}\u00a0memnun · %${unhappy}\u00a0memnun\u00a0değil`
    : `${happy}%\u00a0happy · ${unhappy}%\u00a0unhappy`;
  return { value, subtitle };
}
