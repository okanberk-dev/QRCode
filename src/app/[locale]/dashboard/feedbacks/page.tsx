'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search, Flag, UserPlus, Sparkles, RotateCw, Pencil, Send, Plus, Inbox } from 'lucide-react';
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

  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'attention' | 'replied'>(
    (searchParams.get('tab') as 'all' | 'new' | 'attention' | 'replied') || 'all',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [filterRating, setFilterRating] = useState(searchParams.get('rating') || 'all');
  const [daysFilter, setDaysFilter] = useState(searchParams.get('days') || 'all');

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
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [daysFilter, filterRating]);

  const filteredList = useMemo(() => {
    let rows = feedbacks;
    if (activeTab === 'new') rows = rows.filter((r) => !r.isReplied);
    else if (activeTab === 'attention') rows = rows.filter((r) => r.rating <= 2);
    else if (activeTab === 'replied') rows = rows.filter((r) => r.isReplied);
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

  // Initial counts from server aggregate (fast first paint) —
  // /api/feedback/counts returns {all,new,attention,replied} using
  // Prisma aggregates. Falls back to derived list counts when the
  // endpoint is unavailable.
  const [serverCounts, setServerCounts] = useState<{
    all: number;
    new: number;
    attention: number;
    replied: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/feedback/counts');
        if (res.ok && !cancelled) setServerCounts(await res.json());
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    if (serverCounts && feedbacks.length === 0) return serverCounts;
    return {
      all: feedbacks.length,
      new: feedbacks.filter((r) => !r.isReplied).length,
      attention: feedbacks.filter((r) => r.rating <= 2).length,
      replied: feedbacks.filter((r) => r.isReplied).length,
    };
  }, [feedbacks, serverCounts]);

  const tabs: { k: typeof activeTab; l: string; c: number }[] = [
    { k: 'all', l: isTr ? 'Hepsi' : 'All', c: counts.all },
    { k: 'new', l: isTr ? 'Yeni' : 'New', c: counts.new },
    { k: 'attention', l: isTr ? 'Dikkat' : 'Attention', c: counts.attention },
    { k: 'replied', l: isTr ? 'Yanıtlandı' : 'Replied', c: counts.replied },
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

  useEffect(() => {
    if (!active) return setAiSuggestion('');
    // Optimistic local draft
    setAiSuggestion(
      buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }),
    );
    // Ask the (scaffolded) server for a richer reply — falls back silently
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            rating: active.rating,
            name: active.customerName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
        }
      } catch {
        /* keep local template */
      }
    })();
  }, [active, locale]);

  const regenerateAi = async () => {
    if (!active) return;
    setAiRegenerating(true);
    try {
      const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          rating: active.rating,
          name: active.customerName,
          variant: Math.random().toString(36).slice(2, 8),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.suggestion === 'string') setAiSuggestion(data.suggestion);
      }
    } catch {
      /* ignore */
    } finally {
      setAiRegenerating(false);
    }
  };

  const sendReply = async () => {
    if (!active || !replyDraft.trim()) return;
    try {
      await fetch(`/api/feedback/${active.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft, channel: 'internal' }),
      });
    } catch {
      /* non-blocking — backend scaffolded, user will wire */
    }
    setReplyDraft('');
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
    <div className="flex h-[calc(100vh-140px)] flex-col lg:flex-row" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ============ LEFT — review list ============ */}
      <aside className="flex w-full lg:w-[340px] flex-shrink-0 flex-col border-b border-[#EDEDED] bg-white lg:border-b-0 lg:border-r">
        <div className="border-b border-[#EDEDED] p-4">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.k}
                type="button"
                onClick={() => setActiveTab(tab.k)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activeTab === tab.k
                    ? 'bg-[#0A0A0A] text-white'
                    : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EDEDED]'
                }`}
              >
                {tab.l}
                <span className={`ml-1.5 ${activeTab === tab.k ? 'text-white/60' : 'text-[#737373]'}`}>
                  · {tab.c}
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
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(r.id)}
                      className={`flex w-full flex-col gap-1.5 border-b border-[#F5F5F5] px-4 py-3.5 text-left transition-colors ${
                        isActive ? 'bg-[#EAF9B8] border-l-[3px] border-l-[#0A0A0A]' : 'hover:bg-[#FAFAFA] border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarBg}`}
                            style={{ fontFamily: 'var(--font-heading)' }}
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
                        {r.isReplied && <span className="ml-auto text-[10px] text-[#16A34A]">✓</span>}
                        {r.rating <= 2 && !r.isReplied && <span className="ml-auto text-[10px] text-[#DC2626]">⚠</span>}
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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[18px] font-semibold text-[#C6F24E]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {initials(active.customerName)}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
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

            {/* AI Co-Pilot suggestion — static, backend to be wired later */}
            <div className="mt-6 rounded-xl bg-[#0A0A0A] p-5 text-white">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded bg-[#C6F24E] text-[10px] font-bold text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  AI
                </span>
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'BUAZE CO-PILOT ÖNERİSİ' : 'BUAZE CO-PILOT SUGGESTION'}
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-[1.65] text-white/80">{`"${aiSuggestion}"`}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReplyDraft(aiSuggestion)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-4 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
                >
                  <Sparkles size={12} strokeWidth={2} />
                  {isTr ? 'Kullan & gönder' : 'Use & send'}
                </button>
                <button
                  type="button"
                  onClick={regenerateAi}
                  disabled={aiRegenerating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RotateCw size={12} strokeWidth={2} className={aiRegenerating ? 'animate-spin' : ''} />
                  {isTr ? 'Yeniden öner' : 'Regenerate'}
                </button>
                <button
                  type="button"
                  onClick={() => setReplyDraft(aiSuggestion)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <Pencil size={12} strokeWidth={2} />
                  {isTr ? 'Düzenle' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Reply box — frontend only, submit hook TBD */}
            <div className="mt-4 rounded-xl border border-[#EDEDED] p-4">
              <p className="pulse-eyebrow text-[#737373] mb-2.5">
                {isTr ? 'YANIT YAZIN' : 'WRITE A REPLY'}
              </p>
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={isTr ? `Merhaba ${customerName.split(' ')[0]},` : `Hi ${customerName.split(' ')[0]},`}
                className="w-full min-h-[80px] resize-none bg-transparent text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none"
              />
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
                  disabled={!replyDraft.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#1A1A1A] transition-colors disabled:opacity-40"
                >
                  {isTr ? 'Gönder' : 'Send'}
                  <Send size={12} strokeWidth={2} />
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
              className="text-[16px] font-semibold text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
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
        <aside className="hidden xl:flex w-[340px] flex-shrink-0 flex-col overflow-y-auto border-l border-[#EDEDED] bg-[#FAFAFA] p-6">
          <div className="pulse-eyebrow text-[#737373]">
            {isTr ? 'MÜŞTERİ PROFİLİ' : 'CUSTOMER PROFILE'}
          </div>
          <div className="mt-3 rounded-xl border border-[#EDEDED] bg-white p-5">
            <p className="text-[12px] text-[#737373]">{isTr ? 'Toplam ziyaret' : 'Total visits'}</p>
            <div
              className="text-[32px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              1
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'ORT. PUAN' : 'AVG. RATING'}</p>
                <p
                  className="mt-1 text-[15px] font-semibold text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {active.rating.toFixed(1)} <span className="text-[#C6F24E]">★</span>
                </p>
              </div>
              <div>
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'SADAKAT' : 'LOYALTY'}</p>
                <p
                  className="mt-1 text-[15px] font-semibold text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
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
