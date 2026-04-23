# Buaze Pulse Redesign — Implementasyon Log

Claude Design handoff'u (`bqQUR3oJWYZ6k1Aq10F34g`, 38 artboard) Buaze sitesine **birebir** aktarmak için açılmış 8-fazlı çalışmanın takip dosyası. Her faz sonunda güncellenir, yeni oturumlar kaldığı yerden bu dosyadan devam eder.

**Referanslar:** tasarım dosyaları `.design/`, proje rehberi `CLAUDE.md`, handoff §16.

---

## Özet

| Faz | Başlık | Branch | PR | Durum |
|-----|--------|--------|----|-------|
| 0 | Baseline audit + design.md iskelet + `.design/` + §16 | `claude/design-phase-0-baseline` | draft | 🔄 Devam |
| 1 | Chrome + Homepage v3 (animated counter, bento, marquee, sticky CTA, toast, video modal) | `claude/design-phase-1-home` | — | ⏳ Bekliyor |
| 2 | Auth + Onboarding (5 adım + confetti + 404) | `claude/design-phase-2-auth-onboarding` | — | ⏳ Bekliyor |
| 3 | Marketing secondary (features, AI Co-Pilot, pricing, ROI, QR, integrations, compare, stories, case-study) | `claude/design-phase-3-marketing` | — | ⏳ Bekliyor |
| 4 | Solutions (7 sektör) | `claude/design-phase-4-solutions` | — | ⏳ Bekliyor |
| 5 | Content (blog, faq, help, about, careers, contact, 8 legal) | `claude/design-phase-5-content` | — | ⏳ Bekliyor |
| 6 | Admin core (dashboard, reviews, QR wizard, analytics, restaurants, settings) | `claude/design-phase-6-admin-core` | — | ⏳ Bekliyor |
| 7 | Admin advanced (campaigns, team, notifications, billing, API/webhook, tüm ikincil) | `claude/design-phase-7-admin-advanced` | — | ⏳ Bekliyor |
| 8 | Public QR + Menu + Mobile/A11y polish | `claude/design-phase-8-public-polish` | — | ⏳ Bekliyor |

---

## Faz logları

### Faz 0 — 2026-04-23

**Kapsam:** Referans altyapı. Kod davranışı değişmedi; yalnız doküman + bundle + ince motion polish'i.

