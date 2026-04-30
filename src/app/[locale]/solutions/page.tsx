import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronRight,
  Utensils,
  Hotel,
  Stethoscope,
  Scissors,
  Dumbbell,
  Scale,
  Home as HomeIcon,
  Car,
  Sparkles,
  GraduationCap,
  PawPrint,
  Building2,
} from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import {
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Çözümler | Buaze' : 'Solutions | Buaze';
  const description = isTr
    ? 'Buaze ile dijital itibarınızı yönetin: QR ile yakala, tek panelde topla, akıllı yönlendir, büyümeyi ölç. Her sektör için hazır.'
    : 'Manage your digital reputation with Buaze: capture via QR, collect in one panel, route smartly, measure growth. Ready for every sector.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions`,
      languages: { tr: 'https://buaze.com/tr/solutions', en: 'https://buaze.com/en/solutions' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions` },
  };
}

const SECTORS = [
  { slug: 'restaurants', icon: <Utensils size={18} />, tr: 'Restoran & Kafeler', en: 'Restaurants & Cafes' },
  { slug: 'hotels', icon: <Hotel size={18} />, tr: 'Oteller', en: 'Hotels' },
  { slug: 'boutique-hotels', icon: <Building2 size={18} />, tr: 'Butik Oteller', en: 'Boutique Hotels' },
  { slug: 'healthcare', icon: <Stethoscope size={18} />, tr: 'Sağlık Klinikleri', en: 'Healthcare Clinics' },
  { slug: 'dentists', icon: <Stethoscope size={18} />, tr: 'Diş Klinikleri', en: 'Dental Clinics' },
  { slug: 'aesthetic', icon: <Sparkles size={18} />, tr: 'Estetik & Kozmetik', en: 'Aesthetic & Cosmetic' },
  { slug: 'beauty-salon', icon: <Scissors size={18} />, tr: 'Güzellik Salonları', en: 'Beauty Salons' },
  { slug: 'veterinary', icon: <PawPrint size={18} />, tr: 'Veterinerler', en: 'Veterinary Clinics' },
  { slug: 'gym', icon: <Dumbbell size={18} />, tr: 'Spor Salonları', en: 'Gyms & Fitness' },
  { slug: 'law-firms', icon: <Scale size={18} />, tr: 'Hukuk Firmaları', en: 'Law Firms' },
  { slug: 'real-estate', icon: <HomeIcon size={18} />, tr: 'Emlak', en: 'Real Estate' },
  { slug: 'auto-service', icon: <Car size={18} />, tr: 'Araç Servisleri', en: 'Auto Services' },
  { slug: 'schools', icon: <GraduationCap size={18} />, tr: 'Okullar & Kurslar', en: 'Schools & Courses' },
];

export default async function SolutionsOverviewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const capabilities = [
    {
      Ill: IllusCompass,
      eyebrow: isTr ? 'YAKALA' : 'CAPTURE',
      title: isTr ? 'QR ile geri bildirim yakala' : 'Capture feedback via QR',
      desc: isTr
        ? 'Masaya, menüye, faturaya yapıştır. Müşteri tek tarama ile akıllı akışa düşer. Konum, masa ve kanal otomatik etiketlenir.'
        : 'Stick it on tables, menus, receipts. One scan routes the customer into your smart flow. Location, table and channel auto-tag.',
      cta: isTr ? 'QR oluşturucuyu dene' : 'Try the QR generator',
      href: `${base}/solutions/qr-generator`,
    },
    {
      Ill: IllusInbox,
      eyebrow: isTr ? 'TOPLA' : 'COLLECT',
      title: isTr ? 'Tek panelde topla' : 'Collect in one panel',
      desc: isTr
        ? 'Google, Yemeksepeti, Getir, Trendyol ve dahili kanal yorumları aynı akışta birleşir. Düşük puanlar dahili forma, yüksek puanlar platforma gider.'
        : 'Google, Yemeksepeti, Getir, Trendyol and internal channel reviews merge into one feed. Low ratings route internally; high ratings go public.',
      cta: isTr ? 'Nasıl çalışır' : 'See how it works',
      href: `${base}/how-it-works`,
    },
    {
      Ill: IllusChart,
      eyebrow: isTr ? 'ÖLÇ' : 'MEASURE',
      title: isTr ? 'Büyümeyi ölç' : 'Measure growth',
      desc: isTr
        ? 'Puan, kanal, şube ve saat bazında trendleri oku. Hangi aksiyonun neyi değiştirdiğini net gör; ekibi veriyle yönet.'
        : 'Read trends by rating, channel, branch and hour. See exactly which action moved what; manage the team with data.',
      cta: isTr ? 'Planları incele' : 'View plans',
      href: `${base}/pricing`,
    },
    {
      Ill: IllusShield,
      eyebrow: isTr ? 'KORU' : 'PROTECT',
      title: isTr ? 'Politikaya uyumlu büyü' : 'Grow policy-compliant',
      desc: isTr
        ? 'Gating yok, gizleme yok. Google\'a organik deneyim gider. Buaze panelinde tüm yorumlar şeffaf görünür.'
        : 'No gating, no hiding. The customer journey stays organic on Google. Every review is transparent in your Buaze panel.',
      cta: isTr ? 'Detayları gör' : 'See the details',
      href: `${base}/google-compliance`,
    },
  ];

  const numbers = [
    { num: '500+', label: isTr ? 'AKTİF İŞLETME' : 'ACTIVE BUSINESSES' },
    { num: '2.8M', label: isTr ? 'YAKALANAN YORUM' : 'REVIEWS CAPTURED' },
    { num: '%92', label: isTr ? 'İTİBAR ARTIŞI' : 'REPUTATION GROWTH' },
    { num: '<5dk', label: isTr ? 'KURULUM' : 'SETUP' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isTr ? 'Buaze Çözümleri' : 'Buaze Solutions',
    url: `https://buaze.com/${locale}/solutions`,
    description: isTr
      ? 'Buaze platformunun dijital itibar yönetimi çözümleri ve desteklediği sektörler.'
      : 'Digital reputation management solutions and supported industries by Buaze.',
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-20 pb-[60px] sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="solIndexGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#solIndexGrid)" />
        </svg>

        <div className="relative max-w-[1200px] mx-auto">
          <nav
            aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
            className="mb-6 text-[12px] text-[#737373] flex items-center flex-wrap gap-1.5"
          >
            <Link href={base} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Ana sayfa' : 'Home'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <span className="text-[#0A0A0A] font-medium">
              {isTr ? 'Çözümler' : 'Solutions'}
            </span>
          </nav>

          <div className="max-w-[820px] space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full pl-2 pr-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#0A0A0A]">
                {isTr ? 'ÇÖZÜMLER' : 'SOLUTIONS'}
              </span>
            </div>
            <h1 className="text-[38px] sm:text-[60px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? (
                <>
                  Dört adım, tek panel.{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">
                    Her sektör
                  </span>{' '}
                  için.
                </>
              ) : (
                <>
                  Four steps, one panel.{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">
                    Every sector
                  </span>
                  .
                </>
              )}
            </h1>
            <p className="text-[15px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[640px]">
              {isTr
                ? 'Her yorum bir işarettir. Buaze, QR ile topladığınız sinyalleri tek panelde toplar, ekibinize yönlendirir ve itibarınızı büyütür.'
                : 'Every review is a signal. Buaze collects the pulses you capture via QR into one dashboard, routes them to your team, and grows your reputation.'}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={`${base}/solutions/qr-generator`}
                className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
              >
                {isTr ? 'QR oluşturucuyu dene' : 'Try the QR generator'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Capabilities (4 solutions) ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10 sm:mb-14 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Ne sunuyoruz' : 'What we offer'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Sinyalden etkiye.' : 'From signal to impact.'}
            </h2>
          </div>

          <div className="space-y-6">
            {capabilities.map((cap, i) => (
              <div
                key={cap.eyebrow}
                className={`bz-card-soft p-6 sm:p-12 grid grid-cols-1 ${
                  i % 2 === 0 ? 'lg:grid-cols-[1.1fr_1fr]' : 'lg:grid-cols-[1fr_1.1fr]'
                } gap-8 lg:gap-12 items-center`}
              >
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <span className="pulse-eyebrow text-[#A8D62E]">
                    {String(i + 1).padStart(2, '0')} · {cap.eyebrow}
                  </span>
                  <h3 className="mt-4 text-[22px] sm:text-[36px] font-medium text-[#0A0A0A] tracking-[-0.025em] leading-[1.1]">
                    {cap.title}
                  </h3>
                  <p className="mt-4 text-[15px] sm:text-[16px] text-[#525252] leading-[1.65] max-w-[520px]">
                    {cap.desc}
                  </p>
                  <Link
                    href={cap.href}
                    className="inline-flex items-center gap-1.5 mt-6 text-[14px] font-medium text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
                  >
                    {cap.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
                <div className={`flex justify-center ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <cap.Ill size={260} className="w-full h-auto max-w-[280px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Numbers strip ─── */}
      <section className="bg-[#C6F24E] border-y border-[#A8D62E] px-5 sm:px-10 py-12 sm:py-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {numbers.map((item, i) => (
            <div key={i}>
              <div
                className="text-[28px] sm:text-[52px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {item.num}
              </div>
              <div className="pulse-eyebrow text-[#0A0A0A]/70 mt-3">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Sectors ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-10 sm:mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Sektörler' : 'Industries'}
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[44px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Her sektör için, tam oturur.' : 'Fits every sector, perfectly.'}
              </h2>
            </div>
            <p className="text-[15px] text-[#525252] max-w-[420px]">
              {isTr
                ? '13 farklı sektör için özel akış ve içgörü. Kendi sektörünü seç, detaylı sayfaya geç.'
                : 'Tailored flows and insights for 13 different sectors. Pick yours, see the detail page.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SECTORS.map((sector) => (
              <Link
                key={sector.slug}
                href={`${base}/solutions/${sector.slug}`}
                className="group flex items-center gap-3 bz-card p-4 hover:border-[#C6F24E] transition-colors"
              >
                <span className="shrink-0 w-10 h-10 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                  {sector.icon}
                </span>
                <span className="text-[13px] sm:text-[14px] font-medium text-[#0A0A0A] leading-tight">
                  {isTr ? sector.tr : sector.en}
                </span>
                <ChevronRight
                  size={14}
                  className="ml-auto text-[#A3A3A3] shrink-0 group-hover:text-[#0A0A0A] transition-colors"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QR Tool callout ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[1000px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-6 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#C6F24E]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative max-w-[520px] text-center lg:text-left">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
            </span>
            <h3 className="mt-3 text-[24px] sm:text-[32px] font-medium text-white tracking-[-0.02em] leading-tight">
              {isTr ? 'Saniyede QR oluştur.' : 'Generate a QR in seconds.'}
            </h3>
            <p className="mt-3 text-[15px] text-white/70 leading-[1.6]">
              {isTr
                ? 'Web sitenizin, menünüzün veya bir linkinizin yüksek çözünürlüklü QR kodunu hemen indirin. Kayıt gerekmez.'
                : 'Instantly download a high-resolution QR code for your website, menu, or any link. No signup.'}
            </p>
          </div>
          <Link
            href={`${base}/solutions/qr-generator`}
            className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors shrink-0"
          >
            {isTr ? 'QR oluşturucuya git' : 'Open QR generator'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[52px] font-medium leading-[1.04] tracking-[-0.035em] text-[#0A0A0A]">
            {isTr ? 'Çözümü bugün devreye al.' : 'Put the solution to work today.'}
          </h2>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[480px] mx-auto">
            {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez. Kurulum 2 dakika.' : '14-day free trial. No card required. 2-minute setup.'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Hemen başla' : 'Get started'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Satışla görüş' : 'Talk to sales'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
