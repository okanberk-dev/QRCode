// Stage 66 §38.147 — HANDOFF AnalyticsDesktop header live indicator
// (.design-owner-2026 prototip line 233-241). Visual: yeşil pulse-dot
// halo + JetBrains Mono uppercase tracked label.
//
// **Compliance variation** (CLAUDE.md §35.8 + §19.1.1):
// HANDOFF "CANLI · 8 sn ÖNCE GÜNCELLENDİ" / "LIVE · UPDATED 8s AGO" fake
// real-time timer iddiasıdır — Buaze altyapısı server-render snapshot
// (CLAUDE.md §38.34 force-dynamic), her sayfa yenilemesi fresh fetch.
// "8 sn önce" verifiable değil, ETK reklam standartları + Google
// "misleading business claims" risk taşır.
//
// **Yeni metin** (compliance-safe + verifiable): "GÜNCEL · BU SAYFA" /
// "LIVE · THIS PAGE" — kullanıcı bu sayfayı yenilediğinde gerçekten
// güncel veri görür (verifiable claim). "8 sn önce" gibi ölçülemez
// metric yok.
//
// Pure presentational. Reduced-motion: pulse-dot animation Pulse
// `bz-pulse-dot` utility'si zaten globals.css universal `*` reset
// blanket'i (CLAUDE.md §38.61) altında static'e iner.

export interface AnalyticsLiveIndicatorProps {
  isTr?: boolean;
}

export function AnalyticsLiveIndicator({ isTr = true }: AnalyticsLiveIndicatorProps) {
  return (
    <div
      className="inline-flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={
        isTr ? 'Analitik verileri bu sayfada güncel' : 'Analytics data live on this page'
      }
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-1.5 w-1.5"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: '#22C55E',
            boxShadow: '0 0 0 3px rgba(34,197,94,0.18)',
          }}
        />
      </span>
      <span
        className="pulse-eyebrow text-[10px]"
        style={{ color: '#22C55E', letterSpacing: '0.18em' }}
      >
        {isTr ? 'GÜNCEL · BU SAYFA' : 'LIVE · THIS PAGE'}
      </span>
    </div>
  );
}

export default AnalyticsLiveIndicator;
