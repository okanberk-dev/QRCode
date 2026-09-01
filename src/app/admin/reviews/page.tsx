'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Inbox, Loader2 } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { useUrlFilter } from '@/hooks/useUrlFilter';

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
import { AdminFeedbackDetail } from './_components/AdminFeedbackDetail';
import { AdminFeedbackFiltersModal } from './_components/AdminFeedbackFiltersModal';
import { BulkActionToolbar } from './_components/BulkActionToolbar';

function AdminReviewsContent() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================================
  // URL filter state — useUrlFilter (CLAUDE.md §36)
  // ============================================================
  const filters = useUrlFilter({
    tab: 'all' as AdminTab,
    platform: 'all' as PlatformFilter,
    hasReply: 'all' as HasReplyFilter,
    flagged: false as boolean,
    assigned: false as boolean,
  });
  const { tab, platform, hasReply, flagged, assigned } = filters.values;

  // Notification deep-link target — `?focus=<feedbackId>` from NotificationBell.
  const focusId = searchParams.get('focus');

  // Mobile push-route: `?view=detail` query'sini list/detail visibility
  // toggle olarak kullanır. Desktop (≥lg) bunu ignore eder.
  const view = searchParams.get('view');
  const idParam = searchParams.get('id');
  const isMobileDetailView = view === 'detail';

  // ============================================================
  // Local state
  // ============================================================
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<CountsResp | null>(null);
  const [degraded, setDegraded] = useState<DegradedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId ?? idParam);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [notice, setNotice] = useState<{ msg: string; tone: ReplyTone } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  // §38.237 — Gönderilen yanıt thread'i. Owner paneli bu endpoint'i zaten
  // tüketiyordu; admin yalnız "Yanıtlandı" rozeti görüyordu.
  const [sentReplies, setSentReplies] = useState<SentReply[]>([]);
  const [sentLoading, setSentLoading] = useState(false);

  // Notification deep-link pulse one-shot
  const focusAppliedRef = useRef(false);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  // Pagination — "Daha fazla göster" pattern. Initial 25 row first paint için
  // yeterli; admin paneli ağır KPI grid + bulk toolbar hesabıyla yarışmasın,
  // kullanıcı talep ettikçe +25.
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Without these the admin saw "Henüz yorum yok" whenever the list fetch
  // failed, while the previous filter's rows silently stayed in state.
  const [listError, setListError] = useState(false);
  const [listReloadKey, setListReloadKey] = useState(0);

  // ============================================================
  // Build query params for /api/feedback (admin)
  // ============================================================
  const buildListQuery = (targetPage: number, extra?: Record<string, string>) => {
    const query = new URLSearchParams({
      page: String(targetPage),
      limit: String(PAGE_SIZE),
    });
    if (platform !== 'all') query.set('platform', String(platform));
    if (hasReply === 'pending') query.set('hasReply', 'false');
    if (flagged) query.set('isFlagged', 'true');
    if (assigned) query.set('isAssigned', 'me');
    if (extra) for (const k in extra) query.set(k, extra[k]);
    return query;
  };

  // ============================================================
  // Fetch list + counts (parallel)
  // ============================================================
  useEffect(() => {
    (async () => {
      setLoading(true);
      setPage(1);
      setHasMore(false);
      setListError(false);
      try {
        const [listRes, countsRes] = await Promise.all([
          fetch(`/api/feedback?${buildListQuery(1).toString()}`),
          fetch('/api/feedback/counts'),
        ]);
        if (listRes.ok) {
          const data = await listRes.json();
          const list: FeedbackRow[] = data.data ?? [];
          setRows(list);
          setActiveId((c) => c ?? list[0]?.id ?? null);
          setDegraded(data?.meta?.degraded ?? null);
          setSelectedIds(new Set()); // filter değişince selection sıfırla
          const totalPages = Number(data?.meta?.totalPages ?? 1);
          setHasMore(totalPages > 1);
        } else {
          setRows([]);
          setActiveId(null);
          setDegraded(null);
          setSelectedIds(new Set());
          setListError(true);
        }
        if (countsRes.ok) setCounts(await countsRes.json());
      } catch (err) {
        console.error(err);
        setRows([]);
        setActiveId(null);
        setDegraded(null);
        setSelectedIds(new Set());
        setListError(true);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, hasReply, flagged, assigned, listReloadKey]);

  const loadMoreRows = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feedback?${buildListQuery(nextPage).toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: FeedbackRow[] = data.data ?? [];
        setRows((prev) => {
          // Sayfalar arası overlap (yeni yorum eklenmesi vb.) → duplicate id
          // skip: React key collision + UI jiter önler.
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...list.filter((r) => !seen.has(r.id))];
        });
        setPage(nextPage);
        const totalPages = Number(data?.meta?.totalPages ?? 1);
        setHasMore(nextPage < totalPages);
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingMore(false);
  };

  // ============================================================
  // Notification deep-link
  // ============================================================
  useEffect(() => {
    if (!focusId || loading || focusAppliedRef.current) return;
    if (!rows.some((r) => r.id === focusId)) return;
    focusAppliedRef.current = true;
    setActiveId(focusId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-feedback-id="${focusId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsedId(focusId);
      setTimeout(() => setPulsedId(null), 1800);
    });
  }, [focusId, loading, rows]);

  // ============================================================
  // Filtered list (client-side: tab + search)
  // ============================================================
  const filtered = useMemo(() => {
    let out = rows;
    if (tab === 'new') out = out.filter((r) => !r.isReplied);
    else if (tab === 'attention') out = out.filter((r) => r.rating <= 2);
    else if (tab === 'replied') out = out.filter((r) => r.isReplied);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          (r.customerName ?? '').toLowerCase().includes(q) ||
          (r.comment ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, tab, search]);

  // `tab` and `search` filter purely client-side (they are absent from
  // buildListQuery), so changing them does NOT re-run the fetch effect that
  // clears the selection. Rows scrolled out of view stayed in `selectedIds`
  // and the next bulk action hit them too. Same reset the server-side filters
  // already get (CLAUDE.md §23.3.1 + Phase 11.21).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab, search]);

  const active = filtered.find((r) => r.id === activeId) || filtered[0] || null;

  // AI yalnız düşük puan + yanıtlanmamış yorumlar için (CLAUDE.md §15).
  // Eski davranış suggest-reply'ı kullanıcı tıklayınca üretiyordu — bu zaten
  // tek-defa pattern. Aktif yorum değişince composer state'i resetliyoruz.
  useEffect(() => {
    setDraft('');
    setAiSource(null);
    setSendEmail(Boolean(active?.customerEmail));
  }, [active?.id, active?.customerEmail]);

  // §38.237 — Aktif yorum değişince gönderilen yanıtları çek. `cancelled`
  // guard'ı hızlı satır değişiminde stale response'un yeni seçime
  // yazılmasını engeller (owner panelindeki aynı pattern).
  useEffect(() => {
    const id = active?.id;
    if (!id) {
      setSentReplies([]);
      setSentLoading(false);
      return;
    }
    let cancelled = false;
    setSentLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${id}/reply`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setSentReplies(Array.isArray(data?.replies) ? data.replies : []);
        } else {
          setSentReplies([]);
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
  }, [active?.id]);

  const flash = (msg: string, tone: ReplyTone = 'info') => {
    setNotice({ msg, tone });
    setTimeout(() => setNotice(null), 2600);
  };

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
    setSuggesting(true);
    try {
      const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale, tone: toneOverride }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.suggestion === 'string' && data.suggestion.length > 0) {
          setDraft(data.suggestion);
          setAiSource((data.source as AiSource) ?? 'template');
        }
      } else if (res.status === 429) {
        flash(isTr ? 'Çok sık istek — biraz bekle' : 'Too many requests — slow down', 'error');
      } else {
        setDraft(buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }));
        setAiSource('template-fallback');
      }
    } catch {
      setDraft(buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }));
      setAiSource('template-fallback');
    }
    setSuggesting(false);
  };

  const onSend = async () => {
    if (!active || !draft.trim()) return;
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
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const wasReplied = active.isReplied;
        updateRow(active.id, { isReplied: true });
        if (!wasReplied) bumpCounts({ new: -1, replied: 1 });
        // §38.237 — thread'e optimistic ekle; refetch beklemeden görünür.
        setSentReplies((list) => [
          ...list,
          {
            id: data?.replyId ?? `tmp-${list.length}-${active.id}`,
            body: draft,
            channel: wantsEmail ? 'email' : 'internal',
            status: data?.email?.status === 'failed' ? 'failed' : 'sent',
            createdAt: new Date().toISOString(),
          },
        ]);
        setDraft('');
        setAiSource(null);
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
            isTr
              ? 'Yanıt kaydedildi ama e-posta gönderilemedi'
              : 'Saved but email delivery failed',
            'error',
          );
        } else {
          flash(isTr ? 'Yanıt kaydedildi (dahili)' : 'Reply saved (internal)', 'success');
        }
      } else if (res.status === 401) {
        flash(isTr ? 'Oturum süresi doldu' : 'Session expired', 'error');
      } else if (res.status === 403) {
        flash(isTr ? 'Yetkisiz erişim' : 'Forbidden', 'error');
      } else {
        const data = await res.json().catch(() => ({}));
        flash(
          isTr ? `Hata: ${data.error ?? res.status}` : `Error: ${data.error ?? res.status}`,
          'error',
        );
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error', 'error');
    }
    setSending(false);
  };

  const onFlag = async () => {
    if (!active || flagging) return;
    setFlagging(true);
    try {
      const res = await fetch(`/api/feedback/${active.id}/flag`, {
        method: active.isFlagged ? 'DELETE' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: active.isFlagged ? undefined : JSON.stringify({}),
      });
      if (res.ok) {
        updateRow(active.id, { isFlagged: !active.isFlagged });
        flash(
          active.isFlagged
            ? isTr
              ? 'İşaret kaldırıldı'
              : 'Flag removed'
            : isTr
              ? 'İşaretlendi'
              : 'Flagged',
          'success',
        );
      } else {
        flash(isTr ? 'İşaretleme başarısız' : 'Flag failed', 'error');
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error', 'error');
    }
    setFlagging(false);
  };

  const onAssign = async () => {
    if (!active || assigning) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/feedback/${active.id}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assigneeId: 'self' }),
      });
      if (res.ok) {
        updateRow(active.id, { isAssigned: true });
        flash(isTr ? 'Size atandı' : 'Assigned to you', 'success');
      } else {
        flash(isTr ? 'Atama başarısız' : 'Assign failed', 'error');
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error', 'error');
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
      // §38.238 — /api/feedback/bulk validates `ids` with Zod `.max(50)`.
      // This sent the whole selection in one request, so as soon as
      // "load more" grew the list past 50 rows, select-all + any bulk
      // action failed wholesale with a 400 and processed nothing. Send in
      // server-sized chunks and aggregate the counters instead.
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
          const err = await res.json().catch(() => ({}));
          // 429 = the 10/min/actor bulk rate limit. Anything already
          // processed stays processed, so report the partial result rather
          // than implying nothing happened.
          failure =
            res.status === 429
              ? isTr
                ? 'Hız sınırına takıldı, kalan yorumlar işlenmedi'
                : 'Rate limited — remaining reviews were not processed'
              : err.error?.message || (isTr ? 'Toplu işlem başarısız' : 'Bulk action failed');
          break;
        }
        const data = await res.json();
        processed += data.processed ?? 0;
        skipped += data.skipped ?? 0;
      }

      {
        flash(
          failure
            ? `${failure}${processed > 0 ? ` · ${processed}${isTr ? ' işlendi' : ' processed'}` : ''}`
            : isTr
              ? `${processed} yorum işlendi` + (skipped > 0 ? ` (${skipped} atlandı)` : '')
              : `${processed} reviews processed` + (skipped > 0 ? ` (${skipped} skipped)` : ''),
          failure ? 'error' : 'success',
        );
        setSelectedIds(new Set());
        // Re-fetch to reflect new flag/assignment state. Mevcut filter'ları
        // + load-more sonrası ulaşılan **toplam yüklü sayfayı** koruyarak
        // (CLAUDE.md §11.21 — assignedToMe filter aktifken bulk sonrası liste
        // yanlış genişlememeli; ayrıca load-more ile genişletilmiş liste
        // bulk sonrası ilk sayfaya çökmemeli).
        // §38.238 — /api/feedback clamps `limit` to 100 server-side. Asking
        // for PAGE_SIZE * page (25, 50, 75, 125, …) silently returned only
        // 100 rows past page 4, so rows the admin had already loaded
        // disappeared after a bulk action and `page` no longer matched the
        // list length. Clamp here so the request and the state agree.
        const LIST_LIMIT_CAP = 100;
        const refreshLimit = Math.min(PAGE_SIZE * page, LIST_LIMIT_CAP);
        const refresh = await fetch(
          `/api/feedback?${buildListQuery(1, { limit: String(refreshLimit) }).toString()}`,
        );
        if (refresh.ok) {
          const d = await refresh.json();
          const rows: FeedbackRow[] = d.data ?? [];
          setRows(rows);
          // Keep `page` consistent with what is actually loaded, otherwise
          // the next "load more" skips a window.
          setPage(Math.max(1, Math.ceil(rows.length / PAGE_SIZE)));
        }
      }
    } catch {
      flash(isTr ? 'Toplu işlem başarısız' : 'Bulk action failed', 'error');
    }
    setBulkBusy(false);
  };

  // ============================================================
  // Mobile push-route handlers
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
    router.push(buildUrl({ id, view: 'detail' }));
  };

  const onBackToList = () => {
    router.push(buildUrl({ view: null }));
  };

  // Custom reset — sadece filter alanları, ?id ?view ?focus korunur.
  const onResetFilters = () => {
    filters.setMany({
      tab: 'all',
      platform: 'all',
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

  const activeFilterCount =
    (platform !== 'all' ? 1 : 0) +
    (hasReply !== 'all' ? 1 : 0) +
    (flagged ? 1 : 0) +
    (assigned ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0 || tab !== 'all';

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      {/* PageHeader — mobile detail view'inde gizli */}
      <div className={isMobileDetailView ? 'hidden lg:block' : ''}>
        <PageHeader
          eyebrow={isTr ? 'YORUMLAR' : 'REVIEWS'}
          title={isTr ? 'Yorum gelen kutusu' : 'Review inbox'}
          description={
            isTr
              ? 'Tüm restoranlardan gelen yorumları tek panelden incele, yanıtla, işaretle veya sahibi atan.'
              : 'Inspect, reply, flag, or assign reviews from all restaurants in one inbox.'
          }
        />
      </div>

      {/* KPI özet — mobile detail view'inde gizli */}
      {counts && !isMobileDetailView && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatCard
            label={isTr ? 'Tüm yorumlar' : 'All reviews'}
            value={(counts.all ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          />
          <StatCard
            label={isTr ? 'Yanıt bekleyen' : 'Pending reply'}
            value={(counts.new ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
            accent="#C6F24E"
          />
          <StatCard
            label={isTr ? 'Düşük puan (≤2★)' : 'Low rating (≤2★)'}
            value={(counts.attention ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          />
          <StatCard
            label={isTr ? 'Yanıtlanmış' : 'Replied'}
            value={(counts.replied ?? 0).toLocaleString(isTr ? 'tr-TR' : 'en-US')}
          />
        </div>
      )}

      {/* Layout container */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-[#EDEDED] bg-white lg:flex-row lg:h-[calc(100vh-260px)] lg:min-h-[540px]"
      >
        {/* LEFT — list */}
        <aside
          className={`w-full flex-shrink-0 border-b border-[#EDEDED] lg:border-b-0 lg:border-r lg:w-[380px] xl:w-[420px] ${
            isMobileDetailView ? 'hidden lg:block' : 'block'
          }`}
        >
          <AdminFeedbackList
            isTr={isTr}
            loading={loading}
            filtered={filtered}
            activeId={active?.id ?? null}
            pulsedId={pulsedId}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            search={search}
            setSearch={setSearch}
            tab={tab}
            setTab={(v) => filters.set('tab', v)}
            counts={counts}
            hasActiveFilter={hasActiveFilter}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setFiltersOpen(true)}
            onResetFilters={onResetFilters}
            onSelect={onSelectFeedback}
            degraded={degraded}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMoreRows}
            listError={listError}
            onRetryList={() => setListReloadKey((k) => k + 1)}
          />
        </aside>

        {/* DETAIL */}
        <div
          className={`flex-1 min-w-0 ${
            isMobileDetailView ? 'flex' : 'hidden lg:flex'
          } flex-col`}
        >
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
              sending={sending}
              onSend={onSend}
              notice={notice}
              sentReplies={sentReplies}
              sentLoading={sentLoading}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
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
          )}
        </div>
      </div>

      {/* Filters modal */}
      <AdminFeedbackFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        isTr={isTr}
        platformFilter={platform}
        setPlatformFilter={(v) => filters.set('platform', v)}
        hasReplyFilter={hasReply}
        setHasReplyFilter={(v) => filters.set('hasReply', v)}
        flaggedOnly={flagged}
        setFlaggedOnly={(v) => filters.set('flagged', v)}
        assignedToMe={assigned}
        setAssignedToMe={(v) => filters.set('assigned', v)}
        hasActiveFilter={activeFilterCount > 0}
        onResetFilters={onResetFilters}
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
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
        </div>
      }
    >
      <AdminReviewsContent />
    </Suspense>
  );
}
