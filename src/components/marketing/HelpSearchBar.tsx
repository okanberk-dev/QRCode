'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  locale: 'tr' | 'en';
  /** Optional initial query (used on /help/search). */
  initial?: string;
  /** Larger variant for the hub hero; compact for page headers. */
  size?: 'hero' | 'compact';
}

const COPY = {
  tr: { label: 'Yardım merkezinde ara', placeholder: 'Bir konu arayın', button: 'Ara' },
  en: { label: 'Search the help center', placeholder: 'Search for a topic', button: 'Search' },
} as const;

/**
 * Help search box. Submitting navigates to `/{locale}/help/search?q=...`,
 * where results are matched on the client against a static index (the page
 * stays static). An empty query goes back to the hub.
 */
export default function HelpSearchBar({ locale, initial = '', size = 'hero' }: Props) {
  const router = useRouter();
  const inputId = useId();
  const copy = COPY[locale === 'en' ? 'en' : 'tr'];
  const [q, setQ] = useState(initial);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = q.trim().slice(0, 100);
    router.push(trimmed ? `/${locale}/help/search?q=${encodeURIComponent(trimmed)}` : `/${locale}/help`);
  };

  const wrapper =
    size === 'hero'
      ? 'flex w-full items-center gap-2 rounded-full border border-[#E5E5E5] bg-white py-1.5 pl-5 pr-1.5 shadow-[0_2px_8px_rgba(10,10,10,0.04)]'
      : 'flex w-full items-center gap-2 rounded-full border border-[#E5E5E5] bg-white py-1 pl-4 pr-1';

  return (
    <form
      role="search"
      action={`/${locale}/help/search`}
      method="get"
      onSubmit={submit}
      className={`${wrapper} transition-colors focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#8C6CF0] focus-within:ring-offset-2`}
    >
      <label htmlFor={inputId} className="sr-only">
        {copy.label}
      </label>
      <Search size={18} className="shrink-0 text-[#737373]" strokeWidth={2} aria-hidden="true" />
      <input
        id={inputId}
        type="search"
        name="q"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder={copy.placeholder}
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-h-[44px] min-w-0 flex-1 bg-transparent text-[16px] text-[#0A0A0A] outline-none placeholder:text-[#737373] sm:text-[15px] [&::-webkit-search-cancel-button]:cursor-pointer"
      />
      <button
        type="submit"
        className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-[#0A0A0A] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
      >
        {copy.button}
      </button>
    </form>
  );
}
