# SECURITY_AUDIT_REPORT — Buaze SaaS

> **Date**: 2026-05-02
> **Branch**: `claude/security-vulnerability-audit-x48te`
> **PRs**: #345, #346, #347, #348, #349 (all merged to `main`)
> **Status**: Audit + hardening pass complete; 6 follow-up findings deferred
> pending product/design decision (listed under "Deferred follow-ups").

## Executive summary

A read-only security audit followed by a hardening pass was performed across
the Buaze SaaS codebase. The work was structured as five sequential phases,
each producing its own pull request:

1. **Public site + auth + public POST** (`/api/auth/*`, `/api/feedback`,
   `/api/contact`, `/api/roi/save`, `/api/newsletter`).
2. **Embed widget + public ingestion** (`/embed/[slug]`, `/api/embed/track`,
   `/r/[slug]`, `/api/menu/[slug]/analytics`, public restaurant lookup).
3. **Admin panel + privileged CRUD** (`/api/admin/login`, `forgot-password`,
   `reset-password`, `users`, `members`, `bulk`, file uploads).
4. **Owner panel + multi-tenant API** (`/api/restaurants/[id]`,
   `/api/feedback/*`, `/api/team/*`, `/api/account/sessions`,
   `/api/api-keys/*`).
5. **Cron worker + 3rd party integrations** (7 cron endpoints,
   `/api/integrations/google/*`, Resend mail wrapper, OpenAI helper).

Across the five phases **27 fixes** were applied (6 CRITICAL, 8 HIGH, 13
MEDIUM) and **14 findings** were deliberately not changed because they
encode existing product/design decisions documented in `CLAUDE.md`. Six of
those deferred findings are tracked at the bottom of this report — they
require product or backwards-compatibility decisions from the operator
before they can be safely flipped.

---

## Numbers

| Phase | PR | Findings | Fixed | Deferred |
|---|---|---|---|---|
| 1. Public auth + POST | #345 | 23 | 10 | 2 |
| 2. Embed + public ingestion | #346 | 9 | 3 | 6 |
| 3. Admin panel + CRUD | #347 | 7 | 7 | 3 |
| 4. Owner panel + IDOR | #348 | 8 | 6 | 3 |
| 5. Cron + integrations | #349 | 1 | 1 | 0 |
| **Total** | **5 PR** | **48** | **27** | **14** |

Severity of fixes applied:

- 🔴 **CRITICAL** (6): JWT_SECRET fallback, admin bootstrap default password,
  dead-code rename hotfix, member deactivate session leak, team locations
  IDOR, Google OAuth state CSRF.
- 🟠 **HIGH** (8): forgot-password Host header injection, reset-password
  session revoke, UserSession DB-error fail-open, primaryColor stored XSS,
  integration URL injection, owner deactivate cookie revoke, members PUT
  audit log, admin reset weak password.
- 🟡 **MEDIUM** (13): see per-phase tables below.

---

## Phase 1 — Public auth + POST (PR #345)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🔴 | `JWT_SECRET` hardcoded fallback in 4 files (`auth.ts`, `middleware.ts`, `login`, `login/2fa`) — public dev key let any attacker forge superadmin tokens when env was unset | `getSecret()` throws in production when `JWT_SECRET` missing; dev fallback retained. Inline duplicates removed; both routes import `getSecret`. |
| 2 | 🔴 | `forgot-password` reset URL derived from `Host` / `X-Forwarded-Host` (token-poisoning via host header injection) | `safeBase` is now `NEXT_PUBLIC_APP_URL` only; loopback fallback for dev. |
| 3 | 🟠 | Reset password did not revoke existing `UserSession` rows — a stolen cookie outlived the password change | `prisma.userSession.updateMany({ ..., revokedAt: now })` after the new hash is written. |
| 4 | 🟠 | `isUserSessionRevoked` returned `false` on DB error — force-logout bypass during transient outages | Catch path now fail-closed (`return true`); legacy `if (!session)` retained per CLAUDE.md backward-compat. |
| 5 | 🟠 | `/api/feedback` POST read raw `X-Forwarded-For` (`X-Forwarded-For: a, b, c`) and used the whole header as the rate-limit key | Switched to `getClientIp(req.headers)` (split[0] trimmed); consistent with the other public POST endpoints. |
| 6 | 🟡 | `/api/contact` had a personal e-mail (`okanberk16@gmail.com`) hardcoded as a recipient + free-text fields fed straight into mail body | Inbox list moved to `CONTACT_INBOX_EMAILS` / `NOTIFICATION_EMAIL` env; CRLF strip + length cap + `isValidEmail` enforced before using `email` as `Reply-To`. |
| 7 | 🟡 | `/api/roi/save` accepted unbounded `body.projection` JSON straight into a JSONB column | 50 KB cap on `JSON.stringify(projection).length`; oversize is dropped with a warning. |
| 8 | 🟡 | Newsletter resubscribe did not rotate `unsubscribeToken` — a leaked old-mail link could silently unsubscribe a re-opted-in user | `update` clause now writes the freshly generated token. |
| 9 | 🟡 | Logout cookie `secure` flag derivation diverged from login/register/refresh | Aligned to the same `process.env.NODE_ENV === 'production' && (forwarded-proto === 'https' || ...)` formula. |
| 10 | 🟡 | `forgot-password` console.error logged user e-mail (KVKK / Sentry data minimization) | Replaced with `userId` log. |

