import { Loader2 } from "lucide-react";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  className?: string;
}

const SIZE = {
  sm: {
    track: "h-5 w-9",
    knob: "h-4 w-4",
    translate: "translate-x-4",
    spinner: 9,
  },
  md: {
    track: "h-7 w-12",
    knob: "h-6 w-6",
    translate: "translate-x-5",
    spinner: 11,
  },
  lg: {
    track: "h-8 w-14",
    knob: "h-7 w-7",
    translate: "translate-x-6",
    spinner: 12,
  },
} as const;

export function Toggle({
  checked,
  onChange,
  size = "md",
  disabled,
  loading,
  ariaLabel,
  className = "",
}: ToggleProps) {
  const s = SIZE[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={() => !isDisabled && onChange(!checked)}
      className={[
        "group relative inline-flex shrink-0 items-center rounded-full border p-0.5",
        "transition-all duration-200 ease-out active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]/70 focus-visible:ring-offset-2",
        checked
          ? "border-[#0A0A0A] bg-[#0A0A0A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "border-[#D4D4D4] bg-[#F5F5F5] shadow-[inset_0_1px_2px_rgba(10,10,10,0.06)]",
        isDisabled ? "cursor-not-allowed opacity-60 active:scale-100" : "cursor-pointer hover:border-[#0A0A0A]",
        s.track,
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-flex items-center justify-center rounded-full transition-transform duration-200 ease-out",
          "shadow-[0_2px_8px_rgba(10,10,10,0.18)]",
          checked ? `${s.translate} bg-[#C6F24E] text-[#0A0A0A]` : "translate-x-0 bg-white text-[#737373]",
          s.knob,
        ].join(" ")}
      >
        {loading ? <Loader2 size={s.spinner} className="animate-spin" /> : null}
      </span>
    </button>
  );
}

export default Toggle;
