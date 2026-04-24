'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  locale: 'tr' | 'en';
  /** Optional initial query (used on /help/search page). */
  initial?: string;
  /** Larger variant for hero; compact for inline results header. */
  size?: 'hero' | 'compact';
}

/**
 * URL-driven help search — submit navigates to `/{locale}/help/search?q=...`
 * where a server page renders results from Prisma. Client state is only the
 * current input value; nothing else is kept here so the bar is reusable
 * across the hub and the results page.
 */
export default function HelpSearchBar({ locale, initial = '', size = 'hero' }: Props) {
  const router = useRouter();
  const isTr = locale === 'tr';
  const [q, setQ] = useState(initial);

  const placeholder = isTr
    ? "Sorunuzu yazın — 'QR nasıl oluşturulur?'"
    : "Type your question — 'How do I create a QR?'";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) {
      router.push(`/${locale}/help`);
      return;
    }
    router.push(`/${locale}/help/search?q=${encodeURIComponent(trimmed)}`);
  };

  const wrapperCls =
    size === 'hero'
      ? 'mx-auto mt-7 flex w-full max-w-[580px] items-center gap-3 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 shadow-[0_2px_8px_rgba(10,10,10,0.04)]'
      : 'flex w-full items-center gap-3 rounded-full border border-[#E5E5E5] bg-white px-4 py-2';

  return (
    <form onSubmit={submit} className={wrapperCls} role="search">
      <Search size={16} className="shrink-0 text-[#A3A3A3]" strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={isTr ? 'Yardım merkezinde ara' : 'Search the help center'}
        className="min-h-[36px] flex-1 bg-transparent text-[14px] text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
      />
      <button
        type="submit"
        className="min-h-[32px] shrink-0 rounded-full bg-[#0A0A0A] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
      >
        {isTr ? 'Ara' : 'Search'}
      </button>
    </form>
  );
}
