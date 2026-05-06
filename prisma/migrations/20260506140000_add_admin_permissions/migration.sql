-- Stage A2 §38.94 — granular RBAC for AdminUser (per-resource × per-action grants).
-- Superadmin role bypass'es this table (rbac.ts helper). Manager role can be
-- granted cross-resource access by superadmin via UI (/admin/users/[id]/permissions).

CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_permissions_admin_user_id_resource_action_key"
  ON "admin_permissions"("admin_user_id", "resource", "action");

CREATE INDEX "admin_permissions_admin_user_id_idx"
  ON "admin_permissions"("admin_user_id");

ALTER TABLE "admin_permissions"
  ADD CONSTRAINT "admin_permissions_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
