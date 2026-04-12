'use client';

import { Menu, X, Globe } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';

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
    // Replace current locale prefix with the other one
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    document.cookie = `NEXT_LOCALE=${otherLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.push(newPath);
    });
    setLangMenuOpen(false);
  };

  const base = `/${locale}`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-gray-100 h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href={`${base}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-[#111827]">
            <span className="text-[#FDBF1D] font-black text-xl leading-none">B</span>
          </div>
          <span className="text-xl font-black tracking-tight text-[#111827]">Buaze</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          <Link href={`${base}/#how-it-works`} className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">{t.nav_howItWorks}</Link>
          <Link href={`${base}/about`} className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">{t.nav_about}</Link>
          <Link href={`${base}/pricing`} className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">{t.nav_pricing}</Link>
          <Link href={`${base}/contact`} className="text-sm font-bold text-gray-500 hover:text-[#111827] transition-colors">{t.nav_contact}</Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-all"
              aria-label="Switch language"
            >
              <Globe size={16} />
              <span>{locale.toUpperCase()}</span>
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl p-1 min-w-[100px] z-50">
                <button
                  onClick={switchLocale}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span>{otherLocale === 'tr' ? '🇹🇷' : '🇬🇧'}</span>
                  <span>{otherLocale.toUpperCase()}</span>
                </button>
              </div>
            )}
          </div>

          <Link
            href={`${base}/auth/login`}
            className="hidden sm:block px-5 py-2.5 text-sm font-extrabold text-gray-700 hover:text-[#111827] transition-colors"
          >
            {t.nav_login}
          </Link>
          <Link
            href={`${base}/auth/register`}
            className="px-5 py-2.5 text-sm font-extrabold bg-[#FDBF1D] hover:bg-[#EAB308] text-[#111827] rounded-lg transition-all shadow-sm shadow-yellow-200"
          >
            {t.nav_register}
          </Link>
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-5 z-[99] shadow-xl">
          <Link href={`${base}/#how-it-works`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">{t.nav_howItWorks}</Link>
          <Link href={`${base}/about`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">{t.nav_about}</Link>
          <Link href={`${base}/pricing`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">{t.nav_pricing}</Link>
          <Link href={`${base}/contact`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">{t.nav_contact}</Link>
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
            <Link href={`${base}/auth/login`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700">{t.nav_login}</Link>
          </div>
          <button
            onClick={switchLocale}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#111827]"
          >
            <Globe size={16} />
            {otherLocale === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
          </button>
        </div>
      )}
    </nav>
  );
}
