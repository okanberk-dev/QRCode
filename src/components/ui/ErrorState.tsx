import { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: ReactNode;
  body?: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Bir şeyler yanlış gitti",
  body = "Veriler yüklenirken bir hata oluştu. Lütfen tekrar dene.",
  onRetry,
  retryLabel = "Tekrar dene",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`mx-auto text-center ${className}`}
      style={{
        padding: "32px 24px",
        borderRadius: 16,
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        maxWidth: 480,
      }}
      role="alert"
    >
      <div
        className="inline-flex items-center justify-center mb-4"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "#fff",
          border: "1px solid #FECACA",
          color: "#DC2626",
        }}
      >
        <AlertTriangle size={22} />
      </div>
      <div className="bz-h-tight mb-1.5" style={{ fontSize: 17, color: "#7F1D1D" }}>
        {title}
      </div>
      <div className="mb-4" style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.55 }}>
        {body}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="bz-btn-ghost">
          <RefreshCw size={14} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
