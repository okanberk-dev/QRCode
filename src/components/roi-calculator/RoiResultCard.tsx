// src/components/roi-calculator/RoiResultCard.tsx
'use client';

import type { ReactNode } from 'react';

interface Props {
  label:        string;
  icon:         string;
  children:     ReactNode;
  badge?:       string;
  badgeVariant?: 'primary' | 'accent';
  isEmpty?:     boolean;
  emptyMessage?: string;
}

export function ResultCard({
  label, icon, children, badge, badgeVariant = 'primary', isEmpty, emptyMessage,
}: Props) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 transition-all duration-150"
      role="region"
      aria-label={label}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md
                       bg-[#1F1E1D] text-[10px] text-[#FDBF1D]"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {label}
          </span>
        </div>
        {badge && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide
              ${badgeVariant === 'accent'
                ? 'bg-[#EA580C]/10 text-[#EA580C]'
                : 'bg-[#FDBF1D]/20 text-[#B38A00]'
              }`}
          >
            {badge}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="flex items-center gap-2 py-1">
          <div className="h-6 w-16 rounded animate-pulse bg-gray-100" />
          <p className="text-xs text-gray-300 italic truncate">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
