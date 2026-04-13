export default function BuazeLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Buaze Logo"
    >
      <defs>
        <linearGradient id="buazeGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBF1D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Rounded square base */}
      <rect x="8" y="8" width="104" height="104" rx="26" fill="#1f1e1d" />

      {/* Bold 'B' letterform — clean geometric */}
      <path
        d="M42 34H60C65.5 34 70 36 73 39C75.5 41.5 77 45 77 49C77 53.5 75 57 72 59.5C76 62 78.5 66.5 78.5 72C78.5 76 77 79.5 74.5 82C71.5 85 67.5 86.5 63 86.5H42V34Z
        M53 55H60C62.5 55 64.5 54 66 52.5C67.2 51 68 49 68 47C68 45 67.2 43.5 66 42.2C64.5 41 62.5 40 60 40H53V55Z
        M53 81H62C64.5 81 66.5 80 68 78.5C69.5 77 70 75 70 72.5C70 70 69.2 68 67.8 66.8C66.2 65.5 64 65 62 65H53V81Z"
        fill="url(#buazeGold)"
      />

      {/* Accent dot */}
      <circle cx="90" cy="30" r="5.5" fill="#FDBF1D" />
    </svg>
  );
}
