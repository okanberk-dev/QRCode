import type { ReactNode } from "react";

/**
 * §53 logo / initial tile: 36 px, 8 px corners, white with a hairline
 * (inside a FeatureCard the hairline drops). Pass an image URL or text
 * (the first grapheme is shown, upper-cased for the locale).
 */
export function LogoTile({
  src,
  label,
  size = 36,
  className = "",
  children,
}: {
  src?: string | null;
  /** Name used for the alt text and the initial. */
  label: string;
  size?: number;
  className?: string;
  children?: ReactNode;
}) {
  const initial = (label.trim().match(/^\p{L}|^\p{N}/u)?.[0] ?? "·").toLocaleUpperCase("tr-TR");
  return (
    <span className={`bz-tile ${className}`} style={{ width: size, height: size }} aria-hidden={src ? undefined : true}>
      {children ?? (src ? <img src={src} alt={label} loading="lazy" decoding="async" /> : initial)}
    </span>
  );
}

export default LogoTile;
