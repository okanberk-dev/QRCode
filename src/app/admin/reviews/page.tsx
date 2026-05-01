'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, Flag, Inbox, Loader2, Mail, RotateCcw, Search, Send, Sparkles, Star, UserPlus, X } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { buildReplyTemplate } from '@/lib/scaffolding';
import { PageHeader, Tabs, AlertBanner, EmptyState, Badge, Skeleton, PlatformChip, PLATFORMS, StatCard, type PlatformId } from '@/components/ui';

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

type Source = 'openai' | 'template' | 'template-fallback' | null;
type Tone = 'success' | 'info' | 'error';

interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  platform: string | null;
  customerName: string | null;
  customerEmail: string | null;
  isReplied?: boolean;
  isFlagged?: boolean;
  isAssigned?: boolean;
  assigneeId?: string | null;
  restaurant?: { name: string; slug?: string } | null;
}

interface CountsResp {
  all: number;
  new: number;
  attention: number;
  replied: number;
}

function initials(name: string | null) {
  if (!name) return 'B';
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function timeAgo(iso: string, isTr: boolean) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' });
}

function AdminReviewsContent() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const searchParams = useSearchParams();

  // Notification deep-link target — `?focus=<feedbackId>` from the
  // NotificationBell. When present, the page auto-selects that feedback,
  // forces tab=all so the row is visible regardless of state, and scrolls
  // + lime-pulses the matching list item once the data lands.
  const focusId = searchParams.get('focus');

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<CountsResp | null>(null);
  const [degraded, setDegraded] = useState<{ joins: boolean; tags: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId);
  const [tab, setTab] = useState<'all' | 'new' | 'attention' | 'replied'>(focusId ? 'all' : 'all');
  const [search, setSearch] = useState('');
  // PR3 — yeni filter'lar
  const router = useRouter();
  const pathname = usePathname();
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformId>(
    focusId ? 'all' : ((searchParams.get('platform') as PlatformId) || 'all'),
  );
  const [hasReplyFilter, setHasReplyFilter] = useState<'all' | 'pending'>(
    focusId ? 'all' : (searchParams.get('hasReply') === 'false' ? 'pending' : 'all'),
  );
  const [flaggedOnly, setFlaggedOnly] = useState<boolean>(
    focusId ? false : searchParams.get('isFlagged') === 'true',
  );
  const [assignedToMe, setAssignedToMe] = useState<boolean>(
    focusId ? false : searchParams.get('isAssigned') === 'me',
  );
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // One-shot scroll-into-view + lime pulse when arriving via notification.
  const focusAppliedRef = useRef(false);
  const [pulsedId, setPulsedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSource, setAiSource] = useState<Source>(null);
  const [aiTone, setAiTone] = useState<'warm' | 'formal' | 'apologetic'>('warm');
  const [notice, setNotice] = useState<{ msg: string; tone: Tone } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: '1', limit: '100' });
        if (platformFilter !== 'all') query.set('platform', platformFilter);
        if (hasReplyFilter === 'pending') query.set('hasReply', 'false');
        if (flaggedOnly) query.set('isFlagged', 'true');
        if (assignedToMe) query.set('isAssigned', 'me');
        const [listRes, countsRes] = await Promise.all([
          fetch(`/api/feedback?${query.toString()}`),
          fetch('/api/feedback/counts'),
        ]);
        if (listRes.ok) {
          const data = await listRes.json();
          const list: FeedbackRow[] = data.data ?? [];
          setRows(list);
          setActiveId((c) => c ?? list[0]?.id ?? null);
          setDegraded(data?.meta?.degraded ?? null);
          setSelectedIds(new Set()); // filter değişince selection sıfırla
        }
        if (countsRes.ok) setCounts(await countsRes.json());
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [platformFilter, hasReplyFilter, flaggedOnly, assignedToMe]);

  // URL state sync — Linear/Stripe inbox pattern (CLAUDE.md §28)
  useEffect(() => {
    if (focusId) return;
    const next = new URLSearchParams();
    if (platformFilter !== 'all') next.set('platform', platformFilter);
    if (hasReplyFilter === 'pending') next.set('hasReply', 'false');
    if (flaggedOnly) next.set('isFlagged', 'true');
    if (assignedToMe) next.set('isAssigned', 'me');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [platformFilter, hasReplyFilter, flaggedOnly, assignedToMe, focusId, pathname, router]);

  const hasActiveFilter =
    platformFilter !== 'all' || hasReplyFilter !== 'all' || flaggedOnly || assignedToMe;
  const resetFilters = () => {
    setPlatformFilter('all');
    setHasReplyFilter('all');
    setFlaggedOnly(false);
    setAssignedToMe(false);
  };

  // Bulk action helper
  const runBulk = async (action: 'flag' | 'unflag' | 'assign') => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/feedback/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotice({
          msg: isTr
            ? `${data.processed} yorum işlendi` + (data.skipped > 0 ? ` (${data.skipped} atlandı)` : '')
            : `${data.processed} reviews processed` + (data.skipped > 0 ? ` (${data.skipped} skipped)` : ''),
          tone: 'success',
        });
        setSelectedIds(new Set());
        // Re-fetch list to reflect new flag/assignment state
        const refresh = await fetch(`/api/feedback?page=1&limit=100${platformFilter !== 'all' ? `&platform=${platformFilter}` : ''}${hasReplyFilter === 'pending' ? '&hasReply=false' : ''}${flaggedOnly ? '&isFlagged=true' : ''}`);
        if (refresh.ok) {
          const d = await refresh.json();
          setRows(d.data ?? []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setNotice({
          msg: err.error?.message || (isTr ? 'Toplu işlem başarısız' : 'Bulk action failed'),
          tone: 'danger',
        });
      }
    } catch {
      setNotice({ msg: isTr ? 'Toplu işlem başarısız' : 'Bulk action failed', tone: 'danger' });
    }
  };

  // Apply notification deep-link once data has landed: scroll the matching
  // list row into view and trigger a 1.6s lime pulse so the user sees
  // exactly where the bell sent them. Idempotent — guarded by `focusAppliedRef`.
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

  const filtered = useMemo(() => {
    let out = rows;
    if (tab === 'new') out = out.filter((r) => !r.isReplied);
    else if (tab === 'attention') out = out.filter((r) => r.rating <= 2);
    else if (tab === 'replied') out = out.filter((r) => r.isReplied);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => (r.customerName ?? '').toLowerCase().includes(q) || (r.comment ?? '').toLowerCase().includes(q));
    }
    return out;
  }, [rows, tab, search]);

  const active = filtered.find((r) => r.id === activeId) || filtered[0] || null;

  useEffect(() => {
    setDraft('');
    setAiSource(null);
    // Default: turn on email delivery only if we actually have one on file.
    setSendEmail(Boolean(active?.customerEmail));
  }, [active?.id, active?.customerEmail]);

  const flash = (msg: string, tone: Tone = 'info') => {
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

  const onSuggest = async (toneOverride?: 'warm' | 'formal' | 'apologetic') => {
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
          setAiSource((data.source as Source) ?? 'template');
        }
      } else if (res.status === 429) {
        flash(isTr ? 'Çok sık istek — biraz bekle' : 'Too many requests — slow down', 'error');
      } else {
        // Network/server failure — fall back to deterministic template so the
        // operator can still produce a starting point.
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
    // Map suggest-reply's `source` into the wire-format used by FeedbackReply.
    // Operators who edit the AI text and send it still count as ai_copilot —
    // that's the model surfaced AI took the first pass; analytics tracks it.
    // If the operator typed the reply from scratch (`aiSource` null), we
    // record manual.
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
        setDraft('');
        setAiSource(null);
        const emailStatus = data?.email?.status as 'sent' | 'skipped' | 'failed' | undefined;
        if (emailStatus === 'sent') {
          flash(
            isTr ? `E-posta gönderildi: ${active.customerEmail}` : `Email sent to ${active.customerEmail}`,
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
            ? isTr ? 'İşaret kaldırıldı' : 'Flag removed'
            : isTr ? 'İşaretlendi' : 'Flagged',
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

  const tabs: { id: typeof tab; label: string; count: number | undefined }[] = [
    { id: 'all', label: isTr ? 'Hepsi' : 'All', count: counts?.all },
    { id: 'new', label: isTr ? 'Yeni' : 'New', count: counts?.new },
    { id: 'attention', label: isTr ? 'Dikkat' : 'Attention', count: counts?.attention },
    { id: 'replied', label: isTr ? 'Yanıtlandı' : 'Replied', count: counts?.replied },
  ];

  const noticeTone =
    notice?.tone === 'success'
      ? 'bg-[#EAF9B8] text-[#0A0A0A]'
      : notice?.tone === 'error'
        ? 'bg-red-50 text-red-700'
        : 'bg-[#F5F5F5] text-[#0A0A0A]';

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-7 py-6 lg:py-8 space-y-4">
      <PageHeader
        eyebrow={isTr ? 'YORUMLAR' : 'REVIEWS'}
        title={isTr ? 'Yorum gelen kutusu' : 'Review inbox'}
        description={
          isTr
            ? 'Tüm restoranlardan gelen yorumları tek panelden incele, yanıtla, işaretle veya sahibi atan.'
            : 'Inspect, reply, flag, or assign reviews from all restaurants in one inbox.'
        }
        actions={
          notice ? (
            <span className={`pulse-eyebrow rounded-full px-3 py-1.5 ${noticeTone}`}>{notice.msg}</span>
          ) : null
        }
      />

      {degraded && (
        <AlertBanner kind="warn">
          {isTr
            ? `${degraded.joins ? 'Yanıt/atama/işaret durumu' : 'Tag filtreleri'} şu an pasif — veritabanı senkronizasyonu bekleniyor.`
            : `${degraded.joins ? 'Reply/assignment/flag status' : 'Tag filters'} temporarily unavailable — database sync pending.`}
        </AlertBanner>
      )}

      {/* PR3 — Quick stats. Linear/Intercom inbox pattern: en üstte 3-4 KPI
          mini-card. /api/feedback/counts response'undaki tab count'lar buraya
          map'lenir; hâlâ tab Tabs'ten ayrı bir bağımsız özet katmanı. */}
      {counts && (
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

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="bz-card overflow-hidden">
          <div className="border-b border-[#EDEDED] p-3 space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 focus-within:border-[#0A0A0A] transition-colors">
              <Search size={14} className="text-[#737373]" strokeWidth={2} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTr ? 'Müşteri veya yorum ara' : 'Search customer or comment'}
                aria-label={isTr ? 'Yorum ara' : 'Search reviews'}
                className="flex-1 bg-transparent text-[16px] sm:text-[13px] outline-none placeholder:text-[#737373]"
              />
            </div>
            <Tabs
              items={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
              active={tab}
              onChange={(id) => setTab(id as typeof tab)}
              ariaLabel={isTr ? 'Durum filtresi' : 'Status filter'}
            />
            {/* PR3 — Platform chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                  platformFilter === 'all'
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={platformFilter === 'all'}
              >
                {isTr ? 'Tümü' : 'All'}
              </button>
              {PLATFORM_OPTIONS.map((pid) => {
                const active = platformFilter === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPlatformFilter(active ? 'all' : pid)}
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                      active
                        ? 'border-[#0A0A0A] bg-white text-[#0A0A0A]'
                        : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                    }`}
                    aria-pressed={active}
                    title={PLATFORMS[pid].label}
                  >
                    <PlatformChip id={pid} size={14} />
                  </button>
                );
              })}
            </div>
            {/* PR3 — State toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHasReplyFilter(hasReplyFilter === 'pending' ? 'all' : 'pending')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  hasReplyFilter === 'pending'
                    ? 'border-[#A8D62E] bg-[#EAF9B8] text-[#0A0A0A]'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={hasReplyFilter === 'pending'}
              >
                <Mail size={11} strokeWidth={2.2} />
                {isTr ? 'Yanıt bekleyen' : 'Pending'}
              </button>
              <button
                type="button"
                onClick={() => setFlaggedOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  flaggedOnly
                    ? 'border-[#DC2626] bg-[#FEE2E2] text-[#991B1B]'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={flaggedOnly}
              >
                <Flag size={11} strokeWidth={2.2} />
                {isTr ? 'İşaretli' : 'Flagged'}
              </button>
              <button
                type="button"
                onClick={() => setAssignedToMe((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  assignedToMe
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={assignedToMe}
              >
                <UserPlus size={11} strokeWidth={2.2} />
                {isTr ? 'Bana atanan' : 'Assigned to me'}
              </button>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors ml-auto"
                >
                  <RotateCcw size={11} strokeWidth={2.2} />
                  {isTr ? 'Temizle' : 'Reset'}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-[#EDEDED]">
            {loading ? (
              <div className="space-y-2 p-3" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Inbox size={22} strokeWidth={1.5} />}
                  title={isTr ? 'Henüz yorum yok' : 'No reviews yet'}
                  body={isTr ? 'Filtreleri değiştirip tekrar dene.' : 'Try adjusting filters.'}
                />
              </div>
            ) : (
              filtered.map((r) => {
                const isActive = r.id === active?.id;
                const isSelected = selectedIds.has(r.id);
                return (
                  <div
                    key={r.id}
                    className={`flex w-full items-start ${
                      isActive ? 'bg-[#EAF9B8]/40' : 'hover:bg-[#FAFAFA]'
                    } ${pulsedId === r.id ? 'animate-pulse ring-2 ring-[#C6F24E] ring-inset' : ''}`}
                  >
                    <label
                      className="flex items-center justify-center px-2 py-3 cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      title={isTr ? 'Toplu seç' : 'Bulk select'}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            return next;
                          });
                        }}
                        aria-label={isTr ? `${r.customerName ?? 'Yorum'} seç` : `Select ${r.customerName ?? 'review'}`}
                        className="h-3.5 w-3.5 accent-[#0A0A0A] cursor-pointer"
                      />
                    </label>
                    <button
                      data-feedback-id={r.id}
                      onClick={() => setActiveId(r.id)}
                      className="flex flex-1 items-start gap-3 pr-3 py-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[11px] font-semibold text-white">
                      {initials(r.customerName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold text-[#0A0A0A]">
                          {r.customerName || (isTr ? 'Anonim' : 'Anonymous')}
                        </p>
                        <span className="shrink-0 text-[10px] text-[#737373]">{timeAgo(r.createdAt, isTr)}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-[#737373]">
                        <Star size={11} className="fill-[#C6F24E] text-[#C6F24E]" />
                        <span>{r.rating}.0</span>
                        {r.restaurant?.name && <span className="truncate">· {r.restaurant.name}</span>}
                        {r.isReplied && (
                          <Badge kind="ok">{isTr ? 'YANITLANDI' : 'REPLIED'}</Badge>
                        )}
                        {r.isFlagged && (
                          <Badge kind="danger">{isTr ? 'DİKKAT' : 'FLAGGED'}</Badge>
                        )}
                        {r.isAssigned && (
                          <Badge kind="ghost">{isTr ? 'ATANDI' : 'ASSIGNED'}</Badge>
                        )}
                      </div>
                      {r.comment && <p className="mt-1 line-clamp-2 text-[12px] text-[#525252]">{r.comment}</p>}
                    </div>
                  </button>
                </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="bz-card">
          {!active ? (
            <div className="flex min-h-[20rem] items-center justify-center p-6">
              <EmptyState
                icon={<Inbox size={22} strokeWidth={1.5} />}
                title={isTr ? 'Bir yorum seç' : 'Select a review'}
                body={isTr ? 'Soldaki listeden bir yorum seçince detaylar burada görünecek.' : 'Pick a review from the list to view details here.'}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[14px] font-semibold text-white">
                  {initials(active.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="pulse-eyebrow text-[#737373]">
                    {active.restaurant?.name || (isTr ? 'İşletme' : 'Location')} · {timeAgo(active.createdAt, isTr)}
                  </p>
                  <h2 className="mt-0.5 text-[20px] font-semibold text-[#0A0A0A]">
                    {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={14}
                          className={n <= active.rating ? 'fill-[#C6F24E] text-[#C6F24E]' : 'text-[#EDEDED]'}
                        />
                      ))}
                      <span className="ml-1 text-[12px] text-[#737373]">{active.rating}.0</span>
                    </div>
                    {active.isReplied && (
                      <Badge kind="ok">{isTr ? 'YANITLANDI' : 'REPLIED'}</Badge>
                    )}
                    {active.isFlagged && (
                      <Badge kind="danger">{isTr ? 'DİKKAT' : 'FLAGGED'}</Badge>
                    )}
                    {active.isAssigned && (
                      <Badge kind="ghost">{isTr ? 'ATANDI' : 'ASSIGNED'}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onFlag}
                    disabled={flagging}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                      active.isFlagged
                        ? 'border-red-300 bg-red-50 text-red-700 hover:border-red-400'
                        : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {flagging ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
                    {active.isFlagged
                      ? isTr ? 'İşaret kaldır' : 'Unflag'
                      : isTr ? 'İşaretle' : 'Flag'}
                  </button>
                  <button
                    onClick={onAssign}
                    disabled={assigning}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 ${
                      active.isAssigned
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                        : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {assigning ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : active.isAssigned ? (
                      <Check size={12} />
                    ) : (
                      <UserPlus size={12} />
                    )}
                    {active.isAssigned
                      ? isTr ? 'Atandı' : 'Assigned'
                      : isTr ? 'Ata' : 'Assign'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <p className="text-[14px] leading-relaxed text-[#0A0A0A]">
                  {active.comment || (isTr ? 'Bu yorumda açıklama yok.' : 'No comment provided.')}
                </p>
              </div>

              {active.rating >= 4 ? (
                <AlertBanner kind="lime" icon={<Sparkles size={14} className="text-[#0A0A0A] mt-1" strokeWidth={2} />}>
                  <span className="block font-semibold text-[#0A0A0A]">
                    {isTr ? 'Yanıt yazmaya gerek yok' : 'No reply needed'}
                  </span>
                  <span className="block mt-0.5 text-[#525252]">
                    {isTr
                      ? `Yüksek puanlı yorum ${(active.platform || 'platform').toUpperCase()} üzerinden alındı; müşteri zaten platformda paylaşımını yaptı. İsterseniz yukarıdaki Flag/Ata aksiyonlarıyla bu yorumu ekibinizle takip edebilirsiniz.`
                      : `High-rating review came in via ${(active.platform || 'platform').toUpperCase()}; the customer already posted on the platform. You can still flag or assign it to your team using the actions above.`}
                  </span>
                </AlertBanner>
              ) : (
                <>
              <div className="rounded-xl border border-[#C6F24E]/60 bg-[#EAF9B8]/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#0A0A0A]" />
                    <p className="pulse-eyebrow text-[#0A0A0A]">BUAZE PULSE AI</p>
                    {aiSource === 'openai' && (
                      <span className="pulse-eyebrow rounded-full bg-[#0A0A0A] px-2 py-0.5 text-white">AI</span>
                    )}
                    {(aiSource === 'template' || aiSource === 'template-fallback') && (
                      <span className="pulse-eyebrow rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[#737373]">
                        {isTr ? 'ŞABLON' : 'TEMPLATE'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value as 'warm' | 'formal' | 'apologetic')}
                      disabled={suggesting}
                      aria-label={isTr ? 'Pulse AI tonu' : 'Pulse AI tone'}
                      className="pulse-eyebrow rounded-full border border-[#EDEDED] bg-white px-2.5 py-1 text-[#0A0A0A] outline-none focus:border-[#0A0A0A] disabled:opacity-50"
                    >
                      <option value="warm">{isTr ? 'Samimi' : 'Warm'}</option>
                      <option value="formal">{isTr ? 'Resmi' : 'Formal'}</option>
                      <option value="apologetic">{isTr ? 'Özür' : 'Apologetic'}</option>
                    </select>
                    <button
                      onClick={() => onSuggest(aiTone)}
                      disabled={suggesting}
                      className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1 text-white hover:bg-[#1A1A1A] disabled:opacity-50"
                    >
                      {suggesting && <Loader2 size={10} className="animate-spin" />}
                      {isTr ? 'Taslak oluştur' : 'Generate draft'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-[#525252]">
                  {isTr
                    ? 'Puan, yorum ve müşteri bağlamına göre Buaze tonunda kişiselleştirilmiş Türkçe yanıt üretir. Pulse AI yanıt vermezse güvenli şablona düşer.'
                    : 'Generates a personalized reply in your Buaze voice based on rating, comment and customer context. Falls back to a safe template when Pulse AI is unavailable.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#EDEDED] bg-white">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  placeholder={isTr ? 'Yanıtınızı yazın…' : 'Write your reply…'}
                  className="w-full resize-none rounded-t-xl bg-transparent p-4 text-[13px] outline-none"
                />
                <div className="border-t border-[#EDEDED] px-3 py-2">
                  {active.customerEmail ? (
                    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#0A0A0A]">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="h-4 w-4 accent-[#0A0A0A]"
                      />
                      <Mail size={12} className="text-current opacity-60" />
                      <span>
                        {isTr ? 'Müşteriye e-posta gönder' : 'Email the customer'} ·
                        <span className="ml-1 text-[#737373]">{active.customerEmail}</span>
                      </span>
                    </label>
                  ) : (
                    <p className="flex items-center gap-2 text-[11px] text-[#737373]">
                      <Mail size={12} />
                      {isTr
                        ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? ' (yüksek puanlılar yönlendirildiği için bu beklenir)' : ''} — yanıt sadece dahili olarak kaydedilir.`
                        : `No customer email on file${active.rating >= 4 ? ' (expected for high-rating redirects)' : ''} — reply will be saved internally.`}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-[#EDEDED] p-3">
                  <span className="text-[11px] text-[#737373]">{draft.length} / 2000</span>
                  <button
                    onClick={onSend}
                    disabled={sending || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : sendEmail && active.customerEmail ? (
                      <Mail size={12} />
                    ) : (
                      <Send size={12} />
                    )}
                    {sendEmail && active.customerEmail
                      ? isTr ? 'E-posta ile gönder' : 'Send as email'
                      : isTr ? 'Dahili kaydet' : 'Save internal'}
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* PR3 — Bulk action floating toolbar (Stripe Dashboard pattern).
          Selection > 0 olunca sticky bottom-center; mobile'da inset-x-4. */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label={isTr ? 'Toplu işlem araç çubuğu' : 'Bulk action toolbar'}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border border-[#0A0A0A] bg-white px-3 py-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:max-w-[480px]"
        >
          <span className="text-[12px] font-semibold text-[#0A0A0A] px-2">
            {selectedIds.size} {isTr ? 'seçildi' : 'selected'}
          </span>
          <button
            type="button"
            onClick={() => runBulk('flag')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors"
          >
            <Flag size={11} strokeWidth={2.2} />
            {isTr ? 'İşaretle' : 'Flag'}
          </button>
          <button
            type="button"
            onClick={() => runBulk('unflag')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors"
          >
            {isTr ? 'Kaldır' : 'Unflag'}
          </button>
          <button
            type="button"
            onClick={() => runBulk('assign')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EDEDED] px-3 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#FAFAFA] transition-colors"
          >
            <UserPlus size={11} strokeWidth={2.2} />
            {isTr ? 'Bana ata' : 'Assign me'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            aria-label={isTr ? 'Seçimi temizle' : 'Clear selection'}
            className="ml-1 rounded-md p-1 hover:bg-[#FAFAFA] transition-colors"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}
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
