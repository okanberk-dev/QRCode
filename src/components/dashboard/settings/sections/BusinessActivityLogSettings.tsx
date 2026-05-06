'use client';

import { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { AlertBanner, EmptyState } from '@/components/ui';
import { actionLabel } from '@/lib/audit-log';
import type { Locale } from '@/lib/translations';

// Stage A3 §38.95 — owner KVKK transparency surface.
// /dashboard/account?section=activity altında render edilir. Owner kendi
// audit log'unu (max 100 kayıt, last 2 years) görür: kendi yaptığı
// aksiyonlar + admin tarafından kendisine yapılan aksiyonlar.

interface AuditEntry {
  id: string;
  action: string;
  actorSource: 'admin' | 'user';
  actorLabel: string;
  payload: unknown;
  createdAt: string;
}

interface Props {
  locale: Locale;
}

function relativeTime(iso: string, isTr: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return isTr ? 'şimdi' : 'just now';
  if (min < 60) return `${min} ${isTr ? 'dk önce' : 'min ago'}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${isTr ? 'sa önce' : 'h ago'}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ${isTr ? 'gün önce' : 'd ago'}`;
  return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function BusinessActivityLogSettings({ locale }: Props) {
  const isTr = locale === 'tr';
  const [data, setData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account/audit-log')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(isTr ? 'Geçmiş yüklenemedi' : 'Failed to load history');
        }
        return res.json();
      })
      .then((j: { data: AuditEntry[] }) => {
        if (!cancelled) setData(j.data || []);
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
  }, [isTr]);

  return (
    <div className="space-y-4">
      <AlertBanner kind="info">
        <div className="flex items-start gap-2">
          <ShieldCheck size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
          <div>
            <strong>{isTr ? 'KVKK şeffaflık trail\'i' : 'KVKK transparency trail'}:</strong>{' '}
            {isTr
              ? 'Hesabınla ilgili tüm aksiyonlar — sen yaptığın veya admin tarafından yapılan — son 2 yıl boyunca burada görünür. E-posta ve telefon alanları otomatik mask edilir.'
              : 'All actions on your account — yours or admin-initiated — are listed here for the last 2 years. Email and phone fields are automatically masked.'}
          </div>
        </div>
      </AlertBanner>

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
          {isTr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} strokeWidth={2} />}
          title={isTr ? 'Henüz hesap aktivitesi yok' : 'No account activity yet'}
          body={
            isTr
              ? 'Hesabını oluşturduğundan bu yana audit log boş. Şifre değişimi, profil güncelleme ve admin aksiyonları burada listelenir.'
              : 'No audit entries since account creation. Password changes, profile updates and admin actions appear here.'
          }
        />
      ) : (
        <ol className="space-y-2">
          {data.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const hasPayload = entry.payload != null;
            return (
              <li
                key={entry.id}
                className="rounded-xl border border-[#EDEDED] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#0A0A0A]">
                        {actionLabel(entry.action, isTr ? 'tr' : 'en')}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-2 py-0.5 text-[10px] font-mono text-[#737373]">
                        {entry.action}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#737373]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} strokeWidth={2} />
                        {relativeTime(entry.createdAt, isTr)}
                      </span>
                      <span className="mx-1.5 text-[#A3A3A3]">·</span>
                      {entry.actorLabel}
                    </p>
                  </div>
                  {hasPayload && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="text-[11px] text-[#737373] hover:text-[#0A0A0A] flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <ChevronDown size={12} strokeWidth={2} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                      )}
                      {isTr ? (isExpanded ? 'Gizle' : 'Detay') : isExpanded ? 'Hide' : 'Detail'}
                    </button>
                  )}
                </div>
                {isExpanded && hasPayload && (
                  <pre
                    className="mt-3 overflow-x-auto rounded-lg bg-[#FAFAFA] p-2.5 text-[11px] text-[#525252] border border-[#EDEDED]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
