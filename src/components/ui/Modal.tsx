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
  /** One grey line under the title: what this dialog does / what will happen. */
  description?: ReactNode;
  /** Glyph for the black circle left of the title (lime icon). */
  icon?: ReactNode;
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

/** Page language for the built-in strings (close button). */
function pageIsEnglish(): boolean {
  return typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("en");
}

export function Modal({
  title,
  description,
  icon,
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
        background: "rgba(17,17,16,0.45)",
        backdropFilter: "blur(6px)",
        // iOS Safari dynamic viewport fix: backdrop tüm görünür alana yayılır,
        // dvh dolduğunda nav'a/safe-area'ya saygılı kalır.
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bz-fade-in relative bg-white w-full sm:w-auto focus:outline-none flex flex-col rounded-t-[28px] sm:rounded-[28px]"
        style={{
          width: computedWidth,
          maxWidth: "92vw",
          // Mobile (bottom-sheet) için 90dvh + 92vh fallback. iOS Safari URL
          // bar açıkken dvh visible viewport'a göre küçülür, modal taşmaz;
          // dvh desteklemeyen eski tarayıcı vh'a düşer (`min` ignore eder).
          maxHeight: "min(92vh, 90dvh)",
          overflow: "hidden",
          boxShadow: "0 28px 80px -24px rgba(17,17,16,0.45)",
        }}
      >
        {/* Bottom-sheet grab handle on phones (Pano §7). */}
        <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-[#D9D9DE] sm:hidden" />
        {(title || !hideCloseButton) && (
          // Header: optional black icon circle (lime glyph), the title on up
          // to two lines (never cut mid-word), one grey line under it, and
          // the round close button.
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-1 pt-4 sm:px-7 sm:pt-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {icon && (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-ink text-[#C6F24E]"
                >
                  {icon}
                </span>
              )}
              {(title || description) && (
                <div className="min-w-0 flex-1 pt-0.5">
                  {title && (
                    <div className="break-words text-[20px] font-medium leading-[1.25] tracking-[-0.015em] text-pn-ink">
                      {title}
                    </div>
                  )}
                  {description && (
                    <p className="mt-1 text-[14px] leading-[1.5] text-[#737373]">{description}</p>
                  )}
                </div>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                aria-label={pageIsEnglish() ? "Close" : "Kapat"}
                className="bz-btn-icon-lg -mr-1 shrink-0"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {children}
        </div>
        {footer && (
          // Phones: full-width buttons, the main action on top. From 640px a
          // right-aligned row.
          <div className="flex shrink-0 flex-col-reverse gap-2 px-5 pb-5 pt-3 sm:flex-row sm:justify-end sm:px-7 sm:pb-6 max-sm:[&>a]:w-full max-sm:[&>button]:w-full">
            {footer}
          </div>
        )}

        {/* Unsaved-changes confirmation — in-place overlay over the dialog
            body (only shown when closeGuard signals dirty input). */}
        {confirmingClose && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-t-[28px] bg-white/95 p-6 backdrop-blur-sm sm:rounded-[28px]"
            role="alertdialog"
            aria-label={confirmCopy.title}
          >
            <div className="w-full max-w-[340px] text-center">
              <span
                aria-hidden="true"
                className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FDECEC] text-[#D92D20]"
              >
                <X size={18} strokeWidth={2.2} />
              </span>
              <h3 className="text-[18px] font-medium leading-snug text-pn-ink">{confirmCopy.title}</h3>
              <p className="mb-5 mt-1.5 text-[14px] leading-[1.5] text-[#737373]">{confirmCopy.body}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="bz-btn flex-1"
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
