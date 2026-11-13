import { ecgPath } from './three-support';

/**
 * Server-rendered stand-ins for the three.js scenes (CLAUDE.md §50). They are
 * what crawlers, no-JS visitors and devices that skip 3D see, and what shows
 * until the first 3D frame is drawn — so they mirror the scene's shape and
 * colors. Purely decorative: no text, aria-hidden on the host.
 */

const PLATFORM_COLORS = [
  '#4285F4',
  '#FA0050',
  '#5D3EBC',
  '#F27A1A',
  '#34E0A1',
  '#FF5A5F',
  '#0A5CC2',
  '#FC3F1D',
  '#D32323',
  '#F94877',
];

/** Dark band: a dotted floor with one lime heartbeat line. */
export function PulseFieldFallback({ id = 'bz-pulse' }: { id?: string }) {
  const width = 1200;
  const height = 320;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      focusable="false"
    >
      <defs>
        <pattern id={`${id}-dots`} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.1" fill="#FFFFFF" fillOpacity="0.09" />
        </pattern>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A0A0A" stopOpacity="1" />
          <stop offset="0.45" stopColor="#0A0A0A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C6F24E" stopOpacity="0" />
          <stop offset="0.25" stopColor="#C6F24E" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#C6F24E" stopOpacity="0.55" />
          <stop offset="1" stopColor="#C6F24E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y={height * 0.42} width={width} height={height * 0.58} fill={`url(#${id}-dots)`} />
      <rect x="0" y={height * 0.42} width={width} height={height * 0.58} fill={`url(#${id}-floor)`} />
      <path
        d={ecgPath(width, height, { beats: 3, amplitude: 0.3 })}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Platform orbit: three tilted rings, ten brand-colored nodes, lime core. */
export function PlatformOrbitFallback({
  theme = 'dark',
  id = 'bz-orbit',
}: {
  theme?: 'dark' | 'light';
  id?: string;
}) {
  const ink = theme === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const rings = [
    { rx: 150, ry: 62, rotate: 14 },
    { rx: 196, ry: 96, rotate: -20 },
    { rx: 238, ry: 70, rotate: 28 },
  ];
  const perRing = [3, 4, 3];
  const nodes: { x: number; y: number; color: string }[] = [];
  let colorIndex = 0;
  rings.forEach((ring, ringIndex) => {
    const count = perRing[ringIndex];
    for (let i = 0; i < count; i++) {
      // Ring phase step chosen so no two nodes overlap in this flat view.
      const angle = (i / count) * Math.PI * 2 + ringIndex * 0.4;
      const x = Math.cos(angle) * ring.rx;
      const y = Math.sin(angle) * ring.ry;
      const rad = (ring.rotate * Math.PI) / 180;
      nodes.push({
        x: 300 + x * Math.cos(rad) - y * Math.sin(rad),
        y: 220 + x * Math.sin(rad) + y * Math.cos(rad),
        color: PLATFORM_COLORS[colorIndex++ % PLATFORM_COLORS.length],
      });
    }
  });
  return (
    <svg viewBox="0 0 600 440" preserveAspectRatio="xMidYMid meet" className="h-full w-full" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#C6F24E" stopOpacity="0.55" />
          <stop offset="1" stopColor="#C6F24E" stopOpacity="0" />
        </radialGradient>
      </defs>
      {rings.map((ring, i) => (
        <ellipse
          key={i}
          cx="300"
          cy="220"
          rx={ring.rx}
          ry={ring.ry}
          transform={`rotate(${ring.rotate} 300 220)`}
          fill="none"
          stroke={ink}
          strokeOpacity="0.14"
        />
      ))}
      {nodes.map((node, i) => (
        <line key={`l${i}`} x1="300" y1="220" x2={node.x} y2={node.y} stroke={ink} strokeOpacity="0.07" />
      ))}
      <circle cx="300" cy="220" r="70" fill={`url(#${id}-glow)`} />
      <circle cx="300" cy="220" r="34" fill="none" stroke={theme === 'dark' ? '#C6F24E' : '#0A0A0A'} strokeOpacity="0.8" />
      <circle cx="300" cy="220" r="15" fill="#C6F24E" />
      {nodes.map((node, i) => (
        <circle key={`n${i}`} cx={node.x} cy={node.y} r="6.5" fill={node.color} />
      ))}
    </svg>
  );
}
