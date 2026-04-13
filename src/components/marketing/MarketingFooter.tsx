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
    <footer className="bg-[#1f1e1d] pt-16 pb-8 px-5 sm:px-8 text-white border-t border-[#3d3a36]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Col 1: Brand */}
          <div className="sm:col-span-2 md:col-span-1 min-w-0">
            <Link href={base} className="flex items-center gap-2 mb-5 group inline-flex">
              <BuazeLogo size={28} className="opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
                buaze<span className="text-[#FDBF1D]">.</span>
              </span>
            </Link>
            <p className="text-[#6b6760] text-[13px] leading-relaxed mb-5">
              {t.siteDescription || 'Restoranınızın dijital itibarını profesyonelce yönetin.'}
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-[#ada89f] font-semibold uppercase tracking-widest text-[10px] mb-5">
              {locale === 'tr' ? 'Ürün' : 'Product'}
            </h4>
            <ul className="space-y-3 text-[13px] font-medium text-[#6b6760]">
              <li><Link href={`${base}/how-it-works`} className="hover:text-white transition-colors">{locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}</Link></li>
              <li><Link href={`${base}/pricing`} className="hover:text-white transition-colors">{locale === 'tr' ? 'Fiyatlandırma' : 'Pricing'}</Link></li>
              <li><Link href={`${base}/faq`} className="hover:text-white transition-colors">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQ'}</Link></li>
              <li><Link href={`${base}/about`} className="hover:text-white transition-colors">{t.footer_about}</Link></li>
              <li><Link href={`${base}/contact`} className="hover:text-white transition-colors">{t.footer_contact}</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <h4 className="text-[#ada89f] font-semibold uppercase tracking-widest text-[10px] mb-5">
              {locale === 'tr' ? 'Yasal' : 'Legal'}
            </h4>
            <ul className="space-y-3 text-[13px] font-medium text-[#6b6760]">
              <li><Link href={`${base}/terms`} className="hover:text-white transition-colors">{t.footer_terms}</Link></li>
              <li><Link href={`${base}/privacy`} className="hover:text-white transition-colors">{t.footer_privacy}</Link></li>
              <li><Link href={`${base}/cookie`} className="hover:text-white transition-colors">{t.footer_cookie}</Link></li>
              {locale === 'tr' && (
                <li><Link href={`${base}/kvkk`} className="hover:text-white transition-colors">{t.footer_kvkk}</Link></li>
              )}
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div>
            <h4 className="text-[#ada89f] font-semibold uppercase tracking-widest text-[10px] mb-5">Platform</h4>
            <ul className="space-y-3 text-[13px] font-medium text-[#6b6760]">
              <li><Link href={`${base}/auth/login`} className="hover:text-[#FDBF1D] transition-colors">{locale === 'tr' ? 'Giriş Yap' : 'Log In'}</Link></li>
              <li><Link href={`${base}/auth/register`} className="hover:text-[#FDBF1D] transition-colors">{locale === 'tr' ? 'Ücretsiz Dene' : 'Try for Free'}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-[#3d3a36] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[#6b6760] text-[11px] font-medium">
            © {new Date().getFullYear()} Buaze. {t.footer_copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
