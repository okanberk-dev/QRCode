'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Inbox, Loader2 } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/ui';
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
    if (tab === 'low') rows = rows.filter((r) => r.rating <= 3);
    else if (tab === 'high') rows = rows.filter((r) => r.rating >= 4);
    else if (tab === 'redirected') rows = rows.filter((r) => !!r.platform);
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

  const counts = useMemo(
    () => ({
      all: feedbacks.length,
      low: feedbacks.filter((r) => r.rating <= 3).length,
      high: feedbacks.filter((r) => r.rating >= 4).length,
      redirected: feedbacks.filter((r) => !!r.platform).length,
    }),
    [feedbacks],
  );

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
  // (Eski davranış her seçimde 1-2 fetch tetikliyordu → "AI iki defa
  // üretti" hissi doğuyordu.)
  // ============================================================
  useEffect(() => {
    if (!active) {
      setAiSuggestion('');
      setAiSource(null);
      setAiLoading(false);
      setAiFromBackground(false);
      return;
    }
    setSendEmail(Boolean(active.customerEmail));
    setAiSuggestion('');
    setAiSource(null);
    setAiFromBackground(false);
    if (active.rating >= 4 || active.isReplied) {
      setAiLoading(false);
      return;
    }
    setAiLoading(true);
    (async () => {
      try {
        const draftRes = await fetch(`/api/feedback/${active.id}/draft`);
        if (draftRes.ok) {
          const data = await draftRes.json();
          if (data?.draft?.body) {
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
        const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
          if (typeof data?.source === 'string') setAiSource(data.source);
          if (data?.tone === 'warm' || data?.tone === 'formal' || data?.tone === 'apologetic') {
            setAiTone(data.tone);
          }
        } else {
          setAiSuggestion(
            buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }),
          );
          setAiSource('template-fallback');
        }
      } catch {
        setAiSuggestion(
          buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }),
        );
        setAiSource('template-fallback');
      } finally {
        setAiLoading(false);
      }
    })();
  }, [active, locale]);

  // ============================================================
  // Action handlers
  // ============================================================
  const flashReply = (msg: string, tone: ReplyTone = 'info') => {
    setReplyNotice({ msg, tone });
    setTimeout(() => setReplyNotice(null), 2800);
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
    <div className="mx-auto max-w-[1400px] px-4 sm:px-7 py-6 lg:py-8">
      {/* PageHeader — mobile detail view'inde gizle (sticky back zaten orada) */}
      <div className={isMobileDetailView ? 'hidden lg:block' : ''}>
        <PageHeader
          eyebrow={isTr ? 'GERİ BİLDİRİMLER' : 'FEEDBACKS'}
          title={isTr ? 'Yorumlar' : 'Reviews'}
          description={
            isTr
              ? 'Müşteri yorumlarını yönet, yanıtla ve düşük puanları takip et.'
              : 'Manage customer reviews, reply, and follow up on low ratings.'
          }
        />
      </div>

      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-[#EDEDED] bg-white lg:flex-row lg:h-[calc(100vh-200px)] lg:min-h-[540px]"
      >
        {/* ============ LEFT — list ============ */}
        <aside
          className={`w-full flex-shrink-0 border-b border-[#EDEDED] lg:border-b-0 lg:border-r lg:w-[380px] xl:w-[420px] ${
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

        {/* ============ DETAIL ============ */}
        <div
          className={`flex-1 min-w-0 ${
            isMobileDetailView ? 'flex' : 'hidden lg:flex'
          } flex-col`}
        >
          {active ? (
            <FeedbackDetail
              feedback={active}
              locale={locale}
              showBackButton={isMobileDetailView}
              onBack={onBackToList}
              onFlag={flagFeedback}
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
    </div>
  );
}

export default async function FeedbacksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const resolvedParams = await params;
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
