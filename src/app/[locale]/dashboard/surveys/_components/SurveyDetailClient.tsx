'use client';

// Stage 98 — Survey detail client (CLAUDE.md §42).
// Single page with 3 sections: Overview (QR + public URL + publish),
// Questions (read-only preview + edit CTA), Analytics (live aggregate).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react';
import { getTranslations, type Locale } from '@/lib/translations';
import { AlertBanner, Badge, PageHeader, StatCard, Tabs } from '@/components/ui';
import type { SurveyQuestionType } from '@/lib/surveys';

interface Question {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

interface Survey {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: 'single' | 'multi_step';
  isActive: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  accentColor: string | null;
  thankYouMessage: string | null;
  kvkkText: string | null;
  collectMarketingConsent: boolean;
  collectContact: boolean;
  couponCode: string | null;
  couponLabel: string | null;
  restaurantId: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  _count: { responses: number };
}

interface AnalyticsResp {
  range: '7d' | '30d' | '90d' | 'all';
  totals: { responses: number; completed: number; completionRate: number };
  perQuestion: Array<{
    id: string;
    text: string;
    type: SurveyQuestionType;
    count: number;
    avg?: number | null;
    npsScore?: number | null;
    distribution?: Record<string, number>;
    samples?: string[];
  }>;
  trend: Array<{ date: string; total: number; completed: number }>;
}

interface Props {
  locale: Locale;
  survey: Survey;
  restaurantName: string;
  publicUrl: string;
}

export default function SurveyDetailClient({
  locale,
  survey: initialSurvey,
  restaurantName,
  publicUrl,
}: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [survey, setSurvey] = useState(initialSurvey);
  const [tab, setTab] = useState<'overview' | 'questions' | 'analytics'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsResp | null>(null);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/analytics?range=${range}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json);
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, [survey.id, range]);

  useEffect(() => {
    if (tab === 'analytics') fetchAnalytics();
  }, [tab, fetchAnalytics]);

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const togglePublish = async () => {
    setBusy('publish');
    setError(null);
    try {
      const res = await fetch(`/api/surveys/${survey.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ publish: !survey.isPublished }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || 'publish_failed');
      }
      const j = await res.json();
      setSurvey({
        ...survey,
        isPublished: j.survey.isPublished,
        publishedAt: j.survey.publishedAt,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const deleteSurvey = async () => {
    if (!confirm(t.survey_detail_delete_confirm)) return;
    setBusy('delete');
    try {
      const res = await fetch(`/api/surveys/${survey.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('delete_failed');
      router.push(`/${locale}/dashboard/surveys`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8">
      <div className="mb-3">
        <Link
          href={`/${locale}/dashboard/surveys`}
          className="inline-flex items-center gap-1 text-xs text-[#525252] hover:text-[#0A0A0A]"
        >
          <ArrowLeft size={12} />
          {locale === 'tr' ? 'Anketler' : 'Surveys'}
        </Link>
      </div>

      <PageHeader
        eyebrow={`${restaurantName.toUpperCase()} · ${
          survey.type === 'single'
            ? t.surveys_type_single.toUpperCase()
            : t.surveys_type_multi.toUpperCase()
        }`}
        title={survey.title}
        description={survey.description || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {survey.isPublished ? (
              <Badge kind="lime">{t.surveys_published}</Badge>
            ) : (
              <Badge kind="ghost">{t.surveys_draft}</Badge>
            )}
            <button
              type="button"
              onClick={togglePublish}
              disabled={busy === 'publish'}
              className={
                survey.isPublished
                  ? 'bz-btn-ghost inline-flex items-center gap-2 text-sm'
                  : 'bz-btn-primary inline-flex items-center gap-2 text-sm'
              }
            >
              {busy === 'publish' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : survey.isPublished ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
              {survey.isPublished
                ? t.survey_detail_unpublish_btn
                : t.survey_detail_publish_btn}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mt-4">
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        </div>
      )}

      <div className="mt-5">
        <Tabs
          items={[
            {
              id: 'overview',
              label: locale === 'tr' ? 'Genel bakış' : 'Overview',
            },
            {
              id: 'questions',
              label: t.survey_questions_title,
            },
            {
              id: 'analytics',
              label: t.survey_analytics_title,
            },
          ]}
          active={tab}
          onChange={(id) => setTab(id as typeof tab)}
        />
      </div>

      {tab === 'overview' && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="bz-card p-5 sm:p-6">
            <h3 className="bz-h-tight text-base">{t.survey_detail_public_url}</h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="bz-mono flex-1 truncate rounded-md border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-xs">
                {publicUrl}
              </code>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyPublicUrl}
                  className="bz-btn-ghost inline-flex items-center gap-1 text-xs"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? t.survey_detail_url_copied : t.survey_detail_copy_url}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bz-btn-ghost inline-flex items-center gap-1 text-xs"
                >
                  <ExternalLink size={12} />
                  {locale === 'tr' ? 'Önizle' : 'Preview'}
                </a>
              </div>
            </div>

            {!survey.isPublished && (
              <div className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                <AlertTriangle size={12} className="mr-1 inline" />
                {locale === 'tr'
                  ? 'Anket henüz yayında değil. Müşteriler bağlantıyı açtığında 404 görür. Üst sağdaki "Yayına al" butonunu kullanın.'
                  : 'This survey is not live yet. Customers will get 404. Use the "Publish" button in the top-right.'}
              </div>
            )}

            <div className="mt-5 border-t border-[#EDEDED] pt-5">
              <h3 className="bz-h-tight text-base">{t.survey_detail_qr}</h3>
              <p className="mt-1 text-xs text-[#737373]">
                {locale === 'tr'
                  ? 'Masa kartına, fatura altına veya kasaya yazdırıp dağıtın.'
                  : 'Print on table cards, receipts, or counter signage.'}
              </p>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-2xl border border-[#EDEDED] bg-white"
                  aria-label="QR preview"
                >
                  {/* Inline SVG preview via the API — raw img tag avoids next/image
                      cost for a SVG that's already rate-limited and authorized.
                      `preview=1` returns the aesthetic (frame'siz) variant so
                      the small 128x128 thumbnail stays readable; full Lime
                      frame would be illegible at this size. */}
                  <img
                    src={`/api/surveys/${survey.id}/qr?format=svg&preview=1&width=400`}
                    alt={`QR ${survey.title}`}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/surveys/${survey.id}/qr?format=png&width=1200`}
                    className="bz-btn-primary inline-flex items-center gap-1 text-xs"
                  >
                    <Download size={12} />
                    {t.survey_detail_qr_download_png_designed}
                  </a>
                  <a
                    href={`/api/surveys/${survey.id}/qr?format=svg&width=1000`}
                    className="bz-btn-primary inline-flex items-center gap-1 text-xs"
                  >
                    <Download size={12} />
                    {t.survey_detail_qr_download_svg_designed}
                  </a>
                  <a
                    href={`/api/surveys/${survey.id}/qr?format=png&style=plain&width=1200`}
                    className="bz-btn-ghost inline-flex items-center gap-1 text-xs"
                  >
                    <Download size={12} />
                    {t.survey_detail_qr_download_png_plain}
                  </a>
                  <a
                    href={`/api/surveys/${survey.id}/qr?format=svg&style=plain&width=1000`}
                    className="bz-btn-ghost inline-flex items-center gap-1 text-xs"
                  >
                    <Download size={12} />
                    {t.survey_detail_qr_download_svg_plain}
                  </a>
                </div>
              </div>
            </div>
          </section>

          <aside className="bz-card p-5 sm:p-6">
            <h3 className="bz-h-tight text-base">
              {locale === 'tr' ? 'Anket bilgileri' : 'Survey info'}
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={locale === 'tr' ? 'Tip' : 'Type'} value={survey.type === 'single' ? t.surveys_type_single : t.surveys_type_multi} />
              <Row
                label={t.surveys_questions_count}
                value={String(survey.questions.length)}
              />
              <Row
                label={t.surveys_total_responses}
                value={String(survey._count.responses)}
              />
              <Row
                label={locale === 'tr' ? 'Oluşturuldu' : 'Created'}
                value={new Date(survey.createdAt).toLocaleDateString(
                  locale === 'tr' ? 'tr-TR' : 'en-US',
                )}
              />
              {survey.publishedAt && (
                <Row
                  label={locale === 'tr' ? 'Yayınlandı' : 'Published'}
                  value={new Date(survey.publishedAt).toLocaleDateString(
                    locale === 'tr' ? 'tr-TR' : 'en-US',
                  )}
                />
              )}
              <Row
                label={t.survey_form_collect_contact}
                value={survey.collectContact ? '✓' : '—'}
              />
              <Row
                label={t.survey_form_collect_marketing}
                value={survey.collectMarketingConsent ? '✓' : '—'}
              />
              {survey.couponCode && (
                <Row
                  label={locale === 'tr' ? 'Kupon kodu' : 'Coupon code'}
                  value={survey.couponCode}
                />
              )}
            </dl>

            <div className="mt-4 border-t border-[#EDEDED] pt-4">
              <button
                type="button"
                onClick={deleteSurvey}
                disabled={busy === 'delete'}
                className="inline-flex items-center gap-1 text-xs text-[#991B1B] hover:underline"
              >
                {busy === 'delete' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                {t.survey_detail_delete}
              </button>
            </div>
          </aside>
        </div>
      )}

      {tab === 'questions' && (
        <section className="bz-card mt-6 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="bz-h-tight text-base">{t.survey_questions_title}</h3>
            <p className="text-xs text-[#737373]">
              {locale === 'tr'
                ? 'Soruları düzenlemek için yeni anket oluşturun ya da bizimle iletişime geçin.'
                : 'To edit questions, create a new survey or contact us.'}
            </p>
          </div>
          <ol className="mt-4 space-y-3">
            {survey.questions.map((q, idx) => (
              <li
                key={q.id}
                className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                  <span className="bz-mono">#{idx + 1}</span>
                  <Badge kind="ghost">{questionTypeLabel(q.type, t)}</Badge>
                  {q.required && <Badge kind="warn">*</Badge>}
                </div>
                <p className="mt-2 text-sm font-medium text-[#0A0A0A]">{q.text}</p>
                {q.type === 'multiple_choice' && q.options && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-[#525252]">
                    {q.options.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === 'analytics' && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs',
                  range === r
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3]',
                ].join(' ')}
              >
                {r === '7d'
                  ? '7g'
                  : r === '30d'
                  ? '30g'
                  : r === '90d'
                  ? '90g'
                  : locale === 'tr'
                  ? 'Tümü'
                  : 'All'}
              </button>
            ))}
            <a
              href={`/api/surveys/${survey.id}/export`}
              className="bz-btn-ghost ml-auto inline-flex items-center gap-1 text-xs"
            >
              <Download size={12} />
              {t.survey_analytics_export}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard
              label={t.survey_analytics_total}
              value={String(analytics?.totals.responses ?? 0)}
              icon={<ClipboardList size={14} />}
              accent="#C6F24E"
            />
            <StatCard
              label={t.survey_analytics_completed}
              value={String(analytics?.totals.completed ?? 0)}
              icon={<Check size={14} />}
            />
            <StatCard
              label={t.surveys_completion_rate}
              value={`%${analytics?.totals.completionRate ?? 0}`}
              icon={<BarChart3 size={14} />}
            />
            <StatCard
              label={locale === 'tr' ? 'Soru sayısı' : 'Questions'}
              value={String(survey.questions.length)}
              icon={<Star size={14} />}
            />
          </div>

          <section className="bz-card mt-5 p-5 sm:p-6">
            <h3 className="bz-h-tight text-base">{t.survey_analytics_per_question}</h3>
            {loadingAnalytics && (
              <div className="mt-4 flex items-center gap-2 text-sm text-[#737373]">
                <Loader2 size={14} className="animate-spin" />
                {locale === 'tr' ? 'Yükleniyor…' : 'Loading…'}
              </div>
            )}
            {!loadingAnalytics && analytics && analytics.totals.responses === 0 && (
              <p className="mt-3 text-sm text-[#737373]">{t.survey_analytics_no_data}</p>
            )}
            {!loadingAnalytics && analytics && analytics.totals.responses > 0 && (
              <ul className="mt-4 space-y-5">
                {analytics.perQuestion.map((pq) => (
                  <li key={pq.id} className="rounded-2xl border border-[#EDEDED] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                      <Badge kind="ghost">{questionTypeLabel(pq.type, t)}</Badge>
                      <span>
                        {pq.count} {locale === 'tr' ? 'yanıt' : 'answers'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#0A0A0A]">{pq.text}</p>
                    {pq.type === 'rating' && (
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <div className="bz-h-tight text-2xl">
                          {pq.avg ? pq.avg.toFixed(2) : '—'}
                        </div>
                        <div className="text-xs text-[#737373]">/ 5</div>
                      </div>
                    )}
                    {pq.type === 'nps' && (
                      <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">
                        <div>
                          <div className="bz-h-tight text-2xl">{pq.npsScore ?? 0}</div>
                          <div className="text-xs text-[#737373]">NPS</div>
                        </div>
                        <div className="text-xs text-[#525252]">
                          {locale === 'tr' ? 'Ortalama' : 'Mean'}:{' '}
                          {pq.avg ? pq.avg.toFixed(1) : '—'}
                        </div>
                      </div>
                    )}
                    {(pq.type === 'rating' || pq.type === 'nps' || pq.type === 'multiple_choice') &&
                      pq.distribution && (
                        <ul className="mt-3 space-y-1.5">
                          {Object.entries(pq.distribution).map(([k, v]) => {
                            const max = Math.max(...Object.values(pq.distribution!), 1);
                            const pct = (v / max) * 100;
                            return (
                              <li key={k} className="flex items-center gap-2 text-xs">
                                <span className="w-24 truncate text-[#525252]">{k}</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                                  <div
                                    className="h-full bg-[#0A0A0A]"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="bz-mono w-8 text-right text-[#737373]">{v}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    {(pq.type === 'short_text' || pq.type === 'long_text') && pq.samples && (
                      <ul className="mt-3 space-y-2 text-xs">
                        {pq.samples.length === 0 && (
                          <li className="text-[#737373]">
                            {locale === 'tr' ? 'Henüz cevap yok.' : 'No answers yet.'}
                          </li>
                        )}
                        {pq.samples.map((s, i) => (
                          <li
                            key={i}
                            className="rounded-md border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[#0A0A0A]"
                          >
                            &ldquo;{s}&rdquo;
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <dt className="text-[#737373]">{label}</dt>
      <dd className="text-[#0A0A0A]">{value}</dd>
    </div>
  );
}

function questionTypeLabel(
  type: SurveyQuestionType,
  t: ReturnType<typeof getTranslations>,
): string {
  if (type === 'rating') return t.survey_question_type_rating;
  if (type === 'nps') return t.survey_question_type_nps;
  if (type === 'short_text') return t.survey_question_type_short_text;
  if (type === 'long_text') return t.survey_question_type_long_text;
  return t.survey_question_type_multiple_choice;
}
