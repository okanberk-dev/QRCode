// Stage 16 §38.86 — Realtime activity feed React hook.
//
// Sorumluluklar:
//  1. /api/realtime/token endpoint'inden JWT al
//  2. Supabase singleton'a setAuth(token) yaz
//  3. Postgres `feedback` tablosuna INSERT subscribe et (filter:
//     restaurant_id=in.(...)). Tablo adı tekil — Prisma model `Feedback`
//     `@@map("feedback")` kullanıyor (CLAUDE.md schema reference).
//  4. Incoming row'ları activity event'e çevir + 200ms debounce'lu buffer'a it
//  5. ~55min'de proactive token refresh (channel kopmaz)
//  6. Component unmount → channel kapat + flush timer iptal
//  7. Connection state expose et: connected / connecting / reconnecting / offline / disabled
//
// "Disabled" durumu: env yok veya sunucu 503/403 dönerse — sayfa
// reload-bazlı CANLI AKIŞ (CLAUDE.md §38.31) korunur, hook subscribe
// etmez. Bu sayede prod'da SUPABASE_JWT_SECRET unutulsa bile dashboard
// kırılmaz.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  bufferActivityEvents,
  feedbackInsertToActivity,
  type FeedbackInsertRow,
} from '@/lib/activity-feed-realtime';
import type { ActivityEvent } from '@/lib/activity-feed';
import {
  getSupabaseRealtimeClient,
  isRealtimeConfigured,
  peekSupabaseRealtimeClient,
  setRealtimeAuth,
} from '@/lib/supabase-realtime';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'disabled';

interface TokenResponse {
  token: string | null;
  expiresAt: number;
  restaurantIds: string[];
}

interface UseRealtimeActivityOptions {
  initialEvents: ActivityEvent[];
  /**
   * Businesses the feed is showing. Live INSERTs are limited to these (the
   * token covers the whole workspace). Omitted → every business in the token.
   */
  restaurantIds?: string[];
  isTr?: boolean;
  /** Buffer cap (default 50). */
  maxBufferSize?: number;
  /** Debounce flush ms (default 200 — task spec). */
  flushDebounceMs?: number;
}

export interface UseRealtimeActivityResult {
  events: ActivityEvent[];
  status: RealtimeStatus;
  /** En son eklenen event id'leri (slide-in animasyonu için). */
  newEventIds: Set<string>;
  /** Toast'ı dismiss etmek için event sayacı. */
  pendingToastCount: number;
  acknowledgeToast: () => void;
}

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function fetchRealtimeToken(): Promise<TokenResponse | null> {
  try {
    const res = await fetch('/api/realtime/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      // 401/403/429/503 → caller graceful degrade'e düşer
      return null;
    }
    const data = (await res.json()) as TokenResponse;
    return data;
  } catch {
    return null;
  }
}

