import Link from 'next/link';
import type { HelpCategoryIcon as HelpCategoryIconKey } from '@/lib/help-categories';
import HelpCategoryIcon from './HelpCategoryIcon';

export interface HelpTopicLink {
  slug: string;
  title: string;
  icon: HelpCategoryIconKey;
  count: number;
}

const COPY = {
  tr: { topics: 'Konular', articles: (n: number) => `${n} makale` },
  en: { topics: 'Topics', articles: (n: number) => `${n} article${n === 1 ? '' : 's'}` },
} as const;

/**
 * Compact topic list used on /help/search. No hooks, so it renders on the
 * server (the static fallback before the client reads ?q=) and inside the
 * client results component alike.
 */
export default function HelpTopicGrid({
  locale,
  topics,
  className = 'mt-10',
}: {
  locale: 'tr' | 'en';
  topics: HelpTopicLink[];
  className?: string;
}) {
  const copy = COPY[locale];
  return (
    <div className={className}>
      <h2 className="text-[22px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A] sm:text-[26px]">{copy.topics}</h2>
      <ul role="list" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/${locale}/help/category/${topic.slug}`}
              className="group flex min-h-[56px] items-center gap-3 rounded-[14px] border border-[#EDEDED] bg-white px-4 py-3 transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--rt-cream)] text-[var(--rt-ink-900)] transition-colors group-hover:bg-[#5D3EBC] group-hover:text-white"
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
}
