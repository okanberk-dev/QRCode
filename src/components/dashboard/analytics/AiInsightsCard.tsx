import { AlertTriangle, Award, Sparkles, TrendingUp } from 'lucide-react';
import { toSentenceCase } from '@/components/panel/pano/sentence-case';

// AI insights card (owner + admin analytics). Fintora list card: white card,
// a 40px black sparkle circle in the header, one grey row per insight (icon
// circle + short title + explanation) and an optional quiet source footer.
// No dark fill, gradient or glow.
//
// Server-friendly (data prop). When all three fields are empty the card is
// hidden (extractStructuredInsight fail → fallback empty → nothing renders).

export interface AiInsightsCardProps {
  trend: string;
  win: string;
  risk: string;
  isTr?: boolean;
  /** Header title override; default "AI içgörüleri" + "Bu hafta" subtitle. */
  eyebrowLabel?: string;
  /** Number of reviews the insight was built from — shown as a grey footer. */
  sourceCount?: number;
}

export function AiInsightsCard({
  trend,
  win,
  risk,
  isTr = true,
  eyebrowLabel,
  sourceCount,
}: AiInsightsCardProps) {
  const rows = [
    {
      key: 'trend',
      label: isTr ? 'Eğilim' : 'Trend',
      icon: TrendingUp,
      circle: 'bg-pn-ink text-white',
      body: trend,
    },
    {
      key: 'win',
      label: isTr ? 'Güçlü yön' : 'Strength',
      icon: Award,
      circle: 'bg-pn-accent text-white',
      body: win,
    },
    {
      key: 'risk',
      label: isTr ? 'Dikkat' : 'Watch',
      icon: AlertTriangle,
      circle: 'bg-[#FDECEC] text-[#D92D20]',
      body: risk,
    },
  ].filter((r) => r.body.trim().length > 0);
  if (rows.length === 0) return null;

  const title = eyebrowLabel
    ? toSentenceCase(eyebrowLabel, isTr ? 'tr' : 'en')
    : isTr
      ? 'AI içgörüleri'
      : 'AI insights';
  const subtitle = eyebrowLabel ? null : isTr ? 'Bu hafta' : 'This week';

  return (
    <section className="bz-card p-5 sm:p-6" aria-label={eyebrowLabel ? title : `${title} · ${subtitle}`}>
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white"
        >
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="pn-card-title text-pn-ink">{title}</h2>
          {subtitle && <p className="text-[13px] text-[#9A9A9A]">{subtitle}</p>}
        </div>
      </header>

      <ul className="mt-4 space-y-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.key} className="flex items-start gap-3 rounded-[16px] bg-pn-canvas p-3">
              <span
                aria-hidden="true"
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${r.circle}`}
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-medium text-pn-ink">{r.label}</p>
                <p className="mt-0.5 text-[13px] leading-[1.55] text-[#737373]">{r.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {typeof sourceCount === 'number' && sourceCount > 0 && (
        <p className="mt-4 text-[12px] text-[#9A9A9A]">
          {isTr ? `Kaynak: son ${sourceCount} yorum` : `Source: last ${sourceCount} reviews`}
        </p>
      )}
    </section>
  );
}

export default AiInsightsCard;
