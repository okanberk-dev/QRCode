import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { getRelatedSolutions, SECTOR_COUNT } from '@/lib/related-solutions';
import { SECTOR_PLATFORMS, type SectorKey } from '@/lib/sector-platforms';
import { templatesForSector, type SurveyTemplateId } from '@/lib/survey-templates';
import type { SurveyQuestionType } from '@/lib/surveys';
import type { Locale } from '@/lib/translations';

/**
 * Shared layout for sector pages under /solutions (spec D4, §4 rhythm).
 *
 * Every page passes its own copy for each section, so headings, steps,
 * placements, questions and FAQs are specific to the sector; only short
 * labels (eyebrows, buttons) are shared. Facts that already live in product
 * code are read from there instead of being retyped:
 *   - the review platforms the owner panel shows for the sector
 *     (SECTOR_PLATFORMS, the same whitelist the panel uses);
 *   - the ready survey templates for the sector (templatesForSector);
 *   - the related sector pages and their count (getRelatedSolutions,
 *     SECTOR_COUNT).
 *
 * Section order: hero → how it works → where the QR goes → what the panel
 * does → platforms (the one dark section) → questions and templates →
 * personal data (optional) → FAQ → related pages → closing CTA.
 *
 * Server component with no request-time APIs (marketing pages stay ISR).
 * Headings take Space Grotesk from the global h1–h6 rule (no inline fonts).
 * Register links carry rel="nofollow" (/auth/* is noindex). JSON-LD comes
 * from buildSolutionSchema: BreadcrumbList + Service + FAQPage built from the
 * visible FAQ; no HowTo, no offer catalog, no rating markup.
 */

export interface SolutionItem {
  title: string;
  body: string;
}

export interface SolutionUse extends SolutionItem {
  icon: LucideIcon;
}

export interface SolutionQuestion {
  text: string;
  type: SurveyQuestionType;
}

export interface SolutionFaq {
  q: string;
  a: string;
}

export interface SolutionPageContent {
  /** Plain sector name for the breadcrumb and the JSON-LD audience, e.g. "Diş klinikleri". */
  name: string;
  /** `<title>` (≤ 52 characters; the template adds " | Buaze") and meta description (140–160). */
  meta: { title: string; description: string };
  /** Hero eyebrow (sentence case; the class uppercases it). */
  eyebrow: string;
  /** H1: keyword first, sentence case, no trailing period. Also the Service name. */
  h1: string;
  /** One or two sentences under the H1. Also the Service description. */
  lead: string;
  flow: { title: string; lead?: string; steps: readonly SolutionItem[] };
  placements: { title: string; lead?: string; items: readonly SolutionItem[]; tip?: string };
  uses: { title: string; lead?: string; items: readonly SolutionUse[] };
  platforms: { title: string; lead: string; note?: string };
  questions: {
    title: string;
    lead: string;
    /** Example survey questions for this sector. */
    items: readonly SolutionQuestion[];
    /** Ready Audit Center templates that fit the sector (titles as in the product). */
    audits: readonly SolutionItem[];
  };
  /** Sector note on personal, health or children's data. */
  privacy?: { title: string; paragraphs: readonly string[] };
  faq: { title: string; items: readonly SolutionFaq[] };
  /** Closing CTA heading (no trailing period). */
  ctaTitle: string;
}

export interface SolutionPageLayoutProps {
  locale: Locale;
  /** Route slug under /solutions, e.g. "dentists". */
  slug: string;
  /** Product sector of a business of this kind (drives platforms and survey templates). */
  sector: SectorKey;
  content: SolutionPageContent;
  /** Decorative inline SVG for the hero (aria-hidden, no text). */
  illustration?: ReactNode;
}

const CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-10';
const SECTION_Y = 'py-[60px] sm:py-24';
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';
const BTN_CORE =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors';
const BTN = `${BTN_CORE} ${FOCUS}`;
/** Buttons on the lime band: graphite focus ring, offset matches the lime surface. */
const BTN_ON_LIME = `${BTN_CORE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E]`;
const TEXT_LINK = `inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[15px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] ${FOCUS}`;

