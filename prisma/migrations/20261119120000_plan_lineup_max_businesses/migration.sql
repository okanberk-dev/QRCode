-- 2026-11 package lineup (CLAUDE.md §15.2, src/lib/plan-catalog.ts).
-- 1) Business limit per plan.
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_businesses" INTEGER;

-- 2) Bring the three public tiers to the recommended lineup. Existing rows are
--    updated in place (matched by English name) so subscription links keep
--    their plan id; a missing tier is inserted. Other rows are left alone.
--    Generated from src/lib/plan-catalog.ts — keep the two in sync.
DO $$
DECLARE n INTEGER;
BEGIN
  UPDATE "subscription_plans" SET "nameTr" = 'Başlangıç', "nameEn" = 'Starter',
    "descriptionTr" = 'Tek işletmesi olan restoran, kafe ve oteller için.', "descriptionEn" = 'For a single restaurant, café or hotel.',
    "price_try" = 499, "price_yearly_try" = 4990,
    "price_usd" = 15, "price_yearly_usd" = 150, "period" = 'month',
    "features_tr" = '["Sınırsız QR kod ve ekip üyesi","10 yorum platformuna yönlendirme","Düşük puanda anında e-posta uyarısı","Geri bildirim kutusu, e-postayla yanıt ve yanıt şablonları","Analitik raporlar ve CSV dışa aktarma"]'::JSONB, "features_en" = '["Unlimited QR codes and team members","Links to 10 review platforms","Instant e-mail alert for low ratings","Feedback inbox, e-mail replies and reply templates","Analytics reports and CSV export"]'::JSONB,
    "button_text_tr" = 'Ücretsiz deneyin', "button_text_en" = 'Start free trial', "button_href" = '/auth/register',
    "is_active" = TRUE, "is_featured" = FALSE, "sort_order" = 10,
    "discount_active" = FALSE, "payment_provider" = 'paynkolay',
    "module_keys" = ARRAY['externalPlatforms']::TEXT[], "modules_managed" = TRUE,
    "max_businesses" = 1, "updated_at" = NOW()
  WHERE lower(trim("nameEn")) IN ('starter');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    INSERT INTO "subscription_plans" ("id", "nameTr", "nameEn", "descriptionTr", "descriptionEn",
      "price_try", "price_yearly_try", "price_usd", "price_yearly_usd", "period", "features_tr", "features_en",
      "button_text_tr", "button_text_en", "button_href", "is_active", "is_featured", "sort_order",
      "discount_active", "payment_provider", "module_keys", "modules_managed", "max_businesses",
      "created_at", "updated_at")
    VALUES (gen_random_uuid()::TEXT, 'Başlangıç', 'Starter', 'Tek işletmesi olan restoran, kafe ve oteller için.', 'For a single restaurant, café or hotel.',
      499, 4990, 15, 150, 'month', '["Sınırsız QR kod ve ekip üyesi","10 yorum platformuna yönlendirme","Düşük puanda anında e-posta uyarısı","Geri bildirim kutusu, e-postayla yanıt ve yanıt şablonları","Analitik raporlar ve CSV dışa aktarma"]'::JSONB, '["Unlimited QR codes and team members","Links to 10 review platforms","Instant e-mail alert for low ratings","Feedback inbox, e-mail replies and reply templates","Analytics reports and CSV export"]'::JSONB,
      'Ücretsiz deneyin', 'Start free trial', '/auth/register', TRUE, FALSE, 10,
      FALSE, 'paynkolay', ARRAY['externalPlatforms']::TEXT[], TRUE, 1, NOW(), NOW());
  END IF;

  UPDATE "subscription_plans" SET "nameTr" = 'Büyüme', "nameEn" = 'Growth',
    "descriptionTr" = 'Yapay zekâ taslakları, dijital menü ve anketlerle 3 işletmeye kadar.', "descriptionEn" = 'AI drafts, a digital menu and surveys for up to 3 businesses.',
    "price_try" = 999, "price_yearly_try" = 9990,
    "price_usd" = 29, "price_yearly_usd" = 290, "period" = 'month',
    "features_tr" = '["Başlangıç planındaki her şey","Pulse AI yanıt taslakları","Yapay zekâyla yorum temaları ve haftalık içgörü","Dijital QR menü (7 tema)","Müşteri anketleri"]'::JSONB, "features_en" = '["Everything in Starter","Pulse AI reply drafts","AI review themes and a weekly insight","Digital QR menu (7 themes)","Customer surveys"]'::JSONB,
    "button_text_tr" = 'Ücretsiz deneyin', "button_text_en" = 'Start free trial', "button_href" = '/auth/register',
    "is_active" = TRUE, "is_featured" = TRUE, "sort_order" = 20,
    "discount_active" = FALSE, "payment_provider" = 'paynkolay',
    "module_keys" = ARRAY['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys']::TEXT[], "modules_managed" = TRUE,
    "max_businesses" = 3, "updated_at" = NOW()
  WHERE lower(trim("nameEn")) IN ('growth');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    INSERT INTO "subscription_plans" ("id", "nameTr", "nameEn", "descriptionTr", "descriptionEn",
      "price_try", "price_yearly_try", "price_usd", "price_yearly_usd", "period", "features_tr", "features_en",
      "button_text_tr", "button_text_en", "button_href", "is_active", "is_featured", "sort_order",
      "discount_active", "payment_provider", "module_keys", "modules_managed", "max_businesses",
      "created_at", "updated_at")
    VALUES (gen_random_uuid()::TEXT, 'Büyüme', 'Growth', 'Yapay zekâ taslakları, dijital menü ve anketlerle 3 işletmeye kadar.', 'AI drafts, a digital menu and surveys for up to 3 businesses.',
      999, 9990, 29, 290, 'month', '["Başlangıç planındaki her şey","Pulse AI yanıt taslakları","Yapay zekâyla yorum temaları ve haftalık içgörü","Dijital QR menü (7 tema)","Müşteri anketleri"]'::JSONB, '["Everything in Starter","Pulse AI reply drafts","AI review themes and a weekly insight","Digital QR menu (7 themes)","Customer surveys"]'::JSONB,
      'Ücretsiz deneyin', 'Start free trial', '/auth/register', TRUE, TRUE, 20,
      FALSE, 'paynkolay', ARRAY['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys']::TEXT[], TRUE, 3, NOW(), NOW());
  END IF;

  UPDATE "subscription_plans" SET "nameTr" = 'Zincir', "nameEn" = 'Scale',
    "descriptionTr" = 'Şube sayısı artan zincirler ve gruplar için, 10 işletmeye kadar.', "descriptionEn" = 'For growing chains and groups, up to 10 businesses.',
    "price_try" = 2499, "price_yearly_try" = 24990,
    "price_usd" = 69, "price_yearly_usd" = 690, "period" = 'month',
    "features_tr" = '["Büyüme planındaki her şey","Google yorumlarına panelden yanıt (Google erişim onayından sonra)","Öncelikli destek"]'::JSONB, "features_en" = '["Everything in Growth","Reply to Google reviews from the panel (after Google approves access)","Priority support"]'::JSONB,
    "button_text_tr" = 'Ücretsiz deneyin', "button_text_en" = 'Start free trial', "button_href" = '/auth/register',
    "is_active" = TRUE, "is_featured" = FALSE, "sort_order" = 30,
    "discount_active" = FALSE, "payment_provider" = 'paynkolay',
    "module_keys" = ARRAY['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys', 'googleReviews']::TEXT[], "modules_managed" = TRUE,
    "max_businesses" = 10, "updated_at" = NOW()
  WHERE lower(trim("nameEn")) IN ('scale', 'pro');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    INSERT INTO "subscription_plans" ("id", "nameTr", "nameEn", "descriptionTr", "descriptionEn",
      "price_try", "price_yearly_try", "price_usd", "price_yearly_usd", "period", "features_tr", "features_en",
      "button_text_tr", "button_text_en", "button_href", "is_active", "is_featured", "sort_order",
      "discount_active", "payment_provider", "module_keys", "modules_managed", "max_businesses",
      "created_at", "updated_at")
    VALUES (gen_random_uuid()::TEXT, 'Zincir', 'Scale', 'Şube sayısı artan zincirler ve gruplar için, 10 işletmeye kadar.', 'For growing chains and groups, up to 10 businesses.',
      2499, 24990, 69, 690, 'month', '["Büyüme planındaki her şey","Google yorumlarına panelden yanıt (Google erişim onayından sonra)","Öncelikli destek"]'::JSONB, '["Everything in Growth","Reply to Google reviews from the panel (after Google approves access)","Priority support"]'::JSONB,
      'Ücretsiz deneyin', 'Start free trial', '/auth/register', TRUE, FALSE, 30,
      FALSE, 'paynkolay', ARRAY['externalPlatforms', 'pulseAi', 'aiAnalytics', 'menu', 'surveys', 'googleReviews']::TEXT[], TRUE, 10, NOW(), NOW());
  END IF;

END $$;
