type LogoVariant = 'default' | 'on-dark' | 'on-gold';

interface BuazeLogoProps {
  size?: number;
  className?: string;
  variant?: LogoVariant;
  imageUrl?: string | null;
}

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

  // Unique gradient id per variant so multiple instances on the same page don't clash
  const gradientId = `buazeLogoGrad-${variant}`;

  // On gold backgrounds, flip to a dark monochrome "b" with a gold checkmark;
  // on every other surface the signature orange gradient is used for the bowl
  // and the checkmark stays white.
  const useGradient = variant !== 'on-gold';
  const solidBody = '#1A2332';
  const checkColor = variant === 'on-gold' ? '#F4B400' : '#FFFFFF';

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
      <defs>
        <linearGradient id={gradientId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="55%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>

      <g fill={useGradient ? `url(#${gradientId})` : solidBody}>
        {/* Ascender — the tall stroke of the lowercase "b" */}
        <rect x="22" y="8" width="16" height="58" rx="8" />

        {/* Speech-bubble bowl */}
        <circle cx="62" cy="74" r="34" />

        {/* Speech-bubble tail at the 7-o'clock position */}
        <path d="M 34 96 Q 28 108 30 118 Q 42 110 48 102 Z" />
      </g>

      {/* Checkmark nested inside the bowl */}
      <path
        d="M 46 74 L 57 85 L 80 62"
        stroke={checkColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
