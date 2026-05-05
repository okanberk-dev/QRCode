// Phase 8c — Owner Customers CRM segment + LTV + sentiment helpers
// (CLAUDE.md §38.16). Saf fonksiyonlar — DB/network'a bağımsız, deterministik,
// test edilebilir. Caller (API list/detail/export + UI server component)
// raw aggregate row üstüne bu helper'ları map ile uygular.

export type CustomerSegment = 'new' | 'risk' | 'vip' | 'loyal' | 'churned';
export type CustomerSentiment = 'pos' | 'neu' | 'neg';

// Phase 8c+ (CLAUDE.md §38.22) — segment + sentiment görsel renk eşlemesi.
// 5 callsite (admin/customers + drawer + dashboard + owner/customers + mail
// template) artık tek source-of-truth'tan okur, drift sıfır. Caller yine
// kendi JSX/HTML'ini render eder; yalnız renk + ikon adı paylaşılır.
//
// `bg` light card backgrounds (admin + owner + dashboard + mail), `fg`
// foreground text/icon. Mail template Pulse light-card variant'la birebir
// uyumlu. Dark card (drawer'da kullanılmaz; drawer chip aynı light palette
// kullanır çünkü dark drawer üstünde light pill ok'tur).
//
// §38.47 — `churned` segment eklendi (CLAUDE.md §38.36 backlog kapanışı,
// tasarım .design-owner-2026/page-customers.jsx 6. chip parity). Görsel
// muted ghost paletti (n100 bg + n500 fg + archive icon) — "kayıp" sinyali
// agresif kırmızı değil, sade etiket. Risk = aktif memnuniyetsizlik (red),
// Churned = sessiz bırakma (ghost) ayrımı.
export const SEGMENT_COLOR_MAP: Record<
  CustomerSegment,
  { bg: string; fg: string; iconName: 'crown' | 'check' | 'sparkles' | 'alert' | 'archive' }
> = {
  vip: { bg: '#0A0A0A', fg: '#FFFFFF', iconName: 'crown' },
  loyal: { bg: '#EAF9B8', fg: '#0A0A0A', iconName: 'check' },
  new: { bg: '#DBEAFE', fg: '#1E40AF', iconName: 'sparkles' },
  risk: { bg: '#FEE2E2', fg: '#991B1B', iconName: 'alert' },
  churned: { bg: '#F5F5F5', fg: '#737373', iconName: 'archive' },
};

// Sentiment dot+label renk eşlemesi — 3 callsite (admin/customers inline +
// drawer SentimentBadge + owner/customers SentimentCell). Bu PR'da
// `<SentimentBadge variant>` primitive'i extract edildi; const tek source.
export const SENTIMENT_COLOR_MAP: Record<CustomerSentiment, string> = {
  pos: '#16A34A',
  neu: '#A3A3A3',
  neg: '#DC2626',
};

export interface SegmentInput {
  /** Total feedback count for the customer (within selected range). */
  visits: number;
  /** Mean rating across the visits, or null when no rating present. */
  avgRating: number | null;
  /**
   * §38.47 — Days since last visit. Required for `churned` detection.
   * Optional for backwards-compat: caller'lar geçmedikçe churned bucket'a
   * düşmez (legacy davranış intact).
   */
  daysSinceLastVisit?: number | null;
}

