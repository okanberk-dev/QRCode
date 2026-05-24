"use client";

import { useEffect } from "react";
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
  /** Optional inline success label (e.g. "Kaydedildi"). */
  success?: string | null;
  /** Custom dirty label (defaults to "Kaydedilmemiş değişiklikler var"). */
  dirtyLabel?: string;
  saveLabel?: string;
  resetLabel?: string;
}

/**
 * Sticky save bar shown when a form is dirty.
 *
 * - `dirty=false` → fades out (`opacity-0 pointer-events-none`).
 * - Cmd/Ctrl+S → preventDefault + onSave.
 * - `beforeunload` → standard browser prompt while dirty.
 * - `aria-live="polite"` so SR users hear the dirty/saving state changes.
 *
 * Pulse 2026-04 styling — `bz-card-soft` background, safe-area inset on mobile.
 * z-30 sits below the mobile bottom nav (`z-40`).
 */
export function UnsavedChangesBar({
  dirty,
  saving = false,
  onSave,
  onReset,
  error,
  success,
  dirtyLabel = "Kaydedilmemiş değişiklikler var.",
  saveLabel = "Kaydet",
  resetLabel = "Geri al",
}: UnsavedChangesBarProps) {
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

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Kaydedilmemiş değişiklikler"
      className={`fixed inset-x-0 bottom-0 z-30 transition-all duration-200 ${
        dirty || success || error ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="mx-auto max-w-[1440px] m-3 sm:m-4"
        style={{
          background: "#FAFAFA",
          border: "1px solid #EDEDED",
          borderRadius: 16,
          boxShadow: "0 12px 32px -8px rgba(10,10,10,0.18)",
        }}
      >
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="shrink-0"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: dirty ? "#C6F24E" : success ? "#16A34A" : "#A3A3A3",
              }}
            />
            <span className="bz-mono text-[12px] truncate text-[#0A0A0A]">
              {error ? error : success ? success : dirtyLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onReset}
              disabled={!dirty || saving}
              className="bz-btn-ghost inline-flex items-center gap-1.5"
              style={{ height: 36, padding: "0 14px", borderRadius: 999, fontSize: 13 }}
            >
              <RotateCcw size={14} aria-hidden="true" />
              {resetLabel}
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!dirty || saving}
              className="bz-btn-primary inline-flex items-center gap-1.5"
              style={{ height: 36, padding: "0 16px", borderRadius: 999, fontSize: 13 }}
              aria-keyshortcuts="Meta+S Control+S"
            >
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesBar;
