import { Crown, CheckCircle2, Sparkles, AlertTriangle, Archive } from 'lucide-react';
import type { CustomerSegment } from '@/lib/customers';
import { SEGMENT_COLOR_MAP } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

// Phase 8c+ extraction (CLAUDE.md §38.17). 3+ callsite:
// (1) /[locale]/dashboard/customers/page.tsx — table + mobile card
// (2) /[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx
// (3) /[locale]/dashboard/page.tsx — pending tasks segment crossover
// (4) /admin/customers/page.tsx — table + mobile card
//
// Pure presentational — server + client component'lerin ikisinden de import
// edilebilir ('use client' yok). Phase 8c+ §38.22'de renk eşlemesi
// `lib/customers.ts:SEGMENT_COLOR_MAP` const'ına taşındı (5. callsite mail
// template ile drift sıfır). Lucide icon → iconName eşlemesi component-local.
//
// §38.47 — `churned` segment desteği (Archive icon + Kayıp/Churned label).
// Tasarım .design-owner-2026/page-customers.jsx 6. chip parity.

export interface SegmentChipProps {
  segment: CustomerSegment;
  locale: Locale;
  size?: 'sm' | 'md';
}

const ICON_BY_NAME = {
  crown: Crown,
  check: CheckCircle2,
  sparkles: Sparkles,
  alert: AlertTriangle,
  archive: Archive,
} as const;

const SEGMENT_LABELS: Record<CustomerSegment, { tr: string; en: string }> = {
  vip: { tr: 'VIP', en: 'VIP' },
  loyal: { tr: 'Düzenli', en: 'Loyal' },
  new: { tr: 'Yeni', en: 'New' },
  risk: { tr: 'Risk', en: 'Risk' },
  churned: { tr: 'Kayıp', en: 'Churned' },
};

export function SegmentChip({ segment, locale, size = 'md' }: SegmentChipProps) {
  const isTr = locale === 'tr';
  const colors = SEGMENT_COLOR_MAP[segment];
  const labels = SEGMENT_LABELS[segment];
  const Icon = ICON_BY_NAME[colors.iconName];
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[12px]' : 'px-2 py-0.5 text-[12px]';
  const iconSize = size === 'sm' ? 9 : 10;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium tracking-tight whitespace-nowrap ${px}`}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <Icon size={iconSize} strokeWidth={2.2} />
      {isTr ? labels.tr : labels.en}
    </span>
  );
}
