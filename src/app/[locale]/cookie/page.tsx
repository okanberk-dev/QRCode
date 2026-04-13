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
    title: isTr ? 'Çerez Politikası | Buaze' : 'Cookie Policy | Buaze',
    description: isTr 
      ? 'Daha iyi bir deneyim sunmak için kullandığımız çerezler hakkında bilgi.'
      : 'Information about the cookies we use to provide a better experience.',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border-[4px] border-[#1f1e1d] shadow-[15px_20px_0_0_#FDBF1D] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDBF1D]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#111827] text-white rounded-xl mb-6 shadow-[4px_4px_0_0_#ea580c]">
               <ShieldCheck size={14} className="text-[#FDBF1D]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'ÇEREZ BİLGİSİ' : 'COOKIE INFORMATION'}</span>
            </div>
            <h1 className="text-[36px] sm:text-[56px] font-black text-[#111827] tracking-tight leading-none mb-4 whitespace-pre-line">
              {isTr ? 'Çerez Kullanım\nPolitikamız' : 'Cookie Usage\nPolicy'}
            </h1>
            <p className="text-[13px] text-[#ada89f] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#F7F4F0] rounded-3xl border-2 border-[#1f1e1d] border-dashed">
               <p className="font-black text-[#111827] m-0">
                 {isTr 
                   ? 'Buaze web sitesini ve platformumuzu en verimli şekilde kullanabilmeniz, deneyiminizi kişiselleştirebilmemiz için çerezler (cookies) kullanmaktayız.' 
                   : 'We use cookies so that you can use the Buaze website and our platform in the most efficient way and so that we can personalize your experience.'}
               </p>
             </div>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '1. Çerez Türleri ve Kullanım Amaçları' : '1. Cookie Types and Usage Purposes'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-6 bg-white border-2 border-[#1f1e1d] rounded-2xl shadow-[4px_4px_0_0_#1f1e1d]">
                      <h4 className="text-[16px] font-black text-[#111827] mb-2">{isTr ? 'Zorunlu Çerezler' : 'Strictly Necessary'}</h4>
                      <p className="text-[14px] leading-relaxed">{isTr ? 'Sitenin çalışması ve güvenliği için gereken temel teknik çerezlerdir.' : 'Basic technical cookies required for the site\'s operation and security.'}</p>
                   </div>
                   <div className="p-6 bg-white border-2 border-[#1f1e1d] rounded-2xl shadow-[4px_4px_0_0_#FDBF1D]">
                      <h4 className="text-[16px] font-black text-[#111827] mb-2">{isTr ? 'Analitik Çerezler' : 'Analytical Cookies'}</h4>
                      <p className="text-[14px] leading-relaxed">{isTr ? 'Ziyaretçi trafiğini ölçmek ve platform deneyimini iyileştirmek için kullanılır.' : 'Used to measure visitor traffic and improve the platform experience.'}</p>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#111827] text-[24px] sm:text-[28px] font-black tracking-tight">{isTr ? '2. Çerezleri Nasıl Kontrol Edebilirsiniz?' : '2. How Can You Control Cookies?'}</h2>
                <p>
                  {isTr
                    ? 'Çoğu tarayıcı çerezleri otomatik olarak kabul eder ancak dilediğiniz zaman tarayıcı ayarlarınızdan çerezleri reddedebilir veya silebilirsiniz.'
                    : 'Most browsers automatically accept cookies, but you can reject or delete cookies from your browser settings at any time.'}
                </p>
                <div className="p-6 bg-[#111827] text-[#ada89f] rounded-2xl border-2 border-[#1f1e1d]">
                   <p className="font-bold mb-3 text-white">{isTr ? 'Tarayıcı Bazlı Yönetim:' : 'Browser-Based Management:'}</p>
                   <ul className="text-[14px] space-y-2 list-disc pl-5">
                      <li>Google Chrome: Ayarlar {'>'} Gizlilik {'>'} Çerezler</li>
                      <li>Safari: Tercihler {'>'} Gizlilik {'>'} Çerezler</li>
                      <li>Mozilla Firefox: Seçenekler {'>'} Gizlilik {'>'} Geçmiş</li>
                   </ul>
                </div>
              </section>

               <div className="pt-16 border-t-2 border-[#F7F4F0] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#111827] uppercase tracking-widest leading-none">
                     {isTr ? 'DETAYLI BİLGİ' : 'DETAILED INFO'}
                   </p>
                   <p className="text-[14px] text-[#ada89f] font-bold">
                     {isTr ? 'privacy@buaze.com adresinden ulaşın.' : 'Reach out via privacy@buaze.com'}
                   </p>
                 </div>
                 <a href="mailto:privacy@buaze.com" className="px-10 py-5 bg-[#111827] text-white rounded-2xl text-[15px] font-black shadow-[6px_8px_0_0_#FDBF1D] hover:bg-[#1f1e1d] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
                   privacy@buaze.com
                 </a>
               </div>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
