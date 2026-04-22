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
    primary:   `${base} bg-[#FF9A14] text-[#0F2348] border-[2.5px] border-[#0F2348] shadow-[4px_5px_0_0_#0F2348] hover:shadow-[5px_6px_0_0_#0F2348] hover:-translate-y-0.5 focus:ring-[#FF9A14]/40`,
    secondary: `${base} bg-white text-[#0F2348] border-[2.5px] border-[#0F2348] shadow-[4px_5px_0_0_#0F2348] hover:bg-[#FF9A14] focus:ring-[#0F2348]/10`,
    dark:      `${base} bg-[#0F2348] text-white border-[2.5px] border-[#0F2348] shadow-[4px_5px_0_0_#FF9A14] hover:shadow-[5px_6px_0_0_#FF9A14] hover:-translate-y-0.5 focus:ring-[#0F2348]/40`,
  };

  return (
    <Link href={href} className={`${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}
