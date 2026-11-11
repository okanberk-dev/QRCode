'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { PulseMenu, PulseMenuItem } from '@/components/ui';

// Phase 8c+ §38.31 — Header "Bu hafta" dynamic dropdown (tasarım
// page-dashboard.jsx line 174-176). 4 scope option — URL searchParam
// `?scope=` üzerinden navigation; server component force-dynamic
// dashboard'da KPI window'larını yeniden hesaplar.
//
// Default '7d' (Bu hafta). useTransition ile pending state — owner click
// sonrası ~150ms latency'de chevron pulse + disabled görsel.

export type DashboardScope = '7d' | '30d' | '90d' | 'ytd';

export const DASHBOARD_SCOPE_VALUES: DashboardScope[] = ['7d', '30d', '90d', 'ytd'];

const LABELS: Record<DashboardScope, { tr: string; en: string }> = {
  '7d': { tr: 'Bu hafta', en: 'This week' },
  '30d': { tr: 'Bu ay', en: 'This month' },
  '90d': { tr: 'Son 90 gün', en: 'Last 90 days' },
  ytd: { tr: 'Bu yıl', en: 'This year' },
};

const ORDER: DashboardScope[] = ['7d', '30d', '90d', 'ytd'];

export interface ScopeDropdownProps {
  current: DashboardScope;
  isTr?: boolean;
}

export function ScopeDropdown({ current, isTr = true }: ScopeDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const select = (next: DashboardScope) => {
    if (next === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === '7d') {
      params.delete('scope'); // default — clean URL
    } else {
      params.set('scope', next);
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const triggerLabel = isTr ? LABELS[current].tr : LABELS[current].en;

  return (
    <PulseMenu
      trigger={
        <button
          type="button"
          className={`bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
            pending ? 'opacity-70' : ''
          }`}
          // Accessible name keeps the visible text (WCAG 2.5.3 label-in-name).
          aria-label={`${isTr ? 'Tarih aralığı' : 'Date range'}: ${triggerLabel}`}
          disabled={pending}
        >
          <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
          {triggerLabel}
          <ChevronDown
            size={13}
            strokeWidth={2}
            aria-hidden="true"
            className={pending ? 'animate-pulse' : ''}
          />
        </button>
      }
    >
      {ORDER.map((value) => {
        const isCurrent = value === current;
        return (
          <PulseMenuItem
            key={value}
            onSelect={() => select(value)}
            selected={isCurrent}
          >
            {isTr ? LABELS[value].tr : LABELS[value].en}
          </PulseMenuItem>
        );
      })}
    </PulseMenu>
  );
}

export default ScopeDropdown;
