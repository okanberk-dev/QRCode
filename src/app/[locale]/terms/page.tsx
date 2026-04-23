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
    title: isTr ? 'Kullanım Koşulları - Buaze' : 'Terms of Service - Buaze',
    description: isTr 
      ? 'Buaze hizmetlerinin kullanım koşulları ve yasal şartları.'
      : 'Terms of service and legal conditions for using Buaze.',
  };
}

export const dynamic = "force-dynamic";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FFFFFF] selection:bg-[#C6F24E]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-10 sm:p-20 rounded-[48px] border border-[#0A0A0A] shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#C6F24E]/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
          
          <div className="mb-16 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0A0A0A] text-white rounded-xl mb-6 shadow-md">
               <ShieldCheck size={14} className="text-[#C6F24E]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isTr ? 'YASAL SÖZLEŞME' : 'LEGAL AGREEMENT'}</span>
            </div>
            <h1 className="text-[36px] sm:text-[56px] font-extrabold text-[#0A0A0A] tracking-tight leading-none mb-4 whitespace-pre-line">
              {isTr ? 'Kullanım\nKoşulları' : 'Terms of\nService'}
            </h1>
            <p className="text-[13px] text-[#6B7280] font-black uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-12 text-[16px] sm:text-[18px] leading-relaxed font-medium">
             <div className="p-8 bg-[#FFFFFF] rounded-3xl border-2 border-[#0A0A0A] border-dashed">
               <p className="font-black text-[#0A0A0A] m-0">
                 {isTr 
                   ? 'Buaze platformunu kullanarak aşağıdaki kullanım koşullarını tamamen anladığınızı ve kabul ettiğinizi beyan edersiniz. Bu koşullar işletmemiz ile sizin aranızdaki yasal hakları belirler.' 
                   : 'By using the Buaze platform, you declare that you fully understand and accept the following terms of use. These terms define the legal rights between our business and you.'}
               </p>
             </div>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '1. Hizmet Tanımı' : '1. Service Description'}</h2>
                <p>
                  {isTr 
                    ? 'Buaze, işletmelerin dijital itibarını yönetmesine, müşteri geri bildirimlerini toplamasına ve analiz etmesine olanak tanıyan bir SaaS (Yazılım Hizmeti) platformudur. Sunulan hizmetlerin kapsamı seçilen abonelik planına göre değişiklik gösterebilir.'
                    : 'Buaze is a SaaS (Software as a Service) platform that allows businesses to manage their digital reputation, collect and analyze customer feedback. The scope of the services offered may vary according to the selected subscription plan.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '2. Fikri Mülkiyet Hakları' : '2. Intellectual Property Rights'}</h2>
                <p>
                  {isTr
                    ? 'Platform üzerinde yer alan tüm yazılımlar, tasarımlar, logolar ve metin içerikleri Buaze mülkiyetindedir. Yazılı izin olmaksızın kopyalanması, çoğaltılması veya ticari amaçla kullanılması kesinlikle yasaktır.'
                    : 'All software, designs, logos, and text content on the platform are the property of Buaze. Copying, reproducing, or using them for commercial purposes without written permission is strictly prohibited.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '3. Kullanıcı Sorumlulukları' : '3. User Responsibilities'}</h2>
                <p>
                  {isTr
                    ? 'Kullanıcılar, platformu yasalara ve dürüstlük kuralına uygun şekilde kullanmayı kabul eder. Sistemin manipüle edilmesi, sahte veriler girilmesi veya üçüncü şahısların haklarının ihlal edilmesi durumunda hesap derhal sonlandırılabilir.'
                    : 'Users agree to use the platform in accordance with the laws and the rule of integrity. In case of manipulation of the system, entry of fake data, or violation of the rights of third parties, the account may be terminated immediately.'}
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-[#0A0A0A] text-[24px] sm:text-[28px] font-extrabold tracking-tight">{isTr ? '4. Sorumluluk Sınırlandırması' : '4. Limitation of Liability'}</h2>
                <p>
                  {isTr
                    ? 'Buaze, teknik aksaklıklardan doğabilecek geçici hizmet kesintilerinden sorumlu tutulamaz. Yazılımımız "olduğu gibi" sunulur ve ticari başarı garantisi verilmez.'
                    : 'Buaze cannot be held responsible for temporary service interruptions arising from technical glitches. Our software is provided "as is" and no guarantee of commercial success is given.'}
                </p>
              </section>

               <div className="pt-16 border-t-2 border-[#FFFFFF] flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="space-y-1">
                   <p className="text-[14px] font-black text-[#0A0A0A] uppercase tracking-widest leading-none">
                     {isTr ? 'SORULARINIZ İÇİN' : 'FOR QUESTIONS'}
                   </p>
                   <p className="text-[14px] text-[#6B7280] font-bold">
                     {isTr ? 'hello@buaze.com adresine yazın.' : 'Write to hello@buaze.com'}
                   </p>
                 </div>
                 <a href="mailto:hello@buaze.com" className="px-10 py-5 bg-[#0A0A0A] text-white rounded-2xl text-[15px] font-black shadow-md hover:bg-[#0A0A0A] transition-all active:translate-y-[6px] active:shadow-none uppercase tracking-widest">
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
