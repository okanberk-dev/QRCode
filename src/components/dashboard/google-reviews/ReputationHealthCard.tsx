'use client';

// CLAUDE.md §X — Reputation OS Suite (health + recommendations UI card).
//
// Google Yorumları sayfasının üst kısmına yerleşir. Pulse §11 token'ları
// (graphite/lime/pure white) + bz-card primitive'i. Owner tek bakışta:
//   - Bugünkü health score + label
//   - ilk ölçüm (baseline) → bugün delta (en az 14 gün sonra ve sıfır değilse)
//   - Önerilen aksiyonlar (top 5)

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
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

const SEVERITY_STYLES: Record<RecommendationSeverity, { bg: string; fg: string; label: { tr: string; en: string } }> = {
  critical: {
    bg: '#FEE2E2',
    fg: '#991B1B',
    label: { tr: 'KRİTİK', en: 'CRITICAL' },
  },
  warn: {
    bg: '#FEF3C7',
    fg: '#92400E',
    label: { tr: 'UYARI', en: 'WARNING' },
  },
  tip: {
    bg: '#EAF9B8',
    fg: '#0A0A0A',
    label: { tr: 'ÖNERİ', en: 'TIP' },
  },
};

function scoreColor(score: number | null): string {
  if (score == null) return '#A3A3A3';
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#C6F24E';
  if (score >= 50) return '#F59E0B';
  return '#DC2626';
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
        <div className="flex items-center gap-2 text-[12px] text-[#737373]">
          <Loader2 size={14} className="animate-spin" />
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
        <p className="pulse-eyebrow text-[#737373]">
          {isTr ? 'SAĞLIK SKORU' : 'HEALTH SCORE'}
        </p>
        <p className="bz-h-tight text-[16px] mt-1">
          {isTr ? 'Veri toplanıyor' : 'Collecting data'}
        </p>
        <p className="text-[13px] text-[#525252] mt-2 leading-relaxed max-w-md">
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
    <div className="bz-card p-5 sm:p-6 space-y-5">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="pulse-eyebrow text-[#737373]">
            {isTr ? 'BUAZE SAĞLIK SKORU' : 'BUAZE HEALTH SCORE'}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="bz-h-tight-2 text-[40px] sm:text-[48px] leading-none"
              style={{ color: scoreColor(data.score) }}
            >
              {data.score}
            </span>
            <span className="text-[#A3A3A3] text-[16px] bz-mono">/100</span>
            {data.scoreLabel && (
              <span className="ml-1 text-[12px] text-[#525252] pulse-eyebrow">{data.scoreLabel}</span>
            )}
          </div>
        </div>

        {/* Delta badges */}
        <div className="flex flex-col gap-1.5 items-end">
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
        <div className="grid sm:grid-cols-3 gap-3">
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
        <div className="border-t border-[#EDEDED] pt-4">
          <p className="pulse-eyebrow text-[#737373] mb-2">
            <Sparkles size={11} className="inline -mt-0.5 mr-1" />
            {isTr ? 'BU AY ÖNERİLEN AKSİYONLAR' : 'RECOMMENDED ACTIONS THIS MONTH'}
          </p>
          <ul className="space-y-2">
            {data.recommendations.slice(0, 4).map((r) => {
              const sev = SEVERITY_STYLES[r.severity];
              return (
                <li key={r.id} className="rounded-xl bg-[#FAFAFA] border border-[#EDEDED] p-3 sm:p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="bz-mono text-[9px] tracking-[0.16em] px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      style={{ background: sev.bg, color: sev.fg }}
                    >
                      {sev.label[isTr ? 'tr' : 'en']}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="bz-h-tight text-[13.5px] text-[#0A0A0A]">{r.title}</p>
                      <p className="text-[12.5px] text-[#525252] mt-1 leading-relaxed">{r.body}</p>
                      {r.ctaHref && r.ctaLabel && (
                        <a
                          href={r.ctaHref}
                          target={r.ctaHref.startsWith('http') ? '_blank' : undefined}
                          rel={r.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="inline-flex items-center gap-1 mt-2 text-[12px] text-[#0A0A0A] font-medium hover:underline"
                        >
                          {r.ctaLabel}
                          {r.ctaHref.startsWith('http') && <ExternalLink size={10} />}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.baseline?.score != null && (
        <p className="text-[11px] text-[#A3A3A3] bz-mono">
          {isTr ? 'BAŞLANGIÇ' : 'BASELINE'}: {data.baseline.score}/100 (
          {new Date(data.baseline.capturedAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
            month: 'short',
            year: 'numeric',
          })}
          ){' · '}
          {isTr ? 'HER AY OTOMATİK RAPOR' : 'AUTOMATED MONTHLY REPORT'}
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ label, value }: { label: string; value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp ? '#16A34A' : isDown ? '#DC2626' : '#737373';
  const bg = isUp ? '#DCFCE7' : isDown ? '#FEE2E2' : '#F2F2F2';
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: bg, color }}
    >
      {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : null}
      <span className="text-[10px] text-[#737373] pulse-eyebrow mr-0.5">{label}</span>
      <span>
        {value > 0 ? '+' : ''}
        {value}
      </span>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#FAFAFA] border border-[#EDEDED] rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#737373] pulse-eyebrow">{label}</span>
        <span className="bz-mono text-[12px] text-[#0A0A0A]">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#EDEDED] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(2, value)}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}
