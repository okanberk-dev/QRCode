# Buaze handoff (updated 2026-11-26)

Nothing secret is in this file (env vars are named only). Everything below is in `main` unless stated.

## 1. State of the work
| Area | State |
|---|---|
| Checkout redirect fix, Clash Display fonts, company identity (NextGen Yazılım Ltd. Şti.) | Merged, live |
| Billing foundation + saved cards (`docs/specs/billing-spec-final.md`, PR 1-2) | Merged, live. All billing flags OFF by default |
| Auto-renew charge engine (PR 3) | Merged as WIP, OFF and dry-run by default so no card can be charged. Missing: see 2.1 |
| Menu Studio rebuild (`docs/specs/menu-spec-final.md`) | Merged, QA done |
| Public menu designs + owner design options (`docs/specs/menu-design-final.md`) | Merged. Review re-done and fixed 2026-11-21 (CLAUDE.md §38.263); 12 presets screenshotted at 390 px + 3 at 1440 px. Remaining: see 2.2 |
| Deploy fix: `PAYNKOLAY_ENV` inferred from an allow-listed `PAYNKOLAY_BASE_URL` | Merged, live (`7d33c76`) |
| `/api/health?db=1` probe (times 3x `SELECT 1`, shows port + param NAMES only) | Merged, live |
| Marketing site redesign to the "Ritim" design package (CLAUDE.md §62, `docs/design/MARKETING_DESIGN.md`) | On branch `claude/bold-keller-1vblyz` (2026-11-26), not merged. Video slots empty (`src/components/marketing/ritim/media.ts`); brand ramp = package green (7 lines in `ritim.css`) |

## 2. Remaining work

### 2.1 Auto-renew (billing PR 3)
Do NOT turn `PAYNKOLAY_AUTO_CHARGE` on before PayNKolay answers the sandbox questions (spec §16.4, §17). Left to build, in order:
1. Production mail templates for the three new mailer methods in `src/lib/billing/billing-mails.ts`: auto_notice (amount, card last4, charge date, both retry dates, off link); charge results (paid, refund_pending, attempt_1, attempt_2, final, hard, action_needed, unresolved); auto-renew changed (on with full consent text + off link, off_owner, off_price_increase, off_provider_missing, off_card_removed, card_replaced). Follow CLAUDE.md §21.34; never hardcode a company name (use `{{COMPANY_NAME}}`, `src/lib/legal/company-entity.ts`, or "Buaze"). Until these exist the engine can never send a notice, so it can never charge.
2. `src/lib/auth/billing-step-up.ts` (spec D14: TOTP / password / fresh Google sign-in, `bz_bsu` cookie) and `POST /api/billing/step-up`.
3. `POST /api/billing/auto-renew` (spec §8.3): enable needs step-up + verified card + server-rebuilt offer (409 `terms_changed`), one transaction writes the consent row, binds the card and moves the open renewal to auto; disable is one click.
4. Off-only link: `POST /api/billing/auto-renew/off-link` and the page `/billing/[locale]/auto-renew-off` (GET has no side effect).
5. `card-api`: return the offer, step-up method and enable path; a `needs_action` renewal returns to `retry_wait` when the unbound card is removed or a `replace_card` is verified.
6. Panel UI (Pulse, accessible, 375 and 1440 px): AutoRenewControl, AutoRenewConsentModal, RenewalNotice banner; TR/EN copy from spec §13.
7. Then 3 independent reviews (double-charge/state machine, consent/security, spec/UX), fixes, browser QA.

### 2.2 Public menu designs
Done 2026-11-21 (§38.263): the lost review was redone (9 code + 15 visual findings, fixed and re-reviewed). Still open: QA at 768 px, low-contrast accent picks and the read-only viewer; a look at a few live menus.

Finish the review fixes of the 2 reviews (safety, visual) on the merged code, then browser QA at 375/768/1440 of every preset and of the studio design panel (colours incl. low-contrast picks, fonts, layout, radius, density, cover, apply/reset, read-only viewer). Check no Clash Display on `/menu/*` (licence) and that old restaurants (only `menuTheme` + accent + logo) still look right. Look at a few live menus first: this redesign changes what every diner sees.

### 2.3 Panel speed: DB round trips (task prompt for another chat)
Mostly done 2026-11-21 (§38.263): owner home 40 -> 16 SQL statements now run with bounded parallelism (`readAll`, `src/lib/db-batch.ts`, max 5) instead of one sequential `$transaction`; owner analytics and admin dashboard also on `readAll`; owner layout reads in parallel; admin restaurants / QR / member detail hydrate on the server; first-load JS of owner home 422 -> 256 kB. Left from the list below: the other `$transaction` arrays (report, restaurants, account, platforms, APIs), and the owner port change.

