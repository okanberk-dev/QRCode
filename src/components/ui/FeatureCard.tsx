import Link from "next/link";
import type { ReactNode } from "react";
import { LogoTile } from "./LogoTile";

/**
 * §53 feature card (docs/design/panel-design-system.md §4.3): a graphite
 * card with lime line art, a white logo tile, a 20/600 title and a muted
 * meta line — the reference's publisher cards. Becomes a link with `href`.
 */
export function FeatureCard({
  title,
  meta,
  logo,
  logoLabel,
  href,
  trailing,
  className = "",
}: {
  title: ReactNode;
  meta?: ReactNode;
  /** Logo image URL; without it the tile shows the title's initial. */
  logo?: string | null;
  /** Text for the tile's initial / alt (defaults to a string title). */
  logoLabel?: string;
  href?: string;
  /** Top-right slot (a chip, a badge). */
  trailing?: ReactNode;
  className?: string;
}) {
  const label = logoLabel ?? (typeof title === "string" ? title : "");
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <LogoTile src={logo} label={label} />
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      <div className="min-w-0">
        <p className="bz-h-tight truncate text-[20px] leading-[26px] text-white">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-[12.5px] leading-[18px] text-white/70">{meta}</p> : null}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className={`bz-feature ${className}`}>
      {body}
    </Link>
  ) : (
    <div className={`bz-feature ${className}`}>{body}</div>
  );
}

export default FeatureCard;
