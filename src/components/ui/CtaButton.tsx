import React from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost';

interface Props {
  variant: Variant;
  href: string;
  children: React.ReactNode;
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center rounded-xl px-6 py-3 text-[14px] font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]';

const STYLES: Record<Variant, string> = {
  // Gold — attention-grabbing primary CTA (brand guide "İkincil Buton")
  primary: 'bg-[#F4B400] text-[#1A2332] shadow-sm hover:bg-[#E0A200] hover:shadow-md focus:ring-[#F4B400]/40',
  // Ghost — subtle card-like button (brand guide "Ghost Buton")
  secondary: 'bg-white text-[#1A2332] border border-[#E8ECF2] shadow-sm hover:border-[#1A2332] hover:shadow-md focus:ring-[#1A2332]/40',
  // Dark — dominant CTA on light backgrounds (brand guide "Birincil Buton")
  dark: 'bg-[#1A2332] text-white shadow-sm hover:bg-[#0E1525] hover:shadow-md focus:ring-[#1A2332]/40',
  // Ghost — transparent, text-only with hover wash
  ghost: 'bg-transparent text-[#1A2332] hover:bg-[#F8F6F1] focus:ring-[#1A2332]/15',
};

export function CtaButton({ variant, href, children, className = '' }: Props) {
  return (
    <Link href={href} className={`${BASE} ${STYLES[variant]} ${className}`}>
      {children}
    </Link>
  );
}
