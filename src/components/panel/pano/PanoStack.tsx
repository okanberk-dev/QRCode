import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Stacked cards (docs/design/DASHBOARD_DESIGN.md §5.4 "Investments"): rows
 * that overlap like a fanned deck — the first deep purple, the second
 * lavender, the rest white with a hairline — each with a round icon, a title over a grey
 * line and a value on the right. Use for a short ranked list (≤ 4 items).
 */

export interface PanoStackItem {
  id: string;
  href?: string;
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  /** Accessible name when the row is a link. */
  label?: string;
}

const TONES = ['pn-stack-row--dark', 'pn-stack-row--lime', 'pn-stack-row--light'] as const;

export function PanoStack({ items, className = '' }: { items: PanoStackItem[]; className?: string }) {
  return (
    <ol className={`pn-stack ${className}`}>
      {items.map((item, i) => {
        const tone = TONES[Math.min(i, TONES.length - 1)];
        const body = (
          <>
            <span className="pn-stack-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium leading-snug">{item.title}</span>
              {item.sub && <span className="pn-stack-sub mt-0.5 block text-[13px]">{item.sub}</span>}
            </span>
            {(item.value || item.valueSub) && (
              <span className="flex shrink-0 flex-col items-end text-right">
                {item.value && <span className="pn-stack-value text-[15px] font-medium tabular-nums">{item.value}</span>}
                {item.valueSub && <span className="pn-stack-sub text-[13px]">{item.valueSub}</span>}
              </span>
            )}
          </>
        );
        return (
          <li key={item.id} className={`pn-stack-item ${tone}`} style={{ zIndex: items.length - i }}>
            {item.href ? (
              <Link href={item.href} className="pn-stack-row" aria-label={item.label}>
                {body}
              </Link>
            ) : (
              <div className="pn-stack-row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Lavender shortcut tile (§5.4 "Referral program / PRO version"): big purple
 * icon circle on top, a two-line label at the bottom left.
 */
export function PanoTile({ href, icon, label, badge }: { href: string; icon: ReactNode; label: ReactNode; badge?: ReactNode }) {
  return (
    <Link href={href} className="pn-tile group">
      <span className="flex items-start justify-between gap-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pn-accent text-white transition-transform duration-300 group-hover:-rotate-6" aria-hidden="true">
          {icon}
        </span>
        {badge && <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-pn-accent">{badge}</span>}
      </span>
      <span className="pn-tile-label">{label}</span>
    </Link>
  );
}

export default PanoStack;
