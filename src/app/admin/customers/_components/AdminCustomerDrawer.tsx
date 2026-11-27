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
  Store,
  Shield,
} from 'lucide-react';
import type { CustomerSegment, CustomerSentiment } from '@/lib/customers';
import { computeLastChannel, computeLastTopic } from '@/lib/customers';
import { SegmentChip } from '@/components/customers/SegmentChip';
import { SentimentBadge } from '@/components/customers/SentimentBadge';
import { AlertBanner } from '@/components/ui';
import { formatClock, resolveDisplayTimeZone } from '@/lib/timezone';

// CLAUDE.md §38.93 (Stage A1) — admin-tier counterpart of owner CustomerDetailDrawer
// (CLAUDE.md §38.14 + §38.16). Cross-restaurant scope:
//   - Restaurant name + owner link surfaced in header (admin context).
//   - "İşletme detayı" CTA → /admin/restaurants/[id] (cross-link §38.76).
//   - "İşletme sahibi" CTA → /admin/members/[ownerId] when present.
//
// URL state ?detail=KEY (CLAUDE.md §36 useUrlFilter pattern reuse). Modal-tier
// shadow + slide-in animation + focus trap copied from owner drawer; only the
// fetch endpoint and admin-specific link rail differ.

interface CustomerData {
  customer: {
    key: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    restaurantId: string;
    restaurantName: string | null;
    restaurantOwnerUserId: string | null;
    restaurantSlug: string | null;
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

function ratingTone(rating: number): { color: string } {
  if (rating >= 4) return { color: '#16A34A' };
  if (rating <= 2) return { color: '#DC2626' };
  return { color: '#A3A3A3' };
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} g`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ay`;
  return `${Math.floor(mo / 12)} yıl`;
}

// §38.237 — Yorum satırlarında mutlak saat. `formatDate` (tarih-only)
// "ilk görülme" gibi gün-granülerlikli istatistiklerde kalır.
// §46 — saat işletmenin yerel saatinde (cihaz TZ'si değil).
function formatDateTimeStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = resolveDisplayTimeZone();
  return `${new Intl.DateTimeFormat('tr-TR', {
    timeZone: tz,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)} ${formatClock(d, 'tr', tz)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminCustomerDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailKey = searchParams.get('detail');

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const open = Boolean(detailKey);

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('detail');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Fetch from admin endpoint (cross-restaurant scope).
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
    fetch(`/api/admin/customers/by-key/${encodeURIComponent(detailKey)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Yüklenemedi');
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
  }, [detailKey]);

  // ESC + body scroll lock + focus management + Tab focus trap (CLAUDE.md §11.1)
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const FOCUSABLE_SELECTOR = [
      'a[href]',
      'button:not([disabled])',
      "input:not([disabled]):not([type='hidden'])",
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDrawer();
        return;
      }
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
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const initial = (data?.customer.name || data?.customer.email || '?')
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-label="Kapat"
        onClick={closeDrawer}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm bz-fade-in cursor-default"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-customer-drawer-heading"
        className="fixed bottom-0 right-0 top-0 z-[51] flex w-full flex-col overflow-hidden bg-white bz-elev-3 sm:bottom-2 sm:right-2 sm:top-2 sm:w-[420px] sm:rounded-[32px] md:w-[480px]"
        style={{ animation: 'cust-drawer-in 180ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-pn-line p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bz-avatar flex h-11 w-11 shrink-0 items-center justify-center text-[14px]">
              {initial}
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-[#737373]">CRM · ADMIN</span>
              <h2
                id="admin-customer-drawer-heading"
                className="bz-h-tight mt-0.5 text-[18px] truncate text-pn-ink"
              >
                {data?.customer.name || 'İsimsiz'}
              </h2>
              {data?.customer.restaurantName && (
                <p className="mt-0.5 text-[12px] text-[#525252] truncate">
                  {data.customer.restaurantName}
                </p>
              )}
              {data?.stats.segment && data?.stats.sentiment && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SegmentChip segment={data.stats.segment} locale="tr" />
                  <SentimentBadge sentiment={data.stats.sentiment} locale="tr" variant="badge" />
                </div>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Kapat"
            className="bz-btn-icon-lg shrink-0"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#737373]">
              <Loader2 size={16} className="animate-spin" />
              Yükleniyor…
            </div>
          )}

          {error && !loading && (
            <AlertBanner
              kind="danger"
              icon={<AlertTriangle size={14} strokeWidth={2} className="shrink-0 mt-0.5" />}
            >
              <div>
                <div className="font-medium">Müşteri detayı getirilemedi</div>
                <p className="mt-1 opacity-80">{error}</p>
              </div>
            </AlertBanner>
          )}

          {data && !loading && (
            <>
              {/* Admin-only: cross-link to restaurant detail + owner detail */}
              <div className="rounded-[20px] border border-pn-line bg-pn-canvas p-3 space-y-2">
                <span className="text-[13px] font-medium text-[#737373]">YÖNETİM BAĞLANTILARI</span>
                <div className="flex flex-col gap-1.5">
                  <Link
                    href={`/admin/restaurants/${data.customer.restaurantId}`}
                    className="inline-flex items-center justify-between gap-2 text-[13px] text-pn-ink hover:underline"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Store size={12} strokeWidth={2} />
                      İşletme detayı
                    </span>
                    <ArrowRight size={12} strokeWidth={2} />
                  </Link>
                  {data.customer.restaurantOwnerUserId && (
                    <Link
                      href={`/admin/members/${data.customer.restaurantOwnerUserId}`}
                      className="inline-flex items-center justify-between gap-2 text-[13px] text-pn-ink hover:underline"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Shield size={12} strokeWidth={2} />
                        İşletme sahibi
                      </span>
                      <ArrowRight size={12} strokeWidth={2} />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {data.customer.email && (
                  <a
                    href={`mailto:${data.customer.email}`}
                    className="inline-flex items-center gap-2.5 rounded-full border border-pn-line bg-pn-canvas px-3 py-2.5 text-[13px] text-pn-ink hover:border-pn-ink transition-colors"
                  >
                    <Mail size={14} strokeWidth={2} className="text-[#525252] shrink-0" />
                    <span className="truncate flex-1">{data.customer.email}</span>
                    <span className="text-[13px] font-medium text-[#737373]">E-POSTA</span>
                  </a>
                )}
                {data.customer.phone && (
                  <a
                    href={`tel:${data.customer.phone}`}
                    className="inline-flex items-center gap-2.5 rounded-full border border-pn-line bg-pn-canvas px-3 py-2.5 text-[13px] text-pn-ink hover:border-pn-ink transition-colors"
                  >
                    <Phone size={14} strokeWidth={2} className="text-[#525252] shrink-0" />
                    <span className="truncate flex-1">{data.customer.phone}</span>
                    <span className="text-[13px] font-medium text-[#737373]">TELEFON</span>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bz-card-soft p-3">
                  <span className="text-[13px] font-medium text-[#737373]">YORUM</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[20px] tabular-nums text-pn-ink">
                      {data.stats.totalReviews}
                    </span>
                    <MessageSquareText size={11} className="text-[#A3A3A3]" />
                  </div>
                </div>
                <div className="bz-card-soft p-3">
                  <span className="text-[13px] font-medium text-[#737373]">ORT.</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[20px] tabular-nums text-pn-ink">
                      {data.stats.avgRating != null ? data.stats.avgRating.toFixed(1) : '—'}
                    </span>
                    <Star size={11} className="text-pn-accent" fill="#78FC90" />
                  </div>
                </div>
                                <div className="bz-card-soft p-3">
                  <span className="text-[13px] font-medium text-[#737373]">SON</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="bz-h-tight text-[14px] text-pn-ink">
                      {data.stats.lastSeenAt ? formatRelative(data.stats.lastSeenAt) : '—'}
                    </span>
                    <Calendar size={11} className="text-[#A3A3A3]" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="text-[13px] font-medium text-[#737373]">SON KONU</span>
                <span className="text-[#262626] font-medium">
                  {computeLastTopic(
                    {
                      rating: data.stats.lastRating ?? null,
                      foodRating: data.stats.lastFoodRating ?? null,
                      serviceRating: data.stats.lastServiceRating ?? null,
                      atmosphereRating: data.stats.lastAtmosphereRating ?? null,
                    },
                    'tr',
                  )}
                </span>
                <span className="text-[#A3A3A3]">·</span>
                <span className="text-[13px] font-medium text-[#737373]">KANAL</span>
                <span className="tabular-nums inline-flex items-center rounded-full bg-pn-canvas px-2 py-0.5 text-[#525252]">
                  {computeLastChannel(data.stats.lastPlatform ?? null, 'tr')}
                </span>
              </div>

              <div className="flex items-center justify-between text-[12px] text-[#737373]">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp size={11} strokeWidth={2} />
                  Üye:{' '}
                  <strong className="text-pn-ink">
                    {data.stats.firstSeenAt ? formatDate(data.stats.firstSeenAt) : '—'}
                  </strong>
                </span>
                {data.stats.truncated && (
                  <span className="text-[#92400E]">İlk 50 yorum gösteriliyor</span>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#737373]">YORUM GEÇMİŞİ</span>
                </div>
                <ol className="space-y-3">
                  {data.feedbacks.map((fb) => {
                    const tone = ratingTone(fb.rating);
                    const platformLabel = computeLastChannel(fb.platform, 'tr');
                    return (
                      <li
                        key={fb.id}
                        className="rounded-[20px] border border-pn-line bg-white p-3.5"
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
                                  className={s <= fb.rating ? 'text-pn-accent' : 'text-pn-line'}
                                  fill={s <= fb.rating ? '#78FC90' : '#EBEBEB'}
                                />
                              ))}
                            </span>
                            <span className="tabular-nums text-[12px] tabular-nums text-[#737373]">
                              {fb.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="tabular-nums text-[12px] tabular-nums text-[#A3A3A3]">
                            {formatDateTimeStamp(fb.createdAt)}
                          </span>
                        </div>
                        {fb.comment ? (
                          <p className="mt-2 text-[13px] leading-[1.55] text-[#262626] whitespace-pre-wrap">
                            {fb.comment}
                          </p>
                        ) : (
                          <p className="mt-2 text-[12px] italic text-[#A3A3A3]">
                            Yorum metni yok.
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-[#737373]">
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

        {data && data.feedbacks.length > 0 && (
          <div className="border-t border-pn-line bg-pn-canvas p-4 flex gap-2">
            {data.customer.email && (
              <a
                href={`mailto:${data.customer.email}`}
                className="bz-btn-primary inline-flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12px]"
              >
                <Mail size={13} strokeWidth={2} />
                E-posta gönder
              </a>
            )}
            {data.customer.phone && (
              <a
                href={`tel:${data.customer.phone}`}
                className="bz-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 rounded-full text-[12px]"
              >
                <Phone size={13} strokeWidth={2} />
                Ara
              </a>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminCustomerDrawer;
