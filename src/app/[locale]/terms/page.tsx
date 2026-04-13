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
    title: isTr ? 'Kullanım Koşulları | Buaze' : 'Terms of Service | Buaze',
    description: isTr 
      ? 'Buaze hizmetlerinin kullanım koşulları ve yasal şartları.'
      : 'Terms of service and legal conditions for using Buaze.',
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = await getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 max-w-[900px] mx-auto w-full px-5 py-20 sm:py-32">
        <div className="bg-white p-8 sm:p-16 rounded-[32px] border-[3px] border-[#1f1e1d] shadow-[12px_14px_0_0_#1f1e1d]">
          <div className="mb-10">
            <h1 className="text-[28px] sm:text-[42px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight mb-2">
              {isTr ? 'Kullanım' : 'Terms of'} <span className="text-[#ea580c]">{isTr ? 'Koşulları' : 'Service'}</span>
            </h1>
            <p className="text-[13px] text-[#ada89f] font-bold uppercase tracking-widest">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="prose prose-neutral max-w-none text-[#4a4742] space-y-10 text-[15px] sm:text-[16px] leading-relaxed">
             <p className="font-bold text-[18px] text-[#1f1e1d]">
               {isTr 
                 ? 'Buaze platformunu kullanarak aşağıdaki kullanım koşullarını kabul etmiş sayılırsınız.' 
                 : 'By using the Buaze platform, you are deemed to have accepted the following terms of use.'}
             </p>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '1. Sözleşmenin Kabulü' : '1. Acceptance of Terms'}</h2>
                <p>
                  {isTr 
                    ? 'Buaze tarafından sunulan hizmetleri kullanarak, bu Kullanım Koşullarını tamamen anladığınızı ve kabul ettiğinizi beyan edersiniz.'
                    : 'By accessing or using the services provided by Buaze, you agree to be bound by these Terms of Service.'}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '2. Hizmetlerin Kullanımı' : '2. Use of Services'}</h2>
                <p>
                  {isTr
                    ? 'Hizmetlerimiz, işletmelerin çevrimiçi itibarlarını yönetmelerine olanak tanır. Sistemin kötüye kullanımı halinde hesabı sonlandırma hakkımız gizlidir.'
                    : 'Our services allow businesses to manage their online reputation. We reserve the right to terminate accounts that abuse the system.'}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-[#1f1e1d] text-[22px] font-black tracking-tight">{isTr ? '3. Hesap Güvenliği' : '3. Account Security'}</h2>
                <p>
                  {isTr
                    ? 'Hesabınızın güvenliğinden tamamen siz sorumlusunuz. Şifrenizin üçüncü şahıslara geçmesi durumunda doğabilecek zararlardan firmamız sorumlu tutulamaz.'
                    : 'You are responsible for safeguarding your password. We cannot be held liable for any loss arising from unauthorized access.'}
                </p>
              </section>

               <div className="pt-10 border-t border-[#e8e4de] flex flex-col sm:flex-row items-center justify-between gap-6">
                 <p className="text-[13px] text-[#ada89f] font-medium">
                   {isTr ? 'Sorularınız için bizimle iletişime geçin.' : 'Contact us for any questions.'}
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
