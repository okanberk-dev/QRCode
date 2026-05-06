/**
 * Canonical bcrypt cost factor for all password hashing in Buaze.
 *
 * OWASP 2024 baseline: cost 12 (~250ms hash on modern hardware).
 * Brute-force defense + rate limit (CLAUDE.md §14.2) + reCAPTCHA gating
 * (CLAUDE.md §37.3 #2) layered defense.
 *
 * Background: Stage 9 audit found drift between cost 10 and 12 across
 * 14 hash callsites (CLAUDE.md §37.3 #6). This constant is the single
 * source of truth — all bcrypt.hash() callsites import from here.
 *
 * Future bumps: when changing this constant, all existing user/admin
 * passwords keep working (bcrypt format includes cost in the hash).
 * Only NEW hashes use the new cost; old hashes verify with their
 * original cost via bcrypt.compare(). No migration required.
 */
export const BCRYPT_COST = 12;
