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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(",");

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
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 1. Remember the element that triggered the modal so we can restore focus on close
    previouslyFocused.current =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    // 2. Move focus into the dialog (first focusable element, or the dialog itself)
    const dialog = dialogRef.current;
    if (dialog) {
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const first = focusables[0];
      if (first) {
        first.focus();
      } else {
        dialog.focus();
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // 3. Focus trap: keep Tab/Shift+Tab cycling inside the dialog
      if (e.key === "Tab" && dialog) {
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === firstEl || !dialog.contains(active)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else if (active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // 4. Restore focus to the element that opened the modal
      const toRestore = previouslyFocused.current;
      if (toRestore && typeof toRestore.focus === "function") {
        try {
          toRestore.focus();
        } catch {
          /* element may have been unmounted */
        }
      }
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
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bz-fade-in bg-white w-full sm:w-auto focus:outline-none"
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
