'use client';

import { UtensilsCrossed, Users, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface AspectStat {
  avg: number | null;
  count: number;
}

interface AspectBreakdownProps {
  aspects: {
    food: AspectStat;
    service: AspectStat;
    atmosphere: AspectStat;
  };
  locale?: 'tr' | 'en';
}

/**
 * Surfaces the Food / Service / Atmosphere averages that come out of
 * /api/feedback/stats so owners and admins can see which specific aspect
 * is pulling ratings down. The three values come from customer feedback
 * `foodRating` / `serviceRating` / `atmosphereRating` columns.
 */
export default function AspectBreakdown({ aspects, locale = 'tr' }: AspectBreakdownProps) {
  const copy = locale === 'en'
    ? {
        food: 'Food',
        service: 'Service',
        atmosphere: 'Atmosphere',
        noData: 'No ratings yet.',
        respondents: 'respondents',
        worst: 'LOWEST',
        best: 'HIGHEST',
      }
    : {
        food: 'Yemek',
        service: 'Servis',
        atmosphere: 'Atmosfer',
        noData: 'Henüz puanlama yok.',
        respondents: 'yanıt',
        worst: 'EN DÜŞÜK',
        best: 'EN YÜKSEK',
      };

  const items = [
    {
      key: 'food' as const,
      label: copy.food,
      icon: UtensilsCrossed,
      color: '#C6F24E',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      ...aspects.food,
    },
    {
      key: 'service' as const,
      label: copy.service,
      icon: Users,
      color: '#3b82f6',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      ...aspects.service,
    },
    {
      key: 'atmosphere' as const,
      label: copy.atmosphere,
      icon: Sparkles,
      color: '#a855f7',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      ...aspects.atmosphere,
    },
  ];

  // Find highest & lowest (only among those that have at least 1 response)
  const scored = items.filter((i) => i.avg !== null && i.count > 0);
  let worstKey: string | null = null;
  let bestKey: string | null = null;
  if (scored.length >= 2) {
    const sorted = [...scored].sort((a, b) => (a.avg! - b.avg!));
    if (sorted[0].avg !== sorted[sorted.length - 1].avg) {
      worstKey = sorted[0].key;
      bestKey = sorted[sorted.length - 1].key;
    }
  }

  const anyData = items.some((i) => i.avg !== null && i.count > 0);

  if (!anyData) {
    return (
      <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-white/60 p-6 text-center text-sm font-bold text-[#1A1A1A]">
        {copy.noData}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {items.map((item) => {
        const hasData = item.avg !== null && item.count > 0;
        const pct = hasData ? Math.max(0, Math.min(100, (item.avg! / 5) * 100)) : 0;
        const isWorst = item.key === worstKey;
        const isBest = item.key === bestKey;
        const Icon = item.icon;

        return (
          <div
            key={item.key}
            className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all sm:p-5 ${
              isWorst ? 'border-red-300 ring-2 ring-red-100' : 'border-[#EDEDED]'
            }`}
          >
            {isWorst && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 pulse-eyebrow text-red-600 ring-1 ring-red-200">
                <TrendingDown size={10} strokeWidth={2} />
                {copy.worst}
              </span>
            )}
            {isBest && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 pulse-eyebrow text-emerald-600 ring-1 ring-emerald-200">
                <TrendingUp size={10} strokeWidth={2} />
                {copy.best}
              </span>
            )}

            <div className="mb-3 flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} ${item.text}`}>
                <Icon size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="truncate pulse-eyebrow text-[#737373]">
                  {item.label}
                </p>
              </div>
            </div>

            {hasData ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[28px] sm:text-[32px] font-medium tabular-nums tracking-[-0.025em] text-[#0A0A0A] leading-none"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.avg!.toFixed(1)}
                  </span>
                  <span className="text-[13px] text-[#525252]">/ 5</span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: item.color,
                    }}
                  />
                </div>

                <p className="mt-3 pulse-eyebrow text-[#737373]">
                  {item.count} {copy.respondents}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 py-4 text-[#6B7280]">
                <Minus size={18} strokeWidth={2} />
                <span className="text-xs font-bold">—</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
