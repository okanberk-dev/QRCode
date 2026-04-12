'use client';

import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';

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
    siteDescription?: string;
  };
}

export default function MarketingFooter({ locale, t }: MarketingFooterProps) {
  const base = `/${locale}`;

  return (
    <footer className="bg-[#111827] pt-20 pb-8 px-6 text-white border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Col 1: Brand */}
          <div className="md:col-span-1 min-w-[280px]">
            <Link href={base} className="flex items-center gap-2.5 mb-6 group inline-flex">
              <BuazeLogo size={42} className="opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="text-2xl font-black tracking-tight text-white">Buaze</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 font-medium">
              {t.siteDescription || 'Restoranınızın dijital itibarını profesyonelce yönetin. Yorum toplayın, büyüyün.'}
            </p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FDBF1D] border border-[#FDBF1D]/20 bg-[#FDBF1D]/10 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FDBF1D] animate-pulse" />
                {t.cta_badge1}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#79C5D1] border border-[#79C5D1]/20 bg-[#79C5D1]/10 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#79C5D1]" />
                {t.cta_badge2}
              </div>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="md:col-span-1">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6 opacity-50">
              {locale === 'tr' ? 'Ürün' : 'Product'}
            </h4>
            <ul className="space-y-4 text-sm font-semibold text-gray-400">
              <li><Link href={`${base}/#how-it-works`} className="hover:text-white transition-colors">{locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}</Link></li>
              <li><Link href={`${base}/pricing`} className="hover:text-white transition-colors">{locale === 'tr' ? 'Fiyatlandırma' : 'Pricing'}</Link></li>
              <li><Link href={`${base}/about`} className="hover:text-white transition-colors">{t.footer_about}</Link></li>
              <li><Link href={`${base}/contact`} className="hover:text-white transition-colors">{t.footer_contact}</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div className="md:col-span-1">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6 opacity-50">
              {locale === 'tr' ? 'Yasal' : 'Legal'}
            </h4>
            <ul className="space-y-4 text-sm font-semibold text-gray-400">
              <li><Link href={`${base}/terms`} className="hover:text-white transition-colors">{t.footer_terms}</Link></li>
              <li><Link href={`${base}/privacy`} className="hover:text-white transition-colors">{t.footer_privacy}</Link></li>
              <li><Link href={`${base}/cookie`} className="hover:text-white transition-colors">{t.footer_cookie}</Link></li>
              {locale === 'tr' && (
                <li><Link href={`${base}/kvkk`} className="hover:text-white transition-colors">{t.footer_kvkk}</Link></li>
              )}
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div className="md:col-span-1">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6 opacity-50">Platform</h4>
            <ul className="space-y-4 text-sm font-semibold text-gray-400">
              <li><Link href={`${base}/auth/login`} className="hover:text-[#FDBF1D] transition-colors">{locale === 'tr' ? 'Giriş Yap' : 'Log In'}</Link></li>
              <li><Link href={`${base}/auth/register`} className="hover:text-[#FDBF1D] transition-colors">{locale === 'tr' ? 'Ücretsiz Dene' : 'Try for Free'}</Link></li>
              <li><Link href={`/admin`} className="hover:text-[#FDBF1D] transition-colors">Admin Panel</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Buaze. {t.footer_copyright}
          </p>
          <div className="flex gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
             {/* Payment Methods placeholder showing global reach */}
            <div className="px-2 py-1 bg-white rounded text-[#111827] text-[10px] font-black italic">VISA</div>
            <div className="px-2 py-1 bg-white rounded text-[#111827] text-[10px] font-black italic">MASTERCARD</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
