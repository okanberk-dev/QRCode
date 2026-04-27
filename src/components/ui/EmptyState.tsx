import { ReactNode } from "react";

interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`mx-auto text-center ${className}`}
      style={{
        padding: "52px 28px",
        borderRadius: 16,
        border: "1px dashed #E5E5E5",
        background: "#FAFAFA",
        maxWidth: 480,
      }}
    >
      {icon && (
        <div
          className="inline-flex items-center justify-center mb-4"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #EDEDED",
            color: "#525252",
          }}
        >
          {icon}
        </div>
      )}
      <div className="bz-h-tight mb-1.5" style={{ fontSize: 18 }}>
        {title}
      </div>
      {body && (
        <div className="mb-4" style={{ fontSize: 13, color: "#737373", lineHeight: 1.55 }}>
          {body}
        </div>
      )}
      {action}
    </div>
  );
}

export default EmptyState;
