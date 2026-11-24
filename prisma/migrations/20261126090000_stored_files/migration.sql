-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_path_key" ON "stored_files"("path");

-- Row level security with no policy: only the table owner (the app) can
-- read or write. While the database is still on Supabase this keeps the
-- table out of the public PostgREST API; on plain PostgreSQL it is a no-op
-- for the app, which connects as the owner.
ALTER TABLE "stored_files" ENABLE ROW LEVEL SECURITY;
