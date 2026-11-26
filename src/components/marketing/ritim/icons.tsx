/**
 * Small inline icons used by the marketing chrome (ritim design package,
 * `_kaynak/build.py` ICON map). Stroke icons inherit `currentColor`.
 */
const base = { viewBox: '0 0 24 24', 'aria-hidden': true } as const;

export const RtIcon = {
  pin: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11.2A7 7 0 0 1 19 9.8C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  globe: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" />
    </svg>
  ),
  instagram: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  linkedin: (
    <svg {...base} fill="currentColor">
      <path d="M5 9h3v10H5zM6.5 4.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zM10 9h2.9v1.4c.4-.8 1.5-1.6 3.1-1.6 3.2 0 3.8 2 3.8 4.7V19h-3v-4.8c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V19h-3z" />
    </svg>
  ),
  chat: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  ),
  sparkle: (
    <svg {...base} fill="currentColor">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7zM19 15l.9 2.4 2.4.9-2.4.9L19 21.6l-.9-2.4-2.4-.9 2.4-.9z" />
    </svg>
  ),
  search: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  ),
  orbit: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5.5 18.5l13-13" />
    </svg>
  ),
  mail: (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  ),
};

/** Hand-drawn ring around an emphasised word (`.rt-scribble`). */
export function Scribble({ children }: { children: React.ReactNode }) {
  return (
    <span className="rt-scribble">
      {children}
      <svg viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true">
        <path d="M36 26C96 6 222 4 276 30c28 14 20 52-30 66-62 18-170 14-214-8C4 74 10 44 50 28c40-16 120-22 196-12" />
      </svg>
    </span>
  );
}
