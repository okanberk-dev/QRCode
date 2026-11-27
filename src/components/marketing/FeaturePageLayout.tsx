import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Info, type LucideIcon } from 'lucide-react';
import { RtFaqList } from '@/components/marketing/ritim/interactive';
import { img } from '@/components/marketing/ritim/media';
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

export const FEATURE_CONTAINER = 'rt-container';
export const FEATURE_SECTION_Y = 'py-[64px] lg:py-[112px]';
export const FEATURE_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';
/** Card used across the feature family (spec §4 cards). */
export const FEATURE_CARD = 'rounded-[var(--rt-r-lg)] bg-[var(--rt-cream)] p-6 sm:p-8';
/** Inline text link with the lime underline used across the marketing site. */
export const FEATURE_TEXT_LINK = 'rt-link-arrow min-h-[44px]';

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
    <div className="min-h-[100dvh] overflow-x-clip bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">{children}</main>
      <MarketingFooter locale={locale} />
    </div>
  );
}

/** Eyebrow → H2 (64/64, weight 400) → lead ("Ritim" section head). */
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
    <div className="rt-section-head__text" style={dark ? { color: 'inherit' } : undefined}>
      <p className="rt-eyebrow">
        {eyebrow}
      </p>
      <h2 id={id} className="rt-t-h1 text-balance">
        {title}
      </h2>
      {lead ? (
        <p className="rt-t-lead text-pretty" style={dark ? { color: 'inherit', opacity: 0.85 } : undefined}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/** Photo behind each feature's sample screen (ritim/media; licensed stock). */
const HERO_PHOTO: Record<string, string> = {
  'review-management': 'restoran-masalar',
  'pulse-ai': 'ai-panel',
  menu: 'yemek-flatlay',
  surveys: 'kafe-ic',
  loyalty: 'kahve',
  'audit-center': 'mutfak-ekip',
  'analytics-reports': 'entegrasyon',
  'qr-generator': 'kafe-sayac',
};

/**
 * Hero — "Ritim" split hero: copy on the left (eyebrow, 64 px title, lead,
 * solid + outline pill buttons), a 5:4 photo with the sample screen floating
 * over its corner on the right (float chip). Copy first in the HTML.
 */
export function FeatureHero({
  locale,
  eyebrow,
  title,
  lead,
  secondary,
  mock,
  mockCaption,
  photo,
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
  /** Photo file name in public/images/site (without .jpg). */
  photo?: string;
}) {
  const shared = SHARED[locale];
  return (
    <section aria-labelledby="feature-title" className="rt-sheet">
      <div className="rt-container rt-split-hero">
        <div className="rt-split-hero__text">
          <p className="rt-eyebrow">{eyebrow}</p>
          <h1 id="feature-title" className="rt-t-h1 text-balance">
            {title}
          </h1>
          <p className="rt-t-lead text-pretty">{lead}</p>
          <div className="rt-btn-group">
            <Link href={`/${locale}/auth/register`} rel="nofollow" className="rt-btn rt-btn--solid">
              {shared.primary}
            </Link>
            <Link href={secondary.href} className="rt-btn rt-btn--outline">
              {secondary.label}
            </Link>
          </div>
          <p className="rt-t-sm rt-t-muted">{shared.note}</p>
        </div>

        <figure className="rt-split-hero__media rt-feature-media">
          <figcaption className="sr-only">{mockCaption}</figcaption>
          <Image src={img(photo ?? 'pos-kasa')} alt="" width={1600} height={1280} priority sizes="(max-width: 1023px) 100vw, 640px" />
          <div aria-hidden="true" className="rt-float-chip rt-float-mock">
            <span className="rt-badge rt-badge--brand">{shared.sample}</span>
            <div className="rt-float-mock__screen">{mock}</div>
          </div>
        </figure>
      </div>
    </section>
  );
}

/**
 * FAQ — "Ritim" accordion: 48 px heading on the left, cream pill rows on the
 * right, the open row turns dark. Every answer is in the server HTML; pass
 * the same `items` to the FAQPage JSON-LD.
 */
export function FeatureFaqSection({
  locale,
  eyebrow,
  title,
  items,
  more,
  className = '',
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
      <div className="rt-container rt-faq">
        <div className="rt-mini-head" style={{ alignContent: 'start' }}>
          <p className="rt-eyebrow">{eyebrow}</p>
          <h2 id="feature-faq-title" className="rt-t-h2">
            {title}
          </h2>
          {more ? (
            <Link href={more.href} className="rt-link-arrow">
              {more.label}
            </Link>
          ) : null}
          <p className="rt-t-sm rt-t-muted" style={{ marginTop: 16 }}>
            {shared.contactTitle}{' '}
            <a className="rt-link" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            <br />
            {SUPPORT_HOURS[locale]}
          </p>
        </div>
        <RtFaqList items={items} firstOpen />
      </div>
    </section>
  );
}

/** Closing CTA — "Ritim" centred CTA (`.rt-cta-center`) with a wide photo. */
export function FeatureCtaSection({ locale, title }: { locale: FeatureLocale; title: string }) {
  const shared = SHARED[locale];
  return (
    <section aria-labelledby="feature-cta-title" className="rt-container">
      <div className="rt-cta-center">
        <p className="rt-script rt-script--md">{locale === 'tr' ? 'Hadi başlayalım' : "Let's get started"}</p>
        <h2 id="feature-cta-title" className="rt-t-h1 text-balance" style={{ maxWidth: 900 }}>
          {title}
        </h2>
        <ul className="rt-page-head__meta" style={{ justifyContent: 'center' }}>
          {shared.ctaFacts.map((fact) => (
            <li key={fact}>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
        <div className="rt-btn-group">
          <Link href={`/${locale}/auth/register`} rel="nofollow" className="rt-btn rt-btn--primary">
            {shared.primary}
          </Link>
          <Link href={`/${locale}/pricing`} className="rt-btn rt-btn--outline">
            {shared.ctaSecondary}
          </Link>
        </div>
        <div className="rt-cta-center__media">
          <Image src={img('restoran-aydinlik')} alt="" fill sizes="(max-width: 1320px) 100vw, 1256px" />
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
        photo={HERO_PHOTO[slug]}
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
                    className="rt-step__num"
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
      <section aria-labelledby="feature-facts-title" className="rt-container">
        <div className="rt-cta-panel" style={{ display: 'block' }}>
          <FeatureSectionHeading id="feature-facts-title" eyebrow={copy.facts.eyebrow} title={copy.facts.title} tone="dark" />
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:mt-12 lg:grid-cols-4">
            {copy.facts.items.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse justify-end gap-2 border-t border-black/15 pt-5">
                <dt className="text-[14px] leading-[1.5] opacity-75 sm:text-[15px]">{fact.label}</dt>
                <dd className="text-[36px] leading-none sm:text-[48px]">{fact.value}</dd>
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
            {/* Four cards read as a 2 × 2 block instead of a row of three and
                a lone fourth; other counts use three columns. */}
            <ul
              className={`mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 ${
                sectors.length === 4 ? '' : 'lg:grid-cols-3'
              }`}
            >
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
