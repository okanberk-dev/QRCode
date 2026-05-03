-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "phone_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'restaurant_owner',
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "last_invited_at" TIMESTAMP(3),
    "last_trial_reminder_at" TIMESTAMP(3),
    "totp_secret" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_backup_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Restoran',
    "description" TEXT,
    "website" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "whatsapp_url" TEXT,
    "reservation_url" TEXT,
    "other_platform_url" TEXT,
    "other_platform_label" TEXT,
    "other_platform_enabled" BOOLEAN NOT NULL DEFAULT true,
    "temporarily_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_reason" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "working_hours" TEXT,
    "city" TEXT,
    "kvkk_text" TEXT,
    "google_place_id" TEXT,
    "google_review_url" TEXT,
    "google_review_management_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pulse_ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_analytics_enabled" BOOLEAN NOT NULL DEFAULT true,
    "external_platforms_enabled" BOOLEAN NOT NULL DEFAULT true,
    "initial_google_rating" DOUBLE PRECISION,
    "current_google_rating" DOUBLE PRECISION,
    "getir_yemek_url" TEXT,
    "yemek_sepeti_url" TEXT,
    "trendyol_yemek_url" TEXT,
    "tripadvisor_url" TEXT,
    "airbnb_url" TEXT,
    "booking_url" TEXT,
    "yandex_url" TEXT,
    "google_enabled" BOOLEAN NOT NULL DEFAULT true,
    "yemeksepeti_enabled" BOOLEAN NOT NULL DEFAULT true,
    "getir_enabled" BOOLEAN NOT NULL DEFAULT true,
    "trendyol_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tripadvisor_enabled" BOOLEAN NOT NULL DEFAULT true,
    "airbnb_enabled" BOOLEAN NOT NULL DEFAULT true,
    "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "yandex_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_redirect_platform" TEXT,
    "notification_email" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a73e8',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "menu_enabled" BOOLEAN NOT NULL DEFAULT true,
    "menu_published" BOOLEAN NOT NULL DEFAULT false,
    "menu_logo_url" TEXT,
    "menu_updated_at" TIMESTAMP(3),
    "menu_theme" TEXT NOT NULL DEFAULT 'classic',
    "menu_accent_color" TEXT,
    "enable_ai_draft" BOOLEAN NOT NULL DEFAULT false,
    "google_ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ai_draft_tone" TEXT NOT NULL DEFAULT 'warm',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_link_checks" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "status_code" INTEGER,
    "latency_ms" INTEGER,
    "error" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_link_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_email_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "restaurant_id" TEXT,
    "type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "lifecycle_email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_activation_states" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "qr_printed_shared_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_activation_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_redirect_events" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_redirect_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scans" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "table_number" TEXT,
    "platform" TEXT,
    "source" TEXT,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embed_views" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "parent_domain" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embed_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_generations" (
    "id" TEXT NOT NULL,
    "qr_url" TEXT NOT NULL,
    "table_number" TEXT,
    "platform" TEXT,
    "service_type" TEXT,
    "type" TEXT NOT NULL DEFAULT 'feedback',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurant_id" TEXT NOT NULL,

    CONSTRAINT "qr_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "comment" TEXT,
    "source" TEXT,
    "branch" TEXT,
    "table_number" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "has_kvkk_consent" BOOLEAN NOT NULL DEFAULT true,
    "has_marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "platform" TEXT,
    "service_type" TEXT,
    "food_rating" INTEGER,
    "service_rating" INTEGER,
    "atmosphere_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurant_id" TEXT,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_replies" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'internal',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "source" TEXT DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_ai_drafts" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai_copilot',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latency_ms" INTEGER,

    CONSTRAINT "feedback_ai_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_flags" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "reason" TEXT,
    "flagged_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_assignments" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "assignee_user_id" TEXT NOT NULL,
    "assigned_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_tags" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "trigger" TEXT NOT NULL,
    "threshold" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_settings" (
    "restaurant_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "cover_image_url" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "accent_font" TEXT,
    "slogan" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "google_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "account_id" TEXT,
    "locations_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "locations" JSONB,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "last_seen_at" TIMESTAMP(3),
    "invite_token" TEXT,
    "invite_token_expires_at" TIMESTAMP(3),
    "last_invited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "name" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "template" TEXT NOT NULL DEFAULT 'lime',
    "color" TEXT NOT NULL DEFAULT '#C6F24E',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "low_rating_email" BOOLEAN NOT NULL DEFAULT true,
    "daily_digest_email" BOOLEAN NOT NULL DEFAULT false,
    "weekly_report" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'superadmin',
    "restaurant_id" TEXT,
    "email" TEXT,
    "reset_token_hash" TEXT,
    "reset_token_expiry" TIMESTAMP(3),
    "reset_attempts" INTEGER NOT NULL DEFAULT 0,
    "reset_last_attempt" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "severity" TEXT NOT NULL DEFAULT 'info',
    "locale" TEXT NOT NULL DEFAULT 'all',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cta_text" TEXT,
    "cta_link" TEXT,
    "is_dismissible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "image_url" TEXT,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_out_of_stock" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_analytics_events" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "category_id" TEXT,
    "product_id" TEXT,
    "event_type" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "source_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "read_time" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "cover_image" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "author_bio" TEXT,
    "author_role" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pull_quote" TEXT,
    "pull_quote_author" TEXT,
    "cta_title" TEXT,
    "cta_subtitle" TEXT,
    "cta_button_label" TEXT,
    "translation_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_studies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "sector_en" TEXT,
    "location" TEXT NOT NULL,
    "hero_image" TEXT NOT NULL,
    "hero_tr" TEXT NOT NULL,
    "hero_en" TEXT NOT NULL,
    "subtitle_tr" TEXT,
    "subtitle_en" TEXT,
    "stats" JSONB NOT NULL,
    "highlights" JSONB NOT NULL,
    "quote_tr" TEXT,
    "quote_en" TEXT,
    "person_name" TEXT,
    "person_role" JSONB,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "user_id" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "source" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),
    "unsubscribe_token" TEXT,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "post_ids" TEXT[],
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "sent_count" INTEGER,
    "failed_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_template_revisions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "template_key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "edit_type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "edited_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_template_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "restaurant_name" TEXT,
    "tables" INTEGER,
    "avg_ticket" DECIMAL(10,2),
    "no_show_rate" DOUBLE PRECISION,
    "projection" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roi_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "search_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_slug" TEXT,
    "message" TEXT,
    "portfolio" TEXT,
    "attachment" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "ip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "status" TEXT NOT NULL DEFAULT 'active',
    "trial_ends_at" TIMESTAMP(3),
    "renews_at" TIMESTAMP(3),
    "provider_ref" TEXT,
    "payment_brand" TEXT,
    "payment_last4" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'TRY',
    "billing_cycle" TEXT,
    "company_name" TEXT,
    "tax_number" TEXT,
    "billing_address" TEXT,
    "billing_city" TEXT,
    "admin_notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "effective_at" TIMESTAMP(3),
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_document_revisions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "document_key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "edit_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMP(3),
    "edited_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_consents" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "document_key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_variables" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_variables_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "provider_ref" TEXT,
    "pdf_url" TEXT,
    "description" TEXT,
    "admin_notes" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionTr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "price_try" INTEGER NOT NULL,
    "price_usd" INTEGER,
    "period" TEXT NOT NULL DEFAULT 'month',
    "price_yearly_try" INTEGER,
    "price_yearly_usd" INTEGER,
    "features_tr" JSONB NOT NULL,
    "features_en" JSONB NOT NULL,
    "button_text_tr" TEXT NOT NULL DEFAULT 'Başla',
    "button_text_en" TEXT NOT NULL DEFAULT 'Start',
    "button_href" TEXT NOT NULL DEFAULT '/auth/register',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "discount_active" BOOLEAN NOT NULL DEFAULT false,
    "discount_type" TEXT,
    "discount_value" INTEGER,
    "discount_label_tr" TEXT,
    "discount_label_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verify_token_key" ON "users"("email_verify_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "platform_link_checks_restaurant_id_provider_checked_at_idx" ON "platform_link_checks"("restaurant_id", "provider", "checked_at");

-- CreateIndex
CREATE INDEX "platform_link_checks_provider_checked_at_idx" ON "platform_link_checks"("provider", "checked_at");

-- CreateIndex
CREATE INDEX "lifecycle_email_logs_user_id_type_sent_at_idx" ON "lifecycle_email_logs"("user_id", "type", "sent_at");

-- CreateIndex
CREATE INDEX "lifecycle_email_logs_restaurant_id_type_sent_at_idx" ON "lifecycle_email_logs"("restaurant_id", "type", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_activation_states_restaurant_id_key" ON "restaurant_activation_states"("restaurant_id");

-- CreateIndex
CREATE INDEX "platform_redirect_events_restaurant_id_provider_created_at_idx" ON "platform_redirect_events"("restaurant_id", "provider", "created_at");

-- CreateIndex
CREATE INDEX "platform_redirect_events_restaurant_id_created_at_idx" ON "platform_redirect_events"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "qr_scans_restaurant_id_created_at_idx" ON "qr_scans"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "qr_scans_restaurant_id_table_number_platform_created_at_idx" ON "qr_scans"("restaurant_id", "table_number", "platform", "created_at");

-- CreateIndex
CREATE INDEX "qr_scans_restaurant_id_session_id_created_at_idx" ON "qr_scans"("restaurant_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "embed_views_restaurant_id_created_at_idx" ON "embed_views"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "embed_views_restaurant_id_parent_domain_created_at_idx" ON "embed_views"("restaurant_id", "parent_domain", "created_at");

-- CreateIndex
CREATE INDEX "qr_generations_restaurant_id_created_at_idx" ON "qr_generations"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_restaurant_id_created_at_idx" ON "feedback"("restaurant_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_ip_address_created_at_idx" ON "feedback"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "feedback_restaurant_id_rating_created_at_idx" ON "feedback"("restaurant_id", "rating", "created_at");

-- CreateIndex
CREATE INDEX "feedback_restaurant_id_platform_created_at_idx" ON "feedback"("restaurant_id", "platform", "created_at");

-- CreateIndex
CREATE INDEX "feedback_restaurant_id_branch_created_at_idx" ON "feedback"("restaurant_id", "branch", "created_at");

-- CreateIndex
CREATE INDEX "feedback_replies_feedback_id_created_at_idx" ON "feedback_replies"("feedback_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_replies_source_created_at_idx" ON "feedback_replies"("source", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_ai_drafts_feedback_id_key" ON "feedback_ai_drafts"("feedback_id");

-- CreateIndex
CREATE INDEX "feedback_ai_drafts_feedback_id_idx" ON "feedback_ai_drafts"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_flags_feedback_id_key" ON "feedback_flags"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_assignments_feedback_id_key" ON "feedback_assignments"("feedback_id");

-- CreateIndex
CREATE INDEX "feedback_tags_feedback_id_idx" ON "feedback_tags"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_tags_feedback_id_label_key" ON "feedback_tags"("feedback_id", "label");

-- CreateIndex
CREATE INDEX "automation_rules_user_id_is_active_idx" ON "automation_rules"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "automation_rules_user_id_restaurant_id_idx" ON "automation_rules"("user_id", "restaurant_id");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_prefix_idx" ON "api_keys"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "google_integrations_user_id_key" ON "google_integrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_invite_token_key" ON "team_members"("invite_token");

-- CreateIndex
CREATE INDEX "team_members_owner_user_id_status_idx" ON "team_members"("owner_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_owner_user_id_email_key" ON "team_members"("owner_user_id", "email");

-- CreateIndex
CREATE INDEX "campaigns_user_id_status_idx" ON "campaigns"("user_id", "status");

-- CreateIndex
CREATE INDEX "campaigns_user_id_restaurant_id_idx" ON "campaigns"("user_id", "restaurant_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_id_created_at_idx" ON "admin_audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_id_created_at_idx" ON "admin_audit_logs"("target_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "announcements_status_start_date_end_date_idx" ON "announcements"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "menu_categories_restaurant_id_sort_order_idx" ON "menu_categories"("restaurant_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- CreateIndex
CREATE INDEX "menu_items_category_id_sort_order_idx" ON "menu_items"("category_id", "sort_order");

-- CreateIndex
CREATE INDEX "menu_analytics_events_restaurant_id_event_type_created_at_idx" ON "menu_analytics_events"("restaurant_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "menu_analytics_events_restaurant_id_category_id_event_type__idx" ON "menu_analytics_events"("restaurant_id", "category_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "menu_analytics_events_restaurant_id_product_id_event_type_c_idx" ON "menu_analytics_events"("restaurant_id", "product_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "menu_analytics_events_restaurant_id_session_id_created_at_idx" ON "menu_analytics_events"("restaurant_id", "session_id", "created_at");

-- CreateIndex
CREATE INDEX "menu_analytics_events_restaurant_id_source_type_created_at_idx" ON "menu_analytics_events"("restaurant_id", "source_type", "created_at");

-- CreateIndex
CREATE INDEX "blog_posts_translation_group_id_idx" ON "blog_posts"("translation_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_locale_key" ON "blog_posts"("slug", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "case_studies_slug_key" ON "case_studies"("slug");

-- CreateIndex
CREATE INDEX "case_studies_is_published_published_at_idx" ON "case_studies"("is_published", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key" ON "newsletter_subscribers"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers"("created_at");

-- CreateIndex
CREATE INDEX "newsletter_campaigns_status_scheduled_at_idx" ON "newsletter_campaigns"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "newsletter_campaigns_created_at_idx" ON "newsletter_campaigns"("created_at");

-- CreateIndex
CREATE INDEX "mail_templates_key_idx" ON "mail_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "mail_templates_key_locale_key" ON "mail_templates"("key", "locale");

-- CreateIndex
CREATE INDEX "mail_template_revisions_template_key_locale_created_at_idx" ON "mail_template_revisions"("template_key", "locale", "created_at");

-- CreateIndex
CREATE INDEX "mail_template_revisions_template_id_created_at_idx" ON "mail_template_revisions"("template_id", "created_at");

-- CreateIndex
CREATE INDEX "roi_requests_email_created_at_idx" ON "roi_requests"("email", "created_at");

-- CreateIndex
CREATE INDEX "help_articles_locale_category_order_idx" ON "help_articles"("locale", "category", "order");

-- CreateIndex
CREATE INDEX "help_articles_is_published_updated_at_idx" ON "help_articles"("is_published", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "help_articles_slug_locale_key" ON "help_articles"("slug", "locale");

-- CreateIndex
CREATE INDEX "career_applications_role_slug_created_at_idx" ON "career_applications"("role_slug", "created_at");

-- CreateIndex
CREATE INDEX "career_applications_status_created_at_idx" ON "career_applications"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_provider_ref_key" ON "billing_subscriptions"("provider_ref");

-- CreateIndex
CREATE INDEX "legal_documents_key_is_active_idx" ON "legal_documents"("key", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_key_locale_key" ON "legal_documents"("key", "locale");

-- CreateIndex
CREATE INDEX "legal_document_revisions_document_key_locale_created_at_idx" ON "legal_document_revisions"("document_key", "locale", "created_at");

-- CreateIndex
CREATE INDEX "legal_document_revisions_document_id_created_at_idx" ON "legal_document_revisions"("document_id", "created_at");

-- CreateIndex
CREATE INDEX "legal_consents_document_key_locale_created_at_idx" ON "legal_consents"("document_key", "locale", "created_at");

-- CreateIndex
CREATE INDEX "legal_consents_subject_type_subject_id_created_at_idx" ON "legal_consents"("subject_type", "subject_id", "created_at");

-- CreateIndex
CREATE INDEX "legal_consents_document_id_created_at_idx" ON "legal_consents"("document_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_invoice_number_key" ON "billing_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_provider_ref_key" ON "billing_invoices"("provider_ref");

-- CreateIndex
CREATE INDEX "billing_invoices_user_id_issued_at_idx" ON "billing_invoices"("user_id", "issued_at");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_sort_order_idx" ON "subscription_plans"("is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_link_checks" ADD CONSTRAINT "platform_link_checks_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_activation_states" ADD CONSTRAINT "restaurant_activation_states_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_redirect_events" ADD CONSTRAINT "platform_redirect_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embed_views" ADD CONSTRAINT "embed_views_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_generations" ADD CONSTRAINT "qr_generations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_replies" ADD CONSTRAINT "feedback_replies_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_ai_drafts" ADD CONSTRAINT "feedback_ai_drafts_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_flags" ADD CONSTRAINT "feedback_flags_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_assignments" ADD CONSTRAINT "feedback_assignments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_tags" ADD CONSTRAINT "feedback_tags_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_settings" ADD CONSTRAINT "brand_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_analytics_events" ADD CONSTRAINT "menu_analytics_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_template_revisions" ADD CONSTRAINT "mail_template_revisions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "mail_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_document_revisions" ADD CONSTRAINT "legal_document_revisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_consents" ADD CONSTRAINT "legal_consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

