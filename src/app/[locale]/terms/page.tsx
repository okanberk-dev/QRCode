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

      <main className="flex-1 pt-[120px] sm:pt-[150px] pb-16 sm:pb-24">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8">
          <div className="mb-8">
            <h1 className="text-[36px] sm:text-[46px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-[1.1] mb-2">
              {isTr ? 'Kullanım Koşulları' : 'Terms of Service'}
            </h1>
            <p className="text-[14px] text-[#6b6760] font-medium">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="bg-white rounded-[24px] border-[2.5px] border-[#1f1e1d] p-8 sm:p-12 shadow-[6px_8px_0_0_#1f1e1d]">
            <article className="space-y-6 text-[#4a4742] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '1. Sözleşmenin Kabulü' : '1. Acceptance of Terms'}</h2>
                <p>
                  {isTr 
                    ? 'Buaze ("biz", "bizi" veya "bizim") tarafından sunulan hizmetleri kullanarak, bu Kullanım Koşullarını ("Koşullar") tamamen anladığınızı ve kabul ettiğinizi beyan edersiniz. Bu koşulları kabul etmiyorsanız, hizmetlerimizi kullanmamalısınız.'
                    : 'By accessing or using the services provided by Buaze ("we", "us", or "our"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '2. Hizmetlerin Kullanımı' : '2. Use of Services'}</h2>
                <p>
                  {isTr
                    ? 'Hizmetlerimiz, işletmelerin çevrimiçi itibarlarını yönetmelerine olanak tanır. Kullanıcılar hesaplarına iletilen hiçbir yorum veya veriyi manipüle edemez. Sistemin kötüye kullanımı halinde hesabı sonlandırma hakkımız gizlidir.'
                    : 'Our services allow businesses to manage their online reputation. Users may not manipulate reviews or data provided to their accounts. We reserve the right to terminate accounts that abuse the system.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '3. Hesap Güvenliği' : '3. Account Security'}</h2>
                <p>
                  {isTr
                    ? 'Hesabınızın güvenliğinden tamamen siz sorumlusunuz. Şifrenizin üçüncü şahıslara geçmesi durumunda doğabilecek zararlardan firmamız sorumlu tutulamaz.'
                    : 'You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. We cannot be held liable for any loss arising from unauthorized access.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '4. Fiyatlandırma ve Ödeme' : '4. Pricing and Payment'}</h2>
                <p>
                  {isTr
                    ? 'Fiyatlandırma planlarımız abonelik bazlıdır ve seçtiğiniz periyotlarda (aylık veya yıllık) faturalandırılır. İade koşulları, standart dijital hizmet prosedürleri doğrultusunda uygulanır.'
                    : 'Our pricing plans are subscription-based and billed periodically (monthly or annually). Refund conditions follow our standard digital services policy.'}
                </p>
              </section>
            </article>
          </div>
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
