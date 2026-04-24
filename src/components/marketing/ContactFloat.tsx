// src/components/marketing/ContactFloat.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ContactFloat({ locale }: { locale: string }) {
  const pathname = usePathname();
  const base = `/${locale}`;
  const current = pathname.replace(/\/+$/, '') || '/';

  if (current === base || current.startsWith(`${base}/auth`) || current === `${base}/onboarding`) {
    return null;
  }

  return (
    <Link
      href={`/${locale}/contact`}
      aria-label={locale === 'tr' ? 'Destek al' : 'Get support'}
      className="fixed right-4 bottom-[88px] md:right-6 md:bottom-6 z-50 flex h-14 w-14 items-center justify-center
                 rounded-full bg-[#C6F24E] border-3 border-[#0A0A0A] shadow-md
                 transition-all hover:-translate-y-1 hover:shadow-md
                 focus:outline-none focus:ring-4 focus:ring-[#C6F24E]/50 active:translate-y-1 active:shadow-none"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path
          d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.87 9.87 0 01-4-.83L3 21l1.9-5.1C3.7 14.73 3 13.43 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          stroke="#0A0A0A"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
