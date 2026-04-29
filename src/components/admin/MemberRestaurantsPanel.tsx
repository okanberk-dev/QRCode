'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, MessageSquare, Store, UtensilsCrossed } from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';

interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  isActive: boolean;
  menuEnabled: boolean;
  menuPublished: boolean;
  primaryColor: string;
  createdAt: string;
  feedbackCount: number;
}

interface Props {
  userId: string;
}

export default function MemberRestaurantsPanel({ userId }: Props) {
  const [data, setData] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/restaurants`)
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
        Yükleniyor…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Store size={20} strokeWidth={2} />}
        title="Bu sahibe bağlı işletme yok"
        body="İşletme sahibi panelinden 'Yeni İşletme' eklediğinde burada listelenir."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-[#EDEDED] divide-y divide-[#EDEDED] overflow-hidden bg-white">
      {data.map((r) => (
        <div key={r.id} className="p-4 sm:p-5 flex items-center gap-3 flex-wrap">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[14px] font-semibold text-white"
            style={{ background: r.primaryColor || '#0A0A0A' }}
          >
            {r.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/admin/restaurants/${r.id}`}
                className="text-[14px] font-semibold text-[#0A0A0A] hover:underline"
              >
                {r.name}
              </Link>
              <Badge kind={r.isActive ? 'ok' : 'danger'}>{r.isActive ? 'Aktif' : 'Pasif'}</Badge>
              {r.menuEnabled && (
                <Badge kind={r.menuPublished ? 'lime' : 'ghost'}>
                  <UtensilsCrossed size={10} strokeWidth={2} />
                  {r.menuPublished ? 'Menü yayında' : 'Menü taslak'}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-[#737373] truncate">
              {r.category}
              {r.city ? ` · ${r.city}` : ''} · /{r.slug}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[#525252]">
            <div className="flex items-center gap-1">
              <MessageSquare size={12} strokeWidth={2} />
              {r.feedbackCount}
            </div>
            <Link
              href={`/admin/restaurants/${r.id}`}
              className="bz-btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Detay
              <ExternalLink size={12} strokeWidth={2} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
