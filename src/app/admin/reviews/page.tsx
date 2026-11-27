'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { replyErrorMessage } from '@/components/reply/reply-errors';
import { usePathname, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Inbox, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { buildReplyTemplate } from '@/lib/reply-template';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { InboxToolbar } from '@/components/dashboard/feedbacks/InboxToolbar';
import type { InboxTab } from '@/components/dashboard/feedbacks/InboxStatusTabs';

import type {
  AdminTab,
  AiSource,
  AiTone,
  CountsResp,
  DegradedMeta,
  FeedbackRow,
  HasReplyFilter,
  PlatformFilter,
  ReplyTone,
  SentReply,
} from './_components/types';
import { AdminFeedbackList } from './_components/AdminFeedbackList';
import { AdminFeedbackDetail, AdminFeedbackDetailSkeleton } from './_components/AdminFeedbackDetail';
import { AdminFeedbackFiltersModal } from './_components/AdminFeedbackFiltersModal';
import { BulkActionToolbar } from './_components/BulkActionToolbar';
import {
  ADMIN_REVIEWS_ROOT_CLASS,
  ADMIN_REVIEWS_SPLIT_CLASS,
  ADMIN_REVIEWS_LIST_CLASS,
  ADMIN_REVIEWS_DETAIL_CLASS,
  AdminReviewsHeader,
  AdminReviewsSkeleton,
} from './_components/AdminReviewsChrome';

// URL filter defaults (CLAUDE.md §36). Values equal to their default are
// removed from the URL, so existing deep links keep working unchanged.
const FILTER_DEFAULTS = {
  tab: 'all' as AdminTab,
  platform: 'all' as PlatformFilter,
  // rating / days: parity with the owner inbox, existing API params.
  rating: 'all',
  days: 'all',
  hasReply: 'all' as HasReplyFilter,
  // boolean literal-type cast (CLAUDE.md §36.3).
  flagged: false as boolean,
  assigned: false as boolean,
  // `/admin/restaurants/[id]` → "Yorum geçmişini gör" links here with
  // ?restaurantId=… (shown as a removable chip in the toolbar).
  restaurantId: '',
};
type FilterKey = keyof typeof FILTER_DEFAULTS;

// Pagination — "Daha fazla göster" (25 per page).
const PAGE_SIZE = 25;

const LG_QUERY = '(min-width: 1024px)';
/** Desktop split view (list + detail side by side). */
const isLgUp = () => typeof window !== 'undefined' && window.matchMedia(LG_QUERY).matches;

/** Client-side tab + search filter over the loaded rows. */
function applyClientFilters(
  rows: FeedbackRow[],
  tab: AdminTab,
  search: string,
  keptInNewTab: ReadonlySet<string>,
  isTr: boolean,
): FeedbackRow[] {
  let out = rows;
  if (tab === 'new') out = out.filter((r) => !r.isReplied || keptInNewTab.has(r.id));
  else if (tab === 'attention') out = out.filter((r) => r.rating <= 3);
  else if (tab === 'replied') out = out.filter((r) => r.isReplied);
  const q = search.trim().toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US');
  if (q) {
    out = out.filter(
      (r) =>
        (r.customerName ?? '').toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(q) ||
        (r.comment ?? '').toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(q),
    );
  }
  return out;
}

function AdminReviewsContent() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================================
  // URL filter state — read through useUrlFilter (CLAUDE.md §36). Writes go
  // through `history.replaceState`, not the hook's `router.replace`: the page
  // is fully client-side, so the RSC round trip `router.replace` costs on
  // every tab click / select change only delayed the URL — and with it the
  // tab and the list — by a server hop (owner inbox parity). Next 15 keeps
  // `useSearchParams` in sync with replaceState.
  // ============================================================
  const filters = useUrlFilter(FILTER_DEFAULTS);
  const {
    tab,
    platform,
    rating,
    days,
    hasReply,
    flagged,
    assigned,
    restaurantId: restaurantFilter,
  } = filters.values;

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
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [counts, setCounts] = useState<CountsResp | null>(null);
  const [degraded, setDegraded] = useState<DegradedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId ?? idParam);
  const [search, setSearch] = useState('');
  const [filtersModal, setFiltersModal] = useState<null | 'all' | 'more'>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Detail panel actions
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSource, setAiSource] = useState<AiSource>(null);
  const [aiTone, setAiTone] = useState<AiTone>('warm');
  // Reply status line (inside the composer / the replied gate).
  const [notice, setNotice] = useState<{ msg: string; tone: ReplyTone } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Action toast (flag / assign / bulk) — visible even when the composer is
  // not rendered (high-rated or replied reviews).
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  // §45 — per-message responsibility acknowledgement. Resets after every
  // successful send and every review switch (effect below).
  const [confirmResponsibility, setConfirmResponsibility] = useState(false);
  // §38.237 — sent reply thread.
  const [sentReplies, setSentReplies] = useState<SentReply[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  // Replies sent from this page, per review. A thread fetch that was already
  // in flight when the admin hit Send can land after the POST response; it
  // must neither drop the new reply nor list it twice.
  const sentLocallyRef = useRef<Map<string, SentReply[]>>(new Map());

  // Notification deep-link pulse one-shot
  const focusAppliedRef = useRef<string | null>(null);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // A failed list fetch shows an error + retry, never a silent "no reviews".
  const [listError, setListError] = useState(false);
  const [listReloadKey, setListReloadKey] = useState(0);

  // Reviews answered while the "Yanıt bekliyor" tab is open stay listed (now
  // shown as replied) until the tab changes or the list reloads — otherwise
  // the row vanished from under the cursor right after sending.
  const [keptInNewTab, setKeptInNewTab] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    setKeptInNewTab(new Set());
  }, [tab]);

  // Mobile list ↔ detail navigation bookkeeping (history API, §0.11).
  const cameFromListRef = useRef(false);
  const listScrollYRef = useRef(0);
  const lastOpenedIdRef = useRef<string | null>(null);
  const focusDetailOnOpenRef = useRef(false);

  // Remembered business names for the restaurantId chip (rows can be empty
  // under a filter or while loading).
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});

  const tabRef = useRef(tab);
  tabRef.current = tab;
  const searchRef = useRef(search);
  searchRef.current = search;

  // ============================================================
  // Build query params for /api/feedback (existing params only).
  // ============================================================
  const buildListQuery = (targetPage: number, extra?: Record<string, string>) => {
    const query = new URLSearchParams({
      page: String(targetPage),
      limit: String(PAGE_SIZE),
    });
    if (platform !== 'all') query.set('platform', String(platform));
    if (rating !== 'all') query.set('rating', String(rating));
    if (days !== 'all') query.set('days', String(days));
    if (hasReply === 'pending') query.set('hasReply', 'false');
    if (flagged) query.set('isFlagged', 'true');
    if (assigned) query.set('isAssigned', 'me');
    if (restaurantFilter) query.set('restaurantId', restaurantFilter);
    if (extra) for (const k in extra) query.set(k, extra[k]);
    return query;
  };

  const rememberNames = (list: FeedbackRow[]) => {
    const found: Record<string, string> = {};
    for (const r of list) {
      if (r.restaurantId && r.restaurant?.name) found[r.restaurantId] = r.restaurant.name;
    }
    if (Object.keys(found).length > 0) setRestaurantNames((prev) => ({ ...prev, ...found }));
  };

  // ============================================================
  // Fetch list + counts (parallel).
  //
  // §0.1 race guard: every list request takes a ticket from `listReqRef`; a
  // response only writes state if its ticket is still the latest — for the
  // list AND the counts, so a slow response from a previous filter can never
  // overwrite the current one (or have a bulk action act on stale rows).
  // ============================================================
  const listReqRef = useRef(0);

  useEffect(() => {
    const req = ++listReqRef.current;
    setLoading(true);
    setPage(1);
    setHasMore(false);
    setTotal(null);
    setListError(false);
    setLoadMoreError(false);
    setLoadingMore(false);
    setKeptInNewTab(new Set());
    // Selection belongs to the previous result set.
    setSelectedIds(new Set());
    (async () => {
      try {
        const [listRes, countsRes] = await Promise.all([
          fetch(`/api/feedback?${buildListQuery(1).toString()}`),
          fetch(
            restaurantFilter
              ? `/api/feedback/counts?restaurantId=${encodeURIComponent(restaurantFilter)}`
              : '/api/feedback/counts',
          ),
        ]);
        if (req !== listReqRef.current) return;
        if (listRes.ok) {
          const data = await listRes.json();
          if (req !== listReqRef.current) return;
          const list: FeedbackRow[] = data.data ?? [];
          setRows(list);
          rememberNames(list);
          setActiveId((curr) => {
            if (curr && list.some((r) => r.id === curr)) return curr;
            // Desktop: fall back to the first row of the visible (tab +
            // search) list. Below lg nothing is auto-selected; an explicitly
            // opened mobile detail keeps its id.
            if (isLgUp()) {
              const visible = applyClientFilters(list, tabRef.current, searchRef.current, new Set(), isTr);
              return visible[0]?.id ?? null;
            }
            return isMobileDetailViewRef.current ? curr : null;
          });
          setDegraded(data?.meta?.degraded ?? null);
          const totalNum = Number(data?.meta?.total);
          setTotal(Number.isFinite(totalNum) ? totalNum : list.length);
          const totalPages = Number(data?.meta?.totalPages ?? 1);
          setHasMore(totalPages > 1);
        } else {
          setRows([]);
          setActiveId(null);
          setDegraded(null);
          setListError(true);
        }
        if (countsRes.ok) {
          const c = await countsRes.json().catch(() => null);
          if (req !== listReqRef.current) return;
          if (c) setCounts(c);
        }
      } catch (err) {
        if (req !== listReqRef.current) return;
        console.error(err);
        setRows([]);
        setActiveId(null);
        setDegraded(null);
        setListError(true);
      }
      if (req === listReqRef.current) setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, rating, days, hasReply, flagged, assigned, restaurantFilter, listReloadKey]);

  const loadMoreRows = async () => {
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
        const list: FeedbackRow[] = data.data ?? [];
        setRows((prev) => {
          // Pages can overlap when new reviews arrive → skip duplicate ids.
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...list.filter((r) => !seen.has(r.id))];
        });
        rememberNames(list);
        setPage(nextPage);
        const totalNum = Number(data?.meta?.total);
        if (Number.isFinite(totalNum)) setTotal(totalNum);
        const totalPages = Number(data?.meta?.totalPages ?? 1);
        setHasMore(nextPage < totalPages);
      }
    } catch (err) {
      if (req !== listReqRef.current) return;
      console.error(err);
      setLoadMoreError(true);
    }
    if (req === listReqRef.current) setLoadingMore(false);
  };

  // ============================================================
  // Filtered list (client-side: tab + search)
  // ============================================================
  const filtered = useMemo(
    () => applyClientFilters(rows, tab, search, keptInNewTab, isTr),
    [rows, tab, search, keptInNewTab, isTr],
  );

  // `tab` and `search` filter purely client-side (they are absent from
  // buildListQuery), so they don't re-run the fetch effect that clears the
  // selection. Rows hidden by them stayed selected and the next bulk action
  // hit them too (CLAUDE.md §23.3.1 + Phase 11.21).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab, search]);

  // Desktop: when the tab or search hides the selected review, move the
  // selection to the first visible row (or clear it so the detail pane does
  // not keep showing a review next to the list's "Yorum yok").
  useEffect(() => {
    if (!isLgUp() || loading) return;
    setActiveId((curr) => {
      if (curr && filtered.some((r) => r.id === curr)) return curr;
      return filtered[0]?.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const active = useMemo(() => {
    const found = activeId ? rows.find((r) => r.id === activeId) : undefined;
    if (found) return found;
    // Desktop never shows an empty detail pane when rows are visible; mobile
    // only shows a detail the admin actually opened.
    return isDesktop ? filtered[0] ?? null : null;
  }, [rows, activeId, filtered, isDesktop]);

  const activeFeedbackId = active?.id ?? null;
  const activeCustomerEmail = active?.customerEmail ?? null;
  // Results of a request started for review A must not land in review B's
  // composer when the admin switched in the meantime.
  const activeIdRef = useRef<string | null>(activeFeedbackId);
  activeIdRef.current = activeFeedbackId;

  // Composer state follows the selected review: switching reviews drops the
  // draft, the AI source, the notice and — §45 — the responsibility consent.
  useEffect(() => {
    setDraft('');
    setAiSource(null);
    setNotice(null);
    setConfirmResponsibility(false);
    setSendEmail(Boolean(activeCustomerEmail));
  }, [activeFeedbackId, activeCustomerEmail]);

  // §38.237 — sent replies of the selected review. `cancelled` guards against
  // a stale response landing on a newer selection.
  useEffect(() => {
    if (!activeFeedbackId) {
      setSentReplies([]);
      setSentLoading(false);
      return;
    }
    let cancelled = false;
    setSentLoading(true);
    setSentReplies([]);
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${activeFeedbackId}/reply`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          const server: SentReply[] = Array.isArray(data?.replies) ? data.replies : [];
          const known = new Set(server.map((r) => r.id));
          const local = (sentLocallyRef.current.get(activeFeedbackId) ?? []).filter(
            (r) => !known.has(r.id),
          );
          setSentReplies([...server, ...local]);
        } else {
          setSentReplies(sentLocallyRef.current.get(activeFeedbackId) ?? []);
        }
      } catch {
        if (!cancelled) setSentReplies([]);
      } finally {
        if (!cancelled) setSentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFeedbackId]);

  // ============================================================
  // Notification deep-link: select + scroll + lime pulse
  // ============================================================
  useEffect(() => {
    if (!focusId || loading || focusAppliedRef.current === focusId) return;
    if (!rows.some((r) => r.id === focusId)) return;
    focusAppliedRef.current = focusId;
    setActiveId(focusId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-feedback-id="${focusId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsedId(focusId);
      setTimeout(() => setPulsedId(null), 1800);
    });
  }, [focusId, loading, rows]);

  // ============================================================
  // Notices
  // ============================================================
  // Reply status line dwell: 5s (success/info), 8s (error) — §38.15.
  const flash = (msg: string, tone: ReplyTone = 'info') => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ msg, tone });
    noticeTimerRef.current = setTimeout(() => setNotice(null), tone === 'error' ? 8000 : 5000);
  };
  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  // Toast auto-dismiss: 5s success, 8s error.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === 'error' ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const updateRow = (id: string, patch: Partial<FeedbackRow>) => {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const bumpCounts = (delta: Partial<CountsResp>) => {
    setCounts((c) =>
      c
        ? {
            all: c.all + (delta.all ?? 0),
            new: c.new + (delta.new ?? 0),
            attention: c.attention + (delta.attention ?? 0),
            replied: c.replied + (delta.replied ?? 0),
          }
        : c,
    );
  };

  // ============================================================
  // Action handlers
  // ============================================================
  const onSuggest = async (toneOverride?: AiTone) => {
    if (!active) return;
    const targetId = active.id;
    const { customerName, rating } = active;
    const stillShown = () => activeIdRef.current === targetId;
    const applyTemplate = () => {
      setDraft(buildReplyTemplate({ name: customerName, rating, locale }));
      setAiSource('template-fallback');
    };
    setSuggesting(true);
    try {
      const res = await fetch(`/api/feedback/${targetId}/suggest-reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale, tone: toneOverride }),
      });
      if (!stillShown()) return;
      if (res.ok) {
        const data = await res.json();
        if (!stillShown()) return;
        if (typeof data?.suggestion === 'string' && data.suggestion.length > 0) {
          setDraft(data.suggestion.slice(0, 2000));
          setAiSource((data.source as AiSource) ?? 'template');
        }
      } else if (res.status === 429) {
        flash(isTr ? 'Çok sık istek — biraz bekleyin.' : 'Too many requests — slow down.', 'error');
      } else {
        const data = await res.json().catch(() => null);
        if (!stillShown()) return;
        if (res.status === 403 && data?.error === 'pulse_ai_disabled_by_admin') {
          // Not an outage: Pulse AI is switched off for this business in
          // Paket Özellikleri. Say so instead of "AI is down, retry".
          flash(
            isTr
              ? 'Pulse AI bu işletme için kapalı (Paket Özellikleri).'
              : 'Pulse AI is turned off for this business (package features).',
            'error',
          );
          return;
        }
        applyTemplate();
      }
    } catch {
      if (stillShown()) applyTemplate();
    } finally {
      setSuggesting(false);
    }
  };

  const onSend = async () => {
    if (!active || sending || !draft.trim() || !confirmResponsibility) return;
    const targetId = active.id;
    const stillShown = () => activeIdRef.current === targetId;
    setSending(true);
    const wantsEmail = sendEmail && Boolean(active.customerEmail);
    const replySource =
      aiSource === 'openai'
        ? 'ai_copilot'
        : aiSource === 'template' || aiSource === 'template-fallback'
          ? 'template_fallback'
          : 'manual';
    try {
      const res = await fetch(`/api/feedback/${active.id}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: draft,
          channel: wantsEmail ? 'email' : 'internal',
          sendEmail: wantsEmail,
          locale,
          source: replySource,
          confirmResponsibility,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const wasReplied = active.isReplied;
        if (tabRef.current === 'new') {
          setKeptInNewTab((prev) => new Set(prev).add(active.id));
        }
        updateRow(active.id, { isReplied: true, hasPendingAiDraft: false });
        if (!wasReplied) bumpCounts({ new: -1, replied: 1 });
        // §38.237 — thread entry from the POST response (`reply.id`), so it
        // dedupes against a thread fetch that already contains it.
        const entry: SentReply = {
          id: data?.reply?.id ?? `tmp-${Date.now()}-${active.id}`,
          body: data?.reply?.body ?? draft,
          channel: data?.reply?.channel ?? (wantsEmail ? 'email' : 'internal'),
          status: data?.reply?.status ?? (data?.email?.status === 'failed' ? 'failed' : 'sent'),
          createdAt: data?.reply?.createdAt ?? new Date().toISOString(),
        };
        sentLocallyRef.current.set(active.id, [
          ...(sentLocallyRef.current.get(active.id) ?? []),
          entry,
        ]);
        // The admin opened another review while this one was sending: the
        // row is updated above, the composer on screen is left alone.
        if (!stillShown()) return;
        setSentReplies((list) => [...list.filter((r) => r.id !== entry.id), entry]);
        setDraft('');
        setAiSource(null);
        setConfirmResponsibility(false);
        const emailStatus = data?.email?.status as 'sent' | 'skipped' | 'failed' | undefined;
        if (emailStatus === 'sent') {
          flash(
            isTr
              ? `E-posta gönderildi: ${active.customerEmail}`
              : `Email sent to ${active.customerEmail}`,
            'success',
          );
        } else if (emailStatus === 'failed') {
          flash(
            isTr ? 'Yanıt kaydedildi ama e-posta gönderilemedi' : 'Saved but email delivery failed',
            'error',
          );
        } else {
          flash(isTr ? 'Yanıt kaydedildi (dahili)' : 'Reply saved (internal)', 'success');
        }
      } else if (stillShown()) {
        const data = await res.json().catch(() => ({}));
        flash(replyErrorMessage(data, isTr, res.status), 'error');
      }
    } catch {
      if (stillShown()) {
        flash(
          isTr
            ? 'Bağlantı hatası. Yanıt gönderilemedi, lütfen tekrar deneyin.'
            : 'Network error. The reply was not sent, please try again.',
          'error',
        );
      }
    } finally {
      setSending(false);
    }
  };

  // Flag toggle — POST adds, DELETE removes (§38.238).
  const onFlag = async () => {
    if (!active || flagging) return;
    const targetId = active.id;
    const wasFlagged = active.isFlagged === true;
    setFlagging(true);
    try {
      const res = await fetch(`/api/feedback/${targetId}/flag`, {
        method: wasFlagged ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: wasFlagged ? undefined : JSON.stringify({}),
      });
      if (res.ok) {
        updateRow(targetId, { isFlagged: !wasFlagged });
        setToast({
          msg: wasFlagged
            ? isTr
              ? 'İşaret kaldırıldı'
              : 'Flag removed'
            : isTr
              ? 'Yorum işaretlendi'
              : 'Review flagged',
          tone: 'success',
        });
      } else {
        setToast({ msg: isTr ? 'İşaret güncellenemedi' : 'Could not update the flag', tone: 'error' });
      }
    } catch {
      setToast({ msg: isTr ? 'Bağlantı hatası' : 'Network error', tone: 'error' });
    }
    setFlagging(false);
  };

  const onAssign = async () => {
    if (!active || assigning) return;
    const targetId = active.id;
    setAssigning(true);
    try {
      const res = await fetch(`/api/feedback/${targetId}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assigneeId: 'self' }),
      });
      if (res.ok) {
        updateRow(targetId, { isAssigned: true });
        setToast({ msg: isTr ? 'Size atandı' : 'Assigned to you', tone: 'success' });
      } else {
        setToast({ msg: isTr ? 'Atama başarısız' : 'Assign failed', tone: 'error' });
      }
    } catch {
      setToast({ msg: isTr ? 'Bağlantı hatası' : 'Network error', tone: 'error' });
    }
    setAssigning(false);
  };

  // ============================================================
  // Bulk actions
  // ============================================================
  const runBulk = async (action: 'flag' | 'unflag' | 'assign' | 'bulk_mark_read') => {
    if (selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      // §38.238 — /api/feedback/bulk validates `ids` with Zod `.max(50)`;
      // send server-sized chunks and aggregate the counters.
      const BULK_ID_CAP = 50;
      const idList = Array.from(selectedIds);
      let processed = 0;
      let skipped = 0;
      let failure: string | null = null;

      for (let i = 0; i < idList.length; i += BULK_ID_CAP) {
        const chunk = idList.slice(i, i + BULK_ID_CAP);
        const res = await fetch('/api/feedback/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk, action }),
        });
        if (!res.ok) {
          // 429 = the 10/min/actor bulk rate limit. Anything already
          // processed stays processed, so report the partial result.
          failure =
            res.status === 429
              ? isTr
                ? 'Hız sınırına takıldı, kalan yorumlar işlenmedi'
                : 'Rate limited — remaining reviews were not processed'
              : isTr
                ? 'Toplu işlem başarısız'
                : 'Bulk action failed';
          break;
        }
        const data = await res.json();
        processed += data.processed ?? 0;
        skipped += data.skipped ?? 0;
      }

      setToast({
        msg: failure
          ? `${failure}${processed > 0 ? ` · ${processed}${isTr ? ' işlendi' : ' processed'}` : ''}`
          : isTr
            ? `${processed} yorum işlendi` + (skipped > 0 ? ` (${skipped} atlandı)` : '')
            : `${processed} reviews processed` + (skipped > 0 ? ` (${skipped} skipped)` : ''),
        tone: failure ? 'error' : 'success',
      });
      setSelectedIds(new Set());
      // Re-fetch to reflect the new flag / assignment / read state, keeping
      // the filters and the number of rows already loaded. /api/feedback
      // clamps `limit` to 100 (§38.238), so clamp here too and keep `page`
      // consistent with what is actually loaded.
      const req = ++listReqRef.current;
      const LIST_LIMIT_CAP = 100;
      const refreshLimit = Math.min(PAGE_SIZE * page, LIST_LIMIT_CAP);
      const refresh = await fetch(
        `/api/feedback?${buildListQuery(1, { limit: String(refreshLimit) }).toString()}`,
      );
      if (req === listReqRef.current && refresh.ok) {
        const d = await refresh.json();
        if (req === listReqRef.current) {
          const next: FeedbackRow[] = d.data ?? [];
          setRows(next);
          setPage(Math.max(1, Math.ceil(next.length / PAGE_SIZE)));
          // The bumped request ticket cancelled any in-flight "load more";
          // its spinner and the paging state are reset from this response.
          setLoadingMore(false);
          const totalNum = Number(d?.meta?.total);
          if (Number.isFinite(totalNum)) {
            setTotal(totalNum);
            setHasMore(next.length < totalNum);
          }
          setLoading(false);
        }
      }
    } catch {
      setToast({ msg: isTr ? 'Toplu işlem başarısız' : 'Bulk action failed', tone: 'error' });
    }
    setBulkBusy(false);
  };

  // ============================================================
  // List ↔ detail navigation (§0.11) — history API instead of router.push,
  // so a row tap / back press costs no RSC server round-trip. Next 15 keeps
  // useSearchParams in sync with pushState/replaceState.
  // ============================================================
  const buildUrl = (overrides: { id?: string | null; view?: 'detail' | null }) => {
    const next = new URLSearchParams(window.location.search);
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
    if (isLgUp()) {
      // Desktop: keep the URL shareable without stacking a history entry
      // per review.
      window.history.replaceState(null, '', buildUrl({ id, view: null }));
    } else {
      cameFromListRef.current = true;
      listScrollYRef.current = window.scrollY;
      lastOpenedIdRef.current = id;
      focusDetailOnOpenRef.current = true;
      window.history.pushState(null, '', buildUrl({ id, view: 'detail' }));
    }
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
      document.getElementById(`feedback-detail-title-${id}`)?.focus({ preventScroll: true });
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

  // Reset every filter + the tab + search; id / view / focus / restaurantId
  // stay (the restaurant chip has its own ×).
  const onResetFilters = () => {
    setSearch('');
    writeFilters({
      tab: 'all',
      platform: 'all',
      rating: 'all',
      days: 'all',
      hasReply: 'all',
      flagged: false,
      assigned: false,
    });
  };

  // Bulk select-all (current filtered window)
  const onToggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) filtered.forEach((r) => next.add(r.id));
      else filtered.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const onToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const moreFiltersCount = (hasReply !== 'all' ? 1 : 0) + (flagged ? 1 : 0) + (assigned ? 1 : 0);
  const allFiltersCount =
    (platform !== 'all' ? 1 : 0) +
    (rating !== 'all' ? 1 : 0) +
    (days !== 'all' ? 1 : 0) +
    moreFiltersCount;
  const hasActiveFilter = allFiltersCount > 0 || tab !== 'all' || search.trim() !== '';

  // Status tabs. `/api/feedback/counts` covers the whole (business-scoped)
  // inbox, so its numbers are only shown while no server-side filter narrows
  // the list. With a filter, "Tümü" shows the filtered total from the list
  // response and the other tabs only exact client-side counts (all rows
  // loaded) — never a mismatched or placeholder number.
  const serverFiltered = allFiltersCount > 0;
  const countsReady = !loading && !listError;
  const allLoaded = countsReady && !hasMore;
  const localCounts = useMemo(
    () => ({
      new: rows.filter((r) => !r.isReplied).length,
      attention: rows.filter((r) => r.rating <= 3).length,
      replied: rows.filter((r) => r.isReplied).length,
    }),
    [rows],
  );
  const tabCount = (key: 'all' | 'new' | 'attention' | 'replied'): number | null => {
    if (!countsReady) return null;
    if (!serverFiltered && counts) return counts[key];
    if (key === 'all') return total;
    return allLoaded ? localCounts[key] : null;
  };
  const statusTabs: InboxTab[] = [
    { id: 'all', label: isTr ? 'Tümü' : 'All', count: tabCount('all') },
    { id: 'new', label: isTr ? 'Yanıtsız' : 'Unreplied', count: tabCount('new') },
    {
      id: 'attention',
      label: isTr ? 'Düşük puan' : 'Low rating',
      count: tabCount('attention'),
      title: isTr ? '1–3 yıldız' : '1–3 stars',
      tone: 'danger',
    },
    { id: 'replied', label: isTr ? 'Yanıtlandı' : 'Replied', count: tabCount('replied') },
  ];

  const restaurantName = restaurantFilter
    ? restaurantNames[restaurantFilter] ??
      rows.find((r) => r.restaurantId === restaurantFilter)?.restaurant?.name ??
      null
    : null;
  const restaurantChip = restaurantFilter ? (
    <button
      type="button"
      onClick={() => writeFilters({ restaurantId: '' })}
      className="inline-flex h-11 max-w-full items-center gap-1.5 rounded-full bg-pn-accent-soft px-4 text-[13px] font-medium text-pn-accent transition-colors duration-200 hover:bg-[#E2F9E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-1 active:scale-[.97] md:h-[46px]"
      title={isTr ? 'İşletme filtresini kaldır' : 'Remove the business filter'}
    >
      <span className="truncate">
        {isTr
          ? `${restaurantName ?? 'Seçili işletme'} yorumları`
          : `${restaurantName ?? 'Selected business'} reviews`}
      </span>
      <X size={14} strokeWidth={2} aria-hidden="true" className="shrink-0 text-pn-accent" />
      <span className="sr-only">{isTr ? '— filtreyi kaldır' : '— remove filter'}</span>
    </button>
  ) : null;

  // List highlight only where the detail is visible next to it.
  const listActiveId = isDesktop ? active?.id ?? null : null;

  // ============================================================
  // Render
  // ============================================================
  return (
    // Full-bleed inbox (owner parity, §38.62): header and toolbar carry their
    // own padding, the split panes run edge to edge and scroll internally on
    // lg. `w-full min-w-0` keeps the root at the viewport width on mobile —
    // the old `mx-auto` wrapper shrank to its min-content width (490px at
    // 390), clipping the right edge of every row.
    <div className={ADMIN_REVIEWS_ROOT_CLASS}>
      <AdminReviewsHeader isTr={isTr} className={isMobileDetailView ? 'hidden lg:block' : ''} />

      <InboxToolbar
        isTr={isTr}
        className={isMobileDetailView ? 'hidden lg:block' : ''}
        tabs={statusTabs}
        activeTab={tab}
        onTabChange={(id) =>
          writeFilters(
            id === 'replied' && hasReply === 'pending'
              ? { tab: 'replied', hasReply: 'all' }
              : { tab: id as AdminTab },
          )
        }
        listId="feedback-list"
        search={search}
        onSearchChange={setSearch}
        platform={String(platform)}
        onPlatformChange={(v) => writeFilters({ platform: v as PlatformFilter })}
        rating={String(rating)}
        onRatingChange={(v) => writeFilters({ rating: v })}
        days={String(days)}
        onDaysChange={(v) => writeFilters({ days: v })}
        moreFiltersCount={moreFiltersCount}
        allFiltersCount={allFiltersCount}
        onOpenMoreFilters={() => setFiltersModal('more')}
        onOpenAllFilters={() => setFiltersModal('all')}
        showClear={hasActiveFilter}
        onClear={onResetFilters}
        filtersMode="button"
        leading={restaurantChip}
      />

      {/* Split view: list | detail. */}
      <div className={ADMIN_REVIEWS_SPLIT_CLASS}>
        <aside className={`${ADMIN_REVIEWS_LIST_CLASS} ${isMobileDetailView ? 'hidden lg:block' : ''}`}>
          <AdminFeedbackList
            isTr={isTr}
            loading={loading}
            filtered={filtered}
            activeId={listActiveId}
            pulsedId={pulsedId}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            hasActiveFilter={hasActiveFilter}
            onResetFilters={onResetFilters}
            onSelect={onSelectFeedback}
            degraded={degraded}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMoreRows}
            loadMoreError={loadMoreError}
            listError={listError}
            onRetryList={() => setListReloadKey((k) => k + 1)}
          />
        </aside>

        <div className={`${ADMIN_REVIEWS_DETAIL_CLASS} ${isMobileDetailView ? 'flex' : 'hidden'}`}>
          {active ? (
            <AdminFeedbackDetail
              feedback={active}
              isTr={isTr}
              locale={locale}
              showBackButton={isMobileDetailView}
              onBack={onBackToList}
              flagging={flagging}
              onFlag={onFlag}
              assigning={assigning}
              onAssign={onAssign}
              suggesting={suggesting}
              aiSource={aiSource}
              aiTone={aiTone}
              setAiTone={setAiTone}
              onSuggest={onSuggest}
              draft={draft}
              setDraft={setDraft}
              sendEmail={sendEmail}
              setSendEmail={setSendEmail}
              confirmResponsibility={confirmResponsibility}
              setConfirmResponsibility={setConfirmResponsibility}
              sending={sending}
              onSend={onSend}
              notice={notice}
              sentReplies={sentReplies}
              sentLoading={sentLoading}
            />
          ) : loading ? (
            <AdminFeedbackDetailSkeleton />
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
                  <button type="button" onClick={onBackToList} className="bz-btn bg-[#F6F6F6] hover:bg-[#EDEDED]">
                    {isTr ? 'Yorumlara dön' : 'Back to reviews'}
                  </button>
                }
              />
            </div>
          ) : filtered.length > 0 ? (
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

      <AdminFeedbackFiltersModal
        open={filtersModal !== null}
        compact={filtersModal === 'more'}
        onClose={() => setFiltersModal(null)}
        isTr={isTr}
        daysFilter={String(days)}
        setDaysFilter={(v) => writeFilters({ days: v })}
        ratingFilter={String(rating)}
        setRatingFilter={(v) => writeFilters({ rating: v })}
        platformFilter={platform}
        setPlatformFilter={(v) => writeFilters({ platform: v })}
        hasReplyFilter={hasReply}
        setHasReplyFilter={(v) =>
          writeFilters(
            v === 'pending' && tab === 'replied' ? { hasReply: v, tab: 'all' } : { hasReply: v },
          )
        }
        flaggedOnly={flagged}
        setFlaggedOnly={(v) => writeFilters({ flagged: v })}
        assignedToMe={assigned}
        setAssignedToMe={(v) => writeFilters({ assigned: v })}
        hasActiveFilter={filtersModal === 'more' ? moreFiltersCount > 0 : allFiltersCount > 0}
        onResetFilters={() => {
          if (filtersModal === 'more') {
            writeFilters({ hasReply: 'all', flagged: false, assigned: false });
          } else {
            onResetFilters();
          }
        }}
      />

      {/* Bulk action floating toolbar */}
      <BulkActionToolbar
        isTr={isTr}
        count={selectedIds.size}
        busy={bulkBusy}
        onFlag={() => runBulk('flag')}
        onUnflag={() => runBulk('unflag')}
        onAssign={() => runBulk('assign')}
        onMarkRead={() => runBulk('bulk_mark_read')}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Action toast (flag / assign / bulk) — above the mobile bottom nav
          (--dash-bottom-nav-h; 0 on lg) and above the bulk bar while a
          selection is active. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 z-50 max-w-[560px] rounded-[24px] border px-4 py-3 shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 ${
            // PanelSelectionBar is ~162px tall below sm (2×2 action grid) and
            // ~106px from sm (one row); keep a 12px gap above it.
            selectedIds.size > 0
              ? 'bottom-[calc(var(--dash-bottom-nav-h)+186px)] sm:bottom-[calc(var(--dash-bottom-nav-h)+130px)] lg:bottom-[134px]'
              : 'bottom-[calc(var(--dash-bottom-nav-h)+12px)] lg:bottom-4'
          } ${
            toast.tone === 'success'
              ? 'border-pn-accent-hover bg-pn-accent text-white'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.tone === 'success' ? (
              <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-white" />
            ) : (
              <AlertCircle size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-[#DC2626]" />
            )}
            <p className="flex-1 text-[13px] leading-snug">{toast.msg}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className={`-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                toast.tone === 'success' ? 'hover:bg-white/10' : 'hover:bg-[#FEE2E2]'
              }`}
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

function AdminReviewsFallback() {
  const { locale } = useAdminTranslation();
  return <AdminReviewsSkeleton isTr={locale === 'tr'} />;
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<AdminReviewsFallback />}>
      <AdminReviewsContent />
    </Suspense>
  );
}
