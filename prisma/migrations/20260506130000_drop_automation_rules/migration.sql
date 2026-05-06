-- Stage 21 §38.92 — Webhook Automation feature removal.
-- 0 production usage (3 weeks live, 0 rules, 0 owners) + 5 paralel mekanizma
-- (low-rating-alert mail + Pulse AI auto-draft + Realtime push + PendingTasks + reply UI)
-- already cover owner needs. CLAUDE.md §38.92 closure log.
--
-- Dropping in correct order: AutomationRule has no FK relations into other tables
-- (userId/restaurantId are loose string refs, no Prisma `@relation`), so safe to
-- drop the table directly. AdminAuditLog rows with action LIKE 'automation.%'
-- intentionally preserved (forensic trail).

DROP TABLE IF EXISTS "automation_rules";
