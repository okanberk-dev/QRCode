import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ArrowRight, Search as SearchIcon } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { prisma } from '@/lib/prisma';
import { HELP_CATEGORIES, CATEGORY_BY_SLUG } from '@/lib/help-categories';
import { searchStaticHelpArticles } from '@/lib/help-articles';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  return {
    title: isTr ? 'Yardım Merkezi Arama | Buaze' : 'Help Center Search | Buaze',
    description: isTr
      ? 'Yardım merkezinde makale arayın. Kurulum, QR kodları, entegrasyonlar ve daha fazlası.'
      : 'Search the help center. Setup, QR codes, integrations and more.',
    robots: { index: false, follow: true },
  };
}

/**
 * URL-driven search results — reads ?q= and runs a case-insensitive
 * ILIKE over title/excerpt plus a searchTags array match, same as the
 * API /api/help/articles?search= branch.
 */
export default async function HelpSearchPage({ params, searchParams }: PageParams) {
  const { locale } = await params;
  const sp = await searchParams;
  const rawQ = (sp.q ?? '').trim();
  const q = rawQ.slice(0, 100); // clamp to prevent pathological inputs
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  let results: {
    id: string;
    slug: string;
    category: string;
    title: string;
    excerpt: string | null;
  }[] = [];

  if (q.length > 0) {
    try {
      results = await prisma.helpArticle.findMany({
        where: {
          isPublished: true,
          locale,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { excerpt: { contains: q, mode: 'insensitive' } },
            { searchTags: { has: q.toLowerCase() } },
          ],
        },
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
        take: 30,
        select: {
          id: true,
          slug: true,
          category: true,
          title: true,
          excerpt: true,
        },
      });
    } catch {
      /* table missing — results stays empty */
    }
    if (results.length === 0) {
      results = searchStaticHelpArticles(locale, q).map((article) => ({
        id: article.id,
        slug: article.slug,
        category: article.category,
        title: article.title,
        excerpt: article.excerpt,
      }));
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Header with search bar */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-14">
        <div className="mx-auto max-w-[900px]">
          <nav
            aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
            className="mb-5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#737373]"
          >
            <Link href={base} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Ana sayfa' : 'Home'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <Link href={`${base}/help`} className="hover:text-[#0A0A0A] transition-colors">
              {isTr ? 'Yardım' : 'Help'}
            </Link>
            <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
            <span className="font-medium text-[#0A0A0A]">{isTr ? 'Arama' : 'Search'}</span>
          </nav>

          <h1
            className="text-[28px] sm:text-[36px] font-medium leading-[1.05] tracking-[-0.02em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {q.length > 0
              ? isTr
                ? <>&ldquo;{q}&rdquo; için sonuçlar</>
                : <>Results for &ldquo;{q}&rdquo;</>
              : isTr
                ? 'Yardım merkezinde ara'
                : 'Search the help center'}
          </h1>
          {q.length > 0 && (
            <p className="mt-2 text-[14px] text-[#737373]">
              {isTr
                ? `${results.length} makale bulundu`
                : `${results.length} article${results.length === 1 ? '' : 's'} found`}
            </p>
          )}

          <div className="mt-5">
            <HelpSearchBar locale={locale} initial={q} size="compact" />
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[900px]">
          {q.length === 0 ? (
            <EmptyPrompt locale={locale} />
          ) : results.length > 0 ? (
            <ul className="divide-y divide-[#EDEDED] border-t-2 border-[#0A0A0A]">
              {results.map((r) => {
                const cat = CATEGORY_BY_SLUG[r.category];
                const catLabel = cat ? cat[locale].title : r.category;
                return (
                  <li key={r.id}>
                    <Link
                      href={`${base}/help/${r.slug}`}
                      className="group flex flex-col gap-2 py-[22px] sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="pulse-eyebrow text-[#737373]">{catLabel}</span>
                        <h3
                          className="mt-1 text-[17px] sm:text-[19px] font-medium tracking-[-0.015em] text-[#0A0A0A]"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {r.title}
                        </h3>
                        {r.excerpt && (
                          <p className="mt-1.5 max-w-[620px] text-[13px] leading-[1.55] text-[#525252]">
                            {r.excerpt}
                          </p>
                        )}
                      </div>
                      <span
                        aria-hidden
                        className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#737373] transition-colors group-hover:text-[#0A0A0A]"
                      >
                        {isTr ? 'Oku' : 'Read'}
                        <ArrowRight
                          size={14}
                          strokeWidth={2}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <NoResults locale={locale} q={q} />
          )}
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}

function EmptyPrompt({ locale }: { locale: Locale }) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#737373]">
        <SearchIcon size={18} strokeWidth={2} aria-hidden />
      </div>
      <p className="mt-4 text-[15px] text-[#525252]">
        {isTr ? 'Bir şey aramak için yukarıdaki kutuyu kullanın.' : 'Use the box above to search.'}
      </p>
      <Link
        href={`${base}/help`}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-5 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
      >
        {isTr ? 'Yardım merkezine dön' : 'Back to help center'}
      </Link>
    </div>
  );
}

function NoResults({ locale, q }: { locale: Locale; q: string }) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  return (
    <div>
      <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-8 sm:p-10">
        <p
          className="text-[18px] font-medium tracking-[-0.015em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {isTr ? (
            <>&ldquo;{q}&rdquo; için bir sonuç bulamadık.</>
          ) : (
            <>No results for &ldquo;{q}&rdquo;.</>
          )}
        </p>
        <p className="mt-2 text-[14px] text-[#525252]">
          {isTr
            ? 'Farklı bir kelime deneyin ya da aşağıdaki kategorilerden birini açın.'
            : 'Try a different word or open one of the categories below.'}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HELP_CATEGORIES.map((cat) => {
          const meta = cat[locale];
          return (
            <Link
              key={cat.slug}
              href={`${base}/help/category/${cat.slug}`}
              className="group flex items-start gap-3 rounded-[12px] border border-[#EDEDED] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#C6F24E]"
            >
              <span
                className="text-[22px] leading-none text-[#0A0A0A]"
                aria-hidden
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {cat.symbol}
              </span>
              <div className="min-w-0">
                <h3
                  className="text-[14px] font-semibold tracking-[-0.01em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {meta.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-[#737373]">
                  {meta.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href={`${base}/contact`}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
        >
          {isTr ? 'Destek ekibine yaz' : 'Contact support'}
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
