import { Crown, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import type { CustomerSegment } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

// Phase 8c+ extraction (CLAUDE.md §38.17). 3+ callsite (CLAUDE.md §7 kuralı):
// (1) /[locale]/dashboard/customers/page.tsx — table + mobile card
// (2) /[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx — drawer header
// (3) /[locale]/dashboard/page.tsx — pending tasks segment crossover
//
// Pure presentational — server + client component'lerin ikisinden de import
// edilebilir ('use client' yok). Lucide ikonları + 4 segment renk eşlemesi
// tek source-of-truth, drift önleme.

export interface SegmentChipProps {
  segment: CustomerSegment;
  locale: Locale;
  size?: 'sm' | 'md';
}

const SEGMENT_MAP: Record<
  CustomerSegment,
  { label: { tr: string; en: string }; bg: string; fg: string; Icon: typeof Crown }
> = {
  vip: { label: { tr: 'VIP', en: 'VIP' }, bg: '#0A0A0A', fg: '#FFFFFF', Icon: Crown },
  loyal: { label: { tr: 'Düzenli', en: 'Loyal' }, bg: '#EAF9B8', fg: '#0A0A0A', Icon: CheckCircle2 },
  new: { label: { tr: 'Yeni', en: 'New' }, bg: '#DBEAFE', fg: '#1E40AF', Icon: Sparkles },
  risk: { label: { tr: 'Risk', en: 'Risk' }, bg: '#FEE2E2', fg: '#991B1B', Icon: AlertTriangle },
};

export function SegmentChip({ segment, locale, size = 'md' }: SegmentChipProps) {
  const isTr = locale === 'tr';
  const m = SEGMENT_MAP[segment];
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  const iconSize = size === 'sm' ? 9 : 10;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-tight whitespace-nowrap ${px}`}
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      <m.Icon size={iconSize} strokeWidth={2.2} />
      {isTr ? m.label.tr : m.label.en}
    </span>
  );
}
