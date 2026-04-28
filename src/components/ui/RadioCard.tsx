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

export function RadioCard({
  active,
  onClick,
  title,
  body,
  icon,
  disabled,
  className = "",
}: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left flex items-start gap-2.5 ${className}`}
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${active ? "#0A0A0A" : "#EDEDED"}`,
        background: active ? "#FAFAFA" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          flexShrink: 0,
          border: `2px solid ${active ? "#0A0A0A" : "#D4D4D4"}`,
          background: "#fff",
          position: "relative",
          marginTop: 2,
        }}
      >
        {active && (
          <span
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: "50%",
              background: "#0A0A0A",
            }}
          />
        )}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        </div>
        {body && (
          <div className="mt-1" style={{ fontSize: 12, color: "#737373", lineHeight: 1.5 }}>
            {body}
          </div>
        )}
      </div>
    </button>
  );
}

export default RadioCard;
