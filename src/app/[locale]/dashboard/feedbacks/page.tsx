'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense, use, type ReactNode } from 'react';
import { replyErrorMessage } from '@/components/reply/reply-errors';
import { useSearchParams, usePathname } from 'next/navigation';
import { Download, Inbox, Loader2, Sparkles, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import type { Locale } from '@/lib/translations';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { getOwnerShellActiveRestaurantId } from '@/components/dashboard/UserDashboardShell';
import {
  InboxToolbar,
  ratingFilterOptions,
  type InboxToggle,
} from '@/components/dashboard/feedbacks/InboxToolbar';
import type { InboxTab } from '@/components/dashboard/feedbacks/InboxStatusTabs';

import type {
  ActiveTab,
  AiSource,
  AiTone,
  DegradedMeta,
  FeedbackRow,
  HasReplyFilter,
  PlatformFilter,
  ReplyTone,
  SentReply,
} from './_components/types';
import { FeedbackList } from './_components/FeedbackList';
import { FeedbackDetail, FeedbackDetailSkeleton } from './_components/FeedbackDetail';
import { FeedbackFiltersModal } from './_components/FeedbackFiltersModal';

/** suggest-reply → 403 `pulse_ai_disabled_by_admin` (admin master flag, §5.2). */
async function isPulseAiDisabledResponse(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const data = await res.json().catch(() => null);
  return data?.error === 'pulse_ai_disabled_by_admin';
}

// URL filter defaults (CLAUDE.md §36). Values equal to their default are
// removed from the URL, so legacy deep links keep working unchanged.
const FILTER_DEFAULTS = {
  tab: 'all' as ActiveTab,
  days: 'all',
  rating: 'all',
  platform: 'all' as PlatformFilter,
  hasReply: 'all' as HasReplyFilter,
  // boolean literal-type cast (CLAUDE.md §36.3).
  flagged: false as boolean,
};
type FilterKey = keyof typeof FILTER_DEFAULTS;

const LG_QUERY = '(min-width: 1024px)';
/** Desktop split view (list + detail side by side). */
const isLgUp = () => typeof window !== 'undefined' && window.matchMedia(LG_QUERY).matches;

function FeedbacksContent({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================================
  // URL filter state — read through useUrlFilter (CLAUDE.md §36). `id`,
  // `view`, `focus` and `restaurantId` are managed separately so a filter
  // reset never clears them.
  // ============================================================
  const filters = useUrlFilter(FILTER_DEFAULTS);

  // Writes go through `history.replaceState`, not the hook's
  // `router.replace`: the page is fully client-side, so the RSC round trip
  // `router.replace` costs on every tab click / select change only delayed
  // the URL — and with it the selected tab and the list — by a server hop
  // (seconds on a busy server). Next 15 keeps `useSearchParams` (and so
  // `filters.values`) in sync with replaceState. Same URL shape and the
  // same "default value → param removed" rule as the hook.
  const writeFilters = useCallback(
    (updates: Partial<Record<FilterKey, string | boolean>>) => {
      const next = new URLSearchParams(window.location.search);
      for (const key of Object.keys(updates) as FilterKey[]) {
        const value = updates[key];
        if (value === undefined || value === FILTER_DEFAULTS[key]) next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  // Notification deep-link target — `?focus=<feedbackId>` from NotificationBell.
  const focusId = searchParams.get('focus');
  const restaurantIdParam = searchParams.get('restaurantId') ?? searchParams.get('restaurant');
  const scopedRestaurantId =
    restaurantIdParam && restaurantIdParam !== 'all' ? restaurantIdParam : null;

  // Mobile push-route: `?view=detail` toggles list/detail below lg. Desktop
  // always renders the split view.
  const view = searchParams.get('view');
  const idParam = searchParams.get('id');
  const isMobileDetailView = view === 'detail';
  const isMobileDetailViewRef = useRef(isMobileDetailView);
  isMobileDetailViewRef.current = isMobileDetailView;

  // Live viewport flag (initial false → SSR-safe; the list is loading on the
  // first paint anyway).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ============================================================
  // Local state
  // ============================================================
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [degraded, setDegraded] = useState<DegradedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId ?? idParam);
  const [searchTerm, setSearchTerm] = useState('');
  // < md filter sheet (md+ shows every filter inline in the toolbar).
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination — "Daha fazla göster" (20 per page).
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // §40.4 — a failed list fetch shows an error + retry, never a silent
  // "no reviews". `listReloadKey` re-runs the list effect.
  const [listError, setListError] = useState(false);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // Reply composer
  const [replyDraft, setReplyDraft] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  // §45 — per-message responsibility acknowledgement. Resets after every
  // successful send and every feedback switch (fresh confirmation each time).
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyNotice, setReplyNotice] = useState<{ msg: string; tone: ReplyTone } | null>(null);
  const replyNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse AI
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<AiSource>(null);
  // Admin `pulseAiEnabled=false` → suggest-reply 403 / draft `pulseAiDisabled`.
  const [aiDisabledByAdmin, setAiDisabledByAdmin] = useState(false);
  const [aiTone, setAiTone] = useState<AiTone>('warm');
  const [aiFromBackground, setAiFromBackground] = useState(false);

  // Sent reply thread
  const [sentReplies, setSentReplies] = useState<SentReply[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  // Replies sent from this page, per review. A thread fetch already in flight
  // when Send is pressed can land after the POST response; it must neither
  // drop the new reply nor list it twice (admin inbox parity).
  const sentLocallyRef = useRef<Map<string, SentReply[]>>(new Map());

  // Notification deep-link pulse (one-shot per focus id)
  const focusAppliedRef = useRef<string | null>(null);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  // Mobile list ↔ detail navigation bookkeeping (history API, §0.11).
  const cameFromListRef = useRef(false);
  const listScrollYRef = useRef(0);
  const lastOpenedIdRef = useRef<string | null>(null);
  const focusDetailOnOpenRef = useRef(false);

  // Auto mark-read: one automatic attempt per id, so a failing PATCH (which
  // reverts isRead) cannot loop the effect.
  const autoReadTriedRef = useRef<Set<string>>(new Set());

  // Reviews read while the "Okunmamış" tab is open stay listed (now shown as
  // read) until the owner leaves the tab or the list reloads — the Gmail
  // pattern. Without it, opening an unread review made it vanish from under
  // the cursor, and the desktop auto-selection on entering the tab silently
  // consumed the first unread review (detail showed it, the list did not).
  const [keptInUnreadTab, setKeptInUnreadTab] = useState<ReadonlySet<string>>(() => new Set());

  // §38.58 — "AI taslakları" (bulk_ai_reply): prepares drafts, sends nothing.
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const { tab, days, rating, platform, hasReply, flagged } = filters.values;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  // Switching tabs starts a fresh unread view (see keptInUnreadTab).
  useEffect(() => {
    setKeptInUnreadTab(new Set());
  }, [tab]);

  // ============================================================
  // Fetch feedbacks list — backend contract unchanged.
  //
  // §0.1 race guard: every list request takes a ticket from `listReqRef`;
  // a response only writes state if its ticket is still the latest. Without
  // it, the unscoped first request (before the shell adds ?restaurantId)
  // could land last and show — and bulk-draft — another business's reviews.
  // ============================================================
  const listReqRef = useRef(0);
  const prevScopeRef = useRef<string | null | undefined>(undefined);
  // Business the list is loaded for. Without ?restaurantId in the URL this is
  // the business the owner shell has already resolved — the shell only adds
  // the param a moment later, and fetching "all businesses" meanwhile flashed
  // (and could mark read) another business's reviews.
  const listScopeRef = useRef<string | null>(null);
  const lastListKeyRef = useRef<string | null>(null);

  const buildListQuery = (targetPage: number) => {
    const query = new URLSearchParams({
      page: String(targetPage),
      limit: String(PAGE_SIZE),
      days: String(days),
    });
    if (rating !== 'all') query.append('rating', String(rating));
    if (platform !== 'all') query.append('platform', String(platform));
    if (hasReply === 'pending') query.append('hasReply', 'false');
    if (flagged) query.append('isFlagged', 'true');
    if (listScopeRef.current) query.append('restaurantId', listScopeRef.current);
    return query;
  };

  useEffect(() => {
    const scope = scopedRestaurantId ?? getOwnerShellActiveRestaurantId() ?? null;
    // The URL catching up with the business this list was already loaded for
    // is not a new query.
    const listKey = [scope ?? '', days, rating, platform, hasReply, flagged, listReloadKey].join('|');
    if (listKey === lastListKeyRef.current) return;
    lastListKeyRef.current = listKey;
    listScopeRef.current = scope;
    const req = ++listReqRef.current;
    // A business switch must never keep the previous business's rows on
    // screen while the new list loads.
    if (prevScopeRef.current !== undefined && prevScopeRef.current !== scope) {
      setFeedbacks([]);
    }
    prevScopeRef.current = scope;
    setLoading(true);
    setPage(1);
    setHasMore(false);
    setTotal(null);
    setListError(false);
    setLoadMoreError(false);
    setLoadingMore(false);
    setKeptInUnreadTab(new Set());
    (async () => {
      try {
        const res = await fetch(`/api/feedback?${buildListQuery(1).toString()}`);
        if (req !== listReqRef.current) return;
        if (res.ok) {
          const data = await res.json();
          if (req !== listReqRef.current) return;
          const rows: FeedbackRow[] = data.data ?? [];
          setFeedbacks(rows);
          setActiveId((curr) => {
            if (curr && rows.some((r) => r.id === curr)) return curr;
            // Desktop: fall back to the newest row of the new result set.
            // §0.4 — below lg nothing is auto-selected (it would silently
            // mark the newest review read without ever showing it); an
            // explicitly opened mobile detail keeps its id.
            if (isLgUp()) return rows[0]?.id ?? null;
            return isMobileDetailViewRef.current ? curr : null;
          });
          setDegraded(data?.meta?.degraded ?? null);
          const totalNum = Number(data?.meta?.total);
          setTotal(Number.isFinite(totalNum) ? totalNum : rows.length);
          const totalPages = Number(data?.meta?.totalPages ?? 1);
          setHasMore(totalPages > 1);
        } else {
          setFeedbacks([]);
          setActiveId(null);
          setDegraded(null);
          setListError(true);
        }
      } catch (e) {
        if (req !== listReqRef.current) return;
        console.error(e);
        setFeedbacks([]);
        setActiveId(null);
        setDegraded(null);
        setListError(true);
      }
      if (req === listReqRef.current) setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, rating, platform, hasReply, flagged, scopedRestaurantId, listReloadKey]);

  const loadMoreFeedbacks = async () => {
    if (loadingMore || !hasMore) return;
    const req = ++listReqRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feedback?${buildListQuery(nextPage).toString()}`);
      if (req !== listReqRef.current) return;
      if (!res.ok) {
        setLoadMoreError(true);
      } else {
        const data = await res.json();
        if (req !== listReqRef.current) return;
        const rows: FeedbackRow[] = data.data ?? [];
        setFeedbacks((prev) => {
          // Drop ids already present (new reviews shift page boundaries).
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
        setPage(nextPage);
        const totalNum = Number(data?.meta?.total);
        if (Number.isFinite(totalNum)) setTotal(totalNum);
        const totalPages = Number(data?.meta?.totalPages ?? 1);
        setHasMore(nextPage < totalPages);
      }
    } catch (e) {
      if (req !== listReqRef.current) return;
      console.error(e);
      setLoadMoreError(true);
    }
    if (req === listReqRef.current) setLoadingMore(false);
  };

  // ============================================================
  // Filtered list (client-side: tab + search)
  // ============================================================
  const filteredList = useMemo(() => {
    let rows = feedbacks;
    // §38.56 — 5 tabs: Tümü / Okunmamış / Düşük puan / Yanıtlandı / Beklemede.
    if (tab === 'unread') rows = rows.filter((r) => r.isRead !== true || keptInUnreadTab.has(r.id));
    else if (tab === 'low') rows = rows.filter((r) => r.rating <= 3);
    else if (tab === 'replied') rows = rows.filter((r) => r.isReplied === true);
    else if (tab === 'pending') rows = rows.filter((r) => r.isPending === true);
    // Legacy tab literals (deep-link backwards-compat, §38.56).
    else if (tab === 'high') rows = rows.filter((r) => r.rating >= 4);
    else if (tab === 'redirected') rows = rows.filter((r) => !!r.platform);
    else if (tab === 'unreplied') rows = rows.filter((r) => r.isReplied !== true);
    else if (tab === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startMs = startOfDay.getTime();
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= startMs);
    } else if (tab === 'ai_ready') {
      rows = rows.filter((r) => r.hasPendingAiDraft === true);
    }
    if (searchTerm) {
      const q = searchTerm.toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US');
      rows = rows.filter(
        (r) =>
          (r.customerName ?? '').toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(q) ||
          (r.comment ?? '').toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(q),
      );
    }
    return rows;
  }, [feedbacks, tab, searchTerm, isTr, keptInUnreadTab]);

  // Desktop: when the owner changes the tab or the search so the selected
  // review is no longer in the list, move the selection to the first visible
  // row (otherwise the detail shows a review the list does not). Keyed on the
  // tab/search only — marking a review read inside the "Okunmamış" tab must
  // not make the selection jump.
  useEffect(() => {
    if (!isLgUp() || loading) return;
    setActiveId((curr) => {
      if (curr && filteredList.some((r) => r.id === curr)) return curr;
      // Nothing matches → clear, so the detail pane doesn't keep showing a
      // review next to the list's "Yorum yok".
      return filteredList[0]?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, searchTerm]);

  const active = useMemo(() => {
    const found = activeId ? feedbacks.find((r) => r.id === activeId) : undefined;
    if (found) return found;
    // Desktop never shows an empty detail pane when rows exist; mobile only
    // shows a detail the owner actually opened.
    return isDesktop ? filteredList[0] ?? null : null;
  }, [feedbacks, activeId, filteredList, isDesktop]);

  const counts = useMemo(
    () => ({
      unread: feedbacks.filter((r) => r.isRead !== true).length,
      low: feedbacks.filter((r) => r.rating <= 3).length,
      replied: feedbacks.filter((r) => r.isReplied === true).length,
      pending: feedbacks.filter((r) => r.isPending === true).length,
      aiReady: feedbacks.filter((r) => r.hasPendingAiDraft === true).length,
    }),
    [feedbacks],
  );

  // Week summary (header). Computed from the loaded rows, so it is only
  // claimed when those rows cover the window (newest-first ordering): either
  // everything is loaded, or the oldest loaded row predates the window.
  const serverFiltered =
    rating !== 'all' || platform !== 'all' || hasReply !== 'all' || flagged || days !== 'all';
  const weekStats = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const fourteenDaysAgo = now - 14 * 86400000;
    const oldestLoaded = feedbacks.length
      ? Math.min(...feedbacks.map((r) => new Date(r.createdAt).getTime()))
      : now;
    const coversWeek = !hasMore || oldestLoaded < sevenDaysAgo;
    const coversPrevWeek = !hasMore || oldestLoaded < fourteenDaysAgo;
    const last7 = feedbacks.filter((r) => new Date(r.createdAt).getTime() >= sevenDaysAgo);
    const prev7 = feedbacks.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= fourteenDaysAgo && t < sevenDaysAgo;
    });
    const avgOf = (rows: FeedbackRow[]) =>
      rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
    const last7Avg = avgOf(last7);
    const prev7Avg = avgOf(prev7);
    const delta =
      coversPrevWeek && last7Avg > 0 && prev7Avg > 0
        ? Math.round((last7Avg - prev7Avg) * 100) / 100
        : null;
    return { count: last7.length, avg: last7Avg, delta, exact: coversWeek };
  }, [feedbacks, hasMore]);

  const activeFeedbackId = active?.id ?? null;
  const activeCustomerEmail = active?.customerEmail ?? null;
  const activeCustomerName = active?.customerName ?? null;
  const activeRating = active?.rating ?? null;
  const activeIsReplied = active?.isReplied === true;
  const activeAutoDraftEnabled = active?.aiAutoDraftEnabled === true;

  // Composer state follows the selected review (Gmail-like): switching
  // reviews drops the draft and the notice.
  // §45 — the responsibility consent resets with it (it used to follow the
  // URL id, which can differ from the review actually shown).
  const activeIdRef = useRef<string | null>(activeFeedbackId);
  useEffect(() => {
    activeIdRef.current = activeFeedbackId;
    setReplyDraft('');
    setReplyNotice(null);
    setSendEmail(true);
    setConfirmResponsibility(false);
  }, [activeFeedbackId]);

  const markFeedbackRead = useCallback(
    async (id: string) => {
      const row = feedbacks.find((feedback) => feedback.id === id);
      if (!row || row.isRead === true) return;

      const previousRead = row.isRead;
      if (tabRef.current === 'unread') {
        setKeptInUnreadTab((prev) => new Set(prev).add(id));
      }
      setFeedbacks((prev) =>
        prev.map((feedback) => (feedback.id === id ? { ...feedback, isRead: true } : feedback)),
      );

      try {
        const res = await fetch(`/api/feedback/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        if (!res.ok) throw new Error('mark_read_failed');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('buaze:feedback-read'));
        }
      } catch {
        setFeedbacks((prev) =>
          prev.map((feedback) =>
            feedback.id === id ? { ...feedback, isRead: previousRead } : feedback,
          ),
        );
      }
    },
    [feedbacks],
  );

  // ============================================================
  // Notification deep-link: select + scroll + lime pulse + mark read
  // ============================================================
  useEffect(() => {
    if (!focusId || loading || focusAppliedRef.current === focusId) return;
    if (!feedbacks.some((r) => r.id === focusId)) return;
    focusAppliedRef.current = focusId;
    setActiveId(focusId);
    autoReadTriedRef.current.add(focusId);
    void markFeedbackRead(focusId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-feedback-id="${focusId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsedId(focusId);
      setTimeout(() => setPulsedId(null), 1800);
    });
  }, [focusId, loading, feedbacks, markFeedbackRead]);

  // Auto mark-read only for a review that is actually on screen: desktop
  // split view, or the mobile detail view (§0.4).
  useEffect(() => {
    if (loading || !activeId || !feedbacks.some((r) => r.id === activeId)) return;
    if (!isDesktop && !isMobileDetailView) return;
    if (autoReadTriedRef.current.has(activeId)) return;
    autoReadTriedRef.current.add(activeId);
    void markFeedbackRead(activeId);
  }, [activeId, feedbacks, loading, markFeedbackRead, isDesktop, isMobileDetailView]);

  // ============================================================
  // Sent reply thread fetch on selection
  // ============================================================
  useEffect(() => {
    if (!activeFeedbackId) {
      setSentReplies([]);
      return;
    }
    let cancelled = false;
    setSentLoading(true);
    setSentReplies([]);
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${activeFeedbackId}/reply`);
        if (cancelled) return;
        const local = sentLocallyRef.current.get(activeFeedbackId) ?? [];
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          const server: SentReply[] = Array.isArray(data?.replies) ? data.replies : [];
          const known = new Set(server.map((r) => r.id));
          setSentReplies([...server, ...local.filter((r) => !known.has(r.id))]);
        } else {
          setSentReplies(local);
        }
      } catch {
        if (!cancelled) setSentReplies(sentLocallyRef.current.get(activeFeedbackId) ?? []);
      } finally {
        if (!cancelled) setSentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFeedbackId]);

  // ============================================================
  // AI draft fetch (background draft → fallback on-demand). Only for low
  // (rating < 4), not-yet-replied reviews with auto-draft enabled; manual
  // "Taslak oluştur / Yeniden öner" stays an explicit owner action.
  // ============================================================
  useEffect(() => {
    if (!activeFeedbackId || activeRating === null) {
      setAiSuggestion('');
      setAiSource(null);
      setAiLoading(false);
      setAiFromBackground(false);
      setAiDisabledByAdmin(false);
      return;
    }
    setSendEmail(Boolean(activeCustomerEmail));
    setAiSuggestion('');
    setAiSource(null);
    setAiFromBackground(false);
    setAiDisabledByAdmin(false);
    if (activeRating >= 4 || activeIsReplied) {
      setAiLoading(false);
      return;
    }
    if (!activeAutoDraftEnabled) {
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    (async () => {
      try {
        const draftRes = await fetch(`/api/feedback/${activeFeedbackId}/draft`);
        if (draftRes.ok) {
          const data = await draftRes.json();
          if (!cancelled && data?.pulseAiDisabled) {
            setAiDisabledByAdmin(true);
            setAiLoading(false);
            return;
          }
          if (!cancelled && data?.autoDraftDisabled) {
            setAiLoading(false);
            return;
          }
          if (!cancelled && data?.draft?.body) {
            setAiSuggestion(data.draft.body);
            setAiSource(data.draft.source === 'ai_copilot' ? 'openai' : 'template-fallback');
            if (
              data.draft.tone === 'warm' ||
              data.draft.tone === 'formal' ||
              data.draft.tone === 'apologetic'
            ) {
              setAiTone(data.draft.tone);
            }
            setAiFromBackground(true);
            setAiLoading(false);
            return;
          }
        }
      } catch {
        /* fall through */
      }
      try {
        const res = await fetch(`/api/feedback/${activeFeedbackId}/suggest-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, autoDraft: true }),
        });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
          if (typeof data?.source === 'string') setAiSource(data.source);
          if (data?.tone === 'warm' || data?.tone === 'formal' || data?.tone === 'apologetic') {
            setAiTone(data.tone);
          }
        } else {
          if (cancelled) return;
          if (await isPulseAiDisabledResponse(res)) {
            if (!cancelled) setAiDisabledByAdmin(true);
            return;
          }
          setAiSuggestion(
            buildReplyTemplate({ name: activeCustomerName, rating: activeRating, locale }),
          );
          setAiSource('template-fallback');
        }
      } catch {
        if (cancelled) return;
        setAiSuggestion(
          buildReplyTemplate({ name: activeCustomerName, rating: activeRating, locale }),
        );
        setAiSource('template-fallback');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeAutoDraftEnabled,
    activeCustomerEmail,
    activeCustomerName,
    activeFeedbackId,
    activeIsReplied,
    activeRating,
    locale,
  ]);

  // ============================================================
  // Action handlers
  // ============================================================
  // Notice dwell: 5s (success/info), 8s (error) — §38.15.
  const flashReply = (msg: string, tone: ReplyTone = 'info') => {
    if (replyNoticeTimerRef.current) clearTimeout(replyNoticeTimerRef.current);
    setReplyNotice({ msg, tone });
    replyNoticeTimerRef.current = setTimeout(
      () => setReplyNotice(null),
      tone === 'error' ? 8000 : 5000,
    );
  };
  useEffect(
    () => () => {
      if (replyNoticeTimerRef.current) clearTimeout(replyNoticeTimerRef.current);
    },
    [],
  );

  const onRegenerateAi = async (toneOverride?: AiTone) => {
    if (!active) return;
    const targetId = active.id;
    const targetTone = toneOverride ?? aiTone;
    // A draft that arrives after the owner moved to another review must not
    // land in that review's composer.
    const stillShown = () => activeIdRef.current === targetId;
    setAiRegenerating(true);
    setAiFromBackground(false);
    try {
      const res = await fetch(`/api/feedback/${targetId}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, tone: targetTone }),
      });
      if (!stillShown()) return;
      if (res.ok) {
        const data = await res.json();
        if (!stillShown()) return;
        if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
        if (typeof data?.source === 'string') setAiSource(data.source);
        if (data?.tone === 'warm' || data?.tone === 'formal' || data?.tone === 'apologetic') {
          setAiTone(data.tone);
        }
      } else if (res.status === 429) {
        flashReply(
          isTr ? 'Çok sık istek. Biraz bekleyip tekrar deneyin.' : 'Too many requests. Please wait a moment.',
          'error',
        );
      } else if (await isPulseAiDisabledResponse(res)) {
        if (stillShown()) setAiDisabledByAdmin(true);
      } else {
        flashReply(
          isTr ? 'Taslak yenilenemedi. Lütfen tekrar deneyin.' : 'The draft could not be refreshed. Please try again.',
          'error',
        );
      }
    } catch {
      if (stillShown()) {
        flashReply(
          isTr ? 'Bağlantı hatası. Taslak yenilenemedi.' : 'Network error. The draft was not refreshed.',
          'error',
        );
      }
    } finally {
      setAiRegenerating(false);
    }
  };

  const sendReply = async (overrideBody?: string) => {
    if (!active || sendingReply || !confirmResponsibility) return;
    const body = (overrideBody ?? replyDraft).trim();
    if (!body) return;
    const targetId = active.id;
    const stillShown = () => activeIdRef.current === targetId;
    setSendingReply(true);
    const wantsEmail = sendEmail && Boolean(active.customerEmail);
    const replySource =
      aiSource === 'openai'
        ? 'ai_copilot'
        : aiSource === 'template' || aiSource === 'template-fallback'
          ? 'template_fallback'
          : 'manual';
    try {
      const res = await fetch(`/api/feedback/${targetId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          channel: wantsEmail ? 'email' : 'internal',
          sendEmail: wantsEmail,
          locale,
          source: replySource,
          confirmResponsibility,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFeedbacks((list) =>
          list.map((r) =>
            r.id === targetId ? { ...r, isReplied: true, hasPendingAiDraft: false } : r,
          ),
        );
        const newReply: SentReply = {
          // The API returns { reply: { id, ... } }; using its id keeps the
          // optimistic row and the refetched thread from showing twice.
          id: data?.reply?.id ?? `tmp-${Date.now()}-${targetId}`,
          body: data?.reply?.body ?? body,
          channel: data?.reply?.channel ?? (wantsEmail ? 'email' : 'internal'),
          status: data?.reply?.status ?? (data?.email?.status === 'failed' ? 'failed' : 'sent'),
          createdAt: data?.reply?.createdAt ?? new Date().toISOString(),
        };
        sentLocallyRef.current.set(targetId, [
          ...(sentLocallyRef.current.get(targetId) ?? []),
          newReply,
        ]);
        // The owner opened another review while this one was sending: the
        // list row is updated above, the composer on screen is left alone.
        if (!stillShown()) return;
        setSentReplies((list) => [...list.filter((r) => r.id !== newReply.id), newReply]);
        setReplyDraft('');
        setAiSource(null);
        setAiFromBackground(false);
        setConfirmResponsibility(false);
        const emailStatus = data?.email?.status as 'sent' | 'skipped' | 'failed' | undefined;
        if (emailStatus === 'sent') {
          flashReply(
            isTr
              ? `E-posta gönderildi: ${active.customerEmail}`
              : `Email sent to ${active.customerEmail}`,
            'success',
          );
        } else if (emailStatus === 'failed') {
          flashReply(
            isTr
              ? 'Yanıt kaydedildi ama e-posta gönderilemedi'
              : 'Saved but email delivery failed',
            'error',
          );
        } else {
          flashReply(isTr ? 'Yanıt kaydedildi (dahili)' : 'Reply saved (internal)', 'success');
        }
      } else if (stillShown()) {
        const data = await res.json().catch(() => ({}));
        flashReply(replyErrorMessage(data, isTr, res.status), 'error');
      }
    } catch {
      if (stillShown()) {
        flashReply(
          isTr
            ? 'Bağlantı hatası. Yanıt gönderilemedi, lütfen tekrar deneyin.'
            : 'Network error. The reply was not sent, please try again.',
          'error',
        );
      }
    } finally {
      setSendingReply(false);
    }
  };

  const onUseAiAndSend = async () => {
    if (!aiSuggestion || sendingReply || !confirmResponsibility) return;
    setReplyDraft(aiSuggestion);
    await sendReply(aiSuggestion);
  };

  const onCopyAiToDraft = () => {
    if (!aiSuggestion) return;
    setReplyDraft(aiSuggestion);
  };

  // Flag toggle — POST adds, DELETE removes (§38.238). Optimistic + revert.
  const flagFeedback = async () => {
    if (!active) return;
    const targetId = active.id;
    const newValue = active.isFlagged !== true;
    setFeedbacks((prev) =>
      prev.map((r) => (r.id === targetId ? { ...r, isFlagged: newValue } : r)),
    );
    setBulkNotice({
      msg: isTr
        ? newValue
          ? 'Yorum işaretlendi'
          : 'İşaret kaldırıldı'
        : newValue
          ? 'Review flagged'
          : 'Flag removed',
      tone: 'success',
    });
    try {
      const res = await fetch(`/api/feedback/${targetId}/flag`, {
        method: newValue ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: newValue ? JSON.stringify({ reason: 'manual' }) : undefined,
      });
      if (!res.ok) throw new Error('flag failed');
    } catch {
      setFeedbacks((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, isFlagged: !newValue } : r)),
      );
      setBulkNotice({
        msg: isTr ? 'İşaret güncellenemedi' : 'Could not update the flag',
        tone: 'error',
      });
    }
  };

  // Stage 13 (§38.83) — Beklemede toggle. Optimistic + revert.
  const togglePending = async () => {
    if (!active) return;
    const newValue = active.isPending !== true;
    const targetId = active.id;
    setFeedbacks((prev) =>
      prev.map((r) => (r.id === targetId ? { ...r, isPending: newValue } : r)),
    );
    setBulkNotice({
      msg: isTr
        ? newValue
          ? 'Beklemeye alındı'
          : 'Beklemeden çıkarıldı'
        : newValue
          ? 'Marked pending'
          : 'Removed from pending',
      tone: 'success',
    });
    try {
      const res = await fetch(`/api/feedback/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPending: newValue }),
      });
      if (!res.ok) throw new Error('PATCH failed');
    } catch {
      setFeedbacks((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, isPending: !newValue } : r)),
      );
      setBulkNotice({
        msg: isTr ? 'Beklemede güncellenemedi' : 'Could not update pending',
        tone: 'error',
      });
    }
  };

  // ============================================================
  // List ↔ detail navigation (§0.11) — history API instead of router.push,
  // so a row tap / back press costs no RSC server round-trip. Next 15 keeps
  // useSearchParams in sync with pushState/replaceState.
  // ============================================================
  const buildUrl = (overrides: { id?: string | null; view?: 'detail' | null }) => {
    const next = new URLSearchParams(searchParams.toString());
    if (overrides.id !== undefined) {
      if (overrides.id === null) next.delete('id');
      else next.set('id', overrides.id);
    }
    if (overrides.view !== undefined) {
      if (overrides.view === null) next.delete('view');
      else next.set('view', overrides.view);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const onSelectFeedback = (id: string) => {
    setActiveId(id);
    autoReadTriedRef.current.add(id);
    if (isLgUp()) {
      // Desktop: keep the URL shareable without stacking a history entry per
      // review (arrow-key navigation selects too).
      window.history.replaceState(null, '', buildUrl({ id, view: null }));
    } else {
      cameFromListRef.current = true;
      listScrollYRef.current = window.scrollY;
      lastOpenedIdRef.current = id;
      focusDetailOnOpenRef.current = true;
      window.history.pushState(null, '', buildUrl({ id, view: 'detail' }));
    }
    void markFeedbackRead(id);
  };

  const onBackToList = () => {
    if (cameFromListRef.current) {
      cameFromListRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, '', buildUrl({ view: null }));
    }
  };

  // Mobile detail opened → start at the top and move focus to the title.
  useEffect(() => {
    if (!isMobileDetailView || !active || !focusDetailOnOpenRef.current) return;
    focusDetailOnOpenRef.current = false;
    const id = active.id;
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document
        .getElementById(`feedback-detail-title-${id}`)
        ?.focus({ preventScroll: true });
    });
  }, [isMobileDetailView, active]);

  // Back to the list (in-app button or browser back) → restore the list
  // scroll position and focus the row that was opened.
  const prevDetailViewRef = useRef(isMobileDetailView);
  useEffect(() => {
    const was = prevDetailViewRef.current;
    prevDetailViewRef.current = isMobileDetailView;
    if (!was || isMobileDetailView || isLgUp()) return;
    const y = listScrollYRef.current;
    const openedId = lastOpenedIdRef.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      if (openedId) {
        document.getElementById(`feedback-option-${openedId}`)?.focus({ preventScroll: true });
      }
    });
  }, [isMobileDetailView]);

  // Reset every filter + the tab + search; id/view/focus/restaurantId stay.
  const onResetFilters = () => {
    setSearchTerm('');
    writeFilters({
      tab: 'all',
      days: 'all',
      rating: 'all',
      platform: 'all',
      hasReply: 'all',
      flagged: false,
    });
  };

  // §38.58 — "AI taslakları": first 50 unreplied reviews of the filtered
  // list get a Pulse AI draft. Nothing is sent automatically.
  const onBulkAiReply = async () => {
    if (bulkBusy) return;
    // Low ratings only — the inbox never offers a draft for 4–5★, and every
    // draft spends the same daily quota as "Taslak oluştur".
    const targetIds = filteredList
      .filter((f) => !f.isReplied && f.rating <= 3)
      .slice(0, 50)
      .map((f) => f.id);
    if (targetIds.length === 0) {
      setBulkNotice({
        msg: isTr ? 'Yanıt bekleyen düşük puanlı yorum yok.' : 'No low-rated reviews awaiting a reply.',
        tone: 'error',
      });
      return;
    }
    setBulkBusy(true);
    setBulkNotice(null);
    try {
      const res = await fetch('/api/feedback/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: targetIds,
          action: 'bulk_ai_reply',
          locale,
        }),
      });
      if (!res.ok) {
        setBulkNotice({
          msg: isTr ? 'AI taslakları hazırlanamadı.' : 'Could not prepare AI drafts.',
          tone: 'error',
        });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const processed = typeof data?.processed === 'number' ? data.processed : 0;
      const skipped = typeof data?.skipped === 'number' ? data.skipped : 0;
      // Only rows the server really stored a draft for get the badge.
      const savedIds = new Set<string>(
        Array.isArray(data?.drafts)
          ? (data.drafts as Array<{ feedbackId?: unknown; saved?: unknown }>)
              .filter((d) => d?.saved === true && typeof d.feedbackId === 'string')
              .map((d) => d.feedbackId as string)
          : [],
      );
      setFeedbacks((list) =>
        list.map((r) =>
          savedIds.has(r.id) && !r.isReplied ? { ...r, hasPendingAiDraft: true } : r,
        ),
      );
      setBulkNotice({
        msg: isTr
          ? `${processed} taslak hazırlandı${skipped > 0 ? ` · ${skipped} atlandı` : ''}. Hiçbiri gönderilmedi; listede her birini açıp onaylayabilirsin.`
          : `${processed} drafts prepared${skipped > 0 ? ` · ${skipped} skipped` : ''}. Nothing was sent; open each one in the list to approve it.`,
        tone: 'success',
      });
    } catch {
      setBulkNotice({
        msg: isTr ? 'Bağlantı hatası. Tekrar dene.' : 'Network error. Try again.',
        tone: 'error',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  // Bulk notice auto-dismiss: 5s success, 8s error (§38.15).
  useEffect(() => {
    if (!bulkNotice) return;
    const ttl = bulkNotice.tone === 'error' ? 8000 : 5000;
    const t = setTimeout(() => setBulkNotice(null), ttl);
    return () => clearTimeout(t);
  }, [bulkNotice]);

  const bulkEligibleCount = useMemo(
    () => filteredList.filter((f) => !f.isReplied && f.rating <= 3).slice(0, 50).length,
    [filteredList],
  );

  const allFiltersCount =
    (days !== 'all' ? 1 : 0) +
    (rating !== 'all' ? 1 : 0) +
    (platform !== 'all' ? 1 : 0) +
    (hasReply !== 'all' ? 1 : 0) +
    (flagged ? 1 : 0);
  const hasActiveFilter = allFiltersCount > 0 || tab !== 'all' || searchTerm.trim() !== '';

  // §0.5 — CSV export follows the selected business + toolbar filters.
  // `buaze_qr` is not understood by the export endpoint (it would match
  // nothing), so that one filter falls back to all platforms. "All time"
  // exports all time (the endpoint caps a file at 10,000 rows); it used to
  // send 90 days while the toolbar said "Tüm zamanlar".
  const exportHref = useMemo(() => {
    const q = new URLSearchParams({ days: String(days), locale });
    if (scopedRestaurantId) q.set('restaurantId', scopedRestaurantId);
    if (platform !== 'all' && platform !== 'buaze_qr') q.set('platform', String(platform));
    if (rating !== 'all') q.set('rating', String(rating));
    return `/api/feedback/export?${q.toString()}`;
  }, [days, scopedRestaurantId, platform, rating, locale]);

  // Status tabs. Counts are shown only when exact: "Tümü" from the server
  // total, the others only once every row is loaded — never a 0 placeholder.
  const countsExact = !loading && !listError && !hasMore;
  const statusTabs: InboxTab[] = [
    { id: 'all', label: isTr ? 'Tümü' : 'All', count: loading || listError ? null : total },
    { id: 'unread', label: isTr ? 'Okunmamış' : 'Unread', count: countsExact ? counts.unread : null },
    {
      id: 'low',
      label: isTr ? 'Düşük puan' : 'Low rating',
      count: countsExact ? counts.low : null,
      title: isTr ? '1–3 yıldız' : '1–3 stars',
      tone: 'danger',
    },
    { id: 'replied', label: isTr ? 'Yanıtlandı' : 'Replied', count: countsExact ? counts.replied : null },
    { id: 'pending', label: isTr ? 'Beklemede' : 'Pending', count: countsExact ? counts.pending : null },
  ];

  // "Yanıtlandı" (tab) and "Yanıtsızlar" (filter) exclude each other —
  // together they always give an empty list. Choosing one clears the other.
  const onTabChange = (id: string) =>
    writeFilters(
      id === 'replied' && hasReply === 'pending'
        ? { tab: id, hasReply: 'all' }
        : { tab: id as ActiveTab },
    );
  const setUnrepliedOnly = (on: boolean) =>
    writeFilters(
      on && tab === 'replied' ? { hasReply: 'pending', tab: 'all' } : { hasReply: on ? 'pending' : 'all' },
    );

  // md+ inline on/off filters (server-side). No icons and plural / "only"
  // wording, so they read as filters and not as the detail pane's "İşaretle"
  // action. Same labels in the mobile filter sheet.
  const stateToggles: InboxToggle[] = [
    {
      id: 'no-reply',
      label: isTr ? 'Yanıtsızlar' : 'Unreplied',
      title: isTr ? 'Yalnız yanıtı olmayan yorumlar' : 'Only reviews without a reply',
      pressed: hasReply === 'pending',
      onToggle: () => setUnrepliedOnly(hasReply !== 'pending'),
    },
    {
      id: 'flagged',
      label: isTr ? 'Yalnız işaretliler' : 'Flagged only',
      title: isTr ? 'Yalnız işaretli yorumlar' : 'Only flagged reviews',
      pressed: flagged,
      onToggle: () => writeFilters({ flagged: !flagged }),
    },
  ];

  // The "Düşük puan" tab already covers 1–3 ★, so the rating select drops
  // its "1–3 ★ düşük" option — unless a ?rating=low link selected it.
  const ratingOptions = ratingFilterOptions(isTr).filter(
    (o) => o.value !== 'low' || rating === 'low',
  );

  const fmtAvg = (n: number) =>
    n.toLocaleString(isTr ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Header summary line.
  let summary: ReactNode = null;
  if (loading) {
    summary = <SkBox className="h-4 w-56" />;
  } else if (listError) {
    summary = null;
  } else if (serverFiltered) {
    summary = isTr ? (
      <>
        Filtreye uyan <strong className="font-semibold text-[#0A0A0A]">{total ?? feedbacks.length} yorum</strong>
      </>
    ) : (
      <>
        <strong className="font-semibold text-[#0A0A0A]">{total ?? feedbacks.length} reviews</strong> match the filters
      </>
    );
  } else if (weekStats.count === 0) {
    summary = isTr ? 'Bu hafta henüz yorum yok' : 'No reviews yet this week';
  } else if (!weekStats.exact) {
    summary = isTr ? (
      <>
        Bu hafta <strong className="font-semibold text-[#0A0A0A]">{weekStats.count}+ yorum</strong>
      </>
    ) : (
      <>
        This week <strong className="font-semibold text-[#0A0A0A]">{weekStats.count}+ reviews</strong>
      </>
    );
  } else {
    const showDelta = weekStats.delta !== null && Math.abs(weekStats.delta) >= 0.05;
    const deltaChip = showDelta ? (
      <span
        className={`rounded-full px-1.5 text-[11px] font-semibold ${
          (weekStats.delta ?? 0) > 0 ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FEF2F2] text-[#991B1B]'
        }`}
        title={isTr ? 'Önceki 7 güne göre' : 'Compared with the previous 7 days'}
      >
        {(weekStats.delta ?? 0) > 0 ? '↑' : '↓'} {fmtAvg(Math.abs(weekStats.delta ?? 0))}
      </span>
    ) : null;
    summary = isTr ? (
      <>
        Bu hafta <strong className="font-semibold text-[#0A0A0A]">{weekStats.count} yorum</strong>
        <span aria-hidden="true">·</span>
        ortalama <strong className="font-semibold text-[#0A0A0A]">{fmtAvg(weekStats.avg)} ★</strong>
        {deltaChip}
      </>
    ) : (
      <>
        This week <strong className="font-semibold text-[#0A0A0A]">{weekStats.count} reviews</strong>
        <span aria-hidden="true">·</span>
        <strong className="font-semibold text-[#0A0A0A]">{fmtAvg(weekStats.avg)} ★</strong> average
        {deltaChip}
      </>
    );
  }

  // List highlight only where the detail is visible next to it (§0.4).
  const listActiveId = isDesktop ? active?.id ?? null : null;

  // ============================================================
  // Render
  // ============================================================
  return (
    // §38.62 — full-bleed inbox (no outer max-width wrapper): header and
    // toolbar carry their own padding, the split panes run edge to edge and
    // scroll internally on lg.
    <div className="flex min-h-full w-full min-w-0 flex-col bg-white lg:min-h-0 lg:flex-1">
      {/* Header — hidden on the mobile detail view (the back bar is there). */}
      <div
        className={`px-4 pb-3 pt-5 sm:px-7 lg:pb-4 lg:pt-6 ${isMobileDetailView ? 'hidden lg:block' : ''}`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {/* Desktop shows the title in the shell topbar; keep the h1 in the
                accessibility tree there (sr-only) so the page always has one. */}
            <h1 className="bz-h-tight text-[24px] text-[#0A0A0A] lg:sr-only">
              {isTr ? 'Yorumlar' : 'Reviews'}
            </h1>
            <div className="mt-0.5 flex min-h-[20px] flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[#525252]">
              {summary}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportHref}
              download
              className="bz-btn bz-btn-sm max-sm:min-h-[44px]"
              title={
                isTr
                  ? 'Seçili işletme ve filtrelerle CSV indir'
                  : 'Download CSV for the selected business and filters'
              }
            >
              <Download size={13} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'Dışa aktar' : 'Export'}
            </a>
            <button
              type="button"
              onClick={onBulkAiReply}
              disabled={bulkBusy || loading || bulkEligibleCount === 0}
              className="bz-btn-primary bz-btn-sm max-sm:min-h-[44px]"
              title={
                bulkEligibleCount === 0
                  ? isTr
                    ? 'Yanıt bekleyen yorum yok'
                    : 'No reviews awaiting reply'
                  : isTr
                    ? 'Yanıt bekleyen en fazla 50 yorum için Pulse AI taslağı hazırlar; hiçbir şey otomatik gönderilmez.'
                    : 'Prepares Pulse AI drafts for up to 50 reviews awaiting reply; nothing is sent automatically.'
              }
            >
              {bulkBusy ? (
                <Loader2 size={13} strokeWidth={2} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
              )}
              {isTr ? 'AI taslakları' : 'AI drafts'}
              {!loading && bulkEligibleCount > 0 && (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#C6F24E] px-1.5 text-[11px] font-semibold leading-[18px] text-[#0A0A0A] tabular-nums">
                  {bulkEligibleCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <InboxToolbar
        isTr={isTr}
        className={isMobileDetailView ? 'hidden lg:block' : ''}
        tabs={statusTabs}
        activeTab={tab}
        onTabChange={onTabChange}
        listId="feedback-list"
        search={searchTerm}
        onSearchChange={setSearchTerm}
        platform={String(platform)}
        onPlatformChange={(v) => writeFilters({ platform: v as PlatformFilter })}
        rating={String(rating)}
        onRatingChange={(v) => writeFilters({ rating: v })}
        days={String(days)}
        onDaysChange={(v) => writeFilters({ days: v })}
        ratingOptions={ratingOptions}
        toggles={stateToggles}
        allFiltersCount={allFiltersCount}
        onOpenAllFilters={() => setFiltersOpen(true)}
        showClear={hasActiveFilter}
        onClear={onResetFilters}
      />

      {/* Split view: list | detail. 2 columns from lg; the list widens with
          the viewport (360 → 420 → 480) and the detail takes the rest. */}
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[480px_minmax(0,1fr)]">
        <aside
          className={`min-h-0 lg:overflow-y-auto lg:border-r lg:border-[#EDEDED] ${
            isMobileDetailView ? 'hidden lg:block' : ''
          }`}
        >
          <FeedbackList
            locale={locale}
            loading={loading}
            filteredList={filteredList}
            activeId={listActiveId}
            pulsedId={pulsedId}
            activeTab={tab}
            setActiveTab={(v) => writeFilters({ tab: v })}
            aiReadyCount={counts.aiReady}
            hasActiveFilter={hasActiveFilter}
            onResetFilters={onResetFilters}
            showBusiness={!scopedRestaurantId}
            onSelect={onSelectFeedback}
            degraded={degraded}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMoreFeedbacks}
            listError={listError}
            loadMoreError={loadMoreError}
            onRetryList={() => setListReloadKey((k) => k + 1)}
          />
        </aside>

        <div
          className={`min-w-0 flex-col lg:flex lg:min-h-0 ${isMobileDetailView ? 'flex' : 'hidden'}`}
        >
          {active ? (
            <FeedbackDetail
              feedback={active}
              locale={locale}
              showBackButton={isMobileDetailView}
              showBusiness={!scopedRestaurantId}
              onBack={onBackToList}
              onFlag={flagFeedback}
              onTogglePending={togglePending}
              sentReplies={sentReplies}
              sentLoading={sentLoading}
              aiLoading={aiLoading}
              aiRegenerating={aiRegenerating}
              aiSuggestion={aiSuggestion}
              aiSource={aiSource}
              aiFromBackground={aiFromBackground}
              aiTone={aiTone}
              setAiTone={setAiTone}
              aiDisabledByAdmin={aiDisabledByAdmin}
              onRegenerateAi={(tone) => onRegenerateAi(tone)}
              onUseAiAndSend={onUseAiAndSend}
              onCopyAiToDraft={onCopyAiToDraft}
              replyDraft={replyDraft}
              setReplyDraft={setReplyDraft}
              sendEmail={sendEmail}
              setSendEmail={setSendEmail}
              confirmResponsibility={confirmResponsibility}
              setConfirmResponsibility={setConfirmResponsibility}
              sendingReply={sendingReply}
              onSendReply={() => sendReply()}
              replyNotice={replyNotice}
            />
          ) : loading ? (
            <FeedbackDetailSkeleton />
          ) : isMobileDetailView ? (
            <div className="px-4 py-6">
              <EmptyState
                icon={<Inbox size={22} strokeWidth={1.5} />}
                title={isTr ? 'Yorum bulunamadı' : 'Review not found'}
                body={
                  isTr
                    ? 'Bu yorum mevcut filtrelerde yok ya da daha eski sayfalarda.'
                    : 'This review is not in the current filters or is on an older page.'
                }
                action={
                  <button type="button" onClick={onBackToList} className="bz-btn bz-btn-sm">
                    {isTr ? 'Yorumlara dön' : 'Back to reviews'}
                  </button>
                }
              />
            </div>
          ) : filteredList.length > 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 py-10">
              <EmptyState
                icon={<Inbox size={22} strokeWidth={1.5} />}
                title={isTr ? 'Bir yorum seç' : 'Select a review'}
                body={
                  isTr
                    ? 'Soldaki listeden bir yorum seçince detaylar burada görünecek.'
                    : 'Pick a review from the list to view details here.'
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      <FeedbackFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        locale={locale}
        daysFilter={String(days)}
        setDaysFilter={(v) => writeFilters({ days: v })}
        filterRating={String(rating)}
        setFilterRating={(v) => writeFilters({ rating: v })}
        ratingOptions={ratingOptions}
        platformFilter={platform}
        setPlatformFilter={(v) => writeFilters({ platform: v })}
        hasReplyFilter={hasReply}
        setHasReplyFilter={(v) => setUnrepliedOnly(v === 'pending')}
        flaggedOnly={flagged}
        setFlaggedOnly={(v) => writeFilters({ flagged: v })}
        hasActiveFilter={allFiltersCount > 0}
        onResetFilters={onResetFilters}
      />

      {/* §38.58 / §38.171 — bulk + flag/pending notice, above the mobile
          bottom nav (--dash-bottom-nav-h; 0 on lg). */}
      {bulkNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 bottom-[calc(var(--dash-bottom-nav-h)+12px)] z-50 max-w-[560px] rounded-2xl border px-4 py-3 shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 lg:bottom-4 ${
            bulkNotice.tone === 'success'
              ? 'border-[#A8D62E] bg-[#0A0A0A] text-white'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className={`mt-0.5 shrink-0 ${
                bulkNotice.tone === 'success' ? 'text-[#C6F24E]' : 'text-[#DC2626]'
              }`}
            />
            <p className="flex-1 text-[13px] leading-snug">{bulkNotice.msg}</p>
            <button
              type="button"
              onClick={() => setBulkNotice(null)}
              className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              aria-label={isTr ? 'Bildirimi kapat' : 'Dismiss notice'}
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedbacksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  // §38.49 — client component cannot be async; React `use()` unwraps params.
  const resolvedParams = use(params);
  // Suspense fallback null: the segment loading.tsx covers navigation and the
  // page renders its own skeleton rows while the list loads (§40.10).
  return (
    <Suspense fallback={null}>
      <FeedbacksContent locale={resolvedParams.locale} />
    </Suspense>
  );
}