// Konservatif eşikler (kullanıcı kararı, CLAUDE.md §38.16 + §38.47):
// - churned: daysSinceLastVisit > 90 && visits ≥ 2 → uzun süre dönmemiş tanıdık misafir
// - new:     visits ≤ 2                            → yeni misafir, profil olgunlaşmamış
// - risk:    avgRating < 3.0 && visits ≥ 2        → memnuniyetsiz + tekrar gelmiş
// - vip:     visits ≥ 5 && avgRating ≥ 4.0        → sadık + yüksek puan
// - loyal:   default fallback
//
// Öncelik: churned → new → risk → vip → loyal.
//
// `churned` ilk: 90 gün dönmemiş VIP olsa bile "kayıp" durumu daha aktüel
// (owner için görsel uyarı: bir zamanlar değerli, şimdi sessiz). Tek-ziyaretli
// müşteri churned olmaz çünkü "yeni denemiş, beğenmemiş" ile "sadık + kaybedildi"
// karışmasın — `visits ≥ 2` zorunlu.
//
// `new` ikinci: visits ≤ 2 olan müşteriye risk/vip yapıştırmak yetersiz
// örneklem nedeniyle yanıltıcı; profil olgunlaşana kadar "new" segment'i bekletir.
//
// Risk'i VIP'ten önce eleyerek avgRating < 3 + visits ≥ 5 durumunda VIP yerine
// Risk seçilmesini sağlar (memnuniyetsizlik signal'i sadakat signal'ından kritik).
export function computeSegment({ visits, avgRating, daysSinceLastVisit }: SegmentInput): CustomerSegment {
  if (
    typeof daysSinceLastVisit === 'number' &&
    daysSinceLastVisit > 90 &&
    visits >= 2
  ) {
    return 'churned';
  }
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

// §38.47 — Last topic deterministik label (per-customer AI çağrısı pahalı,
// 10K müşteri × $0.0005 = $5/render kabul edilemez). Schema'daki
// foodRating/serviceRating/atmosphereRating opsiyonel sub-rating'lerinden
// en düşük olan = ana şikayet konusu. Hiç sub-rating yoksa rating-based
// fallback (Olumlu/Karışık/Şikayet). Caller en son feedback'in alanlarını
// geçirir; helper saf fonksiyon.
//
// Tasarım örnekleri (.design-owner-2026/page-customers.jsx): "Servis",
// "Bekleme", "Atmosfer", "Menü", "Genel", "Yemek", "Fiyat". Aspect-bazlı
// label bu örneklerle uyumlu (Servis/Yemek/Atmosfer doğrudan; diğerleri
// rating-fallback ile kapsanır).
export interface LastTopicInput {
  rating: number | null;
  foodRating?: number | null;
  serviceRating?: number | null;
  atmosphereRating?: number | null;
}

export function computeLastTopic(input: LastTopicInput, locale: 'tr' | 'en' = 'tr'): string {
  const isTr = locale === 'tr';
  const aspects: Array<{ name: string; val: number }> = [];
  if (typeof input.foodRating === 'number') {
    aspects.push({ name: isTr ? 'Yemek' : 'Food', val: input.foodRating });
  }
  if (typeof input.serviceRating === 'number') {
    aspects.push({ name: isTr ? 'Servis' : 'Service', val: input.serviceRating });
  }
  if (typeof input.atmosphereRating === 'number') {
    aspects.push({ name: isTr ? 'Atmosfer' : 'Atmosphere', val: input.atmosphereRating });
  }

  // Aspect varsa: en düşük puanlı alanı konu olarak göster (≤3 → şikayet
  // konusu; ≥4 → olumlu olduğu konu). Sub-rating'i en düşük olan en
  // bilgilendirici sinyal — owner "neresi sorun" hızlıca anlar.
  if (aspects.length > 0) {
    const lowest = aspects.reduce((a, b) => (a.val < b.val ? a : b));
    return lowest.name;
  }

  // Rating fallback — sub-rating verilmemiş (public review formu opsiyonel
  // sorduğu için sparse data, CLAUDE.md §34.9 paterni). Rating-bazlı genel
  // duygu etiketi yine anlamlı.
  if (input.rating === null) return '—';
  if (input.rating <= 2) return isTr ? 'Şikayet' : 'Complaint';
  if (input.rating === 3) return isTr ? 'Karışık' : 'Mixed';
  if (input.rating >= 4) return isTr ? 'Olumlu' : 'Praise';
  return '—';
}

// §38.47 — Last channel/source label. `Feedback.platform` (google /
// yemeksepeti / getir / vb.) → kısa human-readable label. null = "Buaze QR"
// (mevcut platform=null + rating ≥4 paterni, CLAUDE.md §38.34 + §38.35
// "Buaze QR" runtime label).
//
// Pulse 11-platform taxonomy ile uyumlu (CLAUDE.md §19.4). Bilinmeyen
// platform string'leri "Diğer" / "Other" fallback (defansif — sadece bilinen
// label'lar için özel display, drift'e bağışıklık).
const CHANNEL_LABELS_TR: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
};

