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
        <linearGradient id="buazeOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF9A14" />
        </linearGradient>
      </defs>

      {/* Speech bubble "b" shape */}
      {/* Main b body — tall ascender + bowl */}
      <path
        d="M38 18C38 18 38 85 38 85C38 85 42 92 50 95C50 95 42 100 35 98C28 96 26 90 26 85V18C26 14 30 12 34 14L38 18Z"
        fill="url(#buazeOrange)"
      />
      {/* Bowl of b — speech bubble circle */}
      <circle cx="54" cy="65" r="26" fill="url(#buazeOrange)" />
      {/* Inner white of bowl */}
      <circle cx="54" cy="65" r="16" fill="white" />
      {/* Checkmark inside */}
      <path
        d="M46 65L52 71L64 59"
        stroke="#FF9A14"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Speech bubble tail */}
      <path
        d="M38 82L32 96L48 84"
        fill="url(#buazeOrange)"
      />
    </svg>
  );
}
