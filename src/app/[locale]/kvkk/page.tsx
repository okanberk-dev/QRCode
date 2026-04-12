import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — Buaze',
};

export default async function KvkkPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const lastUpdated = '12 Nisan 2026';

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <MarketingNavbar locale={locale} t={t} />

      <section className="pt-48 pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
           <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight">KVKK Aydınlatma Metni</h1>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">Son Güncelleme: {lastUpdated}</p>
           </div>

           <div className="prose prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
              <section className="space-y-4">
                 <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca hazırlanan aydınlatma metni bu sayfada detaylandırılmıştır.</p>
                 <p>İletişim için: hello@buaze.com</p>
              </section>
           </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
