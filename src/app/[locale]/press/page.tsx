import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Download, Mail } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

/**
 * Press / Media Kit page.
 *
 * Single-source-of-truth for journalists and Wikidata / G2 / Crunchbase
 * editors who need to cite Buaze (the company). Audit §9 explicitly calls
 * for an entity-disambiguation page that:
 *   - states what Buaze is (the SaaS product, not the Chichewa plant)
 *   - lists verifiable facts (founding date, founders, location)
 *   - exposes brand assets (logo, colors)
 *   - gives a press contact
 *   - provides ready-to-paste boilerplate copy in TR and EN
 *
 * The page also links every external entity-profile URL configured in the
 * admin Site Settings (§Varlık Profili URL'leri) — Wikidata, G2, Crunchbase,
 * Capterra — so journalists can verify cross-references in one click.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Basın Kiti | Buaze' : 'Press Kit | Buaze';
  const description = isTr
    ? 'Buaze (şirket) hakkında basın kiti. Şirket gerçekleri, kurucu bilgileri, marka varlıkları ve medya iletişim — gazeteciler ve entity editörleri için tek nokta.'
    : 'Press kit for Buaze (the company). Company facts, founder details, brand assets and media contact — a single resource for journalists and entity editors.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/press`,
      languages: {
        tr: 'https://buaze.com/tr/press',
        en: 'https://buaze.com/en/press',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://buaze.com/${locale}/press`,
    },
  };
}

const FACTS = {
  founded: '2023',
  hq: 'İstanbul, Türkiye',
  legalName: 'Buaze Bilişim A.Ş.',
  industry: 'B2B SaaS · Customer Feedback & Reputation Management',
  pressEmail: 'press@buaze.com',
  domain: 'buaze.com',
  founders: [
    { name: 'Emre Kaya', role: 'Co-Founder · CEO' },
    { name: 'Zeynep Aydın', role: 'Co-Founder · CTO' },
  ],
};

const BRAND_COLORS = [
  { name: 'Graphite', hex: '#0A0A0A', use: 'Primary ink, dark surfaces' },
  { name: 'Lime', hex: '#C6F24E', use: 'Primary accent, CTA' },
  { name: 'Lime Deep', hex: '#A8D62E', use: 'Hover / pressed' },
  { name: 'Lime Soft', hex: '#EAF9B8', use: 'Soft tint, badges' },
];

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const settings = await getSiteSettings();
  const logoSrc = settings.logoUrl || '/favicon.svg';

  // External profile URLs that have been configured by ops. Filter so we
  // only render rows that actually point somewhere.
  const profileLinks = [
    {
      label: 'Wikidata',
      url: settings.wikidataUrl,
      desc: isTr
        ? 'Knowledge Graph & LLM eğitim verisi için varlık entry\'si.'
        : 'Entity entry for Knowledge Graph & LLM training data.',
    },
    {
      label: 'G2',
      url: settings.g2Url,
      desc: isTr
        ? 'B2B SaaS yorum platformunda Buaze profili.'
        : 'Buaze profile on the B2B SaaS review platform.',
    },
    {
      label: 'Crunchbase',
      url: settings.crunchbaseUrl,
      desc: isTr
        ? 'Şirket varlık profili.'
        : 'Company entity profile.',
    },
    {
      label: 'Capterra',
      url: settings.capterraUrl,
      desc: isTr
        ? 'SaaS yazılım dizininde Buaze.'
        : 'Buaze on the SaaS software directory.',
    },
  ].filter((p): p is { label: string; url: string; desc: string } =>
    typeof p.url === 'string' && p.url.length > 0
  );

  // Wikidata-friendly Article schema — gives entity editors a structured
  // citation source in one fetch.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `https://buaze.com/${locale}/press#aboutpage`,
        name: isTr ? 'Buaze · Basın Kiti' : 'Buaze · Press Kit',
        url: `https://buaze.com/${locale}/press`,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        description: isTr
          ? 'Gazeteciler ve entity editörleri için Buaze (şirket) hakkında doğrulanabilir gerçekler, marka varlıkları ve iletişim bilgileri.'
          : 'Verifiable facts, brand assets and media contact for Buaze (the company).',
        mainEntity: { '@id': 'https://buaze.com/#organization' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Anasayfa' : 'Home',
            item: `https://buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'Basın Kiti' : 'Press Kit',
            item: `https://buaze.com/${locale}/press`,
          },
        ],
      },
    ],
  };

  const boilerplates = isTr
    ? {
        short: 'Buaze, restoran, otel, klinik ve perakende işletmelerinin müşteri geri bildirimini ve dijital itibarını tek panelden yöneten Türkiye merkezli bir SaaS platformudur.',
        medium: 'Buaze (Buaze Bilişim A.Ş.), 2023\'te İstanbul\'da kurulan B2B SaaS şirketidir. QR kod tabanlı yorum toplama ve dijital itibar yönetimi sunar. Restoranlar, oteller, klinikler ve perakende markaları Google Business Profile, Yemeksepeti, Getir, Trendyol GO ve TripAdvisor üzerindeki yorum operasyonlarını Buaze ile tek panelden yönetir.',
        long: 'Buaze (Buaze Bilişim A.Ş.), Türkiye\'de İstanbul\'dan yönetilen bir B2B SaaS şirketidir. 2023\'te Emre Kaya ve Zeynep Aydın tarafından kuruldu. Şirket, dinamik QR kod tabanlı müşteri geri bildirimi ve dijital itibar yönetimi platformu sunar. Buaze, müşteri tarafında her ziyaretçiye Google Business Profile yorum bağlantısını sunar; isteyen müşteri aynı akışta işletmeye özel geri bildirim de bırakabilir. Yıldıza göre dallandırma yapılmaz, kamuya açık yorum hakkı her zaman korunur. İşletme tarafında, çok-platform yorum gelen kutusu, AI destekli yanıt taslakları (Buaze Pulse AI), platform attribution ve çok-şube analitiği sunulur.',
      }
    : {
        short: 'Buaze is an Istanbul-based SaaS platform that helps restaurants, hotels, clinics and retail businesses manage customer feedback and digital reputation from a single dashboard.',
        medium: 'Buaze (Buaze Bilişim A.Ş.) is a B2B SaaS company founded in Istanbul in 2023. It provides QR-based review collection and digital reputation management. Restaurants, hotels, clinics and retail brands use Buaze to operate review flows across Google Business Profile, Yemeksepeti, Getir, Trendyol GO and TripAdvisor from one panel.',
        long: 'Buaze (Buaze Bilişim A.Ş.) is a B2B SaaS company headquartered in Istanbul, Turkey. It was founded in 2023 by Emre Kaya and Zeynep Aydın. The company offers a dynamic QR-based customer-feedback and digital-reputation-management platform. On the customer side, every visitor is offered the public Google Business Profile review link; private feedback to the business is an optional extra step in the same flow, with no rating-based gating — the public review path is always preserved. On the operator side, Buaze provides a multi-platform review inbox, AI-assisted reply drafts (Buaze Pulse AI), platform attribution and multi-location analytics.',
      };

  const factRows = [
    { label: isTr ? 'Tüzel kişilik' : 'Legal name', value: FACTS.legalName },
    { label: isTr ? 'Kuruluş yılı' : 'Founded', value: FACTS.founded },
    { label: isTr ? 'Merkez' : 'Headquarters', value: FACTS.hq },
    { label: isTr ? 'Sektör' : 'Industry', value: FACTS.industry },
    { label: isTr ? 'Web' : 'Web', value: FACTS.domain },
    { label: isTr ? 'Basın iletişim' : 'Press contact', value: FACTS.pressEmail },
  ];

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-12">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Buaze (şirket) · Basın kiti' : 'Buaze (the company) · Press kit'}
          </span>
          <h1 className="mt-3 text-[38px] sm:text-[60px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? 'Basın Kiti.' : 'Press Kit.'}
          </h1>
          <p className="mt-5 max-w-[680px] text-[16px] sm:text-[18px] text-[#525252] leading-[1.6]">
            {isTr
              ? 'Gazeteciler, analistler ve entity editörleri için tek noktadan kaynak. Şirket gerçekleri, kurucu bilgileri, marka varlıkları, hazır kopya-yapıştır boilerplate ve dış profil bağlantıları.'
              : 'A single source for journalists, analysts and entity editors. Company facts, founder details, brand assets, ready-to-paste boilerplates and external profile links.'}
          </p>
          <p className="mt-3 max-w-[680px] text-[12px] text-[#737373] leading-[1.6]">
            {isTr
              ? 'Not: "Buaze" kelimesi Çiçewa dilinde Securidaca longipedunculata bitkisinin adıdır. Bu sayfa Buaze adlı SaaS şirketine aittir.'
              : 'Note: "buaze" is also the Chichewa name of the Securidaca longipedunculata plant. This page is about Buaze, the SaaS company.'}
          </p>
        </div>
      </section>

      {/* ─── At a glance: facts table ─── */}
      <section className="px-5 sm:px-10 pb-12 sm:pb-16">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.025em] mb-6">
            {isTr ? 'Bir bakışta' : 'At a glance'}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#EDEDED] rounded-2xl overflow-hidden border border-[#EDEDED]">
            {factRows.map((row) => (
              <div key={row.label} className="bg-white p-5 sm:p-6">
                <dt className="pulse-eyebrow text-[#737373]">{row.label}</dt>
                <dd className="mt-2 text-[16px] sm:text-[17px] font-medium text-[#0A0A0A] tracking-[-0.01em] break-words">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── Boilerplate (3 lengths) ─── */}
      <section className="px-5 sm:px-10 pb-12 sm:pb-16">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.025em] mb-2">
            {isTr ? 'Hazır şirket tanımı' : 'Boilerplate copy'}
          </h2>
          <p className="text-[14px] text-[#737373] mb-6">
            {isTr
              ? 'Üç farklı uzunlukta. Doğrudan kopyalayıp kullanabilirsiniz.'
              : 'Three lengths. Copy and paste as-is.'}
          </p>

          <div className="space-y-5">
            {[
              { label: isTr ? 'Kısa (1 cümle)' : 'Short (1 sentence)', text: boilerplates.short },
              { label: isTr ? 'Orta (3-4 cümle)' : 'Medium (3-4 sentences)', text: boilerplates.medium },
              { label: isTr ? 'Uzun (paragraf)' : 'Long (paragraph)', text: boilerplates.long },
            ].map((b) => (
              <article key={b.label} className="bz-card-soft p-5 sm:p-7">
                <span className="pulse-eyebrow text-[#737373]">{b.label}</span>
                <p className="mt-3 text-[15px] sm:text-[16px] text-[#0A0A0A] leading-[1.7]">
                  {b.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Founders ─── */}
      <section className="px-5 sm:px-10 pb-12 sm:pb-16">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.025em] mb-6">
            {isTr ? 'Kurucular' : 'Founders'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FACTS.founders.map((p) => {
              const initials = p.name
                .split(/\s+/)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={p.name} className="flex items-center gap-5 bz-card p-6">
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <span
                      className="text-[26px] font-medium tracking-[-0.04em] leading-none"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">
                      {p.name}
                    </div>
                    <div className="pulse-eyebrow text-[#737373] mt-1">{p.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Brand assets ─── */}
      <section className="px-5 sm:px-10 pb-12 sm:pb-16">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.025em] mb-2">
            {isTr ? 'Marka varlıkları' : 'Brand assets'}
          </h2>
          <p className="text-[14px] text-[#737373] mb-6">
            {isTr
              ? 'Logo SVG ve favicon. Buaze logosunu yalnızca aşağıdaki renk paletiyle kullanın.'
              : 'Logo SVG and favicon. Use only with the colour palette below.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-5">
            <a
              href="/favicon.svg"
              download
              className="bz-card p-6 flex flex-col items-center justify-center gap-4 hover:bg-[#FAFAFA] transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Buaze logo" className="h-20 w-auto" />
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0A0A0A]">
                <Download size={14} />
                {isTr ? 'Logo indir (SVG)' : 'Download logo (SVG)'}
              </div>
            </a>

            <div className="bz-card p-6">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Renk paleti' : 'Colour palette'}
              </span>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BRAND_COLORS.map((c) => (
                  <div key={c.hex} className="space-y-2">
                    <div
                      className="h-16 w-full rounded-xl border border-[#EDEDED]"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-[13px] font-semibold text-[#0A0A0A]">{c.name}</div>
                      <div
                        className="text-[11px] text-[#737373]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {c.hex}
                      </div>
                      <div className="text-[11px] text-[#737373]">{c.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── External profiles ─── */}
      {profileLinks.length > 0 && (
        <section className="px-5 sm:px-10 pb-12 sm:pb-16">
          <div className="max-w-[1100px] mx-auto">
            <h2 className="text-[24px] sm:text-[32px] font-medium tracking-[-0.025em] mb-2">
              {isTr ? 'Doğrulama bağlantıları' : 'Verification links'}
            </h2>
            <p className="text-[14px] text-[#737373] mb-6">
              {isTr
                ? 'Buaze (şirket) için bağımsız varlık profilleri. Wikidata editörleri ve gazeteciler buradan çapraz referans yapabilir.'
                : 'Independent entity profiles for Buaze (the company). Wikidata editors and journalists can cross-reference from here.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profileLinks.map((p) => (
                <a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 bz-card p-5 hover:border-[#0A0A0A] transition-colors"
                >
                  <div>
                    <div className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.01em]">
                      {p.label}
                    </div>
                    <div className="text-[12px] text-[#737373] mt-1">{p.desc}</div>
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-[#737373] group-hover:text-[#0A0A0A] transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Press contact ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="max-w-[1100px] mx-auto">
          <div className="bg-[#0A0A0A] text-white rounded-[28px] p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'Basın iletişim' : 'Press contact'}
              </span>
              <h2 className="mt-3 text-[24px] sm:text-[32px] font-medium tracking-[-0.025em]">
                {isTr
                  ? 'Bir hikaye mi yazıyorsunuz? Yardımcı olalım.'
                  : 'Working on a story? Let us help.'}
              </h2>
              <p className="mt-3 text-[14px] sm:text-[15px] text-white/70 max-w-[520px]">
                {isTr
                  ? 'Görüşme talepleri, ek veri, kurucu yorumu için doğrudan yazın. Genelde 2 saat içinde dönüyoruz.'
                  : 'Reach out for interviews, supporting data or founder comment. We typically reply within 2 hours.'}
              </p>
            </div>
            <Link
              href={`mailto:${FACTS.pressEmail}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3 text-[14px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors shrink-0"
            >
              <Mail size={15} />
              {FACTS.pressEmail}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