**Değişen / oluşan dosyalar:**
- `.design/` — 21 dosya (branch `save-design-files-moe8c` içeriği Phase 0 branch'ine dahil edildi)
  - `site/` (12): site-app, site-shared, site-platforms, site-premium, site-homepage-v2, site-homepage-v3, site-onboarding-v2, site-marketing, site-more, site-admin, site-pages3, site-pages4
  - `pulse/` (7): pulse-tokens, pulse-symbols, pulse-artboards-1, pulse-artboards-2, pulse-app, design-canvas (+ kopyası)
  - `buaze-site.html` (canvas entry), `chat1.md` (design chat log), kök `design-canvas.jsx`
- `CLAUDE.md` — §16 Claude Design Handoff bölümü eklendi (73 satır; dosya haritası + içerik özeti + implementasyon öncelikleri)
- `src/app/globals.css` — 3 yeni keyframe/utility: `@keyframes slideIn` + `.animate-slide-in`, `@keyframes marqueeSlide` + `.animate-marquee`, `@media (prefers-reduced-motion: reduce)` bloğu
- `design.md` (bu dosya, yeni)

**Backend etkisi:** Yok. Hiçbir `src/app/api/**` route'u, Prisma modeli, auth akışı, rate-limit veya IDOR helper'ı değişmedi.

**Baseline audit — mevcut durum → yapılacak** (Phase 1'e girdi):

| Alan | Mevcut | Yapılacak (faz) |
|---|---|---|
| `MarketingNavbar` + `MarketingNavbarClient` | scroll-aware ✓, Learn dropdown ✓, Solutions mega ✓, mobile hamburger ✓, locale toggle ✓, BuazeLogo ✓ | Pulse spacing/active state ince ayar (Faz 1) |
| `MarketingFooter` (151 satır, 5 kolon) | BuazeLogo on-dark ✓, sosyal link (sadece Instagram), `pulse-eyebrow` ✓ | 4 kolona dön, newsletter input, ECG SVG, live dot (Faz 1) |
| Homepage (`src/app/[locale]/page.tsx`, 872 satır) | 11 section ✓ (hero, logo, 3 step, dark feature + ticker, shield, solutions, platform EN, QR teaser, case + mountain, testimonial EN, lime CTA) | EKLE: animated counter, bento grid, industry tabs (şu an grid), marquee, sticky CTA bar, social proof toast, video modal. REVİZE: hero + dark feature (Faz 1) |
| Pulse token'ları (`globals.css @theme`) | brand (pure/graphite/lime/lime-deep/lime-soft) ✓, n50-n900 ✓, semantic alias ✓ | tamam |
| Keyframes | starPulse, slideUpFade, pulseHeartbeat ✓ | **Faz 0:** slideIn + marquee + reduced-motion eklendi ✓ |
| `.pulse-eyebrow` utility | ✓ | tamam |
| Fonts (`src/app/layout.tsx`) | Space Grotesk + Inter + JetBrains Mono via next/font, CSS var'ları `--font-space-grotesk/inter/jetbrains-mono` | tamam |
| `BuazeLogo` (78 satır) | 3 variant (default/on-dark/on-lime) ✓, ECG SVG gövde ✓ | tamam |
| Scaffolded API'ler (501) | /api/analytics/export, /api/billing/summary, /api/billing/invoices, /api/onboarding/state, /api/onboarding/complete, /api/team, /api/campaigns, /api/automations, /api/api-keys, /api/notifications | Backend açıkları tablosuna (aşağı) — UI'den çağrılmaya devam, 501 yutulur |
| AI Co-Pilot | `src/lib/openai.ts` + `/api/feedback/[id]/suggest-reply` + Admin Reviews + Owner Feedbacks badge | tamam (Faz 1'de anasayfada pazarlama vurgusu yapılacak) |

**Phase 0 commit grafiği:**
- `a8b4422` feat(ai): AI Co-Pilot source badge (PR #37, pending merge)
- `1113a91` chore: save .design bundle + CLAUDE.md §16
- `<Phase 0>` docs(design): Phase 0 — design.md + slide-in keyframe

**Sonraki faz için not:**
- Faz 1 başladığında `MarketingFooter.tsx` yeniden kurulacak (5→4 kolon, newsletter, ECG, live dot) ve homepage'e 5 yeni client component eklenecek (AnimatedCounter, MarqueeRow, StickyCtaBar, SocialProofToast, VideoModal).
- Referans sırası: önce `.design/site/site-premium.jsx` (nav/footer + conversion), sonra `.design/site/site-homepage-v3.jsx` (canonical content), gerekirse `.design/site/site-homepage-v2.jsx` (alternatif animasyonlar).
- Backend dokunulmaz: homepage server component, QR teaser formu `QRGeneratorForm` ile aynı API'yi çağırır.

---

## Backend açıkları

Tasarımda var ama backend'i olmayan / sadece UI olarak tamamlanacak öğeler. Her faz sırasında bu tablo doldurulur; production'a çıkmadan önce bağlanmalı.

| Feature | Tasarım referansı | Durum | UI sahibi | Yapılması gereken |
|---------|-------------------|-------|-----------|---------------------|
| Newsletter signup | `site-shared.jsx` / `site-premium.jsx` footer | yok | Faz 1 | `POST /api/newsletter` (Resend/Mailchimp) + email store |
| Stripe/Iyzico billing | `site-pages3.jsx` AdminBilling | mock `GET /api/billing/summary` + `/invoices` (501) | Faz 7 | `BillingSubscription` + `BillingInvoice` Prisma modelleri, Stripe webhook, plan change flow |
| ROI hesaplayıcı — kaydet | `site-pages3.jsx` ROICalculatorPage | UI only | Faz 3 | Opsiyonel: `POST /api/roi/save` veya localStorage + email paylaş |
| Kariyer başvurusu | `site-pages3.jsx` Careers | mock liste | Faz 5 | `POST /api/careers/apply` (attachment + HR mail) veya Ashby/Greenhouse entegrasyonu |
| Video testimonial CMS | `site-homepage-v3.jsx` / `site-marketing.jsx` | mock static | Faz 1 + 3 | Mux/Cloudflare Stream URL + `Testimonial` Prisma modeli |
| Help center articles | `site-pages3.jsx` HelpCenter | mock tree | Faz 5 | Notion/Contentful sync veya `/api/help/articles` + `HelpArticle` Prisma modeli |
| Case study CMS | `site-pages4.jsx` BlogPost (case study varyantı) | mock 3 case | Faz 3 | `CaseStudy` Prisma modeli (scaffolding.ts yorumu) + admin editör |
| Campaigns CRUD | `site-pages3.jsx` AdminCampaigns | mock `/api/campaigns` (501) | Faz 7 | `Campaign` modeli (zaten scaffolding.ts'de yorum) + QR oluşturma pipeline |
| Team management | `site-pages3.jsx` AdminTeam | mock `/api/team` (501) | Faz 7 | `TeamMember` modeli + davet email + rol bazlı scoping |
| API keys & webhooks | `site-pages4.jsx` AdminAPIPage | mock `/api/api-keys` (501) | Faz 7 | `ApiKey` + webhook delivery queue |
| OAuth Google Business Profile | AdminSettings Integrations | buton 501 | Faz 6/7 | `GoogleIntegration` modeli + OAuth 2.0 flow + places API |
| Automation rules | AdminSettings Automation | mock `/api/automations` (501) | Faz 7 | `AutomationRule` modeli (rating_lte/keyword/platform trigger → assign/email/webhook) |
| Notification preferences persist | AdminNotifications | `GET /api/notifications` döner, `PUT` 501 | Faz 7 | `NotificationPreference` modeli |
| Onboarding progress persist | `site-onboarding-v2.jsx` | mock `/api/onboarding/state` + `/complete` (501) | Faz 2 | `OnboardingProgress` modeli (zaten scaffolding.ts'de) |

---

## Sıradaki adım

**Faz 1 — Chrome + Homepage v3**

Kullanıcı onayıyla başlar. Branch `claude/design-phase-1-home` main'den açılır; Faz 0 merge'ü beklenmez — Phase 0 draft PR kendi başına gider.

İlk aksiyon: `src/components/marketing/MarketingFooter.tsx` Pulse yeniden kurgu (4-kolon + newsletter input + ECG + live dot) + `.design/site/site-premium.jsx`'teki footer JSX'ini referans al.
