// Denetim Merkezi — sonuç sayfası yardımcıları (spec §6.5, C5). Saf, DB'siz.
//
// `responses` listesi artık `take: 500` ile kesilmiş satırlardan değil,
// TÜM filtrelenmiş küme üzerindeki aggregate'lerden beslenir:
//   • histogram → `groupBy({ by: ['score'] })` satırlarından `bucketScores()`
//   • geçme oranı → passedCount / passedEvaluated (`passRate()`)

export interface ScoreDistributionBucket {
  /** '0-9', '10-19', … '90-100' */
  bucket: string;
  min: number;
  max: number;
  count: number;
}

/** `groupBy({ by: ['score'], _count: { _all: true } })` satırı (veya düz sayı). */
export interface ScoreGroupRow {
  score: number | null;
  _count?: number | { _all?: number } | null;
}

function countOf(row: ScoreGroupRow): number {
  const c = row._count;
  if (typeof c === 'number') return c;
  if (c && typeof c === 'object' && typeof c._all === 'number') return c._all;
  return 0;
}

/**
 * 10 kovalık histogram (0-9, 10-19, … 90-100). 100 puan son kovaya girer.
 * `score: null` satırlar yok sayılır; aralık dışı değerler uç kovaya sıkıştırılır.
 * Kova toplamı = girdideki (null olmayan) satır sayıları toplamı.
 */
export function bucketScores(rows: readonly ScoreGroupRow[]): ScoreDistributionBucket[] {
  const buckets: ScoreDistributionBucket[] = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}-${i * 10 + 9}`,
    min: i * 10,
    max: i * 10 + 9,
    count: 0,
  }));
  buckets[9].max = 100;
  buckets[9].bucket = '90-100';

  for (const row of rows) {
    if (row.score === null || row.score === undefined || !Number.isFinite(row.score)) continue;
    const idx = Math.max(0, Math.min(9, Math.floor(row.score / 10)));
    buckets[idx].count += countOf(row);
  }
  return buckets;
}

/**
 * Geçme oranı (0-100 tam sayı yüzde). Geçme puanı yoksa veya değerlendirilen
 * yanıt yoksa `null` — UI tile'ı bu durumda hiç göstermez (spec §3.6).
 */
export function passRate(
  passedCount: number,
  passedEvaluated: number,
  passingScore: number | null | undefined,
): number | null {
  if (passingScore === null || passingScore === undefined) return null;
  if (!(passedEvaluated > 0)) return null;
  return Math.round((passedCount / passedEvaluated) * 100);
}

export type AuditRange = '7d' | '30d' | '90d' | 'all';

/**
 * `range` query param'ı → başlangıç tarihi. '7d' | '30d' | '90d' dışındaki
 * her şey (null, 'all', bilinmeyen) → `null` (sınırsız). Responses ve summary
 * rotaları aynı kuralı paylaşır.
 */
export function parseAuditRangeStart(
  range: string | null | undefined,
  now: number = Date.now(),
): Date | null {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  return days === null ? null : new Date(now - days * 24 * 60 * 60 * 1000);
}

/** Güvenli sayfalama parametreleri: page ≥ 1, pageSize 1..100 (varsayılan 50). */
export function parsePaging(
  pageRaw: string | null | undefined,
  pageSizeRaw: string | null | undefined,
  defaults: { pageSize?: number; maxPageSize?: number; maxPage?: number } = {},
): { page: number; pageSize: number; skip: number } {
  const maxPageSize = defaults.maxPageSize ?? 100;
  const maxPage = defaults.maxPage ?? 10_000;
  const pageNum = Number.parseInt(pageRaw ?? '', 10);
  const sizeNum = Number.parseInt(pageSizeRaw ?? '', 10);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.min(pageNum, maxPage) : 1;
  const pageSize =
    Number.isFinite(sizeNum) && sizeNum >= 1
      ? Math.min(sizeNum, maxPageSize)
      : Math.min(defaults.pageSize ?? 50, maxPageSize);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
