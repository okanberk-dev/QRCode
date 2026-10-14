import type { MenuTheme } from '@/lib/validations';

export function ThemeThumb({ theme, accent }: { theme: MenuTheme; accent: string }) {
  if (theme === 'classic') {
    // Gradient hero + logo card chip + price-accent rows — matches new ClassicLayout.
    return (
      <div className="relative h-28 overflow-hidden rounded-xl bg-white ring-1 ring-[#EDEDED]">
        <div
          className="relative h-11 w-full overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
          <div className="absolute left-2 top-2 h-6 w-6 rounded-md bg-white shadow-sm" aria-hidden />
          <div className="absolute left-10 top-2.5 h-1.5 w-12 rounded bg-white/90" />
          <div className="absolute left-10 top-5 h-0.5 w-8 rounded bg-white/55" />
        </div>
        <div className="space-y-1.5 p-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#0A0A0A]/70" />
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/85" />
            <div className="h-1.5 w-5 rounded" style={{ backgroundColor: accent }} />
          </div>
          <div className="h-1 w-full rounded bg-[#A3A3A3]/40" />
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[#0A0A0A]/40" />
            <div className="h-1.5 flex-1 rounded bg-[#0A0A0A]/60" />
            <div className="h-1.5 w-5 rounded" style={{ backgroundColor: accent, opacity: 0.7 }} />
          </div>
        </div>
      </div>
    );
  }
  if (theme === 'modern') {
    // 4-grid editorial cards with refined depth — matches new ModernLayout.
    return (
      <div className="relative grid h-28 grid-cols-2 gap-1.5 overflow-hidden rounded-xl bg-[#F5F5F5] p-2 ring-1 ring-[#EDEDED]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-md bg-white shadow-[0_4px_10px_-4px_rgba(0,0,0,0.12)]">
            <div className="relative h-6 w-full" style={{ backgroundColor: accent, opacity: 0.85 - i * 0.1 }}>
              <div
                className="absolute bottom-0.5 right-0.5 h-1.5 w-3 rounded"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
            </div>
            <div className="space-y-0.5 p-1">
              <div className="h-1 w-3/4 rounded bg-[#0A0A0A]/85" />
              <div className="h-0.5 w-full rounded bg-[#A3A3A3]/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (theme === 'elegant') {
    // Magazine: warmer paper bg + centered serif h1 hint — matches new ElegantLayout.
    return (
      <div
        className="relative flex h-28 flex-col items-center gap-1.5 overflow-hidden rounded-xl p-3 ring-1 ring-[#E7E2D6]"
        style={{ backgroundColor: '#FCFBF8' }}
      >
        <div className="h-px w-8 rounded" style={{ backgroundColor: accent }} />
        <div className="h-2 w-3/5 rounded bg-[#1A1208]" />
        <div className="h-px w-2/3" style={{ backgroundColor: '#8C7E66', opacity: 0.4 }} />
        <div className="mt-1 w-full space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <div className="h-1.5 flex-1 rounded bg-[#1A1208]/85" />
            <div className="h-px flex-1" style={{ backgroundColor: '#8C7E66', opacity: 0.55 }} />
            <div className="h-1.5 w-5 rounded" style={{ backgroundColor: accent }} />
          </div>
          <div className="h-0.5 w-4/5 rounded" style={{ backgroundColor: '#8C7E66', opacity: 0.35 }} />
          <div className="flex items-baseline gap-1.5">
            <div className="h-1.5 flex-1 rounded bg-[#1A1208]/85" />
            <div className="h-px flex-1" style={{ backgroundColor: '#8C7E66', opacity: 0.55 }} />
            <div className="h-1.5 w-5 rounded" style={{ backgroundColor: accent, opacity: 0.75 }} />
          </div>
        </div>
      </div>
    );
  }
  if (theme === 'minimal') {
    // Typography-first: mono category eyebrow + item count + hairline rows.
    return (
      <div className="relative h-28 overflow-hidden rounded-xl bg-white p-3 ring-1 ring-[#EDEDED]">
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-10 rounded" style={{ backgroundColor: accent }} />
          <div className="h-px flex-1" style={{ backgroundColor: `${accent}33` }} />
          <div className="h-1 w-3 rounded bg-[#A3A3A3]" />
        </div>
        <div className="mt-2.5 h-px w-full bg-[#EDEDED]" />
        <div className="mt-2.5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="h-0.5 flex-1 rounded bg-[#0A0A0A]/55" />
              <div
                className="h-0.5 rounded"
                style={{ backgroundColor: '#0A0A0A', opacity: 0.55, width: 14 + i * 2 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (theme === 'bistro') {
    // Warm cream cafe: 4-card grid with terra-cotta gradient strip + warm shadow.
    return (
      <div
        className="relative grid h-28 grid-cols-2 gap-1.5 overflow-hidden rounded-xl p-2 ring-1 ring-[#E8E0D2]"
        style={{ backgroundColor: '#FAF7F0' }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg bg-white shadow-[0_4px_10px_-4px_rgba(122,103,88,0.3)] ring-1 ring-[#E8E0D2]"
          >
            <div
              className="absolute inset-x-0 top-0 h-3.5"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
            />
            <div className="space-y-0.5 p-1 pt-4">
              <div className="h-1 w-2/3 rounded bg-[#2A1E15]" />
              <div className="h-0.5 w-full rounded" style={{ backgroundColor: '#7A6758', opacity: 0.4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (theme === 'pulse') {
    // Buaze design system layout: pure white + ECG line + 2-col card grid +
    // mono price + lime accent dot. Mirrors the live PulseLayout.
    return (
      <div className="relative h-28 overflow-hidden rounded-xl bg-white p-2.5 ring-1 ring-[#EDEDED]">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
          <div className="h-1 flex-1 rounded bg-[#0A0A0A]" />
          <div className="h-1 w-4 rounded bg-[#0A0A0A]/60" style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <svg viewBox="0 0 100 8" className="mt-1.5 h-2 w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M0 4 L24 4 L28 1 L34 7 L40 4 L46 2 L52 6 L58 4 L100 4" stroke={accent} strokeWidth="1" fill="none" strokeLinecap="round" />
        </svg>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg ring-1 ring-[#EDEDED]">
              <div className="h-3.5 bg-[#FAFAFA]" />
              <div className="space-y-0.5 p-1">
                <div className="flex items-center gap-1">
                  <div className="h-1 flex-1 rounded bg-[#0A0A0A]/85" />
                  <div className="h-1 w-3 rounded bg-[#0A0A0A]/85" />
                </div>
                <div className="h-0.5 w-full rounded bg-[#A3A3A3]/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // gastronomy — graphite + dual radial glow + accent-text + dotted price layout
  return (
    <div className="relative h-28 overflow-hidden rounded-xl bg-[#0A0A0A] p-2.5 ring-1 ring-black">
      <div className="absolute -left-3 -top-3 h-14 w-14 rounded-full opacity-45 blur-xl" style={{ backgroundColor: accent }} />
      <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-full opacity-25 blur-xl" style={{ backgroundColor: accent }} />
      <div className="relative">
        <div className="h-2 w-1/3 rounded" style={{ backgroundColor: accent }} />
        <div className="mt-2 h-2 w-3/4 rounded bg-white/90" />
        <div className="mt-2 h-px w-full bg-white/15" />
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 flex-1 rounded bg-white/55" />
            <div className="h-1 w-5 rounded" style={{ backgroundColor: accent, opacity: 0.85 }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 flex-1 rounded bg-white/40" />
            <div className="h-1 w-4 rounded" style={{ backgroundColor: accent, opacity: 0.7 }} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="h-1 w-3/4 rounded bg-white/30" />
            <div className="h-1 w-3 rounded" style={{ backgroundColor: accent, opacity: 0.55 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
