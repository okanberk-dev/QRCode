import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlatformLogo, { GLOBAL_DELIVERY, GLOBAL_REVIEW, TR_DELIVERY, TR_REVIEW } from '@/components/marketing/PlatformLogo';
import type { PlatformItem } from '@/components/marketing/PlatformLogo';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Entegrasyonlar — Google, Yemeksepeti, Getir, Slack | Buaze'
      : 'Integrations — Google, Slack, Teams, WhatsApp | Buaze';
  const description =
    locale === 'tr'
      ? 'İşletmenizde zaten kullandığınız araçlarla Buaze tek tıkla konuşur. Google, Yemeksepeti, Getir, Slack, Teams, WhatsApp, Zapier ve daha fazlası.'
      : 'Buaze talks to the tools your team already uses: Google, Uber Eats, DoorDash, Deliveroo, Slack, Microsoft Teams, WhatsApp, Zapier and more — connect in clicks.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/integrations`,
      languages: { tr: '/tr/integrations', en: '/en/integrations', 'x-default': '/tr/integrations' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://buaze.com/${locale}/integrations`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const teamTools: PlatformItem[] = isTr
    ? [
        { id: 'slack', name: 'Slack', tag: 'Kanal bildirimleri' },
        { id: 'teams', name: 'Microsoft Teams', tag: 'Kurumsal bildirim' },
        { id: 'whatsapp', name: 'WhatsApp Business', tag: 'Mobil alert' },
        { id: 'zapier', name: 'Zapier', tag: '5000+ uygulama' },
      ]
    : [
        { id: 'slack', name: 'Slack', tag: 'Channel notifications' },
        { id: 'teams', name: 'Microsoft Teams', tag: 'Enterprise alerts' },
        { id: 'whatsapp', name: 'WhatsApp Business', tag: 'Mobile alert' },
        { id: 'zapier', name: 'Zapier', tag: '5,000+ apps' },
      ];

  // `live: false` — bu gruptaki bağlantılar henüz ürün içinde yok. Slack bildirim
  // yüzeyi üründen kaldırıldı (CLAUDE.md §34.5), webhook CRUD hâlâ backlog'da
  // (§38.A). Hepsini "BAĞLI/LIVE" rozetiyle göstermek olmayan bir yeteneği
  // varmış gibi sunuyordu.
  const groups: Array<{
    title: string;
    subtitle: string;
    items: PlatformItem[];
    live?: boolean;
  }> = [
    {
      title: isTr ? 'Yorum platformları' : 'Review platforms',
      subtitle: isTr
        ? 'Müşteriler nerede konuşursa orada olun.'
        : 'Be where customers are talking.',
      items: isTr ? TR_REVIEW : GLOBAL_REVIEW,
    },
    {
      title: isTr ? 'Paket servis' : 'Delivery',
      subtitle: isTr ? 'Her paket bir fırsat.' : 'Every package is an opportunity.',
      items: isTr ? TR_DELIVERY : GLOBAL_DELIVERY,
    },
    {
      title: isTr ? 'Takım araçları' : 'Team tools',
      subtitle: isTr
        ? 'Ekibinize bildirim akıtın.'
        : 'Stream alerts to your team.',
      items: teamTools,
      live: false,
    },
  ];

  const allIntegrations = groups.flatMap((g) => g.items);
  const canonicalUrl = `https://buaze.com/${locale}/integrations`;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isTr ? 'Buaze entegrasyonları' : 'Buaze integrations',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    numberOfItems: allIntegrations.length,
    itemListElement: allIntegrations.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      description: it.tag,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Entegrasyonlar' : 'Integrations', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-8">
        <div className="max-w-[1200px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Entegrasyonlar' : 'Integrations'}
          </span>
          <h1 className="mt-4 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? (
              <>
                Mevcut akışına
                <br />
                dokun.
              </>
            ) : (
              <>
                Plug into the tools
                <br />
                you already use.
              </>
            )}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[560px] leading-[1.6]">
            {isTr
              ? 'İşletmenizde zaten kullandığınız araçlarla Buaze tek tıkla konuşur. API ve webhook\'lar developer dokümanlarında.'
              : 'Buaze connects with the tools you already run in one click. APIs and webhooks live in our developer docs.'}
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1200px] mx-auto">
          {groups.map((g, gi) => (
            <div
              key={g.title}
              className={`pt-8 sm:pt-10 ${gi === 0 ? 'border-t-2 border-[#0A0A0A]' : 'border-t border-[#EDEDED]'}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-8 lg:gap-10 pb-10 sm:pb-12">
                <div>
                  <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.02em] leading-[1.1]">
                    {g.title}
                  </h2>
                  <p className="mt-2 text-[13px] text-[#737373]">{g.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-xl flex items-center gap-4"
                    >
                      <PlatformLogo id={it.id} size={40} rounded={10} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate">{it.name}</div>
                        <div className="pulse-eyebrow text-[#737373] mt-0.5 truncate">{it.tag}</div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full pulse-eyebrow ${
                          g.live === false
                            ? 'bg-[#EDEDED] text-[#737373]'
                            : 'bg-[#C6F24E] text-[#0A0A0A]'
                        }`}
                      >
                        {g.live === false
                          ? isTr ? 'YAKINDA' : 'SOON'
                          : isTr ? 'BAĞLI' : 'LIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]">
            {isTr
              ? 'Özel entegrasyona ihtiyacınız mı var?'
              : 'Need a custom integration?'}
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? 'Herkese açık REST API ve webhook\'lar yol haritamızda. İhtiyacınızı yazın, öncelik sırasını buna göre belirliyoruz.'
              : 'A public REST API and webhooks are on our roadmap. Tell us what you need and we will prioritise accordingly.'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Özel entegrasyon iste' : 'Request a custom integration'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
