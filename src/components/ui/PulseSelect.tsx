"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * **CLAUDE.md §23.3 + §40.3 — Portal disiplini** (Stage TBD §38.X): Dropdown
 * listbox `createPortal` ile `document.body`'ye render edilir. KPI card'lar
 * gibi `transform/opacity` ile stacking context yaratan sibling'ler dropdown'u
 * artık clip edemez. Mobile bottom-sheet (`.bz-menu--sheet`) media query
 * `!important` override'larıyla intact (position: fixed; top: auto; bottom:
 * 12px; etc.). Desktop fixed positioning trigger `getBoundingClientRect()`'ten
 * synchronously hesaplanır (open-click sırasında, ilk frame flash yok) +
 * scroll/resize listener'larıyla canlı tutulur. z-index: 80 (mobile sheet ile
 * parity).
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
  /** <Field> cloneElement ile id + aria-* enjekte eder; trigger'a uygulanmazsa
   *  <label htmlFor> boşa düşer ve hint/error ekran okuyucuya bağlanmaz. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  /** Görünür bir etiketin id'si (ariaLabel yerine). */
  "aria-labelledby"?: string;
}

export function PulseSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled = false,
  placeholder,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  "aria-labelledby": ariaLabelledBy,
}: PulseSelectProps) {
  const generatedId = useId();
  const triggerId = id || generatedId;
  const listboxId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // SSR-safe portal mount. `createPortal` document.body gerektirir; ilk
  // hydrate sonrası true olur, trigger butonu kendisi her durumda render
  // edilir (layout shift yok).
  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  // Trigger position'ı sync hesapla — open-click sırasında flash yok.
  // Scroll/resize sırasında canlı update için listener'lar ayrı useEffect'te.
  const computePos = () => {
    const t = triggerRef.current;
    if (!t) return;
    const rect = t.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6, // ~ mt-1.5
      left: rect.left,
      width: rect.width,
    });
  };

  // Outside click + ESC kapanır + scroll/resize position update.
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
    const onReposition = () => computePos();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    // `capture: true` — nested scrollable ancestor'larda da yakala.
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  // Açıldığında current selected'a active focus.
  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  const openMenu = () => {
    if (!open) computePos();
    setOpen(true);
  };

  const toggleMenu = () => {
    if (!open) computePos();
    setOpen((v) => !v);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
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

  // Dropdown content — open && mounted iken document.body'ye portal'lanır.
  // Mobile <640px: `.bz-menu--sheet` CSS rule'u `position: fixed !important`
  //   + `top: auto`, `bottom: 12px`, `left/right: 12px` ile inline style'ı
  //   override eder (bottom-sheet pattern, §40.3).
  // Desktop ≥640px: inline `style.top/left/minWidth` etkin, `position: fixed`
  //   (sm:fixed Tailwind class), z-index: 80 ile her stacking context'i
  //   geçer. KPI card transform stacking trap'i artık etkilemez.
  const dropdown =
    open && mounted ? (
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
          style={
            pos
              ? { top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 80 }
              : { zIndex: 80 }
          }
          className="bz-menu bz-menu--sheet sm:fixed sm:min-w-[200px]"
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
                    <Check size={13} strokeWidth={2.5} className="!text-pn-accent-ink" aria-hidden="true" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </>
    ) : null;

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
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        disabled={disabled}
        onClick={toggleMenu}
        onKeyDown={onTriggerKeyDown}
        className="bz-input flex w-full items-center justify-between gap-2 h-11 py-0 pr-3 text-[14px] text-pn-ink disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`shrink-0 text-[#737373] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

export default PulseSelect;
