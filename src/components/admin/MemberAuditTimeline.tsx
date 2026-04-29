'use client';

import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';

interface AuditEntry {
  id: string;
  action: string;
  actorSource: 'admin' | 'user';
  actor: { id: string; email: string; name: string | null; role: string | null } | null;
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
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MemberAuditTimeline({ userId, max }: Props) {
  const [data, setData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/audit`)
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
        title="Henüz admin aksiyonu yok"
        body="Bu hesap üzerinde bir admin işlem yaptığında zaman çizelgesinde görünür."
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
      {/* Vertical guide line */}
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-[#EDEDED] -z-0"
      />
      {visible.map((e) => {
        const isOpen = expanded.has(e.id);
        const actorName =
          e.actor?.name || e.actor?.email || (e.actorSource === 'admin' ? 'Bilinmeyen admin' : 'Sistem');
        return (
          <li key={e.id} className="relative pl-10">
            <span
              aria-hidden
              className="absolute left-[10px] top-2 flex h-3 w-3 items-center justify-center rounded-full bg-white border-2 border-[#0A0A0A] z-10"
            />
            <div className="rounded-xl border border-[#EDEDED] bg-white p-3.5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#0A0A0A]">{actionLabel(e.action)}</p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    <span className="font-mono">{e.action}</span>
                    <span className="mx-1.5 text-[#A3A3A3]">·</span>
                    {actorName}
                    <span className="mx-1.5 text-[#A3A3A3]">·</span>
                    {timeAgo(e.createdAt)}
                  </p>
                </div>
                {e.payload != null && (
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="text-[11px] text-[#737373] hover:text-[#0A0A0A] flex items-center gap-1"
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isOpen ? 'Gizle' : 'Detay'}
                  </button>
                )}
              </div>
              {isOpen && e.payload != null && (
                <pre
                  className="mt-2 overflow-x-auto rounded-lg bg-[#FAFAFA] p-2.5 text-[11px] text-[#525252] border border-[#EDEDED]"
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
