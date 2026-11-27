'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface BlogCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  author: string;
  date: string;
  /** ISO date for <time dateTime>, or null when the stored date can't be parsed. */
  dateIso: string | null;
  readTime: string;
  /** Filter keys this post belongs to (derived from its tags on the server). */
  categories: string[];
  /** Label of the first matching category, shown on the card. */
  categoryLabel: string | null;
}

interface Props {
  locale: 'tr' | 'en';
  posts: BlogCard[];
  /** Only categories that have at least one post; hidden when fewer than two. */
  filters: Array<{ key: string; label: string }>;
  labels: {
    all: string;
    filterGroup: string;
    latest: string;
    results: string;
  };
}

/**
 * Blog index list with a client-side category filter. The server renders
 * every post (filter "all"), so the page stays statically generated and the
 * full list is in the HTML for crawlers; picking a category only hides cards.
 * An old `?cat=` link still opens with that category selected.
 */
export default function BlogIndexList({ locale, posts, filters, labels }: Props) {
  const [active, setActive] = useState<string>('all');
  const showFilters = filters.length >= 2;

  useEffect(() => {
    if (!showFilters) return;
    const cat = new URLSearchParams(window.location.search).get('cat');
    if (cat && filters.some((f) => f.key === cat)) setActive(cat);
  }, [filters, showFilters]);

  const visible = useMemo(
    () => (active === 'all' ? posts : posts.filter((p) => p.categories.includes(active))),
    [active, posts],
  );

  const select = (key: string) => {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', key);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  };

  const featured = visible[0];
  const rest = visible.slice(1);
  const chipBase =
    'inline-flex min-h-[44px] items-center rounded-full border px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';

  return (
    <>
      {showFilters ? (
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
          <div role="group" aria-label={labels.filterGroup} className="flex flex-wrap gap-2">
            {[{ key: 'all', label: labels.all }, ...filters].map((f) => {
              const isActive = active === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => select(f.key)}
                  className={`${chipBase} ${
                    isActive
                      ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                      : 'border-[#EDEDED] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {labels.results.replace('{n}', String(visible.length))}
          </p>
        </div>
      ) : null}

      {featured ? (
        <div className="mx-auto mt-8 w-full max-w-[1200px] px-5 sm:px-10">
          <Link
            href={`/${locale}/blog/${featured.slug}`}
            className="group grid grid-cols-1 overflow-hidden rounded-[20px] border border-[#EDEDED] bg-white transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 md:grid-cols-[1.4fr_1fr]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[#C6F24E] md:aspect-auto md:min-h-[340px]">
              {featured.coverImage ? (
                <Image
                  src={featured.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 100vw, 58vw"
                  priority
                  className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              ) : (
                <svg
                  viewBox="0 0 200 120"
                  className="absolute bottom-8 right-8 w-[70%] max-w-[280px]"
                  aria-hidden="true"
                >
                  <path
                    d="M0 90 L30 80 L60 85 L90 50 L120 60 L150 20 L200 30"
                    fill="none"
                    stroke="#0A0A0A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="90" cy="50" r="5" fill="#0A0A0A" />
                  <circle cx="150" cy="20" r="6" fill="#0A0A0A" />
                </svg>
              )}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="pulse-eyebrow text-[#737373]">
                {labels.latest}
                {featured.categoryLabel ? ` · ${featured.categoryLabel}` : ''}
              </p>
              <h2 className="mt-3 text-balance text-[24px] leading-[1.12] text-[#0A0A0A] sm:text-[28px] lg:text-[32px]">
                {featured.title}
              </h2>
              {featured.description ? (
                <p className="mt-3 line-clamp-3 text-[15px] leading-[1.6] text-[#525252]">{featured.description}</p>
              ) : null}
              <p className="mt-4 text-[13px] text-[#737373]">
                {featured.author} ·{' '}
                {featured.dateIso ? <time dateTime={featured.dateIso}>{featured.date}</time> : featured.date} ·{' '}
                {featured.readTime}
              </p>
            </div>
          </Link>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ul className="mx-auto mt-6 grid w-full max-w-[1200px] grid-cols-1 gap-4 px-5 sm:mt-8 sm:grid-cols-2 sm:gap-6 sm:px-10 lg:grid-cols-3">
          {rest.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${locale}/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-[#EDEDED] bg-white transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#EAF9B8]">
                  {p.coverImage ? (
                    <Image
                      src={p.coverImage}
                      alt=""
                      fill
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.04] motion-reduce:transition-none"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 200 120"
                      className="absolute bottom-6 right-6 w-[60%] max-w-[220px] opacity-40"
                      aria-hidden="true"
                    >
                      <path
                        d="M0 90 L30 80 L60 85 L90 50 L120 60 L150 20 L200 30"
                        fill="none"
                        stroke="#0A0A0A"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  {p.categoryLabel ? <p className="pulse-eyebrow text-[#737373]">{p.categoryLabel}</p> : null}
                  <h2 className="mt-2 text-balance text-[19px] leading-[1.25] text-[#0A0A0A] sm:text-[20px]">
                    {p.title}
                  </h2>
                  {p.description ? (
                    <p className="mt-2 line-clamp-3 text-[14px] leading-[1.6] text-[#525252]">{p.description}</p>
                  ) : null}
                  <p className="mt-auto pt-4 text-[13px] text-[#737373]">
                    {p.author} · {p.dateIso ? <time dateTime={p.dateIso}>{p.date}</time> : p.date} · {p.readTime}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
