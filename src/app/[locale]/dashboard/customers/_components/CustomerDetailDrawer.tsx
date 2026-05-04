'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Mail,
  Phone,
  Star,
  Loader2,
  MessageSquareText,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Crown,
  Sparkles,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type { CustomerSegment, CustomerSentiment } from '@/lib/customers';

// Phase 8d — Customer detail drawer (CLAUDE.md §23.7 Phase 12).
// Phase 8c (CLAUDE.md §38.16): Segment + LTV + Sentiment chips header'da; LTV
// 4. tile olarak stats grid'e (audit önerisi: mobile card'da gizli, drawer'da
// görünür).
//
// URL state pattern: ?detail=<key> param drawer açar. useSearchParams ile
// detect; key değişince fetch tetiklenir. Mevcut Modal primitive paterni
// (focus trap + ESC + body scroll lock + outside click) tek-amaçlı slide-in
// drawer için uyarlandı. Phase 1 .bz-mob-drawer keyframe + .bz-fade-in reuse.

interface CustomerData {
  customer: {
    key: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    restaurantId: string;
    restaurantName: string | null;
  };
  stats: {
    totalReviews: number;
    avgRating: number | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    truncated: boolean;
    segment?: CustomerSegment;
    ltv?: number;
    sentiment?: CustomerSentiment;
    daysSinceLastVisit?: number | null;
  };
  feedbacks: Array<{
    id: string;
    rating: number;
    comment: string | null;
    platform: string | null;
    branch: string | null;
    createdAt: string;
  }>;
}

interface CustomerDetailDrawerProps {
  locale: Locale;
}

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
};

function ratingTone(rating: number): { color: string; label: 'pos' | 'neu' | 'neg' } {
  if (rating >= 4) return { color: '#16A34A', label: 'pos' };
  if (rating <= 2) return { color: '#DC2626', label: 'neg' };
  return { color: '#A3A3A3', label: 'neu' };
}

// Phase 8c segment chip — same styling as customers/page.tsx for consistency.
function SegmentChip({ segment, locale }: { segment: CustomerSegment; locale: Locale }) {
  const isTr = locale === 'tr';
  const map: Record<
    CustomerSegment,
    { label: { tr: string; en: string }; bg: string; fg: string; Icon: typeof Crown }
  > = {
    vip: { label: { tr: 'VIP', en: 'VIP' }, bg: '#0A0A0A', fg: '#FFFFFF', Icon: Crown },
    loyal: { label: { tr: 'Düzenli', en: 'Loyal' }, bg: '#EAF9B8', fg: '#0A0A0A', Icon: CheckCircle2 },
    new: { label: { tr: 'Yeni', en: 'New' }, bg: '#DBEAFE', fg: '#1E40AF', Icon: Sparkles },
    risk: { label: { tr: 'Risk', en: 'Risk' }, bg: '#FEE2E2', fg: '#991B1B', Icon: AlertTriangle },
  };
  const m = map[segment];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      <m.Icon size={10} strokeWidth={2.2} />
      {isTr ? m.label.tr : m.label.en}
    </span>
  );
}

function SentimentBadge({
  sentiment,
  locale,
}: {
  sentiment: CustomerSentiment;
  locale: Locale;
}) {
  const isTr = locale === 'tr';
  const map: Record<CustomerSentiment, { color: string; label: { tr: string; en: string } }> = {
    pos: { color: '#16A34A', label: { tr: 'Olumlu', en: 'Positive' } },
    neu: { color: '#A3A3A3', label: { tr: 'Nötr', en: 'Neutral' } },
    neg: { color: '#DC2626', label: { tr: 'Olumsuz', en: 'Negative' } },
  };
  const s = map[sentiment];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-2 py-0.5 text-[11px] text-[#525252] whitespace-nowrap">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: s.color }}
      />
      {isTr ? s.label.tr : s.label.en}
    </span>
  );
}

