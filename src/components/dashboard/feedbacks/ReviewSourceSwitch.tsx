import { MessageSquareText, Star } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';

/**
 * Review source switch shared by the Yorumlar pages (docs/design/
 * DASHBOARD_DESIGN.md §5.7): QR feedback collected by Buaze and the
 * business's Google reviews read as two segments of one "Yorumlar" page.
 * One white capsule with two segments; the active one is a black pill with
 * a green icon circle (Fintora segmented control). Each segment is its own
 * route; the active business travels in `?restaurantId`.
 */
export function ReviewSourceSwitch({
  locale,
  active,
  restaurantId,
  feedbackCount,
  className = '',
}: {
  locale: 'tr' | 'en';
  active: 'buaze' | 'google';
  restaurantId?: string | null;
  feedbackCount?: number | null;
  className?: string;
}) {
  const tr = locale === 'tr';
  const query = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
  const items = [
    {
      id: 'buaze' as const,
      href: `/${locale}/dashboard/feedbacks${query}`,
      label: tr ? 'QR geri bildirimleri' : 'QR feedback',
      short: tr ? 'QR' : 'QR',
      icon: MessageSquareText,
      count: feedbackCount ?? null,
    },
    {
      id: 'google' as const,
      href: `/${locale}/dashboard/google-reviews${query}`,
      label: tr ? 'Google yorumları' : 'Google reviews',
      short: 'Google',
      icon: Star,
      count: null,
    },
  ];

  return (
    <nav
      aria-label={tr ? 'Yorum kaynağı' : 'Review source'}
      className={`inline-flex max-w-full shrink-0 items-center gap-1 rounded-full bg-white p-1 max-sm:bg-[#F6F6F6] ${className}`}
    >
      {items.map((item) => {
        const on = item.id === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            className={`inline-flex min-h-[40px] min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-2 active:scale-[.97] max-sm:min-h-[44px] ${
              on ? 'bg-pn-ink text-white' : 'text-[#525252] hover:bg-pn-canvas hover:text-pn-ink max-sm:hover:bg-white'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                on ? 'bg-[#C6F24E] text-pn-ink' : 'bg-pn-canvas text-pn-ink max-sm:bg-white'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            <span className="truncate max-[400px]:hidden">{item.label}</span>
            <span className="hidden max-[400px]:inline">{item.short}</span>
            {item.count !== null && item.count !== undefined && (
              <span
                className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[12px] tabular-nums ${
                  on ? 'bg-white/15 text-white' : 'bg-pn-canvas text-[#525252]'
                }`}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default ReviewSourceSwitch;