const CHANNEL_LABELS_EN: Record<string, string> = {
  ...CHANNEL_LABELS_TR,
  // EN'de TR'den farklı tek-iki etiket (tüm platform marka isimleri ortak).
};

export function computeLastChannel(
  platform: string | null | undefined,
  locale: 'tr' | 'en' = 'tr',
): string {
  const isTr = locale === 'tr';
  if (!platform) return isTr ? 'Buaze QR' : 'Buaze QR';
  const map = isTr ? CHANNEL_LABELS_TR : CHANNEL_LABELS_EN;
  return map[platform.toLowerCase()] ?? (isTr ? 'Diğer' : 'Other');
}

// §38.48 Wave 2 — Customer overlay helpers.
//
// `applyArchiveOverlay` archived contact_key'leri filter eder. Caller
// `?showArchived=1` ile bypass etmek isterse `archivedKeys` undefined geçirir
// (helper hiç filter uygulamaz). Archived `Set<string>` daha hızlı membership
// check (binlerce müşteride O(1) vs O(n) array.includes).
export function applyArchiveOverlay<T extends { restaurant_id: string; contact_key: string }>(
  rows: T[],
  archivedKeys: Set<string> | undefined,
): T[] {
  if (!archivedKeys || archivedKeys.size === 0) return rows;
  return rows.filter((r) => !archivedKeys.has(`${r.restaurant_id}|${r.contact_key}`));
}

// `applySegmentOverride` derived segment'i manuel override ile replace eder.
// Owner panel "Segmentle ekle" bulk action ile contact_key başına manualSegment
// kaydedilir; bu helper UI/CSV-side derive sırasında override'ı uygular.
//
// Map key: `${restaurantId}|${contactKey}`, value: CustomerSegment. Map yoksa
// veya boşsa original `derived.segment` korunur.
export function applySegmentOverride(
  derivedSegment: CustomerSegment,
  overrideKey: string,
  overrides: Map<string, CustomerSegment> | undefined,
): CustomerSegment {
  if (!overrides || overrides.size === 0) return derivedSegment;
  return overrides.get(overrideKey) ?? derivedSegment;
}

// Convenience aggregate — caller bir satır için tüm helper'ları tek seferde
// uygulamak isterse. List endpoint, detail endpoint, export endpoint ve UI
// hepsi aynı output şeklini bekler — DRY pattern.
//
// §38.47 — `lastTopic` ve `lastChannel` opsiyonel input'larla genişletildi.
// `lastTopicInput` veya `lastPlatform` geçilmezse helper undefined döner;
// caller (drawer veya UI) field gerektirmiyorsa input'u skip edebilir.
export interface CustomerDerivedFields {
  segment: CustomerSegment;
  ltv: number;
  sentiment: CustomerSentiment;
  daysSinceLastVisit: number | null;
  lastTopic?: string;
  lastChannel?: string;
}

export function deriveCustomerFields(input: {
  visits: number;
  avgRating: number | null;
  lastAt: Date | string | null;
  now?: Date;
  /** §38.47 — son feedback'in rating + aspect alanları (lastTopic için). */
  lastTopicInput?: LastTopicInput;
  /** §38.47 — son feedback'in platform alanı (lastChannel için). */
  lastPlatform?: string | null;
  /** §38.47 — TR/EN locale (lastTopic + lastChannel label'ları). */
  locale?: 'tr' | 'en';
}): CustomerDerivedFields {
  const days = computeDaysSinceLastVisit(input.lastAt, input.now);
  return {
    segment: computeSegment({
      visits: input.visits,
      avgRating: input.avgRating,
      daysSinceLastVisit: days,
    }),
    ltv: computeLTV({ visits: input.visits, avgRating: input.avgRating }),
    sentiment: computeSentiment(input.avgRating),
    daysSinceLastVisit: days,
    ...(input.lastTopicInput
      ? { lastTopic: computeLastTopic(input.lastTopicInput, input.locale) }
      : {}),
    ...(input.lastPlatform !== undefined
      ? { lastChannel: computeLastChannel(input.lastPlatform, input.locale) }
      : {}),
  };
}
