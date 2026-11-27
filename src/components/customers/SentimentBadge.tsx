import type { CustomerSentiment } from '@/lib/customers';
import { SENTIMENT_COLOR_MAP } from '@/lib/customers';
import type { Locale } from '@/lib/translations';

// Phase 8c+ extraction (CLAUDE.md §38.22). 3+ callsite (CLAUDE.md §7):
// (1) /[locale]/dashboard/customers/page.tsx — table cell + mobile card (cell variant)
// (2) /[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx — drawer header (badge variant)
// (3) /admin/customers/page.tsx — table + mobile card (cell variant)
//
// Pure presentational — server + client component'lerin ikisinden de import
// edilebilir ('use client' yok). Color map `lib/customers.ts:SENTIMENT_COLOR_MAP`
// tek source-of-truth.
//
// Variants:
// - `cell` (default): inline dot + label, bg yok — table cell veya mobile card
//   row için (admin + owner customers/page'lerinde mevcut SentimentCell pattern)
// - `badge`: rounded-full + bg-pn-canvas + border + dot + label — drawer
//   header chip için (mevcut SentimentBadge pattern)

export interface SentimentBadgeProps {
  sentiment: CustomerSentiment;
  locale: Locale;
  variant?: 'cell' | 'badge';
}

const SENTIMENT_LABELS: Record<CustomerSentiment, { tr: string; en: string }> = {
  pos: { tr: 'Olumlu', en: 'Positive' },
  neu: { tr: 'Nötr', en: 'Neutral' },
  neg: { tr: 'Olumsuz', en: 'Negative' },
};

export function SentimentBadge({
  sentiment,
  locale,
  variant = 'cell',
}: SentimentBadgeProps) {
  const isTr = locale === 'tr';
  const color = SENTIMENT_COLOR_MAP[sentiment];
  const labels = SENTIMENT_LABELS[sentiment];
  const text = isTr ? labels.tr : labels.en;

  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-pn-canvas border border-pn-line px-2 py-0.5 text-[12px] text-[#525252] whitespace-nowrap">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        {text}
      </span>
    );
  }

  // cell (default)
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#525252] whitespace-nowrap">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {text}
    </span>
  );
}
