-- Wave A5 + A7 (CLAUDE.md §38.A) — mail hygiene migration.
--
-- A5: User.disable_trial_reminders boolean column. Defaults FALSE so every
-- existing user keeps receiving D-3 / D-1 reminders unchanged; opt-out
-- only triggers when the owner flips the new toggle in
-- /dashboard/notifications. NOT NULL is safe because of the default.
ALTER TABLE "users"
  ADD COLUMN "disable_trial_reminders" BOOLEAN NOT NULL DEFAULT false;

-- A7: drop notification_preferences.daily_digest_email. The toggle was
-- surfaced in /dashboard/notifications but no cron consumed it. The owner
-- flipped it and nothing happened. Removed in favour of the existing
-- weekly_report + instant low-rating mails which already cover the same
-- ground.
ALTER TABLE "notification_preferences"
  DROP COLUMN "daily_digest_email";
