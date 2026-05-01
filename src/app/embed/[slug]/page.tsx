import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string; size?: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — Buaze`,
    robots: { index: false, follow: false },
  };
}

type Theme = 'light' | 'dark';
type Size = 'compact' | 'full';

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

export default async function EmbedPage({ params, searchParams }: RouteParams) {
  const { slug } = await params;
  const sp = await searchParams;
  const theme: Theme = sp.theme === 'dark' ? 'dark' : 'light';
  const size: Size = sp.size === 'compact' ? 'compact' : 'full';
  const palette = PALETTES[theme];

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) notFound();

  // Filter zorunlu: sadece 4-5 yıldız widget'ta görünür. Düşük puan
  // müşterisi yorumu asla embed'de gösterilmez (işletme reputation koruma).
  const [avgAgg, totalCount, recent] = await Promise.all([
    prisma.feedback.aggregate({
      where: { restaurantId: restaurant.id, rating: { gte: 4 } },
      _avg: { rating: true },
    }),
    prisma.feedback.count({
      where: { restaurantId: restaurant.id, rating: { gte: 4 } },
    }),
    prisma.feedback.findMany({
      where: {
        restaurantId: restaurant.id,
        rating: { gte: 4 },
        comment: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, rating: true, comment: true, createdAt: true },
    }),
  ]);

  const avgRating = avgAgg._avg.rating ?? 0;
  const reviewUrl = `/r/${restaurant.slug}?source=embed`;
  const trackPixelUrl = `/api/embed/track?slug=${encodeURIComponent(restaurant.slug)}`;

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
          borderBottom: size === 'full' ? `1px solid ${palette.border}` : 'none',
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

      {/* Body — recent reviews (full mode only) */}
      {size === 'full' && (
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
      )}

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

      {/* Powered by Buaze footer */}
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={trackPixelUrl}
        alt=""
        width="1"
        height="1"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1 }}
        aria-hidden
      />
    </div>
  );
}
