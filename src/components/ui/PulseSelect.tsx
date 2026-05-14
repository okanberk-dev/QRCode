"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Pulse-styled select replacement (panel scope).
 *
 * Native `<select>` cevap vermesi gereken iki şikayetin ortak çözümü:
 *   1. iOS Safari + Chrome native chevron text üstüne biner; "Tüm şubeler"
 *      gibi orta-uzun label'lar truncate görünür.
 *   2. Native `<select>` Pulse lime focus / hover state veremez —
 *      operating-system styled.
 *
 * Davranış: keyboard-friendly listbox (Enter/Space/ArrowUp/ArrowDown/Esc),
 * outside-click kapanma, focus trap yok (popover, modal değil),
 * aria-activedescendant pattern. Trigger `bz-input` border + lime focus ring,
 * options Pulse pill'i (lime tint highlight + tick icon).
 *
 * No deps — pure React + Tailwind. <Toggle> ve <RadioCard>'la aynı disiplin.
 */
export interface PulseSelectOption {
  value: string;
  label: string;
}

interface PulseSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PulseSelectOption[];
  /** ARIA label (visible label varsa <Field> wrapper kullan). */
  ariaLabel?: string;
  /** Trigger min/max width — `min-w-[170px] max-w-[260px]` formatında. */
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PulseSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled = false,
  placeholder,
}: PulseSelectProps) {
  const triggerId = useId();
  const listboxId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  // Outside click + ESC kapanır.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Açıldığında current selected'a active focus.
  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = options[activeIndex];
      if (next) {
        onChange(next.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const triggerLabel = selected?.label ?? placeholder ?? "";

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="bz-input flex w-full items-center justify-between gap-2 h-11 sm:h-[34px] py-0 pr-2.5 text-[14px] sm:text-[13px] text-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`shrink-0 text-[#737373] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <>
          <div
            className="bz-menu-backdrop"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={popRef}
            role="listbox"
            id={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className="bz-menu bz-menu--sheet sm:absolute sm:left-0 sm:right-0 sm:mt-1.5 sm:min-w-[200px]"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-[12px] text-[#737373]">—</div>
            ) : (
              options.map((opt, idx) => {
                const isSel = opt.value === value;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={opt.value}
                    id={`${listboxId}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    data-active={isActive ? "true" : undefined}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className="bz-menu-item justify-between"
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSel && (
                      <Check size={13} strokeWidth={2.5} className="!text-[#A8D62E]" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PulseSelect;
