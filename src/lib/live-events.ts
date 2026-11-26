/**
 * In-process event bus for the owner dashboard live feed (CLAUDE.md §55).
 * Replaces Supabase Realtime: POST /api/feedback publishes the new row,
 * GET /api/realtime/activity (Server-Sent Events) forwards it to the owners
 * of that business.
 *
 * Production runs one long-lived Node process (Coolify), so an in-process
 * bus reaches every open dashboard. With several app instances this would
 * need Postgres LISTEN/NOTIFY instead. During a deploy the browsers simply
 * reconnect to the new container.
 */
import { EventEmitter } from 'node:events';
import type { FeedbackInsertRow } from './activity-feed-realtime';

const holder = globalThis as unknown as { __buazeLiveBus?: EventEmitter };
const bus = holder.__buazeLiveBus ?? (holder.__buazeLiveBus = new EventEmitter());
// One listener per open dashboard tab; not a leak.
bus.setMaxListeners(0);

const FEEDBACK = 'feedback';

/** Only the fields the feed renders; never e-mail, phone, IP or comment. */
export function toLiveFeedbackRow(f: {
  id: string;
  name: string | null;
  rating: number;
  platform: string | null;
  createdAt: Date;
  restaurantId: string | null;
  hasKvkkConsent: boolean;
  redirected?: boolean;
}): FeedbackInsertRow {
  return {
    id: f.id,
    name: f.name,
    rating: f.rating,
    platform: f.platform,
    created_at: f.createdAt.toISOString(),
    restaurant_id: f.restaurantId,
    has_kvkk_consent: f.hasKvkkConsent,
    redirected: f.redirected === true,
  };
}

export function publishFeedbackCreated(row: FeedbackInsertRow): void {
  if (!row.restaurant_id) return;
  bus.emit(FEEDBACK, row);
}

/** Calls `onRow` for new feedback of these businesses; returns the unsubscribe. */
export function subscribeFeedback(
  restaurantIds: ReadonlySet<string>,
  onRow: (row: FeedbackInsertRow) => void,
): () => void {
  const handler = (row: FeedbackInsertRow) => {
    if (row.restaurant_id && restaurantIds.has(row.restaurant_id)) onRow(row);
  };
  bus.on(FEEDBACK, handler);
  return () => {
    bus.off(FEEDBACK, handler);
  };
}

export function liveFeedbackSubscriberCount(): number {
  return bus.listenerCount(FEEDBACK);
}

// ─── loyalty card (customer's phone, CLAUDE.md §61) ───────────────────────

export type LoyaltyChangeType = 'earn' | 'redeem' | 'birthday' | 'adjust';

/** Only what the card page needs to animate; never names, phones or tokens. */
export interface LoyaltyChange {
  type: LoyaltyChangeType;
  amount: number;
  balance: number;
  rewardTitle?: string | null;
}

const loyaltyChannel = (memberId: string) => `loyalty:${memberId}`;

export function publishLoyaltyChange(memberId: string, change: LoyaltyChange): void {
  bus.emit(loyaltyChannel(memberId), change);
}

/** Calls `onChange` when the counter changes this card; returns the unsubscribe. */
export function subscribeLoyaltyMember(memberId: string, onChange: (change: LoyaltyChange) => void): () => void {
  const name = loyaltyChannel(memberId);
  bus.on(name, onChange);
  return () => {
    bus.off(name, onChange);
  };
}
