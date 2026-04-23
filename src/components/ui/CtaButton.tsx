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
  primary: 'bg-[#C6F24E] text-[#0A0A0A] shadow-sm hover:bg-[#E0A200] hover:shadow-md focus:ring-[#C6F24E]/40',
  // Ghost — subtle card-like button (brand guide "Ghost Buton")
  secondary: 'bg-white text-[#0A0A0A] border border-[#EDEDED] shadow-sm hover:border-[#0A0A0A] hover:shadow-md focus:ring-[#0A0A0A]/40',
  // Dark — dominant CTA on light backgrounds (brand guide "Birincil Buton")
  dark: 'bg-[#0A0A0A] text-white shadow-sm hover:bg-[#000000] hover:shadow-md focus:ring-[#0A0A0A]/40',
  // Ghost — transparent, text-only with hover wash
  ghost: 'bg-transparent text-[#0A0A0A] hover:bg-[#FFFFFF] focus:ring-[#0A0A0A]/15',
};

export function CtaButton({ variant, href, children, className = '' }: Props) {
  return (
    <Link href={href} className={`${BASE} ${STYLES[variant]} ${className}`}>
      {children}
    </Link>
  );
}
