import React from 'react';
import Link from 'next/link';

interface Props {
  variant: 'primary' | 'secondary' | 'dark';
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function CtaButton({ variant, href, children, className = '' }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-[13px] font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-0 active:scale-[0.98]';

  const styles = {
    primary: `${base} bg-[#F4B400] text-[#1A2332] shadow-sm hover:bg-[#D69E00] hover:shadow-md focus:ring-[#F4B400]/30`,
    secondary: `${base} bg-white text-[#1A2332] border border-[#E8ECF2] shadow-sm hover:border-[#1A2332] hover:shadow-md focus:ring-[#1A2332]/15`,
    dark: `${base} bg-[#1A2332] text-white shadow-sm hover:bg-[#0E1525] hover:shadow-md focus:ring-[#1A2332]/30`,
  };

  return (
    <Link href={href} className={`${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
