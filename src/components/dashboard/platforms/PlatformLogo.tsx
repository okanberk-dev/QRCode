import type { ManagedPlatformDef } from '@/lib/platform-management';

// Logo source resolver over the `/public/platforms/*.svg` inventory. Trendyol
// (UI id `trendyol` / `trendyol_go`) ships as `trendyol-go.svg` — same mapping
// PlatformChip uses (§38.117).
export function getPlatformLogoSrc(platform: ManagedPlatformDef): string | null {
  if (platform.uiPlatformId) {
    const fileName =
      platform.uiPlatformId === 'trendyol' || platform.uiPlatformId === 'trendyol_go'
        ? 'trendyol-go'
        : platform.uiPlatformId;
    return `/platforms/${fileName}.svg`;
  }
  if (platform.logoFile) return `/platforms/${platform.logoFile}.svg`;
  return null;
}

/**
 * Decorative platform mark. Always `aria-hidden` — the platform name is
 * rendered as text right next to it, so a second "Google" from the image alt
 * would only be noise for screen readers.
 */
export function PlatformLogo({
  platform,
  size = 40,
  className = '',
}: {
  platform: ManagedPlatformDef;
  size?: number;
  className?: string;
}) {
  const src = getPlatformLogoSrc(platform);
  const radius = size >= 36 ? 10 : 7;
  if (src) {
    return (
      // Static brand asset from /public — next/image adds nothing here.
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        decoding="async"
        // The SVGs are full-bleed app icons (own rounded background); the
        // hairline border keeps the white Google tile visible on white cards.
        className={`shrink-0 border border-pn-line bg-white object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`bz-h-tight flex shrink-0 items-center justify-center border font-medium ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.32),
        color: platform.accent,
        borderColor: `${platform.accent}30`,
        backgroundColor: `${platform.accent}14`,
      }}
    >
      {platform.initials}
    </span>
  );
}

export default PlatformLogo;
