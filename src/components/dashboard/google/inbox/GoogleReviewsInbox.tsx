'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CheckSquare,
  Inbox,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Unplug,
  X,
} from 'lucide-react';
import { AlertBanner, EmptyState, PanelSelectionBar, PulseMenu, PulseMenuItem, PulseSelect } from '@/components/ui';
import { blockedReplyMessage, issuesFromBody } from '@/components/reply/ReplyRiskNotice';
import { InboxReviewCard, type SendResult } from './InboxReviewCard';
import dynamic from 'next/dynamic';

// Loaded only when opened (§56): they are not part of the first view.
const InboxAnalysis = dynamic(() => import('./InboxAnalysis').then((m) => m.InboxAnalysis), { ssr: false });
const BulkReplyDialog = dynamic(() => import('./BulkReplyDialog').then((m) => m.BulkReplyDialog), { ssr: false });
const ReplySettingsDialog = dynamic(() => import('./ReplySettingsDialog').then((m) => m.ReplySettingsDialog), {
  ssr: false,
});
import {
  DEFAULT_FILTER,
  applyReplyDeleted,
  applyReplySent,
  errorCodeOf,
  filterToQuery,
  inboxErrorMessage,
  isFilterActive,
  neighbourAfter,
  removeReview,
  type InboxFilterState,
  type InboxListState,
  type InboxPage,
  type InboxReview,
  type InboxStatus,
} from './inbox-client';

const LEAVE_MS = 280;

