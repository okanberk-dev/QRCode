'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Pencil } from 'lucide-react';
import { useMenuCopy } from '../kit/useMenuCopy';
import { ROW_ARIA_KEYS } from '../menu-keys';

/** The closest row focus button or ⋯ trigger around `from`, so focus never falls to <body>. */
function nearestRowControl(from: HTMLElement | null): HTMLElement | null {
  for (let el = from?.parentElement ?? null; el; el = el.parentElement) {
    const target = el.querySelector<HTMLElement>('[data-row-focus], [aria-haspopup="menu"]:not([disabled])');
    if (target) return target;
  }
  return null;
}

/**
 * Click-to-rename text (item names on fine pointers, category names).
 * Enter / blur commit, Esc cancels and returns focus to the display button,
 * Tab commits and moves on (`onTabNext`). Composition (IME) keys are left
 * alone. An unchanged value sends nothing. Validation errors stay under the
 * input (`role="alert"`); the save itself is optimistic and silent — a failed
 * save puts the old text back and the SaveIndicator / row says so.
 *
 * `editable=false` renders a plain button (`onDisplayClick`, e.g. open the item
 * on touch) or plain text. `showButtons` adds 44 px Kaydet / Vazgeç (touch
 * rename opened from the ⋯ menu).
 */
export function InlineText({
  value, label, onCommit, validate, required = true, maxLength, editable, displayId, rowFocus,
  displayClassName, inputClassName = '', onDisplayClick, displayAriaLabel, registerOpen, showButtons,
  onEditingChange, onTabNext, multiline = false,
}: {
  value: string;
  /** Field name for the edit button's label ("Ürün adı: Ayran. Düzenle"). */
  label: string;
  onCommit: (next: string) => void;
  validate?: (next: string) => string | null;
  required?: boolean;
  maxLength: number;
  editable: boolean;
  displayId?: string;
  rowFocus?: boolean;
  displayClassName: string;
  inputClassName?: string;
  onDisplayClick?: () => void;
  displayAriaLabel?: string;
  registerOpen?: (open: () => void) => () => void;
  showButtons?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onTabNext?: () => void;
  multiline?: boolean;
}) {
  const copy = useMenuCopy();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const displayRef = useRef<HTMLButtonElement | null>(null);
  /** Plain-text display (opened from a menu): focus returns to the nearest row control instead. */
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const closing = useRef(false);
  const errorId = useId();

  const open = () => {
    setDraft(value);
    setError(null);
    closing.current = false;
    setEditing(true);
  };
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => (registerOpen ? registerOpen(() => openRef.current()) : undefined), [registerOpen]);
  useEffect(() => onEditingChange?.(editing), [editing, onEditingChange]);
  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    el?.focus();
    el?.select();
  }, [editing]);

  const close = (focusDisplay: boolean) => {
    closing.current = true;
    setEditing(false);
    setError(null);
    if (focusDisplay) requestAnimationFrame(() => (displayRef.current ?? nearestRowControl(spanRef.current))?.focus());
  };

  /** Returns true when the editor closed. */
  const commit = (focusDisplay: boolean): boolean => {
    const next = draft.replace(/\s+/g, ' ').trim();
    if (next === value.trim()) {
      close(focusDisplay);
      return true;
    }
    const message = !next && required ? copy.inline.required : validate?.(next) ?? null;
    if (message) {
      setError(message);
      return false;
    }
    close(focusDisplay);
    onCommit(next);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit(true);
    } else if (e.key === 'Tab' && !e.shiftKey && onTabNext) {
      if (commit(false)) {
        e.preventDefault();
        onTabNext();
      } else e.preventDefault();
    }
  };

  if (editing) {
    const shared = {
      value: draft,
      maxLength,
      'aria-label': label,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
      onKeyDown,
      onBlur: () => {
        if (closing.current) return;
        if (!commit(false)) close(false);
      },
    };
    return (
      <div className="min-w-0 flex-1">
        {multiline ? (
          <textarea
            {...shared}
            ref={(el) => {
              inputRef.current = el;
            }}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            className={`bz-input min-h-[64px] resize-none py-1.5 ${inputClassName}`}
          />
        ) : (
          <input
            {...shared}
            ref={(el) => {
              inputRef.current = el;
            }}
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
            className={`bz-input h-9 py-1.5 pointer-coarse:h-11 ${inputClassName}`}
          />
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-[12px] text-[#DC2626]">
            {error}
          </p>
        )}
        {showButtons && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(true)}
              className="bz-btn-primary min-h-11 pointer-fine:min-h-8"
            >
              {copy.inline.save}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => close(true)}
              className="bz-btn-ghost min-h-11 pointer-fine:min-h-8"
            >
              {copy.inline.cancel}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!editable && !onDisplayClick) {
    return (
      <span ref={spanRef} className={displayClassName}>
        {value}
      </span>
    );
  }

  return (
    <button
      ref={displayRef}
      id={displayId}
      type="button"
      data-row-focus={rowFocus ? '' : undefined}
      aria-keyshortcuts={rowFocus ? ROW_ARIA_KEYS : undefined}
      onClick={editable ? open : onDisplayClick}
      aria-label={editable ? copy.inline.editLabel(label, value) : displayAriaLabel}
      className={`group/inline inline-flex max-w-full min-w-0 items-start gap-1.5 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent ${
        editable ? 'cursor-text hover:bg-pn-canvas' : ''
      }`}
    >
      <span className={displayClassName}>{value}</span>
      {editable && (
        <Pencil
          size={12}
          strokeWidth={2}
          aria-hidden="true"
          className="mt-1 shrink-0 text-[#A3A3A3] opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
        />
      )}
    </button>
  );
}
