type LogoVariant = 'default' | 'on-dark' | 'on-gold';

interface BuazeLogoProps {
  size?: number;
  className?: string;
  variant?: LogoVariant;
}

export default function BuazeLogo({ size = 40, className = '', variant = 'default' }: BuazeLogoProps) {
  const body = variant === 'on-dark' ? '#F8F6F1' : '#0E1525';
  const curl = variant === 'on-gold' ? '#0E1525' : '#F4B400';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Buaze Logo"
      role="img"
    >
      {/* Ascender — capsule-shaped vertical stroke of the "b" */}
      <rect x="22" y="10" width="14" height="76" rx="7" fill={body} />

      {/* Bowl — open ring (top + left + bottom via left side); gap sits at top-right */}
      <path
        d="M 62 52 A 22 22 0 0 0 62 96"
        stroke={body}
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />

      {/* Signature gold curl — closes the bowl at bottom-right (3→6 o'clock) */}
      <path
        d="M 84 74 A 22 22 0 0 1 62 96"
        stroke={curl}
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