export function useRealtimeActivity({
  initialEvents,
  restaurantIds,
  isTr = true,
  maxBufferSize = 50,
  flushDebounceMs = 200,
}: UseRealtimeActivityOptions): UseRealtimeActivityResult {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  // Stable dep for the subscription effect (callers pass a fresh array on
  // every server render).
  const scopeKey = restaurantIds ? [...restaurantIds].sort().join(',') : '';
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [pendingToastCount, setPendingToastCount] = useState(0);

  // Mutable refs (timers, queued events, channel handle) — re-render
  // tetiklemez, cleanup'ta dispose edilir.
  const pendingRef = useRef<ActivityEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newIdsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const acknowledgeToast = useCallback(() => {
    setPendingToastCount(0);
  }, []);

  const flushPending = useCallback(() => {
    if (!isMountedRef.current) return;
    const queued = pendingRef.current;
    pendingRef.current = [];
    flushTimerRef.current = null;
    if (queued.length === 0) return;
    setEvents((prev) =>
      bufferActivityEvents({ existing: prev, incoming: queued, maxSize: maxBufferSize }),
    );
    const queuedIds = queued.map((e) => e.id);
    setNewEventIds((prev) => {
      const next = new Set(prev);
      for (const id of queuedIds) next.add(id);
      return next;
    });
    setPendingToastCount((c) => c + queued.length);
    if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current);
    newIdsTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      // Slide-in highlight 1.2s sonra söner — render'a yeni eventId
      // setine yer bırakmamak için temizliyoruz.
      setNewEventIds(new Set());
      newIdsTimerRef.current = null;
    }, 1200);
  }, [maxBufferSize]);

  const enqueueEvent = useCallback(
    (event: ActivityEvent) => {
      pendingRef.current.push(event);
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flushPending, flushDebounceMs);
    },
    [flushPending, flushDebounceMs],
  );

  useEffect(() => {
    isMountedRef.current = true;
    let canceled = false;

    async function bootstrap() {
      if (!isRealtimeConfigured()) {
        setStatus('disabled');
        return;
      }
      setStatus('connecting');
      // The SDK loads lazily; fetch the token meanwhile (creating the client
      // opens no connection — the channel subscribe below does).
      const [client, tokenResponse] = await Promise.all([
        getSupabaseRealtimeClient(),
        fetchRealtimeToken(),
      ]);
      if (canceled) return;
      if (!client) {
        setStatus('disabled');
        return;
      }
      // Only the businesses this feed shows — otherwise a review for another
      // business would be pushed into the selected business's feed.
      const wanted = scopeKey ? new Set(scopeKey.split(',')) : null;
      const feedRestaurantIds = (tokenResponse?.restaurantIds ?? []).filter(
        (id) => !wanted || wanted.has(id),
      );
      if (!tokenResponse || !tokenResponse.token || feedRestaurantIds.length === 0) {
        setStatus('disabled');
        return;
      }
      setRealtimeAuth(tokenResponse.token);

      // Filter: restaurant_id IN (...). Supabase `in.` filter requires a
      // CSV value (no surrounding parens). We cap to 50 ids; owner panel
      // typically has 1-5 restaurants, but defensive cap avoids URL/header
      // bloat if scope grows unexpectedly.
      const idsForFilter = feedRestaurantIds.slice(0, 50).join(',');
      const channel = client
        .channel(`activity-feed:${feedRestaurantIds[0]}`, {
          config: {
            // Acknowledgement değeri INSERT event'lerine gerekmiyor; default
            // ack:false. Broadcast self yok (server push).
            broadcast: { ack: false, self: false },
            presence: { key: '' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            // Postgres tablosu `public.feedback` (tekil) — Prisma
            // `@@map("feedback")` ile bağlı. `feedbacks` (çoğul) yazmak
            // CHANNEL_ERROR + Pasif badge ile sonuçlanır.
            table: 'feedback',
            filter: `restaurant_id=in.(${idsForFilter})`,
          },
          (payload) => {
            const row = payload.new as FeedbackInsertRow | null;
            if (!row) return;
            const event = feedbackInsertToActivity(row, isTr);
            if (event) enqueueEvent(event);
          },
        )
        .subscribe((subscriptionStatus) => {
          if (canceled) return;
          // supabase-js status enum: SUBSCRIBED | CHANNEL_ERROR |
          // TIMED_OUT | CLOSED. RealtimeChannel verir; davranış:
          //  SUBSCRIBED   → connected
          //  CHANNEL_ERROR / TIMED_OUT → reconnecting (otomatik retry)
          //  CLOSED       → offline (manuel resubscribe gerek)
          if (subscriptionStatus === 'SUBSCRIBED') setStatus('connected');
          else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT')
            setStatus('reconnecting');
          else if (subscriptionStatus === 'CLOSED') setStatus('offline');
        });

      channelRef.current = channel;

      // Token refresh — exp - 5min'de yeniden mint et + setAuth.
      const refreshDelay = Math.max(60_000, tokenResponse.expiresAt - Date.now() - TOKEN_REFRESH_MARGIN_MS);
      refreshTimerRef.current = setTimeout(async function refresh() {
        const next = await fetchRealtimeToken();
        if (canceled || !next || !next.token) return;
        setRealtimeAuth(next.token);
        const nextDelay = Math.max(60_000, next.expiresAt - Date.now() - TOKEN_REFRESH_MARGIN_MS);
        refreshTimerRef.current = setTimeout(refresh, nextDelay);
      }, refreshDelay);
    }

    bootstrap();

    return () => {
      canceled = true;
      isMountedRef.current = false;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (newIdsTimerRef.current) {
        clearTimeout(newIdsTimerRef.current);
        newIdsTimerRef.current = null;
      }
      const client = peekSupabaseRealtimeClient();
      if (client && channelRef.current) {
        client.removeChannel(channelRef.current).catch(() => {
          // teardown best-effort; uygulama kapanırken hata yutma kabul edilir
        });
        channelRef.current = null;
      }
    };
    // initialEvents kasten dep listinde değil — yalnız mount'ta okunur.
    // A business switch must remount the feed (ActivityFeed is keyed by its
    // business scope on the dashboard) so the seed list is replaced too.
  }, [enqueueEvent, isTr, scopeKey]);

  return {
    events,
    status,
    newEventIds,
    pendingToastCount,
    acknowledgeToast,
  };
}