function formatRelative(iso: string, locale: Locale): string {
  const isTr = locale === 'tr';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return isTr ? 'şimdi' : 'just now';
  if (min < 60) return `${min} ${isTr ? 'dk' : 'm'}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${isTr ? 'sa' : 'h'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${isTr ? 'g' : 'd'}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ${isTr ? 'ay' : 'mo'}`;
  return `${Math.floor(mo / 12)} ${isTr ? 'yıl' : 'y'}`;
}

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomerDetailDrawer({ locale }: CustomerDetailDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailKey = searchParams.get('detail');
  const isTr = locale === 'tr';

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const open = Boolean(detailKey);

  // Close handler — URL param'ı kaldırır, Next.js soft navigate.
  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('detail');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Fetch on key change.
  useEffect(() => {
    if (!detailKey) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/customers/${encodeURIComponent(detailKey)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || (isTr ? 'Yüklenemedi' : 'Failed to load'));
        }
        return res.json();
      })
      .then((payload: CustomerData) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailKey, isTr]);

  // ESC + body scroll lock + focus management (Modal primitive paterni).
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDrawer();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Initial focus → close button (a11y)
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
    // closeDrawer/router intentionally omitted — handler stable via current state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const initial = (data?.customer.name || data?.customer.email || '?')
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        aria-label={isTr ? 'Kapat' : 'Close'}
        onClick={closeDrawer}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm bz-fade-in cursor-default"
      />
      {/* Slide-in panel — sağ taraftan */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-drawer-heading"
        className="fixed top-0 right-0 bottom-0 z-[51] w-full sm:w-[480px] bg-white flex flex-col shadow-2xl"
        style={{ animation: 'cust-drawer-in 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <style>{`
          @keyframes cust-drawer-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            aside[role="dialog"] { animation: none !important; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bz-avatar flex h-11 w-11 shrink-0 items-center justify-center text-[14px]">
              {initial}
            </div>
            <div className="min-w-0">
              <span className="pulse-eyebrow text-[#737373]">CRM</span>
              <h2
                id="customer-drawer-heading"
                className="bz-h-tight mt-0.5 text-[18px] truncate text-[#0A0A0A]"
              >
                {data?.customer.name || (isTr ? 'Anonim müşteri' : 'Anonymous customer')}
              </h2>
              {data?.customer.restaurantName && (
                <p className="mt-0.5 text-[12px] text-[#525252] truncate">
                  {data.customer.restaurantName}
                </p>
              )}
              {/* Phase 8c: Segment + Sentiment chips */}
              {data?.stats.segment && data?.stats.sentiment && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SegmentChip segment={data.stats.segment} locale={locale} />
                  <SentimentBadge sentiment={data.stats.sentiment} locale={locale} />
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label={isTr ? 'Kapat' : 'Close'}
            className="bz-btn-icon shrink-0"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#737373]">
              <Loader2 size={16} className="animate-spin" />
              {isTr ? 'Yükleniyor…' : 'Loading…'}
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[13px] text-[#991B1B]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} strokeWidth={2} />
                {isTr ? 'Müşteri detayı getirilemedi' : 'Failed to load customer'}
              </div>
              <p className="mt-1.5 text-[12px] text-[#7F1D1D]">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Contact actions */}
              <div className="flex flex-col gap-2">
                {data.customer.email && (
                  <a
                    href={`mailto:${data.customer.email}`}
                    className="inline-flex items-center gap-2.5 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-[13px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                  >
                    <Mail size={14} strokeWidth={2} className="text-[#525252] shrink-0" />
                    <span className="truncate flex-1">{data.customer.email}</span>
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'E-POSTA' : 'EMAIL'}
                    </span>
                  </a>
                )}
                {data.customer.phone && (
                  <a
                    href={`tel:${data.customer.phone}`}
                    className="inline-flex items-center gap-2.5 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5 text-[13px] text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                  >
                    <Phone size={14} strokeWidth={2} className="text-[#525252] shrink-0" />
                    <span className="truncate flex-1">{data.customer.phone}</span>
                    <span className="pulse-eyebrow text-[#737373]">
                      {isTr ? 'TELEFON' : 'PHONE'}
                    </span>
                  </a>
                )}
              </div>

              {/* Stats — Phase 8c 4 tile (LTV eklendi) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bz-card-soft p-3">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'YORUM' : 'REVIEWS'}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[20px] tabular-nums text-[#0A0A0A]">
                      {data.stats.totalReviews}
                    </span>
                    <MessageSquareText size={11} className="text-[#A3A3A3]" />
                  </div>
                </div>
                <div className="bz-card-soft p-3">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'ORT.' : 'AVG'}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[20px] tabular-nums text-[#0A0A0A]">
                      {data.stats.avgRating != null ? data.stats.avgRating.toFixed(1) : '—'}
                    </span>
                    <Star size={11} className="text-[#C6F24E]" fill="#C6F24E" />
                  </div>
                </div>
                <div className="bz-card-soft p-3">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'LTV' : 'LTV'}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span
                      className="bz-mono tabular-nums text-[18px] font-semibold text-[#0A0A0A]"
                      title={
                        isTr
                          ? 'Etkileşim ağırlığı (yorum × ortalama puan)'
                          : 'Engagement weight (reviews × avg rating)'
                      }
                    >
                      {data.stats.ltv != null
                        ? data.stats.ltv.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')
                        : '—'}
                    </span>
                    <Wallet size={11} className="text-[#A3A3A3]" />
                  </div>
                </div>
                <div className="bz-card-soft p-3">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'SON' : 'LAST'}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[14px] text-[#0A0A0A]">
                      {data.stats.lastSeenAt
                        ? formatRelative(data.stats.lastSeenAt, locale)
                        : '—'}
                    </span>
                    <Calendar size={11} className="text-[#A3A3A3]" />
                  </div>
                </div>
              </div>

              {/* First seen + truncated notice */}
              <div className="flex items-center justify-between text-[11px] text-[#737373]">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp size={11} strokeWidth={2} />
                  {isTr ? 'Üye:' : 'Since:'}{' '}
                  <strong className="text-[#0A0A0A]">
                    {data.stats.firstSeenAt
                      ? formatDate(data.stats.firstSeenAt, locale)
                      : '—'}
                  </strong>
                </span>
                {data.stats.truncated && (
                  <span className="text-[#92400E]">
                    {isTr ? 'İlk 50 yorum gösteriliyor' : 'Showing first 50 reviews'}
                  </span>
                )}
              </div>

              {/* Feedback timeline */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'YORUM GEÇMİŞİ' : 'REVIEW HISTORY'}
                  </span>
                  <Link
                    href={`/${locale}/dashboard/feedbacks?focus=${data.feedbacks[0]?.id ?? ''}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#525252] hover:text-[#0A0A0A] transition-colors"
                    onClick={closeDrawer}
                  >
                    {isTr ? 'Yorumlarda aç' : 'Open in inbox'}
                    <ArrowRight size={10} strokeWidth={2} />
                  </Link>
                </div>
                <ol className="space-y-3">
                  {data.feedbacks.map((fb) => {
                    const tone = ratingTone(fb.rating);
                    const platformLabel = fb.platform
                      ? PLATFORM_LABEL[fb.platform] ?? fb.platform
                      : isTr
                        ? 'Buaze'
                        : 'Buaze';
                    return (
                      <li
                        key={fb.id}
                        className="rounded-xl border border-[#EDEDED] bg-white p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: tone.color }}
                            />
                            <span className="flex gap-px">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={11}
                                  className={
                                    s <= fb.rating ? 'text-[#C6F24E]' : 'text-[#EDEDED]'
                                  }
                                  fill={s <= fb.rating ? '#C6F24E' : '#EDEDED'}
                                />
                              ))}
                            </span>
                            <span className="bz-mono text-[10.5px] tabular-nums text-[#737373]">
                              {fb.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="bz-mono text-[10.5px] tabular-nums text-[#A3A3A3]">
                            {formatDate(fb.createdAt, locale)}
                          </span>
                        </div>
                        {fb.comment ? (
                          <p className="mt-2 text-[12.5px] leading-[1.55] text-[#262626] whitespace-pre-wrap">
                            {fb.comment}
                          </p>
                        ) : (
                          <p className="mt-2 text-[12px] italic text-[#A3A3A3]">
                            {isTr ? 'Yorum metni yok.' : 'No comment text.'}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10.5px] text-[#737373]">
                          <span>{platformLabel}</span>
                          {fb.branch && (
                            <>
                              <span>·</span>
                              <span className="truncate">{fb.branch}</span>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Footer — primary action */}
        {data && data.feedbacks.length > 0 && (
          <div className="border-t border-[#EDEDED] bg-[#FAFAFA] p-4 flex gap-2">
            {data.customer.email && (
              <a
                href={`mailto:${data.customer.email}`}
                className="bz-btn-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12px]"
              >
                <Mail size={13} strokeWidth={2} />
                {isTr ? 'E-posta gönder' : 'Send email'}
              </a>
            )}
            {data.customer.phone && (
              <a
                href={`tel:${data.customer.phone}`}
                className="bz-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12px]"
              >
                <Phone size={13} strokeWidth={2} />
                {isTr ? 'Ara' : 'Call'}
              </a>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default CustomerDetailDrawer;
