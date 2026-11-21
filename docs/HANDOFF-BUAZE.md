# Buaze handoff (updated 2026-11-21)

Nothing secret is in this file (env vars are named only). Everything below is in `main` unless stated.

## 1. State of the work
| Area | State |
|---|---|
| Checkout redirect fix, Clash Display fonts, company identity (NextGen Yazılım Ltd. Şti.) | Merged, live |
| Billing foundation + saved cards (`docs/specs/billing-spec-final.md`, PR 1-2) | Merged, live. All billing flags OFF by default |
| Auto-renew (PR 3) | Built and reviewed on `claude/vigilant-cannon-2qaqyh`: mails, step-up (`bz_bsu`), `POST /api/billing/auto-renew`, off-only link + page, card-api offer, panel switch + consent dialog, 3 reviews fixed, browser QA 375/1440. Still OFF / dry-run by default; turn on only after the PayNKolay sandbox answers (spec §16.4, §17) |
| Menu Studio rebuild (`docs/specs/menu-spec-final.md`) | Merged, QA done |
| Public menu designs + owner design options (`docs/specs/menu-design-final.md`) | Review fixes and browser QA of every preset done (same branch) |
| Panel speed: DB round trips | Done (same branch): `parallelReads` (`src/lib/db-parallel.ts`), owner home about 39 → 5 sequential round trips, admin home and other pages similar. Coolify port change (3) still gives the biggest win |
| Panel design system (NICKLPASS metrics, Pulse colours, DM Sans) | Foundation + owner/admin home applied (same branch). Rules: `docs/design/panel-design-system.md`, CLAUDE.md §53 |
| Deploy fix: `PAYNKOLAY_ENV` inferred from an allow-listed `PAYNKOLAY_BASE_URL` | Merged, live (`7d33c76`) |
| `/api/health?db=1` probe (times 3x `SELECT 1`, shows port + param NAMES only) | Merged, live |

## 2. Remaining work
- Auto-renew low-risk items left on purpose: TOTP code replay within its 30 s window, the off-link is not one transaction with the off mail, the engine and a D6 card-change amendment can race (the engine re-reads under lock; worst case one extra notice), the `on` confirmation mail is not retried, `card_replaced` can go out at night.
- Pre-existing, not from this work: changing the e-mail address needs no re-entry of the password (auto-renew now blocks 7 days after a change), the cookie banner sits above dialogs on phones.
- Menu: Newsreader and Fraunces are over the 150 KB font budget; Clash Display is downloaded on `/menu/*` through `RootHtml` (not used there, licence-safe, but wasted bytes).
- Panel design: apply `FeatureCard` / `ListRow` / `MetaBar` to the remaining pages page by page (QA list in the design doc §6).

## 3. Owner actions
- PayNKolay (application sent): card storage permission ("kart saklama yetkisi"), Non-Secure (3D'siz) permission with a limit, hosted-page logo, separate Buaze merchant (spec D16).
- Coolify: `DATABASE_URL` port change (2.3). Before any billing flag: spec §16 gate G0 — `BILLING_VAULT_KEY` + `BILLING_HMAC_KEY` generated and backed up offline, `NEXT_PUBLIC_SITE_URL` set explicitly, `scripts/billing-bind-env.ts`, hourly Coolify scheduled task for `/api/cron/billing-renewals` (`25 * * * *`).
- Legal: contract text now names NextGen Yazılım Ltd. Şti.; decide whether existing users need notice (version numbers did not change). Registry number "Kuruluş 2023" on /about vs tax-certificate start date 25.06.2026. Trade registry no., KEP, chamber, IBAN are empty in both repos.
- Google (owner says set up): before changing Google gates (CLAUDE.md §5.1.1-5.1.2) say which parts were done.