/** Display names and official brand colours of the review platforms. */
const PLATFORM_INFO: Record<string, { name: string; color: string }> = {
  google: { name: 'Google', color: '#4285F4' },
  yemeksepeti: { name: 'Yemeksepeti', color: '#FA0050' },
  getir: { name: 'Getir', color: '#5D3EBC' },
  trendyol: { name: 'Trendyol GO', color: '#F27A1A' },
  trendyol_go: { name: 'Trendyol GO', color: '#F27A1A' },
  tripadvisor: { name: 'Tripadvisor', color: '#34E0A1' },
  booking: { name: 'Booking.com', color: '#003580' },
  airbnb: { name: 'Airbnb', color: '#FF5A5F' },
  yandex: { name: 'Yandex', color: '#FC3F1D' },
  yelp: { name: 'Yelp', color: '#FF1A1A' },
  foursquare: { name: 'Foursquare', color: '#F94877' },
};

/** Marketing-voice summaries of the survey templates (titles come from survey-templates.ts). */
const SURVEY_TEMPLATE_BLURB: Record<SurveyTemplateId, { tr: string; en: string }> = {
  'satisfaction-plus': {
    tr: 'Genel puan, en çok önem verilen konu ve serbest yorum.',
    en: 'Overall rating, what mattered most and a free comment.',
  },
  'nps-one': {
    tr: 'Sizi tavsiye etme isteğini 0–10 arası tek soruyla ölçer.',
    en: 'One 0–10 question on how likely people are to recommend you.',
  },
  'quick-stars': {
    tr: 'Tek bir yıldız sorusundan oluşan en kısa anket.',
    en: 'The shortest survey: a single star question.',
  },
  'table-service': {
    tr: 'Yemek, servis, bekleme süresi ve serbest not.',
    en: 'Food, service, waiting time and a free note.',
  },
  'post-stay': {
    tr: 'Oda temizliği, personelin ilgisi ve tavsiye isteği.',
    en: 'Room cleanliness, staff care and willingness to recommend.',
  },
  'post-visit': {
    tr: 'Randevu ve ekip deneyimi; sağlık bilgisi sormaz.',
    en: 'Appointment and team experience; asks for no health details.',
  },
  'post-service': {
    tr: 'Hizmet kalitesi, uzmanın ilgisi ve yeniden tercih.',
    en: 'Service quality, specialist care and whether they would return.',
  },
  'in-store': {
    tr: 'Mağaza deneyimi, ürün bulma kolaylığı ve personelin ilgisi.',
    en: 'Store experience, finding products and staff care.',
  },
};

