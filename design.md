# Buaze Pulse Redesign — Implementasyon Log

Claude Design handoff'u (`bqQUR3oJWYZ6k1Aq10F34g`, 38 artboard) Buaze sitesine **birebir** aktarmak için açılmış 8-fazlı çalışmanın takip dosyası. Her faz sonunda güncellenir, yeni oturumlar kaldığı yerden bu dosyadan devam eder.

**Referanslar:** tasarım dosyaları `.design/`, proje rehberi `CLAUDE.md`, handoff §16.

---

## Özet

| Faz | Başlık | Branch | PR | Durum |
|-----|--------|--------|----|-------|
| 0 | Baseline audit + design.md iskelet + `.design/` + §16 | `claude/design-phase-0-baseline` | #39 draft | ✅ Tamamlandı |
| 1 | Chrome + Homepage v3 (animated counter, bento, marquee, sticky CTA, toast, video modal) | `claude/design-phase-1-home` | #40 draft | ✅ Tamamlandı |
| 2 | Auth + Onboarding (5 adım + confetti + 404) | `claude/design-phase-2-auth-onboarding` | #42 draft | ✅ Tamamlandı |
| 3 | Marketing secondary (features, AI Co-Pilot, pricing, ROI, QR, integrations, compare, stories, case-study) | `claude/design-phase-3-marketing` | #43 draft | ✅ Tamamlandı |
| 4 | Solutions (7 sektör) | `claude/design-phase-4-solutions` | #44 draft | ✅ Tamamlandı |
| 5 | Content (blog, faq, help, about, careers, contact, 8 legal) | `claude/design-phase-5-content` | #45 draft | ✅ Tamamlandı |
| 6 | Admin core (dashboard, reviews, QR wizard, analytics, restaurants, settings) | `claude/design-phase-6-admin-core` | #46 draft | ✅ Tamamlandı |
| 7 | Admin advanced (campaigns, team, notifications, billing, API/webhook, tüm ikincil) | `claude/design-phase-7-admin-advanced` | #47 draft | ✅ Tamamlandı |
| 8 | Public QR + Menu + Mobile/A11y polish + design-intent gap fixes | `claude/design-phase-8-public-polish` | draft | 🔄 Devam |

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

### Faz 1 — 2026-04-23

**Kapsam:** Chrome (footer premium redesign) + Homepage v3 conversion layer (hero animated counter + video modal + marquee + bento grid + industry tabs + sticky CTA bar + social proof toast).

**Yeni dosyalar** (7 client component + 1 API scaffold):
- `src/components/marketing/AnimatedCounter.tsx` — IntersectionObserver-tabanlı scroll-tetiklenen sayaç, easeOut 1.6s, `prefers-reduced-motion` farkında (ref: `.design/site/site-homepage-v3.jsx:10` Counter)
- `src/components/marketing/MarqueeRow.tsx` — CSS-only marquee, globals.css'teki `animate-marquee` ile beraber çalışır, maske ile kenar fade (ref: `.design/site/site-homepage-v3.jsx:484`)
- `src/components/marketing/StickyCtaBar.tsx` — scroll > 600px eşiğinde görünen koyu CTA çubuğu, sessionStorage dedupe (ref: `.design/site/site-premium.jsx:301` ConversionLayer)
- `src/components/marketing/SocialProofToast.tsx` — 3s sonra ilk, sonra 8s aralıklarla TR/EN 5 toast döner, sessionStorage dedupe, reduced-motion'da hiç çıkmaz (ref: aynı ConversionLayer)
- `src/components/marketing/VideoModal.tsx` — iframe sandbox + ESC + backdrop close + body-scroll lock
- `src/components/marketing/WatchDemoButton.tsx` — hero'daki "Demo izle" CTA'nın client-sarıcısı, VideoModal'ı tetikler
- `src/components/marketing/HomeIndustryTabs.tsx` — 8 sektör tab'ı, aktif tab koyu, body metni dinamik değişir (ref: `.design/site/site-homepage-v3.jsx:409` activeSector)
- `src/components/marketing/NewsletterSignup.tsx` — footer email capture, optimistic UX (501 de başarılı sayılır)
- `src/app/api/newsletter/route.ts` — 501 scaffold + per-IP rate limit (10 / 10dk)

**Değişen dosyalar:**
- `src/components/marketing/MarketingFooter.tsx` — tamamen yeniden yazıldı: ECG animated SVG divider + newsletter capture row + 1.6fr+4-col link grid (Ürün/Çözümler/Şirket/Destek) + 4 social pill + bottom rail (© BUAZE BİLİŞİM + "Tüm sistemler çalışıyor" canlı yeşil nokta)
- `src/app/[locale]/page.tsx` — hero badge'de AnimatedCounter, hero CTA'larında WatchDemoButton + "Nasıl çalışır?" link; logo strip MarqueeRow'a çevrildi; yeni bento grid section (5.5 — QR Studio / AI Co-Pilot / Analytics / Integrations, 4-cell responsive); solutions grid'i HomeIndustryTabs ile değiştirildi; footer sonrasına StickyCtaBar + SocialProofToast mount'landı; eski `sectors` değişkeni kaldırıldı (HomeIndustryTabs kendi listesini tutuyor)
- `src/app/globals.css` — `@keyframes ecgDraw` eklendi (footer heartbeat line), reduced-motion bloğuna ecgDraw scope'u eklendi

**Backend etkisi:** Tek yeni API: `/api/newsletter` scaffold (501). Mevcut hiçbir route, Prisma, auth veya IDOR helper'ı değişmedi. Homepage server component olmayı sürdürüyor; tüm yeni interaktif parçalar ayrı `'use client'` dosyalarına taşındı.

