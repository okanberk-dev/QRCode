// Stage 16 §38.86 — Realtime activity buffer + feedback row → ActivityEvent
// adapter. Saf fonksiyonlar, deterministik. Test edilebilir.
//
// Kapsam:
//  - bufferActivityEvents: incoming + existing union, dedupe by id, sort
//    newest first, slice maxSize. Hook tarafında 200ms debounce ile flush
//    edilir (multiple INSERT 1 re-render'a bind eder).
//  - feedbackInsertToActivity: Supabase postgres_changes payload
//    (snake_case) → buildActivityFeed input shape → tek event döner.
//    Caller (`useRealtimeActivity`) sadece bunu çağırır.
//
// MVP scope (CLAUDE.md §38.86):
//  - Sadece Postgres `feedback` tablosuna INSERT subscribe edilir
//    (Prisma model `Feedback` @@map("feedback") — tekil tablo adı).
//  - `feedback_replies` (çoğul tablo) INSERT descoped — schema'da
//    restaurant_id direkt yok (sadece feedback_id), filter'da
//    `feedback_id IN (subquery)` Supabase Realtime tarafından
//    desteklenmiyor. Reply realtime için ya schema denormalize ya da
//    extra fetch lazım — gelecek scope.

import { buildActivityFeed, type ActivityEvent } from './activity-feed';

export interface BufferActivityEventsInput {
  existing: ActivityEvent[];
  incoming: ActivityEvent[];
  /** Default 50 — UI infinite scroll yok, 50 üstü üst-pencere. */
  maxSize?: number;
}

/**
 * Merge incoming events with existing buffer:
 *  - dedupe by `id` (existing wins — preserves stable react keys + scroll
 *    position in case of websocket replay)
 *  - sort by timestamp DESC (newest first)
 *  - slice top maxSize (oldest dropped)
 */
export function bufferActivityEvents({
  existing,
  incoming,
  maxSize = 50,
}: BufferActivityEventsInput): ActivityEvent[] {
  const ids = new Set(existing.map((e) => e.id));
  const newOnes = incoming.filter((e) => !ids.has(e.id));
  if (newOnes.length === 0) return existing;

  const merged = [...newOnes, ...existing];
  merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return merged.slice(0, maxSize);
}

// ---- Postgres row → ActivityEvent adapter ----

/**
 * Supabase Realtime postgres_changes INSERT payload row shape (subset we
 * care about). Column names are snake_case (Postgres native), unlike Prisma
 * client camelCase. We coerce dates from string ISO.
 */
export interface FeedbackInsertRow {
  id: string;
  name: string | null;
  rating: number | null;
  platform: string | null;
  created_at: string;
  restaurant_id: string | null;
  has_kvkk_consent: boolean | null;
  /** §58 high-rating redirect event. */
  redirected?: boolean | null;
}

/**
 * Convert a Realtime feedback INSERT row to an ActivityEvent using the
 * existing buildActivityFeed helper (single-element input, limit 1). This
 * keeps copy + sentiment + KVKK consent logic in ONE place — no drift
 * between server-render and realtime push paths (CLAUDE.md §7).
 */
export function feedbackInsertToActivity(
  row: FeedbackInsertRow,
  isTr = true,
): ActivityEvent | null {
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const events = buildActivityFeed({
    feedbacks: [
      {
        id: row.id,
        name: row.name,
        rating: row.rating,
        platform: row.platform,
        createdAt: created,
        restaurantId: row.restaurant_id,
        hasKvkkConsent: row.has_kvkk_consent,
        redirected: row.redirected === true,
      },
    ],
    replies: [],
    aiDrafts: [],
    systemEvents: [],
    limit: 1,
    isTr,
  });
  return events[0] ?? null;
}
