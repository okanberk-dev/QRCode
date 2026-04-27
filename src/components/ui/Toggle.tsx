interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, size = "md", disabled, ariaLabel }: ToggleProps) {
  const w = size === "sm" ? 32 : 38;
  const h = size === "sm" ? 18 : 22;
  const pad = 2;
  const kn = h - pad * 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative",
        width: w,
        height: h,
        background: checked ? "#0A0A0A" : "#E5E5E5",
        borderRadius: 999,
        border: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms ease",
        padding: pad,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: pad,
          left: checked ? w - kn - pad : pad,
          width: kn,
          height: kn,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          transition: "left 200ms ease",
        }}
      />
    </button>
  );
}

export default Toggle;
