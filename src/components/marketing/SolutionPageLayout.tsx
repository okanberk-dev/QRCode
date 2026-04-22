import { Star, QrCode, ShieldCheck, TrendingUp, ArrowRight, Zap, Users, ChevronRight, Utensils, Hotel, Stethoscope, Scissors, Dumbbell, Scale, Home as HomeIcon, Car, Sparkles, GraduationCap, PawPrint, Building2 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import type { Locale, Translations } from '@/lib/translations';
import Link from 'next/link';
import { ReactNode } from 'react';
import { CtaButton } from '@/components/ui/CtaButton';

interface SolutionPageLayoutProps {
  locale: Locale;
  t: Translations;
  industryKey: string;
  icon: ReactNode;
  industryBadge: string;
  h1Prefix: string;
  h1Suffix: string;
  description: string;
  accentColor?: string;
  stats?: { num: string; label: string; context?: string }[];
  steps?: { title: string; desc: string; icon: ReactNode }[];
  benefits?: { title: string; desc: string; icon: ReactNode }[];
  faqs?: { q: string; a: string }[];
  isLoggedIn?: boolean;
  /** URL slug for this page (e.g. "restaurants"). Auto-derived from industryKey if omitted. */
  slug?: string;
  /** Optional intro paragraph displayed between hero and steps sections. */
  overview?: string;
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
  accentColor = '#F4B400',
  stats,
  steps,
  benefits,
  faqs,
  isLoggedIn,
  slug: slugProp,
  overview,
}: SolutionPageLayoutProps) {
  const base = `/${locale}`;
  const currentSlug = slugProp ?? INDUSTRY_SLUG_MAP[industryKey] ?? '';
  const canonicalUrl = `https://buaze.com/${locale}/solutions/${currentSlug}`;
  const relatedSolutions = ALL_SOLUTIONS.filter(s => s.slug !== currentSlug).slice(0, 4);

  // Default steps if not provided
  const displaySteps = steps || [
    {
      icon: <QrCode size={24} />,
      title: locale === 'tr' ? 'QR Kodunuzu Yerleştirin' : 'Place Your QR Code',
      desc: locale === 'tr' 
        ? 'Stratejik noktalara markanıza özel tasarlanmış QR kodları yerleştirin.' 
        : 'Place custom-branded QR codes at strategic spots.',
    },
    {
      icon: <Users size={24} />,
      title: locale === 'tr' ? 'Müşteri Kolayca Tarar' : 'Customers Scan Easily',
      desc: locale === 'tr'
        ? 'Müşteriniz saniyeler içinde tarar, uygulama indirmesine gerek kalmaz.'
        : 'Customers scan in seconds — no app download needed.',
    },
      {
        icon: <TrendingUp size={24} />,
        title: locale === 'tr' ? 'Görünürlüğünüz Artar' : 'Your Visibility Increases',
        desc: locale === 'tr'
          ? 'Geri bildirim akışını profesyonelce yönetin.'
          : 'Manage your feedback flow professionally.',
      },
  ];

  // Default benefits
  const displayBenefits = benefits || [
    {
      title: locale === 'tr' ? 'Dijital İtibar Artışı' : 'Digital Reputation Growth',
      desc: locale === 'tr' ? 'Organik ve güvenli itibar artışı sağlayın.' : 'Achieve organic and secure reputation growth.',
      icon: <Star size={20} className="text-[#F4B400]" />,
    },
    {
      title: locale === 'tr' ? 'Profesyonel Geri Bildirim Ops.' : 'Professional Feedback Ops.',
      desc: locale === 'tr' ? 'Krizleri büyümeden operasyonel olarak çözün.' : 'Resolve crises operationally before they grow.',
      icon: <ShieldCheck size={20} className="text-[#10b981]" />,
    },
    {
      title: locale === 'tr' ? 'Müşteri Sadakati' : 'Customer Loyalty',
      desc: locale === 'tr' ? 'Geri bildirimlerle hizmet kalitenizi artırın.' : 'Improve service quality with feedback.',
      icon: <TrendingUp size={20} className="text-[#F4B400]" />,
    },
    {
      title: locale === 'tr' ? 'Dijital Görünürlük' : 'Digital Visibility',
      desc: locale === 'tr' ? 'Sıralamalarda rakiplerinizin önüne geçin.' : 'Stand out from competitors in rankings.',
      icon: <Zap size={20} className="text-[#F4B400]" />,
    },
  ];

  // Default stats
  const displayStats = stats || [
    { num: '500+', label: locale === 'tr' ? 'AKTİF İŞLETME' : 'ACTIVE BUSINESSES', context: locale === 'tr' ? 'Pilot veri' : 'Pilot data' },
    { num: '4.8',  label: locale === 'tr' ? 'ORT. SKOR'     : 'AVG. SCORE',        context: locale === 'tr' ? 'Ağ ortalaması' : 'Network average' },
    { num: '%92',  label: locale === 'tr' ? 'İTİBAR ARTIŞI' : 'REPUTATION GROWTH', context: locale === 'tr' ? '90 günlük trend' : '90-day trend' },
    { num: '<5dk', label: locale === 'tr' ? 'KURULUM'      : 'SETUP',             context: locale === 'tr' ? 'Hızlı entegrasyon' : 'Fast integration' },
  ];

  // JSON-LD: BreadcrumbList + optional FAQPage
  const jsonLdSchemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'tr' ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: locale === 'tr' ? 'Çözümler' : 'Solutions', item: `https://buaze.com/${locale}/solutions` },
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
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1A2332] font-sans pt-[64px] selection:bg-[#F4B400]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchemas) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-16 px-5 sm:px-8 bg-[#F8F6F1] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3" style={{ backgroundColor: `${accentColor}0d` }} />
        <div className="max-w-[1200px] mx-auto relative content-left">
          {/* Breadcrumb */}
          <nav aria-label={locale === 'tr' ? 'Site yolu' : 'Breadcrumb'} className="mb-8 text-[12px] sm:text-[13px] font-medium text-[#2A3444] flex items-center flex-wrap gap-1.5">
            <Link href={base} className="hover:text-[#1A2332] transition-colors">{locale === 'tr' ? 'Ana Sayfa' : 'Home'}</Link>
            <ChevronRight size={14} className="text-[#6B7280]" aria-hidden />
            <span className="text-[#2A3444]">{locale === 'tr' ? 'Çözümler' : 'Solutions'}</span>
            <ChevronRight size={14} className="text-[#6B7280]" aria-hidden />
            <span className="text-[#1A2332] font-bold">{industryBadge}</span>
          </nav>

          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1A2332] rounded-full shadow-md">
              {icon}
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{industryBadge}</span>
            </div>
            <h1 className="text-[34px] sm:text-[72px] font-extrabold leading-[1] sm:leading-[0.95] tracking-tight text-[#1A2332]">
              {h1Prefix} <span style={{ color: accentColor }}>{h1Suffix}</span>
            </h1>
            <p className="text-[16px] sm:text-[20px] text-[#2A3444] font-bold leading-relaxed max-w-[600px]">
              {description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto">
                {locale === 'tr' ? '14 Gün Ücretsiz Dene' : 'Start 14-Day Free Trial'}
              </CtaButton>
              <CtaButton variant="secondary" href={`${base}/pricing`} className="w-full sm:w-auto">
                {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* Overview (optional intro paragraph) */}
      {overview && (
        <section className="py-10 sm:py-14 px-5 sm:px-8 bg-white border-t border-[#E8ECF2]">
          <div className="max-w-[800px] mx-auto">
            <p className="text-[16px] sm:text-[18px] text-[#2A3444] leading-relaxed font-medium">{overview}</p>
          </div>
        </section>
      )}

      {/* Steps */}
      <section className="py-16 sm:py-32 px-5 sm:px-8 bg-white border-y-[3px] border-[#1A2332]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16 sm:mb-24">
            <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-[#F4B400] mb-4">
              {locale === 'tr' ? 'SÜREÇ' : 'PROCESS'}
            </p>
            <h2 className="text-[32px] sm:text-[52px] font-extrabold text-[#1A2332] tracking-tight leading-tight">
              {locale === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
            {displaySteps.map((step, i) => (
              <div key={i} className="group relative bg-[#F8F6F1] p-8 sm:p-10 rounded-[32px] border sm:border border-[#1A2332] shadow-md hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 sm:-top-6 sm:-right-6 w-14 h-14 sm:w-16 sm:h-16 bg-[#F4B400] rounded-[20px] border border-[#1A2332] shadow-md flex items-center justify-center text-[18px] sm:text-[22px] font-black text-[#1A2332] z-10 rotate-3">
                  {`0${i + 1}`}
                </div>
                <div className="w-14 h-14 bg-white rounded-2xl border border-[#1A2332] flex items-center justify-center mb-8 text-[#1A2332] shadow-md">
                  {step.icon}
                </div>
                <h3 className="text-[20px] sm:text-[22px] font-extrabold text-[#1A2332] mb-4 tracking-tight">{step.title}</h3>
                <p className="text-[14px] sm:text-[15px] text-[#2A3444] leading-relaxed font-bold">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#1A2332] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F4B400]/5 rounded-full blur-[150px]" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-12 sm:mb-16 space-y-4 text-center">
            <p className="text-[11px] sm:text-[12px] font-black text-[#F4B400] uppercase tracking-widest">
              {locale === 'tr' ? 'AVANTAJLAR' : 'BENEFITS'}
            </p>
            <h2 className="text-[32px] sm:text-[52px] font-extrabold text-white tracking-tight leading-tight">
              {locale === 'tr' ? 'Neden Buaze?' : 'Why Buaze?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
            {displayBenefits.map((b, i) => (
              <div key={i} className="group flex gap-6 bg-white/5 border-2 border-white/10 p-7 sm:p-10 rounded-[32px] hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="flex-shrink-0 w-14 h-14 bg-white/5 rounded-2xl border-2 border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {b.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="text-[18px] sm:text-[20px] font-extrabold text-white tracking-tight">{b.title}</h4>
                  <p className="text-[13px] sm:text-[14px] text-white/80 font-medium leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 sm:py-20 px-5 sm:px-8 bg-[#F4B400] border-y-[3px] sm:border-y-[4px] border-[#1A2332]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {displayStats.map((stat: any, i) => (
            <div key={i} className="space-y-2">
              <div className="text-[36px] sm:text-[60px] font-black text-[#1A2332] tracking-tighter leading-none">{stat.num}</div>
              <div className="text-[10px] sm:text-[11px] font-black text-[#1A2332] uppercase tracking-[0.2em]">{stat.label}</div>
              <div className="text-[9px] sm:text-[10px] font-black text-[#1A2332]/40 uppercase tracking-[0.1em]">{stat.context}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#F8F6F1] border-t-[3px] border-[#1A2332]">
          <div className="max-w-[840px] mx-auto">
            <div className="text-center mb-12 sm:mb-20">
              <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: accentColor }}>
                {locale === 'tr' ? 'SIKÇA SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}
              </p>
              <h2 className="text-[32px] sm:text-[52px] font-extrabold text-[#1A2332] tracking-tight leading-tight">
                {locale === 'tr' ? 'Merak Ettikleriniz' : 'Common Questions'}
              </h2>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white border border-[#1A2332] rounded-[24px] sm:rounded-[32px] p-7 sm:p-10 shadow-md transition-all hover:shadow-md hover:-translate-y-1">
                  <h3 className="text-[16px] sm:text-[18px] font-extrabold text-[#1A2332] mb-4 tracking-tight leading-snug">{faq.q}</h3>
                  <p className="text-[14px] sm:text-[15px] text-[#2A3444] leading-relaxed font-bold">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Solutions */}
      {relatedSolutions.length > 0 && (
        <section className="py-16 sm:py-20 px-5 sm:px-8 bg-[#F8F6F1] border-t border-[#E8ECF2]">
          <div className="max-w-[1200px] mx-auto">
            <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-[#F4B400] mb-4 text-center">
              {locale === 'tr' ? 'DİĞER SEKTÖRLER' : 'OTHER INDUSTRIES'}
            </p>
            <h2 className="text-[22px] sm:text-[28px] font-extrabold text-[#1A2332] tracking-tight text-center mb-10">
              {locale === 'tr' ? 'Farklı sektörler için de çözümlerimiz var' : 'We have solutions for other industries too'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedSolutions.map(sol => (
                <Link
                  key={sol.slug}
                  href={`${base}/solutions/${sol.slug}`}
                  className="group flex items-center gap-3 bg-white border border-[#1A2332] rounded-2xl p-4 sm:p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
                >
                  <div className="flex-shrink-0 w-9 h-9 bg-[#F4B400]/10 border border-[#F4B400]/30 rounded-xl flex items-center justify-center text-[#1A2332] group-hover:bg-[#F4B400]/20 transition-colors">
                    {sol.icon}
                  </div>
                  <span className="text-[13px] sm:text-[14px] font-bold text-[#1A2332] leading-tight">
                    {locale === 'tr' ? sol.tr : sol.en}
                  </span>
                  <ChevronRight size={14} className="ml-auto text-[#6B7280] flex-shrink-0 group-hover:text-[#F4B400] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#1A2332] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-[28px] sm:text-[48px] font-extrabold text-white tracking-tight leading-tight">
            {locale === 'tr' ? 'İşletmenizi Bugün Büyütün' : 'Grow Your Business Today'}
          </h2>
          <p className="text-[15px] sm:text-[18px] text-white/80 font-medium">
            {locale === 'tr' ? '14 gün ücretsiz dene. Kredi kartı gerekmez.' : '14-day free trial. No credit card required.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto">
              {locale === 'tr' ? 'Hemen Başlayın' : 'Get Started Now'} <ArrowRight size={18} className="ml-2" />
            </CtaButton>
            <CtaButton variant="secondary" href={`${base}/pricing`} className="w-full sm:w-auto">
              {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
            </CtaButton>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
