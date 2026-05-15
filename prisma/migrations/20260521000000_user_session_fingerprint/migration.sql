-- Wave D (CLAUDE.md §38.B + §38.195) — fuzzy device fingerprint stored on
-- UserSession for the "new device login" alert mail. Fingerprint = sha256
-- prefix of (UA major version + IP /16); first match fires the alert,
-- subsequent matches stay silent.
ALTER TABLE "user_sessions"
  ADD COLUMN "fingerprint" TEXT;

CREATE INDEX "user_sessions_user_id_fingerprint_idx"
  ON "user_sessions"("user_id", "fingerprint");
