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
      className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3"
      role="status"
      aria-live="polite"
      aria-label={
        isTr ? 'Analitik verileri bu sayfada güncel' : 'Analytics data live on this page'
      }
    >
      <span aria-hidden="true" className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-[#23863A] shadow-[0_0_0_3px_rgba(35,134,58,0.16)]" />
      </span>
      <span className="text-[13px] font-medium text-[#23863A]">
        {isTr ? 'Güncel · bu sayfa' : 'Live · this page'}
      </span>
    </div>
  );
}

export default AnalyticsLiveIndicator;
