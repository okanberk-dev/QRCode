import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import CtaBand, { type CtaLink } from '@/components/marketing/commercial/CtaBand';
import FaqList, { type FaqEntry } from '@/components/marketing/commercial/FaqList';
import ComparisonTable, { type ComparisonRow } from '@/components/marketing/commercial/ComparisonTable';
import { jsonLdString } from '@/lib/seo/json-ld';
import { BTN_DARK, BTN_OUTLINE, CONTAINER, CONTAINER_NARROW, SECTION_Y } from '@/components/marketing/commercial/styles';

export interface ComparisonLayoutProps {
  locale: 'tr' | 'en';
  /** Page-specific id prefix for headings and anchors. */
  slug: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: CtaLink;
    secondary?: CtaLink;
  };
  table: {
    eyebrow: string;
    title: string;
    lead?: string;
    caption: string;
    featureLabel: string;
    /** Header of the competitor column. */
    otherLabel: string;
    /** Cells use the keys `buaze` and `other`. */
    rows: ComparisonRow[];
  };
  fit: {
    eyebrow: string;
    title: string;
    lead?: string;
    enough: { title: string; items: string[] };
    notEnough: { title: string; items: string[] };
  };
  migration: {
    eyebrow: string;
    title: string;
    lead?: string;
    steps: { title: string; body: string }[];
  };
  faq?: { eyebrow: string; title: string; items: FaqEntry[] };
  cta: {
    title: string;
    facts?: string[];
    primary: CtaLink;
    secondary?: CtaLink;
  };
  /** JSON-LD graph built by the page from the same content. */
  jsonLd: Record<string, unknown>;
}

/**
 * Shared layout for the /vs pages (Buaze compared with a static QR code or a
 * spreadsheet). Each page passes its own, page-specific content: an honest
 * table, when the alternative is enough and when it is not, how to move over
 * and a short FAQ. No invented metrics, no customer counts, no urgency.
 */
export default function ComparisonLayout({
  locale,
  slug,
  hero,
  table,
  fit,
  migration,
  faq,
  cta,
  jsonLd,
}: ComparisonLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        <PageHero
          align="center"
          eyebrow={hero.eyebrow}
          title={hero.title}
          lead={hero.lead}
          actions={
            <>
              <Link
                href={hero.primary.href}
                rel={hero.primary.nofollow ? 'nofollow' : undefined}
                className={BTN_DARK}
              >
                {hero.primary.label}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {hero.secondary ? (
                <Link
                  href={hero.secondary.href}
                  rel={hero.secondary.nofollow ? 'nofollow' : undefined}
                  className={BTN_OUTLINE}
                >
                  {hero.secondary.label}
                </Link>
              ) : null}
            </>
          }
        />

        <section aria-labelledby={`${slug}-table-title`} className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id={`${slug}-table-title`}
              eyebrow={table.eyebrow}
              title={table.title}
              lead={table.lead}
            />
            <div className="mt-10 sm:mt-12">
              <ComparisonTable
                caption={table.caption}
                featureLabel={table.featureLabel}
                columns={[
                  { key: 'buaze', label: 'Buaze', highlight: true },
                  { key: 'other', label: table.otherLabel },
                ]}
                rows={table.rows}
                minWidth={0}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby={`${slug}-fit-title`} className={SECTION_Y}>
          <div className={CONTAINER}>
            <SectionHeader id={`${slug}-fit-title`} eyebrow={fit.eyebrow} title={fit.title} lead={fit.lead} />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
              {[fit.enough, fit.notEnough].map((group, gi) => (
                <div
                  key={group.title}
                  className={`rounded-[20px] border p-6 sm:p-8 ${
                    gi === 0 ? 'border-[#EDEDED] bg-white' : 'border-[#C6F24E] bg-[#EAF9B8]/50'
                  }`}
                >
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{group.title}</h3>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px] leading-[1.55] text-[#1A1A1A]">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            gi === 0 ? 'bg-[#F2F2F2]' : 'bg-[#C6F24E]'
                          }`}
                        >
                          <Check size={12} strokeWidth={2.75} className="text-[#0A0A0A]" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby={`${slug}-migration-title`} className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id={`${slug}-migration-title`}
              eyebrow={migration.eyebrow}
              title={migration.title}
              lead={migration.lead}
            />
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-3">
              {migration.steps.map((step, i) => (
                <li key={step.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#525252]">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {faq && faq.items.length > 0 ? (
          <section aria-labelledby={`${slug}-faq-title`} className={SECTION_Y}>
            <div className={CONTAINER_NARROW}>
              <SectionHeader id={`${slug}-faq-title`} eyebrow={faq.eyebrow} title={faq.title} />
              <div className="mt-10">
                <FaqList items={faq.items} idPrefix={`${slug}-faq`} />
              </div>
            </div>
          </section>
        ) : null}

        <CtaBand
          id={`${slug}-cta-title`}
          title={cta.title}
          facts={cta.facts}
          primary={cta.primary}
          secondary={cta.secondary}
        />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
