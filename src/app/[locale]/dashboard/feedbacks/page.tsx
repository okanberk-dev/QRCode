'use client';

import { useEffect, useMemo, useRef, useState, Suspense, use } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Download, Filter, Inbox, Loader2, Sparkles, X } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/ui';
// §38.56 — KpiStrip kaldırıldı (kullanıcı kararı, tasarım a/page-reviews.jsx
// birebir — toolbar'da CSV/Filtre/Toplu yanıtla yeterli). Component dosyası
// silinmedi (potansiyel future use), sadece import + render kaldırıldı.
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { useUrlFilter } from '@/hooks/useUrlFilter';

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
import { FeedbackDetail } from './_components/FeedbackDetail';
import { FeedbackFiltersRail } from './_components/FeedbackFiltersRail';
import { FeedbackFiltersModal } from './_components/FeedbackFiltersModal';

function FeedbacksContent({ locale }: { locale: Locale }) {
  // `t` ileride gerekirse — şu an sadece dil bazlı fallback için kalıyor.
  void getTranslations(locale);
  const isTr = locale === 'tr';

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================================
  // URL filter state — useUrlFilter hook (CLAUDE.md §36).
  // 6 filter alanı tek hook'ta. `id`, `view`, `focus` ayrı yönetilir
  // (filter olmadıkları için reset onları silmemeli).
  // ============================================================
  const filters = useUrlFilter({
    tab: 'all' as ActiveTab,
    days: 'all',
    rating: 'all',
    platform: 'all' as PlatformFilter,
    hasReply: 'all' as HasReplyFilter,
    // boolean literal-type cast (CLAUDE.md §36.3) — set('flagged', boolean) için.
    flagged: false as boolean,
  });

  // Notification deep-link target — `?focus=<feedbackId>` from NotificationBell.
  const focusId = searchParams.get('focus');

  // Mobile push-route: `?view=detail` query'sini list/detail visibility
  // toggle olarak kullanır. Desktop (≥lg) bunu ignore eder ve daima
  // split-pane render olur.
  const view = searchParams.get('view');
  const idParam = searchParams.get('id');
  const isMobileDetailView = view === 'detail';

  // ============================================================
  // Local state
  // ============================================================
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [degraded, setDegraded] = useState<DegradedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId ?? idParam);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination — "Daha fazla göster" pattern. Initial 20 row first paint için
  // ağır chart/AI fetch'leriyle yarışmasın; kullanıcı talep ettikçe +20.
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reply composer
  const [replyDraft, setReplyDraft] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyNotice, setReplyNotice] = useState<{ msg: string; tone: ReplyTone } | null>(null);

  // Pulse AI
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<AiSource>(null);
  const [aiTone, setAiTone] = useState<AiTone>('warm');
  const [aiFromBackground, setAiFromBackground] = useState(false);

  // Sent reply thread
  const [sentReplies, setSentReplies] = useState<SentReply[]>([]);
  const [sentLoading, setSentLoading] = useState(false);

  // Notification deep-link pulse one-shot
  const focusAppliedRef = useRef(false);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  // §38.58 — Toplu yanıtla (bulk_ai_reply) state. Tasarım a/page-reviews.jsx:45
  // topbar "Toplu yanıtla" CTA — aktif filtered list'in ilk 50 yorumu için
  // /api/feedback/bulk endpoint'ine bulk_ai_reply action POST eder. Auto-send
  // YOK; her draft FeedbackAiDraft'a yazılır, owner FeedbackList'te tek-tek
  // onaylayıp gönderir (KVKK + UX güvenliği). Per-id checkbox UX gelecek
  // scope (CLAUDE.md §38.58 backlog) — MVP filter-aware bulk yeterli.
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  // Stringify filter values for stable effect deps
  const { tab, days, rating, platform, hasReply, flagged } = filters.values;

  // ============================================================
  // Fetch feedbacks list — backend kontratı (CLAUDE.md §Backend) korundu.
  // ============================================================
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
    return query;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPage(1);
      setHasMore(false);
      try {
        const res = await fetch(`/api/feedback?${buildListQuery(1).toString()}`);
        if (res.ok) {
          const data = await res.json();
          const rows: FeedbackRow[] = data.data ?? [];
          setFeedbacks(rows);
          if (rows.length > 0) setActiveId((curr) => curr ?? rows[0].id);
          setDegraded(data?.meta?.degraded ?? null);
          const totalPages = Number(data?.meta?.totalPages ?? 1);
          setHasMore(totalPages > 1);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, rating, platform, hasReply, flagged]);

  const loadMoreFeedbacks = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/feedback?${buildListQuery(nextPage).toString()}`);
      if (res.ok) {
        const data = await res.json();
        const rows: FeedbackRow[] = data.data ?? [];
        setFeedbacks((prev) => {
          // Sayfalar arası overlap (yeni yorum eklenmesi vb.) durumunda
          // duplicate id'leri at — UI'daki React key collision'a düşürmemek için.
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
        setPage(nextPage);
        const totalPages = Number(data?.meta?.totalPages ?? 1);
        setHasMore(nextPage < totalPages);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingMore(false);
  };

  // ============================================================
  // Filtered list (client-side: tab + search)
  // ============================================================
  const filteredList = useMemo(() => {
    let rows = feedbacks;
    // §38.56 — Yeni 5-tab tasarım birebir (Tümü/Okunmamış/Düşük/Yanıtlandı/Beklemede)
    if (tab === 'unread') rows = rows.filter((r) => r.isRead !== true);
    else if (tab === 'low') rows = rows.filter((r) => r.rating <= 3);
    else if (tab === 'replied') rows = rows.filter((r) => r.isReplied === true);
    else if (tab === 'pending') rows = rows.filter((r) => r.isPending === true);
    // Eski tab literal'ları (deeplink-friendly backwards-compat, CLAUDE.md §38.56)
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
      const q = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.customerName ?? '').toLowerCase().includes(q) ||
          (r.comment ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [feedbacks, tab, searchTerm]);

  const active = useMemo(
    () => feedbacks.find((r) => r.id === activeId) ?? filteredList[0] ?? null,
    [feedbacks, activeId, filteredList],
  );

  const counts = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startMs = startOfDay.getTime();
    return {
      all: feedbacks.length,
      low: feedbacks.filter((r) => r.rating <= 3).length,
      high: feedbacks.filter((r) => r.rating >= 4).length,
      redirected: feedbacks.filter((r) => !!r.platform).length,
      unreplied: feedbacks.filter((r) => r.isReplied !== true).length,
      today: feedbacks.filter(
        (r) => new Date(r.createdAt).getTime() >= startMs,
      ).length,
      aiReady: feedbacks.filter((r) => r.hasPendingAiDraft === true).length,
      // §38.56 — Yeni 5-tab counts (tasarım a/page-reviews.jsx birebir).
      // Eski feedback'ler (migration öncesi) isRead/isPending undefined →
      // Okunmamış/Beklemede sayımına dahil olmaz; default false.
      unread: feedbacks.filter((r) => r.isRead !== true).length,
      replied: feedbacks.filter((r) => r.isReplied === true).length,
      pending: feedbacks.filter((r) => r.isPending === true).length,
    };
  }, [feedbacks]);

  // §38.33 — BU HAFTA stat card için son 7 gün aggregate (client-side, mevcut
  // feedbacks state üstünden). Tasarım kaynağı: page-reviews.jsx line 83-92.
  const weekStats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const fourteenDaysAgo = Date.now() - 14 * 86400000;
    const last7 = feedbacks.filter(
      (r) => new Date(r.createdAt).getTime() >= sevenDaysAgo,
    );
    const prev7 = feedbacks.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= fourteenDaysAgo && t < sevenDaysAgo;
    });
    const avgOf = (rows: typeof last7) =>
      rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
    const last7Avg = avgOf(last7);
    const prev7Avg = avgOf(prev7);
    const delta =
      last7Avg > 0 && prev7Avg > 0
        ? Math.round((last7Avg - prev7Avg) * 100) / 100
        : null;
    return {
      avgRating: last7Avg,
      delta,
      totalCount: last7.length,
    };
  }, [feedbacks]);

  const activeFeedbackId = active?.id ?? null;
  const activeCustomerEmail = active?.customerEmail ?? null;
  const activeCustomerName = active?.customerName ?? null;
  const activeRating = active?.rating ?? null;
  const activeIsReplied = active?.isReplied === true;
  const activeAutoDraftEnabled = active?.aiAutoDraftEnabled === true;

  // UX: feedback değişince composer state'lerini temizle. User A'ya draft
  // yazıp B'ye geçince stale draft kalmasın (Gmail-like behavior). Reply
  // notice + AI suggestion da feedback'e bağlı, yeni bağlamda anlamsız.
  useEffect(() => {
    setReplyDraft('');
    setReplyNotice(null);
    // sendEmail varsayılanı yeni feedback için yeniden değerlendirilir —
    // customerEmail varsa true (etkin), yoksa false (otomatik dahili).
    setSendEmail(true);
  }, [activeFeedbackId]);

  // ============================================================
  // Notification deep-link: scroll + lime pulse
  // ============================================================
  useEffect(() => {
    if (!focusId || loading || focusAppliedRef.current) return;
    if (!feedbacks.some((r) => r.id === focusId)) return;
    focusAppliedRef.current = true;
    setActiveId(focusId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-feedback-id="${focusId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsedId(focusId);
      setTimeout(() => setPulsedId(null), 1800);
    });
  }, [focusId, loading, feedbacks]);

  // ============================================================
  // Sent reply thread fetch on selection
  // ============================================================
  useEffect(() => {
    if (!active) {
      setSentReplies([]);
      return;
    }
    let cancelled = false;
    setSentLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${active.id}/reply`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          const list: SentReply[] = Array.isArray(data?.replies) ? data.replies : [];
          setSentReplies(list);
        } else if (!cancelled) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // ============================================================
  // AI draft fetch (background draft → fallback on-demand)
  //
  // AI yalnızca düşük puanlı (rating < 4) ve **henüz yanıtlanmamış**
  // yorumlar için üretilir. Yüksek puanlı yorumlar zaten platforma
  // yönlendirilmiş, yanıtlanmış yorumlar için yeni öneri gereksiz —
  // ikisi de UI'da bloğu gizler ve gereksiz network çağrısı yapmaz.
  // Restoran bazlı `enableAiDraft=false` ise seçim anında draft endpoint'i
  // ve suggest-reply otomatik çağrılmaz; manuel "Yeniden öner" ayrı kalır.
  // (Eski davranış her seçimde 1-2 fetch tetikliyordu → "AI iki defa
  // üretti" hissi doğuyordu.)
  // ============================================================
  useEffect(() => {
    if (!activeFeedbackId || activeRating === null) {
      setAiSuggestion('');
      setAiSource(null);
      setAiLoading(false);
      setAiFromBackground(false);
      return;
    }
    setSendEmail(Boolean(activeCustomerEmail));
    setAiSuggestion('');
    setAiSource(null);
    setAiFromBackground(false);
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
  // UX: notice 2.8s → 5s. WCAG önerisi "important messages stay ≥5.5s",
  // 5s makul orta nokta. Error tone ekstra dwell (8s) — kullanıcı hatayı
  // okumadan kaybolmasın.
  const flashReply = (msg: string, tone: ReplyTone = 'info') => {
    setReplyNotice({ msg, tone });
    const dwell = tone === 'error' ? 8000 : 5000;
    setTimeout(() => setReplyNotice(null), dwell);
  };

  const onRegenerateAi = async (toneOverride?: AiTone) => {
    if (!active) return;
    const targetTone = toneOverride ?? aiTone;
    setAiRegenerating(true);
    setAiFromBackground(false);
    try {
      const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, tone: targetTone }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
        if (typeof data?.source === 'string') setAiSource(data.source);
        if (data?.tone === 'warm' || data?.tone === 'formal' || data?.tone === 'apologetic') {
          setAiTone(data.tone);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setAiRegenerating(false);
    }
  };

  const sendReply = async (overrideBody?: string) => {
    if (!active || sendingReply) return;
    const body = (overrideBody ?? replyDraft).trim();
    if (!body) return;
    setSendingReply(true);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          channel: wantsEmail ? 'email' : 'internal',
          sendEmail: wantsEmail,
          locale,
          source: replySource,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFeedbacks((list) =>
          list.map((r) =>
            r.id === active.id ? { ...r, isReplied: true, hasPendingAiDraft: false } : r,
          ),
        );
        const newReply: SentReply = {
          id: data?.replyId ?? `tmp-${Date.now()}`,
          body,
          channel: wantsEmail ? 'email' : 'internal',
          status: data?.email?.status === 'failed' ? 'failed' : 'sent',
          createdAt: new Date().toISOString(),
        };
        setSentReplies((list) => [...list, newReply]);
        setReplyDraft('');
        setAiSource(null);
        setAiFromBackground(false);
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
          flashReply(
            isTr ? 'Yanıt kaydedildi (dahili)' : 'Reply saved (internal)',
            'success',
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        flashReply(
          isTr ? `Hata: ${data.error ?? res.status}` : `Error: ${data.error ?? res.status}`,
          'error',
        );
      }
    } catch {
      flashReply(isTr ? 'Ağ hatası' : 'Network error', 'error');
    }
    setSendingReply(false);
  };

  const onUseAiAndSend = async () => {
    if (!aiSuggestion || sendingReply) return;
    setReplyDraft(aiSuggestion);
    await sendReply(aiSuggestion);
  };

  const onCopyAiToDraft = () => {
    if (!aiSuggestion) return;
    setReplyDraft(aiSuggestion);
  };

  const flagFeedback = async () => {
    if (!active) return;
    try {
      await fetch(`/api/feedback/${active.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      });
    } catch {
      /* non-blocking */
    }
  };

  // Stage 13 (CLAUDE.md §38.83) — Beklemede toggle. Optimistic state +
  // bulkNotice surface reuse (mevcut useEffect 5s success / 8s error
  // auto-dismiss, CLAUDE.md §38.15 dwell timing). PATCH başarısız ise
  // state revert + error notice. flagFeedback paterni mirror.
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
      // Revert optimistic update on failure
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
    // Push (not replace) so browser back returns to list view on mobile.
    router.push(buildUrl({ id, view: 'detail' }));

    // Stage 13 (CLAUDE.md §38.83) — feedback'e tıklayınca otomatik
    // mark-as-read. Already-read row'larda PATCH skip (gereksiz network).
    // Optimistic state update + fire-and-forget; failure'da silent fail
    // (flagFeedback paterni). counts.unread otomatik decrement eder.
    const row = feedbacks.find((f) => f.id === id);
    if (!row || row.isRead === true) return;
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isRead: true } : f)),
    );
    fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    }).catch(() => {
      /* non-blocking — eski feedback'ler için server reject edebilir */
    });
  };

  const onBackToList = () => {
    router.push(buildUrl({ view: null }));
  };

  // Reset filters but keep id/view/focus query params intact.
  const onResetFilters = () => {
    filters.setMany({
      tab: 'all',
      days: 'all',
      rating: 'all',
      platform: 'all',
      hasReply: 'all',
      flagged: false,
    });
  };

  // §38.58 — Bulk AI reply (Toplu yanıtla). Aktif filtered list'in ilk 50
  // **yanıtsız** yorumu için /api/feedback/bulk endpoint'ine POST eder.
  // Yanıtsız filtre: zaten yanıtlanmış olanlar için draft hazırlamak gereksiz.
  // Auto-send YOK; her draft FeedbackAiDraft'a yazılır + FeedbackList'te
  // PULSE AI badge görünür → owner her birini tek-tek onaylar.
  const onBulkAiReply = async () => {
    if (bulkBusy) return;
    const targetIds = filteredList
      .filter((f) => !f.isReplied)
      .slice(0, 50)
      .map((f) => f.id);
    if (targetIds.length === 0) {
      setBulkNotice({
        msg: isTr ? 'Yanıt bekleyen yorum yok.' : 'No reviews awaiting reply.',
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
          msg: isTr ? 'Toplu taslak hazırlanamadı.' : 'Could not prepare bulk drafts.',
          tone: 'error',
        });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const processed = typeof data?.processed === 'number' ? data.processed : 0;
      const skipped = typeof data?.skipped === 'number' ? data.skipped : 0;
      // FeedbackList'te PULSE AI badge'leri yansısın diye list state'i refresh
      // et. Mevcut feedbacks array'inde hasPendingAiDraft = true olarak
      // optimistic update; backend cache yansıması için kullanıcı sayfayı
      // refresh ederse yine aynı (FeedbackAiDraft tablosu kalıcı).
      setFeedbacks((list) =>
        list.map((r) =>
          targetIds.includes(r.id) && !r.isReplied
            ? { ...r, hasPendingAiDraft: true }
            : r,
        ),
      );
      setBulkNotice({
        msg: isTr
          ? `${processed} taslak hazırlandı${skipped > 0 ? ` · ${skipped} atlandı` : ''}. Aşağıdaki listede her birini tek-tek onaylayabilirsin.`
          : `${processed} drafts prepared${skipped > 0 ? ` · ${skipped} skipped` : ''}. Approve each one in the list below.`,
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

  // §38.58 — Bulk notice 5s auto-dismiss (success), 8s (error). CLAUDE.md
  // §38.15 dwell timing kanonik: WCAG dwell ≥5.5s, error daha uzun.
  useEffect(() => {
    if (!bulkNotice) return;
    const ttl = bulkNotice.tone === 'error' ? 8000 : 5000;
    const t = setTimeout(() => setBulkNotice(null), ttl);
    return () => clearTimeout(t);
  }, [bulkNotice]);

  const bulkEligibleCount = useMemo(
    () => filteredList.filter((f) => !f.isReplied).slice(0, 50).length,
    [filteredList],
  );

  const activeFilterCount =
    (days !== 'all' ? 1 : 0) +
    (rating !== 'all' ? 1 : 0) +
    (platform !== 'all' ? 1 : 0) +
    (hasReply !== 'all' ? 1 : 0) +
    (flagged ? 1 : 0);

  const hasActiveFilter = activeFilterCount > 0 || tab !== 'all';

  // ============================================================
  // Render
  // ============================================================
  return (
    // §38.62 — Pixel-perfect parity: tasarım `.design-owner-2026/page-reviews.jsx`
    // `contentStyle={{ padding: 0, background: '#FFFFFF' }}` override ediyor.
    // Outer `mx-auto max-w-[1400px] px-4 sm:px-7 py-6 lg:py-8` kaldırıldı; 3-col
    // grid full-width content area'da render ediliyor → filter rail sol sidebar'a
    // yapışık (border-right). Header için ayrı padded wrapper (px-4 sm:px-7
    // py-6 lg:py-8) tasarımdaki PanelTopbar görünümünü taklit eder.
    <div className="bg-white">
      {/* PageHeader — mobile detail view'inde gizle (sticky back zaten orada).
          Padded wrapper sadece header için, alt grid full-width. */}
      <div className={`px-4 sm:px-7 py-6 lg:py-8 border-b border-[#EDEDED] ${isMobileDetailView ? 'hidden lg:block' : ''}`}>
        <PageHeader
          /* §38.66 — Yorumlar 3-col layout (filter rail + list + detail)
             yoğun bilgi mimarisi; hero scale h1 (40px) ezici hissedilebilir.
             titleScale="compact" 22-32px clamp ile mütevazı kalır. */
          titleScale="compact"
          eyebrow={isTr ? 'GERİ BİLDİRİMLER' : 'FEEDBACKS'}
          title={isTr ? 'Yorumlar' : 'Reviews'}
          description={
            isTr
              ? 'Tüm kanallardan gelen müşteri geri bildirimleri. Yanıt sürelerinin altında kalmaya çalış.'
              : 'Customer feedback from all channels. Try to stay under reply targets.'
          }
          actions={
            <div className="flex items-center gap-2">
              {/* §38.53 — Dışa aktar (CSV export, mevcut /api/feedback/export endpoint) */}
              <a
                href="/api/feedback/export?days=90"
                download
                className="bz-btn inline-flex items-center gap-1.5 text-[12.5px]"
                title={isTr ? 'Son 90 gün yorumları CSV indir' : 'Download last 90 days as CSV'}
              >
                <Download size={13} strokeWidth={2} />
                {isTr ? 'Dışa aktar' : 'Export'}
              </a>
              {/* §38.53 — Filtre (mobil drawer toggle, xl: rail görünür) */}
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="bz-btn inline-flex items-center gap-1.5 text-[12.5px] xl:hidden"
              >
                <Filter size={13} strokeWidth={2} />
                {isTr ? 'Filtre' : 'Filter'}
              </button>
              {/* §38.58 — Toplu yanıtla (bulk_ai_reply). Tasarım a/page-reviews.jsx:45
                  birebir; aktif filtered list'in ilk 50 yanıtsız yorumu için AI
                  draft hazırlar (auto-send YOK, owner her birini onaylar). */}
              <button
                type="button"
                onClick={onBulkAiReply}
                disabled={bulkBusy || bulkEligibleCount === 0}
                className="bz-btn-primary inline-flex items-center gap-1.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  bulkEligibleCount === 0
                    ? isTr
                      ? 'Yanıt bekleyen yorum yok'
                      : 'No reviews awaiting reply'
                    : isTr
                      ? `${bulkEligibleCount} yorum için AI taslağı hazırla`
                      : `Prepare AI drafts for ${bulkEligibleCount} reviews`
                }
              >
                {bulkBusy ? (
                  <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                ) : (
                  <Sparkles size={13} strokeWidth={2} />
                )}
                {isTr ? 'Toplu yanıtla' : 'Bulk reply'}
                {bulkEligibleCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded bg-[#0A0A0A] px-1.5 text-[10px] font-mono text-[#C6F24E]">
                    {bulkEligibleCount}
                  </span>
                )}
              </button>
            </div>
          }
        />
      </div>

      {/* §38.56 — KPI 4-card strip SİLİNDİ (kullanıcı kararı, tasarım
          a/page-reviews.jsx birebir). Mevcut WeekStatsCard rail'da
          (FeedbackFiltersRail içinde) Bu hafta özet hâlâ görünür. */}

      {/* §38.62 — 3-col grid full-width (tasarım `padding: 0` parity).
          `rounded-2xl border` kaldırıldı; bölücüler artık inline border-right
          üzerinden (filter rail + review list sınır çizgileri). Sidebar'a
          yapışık görünüm bu sayede sağlanır. Header section yüksekliği:
          mobile 24+80+24+1 ≈ 129px, desktop 32+80+32+1 ≈ 145px → 160px buffer. */}
      <div
        className="flex flex-col overflow-hidden bg-white lg:flex-row lg:h-[calc(100vh-160px)] lg:min-h-[540px] xl:grid xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,360px)]"
      >
        {/* ============ XL FILTER RAIL — visible only on xl: (≥1280px) ============ */}
        <FeedbackFiltersRail
          locale={locale}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTab={tab}
          setActiveTab={(v) => filters.set('tab', v)}
          counts={counts}
          hasActiveFilter={hasActiveFilter}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onResetFilters={onResetFilters}
          platformFilter={platform}
          setPlatformFilter={(v) => filters.set('platform', v)}
          weekStats={weekStats}
        />

        {/* ============ LEFT — list (orta kolon xl:'de) ============ */}
        <aside
          className={`w-full flex-shrink-0 border-b border-[#EDEDED] lg:border-b-0 lg:border-r lg:w-[380px] xl:w-auto xl:flex-none ${
            isMobileDetailView ? 'hidden lg:block' : 'block'
          }`}
        >
          <FeedbackList
            locale={locale}
            loading={loading}
            feedbacks={feedbacks}
            filteredList={filteredList}
            activeId={active?.id ?? null}
            pulsedId={pulsedId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeTab={tab}
            setActiveTab={(v) => filters.set('tab', v)}
            counts={counts}
            hasActiveFilter={hasActiveFilter}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setFiltersOpen(true)}
            onResetFilters={onResetFilters}
            onSelect={onSelectFeedback}
            degraded={degraded}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMoreFeedbacks}
          />
        </aside>

        {/* ============ DETAIL ============
            UX fix: lg:min-h-0 + lg:overflow-y-auto. Mevcut parent
            lg:h-[calc(100vh-160px)] sabit yükseklik (§38.62 sonrası, eskiden
            200px), detail body uzun olduğunda (yorum metni + composer +
            yanıtlar listesi) flex child default min-height: auto child'ı
            genişletir + parent overflow-hidden → composer alta inilemiyor
            (kullanıcı raporu). min-h-0 flex item shrink-to-content yapmasın,
            overflow-y-auto kendi scroll'unu açar. */}
        <div
          className={`flex-1 min-w-0 ${
            isMobileDetailView ? 'flex' : 'hidden lg:flex'
          } flex-col lg:min-h-0 lg:overflow-y-auto`}
        >
          {active ? (
            <FeedbackDetail
              feedback={active}
              locale={locale}
              showBackButton={isMobileDetailView}
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
              onRegenerateAi={() => onRegenerateAi()}
              onUseAiAndSend={onUseAiAndSend}
              onCopyAiToDraft={onCopyAiToDraft}
              replyDraft={replyDraft}
              setReplyDraft={setReplyDraft}
              sendEmail={sendEmail}
              setSendEmail={setSendEmail}
              sendingReply={sendingReply}
              onSendReply={() => sendReply()}
              replyNotice={replyNotice}
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
      <FeedbackFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        locale={locale}
        daysFilter={String(days)}
        setDaysFilter={(v) => filters.set('days', v)}
        filterRating={String(rating)}
        setFilterRating={(v) => filters.set('rating', v)}
        platformFilter={platform}
        setPlatformFilter={(v) => filters.set('platform', v)}
        hasReplyFilter={hasReply}
        setHasReplyFilter={(v) => filters.set('hasReply', v)}
        flaggedOnly={flagged}
        setFlaggedOnly={(v) => filters.set('flagged', v)}
        hasActiveFilter={activeFilterCount > 0}
        onResetFilters={onResetFilters}
      />

      {/* §38.58 — Bulk notice (CLAUDE.md §23.3.1 floating toolbar paterni).
          Success/error tone-based palette; 5s/8s auto-dismiss (§38.15 dwell). */}
      {bulkNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 left-1/2 z-50 max-w-[560px] -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-lg inset-x-4 sm:inset-x-auto ${
            bulkNotice.tone === 'success'
              ? 'border-[#A8D62E] bg-[#0A0A0A] text-white'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles
              size={14}
              strokeWidth={2}
              className={`mt-0.5 shrink-0 ${
                bulkNotice.tone === 'success' ? 'text-[#C6F24E]' : 'text-[#DC2626]'
              }`}
            />
            <p className="flex-1 text-[12.5px] leading-snug">{bulkNotice.msg}</p>
            <button
              type="button"
              onClick={() => setBulkNotice(null)}
              className="shrink-0 rounded-full p-1 hover:bg-white/10"
              aria-label={isTr ? 'Bildirimi kapat' : 'Dismiss notice'}
            >
              <X size={12} strokeWidth={2} />
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
  // §38.49 — Client component → async edilemez (Next.js no-async-client-component
  // kuralı). React 18.3+ `use()` hook ile Promise client-side unwrap.
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
          <Loader2 className="animate-spin text-[#0A0A0A] w-8 h-8 mb-3" strokeWidth={2} />
          <span className="pulse-eyebrow text-[#737373]">
            {resolvedParams.locale === 'tr' ? 'YÜKLENİYOR' : 'LOADING'}
          </span>
        </div>
      }
    >
      <FeedbacksContent locale={resolvedParams.locale} />
    </Suspense>
  );
}
