/**
 * Shared inline helpers used across multiple QR templates.
 * Stars appears in 4+ templates (Classic, CounterPlaque, DoorHanger,
 * Brutalist's neighbour) so it's hoisted here per CLAUDE.md §7 rule —
 * abstract on the third repeat, not before.
 */

export interface StarsProps {
  count?: number;
  color?: string;
  size?: number;
}

export const Stars = ({ count = 5, color = '#C6F24E', size = 12 }: StarsProps) => (
  <div style={{ display: 'inline-flex', gap: size * 0.25 }}>
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
      </svg>
    ))}
  </div>
);
