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
        <linearGradient id="buazeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBF1D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      
      {/* Rounded Square Base */}
      <rect x="8" y="8" width="104" height="104" rx="28" fill="#111827" />
      
      {/* Inner accent border */}
      <rect x="14" y="14" width="92" height="92" rx="22" stroke="url(#buazeGrad)" strokeWidth="1" strokeOpacity="0.2" fill="none" />

      {/* Modern 'B' letterform */}
      <path
        d="M42 36H62C66.5 36 70.2 37.8 72.8 40.5C75 43 76.2 46.2 76.2 50C76.2 54.5 74.5 58 71.5 60.2C75.5 62.5 78 66.8 78 72C78 76.2 76.2 79.8 73.5 82.2C70.8 84.5 67 86 62.5 86H42V36Z
        M52 56H61C63.5 56 65.5 55 66.8 53.5C68 52 68.5 50.2 68.5 48C68.5 46 67.8 44.2 66.5 43C65.2 41.8 63.5 41 61 41H52V56Z
        M52 81H62C64.8 81 67 80 68.5 78.5C70 76.8 70.8 74.8 70.8 72C70.8 69.5 70 67.5 68.5 66C67 64.5 64.5 63.5 62 63.5H52V81Z"
        fill="url(#buazeGrad)"
      />
      
      {/* Small star accent */}
      <circle cx="88" cy="28" r="6" fill="url(#buazeGrad)" opacity="0.9" />
      <circle cx="88" cy="28" r="3" fill="#111827" />
    </svg>
  );
}
