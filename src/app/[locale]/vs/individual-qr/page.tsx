import { Check, X } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ComparisonLayout from '@/components/marketing/ComparisonLayout';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (locale === 'tr' ? 'Buaze vs Bireysel QR | Akıllı İtibar Yönetimi' : 'Buaze vs Individual QR | Smart Reputation Management'),
    description: locale === 'tr'
      ? 'Ücretsiz statik QR kodları işletmeniz için ne kadar güvenli? Dinamik Buaze QR\'lerinin yorum bağlantıları, müşteri tercihi ve tek panelin farkını öğrenin.'
      : 'How secure are free static QR codes for your business? Learn how dynamic Buaze QR codes add review links, customer choice and one panel.',
    alternates: {
      canonical: `/${locale}/vs/individual-qr`,
      languages: {
        tr: '/tr/vs/individual-qr',
        en: '/en/vs/individual-qr',
        'x-default': '/tr/vs/individual-qr',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://www.buaze.com/${locale}/vs/individual-qr`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function VsIndividualQrPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const rows = [
    {
      label: t.compare_f1, // Dinamik QR
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Statik (sabit)' : 'Static (fixed)'}</span>,
    },
    {
      label: t.compare_f2, // Özel Geri Bildirim Kanalı
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f3, // Anlık SMS/Email Bildirimi
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f5, // Tek Tıkla Google Bağlantısı
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Tek link' : 'Single link'}</span>,
    },
    {
      label: t.compare_f4, // Müşteri Veri Tabanı (CRM)
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
        label: locale === 'tr' ? 'Link Güncelleme' : 'Link Update',
        buaze: <span className="pulse-eyebrow text-[#A8D62E]">{locale === 'tr' ? 'ANINDA' : 'INSTANT'}</span>,
        competitor: <span className="pulse-eyebrow text-[#B91C1C]">{locale === 'tr' ? 'YENİDEN BASKI' : 'REPRINT'}</span>,
      },
    {
      label: t.compare_f6, // Çoklu Şube Yönetimi
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
  ];

  const isTr = locale === 'tr';
  const canonicalUrl = `https://www.buaze.com/${locale}/vs/individual-qr`;
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: isTr ? 'Buaze vs Bireysel QR' : 'Buaze vs Individual QR',
    description: isTr
      ? 'Ücretsiz statik QR kodları ve dinamik Buaze altyapısının karşılaştırması.'
      : 'Comparison of free static QR codes vs the dynamic Buaze infrastructure.',
    url: canonicalUrl,
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    about: ['QR code services', 'Customer feedback platform', 'Reputation management'],
    isPartOf: { '@type': 'WebSite', name: 'Buaze', url: 'https://www.buaze.com' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Karşılaştırma' : 'Compare', item: `https://www.buaze.com/${locale}/compare` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Bireysel QR' : 'Individual QR', item: canonicalUrl },
    ],
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(webPageSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
    <ComparisonLayout
      locale={locale}
      t={t}
      vsName={locale === 'tr' ? 'Bireysel QR' : 'Individual QR'}
      heroTitle={locale === 'tr' ? 'Statik QR kod mu, Buaze QR yorum akışı mı?' : 'Static QR code or a Buaze QR review flow?'}
      heroDesc={locale === 'tr' 
        ? 'Durağan QR kodları eskidi. İşletmenizin değişen ihtiyaçlarına uyum sağlayan, yorum akışınızı sadeleştiren ve size anlık veri getiren akıllı Buaze altyapısına geçin.'
        : 'Static QR codes are obsolete. Switch to the smart Buaze infrastructure that adapts to your business needs, simplifies your review flow, and brings you real-time data.'}
      rows={rows}
      argumentTitle={locale === 'tr' ? 'Ücretsiz QR Kodların Gizli Maliyeti' : 'The Hidden Cost of Free QR Codes'}
      argumentDesc={locale === 'tr'
        ? 'Ücretsiz oluşturulan statik QR kodları bir kez basıldıktan sonra değiştirilemez. Google Maps linkiniz güncellendiğinde veya şube yapınız değiştiğinde tüm baskıları çöpe atmanız gerekir.\nEn kritiği: Statik QR\'larda servis kurtarma kanalı yok. Misafir Google\'a yorum bırakırken aynı akışta işletmene özel geri bildirim de gönderemez; servis sorunlarını özel bir yanıtla hızlıca çözme fırsatını kaçırırsın.'
        : 'Static QR codes created for free cannot be changed once printed. When your Google Maps link is updated or your branch structure changes, you have to throw away all prints.\nMost critically: Static QR codes have no service-recovery channel. A guest can leave a Google review, but cannot also share private feedback with your team in the same flow — so you miss the chance to resolve service issues quickly with a private reply.'}
    />
    </>
  );
}
