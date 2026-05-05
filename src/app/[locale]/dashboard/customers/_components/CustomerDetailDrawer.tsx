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
  Wallet,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type { CustomerSegment, CustomerSentiment } from '@/lib/customers';
import { computeLastChannel, computeLastTopic } from '@/lib/customers';
import { SegmentChip } from '@/components/customers/SegmentChip';
import { SentimentBadge } from '@/components/customers/SentimentBadge';
import { AlertBanner } from '@/components/ui';

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
    // §38.47 — last feedback'in platform + aspect rating'leri (raw alanlar).
    lastPlatform?: string | null;
    lastRating?: number | null;
    lastFoodRating?: number | null;
    lastServiceRating?: number | null;
    lastAtmosphereRating?: number | null;
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

// §38.47 — `computeLastChannel` helper drift-zero source; drawer feedback list
// timeline'ında platform label'ı için aynı helper kullanılır (eski inline
// PLATFORM_LABEL map'i kaldırıldı, taxonomy genişlemesinde drift olmaz).

function ratingTone(rating: number): { color: string; label: 'pos' | 'neu' | 'neg' } {
  if (rating >= 4) return { color: '#16A34A', label: 'pos' };
  if (rating <= 2) return { color: '#DC2626', label: 'neg' };
  return { color: '#A3A3A3', label: 'neu' };
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

  // ESC + body scroll lock + focus management + Tab focus trap (a11y).
  // CLAUDE.md §38.40 — Modal primitive paterni reuse (FOCUSABLE_SELECTOR + Tab
  // cycling). Mevcut ESC + initial focus + restore intact, Tab+Shift+Tab
  // dialog içinde döngü eklendi (a11y compliance).
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const FOCUSABLE_SELECTOR = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDrawer();
        return;
      }
      // Focus trap — Tab/Shift+Tab dialog içinde döngü.
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === firstEl || !drawerRef.current.contains(active)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else if (active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
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
        className="fixed top-0 right-0 bottom-0 z-[51] w-full sm:w-[420px] md:w-[480px] bg-white flex flex-col bz-elev-3"
        style={{ animation: 'cust-drawer-in 220ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        {/* CSS Performance §38.61 — `@keyframes cust-drawer-in` + reduced-motion
            override globals.css'e taşındı. Inline `style={{ animation: ... }}`
            yazılı element'i `[style*='cust-drawer-in']` selector blanket'i
            yakalıyor; bu component'tan style block kaldırıldı. */}

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
                  <SentimentBadge sentiment={data.stats.sentiment} locale={locale} variant="badge" />
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label={isTr ? 'Kapat' : 'Close'}
            className="bz-btn-icon-lg shrink-0"
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
            <AlertBanner
              kind="danger"
              icon={<AlertTriangle size={14} strokeWidth={2} className="shrink-0 mt-0.5" />}
            >
              <div>
                <div className="font-semibold">
                  {isTr ? 'Müşteri detayı getirilemedi' : 'Failed to load customer'}
                </div>
                <p className="mt-1 opacity-80">{error}</p>
              </div>
            </AlertBanner>
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

              {/* §38.47 — Son konu + Kanal meta row (helper'lar ile derive,
                  drawer-locale'e duyarlı). Tasarım .design-owner-2026/page-customers.jsx
                  meta satırı paterni. */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'SON KONU' : 'LAST TOPIC'}
                </span>
                <span className="text-[#262626] font-medium">
                  {computeLastTopic(
                    {
                      rating: data.stats.lastRating ?? null,
                      foodRating: data.stats.lastFoodRating ?? null,
                      serviceRating: data.stats.lastServiceRating ?? null,
                      atmosphereRating: data.stats.lastAtmosphereRating ?? null,
                    },
                    locale,
                  )}
                </span>
                <span className="text-[#A3A3A3]">·</span>
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'KANAL' : 'CHANNEL'}
                </span>
                <span className="bz-mono inline-flex items-center rounded-md bg-[#F5F5F5] px-2 py-0.5 text-[#525252]">
                  {computeLastChannel(data.stats.lastPlatform ?? null, locale)}
                </span>
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
                    // §38.47 — computeLastChannel helper reuse (Buaze QR
                    // fallback otomatik, taxonomy drift sıfır).
                    const platformLabel = computeLastChannel(fb.platform, locale);
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
