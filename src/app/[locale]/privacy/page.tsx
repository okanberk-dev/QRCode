import type { Metadata } from 'next';
import type { Locale } from '@/lib/translations';
import { getTranslations } from '@/lib/translations';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  return {
    title: isTr ? 'Gizlilik Politikası - Buaze' : 'Privacy Policy - Buaze',
    description: isTr
      ? 'Kişisel verilerinizin korunması ve güvenliğine dair gizlilik politikamız.'
      : 'Our privacy policy regarding the protection and security of your personal data.',
  };
}

export const dynamic = 'force-dynamic';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  const intro = isTr
    ? 'Buaze olarak kişisel verilerinizin gizliliğini ve güvenliğini en büyük önceliğimiz olarak görüyoruz. Bu politika, hangi verileri neden topladığımızı ve onları nasıl koruduğumuzu açıklar.'
    : 'As Buaze, we consider the privacy and security of your personal data as our top priority. This policy explains what data we collect, why we collect it, and how we protect it.';

  const sections = isTr
    ? [
        {
          heading: '1. Bilgi toplama',
          body: (
            <>
              <p>
                Hesap açılışı, hizmet kullanımı veya bizimle iletişime geçtiğinizde; kimlik bilgileri, iletişim detayları, ödeme geçmişi ve kullanım verileri gibi bilgileri toplarız.
              </p>
              <ul>
                <li>Kayıt sırasında sağladığınız doğrudan bilgiler</li>
                <li>Abonelik ve ödeme işlemleri verileri</li>
                <li>Platform etkileşim ve kullanım metrikleri</li>
              </ul>
            </>
          ),
        },
        {
          heading: '2. Veri kullanımı ve paylaşımı',
          body: (
            <p>
              Verileriniz yalnızca hizmet kalitemizi artırmak, yasal yükümlülüklerimizi yerine getirmek ve size özel bir kullanıcı deneyimi sunmak amacıyla kullanılır. Üçüncü şahıslara satış yapılmaz.
            </p>
          ),
        },
        {
          heading: '3. Güvenlik önlemleri',
          body: (
            <p>
              Tüm verileriniz endüstri standardı SSL/TLS şifreleme ile korunur. Sunucularımızda güvenlik duvarları, yetkisiz erişim tespit sistemleri ve periyodik sızma testleri uygulanmaktadır.
            </p>
          ),
        },
        {
          heading: '4. Uluslararası veri aktarımı',
          body: (
            <p>
              Veri barındırma hizmetlerimiz global altyapılar (Vercel, Supabase vb.) üzerinde tutulabilir. Bu durumlarda da en yüksek koruma standartlarını garanti ediyoruz.
            </p>
          ),
        },
      ]
    : [
        {
          heading: '1. Collection of information',
          body: (
            <>
              <p>
                When you open an account, use our services, or contact us; we collect information such as identity information, contact details, payment history, and usage data.
              </p>
              <ul>
                <li>Direct information provided during registration</li>
                <li>Subscription and payment transaction data</li>
                <li>Platform interaction and usage metrics</li>
              </ul>
            </>
          ),
        },
        {
          heading: '2. Data usage and sharing',
          body: (
            <p>
              Your data is used only to improve our service quality, fulfill our legal obligations, and provide you with a personalized user experience. No sales are made to third parties.
            </p>
          ),
        },
        {
          heading: '3. Security measures',
          body: (
            <p>
              All your data is protected with industry-standard SSL/TLS encryption. Firewalls, unauthorized access detection systems, and periodic penetration tests are applied on our servers.
            </p>
          ),
        },
        {
          heading: '4. International data transfer',
          body: (
            <p>
              Our data hosting services may be held on global infrastructures (Vercel, Supabase, etc.). In these cases, we guarantee the highest protection standards.
            </p>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'GİZLİLİK POLİTİKASI' : 'PRIVACY POLICY'}
      title={isTr ? 'Veri ve gizlilik politikamız' : 'Data and privacy policy'}
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
      footerBlock={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'DAHA FAZLA BİLGİ' : 'MORE INFORMATION'}
            </span>
            <p className="mt-2 text-[14px] text-[#525252]">
              {isTr
                ? 'privacy@buaze.com üzerinden sorabilirsiniz.'
                : 'You can ask via privacy@buaze.com.'}
            </p>
          </div>
          <a
            href="mailto:privacy@buaze.com"
            className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            privacy@buaze.com
            <span aria-hidden>→</span>
          </a>
        </div>
      }
    />
  );
}
