'use client';

// Stage 98 — Surveys list client component (CLAUDE.md §42).
// Fetches /api/surveys, lets owner pick restaurant scope, lists surveys
// with status badges + key stats. Links to /new wizard and detail pages.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Eye, Loader2, Plus } from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { AlertBanner, Badge, EmptyState, PageHeader, PulseSelect, StatCard } from '@/components/ui';

interface Restaurant {
  id: string;
  name: string;
}

interface SurveyRow {
  id: string;
  slug: string;
  title: string;
  type: 'single' | 'multi_step';
  isActive: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantId: string;
  restaurant: { id: string; name: string; slug: string } | null;
  _count: { responses: number; questions: number };
}

interface Props {
  locale: Locale;
  restaurants: Restaurant[];
  initialActiveRestaurantId: string | null;
}

export default function SurveysClient({
  locale,
  restaurants,
  initialActiveRestaurantId,
}: Props) {
  const t = getTranslations(locale);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(
    initialActiveRestaurantId,
  );
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = activeRestaurantId
        ? `/api/surveys?restaurantId=${activeRestaurantId}`
        : '/api/surveys';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch_failed');
      const json = await res.json();
      setSurveys(json.surveys || []);
    } catch {
      setError(
        locale === 'tr'
          ? 'Anketler yüklenemedi. Tekrar deneyin.'
          : 'Could not load surveys. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [activeRestaurantId, locale]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const totalsBy = useMemo(() => {
    return surveys.reduce(
      (acc, s) => {
        acc.total += 1;
        if (s.isPublished) acc.published += 1;
        else acc.drafts += 1;
        acc.responses += s._count.responses;
        return acc;
      },
      { total: 0, published: 0, drafts: 0, responses: 0 },
    );
  }, [surveys]);

  const newSurveyHref = activeRestaurantId
    ? `/${locale}/dashboard/surveys/new?restaurantId=${activeRestaurantId}`
    : `/${locale}/dashboard/surveys/new`;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'CRM · ANKETLER' : 'CRM · SURVEYS'}
        title={t.surveys_title}
        description={t.surveys_subtitle}
        actions={
          <Link
            href={newSurveyHref}
            className="bz-btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            {t.surveys_create}
          </Link>
        }
      />

      {restaurants.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-[#525252]">
            {locale === 'tr' ? 'İşletme' : 'Business'}
          </label>
          <PulseSelect
            value={activeRestaurantId ?? ''}
            onChange={(v) => setActiveRestaurantId(v || null)}
            options={[
              { value: '', label: locale === 'tr' ? 'Tüm işletmeler' : 'All businesses' },
              ...restaurants.map((r) => ({ value: r.id, label: r.name })),
            ]}
            ariaLabel={locale === 'tr' ? 'İşletme seç' : 'Select business'}
            className="min-w-[220px]"
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label={locale === 'tr' ? 'Toplam anket' : 'Total surveys'}
          value={String(totalsBy.total)}
          icon={<ClipboardList size={14} />}
          accent="#C6F24E"
        />
        <StatCard
          label={locale === 'tr' ? 'Yayında' : 'Live'}
          value={String(totalsBy.published)}
          icon={<Eye size={14} />}
        />
        <StatCard
          label={locale === 'tr' ? 'Taslak' : 'Drafts'}
          value={String(totalsBy.drafts)}
        />
        <StatCard
          label={t.surveys_total_responses}
          value={String(totalsBy.responses)}
        />
      </div>

      {error && (
        <div className="mt-6">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      <section className="bz-card mt-6 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="bz-h-tight text-lg">
            {locale === 'tr' ? 'Anketler' : 'Surveys'}
          </h2>
          {loading && <Loader2 className="animate-spin text-[#737373]" size={18} />}
        </div>

        {!loading && surveys.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<ClipboardList size={28} />}
              title={t.surveys_empty}
              body={t.surveys_empty_cta}
              action={
                <Link href={newSurveyHref} className="bz-btn-primary text-sm">
                  {t.surveys_create}
                </Link>
              }
            />
          </div>
        )}

        {surveys.length > 0 && (
          <ul className="mt-4 divide-y divide-[#EDEDED]">
            {surveys.map((s) => (
              <li key={s.id} className="py-3">
                <Link
                  href={`/${locale}/dashboard/surveys/${s.id}`}
                  className="flex flex-col gap-2 rounded-xl p-3 hover:bg-[#FAFAFA] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.accentColor || '#C6F24E' }}
                        aria-hidden="true"
                      />
                      <span className="bz-h-tight truncate text-[15px]">
                        {s.title}
                      </span>
                      {s.isPublished ? (
                        <Badge kind="lime">{t.surveys_published}</Badge>
                      ) : (
                        <Badge kind="ghost">{t.surveys_draft}</Badge>
                      )}
                      {!s.isActive && <Badge kind="warn">{t.surveys_inactive}</Badge>}
                      <Badge kind="info">
                        {s.type === 'single' ? t.surveys_type_single : t.surveys_type_multi}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#737373]">
                      <span>
                        {s._count.questions} {t.surveys_questions_count.toLowerCase()}
                      </span>
                      <span>
                        {s._count.responses} {t.surveys_total_responses.toLowerCase()}
                      </span>
                      {s.restaurant && (
                        <span>{s.restaurant.name}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
