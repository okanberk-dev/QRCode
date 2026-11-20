'use client';

import { useEffect, useRef } from 'react';
import type { MenuNav } from '@/lib/menu-design';

const NAV_PAD = 20;

/**
 * Sticky category nav: pills or underline. Links stay native anchors
 * (`#cat-<id>`); smoothness comes from the page-level scroll-behavior, so the
 * Studio preview keeps instant jumps and nothing ever calls scrollIntoView
 * (which would also scroll the Studio page). The active link is kept in view
 * by scrolling the nav's own row only.
 */
export default function CategoryNav({
  categories, activeId, variant, centered, label, wide, onSelect,
}: {
  categories: { id: string; name: string }[];
  activeId: string | null;
  variant: MenuNav;
  centered: boolean;
  label: string;
  /** Content column is the 1040 px grid (else 680 px): the first link lines up with it. */
  wide: boolean;
  onSelect: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeId) return;
    const link = scroller.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(activeId)}"]`);
    if (!link) return;
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    const viewLeft = scroller.scrollLeft;
    const viewRight = viewLeft + scroller.clientWidth;
    if (left >= viewLeft + NAV_PAD - 1 && right <= viewRight - NAV_PAD + 1) return;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({ left: Math.max(0, left - NAV_PAD), behavior: reduced ? 'auto' : 'smooth' });
  }, [activeId]);

  const pills = variant === 'pills';

  return (
    <nav aria-label={label} className="bzm-nav sticky top-0 z-30 h-(--m-nav-h) border-b border-(--m-rule)">
      <div ref={scrollerRef} className="bzm-nav-scroll no-scrollbar relative h-full overflow-x-auto overflow-y-hidden">
        <div className={`flex h-full w-max min-w-full items-center ${pills ? 'gap-2' : 'gap-6'} px-5 ${
          wide ? '@md/menu:px-[max(24px,calc((100%-1040px)/2+24px))]' : '@md/menu:px-[max(24px,calc((100%-680px)/2+24px))]'
        } ${centered ? 'justify-center' : ''}`}>
          {categories.map((c) => {
            const active = c.id === activeId;
            const cls = pills
              ? `relative inline-flex h-9 shrink-0 items-center rounded-(--m-r-pill) px-4 text-[14px] leading-5 font-medium whitespace-nowrap transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${
                  active
                    ? 'bg-(--m-accent-fill) text-(--m-on-accent) shadow-[inset_0_0_0_1px_var(--m-accent-edge)]'
                    : 'text-(--m-ink-2) ring-1 ring-(--m-rule) ring-inset hover:text-(--m-ink) hover:ring-(--m-rule-strong)'
                }`
              : `relative inline-flex h-full shrink-0 items-center text-[15px] leading-5 font-medium whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:content-[''] ${
                  active ? 'text-(--m-ink) after:bg-(--m-accent-ui)' : 'text-(--m-ink-2) after:bg-transparent hover:text-(--m-ink)'
                }`;
            return (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                data-nav-id={c.id}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(c.id)}
                className={`${cls} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--m-focus)`}
              >
                {/* The bold twin reserves the active width, so pills never jitter. */}
                <span className="grid">
                  <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{c.name}</span>
                  <span className={`col-start-1 row-start-1 text-center ${active ? 'font-semibold' : ''}`}>{c.name}</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
