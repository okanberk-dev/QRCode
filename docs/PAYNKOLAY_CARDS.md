# PayNKolay saved cards — operator notes

Spec: `billing-spec-final.md` (§3.4, §16). Code map: CLAUDE.md §44.3–§44.4.

## Script inventory of the billing pages (§3.4, SAQ A)

Pages that start or end the hand-off to PayNKolay's hosted card page:
`/billing/{tr,en}/checkout`, `/billing/{tr,en}/result` and the hand-off page answered by
`POST|GET /api/billing/paynkolay/checkout`.

Allowed script sources:

| Page | Allowed scripts | Policy |
|---|---|---|
| `/billing/*` | Next.js chunks under `/_next/static/*` and Next.js inline payloads, all carrying the per-request nonce; the first-party Sentry SDK (tunnelled through `/monitoring`, no Session Replay) | `src/lib/billing/page-csp.ts` (`script-src 'nonce-…' 'strict-dynamic'`), set by `src/middleware.ts` |
| hand-off page | exactly one inline script, `INTERSTITIAL_SCRIPT`, allowed by its SHA-256 | `interstitialCsp()` in `src/lib/billing/checkout-interstitial.ts` |

Forbidden on these pages: Google Analytics / Tag Manager, Yandex Metrica, the cookie banner, ContactFloat,
`@vercel/analytics`, `@vercel/speed-insights`, any third-party `<script src>`. Enforced by
`tests/billing-pages-boundary.test.ts` and `tests/billing-checkout-interstitial.test.ts`.

## Sandbox results (fill in during phase 1, §16.2)

| Item | Result | Date / ticket |
|---|---|---|
| Q-1 `csAutoSave` + `csCardAlias` honoured, alias round-trips | _pending_ | |
| Q-9 `Token` / `TranId` stable → `CARD_IDENTITY_STRATEGY` | _pending_ (default `composite`) | |
| §16.2-3 saved card offered with `customerKey` only → `PAYNKOLAY_HOSTED_CARD_SELECT` | _pending_ (off) | |
| Q-10 / Q-21 delete success value, permanent erasure | _pending_ | |
| Q-18 hosted-form tamper test | _pending_ | |
| Q-2 dedicated merchant (D16), Q-23 SAQ determination (gate G2) | _pending_ | |
