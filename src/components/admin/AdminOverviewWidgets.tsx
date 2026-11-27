'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { Avatar, Badge, type BadgeKind, Skeleton } from '@/components/ui';

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
        const res = await fetch('/api/admin/members?perPage=100');
        if (!res.ok || !alive) return;
        const data = await res.json();
        // `{ data, meta }` envelope — a bare-array parse left the widget blank
        // whenever the parent did not pass server data.
        const list: MemberApiRow[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? (data.data as MemberApiRow[])
            : [];

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

  const attentionTone: Record<AttentionRow['kind'], { circle: string; pill: string }> = {
    danger: { circle: 'bg-[#FDECEC] text-[#D92D20]', pill: 'pn-change--down' },
    warn: { circle: 'bg-[#FFF4D6] text-[#8A5A00]', pill: 'bg-[#FFF4D6] text-[#8A5A00]' },
    info: { circle: 'bg-pn-accent-soft text-pn-accent', pill: 'pn-change--flat' },
  };
  const rowSkeleton = (key: number) => (
    <div key={key} className="flex min-h-[60px] items-center gap-3 rounded-[16px] bg-pn-canvas px-3 py-2.5">
      <Skeleton width={40} height={40} rounded={999} />
      <div className="min-w-0 flex-1">
        <Skeleton height={14} width="48%" />
        <Skeleton height={12} width="64%" className="mt-1.5" />
      </div>
      <Skeleton width={56} height={24} rounded={999} />
    </div>
  );

  // Fintora list cards (docs/design/DASHBOARD_DESIGN.md §5.4): title over a
  // grey line, ↗ to the full list, grey 16px rows with a 40px circle.
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      {/* Recently joined */}
      <section className="bz-card p-5 sm:p-6" aria-label={isTr ? 'Son katılan işletmeler' : 'Recently joined'}>
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="pn-card-title text-pn-ink">{isTr ? 'Son katılan işletmeler' : 'Recently joined'}</h2>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">{isTr ? 'En yeni kayıtlar' : 'Latest sign-ups'}</p>
          </div>
          <Link
            href="/admin/members"
            className="pn-arrow-btn"
            aria-label={isTr ? 'Tüm işletme sahipleri' : 'All owners'}
            title={isTr ? 'Tümü' : 'All'}
          >
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </header>
        {loading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => rowSkeleton(i))}</div>
        ) : !members || members.length === 0 ? (
          <p className="rounded-[16px] bg-pn-canvas px-4 py-6 text-center text-[14px] text-[#737373]">
            {isTr ? 'Henüz kayıt yok.' : 'No registrations yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li key={m.id} className="pn-row min-h-[60px] py-2.5">
                <Avatar name={m.name} size={40} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-pn-ink">{m.name}</div>
                  <div className="truncate text-[13px] text-[#9A9A9A]">{m.subline}</div>
                </div>
                <Badge kind={planBadgeKind(m.plan)}>{planLabel(m.plan, isTr)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Needs attention */}
      <section className="bz-card p-5 sm:p-6" aria-label={isTr ? 'Dikkat gerektiren' : 'Needs attention'}>
        <header className="mb-4">
          <h2 className="pn-card-title text-pn-ink">{isTr ? 'Dikkat gerektiren' : 'Needs attention'}</h2>
          <p className="mt-1 text-[13px] text-[#9A9A9A]">{isTr ? 'Operatör görevleri' : 'Operator tasks'}</p>
        </header>
        {loading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => rowSkeleton(i))}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((row, i) => {
              const tone = attentionTone[row.kind];
              const inner = (
                <>
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.circle}`}>
                    <AlertCircle size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-pn-ink">{row.k}</span>
                  <span className={`pn-change shrink-0 px-2.5 ${row.n > 0 ? tone.pill : 'pn-change--flat'}`}>{row.n}</span>
                </>
              );
              return (
                <li key={i}>
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="pn-row min-h-[60px] py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
                      aria-label={`${row.k} (${row.n})`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="pn-row min-h-[60px] py-2.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
