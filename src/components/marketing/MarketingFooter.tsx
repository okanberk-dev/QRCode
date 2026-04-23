import Link from 'next/link';
import type { Locale } from '@/lib/translations';
import BuazeLogo from './BuazeLogo';
import { getSiteSettings } from '@/lib/site-settings';

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

export default async function MarketingFooter({ locale, t }: MarketingFooterProps) {
  const base = `/${locale}`;
  const s = await getSiteSettings();

  return (
    <footer className="bg-[#0A0A0A] pt-16 pb-8 px-5 sm:px-8 text-white border-t border-white/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Col 1: Brand */}
          <div className="sm:col-span-2 md:col-span-1 min-w-0">
            <Link href={base} className="flex items-center gap-2 mb-5 group inline-flex">
              <BuazeLogo size={28} variant="on-dark" imageUrl={s.logoUrl} className="opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="text-[17px] font-extrabold tracking-[-0.02em] text-white">
                buaze<span className="text-[#C6F24E]">.</span>
              </span>
            </Link>
            <p className="text-[#EDEDED] text-[13px] leading-relaxed mb-5">
              {t.siteDescription || 'Restoranınızın dijital itibarını profesyonelce yönetin.'}
            </p>

            {/* Social */}
            <div className="flex items-center gap-2">
              <a
                href="https://instagram.com/buazerating"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram — buazerating"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-[#C6F24E] hover:text-[#0A0A0A] hover:border-[#C6F24E] transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-white/70 font-extrabold uppercase tracking-widest text-[10px] mb-6">
              {locale === 'tr' ? 'Ürün' : 'Product'}
            </h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#EDEDED]">
              <li><Link href={`${base}/how-it-works`} className="hover:text-[#C6F24E] transition-colors">{locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}</Link></li>
              <li><Link href={`${base}/pricing`} className="hover:text-[#C6F24E] transition-colors">{locale === 'tr' ? 'Fiyatlandırma' : 'Pricing'}</Link></li>
              <li><Link href={`${base}/compare`} className="hover:text-[#C6F24E] transition-colors">{locale === 'tr' ? 'Karşılaştır' : 'Compare'}</Link></li>
              <li><Link href={`${base}/faq`} className="hover:text-[#C6F24E] transition-colors">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQ'}</Link></li>
              <li><Link href={`${base}/about`} className="hover:text-[#C6F24E] transition-colors">{t.footer_about}</Link></li>
              <li><Link href={`${base}/contact`} className="hover:text-[#C6F24E] transition-colors">{t.footer_contact}</Link></li>
            </ul>
          </div>

          {/* Col 3: Legal */}
          <div>
            <h4 className="text-white/70 font-extrabold uppercase tracking-widest text-[10px] mb-6">
              {locale === 'tr' ? 'Yasal' : 'Legal'}
            </h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#EDEDED]">
              <li><Link href={`${base}/terms`} className="hover:text-[#C6F24E] transition-colors">{t.footer_terms}</Link></li>
              <li><Link href={`${base}/privacy`} className="hover:text-[#C6F24E] transition-colors">{t.footer_privacy}</Link></li>
              <li><Link href={`${base}/google-compliance`} className="hover:text-[#C6F24E] transition-colors">{t.footer_google_compliance}</Link></li>
              <li><Link href={`${base}/cookie`} className="hover:text-[#C6F24E] transition-colors">{t.footer_cookie}</Link></li>
              {locale === 'tr' && (
                <li><Link href={`${base}/kvkk`} className="hover:text-[#C6F24E] transition-colors">{t.footer_kvkk}</Link></li>
              )}
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div>
            <h4 className="text-white/70 font-extrabold uppercase tracking-widest text-[10px] mb-6">Platform</h4>
            <ul className="space-y-3.5 text-[13px] font-medium text-[#EDEDED]">
              <li><Link href={`${base}/auth/login`} className="hover:text-[#C6F24E] transition-colors font-bold">{locale === 'tr' ? 'Giriş Yap' : 'Log In'}</Link></li>
              <li><Link href={`${base}/auth/register`} className="hover:text-[#C6F24E] transition-colors font-bold text-[#C6F24E]">{locale === 'tr' ? 'Ücretsiz Dene' : 'Try for Free'}</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-white/60 text-[11px] font-medium">
            © {new Date().getFullYear()} Buaze. {t.footer_copyright}
          </p>
          <div className="flex items-center gap-6">
             <Link href={`${base}/terms`} className="text-white/60 text-[10px] font-bold hover:text-white transition-colors uppercase tracking-widest">
               {locale === 'tr' ? 'Şartlar' : 'Terms'}
             </Link>
             <Link href={`${base}/privacy`} className="text-white/60 text-[10px] font-bold hover:text-white transition-colors uppercase tracking-widest">
               {locale === 'tr' ? 'Gizlilik' : 'Privacy'}
             </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
