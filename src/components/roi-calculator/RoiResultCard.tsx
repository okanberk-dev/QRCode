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
      className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm border-l-4 border-l-[#FDBF1D] transition-all duration-300 hover:shadow-md"
      role="region"
      aria-label={label}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg
                       bg-[#1F1E1D] text-[11px] font-bold text-[#FDBF1D] shadow-sm"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6b6760]">
            {label}
          </span>
        </div>
        {badge && (
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest
              ${badgeVariant === 'accent'
                ? 'bg-[#EA580C]/10 text-[#EA580C] border border-[#EA580C]/20'
                : 'bg-[#FDBF1D]/20 text-[#B38A00] border border-[#FDBF1D]/30'
              }`}
          >
            {badge}
          </span>
        )}
      </div>
 
      <div className="min-h-[4rem] flex flex-col justify-center">
        {isEmpty ? (
          <div className="flex flex-col gap-2 py-1">
            <div className="h-4 w-24 rounded animate-pulse bg-gray-50" />
            <p className="text-[13px] text-gray-400 font-medium italic leading-relaxed">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