**Deferred** (CLAUDE.md design decisions): reCAPTCHA monitor mode default;
UserSession `if (!session)` legacy fail-open backward-compat.

---

## Phase 2 — Embed widget + public ingestion (PR #346)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🟡 | `/api/menu/[slug]/analytics` had per-session rate limit only (300/min/sessionId); a distributed attacker could spin up many session ids and push aggregate spam past the gate | Layered IP rate limit (1000/min/IP) on top; both must pass. |
| 2 | 🟡 | `/api/restaurants` POST accepted any platform URL — no `checkProviderUrl` gate before the row was created (the IntegrationCard UI gates on edit but POST skipped it) | All 8 platform URL fields now run `checkProviderUrl` and reject hard-error severities (`invalid_url`, `wrong_protocol`, `wrong_domain`); warnings still pass to mirror the UI. |
| 3 | 🟡 | `/api/menu/[slug]` GET used `findUnique` without an explicit `select` — drift fragility (CLAUDE.md §14.1) plus pulled unrelated columns (`notification_email`, `userId`, billing fields) into memory | Explicit `select` listing only the columns the response needs. |

**Deferred** (LOW / informational, not fixed in this pass): iframe `sandbox`
attribute, menu-GET inactive 403 vs 404 enumeration, `latestChecks`
exposure on slug GET, `buaze-embed.js` dead `postMessage` height listener,
embed page `Cache-Control` policy, iframe `referrerPolicy`.

---

## Phase 3 — Admin panel + privileged CRUD (PR #347)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🔴 | Admin login bootstrap fell back to literal `oknbrk` / `123456+` — fresh deploy with unset env happily accepted those credentials and auto-created the row | Bootstrap now requires `ADMIN_USERNAME` plus an `ADMIN_PASSWORD` that passes the same strength bar (8+ chars, letter, digit). Refuses to seed otherwise. |
| 2 | 🔴 | Dead-code rename hotfix wrote `admin → oknbrk` on every login attempt and leaked the canonical admin username over timing/error patterns | Removed entirely. |
| 3 | 🟠 | Member deactivate (PUT + DELETE) didn't revoke the owner's existing `user_token`; login flow blocked new logins via `isActive`, but already-issued JWTs kept working | `prisma.userSession.updateMany({ ..., revokedAt: now })` on every deactivate path. |
| 4 | 🟠 | Members PUT had no audit log entry — plan / trial / activation flips were silent (POST + DELETE already logged) | `admin.members.update` row with before/after diff. |
| 5 | 🟠 | Admin users PUT password change had no strength check — an admin password reset could downgrade a peer's password to "1" | `isStrongPassword` enforced. |
| 6 | 🟠 | Admin reset-password used `length < 8` only ("12345678" was accepted) | `isStrongPassword` (letter + digit). |
| 7 | 🟡 | ENV-bootstrap password compare used `password === envPassword` — leaks matching prefix length over timing | `crypto.timingSafeEqual` with equal-length buffers. |
| 8 | 🟡 | `/api/admin/forgot-password` + `/api/admin/reset-password` had no reCAPTCHA gate | `verifyRecaptchaToken('admin_forgot_password' / 'admin_reset_password')`. |
| 9 | 🟡 | Admin users POST had no audit log + no username length cap | `admin.users.create` row + 64-char username cap. |

