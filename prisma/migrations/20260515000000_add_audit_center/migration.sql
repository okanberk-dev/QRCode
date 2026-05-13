-- CLAUDE.md §42 — Denetim Merkezi (Audit Center).
-- Adds six tables for restaurant-owner internal audits (hiring quizzes,
-- operational checklists, KVKK self-checks). Modelled on Survey* pattern
-- but separate: Survey is customer-facing, Audit is internal staff/operator.
--
-- Tree:
--   AuditCategory (superadmin taxonomy, global)
--     → AuditTemplate (global if restaurant_id null, else owner-specific)
--         → AuditQuestion (ordered)
--         → AuditAssignment (who/when scheduled)
--             → AuditResponse (one fill instance, scored)
--                 → AuditAnswer (per-question)
--
-- Cascade chain: Restaurant delete → AuditTemplate (restaurant-owned only),
-- AuditAssignment, AuditResponse. AuditTemplate delete → questions +
-- assignments + responses. AuditCategory delete sets template.category_id
-- to NULL (history preserved).
--
-- All columns additive; safe to roll forward. No Restaurant column changes.

-- CreateTable: audit_categories
CREATE TABLE "audit_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label_tr" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT 'other',
    "icon_key" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_templates
CREATE TABLE "audit_templates" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sector" TEXT NOT NULL DEFAULT 'other',
    "scoring_mode" TEXT NOT NULL DEFAULT 'percentage',
    "passing_score" INTEGER,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_questions
CREATE TABLE "audit_questions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "help_text" TEXT,
    "options" JSONB,
    "correct_answer" JSONB,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "scoring_rule" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_assignments
CREATE TABLE "audit_assignments" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "assignee_type" TEXT NOT NULL,
    "assignee_team_member_id" TEXT,
    "assignee_name" TEXT,
    "assignee_email" TEXT,
    "assignee_phone" TEXT,
    "internal_note" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'once',
    "due_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT,
    "token_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_responses
CREATE TABLE "audit_responses" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "restaurant_id" TEXT NOT NULL,
    "respondent_name" TEXT,
    "respondent_email" TEXT,
    "respondent_phone" TEXT,
    "team_member_id" TEXT,
    "has_kvkk_consent" BOOLEAN NOT NULL DEFAULT false,
    "has_marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "score_percentage" INTEGER,
    "passed" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_answers
CREATE TABLE "audit_answers" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" JSONB,
    "auto_score" INTEGER,
    "manual_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_answers_pkey" PRIMARY KEY ("id")
);

-- Uniques
CREATE UNIQUE INDEX "audit_categories_slug_key" ON "audit_categories"("slug");
CREATE UNIQUE INDEX "audit_assignments_token_key" ON "audit_assignments"("token");
CREATE UNIQUE INDEX "audit_answers_response_id_question_id_key" ON "audit_answers"("response_id", "question_id");

-- Indexes
CREATE INDEX "audit_categories_sector_order_idx" ON "audit_categories"("sector", "order");

CREATE INDEX "audit_templates_restaurant_id_is_published_is_active_idx" ON "audit_templates"("restaurant_id", "is_published", "is_active");
CREATE INDEX "audit_templates_category_id_is_published_idx" ON "audit_templates"("category_id", "is_published");
CREATE INDEX "audit_templates_sector_is_published_idx" ON "audit_templates"("sector", "is_published");

CREATE INDEX "audit_questions_template_id_sort_order_idx" ON "audit_questions"("template_id", "sort_order");

CREATE INDEX "audit_assignments_restaurant_id_status_due_at_idx" ON "audit_assignments"("restaurant_id", "status", "due_at");
CREATE INDEX "audit_assignments_template_id_status_idx" ON "audit_assignments"("template_id", "status");
CREATE INDEX "audit_assignments_assignee_team_member_id_status_idx" ON "audit_assignments"("assignee_team_member_id", "status");

CREATE INDEX "audit_responses_restaurant_id_completed_at_idx" ON "audit_responses"("restaurant_id", "completed_at");
CREATE INDEX "audit_responses_template_id_completed_at_idx" ON "audit_responses"("template_id", "completed_at");
CREATE INDEX "audit_responses_assignment_id_completed_at_idx" ON "audit_responses"("assignment_id", "completed_at");
CREATE INDEX "audit_responses_team_member_id_completed_at_idx" ON "audit_responses"("team_member_id", "completed_at");

CREATE INDEX "audit_answers_question_id_created_at_idx" ON "audit_answers"("question_id", "created_at");

-- Foreign keys (Restaurant cascade for owner data; SetNull for category lineage)
ALTER TABLE "audit_templates" ADD CONSTRAINT "audit_templates_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_templates" ADD CONSTRAINT "audit_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "audit_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_questions" ADD CONSTRAINT "audit_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "audit_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_answers" ADD CONSTRAINT "audit_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "audit_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_answers" ADD CONSTRAINT "audit_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "audit_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
