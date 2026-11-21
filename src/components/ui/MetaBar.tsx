import type { ReactNode } from "react";

/**
 * §53 meta bar (docs/design/panel-design-system.md §4.3): a row of small
 * label / value boxes under a page title — "Paket: Büyüme · Yenileme:
 * 24 Kas · 3 işletme". Wraps on phones; values use tabular numbers.
 */
export function MetaBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

export function MetaItem({
  label,
  value,
  className = "",
}: {
  /** Muted leading label ("Paket:"). Optional: a value alone is fine. */
  label?: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <span className={`bz-meta ${className}`}>
      {label ? <span className="bz-meta-label">{label}</span> : null}
      <span className="bz-meta-value">{value}</span>
    </span>
  );
}

export default MetaBar;
