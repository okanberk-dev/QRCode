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
      {/* Shield shape */}
      <path
        d="M60 8L16 28V62C16 88 36 108 60 116C84 108 104 88 104 62V28L60 8Z"
        fill="#111827"
        stroke="#111827"
        strokeWidth="2"
      />
      {/* Inner shield highlight */}
      <path
        d="M60 16L24 33V62C24 84 40 101 60 108C80 101 96 84 96 62V33L60 16Z"
        fill="#1f2937"
      />
      {/* B letter */}
      <path
        d="M44 38H62C67 38 71 40 74 43C76 46 77 49 77 52C77 56 76 59 73 61C76 63 78 67 78 72C78 76 76 79 74 81C71 84 67 85 62 85H44V38ZM54 56H61C63 56 65 55 66 54C67 52 67 51 67 49C67 47 67 46 66 44C65 43 63 42 61 42H54V56ZM54 81H62C64 81 66 80 67 79C68 77 69 76 69 73C69 71 68 69 67 68C66 67 64 66 62 66H54V81Z"
        fill="white"
      />
      {/* Star accent */}
      <path
        d="M85 25L88 31L95 32L90 37L91 44L85 41L79 44L80 37L75 32L82 31L85 25Z"
        fill="#FDBF1D"
      />
    </svg>
  );
}
