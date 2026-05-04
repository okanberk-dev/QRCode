// Phase 8c — Owner Customers CRM segment + LTV + sentiment helpers
// (CLAUDE.md §38.16). Saf fonksiyonlar — DB/network'a bağımsız, deterministik,
// test edilebilir. Caller (API list/detail/export + UI server component)
// raw aggregate row üstüne bu helper'ları map ile uygular.

export type CustomerSegment = 'new' | 'risk' | 'vip' | 'loyal';
export type CustomerSentiment = 'pos' | 'neu' | 'neg';

export interface SegmentInput {
  /** Total feedback count for the customer (within selected range). */
  visits: number;
  /** Mean rating across the visits, or null when no rating present. */
  avgRating: number | null;
}

// Konservatif eşikler (kullanıcı kararı, CLAUDE.md §38.16):
// - new:   visits ≤ 2                       → yeni misafir, profil olgunlaşmamış
// - risk:  avgRating < 3.0 && visits ≥ 2   → memnuniyetsiz + tekrar gelmiş
// - vip:   visits ≥ 5 && avgRating ≥ 4.0   → sadık + yüksek puan
// - loyal: default fallback
//
// Öncelik: new → risk → vip → loyal. "new" ilk önce çünkü visits ≤ 2 olan
// müşteriye risk/vip yapıştırmak yetersiz örneklem nedeniyle yanıltıcı; profil
// olgunlaşana kadar "new" segment'i bekletir. Risk'i VIP'ten önce eleyerek
// avgRating < 3 + visits ≥ 5 (örneğin) durumunda VIP yerine Risk seçilmesini
// sağlar (memnuniyetsizlik signal'i sadakat signal'ından kritik).
export function computeSegment({ visits, avgRating }: SegmentInput): CustomerSegment {
  if (visits <= 2) return 'new';
  if (avgRating !== null && avgRating < 3.0 && visits >= 2) return 'risk';
  if (visits >= 5 && avgRating !== null && avgRating >= 4.0) return 'vip';
  return 'loyal';
}

export interface LtvInput {
  visits: number;
  avgRating: number | null;
}

// LTV proxy — gerçek satış verisi yok, feedback frekansı + memnuniyet skoru
// heuristic (kullanıcı kararı, CLAUDE.md §38.16: visits × avgRating × 10).
// avgRating null → 3.0 (neutral fallback) varsay; iletişim verisi olan her
// müşterinin bir "etkileşim ağırlığı" olur, "0 LTV" görünmez.
//
// Çıktı: numeric (UI birimsiz görüntüler — para birimi iddiası yok). Owner
// panelinde sıralama + segmentasyon ipucu olarak kullanılır.
export function computeLTV({ visits, avgRating }: LtvInput): number {
  const rating = avgRating ?? 3.0;
  return Math.round(visits * rating * 10);
}

// 3-tier sentiment — avgRating'i pos/neu/neg bucket'a indirger.
// Eşikler tasarımdaki Sparkbar (>=70 pos / 50-69 neu / <50 neg) renkleriyle
// uyumlu; avgRating × 20 mantığında: 3.5★ → 70 (pos eşiği), 2.5★ → 50 (neu
// eşiği). null → neu (yorum yapmamış müşteri için "tarafsız" varsayım).
export function computeSentiment(avgRating: number | null): CustomerSentiment {
  if (avgRating === null) return 'neu';
  if (avgRating >= 3.5) return 'pos';
  if (avgRating < 2.5) return 'neg';
  return 'neu';
}

// "Days since last visit" — UI relative gösterim için.
// lastAt null → null (anonim/eksik veri için "—" render edilir).
export function computeDaysSinceLastVisit(
  lastAt: Date | string | null,
  now: Date = new Date(),
): number | null {
  if (!lastAt) return null;
  const ts = new Date(lastAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const ms = now.getTime() - ts;
  if (ms < 0) return 0; // future-dated edge guard
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Convenience aggregate — caller bir satır için 3 helper'ı tek seferde
// uygulamak isterse. List endpoint, detail endpoint, export endpoint ve UI
// hepsi aynı output şeklini bekler — DRY pattern.
export interface CustomerDerivedFields {
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  daysSinceLastVisit: number | null;
}

export function deriveCustomerFields(input: {
  visits: number;
  avgRating: number | null;
  lastAt: Date | string | null;
  now?: Date;
}): CustomerDerivedFields {
  return {
    segment: computeSegment({ visits: input.visits, avgRating: input.avgRating }),
    ltv: computeLTV({ visits: input.visits, avgRating: input.avgRating }),
    sentiment: computeSentiment(input.avgRating),
    daysSinceLastVisit: computeDaysSinceLastVisit(input.lastAt, input.now),
  };
}
