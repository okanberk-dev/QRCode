import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Info, Plus, type LucideIcon } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildFeaturePageJsonLd } from '@/lib/seo/feature-schema';
import { RELATED_SOLUTIONS_LIST, SECTOR_COUNT } from '@/lib/related-solutions';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';

/**
 * Shared layout for the /features pages (marketing spec §4, D11, D12).
 *
 * The six feature pages render `FeaturePageLayout`, which fixes one calm
 * section order so every page reads the same way:
 *
 *   1. Hero — eyebrow, keyword H1 (no trailing period), one-sentence lead,
 *      "Ücretsiz deneyin" + one secondary link, and an HTML sample screen
 *      labelled "Örnek ekran" (generic data, crawlable text).
 *   2. "… nedir?" — one definitional H2.
 *   3. Capabilities — claims checked against the product.
 *   4. How it works — visible steps with id="step-N"; the HowTo JSON-LD is
 *      built from the same array.
 *   5. Facts — only values the product itself guarantees (§38.248).
 *   6. Industry links — real /solutions pages from RELATED_SOLUTIONS_LIST.
 *   7. FAQ — <details>; the FAQPage JSON-LD is built from the same array.
 *   8. Related features.
 *   9. One closing CTA.
 *
 * The /features hub composes the exported building blocks (shell, hero,
 * section heading, FAQ, CTA) around its own catalog sections.
 *
 * Server components only, no request-time APIs (marketing pages stay ISR).
 * Headings take Space Grotesk from the global h1–h6 rule; no inline fonts.
 * Sign-up links carry rel="nofollow" (/auth/* is noindex).
 */

export type FeatureLocale = 'tr' | 'en';

export interface FeatureCapability {
  icon: LucideIcon;
  title: string;
  body: string;
}

export interface FeatureStep {
  title: string;
  body: string;
}

export interface FeatureFact {
  /** Short value shown large, e.g. "3", "TR + EN". */
  value: string;
  /** What the value means, one line. Must be unique within the list. */
  label: string;
}

export interface FeatureSectorLink {
  /** A slug from RELATED_SOLUTIONS_LIST (unknown slugs are skipped). */
  slug: string;
  /** One short line: what this feature does in that industry. */
  use: string;
}

export interface FeatureFaq {
  q: string;
  /** Plain text: the same string goes into the FAQPage JSON-LD. */
  a: string;
}

export interface FeatureRelatedLink {
  href: string;
  title: string;
  body: string;
  label: string;
  icon: LucideIcon;
}

export interface FeaturePageCopy {
  eyebrow: string;
  /** H1 — keyword first, sentence case, no trailing period. */
  title: string;
  /** One sentence under the H1 (also the Service description). */
  lead: string;
  secondary: { href: string; label: string };
  /** Screen-reader description of the sample screen. */
  mockCaption: string;
  definition: {
    eyebrow: string;
    title: string;
    paragraphs: readonly string[];
    note?: string;
    /** Optional link after the note, e.g. the Data Processing Agreement. */
    noteLink?: { href: string; label: string };
  };
  capabilities: { eyebrow: string; title: string; lead?: string; items: readonly FeatureCapability[] };
  steps: { eyebrow: string; title: string; lead?: string; items: readonly FeatureStep[] };
  facts: { eyebrow: string; title: string; items: readonly FeatureFact[] };
  sectors: { eyebrow: string; title: string; lead?: string; items: readonly FeatureSectorLink[] };
  faq: {
    eyebrow: string;
    title: string;
    items: readonly FeatureFaq[];
    /** Optional text link under the FAQ (answers stay plain text so the JSON-LD matches). */
    more?: { href: string; label: string };
  };
  related: { eyebrow: string; title: string; items: readonly FeatureRelatedLink[] };
  /** Closing CTA heading (no trailing period). */
  ctaTitle: string;
}

export interface FeatureSchemaInfo {
  /** Product name for the Service node and the breadcrumb, e.g. "Pulse AI". */
  name: string;
  serviceType: string;
  /** HowTo name — the same idea as the visible steps heading. */
  howToName: string;
}

/* ─── Shared class strings ─────────────────────────────────────────────── */

export const FEATURE_CONTAINER = 'mx-auto w-full max-w-[1200px] px-5 sm:px-10';
export const FEATURE_SECTION_Y = 'py-[60px] sm:py-24';
export const FEATURE_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';
/** Card used across the feature family (spec §4 cards). */
export const FEATURE_CARD = 'rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8';
/** Inline text link with the lime underline used across the marketing site. */
export const FEATURE_TEXT_LINK = `inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[15px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] ${FEATURE_FOCUS}`;

