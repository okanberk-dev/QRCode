import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import LegalPageLayout from '@/components/marketing/LegalPageLayout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Gizlilik Politikası — Buaze' : 'Privacy Policy — Buaze',
  };
}

export const dynamic = 'force-dynamic';

export default async function GizlilikPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const intro = isTr
    ? 'Buaze olarak kişisel verilerinizin gizliliğini korumayı taahhüt ediyoruz. Bu kısa politika; topladığımız verileri, kullanım amaçlarımızı ve üçüncü taraf paylaşım sınırlarımızı özetler.'
    : 'As Buaze, we are committed to protecting the privacy of your personal data. This short policy summarises what we collect, how we use it, and our third-party sharing boundaries.';

  const sections = isTr
    ? [
        {
          heading: '1. Topladığımız bilgiler',
          body: (
            <p>
              Platforma kayıt olduğunuzda, IP adresi, cihaz bilgileri, tarayıcı türü gibi kullanım verilerini ve iletişim bilgilerinizi toplamaktayız.
            </p>
          ),
        },
        {
          heading: '2. Bilgilerin kullanımı',
          body: (
            <p>
              Toplanan veriler yalnızca hizmetin verilmesi, platform güvenliğinin sağlanması ve performans analizleri için kullanılır.
            </p>
          ),
        },
        {
          heading: '3. Çerezler',
          body: (
            <p>
              Hizmetlerimizi iyileştirmek için oturum ve güvenlik çerezleri kullanıyoruz. Tercihlerinizi hatırlamamıza yardımcı olurlar.
            </p>
          ),
        },
        {
          heading: '4. Üçüncü taraflarla paylaşım',
          body: (
            <p>
              Verilerinizi asla satmayız. Yalnızca meşru hizmet sağlayıcılarımızla gizlilik çerçevesinde paylaşım yapıyoruz.
            </p>
          ),
        },
      ]
    : [
        {
          heading: '1. Information we collect',
          body: (
            <p>
              When you register, we collect usage data (IP, device info, browser type) and contact information.
            </p>
          ),
        },
        {
          heading: '2. Use of information',
          body: (
            <p>
              Data is used exclusively for service delivery, platform security, and performance analytics.
            </p>
          ),
        },
        {
          heading: '3. Cookies',
          body: (
            <p>
              We use session and security cookies to improve our services and remember your preferences.
            </p>
          ),
        },
        {
          heading: '4. Third-party sharing',
          body: (
            <p>
              We never sell your data. We only share with legitimate providers under confidentiality.
            </p>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'GİZLİLİK' : 'PRIVACY'}
      title={isTr ? 'Gizlilik politikası' : 'Privacy policy'}
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
    />
  );
}
