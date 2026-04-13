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
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBF1D" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="2" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Premium Shield Base */}
      <path
        d="M60 10L20 28V62C20 86 38 106 60 114C82 106 100 86 100 62V28L60 10Z"
        fill="#111827"
        filter="url(#shadow)"
      />
      
      {/* Inner Accent Line */}
      <path
        d="M60 18L28 32V62C28 81 42 98 60 106C78 98 92 81 92 62V32L60 18Z"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        fill="none"
      />

      {/* Stylized Modern 'B' and Star Combination */}
      <path
        d="M48 42H64C68 42 72 44 74 47C76 50 77 53 77 56C77 60 75 63 72 65C76 67 78 71 78 75C78 79 76 82 74 84C72 87 68 88 64 88H48V42Z"
        fill="url(#logoGradient)"
      />
      
      {/* Star Cutout or Overlay */}
      <path
        d="M60 58L62 64L68 65L63 69L64 75L60 72L56 75L57 69L52 65L58 64L60 58Z"
        fill="#111827"
      />
      
      {/* Glowing Star in Corner */}
      <path
        d="M90 20L92 26L98 27L93 31L94 37L90 34L86 37L87 31L82 27L88 26L90 20Z"
        fill="url(#logoGradient)"
        filter="url(#shadow)"
      />
    </svg>
  );
}