const BTN_CORE =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors';
const BTN_BASE = `${BTN_CORE} ${FEATURE_FOCUS}`;
/** Buttons on the lime band: graphite focus ring, offset matches the lime surface. */
const BTN_ON_LIME = `${BTN_CORE} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E]`;

const SHARED = {
  tr: {
    primary: 'Ücretsiz deneyin',
    note: '14 gün ücretsiz deneme · Kredi kartı gerekmez',
    sample: 'Örnek ekran',
    stepLabel: 'Adım',
    allSectors: `${SECTOR_COUNT} sektör sayfasının hepsini görün`,
    ctaFacts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal edebilirsiniz'],
    ctaSecondary: 'Fiyatları inceleyin',
    contactTitle: 'Başka bir sorunuz mu var?',
  },
  en: {
    primary: 'Start free trial',
    note: '14-day free trial · No credit card required',
    sample: 'Sample screen',
    stepLabel: 'Step',
    allSectors: `See all ${SECTOR_COUNT} industry pages`,
    ctaFacts: ['14-day free trial', 'No credit card required', 'Cancel anytime'],
    ctaSecondary: 'See pricing',
    contactTitle: 'Have another question?',
  },
} as const;

/* ─── Building blocks ──────────────────────────────────────────────────── */

/** Page frame: JSON-LD, navbar, <main id="main-content">, footer. */
export function FeaturePageShell({
  locale,
  jsonLd,
  children,
}: {
  locale: FeatureLocale;
  jsonLd: object;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}

/** Eyebrow → H2 → optional lead sentence (spec §4 section header). */
export function FeatureSectionHeading({
  id,
  eyebrow,
  title,
  lead,
  tone = 'light',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <div className="max-w-[720px]">
      <p className={`pulse-eyebrow ${dark ? 'text-[#C6F24E]' : 'text-[#737373]'}`}>{eyebrow}</p>
      <h2
        id={id}
        className={`mt-4 text-balance text-[28px] leading-[1.08] sm:text-[40px] lg:text-[48px] ${
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

/** Hero: copy column first in the HTML, sample screen second. */
export function FeatureHero({
  locale,
  eyebrow,
  title,
  lead,
  secondary,
  mock,
  mockCaption,
}: {
  locale: FeatureLocale;
  eyebrow: string;
  title: string;
  lead: string;
  secondary: { href: string; label: string };
  /** Server-rendered sample UI with generic data; hidden from screen readers. */
  mock: ReactNode;
  /** What the sample screen shows, for screen readers. */
  mockCaption: string;
}) {
  const shared = SHARED[locale];
  return (
    <section aria-labelledby="feature-title" className="bg-white pb-[60px] pt-[60px] sm:pb-24 sm:pt-24">
      <div className={`${FEATURE_CONTAINER} lg:grid lg:grid-cols-[1.12fr_1fr] lg:items-center lg:gap-14`}>
        <div className="max-w-[640px]">
          <p className="pulse-eyebrow text-[#737373]">{eyebrow}</p>
          <h1
            id="feature-title"
            className="mt-5 text-balance text-[38px] leading-[1.06] text-[#0A0A0A] sm:text-[52px] md:text-[48px] lg:text-[52px]"
          >
            {title}
          </h1>
          <p className="mt-6 max-w-[600px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
            {lead}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/${locale}/auth/register`}
              rel="nofollow"
              className={`${BTN_BASE} bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]`}
            >
              {shared.primary}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href={secondary.href}
              className={`${BTN_BASE} border border-[#D4D4D4] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]`}
            >
              {secondary.label}
            </Link>
          </div>
          <p className="mt-5 text-[14px] leading-[1.5] text-[#737373]">{shared.note}</p>
        </div>

        <figure className="mx-auto mt-12 w-full max-w-[520px] lg:mt-0">
          <figcaption className="sr-only">{mockCaption}</figcaption>
          <div
            aria-hidden="true"
            className="rounded-[24px] border border-[#EDEDED] bg-[#FAFAFA] p-3 shadow-[0_24px_60px_-32px_rgba(10,10,10,0.28)] sm:p-4"
          >
            <p className="pulse-eyebrow px-2 pb-3 pt-1 text-[#737373]">{shared.sample}</p>
            <div className="overflow-hidden rounded-[16px] border border-[#EDEDED] bg-white">{mock}</div>
          </div>
        </figure>
      </div>
    </section>
  );
}

/**
 * FAQ in native <details> (keyboard-operable, every answer in the server
 * HTML); pass the same `items` to the FAQPage JSON-LD. Same two-column
 * pattern as the homepage FAQ: heading on the left, questions on the right.
 */
export function FeatureFaqSection({
  locale,
  eyebrow,
  title,
  items,
  more,
  className = 'bg-[#FAFAFA]',
}: {
  locale: FeatureLocale;
  eyebrow: string;
  title: string;
  items: readonly FeatureFaq[];
  more?: { href: string; label: string };
  className?: string;
}) {
  const shared = SHARED[locale];
  return (
    <section aria-labelledby="feature-faq-title" className={`${className} ${FEATURE_SECTION_Y}`}>
      <div
        className={`${FEATURE_CONTAINER} grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16`}
      >
        <div className="lg:sticky lg:top-28 lg:self-start">
          <FeatureSectionHeading id="feature-faq-title" eyebrow={eyebrow} title={title} />
          {more ? (
            <p className="mt-4">
              <Link href={more.href} className={FEATURE_TEXT_LINK}>
                {more.label}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </p>
          ) : null}
          <div className="mt-8 hidden rounded-[20px] border border-[#EDEDED] bg-white p-6 lg:block">
            <p className="text-[16px] font-medium text-[#0A0A0A]">{shared.contactTitle}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={`mt-1 ${FEATURE_TEXT_LINK}`}>
              {SUPPORT_EMAIL}
            </a>
            <p className="mt-2 text-[14px] leading-[1.55] text-[#525252]">{SUPPORT_HOURS[locale]}</p>
          </div>
        </div>

        <div className="divide-y divide-[#EDEDED] rounded-[20px] border border-[#EDEDED] bg-white px-5 sm:px-8">
          {items.map((item, i) => (
            <details
              key={item.q}
              id={`faq-${i + 1}`}
              open={i === 0 ? true : undefined}
              className="group scroll-mt-28 py-5 sm:py-6"
            >
              <summary
                className={`flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-4 rounded-[8px] [&::-webkit-details-marker]:hidden ${FEATURE_FOCUS}`}
              >
                <span className="pt-1.5 text-[17px] font-medium leading-[1.4] text-[#0A0A0A] sm:text-[19px]">{item.q}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4D4D4] text-[#0A0A0A] transition-colors group-open:border-[#0A0A0A] group-open:bg-[#0A0A0A] group-open:text-[#C6F24E]"
                >
                  <Plus
                    size={16}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                  />
                </span>
              </summary>
              <p className="mt-3 max-w-[640px] pr-2 text-[15px] leading-[1.7] text-[#525252] sm:pr-12 sm:text-[16px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing lime band: one H2, the trial facts and at most two links. */
export function FeatureCtaSection({ locale, title }: { locale: FeatureLocale; title: string }) {
  const shared = SHARED[locale];
  return (
    <section aria-labelledby="feature-cta-title" className="bg-[#C6F24E] py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
        <h2
          id="feature-cta-title"
          className="text-balance text-[30px] leading-[1.06] text-[#0A0A0A] sm:text-[44px] lg:text-[52px]"
        >
          {title}
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
            href={`/${locale}/auth/register`}
            rel="nofollow"
            className={`${BTN_ON_LIME} bg-[#0A0A0A] px-7 text-white hover:bg-[#1A1A1A]`}
          >
            {shared.primary}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className={`${BTN_ON_LIME} border-2 border-[#0A0A0A] px-7 text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white`}
          >
            {shared.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Feature page ─────────────────────────────────────────────────────── */

export default function FeaturePageLayout({
  locale,
  slug,
  copy,
  mock,
  schema,
}: {
  locale: FeatureLocale;
  slug: string;
  copy: FeaturePageCopy;
  /** Server-rendered sample UI (generic data). Hidden from screen readers; `copy.mockCaption` describes it. */
  mock: ReactNode;
  schema: FeatureSchemaInfo;
}) {
  const shared = SHARED[locale];
  const base = `/${locale}`;

  const jsonLd = buildFeaturePageJsonLd({
    locale,
    slug,
    name: schema.name,
    serviceType: schema.serviceType,
    description: copy.lead,
    steps: copy.steps.items,
    howToName: schema.howToName,
    faqs: copy.faq.items,
  });

  const sectorBySlug = new Map(RELATED_SOLUTIONS_LIST.map((s) => [s.slug, s] as const));
  const seenSectors = new Set<string>();
  const sectors = copy.sectors.items.flatMap((item) => {
    const entry = sectorBySlug.get(item.slug);
    if (!entry || seenSectors.has(item.slug)) return [];
    seenSectors.add(item.slug);
    return [{ ...item, entry }];
  });

  return (
    <FeaturePageShell locale={locale} jsonLd={jsonLd}>
      {/* 1 · Hero */}
      <FeatureHero
        locale={locale}
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        secondary={copy.secondary}
        mock={mock}
        mockCaption={copy.mockCaption}
      />

      {/* 2 · Definition */}
      <section aria-labelledby="feature-definition-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={`${FEATURE_CONTAINER} lg:grid lg:grid-cols-[1fr_1.25fr] lg:gap-16`}>
          <FeatureSectionHeading
            id="feature-definition-title"
            eyebrow={copy.definition.eyebrow}
            title={copy.definition.title}
          />
          <div className="mt-6 max-w-[680px] space-y-5 text-pretty text-[16px] leading-[1.7] text-[#525252] sm:text-[17px] lg:mt-10">
            {copy.definition.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {copy.definition.note ? (
              <p className="flex gap-3 rounded-[16px] border border-[#EDEDED] bg-white p-5 text-[15px] leading-[1.6] text-[#333333]">
                <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#0A0A0A]" />
                <span>
                  {copy.definition.note}
                  {copy.definition.noteLink ? (
                    <>
                      {' '}
                      <Link
                        href={copy.definition.noteLink.href}
                        className={`rounded-sm font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] ${FEATURE_FOCUS}`}
                      >
                        {copy.definition.noteLink.label}
                      </Link>
                    </>
                  ) : null}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* 3 · Capabilities */}
      <section aria-labelledby="feature-capabilities-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="feature-capabilities-title"
            eyebrow={copy.capabilities.eyebrow}
            title={copy.capabilities.title}
            lead={copy.capabilities.lead}
          />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {copy.capabilities.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className={FEATURE_CARD}>
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

      {/* 4 · How it works */}
      <section aria-labelledby="feature-steps-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="feature-steps-title"
            eyebrow={copy.steps.eyebrow}
            title={copy.steps.title}
            lead={copy.steps.lead}
          />
          <ol
            className={`mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 ${
              copy.steps.items.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            }`}
          >
            {copy.steps.items.map((step, i) => (
              <li
                key={step.title}
                id={`step-${i + 1}`}
                className="scroll-mt-28 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-7"
              >
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
                <h3 className="mt-5 text-[19px] leading-[1.25] text-[#0A0A0A]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 · Facts */}
      <section aria-labelledby="feature-facts-title" className="bg-[#0A0A0A] py-[60px] text-white sm:py-20">
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading id="feature-facts-title" eyebrow={copy.facts.eyebrow} title={copy.facts.title} tone="dark" />
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-12 lg:grid-cols-4">
            {copy.facts.items.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse justify-end gap-2 border-t border-white/15 pt-5">
                <dt className="text-[14px] leading-[1.5] text-white/75 sm:text-[15px]">{fact.label}</dt>
                <dd className="bz-h-tight text-[30px] leading-none text-[#C6F24E] sm:text-[40px]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 6 · Industries */}
      {sectors.length > 0 ? (
        <section aria-labelledby="feature-sectors-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
          <div className={FEATURE_CONTAINER}>
            <FeatureSectionHeading
              id="feature-sectors-title"
              eyebrow={copy.sectors.eyebrow}
              title={copy.sectors.title}
              lead={copy.sectors.lead}
            />
            <ul className="mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {sectors.map(({ slug: sectorSlug, use, entry }) => {
                const Icon = entry.Icon;
                return (
                  <li key={sectorSlug}>
                    <Link
                      href={`${base}/solutions/${sectorSlug}`}
                      className={`group flex h-full items-start gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#0A0A0A] sm:p-6 ${FEATURE_FOCUS}`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F2F2F2] text-[#0A0A0A]"
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold leading-[1.3] text-[#0A0A0A]">
                          {locale === 'tr' ? entry.tr : entry.en}
                        </span>
                        <span className="mt-1.5 block text-[14px] leading-[1.55] text-[#525252]">{use}</span>
                      </span>
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-[#A3A3A3] transition-colors group-hover:text-[#0A0A0A]"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-8">
              <Link href={`${base}/solutions`} className={FEATURE_TEXT_LINK}>
                {shared.allSectors}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* 7 · FAQ */}
      <FeatureFaqSection
        locale={locale}
        eyebrow={copy.faq.eyebrow}
        title={copy.faq.title}
        items={copy.faq.items}
        more={copy.faq.more}
      />

      {/* 8 · Related features */}
      <section aria-labelledby="feature-related-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading id="feature-related-title" eyebrow={copy.related.eyebrow} title={copy.related.title} />
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {copy.related.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex h-full flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#0A0A0A] sm:p-8 ${FEATURE_FOCUS}`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#0A0A0A] text-[#C6F24E]"
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="bz-h-tight mt-5 block text-[21px] leading-[1.25] text-[#0A0A0A]">{item.title}</span>
                    <span className="mt-3 block text-[15px] leading-[1.6] text-[#525252]">{item.body}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 group-hover:decoration-[#0A0A0A]">
                      {item.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 9 · Closing CTA */}
      <FeatureCtaSection locale={locale} title={copy.ctaTitle} />
    </FeaturePageShell>
  );
}