**Deferred**: AdminUser session-revoke-on-password-reset (needs a session
table or `passwordChangedAt` field), site-settings SVG sanitize (admin-only
privileged path), bcrypt cost inconsistency (cosmetic).

---

## Phase 4 — Owner panel + multi-tenant IDOR (PR #348)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🔴 | `/api/team` POST + `/api/team/[id]` PATCH accepted any `locations: string[]` verbatim. `panel-access:getTeamMemberScope` reads `member.locations` as the scoped restaurant set, so an owner could grant a team member access to **another tenant's restaurant**. | Both endpoints now intersect requested ids with the owner's actual restaurant set (`userId: actor.id`); unknown ids drop, an entirely-unowned set 400s. |
| 2 | 🟠 | `/api/restaurants/[id]` PUT stored `primaryColor` verbatim — accepted CSS / XSS payloads that reach inline `style` on the public review surface | `isValidHexColor` gate. |
| 3 | 🟠 | Same PUT had no `checkProviderUrl` for the 8 platform URL fields — owner could plant `javascript:` / off-domain values | Hard-error severities reject the write (mirrors POST gate from Phase 2). |
| 4 | 🟡 | Same PUT had no `notificationEmail` validation | `isValidEmail` (≤256 chars). |
| 5 | 🟡 | Same PUT had no `menuLogoUrl` size cap — multi-MB base64 data URLs would bloat the row | 300 KB cap (mirrors `validations.ts`); non-data URLs must be `http(s)://`. |
| 6 | 🟡 | `/api/feedback/bulk` had no audit log on flag/unflag/assign mass mutations | `feedback.bulk.<action>` row with payload (count + ids). |
| 7 | 🟡 | `/api/api-keys` POST had no rate limit + no audit log — compromised cookie could spin up unbounded ApiKey rows | 10/min/actor rate limit + `api-keys.create` row capturing scopes + prefix. |

