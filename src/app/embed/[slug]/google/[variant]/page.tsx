import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { isGoogleTenantAllowed } from '@/lib/gbp-access';
import {
  pickDisplayReviews,
  readGoogleReviewShowcase,
  type PublicGoogleReview,
} from '@/lib/google-review-showcase';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { parseEmbedVariant } from '@/lib/embed-variant';
import { splitGoogleTranslation } from '@/lib/google-review-text';

// Google reviews widget for one business (CLAUDE.md §53). Reads ONLY the
// server cache filled by the central refresh queue — a page view never calls
// Google. No JSON-LD on purpose: Google's review-snippet rules forbid marking
// up reviews collected from another site (Google Maps included).
//
// §56 — cached for 10 minutes (ISR). Middleware rewrites the public URL
// `/embed/{slug}/google?theme=&limit=&lang=` to this path segment, so a
// widget view is served from the cache instead of rendering on the server.
// The cache itself is refilled at most every few hours (§53), so 10 minutes
// adds little delay.
export const revalidate = 600;
export const dynamicParams = true;
export function generateStaticParams(): { slug: string; variant: string }[] {
  return [];
}

interface RouteParams {
  params: Promise<{ slug: string; variant: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — Google`, robots: { index: false, follow: false } };
}

type Theme = 'light' | 'dark';
const PALETTES: Record<Theme, {
  bg: string; fg: string; muted: string; border: string; accent: string;
  accentInk: string; cardBg: string; star: string; starOff: string;
}> = {
  light: {
    bg: '#FFFFFF', fg: '#0A0A0A', muted: '#525252', border: '#EDEDED', accent: '#C6F24E',
    accentInk: '#0A0A0A', cardBg: '#FAFAFA', star: '#0A0A0A', starOff: '#D4D4D4',
  },
  dark: {
    bg: '#0A0A0A', fg: '#FFFFFF', muted: '#A3A3A3', border: '#262626', accent: '#C6F24E',
    accentInk: '#0A0A0A', cardBg: '#1A1A1A', star: '#C6F24E', starOff: '#404040',
  },
};

const COPY = {
  tr: {
    source: 'Google yorumları',
    reviews: (n: string) => `${n} yorum`,
    seeAll: "Google'da tümünü gör",
    reply: 'İşletmenin yanıtı',
    anonymous: 'Google kullanıcısı',
    preparing: 'Google yorumları hazırlanıyor. Kısa süre sonra burada görünecek.',
    noText: 'Yalnız puan verdi.',
    showTranslation: 'Çeviriyi göster',
    updated: (d: string) => `Son güncelleme ${d}`,
    rating: (r: number) => `5 üzerinden ${r} yıldız`,
  },
  en: {
    source: 'Google reviews',
    reviews: (n: string) => `${n} reviews`,
    seeAll: 'See all on Google',
    reply: 'Reply from the business',
    anonymous: 'Google user',
    preparing: 'Google reviews are being prepared and will appear here shortly.',
    noText: 'Left a rating only.',
    showTranslation: 'Show translation',
    updated: (d: string) => `Updated ${d}`,
    rating: (r: number) => `${r} out of 5 stars`,
  },
} as const;

function Stars({ rating, on, off, label }: { rating: number; on: string; off: string; label: string }) {
  const rounded = Math.round(rating);
  return (
    <span role="img" aria-label={label} style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="13" height="13" viewBox="0 0 24 24" aria-hidden fill={s <= rounded ? on : off}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

function Avatar({ review, palette, anonymous }: {
  review: PublicGoogleReview;
  palette: (typeof PALETTES)[Theme];
  anonymous: string;
}) {
  const name = review.reviewer.displayName ?? anonymous;
  if (review.reviewer.profilePhotoUrl) {
    return (
      <img
        src={review.reviewer.profilePhotoUrl}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        width: 32, height: 32, borderRadius: 999, flexShrink: 0, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', background: palette.border,
        color: palette.fg, fontSize: 13, fontWeight: 600,
      }}
    >
      {name.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'G'}
    </span>
  );
}

export default async function GoogleReviewsEmbedPage({ params }: RouteParams) {
  const { slug, variant } = await params;
  const { theme, lang: locale, limit } = parseEmbedVariant(variant);
  const copy = COPY[locale];
  const palette = PALETTES[theme];

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, isActive: true, userId: true },
  });
  // Closed tenants (GBP_ALLOWED_TENANTS) get no widget at all.
  if (!restaurant || !restaurant.isActive || !(await isGoogleTenantAllowed(restaurant.userId))) notFound();

  const showcase = await readGoogleReviewShowcase(restaurant.id);
  const numberFmt = new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US');
  const dateFmt = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: resolveDisplayTimeZone(),
  });
  const fmtDate = (iso: string | null) => {
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? dateFmt.format(new Date(ms)) : '';
  };

  const shell: React.CSSProperties = {
    background: palette.bg,
    color: palette.fg,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif',
    padding: 16,
    maxWidth: 640,
    margin: '0 auto',
    boxSizing: 'border-box',
    border: `1px solid ${palette.border}`,
    borderRadius: 14,
  };

  const footer = (
    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', fontSize: 11, color: palette.muted }}>
      <span>{showcase ? copy.updated(fmtDate(showcase.fetchedAt.toISOString())) : ''}</span>
      <span>
        Powered by{' '}
        <a href="https://www.buaze.com/?ref=embed-google" target="_blank" rel="noopener noreferrer" style={{ color: palette.muted, fontWeight: 600, textDecoration: 'none' }}>
          Buaze
        </a>
      </span>
    </div>
  );

  if (!showcase) {
    return (
      <div style={shell} lang={locale}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: palette.muted, fontWeight: 600 }}>
          {copy.source}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: palette.muted }}>{copy.preparing}</p>
        {footer}
      </div>
    );
  }

  const reviews = pickDisplayReviews(showcase.reviews, limit);

  return (
    <div style={shell} lang={locale}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', paddingBottom: 14, borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: palette.muted, fontWeight: 600 }}>
            {copy.source}
          </p>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {showcase.averageRating !== null && (
              <>
                <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                  {showcase.averageRating.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <Stars rating={showcase.averageRating} on={palette.star} off={palette.starOff} label={copy.rating(Number(showcase.averageRating.toFixed(1)))} />
              </>
            )}
            <span style={{ fontSize: 13, color: palette.muted }}>
              {copy.reviews(numberFmt.format(showcase.totalReviewCount))}
            </span>
          </div>
        </div>
        {showcase.reviewsUrl && (
          <a
            href={showcase.reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: palette.accent, color: palette.accentInk, textDecoration: 'none',
              padding: '10px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
              whiteSpace: 'nowrap', minHeight: 44, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center',
            }}
          >
            {copy.seeAll} →
          </a>
        )}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {reviews.map((review) => (
          <li key={review.reviewId} style={{ padding: '14px 0', borderBottom: `1px solid ${palette.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar review={review} palette={palette} anonymous={copy.anonymous} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.reviewer.displayName ?? copy.anonymous}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  {review.rating !== null && (
                    <Stars rating={review.rating} on={palette.star} off={palette.starOff} label={copy.rating(review.rating)} />
                  )}
                  <span style={{ fontSize: 12, color: palette.muted }}>{fmtDate(review.createTime)}</span>
                </div>
              </div>
            </div>
            {(() => {
              // Original words first; Google's translation behind a toggle
              // (no JS: <details> works inside the iframe).
              const text = splitGoogleTranslation(review.comment);
              return (
                <>
                  <p
                    style={{
                      margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-line',
                      overflowWrap: 'anywhere', color: text.original ? palette.fg : palette.muted,
                      display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}
                  >
                    {text.original ?? copy.noText}
                  </p>
                  {text.translated && (
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: palette.muted }}>{copy.showTranslation}</summary>
                      <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere', color: palette.muted }}>
                        {text.translated}
                      </p>
                    </details>
                  )}
                </>
              );
            })()}
            {review.reviewReply && (
              <div style={{ marginTop: 10, padding: '10px 12px', background: palette.cardBg, borderRadius: 10, borderLeft: `3px solid ${palette.accent}` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: palette.muted }}>{copy.reply}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {review.reviewReply.comment}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {footer}
    </div>
  );
}