const SHARED = {
  tr: {
    home: 'Ana sayfa',
    solutions: 'Çözümler',
    breadcrumb: 'Sayfa konumu',
    primary: 'Ücretsiz deneyin',
    secondary: 'Nasıl çalıştığını görün',
    note: '14 gün ücretsiz deneme · Kredi kartı gerekmez',
    flowEyebrow: 'Nasıl çalışır',
    stepLabel: 'Adım',
    placementEyebrow: 'QR yerleşimi',
    usesEyebrow: 'Panel özellikleri',
    platformsEyebrow: 'Yorum platformları',
    platformsListLabel: 'Bu sektörde panelin gösterdiği yorum platformları',
    platformsFootnote:
      'Buaze bu platformlardaki yorumları panele çekmez; müşteriyi seçtiğiniz platformun yorum sayfasına gönderir. Bağlantılarınız her gün otomatik olarak kontrol edilir.',
    platformsLink: 'Platform bağlantılarını inceleyin',
    questionsEyebrow: 'Anketler ve denetimler',
    questionsHeading: 'Örnek anket soruları',
    questionsHint: 'Soruları Anketler bölümünde kendiniz yazarsınız; anket başına en fazla 30 soru eklenebilir.',
    surveyTemplatesHeading: 'Hazır anket şablonları',
    auditTemplatesHeading: 'Hazır denetim şablonları',
    auditTemplatesLead: 'Denetim Merkezi ekibinizin iç kontrolleri içindir; bu formlar müşteriye gösterilmez.',
    auditsNote: '',
    surveysLink: 'Anketleri inceleyin',
    auditsLink: 'Denetim Merkezi’ni inceleyin',
    questionTypes: {
      rating: 'Yıldız 1–5',
      nps: 'Tavsiye 0–10',
      short_text: 'Kısa metin',
      long_text: 'Uzun metin',
      multiple_choice: 'Çoktan seçmeli',
    } satisfies Record<SurveyQuestionType, string>,
    privacyEyebrow: 'Kişisel veriler',
    privacyLinks: [
      { label: 'KVKK aydınlatma metni', path: '/kvkk' },
      { label: 'Veri İşleyici Sözleşmesi', path: '/veri-isleyici-sozlesmesi' },
    ],
    faqEyebrow: 'Sık sorulan sorular',
    faqMore: 'Tüm soruları görün',
    relatedEyebrow: 'Diğer sektörler',
    relatedTitle: 'Benzer işletmeler için hazırladığımız sayfalar',
    allSectors: `${SECTOR_COUNT} sektör sayfasının hepsini görün`,
    resourcesTitle: 'Kaynaklar',
    resources: [
      { label: 'Nasıl çalışır', path: '/how-it-works' },
      { label: 'Fiyatlandırma', path: '/pricing' },
      { label: 'Google yorum kuralları', path: '/google-compliance' },
      { label: 'Ücretsiz QR kod oluşturucu', path: '/solutions/qr-generator' },
    ],
    ctaFacts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal edebilirsiniz'],
    ctaSecondary: 'Fiyatları inceleyin',
  },
  en: {
    home: 'Home',
    solutions: 'Solutions',
    breadcrumb: 'Breadcrumb',
    primary: 'Start free trial',
    secondary: 'See how it works',
    note: '14-day free trial · No credit card required',
    flowEyebrow: 'How it works',
    stepLabel: 'Step',
    placementEyebrow: 'QR placement',
    usesEyebrow: 'Panel features',
    platformsEyebrow: 'Review platforms',
    platformsListLabel: 'Review platforms the panel shows for this industry',
    platformsFootnote:
      "Buaze doesn't import reviews from these platforms; it sends the customer to your chosen platform's review page. Your links are checked automatically every day.",
    platformsLink: 'See platform links',
    questionsEyebrow: 'Surveys and audits',
    questionsHeading: 'Sample survey questions',
    questionsHint: 'You write the questions yourself in Surveys; a survey can have up to 30 questions.',
    surveyTemplatesHeading: 'Ready-made survey templates',
    auditTemplatesHeading: 'Ready-made audit templates',
    auditTemplatesLead: "The Audit Center is for your team's internal checks; these forms are not shown to customers.",
    auditsNote:
      'The ready-made audit templates are currently written in Turkish; you can also build your own checklist in English.',
    surveysLink: 'See Surveys',
    auditsLink: 'See the Audit Center',
    questionTypes: {
      rating: 'Stars 1–5',
      nps: 'Recommend 0–10',
      short_text: 'Short text',
      long_text: 'Long text',
      multiple_choice: 'Multiple choice',
    } satisfies Record<SurveyQuestionType, string>,
    privacyEyebrow: 'Personal data',
    privacyLinks: [
      { label: 'KVKK notice', path: '/kvkk' },
      { label: 'Data processing agreement', path: '/veri-isleyici-sozlesmesi' },
    ],
    faqEyebrow: 'FAQ',
    faqMore: 'See all questions',
    relatedEyebrow: 'Other industries',
    relatedTitle: 'Pages for similar businesses',
    allSectors: `See all ${SECTOR_COUNT} industry pages`,
    resourcesTitle: 'Resources',
    resources: [
      { label: 'How it works', path: '/how-it-works' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Google review guidelines', path: '/google-compliance' },
      { label: 'Free QR code generator', path: '/solutions/qr-generator' },
    ],
    ctaFacts: ['14-day free trial', 'No credit card required', 'Cancel anytime'],
    ctaSecondary: 'See pricing',
  },
} as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  tone = 'light',
  size = 'md',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'light' | 'dark';
  /** 'sm' for utility sections (related pages). */
  size?: 'md' | 'sm';
}) {
  const dark = tone === 'dark';
  const scale = size === 'sm' ? 'text-[24px] sm:text-[30px]' : 'text-[28px] sm:text-[40px] lg:text-[48px]';
  return (
    <div className="max-w-[720px]">
      <p className={`pulse-eyebrow ${dark ? 'text-[#C6F24E]' : 'text-[#737373]'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-4 text-balance leading-[1.08] tracking-[-0.02em] ${scale} ${
          dark ? 'text-white' : 'text-[#0A0A0A]'
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={`mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] sm:text-[18px] ${
            dark ? 'text-white/75' : 'text-[#525252]'
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export default function SolutionPageLayout({
  locale,
  slug,
  sector,
  content,
  illustration,
}: SolutionPageLayoutProps) {
  const shared = SHARED[locale];
  const base = `/${locale}`;
  const registerHref = `${base}/auth/register`;
  const flowId = 'how-it-works';

  const jsonLd = buildSolutionSchema({
    locale,
    slug,
    industryLabel: content.name,
    serviceName: content.h1,
    description: content.lead,
    faqs: content.faq.items,
  });

  const platforms = SECTOR_PLATFORMS[sector].flatMap((id) => {
    const info = PLATFORM_INFO[id];
    return info ? [{ id, ...info }] : [];
  });
  const surveyTemplates = templatesForSector(sector).map((template) => ({
    id: template.id,
    title: template.title[locale],
    body: SURVEY_TEMPLATE_BLURB[template.id]?.[locale] ?? template.description[locale],
  }));
  const related = getRelatedSolutions(slug, 4);

  // Light sections after the dark platforms band alternate white / #FAFAFA.
  const afterDark = ['questions', ...(content.privacy ? ['privacy'] : []), 'faq', 'related'];
  const bgAfterDark = (key: string) => (afterDark.indexOf(key) % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]');

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />

      <main id="main-content">
        {/* 1 · Hero */}
        <section aria-labelledby="solution-title" className="bg-white pb-[60px] pt-10 sm:pb-24 sm:pt-16">
          <div className={CONTAINER}>
            <nav aria-label={shared.breadcrumb} className="text-[13px] text-[#737373]">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href={base} className={`rounded-sm hover:text-[#0A0A0A] ${FOCUS}`}>
                    {shared.home}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight size={12} className="text-[#A3A3A3]" />
                </li>
                <li>
                  <Link href={`${base}/solutions`} className={`rounded-sm hover:text-[#0A0A0A] ${FOCUS}`}>
                    {shared.solutions}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight size={12} className="text-[#A3A3A3]" />
                </li>
                <li>
                  <span aria-current="page" className="font-medium text-[#0A0A0A]">
                    {content.name}
                  </span>
                </li>
              </ol>
            </nav>

            <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14">
              <div className="max-w-[680px]">
                <p className="pulse-eyebrow text-[#737373]">{content.eyebrow}</p>
                <h1
                  id="solution-title"
                  className="mt-5 text-balance text-[38px] leading-[1.06] tracking-[-0.03em] text-[#0A0A0A] sm:text-[52px] md:text-[48px] lg:text-[56px]"
                >
                  {content.h1}
                </h1>
                <p className="mt-6 max-w-[620px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                  {content.lead}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={registerHref}
                    rel="nofollow"
                    className={`${BTN} bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]`}
                  >
                    {shared.primary}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <a
                    href={`#${flowId}`}
                    className={`${BTN} border border-[#D4D4D4] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]`}
                  >
                    {shared.secondary}
                  </a>
                </div>
                <p className="mt-5 text-[14px] leading-[1.5] text-[#737373]">{shared.note}</p>
              </div>

              {illustration ? (
                <div
                  aria-hidden="true"
                  className="relative mx-auto mt-12 flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[28px] border border-[#EDEDED] bg-[#FAFAFA] sm:max-w-[360px] lg:mt-0 lg:max-w-[440px]"
                >
                  <div className="absolute inset-[12%] rounded-full bg-[#EAF9B8]/60 blur-2xl" />
                  <div className="relative w-[78%] [&>svg]:h-auto [&>svg]:w-full">{illustration}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* 2 · How it works */}
        <section id={flowId} aria-labelledby="solution-flow-title" className={`scroll-mt-24 bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeading
              id="solution-flow-title"
              eyebrow={shared.flowEyebrow}
              title={content.flow.title}
              lead={content.flow.lead}
            />
            <ol className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-3">
              {content.flow.steps.map((step, i) => (
                <li key={step.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <p className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                    >
                      {i + 1}
                    </span>
                    <span className="pulse-eyebrow text-[#737373]">
                      {shared.stepLabel} {i + 1}
                    </span>
                  </p>
                  <h3 className="mt-5 text-[19px] leading-[1.3] text-[#0A0A0A] sm:text-[20px]">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 3 · Where the QR goes */}
        <section aria-labelledby="solution-placement-title" className={`bg-white ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeading
              id="solution-placement-title"
              eyebrow={shared.placementEyebrow}
              title={content.placements.title}
              lead={content.placements.lead}
            />
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
              {content.placements.items.map((item, i) => (
                <li
                  key={item.title}
                  className="flex gap-5 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-[13px] font-semibold leading-[1.9] text-[#A3A3A3]"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[19px] leading-[1.3] text-[#0A0A0A]">{item.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-[1.65] text-[#525252]">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            {content.placements.tip ? (
              <p className="mt-6 flex max-w-[860px] gap-3 rounded-[16px] border border-[#EDEDED] bg-[#FAFAFA] p-5 text-[15px] leading-[1.6] text-[#333333] sm:mt-8">
                <Tag size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0A0A0A]" />
                <span>{content.placements.tip}</span>
              </p>
            ) : null}
          </div>
        </section>

        {/* 4 · What the panel does for this sector */}
        <section aria-labelledby="solution-uses-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeading
              id="solution-uses-title"
              eyebrow={shared.usesEyebrow}
              title={content.uses.title}
              lead={content.uses.lead}
            />
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
              {content.uses.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">{item.title}</h3>
                    <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{item.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 5 · Review platforms for the sector (the page's one dark section) */}
        <section aria-labelledby="solution-platforms-title" className={`bg-[#0A0A0A] text-white ${SECTION_Y}`}>
          <div className={`${CONTAINER} lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16`}>
            <SectionHeading
              id="solution-platforms-title"
              eyebrow={shared.platformsEyebrow}
              title={content.platforms.title}
              lead={content.platforms.lead}
              tone="dark"
            />
            <div className="mt-10 lg:mt-12">
              <ul aria-label={shared.platformsListLabel} className="flex flex-wrap gap-3">
                {platforms.map((platform) => (
                  <li
                    key={platform.id}
                    className="inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 text-[15px] font-medium text-white"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/25"
                      style={{ backgroundColor: platform.color }}
                    />
                    {platform.name}
                  </li>
                ))}
              </ul>
              {content.platforms.note ? (
                <p className="mt-8 rounded-[16px] border border-white/15 bg-white/[0.04] p-5 text-[15px] leading-[1.65] text-white/80">
                  {content.platforms.note}
                </p>
              ) : null}
              <p className="mt-6 text-[14px] leading-[1.6] text-white/70">{shared.platformsFootnote}</p>
              <p className="mt-4">
                <Link
                  href={`${base}/integrations`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[15px] font-semibold text-white underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                >
                  {shared.platformsLink}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* 6 · What to ask: sample survey questions and ready templates */}
        <section aria-labelledby="solution-questions-title" className={`${bgAfterDark('questions')} ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeading
              id="solution-questions-title"
              eyebrow={shared.questionsEyebrow}
              title={content.questions.title}
              lead={content.questions.lead}
            />
            <div className="mt-12 grid grid-cols-1 gap-6 sm:mt-14 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-8">
              <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                <h3 className="flex items-center gap-3 text-[20px] leading-[1.25] text-[#0A0A0A]">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <FileText size={18} strokeWidth={2} />
                  </span>
                  {shared.questionsHeading}
                </h3>
                <ol className="mt-6 divide-y divide-[#EDEDED]">
                  {content.questions.items.map((question) => (
                    <li
                      key={question.text}
                      className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <span className="text-[15px] leading-[1.55] text-[#1A1A1A]">{question.text}</span>
                      <span className="w-fit shrink-0 rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#525252]">
                        {shared.questionTypes[question.type]}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-[14px] leading-[1.6] text-[#737373]">{shared.questionsHint}</p>
              </div>

              <div className="space-y-6">
                <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <h3 className="flex items-center gap-3 text-[20px] leading-[1.25] text-[#0A0A0A]">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF9B8] text-[#0A0A0A]"
                    >
                      <FileText size={18} strokeWidth={2} />
                    </span>
                    {shared.surveyTemplatesHeading}
                  </h3>
                  <ul className="mt-5 divide-y divide-[#EDEDED]">
                    {surveyTemplates.map((template) => (
                      <li key={template.id} className="py-3.5 first:pt-0">
                        <p className="text-[16px] font-semibold leading-[1.35] text-[#0A0A0A]">{template.title}</p>
                        <p className="mt-1 text-[14px] leading-[1.55] text-[#525252]">{template.body}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    <Link href={`${base}/features/surveys`} className={TEXT_LINK}>
                      {shared.surveysLink}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </p>
                </div>

                {content.questions.audits.length > 0 ? (
                  <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                    <h3 className="flex items-center gap-3 text-[20px] leading-[1.25] text-[#0A0A0A]">
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0A0A0A] text-[#C6F24E]"
                      >
                        <ClipboardCheck size={18} strokeWidth={2} />
                      </span>
                      {shared.auditTemplatesHeading}
                    </h3>
                    <p className="mt-3 text-[14px] leading-[1.6] text-[#737373]">{shared.auditTemplatesLead}</p>
                    <ul className="mt-4 divide-y divide-[#EDEDED]">
                      {content.questions.audits.map((audit) => (
                        <li key={audit.title} className="py-3.5 first:pt-0">
                          <p className="text-[16px] font-semibold leading-[1.35] text-[#0A0A0A]">{audit.title}</p>
                          <p className="mt-1 text-[14px] leading-[1.55] text-[#525252]">{audit.body}</p>
                        </li>
                      ))}
                    </ul>
                    {shared.auditsNote ? (
                      <p className="mt-2 text-[14px] leading-[1.6] text-[#737373]">{shared.auditsNote}</p>
                    ) : null}
                    <p className="mt-3">
                      <Link href={`${base}/features/audit-center`} className={TEXT_LINK}>
                        {shared.auditsLink}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* 7 · Personal data note (sectors with health, children's or other sensitive data) */}
        {content.privacy ? (
          <section aria-labelledby="solution-privacy-title" className={`${bgAfterDark('privacy')} ${SECTION_Y}`}>
            <div className="mx-auto w-full max-w-[920px] px-5 sm:px-10">
              <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-10">
                <p className="pulse-eyebrow flex items-center gap-2 text-[#737373]">
                  <ShieldCheck size={16} aria-hidden="true" className="text-[#0A0A0A]" />
                  {shared.privacyEyebrow}
                </p>
                <h2
                  id="solution-privacy-title"
                  className="mt-4 text-balance text-[26px] leading-[1.12] tracking-[-0.02em] text-[#0A0A0A] sm:text-[34px]"
                >
                  {content.privacy.title}
                </h2>
                <div className="mt-6 space-y-4 text-pretty text-[15px] leading-[1.7] text-[#525252] sm:text-[16px]">
                  {content.privacy.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <p className="mt-6 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  {shared.privacyLinks.map((link) => (
                    <Link key={link.path} href={`${base}${link.path}`} className={TEXT_LINK}>
                      {link.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ))}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* 8 · FAQ — the FAQPage JSON-LD is built from the same array */}
        <section aria-labelledby="solution-faq-title" className={`${bgAfterDark('faq')} ${SECTION_Y}`}>
          <div className="mx-auto w-full max-w-[920px] px-5 sm:px-10">
            <SectionHeading id="solution-faq-title" eyebrow={shared.faqEyebrow} title={content.faq.title} />
            <div className="mt-10 divide-y divide-[#E5E5E5] border-y border-[#E5E5E5]">
              {content.faq.items.map((item, i) => (
                <details key={item.q} open={i === 0 ? true : undefined} className="group">
                  <summary
                    className={`flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-left [&::-webkit-details-marker]:hidden ${FOCUS}`}
                  >
                    <span className="text-[17px] font-medium leading-[1.4] text-[#0A0A0A] sm:text-[18px]">{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D4D4D4] bg-white text-[18px] leading-none text-[#0A0A0A] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[720px] pb-6 pr-2 text-[15px] leading-[1.7] text-[#525252] sm:pr-12 sm:text-[16px]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-8">
              <Link href={`${base}/faq`} className={TEXT_LINK}>
                {shared.faqMore}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>

        {/* 9 · Related sectors and resources */}
        <section aria-labelledby="solution-related-title" className={`${bgAfterDark('related')} ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeading
              id="solution-related-title"
              eyebrow={shared.relatedEyebrow}
              title={shared.relatedTitle}
              size="sm"
            />
            <div className="mt-10 grid grid-cols-1 gap-8 sm:mt-12 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
              <div>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  {related.map((entry) => {
                    const Icon = entry.Icon;
                    return (
                      <li key={entry.slug}>
                        <Link
                          href={`${base}/solutions/${entry.slug}`}
                          className={`group flex h-full min-h-[64px] items-center gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#0A0A0A] ${FOCUS}`}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F2F2F2] text-[#0A0A0A]"
                          >
                            <Icon size={18} strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1 text-[16px] font-semibold leading-[1.3] text-[#0A0A0A]">
                            {locale === 'tr' ? entry.tr : entry.en}
                          </span>
                          <ArrowRight
                            size={16}
                            aria-hidden="true"
                            className="shrink-0 text-[#A3A3A3] transition-colors group-hover:text-[#0A0A0A]"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-6">
                  <Link href={`${base}/solutions`} className={TEXT_LINK}>
                    {shared.allSectors}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </p>
              </div>

              <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                <h3 className="text-[18px] leading-[1.3] text-[#0A0A0A]">{shared.resourcesTitle}</h3>
                <ul className="mt-3 divide-y divide-[#EDEDED]">
                  {shared.resources.map((resource) => (
                    <li key={resource.path}>
                      <Link
                        href={`${base}${resource.path}`}
                        className={`group flex min-h-[48px] items-center justify-between gap-4 rounded-sm text-[15px] font-medium text-[#1A1A1A] hover:text-[#0A0A0A] ${FOCUS}`}
                      >
                        {resource.label}
                        <ChevronRight
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-[#A3A3A3] transition-colors group-hover:text-[#0A0A0A]"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 10 · Closing CTA */}
        <section aria-labelledby="solution-cta-title" className="bg-[#C6F24E] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
            <h2
              id="solution-cta-title"
              className="text-balance text-[30px] leading-[1.06] tracking-[-0.02em] text-[#0A0A0A] sm:text-[44px] lg:text-[52px]"
            >
              {content.ctaTitle}
            </h2>
            <ul className="mx-auto mt-5 flex max-w-[680px] flex-col items-center justify-center gap-x-3 gap-y-1 text-[16px] leading-[1.6] text-[#1A1A1A] sm:flex-row sm:flex-wrap sm:text-[17px]">
              {shared.ctaFacts.map((fact, i) => (
                <li key={fact} className="inline-flex items-center gap-3">
                  {i > 0 ? (
                    <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-[#0A0A0A]/50 sm:inline-block" />
                  ) : null}
                  {fact}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={registerHref}
                rel="nofollow"
                className={`${BTN_ON_LIME} bg-[#0A0A0A] px-7 text-white hover:bg-[#1A1A1A]`}
              >
                {shared.primary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href={`${base}/pricing`}
                className={`${BTN_ON_LIME} border-2 border-[#0A0A0A] px-7 text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white`}
              >
                {shared.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} />
    </div>
  );
}
