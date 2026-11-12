'use client';

// "Sonuçlar" tab of the survey detail page: a summary an owner can read in five
// seconds (responses, average rating, recommend score, contact details), then
// one card per question. Every number comes from GET /api/surveys/[id]/analytics
// (lib/survey-analytics.ts) — this file only draws; it never recomputes a score.
//
// Never shows a fake "0" while loading: the cards are skeletons until the
// numbers arrive. "No responses at all" and "none in this range" are told apart
// (the default range is 30 days, so an old survey would otherwise read as empty).
// One toolbar row: range · CSV download (the only CSV link on the tab). A survey
// that never had a response has nothing to filter or download, so the toolbar
// is hidden and the empty state offers the link instead.

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Download, MessageSquare, Star, ThumbsUp, UserRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import {
  Badge,
  EmptyState,
  ErrorState,
  Eyebrow,
  Skeleton,
  StarRow,
  StatCard,
  StatCardSkeleton,
} from '@/components/ui';
import { formatStampInTimeZone } from '@/lib/timezone';
import type { QuestionStats, SurveySummary } from '@/lib/survey-analytics';
import { copyText, type DetailQuestionType, type DetailSurvey } from './survey-owner-ui';

type Range = '7d' | '30d' | '90d' | 'all';

interface AnalyticsResp {
  range: Range;
  summary: SurveySummary;
  perQuestion: QuestionStats[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AnalyticsResp };

interface Props {
  locale: Locale;
  survey: DetailSurvey;
  publicUrl: string;
}

const RANGES: Range[] = ['7d', '30d', '90d', 'all'];
/** Latest free-text answers shown before "show all". */
const TEXT_PREVIEW = 5;

// Pulse status hexes (CLAUDE.md §23.1) for the recommend-score segments.
const NPS_COLORS = { detractor: '#DC2626', passive: '#D97706', promoter: '#16A34A' } as const;
const BAR_COLOR = '#A8D62E';

function typeLabel(type: DetailQuestionType, isTr: boolean): string {
  switch (type) {
    case 'rating':
      return isTr ? 'Yıldız puanı' : 'Star rating';
    case 'nps':
      return isTr ? 'Tavsiye skoru (0–10)' : 'Recommend score (0–10)';
    case 'multiple_choice':
      return isTr ? 'Seçenekli' : 'Multiple choice';
    case 'short_text':
      return isTr ? 'Kısa yazı' : 'Short text';
    default:
      return isTr ? 'Uzun yazı' : 'Long text';
  }
}

export default function SurveyResultsTab({ locale, survey, publicUrl }: Props) {
  const isTr = locale === 'tr';
  const [range, setRange] = useState<Range>('30d');
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    (async () => {
      try {
        const res = await fetch(`/api/surveys/${survey.id}/analytics?range=${range}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('analytics_failed');
        const data = (await res.json()) as AnalyticsResp;
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    })();
    return () => controller.abort();
  }, [survey.id, range, tick]);

  const num = useCallback(
    (n: number, digits = 1) =>
      n.toLocaleString(isTr ? 'tr-TR' : 'en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
    [isTr],
  );

  async function copyLink() {
    if (await copyText(publicUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const rangeLabel = (r: Range) =>
    r === '7d' ? (isTr ? '7g' : '7d') : r === '30d' ? (isTr ? '30g' : '30d') : r === '90d' ? (isTr ? '90g' : '90d') : isTr ? 'Tümü' : 'All';

  const csvLabel = isTr ? "CSV indir (Excel'de açılır)" : 'Download CSV (opens in Excel)';
  const neverAnswered =
    survey._count.responses === 0 &&
    !(state.status === 'ready' && state.data.summary.responsesAllTime > 0);

  return (
    <div className="space-y-5">
      {!neverAnswered && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={isTr ? 'Zaman aralığı' : 'Time range'} className="flex gap-2 sm:gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={[
                  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 sm:min-h-8 sm:min-w-0',
                  range === r
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]',
                ].join(' ')}
              >
                {rangeLabel(r)}
              </button>
            ))}
          </div>
          <a
            href={`/api/surveys/${survey.id}/export`}
            aria-label={csvLabel}
            className="bz-btn-ghost ml-auto min-h-11 shrink-0 gap-2 sm:min-h-9"
          >
            <Download size={14} aria-hidden="true" />
            <span className="sm:hidden">CSV</span>
            <span className="hidden sm:inline">{csvLabel}</span>
          </a>
        </div>
      )}

      {state.status === 'loading' && <ResultsSkeleton />}

      {state.status === 'error' && (
        <ErrorState
          title={isTr ? 'Sonuçlar yüklenemedi' : "Couldn't load the results"}
          body={
            isTr
              ? 'Bağlantını kontrol edip tekrar dene.'
              : 'Check your connection and try again.'
          }
          retryLabel={isTr ? 'Tekrar dene' : 'Try again'}
          onRetry={() => setTick((n) => n + 1)}
        />
      )}

      {state.status === 'ready' && (() => {
        const { summary, perQuestion } = state.data;

        if (summary.responsesAllTime === 0) {
          return (
            <EmptyState
              icon={<ClipboardList size={20} />}
              title={isTr ? 'Henüz yanıt yok' : 'No responses yet'}
              body={
                isTr
                  ? 'Linki paylaşınca sonuçlar burada görünür.'
                  : 'Results appear here once you share the link.'
              }
              action={
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="bz-btn-primary min-h-11 sm:min-h-9"
                >
                  {copied ? (isTr ? 'Kopyalandı' : 'Copied') : isTr ? 'Linki kopyala' : 'Copy link'}
                </button>
              }
            />
          );
        }

        if (summary.responses === 0) {
          const last = summary.lastResponseAt
            ? formatStampInTimeZone(summary.lastResponseAt, locale)
            : '';
          return (
            <EmptyState
              icon={<ClipboardList size={20} />}
              title={isTr ? 'Bu aralıkta yanıt yok' : 'No responses in this range'}
              body={
                isTr
                  ? `Tüm zamanlarda ${summary.responsesAllTime} yanıt var${last ? `; son yanıt ${last}` : ''}.`
                  : `There ${summary.responsesAllTime === 1 ? 'is 1 response' : `are ${summary.responsesAllTime} responses`} overall${last ? `; the latest was ${last}` : ''}.`
              }
              action={
                <button
                  type="button"
                  onClick={() => setRange('all')}
                  className="bz-btn-primary min-h-11 sm:min-h-9"
                >
                  {isTr ? 'Tümünü göster' : 'Show all time'}
                </button>
              }
            />
          );
        }

        const cardCount =
          1 + (summary.rating ? 1 : 0) + (summary.nps ? 1 : 0) + (summary.withContact !== null ? 1 : 0);
        const gridCols =
          cardCount >= 4 ? 'lg:grid-cols-4' : cardCount === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';

        return (
          <>
            <div className={`grid grid-cols-2 gap-3.5 ${gridCols}`}>
              <StatCard
                label={isTr ? 'Yanıt' : 'Responses'}
                value={String(summary.responses)}
                icon={<MessageSquare size={14} />}
                delta={
                  summary.lastResponseAt
                    ? `${isTr ? 'Son yanıt' : 'Last response'}: ${formatStampInTimeZone(summary.lastResponseAt, locale)}`
                    : undefined
                }
                deltaKind="neutral"
              />
              {summary.rating && (
                <StatCard
                  label={isTr ? 'Ortalama puan' : 'Average rating'}
                  value={
                    <>
                      {num(summary.rating.avg)}{' '}
                      <span className="text-[13px] font-medium text-[#737373]">/ 5</span>
                    </>
                  }
                  icon={<Star size={14} />}
                  delta={
                    <StarRow
                      value={Math.round(summary.rating.avg)}
                      size={14}
                      ariaLabel={
                        isTr
                          ? `5 yıldız üzerinden ${num(summary.rating.avg)}`
                          : `${num(summary.rating.avg)} out of 5 stars`
                      }
                    />
                  }
                  deltaKind="neutral"
                  deltaSuffix={`${summary.rating.count} ${isTr ? 'yanıt' : summary.rating.count === 1 ? 'response' : 'responses'}`}
                />
              )}
              {summary.nps && (
                <StatCard
                  label={isTr ? 'Tavsiye skoru (NPS)' : 'Recommend score (NPS)'}
                  value={summary.nps.score > 0 ? `+${summary.nps.score}` : String(summary.nps.score)}
                  icon={<ThumbsUp size={14} />}
                  delta={
                    isTr
                      ? `%${summary.nps.promoterPct} destekçi · %${summary.nps.detractorPct} eleştirmen`
                      : `${summary.nps.promoterPct}% promoters · ${summary.nps.detractorPct}% detractors`
                  }
                  deltaKind="neutral"
                />
              )}
              {summary.withContact !== null && (
                <StatCard
                  label={isTr ? 'İletişim bırakan' : 'Left contact details'}
                  value={`${summary.withContact} / ${summary.responses}`}
                  icon={<UserRound size={14} />}
                  delta={
                    isTr
                      ? 'E-posta veya telefon · listesi CSV dosyasında'
                      : 'Email or phone · listed in the CSV file'
                  }
                  deltaKind="neutral"
                />
              )}
            </div>

            {summary.nps && (
              <p className="text-xs leading-relaxed text-[#737373]">
                {isTr
                  ? 'Tavsiye skoru: müşterilerin seni tavsiye etme isteği. Destekçi oranı eksi eleştirmen oranıdır; −100 ile +100 arasındadır.'
                  : 'Recommend score: how willing customers are to recommend you — promoter % minus detractor %. It ranges from −100 to +100.'}
              </p>
            )}

            <ul className="space-y-4">
              {perQuestion.map((pq) => {
                const type = (survey.questions.find((q) => q.id === pq.id)?.type ??
                  pq.type) as DetailQuestionType;
                return (
                  <li key={pq.id} className="bz-card p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                      <Badge kind="ghost" dot={false}>{typeLabel(type, isTr)}</Badge>
                      <span>
                        {pq.count} {isTr ? 'yanıt' : pq.count === 1 ? 'answer' : 'answers'}
                      </span>
                    </div>
                    <h3 className="bz-h-tight mt-2 text-[15px] leading-snug">{pq.text}</h3>
                    <div className="mt-4 max-w-[760px]">
                      {pq.count === 0 ? (
                        <p className="text-sm text-[#737373]">
                          {isTr ? 'Bu soruya henüz yanıt yok.' : 'No answers to this question yet.'}
                        </p>
                      ) : type === 'rating' ? (
                        <RatingBlock pq={pq} num={num} isTr={isTr} />
                      ) : type === 'nps' ? (
                        <NpsBlock pq={pq} isTr={isTr} />
                      ) : type === 'multiple_choice' ? (
                        <ChoiceBlock pq={pq} />
                      ) : (
                        <TextBlock
                          pq={pq}
                          locale={locale}
                          expanded={Boolean(expanded[pq.id])}
                          onToggle={() => setExpanded((prev) => ({ ...prev, [pq.id]: !prev[pq.id] }))}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {summary.truncated && (
              <p className="text-xs text-[#737373]">
                {isTr
                  ? 'Özet son 10.000 cevaba göre hesaplandı.'
                  : 'Summary is based on the latest 10,000 answers.'}
              </p>
            )}
          </>
        );
      })()}
    </div>
  );
}

/** Same footprint as the loaded tab: four stat cards and two question cards. */
function ResultsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
  color = BAR_COLOR,
  narrow = false,
}: {
  label: string;
  value: number;
  pct: number;
  color?: string;
  /** Short labels ("5★") get a narrow label column; option names a wide one. */
  narrow?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 text-[13px]">
      <span
        className={`shrink-0 text-[#525252] ${narrow ? 'w-8' : 'w-28 truncate sm:w-44'}`}
        title={label}
      >
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bz-mono w-20 shrink-0 text-right text-[#525252]">
        {value} ({pct}%)
      </span>
    </li>
  );
}

function RatingBlock({
  pq,
  num,
  isTr,
}: {
  pq: QuestionStats;
  num: (n: number, digits?: number) => string;
  isTr: boolean;
}) {
  const distribution = pq.distribution ?? {};
  const total = [1, 2, 3, 4, 5].reduce((sum, s) => sum + (distribution[String(s)] ?? 0), 0);
  const avg = pq.avg ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="bz-h-tight text-[30px] leading-none">{num(avg)}</span>
        <StarRow
          value={Math.round(avg)}
          size={18}
          ariaLabel={isTr ? `5 yıldız üzerinden ${num(avg)}` : `${num(avg)} out of 5 stars`}
        />
      </div>
      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((s) => {
          const count = distribution[String(s)] ?? 0;
          return (
            <BarRow
              key={s}
              label={`${s}★`}
              narrow
              value={count}
              pct={total === 0 ? 0 : Math.round((count * 100) / total)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function NpsBlock({ pq, isTr }: { pq: QuestionStats; isTr: boolean }) {
  const nps = pq.nps;
  if (!nps || nps.total === 0) {
    return (
      <p className="text-sm text-[#737373]">
        {isTr ? 'Bu soruya henüz yanıt yok.' : 'No answers to this question yet.'}
      </p>
    );
  }
  const segments = [
    {
      key: 'detractor',
      color: NPS_COLORS.detractor,
      label: isTr ? 'Eleştirmen (0–6)' : 'Detractors (0–6)',
      count: nps.detractors,
      pct: nps.detractorPct,
    },
    {
      key: 'passive',
      color: NPS_COLORS.passive,
      label: isTr ? 'Tarafsız (7–8)' : 'Passives (7–8)',
      count: nps.passives,
      pct: nps.passivePct,
    },
    {
      key: 'promoter',
      color: NPS_COLORS.promoter,
      label: isTr ? 'Destekçi (9–10)' : 'Promoters (9–10)',
      count: nps.promoters,
      pct: nps.promoterPct,
    },
  ];
  const score = nps.score > 0 ? `+${nps.score}` : String(nps.score);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="bz-h-tight text-[30px] leading-none">{score}</span>
        <span className="text-xs text-[#737373]">
          {isTr
            ? `%${nps.promoterPct} destekçi − %${nps.detractorPct} eleştirmen`
            : `${nps.promoterPct}% promoters − ${nps.detractorPct}% detractors`}
        </span>
      </div>
      <div
        role="img"
        aria-label={segments
          .map((s) => `${s.label}: ${s.count} (${s.pct}%)`)
          .join(', ')}
        className="flex h-3 w-full overflow-hidden rounded-full bg-[#F5F5F5]"
      >
        {segments
          .filter((s) => s.pct > 0)
          .map((s) => (
            <div key={s.key} style={{ flex: `${s.pct} 1 0`, background: s.color }} />
          ))}
      </div>
      <ul className="grid gap-2 text-[13px] sm:grid-cols-3">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[#525252]">{s.label}</span>
            <span className="bz-mono ml-auto text-[#0A0A0A] sm:ml-1">
              {s.count} ({s.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChoiceBlock({ pq }: { pq: QuestionStats }) {
  const ranked = pq.ranked ?? [];
  return (
    <ul className="space-y-2">
      {ranked.map((r) => (
        <BarRow key={r.option} label={r.option} value={r.count} pct={r.pct} />
      ))}
    </ul>
  );
}

function TextBlock({
  pq,
  locale,
  expanded,
  onToggle,
}: {
  pq: QuestionStats;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isTr = locale === 'tr';
  const items = pq.sampleItems ?? [];
  if (items.length === 0) {
    return (
      <p className="text-sm text-[#737373]">
        {isTr ? 'Bu soruya henüz yanıt yok.' : 'No answers to this question yet.'}
      </p>
    );
  }
  const visible = expanded ? items : items.slice(0, TEXT_PREVIEW);
  return (
    <div>
      <Eyebrow className="mb-2 block">{isTr ? 'Son yanıtlar' : 'Latest answers'}</Eyebrow>
      <ul className="space-y-2">
        {visible.map((item, i) => (
          <li
            key={`${item.at}-${i}`}
            className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] px-3.5 py-2.5"
          >
            <p className="text-[13px] leading-relaxed text-[#0A0A0A]">&ldquo;{item.text}&rdquo;</p>
            <p className="mt-1 text-[11px] text-[#737373]">
              {formatStampInTimeZone(item.at, locale)}
            </p>
          </li>
        ))}
      </ul>
      {items.length > TEXT_PREVIEW && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-2 inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#525252] underline underline-offset-4 hover:text-[#0A0A0A]"
        >
          {expanded
            ? isTr
              ? 'Daha az göster'
              : 'Show fewer'
            : isTr
              ? `Tümünü göster (${items.length})`
              : `Show all (${items.length})`}
        </button>
      )}
    </div>
  );
}
