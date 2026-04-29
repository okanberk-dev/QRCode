'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

interface Props {
  locale: 'tr' | 'en';
}

interface CursorPos {
  x: number;
  y: number;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

function useCursor(ref: RefObject<HTMLElement | null>): CursorPos {
  const [pos, setPos] = useState<CursorPos>({ x: 0.5, y: 0.3, active: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
        active: true,
      });
    };
    const onLeave = () => setPos((p) => ({ ...p, active: false }));
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);

  return pos;
}

function useCountUp(target: number, duration = 1800): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVal(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

function useRotator(length: number, ms = 2400): number {
  const [i, setI] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => setI((v) => (v + 1) % length), ms);
    return () => clearInterval(t);
  }, [length, ms]);

  return i;
}

// ─────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────

function Mono({
  children,
  className = '',
  color,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={`inline-block text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] ${className}`}
      style={{ color: color || '#737373', fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </span>
  );
}

function LiveDot({ color = '#16A34A', size = 6 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, background: color }}
      />
    </span>
  );
}

function StarSvg({ size = 11, fill = '#C6F24E' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function StarsRow({ n = 5, size = 11 }: { n?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <StarSvg key={i} size={size} fill="#C6F24E" />
      ))}
    </span>
  );
}

function CheckMark({ size = 12, color = '#0A0A0A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// SectorWord — kinetic rotating word
// ─────────────────────────────────────────────────────────────

const SECTORS_TR = [
  'restoranlar',
  'kafeler',
  'kuaförler',
  'oto servisler',
  'klinikler',
  'oteller',
];
const SECTORS_EN = [
  'restaurants',
  'cafés',
  'salons',
  'auto services',
  'clinics',
  'hotels',
];

function SectorWord({ isTr }: { isTr: boolean }) {
  const sectors = isTr ? SECTORS_TR : SECTORS_EN;
  const idx = useRotator(sectors.length, 2200);
  const widest = isTr ? 'oto servisler' : 'auto services';

  return (
    <span className="relative inline-block align-baseline">
      <span aria-hidden className="invisible">
        {widest}
      </span>
      <span
        key={`${idx}-${isTr}`}
        className="bz-word-swap absolute left-0 top-0 inline-block"
        style={{
          background: '#C6F24E',
          padding: '0 0.18em 0.04em',
          borderRadius: '0.18em',
          color: '#0A0A0A',
          whiteSpace: 'nowrap',
          transform: 'rotate(-0.6deg)',
        }}
      >
        {sectors[idx]}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// LiveStrip — viewers + 4.9★ + Google compliant
// ─────────────────────────────────────────────────────────────

function LiveStrip({ isTr }: { isTr: boolean }) {
  const viewers = useCountUp(47, 1400);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#525252] sm:text-[13px]">
      <span className="inline-flex items-center gap-1.5">
        <LiveDot size={6} />
        <span>
          {isTr ? 'Şu an' : 'Right now'}{' '}
          <strong className="font-semibold text-[#0A0A0A]">{viewers}</strong>{' '}
          {isTr ? 'işletme bu sayfayı izliyor' : 'businesses are watching this page'}
        </span>
      </span>
      <span className="hidden h-3 w-px bg-black/10 sm:block" />
      <span className="inline-flex items-center gap-1.5">
        <StarsRow n={5} size={11} />
        <strong className="font-semibold text-[#0A0A0A]">4.9</strong>
        <span>· {isTr ? '2.140+ işletme' : '2,140+ businesses'}</span>
      </span>
      <span className="hidden h-3 w-px bg-black/10 sm:block" />
      <span className="inline-flex items-center gap-1.5">
        <CheckMark size={12} color="#16A34A" />
        {isTr ? 'Google politika uyumlu' : 'Google policy compliant'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROIStrip — managed reviews / rating lift / response time
// ─────────────────────────────────────────────────────────────

function ROIStrip({ isTr }: { isTr: boolean }) {
  const reviews = useCountUp(340000, 1800);
  const stars = useCountUp(48, 1600);
  const time = useCountUp(72, 1500);

  return (
    <div className="grid grid-cols-3 divide-x divide-black/10 rounded-2xl border border-black/10 bg-white">
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className="text-[22px] font-semibold leading-none tracking-tight text-[#0A0A0A] sm:text-[26px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {reviews.toLocaleString(isTr ? 'tr-TR' : 'en-US')}+
        </div>
        <Mono className="mt-1.5">{isTr ? 'YÖNETİLEN YORUM' : 'REVIEWS MANAGED'}</Mono>
      </div>
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-baseline gap-1">
          <span
            className="text-[22px] font-semibold leading-none tracking-tight text-[#0A0A0A] sm:text-[26px]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            +{(stars / 10).toFixed(1)}
          </span>
          <StarSvg size={14} fill="#C6F24E" />
        </div>
        <Mono className="mt-1.5">{isTr ? 'ORT. PUAN ARTIŞI' : 'AVG. RATING LIFT'}</Mono>
      </div>
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className="text-[22px] font-semibold leading-none tracking-tight text-[#0A0A0A] sm:text-[26px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          %{time}
        </div>
        <Mono className="mt-1.5">{isTr ? 'YANIT SÜRESİ ↓' : 'RESPONSE TIME ↓'}</Mono>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// InboxCard — auto-rotating review + AI typewriter draft
// ─────────────────────────────────────────────────────────────

interface InboxReview {
  initial: string;
  name: string;
  stars: number;
  platform: string;
  text: { tr: string; en: string };
  reply: { tr: string; en: string };
}

const INBOX_REVIEWS: InboxReview[] = [
  {
    initial: 'MD',
    name: 'Mehmet Demir',
    stars: 4,
    platform: 'Google',
    text: {
      tr: 'Kahveniz harika ama servis biraz yavaştı.',
      en: 'Great coffee but service was a bit slow.',
    },
    reply: {
      tr: 'Mehmet Bey, geri bildiriminiz için teşekkürler. Servis hızımızı iyileştiriyoruz.',
      en: "Thank you for the feedback, Mehmet. We're improving our service speed.",
    },
  },
  {
    initial: 'AY',
    name: 'Ayşe Yılmaz',
    stars: 5,
    platform: 'Tripadvisor',
    text: {
      tr: 'Tatlılar muhteşem, kesinlikle tekrar geleceğim!',
      en: 'Desserts are amazing, will definitely be back!',
    },
    reply: {
      tr: 'Teşekkürler Ayşe Hanım! Sizi tekrar ağırlamaktan mutluluk duyarız.',
      en: "Thank you, Ayşe! We'd love to welcome you back soon.",
    },
  },
  {
    initial: 'EK',
    name: 'Emre Kaya',
    stars: 5,
    platform: 'Yemeksepeti',
    text: {
      tr: 'QR menü çok pratik. Personel ilgili.',
      en: 'QR menu is very practical. Staff is attentive.',
    },
    reply: {
      tr: 'Emre Bey, değerlendirmeniz için teşekkürler. Ekibimiz adına çok mutlu olduk!',
      en: "Thank you, Emre! Our team appreciates the kind words.",
    },
  },
  {
    initial: 'LS',
    name: 'Leyla Su',
    stars: 4,
    platform: 'Google',
    text: {
      tr: 'Fiyat-performans iyi, atmosfer sıcak.',
      en: 'Good value, warm atmosphere.',
    },
    reply: {
      tr: 'Leyla Hanım, harika bir değerlendirme! Sizi tekrar bekliyoruz.',
      en: 'Thanks for the lovely review, Leyla! See you again soon.',
    },
  },
];

// ─────────────────────────────────────────────────────────────
// SentimentDial — dark gauge card
// ─────────────────────────────────────────────────────────────

function SentimentDial({ isTr }: { isTr: boolean }) {
  const score = useCountUp(86, 1600);
  const r = 56;
  const cx = 70;
  const cy = 70;
  const startA = -200;
  const endA = 20;
  const sweep = endA - startA;
  const progress = score / 100;

  const polar = (deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const arcPath = (a0: number, a1: number) => {
    const [x0, y0] = polar(a0);
    const [x1, y1] = polar(a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const [tx, ty] = polar(startA + sweep * progress);

  const breakdown = [
    { val: '78%', label: isTr ? 'POZİTİF' : 'POSITIVE' },
    { val: '16%', label: isTr ? 'NÖTR' : 'NEUTRAL' },
    { val: '6%', label: isTr ? 'NEGATİF' : 'NEGATIVE' },
  ];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[#0A0A0A] px-4 py-4 text-white"
      style={{ boxShadow: '0 30px 60px -25px rgba(10,10,10,0.6)' }}
    >
      <div className="flex items-center justify-between">
        <Mono color="#A3A3A3">{isTr ? 'SENTIMENT · 30G' : 'SENTIMENT · 30D'}</Mono>
        <span
          className="rounded-full bg-[#C6F24E]/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-[#C6F24E]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {isTr ? 'POZİTİF' : 'POSITIVE'}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <svg width="140" height="100" viewBox="0 0 140 100" aria-hidden>
          <path
            d={arcPath(startA, endA)}
            fill="none"
            stroke="#222"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={arcPath(startA, startA + sweep * progress)}
            fill="none"
            stroke="#C6F24E"
            strokeWidth="10"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(198,242,78,0.5))' }}
          />
          <circle cx={tx} cy={ty} r="4" fill="#fff" />
        </svg>
        <div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-[42px] font-semibold leading-none tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {score}
            </span>
            <span className="text-[16px] text-white/40">/100</span>
          </div>
          <div className="mt-1 text-[11px] text-white/60">
            ↑ 14 {isTr ? 'puan · son 30 gün' : 'pts · last 30 days'}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        {breakdown.map(({ val, label }) => (
          <div key={label} className="rounded-md bg-white/5 px-1 py-1.5">
            <div
              className="text-[14px] font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {val}
            </div>
            <div className="text-[9px] tracking-[0.1em] text-white/50">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LiveSignal — refreshing bar chart card
// ─────────────────────────────────────────────────────────────

function LiveSignal({ isTr }: { isTr: boolean }) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from(
      { length: 22 },
      (_, i) => 30 + Math.random() * 50 + (i / 22) * 20,
    ),
  );

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => {
      setBars((b) => {
        const last = b[b.length - 1];
        return [
          ...b.slice(1),
          Math.max(20, Math.min(95, last + (Math.random() - 0.4) * 30)),
        ];
      });
    }, 600);
    return () => clearInterval(t);
  }, []);

  const total = useCountUp(1426, 1800);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white px-4 py-3.5"
      style={{ boxShadow: '0 30px 60px -25px rgba(10,10,10,0.18)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <Mono color="#0A0A0A">
            {isTr ? 'BU AY · YORUM AKIŞI' : 'THIS MONTH · REVIEWS'}
          </Mono>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-[26px] font-semibold leading-none tracking-tight text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
            </span>
            <span
              className="rounded bg-[#C6F24E] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              +212%
            </span>
          </div>
        </div>
        <div className="flex h-12 items-end gap-[3px]" aria-hidden>
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-sm"
              style={{
                height: `${h}%`,
                background:
                  i === bars.length - 1
                    ? '#C6F24E'
                    : i > bars.length - 5
                      ? '#A8D62E'
                      : '#0A0A0A',
                opacity: i < bars.length - 8 ? 0.45 + (i / bars.length) * 0.5 : 1,
                transition: 'height .5s cubic-bezier(.4,0,.2,1)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ReputationCluster — 3 floating layers with parallax tilt
// ─────────────────────────────────────────────────────────────

function ReputationCluster({
  cursor,
  isTr,
}: {
  cursor: CursorPos;
  isTr: boolean;
}) {
  const tx = (cursor.x - 0.5) * 14;
  const ty = (cursor.y - 0.5) * 10;
  const rot = (cursor.x - 0.5) * 4;
  const layerTransform = (mul: number) =>
    `translate3d(${tx * mul}px, ${ty * mul}px, 0) rotate(${rot * mul * 0.3}deg)`;

  return (
    <div className="relative w-full" style={{ perspective: '1200px' }}>
      <div className="relative">
        {/* layer 1 — top: AI Inbox + corner-mounted speed sticker */}
        <div
          className="relative z-30 mx-auto w-[88%] sm:w-[78%]"
          style={{
            transform: layerTransform(1.2),
            transition: cursor.active ? 'transform .15s ease-out' : 'transform .8s ease',
          }}
        >
          <InboxCard isTr={isTr} />

          {/* Speed sticker — sits diagonally above the card's top-left
              corner so it never overlaps the card's header row. Pushed
              further up + left at sm+ for a stronger floating-tag look. */}
          <div
            className="absolute -top-7 -left-3 z-50 flex items-center gap-1.5 rounded-2xl bg-[#C6F24E] px-2 py-1.5 sm:-top-9 sm:-left-7 sm:gap-2 sm:px-3 sm:py-2"
            style={{
              boxShadow: '0 14px 30px rgba(168,214,46,0.45)',
              transform: 'rotate(-6deg)',
            }}
            aria-hidden
          >
            <span
              className="text-[15px] font-semibold leading-none tracking-tight text-[#0A0A0A] sm:text-[20px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              0.8s
            </span>
            <div className="border-l border-[#0A0A0A]/20 pl-1.5 sm:pl-2">
              <span
                className="block text-[8px] font-semibold uppercase leading-tight tracking-[0.16em] text-[#0A0A0A] sm:text-[10px] sm:tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {isTr ? 'YANIT' : 'REPLY'}
              </span>
              <div
                className="text-[7px] font-semibold leading-tight tracking-[0.1em] text-[#0A0A0A]/70 sm:text-[9px] sm:tracking-[0.12em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                AI · {isTr ? 'TASLAK' : 'DRAFT'}
              </div>
            </div>
          </div>
        </div>

        {/* layer 2 — middle: Sentiment Dial, lower-left.
            Hidden on mobile to keep the cluster clean (sm: 640px+). */}
        <div
          className="absolute top-[48%] z-20 hidden sm:-left-6 sm:block sm:w-[52%]"
          style={{
            transform: `${layerTransform(0.6)} rotate(-3deg)`,
            transition: cursor.active ? 'transform .2s ease-out' : 'transform .9s ease',
          }}
        >
          <SentimentDial isTr={isTr} />
        </div>

        {/* layer 3 — bottom: Live Signal, lower-right.
            Hidden on mobile to keep the cluster clean. */}
        <div
          className="absolute top-[68%] z-10 hidden sm:-right-6 sm:block sm:w-[56%]"
          style={{
            transform: `${layerTransform(0.3)} rotate(2deg)`,
            transition: cursor.active ? 'transform .25s ease-out' : 'transform 1s ease',
          }}
        >
          <LiveSignal isTr={isTr} />
        </div>

        {/* invisible spacer reserves cluster height — only adds extra
            room on sm+ where the absolute Dial + Signal layers render.
            On mobile it collapses to the inbox card's natural height. */}
        <div className="invisible" aria-hidden>
          <InboxCard isTr={isTr} />
          <div className="h-0 sm:h-40" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HomeHero — exported composition
// ─────────────────────────────────────────────────────────────

export default function HomeHero({ locale }: Props) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const cursor = useCursor(stageRef);

  const sx = cursor.active ? cursor.x * 100 : 30;
  const sy = cursor.active ? cursor.y * 100 : 18;

  const subtitleStyle: CSSProperties = {
    fontSize: 'clamp(15px, 1.4vw, 18px)',
    lineHeight: 1.55,
    textWrap: 'pretty',
    animationDelay: '0.5s',
  } as CSSProperties;

  const headlineStyle: CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(44px, 7.5vw, 92px)',
    lineHeight: 0.94,
    textWrap: 'balance',
  } as CSSProperties;

  return (
    <div ref={stageRef} className="relative overflow-hidden bg-[#FAFAFA]">
      {/* Spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 800px 500px at ${sx}% ${sy}%, rgba(198,242,78,0.34), transparent 65%)`,
          transition: cursor.active
            ? 'background-image .15s linear'
            : 'background-image .6s ease',
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[800px] opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(10,10,10,0.07) 1px, transparent 0)',
          backgroundSize: '26px 26px',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
        }}
      />

      {/* Vertical ruler lines (lg only) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden lg:block"
      >
        <div className="mx-auto h-full max-w-[1240px] px-10">
          <div className="relative h-full">
            <span className="absolute left-0 top-0 h-full w-px bg-black/[0.04]" />
            <span className="absolute right-0 top-0 h-full w-px bg-black/[0.04]" />
            <span className="absolute left-1/2 top-0 h-full w-px bg-black/[0.04]" />
          </div>
        </div>
      </div>

      <section className="relative px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-28 lg:pt-12">
        <div className="mx-auto max-w-[1240px]">
          {/* Announcement pill */}
          <div className="mb-7 flex sm:mb-9">
            <Link
              href={`${base}/how-it-works`}
              className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-2.5 py-1.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="rounded-full bg-[#0A0A0A] px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-[#C6F24E]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {isTr ? 'YENİ' : 'NEW'}
              </span>
              <Mono color="#0A0A0A">
                {isTr
                  ? "PULSE AI · 0.8sn'de yanıt taslağı"
                  : 'PULSE AI · reply draft in 0.8s'}
              </Mono>
              <span
                className="text-[#A3A3A3] transition-transform group-hover:translate-x-0.5"
                aria-hidden
              >
                →
              </span>
            </Link>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 items-start gap-x-10 gap-y-12 lg:grid-cols-[1.05fr_1fr] lg:gap-y-0">
            {/* LEFT */}
            <div className="relative">
              <h1
                className="font-medium tracking-[-0.045em] text-[#0A0A0A]"
                style={headlineStyle}
              >
                <span className="bz-fade-up bz-d1 block">
                  {isTr ? "Türkiye'nin" : "The world's"}
                </span>
                <span className="bz-fade-up bz-d2 block">
                  {isTr ? 'en hızlı' : 'fastest'}
                </span>
                <span className="bz-fade-up bz-d3 block whitespace-nowrap">
                  <span
                    style={{ display: 'inline-block', transform: 'translateY(0.05em)' }}
                  >
                    <SectorWord isTr={isTr} />
                  </span>
                </span>
                <span className="bz-fade-up bz-d4 block">
                  {isTr ? 'bizimle büyüyor.' : 'grow with us.'}
                </span>
              </h1>

              <p
                className="bz-fade-up mt-6 max-w-[520px] text-[#525252]"
                style={subtitleStyle}
              >
                {isTr ? (
                  <>
                    Buaze; QR ile gerçek müşteri yorumlarını toplayan, AI ile saniyeler
                    içinde yanıtlayan ve itibarınızı tek panelden yöneten{' '}
                    <strong className="font-semibold text-[#0A0A0A]">
                      Reputation OS
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Buaze is the{' '}
                    <strong className="font-semibold text-[#0A0A0A]">
                      Reputation OS
                    </strong>{' '}
                    that collects real reviews via QR, drafts AI replies in seconds, and
                    runs your reputation from one dashboard.
                  </>
                )}
              </p>

              {/* CTAs */}
              <div
                className="bz-fade-up mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: '0.6s' }}
              >
                <Link
                  href={`${base}/auth/register`}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#0A0A0A] px-7 py-4 text-[15px] font-semibold text-white"
                  style={{ boxShadow: '0 14px 30px -10px rgba(10,10,10,0.45)' }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-[#C6F24E] transition-transform duration-500 group-hover:translate-x-0"
                  />
                  <span className="relative z-10 transition-colors duration-300 group-hover:text-[#0A0A0A]">
                    {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                  </span>
                  <span
                    className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#0A0A0A]"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
                <Link
                  href={`${base}/how-it-works`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-6 py-4 text-[15px] font-semibold text-[#0A0A0A] hover:bg-black/[0.03]"
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A]"
                    aria-hidden
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="#C6F24E"
                      aria-hidden
                    >
                      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 11l1 2.7 2.7 1-2.7 1L18 20.4 17 17.7l-2.7-1 2.7-1L18 13zM5 14l.7 2 2 .7-2 .7L5 19.4 4.3 17.4l-2-.7 2-.7L5 14z" />
                    </svg>
                  </span>
                  {isTr ? 'Nasıl çalışır?' : 'How it works?'}
                </Link>
              </div>

              {/* Trust strip */}
              <div className="bz-fade-up mt-7" style={{ animationDelay: '0.75s' }}>
                <LiveStrip isTr={isTr} />
              </div>

              {/* ROI strip */}
              <div
                className="bz-fade-up mt-7 max-w-[560px]"
                style={{ animationDelay: '0.85s' }}
              >
                <ROIStrip isTr={isTr} />
              </div>
            </div>

            {/* RIGHT — cluster (sticker now mounted inside the cluster's
                inbox-card layer, anchored to the card's top-left corner) */}
            <div
              className="bz-scale-in relative"
              style={{ animationDelay: '0.35s' }}
            >
              <ReputationCluster cursor={cursor} isTr={isTr} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InboxCard({ isTr }: { isTr: boolean }) {
  const idx = useRotator(INBOX_REVIEWS.length, 3200);
  const r = INBOX_REVIEWS[idx];
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
    setTyping(false);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const replyText = r.reply[isTr ? 'tr' : 'en'];
    if (reduced) {
      setDraft(replyText);
      return;
    }
    let interval: ReturnType<typeof setInterval> | null = null;
    const startDelay = setTimeout(() => {
      setTyping(true);
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setDraft(replyText.slice(0, i));
        if (i >= replyText.length) {
          if (interval) clearInterval(interval);
          setTyping(false);
        }
      }, 28);
    }, 700);
    return () => {
      clearTimeout(startDelay);
      if (interval) clearInterval(interval);
    };
  }, [idx, isTr, r.reply]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white"
      style={{
        boxShadow:
          '0 30px 60px -25px rgba(10,10,10,0.25), 0 0 0 1px rgba(10,10,10,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0A0A0A]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#C6F24E" aria-hidden>
              <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
            </svg>
          </span>
          <Mono color="#0A0A0A">
            {isTr ? 'PULSE AI · GELEN KUTUSU' : 'PULSE AI · INBOX'}
          </Mono>
        </div>
        <span className="flex items-center gap-1.5">
          <LiveDot />
          <Mono>{isTr ? 'CANLI' : 'LIVE'}</Mono>
        </span>
      </div>

      {/* Review */}
      <div key={`${idx}-${isTr}`} className="bz-fade-up px-4 pb-3 pt-3.5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[12px] font-semibold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {r.initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-semibold text-[#0A0A0A]">
                {r.name}
              </span>
              <StarsRow n={r.stars} size={10} />
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-[#525252]">
              {r.text[isTr ? 'tr' : 'en']}
            </p>
            <Mono className="mt-1.5">
              {r.platform} · {isTr ? '2 dk önce' : '2 min ago'}
            </Mono>
          </div>
        </div>
      </div>

      {/* AI Draft */}
      <div className="mx-4 mb-4 rounded-xl bg-[#F7FAEF] p-3">
        <div className="flex items-center justify-between">
          <Mono color="#0A0A0A">{isTr ? 'AI YANIT TASLAĞI' : 'AI REPLY DRAFT'}</Mono>
          {typing && (
            <span className="flex items-center gap-1" aria-hidden>
              <span className="h-1 w-1 animate-pulse rounded-full bg-[#0A0A0A]" />
              <span
                className="h-1 w-1 animate-pulse rounded-full bg-[#0A0A0A]"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="h-1 w-1 animate-pulse rounded-full bg-[#0A0A0A]"
                style={{ animationDelay: '0.3s' }}
              />
            </span>
          )}
        </div>
        <p className="mt-1.5 min-h-[36px] text-[12.5px] leading-snug text-[#0A0A0A]">
          {draft}
          {typing && (
            <span
              className="bz-caret-blink ml-0.5 inline-block h-3 w-1 align-middle bg-[#0A0A0A]"
              aria-hidden
            />
          )}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Mono>{isTr ? "0.8 sn'de oluşturuldu" : 'Generated in 0.8s'}</Mono>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[10px] font-semibold text-[#C6F24E]"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
          >
            <CheckMark size={9} color="#C6F24E" />
            {isTr ? 'GÖNDER' : 'SEND'}
          </span>
        </div>
      </div>
    </div>
  );
}
