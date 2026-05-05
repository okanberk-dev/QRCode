-- §38.56 — Yorumlar Inbox tab kategorileri için 2 yeni Boolean field.
-- isRead: yeni feedback owner inbox'ta açana kadar Okunmamış sayılır
--   (default false → mevcut feedback'ler de Okunmamış olarak başlar,
--   owner mark-as-read ile günceller).
-- isPending: owner manuel "Beklemede" işaretler — yanıtlanmamış değil
--   ama ek bilgi bekleniyor durumu (default false).

ALTER TABLE "feedback"
  ADD COLUMN "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "is_pending" BOOLEAN NOT NULL DEFAULT FALSE;
