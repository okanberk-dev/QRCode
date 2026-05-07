'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2, MessageSquareWarning, Star } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { Locale } from '@/lib/translations';

export interface PlatformLowFeedbackItem {
  id: string;
  rating: number;
  name: string | null;
  comment: string | null;
  branch: string | null;
  tableNumber: string | null;
  createdAt: string;
  restaurantId: string | null;
  restaurantName: string | null;
}

interface PlatformLowFeedbackPanelProps {
  providerSlug: string;
  platformName: string;
  locale: Locale;
  total: number;
  initialItems: PlatformLowFeedbackItem[];
}

interface LowFeedbackResponse {
  items: PlatformLowFeedbackItem[];
  nextOffset: number;
  hasMore: boolean;
}

const PAGE_SIZE = 5;

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function displayName(item: PlatformLowFeedbackItem, locale: Locale) {
  const name = item.name?.trim();
  if (name) return name;
  return locale === 'tr' ? 'Müşteri' : 'Customer';
}

export function PlatformLowFeedbackPanel({
  providerSlug,
  platformName,
  locale,
  total,
  initialItems,
}: PlatformLowFeedbackPanelProps) {
  const isTr = locale === 'tr';
  const [items, setItems] = useState(initialItems);
  const [nextOffset, setNextOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialItems.length < total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/dashboard/platforms/${providerSlug}/low-feedback?offset=${nextOffset}&limit=${PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as LowFeedbackResponse;
      setItems((current) => [...current, ...data.items]);
      setNextOffset(data.nextOffset);
      setHasMore(data.hasMore && data.nextOffset < total);
    } catch {
      setError(isTr ? 'Yorumlar yüklenemedi.' : 'Could not load reviews.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bz-card p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="pulse-eyebrow text-[10px] text-[#737373]">
            {isTr ? 'DÜŞÜK PUANLI YORUMLAR' : 'LOW-RATING REVIEWS'}
          </div>
          <h2 className="bz-h-tight mt-1 text-[17px]">
            {isTr ? `${platformName} operasyon listesi` : `${platformName} recovery queue`}
          </h2>
          <p className="mt-1 max-w-[680px] text-[12.5px] leading-5 text-[#525252]">
            {isTr
              ? 'Bu platformdan gelen 1-3 yıldızlı yorumları takip et. Liste yoğunlaşırsa kayıtlar 5’erli açılır.'
              : 'Track 1-3 star reviews coming from this platform. Long lists expand in batches of five.'}
          </p>
        </div>
        <Badge kind={total > 0 ? 'warn' : 'ghost'}>
          {total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
          {isTr ? 'düşük puan' : 'low rating'}
        </Badge>
      </header>

      {items.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-4 py-8 text-center">
          <MessageSquareWarning size={18} className="mx-auto text-[#A3A3A3]" />
          <p className="mt-2 text-[13px] text-[#525252]">
            {isTr
              ? 'Bu platform için düşük puanlı yorum yok.'
              : 'No low-rating reviews for this platform.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[#F5F5F5] overflow-hidden rounded-[12px] border border-[#EDEDED]">
          {items.map((item) => (
            <article key={item.id} className="bg-white p-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[13.5px] text-[#0A0A0A]">
                      {displayName(item, locale)}
                    </span>
                    <span className="text-[11.5px] text-[#737373]">
                      {item.restaurantName ?? (isTr ? 'İşletme yok' : 'No business')}
                    </span>
                    {item.branch && (
                      <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10.5px] text-[#737373]">
                        {item.branch}
                      </span>
                    )}
                    {item.tableNumber && (
                      <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10.5px] text-[#737373]">
                        {isTr ? 'Masa' : 'Table'} {item.tableNumber}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-5 text-[#525252]">
                    {item.comment?.trim() ||
                      (isTr ? 'Yorum metni bırakılmamış.' : 'No written comment.')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-2.5 py-1 text-[11.5px] font-semibold text-[#9A3412]">
                    <Star size={12} fill="currentColor" />
                    {item.rating}/5
                  </span>
                  <span className="bz-mono text-[11px] text-[#737373]">
                    {formatDate(item.createdAt, locale)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Link
                  href={`/${locale}/dashboard/feedbacks?id=${item.id}`}
                  className="bz-btn-ghost text-[11.5px]"
                >
                  {isTr ? 'Yorumu aç' : 'Open review'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
          {error}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="bz-btn inline-flex items-center gap-1.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
            {isTr ? 'Daha fazla göster' : 'Show more'}
          </button>
        </div>
      )}
    </section>
  );
}
