// Stamp-ring motif drawn over brand surfaces (header band of the customer
// panel, arrival screen). Decorative only; strokes in the current colour.
export default function PortalRings({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="currentColor" className={className} style={style}>
      <circle cx="100" cy="100" r="97" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="81" strokeWidth="1.2" strokeDasharray="1.5 5" />
      <circle cx="100" cy="100" r="65" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="49" strokeWidth="1.2" strokeDasharray="1.5 5" />
      <circle cx="100" cy="100" r="33" strokeWidth="1.2" />
    </svg>
  );
}
