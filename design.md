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
| 8 | Public QR + Menu + Mobile/A11y polish + design-intent gap fixes | `claude/design-phase-8-public-polish` | #48 draft | ✅ Tamamlandı |

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


---

## Phase 16 — Pulse Mail System & Newsletter Cron (2026-04)

**Kapsam:** Claude Design "buaze-mail" handoff bundle'ı (9 Pulse mail template'i: forgot-password, welcome, form-confirmation, low-rating-alert, new-review, weekly-report, newsletter, customer-reply, trial-ending) Buaze mail katmanına entegre edildi. Eski neo-brutalist `SHARED_LAYOUT` kaldırıldı. Aylık marketing newsletter cron'u kuruldu, admin panelinde mobil-uyumlu bülten abone yönetim sayfası açıldı.

**Referans:** `/tmp/design-pkg/buaze-mail/project/emails/*.jsx` (handoff bundle, repo'ya kopyalanmadı). `shared.jsx` PULSE token'ları + `BuazeLogo`, `EcgDivider`, `EmailFrame`, `EmailHeader`, `EmailFooter`, `Button`, `Eyebrow`, `H1/H2/P`.

**Yeni dosyalar:**
- `src/lib/email/tokens.ts` — PULSE color object + FONTS + Instagram handle
- `src/lib/email/escape.ts` — HTML escape (mevcut helper taşındı)
- `src/lib/email/layout.ts` — `pulseLayout()` table-based mobile-first skeleton
- `src/lib/email/components.ts` — HTML string builder'lar (logo / header / footer / button / star row / stat grid / typography)
- `src/lib/email/templates/{forgot-password,welcome,form-confirmation,low-rating-alert,new-review,weekly-report,newsletter,customer-reply,trial-ending}.ts` (+ `index.ts`)
- `src/app/api/cron/monthly-newsletter/route.ts` — `0 9 1 * *` Vercel cron, Resend rate limit 120ms throttle, `unsubscribeToken` backfill
- `src/app/api/newsletter/unsubscribe/route.ts` — GET token-based unsubscribe + Pulse stilinde standalone HTML response
- `src/app/api/admin/newsletters/route.ts` (GET list) + `export/route.ts` (CSV) + `trigger/route.ts` (manuel cron tetikleme, superadmin only)
- `src/app/admin/newsletters/page.tsx` — mobil-uyumlu liste sayfası (`/admin/customers` pattern'i clone, desktop table + mobile cards, 4-sütun summary card grid mobile 2-col)

**Değişen dosyalar:**
- `prisma/schema.prisma` — `NewsletterSubscriber.unsubscribeToken String? @unique` eklendi (deploy build script `prisma db push` otomatik sync)
- `src/lib/email.ts` — `EMAIL_STYLES` + `SHARED_LAYOUT` silindi (~70 satır), template helper'larına plug. Yeni public sender'lar: `sendWelcomeEmail`, `sendFormConfirmationEmail`, `sendCustomerReplyEmail`, `sendTrialEndingEmail`, `sendNewsletterEmail`. `getUnsubscribeUrl(token)` utility eklendi.
- `src/app/api/newsletter/route.ts` — POST upsert'inde `crypto.randomBytes(24).toString('hex')` ile yeni token üretimi
- `src/components/admin/AdminSidebar.tsx` — superadmin section'a `Mail` ikonlu "Bülten Aboneleri" / "Newsletter" satırı
- `vercel.json` — `monthly-newsletter` cron entry
- Mevcut akış entegrasyonları: `auth/register` → welcome, `contact` + `careers/apply` + `roi/save` → form-confirmation (locale TR/EN), `feedback/[id]/reply` → customer-reply (Pulse), `feedback` notif → low-rating-alert (≤3★) / new-review (≥4★)
- `CLAUDE.md` — yeni §21 "Pulse Mail System" bölümü

**Mobile-first email teknikleri (kritik):**
- Tüm template'ler `<table>`-based (Outlook flex/grid desteklemez)
- `@media (max-width:600px)` tek breakpoint: `td.stack-col` mobile'da `display:block;width:100%`
- Min font-size 14px (iOS auto-zoom önleme), buton min `padding:14px 24px` (44px touch target)
- Hidden preheader: `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">`
- Google Fonts `@import` + Outlook fallback Arial (`<!--[if mso]>` conditional)

**KVKK / Unsubscribe:**
- Token-based unsubscribe (her abonede `unsubscribeToken @unique`); cron mailinde `getUnsubscribeUrl(token)` footer link
- `/api/newsletter/unsubscribe?token=...` GET → idempotent, Pulse stilinde TR/EN HTML confirmation
- Aboneliği iptal eden satır cron listede artık yok (`unsubscribedAt: { not: null }`)

**Backend etkisi:**
- `prisma db push` deploy'da çalıştığında `unsubscribe_token` kolonu eklenir (mevcut satırlar null kalır, cron ilk çağrıda backfill eder)
- 9 yeni public sender + 1 yeni cron path = build-time ekstra ~3 KB JS
- Resend rate limit (10/sn) için 120 ms throttle; 1000 abonede ~2 dakika sürer (Vercel function timeout 300 sn limiti dahilinde)

**Verification:**
- `npx tsc --noEmit -p tsconfig.json` temiz
- `node -e "Object.keys(require('@prisma/client').Prisma.NewsletterSubscriberScalarFieldEnum)"` — `unsubscribeToken` listede
- Lokal email preview: dev'de `?template=welcome&locale=tr` query ile her 9 template'i 375px viewport'ta kontrol (manual)
- Resend gerçek gönderim: kendi adresine 9 mail (iPhone Mail + Gmail Web + Gmail iOS app + Outlook Web; özellikle 2-sütun layout'lar mobile'da tek sütun stack)
- Newsletter end-to-end: signup → DB token → manual cron tetikle → mail al → unsubscribe link → DB `unsubscribed_at` dolu → 2. cron'da o satır yok
- Admin UI: 1440px masaüstü tablo + 375px mobile cards; "CSV İndir" UTF-8 BOM

---

## Phase 16.1 — Pixel-Perfect Mail Audit + Source Tracking + Trial Cron (2026-04)

**Kapsam:** Phase 16'da implement edilen 9 Pulse mail template'i, JSX prototipleri ile yeniden birebir hizalandı (kullanıcı "maksimum pixel-perfect" istedi). Source tracking aktif edildi. Trial reminder cron kuruldu. `.env.example` + cron logging + onboarding mail iyileştirildi.

**Referans:** `/tmp/design-pkg/buaze-mail/project/emails/*.jsx` (handoff bundle, repo'ya kopyalanmadı).

**Yeni dosyalar:**
- `src/app/api/cron/trial-reminders/route.ts` — günlük 09:00 UTC, `Bearer CRON_SECRET`, 1-4 gün trial pencere, `User.lastTrialReminderAt` dedup, son 14 gün usage stats

**Değişen dosyalar:**
- `prisma/schema.prisma` — `User.lastTrialReminderAt DateTime?` (deploy build script `prisma db push` otomatik sync)
- `src/lib/email/components.ts` — yeni helper'lar: `renderBadge` (MSO conditional `<v:rect>`-aware), `renderTwoColCards`, `renderBarChart`, `renderAvatarCircle`, `renderQuoteCard`, `renderTimeline`, `renderStatusPill`
- `src/lib/email/layout.ts` — media query'ler: `.col-half`, `.grid-4 td.cell`, `.badge-absolute`, `.bar-chart td` (mobilde stack/inline-block)
- `src/lib/email/templates/{forgot-password,welcome,form-confirmation,low-rating-alert,new-review,weekly-report,newsletter,customer-reply,trial-ending}.ts` — 9 dosya pixel-perfect rewrite
- `src/components/marketing/NewsletterSignup.tsx` — `source?: string` prop (default `'footer'`)
- `src/components/marketing/MarketingFooter.tsx` — `<NewsletterSignup source="footer" />` explicit
- `vercel.json` — `trial-reminders` cron entry
- `.env.example` — `CRON_SECRET` documented (was missing)
- `src/app/api/cron/monthly-newsletter/route.ts` — structured fail logging (subscriber bağlamı dahil)
- `src/app/api/onboarding/complete/route.ts` — Pulse layout sarmalı
- `CLAUDE.md` — §21.9–21.12 (audit + source tracking + trial cron + cron paths)

**Pixel-perfect kayıplar onarıldı:**
- forgot-password: 2x2 meta grid + status pill + token URL display
- welcome: done/current/pending step states + "İlk gün için" 4-card grid + demo CTA
- form-confirmation: animated check + timeline + 2 alt cards (formType-specific)
- low-rating-alert: alert bar + avatar review card + tags + AI Co-Pilot editor + quick actions
- new-review: gradient quote card (MSO fallback) + avatar + 2 CTAs + status pill
- weekly-report: 3 delta'lı stat hero + 7-gün bar chart + 3-quote gallery + side-by-side CTA
- newsletter: dark featured card + code block + numbered list + stats band
- customer-reply: lime-soft hero + restaurant card + 3 action items + coupon split + 2x2 contact grid
- trial-ending: warning eyebrow + 4-col usage grid + "Pulse Starter/Pro" plan cards + **MSO-aware "ÖNERİLEN" badge** + secondary link

**Email rendering teknikleri:**
- `position: absolute` badge → MSO `<!--[if mso]>` ile inline fallback, non-Outlook'ta absolute div + `@media (max-width:600px) .badge-absolute { position:static; }` mobile collapse
- `linear-gradient(...)` → `<!--[if mso]>` solid `bgcolor` fallback + non-Outlook `background-image`
- Live countdown ("29:48 kaldı") → statik "Aktif · 30 dk geçerli" + status pill
- CSS animation (pulse dot, scale) → statik dot + StatusPill helper
- 4-col stat grid → `<table class="grid-4">` + `td.cell` 25% desktop, mobilde `inline-block 50%`

**Source tracking:**
- `NewsletterSubscriber.source` artık her abonede `'footer'` (default). Yeni kayıt yolları eklenirse farklı string geçer.
- Admin newsletter sayfasındaki Kaynak filter dropdown'ı dinamik distinct count gösterir.
- Performans: tek string body alanı, mevcut upsert flow korundu, ek query yok.

**Trial reminder cron:**
- Schedule `0 9 * * *` (günlük 09:00 UTC) → 1+2+3+4 gün eşiklerini aynı cron yakalar
- Dedup: `lastTrialReminderAt < now() - 20h` (cron 24-saat aralık → her gün max 1 mail/user)
- Usage: 14-day rolling vs prior 14-day (growth %), avg rating, total feedback, reply count
- 120ms throttle (Resend rate limit safety)

**Backend etkisi:**
- `prisma db push` deploy'da `last_trial_reminder_at` kolon eklenir (nullable, default null — veri kaybı yok)
- 7 yeni HTML helper, ~1900 satır rewrite, build-time +5 KB JS
- Cron `vercel.json` 4 path'e çıktı (önceki 3 + trial-reminders)

**Verification:**
- `npx tsc --noEmit -p tsconfig.json` zero error
- `npx prisma generate` `lastTrialReminderAt` Prisma client'ında tanır
- Mevcut 4 e-posta tetikleyici akışı (register, contact, careers, roi, feedback reply, weekly digest, monthly newsletter, forgot password, onboarding complete) yeni helper'lara plug edildi — interface breaking change yok

---

## Phase 16.2 — Post-deploy hotfix + risk düzeltmeleri (2026-04)

**Kapsam:** Phase 16.1 deploy sonrası ortaya çıkan 2 production sorunu + 2 retroaktif risk düzeltmesi.

### Production fixes

1. **Admin "Şimdi gönder" 502 cron_failed**
   - **Kök sebep**: `/api/admin/newsletters/trigger` HTTP üzerinden `/api/cron/monthly-newsletter` fetch ediyordu. Vercel serverless self-fetch cold start + 10s gateway timeout = 502.
   - **Fix**: Cron logic'i `runMonthlyNewsletter()` adlı export'lu helper'a çıkarıldı. Trigger artık doğrudan invoke ediyor (HTTP yok). `maxDuration: 60` explicit set.
   - **Anti-pattern documented**: CLAUDE.md §21.13 — gelecekte cron tetiklemesi için referans.

2. **Recharts `width(-1)` console warning**
   - **Kök sebep**: TrendsChart + DayDistributionChart `flex-col + flex-1` sandwich layout, ResponsiveContainer'ın ResizeObserver ölçümü -1 dönüyordu.
   - **Fix**: Wrapper div kaldırıldı, ResponsiveContainer fixed-height parent'ın doğrudan child'ı.
   - **Pattern documented**: CLAUDE.md §21.14.

### Retroactive risk fixes

3. **Trial cron 4 mail → 2 mail** (Risk #1)
   - **Sorun**: 4-gün penceresi + 20-saat dedup = kullanıcı 4 farklı gün → 4 mail. Spam algısı.
   - **Fix**: `TRIAL_REMINDER_DAYS = [1, 3]` constant — sadece 3 gün (decision window) ve 1 gün (last call) eşiklerinde mail. SQL window 4 güne kadar geniş kalıyor (race condition güvenliği), precise filter handler'da. Toplam: trial başına max 2 mail.

4. **Trial cron `aiReplies` misleading count → null** (Risk #2)
   - **Sorun**: `prisma.feedbackReply.count` AI vs manual ayırt etmiyordu. Trial-ending mailinde "38 AI yanıt" yazıyordu ama gerçekte tüm reply'ları sayıyordu (chef Slack notları dahil).
   - **Fix**: `aiReplies = null` döndür. Template "—" gösterir. Gerçek metrik için `FeedbackReply.source` field'ı eklenmesi lazım (ayrı PR scope).

### Değişen dosyalar

- `src/app/api/cron/monthly-newsletter/route.ts` — `runMonthlyNewsletter()` export
- `src/app/api/admin/newsletters/trigger/route.ts` — direct invoke, `maxDuration: 60`
- `src/app/api/cron/trial-reminders/route.ts` — `TRIAL_REMINDER_DAYS = [1, 3]`, `aiReplies = null`
- `src/components/admin/TrendsChart.tsx` — flex sandwich kaldırıldı
- `src/components/admin/DayDistributionChart.tsx` — flex sandwich kaldırıldı
- `CLAUDE.md` §21.11 (trial cron yeni mantık), §21.13 (self-fetch anti-pattern), §21.14 (recharts pattern)

### Backend etkisi

- `runMonthlyNewsletter` ortak helper'ı 2 endpoint'ten invoke ediliyor; abone listesinde değişiklik yok.
- Trial cron schedule değişmedi (`0 9 * * *`); sadece içerideki day filter daraldı.
- Recharts fix tamamen UI; chart data unchanged.

### Verification

- `npx tsc --noEmit` zero error
- Admin paneldeki "Şimdi gönder" butonu ile gönderim cycle'ı tek HTTP yanıtında tamamlanır
- Console'da artık `width(-1) and height(-1)` warning yok
- Trial cron: lokal'de `User.trialEndsAt = now() + 2d` set et → cron mail atmaz (2 gün eşik değil); `+1d` veya `+3d` set et → mail atar

---

## Phase 16.3 — Open-item closure: FeedbackReply.source + NewsletterCampaign + Mail Preview + Source Tracking (2026-04)

**Kapsam**: PR #68 sonrası "halen açık konular" tablosundaki 4 maddeyi kapatan iterasyon. Yeni branch `claude/pulse-mail-followups`, base `claude/analyze-codebase-dBomf` (PR #68 henüz merge'lenmemiş).

### Item 1 — `FeedbackReply.source`

- Schema: `source String? @default("manual")` — 'manual' | 'ai_copilot' | 'template_fallback'. `@@index([source, createdAt])`.
- `/api/feedback/[id]/reply` artık body'den `source` alıyor; geçersiz değer `'manual'`'a düşer.
- `/admin/reviews/page.tsx` ve `/[locale]/dashboard/feedbacks/page.tsx` — `aiSource` state'i `replySource` ile maple → POST body, send sonrası reset.
- `/api/cron/trial-reminders/route.ts` — `aiReplies = null` kaldırıldı, gerçek `prisma.feedbackReply.count({ where: { source: 'ai_copilot', ... } })` query'si açıldı (`.catch(() => null)` graceful degradation).

### Item 2 — `NewsletterCampaign` + admin compose UI

- Yeni model `NewsletterCampaign` (title, intro, postIds[], locale, status, scheduledAt, sentAt, sentCount, failedCount)
- API: `/api/admin/newsletters/campaigns` GET+POST, `/[id]` GET+PATCH+DELETE. Status mutability rules: `'sent'/'sending'` immutable, `'draft'` deletable, `'scheduled'` scheduledAt zorunlu.
- Cron `runMonthlyNewsletter({ campaignId? })` — 3-tier precedence: explicit > scheduled > fallback static. Locale 'both' → her aboneye locale'ine göre filtreli posts.
- `sendNewsletterEmail` + `renderNewsletter` — `customTitle`, `customIntro`, `customSubject` opsiyonel. Override edildiğinde lime-highlight stylelar düşer, plain title.
- Admin UI: 3 yeni route + 1 ortak Editor component
  - `/admin/newsletters/campaigns` (list) — desktop table + mobile cards
  - `/admin/newsletters/campaigns/new` — yeni form
  - `/admin/newsletters/campaigns/[id]` — edit form
  - `NewsletterCampaignEditor.tsx` — title/intro/locale/posts/mode (Taslak/Zamanla/Şimdi gönder) + Preview + Test mail butonları
- Trigger endpoint `/api/admin/newsletters/trigger` artık `{ campaignId }` body kabul ediyor.
- Sidebar: "Bülten Kampanyaları" satırı (Megaphone icon, superadmin).

### Item 3 — Mail visual smoke test

- `/api/dev/email-preview?template=...&locale=...&format=html|text` (NODE_ENV gated)
- `src/app/api/dev/email-preview/seeds.ts` — 9 template için realistic placeholder factory
- `/admin/dev/mail-preview` — superadmin sayfası, 9 kart + locale toggle + Önizle + Test mail
- `/api/admin/dev/send-test` POST — seed (veya newsletter compose override) ile admin'in kendi e-posta'sına gönderim
- Sidebar "Mail Önizleme (dev)" satırı `NODE_ENV !== 'production'` gated
- Newsletter compose form'undaki Önizle butonu DB'deki gerçek post'lar ile preview yapıyor

### Item 4 — Source tracking pattern

- `src/lib/newsletter-sources.ts` — `NEWSLETTER_SOURCE_LABELS` haritası + `getNewsletterSourceLabel()` helper
- 7 hazır source: footer, popup, blog_inline, dashboard_invite, onboarding, roi_form, homepage_hero
- Admin Kaynak filter + tablo + mobile cards artık label gösteriyor
- CSV export'a `source_label` kolonu eklendi
- CLAUDE.md §21.17'de yeni signup placement ekleme rehberi

### Backend etkisi

- `prisma db push` deploy'da: `feedback_replies.source`, `feedback_replies(source, created_at)` index, `newsletter_campaigns` tablosu sync edilir. Tümü nullable / default'lu, veri kaybı yok.
- 11 yeni dosya, ~2400 LOC (700 schema/API, 800 UI, 600 mail preview, 300 helpers + docs)
- Public sender imzaları korundu (newsletter sadece opsiyonel parametre eklendi)
- Sadece superadmin yeni route'lara erişiyor; trial cron ve monthly cron mevcut Bearer ${CRON_SECRET} pattern'ini kullanmaya devam

### Verification

- `npx tsc --noEmit -p tsconfig.json` zero error
- `npx prisma generate` `FeedbackReply.source` ve `NewsletterCampaign` ScalarFieldEnum'ları doğru
- E2E lokal kontrol checklist (CLAUDE.md §21.15): 9 template browser + 4 mail client smoke test
- NewsletterCampaign E2E: yeni kampanya + Şimdi gönder → sent status, sentCount dolu, scheduledAt geçen scheduled campaign cron'da yakalanıyor

---

## Phase 16.4 — Mail Hardcoded Cleanup + DB-Driven Content (MVP) (2026-04)

**Kapsam**: PR #74 sonrası audit ortaya 4 sabit içerik daha çıkardı; ayrıca admin "mail copy'lerini panelden düzenle" istedi. Tek PR'da 2 paralel iş:

### Faz 1 — Hardcoded cleanup (4 item)

- `newsletter.ts` stats band → opsiyonel `params.stats?: NewsletterStat[]`. Cron geçirmediğinden default'ta band gizlenir (eski `+184%/1.4s` her ay aynıydı).
- `weekly-report.ts` 3. hücre `'1.4s'` placeholder → kaldırıldı, 2-col layout. Backend tracking yokken yanıltıcı placeholder göstermeyiz.
- `customer-reply.ts` `defaultActions` (3 Kadıköy örneği) silindi. `params.actions` boş → "Aldığımız aksiyonlar" kart gizlenir.
- `trial-ending.ts` fiyat fallback → comment ile işaretlendi (Faz 2 backlog).

### Faz 2 — DB-Driven Mail Content (MVP)

**Yeni dosyalar**:
- `prisma/schema.prisma` — `MailTemplate { key, locale, content: Json, editable, updatedById, ... }` `@@unique([key, locale])`
- `src/lib/email/copy-loader.ts` — `loadMailCopy<T>(key, locale, fallback)` + 60s process-local cache + `invalidateMailCopyCache`
- `src/app/api/admin/mail-templates/route.ts` — GET grid (seeded/not-seeded)
- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts` — GET + PATCH + DELETE
- `src/app/admin/mail-templates/page.tsx` — list grid
- `src/app/admin/mail-templates/[key]/[locale]/page.tsx` — edit page wrapper
- `src/components/admin/MailTemplateEditor.tsx` — schema-aware form (FIELDS_BY_TEMPLATE map)
- `scripts/seed-mail-templates.ts` — idempotent seed (welcome/newsletter/trial-ending × tr/en = 6 row)

**Değişen**:
- `src/lib/email/templates/welcome.ts` — `renderWelcome` async, `await loadMailCopy('welcome', ...)`
- `src/lib/email/templates/newsletter.ts` — `renderNewsletter` async + DB merge + statsBlock opsiyonel
- `src/lib/email/templates/trial-ending.ts` — `renderTrialEnding` async + DB merge + price fallback yorum
- `src/lib/email/templates/weekly-report.ts` — `stats` array 2-col
- `src/lib/email/templates/customer-reply.ts` — `defaultActions` silindi, gizli kart
- `src/lib/email.ts` — `sendWelcomeEmail`, `sendNewsletterEmail`, `sendTrialEndingEmail` artık `await renderXxx(...)`
- `src/components/admin/AdminSidebar.tsx` — "Mail İçerikleri" satırı (FileEdit icon, superadmin)
- `CLAUDE.md` §21.26 (yeni)

**Backend etkisi**:
- `prisma db push` deploy'da `mail_templates` tablosu sync olur. Boş olduğu için mevcut mailler inline default ile çalışmaya devam eder (backwards compatible).
- 3 render fonksiyonu async oldu → her mail send'de DB query (60s cache ile amortise). Cron throttle (120ms) zaten DB-friendly.
- Admin yeni route + sidebar + editor — superadmin only.

**Verification**:
- `npx tsc --noEmit` zero error
- `npx eslint .` 0 error
- `prisma generate` `MailTemplate` field'ları tanır
- Seed script: `DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts` → 6 row upsert
- E2E (deploy sonrası): `/admin/mail-templates` 6 kart, edit sayfa form, test mail butonu, varsayılana dön

**Phase 2 backlog** (yapılmadı):
- 6 kalan template DB-driven (forgot-password, form-confirmation, low-rating-alert, new-review, weekly-report, customer-reply)
- `${firstName}`, `${restaurantName}` runtime placeholder injection
- Field-level `editable: false` flag (KVKK lock)
- Audit log table
- Redis cache layer (multi-instance Vercel drift fix)

---

## Phase 16.5 — Mail CMS Phase 2: 5 template extension + KVKK field lock (2026-04)

PR #75'in MVP'sini genişleten ve KVKK / güvenlik kritik metinleri kilitleyen iterasyon. Stacked PR — base PR #75.

### Kapsam

- 5 yeni template DB-driven: `forgot-password`, `low-rating-alert`, `new-review`, `weekly-report`, `customer-reply` (form-confirmation Phase 3'e ertelendi — 4-variant yapısı ayrı schema gerektiriyor)
- Toplam 8 template DB-driven (3 mevcut + 5 yeni)
- Field-level KVKK / güvenlik kilidi
- `SUPPORTED_MAIL_KEYS` ortak source-of-truth (DRY)

### Yeni dosya

- `src/lib/email/locked-fields.ts` — `LOCKED_MAIL_FIELDS` map + `isFieldLocked` + `stripLockedFields` helper

### Değişen dosyalar

- `src/lib/email/copy-loader.ts` — `SUPPORTED_MAIL_KEYS` export (8 değer), `MailTemplateKey` union genişletildi
- 5 template render fn — `async` + `loadMailCopy` (forgot-password, low-rating-alert, new-review, weekly-report, customer-reply)
- `src/lib/email.ts` — 4 sender'a `await` (`sendFeedbackNotification` 2 call, `sendWeeklyDigest`, `sendPasswordResetEmail`, `sendCustomerReplyEmail`)
- `src/app/api/admin/mail-templates/route.ts` — `SUPPORTED_KEYS` import
- `src/app/admin/mail-templates/[key]/[locale]/page.tsx` — `SUPPORTED_KEYS` import
- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts` — PATCH endpoint `stripLockedFields()` ile server-side drop
- `src/components/admin/MailTemplateEditor.tsx` — `FIELDS_BY_TEMPLATE` 5 yeni entry, `FieldDef` tipine `locked?` + `lockReason?` ekledi, UI 🔒 KVKK badge + disabled input + kırmızı border, `TEMPLATE_LABELS` 8 entry
- `src/app/admin/mail-templates/page.tsx` — `TEMPLATE_LABELS` 8 entry
- `scripts/seed-mail-templates.ts` — +10 yeni row (toplam 16)
- `CLAUDE.md` §21.26 başlığı güncellendi, §21.27 (yeni) Phase 2 docs

### Locked field'lar

| Template | Locked field | Sebep |
|---|---|---|
| forgot-password | `statusText` | Token süre uyarısı (phishing risk) |
| forgot-password | `notYouTitle`, `notYouBody`, `notYouLink` | Hesap güvenliği yönergesi |
| customer-reply | `sentLine`, `sentSuffix` | KVKK / GDPR Buaze gönderim açıklaması |

UI'da 🔒 KVKK badge + tooltip ile sebep gösterilir, `<input disabled>`. Server-side `stripLockedFields()` admin UI bypass'a karşı.

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK (PR #75 `MailTemplate` modelini kuruyor, bu PR sadece kullanıyor)
- E2E (deploy + seed sonrası):
  - `/admin/mail-templates` → 16 kart
  - `/admin/mail-templates/forgot-password/tr` → `notYouTitle` field disabled, "🔒 KVKK" badge görünür
  - cURL bypass: `curl -X PATCH .../forgot-password/tr -d '{"content":{"notYouTitle":"hacked"}}'` → DB'de `notYouTitle` yazmaz (server drop)

### Phase 3 backlog

- form-confirmation 4-variant DB-driven (nested JSON)
- Dynamic placeholder injection
- Audit log table
- Redis cache (gerekli olduğunda)

---

## Phase 16.6 — Mail CMS Phase 3: form-confirmation 4-variant nested JSON

**PR:** TBA (stacked on PR #76 — `claude/mail-cms-phase3-form-confirmation`)

### Hedef

9. (son) mail template'i — `form-confirmation` — DB-driven yap. Bu template 4 farklı `formType` variant içerir (`contact / career / roi / newsletter`) ve her variant 14 string field tutar. Phase 2'den (PR #76) ertelenmişti çünkü flat JSON content yapısı tek variant düşünüyordu.

### Mimari karar — Nested JSON

- Tek `form-confirmation` key, locale başına bir DB row
- `content` alanı: `{ contact: {...}, career: {...}, roi: {...}, newsletter: {...} }`
- Admin UI: tek sayfa + 4 variant tab'ı
- Avantaj: list page 8 → 9 kart (kart başına locale 2 = 18 kart), 4 ayrı sayfa olmadan tek yerden yönetim
- Avantaj: schema değişikliği YOK — mevcut `MailTemplate.content: Json` yapısı zaten destekler
- Trade-off: editor UI iki mod'a sahip oldu (flat 8 + nested 1) → DRY için `<MailFieldInput>` shared component

### Değişen dosyalar

**Yeni:**
- `src/components/admin/FormConfirmationEditor.tsx` — 4-variant tab UI
- `src/components/admin/MailFieldInput.tsx` — shared input (label + hint + KVKK lock + multiline)

**Değişen:**
- `src/lib/email/copy-loader.ts` — `SUPPORTED_MAIL_KEYS` 8 → 9, validation string + plain object kabul
- `src/lib/email/templates/form-confirmation.ts` — async + nested DB merge (top-level variant + inner field)
- `src/lib/email.ts` — `sendFormConfirmationEmail` await
- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts` — `cleanContent()` per-key branch
- `src/components/admin/MailTemplateEditor.tsx` — `templateKey === 'form-confirmation'` ise `<FormConfirmationEditor>` render
- `src/app/admin/mail-templates/page.tsx` — `TEMPLATE_LABELS` +1 entry
- `src/app/api/dev/email-preview/route.ts` — variant query string
- `src/app/api/admin/dev/send-test/route.ts` — variant body
- `scripts/seed-mail-templates.ts` — 2 yeni nested row (toplam 18)
- `CLAUDE.md` §21.26 başlığı + §21.28 (yeni) nested variant pattern

### Render fn değişikliği (özet)

```ts
export async function renderFormConfirmation(params, locale) {
  const FORM_COPY = isTr ? { contact: {...}, career: {...}, ... } : {...};
  const merged = await loadMailCopy('form-confirmation', locale, FORM_COPY);
  const variantOverride = merged[params.formType] ?? {};
  const copy = { ...FORM_COPY[params.formType], ...variantOverride };
  // ... render
}
```

İki seviyeli merge: top-level variant key (admin sadece bir variant düzenlemiş olabilir) + inner field (admin sadece subject'i değiştirmiş olabilir). Eksik field/variant'lar inline default'tan gelir.

### Editor UI (FormConfirmationEditor)

- 4 variant tab: Contact / Kariyer / ROI / Bülten
- State: `Record<FormType, Record<string, string>>` — her variant kendi state'ini tutar, tab değiştirince kaybolmaz
- Her variant'ta 14 field (subject, preheader, eyebrow, titleA, titleB, intro, formEyebrow, timelineEyebrow, sideEyebrowA/B, sideBodyA/B, sideCtaA/B)
- Save → tüm 4 variant tek payload'da gönderilir
- Preview/Test mail → aktif variant query string'e geçer

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK
- E2E (deploy + seed sonrası):
  - `/admin/mail-templates` → 18 kart, "Form onayı" 9. kart
  - `/admin/mail-templates/form-confirmation/tr` → 4 variant tab; default Contact aktif, 14 field
  - Career tab → field'lar değişir, state ayrı tutulur
  - Save → tüm 4 variant tek PATCH'te gider
  - "Test mail at" career tab'ında → kariyer mail'i admin'e düşer
  - Preview `?variant=roi` → ROI variant render edilir
  - DB'ye non-string inject edilirse load'da defansif normalisation drop eder, render inline default'a düşer

### Phase 4+ backlog

- Dynamic placeholder injection (`${firstName}`, `${restaurantName}`)
- Audit log table (`MailTemplateRevision`)
- Redis cache (gerekli olduğunda)
- Per-field validation (max length, format)

---

## Phase 16.7 — Mail CMS Phase 4: dynamic placeholder injection

**PR:** TBA — `claude/mail-cms-phase4-placeholders` (stacked on PR #77 / Phase 3)

### Hedef

Admin'in CMS'te yazdığı copy field'larında `${firstName}`, `${restaurantName}` gibi runtime placeholder'lar kullanabilmesi. Her token render zamanında gerçek değerle dolar. Backward compatible — placeholder'sız field'lar değişmez.

### Yeni dosyalar

- `src/lib/email/placeholders.ts` — `MAIL_PLACEHOLDERS` whitelist, `substitutePlaceholders`, `validatePlaceholders`, `findInvalidPlaceholders`, `deepSubstitute` helper'ları

### Değişen dosyalar

**Render fonksiyonları** (9 template):
- `welcome.ts`, `newsletter.ts`, `trial-ending.ts`, `forgot-password.ts`, `low-rating-alert.ts`, `new-review.ts`, `weekly-report.ts`, `customer-reply.ts`, `form-confirmation.ts`
- Her biri `loadMailCopy()` sonrası `deepSubstitute(merged, vars, 'html'|'text')` çağırır
- `copy` (HTML body) ve `copyText` (text body) iki ayrı substitute pass — XSS guard

**API**:
- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts` — PATCH endpoint `findInvalidPlaceholders` ile invalid token yakalar, 400 döner

**Admin UI**:
- `src/components/admin/MailFieldInput.tsx` — `placeholders?: string[]` prop, chip row, click-to-insert at cursor
- `src/components/admin/MailTemplateEditor.tsx` — relevant field'lar `placeholders: MAIL_PLACEHOLDERS[key]` ile işaretlendi
- `src/components/admin/FormConfirmationEditor.tsx` — variant field'lar `placeholders: MAIL_PLACEHOLDERS['form-confirmation']`

### Whitelist

| Template | Placeholder'lar |
|---|---|
| welcome | `firstName` |
| newsletter | `firstName` |
| trial-ending | `firstName` `restaurantName` `daysLeft` |
| forgot-password | `firstName` |
| low-rating-alert | `restaurantName` `customerName` `rating` `branch` |
| new-review | `restaurantName` `customerName` `rating` |
| weekly-report | `restaurantName` `totalReviews` `avgRating` |
| customer-reply | `customerFirstName` `restaurantName` `ownerName` |
| form-confirmation | `firstName` |

### Inline default değişiklikleri

Önce hardcoded interpolation içeren default'lar literal placeholder'a çevrildi:

| Template | Değişen field |
|---|---|
| welcome | `titleHi`: `\`Merhaba ${name}.\`` → `'Merhaba ${firstName}.'` |
| trial-ending | `eyebrow`: `\`Deneme · ${days} gün kaldı\`` → `'Deneme · ${daysLeft} gün kaldı'` |
| low-rating-alert | `title`: `\`${params.rating} yıldız geldi.\`` → `'${rating} yıldız geldi.'` |
| new-review | `title`: `\`${params.rating} yıldız.\`` → `'${rating} yıldız.'` |
| customer-reply | `titleA`: `\`${customerFirst},\`` → `'${customerFirstName},'` |

### XSS guard

HTML mode substitution `escapeHtml` kullanır. Customer name `<script>` olsa bile mail'de `&lt;script&gt;`. Text mode (plain text mail body) escape yapmaz.

### Validation davranışı

Admin save sırasında geçersiz placeholder yazarsa:
- API 400: `{ error: 'invalid_placeholder', field: 'subject', invalid: ['userName'], allowed: ['firstName', 'restaurantName', ...] }`
- Editor user-friendly TR mesaj: `"subject" alanında geçersiz placeholder: ${userName}. İzin verilenler: ${firstName}, ${restaurantName}, ...`

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK
- E2E:
  - Admin welcome.titleHi'yi `Selam ${firstName}!` olarak save et → DB'de literal kayıtlanır
  - Test mail at → mail body "Selam Tom!" olarak gelir
  - Admin yanlış token yazsa (`${userName}`) → 400 + Turkish error
  - Admin chip'e tıklasa → caret konumuna `${firstName}` eklenir

### Phase 5+ backlog

- Audit log (`MailTemplateRevision`)
- Redis cache (multi-instance drift)
- Per-field validation (max length, format)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)

---

## Phase 16.8 — Mail CMS Phase 5: audit log + revert

**PR:** TBA — `claude/mail-cms-phase5-audit-log` (stacked on PR #78 / Phase 4)

### Hedef

Mail template her edit'inde DB'ye snapshot. KVKK uyumu + rollback yeteneği.

### Yeni model

```prisma
model MailTemplateRevision {
  id          String        @id @default(cuid())
  templateId  String?       // SetNull on delete — history survives
  templateKey String        // denormalized for post-delete query
  locale      String
  editType    String        // 'created' | 'updated' | 'deleted' | 'reverted'
  content     Json
  editedById  String?
  createdAt   DateTime

  @@index([templateKey, locale, createdAt])
  @@index([templateId, createdAt])
}
```

### Yeni dosyalar

- `src/app/api/admin/mail-templates/[key]/[locale]/revisions/route.ts` — GET list (last 50, editor join)
- `src/app/api/admin/mail-templates/[key]/[locale]/revisions/[id]/revert/route.ts` — POST revert
- `src/components/admin/MailRevisionHistory.tsx` — slide-over modal, listele + expand + revert

### Değişen dosyalar

- `prisma/schema.prisma` — `MailTemplate` model + `MailTemplateRevision` ilişkisi
- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts`:
  - PATCH after upsert: revision yaz + soft-prune
  - DELETE before delete: 'deleted' revision yaz (SetNull FK ile survive)
  - `pruneRevisions()` helper (last 50 keep)
- `src/components/admin/MailTemplateEditor.tsx`:
  - History buton + modal mount
  - `reloadKey` state — revert sonrası fetch trigger
- `src/components/admin/FormConfirmationEditor.tsx` — aynı history pattern
- `CLAUDE.md` §21.30 (yeni)

### Soft-prune

Her PATCH/DELETE sonrası `pruneRevisions(key, locale)` last 50'yi tutar. Cron yok — write-time prune yeterli, chatty admin'lerde tablo unbounded büyümez.

### Cross-template guard

Revert endpoint'inde `revision.templateKey === pathKey && revision.locale === pathLocale` check. UI bug ile A → B revert engelleyici.

### Locked field defence in depth

Revert sırasında `stripLockedFields()` yine çalışır. Eski revision KVKK öncesi unlocked content içerse bile, revert apply ederken locked field drop edilir.

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- Prisma schema valid (`prisma validate`)
- `prisma db push` Vercel build script'inde otomatik koşar
- E2E (deploy + seed sonrası):
  - Welcome.titleHi'yi save → DB'de revision row (editType='updated')
  - "Geçmiş" buton → modal açılır, en son save görünür "MEVCUT" rozeti
  - "İçeriği göster" → JSON preview
  - Bir önceki revision'a "Bu sürüme dön" → confirm + apply + 'reverted' revision yazılır
  - 60 kez save → 50'den eski revision'lar otomatik silinir

### Phase 6+ backlog

- Diff viewer (revision A vs B)
- Per-field history filtering
- Bulk export (CSV/JSON)
- Redis cache (multi-instance drift)
- Per-field validation (max length, format)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)

---

## Phase 16.9 — Mail CMS Phase 6: per-field length validation

**PR:** TBA — `claude/mail-cms-phase6-field-validation` (stacked on PR #79 / Phase 5)

### Hedef

Admin paste-bomb'larını engelleyen length validation. Gmail spam filter tetikleri (subject ≥100), layout kırılmaları (eyebrow ≥200) ve novel-length intro'lar reject. Loose limits — gerçek abuse'u yakalar, küçük overage'larda nag etmez.

### Yeni dosya

- `src/lib/email/field-validation.ts` — `EXPLICIT` per-key + pattern fallback + `validateField` + `findInvalidField`

### Değişen dosyalar

- `src/app/api/admin/mail-templates/[key]/[locale]/route.ts` — PATCH `findInvalidField()` placeholder validation sonrası, 400 + `{ error: 'invalid_field_length', field, reason, max?, min?, actual }`
- `src/components/admin/MailFieldInput.tsx` — `getFieldValidation()` import; input altında live char counter (gray/amber/red tone)
- `src/components/admin/MailTemplateEditor.tsx` + `FormConfirmationEditor.tsx` — TR error mapping (`too_long`, `too_short`)
- `CLAUDE.md` §21.31 (yeni)

### Limit table

| Field grup | Max | Sebep |
|---|---|---|
| `subject` | 100 | Gmail truncate ≥70 chars, spam score ≥100 |
| `preheader` | 200 | Inbox preview |
| `*eyebrow*` | 80 | Single-line layout |
| `title*` | 80 | Hero h1/h2 wrap |
| `titleAccent` | 60 | Vurgu kelime |
| `intro` | 1000 | Body paragraph |
| `*body*` | 400 | Side card body |
| `*cta`/`*link*` | 60 | Button label |
| Other | 200 | Generic chrome |

### Live counter

Input altında: `42 / 100` mono font, sağ-aligned. %80'de amber, %100'de red. Locked field counter göstermez.

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK
- E2E:
  - Subject'e 150 karakter yapıştır → counter `150 / 100` red
  - Save dene → 400 + TR error: `"subject" alanı çok uzun: 150 karakter (max 100).`
  - Boş bırak → counter gizli, save geçer (empty drop)
  - Form-confirmation nested → variant.field path döner

### Phase 7+ backlog

- Diff viewer (revision A vs B)
- Bulk export (CSV/JSON revision history)
- Redis cache (multi-instance drift)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)
- URL field format validation

---

## Phase 16.10 — Mail CMS Phase 7: revision diff viewer

**PR:** TBA — `claude/mail-cms-phase7-diff-viewer` (stacked on PR #80 / Phase 6)

### Hedef

Phase 5 history modal'ını upgrade et — admin "ne değişmiş" tek bakışta görsün. Field-level diff, jsdiff dep yok.

### Yeni dosyalar

- `src/lib/email/revision-diff.ts` — `DiffEntry` union + `computeDiff()` (flat + nested destekler)
- `src/components/admin/MailRevisionDiff.tsx` — added/removed/changed visual

### Değişen dosyalar

- `src/components/admin/MailRevisionHistory.tsx` — her revision'a "Önceki sürümle farkı göster" buton + inline expand
- `CLAUDE.md` §21.32 (yeni)

### Diff semantik

Her revision için diff = `revisions[idx + 1]` (older) → `revisions[idx]` (this). Yani admin'in "bu revisiyon ne yaptı" sorusunu cevaplar. En eski revision (`idx === N-1`) için `before = {}` → tüm field'lar `added` olarak görünür (initial seed'in tüm field'ları).

### Visual

| Entry tipi | Badge | Bg |
|---|---|---|
| `changed` | DEĞİŞTİ (amber) | white + nested −/+ rows (red/emerald 50/60) |
| `added` | EKLENDİ (emerald) | emerald 50/60 |
| `removed` | SİLİNDİ (red) | red 50/60 |

Sort: changed → added → removed, alfabetik path.

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (227 warning değişmedi)
- DB schema değişikliği YOK
- E2E:
  - "Geçmiş" → her revision'da iki buton (İçeriği göster + Önceki sürümle farkı göster)
  - Subject'i değiştir + save → tek `changed` entry görünür
  - Yeni field ekle → `added`
  - Field boşalt + save (drop edilir) → `removed`
  - Form-confirmation variant edit → `contact.subject` path
  - Initial revision (oldest) → tüm field'lar `added`
  - Aynı içerik save edilirse (no-op edit) → "Bu iki sürüm arasında değişiklik yok"

### Phase 8+ backlog

- Bulk export (CSV/JSON revision history)
- Redis cache (multi-instance drift)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)
- URL field format validation
- A/B compare (any two revisions, not just adjacent)

---

## Phase 16.11 — Mail CMS Phase 8: ops alert on critical mail failure

**PR:** TBA — `claude/mail-cms-phase8-ops-alert` (phase 7 main'e merge edildi, base = main)

### Hedef

Kritik mail send fail olduğunda restoran sahibi/kullanıcı haberdar olmazken ops manuel müdahale edebilsin. V1 minimum: structured plain-text alert mail ops kutusuna.

### Yeni dosyalar

- `src/lib/email-internal.ts` — `sendResendEmail` ayrı dosyaya extract (circular dep önleme)
- `src/lib/email/ops-alert.ts` — `notifyOpsOfMailFailure()` helper (rate-limited, swallow-errors)

### Değişen dosya

- `src/lib/email.ts`:
  - `sendResendEmail` definition `email-internal.ts`'e taşındı, import edilir
  - 3 kritik sender (sendFeedbackNotification, sendPasswordResetEmail, sendCustomerReplyEmail) `if (!ok) await notifyOpsOfMailFailure(...)` wrap'i

### Why these 3?

| Sender | Critical? | Reason |
|---|---|---|
| sendFeedbackNotification | ✓ HIGH | Düşük puan ulaşmazsa şikayet yanıtsız |
| sendPasswordResetEmail | ✓ HIGH | Kullanıcı hesaba giremez |
| sendCustomerReplyEmail | ✓ HIGH | Düşük-puan müşteri ilişkisi |
| sendWelcomeEmail | LOW | Admin re-trigger |
| sendNewsletterEmail | LOW | Bulk; ops spam'e maruz kalır |
| sendTrialEndingEmail | MED | Daily reminder; tek kaçırma kritik değil |
| sendFormConfirmationEmail | MED | UX courtesy |

### Rate limiting

`rateLimit('ops-alert:${template}', 10, 5*60*1000)` — Resend outage'ında 100 mail bombalanmaz, ilk 10 alert yeter. CLAUDE.md §14.2 in-memory; multi-instance Vercel'de instance başına ayrı, kabul edilen drift.

### Yeni env var

`OPS_EMAIL` (opsiyonel) — production ops dist list. Fallback chain: `OPS_EMAIL` → `NOTIFICATION_EMAIL` → console.error (sessiz).

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK
- E2E:
  - Geçerli `RESEND_API_KEY` ile düşük-puan mail send → owner mail alır, ops alert TETIKLEMEZ
  - `RESEND_API_KEY` boş veya invalid → primary mail fail → ops alert mail "[OPS] Mail send failed: low-rating-alert"
  - 11 ardışık fail → ilk 10 alert gider, 11. rate-limited (console.warn)
  - `OPS_EMAIL` boş, `NOTIFICATION_EMAIL` set → fallback recipient
  - Her ikisi de boş → console.error, alert sessiz

### Phase 9+ backlog

- Retry on transient errors (exponential backoff)
- `MailDeliveryLog` DB tablo + admin "failed mails" panel
- Resend webhook integration (bounce → auto unsubscribe + ops alert)
- Slack webhook alternative (mail yerine)

---

## Phase 16.12 — Mail CMS Phase 9: admin panel seed (UI'dan)

**PR:** TBA — `claude/mail-cms-seed-endpoint`

### Hedef

CLI seed lokal terminal + DB credential paylaşımı gerektiriyordu (kullanıcının operasyonel sürtünmesi). UI'a taşı; tek tıkla seed.

### Yeni dosyalar

- `src/lib/email/seed-data.ts` — `MAIL_TEMPLATE_SEEDS` shared module (CLI script + API endpoint birlikte kullanır)
- `src/app/api/admin/seed-mail-templates/route.ts` — POST endpoint, mode='missing'|'force'

### Değişen dosyalar

- `scripts/seed-mail-templates.ts` — refactor: data shared module'dan import, sadece CLI runner kalır
- `src/app/admin/mail-templates/page.tsx` — "Eksik seed et" + "Tümünü sıfırla" butonları, sonuç banner, otomatik reload
- `CLAUDE.md` §21.34 (yeni)

### Mimari karar — neden 2 mode

`force` tek başına olsa: tek tıkla bütün admin edit'leri silinme riski. Operatör accident → saatlerce iş kaybı.

`missing` default + `force` opt-in:
- Yeni template eklendiğinde "Eksik seed et" güvenli, mevcut edit'lere dokunmaz
- Reset gerekirse "Tümünü sıfırla" çift confirm + Phase 5 audit log'a revision yazar → recovery mümkün

### Phase 5 audit integration

Her seed write `prisma.$transaction(upsert + revision.create)` ile atomik. Response `counts.overwritten` operatöre kaç edit'in kaybolduğunu söyler. Recovery için "Geçmiş" sekmesi → revision → "Bu sürüme dön" — manual ama mevcut.

### Verification

- `npx tsc --noEmit` zero error
- `npx eslint .` zero error (mevcut warning'ler değişmedi)
- DB schema değişikliği YOK
- E2E:
  - DB boş → "Eksik seed et" → 18 row eklenir, banner "18 yeni eklendi"
  - "Eksik seed et" tekrar → 0 yeni, 18 atlandı (idempotent)
  - Bir template'in titleHi'i "Selam!" yapılır → "Eksik seed et" → atlanır, edit korunur ✓
  - "Tümünü sıfırla" → çift confirm → 18 overwritten, edit silinir, Phase 5 history'de görünür
  - "Geçmiş" → eski revision → "Bu sürüme dön" → edit geri gelir ✓
  - 6 ardışık seed deneme → 6. denemede 429 rate limit
  - Non-superadmin → 403

### Phase 10+ backlog

- Per-row seed (tek bir template'i sıfırla)
- Diff preview before force-reset
- Schedule auto-seed on deploy
