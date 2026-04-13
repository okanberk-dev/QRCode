import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  return {
    title: isTr ? 'KVKK Aydınlatma Metni | Buaze' : 'KVKK Clarification Text | Buaze',
    description: isTr 
      ? '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aydınlatma metnimiz.'
      : 'Our clarification text within the scope of the Personal Data Protection Law (KVKK).',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="mb-10">
            <h1 className="text-[28px] sm:text-[42px] font-black text-[#1f1e1d] leading-tight mb-2">
              <span className="text-[#ea580c]">KVKK</span> {isTr ? 'Aydınlatma Metni' : 'Clarification Text'}
            </h1>
            <p className="text-[13px] text-[#ada89f] font-bold uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-10 text-[15px] sm:text-[16px] leading-relaxed">
             <p className="font-bold text-[18px] text-[#1f1e1d]">
               {isTr 
                 ? '6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca verilerinizin güvenliği bizim için esastır.' 
                 : 'The security of your data is essential to us in accordance with the Law on Protection of Personal Data ("KVKK").'}
             </p>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '1. Veri Sorumlusu' : '1. Data Controller'}</h2>
                <p>
                  {isTr 
                    ? 'Buaze Teknoloji olarak kişisel verilerinizi kanuni sınırlar içerisinde toplamakta ve işlemekteyiz.'
                    : 'As Buaze Tech, we collect and process your personal data within legal boundaries.'}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '2. İşleme Amaçları' : '2. Processing Purposes'}</h2>
                <p>
                  {isTr
                    ? 'Verileriniz; üyelik süreçlerini yürütmek, hizmet kalitesini artırmak ve yasal yükümlülüklerimizi yerine getirmek amacıyla işlenir.'
                    : 'Your data is processed to carry out membership processes, improve service quality, and fulfill our legal obligations.'}
                </p>
              </section>

               <div className="pt-10 border-t border-[#e8e4de] flex flex-col sm:flex-row items-center justify-between gap-6">
                 <p className="text-[13px] text-[#ada89f] font-medium">
                   {isTr ? 'Haklarınız için info sayfamızı inceleyin.' : 'Review our info page for your rights.'}
                 </p>
                 <a href="mailto:hello@buaze.com" className="px-6 py-3 bg-[#1f1e1d] text-white rounded-xl text-[14px] font-bold hover:bg-[#ea580c] transition-colors">
                   hello@buaze.com
                 </a>
               </div>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
