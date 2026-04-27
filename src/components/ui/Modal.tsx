"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: number | string;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  ariaLabel?: string;
}

export function Modal({
  title,
  onClose,
  children,
  size = 480,
  footer,
  hideCloseButton,
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === "string" ? title : undefined)}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(10,10,10,0.4)", backdropFilter: "blur(8px)" }}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bz-fade-in bg-white w-full sm:w-auto"
        style={{
          borderRadius: 20,
          width: typeof size === "number" ? Math.min(size, window?.innerWidth ?? size) : size,
          maxWidth: "92vw",
          maxHeight: "92vh",
          overflow: "auto",
          boxShadow: "0 24px 80px -20px rgba(0,0,0,0.4)",
        }}
      >
        {(title || !hideCloseButton) && (
          <div
            className="flex justify-between items-center"
            style={{ padding: "20px 24px", borderBottom: "1px solid #EDEDED" }}
          >
            {title && (
              <div className="bz-h-tight" style={{ fontSize: 17 }}>
                {title}
              </div>
            )}
            {!hideCloseButton && (
              <button
                type="button"
                aria-label="Close"
                className="bz-btn-icon"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2 px-6 py-4"
            style={{ borderTop: "1px solid #EDEDED" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
