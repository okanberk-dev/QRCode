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
    title: isTr ? 'Gizlilik Politikası | Buaze' : 'Privacy Policy | Buaze',
    description: isTr 
      ? 'Kişisel verilerinizin korunması ve güvenliğine dair gizlilik politikamız.'
      : 'Our privacy policy regarding the protection and security of your personal data.',
  };
}

export default async function PrivacyPage({
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
              {isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
            </h1>
            <p className="text-[14px] text-[#6b6760] font-medium">
              {isTr ? 'Son güncelleme: 13 Nisan 2026' : 'Last updated: April 13, 2026'}
            </p>
          </div>
          
          <div className="bg-white rounded-[24px] border-[2.5px] border-[#1f1e1d] p-8 sm:p-12 shadow-[6px_8px_0_0_#1f1e1d]">
            <article className="space-y-6 text-[#4a4742] leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '1. Topladığımız Veriler' : '1. Data We Collect'}</h2>
                <p>
                  {isTr 
                    ? 'Hesap oluşturduğunuzda adınız, e-posta adresiniz, fatura bilgileriniz ve şirket profilinizi (şube adresleri vb.) toplarız. Ayrıca, sistem kullanımı sırasında platform metrikleri kaydedilmektedir.'
                    : 'When you create an account, we collect your name, email address, billing information, and company profile (e.g., branch locations). We also record platform metrics during system usage.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '2. Verileri Nasıl Kullanıyoruz' : '2. How We Use Data'}</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>{isTr ? 'Hizmetlerimizi sağlamak ve iyileştirmek için,' : 'To provide and improve our services,'}</li>
                  <li>{isTr ? 'Faturalandırma ve abonelik yönetimini sağlamak için,' : 'To manage billing and subscriptions,'}</li>
                  <li>{isTr ? 'Önemli güncellemeler ve güvenlik uyarıları göndermek için.' : 'To send important updates and security notices.'}</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '3. Veri Güvenliği' : '3. Data Security'}</h2>
                <p>
                  {isTr
                    ? 'Verileriniz modern SSL şifreleme ile korunmaktadır. Sunucularımız yüksek güvenlik standartlarına sahip tesislerde barındırılmakta olup, verilere yetkisiz erişimi engellemek adına gerekli tüm teknik önlemler alınmıştır.'
                    : 'Your data is protected with modern SSL encryption. Our servers are hosted in high-security facilities, and all technical measures are in place to prevent unauthorized access to data.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-[#1f1e1d] text-[22px] font-extrabold">{isTr ? '4. Üçüncü Taraflarla Paylaşım' : '4. Third-Party Sharing'}</h2>
                <p>
                  {isTr
                    ? 'Kişisel verilerinizi kesinlikle satmıyoruz. Yalnızca ödeme işlemleri (ör. Stripe, iyzico) ve zorunlu bulut altyapı sağlayıcılarıyla anonim şekilde veri paylaşıyoruz.'
                    : 'We absolutely do not sell your personal data. We only share data securely with payment processors (e.g., Stripe, iyzico) and necessary cloud infrastructure providers.'}
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
