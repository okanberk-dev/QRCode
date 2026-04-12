import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'tr' ? 'Gizlilik Politikası — Buaze' : 'Privacy Policy — Buaze' };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const lastUpdated = '12 Nisan 2026';

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <section className="pt-48 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight">{locale === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</h1>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">Son Güncelleme: {lastUpdated}</p>
           </div>

           <div className="prose prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">1. Topladığımız Bilgiler / Information We Collect</h2>
                 <p>Hizmetimizi kullandığınızda doğrudan sağladığınız bilgileri (ad, e-posta adresi ve işletme bilgileri) topluyoruz.</p>
              </section>

              <section className="space-y-4">
                 <h2 className="text-2xl font-black text-[#111827]">2. İletişim / Contact</h2>
                 <p>Bu Gizlilik Politikası hakkında sorularınız varsa hello@buaze.com adresinden bizimle iletişime geçebilirsiniz.</p>
              </section>
           </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
