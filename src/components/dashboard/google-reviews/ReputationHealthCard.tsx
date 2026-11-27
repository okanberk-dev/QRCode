'use client';

// CLAUDE.md §X — Reputation OS Suite (health + recommendations UI card).
//
// Google Yorumları sayfasının üst kısmına yerleşir. Pulse §11 token'ları
// (graphite/lime/pure white) + bz-card primitive'i. Owner tek bakışta:
//   - Bugünkü health score + label
//   - ilk ölçüm (baseline) → bugün delta (en az 14 gün sonra ve sıfır değilse)
//   - Önerilen aksiyonlar (top 5)

import { useEffect, useState } from 'react';
import { ArrowUpRight, ExternalLink, HeartPulse, Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import type { RecommendationSeverity } from '@/lib/reputation/health-score';

interface HealthPayload {
  latestCapturedAt: string | null;
  score: number | null;
  scoreLabel: string | null;
  breakdown: { profile: number; responsiveness: number; reputation: number; overall: number } | null;
  baseline: { score: number; capturedAt: string } | null;
  previousMonthly: { score: number; capturedAt: string } | null;
  recommendations: Array<{
    id: string;
    severity: RecommendationSeverity;
    title: string;
    body: string;
    ctaLabel?: string;
    ctaHref?: string;
  }>;
  degraded?: boolean;
}

// Soft Fintora pills, sentence case (no ALL CAPS in Pano).
const SEVERITY_STYLES: Record<RecommendationSeverity, { className: string; label: { tr: string; en: string } }> = {
  critical: {
    className: 'bg-[#FDECEC] text-[#C4271B]',
    label: { tr: 'Kritik', en: 'Critical' },
  },
  warn: {
    className: 'bg-[#FFF6DB] text-[#7A4F00]',
    label: { tr: 'Uyarı', en: 'Warning' },
  },
  tip: {
    className: 'bg-pn-accent-soft text-pn-accent',
    label: { tr: 'Öneri', en: 'Tip' },
  },
};

/** Soft band pill for the score label (the number itself stays ink). */
function scoreBandClass(score: number | null): string {
  if (score == null) return 'bg-pn-canvas text-[#666666]';
  if (score >= 85) return 'bg-[#E6F7EA] text-[#1F7A35]';
  if (score >= 70) return 'bg-pn-accent-soft text-pn-accent';
  if (score >= 50) return 'bg-[#FFF6DB] text-[#7A4F00]';
  return 'bg-[#FDECEC] text-[#C4271B]';
}

const CARD_TITLE = 'text-[18px] font-medium leading-6 tracking-[-0.01em] text-pn-ink sm:text-[20px] sm:leading-[26px]';

/** Fintora card header: round icon + title + grey sub line. */
function HealthHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pn-canvas text-pn-ink"
      >
        <HeartPulse size={18} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={CARD_TITLE}>{title}</p>
        {sub && <p className="mt-1 text-[13px] leading-[1.5] text-[#737373]">{sub}</p>}
      </div>
    </div>
  );
}

interface Props {
  restaurantId: string;
  locale: Locale;
}

