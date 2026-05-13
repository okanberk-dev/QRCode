-- Stage 98 — Survey system.
-- Adds four tables for the owner-panel survey feature (CLAUDE.md §42).
-- Surveys are created in the owner panel, accessed via per-survey QR codes
-- at /s/[slug], and analyzed via /dashboard/surveys/[id]/analytics.
--
-- All four tables cascade delete from the parent (Restaurant → Survey →
-- SurveyQuestion / SurveyResponse → SurveyAnswer) so a deleted restaurant
-- leaves no orphan rows. The (survey_id, session_id) unique constraint
-- on survey_responses prevents the same anonymous session from spamming
-- a survey twice.
--
-- All columns additive; safe to roll forward (no Restaurant column changes,
-- backfill not required).

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'multi_step',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "accent_color" TEXT,
    "thank_you_message" TEXT,
    "kvkk_text" TEXT,
    "collect_marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "collect_contact" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "has_kvkk_consent" BOOLEAN NOT NULL DEFAULT false,
    "has_marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "text_value" TEXT,
    "number_value" INTEGER,
    "option_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surveys_slug_key" ON "surveys"("slug");

-- CreateIndex
CREATE INDEX "surveys_restaurant_id_is_active_created_at_idx" ON "surveys"("restaurant_id", "is_active", "created_at");

-- CreateIndex
CREATE INDEX "surveys_slug_idx" ON "surveys"("slug");

-- CreateIndex
CREATE INDEX "survey_questions_survey_id_sort_order_idx" ON "survey_questions"("survey_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_survey_id_session_id_key" ON "survey_responses"("survey_id", "session_id");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_created_at_idx" ON "survey_responses"("survey_id", "created_at");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_completed_at_idx" ON "survey_responses"("survey_id", "completed_at");

-- CreateIndex
CREATE INDEX "survey_responses_ip_address_created_at_idx" ON "survey_responses"("ip_address", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "survey_answers_response_id_question_id_key" ON "survey_answers"("response_id", "question_id");

-- CreateIndex
CREATE INDEX "survey_answers_question_id_created_at_idx" ON "survey_answers"("question_id", "created_at");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
