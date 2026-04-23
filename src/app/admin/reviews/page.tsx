'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flag, Inbox, Loader2, Search, Send, Sparkles, Star, UserPlus } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { buildReplyTemplate } from '@/lib/scaffolding';

type Source = 'openai' | 'template' | 'template-fallback' | null;

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

export default function AdminReviewsPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<CountsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'new' | 'attention' | 'replied'>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiSource, setAiSource] = useState<Source>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [listRes, countsRes] = await Promise.all([
          fetch('/api/feedback?page=1&limit=100'),
          fetch('/api/feedback/counts'),
        ]);
        if (listRes.ok) {
          const data = await listRes.json();
          const list: FeedbackRow[] = data.data ?? [];
          setRows(list);
          setActiveId((c) => c ?? list[0]?.id ?? null);
        }
        if (countsRes.ok) setCounts(await countsRes.json());
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, []);

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
  }, [active?.id]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const onSuggest = async () => {
    if (!active) return;
    setSuggesting(true);
    // Optimistic local template so the box fills instantly even if the
    // server round-trip is slow.
    setDraft(buildReplyTemplate({ name: active.customerName, rating: active.rating, locale }));
    setAiSource('template');
    try {
      const res = await fetch(`/api/feedback/${active.id}/suggest-reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.suggestion === 'string' && data.suggestion.length > 0) {
          setDraft(data.suggestion);
          setAiSource((data.source as Source) ?? 'template');
        }
      } else if (res.status === 429) {
        flash(isTr ? 'Çok sık istek — biraz bekle' : 'Too many requests — slow down');
      }
    } catch {
      /* keep local template */
    }
    setSuggesting(false);
  };

  const onSend = async () => {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/feedback/${active.id}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: draft, channel: 'internal' }),
      });
      if (res.status === 501) {
        flash(isTr ? 'Yakında bağlanacak — taslak kaydedildi (yerel)' : 'Coming soon — draft saved (local)');
      } else if (res.ok) {
        flash(isTr ? 'Yanıt gönderildi' : 'Reply sent');
        setDraft('');
      } else {
        flash(isTr ? 'Hata' : 'Error');
      }
    } catch {
      flash(isTr ? 'Ağ hatası' : 'Network error');
    }
    setSending(false);
  };

  const onFlag = async () => {
    if (!active) return;
    const res = await fetch(`/api/feedback/${active.id}/flag`, { method: 'POST' });
    flash(res.status === 501 ? (isTr ? 'Flag bekliyor' : 'Flag pending') : isTr ? 'İşaretlendi' : 'Flagged');
  };

  const onAssign = async () => {
    if (!active) return;
    const res = await fetch(`/api/feedback/${active.id}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assigneeId: 'self' }),
    });
    flash(res.status === 501 ? (isTr ? 'Atama bekliyor' : 'Assign pending') : isTr ? 'Atandı' : 'Assigned');
  };

  const tabs: { id: typeof tab; label: string; count: number | undefined }[] = [
    { id: 'all', label: isTr ? 'Hepsi' : 'All', count: counts?.all },
    { id: 'new', label: isTr ? 'Yeni' : 'New', count: counts?.new },
    { id: 'attention', label: isTr ? 'Dikkat' : 'Attention', count: counts?.attention },
    { id: 'replied', label: isTr ? 'Yanıtlandı' : 'Replied', count: counts?.replied },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PANEL / YORUMLAR' : 'PANEL / REVIEWS'}</p>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
            {isTr ? 'Yorum gelen kutusu' : 'Review inbox'}
          </h1>
        </div>
        {notice && <span className="pulse-eyebrow rounded-full bg-[#EAF9B8] px-3 py-1.5 text-[#0A0A0A]">{notice}</span>}
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-[#EDEDED] bg-white">
          <div className="border-b border-[#EDEDED] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2">
              <Search size={14} className="text-[#737373]" strokeWidth={2} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isTr ? 'Müşteri veya yorum ara' : 'Search customer or comment'}
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#737373]"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`pulse-eyebrow rounded-full px-2.5 py-1 transition-colors ${
                    tab === t.id
                      ? 'bg-[#0A0A0A] text-white'
                      : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EDEDED]'
                  }`}
                >
                  {t.label}
                  {typeof t.count === 'number' && <span className="ml-1 opacity-60">{t.count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-[#EDEDED]">
            {loading ? (
              <div className="flex items-center justify-center p-10 text-[#737373]">
                <Loader2 className="animate-spin" size={18} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-[#737373]">
                <Inbox size={22} strokeWidth={1.5} />
                <p className="text-[13px]">{isTr ? 'Henüz yorum yok' : 'No reviews yet'}</p>
              </div>
            ) : (
              filtered.map((r) => {
                const isActive = r.id === active?.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                      isActive ? 'bg-[#EAF9B8]/40' : 'hover:bg-[#FAFAFA]'
                    }`}
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
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#737373]">
                        <Star size={11} className="fill-[#C6F24E] text-[#C6F24E]" />
                        <span>{r.rating}.0</span>
                        {r.restaurant?.name && <span className="truncate">· {r.restaurant.name}</span>}
                      </div>
                      {r.comment && <p className="mt-1 line-clamp-2 text-[12px] text-[#525252]">{r.comment}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-[#EDEDED] bg-white">
          {!active ? (
            <div className="flex h-80 items-center justify-center text-[#737373]">
              {isTr ? 'Yorum seçin' : 'Select a review'}
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
                  <h2 className="mt-0.5 text-[20px] font-semibold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {active.customerName || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
                  </h2>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={n <= active.rating ? 'fill-[#C6F24E] text-[#C6F24E]' : 'text-[#EDEDED]'}
                      />
                    ))}
                    <span className="ml-2 text-[12px] text-[#737373]">{active.rating}.0</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onFlag}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
                  >
                    <Flag size={12} /> {isTr ? 'İşaretle' : 'Flag'}
                  </button>
                  <button
                    onClick={onAssign}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] bg-white px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:border-[#0A0A0A]"
                  >
                    <UserPlus size={12} /> {isTr ? 'Ata' : 'Assign'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
                <p className="text-[14px] leading-relaxed text-[#0A0A0A]">
                  {active.comment || (isTr ? 'Bu yorumda açıklama yok.' : 'No comment provided.')}
                </p>
              </div>

              <div className="rounded-xl border border-[#C6F24E]/60 bg-[#EAF9B8]/30 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#0A0A0A]" />
                    <p className="pulse-eyebrow text-[#0A0A0A]">{isTr ? 'AI YARDIMCI' : 'AI CO-PILOT'}</p>
                    {aiSource === 'openai' && (
                      <span className="pulse-eyebrow rounded-full bg-[#0A0A0A] px-2 py-0.5 text-white">AI</span>
                    )}
                    {(aiSource === 'template' || aiSource === 'template-fallback') && (
                      <span className="pulse-eyebrow rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[#737373]">
                        {isTr ? 'ŞABLON' : 'TEMPLATE'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onSuggest}
                    disabled={suggesting}
                    className="pulse-eyebrow inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1 text-white hover:bg-[#1A1A1A] disabled:opacity-50"
                  >
                    {suggesting && <Loader2 size={10} className="animate-spin" />}
                    {isTr ? 'Taslak oluştur' : 'Generate draft'}
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-[#525252]">
                  {isTr
                    ? 'OpenAI ile puan, yorum ve müşteriye göre kişiselleştirilmiş Türkçe yanıt üretir. Anahtar yoksa şablona düşer.'
                    : 'Generates a personalized reply via OpenAI based on the rating, comment and customer. Falls back to template without the key.'}
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
                <div className="flex items-center justify-between border-t border-[#EDEDED] p-3">
                  <span className="text-[11px] text-[#737373]">{draft.length} / 2000</span>
                  <button
                    onClick={onSend}
                    disabled={sending || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C6F24E] px-4 py-2 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {isTr ? 'Gönder' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
