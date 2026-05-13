-- Owner-side "varsayılana sıfırla" için fork kaynağı izleme.
-- audit_templates.forked_from_id → audit_templates.id (self-ref, SetNull).
-- Kaynak template silinirse forked_from_id NULL'a düşer, owner template'i
-- sağlam kalır; reset butonu UI'da kaybolur (kaynak yok semantiği).
--
-- Mevcut fork edilmiş owner template'leri (PR #630/631 öncesi) NULL kalır;
-- reset butonu onlarda görünmez (geriye dönük doğru davranış).

ALTER TABLE "audit_templates"
  ADD COLUMN "forked_from_id" TEXT;

ALTER TABLE "audit_templates"
  ADD CONSTRAINT "audit_templates_forked_from_id_fkey"
  FOREIGN KEY ("forked_from_id") REFERENCES "audit_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audit_templates_forked_from_id_idx"
  ON "audit_templates" ("forked_from_id");
