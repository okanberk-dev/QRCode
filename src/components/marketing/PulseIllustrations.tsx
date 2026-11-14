// Pulse metaphor illustrations — decorative SVGs (aria-hidden, no claims in
// their text) ported from the Claude Design "Pulse" handoff bundle. Used on
// the about, features, how-it-works and solutions pages.

interface IllusProps {
  size?: number;
  className?: string;
}

export function IllusLighthouse({ size = 220, className }: IllusProps) {
  return (
    <svg viewBox="0 0 240 260" width={size} height={size * 260 / 240} className={className} aria-hidden>
      {/* Waves */}
      <path d="M0 220 Q30 215 60 220 T120 220 T180 220 T240 220 L240 260 L0 260 Z" fill="#EAF9B8" />
      <path d="M0 234 Q30 229 60 234 T120 234 T180 234 T240 234 L240 260 L0 260 Z" fill="#C6F24E" opacity="0.6" />
      {/* Rock base */}
      <path d="M70 220 L170 220 L160 205 L80 205 Z" fill="#0A0A0A" />
      {/* Tower */}
      <path d="M100 205 L100 90 L140 90 L140 205 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <path d="M100 120 L140 120 M100 150 L140 150 M100 180 L140 180" stroke="#0A0A0A" strokeWidth="1.2" />
      {/* Light chamber */}
      <rect x="94" y="70" width="52" height="24" fill="#0A0A0A" />
      <rect x="98" y="74" width="44" height="16" fill="#C6F24E" />
      {/* Roof */}
      <path d="M92 70 L148 70 L142 55 L98 55 Z" fill="#0A0A0A" />
      {/* Spike */}
      <path d="M120 55 L120 38" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="120" cy="32" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
      {/* Light beams */}
      <path d="M148 82 L215 50 L215 98 Z" fill="#C6F24E" opacity="0.35" />
      <path d="M92 82 L25 50 L25 98 Z" fill="#C6F24E" opacity="0.2" />
      {/* Stars */}
      <circle cx="200" cy="30" r="2" fill="#0A0A0A" />
      <circle cx="180" cy="18" r="1.5" fill="#0A0A0A" />
      <circle cx="40" cy="25" r="1.5" fill="#0A0A0A" />
    </svg>
  );
}

export function IllusMountain({ size = 220, className }: IllusProps) {
  return (
    <svg viewBox="0 0 240 220" width={size} height={size * 220 / 240} className={className} aria-hidden>
      {/* Back mountain */}
      <path d="M0 200 L70 80 L130 150 L180 100 L240 200 Z" fill="#E4E4E4" />
      {/* Snow caps */}
      <path d="M60 95 L70 80 L82 98 L75 100 L70 95 L65 100 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.2" />
      <path d="M170 110 L180 100 L192 115 L185 117 L180 113 L175 117 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.2" />
      {/* Front mountain */}
      <path d="M20 200 L90 110 L130 165 L200 200 Z" fill="#0A0A0A" />
      {/* Flag */}
      <path d="M90 110 L90 55" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 55 L130 62 L122 70 L130 78 L90 72 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
      {/* Trail with pulse dots */}
      <path d="M20 200 Q50 180 70 170 Q85 160 90 110" fill="none" stroke="#C6F24E" strokeWidth="2.5" strokeDasharray="3 4" />
      <circle cx="50" cy="185" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
      <circle cx="72" cy="165" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
      <circle cx="88" cy="130" r="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
      {/* Sun */}
      <circle cx="195" cy="60" r="18" fill="#C6F24E" />
      {/* Cloud */}
      <path d="M30 60 Q25 50 35 48 Q38 38 50 42 Q58 38 62 48 Q72 50 68 58 Q65 65 50 64 Q40 65 30 60 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="1.5" />
    </svg>
  );
}

export function IllusCompass({ size = 220, className }: IllusProps) {
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x1 = 120 + Math.cos(a) * 85;
    const y1 = 120 + Math.sin(a) * 85;
    const x2 = 120 + Math.cos(a) * 90;
    const y2 = 120 + Math.sin(a) * 90;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0A0A0A" strokeWidth={i % 3 === 0 ? 2.5 : 1} />;
  });
  const qrFilled: [number, number][] = [
    [0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2],
    [5, 0], [7, 0], [5, 2], [6, 2], [7, 2], [0, 5], [2, 5], [0, 7],
    [2, 7], [5, 5], [7, 5], [5, 7],
  ];
  const signals = [30, 150, 270];
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} className={className} aria-hidden>
      {/* Outer ring */}
      <circle cx="120" cy="120" r="90" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <circle cx="120" cy="120" r="78" fill="none" stroke="#EDEDED" strokeWidth="1" strokeDasharray="2 4" />
      {ticks}
      {/* QR mini pattern */}
      <rect x="92" y="92" width="56" height="56" fill="#0A0A0A" rx="4" />
      {qrFilled.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={96 + x * 6} y={96 + y * 6} width="4" height="4" fill="#C6F24E" />
      ))}
      {/* Needle */}
      <path d="M120 30 L128 120 L120 130 L112 120 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M120 210 L128 120 L120 130 L112 120 Z" fill="#0A0A0A" />
      <circle cx="120" cy="120" r="5" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
      {/* Signals */}
      {signals.map((d) => {
        const a = (d * Math.PI) / 180;
        const x = 120 + Math.cos(a) * 110;
        const y = 120 + Math.sin(a) * 110;
        return (
          <g key={d}>
            <circle cx={x} cy={y} r="8" fill="#C6F24E" />
            <circle cx={x} cy={y} r="4" fill="#0A0A0A" />
          </g>
        );
      })}
    </svg>
  );
}

