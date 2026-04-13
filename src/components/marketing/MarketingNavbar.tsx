'use client';

import { Menu, X, Globe, ChevronDown } from 'lucide-react';
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
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/40 backdrop-blur-xl border-b border-white/20 h-[64px] shadow-sm">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href={`${base}`} className="flex items-center gap-2 group">
          <BuazeLogo size={28} />
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-[#1f1e1d]">
            buaze<span className="text-[#FDBF1D]">.</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          <Link href={`${base}/#how-it-works`} className="text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors">{t.nav_howItWorks}</Link>
          <Link href={`${base}/about`} className="text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors">{t.nav_about}</Link>
          <Link href={`${base}/pricing`} className="text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors">{t.nav_pricing}</Link>
          <Link href={`${base}/contact`} className="text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors">{t.nav_contact}</Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#ada89f] hover:text-[#1f1e1d] hover:bg-[#F7F4F0] transition-all"
              aria-label="Switch language"
            >
              <Globe size={13} />
              <span>{locale.toUpperCase()}</span>
            </button>
            {langMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white border border-[#e8e4de] rounded-lg shadow-lg p-1 min-w-[110px] z-50">
                  <button
                    onClick={switchLocale}
                    className="w-full text-left px-3.5 py-2.5 rounded-md text-[13px] font-medium hover:bg-[#F7F4F0] transition-colors flex items-center gap-2"
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
            className="hidden sm:inline-flex px-4 py-2 text-[14px] font-bold text-[#6b6760] hover:text-[#1f1e1d] transition-colors"
          >
            {t.nav_login}
          </Link>
          <Link
            href={`${base}/auth/register`}
            className="px-5 py-2 text-[14px] font-extrabold bg-[#ea580c] text-white rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_3px_0_0_#1f1e1d] hover:bg-[#c2410c] active:translate-y-[3px] active:shadow-none transition-all"
          >
            {t.nav_register}
          </Link>
          <button
            className="md:hidden p-2 text-[#1f1e1d] hover:bg-[#F7F4F0] rounded-md transition-colors ml-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 z-[98]" onClick={() => setMobileMenuOpen(false)} />
          <div className="md:hidden absolute top-[64px] left-0 right-0 bg-white border-b border-[#e8e4de] p-5 flex flex-col gap-0.5 z-[99] shadow-lg">
            <Link href={`${base}/#how-it-works`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors">{t.nav_howItWorks}</Link>
            <Link href={`${base}/about`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors">{t.nav_about}</Link>
            <Link href={`${base}/pricing`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors">{t.nav_pricing}</Link>
            <Link href={`${base}/contact`} onClick={() => setMobileMenuOpen(false)} className="text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors">{t.nav_contact}</Link>
            <div className="pt-3 mt-2 border-t border-[#e8e4de] space-y-0.5">
              <Link href={`${base}/auth/login`} onClick={() => setMobileMenuOpen(false)} className="block text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0]">{t.nav_login}</Link>
            </div>
            <button
              onClick={() => { switchLocale(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 text-[13px] font-medium text-[#ada89f] hover:text-[#1f1e1d] py-3 px-3 mt-1"
            >
              <Globe size={14} />
              {otherLocale === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
            </button>
          </div>
        </>
      )}
    </nav>
  );
}
