type LogoVariant = 'default' | 'on-dark' | 'on-lime';

interface BuazeLogoProps {
  size?: number;
  className?: string;
  variant?: LogoVariant;
  imageUrl?: string | null;
}

// Pulse brand symbol — speech bubble with ECG pulse line + lime accent spark.
// Graphite on pure surfaces, pure on graphite, graphite on lime.
export default function BuazeLogo({ size = 40, className = '', variant = 'default', imageUrl }: BuazeLogoProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        width={size}
        height={size}
        className={className}
        alt="Buaze"
        style={{ objectFit: 'contain' }}
      />
    );
  }

  const fg = variant === 'on-dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = variant === 'on-lime' ? '#0A0A0A' : '#C6F24E';
  const stroke = 3.2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Buaze Logo"
      role="img"
    >
      {/* Comment bubble — asymmetric, tail at lower-left */}
      <path
        d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      {/* ECG pulse line inside bubble */}
      <path
        d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent spark — top-right */}
      <circle cx="54" cy="10" r="5" fill={accent} />
    </svg>
  );
}
