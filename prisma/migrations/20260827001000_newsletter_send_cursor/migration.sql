-- Resume cursor for the monthly newsletter send loop.
-- A run that stops early (subscriber cap or the 250s time budget) previously
-- restarted from the head of the list on the next trigger: the first N
-- subscribers received a duplicate copy and the tail was never reached.
-- Recording the delivered issue key per subscriber makes the loop resumable.
ALTER TABLE "newsletter_subscribers"
  ADD COLUMN IF NOT EXISTS "last_newsletter_key" TEXT;

CREATE INDEX IF NOT EXISTS "newsletter_subscribers_unsubscribed_at_last_newsletter_key_idx"
  ON "newsletter_subscribers" ("unsubscribed_at", "last_newsletter_key");
