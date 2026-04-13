import type { Metadata } from 'next';
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
    title: locale === 'tr' ? 'Açık Rıza Metni — Buaze' : 'Consent Text — Buaze',
    robots: { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <h1 className="text-[28px] sm:text-[42px] font-black text-[#1f1e1d] leading-tight mb-10 tracking-[-0.03em]">
             Kişisel Verilerin İşlenmesine İlişkin <span className="text-[#ea580c]">Açık Rıza Metni</span>
          </h1>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-8 text-[15px] sm:text-[16px] leading-relaxed">
            <p className="font-medium">
              Buaze platformuna üye olurken / hizmet ve ürünlerden yararlanırken tarafıma sunulan Aydınlatma Metni'ni 
              okuduğumu, anladığımı ve Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında kişisel verilerimin işlenmesi ile ilgili 
              tüm süreçler hakkında bilgilendirildiğimi kabul ederim.
            </p>

            <div className="bg-[#FCFBF7] p-6 rounded-2xl border-2 border-[#1f1e1d]">
              <p className="font-bold mb-4 uppercase tracking-widest text-[12px] text-[#ea580c]">İşlenecek Veri Kategorileri:</p>
              <ul className="list-none space-y-3">
                {[
                  'Ürün ve hizmetlere bağlılık süreçlerinin yürütülmesi',
                  'Müşteri memnuniyetine yönelik süreçlerin planlanması ve icrası',
                  'Bana özel kişiselleştirilmiş tekliflerin ve kampanyaların sunulması',
                  'Ürünlerin kullanım alışkanlıklarıma göre özelleştirilmesi'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1f1e1d] flex-shrink-0 flex items-center justify-center text-white text-[10px]">✓</span>
                    <span className="font-bold text-[#1f1e1d]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p>
              amaçlarıyla Şirket ("Buaze") tarafından işlenmesine, bu verilerin sunucu/bulut sağlayıcısı olarak hizmet 
              alınan (sunucuları yurt dışında bulunabilen) teknoloji altyapı firmalarına aktarılmasına 
              <strong className="text-[#1f1e1d]"> hür irademle onay veriyorum</strong>.
            </p>

             <div className="pt-10 border-t border-[#e8e4de] flex flex-col sm:flex-row items-center justify-between gap-6">
               <p className="text-[13px] text-[#ada89f] font-medium max-w-[400px]">
                 Aydınlatma Metnine istinaden, dilediğiniz zaman rızanızı geri çekme hakkına sahipsiniz.
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
