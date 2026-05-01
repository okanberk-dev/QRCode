import {
  QrCode,
  TrendingUp,
  Users,
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
  Star,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';
import Link from 'next/link';
import { ReactNode } from 'react';

interface SolutionPageLayoutProps {
  locale: Locale;
  t: Translations;
  industryKey: string;
  icon: ReactNode;
  industryBadge: string;
  h1Prefix: string;
  h1Suffix: string;
  description: string;
  /** Deprecated — kept for prop-compat; layout now always uses Pulse lime. */
  accentColor?: string;
  stats?: { num: string; label: string; context?: string }[];
  steps?: { title: string; desc: string; icon: ReactNode }[];
  benefits?: { title: string; desc: string; icon: ReactNode }[];
  faqs?: { q: string; a: string }[];
  isLoggedIn?: boolean;
  slug?: string;
  overview?: string;
  /** Optional inline SVG illustration rendered on the right of the hero
   *  on lg breakpoints. Sits inside a 2-column grid; if omitted, the
   *  hero stays single-column (legacy layout). */
  illustration?: ReactNode;
}

const INDUSTRY_SLUG_MAP: Record<string, string> = {
  res: 'restaurants',
  hot: 'hotels',
  hea: 'healthcare',
  den: 'dentists',
  bsa: 'beauty-salon',
  gym: 'gym',
  vet: 'veterinary',
  law: 'law-firms',
  re: 'real-estate',
  auto: 'auto-service',
  aes: 'aesthetic',
  sch: 'schools',
  bho: 'boutique-hotels',
  ret: 'retail',
};

const ALL_SOLUTIONS = [
  { slug: 'restaurants', icon: <Utensils size={16} />, tr: 'Restoran & Kafeler', en: 'Restaurants & Cafes' },
  { slug: 'hotels', icon: <Hotel size={16} />, tr: 'Oteller', en: 'Hotels' },
  { slug: 'healthcare', icon: <Stethoscope size={16} />, tr: 'Sağlık Klinikleri', en: 'Healthcare Clinics' },
  { slug: 'dentists', icon: <Stethoscope size={16} />, tr: 'Diş Klinikleri', en: 'Dental Clinics' },
  { slug: 'beauty-salon', icon: <Scissors size={16} />, tr: 'Güzellik Salonları', en: 'Beauty Salons' },
  { slug: 'gym', icon: <Dumbbell size={16} />, tr: 'Spor Salonları', en: 'Gyms & Fitness' },
  { slug: 'veterinary', icon: <PawPrint size={16} />, tr: 'Veterinerler', en: 'Veterinary Clinics' },
  { slug: 'law-firms', icon: <Scale size={16} />, tr: 'Hukuk Firmaları', en: 'Law Firms' },
  { slug: 'real-estate', icon: <HomeIcon size={16} />, tr: 'Emlak', en: 'Real Estate' },
  { slug: 'auto-service', icon: <Car size={16} />, tr: 'Araç Servisleri', en: 'Auto Services' },
  { slug: 'aesthetic', icon: <Sparkles size={16} />, tr: 'Estetik & Kozmetik', en: 'Aesthetic & Cosmetics' },
  { slug: 'schools', icon: <GraduationCap size={16} />, tr: 'Okullar & Kurslar', en: 'Schools & Courses' },
  { slug: 'boutique-hotels', icon: <Building2 size={16} />, tr: 'Butik Oteller', en: 'Boutique Hotels' },
];

export default function SolutionPageLayout({
  locale,
  t,
  icon,
  industryKey,
  industryBadge,
  h1Prefix,
  h1Suffix,
  description,
  stats,
  steps,
  benefits,
  faqs,
  slug: slugProp,
  overview,
  illustration,
}: SolutionPageLayoutProps) {
  const base = `/${locale}`;
  const isTr = locale === 'tr';
  const currentSlug = slugProp ?? INDUSTRY_SLUG_MAP[industryKey] ?? '';
  const canonicalUrl = `https://buaze.com/${locale}/solutions/${currentSlug}`;
  const relatedSolutions = ALL_SOLUTIONS.filter((s) => s.slug !== currentSlug).slice(0, 4);

  const displaySteps = steps || [
    {
      icon: <QrCode size={22} />,
      title: isTr ? 'QR kodunuzu yerleştirin' : 'Place your QR code',
      desc: isTr
        ? 'Stratejik noktalara markanıza özel QR kodlarını yerleştirin.'
        : 'Place custom-branded QR codes at strategic spots.',
    },
    {
      icon: <Users size={22} />,
      title: isTr ? 'Müşteri kolayca tarar' : 'Customers scan easily',
      desc: isTr
        ? 'Saniyeler içinde tarar, uygulama indirmesine gerek kalmaz.'
        : 'Scans in seconds — no app download needed.',
    },
    {
      icon: <TrendingUp size={22} />,
      title: isTr ? 'Görünürlüğünüz artar' : 'Your visibility increases',
      desc: isTr ? 'Geri bildirim akışını profesyonelce yönetin.' : 'Manage your feedback flow professionally.',
    },
  ];

  const displayBenefits = benefits || [
    {
      title: isTr ? 'Dijital itibar artışı' : 'Digital reputation growth',
      desc: isTr ? 'Organik ve güvenli itibar büyümesi.' : 'Organic and secure reputation growth.',
      icon: <Star size={18} />,
    },
    {
      title: isTr ? 'Profesyonel geri bildirim' : 'Professional feedback ops',
      desc: isTr ? 'Krizleri büyümeden operasyonel çözün.' : 'Resolve crises operationally before they grow.',
      icon: <ShieldCheck size={18} />,
    },
    {
      title: isTr ? 'Müşteri sadakati' : 'Customer loyalty',
      desc: isTr ? 'Geri bildirim hizmet kalitesini artırır.' : 'Feedback lifts service quality.',
      icon: <TrendingUp size={18} />,
    },
    {
      title: isTr ? 'Dijital görünürlük' : 'Digital visibility',
      desc: isTr ? 'Sıralamada rakiplerin önüne geçin.' : 'Stand out from competitors in rankings.',
      icon: <Zap size={18} />,
    },
  ];

  const displayStats = stats || [
    { num: '500+', label: isTr ? 'AKTİF İŞLETME' : 'ACTIVE BUSINESSES', context: isTr ? 'Pilot veri' : 'Pilot data' },
    { num: '4.8', label: isTr ? 'ORT. SKOR' : 'AVG. SCORE', context: isTr ? 'Ağ ortalaması' : 'Network average' },
    { num: '%92', label: isTr ? 'İTİBAR ARTIŞI' : 'REPUTATION GROWTH', context: isTr ? '90 günlük trend' : '90-day trend' },
    { num: '<5dk', label: isTr ? 'KURULUM' : 'SETUP', context: isTr ? 'Hızlı entegrasyon' : 'Fast integration' },
  ];

  const jsonLdSchemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: isTr ? 'Çözümler' : 'Solutions', item: `https://buaze.com/${locale}/solutions` },
        { '@type': 'ListItem', position: 3, name: industryBadge, item: canonicalUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `${h1Prefix} ${h1Suffix}`,
      description,
      provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
      areaServed: { '@type': 'Country', name: 'Turkey' },
      url: canonicalUrl,
    },
  ];
  if (faqs && faqs.length > 0) {
    jsonLdSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchemas) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-14 sm:pt-20 pb-14 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="solGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#solGrid)" />
        </svg>

        <div className="relative max-w-[1200px] mx-auto">
          {/* Breadcrumb */}
          <nav
            aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
            className="mb-6 text-[12px] text-[#737373] flex items-center flex-wrap gap-1.5"
          >
            <Link href={base} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Ana sayfa' : 'Home'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <span>{isTr ? 'Çözümler' : 'Solutions'}</span>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <span className="text-[#0A0A0A] font-medium">{industryBadge}</span>
          </nav>

          <div
            className={
              illustration
                ? 'grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12'
                : ''
            }
          >
            <div className={illustration ? 'space-y-6' : 'max-w-[780px] space-y-6'}>
              <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full pl-2 pr-4 py-1.5">
                <span className="w-6 h-6 bg-[#C6F24E] rounded-full flex items-center justify-center text-[#0A0A0A]">
                  {icon}
                </span>
                <span className="pulse-eyebrow text-[#0A0A0A]">{industryBadge}</span>
              </div>
              <h1 className="text-[40px] sm:text-[60px] md:text-[48px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
                {h1Prefix}{' '}
                <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">{h1Suffix}</span>
              </h1>
              <p className="text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[620px]">
                {description}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href={`${base}/auth/register`}
                  className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
                >
                  {isTr ? '14 gün ücretsiz dene' : 'Start 14-day free trial'}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={`${base}/pricing`}
                  className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
                >
                  {isTr ? 'Planları incele' : 'View plans'}
                </Link>
              </div>
            </div>

            {illustration && (
              <div className="flex justify-center lg:justify-end">{illustration}</div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Overview (optional) ─── */}
      {overview && (
        <section className="border-y border-[#EDEDED] px-6 sm:px-10 py-10 sm:py-14 bg-[#FAFAFA]">
          <div className="max-w-[820px] mx-auto">
            <p className="text-[16px] sm:text-[17px] text-[#525252] leading-[1.7]">{overview}</p>
          </div>
        </section>
      )}

      {/* ─── Steps ─── */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 sm:mb-14 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Süreç' : 'Process'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Üç adım, üç saniye.' : 'Three steps, three seconds.'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displaySteps.map((step, i) => (
              <div
                key={i}
                className="bg-[#FAFAFA] border border-[#EDEDED] rounded-3xl p-7 sm:p-8 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'ADIM' : 'STEP'} {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-10 h-10 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-[20px] sm:text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-tight mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#525252] leading-[1.6]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 sm:mb-14 max-w-[720px]">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'Avantajlar' : 'Benefits'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-white">
              {isTr ? 'Neden Buaze?' : 'Why Buaze?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayBenefits.map((b, i) => (
              <div
                key={i}
                className="flex gap-5 bg-white/5 border border-white/10 p-7 rounded-2xl"
              >
                <div className="shrink-0 w-11 h-11 bg-[#C6F24E] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-[18px] font-medium text-white tracking-[-0.01em] leading-tight">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-[14px] text-white/70 leading-[1.6]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="bg-[#C6F24E] border-y border-[#A8D62E] px-6 sm:px-10 py-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {displayStats.map((stat, i) => (
            <div key={i}>
              <div
                className="text-[36px] sm:text-[52px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {stat.num}
              </div>
              <div className="pulse-eyebrow text-[#0A0A0A]/70 mt-3">{stat.label}</div>
              {stat.context && (
                <div className="text-[11px] text-[#0A0A0A]/60 mt-1">{stat.context}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      {faqs && faqs.length > 0 && (
        <section className="px-6 sm:px-10 py-20 sm:py-28">
          <div className="max-w-[840px] mx-auto">
            <div className="text-center mb-12">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Sıkça sorulan sorular' : 'Frequently asked'}
              </span>
              <h2 className="mt-4 text-[32px] sm:text-[44px] font-medium tracking-[-0.035em] text-[#0A0A0A] leading-[1.05]">
                {isTr ? 'Merak ettikleriniz.' : 'Common questions.'}
              </h2>
            </div>
            <div className="divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((faq, i) => (
                <div key={i} className="py-6">
                  <h3 className="text-[17px] font-medium text-[#0A0A0A] leading-snug">{faq.q}</h3>
                  <p className="mt-3 text-[15px] text-[#525252] leading-[1.65]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Related Solutions ─── */}
      {relatedSolutions.length > 0 && (
        <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-6 sm:px-10 py-16 sm:py-20">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-10 text-center max-w-[640px] mx-auto">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Diğer sektörler' : 'Other industries'}
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[32px] font-medium tracking-[-0.02em] leading-[1.1] text-[#0A0A0A]">
                {isTr ? 'Farklı sektörler için de hazırız.' : 'We have solutions for other industries too.'}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {relatedSolutions.map((sol) => (
                <Link
                  key={sol.slug}
                  href={`${base}/solutions/${sol.slug}`}
                  className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
                >
                  <span className="shrink-0 w-9 h-9 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                    {sol.icon}
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[#0A0A0A] leading-tight">
                    {isTr ? sol.tr : sol.en}
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
      )}

      {/* ─── CTA ─── */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[32px] sm:text-[52px] font-medium leading-[1.04] tracking-[-0.035em] text-white">
            {isTr ? 'İşletmenizi bugün büyütün.' : 'Grow your business today.'}
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-white/70 max-w-[520px] mx-auto">
            {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez.' : '14-day free trial. No card required.'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Hemen başla' : 'Get started'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              {isTr ? 'Planları incele' : 'View plans'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
