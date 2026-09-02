'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Loader2,
  MessageSquare,
  Star,
  Store,
} from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';
import { formatFullDateTimeInTimeZone, formatStampInTimeZone } from '@/lib/timezone';

// CLAUDE.md §38.93 (Stage A1) — last 10 feedbacks across all owner restaurants
// for admin oversight. Feeds are aggregated cross-restaurant; per-restaurant
// list lives at /admin/restaurants/[id] (CLAUDE.md §38.76).

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  platform: string | null;
  branch: string | null;
  restaurantId: string;
  restaurantName: string | null;
  customerName: string | null;
  createdAt: string;
}

interface Props {
  userId: string;
}

// §38.237 — Mutlak saat. Göreli süre ("2 sa önce") tek başına
// "yorum tam olarak ne zaman geldi" sorusunu yanıtlamıyordu.
// İşletmenin yerel saatinde damga (CLAUDE.md §46) — süperadmin paneli,
// owner paneli ve uyarı maili aynı saati göstermeli.
function clockStamp(iso: string): string {
  return formatStampInTimeZone(iso, 'tr');
}

function fullStamp(iso: string): string {
  return formatFullDateTimeInTimeZone(iso, 'tr');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ratingBadgeKind(rating: number) {
  if (rating >= 4) return 'ok' as const;
  if (rating <= 2) return 'danger' as const;
  return 'warn' as const;
}

export default function MemberRecentFeedbacksPanel({ userId }: Props) {
  const [data, setData] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/recent-feedbacks`)
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled) setData(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#737373]">
        <Loader2 size={14} className="animate-spin" />
        Yorumlar yükleniyor…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare size={20} strokeWidth={2} />}
        title="Henüz yorum yok"
        body="İşletme sahibinin restoranlarına gelen ilk QR yorumu bu listede görünür."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {data.map((f) => (
        <li
          key={f.id}
          className="rounded-xl border border-[#EDEDED] bg-white p-3.5 sm:p-4"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <Badge kind={ratingBadgeKind(f.rating)}>
                  <Star size={10} strokeWidth={2.5} fill="currentColor" />
                  {f.rating}/5
                </Badge>
                {f.restaurantName && (
                  <Link
                    href={`/admin/restaurants/${f.restaurantId}`}
                    className="inline-flex items-center gap-1 text-[#0A0A0A] hover:underline font-medium"
                  >
                    <Store size={11} strokeWidth={2} />
                    {f.restaurantName}
                    <ArrowRight size={10} strokeWidth={2} />
                  </Link>
                )}
                {f.branch && (
                  <span className="text-[11px] text-[#737373]">· {f.branch}</span>
                )}
                {f.platform && (
                  <Badge kind="ghost">{f.platform}</Badge>
                )}
              </div>
              {f.comment ? (
                <p className="mt-2 text-[12.5px] leading-[1.55] text-[#262626] whitespace-pre-wrap line-clamp-3">
                  {f.comment}
                </p>
              ) : (
                <p className="mt-2 text-[12px] italic text-[#A3A3A3]">
                  (Yorum metni yok)
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-[#737373]">
                {f.customerName || 'Anonim'} ·{' '}
                <span title={fullStamp(f.createdAt)} className="tabular-nums">
                  {timeAgo(f.createdAt)} · {clockStamp(f.createdAt)}
                </span>
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
