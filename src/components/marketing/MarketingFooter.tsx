'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/translations';

interface MarketingFooterProps {
  locale: Locale;
  t: {
    footer_about: string;
    footer_contact: string;
    footer_terms: string;
    footer_privacy: string;
    footer_cookie: string;
    footer_kvkk: string;
    footer_copyright: string;
    cta_badge1: string;
    cta_badge2: string;
  };
}

export default function MarketingFooter({ locale, t }: MarketingFooterProps) {
  const base = `/${locale}`;

  return (
    <footer className="bg-[#111827] py-20 px-6 text-white">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FDBF1D]">
            <span className="text-[#111827] font-black text-xl leading-none">B</span>
          </div>
          <span className="text-2xl font-black tracking-tight">Buaze</span>
        </div>

        {/* Nav Links */}
        <div className="flex flex-wrap gap-8 mb-12 justify-center font-bold text-sm">
          <Link href={`${base}/about`} className="text-gray-400 hover:text-white transition-colors">{t.footer_about}</Link>
          <Link href={`${base}/contact`} className="text-gray-400 hover:text-white transition-colors">{t.footer_contact}</Link>
          <Link href={`${base}/pricing`} className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
          <Link href={`${base}/terms`} className="text-gray-400 hover:text-white transition-colors">{t.footer_terms}</Link>
          <Link href={`${base}/privacy`} className="text-gray-400 hover:text-white transition-colors">{t.footer_privacy}</Link>
          <Link href={`${base}/cookie`} className="text-gray-400 hover:text-white transition-colors">{t.footer_cookie}</Link>
          {locale === 'tr' && (
            <Link href={`${base}/kvkk`} className="text-gray-400 hover:text-white transition-colors">KVKK</Link>
          )}
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 pb-8 select-none">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-gray-600 border border-gray-700 px-4 py-2 rounded-full">
            <span>✓</span> {t.cta_badge1}
          </div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-gray-600 border border-gray-700 px-4 py-2 rounded-full">
            <span>🔒</span> {t.cta_badge2}
          </div>
        </div>

        {/* Copyright */}
        <p className="text-gray-600 text-[10px] font-black pt-8 border-t border-gray-800 w-full text-center uppercase tracking-widest">
          © {new Date().getFullYear()} Buaze. {t.footer_copyright}
        </p>
      </div>
    </footer>
  );
}
