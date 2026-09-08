import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  Mail,
  ShieldCheck,
  Library,
  Send,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getTranslations, type Locale } from '@/lib/translations';

// Stage 134 §38.214 — /features/campaigns marketing surface.
// Owner panel /dashboard/campaigns + admin /admin/customer-campaign-templates
// + /admin/campaign-approvals backend (§38.199, §38.200) marketing parity.
// Pattern source: /features/review-management.

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Kampanyalar — Müşteri yeniden etkileşim, İYS uyumlu | Buaze'
    : 'Campaigns — Customer re-engagement, ETK-compliant | Buaze';
  const description = isTr
    ? 'Sektörüne özel hazır şablon kütüphanesi, onay kontrollü gönderim akışı, gerçek zamanlı teslimat takibi. Buaze\'in ETK + İYS uyumlu müşteri mail kampanya modülü.'
    : 'Sector-specific template library, approval-led send flow, real-time delivery tracking. Buaze\'s ETK-compliant customer email campaign module.';
  const canonicalUrl = `https://www.buaze.com/${locale}/features/campaigns`;
  return {
    metadataBase: new URL('https://www.buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'müşteri kampanyası',
          'restoran e-posta pazarlama',
          'yeniden etkileşim kampanyası',
          'İYS uyumlu kampanya',
          'ETK uyumlu mail',
          'müşteri reactivation',
          'şablon tabanlı mail kampanyası',
          'CRM mail yönetimi',
        ]
      : [
          'customer campaign',
          'restaurant email marketing',
          're-engagement campaign',
          'IYS compliant campaign',
          'ETK compliant email',
          'customer reactivation',
          'template-based email campaign',
          'CRM email management',
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: 'https://www.buaze.com/tr/features/campaigns',
        en: 'https://www.buaze.com/en/features/campaigns',
        'x-default': 'https://www.buaze.com/en/features/campaigns',
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Buaze',
      locale: isTr ? 'tr_TR' : 'en_US',
      alternateLocale: isTr ? ['en_US'] : ['tr_TR'],
      type: 'website',
      images: [
        {
          url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png',
          width: 1200,
          height: 630,
          alt: 'Buaze — Kampanyalar',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://www.buaze.com/${locale}/features/campaigns`;

  // Campaign approval flow mockup
  const campaignMock = isTr
    ? {
        eyebrow: 'KAMPANYA · ONAYLANDI',
        title: 'Karaköy şubesi · Yeniden hoş geldin indirimi',
        sector: 'Restoran',
        sectorBg: '#FEF3C7',
        sectorFg: '#92400E',
        steps: [
          { label: 'Şablondan başla', state: 'done', meta: 'Restoran · Reactivation' },
          { label: 'Konu + içerik düzenle', state: 'done', meta: 'TR · 142 kelime' },
          { label: 'Alıcı listesi seç', state: 'done', meta: '420 müşteri · 60 gün pasif' },
          { label: 'Buaze ekibi onayı', state: 'done', meta: 'Onaylandı · 17:42' },
          { label: 'Gönderim', state: 'active', meta: 'Gönderim sırasında — 312/420' },
        ],
      }
    : {
        eyebrow: 'CAMPAIGN · APPROVED',
        title: 'Karaköy branch · Welcome-back discount',
        sector: 'Restaurant',
        sectorBg: '#FEF3C7',
        sectorFg: '#92400E',
        steps: [
          { label: 'Start from template', state: 'done', meta: 'Restaurant · Reactivation' },
          { label: 'Edit subject + body', state: 'done', meta: 'EN · 142 words' },
          { label: 'Pick recipient list', state: 'done', meta: '420 customers · dormant 60d' },
          { label: 'Buaze team approval', state: 'done', meta: 'Approved · 17:42' },
          { label: 'Sending', state: 'active', meta: 'In flight — 312/420' },
        ],
      };

  const cards = isTr
    ? [
        {
          icon: Library,
          title: 'Sektörel şablon kütüphanesi',
          body: '10 sektör (restoran, otel, klinik, perakende, güzellik, spor, eğitim, hukuk, paket servis, genel) × 3 kategori (yeniden etkileşim, özel teklif, geri bildirim isteği) × TR + EN = 60 hazır şablon. Buaze ekibinin compliance-safe metinleri.',
        },
        {
          icon: ShieldCheck,
          title: 'Onay kontrollü akış',
          body: 'Owner taslağı oluşturur → Buaze ekibi inceler (ETK m.5, İYS uyumu, marka tutarlılığı) → onaylar veya reddeder (gerekçeli). Spam riski + yasal hata riski operasyonel olarak ortadan kalkar.',
        },
        {
          icon: Send,
          title: 'Gerçek zamanlı teslimat takibi',
          body: 'Her mail için durum (gönderildi / teslim edildi / bounce / aboneliği iptal) anlık takip. KPI grid: alıcı / gönderilen / başarısız / bounce. CSV dışa aktarım owner panelden.',
        },
        {
          icon: Inbox,
          title: 'Yorum yönetimine entegre',
          body: 'Kampanya gönderdikten sonra müşteri yorumu artar mı? Yorum gelen kutusunda kampanya tag\'i ile filtrele, attribution\'ı gör. Geri bildirim → kampanya → geri bildirim döngüsü kapanır.',
        },
      ]
    : [
        {
          icon: Library,
          title: 'Sector-specific template library',
          body: '10 sectors (restaurant, hotel, clinic, retail, beauty, fitness, education, legal, delivery, generic) × 3 categories (reactivation, special offer, feedback request) × TR + EN = 60 ready templates. Compliance-safe copy by the Buaze team.',
        },
        {
          icon: ShieldCheck,
          title: 'Approval-led flow',
          body: 'Owner drafts → Buaze team reviews (ETK §5, IYS compliance, brand consistency) → approves or rejects (with reason). Spam risk + legal risk removed operationally.',
        },
        {
          icon: Send,
          title: 'Real-time delivery tracking',
          body: 'Per-recipient status (sent / delivered / bounce / unsubscribed) tracked live. KPI grid: recipient / sent / failed / bounce. CSV export from the owner panel.',
        },
        {
          icon: Inbox,
          title: 'Integrated with review management',
          body: 'After a campaign goes out, do customer reviews increase? Filter the inbox by campaign tag, see attribution. The feedback → campaign → feedback loop closes.',
        },
      ];

  const featureList = isTr
    ? [
        '60 hazır şablon (10 sektör × 3 kategori × 2 dil — Buaze ekibi tarafından hazırlanmış)',
        'Owner taslak → admin onay → otomatik gönderim akışı (4 durum: draft/pending/approved/sent)',
        'ETK m.5 gönderici kimliği + İYS aboneliği opt-in kontrol',
        'Alıcı segmentasyonu: rating, son ziyaret tarihi, ortalama harcama (CRM)',
        'Tek bir tıkla "şablon olarak kaydet" — ileride tekrar kullan',
        'Audit log + reddedilme gerekçeleri (min 20 karakter, forensic kayıt)',
      ]
    : [
        '60 ready templates (10 sectors × 3 categories × 2 languages — by the Buaze team)',
        'Owner draft → admin approval → auto-send flow (4 states: draft/pending/approved/sent)',
        'ETK §5 sender identity + IYS opt-in subscription check',
        'Recipient segmentation: rating, last visit date, average spend (CRM)',
        'One-click "save as template" — reuse later',
        'Audit log + rejection reasons (min 20 chars, forensic trail)',
      ];

  const faqs = isTr
    ? [
        {
          q: 'Kampanya kim onaylıyor?',
          a: 'Buaze ekibi tüm kampanya gönderimlerini inceleyip onaylar. ETK m.5 gönderici kimliği, İYS abonelik kontrolü, marka tutarlılığı ve spam riski açısından değerlendirilir. Onay sonrası owner zamanlama belirler ve gönderim başlar; reddedilirse gerekçesi (min 20 karakter) audit log\'a kaydedilir.',
        },
        {
          q: 'Şablon kütüphanesinde neler var?',
          a: '10 sektör × 3 kategori × 2 dil = 60 şablon. Sektörler: restoran, otel, klinik, perakende, güzellik, spor, eğitim, hukuk, paket servis, genel. Kategoriler: yeniden etkileşim (dormant müşteriye dönüş), özel teklif (sezonsal indirim), geri bildirim isteği (yorum çağrısı). Tüm metinler Buaze ekibi tarafından review-gating-safe ve customer-agency yazımıyla hazırlandı.',
        },
        {
          q: 'ETK ve İYS uyumu nasıl sağlanıyor?',
          a: 'Üç katmanlı: (1) Mail footer\'ı otomatik olarak gönderici tüzel kişiliği + iletişim bilgisi + abonelikten çıkma linki ile gönderilir (ETK m.5), (2) İYS aboneliği kontrol edilir — opt-out olan müşteriye gönderilmez, (3) Buaze ekibi onay aşamasında manuel doğrular. Tüm aksiyonlar audit log\'da forensic olarak kalır.',
        },
        {
          q: 'Alıcı segmentasyonu nasıl yapılıyor?',
          a: 'Owner paneldeki Müşteriler bölümünden segment kur: ortalama yıldız (4★+ memnun, 3★- dikkat gerekli), son ziyaret tarihi (60 gün+ pasif), ortalama harcama (premium müşteri), KVKK marketing onayı. Segment kaydet, kampanyada tekrar kullan. Anonim feedback otomatik dışında kalır (KVKK m.7).',
        },
        {
          q: 'Owner panelle yorum yönetimine entegre mi?',
          a: 'Evet. Kampanya gönderiminden sonra gelen yorumları kampanya tag\'i ile filtreleyip attribution\'ı analiz edebilirsin. Yorum gelen kutusunda "kampanya kaynaklı" yorumlar ayrı görünür; hangi kampanya hangi gerçek yorum etkisini doğurdu, dönüşüm oranlı raporda görünür.',
        },
      ]
    : [
        {
          q: 'Who approves campaigns?',
          a: 'The Buaze team reviews and approves every campaign send. We assess ETK §5 sender identity, IYS subscription status, brand consistency and spam risk. After approval the owner schedules and the send begins; if rejected, the reason (min 20 chars) is recorded in the audit log.',
        },
        {
          q: 'What is in the template library?',
          a: '10 sectors × 3 categories × 2 languages = 60 templates. Sectors: restaurant, hotel, clinic, retail, beauty, fitness, education, legal, delivery, generic. Categories: reactivation (return-to-business for dormant customers), special offer (seasonal discount), feedback request (review prompt). All copy is reviewed by the Buaze team to be review-gating-safe and customer-agency-aware.',
        },
        {
          q: 'How do you stay compliant with ETK and IYS?',
          a: 'Three-layered: (1) Mail footer auto-includes sender legal entity + contact + unsubscribe link (ETK §5), (2) IYS subscription is checked — opt-out customers never receive, (3) the Buaze team manually verifies during approval. Every action is preserved forensically in the audit log.',
        },
        {
          q: 'How does recipient segmentation work?',
          a: 'In the Customers panel, build a segment: average star (4★+ happy, 3★- needs attention), last visit date (60 days+ dormant), average spend (premium customer), KVKK marketing consent. Save the segment, reuse in campaigns. Anonymous feedback is automatically excluded (KVKK §7).',
        },
        {
          q: 'Is it integrated with the owner panel review management?',
          a: 'Yes. Filter incoming reviews by campaign tag after a send to analyze attribution. In the review inbox, "campaign-sourced" reviews are visible separately; which campaign produced which actual review effect shows up in the conversion-attributed report.',
        },
      ];

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: isTr ? 'Buaze Kampanyalar' : 'Buaze Campaigns',
    serviceType: isTr ? 'Müşteri mail kampanya yönetimi' : 'Customer email campaign management',
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://www.buaze.com' },
    areaServed: 'TR',
    availableLanguage: ['tr-TR', 'en-US'],
    url: canonicalUrl,
    description: isTr
      ? 'Müşteri yeniden etkileşim mail kampanyalarını sektör şablonu, onay kontrollü gönderim akışı, gerçek zamanlı teslimat takibi ile yöneten Buaze CRM modülü. ETK + İYS uyumlu.'
      : 'The Buaze CRM module managing customer re-engagement email campaigns with sector templates, approval-led send flow, real-time delivery tracking. ETK + IYS compliant.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: isTr ? 'TRY' : 'USD',
      description: isTr ? '14 gün ücretsiz deneme; kart gerektirmez.' : '14-day free trial; no card required.',
      url: `${base}/auth/register`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isTr ? 'Kampanya yetenekleri' : 'Campaign capabilities',
      itemListElement: featureList.map((feature, idx) => ({
        '@type': 'Offer',
        position: idx + 1,
        itemOffered: { '@type': 'Service', name: feature },
      })),
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://www.buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Kampanyalar' : 'Campaigns', item: canonicalUrl },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const howToSchema = buildHowToSchema({
    locale,
    name: isTr ? 'Buaze ile müşteri kampanyası gönderme' : 'Send a customer campaign with Buaze',
    description: isTr
      ? 'Buaze kampanya modülünde şablon seçip alıcı listesi tanımlayıp onay-gönderim akışını tamamlama.'
      : 'Pick a template in Buaze, set the recipient list and complete the approval-send flow.',
    url: canonicalUrl,
    steps: isTr
      ? [
          { name: 'Şablondan başla', text: 'Buaze owner panelinde Kampanyalar > Yeni kampanya altında sektörüne uygun bir hazır şablon seç (10 sektör × 3 kategori). "Boş başla" da bir seçenek; ama şablonla 5 dakikada hazır olursun.' },
          { name: 'Konu + içerik düzenle', text: 'Şablonun başlığı, mail subject\'i ve gövdesi ön-doldurulmuştur. Marka tonuna göre düzenle, dil seç (TR/EN). "Şablon olarak kaydet" checkbox\'ı ile ileride tekrar kullanabilirsin.' },
          { name: 'Alıcı segmenti seç', text: 'Müşteriler\'den segment tanımla: rating, son ziyaret tarihi, harcama, marketing onayı. Anonim feedback otomatik dışında kalır. Alıcı sayısı + örnek e-postalar ön-izleme olarak görünür.' },
          { name: 'Onay + gönderim', text: 'Buaze ekibi inceler (ETK m.5, İYS, marka uyumu). Onaylanırsa otomatik gönderim başlar; reddedilirse gerekçe audit log\'a kaydedilir. Live teslimat takibi (sent / bounce / unsubscribe) owner panelde.' },
        ]
      : [
          { name: 'Start from a template', text: 'In the Buaze owner panel under Campaigns > New campaign, pick a ready template matching your sector (10 sectors × 3 categories). "Start blank" is an option too; templates get you ready in 5 minutes.' },
          { name: 'Edit subject + body', text: 'The template title, mail subject and body are pre-filled. Tailor to your brand tone, pick language (TR/EN). "Save as template" checkbox lets you reuse later.' },
          { name: 'Pick recipient segment', text: 'From Customers, define a segment: rating, last visit date, spend, marketing consent. Anonymous feedback is auto-excluded. Recipient count + sample emails appear as a preview.' },
          { name: 'Approval + send', text: 'The Buaze team reviews (ETK §5, IYS, brand fit). Approved → auto-send begins; rejected → reason logged to audit. Live delivery tracking (sent / bounce / unsubscribe) in the owner panel.' },
        ],
  });

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqSchema) }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(howToSchema) }} />
      )}
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-[#0A0A0A] px-5 sm:px-10 py-20 sm:py-24 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[#C6F24E]/10 blur-[140px]"
          />
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 py-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'KAMPANYALAR · CRM' : 'CAMPAIGNS · CRM'}
                </span>
              </div>
              <h1 className="mt-5 text-[38px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[60px] md:text-[48px] lg:text-[72px]">
                {isTr ? (
                  <>
                    Müşterini geri{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      kazan
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Win your customers{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      back
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
                {isTr
                  ? 'Sektörüne özel hazır şablon, onay kontrollü gönderim, gerçek zamanlı teslimat takibi. ETK + İYS uyumlu mail kampanya akışı; spam ve yasal risk operasyondan çıkar.'
                  : 'Sector-specific ready templates, approval-led send, real-time delivery tracking. ETK + IYS compliant email campaign flow; spam and legal risk are removed from operations.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`${base}/auth/register`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
                >
                  {isTr ? 'Ücretsiz başla' : 'Start free'}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href={`${base}/features`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
                >
                  {isTr ? 'Diğer özellikler' : 'See all features'}
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
                {(isTr
                  ? ['60 hazır şablon', 'Onay kontrollü akış', 'ETK + İYS uyumlu']
                  : ['60 ready templates', 'Approval-led flow', 'ETK + IYS compliant']
                ).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Campaign approval flow mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#A8D62E]">{campaignMock.eyebrow}</span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: campaignMock.sectorBg, color: campaignMock.sectorFg }}
                  >
                    {campaignMock.sector}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-tight text-[#0A0A0A]">
                  {campaignMock.title}
                </h3>
                <div className="mt-4 space-y-2.5">
                  {campaignMock.steps.map((step, idx) => (
                    <article
                      key={step.label}
                      className="flex items-start gap-3 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          step.state === 'done'
                            ? 'bg-[#0A0A0A] text-[#C6F24E]'
                            : 'bg-[#C6F24E] text-[#0A0A0A] pulse-heartbeat'
                        }`}
                      >
                        {step.state === 'done' ? (
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                        ) : (
                          String(idx + 1)
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-[#0A0A0A]">{step.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#737373]">{step.meta}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Onay kontrollü' : 'Approval-led'}
              </span>
            </div>
          </div>
        </section>

        {/* ─── AEO definitional H2s ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[820px] space-y-12">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'NEDEN ÖNEMLİ' : 'WHY IT MATTERS'}
              </span>
              <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Müşteri kampanyaları neden gerekli?' : 'Why do customer campaigns matter?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[16px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Yeni müşteri bulmak mevcut müşteriyi geri kazanmaktan ortalama 5 kat daha pahalıdır. Geçmişte ziyaret eden ama son 60 günde gelmeyen müşteriler, bir dokunuşla "ah bunlar varmış" diye geri dönen kohorttur. Tek mesele zamanında ve doğru tonla iletişim kurmak.'
                    : 'Acquiring a new customer is on average 5x more expensive than winning back an existing one. Customers who visited in the past but have not returned in the last 60 days are the "oh, they\'re still here" cohort — they come back with a single nudge. The only matter is communicating at the right time with the right tone.'}
                </p>
                <p>
                  {isTr
                    ? 'Buaze\'in kampanya modülü bu iletişimi operasyonel + uyumlu hale getirir. Sektörüne özel hazır şablonlar (restoran "yeniden hoş geldin", klinik "kontrol randevusu hatırlatma", otel "sezon sonu özel"), Buaze ekibinin onay kontrolü (ETK m.5, İYS uyumu), gerçek zamanlı teslimat takibi. Sıfırdan mail yazmıyorsun; ne göndereceğini, kime ve nasıl yazılacağını biliyorsun.'
                    : 'The Buaze campaign module turns this communication into something operational + compliant. Sector-specific ready templates (restaurant "welcome back", clinic "follow-up reminder", hotel "end-of-season special"), Buaze team approval (ETK §5, IYS compliance), real-time delivery tracking. You\'re not writing from scratch; you know what to send, to whom and how to phrase it.'}
                </p>
              </div>
            </div>

            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'UYUM' : 'COMPLIANCE'}
              </span>
              <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'ETK + İYS uyumu nasıl çalışır?' : 'How does ETK + IYS compliance work?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[16px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Türkiye\'de ticari elektronik ileti (ETK m.5) gönderirken gönderici tüzel kişiliği, iletişim bilgisi ve abonelikten çıkma linki zorunludur. İYS (İleti Yönetim Sistemi) ise tüm onay/ret kayıtlarını merkezi olarak tutar; opt-out olan kişiye gönderim yapılırsa idari para cezası uygulanır.'
                    : 'In Türkiye, sending a commercial electronic message (ETK §5) legally requires sender legal entity, contact info and unsubscribe link. IYS (Message Management System) centrally holds all consent/refusal records; sending to opt-out individuals carries an administrative fine.'}
                </p>
                <p>
                  {isTr
                    ? 'Buaze üç katmanlı koruma sağlar: (1) Mail footer\'ı otomatik olarak ETK m.5 zorunlu alanları içerir, (2) Gönderim öncesi İYS abonelik durumu kontrol edilir, (3) Buaze ekibi her kampanyayı manuel onaylar — şüpheli içerik, eksik gönderici bilgisi veya KVKK pazarlama onayı olmayan alıcılar reddedilir. Audit log forensic kayıt olarak kalır.'
                    : 'Buaze provides three-layer protection: (1) Mail footer auto-includes ETK §5 required fields, (2) IYS subscription is checked before sending, (3) Buaze team manually approves every campaign — suspicious content, missing sender info or recipients without KVKK marketing consent are rejected. Audit log persists as a forensic trail.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4-up operating loop ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-[640px]">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'KAMPANYA DÖNGÜSÜ' : 'CAMPAIGN LOOP'}
              </span>
              <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
                {isTr ? 'Şablonla. Onayla. Gönder. Ölç.' : 'Templatize. Approve. Send. Measure.'}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ icon: Icon, title, body }, i) => (
                <article key={title} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="pulse-eyebrow inline-block rounded bg-[#0A0A0A] px-2 py-1 text-[#C6F24E]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                      <Icon size={17} strokeWidth={2.2} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold leading-tight">{title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#525252]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SPEC ROW ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                l: isTr ? 'HAZIR ŞABLON' : 'READY TEMPLATES',
                v: '60',
                sub: isTr
                  ? '10 sektör × 3 kategori × TR + EN, Buaze ekibi hazırlığı'
                  : '10 sectors × 3 categories × TR + EN, by the Buaze team',
              },
              {
                l: isTr ? 'ONAY AKIŞI' : 'APPROVAL FLOW',
                v: '4 adım',
                sub: isTr
                  ? 'Taslak → Onay bekliyor → Onaylandı/Reddedildi → Gönderim'
                  : 'Draft → Pending → Approved/Rejected → Send',
              },
              {
                l: isTr ? 'TESLİMAT TAKİBİ' : 'DELIVERY TRACKING',
                v: 'Live',
                sub: isTr
                  ? 'Per-alıcı durum: gönderildi, teslim, bounce, abonelik iptal'
                  : 'Per-recipient status: sent, delivered, bounce, unsubscribe',
              },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                <p className="pulse-eyebrow text-[#737373]">{k.l}</p>
                <p
                  className="mt-2 text-[28px] font-medium leading-none tracking-tight text-[#0A0A0A] sm:text-[36px]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {k.v}
                </p>
                <p className="mt-2 text-[12px] leading-[1.55] text-[#525252]">{k.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="border-t border-[#EDEDED] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[860px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SIK SORULANLAR' : 'FREQUENTLY ASKED'}
            </span>
            <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[40px]">
              {isTr ? 'Kampanyalar hakkında her şey.' : 'Everything about campaigns.'}
            </h2>
            <div className="mt-8 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((f, idx) => (
                <details
                  key={f.q}
                  className="group py-5"
                  open={idx < 2}
                >
                  <summary className="flex cursor-pointer items-start justify-between gap-4 text-left text-[16px] font-semibold leading-[1.4] text-[#0A0A0A] [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <ChevronDown
                      size={18}
                      className="mt-0.5 shrink-0 text-[#737373] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-[14px] leading-[1.7] text-[#525252]">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[13px] text-[#525252]">
              <span>{isTr ? 'Daha fazla:' : 'More:'}</span>
              <Link href={`${base}/features/audit-center`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Denetim Merkezi' : 'Audit Center'}
              </Link>
              <Link href={`${base}/features/surveys`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Anketler' : 'Surveys'}
              </Link>
              <Link href={`${base}/features/review-management`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Yorum Yönetimi' : 'Review Management'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <Mail className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[28px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'İlk kampanyan 5 dakikada yola çıksın.' : 'Send your first campaign in 5 minutes.'}
            </h2>
            <p className="mt-4 text-[15px] text-[#1A1A1A] sm:text-[17px]">
              {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez.' : '14 days free. No credit card required.'}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Hemen başla' : 'Get started'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/pricing`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0A0A0A] bg-transparent px-7 py-3.5 text-[15px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Plan detayları' : 'Plan details'}
              </Link>
            </div>
          </div>
        </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