function ago(iso: string | null, locale: 'tr' | 'en'): string {
  if (!iso) return locale === 'tr' ? 'henüz yok' : 'not yet';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const min = Math.max(0, Math.floor((Date.now() - ms) / 60_000));
  if (min < 1) return locale === 'tr' ? 'az önce' : 'just now';
  if (min < 60) return locale === 'tr' ? `${min} dk önce` : `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return locale === 'tr' ? `${h} sa önce` : `${h} h ago`;
  return locale === 'tr' ? `${Math.floor(h / 24)} gün önce` : `${Math.floor(h / 24)} d ago`;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

export interface GoogleReviewsInboxProps {
  restaurantId: string;
  restaurantName: string;
  locale: 'tr' | 'en';
  canWrite: boolean;
  aiEnabled: boolean;
  /** Google Maps profile, shown inside "Analiz". */
  profileSlot?: ReactNode;
  onDisconnect: () => void;
  /** A Google call said the connection must be renewed. */
  onConnectionProblem: () => void;
  /** First page of the default filter, prepared on the server (§56). */
  initialPage?: InboxPage | null;
  /** Connected Google location name, shown in the summary line (§58). */
  locationLabel?: string | null;
}

/** How long a cached inbox page is shown without asking the server again. */
const PAGE_FRESH_MS = 15_000;

class InboxLoadError extends Error {
  constructor(readonly code: string | null) {
    super('inbox load failed');
  }
}

const toListState = (page: InboxPage): InboxListState => ({
  items: page.items,
  matching: page.matching,
  summary: page.summary,
});

/**
 * Google review reply inbox (CLAUDE.md §54). Reads the stored reviews only;
 * Google is called to send/delete a reply, to draft (AI) and to sync.
 */
export function GoogleReviewsInbox({
  restaurantId,
  restaurantName,
  locale,
  canWrite,
  aiEnabled,
  profileSlot,
  onDisconnect,
  onConnectionProblem,
  initialPage,
  locationLabel,
}: GoogleReviewsInboxProps) {
  const isTr = locale === 'tr';
  const api = `/api/restaurants/${restaurantId}/google/business`;

  const [filter, setFilter] = useState<InboxFilterState>(DEFAULT_FILTER);
  const [qInput, setQInput] = useState('');
  const [list, setList] = useState<InboxListState | null>(initialPage ? toListState(initialPage) : null);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'running' | 'error'>('idle');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [openSignals, setOpenSignals] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectNotice, setSelectNotice] = useState<string | null>(null);
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<'inbox' | 'analysis'>('inbox');
  const [statsKey, setStatsKey] = useState(0);
  const autoSyncedRef = useRef(false);
  const seqRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const flagKey = `bz_google_review_flags:${restaurantId}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(flagKey);
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      setFlags(new Set(Array.isArray(arr) ? (arr as string[]) : []));
    } catch {
      setFlags(new Set());
    }
  }, [flagKey]);

  const toggleFlag = (reviewName: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(reviewName)) next.delete(reviewName);
      else next.add(reviewName);
      try {
        window.localStorage.setItem(flagKey, JSON.stringify(Array.from(next)));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  };

  // Debounced search.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilter((f) => (f.q === qInput ? f : { ...f, q: qInput }));
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  // §56 — one cache for inbox pages (React Query): each filter's first page
  // is kept for a short while, so switching Yanıtsız / Yanıtlandı / Tümü is
  // instant and only revalidates in the background. `listKeyRef` names the
  // filter the list on screen belongs to.
  const queryClient = useQueryClient();
  const queryKeyFor = useCallback(
    (f: InboxFilterState) => ['google-inbox', restaurantId, filterToQuery(f)] as const,
    [restaurantId],
  );
  const listKeyRef = useRef<string | null>(initialPage ? filterToQuery(DEFAULT_FILTER) : null);
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    if (initialPage) queryClient.setQueryData(queryKeyFor(DEFAULT_FILTER), initialPage);
  }

  const fetchPage = useCallback(
    async (f: InboxFilterState, extra: Record<string, string>): Promise<InboxPage> => {
      const res = await fetch(`${api}/inbox?${filterToQuery(f, extra)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new InboxLoadError(errorCodeOf(data));
      return data as InboxPage;
    },
    [api],
  );

  /** Fetch a filter's first page into the cache (no-op while it is fresh). */
  const prefetchFilter = useCallback(
    (f: InboxFilterState) =>
      queryClient
        .prefetchQuery({ queryKey: queryKeyFor(f), queryFn: () => fetchPage(f, { limit: '20' }), staleTime: PAGE_FRESH_MS })
        .catch(() => undefined),
    [fetchPage, queryClient, queryKeyFor],
  );

  // A reply changes which tab a review belongs to: drop the other filters'
  // cached pages (the list on screen is already updated in place) and fetch
  // the status tabs again in the background.
  const refreshOtherFilters = useCallback(() => {
    const current = listKeyRef.current;
    queryClient.removeQueries({
      queryKey: ['google-inbox', restaurantId],
      predicate: (q) => q.queryKey[2] !== current,
    });
    if (!isFilterActive(filter)) {
      for (const status of ['unreplied', 'replied', 'all'] as InboxStatus[]) {
        if (status !== filter.status) void prefetchFilter({ ...filter, status });
      }
    }
  }, [filter, prefetchFilter, queryClient, restaurantId]);

  // Keep the cache in step with local edits (sent reply, new draft, more pages).
  useEffect(() => {
    if (loading || !list || !listKeyRef.current) return;
    queryClient.setQueryData(['google-inbox', restaurantId, listKeyRef.current], { ...list, nextCursor });
  }, [list, nextCursor, loading, queryClient, restaurantId]);

  const load = useCallback(
    async (opts: { cursor?: string | null; force?: boolean } = {}) => {
      const seq = ++seqRef.current;
      const key = queryKeyFor(filter);
      setLoadError(null);
      let cached: InboxPage | undefined;
      if (opts.cursor) {
        setLoadingMore(true);
      } else {
        if (opts.force) queryClient.removeQueries({ queryKey: key, exact: true });
        cached = queryClient.getQueryData<InboxPage>(key);
        if (cached) {
          // Cached: show it at once, revalidate below if it is old.
          listKeyRef.current = key[2];
          setList(toListState(cached));
          setNextCursor(cached.nextCursor);
          setLoading(false);
        } else {
          // Not cached: a skeleton, never the previous filter's list or an
          // empty state that is not true yet.
          if (listKeyRef.current !== key[2]) setList(null);
          setLoading(true);
        }
      }
      try {
        const page = opts.cursor
          ? await fetchPage(filter, { limit: '20', cursor: opts.cursor })
          : await queryClient.fetchQuery({
              queryKey: key,
              queryFn: () => fetchPage(filter, { limit: '20' }),
              staleTime: PAGE_FRESH_MS,
            });
        if (seq !== seqRef.current) return null;
        listKeyRef.current = key[2];
        setList((prev) =>
          opts.cursor && prev
            ? { items: [...prev.items, ...page.items], matching: page.matching, summary: page.summary }
            : toListState(page),
        );
        setNextCursor(page.nextCursor);
        return page;
      } catch (err) {
        if (seq === seqRef.current && !cached) {
          setLoadError(
            err instanceof InboxLoadError
              ? inboxErrorMessage(err.code, locale)
              : isTr
                ? 'Yorumlar yüklenemedi. Bağlantını kontrol edip tekrar dene.'
                : "Couldn't load reviews. Check your connection and try again.",
          );
        }
        return null;
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [fetchPage, filter, isTr, locale, queryClient, queryKeyFor],
  );

  const syncNow = useCallback(
    async (manual: boolean) => {
      setSyncState('running');
      setSyncNotice(null);
      try {
        const res = await fetch(`${api}/reviews/sync`, { method: 'POST' });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.ok === false) {
          const code = errorCodeOf(data);
          if (code === 'GOOGLE_REAUTH_REQUIRED') onConnectionProblem();
          setSyncState('error');
          setSyncNotice(inboxErrorMessage(code ?? (res.status === 429 ? 'SYNC_THROTTLED' : null), locale));
          return;
        }
        setSyncState('idle');
        if (manual) setSyncNotice(isTr ? 'Yorumlar güncellendi.' : 'Reviews updated.');
        setStatsKey((k) => k + 1);
        await load({ force: true });
        refreshOtherFilters();
      } catch {
        setSyncState('error');
        setSyncNotice(isTr ? "Google'a ulaşılamadı. Biraz sonra tekrar dene." : "Couldn't reach Google. Try again shortly.");
      }
    },
    [api, isTr, load, locale, onConnectionProblem],
  );

  // Opening the page refreshes from Google (§54): the newest page only, and
  // the server skips it when the last sync is under 2 minutes old. Quiet: no
  // error banner (the stored list stays), except a broken connection.
  const pageSync = useCallback(async () => {
    setSyncState('running');
    try {
      const res = await fetch(`${api}/reviews/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'page' }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; fresh?: boolean; busy?: boolean; inserted?: number; code?: string }
        | null;
      setSyncState('idle');
      if (!res.ok || data?.ok === false) {
        if (errorCodeOf(data) === 'GOOGLE_REAUTH_REQUIRED') onConnectionProblem();
        return;
      }
      if (data?.fresh || data?.busy) return;
      const inserted = data?.inserted ?? 0;
      if (inserted > 0) {
        setSyncNotice(
          isTr
            ? `${inserted} yeni Google yorumu geldi.`
            : `${inserted} new Google review${inserted === 1 ? '' : 's'}.`,
        );
      }
      setStatsKey((k) => k + 1);
      await load({ force: true });
      refreshOtherFilters();
    } catch {
      setSyncState('idle');
    }
  }, [api, isTr, load, onConnectionProblem, refreshOtherFilters]);

  // (Re)load on filter change; the very first load also refreshes from
  // Google (a full first sync when nothing is stored yet). The status tabs of
  // an unfiltered list are fetched ahead so switching them shows cached data
  // at once (§56).
  useEffect(() => {
    void load().then((page) => {
      if (page && !isFilterActive(filter)) {
        for (const status of ['unreplied', 'replied', 'all'] as InboxStatus[]) {
          if (status !== filter.status) void prefetchFilter({ ...filter, status });
        }
      }
      if (page && !autoSyncedRef.current) {
        autoSyncedRef.current = true;
        if (page.summary.needsSync && canWrite) void syncNow(false);
        else if (!page.summary.syncing) void pageSync();
      }
      if (page?.summary.activeJobId) setResumeJobId(page.summary.activeJobId);
    });
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loadingMore) void load({ cursor: nextCursor });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextCursor, loadingMore, load]);

  const items = useMemo(() => list?.items ?? [], [list]);
  const summary = list?.summary ?? null;

  const leaveAndFocusNext = (reviewId: string, openNext: boolean) => {
    const next = neighbourAfter(items, reviewId);
    setLeaving((prev) => new Set(prev).add(reviewId));
    window.setTimeout(() => {
      setList((prev) => (prev ? removeReview(prev, reviewId) : prev));
      setLeaving((prev) => {
        const n = new Set(prev);
        n.delete(reviewId);
        return n;
      });
      setFocusedId(next);
      if (next && openNext) setOpenSignals((s) => ({ ...s, [next]: (s[next] ?? 0) + 1 }));
    }, LEAVE_MS);
  };

  const sendReply = async (review: InboxReview, text: string, opts: { next: boolean }): Promise<SendResult> => {
    try {
      const res = await fetch(`${api}/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewName: review.reviewName, comment: text, confirmResponsibility: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = errorCodeOf(data);
        if (code === 'CONTENT_BLOCKED') return { ok: false, message: blockedReplyMessage(issuesFromBody(data), locale) };
        if (code === 'BANNED_PHRASE') {
          const phrases = Array.isArray(data?.phrases) ? (data.phrases as string[]).join(', ') : '';
          return { ok: false, message: `${inboxErrorMessage(code, locale)}${phrases ? ` (${phrases})` : ''}` };
        }
        if (code === 'GOOGLE_REAUTH_REQUIRED') onConnectionProblem();
        return { ok: false, message: inboxErrorMessage(code, locale) };
      }
      const reply = { comment: data?.reply?.comment ?? text, updateTime: data?.reply?.updateTime ?? new Date().toISOString() };
      let leaves = false;
      setList((prev) => {
        if (!prev) return prev;
        const nextState = applyReplySent(prev, review.reviewId, reply, filter.status);
        leaves = nextState.leaves;
        return { items: nextState.items, matching: nextState.matching, summary: nextState.summary };
      });
      setSelected((prev) => {
        if (!prev.has(review.reviewId)) return prev;
        const n = new Set(prev);
        n.delete(review.reviewId);
        return n;
      });
      setStatsKey((k) => k + 1);
      refreshOtherFilters();
      if (leaves || filter.status === 'unreplied') leaveAndFocusNext(review.reviewId, opts.next);
      else if (opts.next) {
        const next = neighbourAfter(items, review.reviewId);
        if (next) {
          setFocusedId(next);
          setOpenSignals((s) => ({ ...s, [next]: (s[next] ?? 0) + 1 }));
        }
      }
      return { ok: true };
    } catch {
      return { ok: false, message: inboxErrorMessage('GOOGLE_NETWORK_ERROR', locale) };
    }
  };

  const deleteReply = async (review: InboxReview): Promise<SendResult> => {
    try {
      const res = await fetch(`${api}/reviews/reply`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewName: review.reviewName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = errorCodeOf(data);
        if (code === 'GOOGLE_REAUTH_REQUIRED') onConnectionProblem();
        return { ok: false, message: inboxErrorMessage(code, locale) };
      }
      let leaves = false;
      setList((prev) => {
        if (!prev) return prev;
        const nextState = applyReplyDeleted(prev, review.reviewId, filter.status);
        leaves = nextState.leaves;
        return { items: nextState.items, matching: nextState.matching, summary: nextState.summary };
      });
      setStatsKey((k) => k + 1);
      refreshOtherFilters();
      if (leaves || filter.status === 'replied') leaveAndFocusNext(review.reviewId, false);
      return { ok: true };
    } catch {
      return { ok: false, message: inboxErrorMessage('GOOGLE_NETWORK_ERROR', locale) };
    }
  };

  const draftFor = async (review: InboxReview): Promise<{ text: string | null; message?: string }> => {
    try {
      const res = await fetch(`${api}/reviews/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.reviewId, locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.suggestion !== 'string') {
        return { text: null, message: inboxErrorMessage(errorCodeOf(data), locale) };
      }
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((r) =>
                r.reviewId === review.reviewId
                  ? { ...r, draft: { body: data.suggestion, source: data.source, generatedAt: new Date().toISOString() } }
                  : r,
              ),
            }
          : prev,
      );
      return { text: data.suggestion };
    } catch {
      return { text: null, message: inboxErrorMessage('GOOGLE_NETWORK_ERROR', locale) };
    }
  };

  // J/K navigation, R reply, / search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const key = e.key.toLowerCase();
      if (key !== 'j' && key !== 'k' && key !== 'r' && key !== '/') return;
      if (key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (items.length === 0) return;
      e.preventDefault();
      const idx = focusedId ? items.findIndex((r) => r.reviewId === focusedId) : -1;
      if (key === 'j') setFocusedId(items[Math.min(items.length - 1, idx + 1)]?.reviewId ?? null);
      if (key === 'k') setFocusedId(items[Math.max(0, idx - 1)]?.reviewId ?? null);
      if (key === 'r') {
        const target = focusedId ?? items[0].reviewId;
        setFocusedId(target);
        setOpenSignals((s) => ({ ...s, [target]: (s[target] ?? 0) + 1 }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, focusedId]);

  const setStatus = (status: InboxStatus) => setFilter((f) => ({ ...f, status }));
  const toggleStar = (n: number) =>
    setFilter((f) => ({ ...f, stars: f.stars.includes(n) ? f.stars.filter((s) => s !== n) : [...f.stars, n].sort() }));
  const clearFilters = () => {
    setQInput('');
    setFilter((f) => ({ ...DEFAULT_FILTER, status: f.status }));
  };

  const selectAllInFilter = async (f: InboxFilterState = filter) => {
    setSelectNotice(null);
    try {
      const res = await fetch(`${api}/inbox?${filterToQuery(f, { mode: 'bulk-ids' })}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.reviewIds)) {
        setSelectNotice(inboxErrorMessage(errorCodeOf(data), locale));
        return;
      }
      setSelected(new Set(data.reviewIds as string[]));
      setSelectNotice(
        data.reviewIds.length === 0
          ? isTr ? 'Bu filtrede toplu yanıtlanabilecek (4-5★, yanıtsız) yorum yok.' : 'No 4–5★ unanswered reviews in this filter.'
          : data.reviewIds.length >= (data.limit ?? 100)
            ? isTr ? `İlk ${data.limit} yorum seçildi (tek seferde en çok ${data.limit}).` : `First ${data.limit} selected (max ${data.limit} at once).`
            : null,
      );
    } catch {
      setSelectNotice(inboxErrorMessage('GOOGLE_NETWORK_ERROR', locale));
    }
  };

  const suggestBulk = async () => {
    const f: InboxFilterState = { ...DEFAULT_FILTER, status: 'unreplied', stars: [4, 5] };
    setQInput('');
    setSelectMode(true);
    setFilter(f);
    await selectAllInFilter(f);
  };

  const statusCounts: Record<InboxStatus, number | null> = {
    unreplied: summary?.unreplied ?? null,
    replied: summary?.replied ?? null,
    all: summary?.stored ?? null,
  };
  const fmt = (n: number) => n.toLocaleString(isTr ? 'tr-TR' : 'en-US');

  return (
    <div className="space-y-4">
      {/* Summary: rating + three numbers + actions */}
      <section className="bz-card overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[24px] bg-pn-ink text-white">
              <span className="text-[22px] font-medium leading-none tabular-nums">
                {summary?.averageRating != null
                  ? summary.averageRating.toLocaleString(isTr ? 'tr-TR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                  : '–'}
              </span>
              <span className="mt-1 inline-flex gap-px" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={8} fill={i <= Math.round(summary?.averageRating ?? 0) ? '#78FC90' : 'transparent'} color="#78FC90" />
                ))}
              </span>
            </div>
            {/* One line (§58): connected location · last sync · sync now. */}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-pn-ink">
                {locationLabel ?? (isTr ? 'Google puanı' : 'Google rating')}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#737373]">
                {syncState === 'running' || summary?.syncing ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                    {isTr ? "Google'dan alınıyor…" : 'Syncing from Google…'}
                  </span>
                ) : (
                  <>
                    <span>{`${isTr ? 'Son senkron' : 'Last sync'}: ${ago(summary?.fetchedAt ?? null, locale)}`}</span>
                    {canWrite && (
                      <>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => void syncNow(true)}
                          className="-my-2 inline-flex min-h-[44px] items-center font-medium text-pn-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover rounded sm:min-h-0 sm:my-0"
                        >
                          {isTr ? 'Şimdi senkronla' : 'Sync now'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              { label: isTr ? 'Toplam yorum' : 'Total reviews', value: summary ? fmt(summary.totalReviewCount) : '—', tone: '' },
              {
                label: isTr ? 'Yanıtsız' : 'Unreplied',
                value: summary ? fmt(summary.unreplied) : '—',
                tone: summary && summary.unreplied > 0 ? 'text-[#B45309]' : '',
              },
              {
                label: isTr ? 'Yanıt oranı' : 'Reply rate',
                value: summary?.replyRate != null ? (isTr ? `%${summary.replyRate}` : `${summary.replyRate}%`) : '—',
                tone: '',
              },
            ].map((t) => (
              <div key={t.label} className="rounded-[20px] bg-pn-canvas px-4 py-3">
                <dt className="text-[13px] text-[#525252]">{t.label}</dt>
                <dd className={`mt-1 text-[20px] font-medium tabular-nums text-pn-ink ${t.tone}`}>{t.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <button
                type="button"
                onClick={() => {
                  setView('inbox');
                  setSelectMode((v) => !v);
                  setSelected(new Set());
                  setSelectNotice(null);
                }}
                aria-pressed={selectMode}
                className={`${selectMode ? 'bz-btn-primary' : 'bz-btn-ghost'} min-h-11 text-[13px] sm:min-h-[36px]`}
              >
                <CheckSquare size={14} aria-hidden="true" />
                {isTr ? 'Toplu yanıt' : 'Bulk reply'}
              </button>
            )}
            <button type="button" onClick={() => setSettingsOpen(true)} className="bz-btn-ghost min-h-11 text-[13px] sm:min-h-[36px]">
              <Settings2 size={14} aria-hidden="true" />
              {isTr ? 'Yanıt ayarları' : 'Reply settings'}
            </button>
            <PulseMenu
              trigger={
                <button type="button" className="bz-btn-ghost min-h-11 min-w-11 text-[13px] sm:min-h-[36px]" aria-label={isTr ? 'Diğer işlemler' : 'More actions'}>
                  <MoreHorizontal size={14} aria-hidden="true" />
                </button>
              }
            >
              {canWrite && (
                <PulseMenuItem icon={<RefreshCw size={14} />} disabled={syncState === 'running'} onSelect={() => void syncNow(true)}>
                  {isTr ? "Yorumları Google'dan yenile" : 'Refresh reviews from Google'}
                </PulseMenuItem>
              )}
              {summary?.reviewsUrl && (
                <PulseMenuItem icon={<ExternalLink size={14} />} onSelect={() => window.open(summary.reviewsUrl!, '_blank', 'noopener')}>
                  {isTr ? "Google'da tümünü gör" : 'See all on Google'}
                </PulseMenuItem>
              )}
              {canWrite && (
                <PulseMenuItem danger icon={<Unplug size={14} />} onSelect={() => window.setTimeout(onDisconnect, 350)}>
                  {isTr ? 'Google bağlantısını kes' : 'Disconnect Google'}
                </PulseMenuItem>
              )}
            </PulseMenu>
          </div>
        </div>
        <div className="bz-tabs mx-4 mb-4 w-auto sm:mx-5" role="tablist" aria-label={isTr ? 'Bölüm' : 'Section'}>
          <button type="button" role="tab" aria-selected={view === 'inbox'} onClick={() => setView('inbox')} className="bz-tab min-h-11 sm:min-h-0">
            <Inbox size={13} aria-hidden="true" />
            {isTr ? 'Yanıt kutusu' : 'Reply inbox'}
            {summary && summary.unreplied > 0 && (
              <span className="ml-1 rounded-full bg-pn-accent px-1.5 text-[12px] font-medium tabular-nums text-pn-ink">{fmt(summary.unreplied)}</span>
            )}
          </button>
          <button type="button" role="tab" aria-selected={view === 'analysis'} onClick={() => setView('analysis')} className="bz-tab min-h-11 sm:min-h-0">
            <BarChart3 size={13} aria-hidden="true" />
            {isTr ? 'Analiz' : 'Analysis'}
          </button>
        </div>
      </section>

      {syncNotice && (
        <AlertBanner kind={syncState === 'error' ? 'warn' : 'success'} onDismiss={() => setSyncNotice(null)}>
          {syncNotice}
        </AlertBanner>
      )}

      {resumeJobId && !bulkIds && (
        <div className="flex flex-col gap-2 rounded-[20px] border border-pn-line bg-pn-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[#525252]">{isTr ? 'Toplu yanıt gönderimi sürüyor.' : 'A bulk reply is being sent.'}</p>
          <button type="button" onClick={() => setBulkIds([])} className="bz-btn min-h-11 sm:min-h-9">
            {isTr ? 'İlerlemeyi gör' : 'View progress'}
          </button>
        </div>
      )}

      {view === 'analysis' && (
        <InboxAnalysis restaurantId={restaurantId} locale={locale} refreshKey={statsKey} profileSlot={profileSlot} embedded />
      )}

      <div className={view === 'inbox' ? 'space-y-4' : 'hidden'}>
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="bz-tabs w-full shrink-0 sm:w-auto" role="tablist" aria-label={isTr ? 'Yanıt durumu' : 'Reply status'}>
            {(['unreplied', 'replied', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter.status === s}
                onClick={() => setStatus(s)}
                className="bz-tab min-h-11 sm:min-h-0"
              >
                {s === 'unreplied' ? (isTr ? 'Yanıtsız' : 'Unanswered') : s === 'replied' ? (isTr ? 'Yanıtlandı' : 'Answered') : isTr ? 'Tümü' : 'All'}
                {statusCounts[s] != null && <span className="ml-1 tabular-nums text-[#737373]">{fmt(statusCounts[s]!)}</span>}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:max-w-[320px]">
            <span className="sr-only">{isTr ? 'Yorumlarda ara' : 'Search reviews'}</span>
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              ref={searchRef}
              type="search"
              className="bz-input pl-8 text-[16px] sm:text-[13px]"
              placeholder={isTr ? 'İsim ya da metin ara…' : 'Search name or text…'}
              value={qInput}
              onChange={(e) => setQInput(e.target.value.slice(0, 100))}
              enterKeyHint="search"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={filter.stars.includes(n)}
              onClick={() => toggleStar(n)}
              className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-[13px] sm:min-h-[32px] ${
                filter.stars.includes(n) ? 'border-pn-ink bg-pn-ink text-white' : 'border-pn-line bg-white text-[#525252] hover:border-pn-line-strong'
              }`}
            >
              {n}
              <Star size={11} aria-hidden="true" fill="currentColor" />
            </button>
          ))}
          <PulseSelect
            value={filter.text}
            onChange={(v) => setFilter((f) => ({ ...f, text: v as InboxFilterState['text'] }))}
            options={[
              { value: 'all', label: isTr ? 'Metinli + metinsiz' : 'With + without text' },
              { value: 'with', label: isTr ? 'Yalnız metinli' : 'With text' },
              { value: 'without', label: isTr ? 'Yalnız metinsiz' : 'Without text' },
            ]}
            ariaLabel={isTr ? 'Metin filtresi' : 'Text filter'}
            className="min-w-[170px]"
          />
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <label className="sr-only" htmlFor={`gr-from-${restaurantId}`}>{isTr ? 'Başlangıç tarihi' : 'From date'}</label>
            <input
              id={`gr-from-${restaurantId}`}
              type="date"
              className="bz-input h-11 w-[150px] text-[16px] sm:h-[32px] sm:text-[13px]"
              value={filter.from}
              max={filter.to || undefined}
              onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
            />
            <span aria-hidden="true" className="text-[#A3A3A3]">–</span>
            <label className="sr-only" htmlFor={`gr-to-${restaurantId}`}>{isTr ? 'Bitiş tarihi' : 'To date'}</label>
            <input
              id={`gr-to-${restaurantId}`}
              type="date"
              className="bz-input h-11 w-[150px] text-[16px] sm:h-[32px] sm:text-[13px]"
              value={filter.to}
              min={filter.from || undefined}
              onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
            />
          </span>
          {isFilterActive(filter) && (
            <button type="button" onClick={clearFilters} className="inline-flex min-h-11 items-center gap-1 px-2 text-[13px] font-medium text-[#525252] underline-offset-2 hover:underline sm:min-h-0">
              <X size={12} aria-hidden="true" />
              {isTr ? 'Filtreleri temizle' : 'Clear filters'}
            </button>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="flex flex-col gap-2 rounded-[20px] border border-pn-line bg-pn-canvas px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-[13px] text-[#525252] sm:flex-1">
            {isTr
              ? 'Toplu yanıt yalnız yanıtsız 4-5 yıldızlı yorumlar için. 1-3 yıldızlı yorumları tek tek yanıtla.'
              : 'Bulk replies are for unanswered 4–5 star reviews only. Answer 1–3 star reviews one by one.'}
          </p>
          <button type="button" onClick={() => void suggestBulk()} className="bz-btn-lime min-h-11 text-[13px] sm:min-h-9">
            {isTr ? 'Önerilen: yanıtsız 4-5★' : 'Suggested: unanswered 4–5★'}
          </button>
          <button type="button" onClick={() => void selectAllInFilter()} className="bz-btn min-h-11 text-[13px] sm:min-h-9">
            {isTr ? 'Tümünü seç (filtredekiler)' : 'Select all (in filter)'}
          </button>
          {selectNotice && <p className="w-full text-[12px] text-[#92400E]">{selectNotice}</p>}
        </div>
      )}

      {/* List */}
      <section className="bz-card overflow-hidden" aria-label={isTr ? 'Google yorumları' : 'Google reviews'} aria-busy={loading || undefined}>
        {loadError ? (
          <div className="space-y-3 p-5">
            <AlertBanner kind="danger">{loadError}</AlertBanner>
            <button type="button" className="bz-btn-ghost min-h-11" onClick={() => void load({ force: true })}>
              <RefreshCw size={13} aria-hidden="true" />
              {isTr ? 'Tekrar dene' : 'Try again'}
            </button>
          </div>
        ) : loading && !list ? (
          <div className="space-y-4 p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-pn-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-pn-line" />
                  <div className="h-3 w-full rounded bg-pn-canvas" />
                  <div className="h-3 w-2/3 rounded bg-pn-canvas" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={
                syncState === 'running' || summary?.needsSync
                  ? isTr ? "Yorumlar Google'dan alınıyor" : 'Fetching reviews from Google'
                  : filter.status === 'unreplied' && !isFilterActive(filter)
                    ? isTr ? 'Yanıt bekleyen yorum yok' : 'No reviews waiting for a reply'
                    : isTr ? 'Bu filtreye uyan yorum yok' : 'No reviews match this filter'
              }
              body={
                syncState === 'running' || summary?.needsSync
                  ? isTr ? 'Tüm yorumların alınması birkaç saniye sürebilir.' : 'Fetching every review can take a few seconds.'
                  : filter.status === 'unreplied' && !isFilterActive(filter)
                    ? isTr ? 'Yeni yorumlar geldikçe burada görünür.' : 'New reviews show up here as they arrive.'
                    : isTr ? 'Filtreleri değiştir ya da temizle.' : 'Change or clear the filters.'
              }
            />
          </div>
        ) : (
          <>
            <p className="border-b border-pn-line px-4 py-2 text-[12px] text-[#737373] sm:px-5">
              {isTr ? `${fmt(list?.matching ?? items.length)} yorum` : `${fmt(list?.matching ?? items.length)} reviews`}
              {loading && <Loader2 size={11} className="ml-2 inline animate-spin" aria-hidden="true" />}
            </p>
            {items.map((review) => (
              <InboxReviewCard
                key={review.reviewId}
                review={review}
                locale={locale}
                businessName={restaurantName}
                canWrite={canWrite}
                aiEnabled={aiEnabled}
                focused={focusedId === review.reviewId}
                leaving={leaving.has(review.reviewId)}
                flagged={flags.has(review.reviewName)}
                selectMode={selectMode}
                selected={selected.has(review.reviewId)}
                openSignal={openSignals[review.reviewId] ?? 0}
                onToggleSelect={() =>
                  setSelected((prev) => {
                    const n = new Set(prev);
                    if (n.has(review.reviewId)) n.delete(review.reviewId);
                    else n.add(review.reviewId);
                    return n;
                  })
                }
                onToggleFlag={() => toggleFlag(review.reviewName)}
                onFocus={() => setFocusedId(review.reviewId)}
                onDraft={() => draftFor(review)}
                onSend={(text, opts) => sendReply(review, text, opts)}
                onDelete={() => deleteReply(review)}
              />
            ))}
            {nextCursor && (
              <div ref={sentinelRef} className="flex justify-center border-t border-pn-line p-3">
                <button type="button" onClick={() => void load({ cursor: nextCursor })} disabled={loadingMore} className="bz-btn min-h-11 sm:min-h-9">
                  {loadingMore && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                  {isTr ? 'Daha fazla yükle' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      </div>

      <p className={view === 'inbox' ? 'hidden text-[12px] text-[#A3A3A3] lg:block' : 'hidden'}>
        {isTr
          ? 'Kısayollar: J / K yorumlar arasında gez · R yanıtla · / ara · ⌘/Ctrl + Enter gönder · ⌘/Ctrl + Shift + Enter gönder ve sonrakine geç'
          : 'Shortcuts: J / K move · R reply · / search · ⌘/Ctrl + Enter send · ⌘/Ctrl + Shift + Enter send & next'}
      </p>

      <PanelSelectionBar
        count={selected.size}
        label={isTr ? 'yorum seçildi' : 'reviews selected'}
        ariaLabel={isTr ? 'Toplu yanıt' : 'Bulk reply'}
        onClear={() => setSelected(new Set())}
        clearLabel={isTr ? 'Seçimi temizle' : 'Clear selection'}
        countLocale={isTr ? 'tr-TR' : 'en-US'}
        actions={[
          {
            key: 'bulk-draft',
            label: isTr ? 'Seçilenler için AI taslağı oluştur' : 'Create AI drafts for selected',
            variant: 'primary',
            onClick: () => setBulkIds(Array.from(selected)),
          },
        ]}
      />

      {bulkIds && (
        <BulkReplyDialog
          restaurantId={restaurantId}
          locale={locale}
          reviewIds={bulkIds}
          resumeJobId={bulkIds.length === 0 ? resumeJobId : null}
          onClose={() => {
            setBulkIds(null);
            void load({ force: true }).then((page) => setResumeJobId(page?.summary.activeJobId ?? null));
            refreshOtherFilters();
          }}
          onFinished={() => {
            setSelected(new Set());
            setStatsKey((k) => k + 1);
          }}
        />
      )}

      {settingsOpen && (
        <ReplySettingsDialog
          restaurantId={restaurantId}
          locale={locale}
          canWrite={canWrite}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => setSyncNotice(isTr ? 'Yanıt ayarları kaydedildi.' : 'Reply settings saved.')}
        />
      )}
    </div>
  );
}
