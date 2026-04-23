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
    title: isTr ? 'KVKK Aydınlatma Metni - Buaze' : 'KVKK Clarification Text - Buaze',
    description: isTr
      ? '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aydınlatma metnimiz.'
      : 'Our clarification text within the scope of the Personal Data Protection Law (KVKK).',
  };
}

export const dynamic = 'force-dynamic';

export default async function KvkkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const intro = isTr
    ? 'Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla Buaze tarafından kişisel verilerinizin işlenmesine ilişkin detayları içerir.'
    : 'This text contains details regarding the processing of your personal data by Buaze as the data controller in accordance with the Law No. 6698 on the Protection of Personal Data ("KVKK").';

  const sections = isTr
    ? [
        {
          heading: '1. Veri sorumlusu',
          body: (
            <p>
              Buaze platformu, kullanıcılarının gizliliğine ve kişisel verilerinin korunmasına en üst düzeyde önem vermektedir. Veri sorumlusu olarak tüm süreçlerimizi KVKK standartlarına uygun şekilde yürütmekteyiz.
            </p>
          ),
        },
        {
          heading: '2. Kişisel verilerin işlenme amaçları',
          body: (
            <>
              <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
              <ul>
                <li>Hizmetlerimizin sunulması ve platformun iyileştirilmesi</li>
                <li>Müşteri geri bildirim süreçlerinin yönetilmesi</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                <li>İletişim faaliyetlerinin yürütülmesi</li>
              </ul>
            </>
          ),
        },
        {
          heading: '3. İşlenen veri kategorileri',
          body: (
            <p>
              Platform kullanımı sırasında işlenen veriler; kimlik bilgileri (isim–soyisim), iletişim bilgileri (e-posta, telefon), işlem güvenliği bilgileri ve müşteri işlem verilerini kapsamaktadır.
            </p>
          ),
        },
        {
          heading: '4. İlgili kişi hakları',
          body: (
            <>
              <p>
                KVKK&apos;nın 11. maddesi uyarınca herkes veri sorumlusuna başvurarak kendisiyle ilgili;
              </p>
              <ul>
                <li>Verilerin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse bilgi talep etme</li>
                <li>İşleme amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
              </ul>
            </>
          ),
        },
      ]
    : [
        {
          heading: '1. Data controller',
          body: (
            <p>
              The Buaze platform attaches the highest importance to the privacy of its users and the protection of their personal data. As the data controller, we carry out all our processes in accordance with KVKK standards.
            </p>
          ),
        },
        {
          heading: '2. Purposes of processing personal data',
          body: (
            <>
              <p>Your personal data is processed for the following purposes:</p>
              <ul>
                <li>Provision of our services and improvement of the platform</li>
                <li>Management of customer feedback processes</li>
                <li>Fulfillment of legal obligations</li>
                <li>Execution of communication activities</li>
              </ul>
            </>
          ),
        },
        {
          heading: '3. Categories of processed data',
          body: (
            <p>
              Data processed during platform use includes identity information (name–surname), contact information (e-mail, phone), transaction security information, and customer transaction data.
            </p>
          ),
        },
        {
          heading: '4. Rights of the data subject',
          body: (
            <>
              <p>
                Under Article 11 of the KVKK, everyone may apply to the data controller to request regarding themselves;
              </p>
              <ul>
                <li>Learning whether the data is processed</li>
                <li>Requesting information if data has been processed</li>
                <li>Learning whether it is used in accordance with the processing purpose</li>
                <li>Requesting correction if it is incomplete or incorrectly processed</li>
              </ul>
            </>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'YASAL UYARI' : 'LEGAL NOTICE'}
      title={isTr ? 'KVKK aydınlatma metni' : 'Personal data protection policy (KVKK)'}
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
      footerBlock={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'VERİ TALEPLERİ' : 'DATA REQUESTS'}
            </span>
            <p className="mt-2 text-[14px] text-[#525252]">
              {isTr ? 'kvkk@buaze.com adresine yazın.' : 'Write to kvkk@buaze.com.'}
            </p>
          </div>
          <a
            href="mailto:kvkk@buaze.com"
            className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
          >
            kvkk@buaze.com
            <span aria-hidden>→</span>
          </a>
        </div>
      }
    />
  );
}