export function IllusInbox({ size = 220, className }: IllusProps) {
  return (
    <svg viewBox="0 0 260 220" width={size} height={size * 220 / 260} className={className} aria-hidden>
      {/* Monitor/panel */}
      <rect x="20" y="30" width="220" height="150" rx="10" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <rect x="20" y="30" width="220" height="22" rx="10" fill="#0A0A0A" />
      <circle cx="30" cy="41" r="2.5" fill="#C6F24E" />
      <circle cx="40" cy="41" r="2.5" fill="#FFFFFF" opacity="0.5" />
      <circle cx="50" cy="41" r="2.5" fill="#FFFFFF" opacity="0.3" />
      {/* Rows */}
      <rect x="34" y="64" width="38" height="38" rx="6" fill="#C6F24E" />
      <rect x="80" y="70" width="100" height="6" rx="3" fill="#0A0A0A" />
      <rect x="80" y="84" width="140" height="4" rx="2" fill="#A3A3A3" />
      <rect x="80" y="92" width="120" height="4" rx="2" fill="#A3A3A3" />
      <rect x="34" y="114" width="38" height="38" rx="6" fill="#EDEDED" />
      <text x="53" y="138" textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="600" fill="#0A0A0A">M</text>
      <rect x="80" y="120" width="80" height="6" rx="3" fill="#0A0A0A" />
      <rect x="80" y="134" width="130" height="4" rx="2" fill="#A3A3A3" />
      <rect x="80" y="142" width="110" height="4" rx="2" fill="#A3A3A3" />
      {/* Floating bubbles */}
      <g>
        <path d="M170 6 Q170 0 176 0 L220 0 Q226 0 226 6 L226 22 Q226 28 220 28 L195 28 L189 36 L189 28 L176 28 Q170 28 170 22 Z" fill="#0A0A0A" />
        {[182, 190, 198, 206, 214].map((cx) => (
          <circle key={cx} cx={cx} cy="14" r="2.4" fill="#C6F24E" />
        ))}
      </g>
      <g>
        <path d="M6 180 Q6 174 12 174 L56 174 Q62 174 62 180 L62 196 Q62 202 56 202 L31 202 L25 210 L25 202 L12 202 Q6 202 6 196 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
        <rect x="18" y="185" width="32" height="5" rx="2.5" fill="#0A0A0A" />
      </g>
      {/* Stand */}
      <rect x="110" y="180" width="40" height="10" fill="#0A0A0A" />
      <rect x="90" y="188" width="80" height="6" rx="3" fill="#0A0A0A" />
    </svg>
  );
}

export function IllusChart({ size = 220, className }: IllusProps) {
  const bars: [number, number][] = [[45, 90], [80, 70], [115, 100], [150, 55], [185, 80]];
  return (
    <svg viewBox="0 0 260 220" width={size} height={size * 220 / 260} className={className} aria-hidden>
      <rect x="20" y="20" width="220" height="170" rx="10" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      {[60, 100, 140, 180].map((y) => (
        <line key={y} x1="20" y1={y} x2="240" y2={y} stroke="#EDEDED" strokeWidth="1" />
      ))}
      {bars.map(([x, h], i) => (
        <rect key={x} x={x - 10} y={180 - h} width="20" height={h} fill={i === 3 ? '#C6F24E' : '#0A0A0A'} rx="3" />
      ))}
      <path d="M45 110 L80 130 L115 90 L150 60 L185 80" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="150" cy="60" r="10" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
      <path d="M150 60 L220 30 L255 30" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
      <rect x="200" y="5" width="60" height="24" rx="12" fill="#0A0A0A" />
      <rect x="214" y="15" width="32" height="5" rx="2.5" fill="#C6F24E" />
      <rect x="30" y="30" width="90" height="10" rx="5" fill="#0A0A0A" />
      <rect x="30" y="44" width="60" height="6" rx="3" fill="#EDEDED" />
      <circle cx="230" cy="170" r="12" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
      <path d="M215 200 Q230 185 245 200" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IllusShield({ size = 220, className }: IllusProps) {
  return (
    <svg viewBox="0 0 200 240" width={size * 200 / 240} height={size} className={className} aria-hidden>
      <path d="M100 15 L175 40 L175 120 Q175 180 100 225 Q25 180 25 120 L25 40 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 25 L165 47 L165 120 Q165 172 100 212 Q35 172 35 120 L35 47 Z" fill="#C6F24E" opacity="0.15" />
      <circle cx="100" cy="110" r="34" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
      <path d="M82 110 L95 123 L118 98" fill="none" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="65" cy="165" r="3" fill="#0A0A0A" />
      <circle cx="100" cy="175" r="3" fill="#0A0A0A" />
      <circle cx="135" cy="165" r="3" fill="#0A0A0A" />
      {/* Plain decorative band — no wording: a "Google" seal would read as an
          endorsement that does not exist (spec D2). */}
      <rect x="70" y="45" width="60" height="10" rx="5" fill="#0A0A0A" />
      <circle cx="88" cy="50" r="2" fill="#C6F24E" />
      <circle cx="100" cy="50" r="2" fill="#C6F24E" />
      <circle cx="112" cy="50" r="2" fill="#C6F24E" />
    </svg>
  );
}
