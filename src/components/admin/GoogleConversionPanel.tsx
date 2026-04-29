'use client';

import { Star, ArrowDownRight, AlertTriangle, Trophy, Link2Off, ExternalLink } from 'lucide-react';

interface RestaurantConversion {
  id: string;
  name: string;
  hasGoogleLink: boolean;
  highRatings: number;
  sentToGoogle: number;
  conversionRate: number | null;
}

interface GoogleConversionData {
  totalResponses: number;
  highRatings: number;
  sentToGoogle: number;
  missedOpportunities: number;
  conversionRate: number | null;
  byRestaurant: RestaurantConversion[];
}

interface GoogleConversionPanelProps {
  data: GoogleConversionData;
  locale?: 'tr' | 'en';
  /** If true, leaderboard is hidden (e.g. when viewing a single restaurant). */
  hideLeaderboard?: boolean;
  /** Click handler to deep-link into a specific restaurant's analytics. */
  onRestaurantClick?: (restaurantId: string) => void;
}

/**
 * Google Review conversion funnel.
 *
 * Shows the journey from "total responses" → "high rating (4-5★)" →
 * "sent to Google". The conversion rate is the % of high-rating feedbacks
 * whose restaurant has a configured Google Place ID (i.e. the customer
 * was actually redirected to write a review). Restaurants without a
 * Google Place ID surface as "missed opportunities" with a CTA.
 */
