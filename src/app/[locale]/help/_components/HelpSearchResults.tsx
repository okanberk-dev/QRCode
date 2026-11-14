'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import type { HelpCategoryIcon as HelpCategoryIconKey } from '@/lib/help-categories';
import { helpQueryWords, scoreHelpMatch } from '@/lib/help-search';
import HelpCategoryIcon from './HelpCategoryIcon';

/**
 * Client side of /help/search. The page is static, so the query is read
 * from the URL here (inside <Suspense>) and matched against a small index
 * the server page passes in. Same matching rules as the server helper:
 * every word must appear; title matches rank first.
 */

export interface HelpSearchEntry {
  slug: string;
  category: string;
  categoryTitle: string;
  icon: HelpCategoryIconKey | null;
  title: string;
  excerpt: string;
  searchText: string;
  titleText: string;
}

export interface HelpSearchTopic {
  slug: string;
  title: string;
  icon: HelpCategoryIconKey;
  count: number;
}

const COPY = {
  tr: {
    results: (n: number, q: string) => `“${q}” için ${n} sonuç`,
    none: (q: string) => `“${q}” için sonuç bulunamadı`,
    noneHint: 'Daha kısa ya da farklı bir kelime deneyin veya aşağıdaki konulara göz atın.',
    empty: 'Aramak için yukarıya bir konu yazın ya da aşağıdan bir konu seçin.',
    topics: 'Konular',
    articles: (n: number) => `${n} makale`,
  },
  en: {
    results: (n: number, q: string) => `${n} result${n === 1 ? '' : 's'} for “${q}”`,
    none: (q: string) => `No results for “${q}”`,
    noneHint: 'Try a shorter or different word, or browse the topics below.',
    empty: 'Type a topic above to search, or pick a topic below.',
    topics: 'Topics',
    articles: (n: number) => `${n} article${n === 1 ? '' : 's'}`,
  },
} as const;

function useQuery() {
  const params = useSearchParams();
  return (params.get('q') ?? '').trim().slice(0, 100);
}

/** Search box pre-filled with the current query. */
export function HelpSearchQueryBar({ locale }: { locale: 'tr' | 'en' }) {
  const q = useQuery();
  return <HelpSearchBar key={q} locale={locale} initial={q} />;
}

export default function HelpSearchResults({
  locale,
  entries,
  topics,
}: {
  locale: 'tr' | 'en';
  entries: HelpSearchEntry[];
  topics: HelpSearchTopic[];
}) {
  const q = useQuery();
  const copy = COPY[locale];
  const base = `/${locale}`;

  const results = useMemo(() => {
    const words = helpQueryWords(q);
    if (words.length === 0) return [];
    return entries
      .map((entry, index) => ({ entry, index, score: scoreHelpMatch(words, entry.searchText, entry.titleText) }))
      .filter((hit): hit is { entry: HelpSearchEntry; index: number; score: number } => hit.score !== null)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((hit) => hit.entry);
  }, [q, entries]);

  const topicList = (
    <div className="mt-10">
      <h2 className="text-[22px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[26px]">{copy.topics}</h2>
      <ul role="list" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`${base}/help/category/${topic.slug}`}
              className="group flex min-h-[56px] items-center gap-3 rounded-[14px] border border-[#EDEDED] bg-white px-4 py-3 transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F5F5F5] text-[#0A0A0A] transition-colors group-hover:bg-[#C6F24E]"
              >
                <HelpCategoryIcon icon={topic.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-[#0A0A0A]">{topic.title}</span>
                <span className="block text-[13px] text-[#737373]">{copy.articles(topic.count)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  if (!q) {
    return (
      <div aria-live="polite">
        <p className="text-[16px] leading-[1.6] text-[#525252]">{copy.empty}</p>
        {topicList}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div aria-live="polite">
        <h2 className="text-balance text-[24px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]">{copy.none(q)}</h2>
        <p className="mt-3 text-[16px] leading-[1.6] text-[#525252]">{copy.noneHint}</p>
        {topicList}
      </div>
    );
  }

  return (
    <div>
      <div aria-live="polite">
        <h2 className="text-balance text-[24px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[28px]">
          {copy.results(results.length, q)}
        </h2>
      </div>
      <ol role="list" className="mt-6 border-t border-[#EDEDED]">
        {results.map((entry) => (
          <li key={entry.slug} className="group relative border-b border-[#EDEDED] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2">
            <div className="flex items-start justify-between gap-6 py-6">
              <div className="min-w-0">
                {entry.icon && (
                  <p lang={locale} className="pulse-eyebrow flex items-center gap-2 text-[#737373]">
                    <HelpCategoryIcon icon={entry.icon} size={13} />
                    {entry.categoryTitle}
                  </p>
                )}
                <h3 className="mt-3 text-pretty text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[#0A0A0A] sm:text-[20px]">
                  <Link
                    href={`${base}/help/${entry.slug}`}
                    className="decoration-[#C6F24E] decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none"
                  >
                    {entry.title}
                  </Link>
                </h3>
                {entry.excerpt && (
                  <p className="mt-2 max-w-[680px] text-pretty text-[15px] leading-[1.6] text-[#525252]">{entry.excerpt}</p>
                )}
              </div>
              <ArrowRight
                size={18}
                aria-hidden="true"
                className="mt-1 shrink-0 text-[#A3A3A3] transition-all group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