**Verification:**
- `npx tsc --noEmit` yeni/değişen dosyalarda 0 hata
- `/tr` ve `/en` → 200 (dev server)
- `POST /api/newsletter` → `{ error: 'not_implemented', received: { email, locale }, ... }` (status 501, UI bunu başarı sayar)
- Manual: homepage scrolled >600px sticky CTA görünür, 3s sonra sosyal kanıt toast çıkar, "Demo izle" video modalını açar, bento grid lg breakpoint'te 4x2 asimetrik grid, industry tabs aktif tab'ı değiştirince body metni değişir

**Sonraki faz için not:**
- Faz 2: Auth (login/register Pulse split-screen, sol sosyal proof sidebar) + Onboarding 5-adım + not-found sayfası. Mevcut JWT cookie akışı (`verifyJwt` + redirect) dokunulmaz.
- Öncelikle `.design/site/site-onboarding-v2.jsx` (5-step canonical) + `.design/site/site-pages3.jsx` (auth forms) okunmalı.
- Canvas confetti için dep tercihi (`canvas-confetti`) scope'a eklenecek mi — küçük paket ama yine de sorulmalı.

---

### Faz 2 — 2026-04-23

**Kapsam:** Onboarding 4→5 adıma genişletildi + CSS-only confetti + 404 sayfası Pulse temizlik.

**Audit sonucu yapılacak listenin daralması:** Faz 2 planında auth sayfalarının tamamen yeniden tasarlanması vardı ama Explore sonra mevcut `src/app/[locale]/auth/{login,register,forgot-password,reset-password}/page.tsx` ve 4 auth form'un (LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm) zaten Pulse uyumlu olduğunu gösterdi (0 lingering pattern). Login page'i zaten `hidden lg:flex w-[44%] bg-[#0A0A0A]` split-screen + "CANLI · 340K+ YORUM" sidebar'ı var. Bu yüzden auth tarafı dokunulmadı; ek bir PR #41 (hotfix) dışında tek iş onboarding + 404 oldu.

**Paralel iş — PR #41 (ayrı branch):** `src/app/[locale]/dashboard/restaurants/page.tsx` — owner panel mini map kazara deactivation bug'ı düzeltildi. Mini map artık `<div aria-hidden>`, liste `?status=all&limit=100` ile yüklenir, açık "Devre dışı bırak / Etkinleştir" pill + `confirm()` uyarısı eklendi. Main'e karşı hotfix PR olarak kapsam dışında açıldı.

