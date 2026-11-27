'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  Loader2,
  Store,
} from 'lucide-react';
import { Badge, EmptyState, ProgressBar } from '@/components/ui';

// CLAUDE.md §38.93 (Stage A1) — admin tier per-restaurant activation snapshot
// for an owner. Reuses computeActivation helper (CLAUDE.md §19.5) so admin
// and owner panel render identical step semantics.
//
// Owner panel mounts ActivationChecklistCard per-restaurant; admin shows the
// aggregate roll-up here (per-restaurant card with % bar + 5-step icons +
// drill-down to /admin/restaurants/[id]).

interface ActivationItem {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  isActive: boolean;
  steps: Array<{ step: string; done: boolean }>;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
  dismissedAt: string | null;
}

interface Props {
  userId: string;
}

const STEP_LABELS: Record<string, string> = {
  profile: 'Profil',
  google_link: 'Google linki',
  qr_downloaded: 'QR indirildi',
  qr_printed_shared: 'QR paylaşıldı',
  first_feedback: 'İlk yorum',
};

function progressColor(pct: number): string {
  if (pct >= 80) return '#23863A'; // positive
  if (pct >= 40) return '#D97706'; // warn (Pulse warn token)
  return '#111110'; // black (default progress fill)
}

export default function MemberActivationPanel({ userId }: Props) {
  const [data, setData] = useState<ActivationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/members/${userId}/activation`)
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
        Aktivasyon yükleniyor…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Activity size={20} strokeWidth={2} />}
        title="Aktivasyon snapshot'u yok"
        body="İşletme sahibinin restoran kaydı yoksa kurulum kontrol listesi de görünmez."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((r) => {
        const barColor = progressColor(r.percentage);
        return (
          <article
            key={r.restaurantId}
            className="rounded-[20px] border border-pn-line bg-white p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/restaurants/${r.restaurantId}`}
                    className="text-[14px] font-medium text-pn-ink hover:underline inline-flex items-center gap-1.5"
                  >
                    <Store size={12} strokeWidth={2} />
                    {r.restaurantName}
                  </Link>
                  <Badge kind={r.isActive ? 'ok' : 'danger'}>
                    {r.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                  {r.isComplete && <Badge kind="lime">Tamamlandı</Badge>}
                  {r.dismissedAt && !r.isComplete && (
                    <Badge kind="ghost">Owner kapattı</Badge>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-[#737373]">
                  /{r.slug} · {r.completedCount}/{r.totalCount} adım tamamlandı
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums tabular-nums text-[13px] font-medium text-pn-ink">
                  %{r.percentage}
                </span>
                <Link
                  href={`/admin/restaurants/${r.restaurantId}`}
                  className="bz-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Detay
                  <ArrowRight size={12} strokeWidth={2} />
                </Link>
              </div>
            </div>

            <div className="mt-3">
              <ProgressBar
                value={r.percentage}
                max={100}
                color={barColor}
                ariaLabel={`${r.restaurantName} aktivasyon ilerlemesi: %${r.percentage}`}
              />
            </div>

            <ol className="mt-3 flex flex-wrap gap-2 text-[12px]">
              {r.steps.map((s) => (
                <li
                  key={s.step}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                    s.done
                      ? 'border-pn-accent-hover bg-pn-accent-soft text-pn-ink'
                      : 'border-pn-line bg-pn-canvas text-[#737373]'
                  }`}
                >
                  {s.done && <Check size={10} strokeWidth={2.5} />}
                  {STEP_LABELS[s.step] || s.step}
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
