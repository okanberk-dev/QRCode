import { Fragment } from 'react';
import Link from 'next/link';
import { Check, Info } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { helpBodyLabels, parseInline, type BodyInput } from '@/lib/help-articles';

/**
 * Renders a static help article from its structured body (no HTML strings).
 * Inline markup is limited to **bold** and [label](href) (see
 * src/lib/help-articles.ts); internal links use next/link, external links
 * open in a new tab.
 */

export interface HelpTocEntry {
  id: string;
  label: string;
}

const LINK_CLASS =
  'font-medium text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';

function slugifyHeading(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Section anchors + checklist + FAQ, in page order (ids are unique). */
export function helpArticleToc(body: BodyInput, locale: Locale): {
  sections: HelpTocEntry[];
  checklist: HelpTocEntry | null;
  faq: HelpTocEntry | null;
} {
  const labels = helpBodyLabels(locale);
  const used = new Set<string>();
  const unique = (base: string) => {
    let id = base || 'bolum';
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };
  const sections = body.sections.map((section) => ({
    id: unique(slugifyHeading(section.title)),
    // The contents list numbers entries itself, so drop a leading "1. ".
    label: section.title.replace(/^\d+\.\s+/, ''),
  }));
  const checklist = body.checklist.length
    ? { id: unique(locale === 'tr' ? 'kontrol-listesi' : 'checklist'), label: labels.checklist }
    : null;
  const faq = body.faq.length ? { id: unique(locale === 'tr' ? 'sik-sorulan-sorular' : 'faq'), label: labels.faq } : null;
  return { sections, checklist, faq };
}

export function HelpInline({ text, locale }: { text: string; locale: Locale }) {
  const newTab = locale === 'tr' ? ' (yeni sekmede açılır)' : ' (opens in a new tab)';
  return (
    <>
      {parseInline(text).map((token, index) => {
        if (token.type === 'strong') {
          return (
            <strong key={index} className="font-semibold text-[#0A0A0A]">
              {token.text}
            </strong>
          );
        }
        if (token.type === 'link') {
          if (token.href.startsWith('/')) {
            return (
              <Link key={index} href={token.href} className={LINK_CLASS}>
                {token.text}
              </Link>
            );
          }
          if (token.href.startsWith('mailto:')) {
            return (
              <a key={index} href={token.href} className={LINK_CLASS}>
                {token.text}
              </a>
            );
          }
          return (
            <a key={index} href={token.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {token.text}
              <span className="sr-only">{newTab}</span>
            </a>
          );
        }
        return <Fragment key={index}>{token.text}</Fragment>;
      })}
    </>
  );
}

const H2_CLASS = 'scroll-mt-28 text-balance text-[24px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]';
const P_CLASS = 'text-pretty text-[16px] leading-[1.75] text-[#404040]';

export default function HelpArticleBody({ body, locale }: { body: BodyInput; locale: Locale }) {
  const labels = helpBodyLabels(locale);
  const toc = helpArticleToc(body, locale);

  return (
    <div className="min-w-0">
      {body.keyInsight && (
        <div className="rounded-r-[16px] border-l-[3px] border-[#8C6CF0] bg-[#EFEAFB]/40 px-5 py-4 sm:px-6 sm:py-5">
          <p lang={locale} className="pulse-eyebrow text-[#525252]">
            {labels.summary}
          </p>
          <p className="mt-2 text-pretty text-[16px] leading-[1.65] text-[#0A0A0A] sm:text-[17px]">
            <HelpInline text={body.keyInsight} locale={locale} />
          </p>
        </div>
      )}

      {body.sections.map((section, sectionIndex) => {
        const entry = toc.sections[sectionIndex];
        return (
          <section key={entry.id} className="mt-12 first:mt-0 sm:mt-14">
            <h2 id={entry.id} className={H2_CLASS}>
              {section.title}
            </h2>
            {(section.paragraphs ?? []).map((paragraph, index) => (
              <p key={index} className={`mt-4 ${P_CLASS}`}>
                <HelpInline text={paragraph} locale={locale} />
              </p>
            ))}
            {section.items?.length ? (
              section.ordered ? (
                <ol role="list" className="mt-5 space-y-4">
                  {section.items.map((item, index) => (
                    <li key={index} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[13px] font-semibold text-white tabular-nums"
                      >
                        {index + 1}
                      </span>
                      <span className={P_CLASS}>
                        <HelpInline text={item} locale={locale} />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul role="list" className="mt-5 space-y-3">
                  {section.items.map((item, index) => (
                    <li key={index} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0A0A0A]" />
                      <span className={P_CLASS}>
                        <HelpInline text={item} locale={locale} />
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        );
      })}

      {body.policyNote && (
        <div className="mt-12 flex gap-3 rounded-[16px] border border-[#EDEDED] bg-[#FAFAFA] p-5 sm:p-6">
          <Info size={18} className="mt-0.5 shrink-0 text-[#525252]" aria-hidden="true" />
          <p className="text-pretty text-[15px] leading-[1.65] text-[#404040]">
            <strong className="font-semibold text-[#0A0A0A]">{labels.note}:</strong>{' '}
            <HelpInline text={body.policyNote} locale={locale} />
          </p>
        </div>
      )}

      {toc.checklist && (
        <section className="mt-12 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:mt-14 sm:p-8">
          <h2 id={toc.checklist.id} className={H2_CLASS}>
            {toc.checklist.label}
          </h2>
          <ul role="list" className="mt-5 space-y-3">
            {body.checklist.map((item, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-[3px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5D3EBC] text-white"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-pretty text-[16px] leading-[1.6] text-[#262626]">
                  <HelpInline text={item} locale={locale} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toc.faq && (
        <section className="mt-12 sm:mt-14">
          <h2 id={toc.faq.id} className={H2_CLASS}>
            {toc.faq.label}
          </h2>
          <div className="mt-5 border-t border-[#EDEDED]">
            {body.faq.map((item, index) => (
              <div key={index} className="border-b border-[#EDEDED] py-5">
                <h3 className="text-pretty text-[17px] font-semibold leading-[1.4] tracking-[-0.01em] text-[#0A0A0A]">
                  {item.q}
                </h3>
                <p className={`mt-2 ${P_CLASS}`}>
                  <HelpInline text={item.a} locale={locale} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
