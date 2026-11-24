// Live activity feed React hook (CLAUDE.md §55).
//
//  1. Opens an EventSource on /api/realtime/activity (Server-Sent Events from
//     our own server; replaced Supabase Realtime in 2026-11)
//  2. Turns each `feedback` event into an activity item, 200 ms debounced
//  3. Exposes the connection state: connected / connecting / reconnecting /
//     offline / disabled. "disabled" = the stream closed before it opened
//     (signed out, no business): the reload-based feed stays as it is.
//
// The browser reconnects by itself; the server closes each stream after 30
// minutes so access is re-checked.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bufferActivityEvents,
  feedbackInsertToActivity,
  type FeedbackInsertRow,
} from '@/lib/activity-feed-realtime';
import type { ActivityEvent } from '@/lib/activity-feed';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'
  | 'disabled';


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
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setStatus('disabled');
      return;
    }
    setStatus('connecting');
    // Only the businesses this feed shows — otherwise a review for another
    // business would be pushed into the selected business's feed.
    const qs = scopeKey ? `?restaurantIds=${encodeURIComponent(scopeKey)}` : '';
    const source = new EventSource(`/api/realtime/activity${qs}`, { withCredentials: true });
    let opened = false;

    source.onopen = () => {
      opened = true;
      setStatus('connected');
    };
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        // Closed before it ever opened: not signed in, no business (204) or
        // the endpoint is off — keep the reload-based feed quietly.
        setStatus(opened ? 'offline' : 'disabled');
      } else {
        // The browser retries on its own (server sends `retry: 5000`).
        setStatus('reconnecting');
      }
    };
    source.addEventListener('feedback', (message) => {
      let row: FeedbackInsertRow;
      try {
        row = JSON.parse((message as MessageEvent<string>).data) as FeedbackInsertRow;
      } catch {
        return;
      }
      const event = feedbackInsertToActivity(row, isTr);
      if (event) enqueueEvent(event);
    });

    return () => {
      isMountedRef.current = false;
      source.close();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (newIdsTimerRef.current) {
        clearTimeout(newIdsTimerRef.current);
        newIdsTimerRef.current = null;
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