Audit done (branch `perf/db-roundtrips` exists locally with no commits; recreate from main). Findings:
- Live `SELECT 1` takes 500-600 ms (`/api/health?db=1`) although app and DB are both in Frankfurt. `DATABASE_URL` still uses port 6543 + `pgbouncer=true`.
- **Done 2026-11-24 in code** (`src/lib/database-url.ts`): the app derives the 5432 session-pool address from the stored URL (connection_limit 5); measured on the server 467 ms -> 95 ms per query. The app is in Frankfurt but the database is in us-east-1 (~95 ms per round trip), so moving the database to eu-central-1 is the remaining big win. Revert: `DATABASE_POOL_MODE=transaction`.
- (Old note) **Do first (owner action, Coolify):** in the Production env var `DATABASE_URL` change `:6543` to `:5432`, delete `pgbouncer=true`, keep `connection_limit=10`; redeploy; re-measure `/api/health?db=1`. If `selectOneMs` drops to single digits, most of the slowness is gone and 2.3 gains shrink. Do not use `DIRECT_URL` (may be IPv6-only). Revert by setting the port back to 6543.
- The code issue: `prisma.$transaction([...])` array form runs queries sequentially, one round trip each plus BEGIN/COMMIT (75 places; history: pooler `connection_limit=1`, CLAUDE.md §14). With `connection_limit=10` `Promise.all` is safe (chunk big arrays).
- No N+1 on page paths (only two seed scripts). No `unstable_cache` / `"use cache"` anywhere. All panel pages are `force-dynamic`.

Route table (sequential round trips, static count; 500 ms each assumed):
| Route | Queries | Seq. RTs now | Fix |
|---|---|---|---|
| `[locale]/dashboard` layout (every panel page) | 4-6 | 3 (+0-2) | owner: user ∥ restaurants(`where userId`) ∥ announcements ∥ site settings = 1 RT; team member 2 RT |
| `dashboard` (owner home) | ~36 | ~31-37 | 24-query array (line ~239) to chunked `Promise.all`; scope+user+restaurants one step; 4-query array (line ~904) |
| `dashboard/analytics` | 4-5 | 4 | user ∥ scope; two windows `Promise.all` |
| `dashboard/restaurants` | 6-7 | 5-6 | array at line ~80 |
| `dashboard/restaurants/report` | 8-10 | 9 | 7-query array at line ~77 |
| `dashboard/account`, `platforms` | 3-4 | 4-5 | scope then small arrays |
| `dashboard/qr`, `menu`, `google-reviews` | 2-3 | 2-3 | skip scope query for owners (`where userId`) |
| `admin/dashboard` | ~21 | ~27 | 11- and 7-query arrays (lines ~95, ~255) |
| `menu/[slug]` (public) | 2 | 2 | `cache()` so `generateMetadata` + page share one query; `searchParams` makes the route dynamic despite `revalidate=3600` |
Biggest API arrays: `analytics/menu` (10), `restaurants/[id]` (8, 8), `admin/audits/stats` (8), `weekly-digest-runner` (8), `admin/restaurants/[id]/overview` (7).
- Caching: no new shared cache for panel routes (all per-user/per-business). Marketing/legal pages already use `revalidate`.

Prompt rules for that chat: branch `perf/db-roundtrips`; no .env/deploy/schema/migration changes; no secrets; small commits that say how many queries each route lost; keep per-user data out of shared caches; measure before/after with Prisma query logging locally (not committed); build, lint, tests green; report route | before | after | estimated gain; do not push without review.

## 3. Owner actions
- PayNKolay (application sent): card storage permission ("kart saklama yetkisi"), Non-Secure (3D'siz) permission with a limit, hosted-page logo, separate Buaze merchant (spec D16).
- Coolify: `DATABASE_URL` port change (2.3). Before any billing flag: spec §16 gate G0 — `BILLING_VAULT_KEY` + `BILLING_HMAC_KEY` generated and backed up offline, `NEXT_PUBLIC_SITE_URL` set explicitly, `scripts/billing-bind-env.ts`, hourly Coolify scheduled task for `/api/cron/billing-renewals` (`25 * * * *`).
- Legal: contract text now names NextGen Yazılım Ltd. Şti.; decide whether existing users need notice (version numbers did not change). Registry number "Kuruluş 2023" on /about vs tax-certificate start date 25.06.2026. Trade registry no., KEP, chamber, IBAN are empty in both repos.
- Google (owner says set up): before changing Google gates (CLAUDE.md §5.1.1-5.1.2) say which parts were done.
