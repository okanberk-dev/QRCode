# Buaze handoff (2026-11-21)

Work stopped at the weekly usage limit. Everything is committed and pushed; nothing secret is in these files (env vars are named only).

## Branches and PRs
| Branch | Base | State |
|---|---|---|
| claude/billing-1-foundation | main | Done, 3 reviews + fixes, QA green (all billing flags off by default) |
| claude/billing-2-saved-cards | billing-1 | Done, 3 reviews + fixes, QA green (card storage flag off by default) |
| claude/billing-3-auto-charge | billing-2 | WIP. Charge engine, breaker, dunning, notice gate + 34 tests done. Left: mail templates for the 3 new mailer methods, step-up (src/lib/auth/billing-step-up.ts + POST /api/billing/step-up), POST /api/billing/auto-renew, off-only link + page, card-api offer fields, panel UI (AutoRenewControl, consent modal), docs; then 3 reviews + fixes + QA. Do NOT merge before the PayNKolay sandbox answers (spec §16.4). |
| claude/menu-studio-rebuild | main | Done, reviews + fixes, QA green |
| claude/menu-design-themes | menu-studio | Chunks 1-3 built, 2 reviews done; review fixes were in progress (last commit is WIP). Left: finish the review fixes (findings are in the review step of that work; re-review quickly), then browser QA of every preset at 375/768/1440. |

## Specs (binding)
- docs/specs/billing-spec-final.md: saved cards + auto-renew
- docs/specs/menu-spec-final.md: Menu Studio
- docs/specs/menu-design-final.md: public menu designs + owner design options

## Owner actions
- PayNKolay: request card storage permission ("kart saklama yetkisi"), Non-Secure (3D'siz) permission with a limit, a hosted-page logo, and a separate Buaze merchant (spec D16).
- Before turning any billing flag on: follow spec §16 gate G0 (BILLING_VAULT_KEY + BILLING_HMAC_KEY generated and backed up, NEXT_PUBLIC_SITE_URL set explicitly in Coolify, scripts/billing-bind-env.ts, Coolify scheduled task for /api/cron/billing-renewals every hour).
