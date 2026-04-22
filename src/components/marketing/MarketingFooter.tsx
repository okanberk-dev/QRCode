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
    footer_google_compliance: string;
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
    <footer className="bg-[#1A2332] pt-16 pb-8 px-5 sm:px-8 text-white border-t border-white/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Col 1: Brand */}
          <div className="sm:col-span-2 md:col-span-1 min-w-0">
            <Link href={base} className="flex items-center gap-2 mb-5 group inline-flex">
              <BuazeLogo size={28} variant="on-dark" className="opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
                buaze<span className="text-[#F4B400]">.</span>
              </span>
            </Link>
            <p className="text-[#E8ECF2] text-[13px] leading-relaxed mb-5">
              {t.siteDescription || 'Restoranınızın dijital itibarını profesyonelce yönetin.'}
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-6">
              {locale === 'tr' ? 'Ürün' : 'Product'}
            </h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#E8ECF2]">
              <li><Link href={`${base}/how-it-works`} className="hover:text-[#F4B400] transition-colors">{locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}</Link></li>
              <li><Link href={`${base}/pricing`} className="hover:text-[#F4B400] transition-colors">{locale === 'tr' ? 'Fiyatlandırma' : 'Pricing'}</Link></li>
              <li><Link href={`${base}/compare`} className="hover:text-[#F4B400] transition-colors">{locale === 'tr' ? 'Karşılaştır' : 'Compare'}</Link></li>
              <li><Link href={`${base}/faq`} className="hover:text-[#F4B400] transition-colors">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQ'}</Link></li>
              <li><Link href={`${base}/about`} className="hover:text-[#F4B400] transition-colors">{t.footer_about}</Link></li>
              <li><Link href={`${base}/contact`} className="hover:text-[#F4B400] transition-colors">{t.footer_contact}</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <h4 className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-6">
              {locale === 'tr' ? 'Yasal' : 'Legal'}
            </h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#E8ECF2]">
              <li><Link href={`${base}/terms`} className="hover:text-[#F4B400] transition-colors">{t.footer_terms}</Link></li>
              <li><Link href={`${base}/privacy`} className="hover:text-[#F4B400] transition-colors">{t.footer_privacy}</Link></li>
              <li><Link href={`${base}/google-compliance`} className="hover:text-[#F4B400] transition-colors">{t.footer_google_compliance}</Link></li>
              <li><Link href={`${base}/cookie`} className="hover:text-[#F4B400] transition-colors">{t.footer_cookie}</Link></li>
              {locale === 'tr' && (
                <li><Link href={`${base}/kvkk`} className="hover:text-[#F4B400] transition-colors">{t.footer_kvkk}</Link></li>
              )}
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div>
            <h4 className="text-white/40 font-black uppercase tracking-widest text-[10px] mb-6">Platform</h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#E8ECF2]">
              <li><Link href={`${base}/auth/login`} className="hover:text-[#F4B400] transition-colors font-bold">{locale === 'tr' ? 'Giriş Yap' : 'Log In'}</Link></li>
              <li><Link href={`${base}/auth/register`} className="hover:text-[#F4B400] transition-colors font-bold text-[#F4B400]">{locale === 'tr' ? 'Ücretsiz Dene' : 'Try for Free'}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-white/30 text-[11px] font-medium">
            © {new Date().getFullYear()} Buaze. {t.footer_copyright}
          </p>
          <div className="flex items-center gap-6">
             <Link href={`${base}/terms`} className="text-white/30 text-[10px] font-bold hover:text-white transition-colors uppercase tracking-widest">
               {locale === 'tr' ? 'Şartlar' : 'Terms'}
             </Link>
             <Link href={`${base}/privacy`} className="text-white/30 text-[10px] font-bold hover:text-white transition-colors uppercase tracking-widest">
               {locale === 'tr' ? 'Gizlilik' : 'Privacy'}
             </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
