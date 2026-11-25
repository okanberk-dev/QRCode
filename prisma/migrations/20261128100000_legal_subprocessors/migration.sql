-- Published legal documents: the sub-processor table and the US-transfer list
-- now come from code (src/lib/legal/subprocessors.ts) via placeholders.
-- Only text that still matches the old wording is replaced; admin edits stay.
UPDATE "legal_documents"
SET "content" = regexp_replace("content", '\| (Alt yüklenici|Sub-processor) \|.*?\| Firebase \|[^|\n]*\|[^|\n]*\|', '{{SUBPROCESSOR_TABLE}}')
WHERE "key" = 'veri-isleyici-sozlesmesi' AND "content" LIKE '%| Supabase |%';

UPDATE "legal_documents"
SET "content" = replace("content", '(Vercel, Resend, OpenAI, Sentry, Firebase)', '({{SUBPROCESSOR_TRANSFER_LIST}})')
WHERE "key" = 'veri-isleyici-sozlesmesi';

UPDATE "legal_documents"
SET "content" = replace(replace("content",
  '(Supabase, Vercel, Resend, OpenAI vb.)', '(Vultr, Anthropic, Resend vb.)'),
  '(Supabase, Vercel, Resend, OpenAI, etc.)', '(Vultr, Anthropic, Resend, etc.)')
WHERE "key" = 'kullanim-sozlesmesi';

UPDATE "legal_documents"
SET "content" = replace(replace(replace(replace("content",
  '- Yavaş sayfa tespiti (Vercel Speed Insights, Sentry performance)', '- Yavaş sayfa tespiti (Sentry performans)'),
  '- Slow-page detection (Vercel Speed Insights, Sentry performance)', '- Slow-page detection (Sentry performance)'),
  '- Vercel (altyapı + analytics)', '- Vultr (sunucu altyapısı, Frankfurt)'),
  '- Vercel (infrastructure + analytics)', '- Vultr (server infrastructure, Frankfurt)')
WHERE "key" = 'cerez-politikasi';
