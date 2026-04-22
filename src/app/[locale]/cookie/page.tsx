import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import { ShieldCheck } from 'lucide-react';
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
    title: isTr ? 'Çerez Politikası - Buaze' : 'Cookie Policy - Buaze',
    description: isTr 
      ? 'Daha iyi bir deneyim sunmak için kullandığımız çerezler hakkında bilgi.'
      : 'Information about the cookies we use to provide a better experience.',
  };
}

export const dynamic = "force-dynamic";

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8F6F1] selection:bg-[#F4B400]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border border-[#1A2332] shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F4B400]/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#1A2332] text-white rounded-xl mb-6 shadow-md">
               <ShieldCheck size={14} className="text-[#F4B400]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'ÇEREZ BİLGİSİ' : 'COOKIE INFORMATION'}</span>
            </div>
            <h1 className="text-[36px] sm:text-[56px] font-extrabold text-[#1A2332] tracking-tight leading-none mb-4 whitespace-pre-line">
              {isTr ? 'Çerez Kullanım\nPolitikamız' : 'Cookie Usage\nPolicy'}
            </h1>
            <p className="text-[13px] text-[#6B7280] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#F8F6F1] rounded-3xl border-2 border-[#1A2332] border-dashed">
               <p className="font-black text-[#1A2332] m-0">
                 {isTr 
                   ? 'Buaze web sitesini ve platformumuzu en verimli şekilde kullanabilmeniz, deneyiminizi kişiselleştirebilmemiz için çerezler (cookies) kullanmaktayız.' 
                   : 'We use cookies so that you can use the Buaze website and our platform in the most efficient way and so that we can personalize your experience.'}
               </p>
             </div>

              <section className="space-y-6">
                <h2 className="text-[#1A2332] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '1. Çerez Türleri ve Kullanım Amaçları' : '1. Cookie Types and Usage Purposes'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-6 bg-white border-2 border-[#1A2332] rounded-2xl shadow-md">
                      <h4 className="text-[16px] font-extrabold text-[#1A2332] mb-2">{isTr ? 'Zorunlu Çerezler' : 'Strictly Necessary'}</h4>
                      <p className="text-[14px] leading-relaxed">{isTr ? 'Sitenin çalışması ve güvenliği için gereken temel teknik çerezlerdir.' : 'Basic technical cookies required for the site\'s operation and security.'}</p>
                   </div>
                   <div className="p-6 bg-white border-2 border-[#1A2332] rounded-2xl shadow-md">
                      <h4 className="text-[16px] font-extrabold text-[#1A2332] mb-2">{isTr ? 'Analitik Çerezler' : 'Analytical Cookies'}</h4>
                      <p className="text-[14px] leading-relaxed">{isTr ? 'Ziyaretçi trafiğini ölçmek ve platform deneyimini iyileştirmek için kullanılır.' : 'Used to measure visitor traffic and improve the platform experience.'}</p>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#1A2332] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '2. Çerezleri Nasıl Kontrol Edebilirsiniz?' : '2. How Can You Control Cookies?'}</h2>
                <p>
                  {isTr
                    ? 'Çoğu tarayıcı çerezleri otomatik olarak kabul eder ancak dilediğiniz zaman tarayıcı ayarlarınızdan çerezleri reddedebilir veya silebilirsiniz.'
                    : 'Most browsers automatically accept cookies, but you can reject or delete cookies from your browser settings at any time.'}
                </p>
                <div className="p-6 bg-[#1A2332] text-white/80 rounded-2xl border-2 border-[#1A2332]">
                   <p className="font-bold mb-3 text-white">{isTr ? 'Tarayıcı Bazlı Yönetim:' : 'Browser-Based Management:'}</p>
                   <ul className="text-[14px] space-y-2 list-disc pl-5">
                      <li>Google Chrome: Ayarlar {'>'} Gizlilik {'>'} Çerezler</li>
                      <li>Safari: Tercihler {'>'} Gizlilik {'>'} Çerezler</li>
                      <li>Mozilla Firefox: Seçenekler {'>'} Gizlilik {'>'} Geçmiş</li>
                   </ul>
                </div>
              </section>

               <div className="pt-16 border-t-2 border-[#F8F6F1] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#1A2332] uppercase tracking-widest leading-none">
                     {isTr ? 'DETAYLI BİLGİ' : 'DETAILED INFO'}
                   </p>
                   <p className="text-[14px] text-[#6B7280] font-bold">
                     {isTr ? 'privacy@buaze.com adresinden ulaşın.' : 'Reach out via privacy@buaze.com'}
                   </p>
                 </div>
                 <a href="mailto:privacy@buaze.com" className="px-10 py-5 bg-[#1A2332] text-white rounded-2xl text-[15px] font-black shadow-md hover:bg-[#1A2332] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
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
