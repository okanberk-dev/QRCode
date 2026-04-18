// src/components/marketing/ContactFloat.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export function ContactFloat({ locale }: { locale: string }) {
  return (
    <Link
      href={`/${locale}/contact`}
      aria-label={locale === 'tr' ? 'Destek al' : 'Get support'}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center
                 rounded-full bg-[#FDBF1D] border-3 border-[#1F1E1D] shadow-[4px_4px_0_0_#1F1E1D] 
                 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#1F1E1D]
                 focus:outline-none focus:ring-4 focus:ring-[#FDBF1D]/50 active:translate-y-1 active:shadow-none"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.87 9.87 0 01-4-.83L3 21l1.9-5.1C3.7 14.73 3 13.43 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          stroke="#1F1E1D"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
