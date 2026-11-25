-- CreateTable
CREATE TABLE "ai_theme_cache" (
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "fresh_until" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_theme_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ai_theme_cache_updated_at_idx" ON "ai_theme_cache"("updated_at");