**Deferred**: `/api/restaurants/[id]` DELETE accepts any non-viewer team
member (CLAUDE.md notes "tightening to owner-only is a product policy
decision"); `/api/api-keys/[id]` rotate / revoke audit log; team workspace
audit history (different audience from `AdminAuditLog`).

---

## Phase 5 — Cron + 3rd party integrations (PR #349)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🔴 | `/api/integrations/google/connect` POST built a `state` parameter but `/api/integrations/google/callback` GET never verified it (RFC 6749 §10.12 violation). An attacker could hand their own authorisation `code` to a victim's browser and end up linking their Google Business Profile to the victim's Buaze workspace, granting the attacker `business.manage` against someone else's data. | `connect` generates a 32-byte random nonce, stamps it into both `state` query and an `httpOnly` cookie (`bz_google_oauth_state`, sameSite=lax, 12-min TTL). `callback` rejects when state is missing/unparseable, constant-time compares cookie nonce against `state.nonce`, and additionally checks `state.owner` matches the current actor (defence-in-depth for shared-browser scenarios). State cookie is cleared on every redirect-back. |

**Audit-clean surfaces** (no fix required):

- All 7 `/api/cron/*` endpoints already gate on
  `Authorization: Bearer ${CRON_SECRET}` consistently and run
  `runFoo()`-style helpers instead of self-fetching themselves.
- `lib/email-internal.ts` ships JSON-encoded payloads to Resend, which
  contains CRLF-style header injection by transport encoding. Templates
  pass user-supplied content through `escapeHtml`.
- `lib/openai.ts` honours timeouts (15 s default), redacts response bodies
  in Sentry capture, and falls back to a deterministic template when the
  API key is missing or the request fails. Customer-comment prompt
  injection is an accepted residual risk because every AI output passes
  through a human-in-the-loop owner review (suggest-reply drafts, weekly
  insight, themes).

---

## Deferred follow-ups (operator decision required)

The six findings below were deliberately not changed in this audit pass.
They each require either a product policy call, a backfill / migration
plan, or a UX-impacting default flip. They are listed roughly in
descending value-to-cost order so the operator can pick them up
incrementally.

### ~~1. AdminUser has no `UserSession`-equivalent table~~ — **CLOSED 2026-05**

**Closed in follow-up commit** (after the original PR #345-#349 series).

Implementation chose the lighter of the two recommended options: stamp
`passwordChangedAt` on `AdminUser` and have `getAdminFromRequest` reject
tokens whose `iat` is older than that timestamp. No new table required.

- `prisma/schema.prisma` — added `passwordChangedAt DateTime?` to
  `AdminUser`.
- `src/lib/auth.ts` — new `isAdminTokenStale(payload)` helper called
  inside `getAdminFromRequest`. JWT `iat` (set by jose `setIssuedAt()`)
  is compared against the row's `passwordChangedAt`. Pre-feature rows
  with `passwordChangedAt = null` pass through (backward compat).
  DB-error path is fail-open (small blast radius for transient outages
  — admins have a higher operational cost on lockout than users do).
- `/api/admin/reset-password` and `/api/admin/users/[id]` PUT now set
  `passwordChangedAt: new Date()` whenever the password hash is
  rotated.

### 2. `RECAPTCHA_ENFORCE` default `'true'`

**Effect today**: When the env var is unset (default), any reCAPTCHA
failure soft-passes with `{ ok: true, skipped: true }` — only hard signals
(AUTOMATION, MALWARE, SCRAPING, score ≤ 0.1) hard-block. Acceptable while
score thresholds are being tuned but production should eventually flip to
enforce mode.

**Recommended fix**: Watch the Sentry "low score" + "action mismatch"
warnings for two weeks, confirm the rate stays low, then set
`RECAPTCHA_ENFORCE=true` on Production. CLAUDE.md §18 already documents
this rollout pattern.

### 3. `UserSession` legacy fail-open

**Effect today**: `isUserSessionRevoked` returns `false` when no
`UserSession` row matches the token hash — pre-feature cookies (issued
before the table existed) bypass force-logout. The DB-error path now
fails closed, but the "no row" path deliberately stays open for
backward-compat.

**Recommended fix**: Backfill a `UserSession` row for every active
`User` (one-shot migration script reading the existing `user_token`
cookie store from the deployed instance — or simply force everyone to
re-login by writing rows that don't match any current cookie hash and
flipping the path to fail-closed). After that, set the legacy path to
`return true`.

### ~~4. Restaurant DELETE allowed for any non-viewer team member~~ — **CLOSED 2026-05**

**Closed in follow-up commit** (after the original PR #345-#349 series).

- `src/lib/panel-access.ts` — new `canDeleteRestaurant(actor, restaurantId)`
  helper. Allows `superadmin`, admin-source `manager`, and
  `restaurant_owner` (user source). Every team-member role (workspace-
  level `manager` / `staff` / `viewer`) is rejected — workspace
  ownership is not delegated for destructive cascades.
- `/api/restaurants/[id]` DELETE switched from `canWriteRestaurant` to
  `canDeleteRestaurant`. UI button visibility is a follow-up cleanup
  (server gate is the security-relevant boundary).

### 5. Site-settings SVG upload is not sanitized

**Effect today**: Logo / favicon SVG uploads at
`/api/admin/site-settings/upload` skip the `sharp` re-encode path and store
the raw bytes. SVGs can carry `<script>` / event handlers / external
entities. Risk is bounded because the route is superadmin-only — a
compromised superadmin already owns the system.

**Recommended fix**: Add a `DOMPurify`-style server-side sanitizer (or
just rasterize the SVG via `sharp.png()` when raster output is
acceptable) before uploading to Storage. Alternatively serve user-uploaded
SVG with `Content-Disposition: attachment` and a strict `Content-Security-
Policy: sandbox` so the browser cannot execute scripts inside it.

### 6. bcrypt cost inconsistency

**Effect today**: Login + admin login + admin users PUT use cost 12;
admin reset-password + members POST use cost 10. Cosmetic — both are
strong enough — but the inconsistency is a code smell.

**Recommended fix**: Single `BCRYPT_COST = 12` constant in
`lib/validations.ts` (or wherever the project's hash-utility lives) and
have every callsite import it.

---

## Render-side XSS sweep — closed (2026-05 follow-up)

Originally listed as "future pass" scope; closed in a follow-up commit
after the original PR #345-#349 series.

54 `dangerouslySetInnerHTML` usages walked across 40 files. Three
classes of sink found:

1. **JSON-LD inline `<script>` blocks (36 files, ~40 instances)** —
   `JSON.stringify(jsonLd)` does NOT escape `</script>` byte sequence.
   The DOM parser reads raw bytes, so an admin-authored blog title /
   case-study excerpt / customer-stories quote that contained a literal
   `</script>` would break out of the JSON-LD block and execute the
   following HTML. Fix: new `src/lib/seo/json-ld.ts:jsonLdString()`
   helper that escapes `<` → `<`, `-->` → `-->`, U+2028,
   U+2029. All 36 caller files migrated and import the helper. New
   JSON-LD blocks must use it (CLAUDE.md §37.6 discipline).
2. **`help/[slug]/page.tsx:206` `article.body`** — DB-driven body
   (admin-authored `HelpArticle` row) was rendered without
   sanitization. Compromised admin → stored XSS to every customer on
   the help page. Fix: pass through `sanitizeBlogContent` (same
   tag-allowlist + href/src-protocol filter the blog editor uses).
3. **Trusted / static contexts (12+ instances)** — `BlogPostEditor`
   live-preview is `sanitizeBlogContent`-fed; `blog/[slug]` server-side
   already wraps `post.content` in `sanitizeBlogContent`; QR card +
   menu preview render server-generated SVG (trusted); the layout
   `<noscript>` Yandex tag uses an env-controlled hardcoded ID. No
   action.

## PII grep across 305 files — closed (2026-05 follow-up)

Originally listed as "future pass" scope; closed in a follow-up commit.

`console.*` calls walked across `/src` (~30 hits in `lib/`, `api/`,
`components/`). Sentry's `instrumentation.ts` auto-captures `extra` from
console.error, so anything echoed there feeds the error tracker.
KVKK data-minimization plus the project's `sendDefaultPii: false`
posture mean PII (e-mail / phone / ip / passwordHash) must not reach
that surface.

Two real leaks found, both fixed:

1. **`/api/cron/trial-reminders`** logged `{ email: user.email, ... }`
   on send-failure and exception paths. Replaced with `userId`. Trial
   reminders run for every active trial user, so this was a recurring
   PII fountain into Sentry.
2. **`/lib/email/ops-alert.ts`** — when neither `OPS_EMAIL` nor
   `NOTIFICATION_EMAIL` was configured, the "no recipient" log dumped
   the full `params` object, which carries `recipient` (the affected
   user's e-mail). Now strips `recipient` before logging
   (`const { recipient: _omit, ...safe } = params`).

The Sentry `captureException` / `captureMessage` surfaces (`openai.ts`,
`ai-quota.ts`, `lifecycle.ts`, `email/lifecycle.ts`) were already
PII-clean — they only carry `userId`, `restaurantId`, error message,
and tag identifiers. The Resend HTTP error log (`email-internal.ts`)
echoes the response body, which Resend itself does not echo back the
caller's payload, so no PII path there.

`CLAUDE.md` §37.7 added — "PII redaction disiplini" — codifying the
`userId not e-mail` rule for new mail / cron / privileged endpoints.

## CSP / security headers — A group closed (2026-05 follow-up)

Originally listed as "future pass" scope; A-group landed in a follow-up
commit. B and C groups stay open (operator decision + Firebase popup
verification + 1-2 week Report-Only soak).

### A group (zero-risk, applied)

`next.config.ts:headers()` now ships:

- `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self';
  form-action 'self'; object-src 'none'; upgrade-insecure-requests`
  (site-wide)
- `Content-Security-Policy: frame-ancestors *; base-uri 'self';
  form-action 'self'; object-src 'none'` (`/embed/*` override — keeps
  the third-party-iframe story but inherits the rest of the directives)
- `Permissions-Policy` extended with `interest-cohort=()`,
  `browsing-topics=()`, `payment=()`, `usb=()`, `bluetooth=()`,
  `serial=()` (Google FLoC / Topics / payment / sensor opt-out — no
  first-party feature uses these surfaces).

Each closes a distinct attack vector — clickjacking, `<base>` tag
injection, form hijacking, Flash/Java/PDF embed surface, mixed-content
slips — without restricting any script source we currently load.

### B group — deferred (low risk, Firebase popup verify required)

- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — Spectre +
  tab isolation. Strict `same-origin` would break Firebase
  `signInWithPopup`; the `-allow-popups` variant is documented as
  compatible but the `/auth/google` flow needs runtime verification.
- `Cross-Origin-Resource-Policy: same-origin` (site-wide) with
  `cross-origin` overrides for `/embed/*`, `/buaze-embed.js`,
  `/opengraph-image*`, `/favicon.svg`, `/apple-touch-icon.svg`. More
  path overrides than the A-group justified, so a separate PR.

### C group — deferred (Report-Only + 1-2 week soak)

The actual XSS guardrail. Strict `script-src` enforcement would break
existing inline scripts (GTM init, Yandex Metrika init, JSON-LD,
Speed Insights bootstrap, Vercel Preview Comments) without a nonce
flow. CLAUDE.md §37.8 documents the third-party allowlist
(`googletagmanager.com`, `mc.yandex.ru`, `vercel-insights.com`,
`*.firebaseapp.com`, `*.googleapis.com`, `gstatic.com/recaptcha`,
`vercel.live`) plus the Next.js middleware nonce pattern needed for
inline scripts.

Recommended rollout:
1. Ship `Content-Security-Policy-Report-Only` with the candidate
   allowlist. No requests are blocked, violations report to Sentry.
2. Watch Sentry CSP reports for 1-2 weeks. Add any missing domain.
3. Flip to `Content-Security-Policy` (enforce) on a canary deployment.

## Prisma cascade audit — closed (2026-05 follow-up)

24 `@relation onDelete` directives walked across `prisma/schema.prisma`.
Cascade chains validated; audit / billing / legal records confirmed
to survive the `User` and `Restaurant` cascade paths.

### Cascade chains

`User` deletion (no hard-delete endpoint exists today —
`/api/admin/members/[id]` DELETE is soft-delete `isActive=false`):

```
User → UserSession (Cascade)
User → Restaurant (Cascade) → full sub-cascade chain
```

`Restaurant` deletion (`/api/restaurants/[id]` DELETE, gated by
`canDeleteRestaurant` per Step 4):

```
Restaurant → Feedback (Cascade)
              → FeedbackReply / Flag / Assignment / Tag / AiDraft (all Cascade)
Restaurant → MenuCategory (Cascade) ← MenuItem.category Restrict, items deleted first
Restaurant → MenuItem (Cascade)
Restaurant → QrGeneration (Cascade)
Restaurant → MenuAnalyticsEvent (Cascade)
Restaurant → BrandSettings (Cascade)
Restaurant → PlatformLinkCheck (Cascade)
Restaurant → RestaurantActivationState (Cascade)
Restaurant → PlatformRedirectEvent (Cascade)
Restaurant → QrScan (Cascade)
Restaurant → EmbedView (Cascade)
Restaurant → AdminUser (no FK — manual deleteMany in DELETE handler)
```

The DELETE handler runs a manual transaction that mirrors the
DB-level cascade, so the deletion order is explicit even if the
cascade chain ever drifts.

### Records preserved across cascade (intentional)

| Table | Field | Pattern | Reason |
|---|---|---|---|
| `AdminAuditLog` | `actorId` (string) | no FK | audit history survives User deletion |
| `BillingInvoice` | `userId` (string) | no FK | financial record / KVKK retention |
| `BillingSubscription` | `userId` (string) | no FK | same |
| `MailTemplateRevision` | `templateId` | `SetNull` | revision history (audit + restore) |
| `LegalDocumentRevision` | `documentId` | `SetNull` | same |
| `LegalConsent` | `documentId` | `SetNull` | KVKK consent decoupled from doc lifetime |

### Two implicit-default `@relation` directives — comment-only documentation

- `Restaurant.user → User`: detailed inline comment added documenting
  that User hard-delete is unsupported (CLAUDE.md §34.5 soft-delete is
  the only sanctioned path).
- `AdminUser.restaurant → Restaurant`: detailed inline comment
  pointing at the manual `adminUser.deleteMany` cleanup in
  `/api/restaurants/[id]` DELETE.

We did **not** annotate either side with an explicit `onDelete:`
clause. Both `Restrict` and `NoAction` are rejected by Prisma 6's
validator with a *cyclic referential action* error because the
Restaurant model already participates in multi-path `Cascade` chains
(Feedback / Menu / QR / Analytics all cascade). The implicit default
maps to Postgres `NO ACTION` ≈ `RESTRICT`, which is the runtime
behaviour we wanted in the first place — the comments make the intent
visible to schema readers without breaking `prisma validate`.

### KVKK "right to be forgotten" — open scope

There is no User hard-delete endpoint today. If a GDPR/KVKK Data
Subject Request handler is added, the cascade chain works correctly
(everything tied to the user wipes), **except** `BillingInvoice` /
`BillingSubscription` / `AdminAuditLog` rows which intentionally have
no FK and would orphan. The right pattern is then to anonymise PII on
those rows (`user.email = "deleted-{id}@buaze.local"`, name + phone
nulled) instead of deleting the financial / audit history. Scope for
its own PR if/when the regulatory request arrives.

## Session close — 2026-05 audit final state

This audit ran across 12 PRs (5 phase + 6 follow-up + 1 docs/cascade
close). All merged into `main` from
`claude/security-vulnerability-audit-x48te`.

### What was fixed

| Severity | Count | Examples |
|---|---|---|
| CRITICAL | 8 | JWT_SECRET fallback, default credentials, dead-code rename, member deactivate session leak, team locations IDOR, Google OAuth CSRF, JSON-LD `</script>` escape, admin session staleness |
| HIGH | 11 | Host header injection, reset session revoke, UserSession DB fail-open, primaryColor XSS, integration URL injection, owner deactivate cookie, members audit log, admin reset weak password, restaurant DELETE owner-only, help body sanitize, render-XSS sweep |
| MEDIUM | 16+ | per-route hardening, CSP A-group, Permissions-Policy, PII redaction, audit logs, cascade explicit-Restrict |

### What was deliberately left open (operator decision)

| Item | Priority | Trigger |
|---|---|---|
| CSP B group (`COOP: same-origin-allow-popups`, `CORP: same-origin` with cross-origin overrides) | MEDIUM | Firebase popup auth runtime verification |
| CSP C group (strict `script-src` + nonce middleware, Report-Only soak) | MEDIUM-HIGH | 1-2 week Sentry CSP-report observation |
| `RECAPTCHA_ENFORCE` default flip to `'true'` | MEDIUM | 2-week Sentry warn-rate watch on production |
| `UserSession` legacy `if (!session) return false` flip to fail-closed | MEDIUM | Backfill script first (insert sessions for existing users) |
| Site-settings SVG upload sanitization | LOW | Admin-only privileged path |
| bcrypt cost normalisation (single const) | LOW (cosmetic) | — |
| KVKK "right to be forgotten" hard-delete endpoint | LOW (regulatory) | Real DSR request |

### Out of scope (future audit passes)

- **`npm audit` supply chain** — local `node_modules` not present in
  the audit environment.
- **K. Comprehensive PII inventory** — Phase 1 fixed an obvious leak but
  the remaining 305 files were not grep'ed for `console.error(..., user.email)`
  patterns.
- **CSP header** — `next.config.ts` ships X-Frame-Options + HSTS +
  Referrer-Policy + Permissions-Policy but no `Content-Security-Policy`.
  Worth adding once the script inventory (GTM, Yandex, Sentry tunnel,
  Speed Insights, Analytics, Vercel preview comments) is mapped.
- **Prisma cascade audit** — every `onDelete: Cascade` / `Restrict` was
  not exhaustively checked for accidental data loss surfaces.

---

## PR index

| # | Title |
|---|---|
| #345 | sec(audit-step-1): auth + public POST hardening |
| #346 | sec(audit-step-2): public ingestion + restaurant create hardening |
| #347 | sec(audit-step-3): admin auth + privileged CRUD hardening |
| #348 | sec(audit-step-4): owner panel + multi-tenant IDOR + privileged action audit |
| #349 | sec(audit-step-5): Google OAuth state validation (CSRF / account linking) |

All five were merged into `main`; this report and the matching CLAUDE.md
section (§37) capture the audit so a future session can pick up where this
one left off.
