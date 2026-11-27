interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--color-pn-ink)",
  height = 6,
  className = "",
  ariaLabel,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={className}
      style={{
        height,
        background: "var(--color-pn-line)",
        borderRadius: height / 2,
        overflow: "hidden",
      }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: height / 2,
          transition: "width 400ms ease",
        }}
      />
    </div>
  );
}

export default ProgressBar;
