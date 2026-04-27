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
}

export function Tabs({ items, active, onChange, className = "", ariaLabel }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = items.filter((it) => !it.disabled);
    if (!enabled.length) return;
    const currentIdx = enabled.findIndex((it) => it.id === items[idx].id);
    const nextIdx =
      e.key === "ArrowRight"
        ? (currentIdx + 1) % enabled.length
        : (currentIdx - 1 + enabled.length) % enabled.length;
    const nextId = enabled[nextIdx].id;
    onChange(nextId);
    refs.current[nextId]?.focus();
  };

  return (
    <div className={`bz-tabs ${className}`} role="tablist" aria-label={ariaLabel}>
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
            className="bz-tab"
            onClick={() => !it.disabled && onChange(it.id)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {it.label}
            {it.count !== undefined && (
              <span style={{ marginLeft: 6, color: "#A3A3A3", fontWeight: 500 }}>
                ({it.count})
              </span>
            )}
            {it.badge && <span style={{ marginLeft: 6 }}>{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
