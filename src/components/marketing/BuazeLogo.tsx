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
      role="img"
    >
      {/* Ascender — vertical stroke of the "b" */}
      <rect x="24" y="12" width="14" height="74" rx="7" fill="#0E1525" />

      {/* Bowl ring — outer circle of the "b" */}
      <circle cx="60" cy="76" r="22" stroke="#0E1525" strokeWidth="12" fill="none" />

      {/* Gold curl — signature accent on the bowl's bottom-right arc */}
      <path
        d="M 82 76 A 22 22 0 0 1 60 98"
        stroke="#F4B400"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
