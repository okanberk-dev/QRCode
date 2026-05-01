'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Eyebrow, PlatformChip, PLATFORMS, type PlatformId } from '@/components/ui';
import { RotateCcw } from 'lucide-react';

/**
 * URL-synced filter bar for analytics surfaces.
 * State (range/platform/branch) tek-source: URL searchParams. Server component
 * `?range=7d&platform=google&branch=Şube%20A` parse eder, Prisma query'lerine
 * pasla. Bu component sadece chip/select UI ve URL update'i.
 *
 * Pattern: Next.js App Router idiomatic — server fetch + client filter + URL state.
 * Stripe / Linear dashboard'larıyla aynı pattern.
 */

const RANGES: Array<{ id: '7d' | '30d' | '90d'; tr: string; en: string }> = [
  { id: '7d', tr: '7 gün', en: '7d' },
  { id: '30d', tr: '30 gün', en: '30d' },
  { id: '90d', tr: '90 gün', en: '90d' },
];

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

interface Props {
  isTr: boolean;
  branches?: string[];
  /** Multi-restaurant owner için opsiyonel restoran picker. */
  restaurants?: Array<{ id: string; name: string }>;
}

export default function AnalyticsFilterBar({ isTr, branches, restaurants }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = (params.get('range') as '7d' | '30d' | '90d' | null) ?? '30d';
  const platform = params.get('platform') ?? 'all';
  const branch = params.get('branch') ?? 'all';
  const restaurantId = params.get('restaurantId') ?? 'all';

  const hasActiveFilter =
    range !== '30d' ||
    platform !== 'all' ||
    branch !== 'all' ||
    restaurantId !== 'all';

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const reset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  return (
    <section
      className="bz-card p-4 sm:p-5"
      aria-label={isTr ? 'Analitik filtreleri' : 'Analytics filters'}
      data-pending={pending ? '' : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2.5">
          <Eyebrow>{isTr ? 'FİLTRE' : 'FILTERS'}</Eyebrow>
        </div>

        {/* Range — segmented control (admin parite) */}
        <div
          className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
          role="group"
          aria-label={isTr ? 'Tarih aralığı' : 'Date range'}
        >
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => update('range', r.id === '30d' ? null : r.id)}
                className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                aria-pressed={active}
              >
                {isTr ? r.tr : r.en}
              </button>
            );
          })}
        </div>

        {/* Multi-restaurant owner case */}
        {restaurants && restaurants.length > 1 && (
          <select
            value={restaurantId}
            onChange={(e) => update('restaurantId', e.target.value)}
            className="bz-input h-[34px] py-0 text-[13px] sm:max-w-[200px]"
            aria-label={isTr ? 'İşletme' : 'Business'}
          >
            <option value="all">{isTr ? 'Tüm işletmeler' : 'All businesses'}</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        {/* Branch select */}
        {branches && branches.length > 0 && (
          <select
            value={branch}
            onChange={(e) => update('branch', e.target.value)}
            className="bz-input h-[34px] py-0 text-[13px] sm:max-w-[180px]"
            aria-label={isTr ? 'Şube' : 'Branch'}
          >
            <option value="all">{isTr ? 'Tüm şubeler' : 'All branches'}</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        {/* Platform chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => update('platform', null)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
              platform === 'all'
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
            }`}
            aria-pressed={platform === 'all'}
          >
            {isTr ? 'Tümü' : 'All'}
          </button>
          {PLATFORM_OPTIONS.map((pid) => {
            const active = platform === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => update('platform', active ? null : pid)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  active
                    ? 'border-[#0A0A0A] bg-white text-[#0A0A0A]'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={active}
                title={PLATFORMS[pid].label}
              >
                <PlatformChip id={pid} size={14} />
                <span className="hidden sm:inline">{PLATFORMS[pid].label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={reset}
            className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] sm:ml-auto"
            aria-label={isTr ? 'Filtreleri temizle' : 'Reset filters'}
          >
            <RotateCcw size={13} />
            {isTr ? 'Temizle' : 'Reset'}
          </button>
        )}
      </div>
    </section>
  );
}