export function ReputationHealthCard({ restaurantId, locale }: Props) {
  const isTr = locale !== 'en';
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/restaurants/${restaurantId}/reputation/health`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(isTr ? 'Sağlık skoru alınamadı.' : 'Health score unavailable.');
          return;
        }
        const json = (await res.json()) as HealthPayload;
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(isTr ? 'Bağlantı hatası.' : 'Network error.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, isTr]);

  if (loading) {
    return (
      <div className="bz-card p-5 sm:p-6">
        <div className="flex items-center gap-2.5 text-[14px] text-[#737373]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pn-canvas text-pn-ink">
            <Loader2 size={17} className="animate-spin" />
          </span>
          {isTr ? 'Sağlık skoru hesaplanıyor…' : 'Calculating health score…'}
        </div>
      </div>
    );
  }

  if (error || !data || data.score == null) {
    // Sessiz değil — ama agresif değil. İlk kez Google bağlanmış kullanıcı
    // henüz snapshot almadıysa "ilk rapor 1 ay sonra" mesajı uygun.
    return (
      <div className="bz-card p-5 sm:p-6">
        <HealthHeader
          title={isTr ? 'Sağlık skoru' : 'Health score'}
          sub={isTr ? 'Veri toplanıyor' : 'Collecting data'}
        />
        <p className="mt-4 max-w-md rounded-[18px] bg-pn-canvas px-4 py-3 text-[14px] leading-relaxed text-[#525252]">
          {isTr
            ? 'Google bağlantın ve geri bildirimler birikmeye başladıkça sağlık skorun burada görünür. İlk kapsamlı aylık raporun ayın başında e-postanıza gelecek.'
            : 'Once your Google connection and feedback start accumulating, your health score will appear here. Your first monthly report arrives via email at the start of the month.'}
        </p>
      </div>
    );
  }

  // §57 — a change is shown only when it means something: the first
  // measurement is at least 14 days old and the score actually moved
  // (a "0" right after connecting read as "Buaze did nothing").
  const baselineAgeDays = data.baseline?.capturedAt
    ? (Date.now() - Date.parse(data.baseline.capturedAt)) / 86_400_000
    : 0;
  const baselineDelta =
    data.baseline?.score != null && data.score != null && baselineAgeDays >= 14
      ? data.score - data.baseline.score
      : null;
  const previousDelta =
    data.previousMonthly?.score != null && data.score != null
      ? data.score - data.previousMonthly.score
      : null;
  const baselineDate = data.baseline?.capturedAt
    ? new Date(data.baseline.capturedAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="bz-card space-y-5 p-5 sm:p-6">
      {/* Hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <HealthHeader title={isTr ? 'Sağlık skoru' : 'Health score'} />
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-2">
            <span className="text-[44px] font-medium leading-none tracking-[-0.025em] text-pn-ink tabular-nums sm:text-[48px]">
              {data.score}
            </span>
            <span className="text-[18px] text-[#9A9A9A] tabular-nums">/100</span>
            {data.scoreLabel && (
              <span
                className={`ml-1 inline-flex h-7 items-center self-center rounded-full px-3 text-[12px] font-medium ${scoreBandClass(data.score)}`}
              >
                {data.scoreLabel}
              </span>
            )}
          </div>
        </div>

        {/* Delta badges */}
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          {baselineDelta != null && baselineDelta !== 0 && (
            <DeltaBadge
              label={isTr ? `İlk ölçümden (${baselineDate}) bu yana` : `Since first check (${baselineDate})`}
              value={baselineDelta}
            />
          )}
          {previousDelta != null && previousDelta !== 0 && (
            <DeltaBadge
              label={isTr ? 'Geçen aydan' : 'Vs last month'}
              value={previousDelta}
            />
          )}
        </div>
      </div>

      {/* Breakdown bars */}
      {data.breakdown && (
        <div className="grid gap-2.5 sm:grid-cols-3">
          <BreakdownBar
            label={isTr ? 'Profil kalitesi' : 'Profile quality'}
            value={data.breakdown.profile}
          />
          <BreakdownBar
            label={isTr ? 'Yanıt verme' : 'Responsiveness'}
            value={data.breakdown.responsiveness}
          />
          <BreakdownBar
            label={isTr ? 'İtibar' : 'Reputation'}
            value={data.breakdown.reputation}
          />
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="border-t border-pn-line pt-5">
          <p className="mb-3 flex items-center gap-2 text-[15px] font-medium text-pn-ink">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-pn-accent text-white"
            >
              <Sparkles size={13} />
            </span>
            {isTr ? 'Bu ay önerilenler' : 'Suggested this month'}
          </p>
          <ul className="space-y-2">
            {data.recommendations.slice(0, 4).map((r) => {
              const sev = SEVERITY_STYLES[r.severity];
              const external = Boolean(r.ctaHref?.startsWith('http'));
              return (
                <li key={r.id} className="rounded-[16px] bg-pn-canvas p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span
                      className={`inline-flex h-7 shrink-0 items-center self-start rounded-full px-3 text-[12px] font-medium ${sev.className}`}
                    >
                      {sev.label[isTr ? 'tr' : 'en']}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-5 text-pn-ink">{r.title}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#666666]">{r.body}</p>
                    </div>
                    {r.ctaHref && r.ctaLabel && (
                      <a
                        href={r.ctaHref}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-white px-4 text-[13px] font-medium text-pn-ink transition-colors duration-200 hover:bg-pn-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 max-sm:bg-[#F6F6F6]"
                      >
                        {r.ctaLabel}
                        {external ? <ExternalLink size={13} /> : <ArrowUpRight size={14} />}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.baseline?.score != null && (
        <p className="text-[13px] text-[#737373] tabular-nums">
          {isTr ? 'Başlangıç' : 'Baseline'}: {data.baseline.score}/100 (
          {new Date(data.baseline.capturedAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
            month: 'short',
            year: 'numeric',
          })}
          ){' · '}
          {isTr ? 'her ay otomatik rapor' : 'automated monthly report'}
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ label, value }: { label: string; value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const tone = isUp
    ? 'bg-[#E6F7EA] text-[#1F7A35]'
    : isDown
      ? 'bg-[#FDECEC] text-[#C4271B]'
      : 'bg-pn-canvas text-[#666666]';
  return (
    <div className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${tone}`}>
      {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : null}
      <span className="mr-0.5 text-[12px] font-normal opacity-80">{label}</span>
      <span>
        {value > 0 ? '+' : ''}
        {value}
      </span>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-pn-canvas p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] text-[#666666]">{label}</span>
        <span className="tabular-nums text-[20px] font-medium leading-none tracking-[-0.02em] text-pn-ink">{value}</span>
      </div>
      {/* Pano progress: purple fill, hatched grey remainder. */}
      <div className="pn-hatch h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-pn-accent transition-[width] duration-500"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
