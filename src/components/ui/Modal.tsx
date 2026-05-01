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

  // Stash onClose in a ref so the mount/unmount effect below can stay
  // dependency-free. Without this, callers passing an inline arrow
  // (`onClose={() => setOpen(false)}`) re-create the closure on every
  // parent render — which used to re-run the effect on every keystroke,
  // restoring focus to the trigger button mid-typing and dropping
  // characters from inputs inside the modal.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
        onCloseRef.current();
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
    // Mount/unmount only — onClose accessed via ref so an unstable
    // closure in the consumer doesn't trigger the focus-restore loop.
  }, []);

  // Numeric size'ı viewport'a sığdır (SSR-safe — window sadece client'ta var,
  // bu component zaten 'use client', ama yine de defansif kontrol).
  const computedWidth =
    typeof size === "number"
      ? typeof window !== "undefined"
        ? Math.min(size, window.innerWidth)
        : size
      : size;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === "string" ? title : undefined)}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{
        background: "rgba(10,10,10,0.4)",
        backdropFilter: "blur(8px)",
        // iOS Safari dynamic viewport fix: backdrop tüm görünür alana yayılır,
        // dvh dolduğunda nav'a/safe-area'ya saygılı kalır.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bz-fade-in bg-white w-full sm:w-auto focus:outline-none flex flex-col rounded-t-[20px] sm:rounded-[20px]"
        style={{
          width: computedWidth,
          maxWidth: "92vw",
          // Mobile (bottom-sheet) için 90dvh + 92vh fallback. iOS Safari URL
          // bar açıkken dvh visible viewport'a göre küçülür, modal taşmaz;
          // dvh desteklemeyen eski tarayıcı vh'a düşer (`min` ignore eder).
          maxHeight: "min(92vh, 90dvh)",
          overflow: "hidden",
          boxShadow: "0 24px 80px -20px rgba(0,0,0,0.4)",
        }}
      >
        {(title || !hideCloseButton) && (
          <div
            className="flex justify-between items-center shrink-0"
            style={{ padding: "20px 24px", borderBottom: "1px solid #EDEDED" }}
          >
            {title && (
              <div className="bz-h-tight pr-3 truncate" style={{ fontSize: 17 }}>
                {title}
              </div>
            )}
            {!hideCloseButton && (
              <button
                type="button"
                aria-label="Close"
                className="bz-btn-icon shrink-0"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="p-6 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer && (
          <div
            className="flex justify-end gap-2 px-6 py-4 shrink-0"
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
