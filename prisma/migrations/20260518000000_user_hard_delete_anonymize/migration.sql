-- Stage A — admin user hard-delete (KVKK right-to-be-forgotten).
-- Owner panel admin can permanently delete a soft-deleted (isActive=false) User
-- after a 7-day grace window. We CASCADE Restaurant + UserSession + Impersonation
-- via existing FK chains (§37.9), and anonymize financial / audit rows so the
-- KVKK m.7 financial retention (10 years) survives the wipe with userId stripped.
--
-- Nullability is required on BillingInvoice.userId + AdminAuditLog.actorId so
-- the hard-delete transaction can write NULL while keeping the row.
-- BillingSubscription.userId stays NOT NULL (it's the PK) — the transaction
-- deletes that row instead of anonymizing.

ALTER TABLE "billing_invoices" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "admin_audit_logs" ALTER COLUMN "actor_id" DROP NOT NULL;
