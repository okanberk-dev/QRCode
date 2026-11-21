import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * §53 list row (docs/design/panel-design-system.md §4.3): leading avatar /
 * tile, a 14/500 title, a 12.5 meta line and a trailing value or chevron on
 * a soft surface; `active` fills it graphite (the reference's highlighted
 * notification). A link with `href`, a button with `onClick`, else static.
 */
export function ListRow({
  leading,
  title,
  meta,
  trailing,
  href,
  onClick,
  active = false,
  chevron,
  className = "",
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** Show a trailing chevron (default: when the row is a link). */
  chevron?: boolean;
  className?: string;
}) {
  const showChevron = chevron ?? !!href;
  const inner = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="bz-row-title block">{title}</span>
        {meta ? <span className="bz-row-meta block">{meta}</span> : null}
      </span>
      {trailing ? <span className="shrink-0 text-[13px] font-medium tabular-nums">{trailing}</span> : null}
      {showChevron ? <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 opacity-60" /> : null}
    </>
  );
  const props = { className: `bz-row ${className}`, "data-active": active ? "true" : undefined } as const;
  if (href) {
    return (
      <Link href={href} {...props} aria-current={active ? "true" : undefined}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...props} aria-pressed={active}>
        {inner}
      </button>
    );
  }
  return <div {...props}>{inner}</div>;
}

export default ListRow;
