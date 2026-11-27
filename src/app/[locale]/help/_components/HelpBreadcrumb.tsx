import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface HelpCrumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

/** Visible breadcrumb; the matching BreadcrumbList JSON-LD is built by each page. */
export default function HelpBreadcrumb({ items, label }: { items: HelpCrumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#737373]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={12} className="shrink-0 text-[#A3A3A3]" aria-hidden="true" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center rounded-sm transition-colors hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="inline-flex min-h-[44px] items-center text-[#525252]">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
