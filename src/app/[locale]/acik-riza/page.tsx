import type { Metadata } from 'next';
import { Check } from 'lucide-react';
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
    title: locale === 'tr' ? 'Açık Rıza Metni — Buaze' : 'Explicit Consent — Buaze',
    description: locale === 'tr'
      ? 'Kişisel verilerinizin işlenmesine yönelik açık rıza beyanı.'
      : 'Explicit consent declaration for processing personal data.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const intro = isTr
    ? 'Buaze platformu üzerinden sunulan hizmetlerden yararlanırken, kişisel verilerinizin işlenmesine yönelik hür iradenizle verdiğiniz onay beyanıdır.'
    : 'This is the consent declaration you give with your free will for the processing of your personal data while benefiting from the services offered through the Buaze platform.';

  const consentItems = isTr
    ? [
        'Pazarlama ve kampanya süreçleri',
        'Kişiselleştirilmiş ürün önerileri',
        'Müşteri memnuniyet anketleri',
        'Yurt dışı sunucu altyapı kullanımı',
      ]
    : [
        'Marketing and campaign processes',
        'Personalized product offers',
        'Customer satisfaction surveys',
        'Use of international server infrastructure',
      ];

  const sections = isTr
    ? [
        {
          heading: 'Rıza kapsamı',
          body: (
            <>
              <p>
                Buaze tarafından sunulan Aydınlatma Metni çerçevesinde, aşağıdaki amaçlar doğrultusunda verilerimin işlenmesine ve saklanmasına onay veriyorum:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                {consentItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#C6F24E] flex items-center justify-center">
                      <Check size={13} className="text-[#0A0A0A]" strokeWidth={3} />
                    </span>
                    <span className="text-[14px] font-medium text-[#0A0A0A]">{item}</span>
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          heading: 'Yurt dışı aktarım',
          body: (
            <p>
              Verilerimin sunucu/bulut sağlayıcısı olarak hizmet alınan (sunucuları yurt dışında bulunabilen) teknoloji altyapı firmalarına aktarılmasına ve burada işlenmesine hür irademle rıza gösteriyorum.
            </p>
          ),
        },
      ]
    : [
        {
          heading: 'Scope of consent',
          body: (
            <>
              <p>
                Within the framework of the Clarification Text provided by Buaze, I consent to the processing and storage of my data for the following purposes:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                {consentItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#C6F24E] flex items-center justify-center">
                      <Check size={13} className="text-[#0A0A0A]" strokeWidth={3} />
                    </span>
                    <span className="text-[14px] font-medium text-[#0A0A0A]">{item}</span>
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          heading: 'International transfer',
          body: (
            <p>
              I give consent with my free will for my data to be transferred to and processed by technology infrastructure companies (whose servers may be abroad) from which servers/cloud providers are used.
            </p>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'ONAY METNİ' : 'CONSENT FORM'}
      title={
        isTr
          ? 'Kişisel verilerin işlenmesi açık rıza beyanı'
          : 'Explicit consent for personal data processing'
      }
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
      footerBlock={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'RIZAYI GERİ ÇEKME' : 'WITHDRAW CONSENT'}
            </span>
            <p className="mt-2 text-[14px] text-[#525252]">
              {isTr
                ? 'Dilediğiniz zaman çekebilirsiniz.'
                : 'You can withdraw at any time.'}
            </p>
          </div>
          <a
            href="mailto:hello@buaze.com"
            className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            hello@buaze.com
            <span aria-hidden>→</span>
          </a>
        </div>
      }
    />
  );
}
