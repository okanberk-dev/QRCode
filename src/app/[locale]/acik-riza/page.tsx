import type { Metadata } from 'next';
import { ShieldCheck, Zap } from 'lucide-react';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Açık Rıza Metni — Buaze' : 'Explicit Consent — Buaze',
    description: locale === 'tr' 
      ? 'Kişisel verilerinizin işlenmesine yönelik açık rıza beyanı.'
      : 'Explicit consent declaration for processing personal data.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8F6F1] selection:bg-[#F4B400]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border-[4px] border-[#1A2332] shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F4B400]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#1A2332] text-white rounded-xl mb-6 shadow-md">
               <ShieldCheck size={14} className="text-[#F4B400]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'ONAY METNİ' : 'CONSENT FORM'}</span>
            </div>
            <h1 className="text-[32px] sm:text-[52px] font-black text-[#1A2332] tracking-tight leading-[1.1] mb-4 whitespace-pre-line">
              {isTr ? 'Kişisel Verilerin İşlenmesi\nAçık Rıza Beyanı' : 'Explicit Consent for\nPersonal Data Processing'}
            </h1>
            <p className="text-[13px] text-[#6B7280] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#F8F6F1] rounded-3xl border-2 border-[#1A2332] border-dashed">
               <p className="font-black text-[#1A2332] m-0">
                 {isTr 
                   ? 'Buaze platformu üzerinden sunulan hizmetlerden yararlanırken, kişisel verilerinizin işlenmesine yönelik hür iradenizle verdiğiniz onay beyanıdır.' 
                   : 'This is the consent declaration you give with your free will for the processing of your personal data while benefiting from the services offered through the Buaze platform.'}
               </p>
             </div>

              <section className="space-y-6">
                <p>
                  {isTr
                    ? 'Buaze tarafından sunulan Aydınlatma Metni çerçevesinde, aşağıdaki amaçlar doğrultusunda verilerimin işlenmesine ve saklanmasına onay veriyorum:'
                    : 'Within the framework of the Clarification Text provided by Buaze, I consent to the processing and storage of my data for the following purposes:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    isTr ? 'Pazarlama ve kampanya süreçleri' : 'Marketing and campaign processes',
                    isTr ? 'Kişiselleştirilmiş ürün önerileri' : 'Personalized product offers',
                    isTr ? 'Müşteri memnuniyet anketleri' : 'Customer satisfaction surveys',
                    isTr ? 'Yurt dışı sunucu altyapı kullanımı' : 'Use of international server infra'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-white border-2 border-[#1A2332] rounded-2xl shadow-md">
                       <div className="w-5 h-5 rounded-lg bg-[#1A2332] flex items-center justify-center text-white border border-[#1A2332]">
                          <Zap size={10} className="text-[#F4B400]" strokeWidth={3} />
                       </div>
                       <span className="text-[14px] font-black text-[#1A2332] uppercase tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <p>
                {isTr
                  ? 'Verilerimin sunucu/bulut sağlayıcısı olarak hizmet alınan (sunucuları yurt dışında bulunabilen) teknoloji altyapı firmalarına aktarılmasına ve burada işlenmesine hür irademle rıza gösteriyorum.'
                  : 'I give consent with my free will for my data to be transferred to and processed by technology infrastructure companies (whose servers may be abroad) from which servers/cloud providers are used.'}
              </p>

               <div className="pt-16 border-t-2 border-[#F8F6F1] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#1A2332] uppercase tracking-widest leading-none">
                     {isTr ? 'RIZA GERİ ÇEKME' : 'WITHDRAW CONSENT'}
                   </p>
                   <p className="text-[14px] text-[#6B7280] font-bold">
                     {isTr ? 'Dilediğiniz zaman çekebilirsiniz.' : 'You can withdraw at any time.'}
                   </p>
                 </div>
                 <a href="mailto:hello@buaze.com" className="px-10 py-5 bg-[#1A2332] text-white rounded-2xl text-[15px] font-black shadow-md hover:bg-[#1A2332] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
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
