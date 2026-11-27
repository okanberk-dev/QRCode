'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useMenuCopy } from './useMenuCopy';

/**
 * Where the builder's saves stand (spec §5.5, G4). Inline edits are silent —
 * this line is their feedback: "● Canlı" / "Taslak" at rest, "Kaydediliyor…"
 * while requests are in flight, "Kaydedildi · canlı" for 2.5 s after the last
 * success, "Kaydedilemedi" (+ a button to the failed row), "Çevrimdışı".
 * Priority: offline > error > saving > saved > idle.
 *
 * The text is a `role="status"` paragraph; the transient "Geri al" is a
 * separate button next to it (never `aria-live` on a button).
 */

const SAVED_MS = 2500;
const UNDO_MS = 8000;

export interface SaveIndicatorProps {
  variant: 'desktop' | 'compact';
  published: boolean;
  /** Requests in flight. */
  pending: number;
  /** Time of the last successful save (ms), or null. */
  savedAt: number | null;
  error: { message: string; itemId?: string } | null;
  online: boolean;
  lastSilentUndo: { id: string; at: number } | null;
  onUndo: (id: string) => void;
  onJumpToError: () => void;
}

/** True for `ms` after `at` changes (re-renders itself when the time is up). */
function useFresh(at: number | null, ms: number): boolean {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (at === null) {
      setFresh(false);
      return;
    }
    const left = at + ms - Date.now();
    if (left <= 0) {
      setFresh(false);
      return;
    }
    setFresh(true);
    const timer = window.setTimeout(() => setFresh(false), left);
    return () => window.clearTimeout(timer);
  }, [at, ms]);
  return fresh;
}

export function SaveIndicator({
  variant, published, pending, savedAt, error, online, lastSilentUndo, onUndo, onJumpToError,
}: SaveIndicatorProps) {
  const copy = useMenuCopy();
  const justSaved = useFresh(savedAt, SAVED_MS);
  const undoFresh = useFresh(lastSilentUndo?.at ?? null, UNDO_MS);
  const compact = variant === 'compact';

  let icon: React.ReactNode;
  let text: string;
  let tone = 'text-[#525252]';
  if (!online) {
    icon = <span className="h-2 w-2 shrink-0 rounded-full bg-[#D97706]" aria-hidden="true" />;
    text = copy.save.offline;
    tone = 'text-[#92400E]';
  } else if (error) {
    icon = <AlertCircle size={14} strokeWidth={2} className="shrink-0 text-[#DC2626]" aria-hidden="true" />;
    text = copy.save.error;
    tone = 'text-[#991B1B]';
  } else if (pending > 0) {
    icon = <Loader2 size={14} className="shrink-0 animate-spin" aria-hidden="true" />;
    text = copy.save.saving;
  } else if (justSaved) {
    icon = <Check size={14} strokeWidth={2.5} className="shrink-0 text-[#16A34A]" aria-hidden="true" />;
    text = published && !compact ? copy.save.savedLive : copy.save.saved;
  } else {
    icon = (
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${published ? 'bg-[#16A34A]' : 'bg-[#A3A3A3]'}`}
        aria-hidden="true"
      />
    );
    text = published ? copy.save.live : copy.save.draft;
  }
  // Phones show only the spinner while saving (the chip bar is narrow).
  const hideText = compact && online && !error && pending > 0;

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      <p
        role="status"
        aria-live="polite"
        className={`inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium ${tone}`}
      >
        {icon}
        <span className={hideText ? 'sr-only' : 'truncate'}>{text}</span>
      </p>
      {error && online && error.itemId && (
        <button
          type="button"
          onClick={onJumpToError}
          className="min-h-11 text-[13px] font-medium text-[#991B1B] underline underline-offset-2 pointer-fine:min-h-8"
        >
          {copy.save.showError}
        </button>
      )}
      {undoFresh && lastSilentUndo && !error && pending === 0 && (
        <button
          type="button"
          onClick={() => onUndo(lastSilentUndo.id)}
          className="min-h-11 text-[13px] font-medium text-pn-ink underline underline-offset-2 pointer-fine:min-h-8"
        >
          {copy.save.undo}
        </button>
      )}
    </div>
  );
}
