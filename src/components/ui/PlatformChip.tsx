export type PlatformId =
  | "google"
  | "tripadvisor"
  | "airbnb"
  | "yemeksepeti"
  | "trendyol"
  | "trendyol_go"
  | "getir"
  | "foursquare"
  | "custom";

export interface PlatformConfig {
  label: string;
  short: string;
  color: string;
  urlHost?: string;
}

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  google: { label: "Google", short: "G", color: "#4285F4", urlHost: "g.page/r/..." },
  tripadvisor: { label: "Tripadvisor", short: "TA", color: "#34E0A1", urlHost: "tripadvisor.com/..." },
  // Airbnb resmi marka rengi (Rausch). Konaklama segmenti için.
  airbnb: { label: "Airbnb", short: "AB", color: "#FF5A5F", urlHost: "airbnb.com/rooms/..." },
  yemeksepeti: { label: "Yemeksepeti", short: "YS", color: "#FA0050", urlHost: "yemeksepeti.com/..." },
  trendyol: { label: "Trendyol GO", short: "TY", color: "#F27A1A", urlHost: "tgoapp.com/..." },
  trendyol_go: { label: "Trendyol GO", short: "TY", color: "#F27A1A", urlHost: "tgoapp.com/..." },
  getir: { label: "Getir Yemek", short: "GT", color: "#5D3EBC", urlHost: "getir.com/yemek/..." },
  foursquare: { label: "Foursquare", short: "4SQ", color: "#F94877", urlHost: "foursquare.com/..." },
  custom: { label: "Özel link", short: "★", color: "#525252", urlHost: "..." },
};

interface PlatformChipProps {
  id: PlatformId | string;
  size?: number;
  withLabel?: boolean;
  className?: string;
}

export function PlatformChip({ id, size = 24, withLabel = false, className = "" }: PlatformChipProps) {
  const p = (PLATFORMS as Record<string, PlatformConfig>)[id] || PLATFORMS.custom;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: p.color,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.42),
          fontWeight: 700,
          fontFamily: "var(--font-heading)",
          letterSpacing: "-0.03em",
          flexShrink: 0,
        }}
      >
        {p.short}
      </span>
      {withLabel && <span style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</span>}
    </span>
  );
}

export default PlatformChip;