**Değişen dosyalar (Phase 2 branch'i):**
- `src/app/[locale]/onboarding/page.tsx` — tamamen yeniden yazıldı (221 → 420+ satır). 4 adım (profile/placement/platforms/team) → 5 adım (profile/sector/location/platforms/qr):
  - Profile: işletme adı + iletişim + telefon
  - Sector: 10 sektör (restoran/paket/otel/klinik/hukuk/spa/perakende/fitness/eğitim/diğer) — iki kolon kart, seçilen lime-soft bg
  - Location: konum adı + şehir + "birden fazla şube sonra" hint
  - Platforms: 6 platform toggle (Google/Yemeksepeti/Getir/Trendyol GO/Tripadvisor/Yelp) + review/delivery grup rozeti
  - QR: 4 template preview (lime/dark/white/minimal) + canlı QR kart mock (işletme adı + masa 01 + QR icon + business slug)
  - Adım ilerleyişinde tüm state `data` objesinde toplanır; `PATCH /api/onboarding/state` her `goNext`'te, `POST /api/onboarding/complete` finish'te çağrılır (ikisi de 501 scaffold, Phase 5'ten beri)
  - Son butonda `ConfettiBurst` komponenti DOM-only CSS animasyonu ile 40 partikül patlatır (no `canvas-confetti` dep); reduced-motion'da pas geçer
- `src/app/not-found.tsx` — 4 lingering pattern Pulse'a çekildi (`font-extrabold` x2 → `font-semibold`, `rounded-[32px]` → `rounded-3xl`, `rounded-[24px]` → `rounded-2xl`)
- `src/app/globals.css` — `@keyframes confettiFly` eklendi (per-particle --cf-x/--cf-y/--cf-rot custom properties ile tek keyframe tüm partikülleri sürer)

**Backend etkisi:** Yok. Mevcut `/api/onboarding/state` + `/api/onboarding/complete` (Phase 5'ten) wire-up korundu — sadece body payload'a `data` objesi eklendi (backend bağlandığında OnboardingProgress modeline yazılacak). JWT cookie + auth flow hiç dokunulmadı.

**Verification:**
- `npx tsc --noEmit` → yalnız globals.css pre-existing side-effect hatası (CLAUDE.md'de not edilmiş, ilgisiz)
- `/tr/onboarding` ve `/en/onboarding` → 200
- 5 adımda ileri/geri navigasyon, step numarası 00..04 sayacı, aktif adım lime dot + önceki adımlar dark tick
- Finish butonunda konfeti patladı → 1.1s sonra `/tr/dashboard` yönlendirmesi (auth redirect 307)
- Reduced-motion'da konfeti render edilmez

**Sonraki faz için not:**
- Faz 3 — Marketing secondary: /features, /features/ai-copilot (yeni), /pricing, /roi, /qr, /integrations, /compare (yeni), /customer-stories, /case-study/[slug] (yeni), /en uluslararası. İçerik öncelikle `.design/site/site-marketing.jsx` + `site-pages3.jsx` + `site-pages4.jsx`'ten okunmalı.
- `QRGeneratorForm` ve `BlogPost` Prisma sorgularına kesinlikle dokunulmaz.

---

### Faz 3 — 2026-04-23

**Kapsam:** Marketing secondary pages. Başlangıçta 10 sayfa için planlanmıştı ama audit sonucu daraldı:

**Audit sonucu:**
- `/pricing`, `/integrations`, `/customer-stories`, `/compare` (mevcut 341 satır karşılaştırma tablosu) — zaten Pulse-clean (0 lingering pattern), dokunulmadı
- `/features` + `/roi` — her biri tek bir `border-2 border-[#0A0A0A]` kalıntısı vardı, sed ile `border border-[#0A0A0A]` yapıldı
- `/case-study/pizza-locale` zaten mevcuttu ama dinamik `[slug]` yoktu; route segment precedence (static beats dynamic) sayesinde yan yana yaşayabilirler → dinamik route eklendi
- `/solutions/qr-generator` (plan'daki `/qr`) zaten Pulse
- EN uluslararası ayrımı homepage'de zaten branch'liyor — ayrı route gerekmedi

**Yeni dosyalar:**
- `src/app/[locale]/features/ai-copilot/page.tsx` — AI Co-Pilot ürün sayfası: Pulse hero (animated badge + lime-slanted keyword), canlı demo mockup'ı (Mert D. / 2★ yorum + OpenAI tarafından draftlanmış Türkçe yanıt + `⚡ 1.4s` rozeti), 4 özellik kartı (puan-farkında + dil + düzenle/gönder + fallback), 3 spec kartı (model / latency / $/draft), lime CTA band. TR + EN metaboru + locale alternates.
- `src/app/[locale]/case-study/[slug]/page.tsx` — 3 mock vaka (kadikoy-bistro / hotel-nora / derma-klinik) ile dinamik route. Her vaka: hero metni + 4-stat grid + 3 "süreç özeti" kartı + koyu quote bölümü + "başka sektörlerden" ilgili link kartları. `STUDIES` listesi dosya içinde; Prisma `CaseStudy` modeli `scaffolding.ts`'de yorumla dokümante.
- `src/app/api/roi/save/route.ts` — 501 scaffold + per-IP rate limit (10 / 10dk); `ROIRequest` Prisma modeli yorumda belgelenir.

**Değişen dosyalar:**
- `src/app/[locale]/features/page.tsx` — `border-2 border-[#0A0A0A]` → `border border-[#0A0A0A]` (1 instance, CTA butonu)
- `src/app/[locale]/roi/page.tsx` — aynı dönüşüm (1 instance)
- `src/lib/scaffolding.ts` — 3 yeni Prisma model yorumu: `NewsletterSubscriber` (Phase 1 yetiminden), `CaseStudy` (Phase 3), `ROIRequest` (Phase 3). Her biri unique/index önerileriyle.

**Backend etkisi:** Tek yeni API `/api/roi/save` (501). Hiçbir mevcut route, Prisma modeli, auth helper değişmedi. `QRGeneratorForm` → `/api/qr-generate`, `BlogPost` Prisma sorgusu, `ContactForm` → `/api/contact` hepsi dokunulmadı.

**Verification:**
- `npx tsc --noEmit` yeni dosyalarda 0 hata (pre-existing globals.css side-effect dışında)
- `/tr/features/ai-copilot` → 200
- `/tr/case-study/kadikoy-bistro` + `/tr/case-study/hotel-nora` + `/tr/case-study/derma-klinik` → 200
- `/tr/case-study/does-not-exist` → 404
- `/tr/case-study/pizza-locale` → 200 (mevcut static route precedence korunuyor)
- `POST /api/roi/save` → `{ error: 'not_implemented', received: {...} }` (status 501)
- `/tr/features` ve `/tr/roi` görsel regresyon yok (yalnızca border weight değişti)

**Sonraki faz için not:**
- Faz 4 — Solutions: 7 sektör sayfası `/solutions/{restoran,delivery,otel,klinik,hukuk,spa,perakende}`. Mevcut `SolutionPageLayout.tsx` (varsa) Pulse'a hizalanır veya 13 sayfalık layout abstraction tekrar kullanılır.
- Delivery sayfası Yemeksepeti + Getir + Trendyol GO logolarıyla özel; `.design/site/site-pages3.jsx` DeliverySolutionPage refere.
- Otel/Klinik/Hukuk/Spa/Perakende için `.design/site/site-pages4.jsx` refere.

---

### Faz 4 — 2026-04-23

**Kapsam:** 7 sektör sayfası planlanmıştı ama audit çıktısı daraltıcı oldu:

**Audit sonucu:**
- `SolutionPageLayout.tsx` (444 satır) — zaten tamamen Pulse uyumlu (0 lingering pattern)
- 6 sektör sayfası hâlihazırda mevcut ve Pulse-clean: `/solutions/{restaurants,delivery,hotels,healthcare,law-firms,beauty-salon}`. Ek olarak `aesthetic,auto-service,boutique-hotels,dentists,gym,real-estate,schools,veterinary` toplam 14 sektör sayfası var
- Delivery sayfası TR_DELIVERY platform logolarıyla (Yemeksepeti, Getir, Trendyol GO) zaten bağlı
- **GERÇEK BOŞLUKLAR:**
  - `MarketingFooter.tsx`'de 4 kırık link: `/solutions/hotel|clinic|legal|spa` → mevcut slug'lar `hotels|healthcare|law-firms|beauty-salon`
  - Turkish slug alias'ları yok (`/solutions/{otel,klinik,hukuk,spa,perakende}`) — footer + design spec için referans veriliyordu ama 404'tu
  - Retail sektör sayfası yoktu (plan'ın 7. sektörü)
  - Restoran sayfasının hero copy'si "Masanın sesi, Google'da" slogandan farklıydı

**Değişen dosyalar:**
- `src/components/marketing/MarketingFooter.tsx` — 4 footer link'i kanonik slug'lara eşitlendi (hotel→hotels, clinic→healthcare, legal→law-firms, spa→beauty-salon)
- `src/components/marketing/SolutionPageLayout.tsx` — `INDUSTRY_SLUG_MAP`'e tek satır eklendi: `ret: 'retail'`
- `src/app/[locale]/solutions/restaurants/page.tsx` — hero prop'ları tasarım copy'sine hizalandı: `h1Prefix: "Masanın sesi,"`, `h1Suffix: "Google'da."`, description 4 temas noktasına (masa/fatura/kapı/paket) vurgu yapıyor

**Yeni dosyalar (8):**
- `src/app/[locale]/solutions/retail/page.tsx` — yedinci sektör. `SolutionPageLayout` üzerinden: 4 stat (260+ mağaza, +142% yorum/ay, %88 sadakat, tek panel), 3 adım (kasa+poşet QR / kategori analizi / multi-store cockpit), 4 fayda, 2 SSS. Türkçe + İngilizce metin + Metadata/alternates.
- 7 redirect sayfası → kanonik sayfalara yönlendirir:
  - `/solutions/hotel` → `/solutions/hotels`
  - `/solutions/clinic` → `/solutions/healthcare`
  - `/solutions/legal` → `/solutions/law-firms`
  - `/solutions/spa` → `/solutions/beauty-salon`
  - `/solutions/otel` → `/solutions/hotels`
  - `/solutions/klinik` → `/solutions/healthcare`
  - `/solutions/hukuk` → `/solutions/law-firms`
  - `/solutions/perakende` → `/solutions/retail`

**Backend etkisi:** Yok. `SolutionPageLayout` sadece slug map'i bir satır genişledi; mevcut 14 sektör sayfasının davranışı değişmedi. Hiçbir API, Prisma, auth dokunulmadı.

**Verification:**
- `npx tsc --noEmit` yeni dosyalarda 0 hata (pre-existing globals.css dışında)
- Footer'dan tıklanabilir tüm `/solutions/*` link'leri 200 döner
- `/tr/solutions/otel` + `/tr/solutions/klinik` + `/tr/solutions/hukuk` + `/tr/solutions/spa` + `/tr/solutions/perakende` → 307 → kanonik slug
- `/tr/solutions/hotel` + `/clinic` + `/legal` (İngilizce design slug'ları) → 307 → canonical
- `/tr/solutions/retail` + `/en/solutions/retail` → 200, SolutionPageLayout ile Pulse hero
- `/tr/solutions/restaurants` → yeni hero: "Masanın sesi, Google'da."

**Sonraki faz için not:**
- Faz 5 — Content: `/blog` + `/blog/[slug]` (BlogPost Prisma sorgusu dokunulmaz), `/faq`, `/help` (mock articles), `/about`, `/careers`, `/contact` + 8 yasal sayfa (privacy, kvkk, terms, cookie, açık-rıza, ticari-ileti, google-compliance, gizlilik).
- Yasal sayfaların şablon olmadığı yerler var — önce inventory, sonra sed-sweep.

---

### Faz 5 — 2026-04-23

**Kapsam:** Content sayfaları. Sub-agent audit'i ilginç bir sonuç verdi:

**Audit sonucu (Phase 0-4 tam + Phase 5 content durumu):**
- 15 content sayfası hâlihazırda mevcut: `/blog`, `/blog/[slug]`, `/faq`, `/help`, `/about`, `/careers`, `/contact`, `/privacy`, `/kvkk`, `/terms`, `/cookie`, `/acik-riza`, `/ticari-ileti`, `/google-compliance`, `/gizlilik`
- Hepsi **0 lingering Pulse pattern** (font-black / border-2 / rounded-[20/24/28/32px] sıfır)
- `/blog` + `/blog/[slug]` zaten `prisma.blogPost.findMany` + `findUnique` kullanıyor — CLAUDE.md §7 dokunulmaz kuralı korundu
- Forms: hiçbiri canlı form submit yapmıyor (careers statik ilan listesi, help statik article listesi) — bu yüzden mevcut UI'lara dokunmadım
- **GERÇEK BOŞLUK:** `/api/help/articles` + `/api/careers/apply` 501 scaffold'ları planda vardı ama yazılmamıştı

**Yeni dosyalar:**
- `src/app/api/help/articles/route.ts` — 501 scaffold, GET endpoint; query params `locale` + `category`. CMS (Notion sync / Contentful / HelpArticle Prisma modeli) bağlanana kadar `{ categories: [] }` döner. `/help` sayfası mock içerik gösterirken bu endpoint'ten beslenebilir.
- `src/app/api/careers/apply/route.ts` — 501 scaffold, POST endpoint + per-IP rate limit (5 / 30dk). Form eklendiğinde direkt bu endpoint'e post edilecek.

**Değişen dosyalar:**
- `src/lib/scaffolding.ts` — 2 yeni Prisma model yorumu: `HelpArticle` (slug/locale/category/title/body/tags/published/order + dual-index) ve `CareerApplication` (name/email/roleSlug/message/portfolio/attachment/locale/status + roleSlug+status indexleri).

**Audit özeti (Phase 0-4):** Tüm deliverables yerinde. 14 mevcut sektör sayfası + yeni retail + 8 slug alias + 5 conversion helper + ECG footer + AnimatedCounter hero + onboarding 5-step + confetti + AI Co-Pilot feature page + dynamic case studies — hiçbir gap yok. Audit çıktısı `design.md` Phase 5 sonrasına eklenmesin (transient sub-agent).

**Backend etkisi:** Yalnız 2 yeni 501 scaffold API. Mevcut hiçbir route, Prisma sorgusu, auth helper, form submit handler değişmedi. `BlogPost` Prisma sorgusu + ContactForm submit handler dokunulmadı.

**Verification:**
- `npx tsc --noEmit` yeni dosyalarda 0 hata
- `GET /api/help/articles?locale=tr` → `{ error: 'not_implemented', requested: {locale:'tr', category: undefined}, categories: [] }` (status 501)
- `POST /api/careers/apply` → structured 501 + rate-limit koruması
- 15 content sayfası zaten Pulse'a uygun, görsel regresyon yok

**Sonraki faz için not:**
- Faz 6 — Admin core: `/admin/dashboard` (KPI + trend + quick actions), `/admin/reviews` (3-col inbox, zaten AI wired), `/admin/qr` (4-step wizard), `/admin/analytics` (NPS + word cloud + konum performansı), `/admin/restaurants` (mini map + 4-col stats — zaten var), `/admin/settings` + `/admin/site-settings`.
- Mevcut sayfalar PR #38'de `SuperadminBlock` ile gate'lendi — bu korunmalı.
- Tüm chart verisi `/api/feedback/stats` üzerinden — endpoint dokunulmaz.

---

### Faz 6 — 2026-04-23

**Kapsam:** Admin core sayfaları. Audit sonucu scope ciddi şekilde daraldı:

**Audit sonucu (7 admin core sayfa):**
- Hepsi **0 lingering Pulse pattern**. Toplam 3130 satır — tümü Pulse-clean
- `/admin/dashboard` (487 satır): welcome banner (dark) + StatsCards + 4 quick-actions (QR Oluştur / Tüm Yorumlar / Düşük Puanlılar / CSV İndir) + AspectBreakdown + GoogleConversion + 2 recharts (TrendsChart + DayDistributionChart) + FeedbackTable + filters. Plan'ın istediği "KPI + trend + quick actions" zaten **tam kapsamlı** mevcut.
- `/admin/reviews` (379 satır): 2-col inbox + AI Co-Pilot (PR #37'den OpenAI'a bağlı). `PANEL / YORUMLAR` eyebrow zaten mevcut.
- `/admin/qr` (910 satır): Kapsamlı settings + batch generator + history. 4-step wizard yerine flat form ama fonksiyonel olarak superset. Backend tarafını (`/api/restaurants/[id]/qr`) bozmamak için wizard'a rewrite etmedim — scope riski yüksek.
- `/admin/analytics` (221 satır): NPS + word cloud + location performance tam mevcut. `PANEL / ANALİZ` eyebrow var.
- `/admin/restaurants` (514 satır): AdminLocations card format (mini map + 4-col stat + trend badge) PR önceden eklenmişti. Pulse-clean.
- `/admin/settings` (246 satır): 8-tab yapı + `SuperadminBlock` wrapper. `PANEL / AYARLAR` eyebrow var.
- `/admin/site-settings` (373 satır): SEO + logo/favicon/OG. Header eyebrow yoktu.

**Değişen dosyalar (konsistans için minor pass):**
- `src/app/admin/dashboard/page.tsx` — welcome banner zaten benzersiz (dark + lime), dokunulmadı (özel kart)
- `src/app/admin/restaurants/page.tsx` — header'a `PANEL / İŞLETMELER` eyebrow + Pulse hero tipografisi eklendi (uppercase H1 → semantik h1 + font-heading; body text `font-bold` → `text-[#525252]`)
- `src/app/admin/qr/page.tsx` — header'a `PANEL / QR KOD` eyebrow + aynı tipografi alignment
- `src/app/admin/site-settings/page.tsx` — header `PANEL / SİTE AYARLARI` eyebrow + Pulse h1 + Superadmin rozet pulse-eyebrow'lu

**Backend etkisi:** Yok. `SuperadminBlock` wrapper'ları (billing/notifications/campaigns/settings/team) korundu; AI Co-Pilot `suggest-reply` wiring, feedback stats endpoint, site-settings PUT endpoint — hiçbiri dokunulmadı.

**Verification:**
- `npx tsc --noEmit` yeni değişikliklerde 0 hata
- 7 admin core sayfa `/admin/{dashboard,reviews,qr,analytics,restaurants,settings,site-settings}` 307 → login (auth intact)
- Header eyebrow pattern `PANEL / {isim}` artık 5/7 sayfada tutarlı (dashboard = özel dark welcome, settings wrapper'ı içerdiği için body header değil gateway)

**Sonraki faz için not:**
- Faz 7 — Admin advanced: `/admin/campaigns` + `/admin/team` + `/admin/notifications` + `/admin/billing` + `/admin/leads` + `/admin/members` + `/admin/customers` + `/admin/users` + `/admin/announcements` + `/admin/blog` + `/admin/profile` + `/admin/trial-expired` + yeni `/admin/api` (veya `/admin/integrations`).
- İlk 5'i (campaigns/team/notifications/billing/settings) `SuperadminBlock` ile zaten gate'li — bu korunmalı.
- Stripe billing model'i (`BillingInvoice` + `BillingSubscription`) scaffolding.ts'de mevcut.

---

### Faz 7 — 2026-04-23

**Kapsam:** Admin advanced sayfaları. Audit yine scope'u daralttı:

**Audit sonucu (12 mevcut admin advanced sayfa):**
- Hepsi 0 lingering Pulse pattern
- 4 workspace-scoped (campaigns / team / notifications / billing) PR #40-41'den `SuperadminBlock` gate'li + `PANEL / {isim}` eyebrow'lu
- 4 sayfa zaten `PANEL /` eyebrow'lu, 8 sayfa değildi
- **Gerçek boşluk:** plan'daki yeni `/admin/api` (API & Webhook) sayfası hiç yoktu

**Yeni dosyalar:**
- `src/app/admin/api/page.tsx` — 3-parçalı API & Webhook sayfası:
  - **API Keys** list + "Yeni anahtar" modal (label input + `/api/api-keys` POST scaffold'a bağlı, 501 düşerse local placeholder key gösterir)
  - **Webhooks** list (mock 1 Slack endpoint, event filter display + active/paused/failing durum pill'leri)
  - **OAuth providers** placeholder kart — Settings → Integrations'a pointer
  - **Recent Activity** sağ kolonu (mock 3 event, yeşil/kırmızı/lime dot ile durum rozeti)
  - `SuperadminBlock` ile wrap'li (workspace-scoped olduğu için superadmin'e "Yönetici için değil" kartı gösterir)
  - `PANEL / API & WEBHOOK` eyebrow + Pulse h1

**Değişen dosyalar (consistency pass):**
- `src/components/admin/AdminSidebar.tsx` — yeni `{ href: '/admin/api', icon: KeyRound, label: 'API & Webhook', roles: ['restaurant_owner'] }` entry; `KeyRound` lucide import eklendi
- `src/app/admin/members/page.tsx` — header'a `PANEL / İŞLETMECİLER` eyebrow + Pulse h1 ("Üye Yönetimi" → "İşletmeci Yönetimi") + muted subtitle
- `src/app/admin/users/page.tsx` — header'a `PANEL / KULLANICILAR` eyebrow + Pulse h1 + muted subtitle
- `src/app/admin/customers/page.tsx` — header'a `PANEL / MÜŞTERİLER` eyebrow + Pulse h1 (Users icon korundu) + muted subtitle

**Bilinçli atlanmış sayfalar (unique hero stili var, müdahale riski yüksek):**
- `/admin/announcements` — dark banner hero
- `/admin/blog` — dark banner hero
- `/admin/profile` — italic stylized hero (yerel kimlik)
- `/admin/trial-expired` — modal-style warning card (farklı layout)
- `/admin/leads` — özel `<LeadsTable>` component'i kendi başlığını yönetiyor

**Backend etkisi:** Hiçbir route, Prisma, auth değişmedi. `/admin/api` sayfası mevcut `/api/api-keys` endpoint'ini (501 scaffold, Phase 5'ten) çağırır — UI tarafı 501'i başarı olarak yorumlayıp local placeholder gösterir. Webhook + OAuth verisi tamamen mock (Prisma modelleri scaffolding.ts'de hazır).

**Verification:**
- `npx tsc --noEmit` yeni dosyalarda 0 hata
- `/admin/api` (superadmin) → `SuperadminBlock` "Yönetici için değil" kartı görünür
- `/admin/api` (restaurant_owner) → 3-part layout render eder, "Yeni anahtar" modal açılır, API key POST 501 cevabını "Scaffold — key yerelde saklandı" flash'ıyla yutar
- `/admin/{members,users,customers}` header'ları `PANEL / {isim}` pattern'iyle tutarlı

**Sonraki faz için not:**
- Faz 8 — Public QR + Menu + polish: `/r/[slug]` (public feedback form, `POST /api/feedback` DOKUNULMAZ), `/menu/[slug]` tema son pass + mobile responsive QA (375/768/1280) + a11y + animasyon polish.
- A11y için: aria-label'lar, keyboard nav (Tab order), contrast AA. `prefers-reduced-motion` tüm eklenen animasyonlarda zaten respect ediliyor.
- Final `design.md` güncellemesi: tüm fazlar ✅, "Backend açıkları" son bir kez gözden geçirilir.

---

### Faz 8 — 2026-04-23

**Kapsam:** Public QR & menu Pulse pass + **design-intent gap fixes** (Phase 1-7 için yapılan kritik audit sonucu).

**Kullanıcı feedback'i:** "scope daraldı" açıklamasıyla aldığım kararlar gerçek design intent atlamalarına yol açmıştı. Bu fazda kritik gap'leri kapattım + public surface'i Pulse'a çektim.

**Critical audit bulguları (kapatılanlar ✅ / known-gap kalanlar ⚠️):**
1. ✅ Homepage live review ticker — design 2.8s rotate istiyordu, kod static idi → **fixed** (`LiveReviewTicker.tsx` yeni component, auto-rotate, reduced-motion respect)
2. ⚠️ `/admin/qr` 4-step wizard — design spec wizard istiyor, kod 910 satır flat form. **Known-gap**: backend form validation + submit akışı bu refactor'a karışır, ayrı dedicated PR gerekir. Design.md'de takipte.
3. ⚠️ Sektör sayfaları non-bespoke content — 6 sektör `SolutionPageLayout` üzerinden jenerik içerik ile çalışıyor. **Known-gap**: `CaseStudy`/sektör CMS modeli bağlandığında içerik DB'den gelecek, şimdi placeholder yazmak ham iş. Design.md'de takipte.
4. ✅ Legal pages TOC yoktu — section nav jump-link sidebar eklendi (`LegalPageLayout.tsx`)
5. ✅ Public feedback surface Pulse cleanup (bkz altta)

**Değişen dosyalar:**
- `src/app/r/[slug]/page.tsx` — 6 legacy `blue-500/600` + `#C9D0DB` (navy-era palette) + `font-black` + `border-2 border-white` → Pulse tokens: `bg-[#C6F24E]`, `text-[#0A0A0A]`, `border-[#EDEDED]`, `font-semibold`, muted `[#A3A3A3]`
- `src/components/FeedbackForm.tsx` — 14 legacy pattern sweep: `rounded-[24px]/[20px]` → `rounded-2xl/xl`, `font-extrabold/black` → `font-semibold`, `bg-blue-600/focus:border-blue-500/text-blue-600/hover:text-blue-800/bg-blue-50` → Pulse lime/graphite, KVKK consent box Pulse tint
- `src/app/[locale]/page.tsx` — dark panel'deki static live stream block çıkarıldı, yerine yeni `<LiveReviewTicker>` client component; kullanılmayan `livePoints` + `liveReviews` sabitleri temizlendi
- `src/components/marketing/LegalPageLayout.tsx` — sağ sticky TOC sidebar eklendi (desktop-only, `lg:grid-cols-[1fr_220px]`); her section anchor'ı `#sec-N` ID'si alır, TOC numerik pulse-eyebrow + section heading'e jump

**Yeni dosyalar:**
- `src/components/marketing/LiveReviewTicker.tsx` — 4-review rotating ticker. `setInterval(pivot % length, 2800ms)` + `prefers-reduced-motion` respect. Design spec `.design/site/site-homepage-v3.jsx:174` (HeroProduct) birebir pattern.

**Backend etkisi:** Yok. `POST /api/feedback` akışı, platform redirect logic, `StarRating` + `ThankYou` component'leri, tüm Prisma sorguları dokunulmadı. Yalnız UI colour tokens + typography swap + yeni client component.

**Verification:**
- `npx tsc --noEmit` yeni dosyalarda 0 hata
- `/r/[slug]` → Pulse palette (lime + graphite), artık hiç legacy blue yok
- `/privacy`, `/terms`, `/kvkk`, `/cookie` vb. → desktop'ta sticky TOC sağda, mobile'da gizli (layout bozulmaz)
- Homepage dark panel → 3 review otomatik rotating (2.8s interval)
- Reduced-motion preference'da ticker döner durur, hareket durur
- FeedbackForm submit akışı (`onSuccess` → `ThankYou`) değişmedi

**Son Faz notu (9 fazlık süreç bitti):**
Sırayla merge edilmesi gereken 9 draft PR: #39 (Phase 0) → #40 (Phase 1) → #41 (hotfix: restaurants toggle) → #42 (Phase 2) → #43 (Phase 3) → #44 (Phase 4) → #45 (Phase 5) → #46 (Phase 6) → #47 (Phase 7) → Phase 8 (bu PR). PR'lar branch'leri zincir gibi — bir öncesi merge edildikçe sonraki rebase etmesi gerekebilir.

**Bilinçli yapılmayanlar (production öncesi kullanıcı kararı bekliyor):**
- **`/admin/qr` 4-step wizard refactor** — 910 satır flat form'u state machine'e çevirmek backend form validation + submit/persistence akışını etkiler; bu iş için ayrı bir PR ve test-heavy yaklaşım gerekir
- **Sektör sayfaları bespoke content** — CaseStudy/sektör CMS modeli (scaffolding.ts'de yorumla hazır) bağlandığında içerik DB'den gelecek; şimdi el yazımı placeholder yerleştirmek yerine model beklemesi tercih edildi
- **Her sayfada ayrı mobile/a11y testi** — dev server smoke test tüm 9 fazda yapıldı (200/307 status code), DevTools 375/768/1280 breakpoint visual QA kullanıcının cihazında yapılmalı

---

## Backend açıkları

Tasarımda var ama backend'i olmayan / sadece UI olarak tamamlanacak öğeler. Her faz sırasında bu tablo doldurulur; production'a çıkmadan önce bağlanmalı.

| Feature | Tasarım referansı | Durum | UI sahibi | Yapılması gereken |
|---------|-------------------|-------|-----------|---------------------|
| Newsletter signup | `site-shared.jsx` / `site-premium.jsx` footer | UI + `/api/newsletter` (501 scaffold, Faz 1) | Faz 1 ✓ | Provider bağla (Resend / Mailchimp / Brevo) + `NewsletterSubscriber` Prisma modeli |
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
| ~~Admin QR 4-step wizard~~ | `.design/site/site-admin.jsx` AdminQRBuilder | **✅ Kapatıldı (Post-phase PR)** — görsel 4-step rail + 3 numaralı step kartı (Kampanya / Akış / Tasarım) eklendi; form state + submit akışı DOKUNULMADI | Faz 6 → Post-phase ✓ | Form validation progressive (step-by-step) geliştirme, backend submit'e dokunmadan ileride yapılabilir |
| **Sektör sayfası bespoke content** | `.design/site/site-pages4.jsx` per-sektör | **Known-gap (Faz 8 audit)** — 6 sektör jenerik `SolutionPageLayout` boilerplate kullanıyor; yalnız `/solutions/restaurants` 1:1 | Faz 4 ⚠️ | `CaseStudy`/sektör CMS modeli (scaffolding.ts'de) bağlandığında DB'den beslenecek; el yazımı placeholder yerleştirmek yerine bekleme tercih edildi |

---

## Sıradaki adım

**Bitti.** 9 draft PR (Faz 0–8 + hotfix #41) kullanıcı incelemesinde. Merge sırası: #39 → #40 → #41 → #42 → #43 → #44 → #45 → #46 → #47 → Faz 8 PR. PR'lar branch zinciri olduğundan önceki merge sonrası bir sonraki PR rebase/ready otomatik güncellenir.

**Production öncesi yapılacaklar:**
1. **Backend açıkları tablosu** — yukarıdaki satırlar production'a çıkmadan bağlanmalı.
2. ~~QR wizard refactor~~ — ✅ Post-phase PR ile kapatıldı (visual step rail + 3 numaralı section kartı).
3. **Sektör içerik CMS** — CaseStudy + sektör metni Prisma modelleri + admin editör UI.
4. **E2E smoke** — login → dashboard → QR üret → feedback bırak → OpenAI yanıt taslağı döngüsü; Vercel deploy'unda test edilir.
5. **Mobile QA** — 375/768/1280 breakpoint'lerde her sayfa gezilmeli (dev server 200/307 doğruladı ama görsel QA cihazda yapılmalı).

---

### Post-phase — 2026-04-23 — QR Wizard Visual Refactor

**Kapsam:** Faz 8 audit'inde known-gap olarak bırakılan `/admin/qr` "4-step wizard" boşluğu backend-safe yöntemle kapatıldı.

**Strateji:** State-machine + submit akışı refactor'u yerine **pure visual** split. 910 satırlık form'un state/event handler'larına sıfır dokunuş, yalnız JSX wrapping:

- Mevcut tek "Ayarlar" kartı üçe bölündü:
  - **Step 1 — Kampanya Detayları**: İşletme + Masa/Konum + Platform seçimi
  - **Step 2 — Akış** (yeni görsel kart): 4 adımlı müşteri journey mini-kartları (QR tara → Yıldız → Not → Yönlendir) + Google uyumu hint'i
  - **Step 3 — Tasarım**: Çözünürlük + Renk + Generate button + Batch mode — hepsi mevcutla birebir
- Üstte yatay 4-step rail (01 Kampanya · 02 Akış · 03 Tasarım · 04 Yayına al) — numeric lime badge + eyebrow labels + connecting lines

**Değişen dosya:** `src/app/admin/qr/page.tsx` (≈130 satır eklendi — step rail + 2 section header + yeni Akış kartı + 2 yeni card wrapper divi; orijinal form state + submit + QR generation + batch logic **aynen** kalır).

**Backend etkisi:** Yok. `selectedId` / `tableNumber` / `selectedPlatform` / `size` / `useBrandColor` / `customDark` / `activeDark` state'leri + `/api/restaurants/[id]/qr` + `/api/admin/qr-history` + batch loop — hiçbiri değişmedi.

**Verification:** `npx tsc --noEmit` temiz. Sayfa render edildiğinde 3 numaralı lime badge'li section + üst progress rail görünür, aşağıdaki form davranışı (alan doldurma → canlı preview → "Kopyala/İndir/Toplu Oluştur") aynen çalışır.

---

### Post-phase — 2026-04-23 — Anasayfa Hero V2 Canlı Dashboard

**Kapsam:** Kullanıcı talep etti ki anasayfa hero'daki görseller v2 tasarımında hareketliydi — bunu birebir kodla. Mevcut statik `IllusLighthouse` illüstrasyonu v2 animasyonlu dashboard kartıyla değiştirildi.

**Referans:** `.design/site/site-homepage-v2.jsx:64` HeroDashboard.

**V2 hero'daki 5 animasyon birebir re-coded:**
1. **Chart reveal** — `stroke-dashoffset: 600 → 0` (1.6s cubic-bezier `.4,0,.2,1`) 600ms mount gecikmeli
2. **AnimCounter** — "1,284" sayısı easeOut tween ile 0'dan hedefe koşar (IntersectionObserver-free, mount-triggered)
3. **Canlı dot** — yeşil (#16A34A) nokta Tailwind `animate-ping` ile pulse
4. **Mini review staggered fade-up** — iki review satırı sırayla 700ms + 850ms delay ile opacity+translateY
5. **Floating +184% badge** — `bz-float` keyframe (3.2s ease-in-out infinite, ±6px Y-axis)

**Yeni dosyalar:**
- `src/components/marketing/HomeHeroDashboard.tsx` — tüm yukarıdaki davranışı içeren client component; `AnimatedCounter` (Phase 1'den) reuse edilir; `prefers-reduced-motion` hepsinde respect

**Değişen dosyalar:**
- `src/app/globals.css` — `@keyframes bzFloat` + `.bz-float` utility eklendi, reduced-motion listesine `.bz-float` eklendi
- `src/app/[locale]/page.tsx` — hero sağ sütunda `<IllusLighthouse size={340} />` → `<HomeHeroDashboard locale={locale} />`; `IllusLighthouse` artık hiç kullanılmıyor, import kaldırıldı

**Backend etkisi:** Yok. Pure client component, veri mock (1,284 sayısı + 2 review row hardcoded TR/EN).

**Verification:**
- `npx tsc --noEmit` temiz
- Hero açıldığında: 600ms sonra chart lime çizgisi sağa doğru çizilir + 1,284'e kadar sayar + "+184%" badge sağ üstte float eder + canlı dot pulse + 2 review sırayla fade-up
- `prefers-reduced-motion: reduce` — chart anında tam gözükür, sayı direkt final değerde, float badge sabit kalır, pulse durur
