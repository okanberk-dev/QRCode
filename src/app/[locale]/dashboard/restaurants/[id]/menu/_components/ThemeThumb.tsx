import type { CSSProperties } from 'react';
import { CORNERS, type ResolvedMenuDesign } from '@/lib/menu-design';

/**
 * A 132 px schematic of a menu style, drawn only from the resolver's tokens
 * (menu-design-final §11.1): the header variant with the owner's real name in
 * the display face, three category marks, then rows / a 2×2 grid / a feature
 * block / leader rows. Every colour is a normalised `#RRGGBB` from
 * `resolveMenuDesign`, so a new preset needs no drawing code. Decorative:
 * the card that hosts it carries the accessible name.
 */
export function ThemeThumb({ d, name }: { d: ResolvedMenuDesign; name: string }) {
  const c = d.colors;
  const k = d.knobs;
  const s = d.structure;
  const tf = d.typeface;
  const corners = CORNERS[k.corners];
  // Scaled down for a 132 px drawing (a 24 px card radius would swallow a mini card).
  const rCard = Math.min(Math.round(corners.card / 2.5), 8);
  const rImg = Math.min(Math.round(corners.img / 2.5), 6);
  const rPill = corners.pill > 100 ? 999 : 3;
  const thumbRadius = s.thumbShape === 'circle' ? '999px' : s.thumbShape === 'arch' ? `999px 999px ${rImg}px ${rImg}px` : `${rImg}px`;
  const price = k.price === 'accent' ? c.accentText : c.ink;
  const cards = k.cardStyle === 'cards';
  const display: CSSProperties = {
    fontFamily: tf.display,
    fontWeight: tf.displaySize.weight,
    letterSpacing: `${tf.displaySize.track}em`,
    fontSynthesis: 'none',
  };

  const bar = (width: string, color: string, height = 4, opacity = 1): CSSProperties => ({
    width,
    height,
    borderRadius: 2,
    backgroundColor: color,
    opacity,
  });

  // ── header ──
  let header;
  if (s.header === 'banner') {
    header = (
      <div
        className="flex h-[38px] items-center gap-1.5 px-2.5"
        style={{ backgroundImage: `linear-gradient(135deg, ${c.banner}, ${c.bannerEnd})` }}
      >
        <span className="h-4 w-4 shrink-0 rounded-[4px]" style={{ backgroundColor: c.surface, boxShadow: `0 0 0 1px ${c.rule}` }} />
        <span className="min-w-0 truncate text-[13px] leading-none" style={{ ...display, color: c.onBanner }}>
          {name}
        </span>
      </div>
    );
  } else if (s.header === 'cover') {
    header = (
      <div>
        <div
          className="relative h-[26px] overflow-hidden"
          style={{ backgroundImage: `linear-gradient(160deg, ${c.accentSoft} 10%, ${c.surface2} 70%)` }}
        >
          <span className="absolute -bottom-3 left-3 h-7 w-12 rounded-[50%]" style={{ backgroundColor: c.accentMark, opacity: 0.22 }} />
          <span className="absolute -bottom-4 left-10 h-8 w-16 rounded-[50%]" style={{ backgroundColor: c.accentMark, opacity: 0.14 }} />
        </div>
        <div className="truncate px-2.5 pt-1.5 text-[12px] leading-none" style={{ ...display, color: c.ink }}>
          {name}
        </div>
      </div>
    );
  } else if (s.header === 'compact') {
    header = (
      <div className="flex h-[30px] items-center justify-between gap-2 px-2.5">
        <span className="min-w-0 truncate text-[13px] leading-none" style={{ ...display, color: c.ink }}>
          {name}
        </span>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.accentFill, boxShadow: `inset 0 0 0 1px ${c.accentEdge}` }} />
      </div>
    );
  } else {
    header = (
      <div className="flex flex-col items-center gap-1 px-2.5 pt-2">
        <span className="h-[1.5px] w-3.5" style={{ backgroundColor: c.accentUi }} />
        <span className="max-w-full truncate text-[13px] leading-[15px]" style={{ ...display, color: c.ink }}>
          {name}
        </span>
        <span style={bar('38%', c.muted, 2, 0.6)} />
      </div>
    );
  }

  // ── category marks ──
  const nav =
    k.nav === 'pills' ? (
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <span className="h-2.5 w-8" style={{ backgroundColor: c.accentFill, borderRadius: rPill, boxShadow: `inset 0 0 0 1px ${c.accentEdge}` }} />
        <span className="h-2.5 w-7" style={{ backgroundColor: c.surface2, borderRadius: rPill }} />
        <span className="h-2.5 w-6" style={{ backgroundColor: c.surface2, borderRadius: rPill }} />
      </div>
    ) : (
      <div className="flex items-end gap-2 px-2.5 pb-1 pt-2" style={{ borderBottom: `1px solid ${c.rule}` }}>
        <span className="flex flex-col gap-[3px]">
          <span style={bar('22px', c.ink, 3, 0.9)} />
          <span className="h-[1.5px] w-[22px]" style={{ backgroundColor: c.accentUi }} />
        </span>
        <span className="mb-[4.5px]" style={bar('18px', c.ink2, 3, 0.55)} />
        <span className="mb-[4.5px]" style={bar('14px', c.ink2, 3, 0.55)} />
      </div>
    );

  // ── section title ──
  const section = (
    <div className={`flex items-center gap-1.5 px-2.5 pt-1.5 ${s.section === 'chapter' ? 'justify-center' : ''}`}>
      {s.section === 'numbered' && <span className="text-[7px] font-medium leading-none" style={{ color: c.accentText }}>01</span>}
      <span style={bar('30px', c.ink, 4, 0.85)} />
      {s.section === 'rule' && <span className="h-px flex-1" style={{ backgroundColor: c.accentUi, opacity: 0.7 }} />}
    </div>
  );

  // ── items ──
  const media = (style: CSSProperties) => (
    <span className="block shrink-0" style={{ backgroundColor: c.accentSoft, ...style }}>
      <span className="block h-full w-full" style={{ backgroundImage: `radial-gradient(circle at 70% 30%, ${c.accentMark}33, transparent 60%)` }} />
    </span>
  );

  let items;
  if (k.items === 'grid') {
    items = (
      <div className="grid grid-cols-2 gap-1 px-2.5 pt-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block overflow-hidden"
            style={cards ? { backgroundColor: c.surface, borderRadius: rCard, boxShadow: `0 0 0 1px ${c.rule}` } : undefined}
          >
            {media({ height: 15, borderRadius: cards ? 0 : rImg })}
            <span className={`flex items-center justify-between gap-1 ${cards ? 'px-1 py-1' : 'pt-1'}`}>
              <span style={bar('55%', c.ink, 3, 0.85)} />
              <span style={bar('18%', price, 3)} />
            </span>
          </span>
        ))}
      </div>
    );
  } else if (k.items === 'feature') {
    items = (
      <div className="px-2.5 pt-1.5">
        <span
          className="block overflow-hidden"
          style={cards ? { backgroundColor: c.surface, borderRadius: rCard, boxShadow: `0 0 0 1px ${c.rule}` } : undefined}
        >
          {media({ height: 30, borderRadius: cards ? 0 : rImg })}
          <span className={`flex items-center justify-between gap-2 ${cards ? 'px-1.5 py-1.5' : 'pt-1.5'}`}>
            <span style={bar('50%', c.ink, 4, 0.85)} />
            <span style={bar('16%', price, 4)} />
          </span>
        </span>
      </div>
    );
  } else if (k.items === 'text') {
    items = (
      <div className="space-y-2 px-2.5 pt-2">
        {[52, 40, 46].map((w, i) => (
          <span key={i} className="flex items-end gap-1">
            <span style={bar(`${w}%`, c.ink, 4, 0.85)} />
            <span className="mb-px flex-1" style={{ borderBottom: `1.5px dotted ${c.ruleStrong}` }} />
            <span style={bar('12%', price, 4)} />
          </span>
        ))}
      </div>
    );
  } else {
    const arch = s.thumbShape === 'arch';
    items = (
      <div className={`px-2.5 pt-1.5 ${cards ? 'space-y-1' : ''}`}>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`flex items-center gap-1.5 ${s.thumbSide === 'end' ? 'flex-row-reverse' : ''}`}
            style={
              cards
                ? { backgroundColor: c.surface, borderRadius: rCard, boxShadow: `0 0 0 1px ${c.rule}`, padding: 4 }
                : { padding: '4px 0', borderBottom: i === 0 ? `1px solid ${c.rule}` : undefined }
            }
          >
            {media({ width: arch ? 15 : 18, height: arch ? 19 : 18, borderRadius: thumbRadius })}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center justify-between gap-1.5">
                <span style={bar(i === 0 ? '58%' : '46%', c.ink, 4, 0.85)} />
                <span style={bar('16%', price, 4)} />
              </span>
              <span style={bar('78%', c.muted, 2.5, 0.45)} />
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="relative h-[132px] overflow-hidden rounded-[14px]"
      style={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.rule}` }}
    >
      {d.scheme === 'dark' && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-16"
          style={{ backgroundImage: `radial-gradient(70% 100% at 50% 0%, ${c.glow}, transparent)` }}
        />
      )}
      <div className="relative">
        {header}
        {nav}
        {section}
        {items}
      </div>
    </div>
  );
}
