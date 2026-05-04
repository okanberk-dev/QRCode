import Link from 'next/link';
import { ChevronRight, MapPin, Star } from 'lucide-react';
import { Eyebrow } from '@/components/ui';

// Phase 8c+ §38.34 — EN AKTİF KONUM card. Tasarım kaynağı:
// .design-owner-2026/project/page-analytics.jsx line 270+ (Kadıköy Bistro ·
// Bahariye + 1.284 yorum + 4.74 puan).
//
// Multi-restaurant owner için pik lokasyon. Single-restaurant veya 0 restoran
// → null render. Caller restaurant aggregate'ten en yüksek count'lu seçer.

export interface TopLocationCardProps {
  /** En aktif lokasyon. null → render gizli. */
  topLocation: {
    id: string;
    name: string;
    /** Şube adı veya null. */
    branch: string | null;
    count: number;
    avgRating: number;
  } | null;
  /** Locale path için (`/${locale}/dashboard/restaurants/[id]`). */
  locale: string;
  isTr?: boolean;
  className?: string;
}

export function TopLocationCard({
  topLocation,
  locale,
  isTr = true,
  className = '',
}: TopLocationCardProps) {
  if (!topLocation) return null;

  return (
    <section className={`bz-card p-5 sm:p-6 ${className}`}>
      <header className="mb-3">
        <Eyebrow>{isTr ? 'EN AKTİF KONUM' : 'TOP LOCATION'}</Eyebrow>
      </header>
      <Link
        href={`/${locale}/dashboard/restaurants/${topLocation.id}`}
        className="flex items-center gap-3 -mx-2 px-2 py-2.5 rounded-lg hover:bg-[#FAFAFA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
      >
        <span
          aria-hidden="true"
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAFAFA] text-[#0A0A0A]"
        >
          <MapPin size={15} strokeWidth={2} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="bz-h-tight text-[14px] text-[#0A0A0A] truncate">
            {topLocation.name}
            {topLocation.branch ? ` · ${topLocation.branch}` : ''}
          </div>
          <div className="bz-mono mt-0.5 flex items-center gap-2 text-[11px] text-[#737373] tabular-nums">
            <span>
              {topLocation.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}{' '}
              {isTr ? 'yorum' : 'reviews'}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Star size={10} className="text-[#C6F24E]" fill="#C6F24E" />
              {topLocation.avgRating.toFixed(2)}
            </span>
          </div>
        </div>
        <ChevronRight
          size={14}
          strokeWidth={2}
          className="shrink-0 text-[#A3A3A3]"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}

export default TopLocationCard;
