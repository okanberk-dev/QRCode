'use client';

import { 
  Menu, X, Globe, ChevronDown, Utensils, BedDouble, HeartPulse, BookOpen, 
  Stethoscope, Sparkles, PawPrint, Home, Car, Scissors, Dumbbell, Scale, GraduationCap, Bed 
} from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';

interface MarketingNavbarProps {
  locale: Locale;
  t: {
    nav_howItWorks: string;
    nav_learn_features: string;
    nav_learn_blog: string;
    nav_solutions: string;
    nav_sol_restaurants: string;
    nav_sol_hotels: string;
    nav_sol_healthcare: string;
    nav_about: string;
    nav_blog: string;
    nav_pricing: string;
    nav_contact: string;
    nav_login: string;
    nav_register: string;
    // New solutions labels
    sol_den_title: string;
    sol_aes_title: string;
    sol_vet_title: string;
    sol_rea_title: string;
    sol_aut_title: string;
    sol_be_title: string;
    sol_gym_title: string;
    sol_law_title: string;
    sol_sch_title: string;
    sol_bou_title: string;
  };
}

export default function MarketingNavbar({ locale, t }: MarketingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [mobileLearnOpen, setMobileLearnOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const solutionsRef = useRef<HTMLDivElement>(null);
  const learnRef = useRef<HTMLDivElement>(null);
  const solutionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const learnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const solutionCategories = [
    {
      title: locale === 'tr' ? 'Hizmet & Turizm' : 'Hospitality',
      items: [
        {
          href: `${base}/solutions/restaurants`,
          icon: <Utensils size={16} />,
          label: t.nav_sol_restaurants,
          color: 'text-[#ea580c]',
          bgColor: 'bg-[#ea580c]/10',
        },
        {
          href: `${base}/solutions/hotels`,
          icon: <BedDouble size={16} />,
          label: t.nav_sol_hotels,
          color: 'text-[#FDBF1D]',
          bgColor: 'bg-[#FDBF1D]/10',
        },
        {
          href: `${base}/solutions/boutique-hotels`,
          icon: <Bed size={16} />,
          label: t.sol_bou_title,
          color: 'text-[#ea580c]',
          bgColor: 'bg-[#ea580c]/10',
        },
      ]
    },
    {
      title: locale === 'tr' ? 'Sağlık & Bakım' : 'Healthcare',
      items: [
        {
          href: `${base}/solutions/healthcare`,
          icon: <HeartPulse size={16} />,
          label: t.nav_sol_healthcare,
          color: 'text-[#10b981]',
          bgColor: 'bg-[#10b981]/10',
        },
        {
          href: `${base}/solutions/dentists`,
          icon: <Stethoscope size={16} />,
          label: t.sol_den_title,
          color: 'text-[#3b82f6]',
          bgColor: 'bg-[#3b82f6]/10',
        },
        {
          href: `${base}/solutions/aesthetic`,
          icon: <Sparkles size={16} />,
          label: t.sol_aes_title,
          color: 'text-[#ec4899]',
          bgColor: 'bg-[#ec4899]/10',
        },
        {
          href: `${base}/solutions/veterinary`,
          icon: <PawPrint size={16} />,
          label: t.sol_vet_title,
          color: 'text-[#f59e0b]',
          bgColor: 'bg-[#f59e0b]/10',
        },
      ]
    },
    {
      title: locale === 'tr' ? 'Profesyonel Hizmetler' : 'Professional',
      items: [
        {
          href: `${base}/solutions/real-estate`,
          icon: <Home size={16} />,
          label: t.sol_rea_title,
          color: 'text-[#6366f1]',
          bgColor: 'bg-[#6366f1]/10',
        },
        {
          href: `${base}/solutions/law-firms`,
          icon: <Scale size={16} />,
          label: t.sol_law_title,
          color: 'text-[#475569]',
          bgColor: 'bg-[#475569]/10',
        },
        {
          href: `${base}/solutions/schools`,
          icon: <GraduationCap size={16} />,
          label: t.sol_sch_title,
          color: 'text-[#8b5cf6]',
          bgColor: 'bg-[#8b5cf6]/10',
        },
        {
          href: `${base}/solutions/auto-service`,
          icon: <Car size={16} />,
          label: t.sol_aut_title,
          color: 'text-[#334155]',
          bgColor: 'bg-[#334155]/10',
        },
        {
          href: `${base}/solutions/beauty-salon`,
          icon: <Scissors size={16} />,
          label: t.sol_be_title,
          color: 'text-[#db2777]',
          bgColor: 'bg-[#db2777]/10',
        },
        {
          href: `${base}/solutions/gym`,
          icon: <Dumbbell size={16} />,
          label: t.sol_gym_title,
          color: 'text-[#06b6d4]',
          bgColor: 'bg-[#06b6d4]/10',
        },
      ]
    }
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (solutionsRef.current && !solutionsRef.current.contains(target)) {
        setSolutionsOpen(false);
      }
      if (learnRef.current && !learnRef.current.contains(target)) {
        setLearnOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSolutionsEnter = () => {
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    if (learnTimeoutRef.current) clearTimeout(learnTimeoutRef.current);
    setLearnOpen(false);
    setSolutionsOpen(true);
  };

  const handleSolutionsLeave = () => {
    solutionsTimeoutRef.current = setTimeout(() => {
      setSolutionsOpen(false);
    }, 200);
  };

  const handleLearnEnter = () => {
    if (learnTimeoutRef.current) clearTimeout(learnTimeoutRef.current);
    if (solutionsTimeoutRef.current) clearTimeout(solutionsTimeoutRef.current);
    setSolutionsOpen(false);
    setLearnOpen(true);
  };

  const handleLearnLeave = () => {
    learnTimeoutRef.current = setTimeout(() => {
      setLearnOpen(false);
    }, 200);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-lg border-b border-[#e8e4de]/60 h-[64px]">
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
          
          {/* Learn Dropdown */}
          <div
            ref={learnRef}
            className="relative"
            onMouseEnter={handleLearnEnter}
            onMouseLeave={handleLearnLeave}
          >
            <button
              className="flex items-center gap-1 text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors"
              onClick={() => setLearnOpen(!learnOpen)}
            >
              {t.nav_howItWorks}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${learnOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Panel */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[260px] bg-white border-[2.5px] border-[#1f1e1d] rounded-2xl shadow-[6px_8px_0_0_#1f1e1d] overflow-hidden transition-all duration-200 origin-top ${
                learnOpen
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <div className="p-2 space-y-1">
                <Link
                  href={`${base}/#how-it-works`}
                  onClick={() => setLearnOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F4F0] transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ea580c]/10 rounded-lg flex items-center justify-center text-[#ea580c] group-hover:scale-110 transition-transform">
                    <Utensils size={15} />
                  </div>
                  <div className="text-[14px] font-bold text-[#1f1e1d]">{t.nav_learn_features}</div>
                </Link>
                
                <Link
                  href={`${base}/blog`}
                  onClick={() => setLearnOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F7F4F0] transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-[#10b981]/10 rounded-lg flex items-center justify-center text-[#10b981] group-hover:scale-110 transition-transform">
                    <BookOpen size={15} />
                  </div>
                  <div className="text-[14px] font-bold text-[#1f1e1d]">{t.nav_learn_blog}</div>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Solutions Dropdown */}
          <div
            ref={solutionsRef}
            className="relative"
            onMouseEnter={handleSolutionsEnter}
            onMouseLeave={handleSolutionsLeave}
          >
            <button
              className="flex items-center gap-1 text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors"
              onClick={() => setSolutionsOpen(!solutionsOpen)}
            >
              {t.nav_solutions}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${solutionsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Panel (Mega Menu) */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[720px] bg-white border-[2.5px] border-[#1f1e1d] rounded-2xl shadow-[8px_10px_0_0_#1f1e1d] overflow-hidden transition-all duration-200 origin-top ${
                solutionsOpen
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <div className="p-6 grid grid-cols-3 gap-8">
                {solutionCategories.map((category, idx) => (
                  <div key={idx} className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[#ada89f] px-2">
                      {category.title}
                    </h5>
                    <div className="space-y-1">
                      {category.items.map((item, i) => (
                        <Link
                          key={i}
                          href={item.href}
                          onClick={() => setSolutionsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F7F4F0] transition-colors group"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                            {item.icon}
                          </div>
                          <div className="text-[13px] font-bold text-[#1f1e1d] leading-tight group-hover:text-[#ea580c] transition-colors">
                            {item.label}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e8e4de] px-6 py-4 bg-[#FCFBF7] flex items-center justify-between">
                <Link
                  href={`${base}/pricing`}
                  onClick={() => setSolutionsOpen(false)}
                  className="text-[11px] font-bold text-[#ada89f] hover:text-[#1f1e1d] transition-colors uppercase tracking-widest"
                >
                  {locale === 'tr' ? 'TÜM PLANLARI GÖRÜNTÜLE →' : 'VIEW ALL PLANS →'}
                </Link>
              </div>
            </div>
          </div>

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
          <div className="md:hidden absolute top-[64px] left-0 right-0 bg-white border-b border-[#e8e4de] p-5 flex flex-col gap-0.5 z-[99] shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto">
            
            {/* Mobile Learn Accordion */}
            <button
              onClick={() => setMobileLearnOpen(!mobileLearnOpen)}
              className="flex items-center justify-between text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors w-full text-left"
            >
              {t.nav_howItWorks}
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-[#ada89f] ${mobileLearnOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {mobileLearnOpen && (
              <div className="pl-3 space-y-0.5 pb-1">
                <Link
                  href={`${base}/#how-it-works`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors"
                >
                  <div className="w-8 h-8 bg-[#ea580c]/10 rounded-lg flex items-center justify-center text-[#ea580c]">
                    <Utensils size={15} />
                  </div>
                  <div className="text-[14px] font-semibold text-[#1f1e1d]">{t.nav_learn_features}</div>
                </Link>
                <Link
                  href={`${base}/blog`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors"
                >
                  <div className="w-8 h-8 bg-[#10b981]/10 rounded-lg flex items-center justify-center text-[#10b981]">
                    <BookOpen size={15} />
                  </div>
                  <div className="text-[14px] font-semibold text-[#1f1e1d]">{t.nav_learn_blog}</div>
                </Link>
              </div>
            )}
            
            {/* Mobile Solutions Accordion */}
            <button
              onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
              className="flex items-center justify-between text-[15px] font-medium text-[#1f1e1d] py-3 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors w-full text-left"
            >
              {t.nav_solutions}
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-[#ada89f] ${mobileSolutionsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {mobileSolutionsOpen && (
              <div className="pl-3 space-y-4 pb-4">
                {solutionCategories.map((category, idx) => (
                  <div key={idx} className="space-y-2">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-[#ada89f] px-3 mt-2">
                      {category.title}
                    </h5>
                    <div className="space-y-0.5">
                      {category.items.map((item, i) => (
                        <Link
                          key={i}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[#F7F4F0] transition-colors"
                        >
                          <div className={`w-8 h-8 ${item.bgColor} rounded-lg flex items-center justify-center ${item.color}`}>
                            {item.icon}
                          </div>
                          <div className="text-[14px] font-semibold text-[#1f1e1d]">{item.label}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
