import { ReactNode } from "react";
import { X } from "lucide-react";

export type AlertKind = "info" | "success" | "warn" | "danger" | "lime";

interface AlertBannerProps {
  kind?: AlertKind;
  children: ReactNode;
  onDismiss?: () => void;
  icon?: ReactNode;
  className?: string;
}

const KIND_PALETTE: Record<AlertKind, { bg: string; border: string; text: string; dot: string }> = {
  info: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", dot: "#2563EB" },
  success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", dot: "#16A34A" },
  warn: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#D97706" },
  danger: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#DC2626" },
  lime: { bg: "#F4FBDC", border: "#E3F4A6", text: "#000000", dot: "#111110" },
};

export function AlertBanner({
  kind = "info",
  children,
  onDismiss,
  icon,
  className = "",
}: AlertBannerProps) {
  const palette = KIND_PALETTE[kind];
  return (
    <div
      role="alert"
      data-kind={kind}
      className={`pn-alert flex items-start justify-between gap-3 px-4 py-3 rounded-xl text-xs font-medium ${className}`}
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
      }}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {icon ?? (
          <span
            aria-hidden="true"
            className="pn-alert-dot shrink-0 mt-1.5 inline-block w-2 h-2 rounded-full animate-pulse"
            style={{ background: palette.dot }}
          />
        )}
        <span className="leading-relaxed">{children}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Kapat"
          className="bz-btn-icon shrink-0 -mr-1"
          style={{ color: palette.text }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export default AlertBanner;
