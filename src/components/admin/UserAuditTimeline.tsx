'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

// CLAUDE.md §38.93 (Stage A1) — actor-side timeline. Mirrors MemberAuditTimeline
// (target-side) but `actorId` filtreli: AdminUser detail page'inde "bu yönetici
// hangi aksiyonları yaptı" listesini gösterir. Backend endpoint hedef nesneyi
// (User/Restaurant/AdminUser) resolve edip clickable link sağlar.

interface AuditEntry {
  id: string;
  action: string;
  targetId: string | null;
  target: { id: string; label: string; href: string | null } | null;
  payload: unknown;
  createdAt: string;
}

interface Props {
  userId: string;
  /** Limit timeline length (e.g., overview tab shows last 5). */
  max?: number;
}

const ACTION_LABELS: Record<string, string> = {
  'admin.members.create': 'Yeni hesap oluşturuldu + davet maili gönderildi',
  'admin.members.deactivate': 'Hesap pasifleştirildi',
  'admin.members.reactivate': 'Hesap yeniden aktive edildi',
  'admin.members.send_password_reset': 'Şifre sıfırlama maili gönderildi',
  'admin.billing.update': 'Faturalandırma güncellendi',
  'admin.invoice.create': 'Yeni fatura eklendi',
  'admin.invoice.update': 'Fatura düzenlendi',
  'admin.invoice.delete': 'Fatura silindi',
  'admin.users.update': 'Yönetici hesabı güncellendi',
  'admin.users.delete': 'Yönetici hesabı silindi',
  'admin.restaurants.create': 'Yeni restoran oluşturuldu',
  'admin.restaurants.update': 'Restoran güncellendi',
  'admin.restaurants.delete': 'Restoran silindi',
  'admin.restaurants.feature_access': 'Paket özellik erişimi güncellendi',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
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

export default function UserAuditTimeline({ userId, max }: Props) {
  const [data, setData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${userId}/audit`)
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
        icon={<Clock size={20} strokeWidth={2} />}
        title="Bu yönetici henüz panel aksiyonu yapmadı"
        body="Şifre sıfırlama, plan güncelleme veya restoran düzenleme gibi işlemler yaptığında geçmişi burada görünür."
      />
    );
  }

  const visible = max ? data.slice(0, max) : data;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ol className="space-y-3 relative">
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-pn-line -z-0"
      />
      {visible.map((e) => {
        const isOpen = expanded.has(e.id);
        return (
          <li key={e.id} className="relative pl-10">
            <span
              aria-hidden
              className="absolute left-[10px] top-2 flex h-3 w-3 items-center justify-center rounded-full bg-white border-2 border-pn-ink z-10"
            />
            <div className="rounded-[20px] border border-pn-line bg-white p-3.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-pn-ink">{actionLabel(e.action)}</p>
                  <p className="mt-0.5 text-[12px] text-[#737373]">
                    <span className="font-mono">{e.action}</span>
                    <span className="mx-1.5 text-[#A3A3A3]">·</span>
                    {timeAgo(e.createdAt)}
                  </p>
                  {e.target && (
                    <p className="mt-1.5 text-[12px]">
                      <span className="text-[#737373]">Hedef:</span>{' '}
                      {e.target.href ? (
                        <Link
                          href={e.target.href}
                          className="inline-flex items-center gap-1 text-pn-ink hover:underline font-medium"
                        >
                          {e.target.label}
                          <ArrowRight size={10} strokeWidth={2} />
                        </Link>
                      ) : (
                        <span className="text-pn-ink font-medium">{e.target.label}</span>
                      )}
                    </p>
                  )}
                </div>
                {e.payload != null && (
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="text-[12px] text-[#737373] hover:text-pn-ink flex items-center gap-1"
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isOpen ? 'Gizle' : 'Detay'}
                  </button>
                )}
              </div>
              {isOpen && e.payload != null && (
                <pre
                  className="mt-2 overflow-x-auto rounded-[14px] bg-pn-canvas p-2.5 text-[12px] text-[#525252] border border-pn-line"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
