'use client';

import { Menu, X, Globe } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';

interface MarketingNavbarProps {
  locale: Locale;
  t: {
    nav_howItWorks: string;
    nav_about: string;
    nav_pricing: string;
    nav_contact: string;
    nav_login: string;
    nav_register: string;
  };
}

export default function MarketingNavbar({ locale, t }: MarketingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale: Locale = locale === 'tr' ? 'en' : 'tr';

  const switchLocale = () => {
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    document.cookie = `NEXT_LOCALE=${otherLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.push(newPath);
    });
    setLangMenuOpen(false);
  };

  const base = `/${locale}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100/60 h-[64px]">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo + Brand Name */}
        <Link href={`${base}`} className="flex items-center gap-2 group">
          <BuazeLogo size={30} />
          <span className="text-[19px] font-extrabold tracking-[-0.02em] text-[#111827]">
            buaze
            <span className="text-[#FDBF1D]">.</span>
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-7">
          <Link href={`${base}/#how-it-works`} className="text-[13px] font-medium text-gray-500 hover:text-[#111827] transition-colors">{t.nav_howItWorks}</Link>
          <Link href={`${base}/about`} className="text-[13px] font-medium text-gray-500 hover:text-[#111827] transition-colors">{t.nav_about}</Link>
          <Link href={`${base}/pricing`} className="text-[13px] font-medium text-gray-500 hover:text-[#111827] transition-colors">{t.nav_pricing}</Link>
          <Link href={`${base}/contact`} className="text-[13px] font-medium text-gray-500 hover:text-[#111827] transition-colors">{t.nav_contact}</Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-gray-400 hover:text-[#111827] hover:bg-gray-50 transition-all"
              aria-label="Switch language"
            >
              <Globe size={14} />
              <span>{locale.toUpperCase()}</span>
            </button>
            {langMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl p-1 min-w-[100px] z-50">
                  <button
                    onClick={switchLocale}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <span>{otherLocale === 'tr' ? '🇹🇷' : '🇬🇧'}</span>
                    <span>{otherLocale === 'tr' ? 'Türkçe' : 'English'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <Link
            href={`${base}/auth/login`}
            className="hidden sm:block px-4 py-1.5 text-[13px] font-medium text-gray-500 hover:text-[#111827] transition-colors"
          >
            {t.nav_login}
          </Link>
          <Link
            href={`${base}/auth/register`}
            className="px-4 py-2 text-[13px] font-semibold bg-[#111827] hover:bg-[#1f2937] text-white rounded-lg transition-all active:scale-95"
          >
            {t.nav_register}
          </Link>
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[98]" onClick={() => setMobileMenuOpen(false)} />
          <div className="md:hidden absolute top-[64px] left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-1 z-[99] shadow-xl">
            <Link href={`${base}/#how-it-works`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors">{t.nav_howItWorks}</Link>
            <Link href={`${base}/about`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors">{t.nav_about}</Link>
            <Link href={`${base}/pricing`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors">{t.nav_pricing}</Link>
            <Link href={`${base}/contact`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors">{t.nav_contact}</Link>
            <div className="pt-3 mt-2 border-t border-gray-100 space-y-1">
              <Link href={`${base}/auth/login`} onClick={() => setMobileMenuOpen(false)} className="block text-[15px] font-medium text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-50">{t.nav_login}</Link>
            </div>
            <button
              onClick={() => { switchLocale(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 text-[13px] font-medium text-gray-400 hover:text-[#111827] py-3 px-2 mt-2"
            >
              <Globe size={15} />
              {otherLocale === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
            </button>
          </div>
        </>
      )}
    </nav>
  );
}
