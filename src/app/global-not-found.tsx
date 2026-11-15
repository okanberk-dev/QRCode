import type { Metadata, Viewport } from 'next';
import RootHtml from '@/components/root/RootHtml';
import BrandedNotFound from '@/components/marketing/BrandedNotFound';
import { APP_METADATA, ROOT_VIEWPORT, siteIcons } from '@/lib/root-metadata';
import { SITE_URL } from '@/lib/site';

// 404 for URLs that match no route. The app has several root layouts (one
// per top-level segment, see src/components/root/RootHtml.tsx), so there is
// no single layout to wrap a root not-found page; this file renders its own
// <html> (next.config.ts `experimental.globalNotFound`). It cannot know the
// locale on the server without headers(), so `langFromPath` switches `lang`
// to "en" for /en URLs before the first paint.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Sayfa bulunamadı · Buaze',
  robots: { index: false, follow: true },
  icons: siteIcons(null),
  manifest: '/site.webmanifest',
  ...APP_METADATA,
};

export const viewport: Viewport = ROOT_VIEWPORT;

export default function GlobalNotFound() {
  return (
    <RootHtml lang="tr" langFromPath>
      <BrandedNotFound detectLocaleOnClient />
    </RootHtml>
  );
}
