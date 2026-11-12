"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

interface UnsavedChangesBarProps {
  dirty: boolean;
  saving?: boolean;
  /** Async save handler — should resolve when persisted (or throw to keep dirty). */
  onSave: () => void | Promise<void>;
  /** Sync revert — restore form state to last-saved snapshot. */
  onReset: () => void;
  /** Optional inline error string rendered next to actions. */
  error?: string | null;
  /** Optional inline success label (e.g. "Kaydedildi"). Auto-hides after ~3s. */
  success?: string | null;
  /** UI language for the default labels below (TR default). */
  locale?: "tr" | "en";
  /** Label overrides — default to the `locale` copy. */
  dirtyLabel?: string;
  saveLabel?: string;
  resetLabel?: string;
}

const SUCCESS_VISIBLE_MS = 3000;

const COPY = {
  tr: {
    dirty: "Kaydedilmemiş değişiklikler var.",
    save: "Kaydet",
    reset: "Geri al",
    region: "Kaydedilmemiş değişiklikler",
  },
  en: {
    dirty: "You have unsaved changes.",
    save: "Save",
    reset: "Reset",
    region: "Unsaved changes",
  },
} as const;

/**
 * Save bar shown while a form is dirty (or right after a save / error).
 *
 * Rendered `sticky` at the bottom of the form's own column instead of
 * `fixed inset-x-0`: the fixed bar spanned the whole viewport at lg —
 * over the sidebar, centred on the window rather than the content — and
 * covered the last card. Sticky keeps it aligned to the content column
 * whatever the (collapsible) sidebar width is, and because it is in flow
 * it reserves its own space, so nothing is hidden behind it. Below lg it
 * floats above the shell's floating bottom nav (`--dash-bottom-nav-h`,
 * which already carries the safe-area inset; 0 from lg up).
 *
 * - Cmd/Ctrl+S → preventDefault + onSave.
 * - `beforeunload` → standard browser prompt while dirty.
 * - The live region stays mounted so SR users hear state changes.
 */
export function UnsavedChangesBar({
  dirty,
  saving = false,
  onSave,
  onReset,
  error,
  success,
  locale = "tr",
  dirtyLabel,
  saveLabel,
  resetLabel,
}: UnsavedChangesBarProps) {
  const copy = COPY[locale];

  // Success confirmations auto-hide; a new message (or a fresh save cycle
  // that cleared it to null first) shows again.
  const [prevSuccess, setPrevSuccess] = useState(success);
  const [successExpired, setSuccessExpired] = useState(false);
  if (success !== prevSuccess) {
    setPrevSuccess(success);
    setSuccessExpired(false);
  }
  useEffect(() => {
    if (!success || successExpired) return;
    const t = window.setTimeout(() => setSuccessExpired(true), SUCCESS_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [success, successExpired]);
  const showSuccess = Boolean(success) && !successExpired;

  // Cmd/Ctrl+S → trigger save while dirty.
  useEffect(() => {
    if (!dirty || saving) return;
    const handler = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S");
      if (!isSave) return;
      e.preventDefault();
      void onSave();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, saving, onSave]);

  // beforeunload — warn the user before navigating away with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const visible = dirty || Boolean(error) || showSuccess;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={copy.region}
      className={
        visible
          ? "sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] z-30 pt-1 lg:bottom-4 bz-fade-in"
          : undefined
      }
    >
      {visible && (
        <div
          style={{
            background: "#FAFAFA",
            border: "1px solid #EDEDED",
            borderRadius: 16,
            boxShadow: "0 12px 32px -8px rgba(10,10,10,0.18)",
          }}
        >
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 flex-wrap">
            {/* The message may wrap on phones (it used to truncate to
                "Kaydedilme…"); the buttons then drop to their own line. */}
            <div className="flex min-w-0 flex-1 basis-[180px] items-center gap-2">
              <span
                aria-hidden="true"
                className="shrink-0"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: error ? "#DC2626" : dirty ? "#C6F24E" : "#16A34A",
                }}
              />
              <span className="bz-mono text-[12px] text-[#0A0A0A] sm:truncate">
                {error ? error : dirty ? (dirtyLabel ?? copy.dirty) : success}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onReset}
                disabled={!dirty || saving}
                className="bz-btn-ghost inline-flex min-h-[44px] items-center gap-1.5 sm:min-h-[36px]"
                style={{ padding: "0 14px", borderRadius: 999, fontSize: 13 }}
              >
                <RotateCcw size={14} aria-hidden="true" />
                {resetLabel ?? copy.reset}
              </button>
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={!dirty || saving}
                className="bz-btn-primary inline-flex min-h-[44px] items-center gap-1.5 sm:min-h-[36px]"
                style={{ padding: "0 16px", borderRadius: 999, fontSize: 13 }}
                aria-keyshortcuts="Meta+S Control+S"
              >
                {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {saveLabel ?? copy.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnsavedChangesBar;
