import '@/app/globals.css';
import { prefetchDNS } from 'react-dom';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import CookieConsentBanner from '@/components/legal/LazyCookieConsentBanner';
import ConditionalAnalytics from '@/components/legal/ConditionalAnalytics';
import { rootFontClassName, rootBodyFontClassName } from './fonts';

/**
 * The <html>/<body> shell shared by every root layout.
 *
 * The app has several root layouts instead of one `app/layout.tsx`: the
 * `[locale]` layout is a root layout so it can server-render
 * `<html lang="en">` for /en pages (a single root layout above `[locale]`
 * cannot see the locale without reading headers(), which would make the ISR
 * marketing tree dynamic). Every other top-level segment (admin, r, menu, s,
 * embed, audits, dashboard, the `/` fallback) has its own small root layout
 * that renders this same shell. Navigating between two root layouts is a
 * full page load (Next.js), which only happens between the site and the
 * admin panel or a public QR page.
 *
 * `secure` (the billing pages, billing spec D12 / §3.4): the pages that hand
 * the owner to PayNKolay's card page run NO third-party script — no
 * analytics (GA, Yandex), no cookie banner, no Vercel scripts, no DNS hints
 * to third parties. Only Next.js chunks and the first-party Sentry SDK load,
 * under the nonce CSP set by src/middleware.ts.
 */
export default function RootHtml({
  lang,
  langFromPath = false,
  secure = false,
  children,
}: {
  lang: 'tr' | 'en';
  /** Only for global-not-found, which cannot know the locale on the server:
   *  switches `lang` to "en" for /en URLs before the first paint. */
  langFromPath?: boolean;
  /** Payment hand-off pages: render no third-party script or component. */
  secure?: boolean;
  children: React.ReactNode;
}) {
  if (secure) {
    return (
      <html lang={lang} className={rootFontClassName}>
        <body
          className={`${rootBodyFontClassName} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-dvh`}
        >
          {children}
        </body>
      </html>
    );
  }

  // Resource hints. Fonts are self-hosted by next/font, so no Google Fonts
  // connections are needed. GTM and Yandex load only after analytics consent
  // (ConditionalAnalytics, lazyOnload), so a full preconnect would usually be
  // wasted — dns-prefetch is enough. React hoists these into <head>.
  prefetchDNS('https://mc.yandex.ru');
  prefetchDNS('https://www.googletagmanager.com');

  // VERCEL=1 is set by Vercel at build and run time; absent on Coolify.
  const onVercel = process.env.VERCEL === '1';

  return (
    <html lang={lang} className={rootFontClassName} suppressHydrationWarning={langFromPath}>
      <body
        className={`${rootBodyFontClassName} antialiased bg-[var(--color-background)] text-[var(--color-text-main)] min-h-dvh`}
      >
        {langFromPath && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if(/^\\/en(\\/|$)/.test(location.pathname))document.documentElement.lang='en';",
            }}
          />
        )}
        {/* KVKK + ePrivacy opt-in: GA and Yandex load only after analytics
            consent (Stage 31b §38.108). */}
        <ConditionalAnalytics />
        {children}
        {/* Cookie consent banner — hidden inside /embed iframes; locale is
            detected on the client (Stage 31d §38.110). */}
        <CookieConsentBanner />
        {/* Vercel telemetry: Speed Insights (Web Vitals) + Analytics (page
            views). Both are cookieless. Web Analytics must also be enabled
            in the Vercel project settings to collect data. CLAUDE.md §31.
            Only on Vercel: self-hosted (Coolify) there is no /_vercel/insights
            endpoint, so the scripts would 404 on every page view. */}
        {onVercel && <SpeedInsights />}
        {onVercel && <Analytics />}
      </body>
    </html>
  );
}
