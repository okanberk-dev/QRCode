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
      {/* Ascender — vertical stroke of the "b" */}
      <rect x="24" y="12" width="14" height="74" rx="7" fill={body} />

      {/* Bowl ring — outer circle of the "b" */}
      <circle cx="60" cy="76" r="22" stroke={body} strokeWidth="12" fill="none" />

      {/* Gold curl — signature accent on the bowl's bottom-right arc */}
      <path
        d="M 82 76 A 22 22 0 0 1 60 98"
        stroke={curl}
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
