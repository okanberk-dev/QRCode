'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, Flag, Mail, UserPlus, Sparkles, RotateCw, Pencil, Send, Plus, Inbox } from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildReplyTemplate } from '@/lib/scaffolding';

// Feedback shape returned by /api/feedback (subset of what we use)
interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  platform: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  aspects?: { service?: number; food?: number; price?: number; atmosphere?: number } | null;
  isReplied?: boolean;
  isFlagged?: boolean;
  hasPendingAiDraft?: boolean;
  aiDraftTone?: 'warm' | 'formal' | 'apologetic' | null;
  restaurant?: { name: string; slug?: string } | null;
}

function initials(name: string | null) {
  if (!name) return 'B';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function timeAgo(dateStr: string, locale: Locale) {
  const isTr = locale === 'tr';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Date(dateStr).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' });
}

function FeedbacksContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const searchParams = useSearchParams();
  const isTr = locale === 'tr';

  // Notification deep-link target — `?focus=<feedbackId>` from the
  // NotificationBell. When present, the page auto-selects that feedback
  // (forces tab=all so the row is reachable) and scrolls + lime-pulses
  // the matching list item once the data lands.
  const focusId = searchParams.get('focus');

  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [degraded, setDegraded] = useState<{ joins: boolean; tags: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(focusId);
  // Tabs: design source (`OwnerFeedback` in owner-pages-1.jsx) buckets feedbacks
  // by rating + redirection state, not by reply state. Aligned 1:1 here.
  // Focus deep-link forces tab=all so the row is guaranteed visible
  // regardless of rating / redirect state.
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'high' | 'redirected'>(
    focusId ? 'all' : ((searchParams.get('tab') as 'all' | 'low' | 'high' | 'redirected') || 'all'),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyNotice, setReplyNotice] = useState<{ msg: string; tone: 'success' | 'error' | 'info' } | null>(null);
  // Focus deep-link also widens the date window so even a not-recent
  // feedback is fetched into the loaded list.
  const [filterRating, setFilterRating] = useState(focusId ? 'all' : (searchParams.get('rating') || 'all'));
  const [daysFilter, setDaysFilter] = useState(focusId ? 'all' : (searchParams.get('days') || 'all'));

  // One-shot scroll-into-view + lime pulse highlight when arriving via
  // notification. Cleared on first apply so subsequent state changes
  // don't re-scroll.
  const focusAppliedRef = useRef(false);
  const [pulsedId, setPulsedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: '1', limit: '50', days: daysFilter });
        if (filterRating !== 'all') query.append('rating', filterRating);
        const res = await fetch(`/api/feedback?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const rows: FeedbackRow[] = data.data ?? [];
          setFeedbacks(rows);
          if (rows.length > 0) setActiveId((curr) => curr ?? rows[0].id);
          setDegraded(data?.meta?.degraded ?? null);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [daysFilter, filterRating]);

  // Apply notification deep-link once data has landed: scroll the matching
  // list row into view and trigger a 1.6s lime pulse so the user sees
  // exactly where the bell sent them. Idempotent — guarded by `focusAppliedRef`.
  useEffect(() => {
    if (!focusId || loading || focusAppliedRef.current) return;
    if (!feedbacks.some((r) => r.id === focusId)) return;
    focusAppliedRef.current = true;
    setActiveId(focusId);
    // Defer to next paint so the list has rendered the row.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-feedback-id="${focusId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsedId(focusId);
      setTimeout(() => setPulsedId(null), 1800);
    });
  }, [focusId, loading, feedbacks]);

  const filteredList = useMemo(() => {
    let rows = feedbacks;
    if (activeTab === 'low') rows = rows.filter((r) => r.rating <= 3);
    else if (activeTab === 'high') rows = rows.filter((r) => r.rating >= 4);
    else if (activeTab === 'redirected') rows = rows.filter((r) => !!r.platform);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.customerName ?? '').toLowerCase().includes(q) ||
          (r.comment ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [feedbacks, activeTab, searchTerm]);

  const active = useMemo(
    () => feedbacks.find((r) => r.id === activeId) ?? filteredList[0] ?? null,
    [feedbacks, activeId, filteredList],
  );

  // Counts derived from the loaded list. Tab semantics moved away from
  // reply-state buckets (Phase 11.8 audit), so the legacy
  // /api/feedback/counts endpoint shape doesn't match any more — counts
  // are computed client-side over the fetched window.
  const counts = useMemo(() => ({
    all: feedbacks.length,
    low: feedbacks.filter((r) => r.rating <= 3).length,
    high: feedbacks.filter((r) => r.rating >= 4).length,
    redirected: feedbacks.filter((r) => !!r.platform).length,
  }), [feedbacks]);

  const tabs: { k: typeof activeTab; l: string; c: number }[] = [
    { k: 'all', l: isTr ? 'Tümü' : 'All', c: counts.all },
    { k: 'low', l: isTr ? 'Düşük puan (1-3)' : 'Low (1-3)', c: counts.low },
    { k: 'high', l: isTr ? 'Yüksek puan (4-5)' : 'High (4-5)', c: counts.high },
    { k: 'redirected', l: isTr ? 'Yönlendirilen' : 'Redirected', c: counts.redirected },
  ];

  // Static customer profile + history + SLA (frontend-only, backend to be wired later)
  const customerName = active?.customerName ?? (isTr ? 'Müşteri' : 'Customer');
  const customerAspects = active?.aspects ?? null;
  const aspectLabel = isTr
    ? { service: 'Servis', food: 'Yemek', price: 'Fiyat', atmosphere: 'Atmosfer' }
    : { service: 'Service', food: 'Food', price: 'Price', atmosphere: 'Atmosphere' };

  // Draft suggestion generated locally until the AI backend is wired
  // (src/app/api/feedback/[id]/suggest-reply/route.ts currently returns
  // a deterministic template via buildReplyTemplate).
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'openai' | 'template' | 'template-fallback' | null>(null);
  const [aiTone, setAiTone] = useState<'warm' | 'formal' | 'apologetic'>('warm');
  const [aiFromBackground, setAiFromBackground] = useState(false);

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
    setAiLoading(true);
    (async () => {
      // First: check if a Pulse AI background draft already exists. If so,
      // surface it instantly and skip the on-demand fetch.
      try {
        const draftRes = await fetch(`/api/feedback/${active.id}/draft`);
        if (draftRes.ok) {
          const data = await draftRes.json();
          if (data?.draft?.body) {
            setAiSuggestion(data.draft.body);
            setAiSource(data.draft.source === 'ai_copilot' ? 'openai' : 'template-fallback');
            if (data.draft.tone === 'warm' || data.draft.tone === 'formal' || data.draft.tone === 'apologetic') {
              setAiTone(data.draft.tone);
            }
            setAiFromBackground(true);
            setAiLoading(false);
            return;
          }
        }
      } catch {
        /* fall through to on-demand */
      }
      // Fallback: on-demand suggest-reply call.
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

  const regenerateAi = async (toneOverride?: 'warm' | 'formal' | 'apologetic') => {
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

  const flashReply = (msg: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setReplyNotice({ msg, tone });
    setTimeout(() => setReplyNotice(null), 2800);
  };

  const sendReply = async () => {
    if (!active || !replyDraft.trim() || sendingReply) return;
    setSendingReply(true);
    const wantsEmail = sendEmail && Boolean(active.customerEmail);
    // Mirror /admin/reviews — track whether the reply originated from the
    // Pulse AI draft so trial-ending mail can count operator vs AI replies.
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
          body: replyDraft,
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
        setReplyDraft('');
        setAiSource(null);
        setAiFromBackground(false);
        const emailStatus = data?.email?.status as 'sent' | 'skipped' | 'failed' | undefined;
        if (emailStatus === 'sent') {
          flashReply(
            isTr ? `E-posta gönderildi: ${active.customerEmail}` : `Email sent to ${active.customerEmail}`,
            'success',
          );
        } else if (emailStatus === 'failed') {
          flashReply(
            isTr ? 'Yanıt kaydedildi ama e-posta gönderilemedi' : 'Saved but email delivery failed',
            'error',
          );
        } else {
          flashReply(isTr ? 'Yanıt kaydedildi (dahili)' : 'Reply saved (internal)', 'success');
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

  const assignFeedback = async () => {
    if (!active) return;
    try {
      await fetch(`/api/feedback/${active.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: null }),
      });
    } catch {
      /* non-blocking */
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col lg:h-[calc(100vh-140px)] lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ============ LEFT — review list ============ */}
      <aside className="flex max-h-[55vh] w-full flex-shrink-0 flex-col border-b border-[#EDEDED] bg-white lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
        {degraded && (
          <div className="border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-2 text-[11px] font-medium text-[#92400E]">
            {isTr
              ? `${degraded.joins ? 'Yanıt/atama/işaret durumu' : 'Tag filtreleri'} şu an pasif — DB senkronizasyonu bekleniyor.`
              : `${degraded.joins ? 'Reply/assignment/flag status' : 'Tag filters'} temporarily unavailable — DB sync pending.`}
          </div>
        )}
        <div className="border-b border-[#EDEDED] p-4">
          {/* Mobile-screens-1.jsx MOwnerFeedback line 247-267: filter chips
              horizontal scroll. Mobile'da no-wrap + overflow-x-auto;
              desktop'ta wrap. */}
          <div className="flex gap-1.5 overflow-x-auto md:flex-wrap no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.k}
                type="button"
                onClick={() => setActiveTab(tab.k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activeTab === tab.k
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EDEDED]'
                }`}
              >
                {tab.l}
                <span
                  className={`ml-1.5 font-mono ${activeTab === tab.k ? 'text-[#C6F24E]' : 'text-[#A3A3A3]'}`}
                >
                  {tab.c}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F5F5F5] px-3 py-2">
            <Search size={13} className="text-[#737373] shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isTr ? 'Yorum, müşteri ara...' : 'Search review, customer...'}
              className="w-full bg-transparent text-[12px] text-[#0A0A0A] placeholder:text-[#737373] outline-none"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="flex-1 bg-transparent text-[11px] text-[#525252] outline-none cursor-pointer"
            >
              <option value="all">{t.feedbacks_filter_all}</option>
              <option value="1">{t.feedbacks_filter_today}</option>
              <option value="7">{isTr ? 'Son 7 gün' : 'Last 7 days'}</option>
              <option value="30">{isTr ? 'Son 30 gün' : 'Last 30 days'}</option>
            </select>
            <span className="h-4 w-px bg-[#EDEDED]" />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="flex-1 bg-transparent text-[11px] text-[#525252] outline-none cursor-pointer"
            >
              <option value="all">{isTr ? 'Tüm puanlar' : 'All ratings'}</option>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0A0A0A]" strokeWidth={2} />
              <span className="mt-3 pulse-eyebrow text-[#737373]">
                {isTr ? 'YÜKLENİYOR' : 'LOADING'}
              </span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#737373]">
                <Inbox size={16} strokeWidth={2} />
              </div>
              <p className="text-[13px] font-medium text-[#0A0A0A]">
                {isTr ? 'Yorum yok' : 'No reviews'}
              </p>
              <p className="mt-1 text-[12px] text-[#737373]">
                {isTr ? 'Filtreleri değiştirip tekrar dene.' : 'Try adjusting filters.'}
              </p>
            </div>
          ) : (
            <ul>
              {filteredList.map((r) => {
                const isActive = active?.id === r.id;
                const avatarBg =
                  r.rating === 5 ? 'bg-[#0A0A0A] text-[#C6F24E]' : r.rating <= 2 ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F5F5F5] text-[#0A0A0A]';
                return (
                  <li key={r.id} data-feedback-id={r.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(r.id)}
                      className={`flex w-full flex-col gap-1.5 border-b border-[#F5F5F5] px-4 py-3.5 text-left transition-colors ${
                        isActive ? 'bg-[#EAF9B8] border-l-[3px] border-l-[#0A0A0A]' : 'hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent'
                      } ${pulsedId === r.id ? 'animate-pulse ring-2 ring-[#C6F24E]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-heading text-[10px] font-semibold ${avatarBg}`}
                          >
                            {initials(r.customerName)}
                          </span>
                          <span className="truncate text-[13px] font-semibold text-[#0A0A0A]">
                            {r.customerName || (isTr ? 'Anonim' : 'Anonymous')}
                          </span>
                        </div>
                        <span className="pulse-eyebrow text-[#737373] shrink-0">{timeAgo(r.createdAt, locale)}</span>
                      </div>
                      <p className="line-clamp-2 text-[12px] text-[#525252] leading-[1.4]">
                        {r.comment || (isTr ? 'Yorum bırakılmadı.' : 'No comment.')}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="pulse-eyebrow rounded bg-[#0A0A0A] text-[#C6F24E] px-1.5 py-0.5"
                        >
                          {'★'.repeat(r.rating)}
                        </span>
                        <span className="text-[10px] text-[#737373]">
                          {(r.platform || 'buaze').toUpperCase()}
                          {r.restaurant?.name ? ` · ${r.restaurant.name}` : ''}
                        </span>
                        {r.hasPendingAiDraft && !r.isReplied && (
                          <span
                            title={isTr ? 'Pulse AI taslağı hazır' : 'Pulse AI draft ready'}
                            className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#EAF9B8] px-1.5 py-0.5 text-[9px] font-semibold text-[#0A0A0A]"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#A8D62E]" aria-hidden="true" />
                            <span className="hidden sm:inline">PULSE AI</span>
                          </span>
                        )}
                        {r.isReplied && <span className="ml-auto text-[10px] text-[#16A34A]">✓</span>}
                        {r.rating <= 2 && !r.isReplied && !r.hasPendingAiDraft && (
                          <span className="ml-auto text-[10px] text-[#DC2626]">⚠</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ============ CENTER — active review ============ */}
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-5 sm:p-8">
        {active ? (
          <>
            <div className="flex items-start gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[18px] font-semibold text-[#C6F24E] bz-h-tight"
              >
                {initials(active.customerName)}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.015em] bz-h-tight"
                >
                  {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
                </h2>
                <p className="pulse-eyebrow text-[#737373] mt-1">
                  {(active.platform || 'BUAZE').toUpperCase()}
                  {active.restaurant?.name ? ` · ${active.restaurant.name.toUpperCase()}` : ''}
                  {` · ${timeAgo(active.createdAt, locale).toUpperCase()} ${isTr ? 'ÖNCE' : 'AGO'}`}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`${i <= active.rating ? 'text-[#C6F24E]' : 'text-[#EDEDED]'} text-[16px]`}>
                      ★
                    </span>
                  ))}
                  <span className="ml-2 text-[13px] font-semibold text-[#0A0A0A]">
                    {active.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={flagFeedback}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-2.5 py-1.5 text-[11px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
                  title={isTr ? 'Bayrakla işaretle' : 'Flag'}
                >
                  <Flag size={12} strokeWidth={2} />
                  {isTr ? 'Flag' : 'Flag'}
                </button>
                <button
                  type="button"
                  onClick={assignFeedback}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-2.5 py-1.5 text-[11px] font-medium text-[#525252] hover:border-[#0A0A0A] transition-colors"
                  title={isTr ? 'Ekibe ata' : 'Assign'}
                >
                  <UserPlus size={12} strokeWidth={2} />
                  {isTr ? 'Ata' : 'Assign'}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[#FAFAFA] p-5 text-[15px] leading-[1.65] text-[#0A0A0A]">
              {active.comment ? `"${active.comment}"` : isTr ? 'Yorum bırakılmadı.' : 'No comment.'}
            </div>

            {customerAspects && Object.entries(customerAspects).some(([, v]) => v) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(customerAspects).map(([k, v]) =>
                  v ? (
                    <span
                      key={k}
                      className="rounded-full bg-[#EAF9B8] px-2.5 py-1 text-[11px] font-medium text-[#0A0A0A]"
                    >
                      {aspectLabel[k as keyof typeof aspectLabel] ?? k} · +{v}
                    </span>
                  ) : null,
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#A3A3A3] px-2.5 py-1 text-[11px] text-[#737373]">
                  <Plus size={10} strokeWidth={2} />
                  {isTr ? 'Etiket' : 'Tag'}
                </span>
              </div>
            )}

            {/* Buaze Pulse AI suggestion — wired to /api/feedback/[id]/suggest-reply.
                Uses the configured AI provider when OPENAI_API_KEY is set; falls back to the
                deterministic template otherwise. The badge reflects which
                source produced the current draft. */}
            <div className="mt-6 rounded-xl bg-[#0A0A0A] p-5 text-white">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded bg-[#C6F24E] text-[10px] font-bold text-[#0A0A0A] bz-h-tight"
                >
                  AI
                </span>
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'BUAZE PULSE AI ÖNERİSİ' : 'BUAZE PULSE AI SUGGESTION'}
                </span>
                {!aiLoading && aiSource === 'openai' && (
                  <span className="pulse-eyebrow rounded-full bg-[#C6F24E] px-2 py-0.5 text-[#0A0A0A]">
                    {isTr ? 'CANLI' : 'LIVE'}
                  </span>
                )}
                {!aiLoading && (aiSource === 'template' || aiSource === 'template-fallback') && (
                  <span className="pulse-eyebrow rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                    {isTr ? 'ŞABLON' : 'TEMPLATE'}
                  </span>
                )}
                {!aiLoading && aiFromBackground && (
                  <span className="pulse-eyebrow rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                    {isTr ? 'HAZIR' : 'READY'}
                  </span>
                )}
                {aiLoading && (
                  <span className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                    <Loader2 size={10} className="animate-spin" />
                    {isTr ? 'HAZIRLANIYOR' : 'WORKING'}
                  </span>
                )}
              </div>
              {aiLoading ? (
                <div className="mt-3 space-y-2" aria-hidden="true">
                  <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-[88%] rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-[60%] rounded bg-white/10 animate-pulse" />
                </div>
              ) : (
                <p className="mt-3 text-[13px] leading-[1.65] text-white/80">
                  {aiSuggestion ? `"${aiSuggestion}"` : (isTr ? 'Pulse AI henüz bir taslak üretmedi.' : 'Pulse AI has not produced a draft yet.')}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplyDraft(aiSuggestion)}
                  disabled={aiLoading || !aiSuggestion}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={12} strokeWidth={2} />
                  {isTr ? 'Kullan & gönder' : 'Use & send'}
                </button>
                <button
                  type="button"
                  onClick={() => regenerateAi()}
                  disabled={aiLoading || aiRegenerating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RotateCw size={12} strokeWidth={2} className={aiRegenerating ? 'animate-spin' : ''} />
                  {isTr ? 'Yeniden öner' : 'Regenerate'}
                </button>
                <select
                  value={aiTone}
                  onChange={(e) => {
                    const next = e.target.value as 'warm' | 'formal' | 'apologetic';
                    setAiTone(next);
                    void regenerateAi(next);
                  }}
                  disabled={aiLoading || aiRegenerating}
                  aria-label={isTr ? 'Pulse AI tonu' : 'Pulse AI tone'}
                  className="rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 outline-none focus:border-[#C6F24E]"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="warm" className="text-[#0A0A0A]">{isTr ? 'Ton: Samimi' : 'Tone: Warm'}</option>
                  <option value="formal" className="text-[#0A0A0A]">{isTr ? 'Ton: Resmi' : 'Tone: Formal'}</option>
                  <option value="apologetic" className="text-[#0A0A0A]">{isTr ? 'Ton: Özür' : 'Tone: Apologetic'}</option>
                </select>
                <button
                  type="button"
                  onClick={() => setReplyDraft(aiSuggestion)}
                  disabled={aiLoading || !aiSuggestion}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pencil size={12} strokeWidth={2} />
                  {isTr ? 'Düzenle' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Reply box — persists via /api/feedback/[id]/reply; when
                channel=email and the customer left an address, Resend
                delivers the reply to them. */}
            <div className="mt-4 rounded-xl border border-[#EDEDED] p-4">
              <div className="flex items-center justify-between">
                <p className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'YANIT YAZIN' : 'WRITE A REPLY'}
                </p>
                {replyNotice && (
                  <span
                    className={`pulse-eyebrow rounded-full px-2.5 py-1 ${
                      replyNotice.tone === 'success'
                        ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                        : replyNotice.tone === 'error'
                          ? 'bg-[#FEF2F2] text-[#991B1B]'
                          : 'bg-[#F5F5F5] text-[#525252]'
                    }`}
                  >
                    {replyNotice.msg}
                  </span>
                )}
              </div>
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={isTr ? `Merhaba ${customerName.split(' ')[0]},` : `Hi ${customerName.split(' ')[0]},`}
                className="mt-2.5 w-full min-h-[80px] resize-none bg-transparent text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none"
              />

              <div className="mt-3 rounded-lg bg-[#FAFAFA] p-2.5">
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
                      {isTr ? 'Müşteriye e-posta gönder' : 'Email the customer'}
                      <span className="ml-1 text-[#737373]">· {active.customerEmail}</span>
                    </span>
                  </label>
                ) : (
                  <p className="flex items-center gap-2 text-[11px] text-[#737373]">
                    <Mail size={12} />
                    {isTr
                      ? `Müşteri e-posta bırakmamış${active.rating >= 4 ? ' (yüksek puanlılar Google\'a yönlendirildiği için bu beklenir)' : ''} — yanıt sadece dahili kayıt olarak saklanır.`
                      : `No customer email${active.rating >= 4 ? ' (expected: high ratings are redirected to Google)' : ''} — reply saved internally only.`}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {['📝', '✨', '😊', '@'].map((e) => (
                    <span
                      key={e}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5F5F5] text-[12px]"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!replyDraft.trim() || sendingReply}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#1A1A1A] transition-colors disabled:opacity-40"
                >
                  {sendingReply ? (
                    <Loader2 size={12} strokeWidth={2} className="animate-spin" />
                  ) : sendEmail && active.customerEmail ? (
                    <Mail size={12} strokeWidth={2} />
                  ) : (
                    <Send size={12} strokeWidth={2} />
                  )}
                  {sendEmail && active.customerEmail
                    ? isTr ? 'E-posta ile gönder' : 'Send as email'
                    : isTr ? 'Dahili kaydet' : 'Save internal'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#737373]">
              <Inbox size={22} strokeWidth={2} />
            </div>
            <p
              className="text-[16px] font-semibold text-[#0A0A0A] bz-h-tight"
            >
              {isTr ? 'Bir yorum seç' : 'Select a review'}
            </p>
            <p className="mt-1 text-[13px] text-[#737373]">
              {isTr ? 'Detayları burada göster.' : 'Details will appear here.'}
            </p>
          </div>
        )}
      </section>

      {/* ============ RIGHT — customer context (static, frontend only) ============ */}
      {active && (
        <aside className="hidden lg:flex lg:w-[280px] xl:w-[340px] flex-shrink-0 flex-col overflow-y-auto border-l border-[#EDEDED] bg-[#FAFAFA] p-5 xl:p-6">
          <div className="pulse-eyebrow text-[#737373]">
            {isTr ? 'MÜŞTERİ PROFİLİ' : 'CUSTOMER PROFILE'}
          </div>
          <div className="mt-3 rounded-xl border border-[#EDEDED] bg-white p-5">
            <p className="text-[12px] text-[#737373]">{isTr ? 'Toplam ziyaret' : 'Total visits'}</p>
            <div
              className="text-[32px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A] bz-h-tight"
            >
              1
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'ORT. PUAN' : 'AVG. RATING'}</p>
                <p
                  className="mt-1 text-[15px] font-semibold text-[#0A0A0A] bz-h-tight"
                >
                  {active.rating.toFixed(1)} <span className="text-[#C6F24E]">★</span>
                </p>
              </div>
              <div>
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'SADAKAT' : 'LOYALTY'}</p>
                <p
                  className="mt-1 text-[15px] font-semibold text-[#0A0A0A] bz-h-tight"
                >
                  {active.rating >= 4 ? (isTr ? 'Yüksek' : 'High') : isTr ? 'Orta' : 'Mid'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pulse-eyebrow text-[#737373]">{isTr ? 'GEÇMİŞ' : 'HISTORY'}</div>
          <div className="mt-2 space-y-2">
            <div className="rounded-lg border border-[#EDEDED] bg-white p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="rounded bg-[#0A0A0A] px-1.5 py-0.5 text-[#C6F24E] font-mono">
                  {'★'.repeat(active.rating)}
                </span>
                <span className="text-[#737373]">{timeAgo(active.createdAt, locale)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[12px] text-[#525252]">
                {active.comment ?? (isTr ? 'Yorum yok.' : 'No comment.')}
              </p>
            </div>
          </div>

          <div className="mt-6 pulse-eyebrow text-[#737373]">{isTr ? 'OTOMASYON' : 'AUTOMATION'}</div>
          <div className="mt-2 rounded-xl bg-[#EAF9B8] p-4 text-[12px] leading-[1.55] text-[#0A0A0A]">
            <strong>{isTr ? 'SLA hedefi' : 'SLA target'}:</strong>{' '}
            {isTr ? '2 saat içinde yanıt.' : 'Reply within 2 hours.'}
          </div>
        </aside>
      )}
    </div>
  );
}

export default async function FeedbacksPage({ params }: { params: Promise<{ locale: Locale }> }) {
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
