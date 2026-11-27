import { ReactNode } from "react";

interface RadioCardProps {
  active: boolean;
  onClick: () => void;
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Large choice card (Pano §5.4 outlined row): 24px corners, hairline border;
 * the chosen card turns black with white text and a lime dot.
 */
export function RadioCard({ active, onClick, title, body, icon, disabled, className = "" }: RadioCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-3 rounded-[24px] border px-5 py-4 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-2 ${
        active ? "border-pn-ink bg-pn-ink text-white" : "border-pn-line bg-white text-pn-ink hover:bg-pn-canvas"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          active ? "border-pn-accent" : "border-[#D2D2D8]"
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-pn-accent" />}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2">
          {icon}
          <span className="text-[15px] font-medium">{title}</span>
        </span>
        {body && (
          <span className={`mt-1 block text-[13px] leading-[1.5] ${active ? "text-white/65" : "text-[#6E6E73]"}`}>
            {body}
          </span>
        )}
      </span>
    </button>
  );
}

export default RadioCard;
