import { ReactNode } from "react";

interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * Empty screen (Pano, docs/design/DASHBOARD_DESIGN.md §5.4): a soft card with
 * the icon in a round tile, a 22px light title and the next step.
 */
export function EmptyState({ title, body, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`mx-auto flex max-w-[480px] flex-col items-center rounded-[28px] bg-pn-canvas px-7 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-pn-ink">
          {icon}
        </div>
      )}
      <div className="text-[22px] font-normal leading-[1.25] tracking-[-0.005em] text-pn-ink">{title}</div>
      {body && <div className="mt-2 text-[14px] leading-[1.55] text-[#6E6E73]">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
