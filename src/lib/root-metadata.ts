import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';
import { getSiteSettings } from '@/lib/site-settings';

/**
 * Site-wide metadata defaults shared by every root layout (see
 * src/components/root/RootHtml.tsx). Page-specific fields (canonical,
 * hreflang, og:url, twitter title) must come from each page: anything set
 * here is inherited by every page that omits it.
 */
export async function buildBaseMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: s.titleDefaultTr,
      template: s.titleTemplate,
    },
    description: s.descriptionTr,
    icons: siteIcons(s.faviconUrl),
    manifest: '/site.webmanifest',
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: 'tr_TR',
      alternateLocale: ['en_US'],
      images: [
        {
          url: '/images/open-graph-tr.png',
          width: 1200,
          height: 630,
          alt: 'Buaze',
          type: 'image/png',
        },
      ],
    },
    // Title / description / image are filled per page from its openGraph.
    twitter: {
      card: 'summary_large_image',
    },
    ...APP_METADATA,
  };
}

/** `?v=4` cache bust for the circular favicon (§38.106). */
export function siteIcons(faviconUrl: string | null | undefined): Metadata['icons'] {
  return {
    icon: [{ url: faviconUrl || '/favicon.svg?v=4', type: 'image/svg+xml' }],
    shortcut: faviconUrl || '/favicon.svg?v=4',
    apple: '/apple-touch-icon.svg?v=4',
  };
}

/**
 * Fields every root layout repeats: iOS "Add to Home Screen" chrome, no
 * auto-linked phone numbers (Safari would turn numeric stat tiles into
 * `tel:` links) and the Search Console ownership token.
 */
export const APP_METADATA = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Buaze',
  },
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: 'FYUcNyiNfUTFfmZBl_Xqb_YCFqBpD-PcpHHiGDz_kZ0',
  },
} satisfies Metadata;

export const ROOT_VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Enable safe-area-inset-* env vars on iOS (public survey sticky footer).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};
