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
    title: isTr ? 'Kullanım Koşulları - Buaze' : 'Terms of Service - Buaze',
    description: isTr
      ? 'Buaze hizmetlerinin kullanım koşulları ve yasal şartları.'
      : 'Terms of service and legal conditions for using Buaze.',
  };
}

export const dynamic = 'force-dynamic';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  const intro = isTr
    ? 'Buaze platformunu kullanarak aşağıdaki kullanım koşullarını tamamen anladığınızı ve kabul ettiğinizi beyan edersiniz. Bu koşullar işletmemiz ile sizin aranızdaki yasal hakları belirler.'
    : 'By using the Buaze platform, you declare that you fully understand and accept the following terms of use. These terms define the legal rights between our business and you.';

  const sections = isTr
    ? [
        {
          heading: '1. Hizmet tanımı',
          body: (
            <p>
              Buaze, işletmelerin dijital itibarını yönetmesine, müşteri geri bildirimlerini toplamasına ve analiz etmesine olanak tanıyan bir SaaS (Yazılım Hizmeti) platformudur. Sunulan hizmetlerin kapsamı seçilen abonelik planına göre değişiklik gösterebilir.
            </p>
          ),
        },
        {
          heading: '2. Fikri mülkiyet hakları',
          body: (
            <p>
              Platform üzerinde yer alan tüm yazılımlar, tasarımlar, logolar ve metin içerikleri Buaze mülkiyetindedir. Yazılı izin olmaksızın kopyalanması, çoğaltılması veya ticari amaçla kullanılması kesinlikle yasaktır.
            </p>
          ),
        },
        {
          heading: '3. Kullanıcı sorumlulukları',
          body: (
            <p>
              Kullanıcılar, platformu yasalara ve dürüstlük kuralına uygun şekilde kullanmayı kabul eder. Sistemin manipüle edilmesi, sahte veriler girilmesi veya üçüncü şahısların haklarının ihlal edilmesi durumunda hesap derhal sonlandırılabilir.
            </p>
          ),
        },
        {
          heading: '4. Sorumluluk sınırlandırması',
          body: (
            <p>
              Buaze, teknik aksaklıklardan doğabilecek geçici hizmet kesintilerinden sorumlu tutulamaz. Yazılımımız <strong>olduğu gibi</strong> sunulur ve ticari başarı garantisi verilmez.
            </p>
          ),
        },
      ]
    : [
        {
          heading: '1. Service description',
          body: (
            <p>
              Buaze is a SaaS (Software as a Service) platform that allows businesses to manage their digital reputation, collect and analyze customer feedback. The scope of the services offered may vary according to the selected subscription plan.
            </p>
          ),
        },
        {
          heading: '2. Intellectual property rights',
          body: (
            <p>
              All software, designs, logos, and text content on the platform are the property of Buaze. Copying, reproducing, or using them for commercial purposes without written permission is strictly prohibited.
            </p>
          ),
        },
        {
          heading: '3. User responsibilities',
          body: (
            <p>
              Users agree to use the platform in accordance with the laws and the rule of integrity. In case of manipulation of the system, entry of fake data, or violation of the rights of third parties, the account may be terminated immediately.
            </p>
          ),
        },
        {
          heading: '4. Limitation of liability',
          body: (
            <p>
              Buaze cannot be held responsible for temporary service interruptions arising from technical glitches. Our software is provided <strong>as is</strong> and no guarantee of commercial success is given.
            </p>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'YASAL SÖZLEŞME' : 'LEGAL AGREEMENT'}
      title={isTr ? 'Kullanım Koşulları' : 'Terms of Service'}
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
    />
  );
}
