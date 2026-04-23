import type { Metadata } from 'next';
import { Mail, Smartphone, Bell, MessageCircle } from 'lucide-react';
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
    title: locale === 'tr' ? 'Ticari İleti Onayı — Buaze' : 'Marketing Consent — Buaze',
    description: locale === 'tr'
      ? 'Ticari elektronik ileti gönderimine ilişkin bilgilendirme ve onay metni.'
      : 'Information and consent text for sending commercial electronic messages.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function TicariIletiPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const intro = isTr
    ? '6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca, sizlere daha iyi hizmet verebilmek için iletişim kanalları üzerinden bilgilendirme yapılmaktadır.'
    : 'In accordance with the Law No. 6563 on the Regulation of Electronic Commerce, info is provided via communication channels to provide you with better service.';

  const channels = isTr
    ? [
        { icon: <Mail size={18} />, label: 'E-posta' },
        { icon: <Smartphone size={18} />, label: 'SMS ve arama' },
        { icon: <Bell size={18} />, label: 'Push bildirimleri' },
        { icon: <MessageCircle size={18} />, label: 'Anlık mesajlaşma' },
      ]
    : [
        { icon: <Mail size={18} />, label: 'Email' },
        { icon: <Smartphone size={18} />, label: 'SMS and calls' },
        { icon: <Bell size={18} />, label: 'Push notifications' },
        { icon: <MessageCircle size={18} />, label: 'Instant messaging' },
      ];

  const sections = isTr
    ? [
        {
          heading: 'İletişim kanalları',
          body: (
            <>
              <p>
                Buaze tarafından sunulan ürün, hizmet, özel teklif, kampanya ve güncellemeler hakkında aşağıdaki kanallar aracılığıyla bilgilendirilmeyi kabul ediyorum:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                {channels.map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl"
                  >
                    <span className="shrink-0 w-10 h-10 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                      {ch.icon}
                    </span>
                    <span className="text-[14px] font-medium text-[#0A0A0A]">{ch.label}</span>
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          heading: 'Cayma hakkı (opt-out)',
          body: (
            <>
              <p>
                Dilediğiniz zaman, hiçbir gerekçe göstermeksizin bu onayı geri çekebilirsiniz. Her iletimizde size abonelikten çıkma seçeneği sunulmaktadır.
              </p>
              <div className="bg-[#0A0A0A] text-white rounded-2xl p-6 not-prose flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <p className="text-[14px] text-white/80 max-w-[440px] leading-relaxed">
                  Abonelikten çıkma talebiniz bize ulaştıktan sonra 3 iş günü içinde tüm gönderimler durdurulur.
                </p>
                <a
                  href="mailto:hello@buaze.com"
                  className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-5 py-3 rounded-full text-[13px] font-medium hover:bg-[#A8D62E] transition-colors shrink-0"
                >
                  hello@buaze.com
                </a>
              </div>
            </>
          ),
        },
      ]
    : [
        {
          heading: 'Communication channels',
          body: (
            <>
              <p>
                I agree to be informed about the products, services, special offers, campaigns, and updates offered by Buaze through the following channels:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose">
                {channels.map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl"
                  >
                    <span className="shrink-0 w-10 h-10 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                      {ch.icon}
                    </span>
                    <span className="text-[14px] font-medium text-[#0A0A0A]">{ch.label}</span>
                  </div>
                ))}
              </div>
            </>
          ),
        },
        {
          heading: 'Right of withdrawal (opt-out)',
          body: (
            <>
              <p>
                You can withdraw this consent at any time without giving any reason. Every message we send offers an unsubscribe option.
              </p>
              <div className="bg-[#0A0A0A] text-white rounded-2xl p-6 not-prose flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <p className="text-[14px] text-white/80 max-w-[440px] leading-relaxed">
                  All transmissions will be stopped within 3 business days after your unsubscribe request reaches us.
                </p>
                <a
                  href="mailto:hello@buaze.com"
                  className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-5 py-3 rounded-full text-[13px] font-medium hover:bg-[#A8D62E] transition-colors shrink-0"
                >
                  hello@buaze.com
                </a>
              </div>
            </>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'İLETİŞİM ONAYI' : 'COMMUNICATION CONSENT'}
      title={
        isTr
          ? 'Ticari ileti ve elektronik iletişim beyanı'
          : 'Commercial message and electronic communication'
      }
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
      footerBlock={null}
    />
  );
}
