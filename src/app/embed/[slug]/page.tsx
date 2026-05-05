import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string; size?: string; variant?: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — Buaze`,
    robots: { index: false, follow: false },
  };
}

type Theme = 'light' | 'dark';
/**
 * Embed presentation variants. Each is a distinct layout the owner can drop
 * into a different surface on their site:
 *  - `wall`      — full review wall: average + 3 recent reviews + CTA
 *                  (the original layout; ideal for a dedicated reviews page)
 *  - `badge`     — single-line trust badge: stars + score + count + small CTA
 *                  (ideal for a header / footer / sidebar)
 *  - `spotlight` — featured single review with big quote + score header + CTA
 *                  (ideal for a homepage testimonial slot)
 *
 * Legacy `?size=compact` aliases to `badge` (back-compat with snippets that
 * shipped before the variant rename) — see `resolveVariant` below.
 */
type Variant = 'wall' | 'badge' | 'spotlight';

const PALETTES: Record<Theme, {
  bg: string; fg: string; muted: string; border: string;
  accent: string; accentInk: string; cardBg: string; cardBorder: string;
}> = {
  light: {
    bg: '#FFFFFF',
    fg: '#0A0A0A',
    muted: '#737373',
    border: '#EDEDED',
    accent: '#C6F24E',
    accentInk: '#0A0A0A',
    cardBg: '#FAFAFA',
    cardBorder: '#EDEDED',
  },
  dark: {
    bg: '#0A0A0A',
    fg: '#FFFFFF',
    muted: '#A3A3A3',
    border: '#1A1A1A',
    accent: '#C6F24E',
    accentInk: '#0A0A0A',
    cardBg: '#1A1A1A',
    cardBorder: '#262626',
  },
};

function StarRow({ rating, color }: { rating: number; color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={s <= rating ? color : 'none'}
          stroke={s <= rating ? color : '#A3A3A3'}
          strokeWidth="2"
          aria-hidden
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Resolve the visual variant from query params. `variant` is the canonical
 * field; `size=compact` is the legacy alias for the badge layout (kept for
 * embedded snippets that already shipped before the variant rename).
 */
function resolveVariant(sp: { variant?: string; size?: string }): Variant {
  if (sp.variant === 'badge' || sp.variant === 'spotlight' || sp.variant === 'wall') {
    return sp.variant;
  }
  if (sp.size === 'compact') return 'badge';
  return 'wall';
}

export default async function EmbedPage({ params, searchParams }: RouteParams) {
  const { slug } = await params;
  const sp = await searchParams;
  const theme: Theme = sp.theme === 'dark' ? 'dark' : 'light';
  const variant = resolveVariant(sp);
  const palette = PALETTES[theme];

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) notFound();

  // Filter zorunlu: sadece 4-5 yıldız widget'ta görünür. Düşük puan
  // müşterisi yorumu asla embed'de gösterilmez (işletme reputation koruma).
  // Badge variant ihtiyaç duymadığı için recent listesini tamamen atlıyor —
  // 1 query (count + avg) + body row yerine yalnız aggregate çekilir.
  const recentTake = variant === 'badge' ? 0 : variant === 'spotlight' ? 1 : 3;

  const [avgAgg, totalCount, recent] = await Promise.all([
    prisma.feedback.aggregate({
      where: { restaurantId: restaurant.id, rating: { gte: 4 } },
      _avg: { rating: true },
    }),
    prisma.feedback.count({
      where: { restaurantId: restaurant.id, rating: { gte: 4 } },
    }),
    recentTake > 0
      ? prisma.feedback.findMany({
          where: {
            restaurantId: restaurant.id,
            rating: { gte: 4 },
            comment: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: recentTake,
          select: { id: true, name: true, rating: true, comment: true, createdAt: true },
        })
      : Promise.resolve([] as Array<{
          id: string;
          name: string | null;
          rating: number;
          comment: string | null;
          createdAt: Date;
        }>),
  ]);

  const avgRating = avgAgg._avg.rating ?? 0;
  const reviewUrl = `/r/${restaurant.slug}?source=embed`;
  const trackPixelUrl = `/api/embed/track?slug=${encodeURIComponent(restaurant.slug)}`;

  // Shared footer + tracking pixel — every variant prints these so the
  // analytics + attribution invariants stay consistent.
  const footer = (
    <>
      <div
        style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 10,
          color: palette.muted,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Powered by{' '}
        <a
          href="https://buaze.com/?ref=embed"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: palette.muted, textDecoration: 'none', fontWeight: 600 }}
        >
          Buaze
        </a>
      </div>
      {/* JS-free tracking pixel — 1×1 transparent GIF, server insert */}
      { }
      <img
        src={trackPixelUrl}
        alt=""
        width="1"
        height="1"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1 }}
        aria-hidden
      />
    </>
  );

  // ───────────────────────────────────────── Badge variant
  // Single-line trust pill: ★★★★★ 4.8 · 142 yorum · [Yorumla →]
  // Designed for headers/footers/sidebars where vertical space is scarce.
  if (variant === 'badge') {
    return (
      <div
        style={{
          background: palette.bg,
          color: palette.fg,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
          padding: 12,
          maxWidth: 600,
          margin: '0 auto',
          boxSizing: 'border-box',
          border: `1px solid ${palette.border}`,
          borderRadius: 999,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {totalCount === 0 ? (
            <span style={{ fontSize: 12, color: palette.muted, fontWeight: 500 }}>
              Henüz yorum yok — siz ilk olun.
            </span>
          ) : (
            <>
              <StarRow rating={Math.round(avgRating)} color={palette.accent} />
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </span>
              <span style={{ color: palette.muted, fontSize: 12 }}>
                · {totalCount.toLocaleString('tr-TR')} yorum
              </span>
            </>
          )}
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              background: palette.accent,
              color: palette.accentInk,
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Yorumla →
          </a>
        </div>
        {footer}
      </div>
    );
  }

  // ───────────────────────────────────────── Spotlight variant
  // Score header + 1 featured quote in a lime-bordered card + CTA.
  // Designed for a homepage testimonial slot.
  if (variant === 'spotlight') {
    const featured = recent[0];
    return (
      <div
        style={{
          background: palette.bg,
          color: palette.fg,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
          padding: 18,
          maxWidth: 600,
          margin: '0 auto',
          boxSizing: 'border-box',
          border: `1px solid ${palette.border}`,
          borderRadius: 18,
        }}
      >
        {/* Score header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingBottom: 14,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          {totalCount === 0 ? (
            <span style={{ fontSize: 13, color: palette.muted, fontWeight: 500 }}>
              Henüz yorum yok — siz ilk olun.
            </span>
          ) : (
            <>
              <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </span>
              <StarRow rating={Math.round(avgRating)} color={palette.accent} />
              <span style={{ color: palette.muted, fontSize: 12, marginLeft: 'auto' }}>
                {totalCount.toLocaleString('tr-TR')} yorum
              </span>
            </>
          )}
        </div>

        {/* Featured quote — only if a recent comment exists */}
        {featured ? (
          <figure
            style={{
              margin: '14px 0 0',
              padding: '14px 16px',
              background: palette.cardBg,
              border: `1px solid ${palette.cardBorder}`,
              borderLeft: `3px solid ${palette.accent}`,
              borderRadius: 12,
            }}
          >
            <StarRow rating={featured.rating} color={palette.accent} />
            <blockquote
              style={{
                margin: '8px 0 0',
                fontSize: 15,
                lineHeight: 1.5,
                color: palette.fg,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              “{featured.comment}”
            </blockquote>
            <figcaption
              style={{
                marginTop: 10,
                fontSize: 12,
                color: palette.muted,
                fontWeight: 500,
              }}
            >
              — {(featured.name?.trim() || 'Anonim').slice(0, 32)}
            </figcaption>
          </figure>
        ) : (
          <p
            style={{
              fontSize: 12,
              color: palette.muted,
              margin: '14px 0 0',
              padding: '12px 0',
              textAlign: 'center',
            }}
          >
            Henüz öne çıkan yorum yok.
          </p>
        )}

        {/* CTA */}
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: 14,
            textAlign: 'center',
            background: palette.accent,
            color: palette.accentInk,
            textDecoration: 'none',
            padding: '12px 16px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Yorum yaz →
        </a>

        {footer}
      </div>
    );
  }

  // ───────────────────────────────────────── Wall variant (default / legacy)
  return (
    <div
      style={{
        background: palette.bg,
        color: palette.fg,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
        padding: 16,
        maxWidth: 600,
        margin: '0 auto',
        boxSizing: 'border-box',
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
      }}
    >
      {/* Header — avg rating + count (zero-state ayrı: sadece "Henüz yorum yok") */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 12,
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {totalCount === 0 ? (
          <span style={{ fontSize: 13, color: palette.muted, fontWeight: 500 }}>
            Henüz yorum yok — siz ilk olun.
          </span>
        ) : (
          <>
            <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </span>
            <StarRow rating={Math.round(avgRating)} color={palette.accent} />
            <span style={{ color: palette.muted, fontSize: 12, marginLeft: 'auto' }}>
              {totalCount.toLocaleString('tr-TR')} yorum
            </span>
          </>
        )}
      </div>

      {/* Body — recent reviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {recent.length === 0 ? (
          <p style={{ fontSize: 12, color: palette.muted, margin: 0, padding: '12px 0' }}>
            Henüz öne çıkan yorum yok.
          </p>
        ) : (
          recent.map((r) => (
            <div
              key={r.id}
              style={{
                background: palette.cardBg,
                border: `1px solid ${palette.cardBorder}`,
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <StarRow rating={r.rating} color={palette.accent} />
                <span
                  style={{
                    fontSize: 11,
                    color: palette.muted,
                    marginLeft: 'auto',
                  }}
                >
                  {(r.name?.trim() || 'Anonim').slice(0, 24)}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  margin: 0,
                  color: palette.fg,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {r.comment || ''}
              </p>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <a
        href={reviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: 12,
          textAlign: 'center',
          background: palette.accent,
          color: palette.accentInk,
          textDecoration: 'none',
          padding: '10px 14px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Yorum yaz →
      </a>

      {footer}
    </div>
  );
}
