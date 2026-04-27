'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Avatar, Badge, Eyebrow, Skeleton } from '@/components/ui';

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { restaurants: number };
}

interface AttentionRow {
  k: string;
  n: number;
  kind: 'danger' | 'warn' | 'info';
}

function planBadgeKind(plan: string): 'lime' | 'info' | 'ok' | 'ghost' {
  if (plan === 'trial') return 'lime';
  if (plan === 'monthly') return 'info';
  if (plan === 'yearly') return 'ok';
  return 'ghost';
}

function planLabel(plan: string, isTr: boolean): string {
  if (plan === 'trial') return isTr ? 'Deneme' : 'Trial';
  if (plan === 'monthly') return isTr ? 'Aylık' : 'Monthly';
  if (plan === 'yearly') return isTr ? 'Yıllık' : 'Yearly';
  if (plan === 'free') return isTr ? 'Ücretsiz' : 'Free';
  return plan;
}

export default function AdminOverviewWidgets({ locale = 'tr' }: { locale?: 'tr' | 'en' }) {
  const isTr = locale === 'tr';
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [attention, setAttention] = useState<AttentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const fetchAll = async () => {
      try {
        const res = await fetch('/api/admin/members');
        if (res.ok && alive) {
          const data = await res.json();
          const list: MemberRow[] = Array.isArray(data) ? data : [];
          setMembers(list.slice(0, 4));

          // Compute attention buckets locally — no extra API needed.
          const now = Date.now();
          const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
          const trialExpiringSoon = list.filter((u) => {
            if (u.plan !== 'trial' || !u.trialEndsAt) return false;
            const end = new Date(u.trialEndsAt).getTime();
            return end > now && end - now < 3 * 24 * 60 * 60 * 1000;
          }).length;
          const trialExpired = list.filter((u) => {
            if (u.plan !== 'trial' || !u.trialEndsAt) return false;
            return new Date(u.trialEndsAt).getTime() <= now;
          }).length;
          const inactiveAccounts = list.filter((u) => !u.isActive).length;
          const noBusiness = list.filter((u) => u._count.restaurants === 0 && u.isActive).length;
          // updatedAt yok → newer-than-14d sinyali için createdAt fallback
          // (yeni katılım = çok yakında, eski kayıt = potansiyel bakım)
          const staleOwners = list.filter((u) => new Date(u.createdAt).getTime() < fourteenDaysAgo && u._count.restaurants === 0).length;

          if (alive) {
            setAttention([
              {
                k: isTr ? 'Trial süresi yakında bitiyor' : 'Trial expiring soon',
                n: trialExpiringSoon,
                kind: 'warn',
              },
              {
                k: isTr ? 'Trial süresi bitti' : 'Trial expired',
                n: trialExpired,
                kind: 'danger',
              },
              {
                k: isTr ? 'Hesabı pasif' : 'Inactive accounts',
                n: inactiveAccounts,
                kind: 'danger',
              },
              {
                k: isTr ? 'İşletmesi olmayan sahipler' : 'Owners without business',
                n: noBusiness,
                kind: 'warn',
              },
              {
                k: isTr ? 'Eski + işletmesiz hesap' : 'Stale empty accounts',
                n: staleOwners,
                kind: 'info',
              },
            ]);
          }
        }
      } catch {
        // Silently fail — widget is best-effort, dashboard's main stats
        // already reflect health independently.
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      alive = false;
    };
  }, [isTr]);

  return (
    <div className="grid gap-3.5 lg:grid-cols-2">
      {/* Recently joined */}
      <div className="bz-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #EDEDED' }}
        >
          <Eyebrow>{isTr ? 'SON KATILAN İŞLETMELER' : 'RECENTLY JOINED'}</Eyebrow>
          <Link
            href="/admin/members"
            className="inline-flex items-center gap-1 text-[12px] font-medium hover:opacity-70"
            style={{ color: '#0A0A0A' }}
          >
            {isTr ? 'Tümü' : 'All'}
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width={32} height={32} rounded={8} />
                <div className="flex-1">
                  <Skeleton height={12} width="40%" />
                  <Skeleton height={10} width="60%" className="mt-1" />
                </div>
                <Skeleton width={50} height={20} rounded={6} />
              </div>
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="p-8 text-center" style={{ fontSize: 13, color: '#737373' }}>
            {isTr ? 'Henüz kayıt yok.' : 'No registrations yet.'}
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-5 py-3"
              style={{ borderBottom: '1px solid #F5F5F5' }}
            >
              <Avatar name={m.name || m.email} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span style={{ fontSize: 13, fontWeight: 600 }} className="truncate">
                    {m.name || m.email.split('@')[0]}
                  </span>
                </div>
                <div className="truncate" style={{ fontSize: 11, color: '#737373' }}>
                  {m.email} ·{' '}
                  {new Date(m.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              </div>
              <Badge kind={planBadgeKind(m.plan)}>{planLabel(m.plan, isTr)}</Badge>
            </div>
          ))
        )}
      </div>

      {/* Needs attention */}
      <div className="bz-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #EDEDED' }}
        >
          <Eyebrow color="#DC2626">{isTr ? 'DİKKAT GEREKTİREN' : 'NEEDS ATTENTION'}</Eyebrow>
          <span style={{ fontSize: 11, color: '#737373' }}>
            <AlertCircle size={11} className="inline-block -mt-0.5" strokeWidth={2} />{' '}
            {isTr ? 'Operatör görevleri' : 'Operator tasks'}
          </span>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton height={13} width="60%" />
                <Skeleton width={32} height={20} rounded={6} />
              </div>
            ))}
          </div>
        ) : (
          attention.map((row, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-5 py-3.5"
              style={{ borderBottom: '1px solid #F5F5F5' }}
            >
              <span style={{ fontSize: 13, color: '#1A1A1A' }}>{row.k}</span>
              <Badge kind={row.kind === 'danger' ? 'danger' : row.kind === 'warn' ? 'warn' : 'info'}>
                {row.n}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
