// src/components/roi-calculator/RoiResultCard.tsx
'use client';

import type { ReactNode } from 'react';

interface Props {
  label:    string;
  children: ReactNode;
  badge?:   string;
  badgeColor?: 'primary' | 'accent';
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function RoiResultCard({
  label,
  children,
  badge,
  badgeColor = 'primary',
  isEmpty = false,
  emptyMessage,
}: Props) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3
                 backdrop-blur-sm transition-all duration-200"
      role="region"
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          {label}
        </span>
        {badge && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide
              ${badgeColor === 'accent'
                ? 'bg-[#EA580C]/20 text-[#EA580C]'
                : 'bg-[#FDBF1D]/20 text-[#FDBF1D]'
              }`}
          >
            {badge}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm text-white/30 italic">{emptyMessage}</p>
      ) : (
        <div className="text-white">{children}</div>
      )}
    </div>
  );
}
