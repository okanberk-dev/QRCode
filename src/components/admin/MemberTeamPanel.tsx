'use client';

import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { Badge, type BadgeKind, EmptyState } from '@/components/ui';

interface TeamRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  locations: unknown;
  lastSeenAt: string | null;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Sahip',
  manager: 'Yönetici',
  staff: 'Personel',
  viewer: 'İzleyici',
};
const STATUS_KIND: Record<string, BadgeKind> = {
  invited: 'ghost',
  active: 'ok',
  revoked: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  invited: 'DAVETLİ',
  active: 'AKTİF',
  revoked: 'İPTAL',
};

interface Props {
  userId: string;
}

function dateLabel(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function MemberTeamPanel({ userId }: Props) {
  const [data, setData] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/team`)
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
        icon={<Users size={20} strokeWidth={2} />}
        title="Henüz ekip üyesi yok"
        body="İşletme sahibi kendi panelinden ekip üyelerini davet ettiğinde burada görünür."
      />
    );
  }

  return (
    <div className="rounded-[24px] border border-pn-line divide-y divide-pn-line overflow-hidden bg-white">
      {data.map((m) => {
        const locCount = Array.isArray(m.locations) ? m.locations.length : 0;
        return (
          <div key={m.id} className="p-4 sm:p-5 flex items-center gap-3 flex-wrap">
            <div className="bz-avatar shrink-0" style={{ width: 36, height: 36 }}>
              {(m.name || m.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-pn-ink">
                  {m.name || '—'}
                </span>
                <Badge kind="ghost">{ROLE_LABEL[m.role] || m.role}</Badge>
                <Badge kind={STATUS_KIND[m.status] || 'ghost'}>
                  {STATUS_LABEL[m.status] || m.status.toUpperCase()}
                </Badge>
              </div>
              <p className="mt-0.5 text-[12px] text-[#737373] truncate">{m.email}</p>
            </div>
            <div className="text-[12px] text-[#525252] flex flex-col items-end">
              <span>
                {locCount > 0 ? `${locCount} konum` : 'Tüm konumlar'}
              </span>
              <span className="text-[12px] text-[#A3A3A3]">
                Son giriş: {dateLabel(m.lastSeenAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
