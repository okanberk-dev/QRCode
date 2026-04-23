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
    title: isTr ? 'Çerez Politikası - Buaze' : 'Cookie Policy - Buaze',
    description: isTr
      ? 'Daha iyi bir deneyim sunmak için kullandığımız çerezler hakkında bilgi.'
      : 'Information about the cookies we use to provide a better experience.',
  };
}

export const dynamic = 'force-dynamic';

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const t = getTranslations(locale);

  const intro = isTr
    ? 'Buaze web sitesini ve platformumuzu en verimli şekilde kullanabilmeniz, deneyiminizi kişiselleştirebilmemiz için çerezler (cookies) kullanmaktayız.'
    : 'We use cookies so that you can use the Buaze website and our platform in the most efficient way and so that we can personalize your experience.';

  const sections = isTr
    ? [
        {
          heading: '1. Çerez türleri',
          body: (
            <>
              <p>
                Kullandığımız çerezleri iki ana kategoriye ayırıyoruz. Tümü deneyim kalitesini artırmak ve platformu güvenli tutmak için hizmet eder.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                <div className="p-5 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl">
                  <span className="pulse-eyebrow text-[#A8D62E]">ZORUNLU</span>
                  <h4 className="mt-2 text-[15px] font-medium text-[#0A0A0A]">Teknik çerezler</h4>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.6]">
                    Sitenin çalışması ve güvenliği için gereken temel çerezler.
                  </p>
                </div>
                <div className="p-5 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl">
                  <span className="pulse-eyebrow text-[#737373]">ANALİTİK</span>
                  <h4 className="mt-2 text-[15px] font-medium text-[#0A0A0A]">Kullanım ölçümü</h4>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.6]">
                    Ziyaretçi trafiğini ölçer, platform deneyimini iyileştirir.
                  </p>
                </div>
              </div>
            </>
          ),
        },
        {
          heading: '2. Çerezleri nasıl kontrol edebilirsiniz?',
          body: (
            <>
              <p>
                Çoğu tarayıcı çerezleri otomatik kabul eder; ancak dilediğiniz zaman tarayıcı ayarlarınızdan reddedebilir ya da silebilirsiniz.
              </p>
              <div className="bg-[#0A0A0A] text-white/80 rounded-2xl p-5 not-prose">
                <span className="pulse-eyebrow text-[#C6F24E]">TARAYICI AYARI</span>
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  <li>Google Chrome · Ayarlar → Gizlilik → Çerezler</li>
                  <li>Safari · Tercihler → Gizlilik → Çerezler</li>
                  <li>Mozilla Firefox · Seçenekler → Gizlilik → Geçmiş</li>
                </ul>
              </div>
            </>
          ),
        },
      ]
    : [
        {
          heading: '1. Cookie types',
          body: (
            <>
              <p>
                We group the cookies we use into two main categories. Each of them helps improve experience quality and keep the platform secure.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                <div className="p-5 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl">
                  <span className="pulse-eyebrow text-[#A8D62E]">STRICTLY NECESSARY</span>
                  <h4 className="mt-2 text-[15px] font-medium text-[#0A0A0A]">Technical cookies</h4>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.6]">
                    Basic cookies required for the site to operate and stay secure.
                  </p>
                </div>
                <div className="p-5 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl">
                  <span className="pulse-eyebrow text-[#737373]">ANALYTICAL</span>
                  <h4 className="mt-2 text-[15px] font-medium text-[#0A0A0A]">Usage measurement</h4>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.6]">
                    Measures visitor traffic and helps improve the platform experience.
                  </p>
                </div>
              </div>
            </>
          ),
        },
        {
          heading: '2. How can you control cookies?',
          body: (
            <>
              <p>
                Most browsers automatically accept cookies, but you can reject or delete cookies from your browser settings at any time.
              </p>
              <div className="bg-[#0A0A0A] text-white/80 rounded-2xl p-5 not-prose">
                <span className="pulse-eyebrow text-[#C6F24E]">BROWSER SETTINGS</span>
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  <li>Google Chrome · Settings → Privacy → Cookies</li>
                  <li>Safari · Preferences → Privacy → Cookies</li>
                  <li>Mozilla Firefox · Options → Privacy → History</li>
                </ul>
              </div>
            </>
          ),
        },
      ];

  return (
    <LegalPageLayout
      locale={locale}
      t={t}
      eyebrow={isTr ? 'ÇEREZ BİLGİSİ' : 'COOKIE INFORMATION'}
      title={isTr ? 'Çerez kullanım politikamız' : 'Cookie usage policy'}
      lastUpdated={isTr ? 'SON GÜNCELLEME · 13 NİSAN 2026' : 'LAST UPDATED · APRIL 13, 2026'}
      intro={intro}
      sections={sections}
      footerBlock={
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'DETAYLI BİLGİ' : 'DETAILED INFO'}
            </span>
            <p className="mt-2 text-[14px] text-[#525252]">
              {isTr
                ? 'privacy@buaze.com adresinden ulaşın.'
                : 'Reach out via privacy@buaze.com.'}
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
