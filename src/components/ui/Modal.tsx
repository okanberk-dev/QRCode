"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ModalCloseConfirmCopy {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
}

interface ModalProps {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: number | string;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  ariaLabel?: string;
  /**
   * Optional unsaved-changes guard. When it returns `true` at close time
   * (backdrop click or ESC), the modal shows an in-place "are you sure?"
   * confirmation instead of closing immediately — protecting form input from
   * an accidental outside-click. The X button still closes directly (explicit
   * intent). Omit for the default close-immediately behavior.
   */
  closeGuard?: () => boolean;
  /** i18n copy for the discard confirmation (defaults to Turkish). */
  closeConfirm?: ModalCloseConfirmCopy;
}

const DEFAULT_CLOSE_CONFIRM: ModalCloseConfirmCopy = {
  title: "Çıkmak istediğine emin misin?",
  body: "Girdiğin bilgiler kaydedilmeden kapanacak.",
  confirm: "Kapat",
  cancel: "Vazgeç",
};

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
  closeGuard,
  closeConfirm,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // The element that opened the modal. Read while rendering — i.e. before the
  // commit, so before any child's `autoFocus` has moved focus — otherwise a
  // modal whose input autofocuses would "restore" focus to that (by then
  // unmounted) input on close instead of to the trigger button.
  const previouslyFocused = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null,
  );
  // The element a child focused by itself (`<input autoFocus>`), remembered so
  // a dev-only StrictMode effect re-run (mount → cleanup → mount, where the
  // cleanup hands focus back to the trigger) can put it back.
  const childFocused = useRef<HTMLElement | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const confirmCopy = closeConfirm ?? DEFAULT_CLOSE_CONFIRM;

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

  // Stable close-request fn accessed via ref so the mount-only effect can call
  // it without re-subscribing. If a guard is supplied and signals dirty input,
  // show the in-place confirm; otherwise close immediately.
  const requestCloseRef = useRef<() => void>(() => {});
  requestCloseRef.current = () => {
    if (closeGuard?.()) {
      setConfirmingClose(true);
    } else {
      onCloseRef.current();
    }
  };

  useEffect(() => {
    // 1. The trigger to restore focus to on close is captured at render time
    //    (see `previouslyFocused` above); read once here for the cleanup.
    const toRestore = previouslyFocused.current;

    // 2. Move focus into the dialog (first focusable element, or the dialog
    //    itself) — unless a child already took focus itself via `autoFocus`.
    //    React applies `autoFocus` during commit, before this passive effect
    //    runs, so without this check the effect always stole focus from the
    //    field the child asked for and parked it on the header's close button.
    const dialog = dialogRef.current;
    if (dialog) {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== dialog && dialog.contains(active)) {
        childFocused.current = active;
      } else if (childFocused.current && dialog.contains(childFocused.current)) {
        childFocused.current.focus();
      } else {
        const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const first = focusables[0];
        if (first) {
          first.focus();
        } else {
          dialog.focus();
        }
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestCloseRef.current();
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
      onClick={() => requestCloseRef.current()}
      // z-50 — CLAUDE.md §40.3 hierarchy: modals + drawers + palette live
      // at z-50; cookie banner (z-[100]) ve impersonation banner (z-[60])
      // bilinçli olarak üstte. Eski `z-[100]` cookie banner ile çakışıyordu:
      // KVKK onay banner'ı modalları örtüyordu, modal CTA'sı tıklanamıyordu
      // (cookie banner same z-index, later DOM render → topmost).
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
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
        className="bz-fade-in relative bg-white w-full sm:w-auto focus:outline-none flex flex-col rounded-t-[20px] sm:rounded-[20px]"
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
                className="bz-btn-icon-lg shrink-0"
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

        {/* Unsaved-changes confirmation — in-place overlay over the dialog
            body (only shown when closeGuard signals dirty input). */}
        {confirmingClose && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-t-[20px] sm:rounded-[20px] bg-white/95 p-6 backdrop-blur-sm"
            role="alertdialog"
            aria-label={confirmCopy.title}
          >
            <div className="w-full max-w-[340px] text-center">
              <h3 className="bz-h-tight mb-2" style={{ fontSize: 16 }}>
                {confirmCopy.title}
              </h3>
              <p className="mb-5 text-[13px] leading-[1.55] text-[#525252]">
                {confirmCopy.body}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="bz-btn-ghost flex-1"
                  onClick={() => setConfirmingClose(false)}
                  autoFocus
                >
                  {confirmCopy.cancel}
                </button>
                <button
                  type="button"
                  className="bz-btn-primary flex-1"
                  onClick={() => {
                    setConfirmingClose(false);
                    onClose();
                  }}
                >
                  {confirmCopy.confirm}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
