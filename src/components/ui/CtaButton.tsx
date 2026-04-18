// src/components/ui/CtaButton.tsx
import React from 'react';
import Link from 'next/link';

interface Props {
  variant:   'primary' | 'secondary' | 'dark';
  href:      string;
  children:  React.ReactNode;
  className?: string;
}

export function CtaButton({ variant, href, children, className = '' }: Props) {
  const base = 'inline-flex items-center justify-center rounded-xl px-8 py-4 text-[13px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-4 active:translate-y-1 active:shadow-none';

  const styles = {
    primary:   `${base} bg-[#FDBF1D] text-[#1F1E1D] border-3 border-[#1F1E1D] shadow-[0_5px_0_0_#EA580C] hover:opacity-95 focus:ring-[#FDBF1D]/50`,
    secondary: `${base} bg-white text-[#1F1E1D] border-3 border-[#1F1E1D] shadow-[0_5px_0_0_#1F1E1D] hover:bg-[#FDBF1D] focus:ring-[#FDBF1D]/20`,
    dark:      `${base} bg-[#111827] text-white border-3 border-[#1F1E1D] shadow-[0_5px_0_0_#000000] hover:bg-[#1F1E1D] focus:ring-gray-800`,
  };

  return (
    <Link href={href} className={`${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
