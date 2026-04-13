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

export default async function CookiePage({
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
              {isTr ? 'Çerez Politikası' : 'Cookie Policy'}
            </h1>
            <p className="text-[14px] text-[#6b6760] font-medium">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="bg-white rounded-[24px] border-[2.5px] border-[#1f1e1d] p-8 sm:p-12 shadow-[6px_8px_0_0_#1f1e1d]">
            <article className="space-y-6 text-[#4a4742] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '1. Çerez Nedir?' : '1. What Are Cookies?'}</h2>
                <p>
                  {isTr 
                    ? 'Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır. Buaze olarak, sitemizin düzgün çalışmasını sağlamak için çerezleri kullanıyoruz.'
                    : 'Cookies are small text files downloaded to your device when you visit a website. At Buaze, we use cookies to ensure our website functions properly.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '2. Hangi Çerezleri Kullanıyoruz?' : '2. How We Use Cookies'}</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>{isTr ? 'Zorunlu Çerezler:' : 'Essential Cookies:'}</strong> {isTr ? 'Uygulamanın temel işlevleri ve oturum yönetimi için.' : 'For core application functionality and session management.'}</li>
                  <li><strong>{isTr ? 'Analitik Çerezler:' : 'Analytical Cookies:'}</strong> {isTr ? 'Sitemizin nasıl kullanıldığını analiz ederek performans iyileştirmesi yapmak için.' : 'To analyze how our site is used and improve performance.'}</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '3. Çerezleri Nasıl Kontrol Edebilirsiniz?' : '3. Controlling Cookies'}</h2>
                <p>
                  {isTr
                    ? 'Tarayıcı ayarlarınızı değiştirerek çerezleri reddedebilir veya silebilirsiniz. Ancak, çerezleri tamamen devre dışı bırakmanız halinde sistemin bazı özelliklerinin çalışmayabileceğini unutmayın.'
                    : 'You can prevent the setting of cookies by adjusting the settings on your browser. Be aware that disabling cookies will affect the functionality of this and many other websites that you visit.'}
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