export default function GoogleConversionPanel({
  data,
  locale = 'tr',
  hideLeaderboard = false,
  onRestaurantClick,
}: GoogleConversionPanelProps) {
  const copy = locale === 'en'
    ? {
        title: 'Google Review Conversion',
        subtitle: 'How many happy customers actually reach Google to leave a review.',
        total: 'Total Responses',
        highRating: 'High Rating (4-5★)',
        sent: 'Sent to Google',
        rate: 'Conversion Rate',
        missed: 'Missed Opportunities',
        missedSub: 'High-rating feedback at restaurants without a Google link.',
        leaderboardTitle: 'By Restaurant',
        leaderboardSub: 'Highest-volume restaurants first. Set up a Google link to capture lost reviews.',
        noData: 'No feedback yet for this period.',
        noGoogleLink: 'No Google link',
        setLink: 'Set Google link',
        highRatingsLabel: 'high',
        sentLabel: 'sent',
      }
    : {
        title: 'Google Yorum Dönüşümü',
        subtitle: 'Memnun müşterilerin kaçı gerçekten Google\'a yorum bırakmaya yönlendiriliyor.',
        total: 'Toplam Yanıt',
        highRating: 'Yüksek Puan (4-5★)',
        sent: 'Google\'a Gönderildi',
        rate: 'Dönüşüm Oranı',
        missed: 'Kaçırılan Fırsatlar',
        missedSub: 'Google bağlantısı olmayan restoranlardaki yüksek puanlı geri bildirimler.',
        leaderboardTitle: 'İşletmelere Göre',
        leaderboardSub: 'En yüksek hacim önde. Kaybolan yorumları kazanmak için Google bağlantısı ekleyin.',
        noData: 'Bu dönemde henüz geri bildirim yok.',
        noGoogleLink: 'Google bağlantısı yok',
        setLink: 'Google bağlantısı ekle',
        highRatingsLabel: 'yüksek',
        sentLabel: 'gönderildi',
      };

  const { totalResponses, highRatings, sentToGoogle, missedOpportunities, conversionRate, byRestaurant } = data;

  if (totalResponses === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-white/60 p-6 text-center text-sm font-bold text-[#1A1A1A]">
        {copy.noData}
      </div>
    );
  }

  // Percentages for funnel bar widths (relative to totalResponses)
  const highPct = totalResponses > 0 ? (highRatings / totalResponses) * 100 : 0;
  const sentPct = totalResponses > 0 ? (sentToGoogle / totalResponses) * 100 : 0;

  const hasMissed = missedOpportunities > 0;
  const showLeaderboard = !hideLeaderboard && byRestaurant.length > 1;

  return (
    <div className="space-y-5">
      {/* ─── Funnel ─── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr]">
        {/* Left: 3-step visual funnel */}
        <div className="space-y-3">
          <FunnelRow
            label={copy.total}
            value={totalResponses}
            pct={100}
            color="#3b82f6"
            bg="bg-blue-50"
            text="text-blue-600"
          />
          <FunnelRow
            label={copy.highRating}
            value={highRatings}
            pct={highPct}
            color="#C6F24E"
            bg="bg-amber-50"
            text="text-amber-600"
            icon={<Star size={16} strokeWidth={2} fill="currentColor" />}
          />
          <FunnelRow
            label={copy.sent}
            value={sentToGoogle}
            pct={sentPct}
            color="#10b981"
            bg="bg-emerald-50"
            text="text-emerald-600"
            icon={<ExternalLink size={14} strokeWidth={2} />}
          />
        </div>

        {/* Right: Big conversion rate + missed opps callout */}
        <div className="flex flex-col gap-3">
          <div className="flex-1 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
            <p className="pulse-eyebrow text-emerald-700">{copy.rate}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                className="text-[38px] sm:text-[44px] font-medium tabular-nums tracking-[-0.025em] text-[#0A0A0A] leading-none"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {conversionRate === null ? '—' : conversionRate.toFixed(1)}
              </span>
              {conversionRate !== null && (
                <span
                  className="text-[22px] font-medium text-[#525252]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  %
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] text-[#525252]">
              {sentToGoogle} / {highRatings} {copy.highRatingsLabel} → {copy.sentLabel}
            </p>
          </div>

          {hasMissed && (
            <div className="flex-1 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white">
                  <AlertTriangle size={14} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 text-[13px] font-medium text-red-700">
                    <span
                      className="text-[22px] tabular-nums font-semibold"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {missedOpportunities}
                    </span>
                    {copy.missed}
                  </p>
                  <p className="mt-1 text-[12px] text-red-600/80 leading-snug">{copy.missedSub}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Leaderboard ─── */}
      {showLeaderboard && (
        <div className="rounded-2xl border border-[#EDEDED] bg-white">
          <div className="flex items-start gap-3 border-b border-[#EDEDED] px-4 py-4 sm:px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#A8D62E]">
              <Trophy size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h4
                className="text-[14px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {copy.leaderboardTitle}
              </h4>
              <p className="mt-0.5 text-[12px] text-[#525252]">{copy.leaderboardSub}</p>
            </div>
          </div>

          <div className="divide-y divide-[#EDEDED]">
            {byRestaurant.map((rest) => (
              <RestaurantRow
                key={rest.id}
                rest={rest}
                copy={copy}
                onClick={onRestaurantClick ? () => onRestaurantClick(rest.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelRow({
  label,
  value,
  pct,
  color,
  bg,
  text,
  icon,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  bg: string;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-white p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg} ${text}`}>
            {icon ?? <ArrowDownRight size={14} strokeWidth={2} />}
          </div>
          <span className="truncate pulse-eyebrow text-[#525252]">{label}</span>
        </div>
        <span
          className="shrink-0 text-[18px] font-medium tabular-nums text-[#0A0A0A] tracking-[-0.02em] sm:text-[20px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDEDED]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(pct, value > 0 ? 2 : 0)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function RestaurantRow({
  rest,
  copy,
  onClick,
}: {
  rest: RestaurantConversion;
  copy: {
    noGoogleLink: string;
    setLink: string;
    highRatingsLabel: string;
    sentLabel: string;
  };
  onClick?: () => void;
}) {
  const rateColor = rest.conversionRate === null
    ? 'text-[#6B7280]'
    : rest.conversionRate >= 80
      ? 'text-emerald-600'
      : rest.conversionRate >= 40
        ? 'text-amber-600'
        : 'text-red-600';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full px-4 py-3.5 text-left transition-colors sm:px-5 ${
        onClick ? 'hover:bg-[#FFFFFF] cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-semibold text-[#0A0A0A] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {rest.name}
          </p>
          {!rest.hasGoogleLink ? (
            <p className="mt-1 flex items-center gap-1.5 pulse-eyebrow text-red-600">
              <Link2Off size={10} strokeWidth={2} />
              {copy.noGoogleLink} · {copy.setLink} →
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[#525252]">
              {rest.sentToGoogle} / {rest.highRatings} {copy.highRatingsLabel} → {copy.sentLabel}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`text-[18px] font-medium tabular-nums tracking-[-0.02em] sm:text-[20px] ${rateColor}`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {rest.conversionRate === null ? '—' : `${rest.conversionRate.toFixed(0)}%`}
          </div>
          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#EDEDED]">
            <div
              className={`h-full rounded-full ${
                rest.conversionRate === null || rest.conversionRate === 0
                  ? 'bg-red-400'
                  : rest.conversionRate >= 80
                    ? 'bg-emerald-500'
                    : rest.conversionRate >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${rest.conversionRate ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
