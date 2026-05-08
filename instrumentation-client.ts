import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // KVKK / GDPR: do not auto-send IP addresses or user-identifiable
    // headers. Replay still masks all text + blocks media (defaults).
    sendDefaultPii: false,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    // No background session replay — only capture replays when an error
    // fires. Reduces Sentry quota burn and customer privacy footprint.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    // Pin the deployed commit so client-side errors land in the right
    // Sentry "Release Health" view. Vercel injects
    // NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA on every build; falls through to
    // undefined on local dev so Sentry just labels events as "unknown
    // release" instead of all-collapsing under one bogus tag.
    // Server / edge config already set this from VERCEL_GIT_COMMIT_SHA.
    // CLAUDE.md §34.16.
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    integrations: [Sentry.replayIntegration()],
    beforeSend(event, hint) {
      const original = hint.originalException;
      const originalMessage =
        original instanceof Error
          ? original.message
          : typeof original === 'string'
            ? original
            : '';
      const exceptionText = (event.exception?.values ?? [])
        .flatMap((value) => [
          value.type,
          value.value,
          ...(value.stacktrace?.frames ?? []).map((frame) => frame.filename),
        ])
        .filter(Boolean)
        .join('\n');
      const fingerprint = [
        event.message,
        originalMessage,
        exceptionText,
      ].filter(Boolean).join('\n');

      // Browser extensions can inject scripts into admin pages and throw
      // errors from `app:///scripts/inpage.js` (MetaMask is the noisy one
      // observed in Sentry on 2026-05-02). Drop those without hiding real
      // Buaze bundle errors.
      if (
        /MetaMask extension not found/i.test(fingerprint) ||
        /Failed to connect to MetaMask/i.test(fingerprint) ||
        /app:\/\/\/scripts\/inpage\.js/i.test(fingerprint) ||
        /chrome-extension:\/\//i.test(fingerprint) ||
        /moz-extension:\/\//i.test(fingerprint)
      ) {
        return null;
      }

      // CLAUDE.md §38.29 — React Suspense streaming reveal collision
      // ("$RS" minified frame is React DOM's revealStyleOrUnknown). When
      // Google Translate / Grammarly / iOS Reader / similar DOM mutators
      // remove Suspense placeholder nodes between SSR and client reveal,
      // React loses its anchor and throws `Cannot read properties of null
      // (reading 'parentNode')`. Not actionable from our code; user sees
      // a blank section that recovers on reload. Filter narrowly: must
      // be parentNode null AND stack contains $RS (React's minified
      // streaming reveal function). Real Buaze parentNode bugs would
      // have different stack frames (component name visible).
      const isReactRevealCollision =
        /Cannot read propert(?:y|ies) of null \(reading 'parentNode'\)/.test(
          originalMessage,
        ) && /\$RS\b/.test(exceptionText);
      if (isReactRevealCollision) {
        return null;
      }

      // CLAUDE.md §38.156 — Browser extension JSON-LD parse fail.
      // Some extensions (Honey, AI scrapers, ad blockers, SEO tools)
      // walk the DOM looking for schema.org JSON-LD blocks and call
      // `r["@context"].toLowerCase()` without checking that the block
      // is well-formed. Buaze JSON-LD is well-formed (CLAUDE.md §35.6 +
      // §37.6 `jsonLdString` helper escapes properly), but if a 3rd
      // party script injects malformed JSON-LD or runs against a stale
      // DOM snapshot, the extension throws and Sentry's global onerror
      // captures it. Not actionable. Filter narrowly: must match the
      // exact `["@context"].toLowerCase` substring (browser extension
      // signature, never appears in Buaze code).
      const isJsonLdContextNoise =
        /\["@context"\]\.toLowerCase/i.test(fingerprint) ||
        /'@context'\.toLowerCase/i.test(fingerprint);
      if (isJsonLdContextNoise) {
        return null;
      }

      return event;
    },
  });
}

// Required for Next.js 15 router transition tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
