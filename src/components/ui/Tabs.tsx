"use client";

import { KeyboardEvent, ReactNode, useRef } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
  count?: number | string;
  badge?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  variant?: "horizontal" | "vertical";
}

export function Tabs({
  items,
  active,
  onChange,
  className = "",
  ariaLabel,
  variant = "horizontal",
}: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const isVertical = variant === "vertical";
    const nextKey = isVertical ? "ArrowDown" : "ArrowRight";
    const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";
    if (e.key !== nextKey && e.key !== prevKey) return;
    e.preventDefault();
    const enabled = items.filter((it) => !it.disabled);
    if (!enabled.length) return;
    const currentIdx = enabled.findIndex((it) => it.id === items[idx].id);
    const nextIdx =
      e.key === nextKey
        ? (currentIdx + 1) % enabled.length
        : (currentIdx - 1 + enabled.length) % enabled.length;
    const nextId = enabled[nextIdx].id;
    onChange(nextId);
    refs.current[nextId]?.focus();
  };

  const containerClass = variant === "vertical" ? "bz-tabs-vertical" : "bz-tabs";
  const tabClass = variant === "vertical" ? "bz-tab-vertical" : "bz-tab";
  const ariaOrientation = variant === "vertical" ? "vertical" : "horizontal";

  return (
    <div
      className={`${containerClass} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={ariaOrientation}
    >
      {items.map((it, idx) => {
        const selected = it.id === active;
        return (
          <button
            key={it.id}
            ref={(el) => {
              refs.current[it.id] = el;
            }}
            type="button"
            role="tab"
            tabIndex={selected ? 0 : -1}
            aria-selected={selected}
            disabled={it.disabled}
            className={tabClass}
            onClick={() => !it.disabled && onChange(it.id)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {it.label}
            {it.count !== undefined && (
              <span className="pn-tab-count">{it.count}</span>
            )}
            {it.badge && <span className="ml-1.5">{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
