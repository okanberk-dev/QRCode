'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Avatar, Badge, type BadgeKind, Eyebrow, Skeleton } from '@/components/ui';

export interface RecentMember {
  id: string;
  /** Display name — Restaurant.name when computed server-side, falls back to user.name/email */
  name: string;
  /** Sub-line: "{city} · {date}" */
  subline: string;
  plan: string;
}

export interface AttentionRow {
  k: string;
  n: number;
  kind: 'danger' | 'warn' | 'info';
  /**
   * Optional deeplink target. When set the row renders as a `<Link>` and
   * navigates to the corresponding admin list with the attention filter
   * preset (CLAUDE.md §11.36). Omit for purely informational rows.
   */
  href?: string;
}

interface Props {
  locale?: 'tr' | 'en';
  /** When passed, the component skips its internal fetch and renders the props directly. */
  members?: RecentMember[];
  attention?: AttentionRow[];
}

interface MemberApiRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { restaurants: number };
}

function planBadgeKind(plan: string): BadgeKind {
  const p = plan.toLowerCase();
  if (p === 'trial') return 'warn';
  if (p === 'pro') return 'info';
  if (p === 'growth') return 'lime';
  if (p === 'starter' || p === 'monthly') return 'ok';
  if (p === 'yearly') return 'ok';
  return 'ghost';
}

function planLabel(plan: string, isTr: boolean): string {
  const p = plan.toLowerCase();
  if (p === 'trial') return isTr ? 'trial' : 'trial';
  if (p === 'pro') return 'pro';
  if (p === 'growth') return 'growth';
  if (p === 'starter') return 'starter';
  if (p === 'monthly') return isTr ? 'aylık' : 'monthly';
  if (p === 'yearly') return isTr ? 'yıllık' : 'yearly';
  if (p === 'free') return isTr ? 'ücretsiz' : 'free';
  return plan;
}

export default function AdminOverviewWidgets({ locale = 'tr', members: membersProp, attention: attentionProp }: Props) {
  const isTr = locale === 'tr';
  const hasServerData = membersProp !== undefined && attentionProp !== undefined;

  const [members, setMembers] = useState<RecentMember[] | null>(membersProp ?? null);
  const [attention, setAttention] = useState<AttentionRow[]>(attentionProp ?? []);
  const [loading, setLoading] = useState(!hasServerData);

  useEffect(() => {
    // When the parent passes pre-computed data we never fetch — server already
    // did the work and the props are authoritative.
    if (hasServerData) return;

    let alive = true;
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/admin/members');
        if (!res.ok || !alive) return;
        const data = await res.json();
        const list: MemberApiRow[] = Array.isArray(data) ? data : [];

        if (alive) {
          setMembers(
            list.slice(0, 4).map((u) => ({
              id: u.id,
              name: u.name || u.email.split('@')[0],
              subline: `${u.email} · ${new Date(u.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                day: '2-digit',
                month: 'short',
              })}`,
              plan: u.plan,
            })),
          );

          // Local fallback attention (used when server prop wasn't provided —
          // e.g. legacy callers).
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
          const staleOwners = list.filter(
            (u) => new Date(u.createdAt).getTime() < fourteenDaysAgo && u._count.restaurants === 0,
          ).length;
          setAttention([
            { k: isTr ? 'Trial süresi yakında bitiyor' : 'Trial expiring soon', n: trialExpiringSoon, kind: 'warn' },
            { k: isTr ? 'Trial süresi bitti' : 'Trial expired', n: trialExpired, kind: 'danger' },
            { k: isTr ? 'Hesabı pasif' : 'Inactive accounts', n: inactiveAccounts, kind: 'danger' },
            { k: isTr ? 'İşletmesi olmayan sahipler' : 'Owners without business', n: noBusiness, kind: 'warn' },
            { k: isTr ? 'Eski + işletmesiz hesap' : 'Stale empty accounts', n: staleOwners, kind: 'info' },
          ]);
        }
      } catch {
        // Silently fail — widget is best-effort.
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      alive = false;
    };
  }, [isTr, hasServerData]);

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
          // Row geometry matches the final loaded list (lines below): px-5 py-3
          // container, 32x32 avatar (rounded={8} = `.bz-avatar` 8px), 13px title
          // + 11px subline, 22px-tall badge (`.bz-badge` height = 22px).
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid #F5F5F5' }}
              >
                <Skeleton width={32} height={32} rounded={8} />
                <div className="flex-1 min-w-0">
                  <Skeleton height={13} width="48%" />
                  <Skeleton height={11} width="64%" className="mt-1" />
                </div>
                <Skeleton width={56} height={22} rounded={6} />
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
              className="flex items-center gap-3 px-5 py-3 last:border-b-0"
              style={{ borderBottom: '1px solid #F5F5F5' }}
            >
              <Avatar name={m.name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span style={{ fontSize: 13, fontWeight: 600 }} className="truncate">
                    {m.name}
                  </span>
                </div>
                <div className="truncate" style={{ fontSize: 11, color: '#737373' }}>
                  {m.subline}
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
          // Row geometry matches the final attention rows (px-5 py-3.5
          // container, 13px label, 22px-tall badge `.bz-badge` height).
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center px-5 py-3.5"
                style={{ borderBottom: '1px solid #F5F5F5' }}
              >
                <Skeleton height={13} width="58%" />
                <Skeleton width={36} height={22} rounded={6} />
              </div>
            ))}
          </div>
        ) : (
          attention.map((row, i) => {
            const badge = (
              <Badge kind={row.kind === 'danger' ? 'danger' : row.kind === 'warn' ? 'warn' : 'info'}>
                {row.n}
              </Badge>
            );
            const label = (
              <span style={{ fontSize: 13, color: '#1A1A1A' }}>{row.k}</span>
            );
            if (row.href) {
              return (
                <Link
                  key={i}
                  href={row.href}
                  className="flex justify-between items-center px-5 py-3.5 last:border-b-0 transition-colors hover:bg-[#FAFAFA] focus-visible:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-inset"
                  style={{ borderBottom: '1px solid #F5F5F5' }}
                  aria-label={`${row.k} (${row.n})`}
                >
                  {label}
                  {badge}
                </Link>
              );
            }
            return (
              <div
                key={i}
                className="flex justify-between items-center px-5 py-3.5 last:border-b-0"
                style={{ borderBottom: '1px solid #F5F5F5' }}
              >
                {label}
                {badge}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
