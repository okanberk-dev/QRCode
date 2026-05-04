# CLAUDE.md — Proje Referans & AI Rehberi

Bu dosya, gelecek AI oturumlarının (Claude veya başka) bu projeyi **doğru varsayımlarla** geliştirebilmesi için hazırlanmıştır. Yeni bir göreve başlamadan önce ilgili bölümü oku.

> **TR/EN notu:** Ürün kullanıcıları TR. Kod & yorum EN+TR karışık. UI metinleri genelde TR; `locale` parametresi destekliyorsa EN yedeği var.

---

## 1. Proje Kimliği

**Buaze QR Feedback & Restaurant Reputation Management SaaS** — Restoranların müşterilerinden QR kod üzerinden geri bildirim toplamasını, düşük puanları filtreleyip yüksek puanları Google Maps / Yemeksepeti / Getir / Trendyol GO gibi platformlara yönlendirmesini sağlayan çok kiracılı bir platform.

### Ana akış
1. Müşteri masada QR'ı okutur → `/r/:slug?table=...&platform=...`
2. Puan verir (+ opsiyonel açıklama)
3. Yüksek puan → seçilen platforma yönlendirilir (Google/Yemeksepeti/Getir/Trendyol)
4. Düşük puan → dahili form, restoran sahibi admin panelinde görür

---

## 2. Tech Stack (hızlı bakış)

| Alan | Seçim | Not |
|---|---|---|
| Framework | Next.js 15 (App Router, `src/app`) | Vercel Deployment |
| Dil | TypeScript (strict, ama `ignoreBuildErrors: true` — dikkat) | |
| DB | PostgreSQL **via Supabase** | `DATABASE_URL` (pgbouncer 6543) + `DIRECT_URL` (5432 migration için) |
| ORM | Prisma 6 | Vercel build'de `prisma migrate deploy`; `npm run db:push` sadece lokal scratch DB |
| Auth | Custom JWT (`jose`) + httpOnly cookie | `src/lib/auth.ts` — edge compatible |
| Auth (Google Sign-in) | Firebase Web SDK (`firebase`) | `src/lib/firebase-client.ts` + `firebase-admin.ts` — sadece Google OAuth için, primary auth değil |
| UI | Tailwind v4 (PostCSS) + lucide-react (ikonlar) | Elle yazılmış bileşenler + Radix UI primitive'leri (`@radix-ui/react-dialog`, `dropdown-menu`, `tabs`, `tooltip`, `popover`, `select`) headless infrastructure |
| Server-state | `@tanstack/react-query` | Admin/dashboard fetch dağınıklığı için cache + dedup + retry. `<QueryProvider>` `src/app/layout.tsx`'te root'ta (CLAUDE.md §27) |
| Charts | recharts | |
| Görsel işleme | sharp (WebP dönüşüm + resize) | |
| QR | qrcode | `/api/restaurants/[id]/qr` |
| Mail | Resend HTTP API | `src/lib/email.ts` — SMTP yok, fetch tabanlı |
| Hata izleme | `@sentry/nextjs` | env-gated; `instrumentation.ts` + `instrumentation-client.ts` (CLAUDE.md §26) |
| i18n | `src/app/[locale]/...` + `src/lib/translations.ts` | tr / en |
| Deploy | Vercel (Production) | Otomatik Git entegrasyonu |

---

## 3. Depolama Mimarisi (2026-04 güncellendi)

| Veri | Nerede | Not |
|---|---|---|
| Veritabanı | Supabase PostgreSQL | Kalıcı (tüm ana veri) |
| Menü ürün görselleri | **Postgres TEXT kolonu** (`menu_items.image_url`) | Base64 data URL (`data:image/webp;base64,...`) — Vercel ephemeral FS riskini atlatır. Şemada `@db.Text` ile zorlanır (2026-04 audit fix). |
| Menü logosu | **Postgres TEXT kolonu** (`restaurants.menu_logo_url`) | Aynı şekilde base64 data URL. `@db.Text` zorunlu. |
| Site ayarları görselleri | Supabase Storage (ayrı yol) | `src/app/api/admin/site-settings/upload` |

### Görsel işleme akışı (menü)
- Endpoint: `POST /api/restaurants/[id]/menu/upload` (scoped, IDOR-safe, `requireRestaurantAccess` ile korunur)
- `sharp` ile resize + WebP dönüşüm: ürün görseli 1200px max, logo 512x512 cover
- Quality 80 → boyut aşarsa otomatik 60'a düşürür → hala aşarsa 413 döner
- Response: `{ url: 'data:image/webp;base64,...', bytes, kind }`
- İstemci bu data URL'i `imageUrl` / `menuLogoUrl` alanına doğrudan kaydeder

### Validation
- `src/lib/validations.ts` — `imageUrl` hem `http(s)://` URL'i hem `data:image/` prefix'li data URL kabul eder
- `data:image/` için max 300 KB (base64), diğer URL'ler max 1000 karakter
- `/api/restaurants/[id]/theme` — `menuLogoUrl` aynı kuralları uygular
- **Önemli:** Şemada `@db.Text` ile saklama bütçesi `VARCHAR(255)`'ten `TEXT`'e çıkarıldı; aksi halde 300 KB validation geçerken save sırasında sessizce kesiliyordu. Geçmiş truncated kayıtlar tespit için: `SELECT id FROM menu_items WHERE octet_length(image_url) >= 254;`

### Niçin base64-in-DB?
- Vercel serverless FS yok → diske yazamıyoruz
- Supabase Storage geçişi ayrı scope (önerilir ama şimdilik prematüre)
- Base64 bloat: 1200px WebP ≈ 100 KB binary → ~135 KB base64 → satır başına ~140 KB. 1000 ürün = ~140 MB TEXT — kabul edilir
- CDN ve cache yoksa page load daha ağır; gelecekte Storage/Blob geçişi yapılırsa data URL'ler yeniden URL'e migrate edilebilir (küçük script)

---

## 4. Kimlik Doğrulama & Roller

Üç identity tipi:
1. **Superadmin** — `AdminUser` tablosu, `role='superadmin'`. Global erişim.
2. **Manager** — `AdminUser` tablosu, `role='manager'`. `restaurantId` kadar kapsam.
3. **Restaurant Owner** — `User` tablosu, `role='restaurant_owner'`. Kendi restoranlarına erişim.

### IDOR koruması
`getPanelActorFromRequest()` `src/lib/auth.ts`'te (auth + JWT verify); `getScopedRestaurantIds()` + `canAccessRestaurant()` `src/lib/panel-access.ts`'te (route'a bağımsız scope helper'ları). Bu üçünü **her yeni API route'unda** kullan. `/api/feedback/*` ve `/api/restaurants/*` için zorunlu.

Örnek pattern (`src/app/api/feedback/stats/route.ts`'e bak):
```ts
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';

const actor = await getPanelActorFromRequest(req);
if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
const scopedIds = await getScopedRestaurantIds(actor);
where.restaurantId = { in: scopedIds };
```

### JWT fallback
`src/lib/auth.ts:getSecret()` artık production'da `JWT_SECRET` set edilmemişse **throw eder** (Adım 1 audit fix, PR #345 — §37). Dev fallback hâlâ var (lokal `npm run dev` için), ama Vercel deployment'larında env yokken auth route'ları 500 dönecek. **Operatör notu (2026-05)**: `JWT_SECRET` Vercel project env'inde Production + Preview + Development scope'larında zaten set; bu fix sadece "env unutulmuş bir deploy"u kapatır, mevcut deploy'ları etkilemez.

---

## 4.5 Admin Terminoloji (Kanonik)

Stripe/Linear/Vercel disiplini — her entity için tek terim. **"Üyeler" süperadmin tarafında ASLA kullanılmaz** (muğlak: User mu, TeamMember mı, AdminUser mı?).

| Sidebar | URL | Kaynak tablo | Anlam |
|---|---|---|---|
| **İşletmeler** | `/admin/members` | `User` (`role='restaurant_owner'`) | SaaS müşterileri (ödeyen/trial restoran sahipleri) |
| **Yöneticiler** | `/admin/users` | `AdminUser` (`role='manager'\|'superadmin'`) | Buaze iç ekibi + restoran operatör hesapları |
| **Müşteriler** | `/admin/customers` | `Feedback` (KVKK-onaylı, dedupe) | İşletmelerin son-müşterileri — QR'dan form dolduranlar |

> **Owner panelindeki `/admin/team`** ayrı scope: işletme sahibinin kendi ekibi (`TeamMember`). Sidebar label **Ekip**, "Üye davet et" butonu burada doğru.

**API URL'leri değişmedi** (backward compat):
- `/api/admin/members` → User CRUD
- `/api/admin/users` → AdminUser CRUD
- `/api/admin/customers` (+ `/export`) → Feedback-derived; `restaurantId/range/search/hasEmail/hasPhone/hasComment/page/limit` query, `{ data, meta, summary }` response, IDOR `getScopedRestaurantIds`
- **Müşteri dedupe:** `(restaurant_id, COALESCE(lower(email), phone))` — anonim (email+phone null) feedback listede yer almaz

`translations.ts` key'leri: `businesses`, `admins`, `customers` (kanonik) + `users` (legacy backward-compat).

---

## 5. Platform Sistemi (Yorumları Ayrıştırma)

Müşteri QR'dan gelirken URL'de `platform` parametresi taşıyor: `google | yemeksepeti | getir | trendyol_go | tripadvisor | airbnb | booking | yandex`. Konaklama segmenti (otel) için `tripadvisor | airbnb | booking`, TR pazarı arama alternatifi için `yandex` desteklenir. Bu değer:
- `Feedback.platform` sütununa yazılır
- İstatistiklerde `groupBy({ by: ['platform'] })` ile ayrıştırılır
- QR oluştururken `QrGeneration.platform` olarak da kaydedilir (history için)
- CSV exportta "Platform" sütununda pretty label ile görünür

Renkler & label haritası şu dosyalarda tekrarlanıyor (ortak modüle çıkarma kararı: **hayır** — abstraction kaçınma ilkesi):
- `src/components/admin/FeedbackTable.tsx` → `PLATFORM_CONFIG`
- `src/components/admin/PlatformDistribution.tsx` → `PLATFORM_COLORS` (tek platform dağılım bileşeni — hem admin hem owner panelinde kullanılıyor)
- `src/app/admin/qr/page.tsx` → `PLATFORM_BADGE`

Yeni bir platform eklemek gerekirse: bu 3 haritaya + `prisma/schema.prisma`'daki ilgili enum/string alanına + QR public akışına (`/r/[slug]`) ekle.

### 5.1 Google Maps / Business Profile entegrasyonu (2026-05)

Owner panel `Platform Bağlantıları` sekmesinde iki Google katmanı var:

1. **Places API (New)** — işletme arama + `placeId` seçimi. Env: `GOOGLE_MAPS_API_KEY` (server-only, `NEXT_PUBLIC_` yok). Key Google Cloud'da sadece **Places API (New)** ile restrict edilmeli. Seçim sonrası `Restaurant.googlePlaceId` ve `Restaurant.googleReviewUrl = https://search.google.com/local/writereview?placeid=...` kaydedilir.
2. **Google Business Profile OAuth** — gerçek Google yorumlarını çekme ve yorumlara cevap yazma. Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`; scope `https://www.googleapis.com/auth/business.manage`. Token `GoogleIntegration` modelinde user/workspace seviyesinde saklanır; restoran→Google location eşleşmesi schema değiştirmemek için `GoogleIntegration.locationsJson.restaurantLocations[restaurantId]` altında tutulur.

Admin gate:
- `Restaurant.googleReviewManagementEnabled` (`google_review_management_enabled`, default `false`) işletme bazlı ana şalterdir.
- Places araması / review link üretimi bu flag'den bağımsız kalır.
- Google Business Profile konum senkronu, yorum listeleme, **AI ile cevap ver** taslağı ve Google'a public reply gönderme bu flag kapalıyken API seviyesinde `GOOGLE_REVIEW_MANAGEMENT_DISABLED` döner.
- Admin detay ekranı `/admin/restaurants/[id]` içindeki "Google yorum yönetimi" toggle'ı bu alanı yönetir.

Endpoint'ler:
- `POST /api/restaurants/[id]/google/places/search` — Places Text Search (Zod + canWriteRestaurant + rate limit)
- `POST /api/restaurants/[id]/google/places/select` — `placeId` → review URL kaydı
- `GET /api/restaurants/[id]/google/business/status` — config/connection/selected location
- `GET /api/restaurants/[id]/google/business/locations` — Business Profile account/location sync
- `POST /api/restaurants/[id]/google/business/locations/select` — restoranı GBP location'a eşler
- `GET /api/restaurants/[id]/google/business/reviews` — seçili verified location yorumlarını listeler
- `POST /api/restaurants/[id]/google/business/reviews/reply` — Google review reply update
- `POST /api/restaurants/[id]/google/business/reviews/draft` — mevcut Pulse AI draft helper'ıyla cevap taslağı

Notlar:
- Places API sadece arama / link üretimi içindir; Google yorumlarını çekmek veya cevaplamak için yetmez.
- Reviews API yalnızca ilgili Google hesabının owner/manager olduğu **verified** Business Profile location'larda çalışır.
- Google review reply public alana gider; otomatik gönderme yok, owner metni görüp manuel gönderir.
- **Mimari Not (2026-05):** Google yorumları karmaşıklığı nedeniyle `Ayarlar > Platform Bağlantıları` panelinden çıkarılıp tamamen müstakil bir **`/[locale]/dashboard/google-reviews`** sayfasına taşınmıştır. İşletme sahipleri, birden fazla restoranı varsa bu yeni sayfada restoran seçebilir, yorumları tek bir listede analiz edip (AI desteğiyle) cevaplayabilir. Ayarlar sekmesinde sadece eşleştirme (bağlantı ve lokasyon seçimi) bulunur.

### 5.2 Paket & Özellik Erişimi (2026-05)

İşletme bazlı paket entitlement'ları admin tarafından yönetilir. Bu layer, ileride ücretli plan/paket sistemi otomatik atama yapana kadar superadmin'in her işletme için master şalterleri manuel yönetmesini sağlar.

- Kanonik admin endpoint: `PATCH /api/admin/restaurants/[id]/feature-access` (superadmin only). Response: `{ restaurant: { id, googleReviewManagementEnabled, pulseAiEnabled, menuEnabled, menuPublished, aiAnalyticsEnabled, externalPlatformsEnabled, updatedAt } }`.
- Master alanlar: `googleReviewManagementEnabled` (default `false`), `pulseAiEnabled`, `aiAnalyticsEnabled`, `externalPlatformsEnabled` (üçü de default `true`) + mevcut `menuEnabled/menuPublished`.
- Admin UI konumu: `/admin/restaurants/[id]` içindeki **Paket Özellikleri / Gelişmiş özellik yönetimi** kart grubu. Eski Google yorum ve menü kontrolleri burada toplanır; aynı ayar başka formda tekrar edilmez.
- `menuEnabled=false` olduğunda `menuPublished=false` yapılır ve owner menü oluşturma/düzenleme/publish API'leri server-side 403 döner. Public menü zaten `menuEnabled && menuPublished` ile görünür.
- `pulseAiEnabled=false` olduğunda owner Pulse AI ayarları kilitlenir; feedback draft/suggest-reply ve Google review draft endpoint'leri AI üretmez. Admin master kapatma anında bekleyen `FeedbackAiDraft` kayıtları temizlenir; owner tercih alanları (`enableAiDraft`, `googleAiEnabled`, `aiDraftTone`) silinmez.
- `aiAnalyticsEnabled=false` olduğunda owner analytics sayfası normal KPI/chart akışını korur; sadece AI tema çıkarımı / weekly AI insight çağrıları yapılmaz.
- `externalPlatformsEnabled=false` olduğunda Google dışı review platformları (Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Airbnb, Booking, Yandex ve "Diğer") owner UI/API, QR üretimi, integration test/retest ve public `/r/[slug]` redirect resolver tarafında yok sayılır. Kayıtlı URL'ler ve owner platform tercihleri silinmez; gate tekrar açılınca kaldığı yerden kullanılabilir.
- Vercel env notu: `.env.local` gitignore altında kalır. Production'da `JWT_SECRET` boş bırakılmamalı; Pulse AI gerçek model çağrısı için `OPENAI_API_KEY` Production/Preview scope'larında dolu olmalı.

### 5.3 2026-05-03 oturum notları

Bu oturumda yapılan kalıcı kararlar:
- Lokal `/Users/okanberkmanavoglu/Downloads/qrcode` checkout'u GitHub `riosenbeq/qrcode` ile commit `58ec5a6fea06bdcff150fca78dbb7752c4659f29` seviyesinde karşılaştırıldı; kod eşleşiyor.
- Sentry `SyntaxError Invalid character '\ufffd'` hatası `/tr/bilgi-guvenligi` için geldiği için public **Bilgi Güvenliği** sayfası tamamen kaldırıldı: route, legal template, footer linkleri, SEO override ve `llms.txt` referansı silindi.
- Google Maps / Business Profile MVP eklendi: Places API ile işletme arama + `placeId` seçimi, OAuth connect/callback, Business Profile konum seçimi, Google yorumlarını listeleme, AI cevap taslağı ve manuel Google reply gönderimi. Yorum yönetimi Ayarlar panelinden alınarak doğrudan sol menüde `Google Yorumları` sekmesine müstakil bir sayfa olarak yerleştirildi.
- Vercel project `qr-code` linklendi; Production + Preview env'lerinde `GOOGLE_MAPS_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` görüldü.
- Google Cloud tarafında Places API (New), My Business Account Management API ve My Business Business Information API etkinleştirildi; OAuth consent External/Testing, test users `berkokanm@gmail.com` + `hello@buaze.com`, scope `https://www.googleapis.com/auth/business.manage`.
- Güvenlik notu: Google API key server-only tutulur. OAuth client secret kullanıcı tarafından ekranda paylaşıldığı için ilk uygun zamanda rotate edilmesi önerilir.
- Sentry haftalık mailindeki `/admin/restaurants` hatası MetaMask tarayıcı eklentisi kaynaklı `app:///scripts/inpage.js` noise olarak sınıflandı; `instrumentation-client.ts` içinde MetaMask / browser-extension kaynaklı client event'leri `beforeSend` ile düşürülüyor.
- Bildirim tercihleri UI'ı Pulse toggle bileşenine taşındı; owner ve admin notification sayfalarında mobil uyumlu kart + switch düzeni kullanılır. `/api/notifications` PUT body artık Zod `.strict()` ile doğrulanır.
- Error-boundary mimarisi kalıcı hale getirildi: `src/app/global-error.tsx` artık markalı safe-mode fallback; `src/app/[locale]/dashboard/error.tsx` panel içi fallback; `src/lib/error-boundary.ts` tüm boundary'ler için Sentry tag'li raporlama + transient `network error`/`failed to fetch` otomatik tek retry helper'ı sağlar. Yeni app segment'i eklenirken global boundary'ye güvenmek yerine mümkünse segment-specific `error.tsx` ekle.
- Supabase pooler production'da `connection_limit=1` ile kullanıldığı için server-render sayfalarda aynı request içinde çoklu Prisma read batch'leri `Promise.all([...])` yerine `prisma.$transaction([...])` ile tek connection üstünden yürütülür. Owner dashboard, owner analytics, admin dashboard ve menü analytics API bu kurala geçirildi. Cron/outbound per-row isolation için `Promise.allSettled` kullanılmaya devam eder.
- Recharts `ResponsiveContainer` ölçüm uyarısı (`width(-1) height(-1)`) için `src/components/charts/MeasuredChart.tsx` eklendi. Yeni Recharts kullanımında önce pozitif `ResizeObserver` ölçümü al, sonra numeric `width/height` ile chart render et.
- Chrome DevTools'taki `chrome-extension://... content-script-start.js`, `runtime.lastError: Receiving end does not exist`, `inpage.js Failed to connect to MetaMask` satırları uygulama hatası değil; tarayıcı eklentisi gürültüsü. Ürün tarafında sadece gerçek app kaynaklı warning/error'lar fixlenir.
- Pulse AI owner auto-draft toggle'ı uçtan uca bağlandı: `enableAiDraft=false` iken yeni düşük puanlarda background draft yok, feedback seçimi otomatik suggestion üretmez, draft endpoint'i null döner ve toggle kapatılırken bekleyen `FeedbackAiDraft` kayıtları temizlenir. Manuel "Yeniden öner" bilinçli kullanıcı aksiyonu olarak çalışmaya devam eder.
- 2026-05-03 production Sentry audit: Vercel env listesinde `NEXT_PUBLIC_SENTRY_DSN` Production/Preview/Development scope'larında var, fakat `SENTRY_DSN` yok. Server/edge config artık `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` ile init olur; client config zaten public DSN kullanır. Bu sayede `instrumentation.ts` `onRequestError` hook'u production server hatalarını no-op bırakmaz. `GET /api/sentry-test` smoke endpoint'i bu iki DSN'den biriyle test edilir.
- 2026-05-03 Prisma deploy audit: Build script `prisma migrate deploy` akışına geçirildi; ilk baseline migration `prisma/migrations/20260503172000_init/migration.sql` mevcut schema'dan üretildi. Vercel Preview + Production DB schema diff'i boş doğrulandı ve baseline `20260503172000_init` migration metadata'sı applied olarak işaretlendi; bu işlem tablo/kolon/data değiştirmedi, yalnızca `_prisma_migrations` geçmişini başlattı.

### 5.4 2026-05-03 Production Hata Düzeltme Takip Planı

Tamamlanan PR serisi:
- PR #370: Admin **Paket & Özellik Erişimi** paneli ve owner-side entitlement gate'leri.
- PR #371: Marketing ürün linkleri düzeltildi; Yorum Yönetimi ve Analitik & Raporlar kendi detay sayfalarına ayrıldı.
- PR #372: Server/edge Sentry DSN fallback'i düzeltildi (`SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN`); Vercel Preview/GitHub CI yeşil.
- Task 2 branch `fix/prisma-migrate-deploy-build`: build script `prisma migrate deploy` kullanır, baseline migration commitlenir, Preview + Production migration status up-to-date doğrulanır.

Kalan production düzeltmeleri ayrı PR'larla, bu sırada ilerlemeli:
1. **Task 4 — Google Business retry + reauth**: `src/lib/google-business.ts` içinde tek wrapper (`googleBusinessFetch`) genişlet. 401 için refresh denemesi, rate-limit/network için 2 retry + exponential backoff, refresh başarısızsa tokenları güvenli biçimde geçersiz sayan `requiresReauth` response'u ekle. Endpoint'ler zincirleme 500 üretmemeli; Sentry event'i `tags: { integration: 'google-business' }` ile tek kez düşmeli.
2. **Task 3 — Dashboard polling azaltma**: Önce gerçek callsite'ları ölç. `NotificationBell` low-rating poll'u 60 sn; activation, integration checks ve Google status mount fetch seviyesinde. Yarı-statik endpoint'lerde owner-scoped olduğundan CDN public cache kullanma; bunun yerine client stale/refetch stratejisi veya server-side kısa private/no-store kararını explicit yaz. Hedef: aynı dashboard 5 dk açıkken API çağrı sayısını yarıya indirmek.
3. **Task 5 — `Invalid character '\ufffd'` bağlamlandırma**: Sentry issue stack/breadcrumb okunmadan kör refactor yapma. Önce issue URL'sinden failing URL/script context al; sonra yalnızca riskli `JSON.parse` yüzeylerine `try/catch + Sentry.captureException(..., extra.rawSnippet)` ekle. Secret/PII raw payload loglama.
4. **Task 6 — Sentry deprecation temizliği**: `next.config.ts` içindeki deprecated `disableLogger` ve `automaticVercelMonitors` seçeneklerini SDK 10 formatına taşı. Sadece build warning temizliği; runtime davranışı değişmemeli.
5. **Task 7 — reCAPTCHA assessment kararı**: Vercel env isimleri mevcut kodla `RECAPTCHA_ENTERPRISE_*` formatında uyumlu. Warning'in tam hata metnini structured logla; `RECAPTCHA_ENFORCE` monitor-mode kararını koru veya product kararıyla low-score reject'e geç. Bot sinyali PII içermeden loglanmalı.
6. **Task 8 — Prisma 7 upgrade**: En son ve ayrı major-version branch. Prisma 7 breaking-change rehberi okunmadan yapılmaz.

### Platform dağılımı nerede gösteriliyor?
- **Admin paneli** (`src/app/admin/dashboard/page.tsx`) → `<PlatformDistribution>` (detaylı bar chart + pills). Eskiden üstte ayrı bir "Platform Mini Cards" grid'i vardı — duplikasyon olduğu için kaldırıldı (2026-04).
- **Owner paneli** (`src/components/dashboard/RestaurantAnalyticsPanel.tsx`) → `<PlatformDistribution>`. Aynı bileşen. Mobile'da da tam görünür (bar chart flex-wrap + `w-24 sm:w-28` label).

---

## 6. Dizin Haritası

```
src/
├── app/
│   ├── [locale]/              # i18n route'ları (tr/en) — marketing + dashboard
│   ├── admin/                 # Admin panel (superadmin/manager)
│   ├── api/                   # cron/, auth/, admin/, feedback/, menu/, restaurants/, newsletter/, sentry-test, dev/, ...
│   ├── r/[slug]/              # Public QR landing + feedback form
│   ├── menu/[slug]/           # Public restoran menüsü (SSR)
│   ├── global-error.tsx       # Branded safe-mode + Sentry error boundary
│   ├── opengraph-image.tsx    # Dynamic 1200x630 OG image
│   ├── robots.ts + sitemap.ts # SEO
│   └── globals.css            # Pulse @theme + bz-* + pulse-* utility'leri
├── components/
│   ├── admin/                 # StatsCards, FeedbackTable, AdminSidebar, ...
│   ├── auth/                  # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
│   ├── dashboard/             # OwnerShell, RestaurantAnalyticsPanel, menu/*
│   ├── marketing/             # MarketingNavbar, MarketingFooter, MobileBottomNav, BuazeLogo, NewsletterSignup, ...
│   ├── menu/                  # PublicMenuView (6 tema), ProductDetailModal, MenuSplash
│   ├── notifications/         # In-app notification components
│   ├── panel/                 # Owner+admin paylaşılan shell parçaları
│   ├── providers/             # QueryProvider (React Query root)
│   ├── shared/                # Cross-surface küçük yardımcılar
│   └── ui/                    # bz-* primitive set: Modal, Tabs, Badge, StatCard, Field, ...
├── lib/
│   ├── auth.ts                # JWT (jose) + actor resolve + IDOR helpers
│   ├── prisma.ts              # Tek instance (HMR-safe)
│   ├── translations.ts        # tr/en string haritası
│   ├── validations.ts         # Elle validation helpers (legacy)
│   ├── menu-access.ts         # Menü erişim kontrolü
│   ├── api/                   # validate.ts (Zod helper, §28) + paylaşılan API yardımcıları
│   ├── email/                 # Pulse mail layout + templates/ + copy-loader + revisions (§21)
│   ├── email.ts + email-internal.ts  # Resend HTTP + public sender'lar
│   ├── legal/                 # KVKK / Terms / Cookie metin kaynakları
│   ├── roi/                   # ROI hesaplama yardımcıları
│   ├── seed/                  # Seed data (case-studies, blog vb. helper'ları)
│   ├── firebase-{client,admin}.ts    # Google Sign-in (sadece OAuth, §4)
│   ├── recaptcha{,-client}.ts # reCAPTCHA Enterprise score-based bot guard
│   ├── rate-limit.ts          # Upstash distributed (§14.2)
│   ├── openai.ts              # Pulse AI (§15)
│   ├── analytics-{session,heuristics}.ts  # Menu analytics (§13)
│   └── ...                    # client-image, format, help-articles, sectors, totp, vb.
├── hooks/                     # Paylaşılan React hooks
├── types/                     # Cross-cutting TypeScript types
├── middleware.ts              # Auth + locale + rate-limit gate
└── proxy.ts                   # Firebase Auth proxy yardımcıları
prisma/
├── schema.prisma              # Tüm modeller
└── seed-case-studies.ts       # Case-study seed (manuel runner)
scripts/
├── validate-env.js            # Build-time zorunlu env doğrulaması (§14.1)
├── seed-mail-templates.ts     # 32 row mail template seed (16 template × 2 locale, §21.26)
├── seed-legal-documents.ts    # Legal metinleri DB'ye seed
└── backfill-feedback-reply-source.ts  # FeedbackReply.source backfill (§21.20)
tests/
└── oauth.test.ts              # Node --test runner (§32)
```

---

## 7. Geliştirme Kuralları (bu projeye özgü)

Aşağıdakiler **bilinçli kararlar** — değiştirmek için güçlü sebep gerekir.

### ✅ Yap
- Her yeni DB sorgusunda **rol bazlı scoping** uygula (IDOR).
- Filtreleri **pure React state** ile yönet (URL searchParams değil — mevcut dashboard deseni bu).
- Client component'lerde fetch sonrası `setPage(1)` çağır (boş sayfa bug'ını önler).
- Tailwind yardımcı sınıflarını tekrarla — ortak "Button" component'i yazma (proje boyunca tutarlılık için).
- `format()` (date-fns) + `locale === 'tr' ? tr : undefined` pattern'ini kullan.
- Uzun dropdown / toolbar'larda mobilde `flex-col md:flex-row` + `w-full sm:w-auto`.
- Prisma schema değiştiriyorsan migration dosyasını commit et (`prisma/migrations/...`). Deploy migration history üzerinden yürür.

### ❌ Yapma
- Production/Preview schema değişikliği için `npm run db:push` kullanma. Bu script yalnızca lokal scratch DB içindir; kalıcı değişiklik migration olarak commitlenir.
- **Ortak abstraction'lar** (shared PLATFORM_CONFIG modülü gibi) **üç yerden fazla tekrar** olmadıkça yazma.
- **AI / otomasyon / rol refactor** ekleme — kullanıcının açıkça istediği scope'a sadık kal.
- **Disk'e yazma** — Vercel serverless ephemeral FS, `public/uploads/*` veya başka bir dizine runtime yazılmaz. Görsel/dosya akışı için §3 (base64-in-DB) veya Supabase Storage.

### 📏 Scope disiplini
Kullanıcı genellikle **sade ve anlaşılır** ister ve "scope creep yapma" konusunda nettir. Bir görev tanımlandığında:
- Plan modunda önce onay al
- Yan temizlik (drive-by refactor) yapma
- "Belki faydalı olur" komponenti eklemeyin

---

## 8. Sık Karşılaşılan Tuzaklar

### Next.js body size limit (4MB default)
- Upload route'u dosyayı `file.arrayBuffer()` ile alıyor. 5MB client tarafı validasyonu var ama Next 15 App Router `Route Handler` default ~4MB. Gerekirse `next.config.ts` içinde experimental body size config.

### Prisma Client outdated
- Schema değiştirdin ama `prisma generate` yapmadın → TS hataları. `npx prisma generate` (Dockerfile zaten yapıyor).

### Supabase `DIRECT_URL` eksik
- `prisma migrate deploy` direct bağlantı (5432) gerektirir. `DATABASE_URL` pgbouncer (6543) olabilir ama `DIRECT_URL` olmadan migration deploy başarısız.

---

## 9. Yeni Göreve Başlarken Checklist

- [ ] Kullanıcı dilini ayarla (mesaj TR gelirse TR cevapla).
- [ ] Hedeflenen route'u bul: `src/app/admin/...` (panel) vs `src/app/api/...` (API) vs `src/app/r/[slug]/` (public).
- [ ] IDOR scoping gerekli mi? → evet ise `getScopedRestaurantIds` kullan.
- [ ] Yeni DB alanı gerekli mi? → `schema.prisma`'da var mı kontrol et. Yoksa ekle + Prisma migration oluştur; `npm run db:push` sadece lokal scratch DB için.
- [ ] Platform ile ilgili mi? → 4 config haritasını güncellemeyi unutma.
- [ ] Dosya yükleme mi? → §3 depolama mimarisine göre davran.
- [ ] Mobil görünüm → `flex-col md:flex-row`, `w-full sm:w-auto`, `text-[10px] sm:text-xs`.
- [ ] Scope creep? → plan modu veya onay.

---

## 10. İletişim Stili (kullanıcı için)

- Kullanıcı **Türkçe** tercih ediyor. Kod konuşurken TR + teknik İngilizce karışık OK.
- **Kısa ve net** mesaj. Uzun dokümantasyon istemiyor.
- **Önemli**: Bir varsayım belirsizse sorma — önce **keşfet** (Explore/Grep), sonra ne bulduğunu söyle.
- Destructive action (force push, reset --hard, dependency kaldırma) → **önce sor**.
- Kullanıcı "iyileştir" dediğinde UI/UX açısından **sadeleştirme** bekler, özellik eklemeyi değil.


---

## 11. Marka Kimliği & Tasarım Sistemi (2026-04 Pulse)

> **Özet:** 2026-04 Pulse redesign'ı ile v2 Gold/Navy/Ivory paleti **pure white + graphite + lime** sistemine geçti. Tasarım kaynağı: Claude Design'den gelen "Pulse" yönü (her yorum bir nabız).

### Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| Pure | `#FFFFFF` | Ana yüzey (sayfa bg, kartlar) |
| Graphite | `#0A0A0A` | Ana mürekkep, text-main, sidebar, koyu butonlar |
| Lime | `#C6F24E` | Primary accent, butonlar, aktif nav, pulse vurgusu |
| Lime Deep | `#A8D62E` | Hover / pressed state |
| Lime Soft | `#EAF9B8` | Soft tint (badge bg, highlight) |
| N200 | `#EDEDED` | Border, neutral support |
| N500 | `#737373` | Muted body text |
| N800 | `#1A1A1A` | Dark secondary UI / navy replacement |

**CSS token'ları:** `globals.css` → `@theme {}` bloğunda tanımlı (`--color-brand-pure`, `--color-brand-graphite`, `--color-brand-lime`, vb.). Legacy alias'lar (`--color-brand-gold`, `--color-brand-navy`, ...) yeni palet değerlerine remap edildi — geriye dönük uyumluluk için var ama yeni kod **Pulse token'larını** kullanmalı.

**Tailwind:** Inline `bg-[#C6F24E]`, `text-[#0A0A0A]` gibi arbitrary value'lar kullanılıyor — shared PLATFORM_CONFIG modülü gibi abstraction yapılmadı (üç yerden fazla tekrar olunca değerlendirilir).

### Logo
- `src/components/marketing/BuazeLogo.tsx` — SVG bileşeni (API: `size`, `className`, `variant`: `'default' | 'on-dark' | 'on-lime'`).
- Şekil: **Yorum baloncuğu** (asimetrik, sol-alt kuyruk) + içinde **ECG nabız çizgisi** + sağ-üst köşede **lime accent kıvılcımı**. Eski lowercase `b` + checkmark tamamen değişti.
- Renk: Graphite `#0A0A0A` gövde + Lime `#C6F24E` kıvılcım (`on-dark` variant: beyaz gövde + lime; `on-lime` variant: tamamen graphite).
- **Kullanım alanları:** admin sidebar, user dashboard shell, marketing navbar & footer, auth (login/register), trial-expired. İmport'lara dokunma, sadece SVG içeriği ve variant değerleri değişti.
- `public/favicon.svg` — graphite kart içinde beyaz ECG + lime nokta.

### Font
- **Space Grotesk** (display/heading) + **Inter** (body) + **JetBrains Mono** (eyebrow / sayı / kod) — `next/font/google` ile yüklü (`src/app/layout.tsx`).
- `globals.css` içinde `h1..h6` için CSS seçiciyle Space Grotesk + `font-weight: 500` + sıkı `letter-spacing: -0.025em` otomatik uygulanır, body default Inter'dir.
- Space Grotesk weights: 400, 500, 600, 700. Inter weights: 400, 500, 600, 700, 800, 900. JetBrains Mono weights: 400, 500, 600.
- CSS variable'ları: `--font-heading` (Space Grotesk), `--font-body` (Inter), `--font-mono` (JetBrains Mono).
- **Pulse eyebrow pattern**: `.pulse-eyebrow` utility class — JetBrains Mono, 11px, tracking 0.18em, uppercase. Küçük kategori/label chip'leri için.

### UI Stili
- **Neo-brutalist offset shadow'lar** kaldırıldı, yerine `shadow-sm/md/lg` + soft 20px offset koyu shadow'lar kullanılıyor.
- Kart border'ları `#EDEDED` (n200) olmalı; Graphite border'lar sadece buton ve high-contrast elemanlarda.
- Typography weight kademeleri: heading `font-medium` (500) veya `font-semibold` — Space Grotesk kendisi ince, bold aşırı kalın durur. Body `font-medium`/`font-semibold`. Aşırı `font-black` kullanımından kaçının.
- **Motion**: `.pulse-heartbeat` utility — 1.6s ease infinite scale(1→1.2→1). Logo accent dot, live status indicator vb. için.
- **Signature buton**: `bg-[#C6F24E] text-[#0A0A0A]` (lime CTA) veya `bg-[#0A0A0A] text-white` (koyu CTA); hover'da `bg-[#A8D62E]` / `bg-[#1A1A1A]`.

### Dokunulmayan platform brand hex'leri
`#4285F4` (Google), `#FA0050` (Yemeksepeti), `#5D3EBC` (Getir), `#F27A1A` (Trendyol GO) — `FeedbackTable.tsx`, `PlatformDistribution.tsx`, `admin/qr/page.tsx` içinde resmi marka renkleri olarak korunur.

### Ses & Ton (Pulse Voice)
**Yap:** Net · Ölçülü · Güvenli · Doğrudan · Profesyonel Türkçe
**Yapma:** Havalı slogan · Korkutucu · Aşırı teknik · Emoji yığını
Örnek: *"Her yorum bir işarettir."* (❌ *"🚀 Yorumlarınızı devrimci şekilde yönetin!"*)

---

## 12. Menü Sistemi (2026-04 redesign)

Menü yapısı tek tip modern builder etrafında toplandı. Legacy `MenuEditor.tsx` + `MenuCategoryForm.tsx` + `MenuItemForm.tsx` **silindi**; eski admin rotası ve `/dashboard/menu` modern builder'a redirect yapıyor.

### 12.1 Builder — DnD + Tema Paneli + Menü QR + Upload + Quick Toggle'lar

**Dosya:** `src/app/[locale]/dashboard/restaurants/[id]/menu/page.tsx`

- **DnD:** `@dnd-kit/core` + `@dnd-kit/sortable`. `PointerSensor` (distance 8) + `TouchSensor` (150 ms delay) → iOS Safari dokunsal destek. Mevcut ok butonları erişilebilirlik fallback'i olarak kalır.
- **Tema:** 4 preset — `classic` (default) / `modern` / `elegant` / `gastronomy`. `Restaurant.menuTheme` kolonu.
- **Accent renk:** 8 hazır swatch + native `<input type="color">`. `Restaurant.menuAccentColor` (null → `primaryColor` fallback).
- **Logo:** `Restaurant.menuLogoUrl`. ThemePanel'de upload + preview + remove. `POST /api/restaurants/[id]/menu/upload` (kind=`logo`, 512x512 cover).
- **Ürün görseli:** ItemModal'da dosya yükleme butonu + URL input (hybrid). Dosya seçildiğinde `compressImage()` (src/lib/client-image.ts) tarayıcıda Canvas ile 1600px max WebP'ye çevirir → request payload ~200-400 KB'a düşer → `kind=item` endpoint'ine gider → sharp server'da 1200px'e indirip base64 döner → form state → item satırı. Client compression **dep-free** (Canvas/OffscreenCanvas), API yoksa orijinal dosya olduğu gibi yüklenir.
- **Logo:** `Restaurant.menuLogoUrl`. ThemePanel'de upload + preview + remove. `POST /api/restaurants/[id]/menu/upload` (kind=`logo`, 512x512 cover). Upload'tan önce `compressImage(file, { maxDim: 1024 })`.
- **6 tema:** Builder'da `themes` array 6 item içerir (classic, modern, elegant, gastronomy, minimal, bistro). Grid `sm:grid-cols-3`. Her tema için `ThemeThumb` inline SVG preview.
- **Quick toggle'lar:** Kategori satırında `isVisible` eye, ürün satırında `isAvailable` eye + `isOutOfStock` AlertTriangle. Modal açmadan tek tıkla değiştir — optimistic state + revert on failure.
- **Menü QR:** `/api/restaurants/[id]/menu/qr?format=png|svg` → PNG/SVG indir. URL'de `?source=qr` attribution parametresi taşır (analytics attribution için kritik).
- **Reorder perf:** `reorderCategories` / `reorderItems` sadece **error** durumunda `fetchAll()` çağırır (önceden her reorder'da yapıyordu — 2x network). Optimistic state zaten doğru.

### 12.2 Public menü & PublicMenuView

**Dosya:** `src/components/menu/PublicMenuView.tsx`

Tek giriş noktası: `restaurant.menuTheme` üzerinden `switch` ile 6 layout component'i:
- `ClassicLayout` (default) — gradient hero + liste kartları
- `ModernLayout` — grid kartlar, fiyat overlay
- `ElegantLayout` — magazine, tek sütun, Manrope heading
- `GastronomyLayout` — koyu tema (#0E1525) + gold accent çerçeveli logo
- `MinimalLayout` (yeni 2026-04) — tipografi ağırlıklı, tek sütun, ince divider
- `BistroLayout` (yeni 2026-04) — cream bg (#FAF7F0), 2-sütun grid, kafe tarzı

Paylaşılan helper'lar: `BadgeChip`, `BadgeChipOnDark`, `Placeholder`, `RestaurantMeta`, `EmptyState`, `Footer`.

`accent = restaurant.menuAccentColor || restaurant.primaryColor` — accent her tema JSX'ine prop olarak geçer.

**Logo placement:** `restaurant.menuLogoUrl` varsa her temanın hero alanında uygun pozisyonda görünür (Classic+Modern+Bistro: köşe kartı; Elegant: merkez üstünde dairesel; Gastronomy: gold-çerçeveli dairesel). Logo yoksa restoran adının ilk harfi fallback olarak render edilir.

Admin preview modu `disableAnalytics` prop'u ile tracking'i kapatır **ve** splash'i devre dışı bırakır — builder'daki önizleme üretim verilerini kirletmez ve 3 sn beklemeye sokmaz.

### 12.2.1 Yan component'ler

- **`ProductDetailModal.tsx`** — ürün kart tıklamasında açılır; mobilde bottom sheet, desktop'ta merkez modal. ESC + backdrop kapatır, `document.body.overflow` kilidi var. Açılışta `menu_product_click` analytics event'i.
- **`MenuSplash.tsx`** — `?source=qr` parametresiyle gelen müşteriye 3 sn markalı splash. `window.history.replaceState` ile param silinir (yenilemede tekrar çıkmaz). `prefers-reduced-motion: reduce` altında 0ms (atlanır).
- **Legacy `/r/[slug]/menu/page.tsx`** — magazin stilli ayrı sayfa (kendi search + modal). Tema desteği yok (sadece `menuAccentColor`). TDZ tuzağı: `filteredCategories` useMemo'su ilgili useEffect'lerden **önce** tanımlanmalı (minify sonrası `Cannot access before initialization`).

### 12.4 Backend dikkat edilecek davranışlar

- **Item PATCH + kategori değişikliği:** Item farklı bir kategoriye taşındığında server tarafı otomatik olarak hedef kategorinin sonuna yerleştirir (`sortOrder = MAX + 1`). Aksi halde sortOrder eski değerinde kalır ve listede yanlış pozisyonda görünür. Bkz. `/api/restaurants/[id]/menu/items/[itemId]` PATCH.
- **sortOrder default:** Yeni item/kategori POST'unda `sortOrder = last + 10` kullanılır (10'luk boşluk manuel ince ayar için ama reorder sonrası `0,1,2...`'e sıkıştırılır). Small quirk, functional.
- **`parsePriceInput`:** TR (`1.234,56`), EN (`1,234.56`) ve basit formatları (`1,50` / `1.50` / `1000`) destekler. Comma varsa decimal, dotlar thousand separator; tersi de geçerli. Tek dot belirsizlik durumunda decimal kabul edilir. Bkz. `src/lib/format.ts`.
- **MenuCategory soft-delete (Sprint 3):** `deletedAt` kolonu ile mantıksal silme. `MenuItem.category onDelete: Restrict` korunur, `MenuCategory.items` cascade `deleteMany` sadece **restoran tamamen silindiğinde** çalışır (`/api/restaurants/[id]` DELETE). Tüm read sayfaları + reorder + item POST/PATCH `deletedAt: null` filtresi uygular; PATCH endpoint'i soft-deleted satırı 404 döner (zombie write koruması). Restore yolu yok — soft-delete = arşivleme; geri çağırmak DB direct müdahale gerektirir (Sprint 4 kararı).

---

## 13. Menu Analytics (2026-04)

Restoran paneline özel analitik sistemi. **Müşteriye görünmez** — tüm UI admin/owner paneli içindedir. KVKK/GDPR uyumlu (PII toplanmaz).

### 13.1 Data modeli

**Tablo:** `menu_analytics_events` (Prisma: `MenuAnalyticsEvent`)

Kolonlar: `id`, `restaurantId`, `categoryId?`, `productId?`, `eventType`, `sessionId`, `sourceType?`, `metadata?`, `createdAt`.

Index'ler (tümü `restaurantId` prefix'li):
- `[restaurantId, eventType, createdAt]` — genel groupBy
- `[restaurantId, categoryId, eventType, createdAt]` — kategori aggregates
- `[restaurantId, productId, eventType, createdAt]` — ürün aggregates
- `[restaurantId, sessionId, createdAt]` — dedupe lookup
- `[restaurantId, sourceType, createdAt]` — source filtresi

Daily rollup tabloları **yok** — ham event'ler + composite index yeterli. ~10K event/gün'e kadar raw query'ler hızlı.

### 13.2 Event türleri

| Tip | Ne zaman | Zorunlu alanlar |
|---|---|---|
| `menu_view` | Menü sayfası açıldığında | — (categoryId/productId null) |
| `menu_category_click` | Kategori nav'a tıklandığında | `categoryId` |
| `menu_product_view` | Ürün kartı viewport'a girdiğinde (IntersectionObserver, threshold 0.5) | `productId`, `categoryId` |
| `menu_product_click` | Ürün kartına tıklama / detay açılışı | `productId`, `categoryId` |
| `menu_upsell_click` | Upsell öğesine tıklama (ileride) | `metadata.relatedProductId`, `metadata.sourceProductId` |

### 13.3 Session & dedupe

- **Session ID:** `src/lib/analytics-session.ts` → `localStorage['buaze.menu.sid']` (UUID, 30 dk idle sonrası rotate). localStorage yoksa in-memory fallback (sayfa yenilenince yeni session — bu kabul edilir).
- **Client dedupe:** `useMenuAnalytics` hook `lastSentRef` Map'i + per-event window (`menu_view`: 2 dk, `category_click`: 30 sn, `product_view`: 5 dk, `product_click`: 1 dk).
- **Server dedupe:** Aynı `(restaurantId, sessionId, eventType, categoryId, productId)` tuple'ı window içinde yeniden gelirse skip edilir. Refresh abuse'a karşı.
- **Batch:** 25 event veya 4 sn delay. `pagehide`/`beforeunload`/`visibilitychange` olaylarında `sendBeacon` ile flush.

### 13.4 Attribution (sourceType)

`qr` | `direct` | `table` | `link` | `delivery`. Client tarafında `detectSourceType()` URL param önceliği ile set eder:
- `?source=qr` → `qr` (menü QR endpoint'i URL'ye ekler — `12.1` notuna bkz)
- `?table=X` → `table`
- Cross-origin referrer → `link`
- Yoksa → `direct`

### 13.5 API'ler

**Public ingestion:** `POST /api/menu/[slug]/analytics`
- Body: `{ sessionId, events[] }` — max 40 event/istek
- Rate limit: 300 event/dk/session
- **Geçersiz categoryId/productId sessizce null'a düşürülür** (phantom ID ile aggregate kirletme engeli)
- Inactive/disabled restoran → sessiz 200 (slug fingerprinting engeli)

**Admin aggregate:** `GET /api/restaurants/[id]/analytics/menu`
- IDOR: `requireRestaurantAccess` (CLAUDE.md §4)
- Query params: `range=7d|30d|90d|all`, `categoryId`, `sourceType`, `locale`
- **Category filter sadece scoped event'lere uygulanır** — `menu_view` her zaman global sayılır (aksi halde filtre aktifken 0 görünür).
- **Trend raw SQL de filtreleri respect eder** (önceki implementasyonda bug'dı, fix edildi).
- Previous-period karşılaştırması aynı filtrelerle.

### 13.6 Heuristikler

**Dosya:** `src/lib/analytics-heuristics.ts` — tüm eşikler bir yerde.

- **Low-interest:** ≥15 view + CTR ≤ %8 → status: `needs_review` (0 click), `check_description` (<%4), `low_interest` (<%8)
- **Upsell kuralları (deterministik):**
  - Beverage views / main views < %35 → "İçecekleri öne al"
  - Dessert views / main views < %35 → "Görsel/açıklama iyileştir"
  - Top 5 ürünün CTR'si düşükse → "Ürün sunumunu gözden geçir"
  - Lider ürün + zayıf beverage → "Ürüne içecek eşleştir"
- **Kategori sınıflandırma:** İsim içinde TR/EN keyword match (`içecek`, `beverage`, `tatlı`, `dessert`, `meze`…).

### 13.7 Entegrasyon noktaları

`PublicMenuView` (6 tema), `/r/[slug]/menu` (legacy), `/menu/[slug]` (SSR) — hepsi tracking'e bağlı. `disableAnalytics` prop'u admin preview'ı dışarda tutar.

### 13.8 Admin UI davranışları

**Dosya:** `src/app/[locale]/dashboard/restaurants/[id]/menu/analytics/page.tsx`

- **Window date display:** Header altında `window.start → window.end` tarih aralığı görünür (ISO → locale formatla).
- **Refresh butonu:** `fetchAnalytics()` tekrar çağırır — manuel yenileme isteyen kullanıcılar için.
- **Reset filters:** Kategori veya kaynak filtresi aktifken "Filtreleri temizle" butonu çıkar, tek tıkla ikisini de sıfırlar.
- **All-time trend:** `range=all` seçildiğinde trend chart yerine bilgilendirme kartı gösterilir (sonsuz aralık için gün bazlı seri bucket'lamak pahalı olduğundan server zaten `trend=[]` döner).
- **Mobile chart:**
  - AreaChart x-axis tick interval trend uzunluğuna göre (`≤7 gün: 0`, `≤30 gün: 5`, `>30: length/6`) — 375px ekranda etiketler çakışmaz.
  - BarChart Y-axis kategori etiketleri 14 karakterden uzunsa truncate edilir, tam ad tooltip'te görünür.

### 13.9 Retention politikası

| Veri sınıfı | Tablo | Retention | Mekanizma |
|---|---|---|---|
| Müşteri IP'si | `Feedback.ipAddress` | **90 gün** (KVKK data minimization) | `/api/cron/anonymize-ips` — `IP_RETENTION_DAYS` env override edilebilir |
| Menü analitik event'i | `menu_analytics_events` | **Süresiz** (şimdilik) | 10 restoran × 1K/gün = ~3.6M satır/yıl — ileride 90 gün raw + 180 gün rollup planı |
| Admin audit log | `admin_audit_logs` | **2 yıl** (legitimate interest) | Şu an cron yok; günde 1-2 işlem × 730 gün ≈ 1500 satır → manuel temizlik yeterli. Volume artarsa `/api/cron/prune-audit-logs` eklenir. |
| Yorum (Feedback) | `Feedback` | **Süresiz** (KVKK onaylı) | İşletmenin müşteri ilişkisi kaydı — silmek müşteri talebine bağlı |

**Cron path'leri:**
- `/api/cron/anonymize-ips` — canlı (Sprint 3)
- `/api/cron/weekly-digest` — canlı (haftalık özet)
- `/api/cron/analytics-compact` — örnek path, henüz yok
- `/api/cron/prune-audit-logs` — gerek olunca eklenecek

Tüm cron'lar `Authorization: Bearer ${CRON_SECRET}` zorunlu; Vercel Cron config ya da harici scheduler ile tetiklenir.

---

## 14. Vercel Deploy (2026-04 update)

### 14.1 Build script

`package.json`:
```json
"build": "node scripts/validate-env.js && prisma migrate deploy && next build"
```

3 adım:
1. **`scripts/validate-env.js`** — zorunlu env'leri (DATABASE_URL, DIRECT_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL) doğrular; eksikse exit 1 → Vercel build başlamadan fail eder.
2. **`prisma migrate deploy`** — commitlenmiş migration history'yi uygular. Schema değişiklikleri `prisma/migrations/` altında görünür; production build sessiz data drop yapmaz.
3. **`next build`** — uygulama derlemesi.

**Defensive coding kuralı (Faz 6 sweep, 2026-04):** `prisma.X.findUnique({ where: ... })` çağrılarına **her zaman explicit `select`** ekle. Prisma'da select'siz findUnique tüm sütunları çeker; schema'da olup henüz DB'ye sync olmamış bir sütun (deploy race, manual SQL, preview env, dev branch) varsa `P2022` ile 500 atar. Explicit select ilgisiz sütunları sorgudan çıkardığı için drift'e bağışıklık sağlar.

**Faz 6'da süpürülen 11 callsite (8 dosya):**
- `admin/profile` (PUT) — `select: { passwordHash }`
- `admin/users` POST içi tx — 2 existence check, `select: { id }`
- `admin/blog/[id]` GET — tam alan listesi (admin edit form full read)
- `admin/mail-templates/[key]/[locale]` GET — tam alan listesi
- `admin/mail-templates/.../revisions/[id]/revert` — `{ templateKey, locale, content }`
- `admin/newsletters/campaigns/[id]` — GET tam alanlar; PATCH ve DELETE `{ status }` only
- `admin/login` — hotfix migration `{ id }`; auth fetch `{ id, passwordHash, role, restaurantId }`

Public path (`/api/restaurants?slug=`) zaten Faz 1'de süpürüldü (PR #118). Sweep'in dışında kalan callsite: `prisma.X.create()` — INSERT yolu zaten o anda schema↔DB ile yazıyor, SELECT-only drift senaryosu uygulanmaz.

**Yeni route eklerken:** `findUnique`'e `select: { ... }` ekle. Sonradan field eklersen `select`'i de güncelle. Lint kuralı bunu zorlamıyor; code review checklist.

**Server-render Prisma batch kuralı (2026-05-03):** Vercel/Supabase pooler `connection_limit=1` altında bir Server Component veya tek request'lik API çok sayıda Prisma read'i aynı anda başlatırsa (`Promise.all([...prisma...])`) pool queue/timeout riski artar. Sayfanın tek snapshot'ını üretmek için bağımsız read batch'lerinde `prisma.$transaction([...])` kullan; bu tek connection üstünden sıralı ve tutarlı çalışır. Gerçek paralellik gereken outbound HTTP, cron per-row isolation veya kullanıcı aksiyon batch'lerinde `Promise.allSettled` pattern'i korunur.

**Error boundary kuralı (2026-05-03):** Root `global-error.tsx` son güvenlik ağıdır; normal ürün akışları için segment bazlı `error.tsx` tercih edilir (`/[locale]/dashboard`, `/admin`, public QR/menu gibi). Tüm boundary'ler `reportBoundaryError(boundary, error)` ile Sentry'ye `boundary` tag'i yollar. Transient `TypeError: network error`, `failed to fetch`, `fetch failed`, `load failed` vakalarında `scheduleTransientRetry(...)` ile route başına 30 saniyede en fazla 1 otomatik retry yapılır; kalıcı hatada kullanıcıya `Tekrar dene` + güvenli dönüş CTA'sı gösterilir.

**Zorunlu Vercel env var'ları:**
- `DATABASE_URL` — Supabase pooler (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432) — Prisma migrations bunu kullanır. **Yoksa build fail eder.**
- `JWT_SECRET` — auth token signing
- `NEXT_PUBLIC_APP_URL` — QR URL'lerinde kullanılır

**Opsiyonel:**
- `OPENAI_API_KEY` — Pulse AI yanıt önerileri için (§15). Yoksa endpoint deterministik şablona düşer, UI çalışmaya devam eder.
- `OPENAI_MODEL` — Varsayılan `gpt-4o-mini`.
- `SENTRY_DSN` veya `NEXT_PUBLIC_SENTRY_DSN` — error tracking (§26). Server/edge runtime `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` ile init olur; client yalnızca `NEXT_PUBLIC_SENTRY_DSN` kullanır. Yoksa SDK no-op çalışır. Vercel Sentry Marketplace integration source-map upload için ayrıca `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` sağlayabilir.
- `NEXT_PUBLIC_FIREBASE_*` (4 env) — Google Sign-in için Firebase client config. Yoksa Google OAuth butonu disable, e-posta+şifre auth çalışmaya devam eder.
- `FIREBASE_AUTH_PROXY_TARGET` — `next.config.ts` rewrite hedefi (Firebase Auth proxy). `__/auth/*` ve `__/firebase/init.json` path'lerini Firebase'e yönlendirir. Boşsa rewrite eklenmez.
- `FIREBASE_ADMIN_PROJECT_ID` — server-side Firebase Admin SDK için.
- `RECAPTCHA_ENTERPRISE_API_KEY` + `RECAPTCHA_ENTERPRISE_SERVICE_ACCOUNT_JSON` + `RECAPTCHA_ENTERPRISE_PROJECT_ID` — reCAPTCHA Enterprise score-based bot koruması (`src/lib/recaptcha.ts`). `RECAPTCHA_ENFORCE='true'` set edilince düşük skorlu istek reddedilir; default `false` (sadece skor logla).

### 14.2 Rate limit (Upstash Redis + in-memory fallback)

`src/lib/rate-limit.ts` 2026-04 itibariyle **distributed**. Vercel Marketplace üzerinden Upstash Redis bağlandı (`KV_REST_API_URL` + `KV_REST_API_TOKEN` env'leri); env yoksa eski in-memory `Map` davranışına otomatik geri düşer (lokal dev intacta). Sliding-window algoritması (`@upstash/ratelimit` `Ratelimit.slidingWindow`) — fixed-bucket'ın "boundary'de iki kat istek" exploit'ini engeller. Ratelimit instance'ları `${max}:${windowMs}` key'iyle cache'lenir, RTT/maliyet düşürülür.

**Public API değişti:** `rateLimit(key, max, windowMs)` artık `Promise<RateLimitResult>` — tüm caller'lar `await` etmeli (mevcut 21+ caller toplu güncellendi). `blockKey` / `isBlocked` / `resetRateLimit` in-memory only kaldı (admin-login ve özel akışlar için yeterli).

**Fail-open:** Upstash 800ms timeout veya hata atarsa in-memory fallback'e düşer + console.error logu. Site'ı offline rate-limit backend kuyruğunda boğmamak için bilinçli karar.

**Wired endpoints (bu PR):** `/api/feedback` POST'a Upstash ön-katmanı eklendi (5/dk/IP — DB rate limit (3/10dk) hâlâ ikinci kat). `/api/contact` POST'una rate limit eklendi (3/10dk/IP — Resend mail spend kontrolü). Diğer mevcut caller'lar zaten in-memory kullanıyordu, otomatik distributed'a geçti.

**Yapma:** Upstash key'lerini istemci bundle'ına geçirme — server-only (env prefix `NEXT_PUBLIC_` yok). Read-only token (`KV_REST_API_READ_ONLY_TOKEN`) henüz consume edilmedi ama gelecek cache okumaları için Vercel integration tarafından provisioned, dokümante edildi.

**Yap:** Yeni public POST endpoint'i eklerken `await rateLimit('endpoint:ip:${ip}', N, windowMs)` ile en başta gate koy. Mail/SMS gibi side-effect'li akışlarda kapsayıcılık kritik (her istek = 1 Resend send credit).

---

## 15. Buaze Pulse AI (OpenAI)

Yorum yanıt taslağı için "Taslak oluştur" butonu (`/admin/reviews` + `/[locale]/dashboard/feedbacks`).

- **Helper:** `src/lib/openai.ts` — `hasOpenAIKey()` + `chatCompletion()`; `fetch` tabanlı, `openai` SDK dep YOK (§7).
- **Endpoint:** `POST /api/feedback/[id]/suggest-reply`
  - IDOR: `getPanelActorFromRequest` + `canAccessRestaurant`
  - Rate limit: **30 istek / dk / workspace owner** (`resolveOwnerUserId(actor)` ile keylenir — team member'lar bypass yapamaz)
  - Body: `{ locale?: 'tr' | 'en'; tone?: 'warm' | 'formal' | 'apologetic'; autoDraft?: boolean }`; diğer her şey Prisma'dan. `autoDraft:true` yalnız otomatik inbox fallback'i için kullanılır ve `enableAiDraft=false` ise `409 auto_draft_disabled` döner.
  - Response: `{ feedbackId, suggestion, source: 'openai' | 'template' | 'template-fallback' }`
- **Fallback:** `OPENAI_API_KEY` yok / API hata → `buildReplyTemplate()` tek satır + `[fill in]` placeholder döner. UI'da gri "ŞABLON" rozeti, lime "AI" rozeti.
- **Prompt:** Restoran itibar uzmanı, 2-4 cümle, max 80 kelime, ücretsiz ikram önerme, emoji yok. Model `gpt-4o-mini` default (env: `OPENAI_MODEL`).
- **Maliyet:** ~400 token / öneri ≈ $0.0001. 10K öneri/ay = $1.
- **Güvenlik:** Anahtar yalnız server-side (`process.env.OPENAI_API_KEY`); `NEXT_PUBLIC_` prefix yok, client bundle'a sızmaz.
- **Auto-draft toggle kuralı:** `Restaurant.enableAiDraft=false` ise düşük puanlı yorumlarda arka plan draft üretilmez, owner inbox seçiminde `/draft` veya `suggest-reply` otomatik çağrılmaz, `/api/feedback/[id]/draft` `draft:null` döner. Manuel `Yeniden öner` / `suggest-reply` ayrı, açık kullanıcı aksiyonu olarak kalır.
- **Disable cleanup:** Owner `Pulse AI taslaklarını otomatik hazırla` toggle'ını kapattığında `/api/restaurants/[id]/ai-settings` ilgili restoranın bekleyen `FeedbackAiDraft` kayıtlarını temizler; böylece eski draft badge'leri ve otomatik prefill görünmez.

### 15.1 AI Quota Guard (3-katmanlı koruma)

`src/lib/ai-quota.ts` — tüm AI çağrı yerlerine **layered daily/weekly cap**. Mevcut Upstash `rateLimit()` (CLAUDE.md §14.2) reuse, yeni dep yok. Cache miss'ten sonra çağrılır — cache hit'lerde quota harcanmaz.

**Üç katman:**
1. **Per-user/day** — sızdırılmış oturum hızlı abuse'u sınırlasın
2. **Per-workspace/day** — owner credentials sızıntısında ws-level cap
3. **Per-global/day** — site geneli "spend ceiling" (cost guard)

**Kanonik limitler** (`AI_QUOTAS` const, ai-quota.ts):
| Scope | Limit | Window |
|---|---|---|
| `SUGGEST_REPLY_USER_DAY` | 100 | 24h |
| `SUGGEST_REPLY_WORKSPACE_DAY` | 300 | 24h |
| `SUGGEST_REPLY_GLOBAL_DAY` | 2000 | 24h |
| `ANALYTICS_THEMES_WORKSPACE_DAY` | 50 | 24h |
| `ANALYTICS_THEMES_GLOBAL_DAY` | 500 | 24h |
| `WEEKLY_INSIGHT_WORKSPACE_WEEK` | 20 | 7d |
| `WEEKLY_INSIGHT_GLOBAL_WEEK` | 200 | 7d |

**Kullanım pattern:**
```ts
const quota = await checkLayeredAiQuota([
  { scope: 'suggest-reply:user', identifier: actor.id, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_USER_DAY },
  { scope: 'suggest-reply:ws', identifier: ownerKey, dailyLimit: AI_QUOTAS.SUGGEST_REPLY_WORKSPACE_DAY },
  { scope: 'suggest-reply:global', identifier: 'global', dailyLimit: AI_QUOTAS.SUGGEST_REPLY_GLOBAL_DAY },
]);
if (!quota.allowed) {
  // Fail-safe fallback (template/empty) — UI çalışmaya devam etsin, HTTP hata fırlatma
  return emptyResult('fallback');
}
```

**Wired callsites:**
- `/api/feedback/[id]/suggest-reply` (POST) — user + ws + global, fail durumu template fallback
- `extractThemes()` (`analytics-themes.ts`) — ws + global, fail durumu empty result (UI section gizli)
- `extractWeeklyInsight()` (`weekly-insight.ts`) — ws + global (weekly window), fail durumu empty result

**Quota aşımı yan etkileri:**
- Sentry `captureMessage` warning level — ops dashboard'da görünür
- UI graceful degrade (template / hide) — kullanıcı kırıklık yaşamaz, ertesi gün quota reset
- Rate limit (per-minute) burst protection için ayrı katman — quota daily long-tail koruması

**Yapma:**
- HTTP 429 fırlatma quota dolduğunda — UI'da AI yokken bile akış tamamlansın (fail-safe)
- Cache check'ten önce quota check etme — cache hit'te gereksiz Upstash çağrısı
- Public endpoint'lerde quota'yı atla — `/api/roi/save` (reCAPTCHA gated) gibi public AI akışlarına da global cap uygulanmalı (gelecek scope)

**Yap:**
- Yeni AI callsite eklerken: cache check → AI key check → quota check → API call sırasıyla
- Workspace identifier her zaman geçirilsin — `workspaceId` undefined ise sadece global cap uygulanır (fallback)
- AI maliyet planlama: `gpt-4o-mini` ~$0.0001-0.0005/call. Global day cap × maliyet = max günlük spend

### 15.2 Yıllık fiyat override (admin panel)

`SubscriptionPlan` modelinde admin'in elle düzenleyebileceği yıllık fiyat field'ları:
- `priceYearlyTry: Int? @map("price_yearly_try")`
- `priceYearlyUsd: Int? @map("price_yearly_usd")`

**Davranış (`toPublicPlan()` `src/lib/subscription-plans.ts`):**
- Admin override (priceYearlyTry/Usd dolu) → `priceYearly = adminValue / 12` (aylık-eşdeğeri public sayfa için)
- Admin null bıraktıysa → formula fallback `priceYearly = discountedMonthly × 0.8`

**Admin form** (`src/components/admin/PlansManager.tsx`) — "Aylık fiyat" input'unun altında "Yıllık fiyat (TRY/USD, opsiyonel)" inputs. Boş bırakılırsa hint olarak otomatik hesap görünür: `Otomatik: ${monthly × 12 × 0.8}`.

**Yapma:**
- Public sayfada formula hardcode etme — `toPublicPlan()` zaten admin override + fallback handle ediyor
- Yıllık fiyatı `period: 'year'` plan'larıyla karıştırma — `period` plan tipi (subscription cadence), `priceYearly*` ise display amount

### 15.3 ContactFloat — sağ alt sohbet baloncuğu form'u

`src/components/marketing/ContactFloat.tsx` — marketing surface'inde sticky lead-capture widget (chat-style bubble + inline form, `/contact` sayfasına gitmeden direkt `/api/contact` POST).

**Mount koşulları:**
- `src/app/[locale]/layout.tsx:215` — sadece **logged-out (anonymous)** kullanıcılarda render edilir. Logged-in panel kullanıcıları dashboard support kanallarını kullanır.
- Component-içi gating (`ContactFloat.tsx:92`) — `auth/*` ve `onboarding` path'lerinde gizli (form akış gürültüsü olur). **Homepage hariç değil** — ana conversion surface'ında baloncuk görünür.

**Bot guard parity:** `/contact` sayfasıyla aynı honeypot + dwell-time gate (`MIN_FILL_MS`).

**Yapma:**
- Homepage'de gizleme — eski exclusion (`current === base`) kullanıcı raporu gereği kaldırıldı. Marketing'in en kritik conversion sayfası, bubble orada görünür kalmalı.
- Logged-in kullanıcılar için ContactFloat mount etme — panel kullanıcılarının kendi support kanalları var, sağ alt widget gürültü.
- Bubble auto-show timing'i (6sn) düşürme — çok agresif, dismiss rate yükselir.

---

## 16. Claude Design Handoff — Referans

`.design/` klasörü Claude Design'dan gelen JSX prototipleri + canvas HTML + chat log içerir (22 dosya, git-tracked: root 3 + `pulse/` 6 + `site/` 13). Pulse marka kimliği (graphite/lime/pure white) + ~38 sayfalık site tasarımı kaynağıdır.

**Kritik kural:** `.design/*.jsx` **doğrudan `src/`'ye kopyalanmaz** — yalnız referans olarak okunur. Pulse token'lar zaten `globals.css` `@theme {}` bloğunda, font'lar `src/app/layout.tsx`'te yüklü, logo `src/components/marketing/BuazeLogo.tsx`. Uygulanan kararlar §11 (renk + typography) + §12 (menü temaları) + §15 (Pulse AI) + §17 (utility class'ları).

**Font drift notu:** `.design-pulse-2026/project/tokens.css` `--font-heading: "Inter Tight"` önerir; uygulama kodu (CLAUDE.md §11 + `globals.css`) bilinçli olarak **Space Grotesk** kullanır. Tasarım bundle'ındaki font değeri reference, **uygulanmaz**.

### `.design-pulse-2026/` ikinci handoff bundle (2026-04-27)

23 dosya, git-tracked. `README.md` + `chats/chat1.md` + `project/` (21 dosya). Önemli içerik:

| Dosya | İçerik | Uygulama §'sı |
|---|---|---|
| `tokens.css` | **Kanonik renk + tipo + radius + shadow + radii** token kaynağı (§23.1) | §23.1 |
| `primitives.jsx` | UI primitive prototipleri (Modal, Tabs, StatCard, ...) — `src/components/ui/`'a 1:1 indirildi | §23.3 |
| `shell.jsx` | Owner + admin shell layout taslağı | §23.5 |
| `admin-and-public.jsx` | Admin dashboard + public review prototipi | §23.7 (Phase 10.1, 11.4) |
| `owner-pages-{1,2,3}.jsx` | Owner panel ekran-ekran spec | §23.7 (Phase 11.5+) |
| `mobile-app.jsx` + `mobile-screens-{1,2}.jsx` + `ios-frame.jsx` | Responsive mobil ekranları (native değil — §25 web-only) | §25 |
| `social-kit.jsx` + `Buaze Social Kit.html` | Sosyal medya görseli kiti (henüz kullanılmıyor) | — |
| `app.jsx` + `canvas-view.jsx` + `data.jsx` + `tweaks-panel.jsx` | Prototype runtime (hash router + canvas) | — (sadece prototip, uygulanmaz) |
| `design-canvas.jsx` + `Buaze Pulse Workspace.html` + `screenshots/01-dashboard.png` | Studio canvas + workspace HTML + ekran görüntüsü referansları | — |
| `chats/chat1.md` | Tasarım iterasyonu transcript'i — niyet kaynağı | tüm Phase logları |

**Kural aynı:** Hiçbir dosya `src/`'ye kopyalanmaz. `tokens.css` token referansı, JSX'ler görsel referans. Native app **yok** — mobil tamamen responsive web (§25).

`design.md` repo kökünde — 15 PR'lık faz log'unu tutar.

### `.design-owner-2026/` üçüncü handoff bundle (2026-05-04)

Claude Design `/v1/design/h/237b0j9_8BAp9h3YZqg08Q` bundle'ı git-tracked olarak eklendi (34 dosya, 612KB). §38.14 ve §38.15'teki tüm owner panel sweep'inin tasarım kaynağı.

| Klasör/Dosya | İçerik | Uygulama §'sı |
|---|---|---|
| `README.md` | "Coding agents read first" + bundle açıklama | — |
| `chats/chat1.md` | Tasarım iterasyonu transcript'i (niyet kaynağı) | §38.14 / §38.15 |
| `project/page-dashboard.jsx` | Dashboard 4 yeni section spec'i (BUGÜN BEKLEYEN, KANAL DAĞILIMI, SIK BAHSEDİLEN, CANLI AKIŞ) | §23.7 Phase 12 (PR #410, #415-#417) |
| `project/page-reviews.jsx` | Yorumlar 3-col layout (filter rail + list + AI Co-Pilot detail) | §23.7 Phase 5 (PR #418), §38.15 composer fix |
| `project/page-google.jsx` | Google Reviews dark hero + PROFİL SAĞLIĞI gauge + SIK GEÇEN KELİMELER | §23.7 Phase 12 (PR #410, #419) |
| `project/page-platforms.jsx` | 12 platform card grid (multi-restaurant aggregate) | DEFER — HIGH 4 (CLAUDE.md §38.14 backlog) |
| `project/page-account.jsx` | 220 nav | 1fr | 320 right rail layout | §23.7 Phase 12 (PR #413) |
| `project/page-analytics.jsx` | KPI sparkline + heatmap + AI insight dark card | (mevcut analytics ile uyumlu, drift küçük) |
| `project/page-customers.jsx` | CRM tablosu — segment / LTV / sentiment kolonları | PR #407, #420 (foundation), Phase 8c (segment) BACKLOG |
| `project/page-system.jsx` | System overview (palet + tipografi + bileşen anatomi) | §11 + §23.3 (zaten kullanılıyor) |
| `project/page-mobile.jsx` + `page-mobile-v2.jsx` | Mobile screen mockup'ları | §25 (responsive web) |
| `project/shell.jsx` | Sidebar collapse + user menu + plan progress + brand mark | §23.7 Phase 12 (PR #410, #411, #414) |
| `project/components/icons.jsx` | Lucide-style icon mapping | §23.4 (mevcut) |
| `project/components/mobile.jsx` | Mobile drawer + bottom bar | §25 (mevcut) |
| `project/components/page-{customers,feedbacks,google,analytics,platforms,account,shell}.jsx` | Component-level prototipler | reference |
| `project/styles/buaze.css` | Token + utility tanımları | §23.1 ile uyumlu |
| `project/tokens.css` | Renk + typography token kaynağı | §23.1 ile uyumlu |
| `project/assets/buaze-logo.svg` | SVG logo (mevcut `BuazeLogo.tsx` ile uyumlu) | §11 |
| `project/Owner Panel Pulse Redesign.html` | Canvas HTML (preview) | — (yalnız prototip) |
| `project/src/app/[locale]/dashboard/...` | Production code'un snapshot kopyaları (Claude Design GitHub'dan import) | reference, **`src/`'ye kopyalanmaz** |

**Kural aynı:** `.design-owner-2026/` da ilk iki bundle gibi `src/`'ye kopyalanmaz. JSX prototipleri ve HTML canvas görsel/spec referans. Token değerleri `tokens.css` ile cross-check edilir.

**Niçin git-tracked**: Sonraki AI session'lar (özellikle CRM segment + LTV + sentiment Phase 8c) bu bundle'ı `page-customers.jsx`'ten okuyabilsin. Local `/tmp/owner-redesign/` lifecycle kısa, kalıcı kayıt için repo'da olmalı.


---

## 17. Pulse Redesign — Kalıcı Çıktılar

Pulse design 15 draft PR'da uygulandı (PR #39 → #53). Tarihsel commit detayları için `git log` + `design.md`. Aşağıda **kalıcı kararlar** — tasarım kararları için §11, menü için §12, Pulse AI için §15.

22 dosya `.design/` altında (JSX prototipleri + canvas HTML + chat log). **Asla `src/`'ye kopyalanmaz** — yalnız referans. Pulse token'lar zaten `globals.css`, font'lar `layout.tsx`'te yüklü.

### Pulse utility class'ları (`src/app/globals.css`)

| Class | Kullanım |
|---|---|
| `.pulse-btn-primary` | Lime CTA (`#C6F24E`, hover `#A8D62E`, active `scale-0.98`) |
| `.pulse-btn-dark` | Graphite CTA (`#0A0A0A`, hover `#1A1A1A`) |
| `.pulse-btn-ghost` | Transparent → graphite border on hover |
| `.pulse-card-hover` | `translateY(-3px)` lift + soft shadow |
| `.pulse-eyebrow` | JetBrains Mono 11px tracking-0.18em uppercase |
| `.pulse-heartbeat` | 1.6s scale 1→1.2→1 — logo accent / live indicator |
| `.animate-slide-in` / `.animate-marquee` / `.bz-float` | Sticky CTA / logo strip / hero badge motion |
| `@keyframes ecgDraw` / `confettiFly` | Footer ECG line / onboarding finish burst |

Tüm motion `prefers-reduced-motion: reduce` altında devre dışı (globals.css blanket).

### Marketing component'leri (`src/components/marketing/`)

`AnimatedCounter`, `MarqueeRow`, `StickyCtaBar`, `SocialProofToast`, `VideoModal`, `WatchDemoButton`, `HomeIndustryTabs`, `NewsletterSignup`, `LiveReviewTicker`, `HomeHeroDashboard`, `BuazeLogo`, `PlatformLogo`. Hepsi client-side; SSR-safe değil.

### Faz log'u

`design.md` — 15 PR zincirinin teknik günlüğü ("Backend açıkları" tablosu dahil). Tarihsel ayrıntı oradan; bu dosyada özetlemiyoruz.


---

## 18. E-posta + Storage Env'leri

> **Kanonik kaynak:** `.env.example` — tüm env'lerin tam listesi orada (build script `node scripts/validate-env.js` ile zorunluları doğrular). Aşağıdaki tablo seçilmiş highlight'tır; çatışma halinde `.env.example` baz alınır.

**Stratejik karar:** Yeni external provider eklenmiyor. Resend (mail) + Supabase Storage (dosya) + OpenAI (Pulse AI) yeterli. POS (Iyzico/Stripe) kasıtlı ertelenmiş — billing read-side canlı, write-side yok.

| Env | Zorunluluk | Etki |
|---|---|---|
| `RESEND_API_KEY` | Opsiyonel | Eksikse `sendResendEmail` `false` döner; mail akışı sessizce kapanır ama gözlemlenebilir log basar |
| `RESEND_FROM_EMAIL` | Opsiyonel | Varsayılan `"Buaze <noreply@buaze.com>"`; domain Resend'de doğrulanmış olmalı |
| `NOTIFICATION_EMAIL` | Opsiyonel | Restoran `notification_email` set değilse default alıcı; ROI/contact/careers fallback |
| `CAREERS_INBOX_EMAIL` | Opsiyonel | HR ayrı kutu; yoksa `NOTIFICATION_EMAIL` fallback |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` | Opsiyonel | Careers attachment + site-settings görselleri; eksikse 503 |
| `CRON_SECRET` | Cron kullanılıyorsa | `/api/cron/*` endpoint'leri `Authorization: Bearer ${CRON_SECRET}` zorunlu |
| `IP_RETENTION_DAYS` | Opsiyonel | Default 90; KVKK IP anonimleştirme cron'u için |
| `IYZICO_*` (POS, henüz yok) | Yok | Wave 3.5'te eklenecek |
| `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, appId) | Opsiyonel | Google Sign-in client config; eksikse OAuth butonu UI'da disable, e-posta+şifre flow intact |
| `FIREBASE_AUTH_PROXY_TARGET` | Opsiyonel | `__/auth/*` path'lerini Firebase'e proxy'ler (`next.config.ts:rewrites`); boşsa rewrite hiç eklenmez |
| `FIREBASE_ADMIN_PROJECT_ID` | Opsiyonel | Server-side Firebase Admin SDK için (token verify) |
| `RECAPTCHA_ENTERPRISE_API_KEY` + `RECAPTCHA_ENTERPRISE_SERVICE_ACCOUNT_JSON` + `RECAPTCHA_ENTERPRISE_PROJECT_ID` | Opsiyonel | reCAPTCHA Enterprise score-based bot guard (`src/lib/recaptcha.ts`); eksikse skor 1.0 varsayılır (geçer), `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` client-side widget için |
| `RECAPTCHA_ENFORCE` | Opsiyonel | `'true'` ise düşük skorlu istek reddedilir; default `'false'` sadece logla — Stripe Radar / Cloudflare Turnstile rollout pattern |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Opsiyonel | Hata izleme (§26). Vercel Sentry Marketplace integration set ederse `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` source-map upload için ek olarak gelir |
| `OPS_EMAIL` | Opsiyonel | Kritik mail send fail'da operatöre uyarı (§21.33); yoksa `NOTIFICATION_EMAIL` fallback, hiçbiri yoksa sessiz log |

Tüm env'ler `.env.example`'da. Vercel production'da yüklü; local dev için manuel kopyalama. Build script `node scripts/validate-env.js` ile zorunlu env'leri doğrular (eksik → exit 1).


---

## 19. Reviews + Reply + Resilience Pattern

Yorum gelen kutusu (admin + owner) — kalıcı kararlar.

### Aksiyon endpoint'leri (hepsi `requireFeedbackAccess` IDOR'lu)

| Endpoint | İşlev | Davranış |
|---|---|---|
| `POST /api/feedback/[id]/reply` | Yanıt yaz | `channel: 'email'` flag'i + `feedback.email` doluysa Resend e-postası gönderilir; aksi halde "dahili kayıt". `FeedbackReply.status` `pending → sent / failed` (Resend response'una göre). `replyTo` = `restaurant.notificationEmail`. |
| `POST /api/feedback/[id]/flag` | Dikkat işaretle (toggle) | `FeedbackFlag` upsert / `DELETE` kaldırır |
| `POST /api/feedback/[id]/assign` | Birine ata | `FeedbackAssignment` upsert; `'self'` sentinel actor'a atar |
| `POST /api/feedback/[id]/suggest-reply` | AI taslak | §15'e bak; rate-limit workspace owner seviyesinde |

### Reply UI davranışı (`/admin/reviews` + `/[locale]/dashboard/feedbacks`)

- E-posta varsa: `☑ Müşteriye e-posta gönder` checkbox (default on) + buton "E-posta ile gönder" (Mail ikonu)
- E-posta yoksa: info satırı "Müşteri e-posta bırakmamış (yüksek puanlılar Google'a yönlendirildiği için bu beklenir)" + buton "Dahili kaydet" (Send ikonu)
- Post-send notice: `sent → lime`, `failed → kırmızı`, `skipped → lime "dahili kaydedildi"`

### Feedback list 3-tier resilience (`GET /api/feedback`)

Schema migration henüz uygulanmamış preview deploy'larında bazı join tabloları (`feedback_replies`, `feedback_flags`, `feedback_assignments`, `feedback_tags`) yoksa list endpoint çökmesin diye:

1. **Tier 1 (happy path):** Tüm join'ler — `flag + assignment + replies + tags`
2. **Tier 2:** Tags hariç tüm join'ler (sadece `FeedbackTag` eksikse `isReplied/isFlagged/isAssigned` korunur)
3. **Tier 3:** Hiç join yok — satırlar yine listelenir, action flag'leri `false`

Response `meta.degraded: { joins, tags } | null` döner. UI amber banner ile "DB sync bekleniyor" notice gösterir. `/api/feedback/counts` aynı pattern'i `replied` sayacında uygular.

### 19.1 Public review surface consent default kuralı (KVKK / GDPR)

`/r/[slug]/page.tsx` form rendering kuralları:

| Onay | Default | Sebep |
|---|---|---|
| **KVKK (`hasKvkkConsent`)** | `useState(true)` | Submit-gate olarak işlev görür; UI `disabled={!kvkk}` ile zaten engelliyor. "Action implies consent" — kullanıcı submit ediyorsa veri işleme rızası verilmiş sayılır. |
| **Marketing (`hasMarketingConsent`)** | **`useState(false)` ZORUNLU** | KVKK Açık Rıza + GDPR Article 7 — pazarlama izni **opt-in** olmalı. Pre-checked iletişim onayı denetimde **ihlal sayılır**, kasten verilmiş onay değil. |

**Yapma:** Marketing default `true` ayarlama. UX trade-off değil, hukuki zorunluluk. PR #121'de yanlışlıkla pre-checked yapıldı, Faz 1 (PR TBD) düzeltti.

**Yap:** Marketing checkbox'a açıklayıcı label + açık link ile "İletişim iznini oku" modal — bilinçli onay görünür olsun.

### 19.1.1 Compliance copy parity (2026-05 audit fix)

`/google-compliance` sayfası "yorumları engellemez, gizlemez, yıldıza göre dallandırma yapmıyoruz" diyordu (Buaze pozisyonu net), ama marketing/onboarding/ROI copy'si **operasyonel gerçeği yansıtmıyordu** — "filter / filtreleme / 10x guarantee / 4★+ redirected" gibi review-gating-implying wording vardı. Audit (2026-05) 4 kritik bölgeyi tespit etti ve PR ile düzeltildi:

| Yer | Eski (riski) | Yeni (parity) |
|---|---|---|
| `/[locale]/roi/page.tsx` meta description | "Düşük puanların %85'i Buaze tarafından **filtrelenir**" | "Düşük puan veren müşteriler önce ekiple özel paylaşım yapabilir; her müşteri istediği yere yorum yazma hakkını korur" |
| `/[locale]/roi/page.tsx` keywords | "Google yorum filtreleme" / "Google review filtering" | "müşteri geri bildirim yönetimi" / "customer feedback management" |
| `/[locale]/roi/page.tsx` FAQ + How-it-works h + body (4 yer) | "Düşük puan filtreleme", "%85'i Google'a **sızmadan**", "leak to Google" | "Şahsi geri bildirim akışı", "ekibe özel iletişimi tercih eder", "private-first option" |
| `/[locale]/roi/page.tsx` trust strip stat | "%85 Düşük yorum filtrelendi" / "Low reviews filtered" | "%85 Şahsi paylaşım tercih oranı" / "Choose private feedback" |
| `/[locale]/onboarding/page.tsx:233-234` platform step subtext | "Müşteriler 4★ ve üstü verirse seçtiğiniz platforma yönlendirilir" / "Customers giving 4★+ are redirected" | "Müşterilerinize bu platformlardaki herkese açık yorum bağlantılarını sunarız. Her müşteri istediği yere yorum yazma hakkını korur..." (rating-based routing language elimine edildi) |
| `/[locale]/solutions/restaurants/page.tsx` (3 yer) | "ilk hafta Google yorumun **10 kat** artsın" / "**multiply 10x** in the first week" | "ilk 90 günde organik Google yorumlarınız ortalama %184 büyüyor (Buaze müşteri kohortu)" — guarantee claim yerine source-attributed cohort metric |

**Yapma:**
- "filter / filtreleme" wording — review platform context'inde Google review-gating tanımına yakın
- Yıldız-bazlı routing'i otomatik karar gibi sun ("4★+ → Google'a yönlendirilir") — müşteri tercihini gizler
- "X kat / Xx multiply" guarantee language — verifiable cohort data ile değiştir veya kaldır
- "leak to Google" / "sızmadan" — selektif erişim implying

**Yap:**
- Müşteri agency vurgusu: "her müşteri istediği yere yorum yazma hakkını korur"
- Tercih (preference) wording: "düşük puan veren müşterilerin %85'i ekibe özel iletişimi tercih eder"
- Source-attributed metrics: "Buaze müşteri kohortunda ilk 90 günde ortalama +%184" (cohort + window + average — guarantee değil)
- Compliance disclosure: "Buaze yorumları engellemez, gizlemez veya manipüle etmez; sadece müşteri tercihiyle yönlendirir"

**Mevcut iyi kullanımlar (template):** `/google-compliance/page.tsx` policy card + `/r/[slug]` low-rating form transparency. Yeni copy yazılırken bunlardan referans al.

### 19.1.2 NAP parity (footer + contact + LocalBusiness)

Google'ın NAP consistency rule'una göre Name + Address + Phone three surface'ta birebir aynı string olmalı: site footer, contact sayfa JSON-LD, LocalBusiness schema. Drift tespit edildi (2026-05) ve bu PR ile düzeltildi:

- **`MarketingFooter.tsx` bottom rail** — yeni `<address>` block (semantic, not-italic, screen reader uyumlu): `Buaze Bilişim A.Ş. · Workinton Maslak, Kat 4 · Maslak / İstanbul · support@buaze.com`. Mobile'da stack, desktop'ta inline dot-separated.
- **`/[locale]/contact/page.tsx` JSON-LD Organization** — email `hello@buaze.com` → `support@buaze.com` (root layout ile parity); address tek satır → 4-field `PostalAddress` (`streetAddress`, `addressLocality`, `addressRegion`, `addressCountry`).

**Yapma:** `hello@`, `info@`, ad-hoc email'ler kullanma (gelecek mailbox provisioning yapılana kadar tek public email `support@buaze.com`). Footer `<address>` string'ini "İSTANBUL" gibi kısa form'la değiştirme — Google PostalAddress field'ları ile aynı detayda olmalı.

**Yap:** LocalBusiness schema PR'ı eklenirken (kullanıcı tam adres + posta kodu paylaşana kadar bekliyor) **aynı string'i** kullan. Geo coords (`40.9923;29.1244` Ataşehir) ile address (Maslak) tutarsızlığı LocalBusiness PR'da tek source of truth ile çözülecek — bu PR sadece Footer + Contact'ı root layout'la uyumlu hale getirdi.

### 19.2 Default redirect platform — orphan default uyarısı

`Restaurant.defaultRedirectPlatform` set edilmiş ama o platformun URL'i (`yemekSepetiUrl` / `getirYemekUrl` / `trendyolYemekUrl` / `googleReviewUrl`) sonradan silinmiş olabilir. Bu durumda public review surface (`/r/[slug]`) sessizce Google'a düşer — owner için **görünmez bug**: ayar tutmuyor sanır.

**Frontend uyarısı** (`DefaultRedirectPicker.tsx`):
- `enabledPlatforms` array'i sadece URL'i dolu platformları içerir (parent `OwnerPlatforms` filtresi).
- `selected` (DB'deki stored default) `enabledPlatforms` içinde değilse → **orphan**.
- Picker'da amber `<AlertTriangle>` + 2-satırlık açıklama + "Varsayılanı temizle" buton render edilir.
- Temizle → `defaultRedirectPlatform: null` PUT → orphan kaybolur, public review Google fallback'a döner (kasıtlı).

**Yapma:** Public review tarafında server-side validation ile kullanıcıyı "URL boş" hatasıyla karşılama; müşteri yine de form gönderebilmeli, owner'ın hatası müşteriyi engellemez. Düzeltme yeri **owner panel**.

**Yap:** Owner panelden URL silindiğinde `defaultRedirectPlatform` değeri otomatik temizlenebilir mi? Backend cleanup hook olmadan bu temizlik gerçekleşmiyor — gelecek scope (kullanıcı isteyince).

### 19.3 Public restaurant lookup edge cache

`GET /api/restaurants?slug=` her `/r/[slug]` page load'unda çağrılıyor — tek müşteri akışı = 1 Postgres hit. Restaurant verisi nadiren değişir (owner ayda birkaç kez platform URL veya default platform günceller); read-heavy public path için Vercel edge cache mantıklı.

**Cache header** (`/api/restaurants/route.ts` slug branch):
```ts
return NextResponse.json(restaurant, {
  headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
});
```

- `s-maxage=60` — Vercel CDN edge'de 60sn fresh, aynı slug için bu süre içinde gelen tüm istekler edge'den döner, DB hit yok.
- `stale-while-revalidate=300` — 60sn dolduktan sonra 5dk daha stale serve edilir, arka planda fresh fetch tetiklenir. Müşteri "yenileme bekleyiş" hissetmez.
- `public` — browser ve CDN cache'leyebilir (response zaten public-safe `select` ile filtrelenmiş, §14.1).

**Etki**: ~1000 review-flow/gün → ~24 Postgres hit (slot başına 1). Vercel function invocation maliyeti de aynı oranda düşer.

**Owner update propagation**: 
- En kötü durum 60 + 300 = 360sn (~6dk) bekleme. Owner panel "Yemeksepeti URL'i değiştirdim ama yorumda hâlâ eskisini görüyorum" hissedebilir.
- 6dk debug penceresi kabul edildi — alternatif Vercel `revalidatePath('/api/restaurants')` PUT/DELETE handler'larına eklemek olur (kullanıcı isteyince yapılır, scope creep önleyici şimdilik beklemekte).
- Kritik debug için cache bypass: `curl -H "Cache-Control: no-cache" ...` veya admin paneli `?_=Date.now()` query param ile.

**Yapma:** `dynamic = 'force-dynamic'` route handler'a ekleme — `Cache-Control` header'ı CDN'e zaten talimat veriyor; framework-level dynamic flag bu cache'i geçersiz kılar.

**Yap:** Yeni public read-heavy endpoint eklerken (örn. `/api/menu/[slug]` benzer akış) aynı pattern'i uygula. Public-write veya auth-gated endpoint'lere cache koyma — IDOR + stale-data riski.

### 19.4 Platform Link Quality Control (2026-05)

Owner panel yorum platformları (Google / Yemeksepeti / Getir / Trendyol / Tripadvisor / Airbnb / Booking / Yandex) + sosyal medya (Instagram / Facebook / WhatsApp / Reservation) URL'leri için **2-katmanlı doğrulama**. Tek source: `src/lib/integration-domains.ts` `checkProviderUrl()`. Settings sekmesi adı **"Platform Bağlantıları" / "Platform Links"** ("Entegrasyonlar" terminolojisi API senkron beklentisi yaratıyordu — Buaze sadece link yönetir).

**Severity & reason matrisi:**

| Severity | Reason | hardBlock | Tetikleyici |
|---|---|---|---|
| `error` | `invalid_url` | true | URL parse fail (`new URL(...)` throws) |
| `error` | `wrong_protocol` | true | `http(s)` değil |
| `error` | `wrong_domain` | true | Hostname provider whitelist dışında |
| `warning` | `generic_homepage` | false | Domain doğru ama path `/` veya locale-only (`/tr`, `/maps`, `/Tourism`, `/searchresults`) |
| `warning` | `not_review_link` | false | Domain doğru ama provider'ın review-signature substring'i yok |
| — (ok) | — | — | Tüm kontroller geçti |

**Path heuristic tablosu** (`PATH_RULES` constant):

| Provider | Locale homepage path'leri | Review signature substring'leri |
|---|---|---|
| google | `/maps`, `/business` | `g.page/r/`, `goo.gl/maps`, `maps.app.goo.gl`, `business.google.com`, `/maps/place/`, `cid=`, `placeid=` |
| yemeksepeti | `/tr`, `/en` | `/restaurant/`, `/menu/` |
| trendyol_go | — | `/restaurant/`, `/yemek/restaurant/` |
| tripadvisor | `/Tourism`, `/Hotels` | `/Restaurant_Review-`, `/Hotel_Review-`, `/Attraction_Review-`, `/ShowUserReviews-` |
| booking | `/searchresults` | `/hotel/` |
| airbnb | — | `/rooms/`, `/h/` |

Diğer 7 provider (yandex, getir, instagram, facebook, whatsapp, website, reservation) için path heuristic **yok** — domain match yeterli. Path-bazlı kontrol "yeterince anlamlı sinyal taşıyan" platformlara sınırlı; abstraction zorlamayalım (CLAUDE.md §7).

**Hard block kuralı:** UI save action sadece `severity === 'error'` durumlarında engellenir. Warning'ler **save'i geçirir** ama amber AlertTriangle satırı kalıcı görünür → owner "ben bilerek koydum, legacy import" dese de yine de hatasını fark eder. Soft warning her zaman dismissible değil — alanı düzeltene kadar görünür.

**Kullanım pattern'i (`BusinessIntegrationSettings.tsx`):**
```ts
const result = checkProviderUrl(provider, url);
if (!result.ok) {
  const message = describeDomainError(provider, result, locale); // i18n
  // result.severity === 'error'   → <Field error={message}> (kırmızı)
  // result.severity === 'warning' → inline amber AlertTriangle satırı
}
```

i18n caller-side: `describeDomainError(provider, result, locale)` ile TR/EN mesaj döner. 5 reason için tam locale parity. Helper'a `severity` field'ı eklenmedi — `result.severity` zaten enum, message string ayrı concern.

**Server-side guard:** `/api/restaurants/[id]/integrations/[provider]/test` endpoint'i `checkProviderUrl` çağırır ama warning'leri **engellemez** — sadece reachability HEAD/GET test'i yapar. Domain mismatch ise zaten 200 + `ok: false` + `error: describeDomainError(...)` döner. Quality kontrolü client-side, test endpoint'i reachability-only.

**Yapma:**
- Yeni dosya `platform-link-quality.ts` açma — mevcut `integration-domains.ts` zaten 2-tier severity döner. ChatGPT-bazlı önerilerde 7-status taksonomi `missing | invalid_url | wrong_domain | generic_homepage | not_direct_review_link | needs_review | valid` görürsen reddet: `missing` UI tarafında `<IntegrationStatusBadge status="not_configured">` ile gösterilir, `valid` = `ok: true`, `needs_review` rezerv kullanılmıyor.
- Warning severity'sini hard block yapma — owner "ben bu URL'in homepage olduğunu biliyorum, müşteri kendi yolunu bulur" diyebilir; kayıt engellemek paternalistik.
- Path heuristic'leri çok sıkı yapma — exotic review URL'i miss etmektense legitimate URL'i kabul et. Heuristic substring match (case-insensitive), regex değil.
- Test endpoint'inde quality warning'i 4xx döndürme — reachability ayrı concern, mevcut response shape `{ ok, statusCode, latencyMs, error?, url }` korunur.

**Yap:**
- Yeni provider eklerken `PROVIDER_DOMAINS` + `PROVIDER_LABELS` (zorunlu) + `PATH_RULES` (opsiyonel) + `src/lib/platform-link-test.ts` `PROVIDER_MAP` (zorunlu — retest endpoint okur) güncelle.
- Caller-side warning satırı için inline `<AlertTriangle size={12}>` + `text-[#92400E]` (Pulse warn token, `bg-[#FFFBEB]/border-[#FDE68A]` AlertBanner kind='warn' ile birebir aynı hue). Ayrı bir UI primitive yapma — şu an sadece bir yerde kullanılıyor.

#### 19.4.1 Persistent test results (Dalga 1, 2026-05)

Owner panel `BusinessIntegrationSettings.tsx` "Test et" butonu artık sonucu DB'ye `PlatformLinkCheck` model'ine yazar. Mount'ta `GET /api/restaurants/[id]/integrations/checks` ile son test sonuçları çekilir → her provider kartında **"Son test: 2 saat önce · HTTP 200 · 340ms"** rozeti görünür. Tek tıkla tüm aktif platformları paralel test eden **"Tümünü yeniden test et"** butonu üstte (rate limit 5/dk/restoran).

**Dosyalar:**
- `prisma/schema.prisma` `PlatformLinkCheck` model — `[restaurantId, provider, checkedAt]` index'li, `@@map("platform_link_checks")`. URL snapshot + ok + statusCode + latencyMs + error + source (`'manual' | 'cron' | 'retest_all'`).
- `src/lib/platform-link-test.ts` — `runPlatformLinkTest({ restaurantId, provider, url, source?, timeoutMs?, persist? })`. Domain check → HEAD → GET fallback → DB persist → result. Hem manuel test endpoint'i hem retest endpoint'i hem de gelecekteki cron (Dalga 2) bunu çağırır. `PROVIDER_MAP` const'ı provider ↔ Restaurant URL/enabled field mapping (test/retest endpoint'leri restoran kaydından URL çekerken bu tablo'dan okur).
- `POST /api/restaurants/[id]/integrations/[provider]/test` — helper'a delegate. Response shape `{ ok, statusCode, latencyMs, error?, url, checkedAt }` (yeni `checkedAt` field).
- `POST /api/restaurants/[id]/integrations/retest` — yeni endpoint, **rate limit 5/dk/restoran**, `Promise.allSettled` paralel test. Response: `{ checked: number, results: [{ provider, ok, statusCode, latencyMs, error?, checkedAt }] }`. `maxDuration: 30`.
- `GET /api/restaurants/[id]/integrations/checks` — yeni endpoint, latest test sonucu provider başına. Tek query (last 200 row) + JS-side reduce (CLAUDE.md §7 — abstraction zorlamayalım, 13 ayrı findFirst yerine tek round-trip).

**UI davranışı:**
- URL alanı değiştirilince o provider'ın `latestChecks[provider]` rozeti gizlenir (stale invalidation; owner kaydedip yeniden test edince fresh rozet gelir).
- "Tümünü retest" + tek-tek test sırasında her ikisi de `disabled={dirty || retestingAll || testing}` — hem tetikleme conflict'i hem de `dirty` save bekleyen state'te yarım sonuç birikmesi engellenir.
- Test endpoint cevabı `setLatestChecks(prev => ({ ...prev, [testProvider]: ... }))` ile aynı state'i overwrite eder — ayrı `testResults` state kaldırıldı (tek source of truth).
- DB write fail (helper içinde `console.error`) UI'ı kırmaz — sonuç yine UI'a döner, sadece "Son test" rozeti mount'ta gözükmez.

**Yapma:**
- Cron retest'i (Dalga 2) bu PR'a sıkıştırma — Vercel cron config + `maxDuration: 300` + `vercel.json` schedule + CRON_SECRET guard ek setup; bağımsız PR.
- `latestChecks[provider]` keyini `urlKey` ile karıştırma — eski `testResults` URL field key'i (`'googleReviewUrl'`) kullanıyordu; yeni state provider key (`'google'`). Provider lookup için `providerForFormKey(key)` helper'ı `BusinessIntegrationSettings` içinde local.
- `PlatformLinkCheck` retention için cron eklemeden günlük büyüme endişesi yapma — manuel test volume'i restoran başına ayda ~5-20 (admin volume = aktif tıklama). Cron eklendiğinde ayda restoran başına ~30 (günlük × 1) olur, hâlâ tolere edilebilir. `take: 200` mount fetch'ini doyurmaz.
- `PROVIDER_MAP` import'unu `integration-domains.ts`'ten yapma — orada sadece `PROVIDER_DOMAINS` + `PROVIDER_LABELS` (URL validation concern); `platform-link-test.ts`'te `PROVIDER_MAP` (Restaurant model field mapping concern). İki concern, iki dosya.

**Yap:**
- Yeni provider eklerken: `PROVIDER_DOMAINS` + `PROVIDER_LABELS` (validation) + `PROVIDER_MAP` (field mapping) + `PATH_RULES` (path heuristic, opsiyonel) + `BusinessIntegrationSettings.PLATFORM_DEFS` (UI listing) güncelle.
- Test endpoint kullanan yeni caller eklerken `runPlatformLinkTest` import et, `source` field'ını yeni bir literal ile geçir (`'manual' | 'cron' | 'retest_all' | <yeni>`). Helper string kabul ediyor — schema değişikliği yok.

#### 19.4.2 Platform Redirect Analytics (Dalga 3a, 2026-05)

Müşteri `/r/[slug]`'da yıldız verip yüksek puanla dış platforma yönlendirildiğinde fire-and-forget olarak `POST /api/platform-redirect` çağrılır → `PlatformRedirectEvent` satırı yazılır. Owner panel "Platform Bağlantıları" sekmesinde **"Platform Yönlendirmeleri"** SettingsCard altında 7d/30d/all toplam + lider platform + provider breakdown progress bar görünür.

**Tasarım kararları (CLAUDE.md §7 + ChatGPT'den 5 sıkılaştırma):**
- **Server-side 302 redirect değil** — client-side `window.location` korunur (mevcut akış intact). Endpoint sadece event log; open-redirect imkansız (target URL request body'de yok, restoran kaydından okunur).
- **`qrCodeId` / `feedbackId` / `campaignId` field'ları yok** — public review surface o anda taşımıyor (`slug + table + platform` yeterli metadata). İhtiyaç çıkarsa migration ile eklenir.
- **`ipHash` yok** — KVKK §13.9 ham IP retention 90 gün zaten Feedback/QrScan tarafında uygulanıyor; hash'lenmiş IP analytics için ek değer katmıyor, attack surface büyütüyor. PlatformRedirectEvent'te IP hiç toplanmaz.
- **`userAgent String? @db.Text`** — bot filter'ı için (gelecek owner segment'i). Helper 500 char trim'liyor.
- **Provider/source whitelist** — `Feedback.platform` + `MenuAnalyticsEvent.sourceType` kelime havuzu ile drift olmayacak şekilde aynı (`google/yemeksepeti/getir/trendyol_go/tripadvisor/airbnb/booking/yandex` × `qr/direct/link/table/delivery`). Whitelist dışındaki provider/source HİÇ kayıt YAZMAZ — silent reject (attack surface).

**Dosyalar:**
- `prisma/schema.prisma` `PlatformRedirectEvent` model — `[restaurantId, provider, createdAt]` + `[restaurantId, createdAt]` index. Restaurant cascade + `@@map("platform_redirect_events")`.
- `src/lib/platform-redirect.ts` — `recordPlatformRedirect({ slug?, restaurantId?, provider, source?, ua? })`. Slug öncelikli resolve, inactive/missing → silent no-op (CLAUDE.md §13.5 fingerprinting önleme paterni). qr-scan helper'ıyla paralel imzala.
- `POST /api/platform-redirect` — public, body `{ slug, provider, source? }`, rate limit 60/dk/IP (qr-scan ile uyumlu — typically scan'den 1-2sn sonra, aynı session). 200 ok + ok flag, redirect YAPMAZ.
- `/r/[slug]/page.tsx` — `triggerHighRedirect` içinde `setRedirecting` öncesi fire-and-forget POST + `keepalive: true` (page unload'da bile gönderilir).
- `GET /api/restaurants/[id]/redirect-stats` — owner-scoped, `?range=7d|30d|all`. Response: `{ range, totals: { last7Days, last30Days }, byProvider, topProvider, windowStart, windowEnd }`. 7d+30d sabit (UI top-stat tile'larına), groupBy range'e göre. IDOR + Promise.all aggregate.
- `src/components/dashboard/settings/sections/PlatformRedirectsPanel.tsx` — yeni Pulse SettingsCard. 3 stat tile (7d / 30d / Top platform) + range toggle (7d/30d/All) + provider breakdown progress bar list. Loader2 spinner, empty state, retry button. `bz-card` + `bz-skeleton` + `<PlatformChip>` + `<Eyebrow>` primitive'leri.
- `restaurants/[id]/settings/page.tsx` — `<SettingsSection id="integrations">` içinde `<BusinessIntegrationSettings>` altına yeni `<PlatformRedirectsPanel>` mount.

**Yapma:**
- Server-side 302 redirect endpoint ekleme — open-redirect saldırı yüzeyi + ek hop (~80ms cold start + Vercel function cost). Client-side `window.location` mevcut akış zaten target URL'i restoran kaydından çekiyor; open-redirect imkansız.
- `feedbackId`/`qrCodeId`/`campaignId` ekleme — şu an taşınan data yok, ileri scope. Eklerken: nullable + migration; mevcut row'lar etkilenmez.
- `ipHash` ekleme — IP analytics ek değer yok (provider+source+UA yeterli). KVKK risk artırıcı.
- Public cache (`Cache-Control: public, s-maxage=...`) `redirect-stats`'a koyma — owner-scoped, IDOR-gated, KVKK kombinasyonu CDN-cache uygun değil.
- `recordPlatformRedirect` içinde provider validation atla — whitelist dışı string DB'ye yazılırsa owner panel groupBy'da "garbage" satırı görür. Silent reject zorunlu.

**Yap:**
- Yeni provider eklerken `VALID_PROVIDERS` set'ini güncelle (`platform-redirect.ts`). Aynı zamanda `integration-domains.ts` `PROVIDER_DOMAINS/LABELS` + `platform-link-test.ts` `PROVIDER_MAP` + `BusinessIntegrationSettings.PLATFORM_DEFS` + `platform-redirect-resolver.ts` `PROVIDER_FIELDS` + `PLATFORM_ID_TO_PROVIDER` (5 nokta — CLAUDE.md §19.4 / §19.4.3 yapma listesinde).
- Yeni source taxonomy değeri eklerken `VALID_SOURCES` (qr-scan ile paylaşılmıyor şu an — CLAUDE.md §7 abstraction yok, 2 yer). 3+ yer olunca ortak modüle çıkarılabilir.

#### 19.4.3 Public review platform resolver (Dalga 3b, 2026-05)

`/r/[slug]` yüksek puan müşterisini hangi platforma yönlendireceğine **saf fonksiyon** karar verir: `src/lib/platform-redirect-resolver.ts` `resolveBestRedirectPlatform({ restaurant, requestedProvider?, latestChecks?, brokenWindowHours?, now? })`. DB çağrısı yok — caller restaurant kaydını + opsiyonel `latestChecks` map'ini geçer; helper deterministik karar verir, URL döndürür. 20 unit test ile kapsanır (`tests/platform-redirect-resolver.test.ts`, CLAUDE.md §32 Node test runner pattern).

**Resolver chain:**

| Sıra | Reason | Tetikleyici |
|---|---|---|
| 1 | `requested` | URL `?platform=` parametresi usable (URL var + enabled + healthy) |
| 2 | `default` | `Restaurant.defaultRedirectPlatform` usable |
| 3 | `sector_priority` | Sector-platforms sırasından (CLAUDE.md §5) ilk usable |
| 4 | `any_active` | Sektör whitelist dışında bile herhangi bir aktif provider |
| 5 | `no_platform` | Hiçbiri yok — `provider: null`, `url: null` |

**Output:** `{ provider, url, reason, fallback }`. `fallback: true` → requested veya default kullanılamadı.

**"Usable" tanımı:**
- URL non-empty + trim
- enabled flag true (yorum platformları için — sosyal/website N/A)
- `latestChecks` map'inde son `brokenWindowHours` (default 24) içinde **ok=false** kayıt yok ("broken-skip"). `latestChecks` boş Map ise broken-skip uygulanmaz — legacy davranış.

**Wave 3b kapsamında**: `latestChecks` boş geçirilir (`/r/[slug]` slug GET'inden gelmiyor). Wave 4'te slug endpoint genişler, latestChecks attached olarak public surface'a inilir → broken-skip otomatik aktif olur. Mevcut akışa kazandırılan tek **görünür değer**: sektör priority (örn. otel + Google place ID boş + Tripadvisor URL dolu → eskisi `null` thanks ekranı, şimdi tripadvisor'a yönlendirilir).

**`/r/[slug]` integration:**
- `RestaurantData` interface'ine 8 enabled flag eklendi (`googleEnabled`, `yemekSepetiEnabled`, vb. — opsiyonel, eski public surface tüketimi etkilenmesin diye).
- `/api/restaurants?slug=` GET endpoint select'ine 8 enabled flag eklendi (CLAUDE.md §14.1 defensive select pattern). **Bonus bug fix**: owner panelden bir platformu toggle off etse de eskiden public surface URL'i kullanmaya devam ediyordu — resolver `enabled: false` provider'ı atlar, owner toggle'ı public flow'a yansır.
- `triggerHighRedirect` içinde `platformUrls + platformParam` lokal değişkenleri silindi → tek `resolveBestRedirectPlatform` çağrısı + `targetPlatformUrl = resolution.url` + `fallbackPlatformId = resolution.provider ?? 'google'`.
- Feedback POST `platform` field'ı artık `resolution.provider` (gerçek yönlendirilen platform) — eskiden `platformParam` legacy 'google' fallback geçiyordu, şimdi semantik düzgün.

**Yapma:**
- Resolver'a DB çağrısı ekleme — saflık testabilite için kritik. `latestChecks` Map'i caller responsibility (slug GET'ten gelir veya boş geçilir).
- Sector priority sırasını resolver içinde hardcode etme — `SECTOR_PLATFORMS` (`src/lib/sector-platforms.ts`) export tek source. Yeni sektör veya platform priority değişikliği orada.
- `latestChecks` Wave 3b'de `/r/[slug]` slug endpoint'inden çekme — Wave 4 scope. Şu an boş Map → broken-skip yapılmaz, legacy davranış korunur. Wave 4'te endpoint genişletilince broken-skip otomatik aktif olur (resolver kontrat değişmez).
- `provider: null` + `url: null` durumunda 'google' default'a fallback ekleme — UI `<PlatformChip id={fallbackPlatformId}>` overlay görselini render eder; `null` durumda overlay zaten gösterilmiyor (`if (targetPlatformUrl)` branch'i atlar).
- ResolveOutput'a yeni field ekleme (örn. `confidence`, `latency`) — saf fonksiyon kontratı; genişletme test backward-compat'ı kırar.

**Yap:**
- Yeni provider eklerken: `RedirectProvider` literal'ına + `PLATFORM_ID_TO_PROVIDER` + `PROVIDER_FIELDS` + (opsiyonel) `SECTOR_PLATFORMS` + helper test case ekle (3+ test gerekir: requested usable, default fallback, sector priority).
- Wave 4 (broken-skip): `/api/restaurants?slug=` GET'i `latestChecks` field'ı ile genişlet (per-provider last 24h check). `/r/[slug]` `Map` construct edip resolver'a geçirsin. Edge cache header (60s/300sw) korunur.

#### 19.4.4 Otomatik retest cron + health API (Dalga 2, 2026-05)

Vercel Cron tarafından günde 1 kez (`0 4 * * *` UTC, owner trafiği etkilemez) `/api/cron/platform-link-retest` çağrılır → aktif restoran/aktif platform kombinasyonlarını paralel test eder → `PlatformLinkCheck` satırlarına `source: 'cron'` yazar. Owner panel "Son test" rozeti otomatik güncellenir; **Wave 4 broken-skip resolver'ı için fresh data** sağlar (cron olmadan latestChecks sadece owner manuel test ettiğinde dolu, çoğu provider'da boş kalır).

**`POST /api/cron/platform-link-retest`** (`runPlatformLinkRetest()` shared helper + `Authorization: Bearer ${CRON_SECRET}` guard):
- BATCH_SIZE = 25 restoran/run (escalable). Şu anki ölçek (10-50 restoran) tek run yeter, ileride `cursor` ile paginate.
- Promise.allSettled paralel (per-row isolation, CLAUDE.md §28.4 bulk pattern).
- Aktif tanımı = retest endpoint'iyle aynı (yorum: enabled+URL, sosyal/website: URL).
- `runPlatformLinkTest({ source: 'cron' })` (Wave 1 helper) — DB write helper içinde, cron orchestrator sadece active filtrele + paralel fan-out.
- `maxDuration: 300` (5 dk worst-case 25 × ~10 platform × 5sn timeout = 250 paralel HEAD/GET).
- Response: `{ restaurantsChecked, linksChecked, successes, failures, durationMs }`.

**`GET /api/restaurants/[id]/integrations/health`** — owner-scoped IDOR endpoint:
- Per-provider `{ url, enabled, latestCheck }` array (13 entry: 8 yorum + 4 sosyal + 1 website).
- `missingRecommended` array — sektör whitelist'inde olup URL'i boş olan provider'lar (örn. food + Yemeksepeti URL boş → "Yemeksepeti link'i ekleyebilirsiniz" recommendation).
- `counts: { active, inactive, untested, healthy, failing }` — UI client-side overview tile'larında kullanılır.
- `sector` — `detectSector(restaurant.category)` çıktısı.
- **`healthScore` field çıkarıldı** — ChatGPT'nin önerdiği fixed score formülü ("yeni provider eklendiğinde formül drift") subjective, doğal metric değil. UI client-side `failing / (active + inactive)` derive eder.

**Vercel Cron config** (`vercel.json` `crons` array'ine):
```json
{ "path": "/api/cron/platform-link-retest", "schedule": "0 4 * * *" }
```

**Maliyet**: günde 1 cron × 25 restoran × ~6-10 aktif platform = ~200-300 outbound HEAD/GET request/gün + 1 Vercel function invocation/gün. Şu anki ölçek için marjinal.

**Yapma:**
- Cron logic'ini `fetch(${appUrl}/api/cron/...)` ile self-fetch yapma (CLAUDE.md §21.13 antipattern). `runPlatformLinkRetest()` shared helper export edilmiş — admin manual trigger ileride eklenirse o helper'ı doğrudan çağırır.
- Cron schedule'ı 12-saatlik veya 6-saatlik yapma — provider'lar bot UA'larını rate-limit'ler; agresif test "broken" false positive yaratabilir. Günde 1 yeter, manuel retest endpoint zaten owner panelde mevcut (Wave 1).
- Health API'ye `healthScore: number` ekleme — formül subjective, drift kaynağı. UI client-side derive.
- Cron response'una individual platform results ekleme — debug için Vercel function logs yeter, response payload size küçük tutulmalı (Vercel cron timeout korkusu yok ama temiz contract).

**Yap:**
- Yeni cron path eklendiğinde: `vercel.json` schedule + helper'da `Authorization: Bearer ${CRON_SECRET}` guard + `maxDuration` explicit set + `Promise.allSettled` per-row isolation (CLAUDE.md §21 cron pattern).
- Health API'ye sektör-spesifik öneri ekleyeceksen `getSectorPlatforms` reuse — `SECTOR_PLATFORMS` (sector-platforms.ts) tek source.

#### 19.4.5 Broken-skip downstream (Dalga 4, 2026-05)

Wave 1-2-3'ü bağlayan son halka. `/api/restaurants?slug=` GET endpoint'i artık son 24 saatlik `PlatformLinkCheck` satırlarından provider başına latest sonucu attach ediyor; `/r/[slug]` bu data'dan `Map<provider, { ok, checkedAt: Date }>` oluşturup `resolveBestRedirectPlatform`'a geçiriyor. **Cron (Wave 2) sayesinde** owner manuel test etmese bile aktif platformlar otomatik kontrol ediliyor → broken-skip her aktif provider için çalışıyor.

**Akış:**
1. Cron (`0 4 * * *` UTC) tüm aktif platform link'lerini test → `PlatformLinkCheck` `source='cron'`.
2. Müşteri `/r/[slug]` açtığında slug GET edge cache'den (60s fresh / 5dk SWR) `latestChecks` field'ı dahil response gelir.
3. `/r/[slug]` Map construct edip resolver'a geçirir.
4. Resolver son 24 saat içinde `ok=false` olan provider'ı **atlar** (Wave 3b unit test'leri "broken-skip 24h içi" kapsamı).
5. Müşteri sağlam platforma yönlendirilir; broken provider'a düşmez.

**Edge cache propagation:** 60s fresh + 300s SWR (CLAUDE.md §19.3 mevcut cache header). En kötü durum 6dk owner gözüyle stale. Cron günde 1, dolayısıyla aynı dakika içinde 2x test sonucu gelmez — cache yeterli.

**Performance:** Slug GET artık 1 ekstra Prisma query (`platformLinkCheck.findMany take: 100 where: {restaurantId, checkedAt: gte 24h}`). `[restaurantId, provider, checkedAt]` index'i kullanılır. Edge cache hit ile DB yükü marjinal.

**Yapma:**
- `latestChecks` payload boyutunu büyütme (max ~800 byte). Geçmiş check'leri burada gönderme — owner panel'in `/checks` endpoint'i ayrı (CLAUDE.md §19.4.1).
- Pre-Wave-2 deploylarda `latestChecks` boş olur — resolver legacy davranışa düşer (broken-skip yapılmaz). Backwards-compat intact.
- `since` window'unu 1h'a indirme — cron 24h aralık, "broken" tespiti için pencere genişliği bu kadar olmalı.
- `select: { provider, ok, checkedAt }` minimal — `error`, `latencyMs`, `statusCode` public surface'a sızdırma (KVKK + payload bloat).

**Yap:**
- Yeni provider eklerken hiç ek iş yok — slug GET `latestChecks` reducer string key kabul eder.
- Cron `take` (BATCH_SIZE=25) artarsa: latestChecks query sınırlı (24h pencere + per-restaurant), yine performant.

### 19.5 Owner Activation Checklist (Phase 11.29, 2026-05)

Yeni restoran sahipleri için 5-step kurulum kontrol listesi. Owner dashboard top'ta `<ActivationChecklistCard />` görünür; 100% complete olduğunda kutlama state + dismiss CTA, dismiss sonrası kart gizli.

**5 step:**

| Step | Compute / tracking |
|---|---|
| `profile` | `restaurant.name` + `category` dolu (compute) |
| `google_link` | `googleReviewUrl` + `googleEnabled` + `checkProviderUrl` hard error değil (compute, warning OK — Phase 11.22 §19.4 disiplini) |
| `qr_downloaded` | `prisma.qrGeneration.count > 0` (compute — mevcut `rememberFeedbackQr` upsert'i kullanılır) |
| `qr_printed_shared` | `RestaurantActivationState.qrPrintedSharedAt` (manuel "Bunu yaptım" / "I did this" buton) |
| `first_feedback` | `prisma.feedback.count > 0` (compute) |

**ChatGPT'den 4 sıkılaştırma:**
- Schema 5 nullable timestamp (id+restaurantId+3) → **2 timestamp** (`qrPrintedSharedAt` + `dismissedAt`). Diğer 3 step compute ediliyor (CLAUDE.md §7).
- `qrDownloadedAt` field çıkarıldı → `QrGeneration` mevcut tablosu reuse, ek storage yok.
- `mark_qr_downloaded` PATCH action çıkarıldı → mevcut `rememberFeedbackQr` zaten kayıt yapıyor.
- "Suggested actions" ayrı kart çıkarıldı → checklist zaten incomplete step + CTA gösteriyor; tek-kart yeterli.

**Dosyalar:**
- `prisma/schema.prisma` `RestaurantActivationState` model — `qrPrintedSharedAt` + `dismissedAt` + auto `createdAt`/`updatedAt`. Restaurant cascade.
- `src/lib/activation.ts` — `computeActivation({ restaurant, state, qrGenerationCount, feedbackCount })` saf fonksiyon. Output: `{ steps[], completedCount, totalCount, percentage, isComplete, dismissedAt }`. Test edilebilir, deterministik.
- `GET /api/restaurants/[id]/activation` — owner-scoped IDOR. Promise.all aggregate (restaurant + state + qrGenerationCount + feedbackCount).
- `PATCH /api/restaurants/[id]/activation` — `{ action }` body: `mark_qr_printed` / `unmark_qr_printed` / `dismiss` / `undismiss`. Upsert + computed result return.
- `<ActivationChecklistCard />` — Pulse `bz-card`, 5-step list (Check / lucide step icon + label + done state + CTA), progress bar (lime), dismiss button (≥1 step complete sonrası), 100% complete success state (PartyPopper + lime tint).
- `/[locale]/dashboard/page.tsx` — owner home `<OnboardingNudge>` altına `<ActivationChecklistCard restaurantId={user.restaurants[0].id} />` mount.

**UI davranış:**
- Loading → skeleton kart (5 satır + progress bar).
- Owner herhangi bir step CTA'sına tıklayınca ilgili sayfaya gider (profile → settings, google → settings#integrations, qr → /qr, feedback → /feedbacks).
- "Bunu yaptım" buton → `mark_qr_printed` PATCH → state güncel.
- Dismiss → `dismissedAt` set → kart gizli (frontend filter).
- 100% complete → success state + dismiss CTA.
- Dismiss izni: `completedCount >= 1` (anlamlı progress kuralı, ChatGPT önerisi).

**Yapma:**
- Permanent "Kurulum / Setup" sidebar item ekleme — ChatGPT'nin de tavsiyesi card-only.
- Suggested Actions ayrı kart yapma — checklist zaten incomplete step + CTA görünür.
- `qrDownloadedAt` field eklemek — `QrGeneration` mevcut, count sorgusu yeter.
- Per-restaurant settings sayfasına eklemek — bu PR'da scope dışı; kullanıcı isterse Wave A'nın takibinde eklenebilir.
- Backend dismiss validation — UI'da `canDismiss` zorlaması yeter; backend tüm dismiss çağrılarını kabul eder (idempotent + IDOR korunuyor).

**Yap:**
- Yeni step eklerken: `ActivationStep` literal'ı + `STEP_META` icon/label + `ctaHref` switch + (gerekirse) `RestaurantActivationState` field + `computeActivation` mantığı. 5 nokta — küçük genişleme.
- Lifecycle email Wave B (sonraki PR): activation result'ı tüketir → "QR not downloaded reminder" sadece `qr_downloaded` step incomplete iken gönder. `LifecycleEmailLog` model + cron + 4 yeni email.

<!-- §20 §4.5 ile birleştirildi (kanonik terminoloji tek bölümde) -->


---

## 21. Pulse Mail System (2026-04 Pulse mail handoff)

Buaze mail katmanı 2026-04 Claude Design "buaze-mail" handoff bundle'ı temel alınarak Pulse design system'ine taşındı. Eski neo-brutalist `SHARED_LAYOUT` (3px border + 6px offset shadow + tek harf "B") tamamen kaldırıldı.

### 21.1 Klasör yapısı

```
src/lib/email/
├── tokens.ts           # PULSE renk paleti + FONTS + Instagram handle
├── escape.ts           # HTML escape (mevcut yardımcı taşındı)
├── layout.ts           # pulseLayout({subject, preheader, content, eyebrow, darkHeader, footer})
├── components.ts       # renderLogo / renderHeader / renderFooter / renderButton / renderEyebrow / renderEcgDivider / renderStarRow / renderStatGrid / renderH1 / renderH2 / renderP / spacer
└── templates/
    ├── forgot-password.ts
    ├── welcome.ts
    ├── form-confirmation.ts   # contact | career | roi | newsletter (tek template)
    ├── low-rating-alert.ts    # rating ≤ 3
    ├── new-review.ts          # rating ≥ 4
    ├── weekly-report.ts
    ├── newsletter.ts          # aylık Pulse bülteni
    ├── customer-reply.ts      # düşük puan müşteriye yanıt
    ├── trial-ending.ts
    └── index.ts               # re-export
```

`src/lib/email.ts` şimdi sadece **Resend HTTP layer** + **public sender'lar**:
- `sendResendEmail` (private), `sendMail` (legacy generic)
- `sendFeedbackNotification` (rating ≤ 3 → low-rating-alert, ≥ 4 → new-review)
- `sendWeeklyDigest`, `sendPasswordResetEmail`
- `sendWelcomeEmail`, `sendFormConfirmationEmail`, `sendCustomerReplyEmail`, `sendTrialEndingEmail`, `sendNewsletterEmail`
- `getUnsubscribeUrl(token)` utility

### 21.2 Mail mobile-first kuralları

Email client'ları (Outlook, Gmail) flex/grid çoğunlukla desteklemez. Tüm template'ler **table-based** + `@media (max-width:600px)` tek breakpoint:

- `<td class="stack-col">` mobile'da `display:block;width:100%` — 2-sütun row'lar dikey stack.
- `<table class="stack-row">` parent — nested grid'lerde de stack davranışı.
- Min font-size **14px** (iOS auto-zoom önleme), buton padding **min 14px 24px** (44px touch target).
- Görseller `style="max-width:100%;height:auto;"` + HTML `width="100%"` attr.
- Hidden preheader: `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">…</div>`.
- Google Fonts `@import` (Outlook fallback Arial/Helvetica), `<!--[if mso]>` MSO conditional.

### 21.3 Newsletter & Marketing cron

Yeni cron: `/api/cron/monthly-newsletter` schedule `0 9 1 * *` (her ayın 1'i 09:00 UTC, `vercel.json`'da tanımlı).

Davranış:
- `unsubscribedAt: null` aboneleri pull eder.
- Locale başına son 3 aktif blog post (`isActive: true`, `orderBy: createdAt desc`).
- Resend rate limit (10/sn) için 120 ms throttle.
- `unsubscribeToken` legacy abonelerde yoksa `crypto.randomBytes(24).toString('hex')` ile backfill edilir.
- Issue numarası deterministik: `(year - 2026) * 12 + (month + 1)`.

Auth: `Bearer ${CRON_SECRET}` (CLAUDE.md §14.1 mevcut env'i kullanılır, yeni env yok).

### 21.4 Newsletter signup → unsubscribe akışı

| Adım | Kod yolu | Davranış |
|---|---|---|
| Signup | `POST /api/newsletter` | Upsert + `unsubscribeToken` üretimi (yeni kayıt) |
| Mail | Aylık cron | `getUnsubscribeUrl(token)` footer'a gömer |
| Unsubscribe | `GET /api/newsletter/unsubscribe?token=...` | `unsubscribedAt = now()` set + Pulse stilinde plain HTML "Aboneliğin sonlandı" sayfası |

Schema: `NewsletterSubscriber.unsubscribeToken String? @unique` (Prisma 6.x, migration deploy akışında uygulanır).

### 21.5 Admin newsletter sayfası (`/admin/newsletters`)

Sadece superadmin. `/admin/customers/page.tsx` pattern'i temel alındı (mobile cards + desktop table):
- 4-sütun summary card grid (mobile 2-col): toplam abone, aktif, iptal, iptal oranı %
- Filtreler: range (7d/30d/90d/all), status (aktif/iptal/all), locale (tr/en/all), source (dinamik distinct), debounced email search
- "Yenile" + "CSV İndir" + "Şimdi gönder" butonları
- "Şimdi gönder" → POST `/api/admin/newsletters/trigger` → internal `Bearer CRON_SECRET` ile cron'a fetch (compose UI kasıtlı yok, scope creep önleme)

Sidebar (`AdminSidebar.tsx`): superadmin section'ında `Mail` ikonu, kanonik label "Bülten Aboneleri" / "Newsletter".

### 21.6 Mevcut akışlardaki entegrasyonlar

Bu rotalar artık Pulse template'lerini kullanır:

| Rota | Template | Tetik |
|---|---|---|
| `POST /api/auth/register` | `welcome` | Hesap oluşturulduktan sonra fire-and-forget |
| `POST /api/contact` | `form-confirmation` (contact) | Kullanıcıya onay (admin maili eski formatta kalır) |
| `POST /api/careers/apply` | `form-confirmation` (career) | Başvuran onayı |
| `POST /api/roi/save` | `form-confirmation` (roi) | ROI hesap onayı |
| `POST /api/feedback/[id]/reply` | `customer-reply` | Düşük puanlı müşteriye yanıt |
| `POST /api/feedback` | `new-review` (≥4★) / `low-rating-alert` (≤3★) | Restoran sahibine bildirim |
| `GET /api/cron/weekly-digest` | `weekly-report` | Haftalık digest |
| `POST /api/auth/forgot-password` | `forgot-password` | Şifre sıfırlama |

### 21.7 Tasarım kaynağı (referans, src/'ye kopyalanmaz)

`/tmp/design-pkg/buaze-mail/` (Claude Design handoff bundle, git-tracked değil, lokal `.design/` analoji). Tüm 9 template + shared.jsx orijinalleri orada. AB-test-result template'i ertelendi (sistem feature'ı yok, eklenirse `/api/admin/abtests/...` ile birlikte gelmesi mantıklı).

### 21.8 Yeni template eklemek

1. `src/lib/email/templates/<name>.ts` — `render<Name>(params, locale): { subject, html, text }` exportu
2. `templates/index.ts` re-export ekle
3. `src/lib/email.ts` içine `send<Name>Email(...)` sender helper
4. Tetikleyici route'u plug et (sender çağırılır)

**Yapma**: `react-email` / `mjml` dep ekleme (CLAUDE.md §7 minimum dependency). Pulse layout helper'ları yeterli.

### 21.8.1 FeedbackReply.source

`FeedbackReply.source String? @default("manual")` — her yanıt 'manual', 'ai_copilot', veya 'template_fallback'. Trial-ending mailindeki "AI yanıt" sayacı bu kolonun `source: 'ai_copilot'` count'ına dayanıyor. Yeni reply UI eklerken (örn. mobile app, third-party kanal):

1. Frontend "Taslak oluştur" / suggest-reply çağrısı yaparsa → `setAiSource('openai' | 'template' | 'template-fallback')`.
2. Reply gönderirken POST `/api/feedback/[id]/reply` body'sine map et:
   - `'openai'` → `'ai_copilot'`
   - `'template'` veya `'template-fallback'` → `'template_fallback'`
   - Hiç AI çağrısı olmamış → `'manual'`
3. Reply gönderildikten sonra `setAiSource(null)` — sonraki manuel reply yanlışlıkla `ai_copilot` etiketlenmesin.

Backend `ALLOWED_SOURCES` set'i geçersiz değerleri sessizce `'manual'`'a düşürür.

### 21.9 Pixel-perfect 1:1 audit (Phase 16.1)

9 template `.design/` JSX prototipleriyle birebir hizalandı:
- **forgot-password**: 2x2 meta grid (Talep saati / IP / Cihaz / Hesap), token URL display + 6-digit code fallback, "Sen değil misin?" lime-soft card with 3px lime-deep left border, status pill ("Aktif · 30 dk geçerli")
- **welcome**: 4-step list with done/current/pending visual states (graphite check / lime current / muted pending), "İlk gün için" 4-card resource grid, secondary "Demo videoyu izle" CTA
- **form-confirmation**: animated check icon (nested limeSoft → lime), timeline visualization (left border + dot markers), 2 side cards (Acil durum + Beklerken)
- **low-rating-alert**: graphite alert bar with warning dot + timestamp, avatar circle (FEF3C7) review card, hashtag chips, Pulse AI dark editor card with tone label + edit/approve buttons, 3-col quick actions grid
- **new-review**: "● Canlı · Az önce geldi" status pill, gradient quote card (limeSoft → pure 2-stop with MSO solid fallback), avatar initials, primary "Teşekkür yaz" + secondary "Google'da paylaş" CTAs
- **weekly-report**: dark hero with 3 deltaed stats, 7-day bar chart (HTML/CSS bars with peak highlight), "Bu haftanın sözleri" 3-quote gallery, side-by-side limeSoft CTA card
- **newsletter**: dark featured article card (tek sütun: okuma süresi + başlık + excerpt + lime CTA), 4-item numbered list, stats band, future teaser, lime-highlight title positioning. **Not (2026-04 düzeltme)**: JSX prototipindeki sağ sütun "Pulse AI demo code block" (`> input.tone / > model.draft / latency: 1.2s`) **kaldırıldı** — statik içerikti, her ay farklı featured post seçildiğinde uyumsuz görünüyordu. Default preheader artık featured post excerpt'inden çekilir, fallback generic.
- **customer-reply**: lime-soft hero with restaurant card (graphite K initial), single-line italicized title, paragraph-bazlı letter body, 3 action items (override edilebilir), graphite coupon card with code + "30 gün" split, 2x2 contact grid (call + maps), italic signature
- **trial-ending**: warning eyebrow, dark usage card with **4-col grid** (yorum / ortalama / AI yanıt / +X% organik artış), 2 plan cards ("Pulse Starter" ₺499 + "Pulse Pro" ₺1.299), **absolute-positioned "ÖNERİLEN" badge** (MSO `<v:rect>`-aware fallback in `renderBadge({ position: 'absolute-tr' })`), "İlk ay %50" eyebrow, secondary "Detaylı karşılaştırma" link

**Yeni helper'lar** (`src/lib/email/components.ts`):
- `renderBadge` — MSO-conditional positioned badge
- `renderTwoColCards` — table-based 50/50 cards stack on mobile
- `renderBarChart` — `<td height="${pct}%">` cells
- `renderAvatarCircle` — circle with initial fallback
- `renderQuoteCard` — review row with avatar + stars + text
- `renderTimeline` — done/current/pending dot+line
- `renderStatusPill` — colored dot + label

**Layout updates** (`src/lib/email/layout.ts`): yeni media queries — `.col-half`, `.grid-4 td.cell`, `.badge-absolute`, `.bar-chart td` → mobilde stack/inline-block.

### 21.10 Source tracking

`NewsletterSubscriber.source` artık her abonede dolu. `<NewsletterSignup>` component opsiyonel `source?: string` prop alır; default `'footer'`. Footer'da explicit `<NewsletterSignup source="footer" />`. Yeni kayıt yolları (popup, blog inline, onboarding) eklenirken farklı source string geç → admin paneldeki `Kaynak` filter dropdown otomatik kategorileri gösterir.

### 21.11 Trial reminder cron

**Yeni**: `/api/cron/trial-reminders` (`vercel.json`'da `0 9 * * *` günlük 09:00 UTC)
- `User.lastTrialReminderAt` field'ı dedup için (20-saat threshold — cron 24-saat aralık güvenliği)
- **Sadece 1 ve 3 gün kalan trial user'lara mail gönderir** (`TRIAL_REMINDER_DAYS = [1, 3]` constant'ı). Spam algısını önlemek için kullanıcı başına trial sürecinde max 2 mail. SQL window 4 güne kadar geniş (yanlışlıkla skip etmeyi önlemek için), ama precise filter cron handler'ında.
- Usage hesabı: ilgili restoran için son 14 gün vs önceki 14 gün (growth %), ortalama puan, yorum sayısı, **Pulse AI ile gönderilen yanıt sayısı** (`prisma.feedbackReply.count({ where: { source: 'ai_copilot', ... } })`).
- Auth: `Bearer ${CRON_SECRET}` (mevcut pattern)
- Sender: `sendTrialEndingEmail` (Pulse `trial-ending` template)
- **Eşikleri değiştirmek**: `TRIAL_REMINDER_DAYS` array'i tek değişiklik noktası. Yeni eşik (örn. 7 gün) eklendiğinde SQL window otomatik genişler.

### 21.12 Cron path listesi (mevcut)

`vercel.json` `crons` array'inde 8 entry. Tek source-of-truth: `vercel.json`. CLAUDE.md tablosu sadece referans amaçlı — `vercel.json` değişirse bu tabloyu da güncelle.

| Path | Schedule | Amaç |
|---|---|---|
| `/api/cron/weekly-digest` | `0 9 * * 1` | Her pazartesi 09:00 UTC — restoran sahibine haftalık özet (Pulse AI çıkarımı dahil — §21.38) |
| `/api/cron/weekly-digest-summary` | `0 10 * * 1` | Her pazartesi 10:00 UTC — hello@buaze.com'a "kim mail aldı" özeti (ops, §21.38) |
| `/api/cron/anonymize-ips` | `0 3 * * 0` | Her pazar 03:00 UTC — KVKK IP retention |
| `/api/cron/monthly-newsletter` | `0 9 1 * *` | Her ayın 1'i 09:00 UTC — Pulse aylık bülten |
| `/api/cron/trial-reminders` | `0 9 * * *` | Her gün 09:00 UTC — trial bitimine 1 ve 3 gün kalanlara hatırlatma |
| `/api/cron/lifecycle-emails` | `0 8 * * *` | Her gün 08:00 UTC — owner lifecycle email akışı (§21.34) |
| `/api/cron/platform-link-retest` | `0 4 * * *` | Her gün 04:00 UTC — aktif platform link'lerinin sağlık kontrolü (§19.4.4) |
| `/api/cron/google-reviews-alert` | `0 * * * *` | Her saat — Google rating impact tracking + threshold uyarı (§37.3) |

### 21.13 Cron logic'i admin panelden tetikleme (anti-pattern: self-fetch)

**Yapma**: `fetch(${appUrl}/api/cron/...)` ile kendi sunucusunu çağırma. Vercel serverless'ta cold start + 10s gateway timeout = 502.

**Yap**: Cron logic'ini ortak helper'a çıkar, hem cron GET handler hem admin trigger doğrudan invoke etsin.

Pattern (mevcut örnek `/api/cron/monthly-newsletter` + `/api/admin/newsletters/trigger`):
```ts
// src/app/api/cron/foo/route.ts
export async function runFoo(): Promise<FooResult> { /* logic */ }
export async function GET(req) {
  // Bearer ${CRON_SECRET} auth
  return NextResponse.json(await runFoo());
}

// src/app/api/admin/foo/trigger/route.ts
import { runFoo } from '@/app/api/cron/foo/route';
export const maxDuration = 60;  // explicit — abone sayısı arttıkça lazım
export async function POST(req) {
  // admin auth
  return NextResponse.json(await runFoo());
}
```

`maxDuration: 60` explicit set — Vercel default 10s, batch send gerektiren işler için yetersiz.

### 21.14 Recharts ResponsiveContainer pattern

**Yapma**: `<div flex flex-col h-[300px]><div flex-1 w-full><ResponsiveContainer width="100%" height="100%">` sandwich. Flexbox child'da `min-height: auto` default → ResponsiveContainer'ın ResizeObserver'ı `width(-1) and height(-1) of chart should be greater than 0` warning'i basıyor.

**Yap**: Fixed-height parent'ın doğrudan child'ı olarak ResponsiveContainer:
```tsx
<div className="h-[260px] sm:h-[320px] md:h-[350px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    {/* chart */}
  </ResponsiveContainer>
</div>
```

Mevcut örnekler: `src/components/admin/TrendsChart.tsx`, `src/components/admin/DayDistributionChart.tsx`.

### 21.15 Mail visual smoke test workflow

**Yerler**:
- `/api/dev/email-preview?template=...&locale=tr|en&format=html|text` — raw HTML / text response. Production'da 404 (Vercel preview dahil).
- `/admin/dev/mail-preview` — superadmin index sayfası, 9 template kart + locale toggle + "Önizle" + "Test mail at" butonları. Sidebar'da yalnız `NODE_ENV !== 'production'` ise görünür.
- `/api/admin/dev/send-test` — superadmin POST endpoint, seed data ile sender'ı çağırır, admin'in kendi e-posta'sına gönderir. Production'da 404. Rate limit: **10 mail / 5 dk / admin** (`mail-test:${adminId}` key'i, `rateLimit()` helper'ı). Misclick veya stuck button'dan korur.

**Seed data**: `src/app/api/dev/email-preview/seeds.ts` — her template için realistic placeholder. Yeni template eklerken bu factory'e seed entry ekle.

**Newsletter compose preview**: `/admin/newsletters/campaigns/{new,[id]}` formundaki "Önizle" butonu preview route'una `title`, `intro`, `postIds` query parametreleri geçer; render aşamasında DB'den o post'lar çekilip seed'in posts array'ini override eder. Bu sayede authored content gerçek post'larla eşleştirilmiş hâlde önizlenir.

**Release checklist** (her major mail değişikliğinden önce):
1. Lokal `npm run dev` → `localhost:3000/admin/dev/mail-preview`
2. 9 template'i 375px (mobile DevTools) ve 1440px (desktop) viewport'ta aç
3. Layout kırılma yok, font ≥ 14px, butonlar tıklanabilir
4. "Test mail at" butonu → kendi adresine gerçek gönderim
5. iPhone Mail / Gmail Web / Gmail iOS / Outlook Web kontrolü
6. Spesifik bakılacaklar: trial-ending "ÖNERİLEN" badge Outlook'ta, newsletter dark featured card 4 client'ta, forgot-password token URL hover/click

### 21.16 NewsletterCampaign

**Schema** (`prisma/schema.prisma` `NewsletterCampaign`):
- `title`, `intro` (override default Pulse copy)
- `postIds: String[]` — BlogPost id array (max 6, en az 1). Phantom id'ler cron'da sessizce skip
- `locale: 'tr' | 'en' | 'both'` — `'both'` aboneye locale'ine göre matching post'lar
- `status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'`
- `scheduledAt` + `sentAt` + `sentCount` + `failedCount`

**Cron precedence** (`runMonthlyNewsletter()` `src/app/api/cron/monthly-newsletter/route.ts`):
1. Explicit `campaignId` (admin "Şimdi gönder" yolu) → ilgili campaign
2. `status: 'scheduled'`, `scheduledAt <= now`, en eski → o campaign
3. Hiç campaign yoksa → fallback "son 3 aktif blog post" (legacy)

Send başlamadan campaign `'sending'`, bitince `'sent'` + `sentAt` + counts. Even partial failure marks campaign `'sent'` — re-fire'dan korur.

**Admin UI** (`/admin/newsletters/campaigns`):
- Liste: `page.tsx` desktop table + mobile cards, status pill, `sentCount/failedCount`, "Yeni kampanya" butonu
- Compose form: `NewsletterCampaignEditor.tsx` (ortak new + edit) — title + intro + locale + post checkbox grid + Taslak/Zamanla/Şimdi gönder mode
- Preview + Test mail butonları (yalnız `NODE_ENV !== 'production'`'da işe yarar)
- `'sent'` ve `'sending'` campaign'lar **immutable** (PATCH 409, DELETE 409)
- Sadece `'draft'` campaign silinebilir

**Sender override**: `sendNewsletterEmail({ title, intro, subject })` — set edildiğinde Pulse default "Sessiz misafiri…" hero'sunu replace eder, lime-highlight styling yerine plain title.

### 21.17 Newsletter source tracking pattern

(taşındı — alttaki §21.20'ye bak)

### 21.18 Vercel preview env'leri

**Mevcut durum (2026-05 doğrulandı)**: Vercel'de **`DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`** Production + Preview + Development scope'larında set. **Yeni preview branch açıldığında ekstra konfigürasyon yok** — `prisma migrate deploy` build script'inde otomatik koşar, schema history uygulanır.

**Mevcut DB topology**: production DB tek paylaşılan Supabase instance (preview deploy'lar da aynı DB'ye yazıyor). Supabase Branching aktif değil (`supabase/` klasörü boş → PR'larda `Supabase Preview` check `skipped` normal).

**Schema değişikliği yaparken** (preview deploy'un prod'u kırmaması için):
- **Yapma**: NOT NULL kolon eklemek → eski koda yazan request fail eder
- **Yapma**: kolonu silmek → eski kod o kolonu okumaya devam eder, fail
- **Yap**: Her yeni kolon **nullable + default'lu**. Pulse mail PR'larında bu disiplin uygulandı (`FeedbackReply.source String? @default("manual")`, `User.lastTrialReminderAt DateTime?`, vb.)

**Preview deploy paranoidliği gerekirse**: Supabase Branching aktif edilebilir (yeni `supabase/migrations/` klasörü + Vercel-Supabase integration ayarı) → her preview kendi izole DB'sini alır, prod etkilenmez. Şu anki ölçek için gereksiz.

### 21.19 GitHub Actions CI

`.github/workflows/ci.yml` her PR'da koşar:
1. `npm ci` (lockfile-strict install)
2. `npx prisma generate` (stub DATABASE_URL ile, gerçek DB'siz)
3. `npx prisma validate` (schema syntax)
4. `npx tsc --noEmit -p tsconfig.json` (zero error)
5. `npx eslint .` (lint, max-warnings flag yok)

**Trigger**: `on.pull_request` (branch filter YOK — stacked PR'lar (base ≠ main) da koşsun, CLAUDE.md §21.22). Push event sadece `main` branch'inde tetiklenir (zaten merge sonrası verifiy için). Eski `branches: [main]` filter PR base'i `claude/*` olunca CI'ı tamamen atlıyordu — düzeltildi.

Concurrency cancel-in-progress: aynı PR'a yeni commit gelince eski run iptal. Workflow ~2-3 dk sürer. Local geliştirici için aynı 4 komutu local'de koşmak yeterli — CI sadece "review öncesi son güvenlik ağı".

`.github/pull_request_template.md` — her yeni PR'a Test plan / Backend etkisi / Risks bölümleri otomatik gelir.

### 21.20 FeedbackReply.source backfill

`scripts/backfill-feedback-reply-source.ts` — eski reply'ları `source = 'manual'` ile dolduran one-shot data migration. Schema migration kolonu ekler ama eski rows NULL kalır. Çalıştırmak (idempotent):

```bash
DATABASE_URL=... npx tsx scripts/backfill-feedback-reply-source.ts
```

Cron `'ai_copilot'` filter'ında zaten NULL'lar yer almıyor → backfill **opsiyonel**. Ama admin reports/analytics `GROUP BY source` sorguları "Unknown" bucket'ı görmek istemiyorsa run et.

### 21.21 Newsletter source tracking pattern

**`NewsletterSubscriber.source`** her abonede dolu olmalı. Yeni signup placement eklendiğinde:

1. Component'e `source` prop pas et (örn. `<NewsletterSignup locale={l} source="popup" />`)
2. `src/lib/newsletter-sources.ts` `NEWSLETTER_SOURCE_LABELS` haritasına eklemeyi unutma — admin UI ham string yerine label gösterir
3. Admin Kaynak filter dropdown'ı dinamik distinct query — yeni source otomatik görünür, label upgrade cosmetic

**Mevcut sources**: `footer`, `popup`, `blog_inline`, `dashboard_invite`, `onboarding`, `roi_form`, `homepage_hero`. Yeni eklemeler için CLAUDE.md'yi güncelle.

**Helper**: `getNewsletterSourceLabel(source, locale)` — admin UI + CSV export'ta tek nokta.

### 21.22 Stacked PR workflow (kanonik)

**Hedef**: Kullanıcı bazen birden fazla PR aynı anda açık tutuyor. Sadece **en son PR'ı** main'e merge ettiğinde tüm önceki PR'ların değişiklikleri de gelmeli — manuel sıralı merge yapmak zorunda kalmamalı.

**Yöntem — Stacked PR pattern**: Yeni branch açarken, eğer önceki feature branch'i hâlâ open PR'sa, **önceki branch'ten branch'le** (main'den değil). Yeni PR'ın base'i de önceki PR'ın head branch'i olur.

```
main
 └─ feature-A  (PR #100, base=main)
     └─ feature-B  (PR #101, base=feature-A)
         └─ feature-C  (PR #102, base=feature-B)
```

**Kullanıcı PR #102'yi main'e merge ettiğinde**:
- GitHub diff: A + B + C tüm commit'leri main'e gelir
- PR #100 ve #101 otomatik `Closed` olarak işaretlenir (içerikleri main'de)
- Status `Merged` değil `Closed` olur — ama kod main'e geçti, fonksiyonel olarak aynı

**Yeni AI/dev session'u feature branch açarken yapması gereken**:

1. Açık PR'ları kontrol et:
   ```bash
   git branch -r --no-merged origin/main | grep claude/
   ```
2. Eğer son commit'lediğin/PR'sı açık olan branch varsa → o branch'ten branch'le:
   ```bash
   git fetch origin <onceki-branch>
   git checkout -b claude/<yeni-feature> origin/<onceki-branch>
   ```
3. Yeni PR açarken `mcp__github__create_pull_request`'te `base: '<onceki-branch>'` (main değil)
4. PR description'da belirt: "Bu PR `<onceki-branch>` üzerine kuruludur. PR #<önceki> main'e merge'lenirse base otomatik main'e güncellenir."

**Eğer önceki PR yoksa veya kullanıcı paralel iş istediğini söylüyorsa** → main'den branch'le, base=main yap (klasik akış).

**Kontrol listesi (yeni feature branch öncesi)**:
- [ ] `git fetch origin main` — main güncel mi?
- [ ] Açık PR var mı? `gh pr list` veya GitHub UI'dan kontrol — yoksa `mcp__github__list_pull_requests`
- [ ] Stacked PR pattern uygulanacak mı? (cevap genelde **evet**, kullanıcı tek-PR-merge konforu istiyor)
- [ ] Branch ismi `claude/<scope>-<short-description>` formatında

**Pulse mail iterasyonlarında uygulanan örnek**:
- PR #68 base=main (`claude/analyze-codebase-dBomf`)
- PR #69 base=`claude/analyze-codebase-dBomf` (`claude/pulse-mail-followups`) — stacked
- PR #70 base=main (`claude/pulse-mail-hardening`) — #69 main'e merge edildikten sonra açıldığı için stack kırıldı, main'den branch'lendi

**Squash merge yan etkisi**: Kullanıcı GitHub UI'da "Squash and merge" seçerse stacked PR'ların commit'leri tek commit'e sıkışır → individual blame info kaybolur. "Create a merge commit" veya "Rebase and merge" history'yi korur. Kullanıcı tercihi.



### 21.23 Mail Deliverability — Spam'e düşmemek için

Pulse mail sistemi 5000+ mail/gün eşiğine yaklaşıldığında bulk sender olarak değerlendirilir. Gmail (Şubat 2024) + Yahoo + Apple Mail spam filter'ları için aşağıdaki kontroller **zorunlu**.

#### Otomatik (kod tarafında halledildi)

| Kontrol | Nerede | Detay |
|---|---|---|
| **`List-Unsubscribe` header** | `sendNewsletterEmail` (`src/lib/email.ts`) | Token-based HTTPS link + `mailto:` fallback. RFC 2369. |
| **`List-Unsubscribe-Post: One-Click`** | Aynı yer | RFC 8058. Gmail/Yahoo bulk sender requirement. |
| **`Precedence: bulk`** header | Aynı yer | Marketing trafik işareti. |
| **POST `/api/newsletter/unsubscribe`** | `src/app/api/newsletter/unsubscribe/route.ts` | RFC 8058 one-click POST endpoint — bad token'da bile 200 (RFC zorunluluğu). |
| **Plain text + HTML** | Tüm sender'lar | Resend `text` + `html` field'larını birlikte alır → tek-format spam tetiği yok. |
| **Default Reply-To** | `defaultReplyTo()` helper | `RESEND_REPLY_TO` veya `NOTIFICATION_EMAIL` env'lerine düşer. Marketing mail'de noreply-only sender Gmail'de risk. |
| **Unsubscribe link HTML body'de** | Newsletter footer | `EmailFooter` Pulse layout. Token-based, idempotent. |
| **`unsubscribedAt: null` filter** | Cron query'leri | İptal edenlere mail göndermez — complaint rate kontrolü. |

#### Kullanıcı tarafında (DNS + Resend dashboard)

Bunlar **kod ile yapılamaz**, Resend hesabında + DNS provider'da set edilmeli:

1. **SPF record** → Resend domain doğrulama yapınca otomatik talimat verir. `TXT @ "v=spf1 include:_spf.resend.com ~all"`. ✓ Resend dashboard'da yeşil tik kontrol et.
2. **DKIM** → Resend otomatik 3 CNAME record verir. ✓ Resend dashboard'da yeşil tik kontrol et.
3. **DMARC** → Manuel olarak ekle, DNS:
   ```
   TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@buaze.com; pct=100"
   ```
   - Başlangıç: `p=none` (sadece raporla, bloke etme)
   - 2 hafta sonra raporlar temizse: `p=quarantine` (şüphelileri spam'e yolla)
   - 1 ay sonra: `p=reject` (sertleştir)
4. **MX record** → buaze.com için aktif olmalı (mailto: ve bounce için). DNS provider'da kontrol et.
5. **`RESEND_REPLY_TO`** Vercel env'inde **set edilmeli** — `hello@buaze.com` veya monitored bir mailbox.
6. **Resend webhook** (opsiyonel ama önerilir): Bounce + Complaint event'lerini DB'ye kaydet, abone listesinden auto-remove. Gelecek scope.

#### Spam testi (deploy sonrası)

1. **mail-tester.com**: `/admin/dev/mail-preview` "Test mail at" butonu ile mail-tester'ın verdiği test adresine gönder → 10/10 puan hedefle. <8 ise raporu oku, eksiği gider.
2. **Gmail Postmaster Tools** (gönderim hacmi >100/gün olunca): https://postmastertools.google.com — domain reputation, IP reputation, spam rate metrikleri.
3. **Sender Score** (https://senderscore.org) — Resend shared IP score'unu görmek için.

#### Spam riski tetikleyen şeyler (yapma)

- ❌ `noreply@` from + Reply-To yok (yapıldı, default fallback eklendi)
- ❌ Subject'te `!!!`, ALL CAPS, "FREE", "$$$" gibi tetik kelimeler
- ❌ Image-only HTML (text yok). Bizim template'ler image + text dengeli ✓
- ❌ Gizli `display:none` text. Bizimki sadece preheader (RFC-uyumlu)
- ❌ URL shortener (bit.ly). Tüm linkler `buaze.com` direct ✓
- ❌ Yüksek bounce rate (>5%). Resend dashboard'da izle, geçersiz adresleri DB'den temizle.
- ❌ Yüksek complaint rate (>0.3% Gmail eşiği). `unsubscribedAt`'i hemen set et + bir daha mail gönderme ✓

#### Audit checklist (her ay)

- [ ] Resend dashboard: SPF + DKIM yeşil tik
- [ ] DMARC report mail'lerini oku (rua adresine düşüyor)
- [ ] Bounce rate < 5%
- [ ] Complaint rate < 0.3%
- [ ] mail-tester.com test mail'i 9+/10
- [ ] Gmail Postmaster: domain reputation "High" veya "Medium"

### 21.24 Favicon / icon asset envanteri

Pulse temalı favicon her bağlamda doğru servis edilsin diye **3 statik dosya** + **layout metadata** birlikte çalışıyor:

**Statik dosyalar** (`public/`):
- `favicon.svg` — ana favicon (lime gradient bg + graphite ECG line + dot accent). Tüm modern tarayıcılar bunu kullanır.
- `apple-touch-icon.svg` — iOS Safari "Add to Home Screen" + pinned tab. 180x180 viewBox.
- `site.webmanifest` — PWA manifest (Android Chrome "Install App"). Background `#FFFFFF`, theme `#0A0A0A`.

**Layout metadata** (`src/app/layout.tsx` + `src/app/[locale]/layout.tsx`):
```ts
icons: {
  icon: [{ url: s.faviconUrl || '/favicon.svg', type: 'image/svg+xml' }],
  shortcut: s.faviconUrl || '/favicon.svg',
  apple: '/apple-touch-icon.svg',
},
manifest: '/site.webmanifest',
```

`s.faviconUrl` — admin paneli `Site Settings`'ten kullanıcı override'ı. Boşsa default `/favicon.svg`.

**Vercel rewrites** (`vercel.json`):
Eski tarayıcı default isteklerini SVG'ye yönlendirir:
- `/favicon.ico` → `/favicon.svg`
- `/favicon.png` → `/favicon.svg`
- `/apple-touch-icon.png` → `/apple-touch-icon.svg`
- `/apple-touch-icon-precomposed.png` → `/apple-touch-icon.svg`
- `/icon-192.png`, `/icon-512.png` → `/apple-touch-icon.svg`

**Eski tarayıcı / third-party cache**:
- Bazı siteler (DMARC dashboard'ları, social embeds) favicon'u kendi cache'lerinden çeker; Buaze tarafında değişiklik yapsan bile o cache 7-30 gün eski olabilir.
- Hızlandırma: ilgili siteye favicon URL'i ile cache invalidation isteği yolla, ya da `?v=2` query string ekle.

**JSON-LD logo URL'leri** (SEO yapısal veri):
- `src/app/[locale]/layout.tsx:131` — Organization schema, `s.logoUrl || ${siteUrl}/favicon.svg`
- `src/app/[locale]/blog/[slug]/page.tsx`, `about/page.tsx` — hardcoded `https://buaze.com/favicon.svg`. Site logo değişirse bu üçü de güncellenmeli.

**OG image** (sosyal paylaşım) ayrı bir dosya: `src/app/opengraph-image.tsx` (1200x630 dynamic OG image). Favicon'dan farklı boyut/görsel kuralları.

### 21.25 Lint baseline & technical debt

`eslint.config.mjs` Pulse mail PR'ları sonrası eklendi (CI workflow ilk koştuğunda 117 error + 94 warning yakaladı). Mevcut borcu warning seviyesinde tutup CI'ı çalışır halde bıraktık:

**Warning seviyesinde** (CI fail değil):
- `@typescript-eslint/no-explicit-any` — 100+ yer (hızlı yazılan API tipleri)
- `@typescript-eslint/no-unused-vars` — 30+ yer (unused import/destructure)
- `react/no-unescaped-entities` — 50+ yer (Türkçe içerik içinde tırnak)
- `react-hooks/exhaustive-deps` — birkaç yer (useEffect dep array)
- `@next/next/no-img-element` — birkaç yer (`<img>` yerine `<Image>` öneri)

**Halen error seviyesinde** (CI fail eder, yeni PR'larda düzeltilmeli):
- TypeScript syntax / type errors (tsc adımında yakalanır)
- Next.js critical patterns (örn. `<a>` yerine `<Link>` zorunluluğu)
- Tüm Next/typescript preset error'ları default kalmış kurallar

**Warning'leri tek tek temizleme stratejisi**:
- Yeni PR'da bir kuralı `'error'`'a çevir → ilgili dosyaları düzelt → CI yeşil olunca commit
- Örn: önce `no-unused-vars` (en az invasive), sonra `no-explicit-any` (saatler sürebilir)
- `npx eslint . --fix` otomatik düzeltebileceği şeyleri (1-2 düzine) hemen kapatır
- `next-env.d.ts` ignored — Next.js auto-generates, manuel düzeltilemez

**CI komut**: `npx eslint .` (max-warnings flag'i yok). Yeni error → fail. Mevcut warning → görünür ama bloke etmez.

**Next 16 hazırlığı**: `next lint` deprecated. ESLint CLI'a geçildi. `next/core-web-vitals` + `next/typescript` preset'leri aynen kalıyor; sadece lint runner değişti.

### 21.26 DB-driven mail content (16 template — Pulse + lifecycle + ROI + verify-email)

> **Sayım** (2026-05-04 audit): `src/lib/email/copy-loader.ts` `SUPPORTED_MAIL_KEYS` 16 template, `scripts/seed-mail-templates.ts` 32 row upsert (16 × 2 locale). Tarihsel olarak Phase 21.26 9 Pulse template ile başladı; 21.27-21.34 phase'leri ile lifecycle (4) + ROI (2) + verify-email (1) eklendi. Yeni template eklerken `SUPPORTED_MAIL_KEYS` + seed + bu sayıyı senkronize tut.

**Schema** (`prisma/schema.prisma` `MailTemplate`):
- `key: String` — `'welcome' | 'newsletter' | 'trial-ending'` (MVP scope)
- `locale: String` — `'tr' | 'en'`
- `content: Json` — flat object: render fonksiyonunun inline `copy = isTr ? {...} : {...}` field'larıyla aynı isimler
- `editable: Boolean @default(true)` — KVKK/legal copy için Phase 2'de field-level lock
- `updatedById: String?` + `updatedAt: DateTime` — audit
- `@@unique([key, locale])` — bir (template, dil) için tek satır

**Helper** (`src/lib/email/copy-loader.ts`):
```ts
loadMailCopy<T>(key, locale, fallback) → Promise<T>
```
- DB'den `mailTemplate.findUnique` → JSON content çeker
- `{...fallback, ...dbContent}` shallow merge → admin sadece istediği field'ı override eder, kalan default kalır
- Process-local cache (60 sn TTL) — `Map<string, CacheEntry>`. Vercel serverless cold start'ta sıfırlanır, kabul edilen drift.
- DB error → fallback (mail kırılmaz). `console.error` ile log düşer.
- `invalidateMailCopyCache(key, locale)` — admin PATCH/DELETE sonrası cache bust

**Render fonksiyonu pattern** (welcome/newsletter/trial-ending):
```ts
export async function renderXxx(params, locale): Promise<{...}> {
  const inlineDefault = isTr ? {...} : {...};
  const copy = await loadMailCopy('xxx', locale, inlineDefault);
  // copy artık DB-merge'lı; render aynen devam
}
```
3 render fonksiyonu artık `async` — sender'lar `await renderXxx(...)` çağırır.

**Admin UI**:
- `/admin/mail-templates` (liste) — 3×2 = 6 kart grid, seeded/not-seeded durumu
- `/admin/mail-templates/[key]/[locale]` (edit form) — `MailTemplateEditor.tsx` schema-bilinçli alan listesi (`FIELDS_BY_TEMPLATE` map'i her template için input + textarea field'ları + hint'ler tanımlar)
- Eylemler: **Önizle** (yeni tab dev preview), **Test mail at** (admin'in kendi e-postasına), **Kaydet** (PATCH), **Varsayılana dön** (DELETE → kod-içi default)
- Sidebar: "Mail İçerikleri" (FileEdit icon, superadmin)

**API**:
- `GET /api/admin/mail-templates` — full grid (seeded/not seeded)
- `GET /api/admin/mail-templates/[key]/[locale]` — tek template content
- `PATCH /api/admin/mail-templates/[key]/[locale]` — content upsert + cache invalidate. Empty string field'lar drop edilir (admin "varsayılana dön" istediği field için).
- `DELETE /api/admin/mail-templates/[key]/[locale]` — full revert + cache invalidate

**Seed** (`scripts/seed-mail-templates.ts`):
```bash
DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts
```
Idempotent. 6 satır upsert. Çağrıldığında **admin-edited content'i override eder** — operator "kod default'larına geri dön" istediğinde çalıştırılır.

**Phase 2 backlog** (yapılmadı, gelecek scope):
- Kalan 6 template DB-driven (forgot-password, form-confirmation, low-rating-alert, new-review, weekly-report, customer-reply)
- Dynamic placeholder injection: `${firstName}`, `${restaurantName}` gibi runtime substitution. Şu an `welcome.titleHi` `Merhaba ${name}.` interpolation render fonksiyonunda yapılıyor; admin override edemez (per-recipient personalization).
- `editable: false` field-level flag + UI read-only (KVKK metinleri için)
- Audit log (`MailTemplateRevision { templateId, content, editedAt, editorId }`)
- Redis-backed cache (multi-instance Vercel'de drift sıfır)

**Faz 1 hardcoded cleanup** (aynı PR):
- Newsletter `stats` array'i → `params.stats?` opsiyonel param. Cron geçirmediği için band gizlenir (eski `+184% / 1.4s` placeholder'ları yok).
- Weekly-report 3. stat hücre (`'1.4s'` response time) kaldırıldı → 3-col → 2-col layout. Backend tracking eklendiğinde tekrar `stats.push({...})` ile geri açılır.
- Customer-reply `defaultActions` (3 sabit Kadıköy hikayesi) silindi. `params.actions` undefined/empty → "Aldığımız aksiyonlar" kart gizlenir.
- Trial-ending fiyat fallback yorumla işaretlendi (Faz 2'de DB-driven olabilir).

### 21.27 Phase 2 — 5 template extension + KVKK field lock

**Genişletilen template'ler** (2026-04 Phase 2): `forgot-password`, `low-rating-alert`, `new-review`, `weekly-report`, `customer-reply`. PR #75 (welcome/newsletter/trial-ending) ile aynı pattern: render fn `async`, sender `await`, `loadMailCopy('xxx', locale, inlineDefault)`. **Form-confirmation** 4-variant yapısı (`contact/career/roi/newsletter`) bu PR'a alınmadı — Phase 3'te nested JSON ile DB-driven yapılacak.

**Field-level lock** (`src/lib/email/locked-fields.ts`):
- KVKK / güvenlik kritik field'lar admin UI'da `disabled` + 🔒 KVKK badge
- API PATCH endpoint server-side `stripLockedFields()` ile drop eder (defence in depth)
- Mevcut locked field'lar:
  - `forgot-password`: `statusText`, `notYouTitle`, `notYouBody`, `notYouLink`
  - `customer-reply`: `sentLine`, `sentSuffix` (Buaze attribution disclosure)

**Editor**: `MailTemplateEditor.tsx` 8 template entry, her field için opsiyonel `locked: true; lockReason: '...'` flag. UI render: `<input disabled>` + kırmızı border + lock icon + reason hint.

**`SUPPORTED_MAIL_KEYS` export** (`src/lib/email/copy-loader.ts`): API route + page validator + editor tek source-of-truth'tan import eder. Yeni template eklerken bu array'i + `MailTemplateKey` union'u + `FIELDS_BY_TEMPLATE` map'i + `TEMPLATE_LABELS` map'i + seed entry'i + (varsa) `LOCKED_MAIL_FIELDS` set'i — bağlantı checklist'i CLAUDE.md §21.26'da.

**Seed**: `npx tsx scripts/seed-mail-templates.ts` artık 16 satır upsert eder (8 template × 2 locale).

**Phase 3 backlog** (yapılmadı):
- form-confirmation DB-driven (nested `{ contact: {...}, career: {...}, roi: {...}, newsletter: {...} }` JSON)
- Dynamic placeholder injection (`${firstName}`, `${restaurantName}` runtime)
- Audit log (`MailTemplateRevision`)
- Redis cache (gerekli değil şimdilik — 60s drift kabul)

### 21.28 Phase 3 — `form-confirmation` 4-variant nested JSON

`form-confirmation` template'i **4 formType variant** taşır (`contact / career / roi / newsletter`); her variant 14 string field içerir. Phase 2'de erteleme sebebi: tek-row düz JSON yapısı 4 variant'ı doğru modelleyemiyordu. Phase 3 çözümü: aynı `MailTemplate.content: Json` schema'sıyla nested JSON.

**DB shape** (per locale row):
```json
{
  "contact":    { "subject": "...", "preheader": "...", ... },
  "career":     { ... },
  "roi":        { ... },
  "newsletter": { ... }
}
```

**Loader** (`src/lib/email/copy-loader.ts`): `loadMailCopy<T>` defansif normalisation iki shape kabul eder — flat `string` (8 template) **veya** plain object of strings (form-confirmation). Array / null / number / nested-deeper yine drop edilir.

**Render** (`src/lib/email/templates/form-confirmation.ts`): Async; iki seviyeli merge:
```ts
const merged = await loadMailCopy('form-confirmation', locale, FORM_COPY);
const variantOverride = merged[formType] ?? {};
const copy = { ...FORM_COPY[formType], ...variantOverride };
```
Admin sadece bir variant'ın bir field'ını override etse, kalan field'lar inline default'tan gelir.

**API endpoint** (`/api/admin/mail-templates/[key]/[locale]`): PATCH validation `parsed.key === 'form-confirmation'` ise top-level değerlere plain object kabul eder, içindeki string'leri trim + drop empty + drop non-string. Diğer 8 template hâlâ flat-only.

**Admin UI**:
- Tek route: `/admin/mail-templates/form-confirmation/[locale]` — `MailTemplateEditor` `templateKey === 'form-confirmation'` branch'inde `<FormConfirmationEditor>` render eder.
- `<FormConfirmationEditor>` 4 variant tab'ı (`İletişim / Kariyer / ROI / Bülten`) + her variant için aynı 14 field listesi.
- State: `Record<FormType, Record<string, string>>` — her tab kendi state'ini tutar; "Kaydet" tüm 4 variant'ı tek PATCH'te gönderir.
- Önizle / Test mail butonları aktif tab'ın variant'ını query string ile preview / send-test endpoint'ine geçirir.

**`<MailFieldInput>`** (`src/components/admin/MailFieldInput.tsx`) — tek input render component; flat editor + variant editor aynı şeyi kullanır (DRY). Locked badge + multiline + hint hepsi tek yerde.

**Liste sayfası**: `TEMPLATE_LABELS` 9 entry, grid otomatik 9 × 2 = 18 kart.

**Seed**: 18 row upsert (16 mevcut + 2 nested form-confirmation).

**Phase 4 backlog** (yapılmadı):
- Dynamic placeholder injection (`${firstName}`, `${restaurantName}` runtime substitution)
- Audit log (`MailTemplateRevision`)
- Redis cache (gerekli olduğunda)
- Per-field validation (max length, format) — şu an sadece trim + non-empty

### 21.29 Phase 4 — Dynamic placeholder injection

Admin CMS'inde editlenen copy field'larında runtime placeholder substitution. Admin "Merhaba ${firstName}." yazınca her mailde gerçek isimle dolar; her şey backward compatible — placeholder'sız field'lar olduğu gibi render olur.

**Helper** (`src/lib/email/placeholders.ts`):
- `MAIL_PLACEHOLDERS: Record<MailTemplateKey, string[]>` — per-template whitelist
- `substitutePlaceholders(text, vars, mode)` — `${key}` → vars[key]; mode='html' HTML-escape (XSS guard), mode='text' plain
- `validatePlaceholders(text, allowed)` — token whitelist check
- `findInvalidPlaceholders(content, allowed)` — flat veya nested (form-confirmation) content içinde ilk geçersiz token'ı bulur
- `deepSubstitute(value, vars, mode)` — recursive walk, string leaf'larda substitute

**Render fn pattern** (9 template'in tümünde):
```ts
const merged = await loadMailCopy('xxx', locale, inlineDefault);
const vars = { firstName: params.firstName || fallback, ... };
const copy = deepSubstitute(merged, vars, 'html');
const copyText = deepSubstitute(merged, vars, 'text');
// HTML body uses `copy.X` (HTML-escaped substitutions)
// Text body uses `copyText.X` (plain substitutions)
```

**Whitelist** (per template):
| Template | Placeholders |
|---|---|
| welcome | `${firstName}` |
| newsletter | `${firstName}` |
| trial-ending | `${firstName}` `${restaurantName}` `${daysLeft}` |
| forgot-password | `${firstName}` |
| low-rating-alert | `${restaurantName}` `${customerName}` `${rating}` `${branch}` |
| new-review | `${restaurantName}` `${customerName}` `${rating}` |
| weekly-report | `${restaurantName}` `${totalReviews}` `${avgRating}` |
| customer-reply | `${customerFirstName}` `${restaurantName}` `${ownerName}` |
| form-confirmation | `${firstName}` |

**API validation** (`PATCH /api/admin/mail-templates/[key]/[locale]`):
- `findInvalidPlaceholders(cleaned, MAIL_PLACEHOLDERS[key])` — typo yakalanır
- 400 response: `{ error: 'invalid_placeholder', field, invalid: [...], allowed: [...] }`
- Editor'lerde user-friendly Turkish error gösterilir

**Editor UI** (`MailFieldInput`):
- `field.placeholders?: readonly string[]` — input altında chip row görünür
- Tıklayınca caret konumuna `${token}` literal eklenir
- Locked field'lar chip göstermez (KVKK lock)
- Editor `FieldDef` schema'sı: yeni alanlar `placeholders: MAIL_PLACEHOLDERS[key]` ile etkinleştirilir

**Yeni placeholder eklemek**:
1. `MAIL_PLACEHOLDERS[key]` array'ine ekle
2. Render fn'inde `vars` object'ine değeri map et
3. (Opsiyonel) Editor `FieldDef.placeholders`'ı güncelle (hint UI için)

**XSS guard**: HTML mode substitution `escapeHtml` kullanır — admin "${customerName}" yazıp customer name `<script>` olsa bile mail'de `&lt;script&gt;` olarak çıkar. Text mode escape yapmaz (text mail saf metin).

**Phase 5+ backlog**:
- Audit log (`MailTemplateRevision`)
- Redis cache (multi-instance drift)
- Per-field validation (max length, format)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)

### 21.30 Phase 5 — Audit log (`MailTemplateRevision`)

Mail template her edit'inde DB'ye snapshot yazılır. KVKK uyumu (kim ne zaman ne değiştirdi) + rollback yeteneği (admin yanlış save etse, önceki sürüme dön).

**Schema** (`prisma/schema.prisma` `MailTemplateRevision`):
```prisma
model MailTemplateRevision {
  id          String        @id @default(cuid())
  templateId  String?       // SetNull on MailTemplate delete (history survives)
  templateKey String        // denormalized for query after delete
  locale      String
  editType    String        // 'created' | 'updated' | 'deleted' | 'reverted'
  content     Json          // snapshot of the new content after edit
  editedById  String?
  createdAt   DateTime
}
```

**Endpoint'ler** (hepsi `prisma.$transaction(async tx => ...)` ile sarılı — audit log canlı row'la asla drift etmez):
- `PATCH /api/admin/mail-templates/[key]/[locale]` — upsert + revision tek transaction. `editType` upsert sonrası `createdAt === updatedAt` check'iyle atomik türetilir (find-then-upsert TOCTOU race kapatıldı).
- `DELETE /api/admin/mail-templates/[key]/[locale]` — delete + 'deleted' revision tek transaction. Order: delete önce → P2025 throw varsa transaction rollback olur, audit drift olmaz. SetNull FK ile audit history survive eder.
- `GET /api/admin/mail-templates/[key]/[locale]/revisions` — last 50 revision, editor username/email join'lü.
- `POST /api/admin/mail-templates/[key]/[locale]/revisions/[id]/revert` — upsert + 'reverted' revision tek transaction; revisionId path mismatch (templateKey/locale farklı) ise 400.

**Soft-prune** (`src/lib/email/revisions.ts` shared helper): PATCH/DELETE/revert hepsinin sonunda çağrılır. Last 50'yi tutar, geri kalanı `deleteMany`. Transaction'ın DIŞINDA — best-effort cleanup, atomically commit gerekmiyor.

**Editor UI**: `<MailRevisionHistory>` slide-over modal. "Geçmiş" butonu açar. Listede her revision için editType badge + tarih + editor + "İçeriği göster" expand + "Bu sürüme dön" buton. Revert sonrası editor state otomatik refresh (reloadKey trigger).

**Locked field defansı**: Revert sırasında `stripLockedFields()` yine çalışır — eski revision KVKK öncesi unlocked field içeriyorsa, revert apply eder ama locked field drop edilir.

**Cross-template guard**: revert endpoint revisionId path'iyle gelirken `templateKey` + `locale` mismatch olursa 400 döner. UI bug ile A template'ini B'ye revert etmeyi engeller.

**Phase 6+ backlog**:
- Diff viewer (revision A vs B side-by-side)
- Per-field history filtering
- Bulk export (KVKK soruşturma için CSV/JSON)
- Redis cache (multi-instance drift)
- Per-field validation (max length, format)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)

### 21.31 Phase 6 — Per-field length validation

Mail template'lerde admin paste-bomb'larını engelleyen length validation. 300 karakterlik subject Gmail spam filter'ını tetikler, 500 karakterlik eyebrow hero layout'u 4 satıra wrap eder. Loose limits — gerçek abuse'u yakalar, küçük overage'larda nag etmez.

**Helper** (`src/lib/email/field-validation.ts`):
- `EXPLICIT: Record<string, FieldValidation>` — per-key override (`subject: 100`, `intro: 1000`, vb.)
- `getValidationByPattern()` — fallback: `*body*` 400, `*eyebrow*` 80, `*cta/link*` 60, default 200
- `validateField(key, value)` — null = valid, structured error = invalid
- `findInvalidField(content)` — flat veya nested (form-confirmation) content içinde ilk geçersiz field

**Limit table**:
| Field grup | Max | Sebep |
|---|---|---|
| `subject` | 100 | Gmail truncate ≥70, spam score ≥100 |
| `preheader` | 200 | Inbox preview |
| `*eyebrow*` | 80 | Single-line layout |
| `title*` | 80 | Hero h1/h2 wrap |
| `titleAccent` | 60 | Vurgu kelime |
| `intro` | 1000 | Body paragraph |
| `*body*` | 400 | Side card body |
| `*cta`/`*link*` | 60 | Button label |
| Other (default) | 200 | Generic chrome |

**API validation** (`PATCH /api/admin/mail-templates/[key]/[locale]`):
- `findInvalidField(cleaned)` placeholder validation'dan sonra
- 400 response: `{ error: 'invalid_field_length', field, reason: 'too_long' | 'too_short', max?, min?, actual }`
- Form-confirmation nested için path `variant.field` formatında

**Editor UI** (`MailFieldInput`):
- Live char counter input altında (sağ-aligned, mono font, 10px)
- Renk: `<%80` neutral gray, `>=80%` amber, `>100%` red
- Locked field counter göstermez

**TR error mapping** (editor `onSave`):
- `too_long`: `"subject" alanı çok uzun: 142 karakter (max 100).`
- `too_short`: `"cta" alanı çok kısa: 2 karakter (min 5).`

**Yeni field eklemek**: `EXPLICIT` dict'e ekle veya pattern-fallback'e güven. Çoğu yeni field name (`*Eyebrow`, `*Cta`) zaten covered.

**Phase 7+ backlog**:
- Diff viewer (revision A vs B)
- Bulk export (CSV/JSON revision history)
- Redis cache (multi-instance drift)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)
- URL field format validation (`http(s)://` zorunluluk)

### 21.32 Phase 7 — Revision diff viewer

Phase 5 audit log'unun debug değerini katlayan field-level diff. Admin "ne değişmiş" görsün — JSON blob squint etmesin. jsdiff dep yok (CLAUDE.md §7 minimum dependency); copy field'ları string-bazlı, char-level diff yerine field-level "subject was X, now Y" daha actionable.

**Helper** (`src/lib/email/revision-diff.ts`):
- `DiffEntry` union: `{ kind: 'added' | 'removed' | 'changed', path, ... }`
- `computeDiff(before, after)` → `{ entries, unchangedCount }`
- Flat + nested (form-confirmation `variant.field` path) destekler
- Sort: `changed` → `added` → `removed`, alfabetik path

**Component** (`src/components/admin/MailRevisionDiff.tsx`):
- `before` + `after` prop (her ikisi `unknown`)
- 3 entry tipi:
  - `changed`: amber badge + `−` (red 50/60 bg) + `+` (emerald 50/60 bg)
  - `added`: emerald card
  - `removed`: red card
- Truncate at 200 char (uzun string'ler için)
- "Bu iki sürüm arasında değişiklik yok (12 alan aynı)" empty state

**Integration** (`MailRevisionHistory`):
- Her revision card'ında "Önceki sürümle farkı göster" buton (GitCompare icon)
- Click → inline expand: bu revision vs bir önceki revision
- Oldest revision için `before = {}` (empty start) → tüm field'lar `added` görünür
- "İçeriği göster" (raw JSON) buton korundu — diff özet, JSON detay

**Phase 8+ backlog**:
- Bulk export (CSV/JSON revision history)
- Redis cache (multi-instance drift)
- Conditional placeholders (`${firstName ?? 'sevgili müşteri'}`)
- URL field format validation
- A/B compare (any two revisions, not just adjacent)

### 21.33 Phase 8 — Operator alert on critical mail failure

Bazı mail akışları zaman-kritik: düşük puan uyarısı restoran sahibine ulaşmazsa şikayet saatlerce yanıtsız kalır. Forgot-password mail bounce ederse kullanıcı hesabına giremez. Sonsuza dek retry edemeyiz, ama ops'a "bu mail gitmedi" diyebiliriz, manuel müdahale etsinler.

**Helper** (`src/lib/email/ops-alert.ts`):
- `notifyOpsOfMailFailure({ template, recipient, reason, metadata })`
- Plain-text mail to `OPS_EMAIL` env (fallback `NOTIFICATION_EMAIL`)
- Subject: `[OPS] Mail send failed: ${template}`
- Body: structured failure context (template, recipient, reason, metadata, ISO timestamp)
- Uses `sendResendEmail` from `email-internal.ts` directly — public sender'lara recurse etmez (Resend outage'ında sonsuz alert loop riski)
- **Rate-limited** 10 alerts / template / 5 dk → outage'da inbox bombalanmaz
- Errors swallowed + console.error — caller'ın kararı zaten `false` dönmüş, üstüne throw atmak request crash eder

**Internal layer** (`src/lib/email-internal.ts`):
- `sendResendEmail` ayrı dosyaya çıkarıldı — ops-alert.ts ↔ email.ts circular dep önleyici
- email.ts public sender'ları artık `from './email-internal'` import eder

**Wired senders** (V1 — kritik HIGH-criticality):
- `sendFeedbackNotification` — düşük puan uyarısı + 5★ yorum (rating ≥4 → 'new-review' template, <4 → 'low-rating-alert')
- `sendPasswordResetEmail` — kullanıcı hesabı locked durumda; ops manuel recovery code issuer
- `sendCustomerReplyEmail` — düşük-puan müşterisi yanıt almadı; müşteri ilişkisi riski

**NOT wired** (V2 backlog):
- `sendWelcomeEmail` — re-trigger admin panelden mümkün
- `sendNewsletterEmail` — bulk; ops bombalanır
- `sendTrialEndingEmail` — daily reminder; tek kaçırma kritik değil
- `sendFormConfirmationEmail` — UX teyit; gitmeyince kullanıcı tekrar dener

**Yeni env**: `OPS_EMAIL` (opsiyonel) — production ops distribution list. Yoksa `NOTIFICATION_EMAIL` fallback. Hiçbiri yoksa alert sessiz kalır + console.error ("no recipient configured").

**Yeni sender'a wire eklerken**:
1. Sender fn'inde `await sendResendEmail(...)` sonucunu yakala (`const ok = await ...`)
2. `if (!ok) { await notifyOpsOfMailFailure({ template, recipient, reason, metadata: { ... } }); }`
3. `return ok` — ops alert async ama caller-blocking değil (sender yine boolean döner)

**Phase 9+ backlog**:
- Retry on transient errors (5xx, network) — exponential backoff [500ms, 1s, 2s]
- DB persistence (`MailDeliveryLog` table) — admin paneli "failed mails" list + manual re-send
- Resend webhook integration → bounce/complaint → auto unsubscribe + ops alert
- Slack webhook alternative (ops mail yerine)

### 21.34 Lifecycle email infrastructure (Phase 11.30, 2026-05)

Cron-driven, idempotent owner lifecycle email'leri. 4 yeni email type — welcome (Phase 21.6) + trial-ending (Phase 21.11) zaten mevcut, bu Wave B onların etrafına context-aware reminder + reactivation katmanı ekler.

**4 yeni email:**

| Type | Trigger | Cooldown | Hedef |
|---|---|---|---|
| `qr_not_downloaded` | account ≥ 1 gün, `QrGeneration.count = 0` | lifetime once | onboarding sonrası QR'a hiç dokunmayan owner |
| `first_feedback_tips` | `QrGeneration.count > 0`, ≥ 2 gün önce indirildi, `Feedback.count = 0` | lifetime once | QR var ama yorum yok — yerleştirme/çağrı tipleri |
| `upgrade_suggestion` | `Feedback.count ≥ 50`, `plan ∈ {trial, starter}` | 30 gün | yüksek hacim + düşük plan = upgrade fırsatı |
| `inactive_reactivation` | `daysSinceLastActivity ≥ 14` (user.updatedAt + last feedback max) | 30 gün | uzun süre login/aktivite yok |

**Dosyalar:**
- `prisma/schema.prisma` `LifecycleEmailLog` model — `userId?` + `restaurantId?` + `type` + `sentAt` + `metadata: Json?`. 2 composite index (`[userId, type, sentAt]` + `[restaurantId, type, sentAt]`).
- `src/lib/email/lifecycle.ts` — `alreadySent({userId?, restaurantId?, type, cooldownDays?})` + `recordSent({userId?, restaurantId?, type, metadata?})`. Cooldown undefined → lifetime (any prior log skips).
- `src/lib/lifecycle-email-rules.ts` — `applyLifecycleRules({user, restaurant, appUrl, now?})` 4 kuralı sırayla check + fail-soft `runRule` helper. `buildLifecycleContexts(userIds, appUrl)` aggregate context inşası (per user × restaurant: qrFirst + qrCount + feedbackCount + lastFeedback).
- `src/lib/email/templates/{qr-not-downloaded,first-feedback-tips,upgrade-suggestion,inactive-reactivation}.ts` — 4 yeni Pulse template (TR/EN inline default + DB-driven `loadMailCopy` + `deepSubstitute` placeholder).
- `src/lib/email.ts` — 4 yeni public sender (`sendQrNotDownloadedEmail`, vb.).
- `src/app/api/cron/lifecycle-emails/route.ts` — `GET` cron (BATCH_SIZE=100, `maxDuration: 300`, `Authorization: Bearer ${CRON_SECRET}` guard). `runLifecycleEmails()` shared helper export'lu (admin manuel trigger ileride). Fail-soft: bir user/rule fırlatırsa diğerleri devam eder.
- `vercel.json` — `0 8 * * *` UTC daily (Türkiye 11:00, sales window).
- `scripts/seed-mail-templates.ts` — 4 yeni template × 2 locale = 8 row, empty content `{}` (admin override etmediği sürece render fn inline default kullanır).
- `src/lib/email/copy-loader.ts` `SUPPORTED_MAIL_KEYS` + `placeholders.ts` `MAIL_PLACEHOLDERS` extension.

**ChatGPT'den 5 sıkılaştırma:**

| Boyut | ChatGPT | Wave B |
|---|---|---|
| Welcome email | yeni eklensin | **Mevcut** (`sendWelcomeEmail` Phase 21.6) — `register` endpoint zaten gönderiyor; cron tekrar göndermez |
| Trial ending email | yeni eklensin | **Mevcut** (`/api/cron/trial-reminders` Phase 21.11) — duplicate cron önleme |
| Lifecycle log payload | rich JSON metadata | **Sade** — `userId?/restaurantId?/type/sentAt`. metadata Json? yer tutucu, şu an kullanılmıyor (geleceğe bırakıldı). |
| Cron schedule | "daily or every 12 hours" | **Günde 1** (`0 8 * * *` UTC) — 24h cooldown güvenliği + sales window saati. |
| Activation entegrasyonu | her email'e geçirilmeli | **Compute zamanında**: `qrGenerationCount` / `feedbackCount` zaten context'te; ayrıca `applyActivation()` çağrısı yapılmıyor (gereksiz hop). |

**Idempotency garantisi:**
- Lifetime cooldown (`qr_not_downloaded` + `first_feedback_tips`) — herhangi bir log varsa skip. Owner durumu değişse bile (örn. QR indirip silse?) mail tekrar gönderilmez.
- 30-gün cooldown (`upgrade_suggestion` + `inactive_reactivation`) — log içinde son `sentAt > now - 30d` ise skip.
- Cron her gün çalışır → idempotent kontrol her döngüde, duplicate yok.

**Maliyet:** Günde ~100 user × 4 rule = 400 condition check; tipik %10-20 hit = 40-80 outbound email/gün. Resend free tier 3000/ay yeter (~30%). Vercel function 1 invocation/gün.

**Yapma:**
- LifecycleEmailLog'a kullanıcı PII ekleme (email, IP) — `userId` referansı yeter.
- Welcome veya trial-ending'i bu cron'a taşıma — mevcut trigger'lar (register endpoint + trial-reminders cron) zaten doğru kullanıcı zamanında çağrılıyor.
- Cron schedule'ı 12-saatlik veya 6-saatlik yapma — 24h cooldown + sales window kuralı bozulur, bilingual user'ları gereksiz yere uyandırır.
- Cron self-fetch antipattern (`fetch(${appUrl}/api/cron/...)`) — `runLifecycleEmails()` shared helper export'lu, admin manuel trigger doğrudan çağırır (CLAUDE.md §21.13).
- LifecycleEmailLog metadata'ya tüm context (rating, feedback list) yazma — çoğu mail post-debug için gereksiz, log büyür.

**Yap:**
- Yeni lifecycle email eklerken: `LifecycleEmailType` literal + `applyLifecycleRules` içine yeni `runRule` çağrısı + sender + template + `SUPPORTED_MAIL_KEYS` + `MAIL_PLACEHOLDERS` + seed entry. 7 nokta. Mevcut 4 email pattern'i kopya.
- Cooldown yeni email için lifetime mı interval mı karar verirken: irreversible aksiyon (welcome onboarding) → lifetime; reversible/recurring bağlam (upgrade öneri, inactive) → 30 gün.

### 21.35 Wave B — Search button audit (Phase 11.30, 2026-05)

Phase 11.27 shell restore sonrası kullanıcı "search button pasif" raporu yaptı. Audit sonucu: shell canonical hâlinde **2 buton aktif** (xl üstü/altı + Cmd+K klavye + CommandPalette mount). Bu Wave B PR'ında ek değişiklik yapılmadı — kullanıcı tekrar rapor ederse spesifik fix Wave C'de yapılır.

### 21.37 Lifecycle email admin trigger UI (Phase 11.31, 2026-05)

Wave 3+ improvement (A) — superadmin paneline elle cron tetikleme + son 50 gönderim log viewer'ı. Cron schedule'dan bağımsız (`0 8 * * *` UTC günlük çalışmaya devam eder), bu UI sadece **debug + monitoring** için.

**Dosyalar:**
- `POST /api/admin/lifecycle-emails/trigger` — superadmin gate, rate limit 5/dk, `maxDuration: 300`. `runLifecycleEmails()` shared helper (CLAUDE.md §21.13) doğrudan çağırır — self-fetch antipattern yok. Cron'la aynı idempotency kuralları (`LifecycleEmailLog` cooldown).
- `GET /api/admin/lifecycle-emails/logs` — superadmin gate. Query: `?type=...&days=7|30|90`. Response: `{ stats: { sent7d, sent30d, byType, total }, logs: [{id, type, sentAt, user, restaurant, metadata}] (last 50), range }`. User + Restaurant FK yok modelde (CLAUDE.md §21.34) — manuel enrich (`Promise.all` + Map lookup, KVKK-safe minimal field select).
- `/admin/dev/lifecycle-emails/page.tsx` — Pulse `bz-card` UI: trigger button (Loader2 spinner + Zap icon) + 4 stat tile (sent 7d/30d/total/byType) + 2 filter dropdown (type / days) + last 50 log table. Trigger sonrası logs otomatik reload — yeni gönderimler görünür.
- `AdminSidebar` — superadmin "Mail" group'una `Yaşam Döngüsü` / `Lifecycle` entry eklendi (mevcut `/admin/dev/mail-preview` pattern ile aynı, NODE_ENV koşullu DEĞİL — production'da da görünür çünkü bu canlı ops gözlem aracı).

**ChatGPT'den 2 sıkılaştırma:**
- Per-user manuel trigger ("X kullanıcı için cron'u zorla çalıştır") **çıkarıldı** — main trigger button + log viewer yeterli, complexity Wave 3+ ileri scope.
- Test mail sender ("admin'in kendi adresine") **çıkarıldı** — mevcut `/admin/dev/mail-preview` zaten bu işlevi yapıyor, duplicate.

**Yapma:**
- Per-user trigger için yeni endpoint açma — `runLifecycleEmails()` BATCH_SIZE=100 user'ı işliyor; tek user için tüm cron'u tetiklemek (idempotency zaten skip eder). Gerçek "test bu user için" gerekirse `/admin/dev/mail-preview` direct render kullan.
- Log viewer'da kullanıcı email'ini diğer admin'lere ifşa etme — şu an admin endpoint sadece superadmin'e açık; ileride manager rol eklenirse `email` hide edilmeli.
- Logs'a metadata content render etme — şu an `metadata: Json?` boş tutulmuş (Phase 11.30 kararı), UI'da sadece `<pre>` ile dump edilir; structured display gerekirse model genişletilmeli.

**Yap:**
- Yeni lifecycle email type eklendiğinde `TYPE_LABEL` (UI) + `VALID_TYPES` (logs endpoint) + `Lifecycle*Email` enum (helper) güncelle. 3 nokta.
- Cron schedule değişimi → bu UI'ı etkilemez; trigger button cron'dan bağımsız çalışır.

### 21.36 Admin sidebar — collapsible groups

Superadmin sidebar'ında 14+ menü item vardı; mail/user/content kategorileri karışıktı. Operatör scroll edip ne ne diye tahmin ediyordu. 3 grupta collapsible accordion ile düzenlendi — her grup tek tıkla açılıp kapanır, aktif route otomatik açılır, expand state localStorage'da korunur.

**Schema** (`src/components/admin/AdminSidebar.tsx`):

```ts
type NavItem = { type: 'item'; href; icon; label; roles };
type NavGroup = {
  type: 'group';
  id: string;
  icon; label; roles;
  children: Array<{ href; icon; label }>;
};
```

**Superadmin grupları**:
| Grup | İçerik |
|---|---|
| **Kullanıcılar** | İşletme Sahipleri · Yöneticiler · Müşteriler |
| **Mail** | Bülten Aboneleri · Bülten Kampanyaları · Mail İçerikleri · (+ Mail Önizleme dev only) |
| **İçerik** | Blog Yönetimi · Duyurular |

Üst seviyedeki tek-tek item'lar (Dashboard, QR, Yorumlar, Analitik, Site Ayarları, Profilim) korundu — her gün kullanılan navigation hızlı erişimde.

**UX davranışı**:
- Group header'a tıkla → expand/collapse
- Aktif route bir grup'un child'ında ise → grup **otomatik açılır** (childActive state)
- Expand state `localStorage['buaze.admin.sidebarGroups']`'a yazılır (key: `Record<groupId, boolean>`)
- ChevronRight (kapalı) → ChevronDown (açık)
- Child item'lar sol border (`border-l border-white/10 pl-3`) ile parent'a görsel olarak bağlı
- Child item active state: lime arka plan, parent group: white/10 bg

**Owner / manager için**: gruplama yok — flat list (5-9 item, kategorize gereksiz).

**Yeni grup eklerken**:
1. Role check'in altına `menuItems.push({ type: 'group', id, icon, label, roles, children })`
2. `id` unique olsun (localStorage key'i için)
3. Mevcut tek-item entry'leri `children` içine taşı
4. Grup adı locale-aware (TR primary, EN fallback)

### 21.38 Weekly digest with Pulse AI inference + ops summary (Phase 11.35, 2026-05)

Pazartesi günleri çalışan iki cron birlikte: 09:00 UTC işletmelere AI-zenginleştirilmiş haftalık rapor + 10:00 UTC `hello@buaze.com`'a kim mail aldı özeti.

**Akış:**
1. `0 9 * * 1` — `/api/cron/weekly-digest` çalışır → her aktif restoran için son 7 günlük stats + 30 yorum metni → `extractWeeklyInsight()` (gpt-4o-mini, ~$0.0002/restoran) → Pulse `weekly-report` template'i içine "PULSE AI ÇIKARIMI" section'ı gömülerek gönderilir.
2. `0 10 * * 1` — `/api/cron/weekly-digest-summary` çalışır → `runWeeklyDigest({ dryRun: true })` ile aynı recipient list'i tekrar derive eder (mail göndermez) → Pulse `weekly-digest-summary` template'i ile `hello@buaze.com`'a (env override `OPS_DIGEST_SUMMARY_EMAIL`) "kim aldı" özeti gönderir.

**Yeni dosyalar:**
- `src/lib/weekly-insight.ts` — `extractWeeklyInsight()` saf helper (gpt-4o-mini + 24h cache + fail-safe fallback). Output: `{ summary, recommendation, source }`. CLAUDE.md §15 `chatCompletion` reuse, `MIN_TOTAL_FOR_AI = 1`, `MAX_COMMENTS_TO_SEND = 30`.
- `src/lib/email/templates/weekly-digest-summary.ts` — ops-internal template (DB-driven copy yok, hardcoded inline; admin override edilemez). Hero counts (sent/skipped/optedOut/failed) + recipient table (restaurant + total + avg + AI badge + status).
- `src/app/api/cron/weekly-digest-summary/route.ts` — cron endpoint, `runWeeklyDigest({ dryRun: true })` çağırır, `OPS_DIGEST_SUMMARY_EMAIL` env yoksa `hello@buaze.com` fallback.

**Genişletilen dosyalar:**
- `src/lib/email/templates/weekly-report.ts` — `WeeklyReportParams.aiInsight?` field eklendi. Render template'i graphite + lime accent dot ile "PULSE AI ÇIKARIMI" section'ı; copy field'ları `aiEyebrow / aiTitle / aiRecommendationLabel` (DB-driven, admin override edilebilir).
- `src/lib/email.ts` — `WeeklyDigestParams` `aiInsight` taşır; yeni `sendWeeklyDigestSummary()` sender.
- `src/app/api/cron/weekly-digest/route.ts` — `runWeeklyDigest()` shared helper'a refactor. `dryRun` parametresi: true → mail göndermez, sadece recipients listesi döner (CLAUDE.md §21.13 self-fetch antipattern bypass). Artık `comment` text'leri de fetch eder (AI bağlamı için, max 30 yorum).

**Idempotency + cost:**
- AI cache key: `${restaurantId}:${ISO-week}` — aynı haftada cron retry'da OpenAI'ya tekrar request gitmez.
- Maliyet: ~$0.0002 × N restoran/hafta = haftalık ~$0.02 (100 restoran). 24h cache ile cron retry yapılırsa cost 0.
- AI key yok / hata → `summary` ve `recommendation` boş string + `source: 'fallback'`. Mail rendering AI section'ı **gizler** (graceful degrade).

**Recipient flow:**
- 10:00 cron `dryRun: true` çalıştığı için `recipient.emailSent` her zaman false döner. Ops summary template'inde anlamlı görünmesi için cron handler bunu `true` override eder ("haftalık raporu hak etti" semantiği).
- Skipped (yorum yok) ve optedOut (bildirim kapalı) restoranları recipient listesine girmez — sadece counts görünür.
- `recipientEmail` ops mail'inde maskelenir (`a***@domain`) — KVKK görselleştirme.

**Yeni env (opsiyonel):**
- `OPS_DIGEST_SUMMARY_EMAIL` — default `hello@buaze.com`. Operator istediği inbox'a yönlendirebilir.

**Yapma:**
- `runWeeklyDigest()` helper'a yeni cron'u **self-fetch** ile bağlama (CLAUDE.md §21.13). Direkt import + helper invoke pattern'i bu PR'da uygulandı.
- AI cache TTL'i 24h'dan kısa yapma — Pazartesi 09:00 + 10:00 + manuel test (admin trigger ileride) → 3 OpenAI çağrısı yerine 1.
- Mail recipients listesini 09:00 cron'da DB'ye log'lama — `WeeklyDigestRun` model gereksiz; `dryRun=true` yeterli pattern (ileride drift yaşarsak tabloya geçilebilir).
- AI bağlamı için 30+ yorum gönderme — token cost lineer, 30 yorum yeterli sample (analytics-themes 80 kullanıyor ama o filter-aware UI flow).

**Yap:**
- Yeni cron eklenirken `runX()` shared helper export et + `Authorization: Bearer ${CRON_SECRET}` guard + `maxDuration: 300` explicit set.
- Yeni AI-driven template eklenirken: per-week cache key (`${id}:${week}`), MIN_THRESHOLD (yetersiz veride API çağrısı yok), JSON parse fail-safe, render template'inde section conditional gizleme (boş AI → section yok).


---

## 22. Yardım Merkezi (Help Center) — İçerik & SEO Sistemi

Buaze yardım merkezi **hybrid** veri kaynağıyla çalışır: Prisma `HelpArticle` tablosu (admin tarafından eklenen makaleler) + `STATIC_HELP_ARTICLES` array (kod içine yazılı evergreen içerik). DB boşsa veya tablo henüz migration deploy görmemiş preview deploy'larında static array fallback olur — yardım sayfası asla çökmez.

### 22.1 Mimari özet

| Katman | Dosya | İçerik |
|---|---|---|
| Veri | `src/lib/help-articles.ts` | Static makale array'i + helper fonksiyonlar (`getStaticHelpArticles`, `getStaticHelpArticle`, `getStaticHelpCategoryCounts`, `getStaticPopularHelpArticles`, `searchStaticHelpArticles`) |
| Taksonomi | `src/lib/help-categories.ts` | 8 kategori (slug, symbol, TR/EN title + desc) |
| Public sayfalar | `src/app/[locale]/help/page.tsx`, `category/[slug]/page.tsx`, `[slug]/page.tsx`, `search/page.tsx` | Pulse: pure white + graphite + lime |
| Public API | `src/app/api/help/articles/route.ts` | `?slug=`, `?category=`, `?search=`, default mode |

**8 kategori**: getting-started, qr-codes, review-management, integrations, team-roles, billing, api-webhook, security-kvkk.

**Sayım**: Her kategoride 6 makale (orderlar 10/20/30/40/50/60), TR+EN = 12 entry/kategori, toplam **96 entry / 48 makale**.

### 22.2 `renderBody` helper inventory

`src/lib/help-articles.ts` içindeki `renderBody()` fonksiyonu makale gövdesini HTML'e dönüştürür. Desteklenen alanlar:

```ts
type BodyInput = {
  lead: string;                    // ilk paragraf, HTML inline emphasis OK
  keyInsight?: string;             // lead-after blockquote (tek vurgu cümlesi)
  sections: BodySection[];         // 3-5 H2 bölümü
  checklist: string[];             // 5-7 madde, eyleme dönük
  faq: { q: string; a: string }[]; // 3-4 SSS
  policyNote?: string;             // Google policy disclaimer (opsiyonel, blockquote)
};

type BodySection = {
  title: string;         // H2
  paragraphs?: string[]; // her biri <p>
  items?: string[];      // <ul><li>
  quote?: string;        // section sonunda blockquote
};
```

**Inline HTML kabul edilenler** (helper string interpolation yapar, dış sanitize yok):
- `<strong>`, `<em>` — vurgu
- `<a href="..." target="_blank" rel="noopener noreferrer">` — internal/external link
- `<code>` — teknik terim (henüz yaygın kullanılmıyor)

**Render sırası**: `lead` → `keyInsight` → `sections` (her birinde quote) → `policyNote` → `Kontrol listesi / Checklist` → `SSS / FAQ`.

**Tailwind prose styling** (`/help/[slug]/page.tsx`): `prose-blockquote:border-l-2 prose-blockquote:border-[#C6F24E]`, `prose-a:decoration-[#C6F24E]`, `prose-headings:text-[#0A0A0A]`. Tüm Pulse token'ları hazır.

### 22.3 Yeni makale ekleme checklist

1. Kategoriyi seç (`src/lib/help-categories.ts` kontrol)
2. Slug seç:
   - Kısa (3-5 kelime), kebab-case
   - TR ve EN aynı slug — locale alanı ayrım yapar
   - Mevcut slug'larla benzersiz
3. `STATIC_HELP_ARTICLES` veya `MORE_ARTICLES` array'inin sonuna **TR + EN** olarak iki entry ekle
4. `order` numarası kategorideki son order + 10 (genelde 60'tan devam)
5. **Yapı tutarlılığı** (yeni makaleler için zorunlu, eski 40 makale retrofit edilebilir):
   - `lead` 30-60 kelime
   - `keyInsight` 1 cümle, lead'i destekler
   - `sections` 3-5 adet, en az 1'inde `quote` veya inline `<strong>`/`<em>`
   - `checklist` 5-7 madde
   - `faq` 3-4 soru-cevap
6. SEO meta:
   - `title` 50-65 karakter
   - `excerpt` 140-160 karakter (meta description)
   - `searchTags` 5-8 düşük çakışmalı keyword
7. Internal linking:
   - İlgili makaleye `<a href="/{locale}/help/{slug}">` ile en az 1 link
   - Locale prefix unutma (TR makalesi `/tr/...`, EN makalesi `/en/...`)

### 22.4 Google policy uyumluluğu

Buaze akışı **review gating yapmaz**: yüksek puan platforma yönlendirilirken düşük puan dahili form'a düşse de, müşteri yine de istediği yere yorum yazma hakkına sahiptir. Akış müşteriyi kandırmaz, zorlamaz veya belirli bir yıldıza yönlendirmez.

**Yasak pattern'ler** (hiçbir makalede önerilmemeli):
- ❌ Sahte yorum üretimi
- ❌ Yıldız zorlama / yıldız öneri
- ❌ Olumlu yorumlara seçici teşvik (örn. "5 yıldız verirsen kupon")
- ❌ Yorum metnini dayatma (taslak vermek farklı, dayatmak farklı)
- ❌ Düşük puanları platforma çıkmaktan engelleme

**Disclaimer pattern**: Review-collection veya Google integration ile ilgili makalelerde `policyNote` field'ı kullanılır. Render edilen HTML şuna benzer:
```html
<blockquote>
  Bu rehberdeki teknikler tarama oranını artırmaya yöneliktir, müşteriyi belirli bir
  yıldız vermeye yönlendirmeye değil. <a href="https://support.google.com/contributionpolicy/"
  target="_blank" rel="noopener noreferrer">Google'ın kullanıcı katkı politikalarına</a>
  aykırı pattern'ler Buaze tarafından desteklenmez.
</blockquote>
```

`policyNote` kullanan makaleler (her zaman TR+EN):
- `qr-scan-rate-optimization` (qr-codes)
- `slack-discord-webhook-routing` (integrations)
- `two-factor-and-session-management` (security-kvkk) — KVKK çerçevesi disclaimer

Yeni makale Google review akışıyla ilgili herhangi bir konuya değiniyorsa `policyNote` eklemeyi düşün.

### 22.5 SEO inventory (mevcut durum)

**Page-level**:
- `<title>` ve `description` her sayfada locale-aware (`generateMetadata`)
- `alternates.canonical` doğru locale URL'i ile set
- `alternates.languages.tr/en` hreflang tag'leri
- `openGraph.type: 'article'` makale sayfasında
- Pulse typography (Space Grotesk h1/h2, Inter body) tüm help sayfalarında

**JSON-LD schema blokları**:
- `/help` (index): `BreadcrumbList`
- `/help/category/[slug]`: `BreadcrumbList` + `ItemList`
- `/help/[slug]`: `Article` (headline, description, datePublished, inLanguage, image, author, publisher) + `BreadcrumbList` (4 seviye)

**Article schema'da** `image` alanı `https://buaze.com/favicon.svg`'dir. İleride per-article OG image üretilirse buraya bağlanır.

### 22.6 Retrofit roadmap (ileride)

Eski 40 makale (orderlar 10/20/30/40/50) `keyInsight` ve section `quote` içermez. `renderBody` opsiyonel olarak ele aldığı için **sorunsuz çalışır**, ama yeni makalelerle tutarlılık için retrofit edilebilir.

**Retrofit önceliği**:
1. **Yüksek**: getting-started + review-management (en çok ziyaret edilen)
2. **Orta**: qr-codes + integrations
3. **Düşük**: api-webhook + security-kvkk (zaten teknik içerik, blockquote daha az gerekli)

Retrofit yaparken:
- `keyInsight` lead'i tekrarlamasın, onu sentez etsin
- Section `quote` her bölümde gerekmez; sadece *en güçlü insight* taşıyan bölüme
- Retrofit aynı PR'da tüm 40 makaleyi kapsamamalı — kategori bazlı parça parça gidilmeli

### 22.7 Pitfall — DB tablosu olmayan preview

Preview deploy'da migration henüz koşmamış olabilir. Help sayfaları `try/catch` ile DB sorgusunu sarar; tablo yoksa static array'e düşer. Bu hibridliği bozmamak için:
- Yeni alan eklenirse static + DB iki tarafı da güncelle (Prisma migration + array entry)
- DB'den gelen makale `image_url` gibi static'e olmayan alan tutarsa, ortak bir typeguard ile ele al

### 22.8 İçerik tonu (Pulse Voice)

CLAUDE.md §11 ses ve ton kuralları yardım merkezi içeriği için de geçerlidir. Özellikle:
- "Olabilir / belki" yerine **doğrudan** ifade
- "Bizim" yerine "ekibinin" — ürün değil operasyon dili
- Aşırı teknik terim yerine **somut iş senaryosu**
- Müşteriye karşı saygılı, yargılayıcı olmayan ton

### 22.9 Translation parity

Her TR makale için EN eşi olmalı (aynı slug, aynı `order`, aynı kategori). Helper'lar locale parametresi alır; tek dilli makale UI'da 404 verir.

Yeni makale yazarken **EN ilk taslak değildir**: TR primary, EN paralel çeviri. Kullanıcı tabanı çoğunlukla TR, ancak EN evergreen SEO için kritik.

**EN çeviri kontrolü**:
- Kültürel referans (örn. "Yemeksepeti") açıklayıcı bağlamla bırakılır, çevrilmez
- Türkçe-spesifik kelime oyunları EN'de düz cümlelere indirgenir
- Linkler `/en/help/...` prefix'i ile

---

## 23. Pulse 2026-04 Panel Redesign — Admin & Business Panel Foundation

Claude Design "buaze" handoff bundle (`.design-pulse-2026/`, 2026-04-27 günü çekildi) admin paneli ve business/restaurant owner paneli için ekran-ekran spec'ler içeriyor. Pulse marka kimliği (graphite/lime/pure white) §11'den birebir korunuyor — yeni system §11 token'larının yanında **panel-scope `bz-*` utility class'ları** ile uygulanıyor.

**Kapsam disiplini:**
- `bz-*` class'ları **sadece** `src/components/admin/**`, `src/app/admin/**`, `src/components/dashboard/**`, `src/app/[locale]/dashboard/**` altında kullanılır
- Marketing surface'leri (landing, blog, help center, auth) hâlâ `pulse-*` class'larını kullanır — değişiklik yok
- Iki sistem **paralel**, ortak palet (#0A0A0A / #C6F24E / #FFFFFF / #EDEDED) — drift riski yok ama yeni panel kodu `bz-*` tercih etmelidir

### 23.1 Token mapping

Mevcut `--color-brand-*` (Tailwind v4 `@theme {}`) ile design'ın `bz-*` token'ları birebir aynı renk değerlerine map olur. **Kanonik kaynak `.design-pulse-2026/project/tokens.css`'tir** — değer çatışırsa tokens.css öncelikli. Aşağıdaki tablo tokens.css değerleriyle hizalı:

**Surfaces / Lines / Text:**

| Design token (`bz-*` CSS var) | Hex | Pulse Tailwind alias |
|---|---|---|
| `--bz-bg` | `#FFFFFF` | `--color-brand-pure` |
| `--bz-bg-soft` | `#FAFAFA` | `--color-brand-n50` |
| `--bz-bg-mute` | `#F5F5F5` | (alias yok) |
| `--bz-bg-dark` | `#0A0A0A` | `--color-brand-graphite` |
| `--bz-bg-dark2` | `#1A1A1A` | `--color-brand-n800` |
| `--bz-line` | `#EDEDED` | `--color-brand-n200` |
| `--bz-line-2` | `#EAEAEA` | (alias yok) |
| `--bz-fg` | `#0A0A0A` | `--color-text-main` |
| `--bz-fg-2` | `#1A1A1A` | (alias yok) |
| `--bz-fg-3` | `#525252` | `--color-text-muted` |
| `--bz-fg-4` | `#737373` | `--color-text-light` |
| `--bz-fg-5` | `#6B7280` | (alias yok) |
| `--bz-fg-mute` | `#A3A3A3` | (alias yok) |

**Lime (signature accent):**

| Token | Hex | Kullanım |
|---|---|---|
| `--bz-lime` | `#C6F24E` | Primary CTA, active state |
| `--bz-lime-dark` | `#A8D62E` | Hover / pressed |
| `--bz-lime-tint` | `#EAF9B8` | Soft tint, badge bg |
| `--bz-lime-tint-30` | `rgba(198,242,78,0.30)` | Overlay / glow |

**Status (Badge primitive `kind` ile eşleşir):**

| Token | Hex | bg | Badge `kind` |
|---|---|---|---|
| `--bz-positive` | `#16A34A` | `#DCFCE7` | `ok` |
| `--bz-warning` | `#D97706` | `#FEF3C7` | `warn` |
| `--bz-danger` | `#DC2626` | `#FEE2E2` | `danger` |
| `--bz-info` | `#2563EB` | `#DBEAFE` | `info` |

**Platform brand (resmi marka renkleri, dokunulmaz):**

| Token | Hex | Platform |
|---|---|---|
| `--plat-google` | `#4285F4` | Google |
| `--plat-yemeksepeti` | `#FA0050` | Yemeksepeti |
| `--plat-getir` | `#5D3EBC` | Getir |
| `--plat-trendyol` | `#F27A1A` | Trendyol GO |
| `--plat-tripadvisor` | `#34E0A1` | Tripadvisor |
| `--plat-foursquare` | `#F94877` | Foursquare |

**Önemli:** CSS variable formunda yeniden tanımlamadık — hex değer doğrudan `bz-*` class içinde kullanılıyor (mevcut `pulse-*` pattern'iyle aynı). Tek-source-of-truth değişikliği gerekirse `globals.css` `bz-*` block'u + `@theme {}` aynı anda güncellenir; tasarım kararı tartışılırsa tokens.css'e bak.

### 23.2 Panel utility class envanteri (`globals.css`)

| Class | Amaç | Kullanım örneği |
|---|---|---|
| `.bz-card` | Beyaz kart + EDEDED border + 16px radius | `<div className="bz-card p-5">` |
| `.bz-card-soft` | FAFAFA bg variant — vurgu kartları | Default redirect picker |
| `.bz-divider` | `border-top: 1px solid #EDEDED` | Liste ayırıcı |
| `.bz-h-tight` / `.bz-h-tight-2` | Space Grotesk + tight tracking heading | `bz-h-tight text-[18px]` |
| `.bz-mono` | JetBrains Mono | `bz-mono` sayı sütunlarda |
| `.bz-wordmark` + `.dot` | "buaze." wordmark, lime nokta | Sidebar logo metni |
| `.bz-btn-primary` | Graphite pill CTA (hover #1A1A1A) | "QR oluştur" |
| `.bz-btn-lime` | Lime CTA (hover #A8D62E) | "Plan yönet" |
| `.bz-btn-ghost` | Outlined neutral pill | "Düzenle" / "Dışa aktar" |
| `.bz-btn-icon` | 32x32 square icon button | Toolbar bell, more |
| `.bz-badge` + `--ok / --off / --warn / --danger / --info / --lime / --ghost` | Status pills with optional dot | `<Badge kind="lime">Default</Badge>` |
| `.bz-input` | Standart form input — lime focus ring | `<input className="bz-input">` |
| `.bz-table` (`+--compact`) | Responsive panel table — uppercase th, hover row tint | List sayfaları |
| `.bz-avatar` | Graphite bg + lime initial chip | Sidebar user, list rows |
| `.bz-skeleton` | Shimmer loader | Loading placeholders |
| `.bz-tabs` + `.bz-tab` | Underline tab strip — `aria-selected` semantik | Feedback inbox tabları |
| `.bz-pulse-dot` | 1.6s pulse ECG dot | "Canlı" indicators |
| `.bz-fade-in` | 320ms fade-up | Modal & screen entrance |
| `.bz-side-item-active` | Sidebar lime active highlight | Active nav link |

Hepsi `prefers-reduced-motion: reduce` altında animasyon devre dışı.

### 23.3 Reusable React primitives (`src/components/ui/`)

| Component | Amaç |
|---|---|
| `Eyebrow` | `pulse-eyebrow` JetBrains Mono uppercase label |
| `Badge` | Tek satır status pill (`kind` prop + dot) |
| `Avatar` | Initial chip (size, color, fg konfigüre) |
| `StatCard` (+ `StatCardSkeleton`) | 4-stat grid kartı: label + value + delta + icon + accent dot |
| `EmptyState` | Empty/zero-result placeholder (icon + title + body + action) |
| `AlertBanner` | Inline alert bar (kind: info/success/warn/danger/lime, opsiyonel onDismiss + icon override) |
| `ErrorState` | Kırmızı border error card + Tekrar dene button |
| `Sparkline` | Inline SVG line chart (recharts'sız — küçük trendler için) |
| `BarChart` | Kompakt SVG bar chart (peak vurgu) |
| `Toggle` | A11y switch (sm/md size) |
| `ProgressBar` | `role="progressbar"` + `aria-valuenow` |
| `Skeleton` (+ `TableSkeleton` + `CardSkeleton`) | Shimmer placeholder primitives |
| `Modal` | Backdrop-blur dialog: ESC handler, body scroll lock, sm:bottom-sheet |
| `Field` | Label + hint + error wrapper |
| `RadioCard` | Büyük tıklanabilir radio (default/platform seçimleri) |
| `Tabs` (+ `TabItem`) | `role="tablist"` + `aria-selected` + Arrow keys keyboard nav |
| `PlatformChip` | Brand chip + label (Google/Yemeksepeti/Getir/Trendyol/Tripadvisor/Foursquare/Custom) |
| `PLATFORMS` | Platform config map (label/short/color/urlHost) |
| `BuazeWordmark` | "buaze." text logo |
| `LegendDot` | Chart legend swatch |
| `StarRow` | 5-star inline display (lucide Star) |
| `PageHeader` | Eyebrow + h1 + description + actions (panel page üstü) |

Barrel: `import { StatCard, Badge, Modal } from '@/components/ui'`.

### 23.3.1 Bulk action floating toolbar (Phase 11.12 + 11.19)

Multi-select + bulk action ihtiyacı olan list page'lerde tutarlı toolbar pattern (Stripe Dashboard inspirasyon):

- `selectedIds: Set<string>` state
- Each row sol başa `shrink-0` checkbox (`e.stopPropagation` row-click'i bloklamasın)
- Header'a select-all checkbox + indeterminate ref
- Filter değişiminde `selectedIds` sıfırla (`useEffect [filterStates]`)
- Selected row'larda `bg-[#EAF9B8]/40` highlight
- Floating toolbar (selection > 0):
  - Container: `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-[#0A0A0A] bg-white shadow inset-x-4 sm:inset-x-auto`
  - Sayım span: `aria-live="polite"` → SR announcement
  - Action button'lar: lime CTA (`border-[#A8D62E] bg-[#EAF9B8]`) + ghost (`border-[#EDEDED]`) + dismiss X
  - `bulkBusy` disabled state during request
- 3.5s auto-dismiss success notice (graphite pill bottom-20)

Mevcut örnekler:
- `/admin/reviews` (PR #268) — feedback flag/unflag/assign
- `/admin/restaurants` (PR #275) — activate/deactivate

Pattern reuse: yeni bulk yüzeyi gerektiren list page'lerde aynı shape kullanılır. 3 yerden fazla tekrar olduğunda `<BulkActionToolbar>` primitive'i çıkarılması düşünülebilir (şu an 2 yerde, abstraction premature).

### 23.3.2 TrialBanner (Phase 11.11)

`src/components/dashboard/TrialBanner.tsx` — owner shell topbar trial countdown banner.

- ≤7d → warn palette (`#FFFBEB/#FDE68A`)
- ≤3d → danger palette (`#FEF2F2/#FECACA`)
- Crown icon + dynamic message ("Bugün son" / "1 gün sonra" / "X gün sonra")
- "Yükselt" CTA → `/pricing` (lime focus ring)
- X dismiss → `localStorage['bz_trial_banner_dismissed_${YYYY-MM-DD}']` → günlük reset (ertesi gün geri gelir)
- SSR-safe (hidden default, `useEffect` mount sonrası dismiss state oku)
- `aria-live="polite"`, `role="status"`, `legal-print-hide`
- `UserDashboardShell` topbar'a mount edilir (announcements üstünde)

Sidebar `Crown` badge ≤5d için kalıcı görünür (banner ek katman).

### 23.4 Icon mapping (`src/components/ui/icons.ts`)

Design `Icon.X` identifier'ları lucide-react adlarına map'lendi (re-export). Yeni icon ihtiyaçında `icons.ts`'ye ekle — aynı zamanda `lucide-react`'tan direkt import edilebilir, ortak yere eklemek opsiyonel ama keşfedilebilirlik için tercih edilir.

Kritik mappings: `Icon.qr`→`QrCode`, `Icon.inbox`→`Inbox`, `Icon.chart`→`BarChart3`, `Icon.utensils`→`UtensilsCrossed`, `Icon.message`→`MessageSquareText`, `Icon.dashboard`→`LayoutDashboard`, `Icon.share`→`Share2`, `Icon.link`→`Link2`.

### 23.5 Sayfa-route mapping (admin + owner)

**Owner / Business Panel** (`src/app/[locale]/dashboard/**`):

| Route | Design page | Mevcut/Yeni |
|---|---|---|
| `/` (dashboard) | OwnerDashboard | Mevcut + OnboardingNudge eklendi (Phase 1.2) |
| `/feedbacks` | OwnerFeedback | Mevcut — sonraki faz görsel polish |
| `/qr` | OwnerQR | Mevcut — sonraki faz |
| `/platforms` | OwnerPlatforms | **Yeni** (Phase 1.2) |
| `/analytics` | OwnerAnalytics | Mevcut |
| `/menu` (hub) | OwnerMenu hub | Mevcut |
| `/restaurants/[id]/menu` | OwnerMenu builder | Mevcut |
| `/restaurants/[id]/menu/analytics` | MenuAnalytics | Mevcut |
| `/leads` | OwnerLeads | Mevcut |
| `/announcements` | (tasarımda yok) | **Yeni** (Phase 1.2) — read-only sistem duyuruları |
| `/guide` | (tasarımda yok) | Mevcut |
| `/profile` | OwnerSettings | Mevcut |
| `/restaurants` (list) | (tasarımda yok) | Mevcut |

**Admin Panel** (`src/app/admin/**`):

| Route | Design page | Mevcut/Yeni |
|---|---|---|
| `/admin/dashboard` | AdminDashboard | Mevcut |
| `/admin/restaurants` | AdminBusinesses | Mevcut |
| `/admin/restaurants/[id]` | Restaurant detail | Mevcut |
| `/admin/reviews` | AdminReviews | Mevcut |
| `/admin/qr` | AdminQR | Mevcut |
| `/admin/members` | Owners list | Mevcut |
| `/admin/users` | Admins list | Mevcut |
| `/admin/customers` | Customers | Mevcut |
| `/admin/blog` (+new + [id]) | AdminBlog | Mevcut |
| `/admin/announcements` | AdminAnnouncements | Mevcut |
| `/admin/plans` | (tasarımda yok) | **Yeni** (Phase 2) — plan dağılımı + plan tier kartları, Iyzico stub |
| `/admin/site-settings` | AdminSiteSettings | Mevcut |
| `/admin/newsletters` (+ campaigns) | (tasarımda yok) | Mevcut |
| `/admin/mail-templates` (+ [key]/[locale]) | (tasarımda yok) | Mevcut |
| `/admin/api` | (tasarımda yok) | Mevcut |
| `/admin/profile` | (tasarımda yok) | Mevcut |
| `/admin/leads` | (tasarımda yok) | Mevcut |
| `/admin/trial-expired` | (tasarımda yok) | Mevcut |
| `/admin/dev/mail-preview` | (tasarımda yok) | Mevcut |

**Public Surface** (panel'den ayrı, ama design'da var):

| Route | Design page | Mevcut/Yeni |
|---|---|---|
| `/r/[slug]` | PublicReview | Mevcut — Phase 10.1'de tam yeniden inşa edildi (dark bg + 3 step card + bz-* primitives) |

### 23.6 Yeni panel sayfası eklerken checklist

1. **Token kullan:** `bz-card`, `bz-btn-primary`, `bz-input`, `bz-table`, `bz-tabs`, `bz-badge`, `bz-avatar`, `bz-skeleton`. Inline hex sadece bunlar yetmediğinde.
2. **Primitive'lerden compose et:** `import { StatCard, Badge, EmptyState, Modal, Tabs, PlatformChip, PageHeader } from '@/components/ui'`. Mevcut compose'u önce dene; yeni component yazma 3+ tekrar olmadıkça (CLAUDE.md §7).
3. **Icon:** `lucide-react`'tan direkt import veya `@/components/ui/icons` re-export. Aynı icon adı tutarlı kullanılır.
4. **Page header:** `<PageHeader eyebrow="..." title="..." description="..." actions={...} />`.
5. **Loading:** `<TableSkeleton rows={6} cols={5}>` veya `<StatCardSkeleton />` veya custom `<Skeleton />`.
6. **Empty:** `<EmptyState icon title body action />`.
7. **Error:** `<ErrorState onRetry={...} />`.
8. **Mobile breakpoints:** `flex-col md:flex-row`, `grid-cols-2 lg:grid-cols-4`, table → card list pattern (`hidden md:table` + `md:hidden card list`).
9. **A11y:** `aria-current="page"` aktif link, `<Tabs>` `aria-selected` doğal, `<Modal>` `aria-modal` set, form `<Field>` label-input pair.
10. **CLAUDE.md güncelle:** Yeni sayfa eklersen §23.5 tablosuna ekle.

### 23.7 Phase log

- **Phase 0 (PR #97, branch `claude/implement-panel-ui-design-H8hvu`)**: Foundation — `bz-*` token block (`globals.css`), 22 reusable primitive (`src/components/ui/`), icon mapping (`icons.ts`), `.design-pulse-2026/` referans bundle, CLAUDE.md §23.
- **Phase 1.1 (aynı PR)**: `UserDashboardShell.tsx` polish — nav'a `platforms` + `announcements` eklendi, badge slot, topbar bell icon. `AdminSidebar.tsx` polish — `aria-current="page"` eklendi, sidebar'a `Abonelikler` (admin/plans) link'i eklendi.
- **Phase 1.2 (aynı PR)**: Owner Dashboard'a `<OnboardingNudge />` (5-step gradient dark card). Yeni route'lar: `/[locale]/dashboard/platforms` (default redirect picker + platform list + KVKK compliance note), `/[locale]/dashboard/announcements` (read-only sistem duyuruları list).
- **Phase 2 (aynı PR)**: `/admin/plans` yeni route — plan dağılımı (StatCard + ProgressBar), son katılan ödeyen müşteriler listesi (Avatar + Badge), 3 plan tier kartı (Starter/Growth/Pro, Growth highlight'lı dark card), Iyzico roadmap notu. AdminAnnouncements + AdminBlog list sayfaları PageHeader + Tabs + bz-card + Badge primitive'lerine migrate edildi.
- **Phase 3.1 (aynı PR)**: AdminMembers + AdminUsers + AdminCustomers sayfalarının chrome'u (header, badges, summary tiles) primitive'lere migrate edildi. PLAN_LABELS color map → PLAN_BADGE → `<Badge kind>`. Mobile pill'ler ve desktop role/status badge'ler tutarlı `<Badge>` kullanır. SummaryCard helper kaldırıldı, yerine `<StatCard>` primitive kullanıldı.
- **Phase 3.2 (aynı PR)**: AdminBusinesses (`/admin/restaurants`) header → PageHeader + lime CTA, status filter pills → semantic `<Tabs>` (role=tablist), search input → bz-input, empty state → `<EmptyState>` primitive (zero-results variants ayrı). Mevcut card grid + accent rail + status toggle korundu. OwnerGuide header → PageHeader (tek-line refactor, mevcut step cards intact).
- **Phase 3.3 (aynı PR)**: AdminDashboard'a `<AdminOverviewWidgets />` eklendi — Recently joined (Avatar + plan Badge ile son 4 kayıt, /api/admin/members'tan client-side fetch) + Needs attention (trial expiring/expired, inactive, no-business, stale empty buckets — sayım hesaplaması client-side derived, ek API yok). Skeleton loading. Tasarımdaki "AdminDashboard" sağ-rail widget'larıyla 1:1 hizalı. Superadmin'e özel render. OwnerProfile + OwnerQR header'ları → `<PageHeader>` primitive (tab content intact).
- **Phase 3.4 (aynı PR)**: AdminProfile + AdminApi + AdminSiteSettings + AdminAnalytics header'ları → `<PageHeader>` primitive. AdminAnalytics'de range picker + Export CSV butonu actions slot'unda. AdminSiteSettings'de "Superadmin" lime Badge actions slot'unda. AdminProfile'da italic/uppercase tuhaf header sade Pulse hierarchy'ye geçti. Tüm sayfalarda max-width + page padding standardize (`max-w-[1100px-1200px]` + `px-4 sm:px-7 py-6 lg:py-8`).
- **Phase 4 (PR #99+, branch `claude/phase-4-owner-qr-redesign`)**: OwnerQR (`/[locale]/dashboard/qr`) "Son Üretilenler" history list → 3-col QRCard grid pattern (tasarımdaki "QR yönetimi" görsel hizası). Her kart: tablo/genel label + tarih + platform badge + mono URL preview + Copy/Aç action butonları. Empty state Pulse pattern'ine geçti. OwnerMenu hub (`/[locale]/dashboard/menu`) header → `<PageHeader>` primitive.
- **Phase 5 (PR #100+, branch `claude/phase-5-panel-polish`)**: AdminMailTemplates list + AdminNewsletters list header'ları → `<PageHeader>` + `<StatCard>` migration. AdminMailTemplates kart grid'i `bz-card` + `<Badge>` ile yeniden inşa. AdminNewsletters `SummaryCard` helper kaldırıldı, `<StatCard>` primitive ile değiştirildi. AdminProfile italic+uppercase tracking-tighter h3'ler `bz-h-tight` Pulse pattern'ine geçti. **A11y baseline:** `.bz-skip-link` utility eklendi (focus-only visible, lime focus ring), hem owner shell (`UserDashboardShell`) hem admin layout (`/admin/layout.tsx`) ana içerik için `id="panel-main-content"` + `tabIndex={-1}` + skip-link entrance. Klavye/screen-reader kullanıcılar sidebar'ı atlayıp doğrudan content'e gidebilir.
- **Phase 6 (PR #101+, branch `claude/phase-6-final-polish`)**: A11y baseline 2 — `.bz-btn-primary/lime/ghost/icon` `:focus-visible` lime ring eklendi (klavye-only kullanıcılar için). OwnerAnalytics (SSR) sayfasına `<PageHeader>` injekt edildi (eyebrow + h1 + description), mevcut tabs/range picker/export controls korundu. OwnerRestaurantDetail header → PageHeader (back link sade text link olarak ayrı satır). AdminQR dark hero → sade `<PageHeader>` + `bz-card-soft` 3-up live preview pills (form seçimleri görünür kalır ama panel-uyumlu sade tasarım).
- **Phase 7 (PR #102+, branch `claude/phase-7-editors-polish`)**: Editor + dev sayfa chrome migration. **BlogPostEditor**: sticky header back button → bz-btn-icon, Önizle/Kaydet butonları → bz-btn-ghost/primary, h1 → bz-h-tight-2 truncate. **NewsletterCampaignEditor**: hero card + custom h1 → `<PageHeader>` + back link satırı; status pill `<Badge>` (sent ok / sending warn / draft ghost); error/info banner'lar token-driven hue. **AdminMailPreview** (`/admin/dev/mail-preview`): hero card → `<PageHeader>` (locale toggle actions slot'unda); error/info banner'lar consistent.
- **Phase 8.1 (PR #103, branch `claude/phase-8-alert-banner`)**: Yeni `<AlertBanner>` primitive (`src/components/ui/AlertBanner.tsx`, kind: info/success/warn/danger/lime, opsiyonel onDismiss). 8 sayfada inline alert div'leri tek-satır component çağrısına geçti (announcements, blog, mail-templates, dev/mail-preview, members, customers, users, NewsletterCampaignEditor). **Bonus:** favicon `?v=3` cache-busting (root + locale layouts + manifest) — eski favicon görünme sorunu için.
- **Phase 8.2 (PR #104, branch `claude/phase-8-page-header-batch`)**: 7 panel sayfası custom `<header>` + h1 + pulse-eyebrow → `<PageHeader>` primitive. admin/settings, billing, notifications, team, campaigns, reviews + dashboard/restaurants. Page wrapper'lar `mx-auto max-w-[1100-1400px] px-4 sm:px-7 py-6 lg:py-8` standardize.
- **Phase 8.3 (PR #105, branch `claude/phase-8-input-polish`)**: Final cleanup — admin/qr (3 banner), admin/site-settings (3 banner + INPUT const → bz-input), admin/restaurants list + detail (3 banner), admin/page login (1 banner) → AlertBanner primitive. site-settings'in INPUT const'ı `bz-input`'e refactor edildi (8+ field tek değişiklikle). Token-driven hue tutarlılığı %95+ seviyeye ulaştı.
- **Phase 9 (PR #106, branch `claude/phase-9-final-polish`)**: 3 polish iyileştirmesi tek PR'da. (1) `<Tabs variant="vertical">` primitive — `globals.css` yeni `.bz-tabs-vertical` + `.bz-tab-vertical`; `Tabs.tsx` `variant` prop + Arrow Up/Down keyboard nav + `aria-orientation`. OwnerProfile (`/[locale]/dashboard/profile`) custom 8-tab sidebar dikey Tabs primitive'ine geçti (lg+ desktop); mobile/tablet'te horizontal scroll fallback korundu. (2) Mobile breakpoint regression: admin/restaurants inner metrics grid `sm:grid-cols-3 md:grid-cols-4` (375px text crowding fix), dashboard/feedbacks right pane `hidden xl:flex` → `lg:flex` + responsive width (iPad'de preview görünür), admin/dashboard toolbar `gap-2 sm:gap-3 md:gap-4` (375px wrap fix). (3) OwnerMenu builder DnD chrome: `disabledByAdmin` warn banner + page-level error + item modal `formError` → `<AlertBanner>` primitive (3 inline div temizlendi). DnD logic + tüm form/CRUD intact.
- **Phase 10.1 (PR #107, branch `claude/phase-10-public-review-redesign`)**: Public review surface (`/r/[slug]`) tam yeniden inşa — `.design-pulse-2026/.../admin-and-public.jsx` `PublicReview` ile 1:1. Dark `#0A0A0A` zemin + brand header (logo card initial + isim + adres) + tek beyaz card (24px radius) + 3 step (rating → high redirect/low form → thanks) + `POWERED BY BUAZE` mono footer. Yıldızlar lime-fill on select, `bz-h-tight-2` heading, `bz-input` form alanları, `bz-btn-primary` CTA, `bz-fade-in` step transition, `bz-btn-icon` modal close. KVKK/marketing legal modal token-driven yenilendi (ESC + body scroll lock + backdrop click). Yüksek puan + `?platform=` QR akışında auto-redirect overlay korundu — `<PlatformChip>` ile platform-aware görsel ve `bzProgress` 2.2s lime progress bar. Honeypot + recaptcha + KVKK/contact validation backend kontratı dokunulmadı. Legacy `StarRating.tsx`, `FeedbackForm.tsx`, `ThankYou.tsx` (zero callers post-refactor) silindi — `/r/[slug]/page.tsx` artık tek-dosya orchestration. Sayfa `/r/[slug]` tasarım kapsamına dahil edildi (§23.5'te eskiden listede yoktu, çünkü panel-only kapsam).
- **Phase 10.2 (PR #108 → squash gotcha → restored in PR #109)**: Auth form'larında inline error/notice banner'lar `<AlertBanner>` primitive'ine geçti (4 form × 6 banner: LoginForm 2, RegisterForm 2, ForgotPasswordForm 1, ResetPasswordForm 1). Forgot/Reset success state full-card'ları (page-state component'i) korundu. **Not**: PR #108 stacked PR squash-merge gotcha'sına takıldı (CLAUDE.md §21.22) — base branch silinince auto-closed, içerik main'e geçmedi. PR #109'da cherry-pick ile yeniden uygulandı.
- **Phase 10.3 (PR #109, branch `claude/phase-10-3-onboarding-polish`)**: Onboarding sayfası (`/[locale]/onboarding`) Pulse polish. (1) `inputCls` const tek-satır refactor: 9-utility Tailwind compound → `'bz-input'` (4 input alanı otomatik lime focus ring + hover state). (2) Lime info card (location step) → `<AlertBanner kind="lime" icon={<MapPin />}>` — token-driven hue tutarlılığı + slot-based icon override. Sektör/platform RadioCard-equivalent selection state'leri kasıtlı korundu (design pattern'i bu). Ayrıca PR #108'in cherry-pick'i (auth banner migration) bu PR'a dahil — squash gotcha sonrası restore.
- **Phase 10.4 (PR #110, branch `claude/phase-10-4-menu-magazine-pulse`)**: Legacy customer menu sayfası (`/r/[slug]/menu`, magazin tarzı, 394 satır) Pulse polish'i. (1) **Tipografi**: Tüm `font-extrabold` / `font-black` heading'ler `bz-h-tight` / `bz-h-tight-2` ile değiştirildi (Pulse rule: Space Grotesk weight 500 yeter). `tracking-widest font-black uppercase` mini-label'lar `pulse-eyebrow` ile birleşti. (2) **Badge'ler**: 2 out-of-stock kırmızı div + custom lime ürün badge'leri → `<Badge kind="danger">` / `<Badge kind="lime">` primitive'leri. (3) **Empty state**: "Sonuç bulunamadı" custom div → `<EmptyState>` primitive. (4) **Search input**: 9-utility custom focus → `bz-input` (lime focus ring + hover state). (5) **Header back button**: 40x40 custom hover → `bz-btn-icon`. (6) **Modal chrome**: `role="dialog"` + `aria-modal` + `aria-labelledby`, ESC handler, body scroll lock, backdrop click-out. CTA `bz-btn-primary`, eyebrow'lar `pulse-eyebrow`. (7) **Loading state**: `text-[#C9D0DB]` (Pulse-dışı slate) → `text-[#A3A3A3]` + JetBrains Mono BUAZE label (Phase 10.1 ile tutarlı). (8) **Fiyat metni**: `font-black` → JetBrains Mono (`var(--font-mono)`, weight 600/700). (9) **Category chips**: `role="tablist" aria-selected` semantik + focus-visible lime ring. (10) **A11y bonus**: Item card'lar `<div>` → `<button>` (klavye + screen reader). Backend dokunulmadı — `useMenuAnalytics` + `useProductViewTracking` + `/api/menu/[slug]` fetch contracts intact. `<img>` korundu (CLAUDE.md §3 base64 data URL akışı zorunlu kılıyor).
- **Phase 10.5 (PR #111, branch `claude/phase-10-5-trial-expired-polish`)**: `/admin/trial-expired` (kritik conversion sayfası) + `/[locale]/dashboard/guide` step icon brand fix. Trial-expired: `font-bold` → `bz-h-tight`, fiyat Space Grotesk weight 500 + tight tracking, "Popüler" → `<Badge kind="lime">`, "%30 İndirim" → `<Badge kind="ok">`, checkmark `text-green-500` → `text-[#A8D62E]` (lime-deep), CTA → `bz-btn-primary`, lime tint `bg-[#C6F24E]/5` → `bg-[#EAF9B8]/40` (Pulse Lime Soft token), bg `white` → `#FAFAFA` (N50). Guide: 2 step icon off-brand mavi/yeşil → graphite (lime+graphite duotone tutarlılığı).
- **Phase 10.6 (PR #112, branch `claude/phase-10-6-announcement-banner-pulse`)**: (1) **AnnouncementBanner** (owner dashboard top, 4 severity'li sistem duyurusu): SEVERITY_STYLES paleti `bg-emerald-50/bg-amber-50/bg-red-50/bg-slate-50` Tailwind palette → AlertBanner primitive'in **KIND_PALETTE hex değerleriyle birebir hizalandı** (info: #EFF6FF/#BFDBFE/#1E40AF, success: #F0FDF4/#BBF7D0/#166534, warn: #FFFBEB/#FDE68A/#92400E, danger: #FEF2F2/#FECACA/#991B1B). Title `font-semibold` → `bz-h-tight`. CTA inline `bg-[#0A0A0A] rounded-full` → `bz-btn-primary`. Dismiss button focus-visible lime ring. Dashboard-top duyuru bar'ı + inline AlertBanner'lar artık aynı görsel dili konuşuyor — operatör için tutarlı sinyal hierarchy'si. Severity icon picker (Info/CheckCircle2/AlertTriangle/AlertOctagon), CTA slot, dismiss persistence (localStorage), collapse/expand hepsi intact. (2) **ContactForm** (marketing iletişim formu): inline `bg-[#FEF2F2]` error div → `<AlertBanner kind="danger">` (1-line refactor). Marketing form'u da panel ile aynı banner primitive'ini paylaşıyor.
- **Phase 11.1 (PR #113, branch `claude/phase-11-a11y-audit`)**: A11y baseline 3 — primitive seviyesinde derin iyileştirmeler. (1) **`<Modal>` focus trap**: Açılışta dialog içindeki ilk focusable'a fokus, Tab/Shift+Tab dialog içinde döngü (FOCUSABLE_SELECTOR — a/button/input/select/textarea/[tabindex]/contenteditable), kapanışta `previouslyFocused.current.focus()` ile çağıran elemana geri dönüş. ESC `e.stopPropagation()` ile parent dialog'lara sızmıyor. `tabIndex={-1}` + `focus:outline-none` dialog kabuğunda. (2) **`<Field>` aria-describedby + aria-invalid + aria-required**: `useId()` ile stable ID üretimi, hint + error span'larına `id={`${inputId}-hint/error`}` atanıyor, ilk child input'a `cloneElement` ile `aria-describedby="hint-id error-id"` + `aria-invalid={!!error}` + `aria-required={!!required}` injekt ediliyor. Error span'a `role="alert"` eklendi (screen reader hata değişimini anında okur). Required `*` `aria-hidden="true"` (label'a `aria-required` zaten geçiyor). (3) **Reduced motion kapsamı**: `globals.css` `@media (prefers-reduced-motion: reduce)` block'u 3 keyframe'den 14+ keyframe'e genişledi (`bz-fade-up/scale-in/float/pulse-heartbeat/animate-marquee/slide-in/spin/pulse/bounce/ping`, `[class*="animate-in"]`) + universal `*` selector ile `transition-duration: 0.001ms` + `scroll-behavior: auto`. Kullanıcı reduced motion tercih ediyorsa hiçbir Tailwind/Pulse animation'ı oynamıyor. (4) **Public skip-link genişletmesi**: `/r/[slug]/menu` (sticky header + search + chips ile dolu) artık `<a className="bz-skip-link">İçeriğe atla</a>` + `<main id="menu-main-content" tabIndex={-1}>` ile klavye/screen-reader kullanıcılara header'ı atlama yolu sunuyor. Backend dokunulmadı.
- **Phase 11.2 (PR #114, branch `claude/phase-11-2-panel-parity`)**: Senior-developer audit'in işaret ettiği parity drift'lerinden 3 yüksek-değerli bulgu kapatıldı. (1) **`/admin/api` Webhooks "Endpoint ekle" CTA**: native `alert("Yakında bağlanacak.")` placeholder → `<Badge kind="ghost">Yakında</Badge>` + `disabled` buton (`#FAFAFA` bg, `#A3A3A3` text, `cursor-not-allowed`, `aria-disabled="true"`). Tarayıcı dialog UX papercut'u kaldırıldı. (2) **`/admin/billing` "Yöntem ekle" CTA**: aynı pattern — `alert("Yakında bağlanacak")` → Badge + disabled buton. Iyzico backend bağlanınca disabled flag kaldırılacak. (3) **`/admin/dashboard` welcome banner eyebrow**: `"✦ CANLI PANEL"` hardcoded emoji + custom inline pill → tasarımdaki `"SUPERADMIN"` (veya non-superadmin için `"PANEL"`) eyebrow + `bz-pulse-dot` lime nokta + lime border + `pulse-eyebrow` JetBrains Mono. Off-brand emoji + Pulse-dışı pill stili düzeldi. (4) **`/[locale]/dashboard` (owner home) header**: raw `<header><div><p class="pulse-eyebrow"><h1>` markup → `<PageHeader eyebrow title>` primitive. Tüm panel'de header pattern artık tek primitive'den. Backend dokunulmadı.
- **Phase 11.9 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Süperadmin paneli yapısal audit + dashboard rewrite. Bir Explore agent admin pages'i tasarım kaynağındaki 4 explicit `Admin*` JSX (AdminDashboard / AdminBusinesses / AdminAnnouncements / AdminBlog) ile karşılaştırdı. Kullanıcı dashboard için "ekstra metrik kaldırma" yetkisi verdi. **`/admin/dashboard` major rewrite**: client-component (510 LOC, feedback-centric operational dashboard) → **server component** (~180 LOC, strategic overview). Tasarım pattern'i 1:1 uygulandı: (1) `<PageHeader eyebrow="SUPERADMIN" eyebrowColor="#C6F24E" title="Sistem genel görünümü">` (2) **4-stat KPI grid** (Toplam işletme + Aylık MRR with lime accent + Aktif denemeler + Aylık yorum) — design'daki `ADMIN_STATS` ile birebir; MRR `/admin/plans`'in PLAN_PRICES (Pro 1499 / Growth 899 / Starter 499 / Yearly 416) heuristic'iyle (3) **2-col 2fr/1fr grid**: Business growth `<BarChart>` (last 12 weeks signup buckets) + Plan distribution `<ProgressBar>` (4 plan tier'ı: Pro/Growth/Starter/Trial) (4) **2-col 1fr/1fr grid**: Recently joined + Needs attention (`<AdminOverviewWidgets>` Phase 3.3'te zaten 1:1). **Removed (operational widgets, design'da yok)**: Toolbar (date/restaurant/branch filters + export), feedback-centric StatsCards (review/avgRating/lowRatings/redirects), Quick Actions 4-button grid, AspectBreakdown + GoogleConversion + PlatformDistribution kartları, Trends + Day Distribution charts, RatingChart + WordCloud, FeedbackTable + pagination. Operasyonel yorum monitoring `/admin/reviews`'da zaten mevcut (kayıp feature yok). Backend dokunulmadı — sadece Prisma aggregate query'leri eklendi (restaurant.count, feedback.count last 30d, user.findMany for plan dist).
- **Phase 11.8 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Final structural audit (Phase 1: Explore agent layout-level compare each owner page vs design source `Owner*` JSX). Audit yapısal sapmaları katalogladı; aksiyona dönüşebilen 2'sini fix etti, kalan struktural drift'ler (sentiment AI word cloud, OwnerMenu tek-sayfa editor, OwnerSettings 3-card, OwnerQR grid/list toggle) **kabul edilen drift** olarak documented (backend dependency veya feature scope expansion). (A) **OwnerDashboard KPI set** — design 4-stat pattern'i (Total reviews + Avg rating + Active QR + Redirects) ile birebir hizalandı. Önceki KPI'lar (Today, Positive reviews) silindi; yerine `avgRating` (weighted across locations) ve `redirectCount` (rating>=4 + platform IS NOT NULL) Prisma aggregate query'leri eklendi. Avg rating KPI'sına lime accent (`bg-[#C6F24E]`) eklendi (design'da lime icon background). Unused `Calendar` icon + `todayReviews` + `feedbacks` subselect drop edildi. (B) **OwnerFeedback tab semantiği** — design'daki 4 tab (Tümü / Düşük puan 1-3 / Yüksek puan 4-5 / Yönlendirilen) `OwnerFeedback` referansıyla birebir uygulandı. Eski tab anahtarları `'all' | 'new' | 'attention' | 'replied'` (reply-state bucket'ları) → `'all' | 'low' | 'high' | 'redirected'` (rating + redirect bucket'ları). Filter logic client-side rating + platform check. Legacy `/api/feedback/counts` server aggregate kullanımı drop edildi (response shape artık eşleşmiyor); count'lar şu an loaded window üzerinde client-side derived. Backend dokunulmadı.
- **Phase 11.7 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Restaurant-related screens deep audit. Bir Explore agent menü builder + menu analytics + restaurant detail (owner+admin) + location list ekranlarını tasarım kaynağıyla satır-satır karşılaştırdı. 4 pass: (A) **Menu builder** (`/dashboard/restaurants/[id]/menu`, ~1700 LOC) — local `function Modal` (custom `fixed inset-0`) silindi; `<Modal>` primitive (3 yerde size prop'u ile) `@/components/ui`'dan import edildi (focus trap + ESC + body scroll lock kazanıldı). Menü status dots `bg-emerald-500/text-emerald-700` + `bg-amber-500/text-amber-700` → Pulse positive `#16A34A/#166534` + warn `#D97706/#92400E`. Publish button + visibility toggles + delete buttons + low-engagement badges off-palette amber/red Tailwind alias'larından Pulse hex'lerine remap. (B) **Menu analytics** (`/dashboard/restaurants/[id]/menu/analytics`) — error box `bg-red-50` → `<AlertBanner kind=danger>`; delta `text-emerald-600/red-600` → Pulse `#166534/#991B1B`; status badge `bg-amber-50 text-amber-700` → Pulse warn hex. (C) **Detail pages** (`/dashboard/restaurants/[id]` + `/admin/restaurants/[id]`) — menu enabled/disabled status dot/text + delete buttons emerald/red Tailwind → Pulse positive/danger hex. (D) **Public review** (`/r/[slug]`) — brand header (avatar initial chip + restaurant name h1) `font-medium` (500) → `font-bold` (700) tasarım kaynağındaki `fontWeight: 700` ile birebir. (E) **Sanity sweep** — 4 ek drift: `/admin/restaurants` list status dots (emerald-500/amber-500), isActive indicator (emerald-600), `/dashboard/qr` duplicate warning amber pill, `/dashboard/feedbacks` degraded join banner. Tüm Tailwind alias'lar Pulse hex'lerine remap. Backend dokunulmadı.
- **Phase 11.6 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Phase 11.5 sweep sonrası iki Explore agent ile yapılan derin sub-page audit'i, kalan 9 dosyadaki drift'i kapattı. **Pass A** — `RestaurantAnalyticsPanel` 5 chart icon container (indigo/emerald/cyan/blue/emerald-50 + emerald-deep) → Pulse Lime tint (`#EAF9B8` + graphite text) + card chrome `bz-card`'a + h2/h3'lere `bz-h-tight`. **Pass B** — admin sub-page off-palette: `/admin/qr` Toplu QR icon `bg-indigo-50` → lime, `/admin/users` row hover `bg-blue-50/50` + icon hover `bg-blue-50` → lime tint, `/admin/announcements` "Yayında" toggle `bg-emerald-500` → lime, `/admin/trial-expired` "%30 İndirim" badge `bg-green-100` → lime tint. **Pass C** — `UserDashboardShell` 9 inline `style={{ fontFamily: 'var(--font-heading) }}` + 1 mono (logo, workspace switcher, plan card, mobile sheet, topbar) silindi; `bz-h-tight` / `bz-mono` className'leri yeterli. **Pass D** — `CopyUrlButton` `text-emerald-500` check icon → `text-[#A8D62E]` (Pulse lime-deep). Menu badge palette (`PublicMenuView` + `ProductDetailModal`) Tailwind 100/800 alias'larından Pulse Badge primitive hex token'larına remap (amber/blue/emerald/lime/red/purple → warn/info/ok/lime/danger/graphite-on-lime). Backend dokunulmadı.
- **Phase 11.5 (PR TBD, branch `claude/owner-panel-pulse-parity`, stacked on PR #116)**: İşletme (owner) paneli 1:1 Pulse parity sweep'i. Tasarım kaynağı `.design-pulse-2026/project/owner-pages-{1,2,3}.jsx` ile karşılaştırma + Phase 1'de iki Explore agent ile drift haritası çıkarıldı. 5 pass'lik aşamalı plan uygulandı: (1) **Off-palette renk temizliği** — emerald-/red-/blue-/purple-/orange- prefix'li Tailwind class'ları `<AlertBanner>` + `<ErrorState>` primitive'lerine + Pulse hex token'larına. profile, restaurants, restaurants/[id], qr, guide etkilendi. (2) **Card chrome standardize** — inline `rounded-2xl border border-[#EDEDED] bg-white` (4 permütasyon) `bz-card` utility'sine. 10 dosya, ~38 yer. (3) **Heading typography normalize** — inline `style={{ fontFamily: 'var(--font-heading)' }}` 46 yerden silindi; her birine `bz-h-tight` className eklendi. Avatar/initial chip'leri (3 yer) heading olmadığı için kasten dokunulmadı. (4) **Modal primitive adoption** — `/dashboard/restaurants` "Yeni İşletme" modal'ı custom `fixed inset-0` markup'ından `<Modal>` primitive'ine (focus trap + ESC + body scroll lock + focus restore). Feedbacks ve analytics tab migration'ları kapsam dışı bırakıldı (feedbacks select dropdown kullanıyor, analytics SSR + dekoratif). (5) **Padding normalize** — `/dashboard/page.tsx` wrapper `px-4 py-8 sm:px-8 lg:py-10` → `px-4 sm:px-7 py-6 lg:py-8` Pulse standardı. Backend dokunulmadı.
- **Phase 11.4 (PR #115, branch `claude/implement-buaze-pulse-workspace-odHUj`)**: Süperadmin dashboard 1:1 design parity. Tasarım kaynağı `.design-pulse-2026/project/admin-and-public.jsx` `AdminDashboard` ile karşılaştırma yapıldı; en görünür drift'ler kapatıldı. (1) **Welcome banner kaldırıldı**: dark gradient hero (`bg-[#0A0A0A] text-white`) + custom satisfaction badge → tasarımdaki temiz `<PageHeader eyebrow="SUPERADMIN" eyebrowColor="#C6F24E" title>` pattern'i. Satisfaction `%` description'a inline metric olarak taşındı. Page wrapper `max-w-7xl p-3 sm:p-6 md:p-10` → `max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8` Pulse standardına. (2) **Chart card icon backgrounds remapped**: 6 ayrı off-palette renk (indigo-50, emerald-50, blue-50, purple-50, cyan-50, green-50) → Pulse Lime tint (`#EAF9B8` text-graphite) + Day Distribution için graphite-bordered N50 tile. (3) **Card chrome**: `bg-white rounded-xl sm:rounded-2xl border border-[#EDEDED]` tekrarları → `bz-card` utility class'ı. (4) **Heading weight**: 4 yerde `text-lg sm:text-xl font-semibold/bold tracking-tight` → `bz-h-tight text-lg sm:text-xl` (Space Grotesk 500 weight). Backend dokunulmadı.
- **Phase 11.3 (PR #115, branch `claude/implement-buaze-pulse-workspace-odHUj`)**: Senior-audit Phase 11.3+ backlog'unun 2 yüksek-değerli kalemi kapatıldı. (1) **Native `alert()` callback'leri → stateful `<AlertBanner>`**: 8 yer — `/admin/qr` (4 download/export error), `/admin/settings` (3 OAuth connect error), `/admin/users` (1 delete error). `actionNotice` / `pageNotice` / `integrationsError` state'leri AlertBanner ile dismissible olarak render edilir. `/admin/qr`'da auto-dismiss 5sn timeout. (2) **3 custom modal → `<Modal>` primitive**: `/admin/users` (yönetici ekle/düzenle), `/admin/restaurants` (işletme ekle), `/admin/announcements` (duyuru ekle/düzenle) — `fixed inset-0` markup'ı silindi, `<Modal>` primitive'i (focus trap, ESC handler, body scroll lock, `aria-modal`, focus-restore on close) kullanılıyor. CTA buton'lar `bz-btn-primary` / `bz-btn-ghost` — uppercase tracking-wider + custom shadow varyantları yerine token-driven Pulse pill'ler. Modal title slot'u `pulse-eyebrow` + `bz-h-tight` ile tasarımdaki başlık hierarchy'sine uydu. Backend dokunulmadı.
- **Phase 11.10 (2026-04-28, sidebar IA pass)**: Owner ve admin sidebar'larında alt plan/abonelik kartı kaldırıldı; bu kart sidebar'ı gereksiz uzatıp dar ekranlarda menüleri aşağı itiyordu. Menü bilgi mimarisi tekrar collapsible gruplara döndü: owner tarafında `Geri bildirim`, `QR ve platformlar`, `İşletme`, `Bilgi`; admin tarafında `Operasyon`, role'a göre `İşletme/Ayarlar`, superadmin için `Hesaplar`, `İçerik`, `Mail`. Aktif route'un bulunduğu grup otomatik açık kalır, kullanıcı aç/kapat tercihi localStorage'da korunur. Yeni sidebar item eklerken önce mevcut gruplardan birine yerleştir; yeni üst seviye flat item sadece gerçek ana giriş noktasıysa kullanılmalı.
- **Phase 11.11 (PR #267)**: Owner desktop "Bugün" KPI 3-card row (reviews/scans/redirects today + yesterday delta), latest feedback row'ları full-Link, low-rated lime "Yanıtla" pill. Admin dashboard attention satırlarına server-side trial expiring/expired (2 ek `prisma.user.count`). Yeni `TrialBanner` topbar (≤7d warn / ≤3d danger, daily-reset localStorage dismiss).
- **Phase 11.12 (PR #268)**: Feedback inbox filter expansion + bulk actions. `/api/feedback` GET'e `hasReply`/`isFlagged`/`isAssigned` query param'lar. Yeni `/api/feedback/bulk` endpoint (IDOR + Zod + Upstash rate limit 10/dk/actor; superadmin/manager only; flag/unflag/assign). Owner + admin filter UI: platform chip + state pill'ler + URL sync. Admin: 4-card quick stats + multi-select + floating bottom toolbar (Stripe pattern).
- **Phase 11.13 (PR #269)**: URL state sync standardization. Yeni hook `src/hooks/useUrlFilter.ts` — generic `Record<string, string|number|boolean>` defaults, URL = source of truth, no useState shadow. 4 admin list migrate edildi (restaurants/members/customers/users). Mevcut `setX/x` referansları intact (wrapper proxy pattern). Linear/Stripe/Notion deeplink-friendly pattern.
- **Phase 11.14 (PR #270)**: `/admin/qr` list view mobile card-fallback (`md:hidden flex-col grid` + `hidden md:block table`). CLAUDE.md §23.6 table-to-card pattern uygulandı.
- **Phase 11.15 (PR #271)**: Silent failure → AlertBanner standardization. 4 admin sayfada (restaurants/members/users/billing) `fetchError` state + `<AlertBanner kind="danger" onDismiss>`. catch ek `console.error` intact (Sentry §26.5 capture pattern).
- **Phase 11.16 (PR #272)**: Full-row drill-down. `/admin/restaurants` + `/admin/members` tablolarında `<tr role="link" tabIndex={0}>` + `closest('button, a, input')` guard + `onKeyDown` Enter/Space + focus-visible lime ring inset. Action menu `MoreHorizontal` `e.stopPropagation` pattern intact.
- **Phase 11.17 (PR #273)**: Content-shape skeletons (3 sayfa). `/admin/billing` → `CardSkeleton` + `TableSkeleton` kombinasyonu. `/admin/legal-documents` → 3 `CardSkeleton`. `/admin/announcements` → 6 card responsive grid. `Loader2` spinner pattern → content-shape (Linear/Stripe/Vercel pattern).
- **Phase 11.18 (PR #274)**: ConfirmDialog pattern unification. `/admin/blog` + `/admin/announcements`'ta inline two-button (Sil/Vazgeç) pattern → `useConfirmDialog` [tuple]. Modal-based focus trap + ESC + body scroll lock + `aria-modal` + focus restore (Phase 11.1 baseline reuse).
- **Phase 11.19 (PR #275)**: Bulk activate/deactivate (restaurants). Yeni `/api/admin/restaurants/bulk` endpoint (superadmin only, IDOR, Zod, rate limit 10/dk, single `updateMany`). UI: header select-all checkbox + indeterminate state, row solunda checkbox, lime-tint highlight, floating bottom toolbar (X seçildi + Aktif et lime + Duraklat ghost + dismiss), 3.5s auto-dismiss notice.
- **Phase 11.20 (PR #276)**: A11y polish. 6 admin search input'a `aria-label` (Blog yazısı ara / Müşteri ara / Bülten abonesi ara / Bülten kampanyası ara / İşletme sahibi ara / İşletme ara). 2 bulk toolbar count span'ına `aria-live="polite"` (3 seçildi announcement). WCAG 2.1 AA 1.3.1 + 4.1.2.
- **Phase 11.21 (PR #277)**: Self-audit follow-up bug bundle. (1) `/admin/members` searchInput desync — browser back ile gelen URL filter input'a yansımıyordu, sync `useEffect` eklendi. (2) `/admin/restaurants` bulk selection stale — filter değişiminde `selectedIds` cleanup yoktu, görünmeyen row'lara apply riski vardı; `useEffect` ile temizlik. (3) `/admin/reviews` bulk refetch URL'inde `assignedToMe` eksikti, "Bana atanan" filter aktifken liste yanlış genişliyordu; query builder'a eklendi. Backend dokunulmadı.
- **Phase 11.34 (PR #323, branch `claude/ux-polish`)**: 3-bundle UX polish. **(1) Ops alert locale-aware** — `OpsAlertParams.userLocale?: 'tr' \| 'en'` field eklendi (default TR per CLAUDE.md §22.9). `notifyOpsOfMailFailure` body subject + content user locale'ine göre TR/EN render eder; metadata satırları aynen korunur. `lifecycle-email-rules.ts` `RunRuleParams.userLocale` zorunlu hale getirildi (4 caller `user.locale` geçirir) — Buaze ops ekibi etkilenen owner bağlamında (TR vs EN) email içeriğini görür. **(2) Search button görsel** — `UserDashboardShell.tsx` topbar Cmd+K palette button'ları: hover'da `bg-[#FAFAFA]` (desktop) + `bg-[#EAF9B8]/40` (mobile lime tint), `active:scale-95/90` press feedback, `focus-visible:ring-offset-1` belirgin focus, icon stroke `2 → 2.25` daha vurgulu. Pasif hisseden kullanıcıya "alive" görsel sinyal. **(3) URL test "Başarılı" mesajı** — `BusinessIntegrationSettings.tsx` `LatestCheckLine` ok=true durumunda artık `· HTTP 200 · 340ms` mono detail göstermez; sadeleştirilmiş `<strong>Başarılı/Successful</strong> · X sa önce` görünür. Owner için technical detail anlamsızdı; HTTP code/latency dev DevTools ile bakılabilir. Fail durumu (ok=false) detayını korur (HTTP code + error msg debug için kritik).
- **Phase 11.33 (PR #322, branch `claude/lifecycle-retry`)**: Wave 3+ B — lifecycle email send retry + ops alert. `runRule` artık `sendWithRetry` ile sarılı (`MAX_RETRIES = 1`, `RETRY_DELAY_MS = 3000`); ilk send fail olunca 3sn wait + tek retry. Retry sonrası hâlâ fail → `notifyOpsOfMailFailure` (CLAUDE.md §21.33) ops inbox'a alert (template `lifecycle:${type}` + recipient + reason + metadata). `RunRuleParams.recipient` field eklendi (4 caller'da `user.email` geçirildi). Resend uptime ~99.9% → tipik fail oranı %0.1 → 1000 user × ~1 fail × 3s = marjinal extra time. Aggressive retry (3 attempt × exponential backoff) **kasıtlı yapılmadı** — cron sequential işliyor, total timeout (300s) korunmalı. ChatGPT'nin önerdiği 3-attempt exponential backoff'tan **konservatif sıkılaştırma** + helper inline (3+ caller pattern §7 için extract edilmedi).
- **Phase 11.32 (PR #321, branch `claude/audit-fixes`)**: Phase 11.22-11.31 deterministik bug audit fix bundle. Explore agent + manuel doğrulama 12 finding raporladı; 9'u false positive / bilinçli design (slug-based public endpoint, locale TR fallback default, brokenWindowHours ageMs check zaten doğru, Upstash fail-open mevcut, FK eksik LifecycleEmailLog dokümante minimal model, vb.); 3 gerçek issue düzeltildi. **(1) Bug #1 [MEDIUM] — Lifecycle cron batch truncation**: `BATCH_SIZE = 100` → `1000`. Eskiden `findMany take: 100 orderBy: createdAt asc` her run aynı eski 100 user'ı kapsıyordu, 101+ user'lar lifecycle email asla almıyordu. Buaze 1000+ user'a ulaşana kadar effectively unbounded; sonra cursor-based pagination eklenir. **(2) Bug #2 [LOW] — Activation upsert race**: `prisma.upsert` Prisma 6'da atomic değil (internal `findUnique` + branch). Concurrent PATCH'lerde 2 request "not found" görüp 2 create deneyebilir → P2002 unique violation → 500 dönen. `try/catch` + `P2002` yakalanırsa `update` branch'e fallback (idempotent recovery). **(3) Bug #3 [LOW] — LifecycleEmailLog write fail observability**: `recordSent` DB write fail olduğunda eskiden sadece `console.error` yazılıyordu → operatör bilgisi yok. `Sentry.captureMessage` warning level eklendi (`tags: { type }, extra: { userId, restaurantId, error }`). Mail mantığı değişmedi (CLAUDE.md §19.4.5'te dokümante "log eksik = worst case 1 ek mail" trade-off korundu, sadece monitoring eklendi). Toplam ~25 satır kod değişikliği, 3 dosya. **Out of scope**: false positive 9 finding (skip), kalan minor optimization'lar.
- **Phase 11.31 (PR #320, branch `claude/admin-lifecycle-ui`)**: Wave 3+ A — lifecycle email admin trigger UI (CLAUDE.md §21.37). (1) **`POST /api/admin/lifecycle-emails/trigger`** — superadmin gate + rate limit 5/dk + `runLifecycleEmails()` shared helper. (2) **`GET /api/admin/lifecycle-emails/logs`** — superadmin gate, `?type=...&days=7|30|90`, last 50 + stats + manuel User/Restaurant enrich (FK yok modelde, Promise.all + Map lookup). (3) **`/admin/dev/lifecycle-emails/page.tsx`** — Pulse `bz-card` UI: trigger button (Zap + Loader2 spinner) + 4 stat tile (sent 7d/30d/total/byType) + 2 filter dropdown (type/days) + last 50 log table. Trigger sonrası otomatik reload. (4) **`AdminSidebar`** — Mail group'una `Yaşam Döngüsü` / `Lifecycle` entry. **ChatGPT'den 2 sıkılaştırma**: per-user trigger + test mail çıkarıldı (main trigger + mevcut `/admin/dev/mail-preview` yeterli). Production debug + monitoring aracı; cron'un günlük schedule'una müdahale etmez.
- **Phase 11.30 (PR #319, branch `claude/lifecycle-emails`)**: Wave B — lifecycle email infrastructure (CLAUDE.md §21.34). 4 yeni cron-driven idempotent email + `LifecycleEmailLog` model + `applyLifecycleRules` helper + admin editor entegrasyonu. (1) **`LifecycleEmailLog` Prisma model** — `userId? + restaurantId? + type + sentAt + metadata: Json?` + 2 composite index. (2) **4 yeni Pulse template** (`qr-not-downloaded`, `first-feedback-tips`, `upgrade-suggestion`, `inactive-reactivation`) — `loadMailCopy` + `deepSubstitute` placeholder pattern (Phase 21.26 + 21.29). TR/EN inline default + DB-driven override. (3) **`src/lib/email/lifecycle.ts`** + **`src/lib/lifecycle-email-rules.ts`** — saf helper'lar: `alreadySent` cooldown check (lifetime veya 30g), `recordSent` log yaz, `applyLifecycleRules` 4 kuralı sırayla check (fail-soft `runRule`), `buildLifecycleContexts` aggregate context inşası. (4) **`POST /api/cron/lifecycle-emails`** — `Authorization: Bearer ${CRON_SECRET}` guard, BATCH_SIZE=100, `maxDuration: 300`, `runLifecycleEmails()` shared helper export. Response: `{ usersChecked, contextsProcessed, sent: {qr/tips/upgrade/inactive}, skipped, failures, durationMs }`. (5) **`vercel.json`** — `0 8 * * *` UTC schedule (TR 11:00 sales window). (6) **Welcome + trial-ending duplicate önleme**: mevcut Phase 21.6 + 21.11 trigger'ları korunur, cron tekrar göndermez. **ChatGPT'den 5 sıkılaştırma**: log payload sade, cron günde 1 (12 saat değil), upgrade `feedbackCount ≥ 50` threshold, lifetime cooldown irreversible aksiyonlar, search button bu PR'da değişmedi (CLAUDE.md §21.35). **Maliyet**: günde ~40-80 outbound email + 1 invocation, marjinal.
- **Phase 11.29 (PR #318, branch `claude/activation-checklist`)**: Owner activation checklist (CLAUDE.md §19.5, Wave A — Prompt 3). Yeni restoran sahipleri için 5-step kurulum kontrol listesi: profile / google_link / qr_downloaded / qr_printed_shared / first_feedback. (1) **`RestaurantActivationState` Prisma model** — `qrPrintedSharedAt` + `dismissedAt` + auto `createdAt`/`updatedAt`. ChatGPT'nin önerdiği 5 nullable timestamp **2'ye sıkılaştırıldı** (3 step compute edilir: profile/google/feedback mevcut data'dan, qr_downloaded `QrGeneration.count > 0`). (2) **`src/lib/activation.ts`** — `computeActivation({ restaurant, state, qrGenerationCount, feedbackCount })` saf fonksiyon, deterministik, test edilebilir. Output: `{ steps[], completedCount, totalCount, percentage, isComplete, dismissedAt }`. `getSuggestedSteps(result, max)` helper'ı top-N incomplete step döner. Google link kontrolü warning severity'sinde geçer (homepage / not_review_link → "done"; Phase 11.22 §19.4 disiplini, warning hard block değil). (3) **`GET + PATCH /api/restaurants/[id]/activation`** — owner-scoped IDOR. PATCH actions: `mark_qr_printed`/`unmark_qr_printed`/`dismiss`/`undismiss`. `mark_qr_downloaded` action **çıkarıldı** (mevcut `rememberFeedbackQr` upsert'i yeterli). (4) **`<ActivationChecklistCard />`** — Pulse `bz-card`, 5-step list (lucide step icon + label + done state + CTA Go button), progress bar (lime, aria-valuenow), dismiss button (≥1 step complete sonrası), 100% complete success state (PartyPopper + lime tint kutlama). Loading skeleton, error fallback. (5) **`/[locale]/dashboard/page.tsx`** — owner home `<OnboardingNudge>` altına `<ActivationChecklistCard restaurantId={user.restaurants[0].id} />` mount, primary restaurant scope. ChatGPT'den **4 sıkılaştırma** (CLAUDE.md §19.5): schema sadeleşmesi, qrDownloadedAt field çıkarma, Suggested Actions ayrı kart yapmama (checklist incomplete step + CTA yeterli), permanent sidebar item eklememe. **Wave B backlog** (Prompt 3 lifecycle email): `LifecycleEmailLog` + 4 yeni email + cron — activation result'ı tüketir.
- **Phase 11.28 (PR #317, branch `claude/platform-redirect-broken-skip`)**: Wave 4 — broken-skip downstream (CLAUDE.md §19.4.5). Wave 1-2-3'ü bağlayan son halka. (1) **`/api/restaurants?slug=` GET endpoint** — son 24 saatlik `PlatformLinkCheck` satırlarından provider başına latest sonucu attach edildi. Tek extra Prisma query (`findMany take: 100 where: {restaurantId, checkedAt: gte 24h}`) + JS reduce. Edge cache (60s/300sw) korunur. (2) **`/r/[slug]/page.tsx`** — `RestaurantData` interface'ine `latestChecks?: Record<string, { ok, checkedAt: string }>` eklendi. Resolver çağrısından önce `Map<provider, { ok, checkedAt: Date }>` construct edip `resolveBestRedirectPlatform({ ..., latestChecks })` parametresine geçirilir. Wave 3b'de undefined geçiriliyordu (legacy davranış); Wave 4'te dolu Map → broken-skip aktif. (3) **Resolver kontratı dokunulmadı** — Wave 3b'de `latestChecks` opsiyonel parametre olarak tasarlanmıştı, broken-skip 24h windowed mantık zaten implementasyonda. Sadece downstream pipe açıldı. **Etki**: cron 24 saat içinde fail eden provider'ı tespit ediyor → müşteri o platforma yönlendirilmiyor → fallback chain (default → sector_priority → any_active) işliyor. Pre-Wave-2 deploylarda (cron yok) `latestChecks` boş → legacy davranış (broken-skip yok), backwards-compat intact. **36 unit test** (Wave 3b'de yazılmış) yeterli — broken-skip 24h içi vs eski farkı zaten kapsanıyor. **Out of scope**: payload'a `error/latencyMs/statusCode` ekleme (KVKK + payload bloat); bunlar zaten owner panel `/checks` endpoint'inde (CLAUDE.md §19.4.1).
- **Phase 11.27 (PR #316, branch `claude/owner-shell-restore`)**: Owner panel shell restore. PR #312 "chore(shell)" simplification commit'i ile collapsible group'lar + integrations/platforms/announcements/notifications nav item'ları + topbar `<NotificationBell>` + `<TrialBanner>` + Cmd+K command palette kayboldu. Kullanıcı geri istedi → Phase 11.10 + 11.11 + 11.20 canonical hâli `git show 4153341:UserDashboardShell.tsx` ile restore edildi. **`createdAt` prop kaldırıldı**: kullanıcı `layout.tsx`'i `createdAt` pass etmeden basitleştirdi → shell `DashboardUser` interface'inden `createdAt` field'ı çıkarıldı; eski "ilk 30 gün Guide gizle" useMemo'su `showGuide = true` constant'a dönüştü (Guide nav her zaman görünür). Wave 2 (PR #315) merge sonrası rebase'le çakışma temizlendi — bu PR'da sadece shell modifikasyonu (1 dosya).
- **Phase 11.26 (PR #315, branch `claude/platform-link-cron`)**: Otomatik retest cron + health API (CLAUDE.md §19.4.4, Dalga 2/3 plan). (1) **`POST /api/cron/platform-link-retest`** — günde 1 kez (`0 4 * * *` UTC, vercel.json) tüm aktif restoranların aktif platform link'lerini test eder, sonuçları `PlatformLinkCheck`'e `source: 'cron'` ile yazar. `Authorization: Bearer ${CRON_SECRET}` guard, BATCH_SIZE=25, `maxDuration: 300`, Promise.allSettled per-row isolation. `runPlatformLinkRetest()` shared helper export edildi (admin manuel trigger ileride). (2) **`GET /api/restaurants/[id]/integrations/health`** — owner-scoped IDOR endpoint, per-provider `{ url, enabled, latestCheck }` + sektör-bazlı `missingRecommended` array + aggregate `counts` (active/inactive/untested/healthy/failing) + sektör adı. ChatGPT'nin önerdiği `healthScore: 78` field'ı **çıkarıldı** — formül subjective, drift kaynağı. UI client-side derive. (3) **`vercel.json`** `crons` array'ine yeni schedule. **Wave 4 enablement**: cron sayesinde latestChecks tüm aktif platformlarda günlük doluyor → resolver broken-skip Wave 4'te aktivasyon kazanır. **Maliyet**: günde ~200-300 outbound HEAD/GET request/gün + 1 Vercel function invocation/gün — marjinal. Wave 1 retest endpoint kontratı dokunulmadı.
- **Phase 11.25 (PR #314, branch `claude/platform-redirect-resolver`)**: Public review platform resolver (CLAUDE.md §19.4.3, Dalga 3b/3 plan). (1) **`src/lib/platform-redirect-resolver.ts`** — saf `resolveBestRedirectPlatform({ restaurant, requestedProvider?, latestChecks?, brokenWindowHours?, now? })`. DB çağrısı yok, deterministik. 5-tier resolution chain: `requested → default → sector_priority → any_active → no_platform`. ChatGPT'nin önerdiği imza birebir uygulandı. (2) **`tests/platform-redirect-resolver.test.ts`** — 20 unit test (Node test runner, CLAUDE.md §32 pattern), 36 toplam test pass (16 oauth + 20 yeni). Coverage: requested usable / URL yok / disabled / sektör fallback / hospitality önceliği / any_active / no_platform / broken-skip 24h içi vs eski / boş latestChecks / PlatformId trendyol normalize / unknown provider / default disabled. (3) **`/r/[slug]/page.tsx` integration** — `platformUrls + platformParam` lokal logic silindi, tek `resolveBestRedirectPlatform` çağrısı. `targetPlatformUrl = resolution.url`, `fallbackPlatformId = resolution.provider ?? 'google'`. Feedback POST `platform` field'ı `resolution.provider` (gerçek yönlendirilen platform; legacy 'google' fallback'i kaldırıldı, semantik düzgün). (4) **`/api/restaurants?slug=` GET endpoint** — defensive select'e 8 enabled flag eklendi (CLAUDE.md §14.1 pattern). **Bonus bug fix**: owner panelden bir platformu toggle off etse de eskiden public surface URL'i kullanıyordu, şimdi `resolver` `enabled: false` provider'ı atlıyor → owner toggle gerçek public davranışa yansır. (5) **RestaurantData interface** — 8 opsiyonel enabled field. **Wave 4 backlog**: `latestChecks` slug GET'ten public surface'a downstream — broken-skip aktivasyonu (resolver kontrat değişmez, sadece caller `Map` construct eder). Wave 3b'de `latestChecks: undefined` (boş) → legacy broken davranış intact, kazandırılan görünür değer sadece **sektör priority** (örn. otel + Google place ID boş + Tripadvisor URL dolu → eskisi thanks-only, şimdi tripadvisor redirect).
- **Phase 11.24 (PR #313, branch `claude/platform-redirect-analytics`)**: Platform redirect analytics + owner panel section (CLAUDE.md §19.4.2, Dalga 3a/3 plan). (1) **`PlatformRedirectEvent` Prisma modeli** — `[restaurantId, provider, createdAt]` + `[restaurantId, createdAt]` index. provider + source + userAgent (@db.Text) + Restaurant cascade. ChatGPT'nin önerdiği `qrCodeId/feedbackId/campaignId/ipHash` field'ları çıkarıldı (taşınan data yok + KVKK gereksiz IP). (2) **`src/lib/platform-redirect.ts`** + **`POST /api/platform-redirect`** — public fire-and-forget log endpoint, rate limit 60/dk/IP (qr-scan ile uyumlu). Server-side 302 değil — client `window.location` korunur (mevcut redirect akışı intact, open-redirect imkansız). Inactive slug → silent 200 (fingerprinting önleme). Provider/source whitelist dışında silent reject (attack surface). (3) **`/r/[slug]/page.tsx` entegrasyon** — `triggerHighRedirect` içinde `setRedirecting` öncesi fire-and-forget POST + `keepalive: true` (page unload'da bile gönderilir). (4) **`GET /api/restaurants/[id]/redirect-stats`** — owner-scoped IDOR endpoint, `?range=7d|30d|all`. Response: `{ totals: { last7Days, last30Days }, byProvider, topProvider, windowStart, windowEnd }`. 7d/30d sabit + groupBy range'e göre Promise.all aggregate. No public cache (KVKK + IDOR). (5) **`<PlatformRedirectsPanel />`** yeni Pulse SettingsCard — 3 stat tile (7d/30d/Top platform) + range toggle + provider breakdown progress bar list. `<PlatformChip>` + `<Eyebrow>` + `bz-card` + `bz-skeleton` primitive'leri. settings hub'ta `<BusinessIntegrationSettings>` altına mount. **Out of scope** (Wave 2 cron + Wave 3b resolver): `resolveBestRedirectPlatform` helper sektör priority + broken-skip; `vercel.json` cron schedule + `CRON_SECRET` guard. Public review akışı dokunulmadı (sadece tracking POST eklendi, target URL hâlâ DB'den).
- **Phase 11.23 (PR #312, branch `claude/platform-link-persist`)**: Persistent platform link tests + manual retest (CLAUDE.md §19.4.1, Dalga 1/3 plan). (1) **`PlatformLinkCheck` Prisma modeli** + `[restaurantId, provider, checkedAt]` + `[provider, checkedAt]` index'leri. URL snapshot + ok + statusCode + latencyMs + error (@db.Text) + source ('manual' | 'cron' | 'retest_all'). Restaurant relation cascade. (2) **`src/lib/platform-link-test.ts`** helper — `runPlatformLinkTest({ restaurantId, provider, url, source?, timeoutMs?, persist? })`. Domain check → HEAD (5s) → GET fallback → DB persist → normalize result. `PROVIDER_MAP` const'ı (13 entry) Restaurant URL/enabled field mapping. Hem manuel test endpoint'i hem retest hem gelecek cron (Dalga 2) bunu çağırır. (3) **Test endpoint refactor** (`/api/restaurants/[id]/integrations/[provider]/test`) — inline 100+ satır logic helper'a taşındı, response shape korundu + yeni `checkedAt` field eklendi. (4) **`POST /api/restaurants/[id]/integrations/retest`** — yeni endpoint, IDOR + rate limit 5/dk/restoran, `Promise.allSettled` paralel test (per-row isolation), `maxDuration: 30`. Aktif tanımı: yorum platformları enabled+URL, sosyal/website URL non-empty. (5) **`GET /api/restaurants/[id]/integrations/checks`** — yeni endpoint, last 200 row + JS-side reduce → provider başına latest check (tek query, 13 round-trip yerine). (6) **`BusinessIntegrationSettings` UI** — `testResults` state kaldırıldı, `latestChecks: Record<provider, LatestCheck>` tek source. Mount'ta GET fetch + URL change'de stale invalidation. Üstte intro + "Tümünü yeniden test et" buton (Loader2 spinner) + AlertBanner kind="info" güncellenmiş ("Bazı platformlar otomatik testleri engelleyebilir; başarısız test her zaman bağlantının tarayıcıda kırık olduğu anlamına gelmez"). IntegrationCard'a `latestCheck` + `locale` prop, eski `<TestResultLine>` → yeni `<LatestCheckLine>` (relative time + status code + latency, locale-aware "az önce / 2 sa önce / 3 gün önce"). `runTest` + `handleRetestAll` her ikisi de `dirty || retestingAll || testing !== null` mutual exclusion. **Out of scope** (Dalga 2/3): Health API + cron + redirect analytics + resolver — ayrı PR'larda. Backend kontratı: test response shape (mevcut UI tüketicisi) korundu, sadece `checkedAt` field eklendi (UI tüketici opt-in). DB write fail UI'ı kırmaz (`console.error` + sonuç yine return).
- **Phase 11.22 (PR #311, branch `claude/analyze-design-code-BoPyo`)**: Platform Bağlantıları rename + 2-tier link quality (CLAUDE.md §19.4). (1) **Rename** owner-facing only — `UserDashboardShell` (`copy.integrations` + breadcrumb mapping), `restaurants/[id]/settings/page.tsx` (`SECTION_TABS` entry + `<SettingsSection eyebrow + title>`), `BusinessIntegrationSettings` (doc comment + success toast locale-aware). URL path'leri (`/integrations`, `/api/.../integrations/test`), `section=integrations` query param, file/component isimleri, marketing translations (`pricing_feature_api`, `cta_badge2`) **dokunulmadı** — internal stabilite + marketing ayrı kapsam. Command palette keywords array'i `['entegrasyon', 'integration', ...]` legacy term'leri korur (eski terminoloji ile arama yapan owner için). (2) **`integration-domains.ts` genişletildi (yeni dosya YOK, §7)** — `DomainCheckResult` artık `severity: 'error' | 'warning'` + 5-reason union (`invalid_url`, `wrong_protocol`, `wrong_domain`, `generic_homepage`, `not_review_link`). `PATH_RULES` const'ı 6 review provider için substring heuristic (yemeksepeti `/restaurant/`, tripadvisor `/Restaurant_Review-`, vb. — §19.4 tablo). `describeDomainError` 2 yeni branch (TR/EN parity). Test endpoint (`/api/restaurants/[id]/integrations/[provider]/test`) kontratı **dokunulmadı** — domain mismatch zaten 200 + `ok: false` + i18n error döndürüyor; warning'ler reachability'i engellemez. (3) **`BusinessIntegrationSettings` UI** — `fieldErrors: Partial<Record<key, string>>` → `fieldQuality: Partial<Record<key, { result, provider, message }>>`; `hasFieldErrors` → `hasHardErrors` (sadece `severity === 'error'` save block); `IntegrationCard` `fieldError` prop → `quality` prop; `<Field error>` sadece error satırı, warning ayrı amber inline `<AlertTriangle size={12}>` + `text-[#92400E]` satırı (Pulse warn token); `testDisabled` artık warning'lerde de izin verir (sadece error block); üstte intro paragrafı + `<AlertBanner kind="info">` "Resmi API senkronizasyonu ayrı yapılandırılır" notu locale-aware. Mevcut DefaultRedirectPicker + 3 SettingsCard yapısı + IDOR + Zod intact. ChatGPT'nin orijinal önerisinden **3 sıkılaştırma**: yeni dosya yerine helper genişletme (CLAUDE.md §7), 7-status → 5-status (gereksiz `missing`/`needs_review`/`valid` çıkarıldı), 6-field result → 4-field (severity/reason/hostname/expected; i18n message caller-side `describeDomainError`).
- **Phase 10+ (out-of-scope backlog)**: Settings stub pages content (Brand/Integrations/Rules/Team/Billing/Notifications/API), Storybook coverage, visual regression testing (Percy/Chromatic), Mobile native wrap (Capacitor/Expo), Superadmin onboarding flow. **Senior audit kalan bulguları** (Phase 11.4+ candidates): 5+ raw form set (label+input pair) → `<Field>` primitive (admin/users modal field'ları, admin/announcements modal field'ları, admin/restaurants modal field'ları); off-palette renkler (slate-800, blue-50, emerald, amber inline) → Pulse palette remap; sortable table'larda `aria-sort`.

### 23.8 Dokunulmayan eski Pulse

`.design/` v1 (CLAUDE.md §16), `.pulse-*` CSS class'ları, `.bz-fade-up / .bz-scale-in / .bz-float / .animate-marquee / .animate-slide-in / .pulse-heartbeat` keyframe'ler korundu — marketing/blog/help center hâlâ kullanıyor. Yeni panel kodu için **`bz-*` panel system tercih edilir**, ama mixed kullanım marketing'de OK.

---

## 24. Public QR Generator Sayfası (`/solutions/qr-generator`)

Footer'da "Ücretsiz QR üret" linki bu sayfaya bağlanır. Marketing aracı — login gerektirmez, backend dokunmaz, tamamen client-side. Tasarım kaynağı: `.design/site/site-more.jsx` `QRGeneratorPage` (line 7-92).

### 24.1 Yapı (1:1 design parity, 2026-04)

| Katman | Dosya | İçerik |
|---|---|---|
| Sayfa wrapper | `src/app/[locale]/solutions/qr-generator/page.tsx` | SEO metadata, JSON-LD (WebApplication + BreadcrumbList), MarketingNavbar/Footer, hero + form mount noktası |
| Form + preview | `src/components/marketing/QRGeneratorForm.tsx` | 2-col grid: FAFAFA form box (sol) + tema kartı + PNG/PDF (sağ) |

**Sayfa yapısı** (design 1:1):
1. Hero: `pulse-eyebrow` "ÜCRETSİZ ARAÇ" + `text-[68px]` h1 "QR kod oluşturucu." + 560px subtitle. **Centered**, padding `60px 48px 40px`.
2. Generator: `max-w-[1200px]` container, 2-col grid (`grid-cols-2 gap-10`), no outer card.

**Sol form** (`bg-[#FAFAFA] border-[#EDEDED] rounded-[18px] p-8`):
- Heading: "1. Bilgilerini gir" (Space Grotesk 24px, weight 600)
- 4 field stack (gap 18):
  - **İŞLETME ADI** — text input (max 60 char), preview card eyebrow için
  - **GOOGLE YORUM LİNKİ** — URL input (required), QR'ın hedef URL'i. Mono font, `g.page/r/CZEa4X...` placeholder
  - **ÖN YAZI** — text input (max 48 char), preview card headline için
  - **TASARIM ŞABLONU** — 4-pill radio: Beyaz / Lime / Koyu / Minimal
- CTA: dark pill `QR kodu oluştur →` (form submit → URL normalize + state set)

**Sağ preview**:
- Heading: "2. Önizle ve indir"
- Tema kartı (default lime), `aspect-ratio: 3/4`, `clamp(20px, 5vw, 40px)` padding:
  - Top: eyebrow (uppercased businessName veya "BUAZE", JetBrains Mono 10px, opacity 0.6)
  - Mid: headline (Space Grotesk `clamp(22px, 4vw, 38px)` 500 weight, `whitespace-pre-line`, kullanıcı `\n` ile satır kırabilir)
  - QR card: white rounded-2xl + canvas (`120px` mobile, `160px` desktop)
  - Bottom: "BUAZE · TARA ✦ PAYLAŞ" (mono 10px, opacity 0.6)
- 2-col download row: PNG (`bg-[#0A0A0A]` dark pill) + PDF (`border-[#0A0A0A]` outline pill)

### 24.2 4 tema paleti (`TEMPLATES` constant, `QRGeneratorForm.tsx:14`)

| Tema | Card BG | Foreground | Border | Eyebrow opacity |
|---|---|---|---|---|
| `beyaz` | `#FFFFFF` | `#0A0A0A` | `#E5E5E5` | rgba(10,10,10,0.55) |
| `lime` (default) | `#C6F24E` | `#0A0A0A` | transparent | rgba(10,10,10,0.6) |
| `koyu` | `#0A0A0A` | `#FFFFFF` | transparent | rgba(255,255,255,0.55) |
| `minimal` | `#FAFAFA` | `#0A0A0A` | `#EDEDED` | rgba(10,10,10,0.55) |

QR canvas her zaman `#0A0A0A` dark + `#FFFFFF` light (tarama uyumluluğu için sabit). Tema değişimi sadece outer card + text + footer/eyebrow rengini etkiler.

### 24.3 PDF download (no-dep paterni)

CLAUDE.md §7 minimum-dependency disiplinine uyumlu: `jspdf` / `pdf-lib` eklenmedi. Bunun yerine `window.open()` + canvas dataURL + `window.print()` paterni:

1. `canvas.toDataURL('image/png')` ile QR'ı dataURL'e çevir
2. Yeni pencere aç, içine standalone HTML yaz: tema'ya göre stillenmiş card + img + footer
3. `@media print { @page { size: A5 portrait; margin: 12mm; } }` — A5 dikey baskı için
4. `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 250))</script>` — sayfa yüklenince yazdır dialogu açılır
5. Kullanıcı tarayıcıdan "Save as PDF" seçer

**XSS guard**: businessName ve message kullanıcı input'u — yeni pencere HTML'ine yazılmadan önce `escapeHtml()` ile sanitize edilir (`QRGeneratorForm.tsx:23-26`).

### 24.4 Design parity karar tablosu (kalkan kararlar)

| Karar | Sebep |
|---|---|
| Eski Benefits section ("Neden Buaze" 3-card grid + register CTA) **silindi** | Design'da yok. 1:1 parity. SEO meta (JSON-LD) zaten sayfa-seviyesinde yeterli. |
| Eski "Bağlantınızı girin" white-card wrapper **silindi** | Design'da form FAFAFA box, dış wrapper yok. |
| Eski helper checklist (3 madde "Yalnızca bu URL için...") **silindi** | Design'da yok; 4-field form doluluğu zaten yeterli. |
| 4 input field eklendi (eski sadece URL + submit'ti) | Design 4 alan gösteriyor. Kullanıcı preview kartını özelleştirebilir. |
| Tema picker (4-pill) eklendi | Design'da default Lime aktif. UX olarak diğerleri de seçilebilir yapıldı. |
| PDF download eklendi (`window.print` paterni) | Design'da "PDF olarak" butonu var. |
| Hero'daki SVG grid pattern **silindi** | Design hero'su sade, pattern yok. |

### 24.5 Çağıranlar

`MarketingFooter.tsx:45,82` + `MarketingNavbarClient.tsx:124` + `MobileBottomNav.tsx:57` — 4 yerden link verilir. Component'in public API'si değişmedi (`{ locale: Locale }`), call site'ları dokunulmaz.

### 24.6 Yeni tema veya alan eklerken

- **Yeni tema**: `TEMPLATES` const'ına entry ekle (`QRGeneratorForm.tsx:14`) + form'daki tasarım pill grid'ine 5. button ekle. PDF print template'i `palette.card / fg / border / eyebrow` field'larını okur, otomatik uyumlu.
- **Yeni form alanı**: 4-field stack zaten yoğun; eklemek gerekirse design'a sadık kal — yeni alan preview'a görünür değer katıyor mu? Aksi halde scope creep.
- **Backend entegrasyon**: Bu sayfa kasıtlı olarak login-free. Buaze hesabıyla bağlamak istenirse ayrı `/dashboard/qr-quick` veya benzeri rota olur. Marketing tool ile dashboard arasında köprü kurma — UX hedefi: "hesap açmadan dene".

### 24.7 Mobil davranış (2026-04 §25 pas 3)

- **Form / Preview sırası**: Tasarım desktop'ta sol-form / sağ-preview 2-col. Mobilde DOM'a sadık kal — form `lg:order-1`, preview `lg:order-2` (mobile için `order-*` yok). Form numaralandırması "1. Bilgilerini gir" → "2. Önizle ve indir" doğal okuma sırasında akar. **Yapma**: mobilde preview'ı önce gösterme — kullanıcı boş input'a bakmadan default preview görüyor, kafa karıştırıcı.
- **Tasarım şablon grid**: `grid-cols-2 sm:grid-cols-4` — 320px iPhone SE'de "Minimal" butonu 4-col'da taşıyordu, 2x2 grid'e geçtik. Tablet+'da yine 4-col yan yana.
- **Hero metrikler**: padding `px-5` (mobil), h1 `text-[38px] leading-[1.02]` (320px ekranda "QR kod oluşturucu." satırının nefes alması için 1'den biraz daha rahat), subtitle `text-[15px]/1.6` (site genelindeki mobil subtitle standardı).

---

## 25. Mobil Uyum Pas — `buaze-mobil` Design Handoff (2026-04-27)

Claude Design'dan gelen **`buaze-mobil`** handoff bundle (`/tmp/buaze-design/buaze-mobil/`, prompta tar.gz olarak yüklendi — git-tracked değil) marketing surface'lerinin mobil deneyimi için spec sundu. Native uygulama yok; tek hedef **responsive web**'de mobil metriklerini tasarımla 1:1 hizalamak. Bundle 1 README + 1 chat transcript + 5 prototip dosyası içeriyor (`buaze.html`, `layout.jsx`, `home.jsx`, `pages.jsx`, `app.jsx`). Hash-routed React 18 + Babel CDN prototipi — `src/`'ye kopyalanmaz, yalnız metrik referansı.

### 25.1 Mevcut mobil altyapı (zaten yerinde)

- **MobileBottomNav** (`src/components/marketing/MobileBottomNav.tsx`) — `md:hidden` 5-item bar, center FAB, safe-area inset
- **MarketingNavbarClient** (`src/components/marketing/MarketingNavbarClient.tsx`) — sağ-anchor mobil drawer, body scroll lock, ESC handler, 4 accordion section
- **MarketingFooter** — 2-col mobile grid, ECG divider, newsletter form
- **HomeHeroDashboard** + **HomeIndustryTabs** + diğer home section'ları — Tailwind responsive (sm/md/lg) sınıflarıyla zaten mobile-first
- Pulse design system §11 token'ları (graphite/lime/pure white) ortak — mobil ekstra palet yok

Mobil pass kapsamı: **küçük metrik düzeltmeleri + smooth motion** (yeni component değil, refactor değil).

### 25.2 Uygulanan değişiklikler

1. **`globals.css` mobil utility'leri** (§25 ortak block, mobile media query altında):
   - `.no-scrollbar` — yatay chip strip + drawer + kategori scroll'unda gizli scrollbar
   - `.pb-safe` / `.pl-safe` / `.pr-safe` — iOS notch/home-indicator için safe-area inset utility'leri (Tailwind padding'leriyle compose olur)
   - `.accordion-body` + `.open` — mobil drawer section expand/collapse smooth max-height transition (cap 720px, en uzun "Solutions" 8-item + CTA için yeterli). `prefers-reduced-motion: reduce` altında transition off.

2. **MobileBottomNav merkez butonu — 52x52** (`MobileBottomNav.tsx:91-96`):
   - Önceden: `w-12 h-12` (48px) + `shadow-[0_4px_12px_rgba(198,242,78,0.45)]`
   - Şimdi: `h-[52px] w-[52px]` + `shadow-[0_4px_16px_rgba(198,242,78,0.5)]`
   - Tasarımda `width:52, height:52, marginTop:-20, boxShadow:0 4px 16px rgba(198,242,78,0.5)` — birebir hizalandı. `-mt-5` (=20px) marjı korundu, FAB bar'ın üstünden 4px daha yukarı taşıyor.

3. **MarketingNavbar mobil drawer akıcılık** (`MarketingNavbarClient.tsx`):
   - `MobileSection` artık `{open && <div>}` hard-cut yerine `<div className={accordion-body${open?' open':''}}>` kullanıyor — 0.3s ease max-height transition.
   - Dış scroll container'a `no-scrollbar` eklendi → drawer içinde scroll çubuğu görünmez.

4. **HomeIndustryTabs scroll bar gizleme** (`HomeIndustryTabs.tsx:102`):
   - `overflow-x-auto` → `no-scrollbar overflow-x-auto`. Chip strip mobilde tasarımdaki gibi temiz kayar.

5. **Hero h1 mobil baseline** (`page.tsx:249`):
   - `text-[40px]` → `text-[38px]` (sm+ aynı kaldı). Tasarımdaki `clamp(38px, 7vw, 76px)` taban değeriyle eşleşti — 375px iPhone SE'de 1px daha kompakt, satır kırılması daha güvenli.

### 25.3 Korunan davranışlar

- Mobil drawer body scroll lock (zaten vardı) — değişmedi
- ESC + backdrop click kapatma — değişmedi
- `safe-area-inset-bottom/left/right` inline padding'ler MobileBottomNav ve drawer'da hâlâ inline (yeni utility class'ları ile dual-pattern; refactor zorlaması yok, mevcut inline düzgün çalışıyor)
- `prefers-reduced-motion: reduce` — yeni `.accordion-body` da bu media query altında transition'ı kapatır (mevcut motion off blanket'iyle tutarlı)

### 25.4 Tasarım metriği eşleme tablosu

#### Pas 1 — temel metrikler (PR #118)

| Tasarım metriği (`buaze-mobil`) | Eski değer | Yeni değer | Dosya |
|---|---|---|---|
| Bottom nav center FAB | 48x48, shadow blur 12 | 52x52, shadow blur 16 | `MobileBottomNav.tsx` |
| Drawer accordion expand | hard cut | 0.3s ease max-height | `MarketingNavbarClient.tsx` |
| Drawer scroll container | scrollbar görünür | `no-scrollbar` | `MarketingNavbarClient.tsx` |
| Industry tab strip scroll | scrollbar görünür | `no-scrollbar` | `HomeIndustryTabs.tsx` |
| Hero h1 mobile baseline | 40px | 38px | `app/[locale]/page.tsx` |

#### Pas 2 — 1:1 hizalama (kullanıcı talebi: "birebir aynı yap")

| Tasarım metriği | Eski | Yeni | Dosya |
|---|---|---|---|
| Bottom nav active indicator | sol-aligned (centering bug), `rounded-b-full` | `left-1/2 -translate-x-1/2`, `rounded-b-[2px]` (2px corners only) | `MobileBottomNav.tsx` |
| Bottom nav icon stroke | `active ? 2.25 : 2` (kalınlaşıyordu) | `2` her durumda (renk değişimi yeter) | `MobileBottomNav.tsx` |
| Hero h1 line-height (mobile) | 1.05 | **0.95** | `page.tsx` |
| Hero subtitle (mobile) | 16px / 1.55 | **15px / 1.6** | `page.tsx` |
| Logo strip padding-y | 20px (`py-5`) | 16px (`py-4`) | `page.tsx` |
| Three Steps card bg | `#FAFAFA` | **`#fff`** (`bz-card`) | `page.tsx` |
| Three Steps card radius | 18px | **16px** (`bz-card`) | `page.tsx` |
| Three Steps illustration | `size={180}` | **`size={160}`** | `page.tsx` |
| Three Steps grid | `grid-cols-1 md:grid-cols-3` | **`auto-fit, minmax(260px, 1fr)`** (tablet 2-up otomatik) | `page.tsx` |
| Three Steps grid gap | `gap-6` (24px) | **`gap-5`** (20px) | `page.tsx` |
| Three Steps h2 mobile | 32px | **28px** | `page.tsx` |
| Three Steps h3 mobile | 24px | **20px** | `page.tsx` |
| Three Steps body mobile | 15px / 1.55 | **14px / 1.6** | `page.tsx` |
| Dark Feature h2 mobile | 36px | **28px** | `page.tsx` |
| Dark Feature features grid | `grid-cols-1 sm:grid-cols-2` | **`grid-cols-2`** her viewport | `page.tsx` |
| Dark Feature checkmark | 24x24 (`w-6 h-6`) / 12px text | **22x22 / 11px text** | `page.tsx` |
| Google Safe h2 mobile | 36px | **26px** | `page.tsx` |
| Bento section bg | beyaz | **`#FAFAFA`** | `page.tsx` |
| Bento h2 mobile | 30px | **26px** | `page.tsx` |
| Industry Tabs h2 mobile | 36px | **26px** | `page.tsx` |
| QR Teaser h2 mobile | 28px | **24px** | `page.tsx` |
| Case Study h2 mobile | 36px | **26px** | `page.tsx` |
| Case Study illustration | `size={340}` | **`size={280}`** | `page.tsx` |
| CTA Banner h2 mobile | 36px | **28px** | `page.tsx` |
| Section padding-x mobile | `px-6` (24px) | **`px-5`** (20px) — tüm section'larda tasarım `clamp(20px,5vw,64px)` taban değeri | `page.tsx` |
| Section padding-y mobile | `py-20` (80px) | **`py-[60px]`** — tasarım `clamp(60px,8vw,112px)` taban değeri | `page.tsx` |

#### Pas 3 — diğer marketing sayfaları yayılımı

§25 standardı homepage'den 6 ek marketing sayfasına yayıldı: `pricing`, `about`, `contact`, `blog`, `faq`, `help`. Her sayfada aynı hex / boyut formülü uygulandı:

| Pattern | Eski | Yeni | Etkilenen sayfa sayısı |
|---|---|---|---|
| Section padding-x mobile | `px-6` (24px) | `px-5` (20px) | 6/6 (toplam ~25 instance) |
| Section padding-y mobile | `py-16/20/24` | `py-[60px]` (clamp tabanı) | 6/6 |
| Hero h1 mobile | `text-[40px]` veya `text-[44px]` | `text-[38px]` | 6/6 |
| h1 leading mobile | `leading-[0.98]` | `leading-[0.95]` | 3/6 (pricing/contact) |
| h2 mobile | `text-[32px]/[36px]` | `text-[26px]` | 4/6 (pricing/about/help bg sec'leri) |
| About number stat mobile | `text-[36px]` | `text-[28px]` | 1/6 |

**Yapma:** Yeni marketing sayfası eklerken `px-6 sm:px-10` veya `py-20 sm:py-28` paterni — her seferinde §25 standardı: `px-5 sm:px-10` + `py-[60px] sm:py-{20-28}` ve heading mobile boyutu max 38px (h1) / 26px (h2).

#### Pas 4 — MobileBottomNav globally mount + remaining marketing surfaces

§25 Pas 3 sonrası kapsanmamış 9+ marketing sayfası (`roi`, `google-compliance`, `careers`, `press`, `integrations`, `how-it-works`, `features`, `solutions` index, `customer-stories`, `compare`, `case-study`, ve 7 `solutions/*` alt sayfası) §25 standardına çekildi. Aynı dönüşüm: `px-6→px-5`, `py-{16/20/24}→py-[60px]`, h1 `40px→38px` mobile, content h2 `32px→26px` mobile, hero/CTA h2 `36px→28px` mobile, kart pattern'leri `bz-card` / `bz-card-soft` utility'lerine.

**MobileBottomNav globally mounted** (`src/components/marketing/MarketingFooter.tsx`):
- Daha önce yazılmış ama hiçbir yerden mount edilmemiş `MobileBottomNav` component'i (`src/components/marketing/MobileBottomNav.tsx`) `MarketingFooter`'ın return Fragment'ine eklendi → her marketing sayfası otomatik 5-item bottom nav alır (Ana Sayfa / Fiyatlar / center FAB / QR Kod / İletişim).
- Center FAB **conditional**: server-side `cookies()` + `verifyJwt(user_token | admin_token)` ile login state belirlenir → giriş yapılıysa "Panel" ikonu (`LayoutDashboard`) ve `/dashboard` yolu, aksi halde "Ücretsiz" ikonu (`Sparkles`) ve `/auth/register` yolu.
- Auth/onboarding/dashboard sayfaları `MarketingFooter` render etmediği için bottom nav otomatik dışarıda kalır — design kapsamı ile birebir.

**MobileBottomNav UX hardening** (design parity korunarak):
- `active:scale-95` tab item'larda + `active:scale-90` center FAB'da — haptic-feel press feedback
- `navigator.vibrate(8)` opsiyonel haptic tick (Android Chrome / PWA destekler; iOS Safari ignore eder, try/catch korumalı)
- `focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2` (FAB) ve `focus-visible:bg-[#FAFAFA]` (tab) — klavye kullanıcıları için görünür ring
- Active indicator opacity transition: route değişiminde 200ms fade-in (önceden hard-cut)
- `transition-colors duration-150` icon + label üzerinde — renk değişimi smooth (tasarım metrikleri 32×2 pin korundu)
- `prefers-reduced-motion: reduce` zaten globals.css blanket'ı tarafından kapatılır → erişilebilirlik native

#### Pas 5 — tablet portrait (iPad 768-1023px) sayfa-içi optimizasyon

PR #281 marketing chrome'unu (navbar / mobile bottom nav / footer) `lg:` breakpoint'ine taşıdıktan sonra sayfa-içi içerik tablet portrait'da optimize edildi. iPad portrait artık phone-style nav görüyor; bu pas h1 boyutu + grid kademe + menu Modern teması + admin tablo flip ile içeriği aynı tutarlı pattern'e çekti.

**Mevcut `sm:` ve `lg:` değerleri silinmedi** — sadece aralarına `md:` ara kademe eklendi. Mobile baseline (`text-[38px]`, `px-5`, `py-[60px]`) **dokunulmadı**.

**Hero h1 cascade kuralı (29 marketing instance):**

| sm: değeri | md: değeri (yeni) |
|---|---|
| `sm:text-[72px]` | `md:text-[56px]` |
| `sm:text-[68px]`, `sm:text-[64px]` | `md:text-[52px]` |
| `sm:text-[60px]`, `sm:text-[56px]` | `md:text-[48px]` |
| `sm:text-[44px]` ve altı | dokunulmadı (zaten makul) |

Tipik diff:
```
- text-[38px] sm:text-[64px] lg:text-[72px]
+ text-[38px] sm:text-[64px] md:text-[52px] lg:text-[72px]
```

**Pattern dönüşüm tablosu:**

| Pattern | Eski | Yeni | Etkilenen |
|---|---|---|---|
| Marketing 3-col cards | `grid-cols-1 md:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | ~14 sayfa |
| Marketing 4-col strip | `grid-cols-2 md:grid-cols-4` | `grid-cols-2 lg:grid-cols-4` | 3 sayfa (about, solutions, SolutionPageLayout) |
| Modern menu cards | `grid-cols-2 sm:grid-cols-3` | `grid-cols-2 lg:grid-cols-3` | `PublicMenuView` ModernLayout |
| Admin tablolar (≥6 kol) | `hidden md:block` / `md:hidden` | `hidden lg:block` / `lg:hidden` | restaurants, qr, customers, blog |

**Mobile vs tablet vs desktop metric tablosu:**

| Metrik | Mobile (<640) | Tablet (640-1023) | Desktop (≥1024) |
|---|---|---|---|
| Hero h1 max | 38px | 48-56px (`md:`) | 64-92px (`lg:`) |
| Section padding-x | `px-5` | `sm:px-10` | unchanged |
| Section padding-y | `py-[60px]` | `sm:py-{20-28}` | unchanged |
| Marketing chrome (PR #281) | drawer + bottom nav | drawer + bottom nav | inline navbar |
| Marketing card grid | 1-col | 2-col | 3-col |
| Admin tablolar (≥6 kol) | card-list | card-list | table |
| Modern menu grid | 2-col | 2-col | 3-col |

**Yapma:**
- `md:` ara kademe mobile baseline'ı **bozamaz** (`text-[38px]` her zaman default).
- `sm:` ve `lg:` değerleri **silinmez**.
- Section padding hex/spacing token'ları (§11) **değişmez**.
- Yeni utility class veya component eklenmez (className edit-only).
- Auth form (`max-w-[400px]`) / public review (`max-w-[360px]`) / onboarding step indicator (`sm:inline`) — **kasıtlı dar tasarım, dokunulmaz**.
- Panel sidebar (`hidden lg:flex`) — PR #281 chrome'uyla tutarlı, **dokunulmaz**.
- Stat card 4-col (`grid-cols-2 lg:grid-cols-4`) — zaten doğru, dokunulmaz.
- Admin tablolar `md:` kalır (≤5 kolon, yatay-scroll OK): `users`, `members`, `newsletters`, `dashboard`, `dashboard/qr`.
- Marketing alternating layout (`grid-cols-1 lg:grid-cols-[1fr_3fr]` vb.) — image+text dengesini koruma için tablet 1-col olarak **kalır**.

**Yeni pattern eklerken:** Aynı kuralı uygula. Yeni hero h1 ekleniyorsa cascade `text-[38px] sm:text-[X] md:text-[Y] lg:text-[Z]` yapısında 4 kademe, mobile-baseline 38px korunur.

### 25.5 Yeni mobil sayfa eklerken

1. **Tailwind responsive sınıfları** — flat default mobile, `sm:`/`md:` üzeri scaling. Site genelinde standart pattern.
2. **`no-scrollbar` + `overflow-x-auto` + `min-w-max`** — yatay chip/tab strip için.
3. **Bottom nav padding** — `pb-safe` veya inline `paddingBottom: env(safe-area-inset-bottom)`.
4. **Drawer/modal** — `accordion-body` yapısı section bazlı için ideal; full modal için mevcut `<Modal>` primitive (panel scope) tercih edilir.
5. **Touch target** — buton min 44x44px (Apple HIG) veya 48x48px (Material). Marketing CTA'lar zaten `min-h-[48px]`, korundu.
6. **Form input UX** — type=email input'larında `inputMode="email"` + `autoCapitalize="off"` + `autoCorrect="off"` + `spellCheck={false}`; tüm form input'lara mantığa uygun `enterKeyHint` (`"next"` ara alanlar, `"send"` son submit alan). type=tel için `inputMode="tel"`. Name input'larına `autoCapitalize="words"`. 5 ana form (login/register/forgot/reset + `/r/[slug]` feedback) örnek (Faz 3, PR TBD).
7. **iOS auto-zoom önlemi** — `<input>` font-size **mobilde min 16px**. `.bz-input` artık mobilde 16px (640px+ tablet'ta 13px, `globals.css` media query). Custom Tailwind class kullanan input'larda `text-[16px] sm:text-[14px]` pattern'i uygula (mevcut auth form'ları bu pattern'i kullanıyor).
8. **Image CLS** — Raw `<img>` kullanırken parent container'a aspect-ratio class'ı (`aspect-square`, `aspect-[4/3]`) zorunlu. CLAUDE.md §3 base64 data URL stratejisi `next/image`'la uyumsuz; aspect-ratio container layout shift'i sıfırlar. Mevcut menu surface bu pattern'i tutarlı uyguluyor.

### 25.6 Manuel cihaz testi protokolü

Bazı mobil davranışlar Chrome DevTools'ta replicate edilemez — gerçek cihaz veya emulator gerekir. Mobil regression öncesi smoke checklist:

**375px viewport (Chrome DevTools iPhone SE preset):**
- [ ] Tüm marketing sayfaları — overflow-x sıfır, hero h1 ≤ 38px, section padding `px-5 py-[60px]`
- [ ] Tüm panel sayfaları — sidebar drawer açılır, bottom nav 5-item görünür, tablo `lg:hidden` badges ile dikey stack
- [ ] Auth + onboarding — input'larda iOS auto-zoom yok, klavye keyboard hint'leri (Next/Send) doğru, form submit tek tap
- [ ] `/r/[slug]` review surface — yıldız tap, low-rating form, redirect overlay
- [ ] `/r/[slug]/menu` + `/menu/[slug]` — kategori chip'leri yatay scroll, ürün kart grid 2-col, modal bottom-sheet

**768/820px viewport (iPad portrait — Chrome DevTools iPad / iPad Air preset, §25.4 Pas 5):**
- [ ] Marketing hero h1 ≤ 56px (`md:text-[48-56px]` cascade aktif), 2-3 satırda görünür
- [ ] Marketing 3-col grid'ler 2-col render eder (`sm:grid-cols-2 lg:grid-cols-3`)
- [ ] Marketing 4-col strip 2-col render eder (`grid-cols-2 lg:grid-cols-4`)
- [ ] Marketing chrome (PR #281): drawer + bottom nav (inline navbar yok)
- [ ] Admin/dashboard ≥6 kolonlu tablolar card-list göstermek (restaurants, qr, customers, blog)
- [ ] Public menu Modern theme: 2-col card grid (lg+ 3-col)
- [ ] Section padding `sm:px-10` + `sm:py-{20-28}` aktif
- [ ] Auth form `max-w-[400px]` tek-sütun ortada — kasıtlı dar, **değişmedi**
- [ ] TR + EN parity: TR string'leri 2-col card'da overflow yok mu

**Gerçek cihaz testi (gerektiren scenarios, browser DevTools yetmez):**
- [ ] **iPhone Safari 17+** — safe-area inset (notch/home bar), iOS auto-zoom prevention (16px font), `inputMode` keyboard, deep link (`/r/[slug]?platform=google` → Google Maps app), PWA install prompt, `navigator.vibrate(8)` (Safari ignore eder, hata atmamalı)
- [ ] **Android Chrome 120+** — back button history (drawer açıkken), haptic vibrate FAB, bottom sheet swipe, PWA install banner
- [ ] **iPad Safari** (768px portrait) — drawer breakpoint (`md:` sm üstünde), grid 2→3 col, sidebar expand
- [ ] **QR scan flow** — gerçek kamera ile `/r/[slug]?source=camera` (DevTools simüle edemez)
- [ ] **Photo upload** (Dashboard > Brand) — mobile photo picker permission, HEIC → WebP conversion (`compressImage()` `client-image.ts`)
- [ ] **Geolocation** — onboarding ad/şube formunda location permission (varsa)

**Lighthouse mobil audit** (deploy sonrası):
- Performance ≥ 80, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms (Vercel Speed Insights §31 production data ile cross-check)

**Sentry mobile error rate** (Phase deploy sonrası 24h):
- iOS Safari + Android Chrome user agent'lı error oranı < %1
- `onRequestError` + `global-error.tsx` boundary'leri yakaladı mı

**Bilinen Faz log'u** (CLAUDE.md §25.8'de):
- Pas 1-4 (PR #118-119): hero + bottom nav + 4 marketing sayfa + 9+ marketing yayılım
- Faz 1-4 (PR #228 / TBD): case-study §25 padding fix, table no-scrollbar, bz-input iOS 16px, h1-h6 redundant fontFamily temizliği (-73 satır), 5 form'a inputMode/enterKeyHint, manuel test protokolü dokümantasyonu

### 25.7 Native app neden yok

Bundle README + user prompt: *"mobil uygulama değil responsive olacak sadece"*. Capacitor / Expo / RN wrap'i Phase 10+ backlog'da değil, açık-uçlu — gerekirse yeniden değerlendirilir. Şu an web-only mobil deneyim.

### 25.8 Tasarım kaynağı (referans, `src/`'ye kopyalanmaz)

`/tmp/buaze-design/buaze-mobil/` (Claude Design handoff bundle, **git-tracked değil**, lokal `.design/` analoji). 5 dosya: `buaze.html` (global CSS + Tailwind config + animation keyframe'leri), `layout.jsx` (BuazeNav + BuazeFooter + MobileBottomNav), `home.jsx` (HeroDashboard + IndustryTabs + 8 section), `pages.jsx` (Features/Pricing/Solutions/Blog/About/Contact/Help/FAQ), `app.jsx` (hash router). Pulse token'ları zaten `globals.css` `@theme {}` block'unda — yeni token tanımı yapılmadı. Logo `BuazeLogo.tsx` korundu, font'lar `layout.tsx`'te yüklü. Mobil pass kalıcı çıktıları: §25.2 listesi.

---

## 26. Sentry — Hata İzleme & Performans

`@sentry/nextjs` ^10.51 ile **production gözlem** katmanı. Server/edge runtime `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` ile init olur; client runtime `NEXT_PUBLIC_SENTRY_DSN` kullanır. Vercel Sentry Marketplace integration ayrıca source-map upload için `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` sağlayabilir. Lokal dev'de DSN yoksa SDK tamamen no-op.

### 26.1 Dosya yapısı (canonical SDK skill pattern)

| Dosya | Görev |
|---|---|
| `instrumentation.ts` | `register()` runtime'a göre lazy import + `onRequestError = Sentry.captureRequestError` (Next 15 unhandled server error hook, SDK >= 8.28) |
| `sentry.server.config.ts` | Server runtime init; DSN fallback `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN`; `includeLocalVariables: true` (stack trace'de local vars) |
| `sentry.edge.config.ts` | Edge runtime init; DSN fallback `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` |
| `instrumentation-client.ts` | Browser init + `Sentry.replayIntegration()` + `onRouterTransitionStart` |
| `src/app/global-error.tsx` | Branded safe-mode uncaught boundary; `reportBoundaryError('global-error-boundary', error)` + retry/home CTA |
| `next.config.ts` | Koşulsuz `withSentryConfig` wrap; auth token yoksa source-map upload silently skip |

### 26.2 KVKK / GDPR sapmaları (skill default'undan)

Resmi skill `sendDefaultPii: true` öner — restoran müşteri verileri için yasal risk. Bu projede:

- **`sendDefaultPii: false`** — IP / cookies / form bodies / user-identifiable headers Sentry'ye otomatik gönderilmez. Gerekirse explicit `Sentry.setUser({})` ile event başına eklenir, legitimate-interest review sonrası.
- **`replaysSessionSampleRate: 0`** — background session replay yok. Sadece `replaysOnErrorSampleRate: 1.0` ile hata anında 60 sn'lik replay yakalanır. Müşteri privacy footprint düşük, Sentry quota burn minimum.
- **`tracesSampleRate: 0.1`** prod (skill default `0.1`) / `1.0` dev — performance tracing %10 örneklem, free tier yeterli.

### 26.3 Tunnel route + Middleware

`tunnelRoute: '/monitoring'` ad-blocker'ları bypass eder — Sentry trafiği app origin'inden tünellenir. Mevcut middleware matcher `'/admin/:path*'`, `/monitoring` zaten dışarıda — exclude eklemeye gerek yok.

### 26.4 Smoke test

`GET /api/sentry-test` — kasıtlı 500 fırlatır (`Error: [Sentry smoke test] Synthetic error...`), tag `sentry.smoketest=true`. Production'da default disable, `ENABLE_SENTRY_TEST=1` env ile aç. Doğrulama için `SENTRY_DSN` veya `NEXT_PUBLIC_SENTRY_DSN` yeterlidir; endpoint kullanılınca Sentry'de 30 sn içinde issue oluşmalı. Doğrulama sonrası endpoint kullanılmaz, kalabilir.

### 26.5 Manuel capture pattern'leri (opsiyonel)

`onRequestError` çoğu server hatasını otomatik yakalar. Manuel capture sadece `try/catch` bloklarında veya warning-level event'ler için:

```ts
// Mail send fail (src/lib/email.ts)
Sentry.captureMessage('Mail send failed', { level: 'error', tags: { template, recipient_domain } });

// Pulse AI fallback (src/app/api/feedback/[id]/suggest-reply)
Sentry.captureMessage('OpenAI suggest-reply fallback', { level: 'warning' });

// Cron job catch
Sentry.captureException(error, { tags: { cron: 'monthly-newsletter' } });
```

### 26.6 Yapma

- `sendDefaultPii: true` set etme — KVKK ihlali. Spesifik bir event için PII gerekirse o event'e özel `Sentry.setContext('user', { ... })` kullan.
- `replaysSessionSampleRate > 0` set etme — session başı replay quota'yı patlatır + müşteri privacy footprint büyür.
- DSN'i koda commit etme — `process.env.SENTRY_DSN` referansı yeter, env Vercel project settings'te.
- Test endpoint'i production'da `ENABLE_SENTRY_TEST=1` bırakma — synthetic noise birikir.

### 26.7 Maliyet

Free tier: 5K error event + 10K transaction + 50 replay / ay. Mevcut Buaze trafiğine göre yıllar sürecek. Üst limit'e yaklaşırsa Sentry dashboard'da uyarı geliyor; o zaman plan upgrade veya `tracesSampleRate` düşür (`0.1` → `0.05`).

---

## 27. React Query + Radix UI — Infrastructure Dep'leri

İki yeni dep tek amaca hizmet eder: **panel performansı + a11y baseline**. CLAUDE.md §7 minimum-dep disiplinine aykırı değil çünkü bu **abstraction değil infrastructure** — her ikisi de mevcut pattern'leri replace etmek için değil, ortak ihtiyaçları tek noktadan çözmek için.

### 27.1 `@tanstack/react-query` (server-state)

**Sorun:** Admin + dashboard'da her component kendi `fetch + useState + useEffect` pattern'ini yazıyor. `dashboard/feedbacks/page.tsx` 800+ satır, 10+ ayrı fetch hook'u. Cache yok → her route geçişinde yeniden fetch (gereksiz Postgres round-trip + ms latency). Race conditions → kullanıcı 2 kez tıklayınca duplicate request.

**Setup:**
- `src/components/providers/QueryProvider.tsx` — `<QueryClientProvider>` wrap, `useState` ile single instance, default options:
  - `staleTime: 60_000` (60 sn fresh window)
  - `gcTime: 5 * 60_000` (5 dk cache GC)
  - `retry: 1` (transient hatalar için tek retry; 4xx loop'unu önler)
  - `refetchOnWindowFocus: false` (panel chart'ları ağır, focus'ta refetch istemiyoruz)
- `src/app/layout.tsx` root'ta `<QueryProvider>` ile children sarılı — tüm `[locale]` + `admin` + `r/[slug]` + `menu/[slug]` route'ları kapsar.
- Devtools: sadece `NODE_ENV !== 'production'`'da render (sağ-altta floating button).

**Migration pattern (PR PR ile):**
```ts
// Önce
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => { fetch('/api/X').then(r => r.json()).then(d => { setData(d); setLoading(false); }); }, []);

// Sonra
const { data, isLoading } = useQuery({ queryKey: ['x'], queryFn: () => fetch('/api/X').then(r => r.json()) });
```

**Yap:** Yeni client component eklerken `useQuery` ile başla. Mevcut fetch'leri opportunistic refactor — heavy admin sayfalarından başla (dashboard, feedbacks, analytics).

**Yapma:** Server component'lerde React Query — server-side fetch + Prisma direct kalsın, RQ sadece client-side için. SSR initial state için `dehydrate` / `hydrate` pattern'i gerekirse sonradan eklenir.

### 27.2 Radix UI primitive'leri (a11y headless)

Mevcut UI primitive'leri (`src/components/ui/Modal`, `Tabs`, vb.) elle yazılmış focus-trap + ARIA + ESC handler. Çalışıyor ama:
- Focus trap subtle bug'ları kolay (mod-tab ordering, refs, restoration)
- Screen reader announcement'lar manuel — `aria-live`, `role="dialog"` doğru kombinasyon zor
- Touch dismiss gestures yok
- Animated mount/unmount manuel state machine

**Eklenen primitive'ler:**
- `@radix-ui/react-dialog` — Modal + slide-over (mevcut `<Modal>` replace edilebilir)
- `@radix-ui/react-dropdown-menu` — Admin sidebar dropdown'ları
- `@radix-ui/react-tabs` — mevcut `<Tabs>` replace edilebilir (a11y baseline yükseltir)
- `@radix-ui/react-tooltip` — yardım metinleri için (henüz tooltip primitive yok)
- `@radix-ui/react-popover` — settings dropdown'ları, range pickers
- `@radix-ui/react-select` — form `<select>` replace (mobile-friendly + searchable)

Radix `Primitive.Trigger` / `Primitive.Content` headless component'ler — kendi className'imizi (`bz-card`, `bz-btn-primary`, vb.) Tailwind ile uygulayacağız.

**Yap:** Yeni complex UI (combobox, command palette, date range picker) eklemek gerekirse Radix primitive'inden başla, üstüne Tailwind ile Pulse styling.

**Yapma:** Mevcut `src/components/ui/*` primitive'lerini toplu Radix'e migrate etme — sadece a11y bug fix gerektiği veya yeni feature gerektirdiği yerlerde değiştir. Phase 7+ backlog: opportunistic Modal/Tabs migration.

### 27.3 Bundle size

| Lib | Gzip cost (~) |
|---|---|
| `@tanstack/react-query` | 13 KB |
| `@tanstack/react-query-devtools` | dev-only, prod bundle'da yok |
| `@radix-ui/react-dialog` | 8 KB |
| `@radix-ui/react-dropdown-menu` | 10 KB |
| `@radix-ui/react-tabs` | 4 KB |
| `@radix-ui/react-tooltip` | 6 KB |
| `@radix-ui/react-popover` | 7 KB |
| `@radix-ui/react-select` | 12 KB |
| **Toplam** | ~60 KB gzip (tree-shake'le sadece kullanılan kısım yüklenir) |

Mobil 3G'de ek ~150 ms parse, kabul edilir. Server-state caching kazançı bunu çoktan karşılar.

---

## 28. Backend Validation Strategy

Buaze 125+ API endpoint'i çoğunlukla elle validation kullanıyor (CLAUDE.md §6 `validations.ts`). Bu pattern bilinçli ve çalışıyor — **toplu refactor yok**. Zod opsiyonel ek katmandır, mevcut endpoint'leri zorla migrate etmez.

### 28.1 Kurallar

1. **Çalışan mevcut endpoint'leri elle, somut bir feature/bug fix için değiştirmiyorsan, oldukları gibi bırak.** Çalışan validation bozulmaz.
2. **Tüm endpoint'leri Zod'a otomatik migrate etme.** Toplu refactor scope creep'tir, regression riski büyüktür, code review yükü çoğaltır.
3. **Zod sadece yeni veya yüksek-risk modüller için.** Mevcut bir route'a sadece zaten o feature için PR açmışsan ekle.
4. **Zod tercih edilen alanlar:**
   - Google Business Profile entegrasyonu (gelecek)
   - Billing / subscription / invoice flow'ları (Iyzico Wave 3.5)
   - Campaign create / update
   - QR create / update
   - Onboarding multi-step state
   - Admin role / permission güncellemeleri
   - Webhook / API key oluşturma
   - Feedback submission (public, kullanıcı kontrolünde değil)
   - Karmaşık public form'lar
5. **Elle validation kabul edilebilir alanlar:**
   - Basit GET / list endpoint'leri
   - Health / status endpoint'leri
   - Cron health check'leri
   - Tek-iki alanlı küçük update/toggle endpoint'leri
6. **Yeni validation katmanı incremental, typed, küçük, Vercel serverless uyumlu olmalı.** Build-time generated runtime SDK'lar yok (tRPC), heavy decorator pattern'leri yok (NestJS).
7. **Büyük framework değişiklikleri yapma:** NestJS migration, tRPC migration, full NextAuth migration, BullMQ worker mimarisi — explicit istek olmadıkça **hayır**.

### 28.2 Helper: `src/lib/api/validate.ts`

Tek export: `validateBody(schema, body)` — Zod schema kabul eder, typed parsed data veya 400 response döner. Kullanım pattern'i:

```ts
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';

const Body = z.object({
  name: z.string().min(1).max(120),
  platforms: z.array(z.string()).max(10),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;
  // parsed.data fully typed — { name: string; platforms: string[] }
}
```

Hata response'u stable contract:
```json
{
  "error": "validation_error",
  "message": "Request body failed validation.",
  "issues": [{ "path": "platforms.0", "message": "..." }]
}
```

Client kod `error === 'validation_error'` ile auth (401) / authz (403) / server (500) hatalarından ayırt edebilir.

### 28.3 Yapma

- Mevcut endpoint'i Zod'a migrate ederken **ilgisiz refactor ekleme** (response shape değişikliği, error handling tweak, vb.) — minimum diff.
- `validateBody`'yi `@/lib/validations`'la karıştırma — eski elle helper'lar kalır, yeni Zod kullanımı için ayrı dosya.
- Form library (react-hook-form, @hookform/resolvers) ekleme — bu task **backend-only**. Frontend form'ları ayrı scope.
- Schema'ları ortak modüle çıkarmaya zorlama — 3+ yerden import edilene kadar route-local kalsın (CLAUDE.md §7 abstraction kaçınma ilkesi).
- Mevcut çalışan elle validation'ı toplu Zod'a migrate etme — 158 endpoint'in 60+'ı zaten elle validation iyi yazılmış, regression test maliyeti değerinden büyük.

### 28.3.1 Yeni endpoint disiplini (2026-05 — kanonik)

**Yeni route eklenirken `validateBody` ZORUNLU** (yeni kural):

```ts
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';

const Body = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().min(0).optional(),
}).strict();   // ← mass assignment kapatma

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;  // typed
  // ... business logic
}
```

**`.strict()` neden zorunlu**: Adım 4 audit'te `/api/onboarding/complete` mass assignment riski tespit ettik (saldırgan extra field `role: 'admin'` gönderebilir). `.strict()` schema dışı field'ı 400 ile reddeder.

### 28.3.2 High-risk route — Zod must-have

Yeni billing / oauth / mass action / admin destructive endpoint için Zod **zorunlu** (elle validation yetersiz):

| Route tipi | Sebep |
|---|---|
| **Billing** (`/api/billing/*`, `/api/admin/members/*/invoices`) | Saldırgan `{ amount: -100 }` gönderir → kullanıcıya negatif para iadesi tehlikesi. `z.number().positive()` zorunlu. |
| **OAuth** (`/api/integrations/*/callback`) | State nonce, code regex, redirect URI whitelist — multiple layers. Zod schema = single source of truth. |
| **Mass action** (`/api/*/bulk`, `/api/admin/restaurants/bulk`) | `ids: string[]` array boyut sınırı + action enum whitelist. Mevcut örnek: `/api/feedback/bulk` (PR #348). |
| **Admin destructive CRUD** (`/api/admin/users` POST + PUT + DELETE) | Privilege elevation riski, role/scope validation tek source. |

### 28.3.3 Mevcut endpoint'e yeni alan eklenirken (mix-mode)

Mevcut elle validation'a **dokunma** — yeni alan için **lokal Zod check** ekle:

```ts
// Mevcut elle validation aynen kalır:
if (!isValidRating(rating)) return ApiErrors.badRequest('INVALID_RATING');

// Yeni alan için lokal Zod (3-satır):
const newFieldParsed = z.string().max(50).safeParse(body.newField);
if (!newFieldParsed.success) return ApiErrors.badRequest('INVALID_NEW_FIELD');
```

Mix-mode mental model karmaşık ama mevcut akış kırılmaz. Tam Zod migration high-risk endpoint için ayrı talep.

### 28.3.4 Net karar matrisi

| Senaryo | Aksiyon |
|---|---|
| Yeni endpoint ekleme | `validateBody` + `.strict()` zorunlu |
| Yeni billing/oauth/mass-action route | Zod must-have, schema'yı PR'da test et |
| Mevcut endpoint'e yeni alan ekleme | Lokal `z.X.safeParse(body.newField)` (mix-mode) |
| Mevcut endpoint refactor | **Dokunma**, elle validation çalışıyor |
| Toplu sweep | **Yapma**, regression test maliyeti değer üstü |

**Yapma:**
- Yeni endpoint'i elle validation ile yazma — Zod yazmak elle yazmaktan daha hızlı + daha güvenli
- Billing/oauth route'ta elle validation yetersiz — schema kullan
- Mevcut çalışan endpoint'e Zod ekleyip frontend error shape'ini değiştirme (breaking change)

**Yap:**
- Yeni route file açar açmaz `import { z } from 'zod'; import { validateBody } from '@/lib/api/validate';`
- High-risk route'a 1 unit test ekle: schema valid input → success, invalid input → 400 with path
- 158 endpoint'in geri kalanı 2-3 yıllık doğal sweep ile Zod'a evolve eder; toplu force etme

### 28.4 Yeni bulk endpoint pattern (Phase 11.12 + 11.19)

Toplu mutate işlemleri için kalıcı şablon. Şu pattern her yeni bulk endpoint için reuse edilir:

1. **Auth:** `getPanelActorFromRequest` + role kontrol (genelde superadmin only, bazen manager dahil; owner asla)
2. **IDOR whitelist:** `getScopedRestaurantIds` + Prisma `findMany` `id IN ids AND restaurantId IN scoped` → silently filter out (200 + `processed=0`)
3. **Rate limit:** `rateLimit(`{endpoint}:${actor.id}`, 10, 60_000)` — Upstash distributed
4. **Zod:** `{ ids: array(string).min(1).max(50), action: enum }`
5. **Action dispatch:** `Promise.allSettled` (per-row fail isolation) veya `updateMany` (atomic)
6. **Response:** `{ processed: number, skipped: number, action }`

Mevcut örnekler:
- `/api/feedback/bulk` (PR #268) — flag/unflag/assign, `Promise.allSettled` + skipped count
- `/api/admin/restaurants/bulk` (PR #275) — activate/deactivate, `updateMany` atomic

Yeni bulk endpoint eklerken iki örneği baseline al.

**Yapma:**
- `ids` array.length > 50 — UI selection üst sınırı, daha fazlası repeat batch
- `Promise.allSettled` içinde her satıra ayrı try/catch — wrapper pattern fail isolation kuralını çiğner
- Audit log eksik (CLAUDE.md §29.6) — yeni admin destructive bulk'larda `AdminAuditLog` kullan

---

## 29. Backend API Foundation Plan

Backend mimari kararları. **Mevcut monolith Next.js yapı korunur** — microservice yok, NestJS yok, tRPC yok, BullMQ yok.

### 29.1 Şu anki durum + öneri sırası

| # | Modül | Mevcut | Öneri |
|---|---|---|---|
| 1 | Shared API response helper | Yok (her route kendi `NextResponse.json`'ı) | İncremental — `src/lib/api/response.ts` opsiyonel, sadece tekrar çıkarsa |
| 2 | Shared error handler + Sentry | `onRequestError` global hook (§26) | Yeterli; manuel `Sentry.captureException` yüksek-risk yerler için |
| 3 | Shared auth/role guard | `getPanelActorFromRequest` + `requireRestaurantAccess` (§4) | Çalışıyor, dokunma |
| 4 | Optional Zod validation helper | **Bu task** — `validateBody` (§28) | Yeni complex route'larda kullan |
| 5 | Shared Upstash rate-limit helper | `rateLimit()` (§14.2, distributed) | Yeterli; yeni public endpoint'lerde kullan |
| 6 | Audit log helper | `AdminAuditLog` model şemada var, kullanılmıyor | Yeni admin write action'larında kullanılması önerilir |
| 7 | Vercel Cron endpoints | 4 cron çalışıyor (§21.12) | BullMQ yerine bu pattern kalır |
| 8 | Centralized mail service | `src/lib/email.ts` + `src/lib/email/` (§21) | Mevcut, mail gönderimi route içinde değil |
| 9 | Google Business Profile OAuth | Yok | Stratejik gelecek modülü — Zod ile başla (§28.1.4) |

### 29.2 Mimari kuralları

**Yap:**
- Monolitik Next.js App Router yapısını koru
- Vercel serverless uyumlu kal (request-scoped state, no in-memory queues)
- Scheduled job'lar için **Vercel Cron + API route + Upstash/DB** üçlüsü
- Sentry'yi şu kategorilerde kullan:
  - Caught error'lar (try/catch içinde explicit `captureException`)
  - Error boundary'ler (`global-error.tsx` + segment `error.tsx` dosyaları `reportBoundaryError` ile yapıyor)
  - API failure'lar (`onRequestError` zaten yakalıyor)
  - Cron failure'lar (cron handler `try/catch` + `captureException` + tag `{ cron: 'name' }`)
  - Önemli integration failure'lar (OpenAI, Resend, Iyzico — fallback öncesi capture)

**Yapma:**
- Microservice'lere bölme
- Long-running worker'lar (BullMQ, Bee-Queue, Sidekiq-style)
- Background queue managerleri (Vercel serverless 10s gateway timeout, queue worker yeri yok)
- Mevcut DB schema'yı bir feature gerektirmedikçe değiştirme
- Authentication'ı yeniden yazma (mevcut `jose` JWT + httpOnly cookie çalışıyor)
- UI'ı bu task'ta değiştirme — backend-only scope

---

## 30. Dependency Policy + Stack Audit (2026-04 güncellendi)

### 30.1 Yeni library ekleme kuralı (kanonik)

**Yeni bir library ekleme — **somut, mevcut bir sorunu çözmüyorsa.** "Olsa iyi olur", "modern stack", "best practice" yeterli sebep **değil**. Her ek dep:

- Vercel bundle size + cold start'a yük bindirir
- npm audit attack surface'ini büyütür
- Yeni AI session'ları için bilişsel yük artırır
- Maintenance + lockfile drift riski oluşturur

### 30.2 Yeni dep evaluation checklist (her dep eklemeden önce 8 soru)

1. **Hangi tam sorunu çözüyor?** Soyut "performance" / "DX" cevabı değer taşımaz; somut bir kod patolojisini işaret etmeli.
2. **Mevcut stack güvenle çözebilir mi?** Tailwind, jose, Prisma, Radix, React Query, Sentry, Zod — bu sekiz altyapı çoğu sorunu zaten kapsıyor.
3. **Bundle size + cold start'a etkisi?** Client-side dep'lerde >20 KB gzip dikkat. Server-side dep'lerde cold start >100 ms artıyorsa kabul edilemez.
4. **External API key, paid service, Redis, background worker, long-running process gerektiriyor mu?** Vercel serverless'ta yok yatırım. Upstash + Vercel Cron + Sentry üçlüsü dışına çıkma.
5. **Mevcut monolitik Next.js mimarisiyle uyumlu mu?** Microservice / sidecar / Docker compose gerektiren dep'ler reddedilir.
6. **Vercel serverless deployment ile uyumlu mu?** Edge / Node runtime sınırları, 10s gateway timeout, ephemeral FS — bunları aşan dep'ler reddedilir.
7. **Çalışan kod refactor'u olmadan incremental adopte edilebilir mi?** Toplu migration zorlayan dep (örn. NestJS, tRPC) reddedilir.
8. **Mevcut auth / design system / validation pattern / deploy modeliyle çatışıyor mu?** Çatışırsa düşük teknik borç olarak alternatif bul veya elle yaz.

### 30.3 Stack snapshot (2026-04 itibarıyla)

| Lib | Durum | Karar |
|---|---|---|
| `@sentry/nextjs ^10.51` | ✅ Kurulu | Production observability — caught error'lar, cron failure'lar, integration failure'ları, error boundary'leri için **tutarlı kullan** (§26) |
| `zod ^4.4` | ✅ Kurulu | Sadece yeni veya yüksek-risk backend route'larında. Mevcut elle validation'ı **toplu migrate etme** (§28) |
| `@tanstack/react-query ^5.100` | ✅ Kurulu | `<QueryProvider>` root layout'ta. Yeni client component'lerde `useQuery` ile başla; mevcut fetch+useState pattern'leri opportunistic refactor (§27.1) |
| `@radix-ui/react-{dialog,dropdown-menu,tabs,tooltip,popover,select}` | ✅ Kurulu | Sadece a11y-heavy yeni primitive ihtiyacında. Mevcut `src/components/ui/*` toplu migrate edilmez (§27.2) |
| `firebase ^12.12` | ✅ Kurulu | Sadece Google Sign-in için. Primary auth değil — `jose` JWT + httpOnly cookie (§4) |
| `jose ^6.2` | ✅ Kurulu | Custom JWT auth — edge compatible, Vercel middleware ile uyumlu (§4) |
| `@vercel/speed-insights ^2.0` | ✅ Kurulu | Real-user Core Web Vitals (LCP/CLS/INP/FCP/TTFB). `<SpeedInsights />` root layout'ta mount'lı; alt layout'lar inherit eder (§31). Lokal dev'de no-op, sadece Vercel deployment'ta data toplar. Sentry'yi (§26) **replace etmez** — paralel rol |
| `@vercel/analytics ^2.0` | ✅ Kurulu (2026-05) | Page views + custom events. `<Analytics />` root layout'ta `<SpeedInsights />` ile birlikte mount'lı; ikisi paralel beacon emit eder. RES (Real Experience Score) hesaplaması her iki sample stream'i tüketir — Analytics olmadan RES sample context yetersiz kalıyordu (Vercel dashboard "No data available" uyarısı). Lokal dev'de no-op. Custom event tracking şu an wired değil (passive page views) — gerekirse `track('event_name', { ... })` API'si var. |

### 30.4 Önerilen ama kurulmaya gerek olmayan lib'ler (revised)

| Lib | Karar | Sebep |
|---|---|---|
| **NextAuth.js / Auth.js** | ❌ Reject | Custom JWT (`jose`) zaten çalışıyor, edge-compatible, IDOR helper'ları kurulmuş (§4). Migration scope creep. |
| **Chakra UI / MUI** | ❌ Reject | Tailwind + Radix + custom `bz-*` design system var (§11, §23). UI dili çatışır, refactor maliyeti yüksek. |
| **BullMQ / Bee-Queue** | ❌ Reject | Vercel serverless'ta worker runtime yok. 4 cron `vercel.json`'da çalışıyor (§21.12). Upstash ile sufficient. |
| **SWR** | ❌ Reject | React Query zaten kurulu — overlap. Mutation, invalidation, pagination, optimistic updates için RQ daha uygun. |
| **Pino / Winston** | ❌ Reject (şimdilik) | Sentry log + structured event capture yeterli (§26). Backend'e ayrı log aggregation gerekirse yeniden değerlendir. |
| **next-intl / next-international** | ❌ Reject (şimdilik) | Mevcut `src/lib/translations.ts` + `src/app/[locale]/...` pattern'i çalışıyor. Migration ~80 sayfa + helper'ları yeniden yazmayı gerektirir. SSG / dinamik route ile uyumsuzluk riski. Tekrar değerlendirme tetikleyici: 3+ locale + dinamik string interpolation ihtiyacı. |
| **react-hook-form + @hookform/resolvers** | ⚠️ Defer | Backend Zod task'ında kurulmadı (kasıtlı). Frontend form refactor task'ı açıldığında yeniden değerlendir. Mevcut elle form state çoğu Buaze form'unda yeterli (4-6 alan). |
| **react-email / mjml** | ❌ Reject | `src/lib/email/` Pulse layout helper'ları çalışıyor (§21). DB-driven copy + placeholder substitution + revision audit zaten var. |
| **NestJS / tRPC migration** | ❌ Reject | Monolitik Next.js App Router pattern'i bilinçli karar. Migration tüm 125+ route + DI pattern + decorator yeniden yazımı demek. |
| **shadcn/ui** | ⚠️ Allowed (pattern restricted) | Yasak değil ama 138 mevcut component elle yazılmış (`bz-*` token'larıyla). Yeni complex UI'da yararlı olabilir; eklenirse styled wrapper'ları Pulse token'larıyla **tamamen override etmek zorunda**. |

### 30.5 Tetik olduğunda ek edilebilecekler

| Lib | Tetik koşul |
|---|---|
| `iyzipay-node` (veya REST direct) | Iyzico Wave 3.5 başlatıldığında billing write-side için |
| `react-hook-form` | Bir form 8+ alana çıktığında veya complex validation chain gerekirse |
| `next-intl` | 3. locale eklenirken (TR + EN dışı) — current pattern 2 locale için uygun, 3+ ölçeklemiyor |
| `@upstash/qstash` | Cron yeterli olmazsa — async job queue ihtiyacı çıkarsa (delay scheduling, retry policy) |
| `pino-pretty` + `pino` | Sentry dışına structured log aggregation gerekirse (Datadog, Loki) |

### 30.6 Yapma

- "Modern stack şu kullanıyor" gerekçesiyle dep ekleme — Buaze stack'i bilinçli ve yeterli.
- Bir feature için dep eklerken aynı PR'da başka bir dep daha eklemek (scope creep).
- "Belki ileride lazım olur" diye kurulum (`react-hook-form` örneği — frontend task'ı açılana kadar bekle).
- shadcn'in default styled wrapper'larını Pulse token'larına geçirmeden kopyala-yapıştır.

---

## 31. Vercel Speed Insights + Analytics — Real-User Web Vitals

`@vercel/speed-insights/next` (Web Vitals) ve `@vercel/analytics/next` (page views) ile gerçek-kullanıcı telemetrisi. Her iki paket `package.json`'da kayıtlı (`@vercel/speed-insights ^2.0.0` + `@vercel/analytics ^2.0.1`); `<SpeedInsights />` ve `<Analytics />` `src/app/layout.tsx` body sonunda **birlikte mount'lı** → `[locale]/layout.tsx` + `admin/layout.tsx` dahil tüm panel + marketing + public surface'leri kapsar. Yeni layout/route eklerken **ekstra mount koyma** (duplicate beacon).

**Neden ikisi birlikte:** Vercel "Real Experience Score" (RES) hesaplaması Web Vitals + page-view stream'lerinin **birleşik** sample'ından çıkar. Tek başına Speed Insights ile RES "0" görünüp dashboard'da "No data available — make sure you are using the latest @vercel/speed-insights package" uyarısı çıkıyordu (paket zaten v2 latest'tı, gerçek sebep page-view context eksikliğiydi). Analytics eklenince RES hesaplaması için yeterli sample kalitesi sağlanır.

### 31.1 Speed Insights vs Sentry — net rol ayrımı

| Araç | Ne için |
|---|---|
| **Vercel Speed Insights** | Real User Monitoring (RUM): LCP, CLS, INP, FCP, TTFB. Production trafiğinden örneklem alır, Vercel dashboard'unda Web Vitals trend'i gösterir. **Performance / UX odaklıdır.** |
| **Sentry** (§26) | Error monitoring, exception capture, performance tracing, debugging. Stack trace + breadcrumbs + replay (on-error). **Hata / debug odaklıdır.** |

**Speed Insights, Sentry'nin yerine geçmez** ve geçemez:
- Speed Insights yalnız Web Vitals metriklerini ölçer; uncaught exception, API 500, broken UI state hakkında hiçbir şey söylemez.
- Sentry'nin `tracesSampleRate` ile yaptığı transaction tracing daha derin (Prisma query'leri, fetch span'leri, custom span'ler). Speed Insights bunu yapmaz.
- Speed Insights data-point'leri pseudonim, payload yok — hangi user, hangi request, hangi stack kayıtlı değil.

İkisi paralel kalır: Speed Insights "siteyi kullanıcılar nasıl deneyimliyor", Sentry "ne kırılıyor".

### 31.2 Behavior

- **Lokal dev**: SDK no-op çalışır; data göndermez. `npm run dev`'de console temizdir.
- **Vercel Preview + Production**: Vercel platform tarafından otomatik provision edilir; ek env var gerekmez. Preview deployment'lar da metric basar (sayfa hızı regresyonu kullanıcıya çıkmadan yakalanır).
- **Bundle**: ~1.5 KB gzip, beacon API kullanır — main thread'i bloklamaz.
- **Privacy**: KVKK/GDPR-friendly. Pseudonim, çerez yok, IP truncate'lenir.

### 31.3 Sample rate (gelecek için)

Şu an default `sampleRate: 1` (her sayfa view kayıt). Aylık trafik artarsa Vercel data point quota'sı dolabilir. O zaman:

```tsx
<SpeedInsights sampleRate={0.5} />  // 50% örneklem
```

veya `0.1` (10%) — büyük ölçekte istatistiksel olarak yeterli, dashboard tutarlılığını korur. Quota sınırına yaklaşmadan değiştirme (Vercel dashboard'da uyarı gelir).

### 31.4 Wired endpoints (yok — passive)

Manuel `track()` çağrısı yok; sadece otomatik Web Vitals + page view beacon'ları. `@vercel/analytics`'ın `track('event_name', { ... })` API'si available — marketing funnel analysis (örn. ROI form submit, plan upgrade click, demo CTA) için ileride wire edilebilir. Şu an passive otomatik tracking yeterli.

### 31.5 Yeni layout / SSG sayfa eklerken

Yeni route `app/` ağacında otomatik kapsanır (root layout'ta tek `<SpeedInsights />` + `<Analytics />` mount, alt layout'lar inherit eder). Ayrı `<SpeedInsights />` veya `<Analytics />` mount **etme** — duplicate beacon gönderir, quota tüketir + sample drift yapar.

---

## 32. Testing

Hafif test infrastructure'ı. Heavy framework yok (Jest/Vitest kurmadı), Node'un built-in test runner'ı yeter.

### 32.1 Mevcut

- **Test runner:** Node 20+ `--test` (built-in). `tsx` ile TS dosyaları doğrudan çalıştırılır.
- **Komut:** `npm test` → `node --import tsx --test tests/**/*.test.ts`
- **Klasör:** `tests/` (repo kökünde, `src/` dışında).
- **Mevcut test:** `tests/oauth.test.ts` — OAuth flow yardımcıları için unit test örneği.

### 32.2 Ne zaman test yaz

**Yap:**
- Pure helper fonksiyonları (`src/lib/format.ts:parsePriceInput`, `src/lib/email/placeholders.ts:substitutePlaceholders`, `src/lib/analytics-heuristics.ts` eşik mantığı) — DB/network'e bağımsız, deterministik.
- Güvenlik kritik logic (token validation, IDOR scoping helper'ları, RBAC).
- Bug fix sonrası regression koruması — fix öncesi failing test, sonrası geçer.

**Yapma:**
- DB'ye gerçek bağlanan integration testi yazma — Vercel preview / production smoke test'i daha pragmatik.
- E2E (Playwright/Cypress) ekleme — şimdilik manuel cihaz testi (§25.6) yeterli.
- Component snapshot testi — UI değişimi sık, drift sonrasında bilgi vermiyor.

### 32.3 Yeni test ekleme

```ts
// tests/foo.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePriceInput } from '../src/lib/format';

test('parsePriceInput tr decimal', () => {
  assert.equal(parsePriceInput('1.234,56'), 1234.56);
});
```

Path: `tests/<konu>.test.ts`. CI (`.github/workflows/ci.yml`) şu an test'i koşmuyor — eklenecekse `npm test` adımı yeterli, ek setup yok.

---

## 33. Scripts Klasörü

Repo kökündeki `scripts/` (+ `prisma/` altındaki seed) — bir kerelik veya periyodik bakım runner'ları. Hiçbiri build/runtime'da otomatik tetiklenmez (build sadece `validate-env.js`'i çağırır).

| Dosya | Komut | Amaç |
|---|---|---|
| `scripts/validate-env.js` | `node scripts/validate-env.js` | Build-time zorunlu env doğrulaması — eksik env varsa exit 1. `npm run build` ilk adımı (§14.1). |
| `scripts/seed-mail-templates.ts` | `DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts` | 32 row mail template upsert (16 template × 2 locale, §21.26). Idempotent. Operator "kod default'larına dön" istediğinde de çalıştırılır. |
| `scripts/seed-legal-documents.ts` | `DATABASE_URL=... npx tsx scripts/seed-legal-documents.ts` | KVKK / Terms / Cookie metinlerini DB'ye seed eder. Idempotent. |
| `scripts/backfill-feedback-reply-source.ts` | `DATABASE_URL=... npx tsx scripts/backfill-feedback-reply-source.ts` | `FeedbackReply.source` NULL satırlarını `'manual'` ile doldurur. Tek seferlik, idempotent (§21.20). |
| `prisma/seed-case-studies.ts` | `DATABASE_URL=... npx tsx prisma/seed-case-studies.ts` | Marketing case-study içeriği seed eder. Idempotent. |

**Yeni script eklerken:**
- TypeScript ise `scripts/` (veya `prisma/` seed ise `prisma/`) altına koy.
- Idempotent yap (upsert tercih, raw INSERT'ten kaçın) — operatör defalarca çağırabilmeli.
- Üst yorumda kullanım komutunu + ne yaptığını yaz.
- Build script'ine ekleme — bu script'ler **manuel runner'dır**, her deploy'da koşmaz.

---

## 34. Cleanup Log — Kasıtlı Silinenler

> **Amaç:** Gelecek AI session'ları silinen şeyleri **yanlışlıkla yeniden inşa etmesin**. Bir feature/dosya silindiyse sebep belgelenir; aynı kullanıcı tekrar isteyene kadar geri eklenmez.

### 34.1 2026-04-30 — Ölü kod denetimi (PR #256)

3 paralel agent denetimi + manuel doğrulama. Kriter: `grep -rn` ile statik + dynamic import + string-action araması; 0 referans = orphan.

**Silinen npm paketi:**
| Paket | Sebep |
|---|---|
| `jsonwebtoken` + `@types/jsonwebtoken` | 0 import; auth tamamen `jose` (`src/lib/auth.ts`) ile çalışıyor (8 yerde aktif). Geri eklemek için **gerçek bir Node-only JWT ihtiyacı** gerekir (jose edge-compatible, çoğu use-case karşılar). |

**Silinen orphan component'ler (14):**
- `src/components/{ReviewList,BusinessSummary,GoogleTabs}.tsx` — root-level legacy
- `src/components/dashboard/PlatformEnableToggle.tsx`
- `src/components/dashboard/settings/{ActiveSessionsTable,TwoFactorSetupModal}.tsx` — 2FA + aktif oturum kartları kullanıcı talebiyle kaldırıldı; backend `/api/account/2fa/*` ve `/api/account/sessions` endpoint'leri **korundu** (gelecek email magic-code 2FA için)
- `src/components/marketing/{CustomerTestimonials,FeatureTabsUI,ProductShowcase,CtaBanner,CaseStudies,LegalPageLayout,VideoModal,AnimatedCounter}.tsx` — eski marketing eskizleri; aktif marketing component'leri (`MobileBottomNav`, `WatchDemoButton`, `LegalDocumentPage`) korundu

**Silinen orphan API route'ları:**
| Route | Sebep |
|---|---|
| `/api/careers/apply` | `careers/page.tsx` view-only (form yok); 203 satırlık page'de `<form>` / `fetch` / `action` / `apply` yok. Route iyi yazılmıştı (rate-limit + Supabase Storage + Resend mail + reCAPTCHA + attachment validation) ama 0 caller. **Geri eklerken:** önce careers page'ine başvuru formu eklenmeli (yoksa orphan tekrarı). |
| `/api/case-studies` | `/[locale]/case-study/page.tsx` ve `/[slug]/page.tsx` doğrudan `prisma.caseStudy.findMany/findUnique` çağırıyor (server component SSR); API gateway'e gerek yok. **Geri eklerken:** yalnız client-side fetch ihtiyacı (örn. infinite scroll, real-time filter) ortaya çıkarsa. |

**Silinen orphan utility:**
- `src/lib/zIndex.ts` (`Z.MODAL`, `Z.TOAST` sabitleri) — 0 import. Yeni Modal/Tooltip katmanları kullanılırken Tailwind `z-50/z-[60]` arbitrary değerleri yeterli. Tek-kaynak gerekirse §11 token paterni gibi `globals.css`'te tanımla.

**Silinen orphan public asset'leri:**
- `public/assets/3d-hero.png` (508 KB, 0 referans)
- `public/uploads/admin ve isletme panel tasarımları/` (~2.1 MB, 21 tasarım dosyası) — Vercel'e geçişten kalan tortu (§3 base64-in-DB kararı). Kanonik tasarım kaynakları **`.design/` ve `.design-pulse-2026/`'da**; `public/uploads/*` runtime'da serve edilmiyor.

**Hazırda korunanlar (silinmedi, "kasten orphan-benzeri"):**
| Şey | Sebep |
|---|---|
| `CareerApplication` Prisma modeli | `/api/careers/apply` route silindi ama model schema'da kaldı; gelecekte careers form aktive edilirse migration gerekmez. AutomationRule / GoogleIntegration pattern'i (§18). |
| `AutomationRule` model + `/api/automations/*` route'ları | UI yok, planlı feature |
| `GoogleIntegration` model | OAuth flow setup var, tam bağlantı gelecek |
| `NotificationPreference` model | Schema'da, kod minimal |
| Billing fields (`billingAddress`, `taxNumber`, `discountActive`, `discountType`) | Iyzico Wave 3.5 hazırlığı |
| `src/lib/api/validate.ts` (`validateBody` Zod helper) | §28 kanonik helper olarak öneriliyor; henüz hiçbir route benimsemedi ama yeni high-risk route'lar için **kasten korundu**. |

### 34.2 False-positive korumaları (yanlışlıkla silinmemeliler)

Agent'lar bu dosyaları orphan iddia etti **ama gerçekte aktif** — silinmedi:

| Dosya | Gerçek kullanım |
|---|---|
| `src/components/marketing/MobileBottomNav.tsx` | `MarketingFooter.tsx:362`'de mount (CLAUDE.md §25.4). Conditional FAB (login state'e göre). |
| `src/components/marketing/WatchDemoButton.tsx` | `MarketingNavbarClient.tsx:402` |
| `src/components/dashboard/settings/UnsavedChangesBar.tsx` | 4 import |
| `src/components/dashboard/settings/SettingsCard.tsx` | 8 import |

**Yapma:** `grep -rln "FileName" | wc -l` çıktısına 0 görünce hemen "orphan" deme. **Ek doğrulama:**
1. `grep -rn "from.*FileName"` (statik import)
2. `grep -rn "import(.*FileName"` (dynamic import)
3. Path-name ile (`@/components/path/FileName`) ara
4. Yorumlardaki "git'te korundu" gibi ipuçlarını **stale comment** olarak işaretle, kanıt sayma

### 34.3 Denetim metodu (gelecek temizlikler için)

Yeni bir ölü kod denetimi yaparken aşağıdaki sırayı izle:

1. **Kapsamı 3 kategoriye böl** — npm deps, src/ dosyaları, API route'ları + Prisma alanları. Her birini ayrı agent'la (veya ayrı pass'le) tara.
2. **Convention dosyalarını kapsam dışı tut** — Next.js `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`, `global-error.tsx`, `middleware.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `sentry.{server,edge}.config.ts`. Bunlar framework auto-load.
3. **3-yöntem doğrulama** — statik import, dynamic import, string-based form action / fetch URL. Üçü de 0 olmalı.
4. **CLAUDE.md çapraz kontrol** — silmeden önce CLAUDE.md'de o dosya/feature için "kasten korundu" notu var mı bak (§17, §18, §34.1 hazırda listesi).
5. **Build doğrulama** — silmeden sonra `npx tsc --noEmit` + `npx next build` koş; "Compiled successfully" + 54 static page üretildi → güvenli.
6. **Stale comment temizliği** — silinen dosyaya yorum referansı kalmışsa parent dosyada güncelle ("git'te" → "silindi, history'de").

### 34.4 Yapma

- **Boş bırakılan path'lere** silinmiş feature'ları yeniden inşa etme. Önce `git log --all --diff-filter=D --name-only -- '*FileName*'` ile silme kararının gerekçesini oku.
- Geri eklemek için "olabilir gerekir" yetmez — kullanıcı **açık talep** etmeli (CLAUDE.md §7 scope disiplini).
- `validate.ts` helper'ını silme — §28 kanonik öneri, gelecek route'lar için bekliyor.
- `CareerApplication`, `AutomationRule`, `GoogleIntegration`, `NotificationPreference` modellerini silme — schema'da kaldıkları sürece preview deploy / staging ortamında DB'de yer kaplar ama silmek migration zorunluluğu doğurur.

### 34.5 2026-05-01 — Owner dashboard ana sayfa konsolidasyonu

Owner anasayfası (`src/app/[locale]/dashboard/page.tsx`, 1152 LOC) tekrarlayan KPI'lar + chart'lar nedeniyle yeniden inşa edildi. Üst kısım ile aşağıdaki "İleri İstatistikler" bölümü aynı 4 KPI'yı + 2 farklı trend chart'ı + 5-yıldız histogramı tekrar gösteriyordu. Kullanıcı talebi (2026-05): "Trend ile etkileşim analizini birleştir, tekrarlayan içerikler olmasın, profesyonel ama basit görünsün."

**Silinen kapsam:**
| Katman | Yer | Detay |
|---|---|---|
| Component | `src/components/dashboard/RestaurantAnalyticsPanel.tsx` (271 LOC) | "İleri İstatistikler" hub'ı — single call site (sadece dashboard/page.tsx); admin paneli §11.9'da zaten kaldırmıştı |
| Component | `src/components/admin/StatsCards.tsx` (98 LOC) | RestaurantAnalyticsPanel'in 4-KPI grid'i; dashboard'ın `<StatCard>` primitive'i ile çakışıyordu |
| Component | `src/components/admin/DayDistributionChart.tsx` (59 LOC) | Day-of-week BarChart; 7-day TrendsChart ile redundant |
| Component | `src/components/admin/GoogleConversionPanel.tsx` (339 LOC) | Google funnel + leaderboard; `/dashboard/analytics` zaten benzer derin breakdown'lar taşıyor; ana sayfada sade kalsın diye kaldırıldı |
| UI | Mobile-only `BUGÜN` hero + `SON 7 GÜN` bar + `SON YORUMLAR` list (page.tsx ~150 LOC) | Mobile + desktop unified responsive yapıya geçti |
| UI | Desktop `BUGÜN` 3-card KPI row (page.tsx 686-714) | 4-stat KPI grid ile bilgi çakışıyordu — yesterday delta yerine prev-7-day delta tek kaynak |
| UI | "Etkileşim eğilimi" custom BarChart (page.tsx 754-795) | Recharts AreaChart ile değiştirildi (TrendsChart, mobile + desktop unified) |
| UI | Inline 5-bar puan dağılımı histogramı (page.tsx 797-825) | RatingChart component ile değiştirildi (DRY) |

**Backend konsolidasyon:**
- 27 ayrı Prisma query → tek `Promise.all` bloğu (13 paralel query)
- `avgRating` 3× hesaplama → tek `restaurantRatings.groupBy` weighted source
- `redirectCount` 5× hesaplama → 3'e indirildi (all-time + last7 + prev7)
- `rating ≥ 4 + platform IS NOT NULL` filter 6+ tekrar → tek `REDIRECT_WHERE` const (file-local, abstraction değil — §7)
- `qrScanCounts` proxy: `findMany` + JS match → `groupBy` (DB-side aggregation)
- 30-day window query'leri tamamen kaldırıldı — KPI'lar artık tek pencere (last 7d) kullanıyor (kullanıcı kararı: "tek delta source, karışıklık olmasın")
- Boş `restIds` fallback path'i kaldırıldı — Prisma `in: []` zaten 0 satır döndürür, defensive code gereksizdi

**Yeni yapı:**
```
/dashboard (sade overview)
├── PageHeader + OnboardingNudge
├── Unified KPI Grid (mobile 2x2 → desktop 4-col, tek delta pencere)
├── Quick Actions Grid (4-button, mobile + desktop unified)
├── Trend & Etkileşim (TEK section — TrendsChart + footer 3-stat + /analytics linki)
├── Yorum Görünümü (TEK section — RatingChart + PlatformDistribution 2-col)
├── Son Yorumlar + QR Performansı (mevcut, unified responsive)
├── Konum Performansı + Restaurants Section + Upgrade CTA (mevcut)
```

**Chart component'lerinin yeni call site'ları:**
- `TrendsChart` — `dashboard/page.tsx`'te `dynamic({ ssr: false })` import (CLAUDE.md §21.14 ResponsiveContainer pattern)
- `RatingChart` — `dashboard/page.tsx`'te direct import
- `PlatformDistribution` — `dashboard/page.tsx`'te direct import
- `/api/feedback/stats` endpoint — admin/analytics tarafından hâlâ tüketiliyor; **kontrat değişmedi**

**Net etki:** -1010 LOC codebase azalma (page 1152→909, 4 component sil 767 LOC). Mobile UX değişimi: BUGÜN hero ve gün-spesifik 30d delta'ları kaldırıldı; karşılığında tek-delta-pencere (son 7 gün) tutarlı UX + Recharts AreaChart mobile'a yüklenir.

**Geri eklemek için:** Kullanıcı **açık talep** etmeli (§34.4). Detaylı funnel/leaderboard/30d-window UX gerekli olursa `/dashboard/analytics` (zaten 454 LOC, range/platform/branch/restaurant URL-synced filtreler) genişletilmeli — ana sayfada ek section eklenmemeli (sade kalma kararı).

### 34.6 2026-05-01 — Slack iletişim yüzeyi kaldırıldı

Owner panel'deki Slack webhook bildirim ayarı kullanıcı talebiyle kaldırıldı. Tek-kanal e-posta'ya odaklanan kapsam.

**Silinen kapsam:**
| Katman | Yer | Ne silindi |
|---|---|---|
| UI | `src/app/[locale]/dashboard/notifications/OwnerNotificationsForm.tsx` | Slack webhook section + `Webhook` icon import + `slackWebhook` state + `webhookDirty` + `invalid_webhook` error handler + desc'teki Slack referansı |
| UI | `src/app/admin/notifications/page.tsx` | Aynı `/api/notifications` endpoint'ini paylaşıyordu — Slack section + `Webhook` + `Check` icon import + Slack desc temizlendi (orphan UI önleyici) |
| API | `src/app/api/notifications/route.ts` | `slackWebhook` URL parse + 500 char + `invalid_webhook` 400 + DEFAULT_PREFS field + select alanı + return alanı |
| Helper | `src/lib/notification-preferences.ts` | `NotificationPrefs.slackWebhook` field + `postSlackWebhook` fan-out fonksiyonu + DEFAULTS field + select |
| Feedback fan-out | `src/app/api/feedback/route.ts` | `postSlackWebhook` import + ≤3★ Slack mesaj formatlama bloğu (line 201-215) + yorum |
| DB schema | `prisma/schema.prisma` `NotificationPreference` | `slackWebhook String? @map("slack_webhook")` kolonu kaldırılmıştır; migration akışında eski kolonlar ancak explicit migration ile düşürülür |
| Type drift | `src/lib/scaffolding.ts` | `NotificationPreferences.slackWebhook` field + yorumda `slack_webhook` template satırı |
| JSDoc | `src/components/dashboard/settings/sections/BusinessNotificationSettings.tsx` | "4 toggle" → "2 toggle" + Slack validation referansı |
| JSDoc + desc | `src/app/[locale]/dashboard/account/page.tsx` | Section description Slack ifadesi + tab listesi yorumu (6 → 7 tab, ai eklenmiş; Slack/digest kaldırıldı) |

**Out of scope (kasten dokunulmadı):**
- Marketing surface'lerde "Slack ile entegrasyon" iddiaları (`integrations/page.tsx`, `careers/page.tsx`, `PlatformLogo.tsx`) — ayrı kapsam, kullanıcı talep dışı
- `src/lib/help-articles.ts` `slack-discord-webhook-routing` ve diğer Slack mention'lı help article'lar — feature kalktı ama help article çelişkisi gelecek scope
- `src/lib/email/templates/low-rating-alert.ts` "Mutfak Slack" suggested action — template hint
- `src/app/api/automations/*` `invalid_webhook_url` — generic webhook (Slack özel değil), AutomationRule modeli backlog scope (CLAUDE.md §34.4)
- `src/app/admin/api/page.tsx` + `src/app/admin/settings/page.tsx` Slack mock content / placeholder text
- CLAUDE.md §21.33 backlog "Slack webhook alternative (ops mail yerine)" — bu ops-alert backlog scope, ayrı feature

**DB drift uyarısı:** `slack_webhook` Postgres kolonu prod'da görünürse migration history içinde explicit drop kararı gerekir. Eski kayıtların `slack_webhook` değerleri kaybolacağı için bunu ayrı migration/PR olarak ele al; mevcut helper artık o kolonu select etmiyor (defensive `select` paterni §14.1).

**Geri eklemek için:** Kullanıcı **açık talep** etmeli (§34.4). Webhook fan-out generic hale getirilebilir (Discord/Teams/custom URL desteği), tek-platform Slack-özel implementation tekrar yapılması önerilmez.

### 34.7 2026-05-01 — Analytics sayfası "X gün etkileşim" chart fix

`/dashboard/analytics` sayfasındaki "ETKİLEŞİM" chart'ı 90/30 gün range'lerde tamamen kırık görünüyordu. Custom `<BarChart>` primitive'i (`src/components/ui/BarChart.tsx`) `flex-1 + maxWidth: 28 + gap-2` ile sadece ~7-14 bar için tasarlanmıştı. 90 bar dizildiğinde her bar ~5px'e sıkışıp value badge'leri (`showValues`) bar üstüne yığılıyordu; ek olarak `interactionData`'da `label: ''` olduğu için x-axis label collision yaşanıyordu (kullanıcı bug raporu).

**Fix:**
- Yeni component: `src/components/dashboard/analytics/InteractionTrendChart.tsx` — Recharts AreaChart, dual-series (yorum + yönlendirme), dynamic x-axis tick interval (7d: her label, 30d: her 5, 90d: her ~length/6) — CLAUDE.md §13.8 mobile chart pattern'i ile birebir.
- Backend `interactionData` shape değişti: `{ label: '', value }` → `{ date: 'dd/mm', scans, redirects }`. Redirects = aynı gün içinde rating ≥ 4 + platform set olanlar.
- Lazy-load: `dynamic({ ssr: false })` import — recharts mobile bundle yükü ilk paint'te skeleton.
- `<LegendDot>` ile chart başlığında siyah (Yorum) + lime-deep (Yönlendirme) iki seri etiketi.
- "GÜNLÜK DAĞILIM" (Pzt-Paz, 7-bucket) BarChart'ı **dokunulmadı** — 7 öğe için BarChart layout'u sağlam.

**Geri çekmek için:** Yeni `<InteractionTrendChart>` sadece bu sayfada kullanılır. Recharts bağımlılığı dashboard ana sayfasındaki `TrendsChart` ile zaten paylaşılıyor — ekstra bundle maliyet sıfır. Custom BarChart'a dönmek istenirse, range > 14 gün için thinning veya scrollable container gerekir (yeniden inşa şart).

### 34.9 2026-05-01 — Analytics 2 bug fix + AI themes + 3 yeni metric

Owner panel analytics sayfası kullanıcı şikayetleri sonrası genişletildi.

**Bug fix:**
| Yer | Sorun | Çözüm |
|---|---|---|
| `src/components/ui/BarChart.tsx` | `showValues` mode'da peak bar'ın value badge'i container'dan üste taşıyordu (Day distribution Pzt=5 example: badge bottom 116+28=144 > 140 height) | `topReserve = 24px` ek üst padding + bar max height `height - 24 - topReserve`; badge bottom `+6` (eski +28). Tüm BarChart `showValues` callsite'ları otomatik düzelir. |
| `src/components/dashboard/analytics/AnalyticsFilterBar.tsx` | "Tüm şubeler" / "Tüm işletmeler" select dropdown native chevron text alanına biniyordu (max-w-[180px] dar) | `min-w + pr-8 (chevron alanı) + max-w` cascade — text-overflow'a uğramayan select |

**Yeni: AI sentiment themes** (`src/lib/analytics-themes.ts`)
- OpenAI `gpt-4o-mini` (mevcut `chatCompletion` helper reuse, §15) ile top 5 şikayet + top 5 övgü teması
- Process-local cache (`Map<key, {result, expiresAt}>`, 1 saat TTL) — OpenAI maliyeti kontrolü, ~$0.0005/istek
- Cache key: `userId:restaurantId:rangeKey:platform:branch` — filter-aware
- JSON parse hardening: ` ```json ... ``` ` wrapper tolerasyon, schema validation, theme/count bounded
- Fallback: API key yok / 8'den az yorum / parse fail → empty result, mevcut UI sade görünür
- Sample 80 yorum × 200 char = ~500-700 input token

**Yeni metric — Saat-bazlı dağılım (24-bucket BarChart)**
- `feedbacksWindow` JS-side hour bucket (`createdAt.getHours()`)
- Sparse label (her 3 saatte bir: 00, 03, 06, …, 21) → 24 bar layout temiz
- Owner: "Personel + kapasite planlaması" footer hint
- Mevcut "Günlük Dağılım" 7-bucket'ın yanında 2-col grid

**Yeni metric — Yanıt performansı (low rating reply latency)**
- 3 alt-metric: yanıt oranı (% replied) + medyan süre (saat) + 8h+ bekleyen sayım
- 8h+ bekleyen > 0 → kırmızı uyarı bandı ("itibar riski")
- Veri kaynağı: `feedbacksWindow.replies[0]?.createdAt - feedback.createdAt` median JS-side
- Sadece `feedbacksWindow.filter(rating <= 3).length > 0` ise render edilir

**Yeni metric — Aspect breakdown (yemek/servis/atmosfer)**
- Schema'daki `Feedback.{food,service,atmosphere}Rating` opsiyonel alanlardan window-bound `_avg`
- ≥ 5 örneklem yoksa o sub-metric boş ("—") gösterilir
- 3'ü de boşsa section gizlenir (`showAspects` flag)

**Backend konsolidasyon:**
- `feedbacksWithComments` (90gün, ayrı query) → silindi
- `feedbacksWindow` select genişletildi: `id, comment, foodRating, serviceRating, atmosphereRating, replies (take:1)` — multi-purpose tek query
- Theme analysis, hour bucket, aspect avg, response time **hepsi tek query'den** beslendi (CLAUDE.md §7 replication önleme)
- `STOP_WORDS` set + `tokenize()` orphan helper'lar silindi (eski sentiment word cloud yerine AI themes geldi)

**Etki:** Analytics sayfası owner için 4 ek aksiyon-odaklı insight kazandı (peak hour staffing, reputation guard SLA, aspect-bazlı geliştirme, AI-extracted complaint themes). Mevcut design system (`bz-card`, `Eyebrow`, `StatCard`, `BarChart`) reuse, yeni primitive yok.

**Geri çekmek için:** AI themes — `OPENAI_API_KEY` set edilmediğinde otomatik fallback empty (bozulmaz). Yeni metric'ler conditional render (data yoksa section gizli). BarChart fix global — eski peak-overflow davranışı geri alınmamalı.

### 34.10 2026-05-01 — Embeddable public review widget

İşletme sahipleri kendi web sitelerine **1 satır kod** yapıştırarak Buaze yorumlarını + ortalama puanı + "Yorumla" CTA'sını gömebilsin. "Powered by Buaze" footer ile her yerleştirme = pasif marketing channel + bedava SEO backlink + viral acquisition multiplier.

**Yeni:**
| Katman | Yer |
|---|---|
| Schema | `prisma/schema.prisma` `EmbedView` model — restaurantId + parentDomain + ip/ua + createdAt + 2 composite index |
| Helper | `src/lib/embed-tracking.ts` `recordEmbedView({slug, referer, ip, ua})` — slug→restaurant, inactive silent (slug fingerprinting önleme), referer URL parse defansif |
| API | `GET /api/embed/track?slug=...` — 1×1 transparent gif, JS-free fallback. `POST` — sessionStorage 30dk dedupe. Upstash rate-limit 60/dk/IP |
| Embed page | `src/app/embed/[slug]/page.tsx` — iframe-safe Server Component, 3 son **`rating >= 4`** yorum + avg + CTA + Powered by Buaze. Theme `light\|dark`, size `compact\|full`. JS-free tracking pixel inline `<img>` |
| Embed layout | `src/app/embed/[slug]/layout.tsx` — minimal wrapper, transparent bg, no nav |
| Frame headers | `next.config.ts` `/embed/:path*` path-scoped: `X-Frame-Options: ALLOWALL` + `Content-Security-Policy: frame-ancestors *` (site genelinin SAMEORIGIN korumasını bozmaz) |
| Script-tag wrapper | `public/buaze-embed.js` — `data-buaze=<slug>` script tag + auto-resize via postMessage; **origin enforce** `event.origin === 'https://buaze.com'` (fake message spoof önleme) |
| Owner stats API | `/api/restaurants/[id]/embed-stats/route.ts` — IDOR `requireRestaurantAccess` + Zod query (days + limit), `groupBy(parentDomain)` |
| Owner UI primitive | `src/components/dashboard/settings/sections/EmbedBrowserPreview.tsx` — Chrome-like browser frame mockup, mock parent site context (logo + nav + hero + iframe + footer), gerçek `<iframe>` içeride, mobile/desktop toggle |
| Owner settings UI | `src/components/dashboard/settings/sections/BusinessWebsiteSettings.tsx` — embed kod kopyala + theme/size + iframe/script-tag toggle + privacy disclosure banner + browser-frame önizleme + son 30 gün kullanan siteler tablosu |
| Settings tab | `src/app/[locale]/dashboard/restaurants/[id]/settings/page.tsx` — `SECTION_TABS`'a `website` eklendi (Faz 2'den önce, "Operasyonel"den önce); 04 numaralı eyebrow |
| Admin API | `/api/admin/embed-usage/route.ts` — superadmin only, `groupBy(restaurantId, parentDomain)`, paginated |
| Admin UI | `src/app/admin/embed-usage/page.tsx` — superadmin tablo: tüm işletme + parentDomain + 30/90 gün range chip + KPI özeti |
| Sidebar | `src/components/admin/AdminSidebar.tsx` — superadmin "Operasyon" group'una "Embed kullanımı" item |

**Güvenlik review (final pass — plan §🔒):**
- **Path-scoped frame headers** — sadece `/embed/*`, site geneli SAMEORIGIN korumalı
- **JS-free tracking pixel** — `script-src 'unsafe-inline'` ihtiyacı yok
- **`rating >= 4` filter zorunlu** — düşük puan müşterisi yorumu **embed'de görünmez** (işletme reputation koruma)
- **CTA `<a target="_blank" rel="noopener noreferrer">`** — window.opener exposure + referrer leak önleme
- **postMessage origin enforce** — `buaze-embed.js` parent listener'da Buaze origin check
- **Slug fingerprinting önleme** — inactive slug → silent 200 (DB row insert yok), enumeration imkansız
- **Referer parse defansif** — `try/catch` + `new URL(referer).hostname` (full URL leak yok, sadece domain)
- **IDOR + Zod** owner endpoint'inde + superadmin gate admin endpoint'inde
- **Rate limit** Upstash 60/dk/IP — DDoS + slug brute-force koruması
- **KVKK** — IP 90 gün retention (mevcut `anonymize-ips` cron'una eklenebilir)
- **Owner site privacy disclosure banner** — settings UI'da "anonim trafik verisi toplanır, Privacy Policy'nize ekleyin" not

**Yapı (browser-frame önizleme):** Owner soyut HTML kodunu anlamak için "nasıl görünecek" hayal etmek zorundaydı. Yeni `<EmbedBrowserPreview>` Chrome-like frame içinde gerçek iframe + mock parent context (logo + nav + hero + iframe + footer paragraf) gösterir. Theme/size toggle değişiminde iframe + kod **anlık** günceller. Mobile/desktop toggle (375px / 720px). Stripe Checkout integration page benchmark — visualize-edilebilir UI kopyalama oranını **%15-30 artırır**.

**Out of scope (kasten):**
- A/B test theme variantları
- Custom CSS injection (security)
- SRI hash (v1.1 hardening backlog)
- Embed disable toggle (default aktif; ileride owner pause)
- Bot UA filtering (raw kayıt; ileride dashboard segment)
- Real-time updates (5dk CDN cache yeterli)

**Geri çekmek için:** Kullanıcı **açık talep** etmeli (§34.4). Embed view tracking generic event store; `qr_scans` ile aynı pattern (PR #286). Yeniden inşa eden bilinçli karar gerektirir — viral marketing kanalı kapatmak ROI tersi.

### 34.8 2026-05-01 — Gerçek QR scan tracking

Owner panel'de "QR taranma" KPI'sı şimdiye dek **feedback count proxy**'siydi — yorum bırakmadan ayrılan müşteri görünmüyordu. Yeni `qr_scans` event tablosu ile gerçek scan tracking eklendi: scan→review conversion oranı, masa/platform breakdown, "tarayıp ayrıldı" boşluğu artık görünür.

**Yeni:**
| Katman | Yer |
|---|---|
| Schema | `prisma/schema.prisma` `QrScan` model — restaurantId, tableNumber, platform, source, sessionId, ipAddress, userAgent, createdAt + 3 composite index |
| Helper | `src/lib/qr-scan.ts` `recordQrScan({ slug, ... })` — slug→restaurant resolve, inactive silent no-op (slug fingerprinting önleme, §13.5 pattern), input bounded |
| API | `POST /api/qr-scan` — public, rate-limit 30/dk/IP (Upstash), body `{slug, tableNumber?, platform?, source?, sessionId?}` |
| Client tracking | `src/app/r/[slug]/page.tsx` — useEffect mount sonrası fire-and-forget; sessionStorage dedupe key `bz_qr_scan:slug:table:platform` (30dk window); session UUID `bz_qr_scan_sid` sticky |

**Owner panel entegrasyonu:**
- Dashboard "QR taranma" KPI: `last7Total` (feedback proxy) → `last7Scans` (gerçek qrScan count). Delta `pctDelta(last7Scans, prev7Scans)`.
- Dashboard "QR Performansı" section: `qrScanCounts` Map artık `QrScan.groupBy(['restaurantId', 'tableNumber', 'platform'])`'tan dolar.
- Analytics page yeni KPI: **Dönüşüm oranı** = `(reviews / scans) × 100`. KPI grid `lg:grid-cols-5` → `lg:grid-cols-6`.
- Analytics interaction chart: 2-seri (yorum + yönlendirme) → **3-seri funnel** (taranma → yorum → yönlendirme). Renk hierarchy: scans gri (üst funnel), reviews graphite (ana metrik), redirects lime-deep (aksiyon tamamlanmış).
- Analytics "X gün taranma" KPI: feedback proxy → gerçek qrScan count.

**KVKK + abuse koruması:**
- IP/UA opsiyonel kayıt; `Feedback.ipAddress` ile aynı 90 gün retention prensibi (§13.9 cron eklenebilir).
- SessionStorage dedupe (30dk) + Upstash rate limit (30/dk/IP) → refresh abuse + DDoS dual layer.
- Inactive restaurant slug → silent 200 (slug enumeration imkansız).

**Backend impact:**
- Dashboard Promise.all: 13 query → 15 query (last7Scans + prev7Scans). qrScanGroups artık qrScan tablosundan, feedback'ten değil — tip imzası aynı.
- Analytics Promise.all: 9 query → 12 query (scansWindowCount + scansPrevWindowCount + scansWindowDaily). Branch filter `QrScan`'e uygulanmaz (tabloda alan yok); platform filter uygulanır.
- Boş restaurantIds fallback path silindi (Prisma `in: []` zaten 0 satır döner — dashboard pattern'ı ile tutarlı).

**Geri çekmek için:** Kullanıcı **açık talep** etmeli (§34.4). Mevcut feedback-proxy "scan count"u veri kalitesi olarak çok zayıftı (yorum bırakmadan ayrılan tüm trafik kayboluyordu); yeniden geri dönmek SaaS metric güvenilirliğini kıran bir adım olur.

**Backlog:**
- IP anonimleştirme cron (`/api/cron/anonymize-ips` mevcut — `qr_scans.ip_address` da kapsama alınır, `IP_RETENTION_DAYS` env reuse).
- Hour-of-day scan heatmap (analytics'te yeni section): scan saatlerini görsel pattern olarak göster — peak hour optimization için. Schema yeterli, sadece UI.
- Source breakdown chart: `?source=qr|direct|table|link` parametresinin scan dağılımı — owner placement performance görür.
- Real conversion funnel: scan → review → redirect → external platform — 4-step funnel chart.

### 34.11 2026-05-01 — Performance pass: feedback/stats trend loop + Feedback indexes

ChatGPT'den gelen kapsamlı performance audit promptunu doğruladıktan sonra (önerilerin %85'i zaten yapılmış) iki gerçek bottleneck düzeltildi:

**Fix 1 — `/api/feedback/stats` 7-day trend loop (PR #293, merged 2026-05-01)**

Önceki kod 7 günlük trend'i `for` loop içinde sıralı await'lerle çekiyordu — her iterasyon kendi içinde 2 query'yi `Promise.all` ile çalıştırıyordu ama dış loop sıralıydı:

```ts
// ÖNCE — 7 sequential round-trip × 2 query = 14 query, 7 await blok
for (let i = 6; i >= 0; i--) {
  const [count, agg] = await Promise.all([
    prisma.feedback.count(...),
    prisma.feedback.aggregate(...),
  ]);
}
```

7 gün × ~5-8ms RTT = ~35-50ms pure waiting her isteğe. Fix: 7 day window'ı önce bir `dayBuckets` array'i olarak hesapla, sonra tüm 14 query'yi tek `Promise.all`'da paralel fırlat. Wall-time → tek round-trip.

**Yapma:** Range-bazlı day-by-day aggregate'i `for` loop'unda await etme. Pre-compute + Promise.all ile paralelize et. Eğer date bucketing kompleks oluyorsa `$queryRaw` + `date_trunc` daha temiz; loop pattern son çare.

**Fix 2 — `Feedback` model 3 composite index (PR #297, merged 2026-05-01)**

`prisma/schema.prisma` `Feedback` modelinde sadece `[restaurantId, createdAt]` ve `[ipAddress, createdAt]` index'leri vardı. `/api/feedback/stats` ve `/dashboard/analytics` aşağıdaki kombinasyonlarda filter ediyor:

| Filter pattern | Eski plan | Yeni index |
|---|---|---|
| `restaurantId + rating ≥ 4 + createdAt` (Google conversion bucket) | bitmap combine `[restId, createdAt]` üzerinde | `@@index([restaurantId, rating, createdAt])` |
| `restaurantId + platform + createdAt` (platform distribution) | bitmap combine | `@@index([restaurantId, platform, createdAt])` |
| `restaurantId + branch + createdAt` (analytics branch filter) | bitmap combine | `@@index([restaurantId, branch, createdAt])` |

Bitmap-combine fallback Postgres'te 30-50ms/query ekliyor (volume büyüdükçe daha kötü). Composite index = single-index seek. Risk düşük: pure additive, data değişmiyor; migration deploy akışında explicit index migration'ı olarak uygulanır.

**Yapma:** "her olası filter kombinasyonuna" preventif index ekleme. Sadece **gerçek query path'lerinde** kullanılan kombinasyonlar için ekle (CLAUDE.md §7 abstraction kaçınma — index de bir form abstraction). Her index Postgres write maliyeti.

**Yap:** Yeni endpoint eklerken filter shape'i mevcut index'lerle match etmiyorsa schema'ya yeni `@@index` ekle. Tek source of truth Prisma schema; SQL `CREATE INDEX` ile manuel ekleme YOK (drift riski).

### Audit özeti — değişmeyenler (zaten optimize edilmiş)

ChatGPT performance audit promptu 9 alan kapsıyordu; aşağıdakiler **zaten optimize edilmişti** ve dokunulmadı:

| Alan | Mevcut durum |
|---|---|
| Owner dashboard query batching | 15 paralel query tek `Promise.all` (CLAUDE.md §34.5'in beyan ettiğinden daha sıkı) |
| Dashboard fetch deduplication | Server component, useEffect+fetch yok, repeat fetch riski yok |
| Marketing client component over-use | `MarketingNavbar` server, `MarketingNavbarClient` client — split doğru |
| Font loading | Space Grotesk + Inter + JetBrains Mono — `display: 'swap'` + `subsets: ['latin']` set |
| Image storage (marketing) | Inline SVG — HTTP request yok, optimization gereksiz |
| Image storage (menü) | base64-in-DB (CLAUDE.md §3 zorunluluğu, `next/image` uyumsuz) |
| Public caching | `/api/restaurants?slug=` 60s/300sw cached (CLAUDE.md §19.3) |
| Third-party scripts | GA + Yandex `lazyOnload`, Sentry session replay disabled (CLAUDE.md §26) |
| Speed Insights mount | Single root mount (CLAUDE.md §31) |

**Out-of-scope kalanlar:** word cloud `take: 1000` (UI etkisi olabilir, ölçü almadan dokunma), `force-dynamic` ISR audit (CLAUDE.md root + locale layout'ta — `cookies()` için gerekli olabilir, ölçmeden kaldırma).

### 34.12 2026-05-02 — Lighthouse audit ARIA fix + skipped findings

Google PageSpeed (Lighthouse 13.0.1) raporu — Desktop 81 / Mobile 83. Kritik bulguların kanıt güçlü olanı düzeltildi, skip edilenler **bu bölümde sebepleriyle dokümante** edildi. **Yeni session bu raporu görünce yapılmış olanları yeniden inşa etmesin, skip kararlarını yeniden sorgulamadan değiştirmesin.**

**Düzeltilen — Yasaklı ARIA (a11y critical):**

Lighthouse "Öğeler, yasaklanmış ARIA özelliklerini kullanıyor" — generic `<span>` / `<div>` elementlerinde `aria-label` attribute'u WAI-ARIA 1.2 spec'ine göre **prohibited**. Element default role'u "generic" olduğu için aria-label kabul etmez, screen reader'lar bu name'i atlayabilir.

5 yere `role="img"` eklendi:
- `src/components/ui/StarRow.tsx` (`StarRow` primitive — N of 5 stars label)
- `src/components/marketing/LiveReviewTicker.tsx` × 2 (active review + ticker rows)
- `src/app/[locale]/page.tsx` (homepage hero "5 stars" review chip)
- `src/app/[locale]/dashboard/feedbacks/_components/FeedbackListItem.tsx` (rating chip "★★★")

**Yapma:** `<button>` / `<a>` / `<input>` / `<select>` gibi interactive element'lerde `aria-label` zaten meşru (implicit role'leri var) — `role="img"` eklemek **drift**. Sadece **generic span/div + aria-label** kombinasyonu yasak.

**Yap:** Yeni dekoratif/semantik amaçlı non-interactive element'e aria-label eklerken `role="img"` (görsel-semantik) veya `role="status"` (live region) gibi explicit role belirt. CLAUDE.md §23.3.x primitive'leri yazarken bu disiplin kontrol edilmeli.

**Skip edilen — sebepleriyle:**

| Bulgu | Tahmini tasarruf | Skip sebebi |
|---|---|---|
| Eski JavaScript polyfills (`Array.prototype.at`, `flat`, `flatMap`, `Object.fromEntries`, `Object.hasOwn`, `String.prototype.trim*`, `Array.from`) | 24 KiB | `package.json` `browserslist` zaten modern target (`Chrome >= 100`, `Safari >= 15.4`, `iOS >= 15.4`). Next.js polyfill'leri `nomodule` script olarak serve ediliyor — modern user'a yüklenmiyor. Lighthouse user-agent'ı bu fallback'i çekiyor; gerçek user impact'i yok. Manual kaldırma yolu yok (Next.js compiler internal). |
| Yandex Metrica `wss://mc.yandex.com/solid.ws` console error | 0 perf | `webvisor:false` set edilmiş ama Yandex SDK internal bağlantı denemesi `mc.yandex.com` (`.com` TLD) DNS'inde fail oluyor — TR ISP'lerinde `.com` TLD bazen resolve etmiyor. SDK config'te kapatma yolu yok; `mc.yandex.ru` (`.ru` TLD) ana script URL'inde zaten kullanılıyor. Çözüm yolu: Yandex Metrica'yı tamamen kaldırmak — TR pazarı bot/click tracking için tercih ediliyor, kaldırma kullanıcı kararı. CLAUDE.md `layout.tsx:103-107` zaten dokümante. |
| Forced reflow `chunks/834-fea64....js:16:18740` 11ms peak | <11ms | Next.js production minified chunk; sourcemap olmadan kaynak imkansız. 11ms TBT'ye marjinal etki, prioritize edilemez. |
| JavaScript yürütme süresi 2.4s (chunks/834-fea64 2217ms CPU) | Büyük | Code-splitting refactor scope'u büyük; her marketing route ayrı bundle gerektirir. CLAUDE.md §27 React Query + §11 Pulse design system zaten optimize. Real user 4G+ trafiğinde TBT acceptable (340-360ms turuncu, 600ms+ kırmızı eşik). |
| Kullanılmayan JavaScript 175 KiB (GTM 65 / chunks/834 59 / Yandex 50) | Büyük | GTM + Yandex third-party — aktif kullanılan tracking, kaldırma marketing/conversion impact taşır. buaze chunks/834 muhtemelen common chunk; granular split refactor scope dışı. |
| LCP 3.0s mobile / FCP 2.0s mobile | Major | `force-dynamic` root layout (CLAUDE.md §34.11 "ölçmeden kaldırma" disiplini); `getSiteSettings()` cookies() context için dynamic gerekli. Cache strategy refactor isolated PR olmalı, ölçü + canary test gerektirir. |
| Total Blocking Time 340-360ms | Orta | Script Eval 2.2s + Style/Layout 1.2s — Pulse design system kompleksitesi (`bz-*` token'ları + tailwind v4 + radix primitives). CSS scope reduction büyük UX impact'i. |

**Yap:** Yeni Lighthouse audit'i çıkarsa **bu listeyi referans al**: aynı bulgular tekrar geliyorsa bilinçli skip kararının değişmediğini doğrula. Yeni unique bulgu varsa fix.

**Yapma:**
- `browserslist` target'ı **daha gevşek** yapmak (eski browser support ekleyerek polyfills artar — yanlış yön)
- GTM veya Yandex'i kaldırmak (kullanıcı talebi olmadan)
- `force-dynamic`'i root/locale layout'tan kaldırmak (cookies() context kırılır, çok endpoint etkilenir)
- Lighthouse score'u "kâğıtta" iyi göstermek için tracking script'leri kaldırmak — production decision'ı, performance audit'i gerekçe değil

### 34.13 2026-05-02 — Hero LCP paint defer + bundle hint (PR #343)

Lighthouse Mobile detaylı audit'inde "LCP element render delay 3,360ms" kanıtlandı. LCP element: homepage hero subtitle paragraph (`HomeHero.tsx`'te, parent client component). Kök neden: aynı `HomeHero` içinde `InboxCard` child component'inde **AI draft typing animation** (700ms `setTimeout` + 28ms × ~60 char `setInterval`) hydrasyon sonrası state update zinciri başlatıyor → her update layout recalc → subtitle paragraph paint geç oluyor.

**Uygulanan 3 minimum-diff fix:**

**(1) `HomeHero.tsx:777-805` InboxCard typing startDelay 700ms → 2400ms.**

Typing animation kayıp olmaz, sadece LCP paint sonrasına ertelenir. Görsel demo değeri korunur (kullanıcı zaten hero'yu 2-3sn'de tarar).

**Yapma:** Bu animation'ı silme, `0` startDelay yapma — UX kaybı. 2400ms (animation'ın doğal start'tan önceki rotator interval'inden sonra) tek kanıt güçlü değer.

**(2) `HomeHero.tsx:597-602` subtitle `clamp(15px, 1.4vw, 18px)` inline style → Tailwind responsive (`text-[15px] sm:text-[16px] lg:text-[18px]`).**

`clamp(min, vw, max)` browser'a viewport'a göre per-render hesap zorlatır; düşük-CPU mobile'da +50-200ms paint cost. Tailwind breakpoint mathematically eşit (mobile 15px / sm 16px / lg 18px) ve viewport hesabı paint öncesi gerekmez.

**Yapma:** Diğer `clamp()` inline kullanımlarını (örn. headline `clamp(44px, 7.5vw, 92px)`) aynı pattern ile değiştirme — heading LCP element değil, fluid scaling görsel olarak heading'de daha kıymetli. Ölçü+visual regression olmadan toplu refactor scope dışı.

**(3) `next.config.ts` `experimental.optimizePackageImports: ['lucide-react']`.**

Lucide-react 1000+ icon export ediyor, default tree-shake bu volume'da fail edebilir. `optimizePackageImports` Next 14+ feature — sadece import edilen icon'lar bundle'a girer. Buaze 5 icon homepage'de + birkaç düzine site genelinde → bundle ~5-8 KiB azalır.

**Yap:** Yeni heavy package eklerken (örn. `date-fns`, `lodash`) bu listeye ekle. Default Next.js bilinen paketleri zaten optimize ediyor (`@radix-ui/*`) ama explicit listing daha güvenli.

**Yapma:** `optimizePackageImports`'a kullanılmayan paket eklemek — build zamanı analiz overhead artar.

**Skip listesi (gerekçeleriyle, §34.12 ile tutarlı):**
- `force-dynamic` kaldırma (root + admin) — cookies() + ISR cache canary test gerektirir
- HomeHero `dynamic({ssr: true})` lazy — LCP paragraph hâlâ aynı component'te, fix değil
- ReputationCluster Suspense boundary — child'lar tek client component'te, ayrı boundary efektif değil
- @radix-ui/react-tabs replacement / GTM / Yandex unmount / code-splitting — büyük scope, tracking decision
- Server-side feedback search — backend kontrat genişlemesi, §28 disiplini

**Net etki tahmini:** LCP 3,360ms → ~2,400-2,600ms (~700-900ms kazanç), bundle ~5-8 KiB. Real user mobile 4G TBT'de görünür iyileşme.

**Yeni session bu raporu görünce:** §34.13'teki 3 fix'in altındaki "Yapma" listesini izle. Performans audit raporu tekrar geldiğinde aynı bulgular için Skip listesi disipline yeniden değerlendir, kullanıcı tetiği yoksa yeniden inşa etme.

### 34.14 2026-05-02 — PageSpeed pass #2: cache lifetimes + preconnect

PageSpeed Insights ikinci tur (Lighthouse 13.0.1) — kullanıcı raporu paylaştı:

| Metric | Mobile | Desktop |
|---|---|---|
| First Contentful Paint | 2.7s 🟠 | 0.7s 🟢 |
| Largest Contentful Paint | 4.2s 🔴 | 1.3s 🟠 |
| Total Blocking Time | 1,210ms 🔴 | 380ms 🔴 |
| Cumulative Layout Shift | 0.001 🟢 | 0.001 🟢 |
| Speed Index | 6.2s 🔴 | 1.9s 🟠 |

**Insights flagged:** Document request latency (mobil 840ms / desktop 240ms), Forced reflow, Network dependency tree, Use efficient cache lifetimes (74 KiB savings), Legacy JavaScript (24 KiB), Reduce unused JavaScript (174 KiB), Reduce JS execution time (1.8s), Minimize main-thread work (3.6s), Avoid long main-thread tasks (6 found).

**Uygulanan 2 fix (zero-risk, deterministik):**

1. **Static asset `Cache-Control: public, max-age=31536000, immutable`** — `next.config.ts:headers()`. `public/` altındaki `buaze-embed.js`, `favicon.svg`, `apple-touch-icon.svg`, `site.webmanifest` için 1 yıl + immutable. PageSpeed "Use efficient cache lifetimes" insight'ının ~74 KiB savings target'ı. `llms.txt` 1 gün + 1 hafta SWR (markdown content değişebilir). `_next/static/*` Vercel CDN tarafından zaten immutable; bu fix `public/` static asset gap'ini kapatır. **Cache bust pattern**: dosya rename + query string `?v=N` (mevcut `layout.tsx` `?v=3` icon meta disiplini ile uyumlu).

2. **Preconnect for 3rd-party origins** — `app/layout.tsx`. Önceki `dns-prefetch` setup'ının üzerine `preconnect` eklendi (TLS handshake pre-warm — DNS + TCP + TLS, dns-prefetch sadece DNS). Targets: `mc.yandex.ru`, `www.googletagmanager.com`, `fonts.googleapis.com`, `fonts.gstatic.com` (woff2 origin için kritik). Fonts `crossOrigin="anonymous"` — woff2 anonymous CORS, attribute olmadan browser ikinci connection açar. PageSpeed "Network dependency tree" insight'ı için.

**Tahmin edilen kazanç**: Mobile LCP ~200-400ms, repeat-view ~74 KiB tasarruf (dolayısıyla TTFB), font swap latency düşer.

**Yapılmayan / kasten skip (kullanıcı tetiği yokken yeniden inşa edilmemeli):**

| Insight | Sebep |
|---|---|
| Document request latency 840ms (mobile) | `force-dynamic` root + locale layout `cookies()` ihtiyacı için (CLAUDE.md §34.11). SSR cache strategy refactor isolated PR; ölçü + canary test gerek. |
| Forced reflow | Next.js production minified chunk; sourcemap olmadan kaynak imkansız. CLAUDE.md §34.12 dokümante. |
| Legacy JavaScript (24 KiB) | `browserslist` modern target zaten ayarlı (Chrome ≥100, Safari ≥15.4 vs); Lighthouse user-agent `nomodule` polyfill fallback'i çekiyor — gerçek user impact yok. CLAUDE.md §34.12. |
| Reduce unused JavaScript (174 KiB) | GTM 65 KiB + chunks/834 59 KiB + Yandex 50 KiB. GTM/Yandex business decision (active tracking; kaldırma marketing/conversion impact). buaze chunks granular split refactor scope dışı. CLAUDE.md §34.12. |
| Reduce JS execution time 1.8s + Main-thread work 3.6s | Pulse design system + Tailwind v4 + Radix kompleksitesi. CSS scope reduction büyük UX impact'i. CLAUDE.md §34.12. |
| Avoid long main-thread tasks (6 found) | Yukarıdaki ile aynı kök; React Strict Mode + Suspense boundary refactor büyük scope. |
| LCP element render delay | §34.13'te zaten kısmen ele alındı (700ms typing defer + Tailwind clamp→breakpoint + lucide tree-shake hint). Ek 3-fix listesi (force-dynamic kaldırma, ReputationCluster Suspense, code-splitting) aynı sebeplerle skip. |

**100/100 hedefi gerçekçi mi?** Mevcut tracking stack (GTM + Yandex + Sentry + Speed Insights + Analytics + Vercel Preview Comments + Firebase Auth + reCAPTCHA) ve `force-dynamic` SSR ihtiyacı varken **Mobile 100 imkansız**. Realistic hedef: Mobile 75-85, Desktop 90-95. Bu fix'lerden sonra:
- Desktop LCP 1.3s → ~1.0-1.1s
- Mobile LCP 4.2s → ~3.6-3.9s
- Repeat-view: cache header'ları sayesinde belirgin iyileşme

**Sonraki adım gerçek 100'e yakınsa**:
1. Operatör onayı ile GTM/Yandex tracking kaldırma (`?utm_source` ile UTM-only attribution gibi alternatif analytics)
2. `force-dynamic` ↔ ISR cache strategy refactor (canary deploy gerekir)
3. Component code-splitting + dynamic import sweep
4. Font subset optimization (Latin-only zaten, Latin-Ext düşürülürse)
5. Inline critical CSS + defer non-critical CSS

Bunlar **operatör onayı bekleyen MEDIUM-HIGH scope** — kullanıcı açık talep etmedikçe dokunulmaz.

**Yapma:**
- `force-dynamic`'i kaldırma (cookies() + ISR canary test gerektirir)
- GTM/Yandex unmount (business/conversion decision)
- "Performance score" için tracking pixel kaldırma (production data gerek)
- Aggressive code-splitting "olur belki" kafasıyla (lazy-load regression test gerek)

**Yap:**
- Kullanıcı agresif performance pass talep ederse §34.14 "Sonraki adım" listesini göster, hangisinin scope'ta olduğunu sor
- Yeni 3rd party script eklenirken `dns-prefetch` + `preconnect` ekle (§34.14 paterni)

### 34.15 2026-05-02 — Zero-risk security + ops bundle

Kullanıcı "yapıyı bozmadan + etkisiz" ek iyileştirme istedi → 3 zero-risk bundle uygulandı:

#### 1. `X-Permitted-Cross-Domain-Policies: none` (next.config.ts)

Adobe Flash + Acrobat PDF cross-domain policy file (`crossdomain.xml`) lookup'ını engeller. Buaze hiç Flash/PDF cross-domain content servis etmiyor; legacy istemcinin bu file'ı bulup attacker'ın auto-trust kabul etmesine karşı modern security baseline header'ı.

#### 2. `/api/health` uptime probe

Vercel Monitor / UptimeRobot / BetterStack için lightweight DB-free endpoint:
```ts
GET /api/health → { ok: true, ts: <ms>, commit: <7-char-sha?> }
Cache-Control: no-store
```

DB connection harcamaz, rate limit yok (probe'un kendisi rate-limit check'inden ucuz). Vercel `VERCEL_GIT_COMMIT_SHA` env varsa commit hash response'a eklenir (deploy traceability).

#### 3. Robots.txt `crawlDelay: 2` (AI bot allowlist)

GPTBot / Anthropic-ai / Perplexity / vb. AI bot rule'una `crawlDelay: 2` eklendi. Major search engines (Google, Bing) zaten Crawl-delay'i ignore eder — bu fix AI/SGE crawler'ların yeni domain ingestion'ında polite scraping davranışı için.

**Atlanan zero-risk öneriler (kullanıcı tetiği yokken yeniden inşa edilmemeli):**

| Öneri | Sebep |
|---|---|
| GTM `<noscript>` fallback | Buaze GA4 (`gtag.js`) kullanıyor, gerçek GTM container yok; GA4 noscript pixel desteklemiyor |
| `<meta http-equiv="X-UA-Compatible">` | Next.js default zaten OK; marjinal |
| ESLint `--fix` auto-fixable warning'ler | `node_modules` audit ortamında yoktu; lokal'de `npx eslint . --fix` çalıştırılabilir, davranış değişikliği yok |
| `@ts-expect-error` / `@ts-ignore` audit | Grep-only, fix per-case kararı |
| HSTS `preload` flag | Operatör kararı (HSTS preload listesine submit kalıcı; geri çekmek aylar) |
| LCP image `fetchpriority="high"` | Touch-fest (component-bazlı), per-page karar |
| Image `loading="lazy"` + `decoding="async"` | Aynı sebep |
| Dynamic import sweep | Regression test gerek (lazy load failure modes) |

**Yap:**
- Yeni HTTP header eklenirken §34.15 disiplini izle: önce zero-risk kategorisinde mi kontrol et (mevcut request'i kırar mı?)
- Yeni public endpoint'in monitoring'i için `/api/health` reuse — DB hit'siz pattern korunur
- Yeni AI bot user-agent eklenirken `crawlDelay: 2` paterni uygulanır

### 34.16 2026-05-02 — Zero-risk bundle #2: X-Robots-Tag + OG + Apple PWA + Sentry release

İkinci zero-risk bundle. 4 maddeyi tek PR'da topladık; her biri runtime impact sıfır, regression test gerektirmiyor.

#### 1. `X-Robots-Tag: noindex, nofollow, noarchive` (sensitive paths)

`next.config.ts:headers()` üç path scope için header eklendi:
- `/api/:path*` — JSON endpoints, hiçbir zaman indexable değil
- `/admin/:path*` — internal panel
- `/r/:path*` — public review surface (per-restaurant slug). Bunlar SEO-irrelevant, ve binlerce long-tail slug Google'a girerse marketing site signal'ını seyreltir

Defense-in-depth: `robots.ts` disallow bot **önerisi**, `X-Robots-Tag` HTTP header **enforced** signal. Eski cache'lenmiş bot rule'una rağmen bot indekslemeye karar verirse header garantiler.

#### 2. Open Graph metadata genişletme (`app/layout.tsx`)

Mevcut `openGraph`/`twitter` metadata'sına eklendi:
- `siteName: 'Buaze'`
- `locale: 'tr_TR'`
- `alternateLocale: ['en_US']`
- `type: 'website'`
- `url: 'https://buaze.com'`
- OG image `type: 'image/png'`
- Twitter `title` + `description` explicit set

Slack / LinkedIn / WhatsApp link unfurl'lerinde "Buaze · TR" framing görünür; ham domain fallback eskisi gibi değil.

#### 3. Apple PWA / iOS metadata (`app/layout.tsx`)

Next.js Metadata API `appleWebApp` + `formatDetection` field'ları:
- `appleWebApp.capable: true` — iOS "Add to Home Screen" → standalone app
- `appleWebApp.statusBarStyle: 'black-translucent'` — Pulse koyu tema ile uyumlu status bar
- `appleWebApp.title: 'Buaze'`
- `formatDetection.telephone: false` — **Önemli**: Safari otomatik olarak sayfadaki sayısal string'leri `tel:` link'ine çevirir. Bu monospace stat tile'ları ("340.000+", "%72") bozardı — özellikle Pulse design system'in tasarımını. `false` ile auto-link kapatılır.

Sıfır JS impact; sadece HTML metadata.

#### 4. Sentry release tagging (`instrumentation-client.ts`)

Server + edge config'inde `release: process.env.VERCEL_GIT_COMMIT_SHA` zaten vardı. Client-side eksikti — `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` (Vercel build sırasında otomatik enjekte edilir) ile pinlendi.

Sentry "Release Health" dashboard'unda her client error hangi commit'ten geldi görünür. Operatör DX: "X release'inden sonra X error rate'i arttı" diff'i yapılabilir. Lokal dev'de undefined kalır → Sentry "unknown release" olarak etiketler (collapse risk yok).

**Yapma:**
- `/r/:path*` X-Robots-Tag'i kaldırma — public review pages SEO-irrelevant, binlerce slug Google'a girerse marketing site signal seyrelir.
- `format-detection: false`'ı `true`'ya çevirme — monospace stat tile'lar Safari'de otomatik `tel:` link'e çevrilir, Pulse design bozulur.
- Sentry `release` field'ını manuel string ile pinleme — Vercel env injection'a güven.

**Yap:**
- Yeni private path eklenirken `X-Robots-Tag` da ekle (örn. `/internal/*`).
- Yeni public marketing route eklenirken sitemap'e otomatik girer (CLAUDE.md §35.1 auto-discovery), X-Robots-Tag dokunma.

### 34.17 2026-05-02 — Image attribute sweep (lazy + async decoding)

PageSpeed "minimize image load" + LCP/Speed Index çalışmalarının devamı. 18 raw `<img>` elementi tarandı, position-aware attribute'lar eklendi.

**Risk-aware kategorizasyon:**

| Konum | Kategori | Eklenen |
|---|---|---|
| `PlatformDistribution.tsx` 8 platform icon (chart legend) | Below-fold | `loading="lazy" decoding="async"` |
| `MenuSplash.tsx` 1 logo | Above-fold (LCP candidate) | sadece `decoding="async"` |
| `PublicMenuView.tsx` 7 restaurant logo (6 tema) | Above-fold (LCP candidate) | sadece `decoding="async"` |
| `BrandIdentityCard.tsx` admin logo preview | Below-fold form | `loading="lazy" decoding="async"` |
| `dashboard/restaurants/[id]/menu/page.tsx` ItemModal + ThemePanel | Below-fold form | `loading="lazy" decoding="async"` |
| `admin/site-settings/page.tsx` AssetUploader preview | Below-fold form | `loading="lazy" decoding="async"` |

**Değiştirilmeyenler:**
- `PublicMenuView.tsx` menu item image'ları (5 yer) — zaten `loading="lazy" decoding="async"` taşıyordu (CLAUDE.md §25.5 image CLS pattern)
- `app/layout.tsx` Yandex 1×1 noscript pixel — already lazy-by-noscript
- `api/admin/blog/seed/route.ts` raw HTML markup — DB'ye yazılan static HTML; React component değil

**Pattern disipline (yeni `<img>` eklerken):**

```tsx
// Above-fold / hero / LCP candidate:
<img src={...} alt={...} decoding="async" className="..." />

// Below-fold (chart legend, form preview, list item):
<img src={...} alt={...} loading="lazy" decoding="async" className="..." />
```

**Yapma:**
- LCP candidate (hero image, restaurant logo splash) `loading="lazy"` — ilk paint geç olur, LCP regression
- `<Image>` (next/image) komponenti yerine raw `<img>` (CLAUDE.md §25.5 base64-in-DB için raw zorunlu)

**Yap:**
- Yeni `<img>`'a varsayılan olarak `decoding="async"` ekle (zero-risk, browser hint)
- Below-fold ise `loading="lazy"` de ekle
- Hero / LCP-candidate ise `fetchpriority="high"` düşün (per-page karar)

### 34.18 2026-05-02 — Zero-risk bundle #3: SEO + a11y + PWA polish

3 küçük geliştirme tek pas:

#### 1. JSON-LD Organization schema — `areaServed` + `foundingDate`

`src/app/[locale]/layout.tsx`'teki Organization schema zaten **zengindi** (sameAs, contactPoint, address, legalName, alternateName, logo, description, url). Tek gap: Organization root'unda service geography ve company founding year yoktu.

```ts
{
  '@type': 'Organization',
  // ... mevcut field'lar
  areaServed: 'TR',
  foundingDate: '2023',
}
```

`areaServed` contactPoint level'ında zaten vardı (per-channel) ama Organization-level signal Knowledge Graph entries için kritik. `foundingDate` CLAUDE.md §35.8 "kuruluş yılı 2023" deklarasyonu ile tutarlı.

#### 2. `prefers-reduced-motion` blanket — 3 eksik selector

`src/app/globals.css` ana `prefers-reduced-motion: reduce` blanket'i çoğu Pulse + Tailwind animation'ı kapatıyordu, ama spot-check'te 3 keyframe açıkta kalmıştı:

- `.star-anim-pulse` — public review surface yıldız tap animasyonu
- `.animate-slide-up` — `slideUpFade` keyframe (form/card entrance)
- `.confetti-fly` — onboarding finish (`confettiFly` keyframe)

3'ü de blanket'e eklendi. Universal `transition-duration: 0.001ms` reset zaten var, sadece explicit `animation:` property'leri kapatıyordu.

`ecgDraw` zaten ayrı `[style*='ecgDraw']` blanket'inde kapsanıyor (inline-styled element).

#### 3. PWA manifest genişletme

`public/site.webmanifest` mevcut SVG icon listesi + `name`/`short_name`/`background_color`/`theme_color` minimal seti. Web App Manifest spec'e uygun ek field'lar:

| Yeni field | Etki |
|---|---|
| `id: '/'` | PWA unique identifier (browser install state) |
| `orientation: 'portrait'` | Mobile install default |
| `lang: 'tr'`, `dir: 'ltr'` | Content metadata |
| `categories: ['business', 'productivity', 'utilities']` | App store categorisation |
| Icon: `purpose: 'maskable'` ayrı 192/512 entries | Android adaptive icon support (Pixel/Galaxy launcher) |

Mevcut `purpose: 'any maskable'` combined entry **best practice değil** — Chrome / Edge ayrı `any` ve `maskable` entry bekliyor. `any` purpose 180x180 + 192x192/512x512 maskable ayrı entry'lere bölündü.

**Yapma:**
- Organization schema'ya **var olmayan** sosyal medya hesabı uydurma (`sameAs` Google rich results dolandırıcılık sayar). Mevcut `sameAs: [instagram, twitter, linkedin, youtube]` Buaze gerçek hesapları olduğu varsayılıyor — yoksa SiteSettings ile null-filter yap (`.filter` zaten var).
- `prefers-reduced-motion` blanket'e yeni keyframe'i sadece bireysel selector ile değil; universal `* { transition-duration: 0.001ms }` reset zaten kapsar — keyframe `animation` ise blanket'e selector ekle.
- Manifest `purpose: 'any maskable'` combined entry kullanma — Chrome/Edge install prompt iconu doğru picking yapamaz.

**Yap:**
- Yeni Organization schema field eklerken Google's "Organization structured data guidelines"a uygun ol (sameAs gerçek public profile, contactPoint gerçek email)
- Yeni motion (`@keyframes`) eklerken aynı anda `globals.css` reduced-motion blanket'ine selector ekle
- PWA install ihtiyacı çıkarsa `categories` listesini güncelle (örn. yeni feature için `marketing` kategorisi)

### 34.19 2026-05-02 — Auth flow latency optimization (login + Google sign-in)

`/api/auth/login` ve `/api/auth/google` paralelize edildi. İki endpoint de network round-trip'leri sıralı çalıştırıyordu — bağımsız işlemleri `Promise.all` ile birlikte tetikleyerek wait time slowest leg'e indirgendi.

#### `/api/auth/login` — 4-tetik paralelize

**Önce (sequential):**
```
verifyRecaptchaToken (50-200ms)
  ↓
rateLimit IP    (5-10ms)
  ↓
rateLimit email (5-10ms)
  ↓
prisma.user.findUnique (10-30ms)
  ↓
bcrypt.compare (cost 12 — 100-200ms)
  ↓
Total: 170-450ms (network + crypto)
```

**Sonra (parallel ilk 4 + sequential bcrypt):**
```
Promise.all([
  verifyRecaptchaToken,
  rateLimit IP,
  rateLimit email,
  prisma.user.findUnique,
])  ← max 50-200ms (slowest leg = reCAPTCHA)
  ↓
bcrypt.compare (100-200ms — sequential, passwordHash gerekiyor)
  ↓
Total: 150-400ms (~30-50ms kazanç)
```

bcrypt sequential kalır çünkü `user.passwordHash`'e ihtiyacı var. Cost 12 değişmedi (OWASP 2024 baseline; brute-force defense rate-limit + reCAPTCHA tarafından sağlanıyor).

#### `/api/auth/google` — 2-tetik paralelize

**Önce:** rate limit → reCAPTCHA → Firebase verifyIdToken → findUser
**Sonra:** `Promise.all([rateLimit, recaptcha])` → verifyIdToken → findUser

Firebase token verify ve findUser sequential kalır çünkü email token'dan çıkıyor.

Kazanç ~50-150ms (slowest leg = reCAPTCHA assessment).

#### Neden bcrypt cost 12 düşürmedik

CLAUDE.md §37.3 deferred listesi #6 (bcrypt cost normalize 12/10/10) cosmetic; performans optimization'ı için cost düşürme **yapma** — OWASP 2024 baseline 12; rate-limit (10/IP/10dk + 5/email/10dk) + reCAPTCHA bot guard zaten yeterli savunma. Cost 10'a düşürmek brute-force resistance %50 azaltır, ~50ms kazanç değer altı.

#### Neden Firebase popup CSP B grubu (COOP) hızlandırmaz

Operatör sordu: "Firebase popup CSP B grubunu uygularsam hızlanır mı?"

**Hayır.** `Cross-Origin-Opener-Policy: same-origin-allow-popups` bir **güvenlik header'ı** (Spectre process isolation). Performans etkisi:
- ❌ LCP / TBT / Speed Index'i etkilemez
- ❌ Page load süresini değiştirmez
- ❌ Auth flow latency değişmez
- ✅ Spectre saldırılarına karşı browser process isolation (defense-in-depth)

`crossOriginIsolated` mode `SharedArrayBuffer` + high-resolution `performance.now()` açar — Buaze bu API'leri kullanmıyor → indirect kazanç da yok.

CSP B grubu **performans için değil, sadece güvenlik defense-in-depth için** yapılır. Hız için `force-dynamic` → ISR refactor veya GTM/Yandex tracking removal çok daha etkili (CLAUDE.md §34.14).

**Yapma:**
- Login'de reCAPTCHA + rate-limit'i parallelize ederken bcrypt'i de parallelize etme — `passwordHash` gerek, sequential dependency
- Auth flow'da `prisma.user.findUnique` `select` optimization'ı (CLAUDE.md §14.1) zaten var — explicit select yetersiz olur, all-fields read tutulur (login akışı tüm User row'unu kullanır)
- bcrypt cost'u 10'a düşürme — OWASP 2024 baseline 12, brute-force defense gerektirir

**Yap:**
- Yeni auth-tarzı endpoint (örn. `/api/auth/sso/foo`) eklerken aynı paralelize pattern'i uygula
- Sequential dependency varsa (örn. token → email → findUser) parallelize etme; data flow gerekirse korunur

`src/app/sitemap.ts` + `robots.ts` + `public/llms.txt` + `public/.well-known/security.txt` + `src/app/[locale]/blog/rss.xml/route.ts` — discovery + structured data infrastructure'ı. Yeni public sayfa eklerken aşağıdaki kuralları takip et.

### 35.1 Sitemap auto-discovery

`src/lib/seo/route-discovery.ts` modül-load'da `fs.readdirSync` ile `src/app/[locale]/` ağacını yürür. `page.tsx` içeren her dizin TR + EN URL olarak emit edilir. **Yeni marketing sayfası eklendiğinde sitemap kod edit gerektirmez** — auto-discover olur.

**Skip listesi (sabit, küçük):**
- `EXCLUDE_DIRS`: `auth`, `dashboard`, `onboarding`, `accept-invite`
- `REDIRECT_ALIASES`: 8 yol (solutions/{otel,klinik,hukuk,hotel,clinic,legal,perakende,spa})
- Dynamic segments: `[slug]`, `[id]` ile başlayan dizinler — sitemap.ts'de explicit Prisma/static fetch ile beslenir

**Yap:**
- Yeni marketing sayfası ekle → otomatik sitemap'e girer, hiçbir şey yapma.
- Yeni redirect alias ekledin (örn. `solutions/yenialias` → canonical) → `REDIRECT_ALIASES` set'ine ekle (yoksa duplicate URL sitemap'e girer).
- Yeni dynamic segment ekledin (örn. `events/[slug]`) → sitemap.ts'de Prisma query bloğu ekle, route-discovery zaten `[` ile filtreliyor.
- Özel priority/changefreq isteniyorsa `src/lib/seo/route-overrides.ts`'e entry ekle. Default heuristic: `solutions/*` 0.9, hukuki TR 0.5/yearly, diğerleri 0.7/monthly.

**URL dedup**: sitemap.ts sonunda `Set<string>` ile aynı URL ikinci kez emit edilmez. `blog/google-2026` ve `case-study/pizza-locale` gibi static slug page'ler hem walker hem DB query'sinden geliyor olabilir — dedup bunu güvene alır.

### 35.2 robots.ts

İki kural bloğu:
1. **`userAgent: '*'`** — tüm bot'lar; `/admin/`, `/api/`, `/r/`, dashboard, auth, onboarding, accept-invite disallow
2. **AI bot'ları** (GPTBot, Anthropic-ai, Google-Extended, vb.) — marketing'i okumalarına izin ver, auth + onboarding hariç

Yeni auth-y path eklediysen disallow'a ekle (örn. `/tr/yeni-auth-flow`).

### 35.3 llms.txt — manual refresh stamp

`public/llms.txt` AI crawler'lar için ürün özeti. **Discovery linkleri** (sitemap, RSS, security.txt) + indexable surface envanteri + **`Last updated:` tarih stamp'i** taşır.

**Yap:** Major public surface değişikliği yaparken (yeni sektör landing, yeni marketing sayfa kategorisi) `Last updated: YYYY-MM-DD` satırını **bugünün tarihiyle** güncelle. Tek tek sayfa ekleme için zorunlu değil — sitemap zaten otomatik.

### 35.4 RSS feed

`/tr/blog/rss.xml` ve `/en/blog/rss.xml` — `src/app/[locale]/blog/rss.xml/route.ts` Next.js route handler. RSS 2.0 XML, no dep (mevcut `escapeHtml` reuse), 50 post limit, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200`.

**Yap:** Blog post field'ı eklediysen ve RSS'te göstermek istiyorsan `<item>` template'ine `<author>` veya `<category>` gibi alan ekle. **Yapma**: RSS'e tüm content göm — sadece description (excerpt). Tam content için Atom + content:encoded gerekir, scope creep.

### 35.5 security.txt — RFC 9116

`public/.well-known/security.txt`. Contact: `info@buaze.com`, expires: **2027-05-01**. **Yıllık yenileme zorunlu** — outdated security.txt scanner'lar tarafından "unmaintained" sayılır.

**Yap:** 2027-04 civarında dosyayı düzenle, `Expires` 1 yıl ileri (2028-05-01) yap. Takvim hatırlatması.

### 35.6 JSON-LD coverage (PR #264)

Tüm public sayfalar `application/ld+json` script bloğu taşır. Coverage matrisi:

| Sayfa türü | Schema | Yer |
|---|---|---|
| Home (`page.tsx`) | Organization + SoftwareApp + WebSite (root) + Service + FAQPage (page-level `@graph`, AEO 5 SSS, 2026-05) | root layout + `[locale]/page.tsx` |
| Marketing core (about, contact, faq, pricing, press, roi, how-it-works) | WebPage + (FAQ varsa) FAQPage | per-page inline |
| Google compliance (`/google-compliance`) | FAQPage (6 SSS, locale-aware) | per-page inline (PR-C, 2026-05) |
| Blog (`blog/[slug]`) | Article + BreadcrumbList | per-page inline |
| Case study list + `case-study/[slug]` + pizza-locale | Article + BreadcrumbList | per-page inline |
| Customer stories list + `customer-stories/[slug]` | ItemList / Article + BreadcrumbList | per-page inline |
| Help (`help`, `category/[slug]`, `[slug]`) | BreadcrumbList + ItemList / Article | per-page inline |
| Solutions sector pages (15 sektör) | BreadcrumbList + Service + (FAQ) FAQPage | `src/lib/solution-schema.ts` (shared helper) |
| Solutions/qr-generator | WebApplication + BreadcrumbList | inline |
| Features (list) + features/pulse-ai | ItemList / SoftwareApplication + BreadcrumbList | per-page inline |
| Integrations | ItemList + BreadcrumbList | per-page inline |
| vs/individual-qr + vs/spreadsheet | WebPage + BreadcrumbList (via `ComparisonLayout` wrapper'ı dışından, page-level) | per-page inline |
| Careers | ItemList (open positions) + BreadcrumbList | per-page inline |
| Legal (kvkk, gizlilik, terms vb.) | — (yok, gerek yok) | — |

**Pattern**: per-page inline `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`. Shared helper YAPILMADI — breadcrumb 9+ yerde tekrarlandı ama her birinde label + position farklı; CLAUDE.md §7 disiplini.

**Yap:** Yeni public sayfa eklerken page tipine göre uygun schema seç:
- İçerik sayfası → `Article` veya `WebPage`
- Liste sayfası → `ItemList`
- Ürün/özellik → `SoftwareApplication`
- Servis/sektör → `Service` (mevcut `solution-schema.ts` helper'ını kullan)
- Hep birlikte → `BreadcrumbList` (3+ derinlik için canonical hierarchy göster)

**Yapma:**
- AggregateRating ekleme (gerçek review verisi olmadan FAKE; Google policy ihlali)
- Review schema fake müşteri yorumlarıyla doldurma (aynı sebep)
- Çok detaylı `Person`, `Place`, `Event` schema'ları — basit tutun, Google rich result eşleşmiyorsa katma değer yok

### 35.7 Dokunulmayan / out-of-scope

- **Google Search Console verification meta tag** — `<meta name="google-site-verification" content="..." />` ihtiyacı çıktığında `[locale]/layout.tsx` `generateMetadata`'a eklenecek (kullanıcı API key sağlamalı)
- **Bing IndexNow** — `https://api.indexnow.org/indexnow` push API; sitemap zaten yeterli, IndexNow tetik koşulu çıkana kadar bekle
- **Native app site associations** (`apple-app-site-association`, `assetlinks.json`) — native app yok (CLAUDE.md §25)

### 35.8 Müşteri ölçeği iletişim disiplini (2026-05 audit)

About sayfası (`src/app/[locale]/about/page.tsx`) "numbers" bölümü kasıtlı olarak **niteliksel + doğrulanabilir** claim'ler taşır: `2023 / 8+ entegrasyon / TR + EN / 5 dk kurulum`. Sayısal müşteri/yorum istatistikleri (örn. "X+ işletme", "Y reviews/month", "Z countries") **kullanılmaz** — kohort baseline + attribution + window olmadan agresif sayı Google "misleading business claims" sınıfına girer.

**Yapma:**
- Marketing surface'lerinde "2.400+ işletme", "340K+ aylık yorum", "28 ülke", "4.9/5 müşteri puanı" gibi doğrulanamayan agresif iddialar
- Gerçek ölçeği (10-50 restoran sınıfı, CLAUDE.md §19.4.4) marketing'de **birebir paylaşma** — yetersiz görünür, conversion kaybı
- Fictitious customer stories'a metric eklemek ("+184% organic" vb.) kohort context disclosure olmadan

**Yap:**
- Niteliksel + doğrulanabilir iddialar: kuruluş yılı, entegrasyon sayısı, aktif lokal/dil, tipik kurulum süresi, KVKK uyumluluk durumu, sahte yorum politikası ("0 fake")
- Gerçek müşteri kohortunu büyüme halinde anonim ama özelleştirilmiş case study'ye dönüştürme (kullanıcı izniyle)
- Sayı vermek gerekirse **attribution + window**: "Buaze müşteri kohortu, 90 gün ortalama"

### 35.9 ROI insight wording compliance (Google review-gating)

`src/lib/roi/generate-insight.ts` ve `src/lib/roi/RoiPdf.tsx` ROI hesaplama sonrası kullanıcıya gösterilen insight + PDF template'leri içerir. Bu dosyalarda **review-gating-implying wording yasak** (CLAUDE.md §19.1.1 audit'i ile birebir aynı disiplin):

**Yasak (Google review platform policy ihlali sınıfında):**
- "Google'a sızmadan / leak to Google / stay off Google" — selective access implication
- "filtreleme / filtering" review context'inde — review gating implication
- "düşük puan engelleme / block low rating / hide low rating" — paternalistic
- "X kat / X% guarantee" kohort baseline olmadan

**Yap:**
- "Şahsi geri bildirim akışı / private feedback path" — owner-customer dialog framing
- "Müşteri tercih akışı / customer preference flow" — agency-preserving
- "Düşük puan veren müşterilerin %X'i ekibe özel iletişimi tercih ediyor" — preference language
- Her low-rating flow açıklamasında customer agency disclosure: "müşteri her zaman istediği yere yorum yazma hakkını korur / every customer keeps the right to post wherever they want"

**leverageKey enum literal'ı:** `'private' | 'rating' | 'ai' | 'platform'`. Eski `'filter'` literal'ı **kaldırıldı** — semantic drift kaynağıydı.

Yeni ROI template eklerken: TR + EN parallel + aynı agency disclosure cümlesi + leverageKey extension için 4 enum + `T.tr.highlight + T.en.highlight` block'una record entry zorunlu.

### 35.10 Bilinçli olarak ertelenen audit bulguları (kullanıcı kararı bekleyen)

Site-wide audit (2026-05) aşağıdaki bulguları işaret etti — fix gerekli ama **marketing pozisyon kararı** olduğu için kullanıcı talebi olmadan dokunulmadı:

| Bulgu | Yer | Karar tetiği |
|---|---|---|
| `LiveReviewTicker` 4 hardcoded fake testimonial (M.D., A.K., J.A., S.B.) | `src/components/marketing/LiveReviewTicker.tsx` | Component unmount veya gerçek müşteri review'larıyla replace — kullanıcı UX kararı |
| `SocialProofToast` "Hotel Nora 284 review/month" fake activity feed | `src/components/marketing/SocialProofToast.tsx` | Component unmount veya placeholder copy ile replace — UX kararı |
| `customer-stories.ts` 6 fictitious case study (Ark Bistro, Hotel Nora, Derma+, Kahve Dükkan, Law&Co, Spa Ren) Unsplash fotoğraflarla | `src/lib/customer-stories.ts` | "Illustrative scenarios" disclaimer eklemek vs. tamamen kaldırmak — marketing kararı |
| Sektör pages metric'leri (+312%, +184%, +62%, +148%, vb.) cohort baseline disclosure'ı zayıf | `src/app/[locale]/solutions/*/page.tsx` (15 sektör) | §19.1.1'de "Buaze müşteri kohortu" attribution kanonik; her metric'e per-context cohort note eklenmeli |
| Title length: Contact (16 char) / Solutions (16-17 char) / Pricing (45-48) — `<30` weak signal | İlgili sayfa `generateMetadata` | Keyword-rich title expansion — kullanıcı tone kararı |
| OG image eksik: Features (fix sonrası), Solutions, Contact, Pricing | İlgili sayfa metadata | `[locale]/opengraph-image.tsx` per-route handler veya static asset path — design kararı |
| `LiveReviewTicker` + `SocialProofToast` mount call-site doğrulama | Marketing layout / homepage | Mount ediliyorsa fake notification = E-E-A-T risk; kaldırma kararı |

**Yapma:** Audit raporu gördüğünde toplu olarak hepsini fixleme — yukarıdaki listede `marketing pozisyon kararı` etiketli olanlar **kullanıcı talebi** gerektirir. Sadece deterministik teknik defect'leri (canonical drift, BCP 47 format, robots.txt host protocol vs.) açık talep olmadan da fix edilir.

---

## 36. useUrlFilter Hook (Phase 11.13)

`src/hooks/useUrlFilter.ts` — generic URL-synced filter state hook. Linear/Stripe SaaS pattern: filter/tab/sort/page state'i `?key=value` query param'a yansır → refresh sonrası state korunur, deeplink-friendly, browser back doğal çalışır.

### 36.1 API

```ts
const filters = useUrlFilter({
  search: '',
  status: 'active' as 'active' | 'passive' | 'all',
  plan: 'all',
  page: 1,
});

filters.values.status         // current value (URL or default)
filters.set('status', 'passive')  // updates URL
filters.setMany({ status: 'all', page: 1 })
filters.reset()               // back to defaults, URL clean
filters.hasActive             // true if any non-default value
filters.toQueryString()       // for fetch URL builder reuse
```

- Generic `Record<string, string|number|boolean>` defaults
- TypeScript `T` inference: `filters.values.X` tip-güvenli
- URL = source of truth (no useState shadow)
- `router.replace({ scroll: false })` — browser history'e entry yok
- Default değer set edilirse URL'den silinir (clean URL)
- Number ve boolean parse — `'1'` → `1`, `'true'` → `true`

### 36.2 Migration pattern (mevcut sayfaya uygulama)

State'leri intact tutarak wrapper proxy pattern (en az invasive):

```ts
const filters = useUrlFilter({ search: '', status: 'active' });
const searchTerm = filters.values.search;
const setSearchTerm = (v: string) => filters.set('search', v);
const statusFilter = filters.values.status;
const setStatusFilter = (v: string) => filters.set('status', v);
```

Mevcut tüm `setX/x` referansları sayfa içinde intact kalır — 200+ kullanım dokunulmadı.

### 36.3 Dikkat edilecekler

- **Defaults inline object literal** her render yenilenir → `set/reset` yeni reference. `useEffect` deps'inde kullanılırsa loop riski. Caller `useMemo` veya hook içi `useRef` ile defaults dondurma iyileştirmesi backlog'da (PR14).
- **Boolean filter'lar** TypeScript literal-type inference için cast gerekir: `hasEmail: false as boolean`.
- **Functional updater** (`setPage(p => p + 1)`) wrapper'larda destek YOK, direct value kullan: `setPage(page + 1)`.
- **Debounced search** için `searchInput` local state + `filters.set` combo: `useState(debouncedSearch)` initial + `useEffect` sync (PR12 fix).

### 36.4 Mevcut adoption

- `/admin/restaurants` (Phase 11.13)
- `/admin/members` (Phase 11.13)
- `/admin/customers` (Phase 11.13)
- `/admin/users` (Phase 11.13)
- Owner `/[locale]/dashboard/feedbacks` (Phase 11.12 — inline pattern)
- Admin `/admin/reviews` (Phase 11.12 — inline pattern)

İleride Phase 11.X'te owner feedbacks + admin reviews bu hook'a migrate edilebilir (consistency).

---

## 37. Security Audit (2026-05) — Standartlar + Atlanan Bulgular

5 fazlı kapsamlı güvenlik denetimi yapıldı; 5 PR ile **27 fix** (6 CRITICAL + 8 HIGH + 13 MEDIUM) merge'lendi. Ayrıntılı rapor: **`SECURITY_AUDIT_REPORT.md`** (repo kökünde). Bu §, kalıcı kararları + sonraki sessions için **yeni endpoint disiplinlerini** + atlanan 6 follow-up'ı tutar — drift olmasın diye burada referansla.

### 37.1 PR index (tarihsel)

| PR | Faz | İçerik |
|---|---|---|
| **#345** | Adım 1 | Public auth + POST hardening (JWT_SECRET hard-fail, Host header injection, UserSession revoke fail-closed) |
| **#346** | Adım 2 | Public ingestion (`/embed`, `/r/[slug]`, menu analytics IP rate limit, restaurant POST `checkProviderUrl`) |
| **#347** | Adım 3 | Admin auth + privileged CRUD (default credentials kill, audit log POST, reset reCAPTCHA) |
| **#348** | Adım 4 | Owner panel + multi-tenant IDOR (team locations whitelist, restaurant PUT validation, api-keys hardening) |
| **#349** | Adım 5 | Google OAuth state CSRF + cron/mail/openai audit clean |

### 37.2 Yeni endpoint disiplinleri (kalıcı kararlar)

Yeni route eklenirken bu kuralları izle — audit fix'lerinin bozulmaması için:

#### A. Auth boundary
- **`getSecret()` production'da throw eder** — `JWT_SECRET` env yokken token sign/verify yapılmaz. Public dev fallback sadece dev'de. **`getSecret()`'ı duplicate inline etmek YASAK** (Adım 1'de 4 yerden temizlendi). Yeni route `import { getSecret } from '@/lib/auth'`.
- **`UserSession` revoke checks fail-closed (DB error path)** — `auth.ts:isUserSessionRevoked` catch block `return true`. Yeni endpoint'lerin auth dependency'si bunu varsayar.
- **Password reset / member deactivate → UserSession revoke ZORUNLU**:
  ```ts
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  ```
  Pattern: `/api/auth/reset-password`, `/api/admin/members/[id]` PUT + DELETE. Yeni "owner pasifleştir" / "şifre değiştir" akışlarına eklenmeli.

#### B. IDOR — restaurant whitelist
- **Owner-controlled `locations: string[]` array'i ASLA verbatim kabul edilmez** (Adım 4 CRITICAL). Pattern:
  ```ts
  const ownedRows = await prisma.restaurant.findMany({
    where: { id: { in: requested }, userId: actor.id },
    select: { id: true },
  });
  const ownedSet = new Set(ownedRows.map((r) => r.id));
  const filtered = requested.filter((id) => ownedSet.has(id));
  ```
  `/api/team` POST + `/api/team/[id]` PATCH'te uygulanmış. Benzer pattern team / location-scoped yeni endpoint'lerde tekrarlanmalı.

#### C. Rate limit + audit log (privileged actions)
- **Yeni admin destructive bulk** veya **privileged CRUD (POST/PUT/DELETE)** `AdminAuditLog` row yazmalı. POST/CREATE de log'lanmalı (Adım 3'te `/api/admin/users` POST + `/api/api-keys` POST audit log eksikti, fix uygulandı). Pattern:
  ```ts
  await prisma.adminAuditLog.create({
    data: {
      actorId: actor.id,
      actorSource: actor.source,
      action: 'admin.users.create' /* veya 'feedback.bulk.flag' */,
      targetId: id,
      payload: { before, after },
    },
  });
  ```
- **API token / privileged write endpoint'i `rateLimit('endpoint:actor:${actor.id}', 10, 60_000)` ile gate edilmeli** (Adım 4 `/api/api-keys` fix paterni).

#### D. Public POST'larda IP-bazlı rate limit (sessionId yetersiz)
- `sessionId` rate limit tek başına yetersiz — saldırgan farklı sessionId'lerle paralel spam. **IP katmanı ZORUNLU**:
  ```ts
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`x:ip:${ip}`, 1000, 60_000);
  const sessionLimit = await rateLimit(`x:session:${sessionId}`, 300, 60_000);
  if (!ipLimit.allowed || !sessionLimit.allowed) return 429;
  ```
  Pattern: `/api/menu/[slug]/analytics` (Adım 2 fix). Yeni public ingestion endpoint'lerinde tekrarla.
- **Ham `req.headers.get('x-forwarded-for')` kullanma** — `getClientIp()` ile parse et. Saldırgan `X-Forwarded-For: a, b, c` ile rate-limit key pivot edebilir. Adım 1 `/api/feedback` fix paterni.

#### E. Restaurant CRUD validation (mass assignment kapısı)

POST + PUT iki path'te de aynı validation çalışmalı:

- **`primaryColor` → `isValidHexColor`** (XSS via inline style)
- **`googleReviewUrl, yemekSepetiUrl, ...` (8 platform URL) → `checkProviderUrl` hard-error reject** (`javascript:` / off-domain injection)
- **`notificationEmail` → `isValidEmail`** + 256 char cap
- **`menuLogoUrl` → 300 KB cap + non-data URL `http(s)://` zorunlu**
- **Slug regex** `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

Adım 2 + Adım 4 fix paralel paterni — POST + PUT'ta aynı kontroller.

#### F. OAuth flow — `state` nonce ZORUNLU
- Yeni 3rd party OAuth integration eklenirse:
  ```ts
  // /connect:
  const nonce = randomBytes(32).toString('base64url');
  response.cookies.set('bz_<provider>_oauth_state', nonce, {
    httpOnly: true, secure, sameSite: 'lax', maxAge: 12 * 60, path: '/',
  });
  state = base64url(JSON.stringify({ owner, nonce, ts }));

  // /callback:
  const stateNonce = JSON.parse(decode(stateParam)).nonce;
  const cookieNonce = req.cookies.get('bz_<provider>_oauth_state')?.value;
  if (!nonceMatches(cookieNonce, stateNonce)) return redirectBack('state-mismatch');
  if (state.owner !== ownerRef(actor)) return redirectBack('state-actor-mismatch');
  // clear cookie after every redirectBack
  ```
  Pattern: `/api/integrations/google/{connect,callback}` (Adım 5 fix). RFC 6749 §10.12 zorunluluk.

#### G. Mail recipient guard
- **Mail body'sine giden user input CRLF strip + `isValidEmail` kontrolü**:
  ```ts
  function stripCtl(value: unknown, max = 1000): string | null {
    if (typeof value !== 'string') return null;
    return value.replace(/[\r\n\t]/g, ' ').trim().slice(0, max) || null;
  }
  ```
  Pattern: `/api/contact` (Adım 1 fix). Yeni mail-tetikleyen endpoint'lerde kullan.
- **PII console.error YASAK** — kullanıcı email/phone log'a yazma (`userId` log'la). Sentry `extra` ile kapılır → KVKK ihlali. Adım 1 fix.

#### H. CRON_SECRET sağlam pattern
- Tüm cron endpoint'leri `if (!cronSecret || authHeader !== Bearer ${cronSecret}) return 401`. **`process.env.CRON_SECRET`'i `||` ile fallback'lemek YASAK** — env yoksa fail-closed olmalı.
- Cron handler'ın admin manuel trigger'ından `runFoo()` shared helper export et (CLAUDE.md §21.13 self-fetch antipattern). Yeni cron eklerken aynı pattern.

### 37.3 Atlanan follow-up (operatör onayı bekleyen)

Bu bulgular davranış-değişikliği gerektiriyor; CLAUDE.md'de bilinçli tasarım kararı veya backwards-compat zorunluluğu var. Açık talep olmadan dokunulmadı. Detay: `SECURITY_AUDIT_REPORT.md` "Deferred follow-ups" section.

| # | Bulgu | Öncelik | Durum |
|---|---|---|---|
| ~~1~~ | ~~`AdminUser` için `UserSession`-equivalent tablo yok~~ | ~~HIGH~~ | **✅ KAPATILDI** (2026-05 follow-up). `AdminUser.passwordChangedAt` field + `getAdminFromRequest` JWT iat staleness check. `admin/reset-password` ve `admin/users/[id]` PUT password değişimi field'ı set ediyor. Eski cookie'ler iat < passwordChangedAt → 401 → re-login. |
| 2 | `RECAPTCHA_ENFORCE` default `'false'` (monitor mode) | MEDIUM | Sentry "low score" / "action mismatch" warn rate'i izle, 2 hafta sonra production env'de `'true'` flip |
| 3 | `UserSession` `if (!session) return false` legacy fail-open (pre-table cookies) | MEDIUM | Backfill script ile mevcut user'lara `UserSession` row, sonra `return true` flip |
| ~~4~~ | ~~Restaurant DELETE viewer-hariç tüm team rolleri ile mümkün~~ | ~~MEDIUM~~ | **✅ KAPATILDI** (2026-05 follow-up). Yeni `canDeleteRestaurant` helper (`panel-access.ts`) — sadece `superadmin` / admin-source `manager` / `restaurant_owner` izinli. Team_member rolleri (workspace manager/staff/viewer) HİÇBİR durumda silemez. `/api/restaurants/[id]` DELETE bu helper'a wire. |
| 5 | Site-settings SVG upload sanitize yok | LOW | `DOMPurify` server-side veya `sharp.png()` rasterize, ya da `Content-Disposition: attachment` + sandbox CSP |
| 6 | bcrypt cost inconsistency (12 / 10 / 10) | LOW (cosmetic) | Tek `BCRYPT_COST = 12` const, tüm callsite import |

**2026-05 follow-up disiplini**: Yeni admin password değişikliği akışı eklendiğinde `passwordChangedAt: new Date()` set zorunlu (Adım 3 fix paterni). Yeni restoran-yıkıcı endpoint için `canDeleteRestaurant` helper'ı reuse — `canWriteRestaurant` write-only ihtiyaçları kapsar, destructive olanlar değil.

### 37.4 Audit dışı bırakılan kapsam (ileri pass)

- **`npm audit` supply chain** (lokal node_modules ortamı yoktu)
- ~~**Render-side XSS sweep**~~ — **✅ KAPATILDI** (2026-05 follow-up). 54 `dangerouslySetInnerHTML` kullanımı tarandı; 36 JSON-LD callsite `jsonLdString()` helper'ına migrate edildi (CLAUDE.md §37.6), 1 admin-authored `help/[slug]` body sanitize edildi (`sanitizeBlogContent`). Detay: `SECURITY_AUDIT_REPORT.md` "Render-side XSS sweep — closed".
- ~~**PII grep across 305 files**~~ — **✅ KAPATILDI** (2026-05 follow-up). `console.*` çağrıları tarandı (~30 hit); 2 gerçek leak fix edildi: `cron/trial-reminders` email→userId (KVKK), `ops-alert.ts` recipient redaction (Sentry data minimization). Sentry capture extra/tags surface'leri zaten `userId/restaurantId` only, PII içermiyordu.
- ~~**CSP header — A group**~~ — **✅ KAPATILDI** (2026-05 follow-up). Defansif "A grubu" directive'leri site-wide eklendi (CLAUDE.md §37.8). B grubu (`Cross-Origin-Opener-Policy: same-origin-allow-popups`) ve C grubu (strict `script-src` Report-Only mode) hâlâ açık — operatör onayı + Firebase Auth popup test gerektiriyor.
- ~~**Prisma cascade audit**~~ — **✅ KAPATILDI** (2026-05 follow-up). 24 `@relation onDelete` directive'i tarandı; cascade chain'leri (User → Restaurant → Feedback / Menu / QR / Analytics) doğrulandı. 2 implicit-default `@relation` explicit `onDelete: Restrict`'e çevrildi (`Restaurant.user`, `AdminUser.restaurant`). Detay: §37.9.

### 37.6 JSON-LD safe stringify disiplini (yeni)

`<script type="application/ld+json">` blok'una giden HER `JSON.stringify(...)` çağrısı **`jsonLdString()`** helper'ından geçmek ZORUNDADIR (`src/lib/seo/json-ld.ts`). Plain `JSON.stringify` `</script>` byte sequence'ını escape ETMEZ — DOM parser bytes okur, JavaScript escape rules okumaz. Admin-authored title / excerpt / description JSON-LD'ye geçtiğinde stored XSS yaratır.

```tsx
// ❌ XSS sink:
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

// ✅ Safe:
import { jsonLdString } from '@/lib/seo/json-ld';
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
```

Helper `<` → `<`, `-->` → `-->`, U+2028/U+2029 escape eder. Output JSON-valid kalır (`JSON.parse` aynı şekilde çalışır).

**Yapma**: yeni JSON-LD blok eklerken `JSON.stringify`'i raw kullanma. Code review check'i — yeni `__html: JSON.stringify(` pattern'i lint-anti-pattern.

### 37.7 PII redaction disiplini (yeni)

`console.*` çağrıları Sentry'nin `extra` field'ı ile otomatik kapılır (instrumentation.ts default behaviour). KVKK data minimization gereği:

```ts
// ❌ PII leak (Sentry'e gider):
console.error('[FOO] failed', { email: user.email, phone: customer.phone });

// ✅ Redacted:
console.error('[FOO] failed', { userId: user.id, hasEmail: Boolean(user.email) });
```

Kural:
- Kullanıcı `email` / `phone` / `ipAddress` log'lama. `userId` / `restaurantId` / hash log'la.
- Sentry `extra` payload'ını kontrolden geçir — Adım 1 ve PII follow-up'ında yapıldı, mevcut surface temiz.
- Yeni mail dispatch / cron / privileged endpoint'i log'unda PII varsa Sentry'e gitmeden önce redact et (`{ recipient: _omit, ...safe }` pattern'i — `ops-alert.ts` referans).
- Sentry `sendDefaultPii: false` (CLAUDE.md §26.2) zaten meta header/body'i kapatıyor; bu kural `console.error(..., {explicit PII})` yolunu kapatır.

### 37.8 CSP / security headers — uygulanmış grup + backlog

**`next.config.ts:headers()` mevcut state**:

Site-wide (`/:path*`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (CSP `frame-ancestors`'ın legacy fallback'i)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), unload=*, interest-cohort=(), browsing-topics=(), payment=(), usb=(), bluetooth=(), serial=()` (FLoC/Topics/payment/sensor opt-out genişletildi)
- **`Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`** (A grubu — defansif directive'ler, hiçbir mevcut script source'unu kısıtlamaz)

`/embed/:path*` override:
- `X-Frame-Options: ALLOWALL`
- **`Content-Security-Policy: frame-ancestors *; base-uri 'self'; form-action 'self'; object-src 'none'`** — frame restriction gevşetilir, A grubu directive'lerin geri kalanı korunur

#### Yapılan A grubu (zero-risk)

| Directive | Kapatılan saldırı vektörü |
|---|---|
| `frame-ancestors 'self'` | Clickjacking (CSP, XFO modern fallback) |
| `base-uri 'self'` | `<base>` tag injection (DOM XSS pivot) |
| `form-action 'self'` | Form hijacking — formlar yalnız `/api/*`'a POST eder |
| `object-src 'none'` | Flash/Java/PDF embed (codebase'de hiç kullanılmıyor) |
| `upgrade-insecure-requests` | Mixed content auto-upgrade (HTTPS-only deploy belt-and-suspenders) |
| Permissions-Policy genişletme | Google FLoC + Topics + payment + sensor erişim opt-out |

#### B grubu — backlog (operatör onayı + Firebase test)

Düşük risk ama Firebase popup auth path'inde verifikasyon gerek:
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` — Spectre + tab izolasyonu. Strict `same-origin` Firebase `signInWithPopup`'ı koparır; **`-allow-popups` variant'ı seç**. Resmi Firebase dokümantasyonu uyumlu olduğunu söylüyor ama `/auth/google` flow runtime test edilmeli.
- `Cross-Origin-Resource-Policy: same-origin` (site-wide) + `cross-origin` (`/embed/*`, `/buaze-embed.js`, `/opengraph-image*`, `/favicon.svg`, `/apple-touch-icon.svg`) — 3rd party script-tag wrapper'ı + sosyal paylaşım OG image'ı + favicon yine cross-origin, geri kalan resource'lar same-origin lock. Path-override sayısı arttığı için ayrı PR'da değerlendirilir.

#### C grubu — backlog (Report-Only mode + 1-2 hafta gözlem)

XSS savunmasının gerçek kapısı, ama mevcut inline + 3rd party script'leri kırmamak için kademeli:

- `Content-Security-Policy-Report-Only` (block etmez, ihlali raporlar) ile başla
- `script-src` allowlist (3rd party domain inventory):
  - GTM `https://www.googletagmanager.com`, `https://www.google-analytics.com`
  - Yandex `https://mc.yandex.ru`, `https://mc.yandex.com` (best-effort)
  - Sentry tunnel (`/monitoring`, kendi origin'imiz — `'self'` yeter)
  - Vercel Speed Insights `https://vitals.vercel-insights.com`
  - Vercel Analytics `https://*.vercel-analytics.com`
  - Vercel Preview Comments `https://vercel.live`
  - Firebase Auth `https://*.firebaseapp.com`, `https://*.googleapis.com`, `https://apis.google.com`
  - reCAPTCHA `https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/`
- Inline script'ler için **per-request nonce** (Next.js middleware → header → React component prop). Nonce-less çalışmak için `'unsafe-inline'` koyarsak CSP zayıf, XSS savunması sıfır olur.
- 1-2 hafta Report-Only ile Sentry'ye ihlal akıt → eksik domain'leri ekle → enforce moduna flip.

**Yapma**: Strict CSP'yi doğrudan enforce ile ekleme — 3rd party script'ler kırılır (white-screen production). Report-Only ile başla.

**Yap**: Yeni 3rd party script eklenirken (örn. Iyzico Wave 3.5, yeni analytics widget) C grubu allowlist'i de güncelle.

### 37.9 Prisma cascade audit (2026-05)

24 `@relation onDelete` directive'i tarandı; cascade chain'leri haritalandı, audit/billing/legal kayıtların korunması doğrulandı.

#### Cascade chain'leri

**`User` silme** (root identity — şu an hard-delete endpoint'i YOK, sadece soft-delete `isActive=false`):
```
User → UserSession (Cascade)
User → Restaurant (Cascade) → cascade tüm alt tablolar
```

**`Restaurant` silme** (`/api/restaurants/[id]` DELETE — Adım 4'te `canDeleteRestaurant`-gated):
```
Restaurant → Feedback (Cascade)
              → FeedbackReply, FeedbackFlag, FeedbackAssignment, FeedbackTag, FeedbackAiDraft (hepsi Cascade)
Restaurant → MenuCategory (Cascade) ← MenuItem.category Restrict, item önce silinmeli
Restaurant → MenuItem (Cascade)
Restaurant → QrGeneration (Cascade)
Restaurant → MenuAnalyticsEvent (Cascade)
Restaurant → BrandSettings (Cascade)
Restaurant → PlatformLinkCheck (Cascade)
Restaurant → RestaurantActivationState (Cascade)
Restaurant → PlatformRedirectEvent (Cascade)
Restaurant → QrScan (Cascade)
Restaurant → EmbedView (Cascade)
Restaurant → AdminUser (no FK — manuel deleteMany handler içinde)
```

DELETE handler manuel transaction sıralı silme yapıyor (`/api/restaurants/[id]/route.ts:391-400`) — DB cascade ile birlikte defense-in-depth.

#### Audit / billing / legal kayıt korunması (silinmez)

Kasıtlı tasarım kararı — User/Restaurant cascade'inden bağımsız:

| Tablo | Field | Pattern | Sebep |
|---|---|---|---|
| `AdminAuditLog` | `actorId` (string) | FK yok | Audit history User silinse bile kalır |
| `BillingInvoice` | `userId` (string) | FK yok | Mali kayıt — KVKK/legal saklama yükümlülüğü |
| `BillingSubscription` | `userId` (string) | FK yok | Aynı sebep |
| `MailTemplateRevision` | `templateId` | `SetNull` | Template silinse bile revision history (audit + restore) korunur |
| `LegalDocumentRevision` | `documentId` | `SetNull` | Aynı pattern |
| `LegalConsent` | `documentId` | `SetNull` | KVKK consent kaydı dokumentin silinmesinden bağımsız |

#### Yapılan iki düzeltme (2026-05 audit)

İki implicit-default `@relation` directive'i (`Restaurant.user`, `AdminUser.restaurant`) için açıklayıcı yorum eklenmesi denendi ama Prisma 6 validator'u bu modelde `Restrict` ve `NoAction` annotation'larını **multi-path cascade graph'inde cyclic referential action olarak** reddediyor (Restaurant zaten Feedback / Menu / QR cascade chain'lerinde). Schema annotation değişikliği bu yüzden **uygulanmadı**; default davranış zaten Postgres `NO ACTION` ≈ `RESTRICT` (hard-delete bloke), istediğimiz semantik. Niyet bu §'de + `SECURITY_AUDIT_REPORT.md` cascade section'ında dokümante.

#### KVKK "right to be forgotten" — açık scope

Şu an User hard-delete endpoint'i yok. Eğer GDPR/KVKK için eklenirse:
- Cascade chain doğru iş görür (User → Restaurant → tüm alt veriler wipe)
- **Ama** `BillingInvoice` / `BillingSubscription` / `AdminAuditLog` orphan kalır (FK string)
- KVKK saklama yükümlülüğü vs. silme hakkı dengelemesi: muhtemelen mali kayıt + audit korunur, PII anonymize edilir (`user.email = 'deleted-{id}@buaze.local'`, `user.name = null`)
- Bu pattern uygulanırken yeni endpoint + dokumentasyon

**Yapma**: `User` üzerinde direkt `prisma.user.delete` çağırmak. CLAUDE.md §34.5 soft-delete pattern only.

**Yap**: Yeni cascade tanımlanırken `onDelete:` explicit yazılmalı (Prisma 6 default'a güvenmek schema-okuyucu için bilgi kaybı).

---

## 38. SESSION CLOSE — 2026-05 Security Audit Final State

5 fazlı audit + 5 follow-up + 1 cascade pass + 1 docs pass = **12 PR, hepsi merged**. Bu §, oturumun final state'ini ve **yapılmayan/atlanan işleri** açıkça yazar — sonraki session'ların ne ile devam edeceğini görmesi için.

### 38.1 Toplam fix sayısı

| Severity | Adet |
|---|---|
| 🔴 CRITICAL | 8 (JWT_SECRET fallback, default credentials, dead-code rename, member deactivate session leak, team locations IDOR, Google OAuth CSRF, JSON-LD `</script>` escape, admin session staleness) |
| 🟠 HIGH | 11 (Host header injection, reset session revoke, UserSession DB fail-open, primaryColor XSS, integration URL injection, owner deactivate cookie, members audit log, admin reset weak password, restaurant DELETE owner-only, help body sanitize, render-XSS sweep) |
| 🟡 MEDIUM | 16+ |

### 38.2 Yapılmayan / açık kalanlar (operatör onayı bekliyor)

| # | Bulgu | Öncelik | Tetik koşulu |
|---|---|---|---|
| **CSP B grubu** | `Cross-Origin-Opener-Policy: same-origin-allow-popups` + `Cross-Origin-Resource-Policy` path overrides | MEDIUM | Firebase popup auth runtime test |
| **CSP C grubu** | Strict `script-src` allowlist + nonce middleware (Report-Only ile başla) | MEDIUM-HIGH | 1-2 hafta Sentry CSP report soak |
| **`RECAPTCHA_ENFORCE` flip** | Default `'false'` → `'true'` production env | MEDIUM | 2 hafta Sentry warn rate izleme |
| **UserSession legacy `if (!session) return false`** | `auth.ts` fail-closed flip | MEDIUM | Backfill script (mevcut user'lara session row insert) |
| **Site-settings SVG sanitize** | DOMPurify / sharp.png() rasterize / sandbox CSP | LOW | Admin-only privileged path; düşük öncelik |
| **bcrypt cost normalize** | Tek `BCRYPT_COST = 12` const, 4 callsite import | LOW | Cosmetic |
| **KVKK "right to be forgotten"** | User hard-delete endpoint + PII anonymize | LOW (regülasyon scope) | Yasal talep / GDPR DSR akışı |

### 38.3 Audit dışı kalan kapsam (gelecek pass için)

| # | Kapsam | Sebep |
|---|---|---|
| 1 | `npm audit` supply chain | Lokal `node_modules` audit ortamında yoktu; CI'da koşulabilir |
| 2 | Dependency CVE history | Aynı sebep |
| 3 | E2E auth flow regression test | Test infrastructure ayrı pass |

### 38.4 Sonraki session için disiplin

1. Yeni endpoint eklerken §37.2 A-H disiplinlerini izle (auth boundary / IDOR / privileged audit / rate limit / restaurant CRUD validation / OAuth state / mail recipient / cron secret)
2. Yeni JSON-LD blok'unda `jsonLdString()` zorunlu (§37.6)
3. Yeni `console.error` PII içeremez (§37.7) — `userId` / `restaurantId` / hash log'la
4. Yeni `@relation` eklerken `onDelete:` explicit yaz (§37.9)
5. Yeni mail/cron endpoint'i `passwordChangedAt: new Date()` set ZORUNLU eğer admin password rotate ediyorsa (§37.3 #1 closure pattern)
6. Restaurant-yıkıcı endpoint için `canDeleteRestaurant` reuse (§37.3 #4 closure pattern)
7. `§38.2` tablosundaki bulgulardan biri scope'a giriyorsa kullanıcıya **açık onay** sor

### 38.5 Kalıcı kayıt dosyaları

- **`SECURITY_AUDIT_REPORT.md`** (repo kökü) — 5 audit fazı + 5 follow-up tablolar, deferred rationale, B/C grubu rollout plan
- **`CLAUDE.md` §37** — yeni endpoint disiplinleri + closed/open follow-up + cascade audit
- **`CLAUDE.md` §38** — bu session-close özeti

### 38.6 PR index (kapanış)

| PR | İçerik |
|---|---|
| #345 | Adım 1 — Public auth + POST hardening |
| #346 | Adım 2 — Public ingestion + restaurant create |
| #347 | Adım 3 — Admin auth + privileged CRUD |
| #348 | Adım 4 — Owner panel + multi-tenant IDOR |
| #349 | Adım 5 — Google OAuth state CSRF |
| #350 | Docs — `SECURITY_AUDIT_REPORT.md` + CLAUDE.md §37 |
| #351 | Follow-up — Admin session staleness + Restaurant DELETE owner-only |
| #352 | Follow-up — Render-side XSS sweep (JSON-LD + help body) |
| #353 | Follow-up — PII grep + CI fix |
| #354 | Follow-up — CSP A-group + Permissions-Policy genişletme |
| (this PR) | Follow-up — Prisma cascade audit + session-close docs |

12 PR, hepsi `claude/security-vulnerability-audit-x48te` branch'inden main'e merge edildi.

### 37.5 Yeni session disiplini

Yeni route veya endpoint eklenirken:
1. §37.2 A-H disiplinlerini izle
2. §37.3 atlanan bulgulardan biri scope'a giriyorsa kullanıcıya **açık onay** sor
3. Yeni güvenlik fix'i uygulanırsa: `SECURITY_AUDIT_REPORT.md`'ye yeni satır ekle + bu §'ye phase log
\n### 37.3 Google Rating Impact Tracking\nGoogle İşletme hesabı bağlandığı andaki ortalama puan `Restaurant.initialGoogleRating` olarak kaydedilir. `api/cron/google-reviews-alert` periyodik çalışarak `Restaurant.currentGoogleRating` alanını günceller. Dashboard üzerinde (Yorum Görünümü) Buaze'nin işletme puanına etkisi (Örn: +0.4 Puan Artış) profesyonel bir widget ile raporlanır.

### 38.7 2026-05-03 — UI/UX Temizliği (Settings Panel Düzenlemeleri)
- **Platform Bağlantıları:** "Test Et" mekanizması Yemeksepeti, Getir, Trendyol GO vb. platformlardan kaldırıldı. Bu işlevsellik (test et/yeniden test et) arayüzde sadeleştirme amacıyla sadece Google İşletme Profilinde tutuluyor.
- **Widget Kullanım Verisi (Kullanan Siteler):** İşletme sahiplerinin gördüğü `BusinessWebsiteSettings` içerisindeki widget analiz istatistikleri kaldırılarak Admin Paneline (`/admin/restaurants/[id]`) taşındı. Sadece adminler hangi sitelerin widget kullandığını görebilir.
- **Operasyonel Ayarlar (V2 Placeholder):** Ayarlar ekranındaki "Sipariş & Rezervasyon Kabulü" henüz backend tarafı hazır olmayan bir V2 placeholder olduğu için UI karmaşasını önlemek adına tamamen temizlendi.

### 38.8 2026-05-03 oturum 2 — Görev A/B/C/D + yeni acil task

CLAUDE.md §5.4 Production Hata Düzeltme Takip Planı'ndaki açık görevlerin sistematik kapatılması (her görev kendi PR'ı, draft mode, kullanıcı review'lı merge):

**Tamamlanan görevler:**

| Görev | PR | Çıktı |
|---|---|---|
| **Görev A** — Sentry server-side capture doğrulama | #377 → #378 → #379 → #380 | **Kısmi doğrulama**. Smoke test endpoint `/api/sentry-test` `Sentry.captureException` + `await Sentry.flush(5000)` paterne geçti, eski `throw` kaldırıldı. **Ama production envelope hâlâ ulaşmıyor** — yeni acil task'a (§38.8 sonu) bak. |
| **Görev B** — Google Business retry/reauth doğrulama | #381 | 8 yeni unit test `tests/google-business.test.ts` — `googleBusinessFetch` transport branch'leri (200, 403, 429×3, 503×3, network reject, persistent 401, malformed JSON, retry-then-success) mock fetch ile CI altında. Mevcut 48 + 8 = 56 test. |
| **Görev D** — Sentry config deprecation cleanup | #382 | `next.config.ts` `withSentryConfig` `disableLogger` + `automaticVercelMonitors` top-level deprecated → `webpack.{ treeshake: { removeDebugLogging: true }, automaticVercelMonitors: true }`. Sentry SDK 10.51 canonical shape. Build log uyarısız. |
| **Görev C Faz 1** — reCAPTCHA Sentry breadcrumb | #383 | `src/lib/recaptcha.ts` `softFail()` her tetiklendiğinde `Sentry.captureMessage('reCAPTCHA soft-pass', { tags: { reason, action }, extra: {...detail}, level: 'warning' })`. Saf `buildSoftPassSentryEnvelope()` helper export'lu, 6 yeni test (`tests/recaptcha.test.ts`) PII guard dahil. **Faz 2** (`RECAPTCHA_ENFORCE=true` flip) ayrı PR, 1-2 hafta production veri sonrası. |

**Görev A bulguları (kritik):**

1. **Production Sentry org'u `buaze-ev/sentry-apricot-blanket`** — daha önceki health raporlarında yanlışlıkla `buaze/javascript-nextjs` org'una bakılıyordu, o boş. Gerçek production hatalar `buaze-ev`'de:
   - `Hydration Error` (`/tr` homepage)
   - **`SyntaxError: Invalid character '�'`** — Task 5 issue'sunun tam o issue'su, 23 saat önce başlamış, 10 saat önce son görülmüş
   - `MetaMask` browser extension noise
2. **Client-side capture sağlam** — Hydration Error, `� SyntaxError` (browser-origin culprit) Sentry'e düzenli ulaşıyor.
3. **Server-side capture sessizce kayboluyor** — bu PR serisindeki 4 deneme + 3 production deploy iteration sonrası kanıtlandı:
   - `Sentry.captureException` event ID üretiyor (`fb5aa82...`, `72e058...`, `9a9db0...`)
   - `Sentry.flush(2000)` → `false`, `Sentry.flush(5000)` → hâlâ `false`
   - Sentry'de event ID lookup → `Event Not Found`
   - Sandbox'tan Sentry ingest erişilebilir (HTTP 404 GET, bağlantı OK)
   - `debug: true` Sentry SDK config Vercel runtime log'a YANSIMIYOR (Vercel logging stderr'ı skipliyor olabilir)
   - `includeLocalVariables` ve `enableLogs` suçsuz kanıtlandı (kaldırıldı, yine `flush: false`)

### Yeni acil task — Server-side Sentry envelope flush kör nokta

**Sorun**: Production'da `Sentry.captureException` çağrıları (PR #374 Google business retry, PR #383 reCAPTCHA breadcrumb, gelecek PR'larda Görev G `safeParseJson`) Vercel function tear-down öncesi flush olmuyor → server-side hatalar Sentry'e ulaşmıyor.

**Etki**: Görev G'nin (`safeParseJson`) ürettiği yeni hatalar otomatik kaybolur. Diğer manuel `captureException` çağrıları da etkilenmiş olabilir.

**Çözüm scope (gelecek task)**:
- Hipotez 1: Vercel function tear-down + Sentry SDK transport flush yarış koşulu — `Sentry.flush(N)` SDK'ın envelope POST'unu beklemiyor olabilir. Sentry SDK 10.x'te bilinen Vercel/Next.js issue'su olabilir, GitHub araştırması gerek.
- Hipotez 2: Vercel runtime log'u Sentry SDK debug çıktısını yakalamıyor → debug:true bile efektif sinyal vermiyor. Workaround: SDK transport hatasını `Sentry.captureMessage` öncesi `console.error` ile manuel log + Vercel runtime log'da görünür hale getir.
- Hipotez 3: Edge runtime mı Node runtime mı sorunu — `instrumentation.ts` runtime detection üzerinden config import ediyor; edge/node mixing varsa transport farklı olabilir.
- Hipotez 4: Vercel function egress'te DNS gecikmesi — sandbox'tan Sentry ingest TLS handshake hızlı; Vercel cold start'ta TLS daha yavaş olabilir, 5sn yetmeyebilir.

**Bu task Görev G öncesi yapılmalı** çünkü Görev G'nin değeri buna bağlı.

**Vercel env durumu**: `ENABLE_SENTRY_TEST` env'i Vercel Production'dan kaldırıldı (Görev A kapanışında, kullanıcı sildi). Endpoint default 403 dönüyor.

### Pending durum (sıralı)

| Sıra | Görev | Durum |
|---|---|---|
| 1 | **Server-side Sentry flush deep dive** (yeni acil) | 🔴 **KAPATILDI** (kabullenildi, §38.13 — A kararı) |
| 2 | **Görev F** — Read-only API Cache-Control headers (6 endpoint) | ✅ Kapatıldı (PR #385) |
| 3 | **Görev G** — `safeParseJson` helper + risky callsites | ✅ Kapatıldı (PR #386) |
| 4 | **Görev E** — Vercel `live: false` araştırması | ✅ Kapatıldı (sadece research, kod değişikliği yok) |
| 5 | Görev C Faz 2 — `RECAPTCHA_ENFORCE=true` flip | 🟡 Pending (1-2 hafta veri sonrası) |
| 6 | Task 8 — Prisma 7 upgrade | 🟡 Pending (ayrı major-version branch) |

### 38.9 2026-05-03 oturum 2 — Final kapanış (Görev E, F, G + 9 PR özeti)

§38.8'de listelenen pending görevlerden 3'ü daha aynı oturumda kapatıldı. Bu alt-section §38.8'i tamamlar; 9 PR'ın final state'i ve gelecek sessions için "ne kaldı" özeti.

**Tamamlanan ek görevler:**

| Görev | PR | Çıktı |
|---|---|---|
| **Görev F** — Read-only API Cache-Control | #385 | 6 owner-scoped GET endpoint'e `Cache-Control: private, s-maxage=N, stale-while-revalidate=M` eklendi: status/activation/integrations/checks (60s/300sw), integrations/health (60s/300sw), integrations/checks (120s/600sw), redirect-stats (300s/900sw), embed-stats (300s/900sw). PATCH endpoint'lere dokunulmadı (write path origin'e gitmeli). Frontend `refetchInterval` Wave C ayrı task. |
| **Görev G** — `safeParseJson` helper | #386 | `src/lib/safe-json.ts` + `tests/safe-json.test.ts` (7 test). Helper Sentry'e `tags: { kind: 'json-parse-failure' }` + 200 char snippet + per-callsite `source` ctx basıyor. **5 callsite wrap edildi**: `analytics-themes.ts` (gpt-4o-mini Türkçe), `weekly-insight.ts` (Türkçe), `roi/generate-insight.ts` (Türkçe), `google/callback/route.ts` (OAuth state), `email-internal.ts` (Resend response). Skip edilenler: 4 client-side localStorage, `google-business.ts` (PR #374 lock), `recaptcha.ts` env, `seo/json-ld.ts` yorum satırları. |
| **Görev E** — Vercel `live: false` araştırması | yok (sadece research) | Vercel MCP `get_project` çıktısı: project-level `domains` array'inde sadece `*.vercel.app` URL'leri; `buaze.com` ve `www.buaze.com` deployment-level alias listesinde mevcut ama project config'e bound değil. Runtime etkisi yok (site canlı). Kullanıcı kontrol listesi: Settings → Domains → custom domain ekle/doğrula, Deployment Protection "Standard" mı, Production Branch `main` mi (✅ doğrulanmış). Çözüm operatör tarafında, kod değişikliği yok. |

**9 PR özet tablosu:**

| PR | Branch | Görev | Çıktı |
|---|---|---|---|
| #377 | sentry-server-flush-fix | A — flush(2000) | Smoke test endpoint flush'lı, `throw` kaldırıldı |
| #378 | sentry-flush-timeout-bump | A — flush 2s → 5s | Cold start cover, flush hâlâ false |
| #379 | sentry-server-debug | A — debug:true diagnostic | suspect config (`includeLocalVariables`/`enableLogs`) suçsuz kanıtlandı |
| #380 | sentry-debug-cleanup | A — production-safe revert | Original config restore, debug:true off |
| #381 | google-business-mock-tests | B — mock fetch tests | 8 yeni unit test transport branch'lerine regression koruması |
| #382 | sentry-config-modernize | D — webpack.* migrate | Build log deprecation uyarıları temiz |
| #383 | recaptcha-sentry-breadcrumb | C Faz 1 | `softFail()` her tetiklendiğinde Sentry breadcrumb + 6 yeni test PII guard |
| #384 | docs-2026-05-03-mid-session | Docs ara not | §38.8 oturum 2 ara güncelleme |
| #385 | api-cache-headers | F — Cache-Control | 6 owner endpoint cache header |
| #386 | safe-json-parse | G — safeParseJson | Helper + 5 risky callsite wrap + 7 test |
| (this PR) | docs-2026-05-03-final | Docs final kapanış | §38.9 final özet + Görev E sonucu + pending list update |

Toplam: **10 commit + 9 functional PR + 1 docs final = 11 PR/commit serisi**, hepsi `claude/*` branch'lerinden draft mode'da açıldı, kullanıcı review'lı merge edildi.

### Pending durum (final, sıralı)

§38.8'in sonundaki pending tablosu Görev F + G + E kapandığı için **3 entry kaldı**:

| Sıra | Task | Sebep |
|---|---|---|
| 1 | **Server-side Sentry flush deep dive** | 🔴 **KAPATILDI** (2026-05-04, §38.13 — A kararı). 5 hipotez 4'ü elendi (PR #390 + #398 + #399), kalan (e) SDK transport veya Vercel egress için ek diagnostic değer/maliyet düşük. Kabul: Sentry server-side captures bozuk kalsın, monitoring Vercel runtime logs üzerinden yapılır (§38.9 paterni). |
| 2 | Görev C Faz 2 — `RECAPTCHA_ENFORCE=true` flip | C Faz 1 PR #383 breadcrumb basıyor; 1-2 hafta production veri toplandıktan sonra Sentry dashboard `tags.reason:low score` rate'i incele, healthy ise Vercel Production env'inde `RECAPTCHA_ENFORCE=true` flip et (kod değişikliği yok). Risk: `/api/admin/login` admin'in kendisini kilitleyebilir → kullanıcı kendi login'i önce test eder. |
| 3 | Task 8 — Prisma 7 upgrade | Major-version, breaking-change rehberi okunmadan başlanmaz. Ayrı dedicated task. CLAUDE.md §5.4 Task 8 zaten dokümante. |

**Production audit findings (2026-05-03 oturum sonu, Vercel Observability):**

12 saatlik pencerede üç hata kategorisi tespit edildi:

| Kategori | Detay | Aksiyon |
|---|---|---|
| `/api/sentry-test` 4 fail | Görev A diagnostic deploy'larının (#377-379) yan etkisi, beklenen davranış | Yok — `ENABLE_SENTRY_TEST` kapatıldı |
| `/en/opengraph-image` 1 fail (`Error: ENOENT: no such file...`) | Tek seferlik dynamic OG image render hatası 18:02 UTC. Sonraki deploy'larda tekrar etmedi | Opsiyonel — `src/app/[locale]/opengraph-image.tsx` font/asset yüklemesi audit (acil değil) |
| **Prisma error dalgası 09:55-10:00 UTC** (12 endpoint, 9 fail × 500, 3 silent log) | PR #367 deploy edildikten sonra ~5dk sürdü, **kendi düzeldi**. `/tr/dashboard` (3x), `/api/cron/google-reviews-alert` (1x), legal pages, blog, homepage, `/auth/login` etkilendi. Hipotez: Supabase pooler `connection_limit=1` (§14.1) altında cold start race veya transient connection exhaustion | İzlemeye devam — tekrarlarsa pool exhaustion audit |

**Kritik kanıt**: bu Prisma dalgasının **0 event'i Sentry'e ulaştı** (12 endpoint, 9 server-side fail). Görev A'nın "server-side envelope flush kör nokta" bulgusunu **canlı production verisiyle** kanıtlıyor. **Server-side Sentry flush deep dive task'ının önceliği** bu bulgu ile somut argüman kazandı:
- Üretimde benzer bir Prisma dalgası, OAuth fail dalgası, veya mail send dalgası olursa **Sentry'den haberdar olamayız**
- Sadece reaktif Vercel Observability incelemesi ile fark ederiz
- Görev G'nin (`safeParseJson`) capture'ları ve Görev C Faz 1'in (reCAPTCHA breadcrumb) **gerçek production değerleri bu task çözülmeden ölçülemez**

### Sonraki AI session disiplin notu

Bu oturum'un bulguları + kalıcı kararları:

1. **Sentry org adı**: production DSN `buaze-ev/sentry-apricot-blanket` (NOT `buaze/javascript-nextjs`). Health audit'lerde her zaman `buaze-ev` org'una bak.
2. **`safeParseJson` helper canonical**: yeni `JSON.parse` callsite'ı eklerken (özellikle AI yanıtı, OAuth state, external API body) helper'ı kullan. Sentry tag `json-parse-failure` ile dashboard'da otomatik group'lanır.
3. **`Cache-Control: private, s-maxage=N, swr=M`** owner-scoped read endpoint'lerinde standard. Yeni read endpoint eklerken §19.3 + Görev F (PR #385) referansını incele.
4. **Server-side `Sentry.captureException` çağrıları envelope göndermez** (§38.13 kapatma). Flush mekaniği bozuk; eventId üretilse de Sentry dashboard'a düşmez. Yeni manuel capture eklemek **çalışmasa da safe** (no-throw, no-block) ama gerçek görünürlük yalnızca Vercel runtime log'larından gelir. Critical path'te gerçekten görmek istediğin sinyali `console.error` ile yaz; Sentry tek başına yetmez.
5. **`Sentry.captureMessage` PII guard**: tag/extra/level structure'ı PR #383 `buildSoftPassSentryEnvelope()` paternini izle. IP, token, email, request body asla extra'da yer almaz.

### 38.10 2026-05-04 — Audit follow-up bundle (deep-dive findings)

Kullanıcı PR #390 sonrası "uçtan uca hata + işlevsellik kontrolü" istedi. 3 paralel Explore agent (Recent PR impact / Runtime risks / CLAUDE.md drift) ile derinlemesine sweep yapıldı; baseline temiz idi (0 TS error, 0 lint error, 69/69 test pass) ama daha derinde 4 kod drift'i + 4 dokümantasyon drift'i bulundu. Tek "audit follow-up bundle" PR'ında toplandı.

**Kod fix'leri (4):**

| # | Yer | Sorun | Fix |
|---|---|---|---|
| 1 | `src/app/api/restaurants/route.ts:368-369` (POST handler) | `primaryColor` + `notificationEmail` validation eksik. PUT'ta var (CLAUDE.md §37.2 E disiplini), POST'ta drift → security regression: malicious admin XSS-shaped color veya arbitrary email field'ı yazabilir | `isValidHexColor` + `isValidEmail` validation block'u PUT'tan kopyalandı |
| 2 | `src/app/api/feedback/route.ts:236-237` (GET handler) | `parseInt('abc') → NaN`; `(NaN-1)*limit → NaN`; Prisma `skip: NaN` → silent 0 → **page 1 her zaman dönüyor** → kullanıcı duplicate feedback görür / kayıp data | `Number.isFinite(...) && > 0` clamp + `Math.min(limit, 100)` upper bound |
| 3 | `sentry.server.config.ts` + `sentry.edge.config.ts` | CLAUDE.md §26.2 kanonik `replaysSessionSampleRate: 0`, server/edge config'de yok. Sentry replay browser-only feature olduğu için no-op ama defansif declaration | Her iki config'e `replaysSessionSampleRate: 0` ekle (no-op, future-proof) |
| 4 | `scripts/validate-env.js` | `CRON_SECRET` validate-env'da yok. Operatör Vercel'de unutursa **8 cron endpoint'i silent 401** → weekly digest, lifecycle email, platform link retest, hepsi sessizce durur, kullanıcıya görünür sinyal yok | Optional listeye eklendi (warning, not exit-1) — fresh deploy'da operatöre uyarı verir |

**Dokümantasyon güncellemeleri (4):**

| # | CLAUDE.md section | Drift | Düzeltme |
|---|---|---|---|
| 1 | §4 (IDOR koruması) | Helper'ların `auth.ts`'te olduğu yazıyor; gerçekte `getScopedRestaurantIds` + `canAccessRestaurant` `panel-access.ts`'te | Helper path'leri ayrıştırıldı, import örneği güncellendi |
| 2 | §21.12 (Cron path listesi) | 5 cron listeleniyor; vercel.json'da 8 var. Eksik: `lifecycle-emails`, `platform-link-retest`, `google-reviews-alert` | 3 entry eklendi + "tek source-of-truth: vercel.json" notu |
| 3 | §21.26 (Mail template başlığı) | "9 template — tüm Pulse mailler" yazıyor; gerçekte 16 template (`SUPPORTED_MAIL_KEYS`: 9 Pulse + 4 lifecycle + 2 ROI + 1 verify-email) | Başlık → "16 template — Pulse + lifecycle + ROI + verify-email" + 2026-05-04 audit notu |
| 4 | Dosya envanteri (line 271) + scripts tablosu (line 3457) | "18 row mail template seed" stale | "32 row (16 × 2 locale)" güncellendi |

**False positive elenenler** (rapor edildi ama doğrulamada gerçek bug değil):
- `daysParam` clamp: kod zaten `Number.isFinite && > 0` kontrol ediyor
- `OPS_DIGEST_SUMMARY_EMAIL` validation weak: kod fail-closed (line 38-40 `!recipient` → 500)
- Resend fallback silent fail chain: CLAUDE.md §21.33 by design
- `OPS_EMAIL` dead code: `src/lib/email/ops-alert.ts:43` aktif kullanıyor

**Yapma:**
- POST + PUT validation paritesini bozma — yeni alan eklerken her iki handler'a da aynı gate (Zod ile yapacaksan §28.3 `.strict()` zorunlu)
- `parseInt(...)` doğrudan pagination param'lara — `Math.max(1, Number.isFinite(...) ? ... : 1)` clamp pattern'i kullan
- Sentry replay config'lerini ayrıştırma — server/edge/client üçü de `replaysSessionSampleRate: 0` (browser-only feature olsa bile defansif tutarlılık)
- `CRON_SECRET`'i required listeye taşıma — cron kullanmayan kişisel deploy'lar etkilenir (warning yeterli)

**Yap:**
- Yeni cron eklerken `vercel.json` + §21.12 tablosu birlikte güncelle (tek source-of-truth disiplini)
- Yeni mail template eklerken `SUPPORTED_MAIL_KEYS` + `seed-mail-templates.ts` + §21.26 sayım birlikte güncelle (16 → 17, 32 → 34, vb.)
- Yeni POST endpoint'inde validation gate'leri PUT ile parite tut — §37.2 E

**Audit metodu (referans, gelecek session için):**
1. Lokal baseline (tsc + lint + test) — yeşilse "yüzeysel temiz" olduğunu doğrula, derinleşmek için agent kullan
2. 3 paralel Explore agent (recent PR impact / runtime risks / CLAUDE.md drift) — paralel çağır, sonuçları topluca triage'la
3. Her agent finding'ini manuel doğrula — agent yer/öncelik veriyor ama context dışı yorumlar olabilir (false positive yaygın)
4. Bulguları kategorize et: HIGH (production risk) / MEDIUM (operasyonel) / LOW (cosmetic) / FALSE POSITIVE
5. Tek "audit fix bundle" PR'ı — multiple PR yerine tek narrative ile gönderilmesi audit context'ini korur
6. CLAUDE.md güncellemesi son adım — değişiklik yaparsan §38'e yeni alt-section ekle

### 38.11 2026-05-04 — Cron config drift fix (Vercel Pro silent timeout)

Kullanıcı raporu: "Vercel Pro almama rağmen cron'lar çalışmıyor". `src/app/api/cron/*` 8 endpoint'i denetlendi; **5 cron'da kritik runtime config drift** tespit edildi. Vercel Pro plan'da function default timeout **60 saniye** — bu cron'ların batch işleri (mail send, IP anonymize, trial reminder fan-out) 60s ceiling'i aşıp **silent timeout** ile 504 dönüyor; Sentry server-side flush kör noktasıyla (CLAUDE.md §38.8) birlikte tamamen sessiz fail oluyor.

**Konfigürasyon matrisi (audit anı, 2026-05-04)**:

| Cron | dynamic | runtime | maxDuration | Önceki davranış |
|---|---|---|---|---|
| `anonymize-ips` | ❌ → ✓ | ❌ → ✓ | ❌ → ✓ 300 | 60s default; updateMany hızlı, etkilenmedi ama defansif |
| `monthly-newsletter` | ❌ → ✓ | ❌ → ✓ | ❌ → ✓ 300 | **CRITICAL** — ~1000 abone × 120ms throttle = ~120s, 60s'de timeout, partial send |
| `trial-reminders` | ❌ → ✓ | ❌ → ✓ | ❌ → ✓ 300 | **HIGH** — trial cohort büyüdükçe per-user mail fan-out 60s'i aşıyor |
| `weekly-digest` | ✓ | ❌ → ✓ | ✓ 300 | runtime explicit eksikti, defansif drift |
| `weekly-digest-summary` | ✓ | ❌ → ✓ | ✓ 300 | aynı |
| `google-reviews-alert` | ✓ | ✓ | ✓ 300 | clean |
| `lifecycle-emails` | ✓ | ✓ | ✓ 300 | clean |
| `platform-link-retest` | ✓ | ✓ | ✓ 300 | clean |

**Cron checklist (yeni cron eklerken zorunlu 3 directive)**:

```ts
// src/app/api/cron/<name>/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 1) dynamic: cron context'i her tetikte fresh DB read + fresh env okuma
//    yapmalı; statik prerender'a düşmemeli.
export const dynamic = 'force-dynamic';

// 2) runtime: explicit nodejs — Vercel implicit infer ediyor (Prisma
//    Node-only) ama explicit declaration future edge runtime drift'ine
//    karşı korur.
export const runtime = 'nodejs';

// 3) maxDuration: Vercel Pro default 60s. Batch işler (mail fan-out,
//    DB updateMany üstüne, Resend rate limit throttle) 300s safe.
//    Vercel Pro üst sınır 800s, Enterprise üst sınır da var.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... business logic
}
```

**Yapma:**
- `dynamic`, `runtime`, `maxDuration` üçlüsünü skip etme — yeni cron eklerken bu üç directive zorunlu disiplin
- `maxDuration: 60` set etme — Vercel Pro default zaten 60s; explicit 60 hiçbir defansif değer katmaz, 300 (5 dk) batch için güvenli
- `maxDuration: 800` set etme (Vercel Pro üst sınır) — gerçek ihtiyaç olmadan max çekme; 300 yeterli, daha büyük batch ise queue (Upstash QStash) düşün
- `runtime = 'edge'` deneme — cron handler'lar Prisma + nodemailer/Resend HTTP / fs okumaları yapıyor, edge uyumsuz
- CRON_SECRET pattern'inde fallback kullanma (`process.env.CRON_SECRET || 'default'`) — fail-closed, env yoksa 401 düşmeli (CLAUDE.md §37.2 H)

**Yap:**
- Yeni cron eklerken 3 directive + auth gate + try/catch + structured response (`{ ok: true, ...stats }`) pattern'i izle
- `vercel.json` `crons` array'i + CLAUDE.md §21.12 tablosu birlikte güncelle (tek source-of-truth)
- Batch işler için `Promise.allSettled` per-row isolation (1 hata tüm batch'i kırmasın)
- Shared helper export et (admin manuel trigger için, CLAUDE.md §21.13 self-fetch antipattern bypass)

**Kullanıcı yansıması (bu fix'in)**:
- **Operatör (sen)**: aylık newsletter artık tam liste send eder (önceden ~500 abone'ye partial send, kalanı silently drop); trial-reminders timeout fail'i kaybolur → trial conversion mail'leri ulaşır
- **İşletme sahibi (owner)**: trial bitimine 1/3 gün kalan owner'lar artık reminder mail'i alır → conversion fırsatı artar
- **Müşteri**: dolaylı — abone olduğu newsletter artık her ay tam içerikle ulaşır
- **Validasyon**: bir sonraki Pazartesi 09:00 UTC weekly-digest cron'unun execution duration'ı Vercel cron dashboard'da kontrol edilebilir; 60s'in üstünde sürmesi önceden timeout demekti, şimdi 300s ceiling

**Kanıt zinciri (root cause confirmed)**:
- Vercel Pro plan: `Function timeout` default 60s (Hobby 10s, Enterprise 800s default)
- `monthly-newsletter` `runMonthlyNewsletter()` helper'ı: Resend HTTP rate limit 10/sec → her abone arasına 120ms throttle. 1000 abone = 120s. **60s ceiling'de timeout olur** → cron Vercel tarafından 504 olarak işaretlenir, sonraki execution'a kadar partial send hayatta kalır
- `trial-reminders` per-user mail fan-out: trial cohort 200+ user'da ~80s alır
- `anonymize-ips` tek `prisma.feedback.updateMany` query'si: <2s, etkilenmiyor ama defansif düzeltildi
- `weekly-digest` ve `weekly-digest-summary` zaten `maxDuration: 300` set'ti ama `runtime` eksikti — sadece defansif düzeltme

### 38.12 2026-05-04 — Production health fix bundle (Vercel runtime audit)

PR #392 (cron config hardening) sonrası kullanıcı "şu an cron'lar gerçekten çalışıyor mu" sordu. 3 günlük Vercel runtime log'u (1-4 May 2026) tarandı; **8 farklı production hata kategorisi** tespit edildi. Mevcut kod state'iyle çapraz kontrol sonrası 4 tanesi zaten fix'lenmişti (eski deploy artığı), 4 tanesi hâlâ aktifti — 2 tanesi kod fix, 2 tanesi operatör aksiyonu.

**Audit'te tespit edilen 8 hata kategorisi**:

| # | Hata | State (audit anı) | Fix kategorisi |
|---|---|---|---|
| 1 | Resend HTTP 429 (newsletter) | ❌ Aktif — `monthly-newsletter.ts:98` 120ms throttle (Resend free 2/sec cap'i aşıyor) | **Kod (bu PR)** |
| 2 | OpenAI 429 `billing_not_active` | ❌ Aktif — billing tükenmiş, AI tüm akışları template fallback | **Operatör (sen)** + **kod (alert)** |
| 3 | Prisma EMAXCONN | ❌ Aktif — `DATABASE_URL` `connection_limit` eksik | **Kod (bu PR `.env.example`) + operatör (Vercel env revize)** |
| 4 | reCAPTCHA `PERMISSION_DENIED` | ❌ Aktif — Google API key restriction (soft-pass aktif, kasıtlı) | **Operatör** |
| 5 | OG image ENOENT | ✅ Fix edilmiş — `public/images/open-graph-{tr,en}.png` artık var | (eski log) |
| 6 | Google Business 429 | ✅ Mevcut yeterli — `googleBusinessFetch` 2 retry + exp backoff + 401 reauth (PR #374) | (kapsanmış) |
| 7 | AdminUser.name field | ✅ Fix edilmiş — `audit/route.ts` `username: true` + `name: a.username` map | (eski log) |
| 8 | OpenAI AbortError | ✅ Defansif — `try/catch` + `clearTimeout` + signal | (kapsanmış) |

**Bu PR'da yapılan fix'ler**:

1. **Resend throttle** `monthly-newsletter.ts:98` `120ms → 600ms` (1.6 req/sec, %20 safety margin under Resend free 2/sec cap)
2. **OpenAI billing alert** `src/lib/email/ops-alert.ts` yeni `notifyOpsOfOpenAiBillingFailure()` export + `src/lib/openai.ts` `chatCompletion` 429 + `OPENAI_BILLING_ERROR_TYPES` (`billing_not_active`, `insufficient_quota`, `billing_hard_limit_reached`) detect → ops mail (5 dk/error type rate-limit). Operatör topup gerektiğinde anında mail alır.
3. **`.env.example` `DATABASE_URL`** `&connection_limit=1` eklendi (template + CLAUDE.md §14.1 referans). Vercel'de `DATABASE_URL` env'i revize edilmesi gerekir (operatör aksiyonu).

**OpenAI billing alert davranışı**:
```ts
// chatCompletion 429 + body.error.type ∈ OPENAI_BILLING_ERROR_TYPES → notify
notifyOpsOfOpenAiBillingFailure({ status, errorType, message, source });
// → ops-alert.ts rate-limited (1 mail / 5 min / errorType key)
// → fire-and-forget, AI fallback path bloklanmaz
// → mail body: error type + status + source + topup link
// → recipient: OPS_EMAIL || NOTIFICATION_EMAIL fallback
```

**`connection_limit=1` mantığı (CLAUDE.md §14.1 ek)**:
- Vercel serverless'ta her Lambda 10 conn default açar (Prisma default `connection_limit`)
- 20 concurrent Lambda × 10 conn = 200 conn → Supabase pooler 200 cap'i hızla dolar
- `connection_limit=1` → her Lambda 1 logical conn açar; pgbouncer transaction-mode altında multiplex eder
- Prisma docs canonical öneri: https://pris.ly/d/connection-pool

**Yapma**:
- Resend throttle 120ms'a geri çekme — Resend Pro plan'a (10 req/sec) geçilirse ~150ms uygun olur, free tier'da değil
- OpenAI billing alert'i her 429'da gönderme — sadece `OPENAI_BILLING_ERROR_TYPES` set'inde olanlarda. Generic rate-limit (RPM) 429'ları gönderilmez (false positive)
- `connection_limit=1`'i `DIRECT_URL`'e ekleme — bu URL sadece build-time `prisma migrate deploy` için, request runtime'a girmez

**Yap**:
- Yeni Resend mass-send akışı eklenirken throttle 600ms+ veya batch API kullan (paid tier'da daha hızlı throttle OK)
- Yeni OpenAI billing error type ortaya çıkarsa `OPENAI_BILLING_ERROR_TYPES` set'ine ekle
- Vercel env'inde `DATABASE_URL`'i revize ettiğinde bir sonraki deploy'dan itibaren etkili — manuel redeploy gerekmez

**Operatör aksiyonu listesi (kullanıcı yapacak)**:
1. **OpenAI dashboard** (`https://platform.openai.com/account/billing`) → kart kontrol et / kredi yükle. Düzeltildikten sonra mevcut tüm AI akışları (Pulse AI suggest-reply, analytics tema çıkarımı, weekly insight) anında çalışır (cache yok)
2. **Vercel Settings → Environment Variables → `DATABASE_URL`** → mevcut connection string'in sonuna `&connection_limit=1` ekle. Sonraki deploy'da etkili. Production + Preview scope ikisinde de güncelle.
3. **Google Cloud Console → reCAPTCHA Enterprise** → API key restrictions kontrol et (PERMISSION_DENIED'ı çözmek için). LOW öncelik — soft-pass mode zaten aktif (CLAUDE.md §38.2).
4. (opsiyonel) **Supabase project plan upgrade** — Pro plan pool cap'i 400+'a çıkar; `connection_limit=1` ile birlikte two-layer protection.

### 38.13 2026-05-04 — Sentry server-side flush kapatma (A kararı, kabullenildi)

§38.8 + §38.9'da açık bırakılan "server-side Sentry envelope flush kör nokta" araştırması bu oturumda **kapatıldı**. 5 hipotezden 4'ü elendi; kalan (e) için ek diagnostic'in değer/maliyet oranı düşük olduğu için "kabullenme + Vercel runtime logs üzerinden monitoring" kararı alındı.

**Bu oturumda yapılan diagnostic adımlar:**

| PR | Branch | Hipotez | Sonuç |
|---|---|---|---|
| #398 | `claude/sentry-test-console-diagnostic` | (b) `console.error` Vercel log'da ayrı row görünür → flush sonucu görünür olur | ❌ ELENDI — Vercel runtime log API per-request **1 row** kuralı uyguluyor (`console.error` da `process.stderr.write` gibi collapse ediyor). PR ayrıca DSN fingerprint helper'ı kazandırdı. |
| #399 | `claude/sentry-init-debug-log` | (d) DSN yanlış projeye route oluyor | ❌ ELENDI — cold-start init log + smoke test response `dsn: o4511305612328960.ingest.us.sentry.io/4511305613967361` döndü → `buaze-ev/sentry-apricot-blanket` doğru project (o4511305612328960 = `buaze-ev` org id, 4511305613967361 = `sentry-apricot-blanket` project id). |

**Live smoke test sonucu (10:24 UTC, deployment `dpl_J73ddVaXaCey8xPKzdpr51T94AXt`):**

- `GET /api/sentry-test` → 500 + JSON `{ ok: true, eventId: '1027cf57510443769932b488fb08c991', dsn: 'o4511305612328960.ingest.us.sentry.io/4511305613967361', flushPattern: 'after()-wrapped' }`
- `Sentry.captureException` event ID üretti (SDK çağrısı kabul edildi)
- `after()` callback flush'ı schedule etti (PR #390 paterni)
- Vercel runtime logs → **hâlâ 1 row** (4 console.error breadcrumb collapse oldu)
- Sentry dashboard `buaze-ev/sentry-apricot-blanket` → **0 issue** son 15dk + sonraki 30dk içinde event id ile arandı, **bulunamadı**

**Hipotez eleme tablosu (final):**

| Hipotez | Durum | Kanıt |
|---|---|---|
| (a) `await Sentry.flush(N)` çalışır | ❌ ELENDI | PR #377-380 — `flush(2000)` ve `flush(5000)` her ikisi de `false` döndü, envelope ulaşmadı |
| (b) `console.error` Vercel log'da ayrı row | ❌ ELENDI | PR #398 — collapse devam ediyor, hipotez yanlış |
| (c) Edge runtime mix | ❌ ELENDI | `runtime = 'nodejs'` explicit set'li, log `NEXT_RUNTIME=nodejs` kanıtlıyor |
| (d) DSN yanlış projeye route oluyor | ❌ ELENDI | PR #399 — DSN fingerprint `buaze-ev/sentry-apricot-blanket` doğru |
| (e) SDK transport bozuk **veya** Vercel egress firewall Sentry ingest'e ulaşamıyor | 🟡 KALAN | Manuel envelope POST diagnostic ile test edilebilir (PR 3 önerisi) ama A kararı ile bu yola gidilmedi |

**A kararı (kabullenme) — gerekçe:**

1. **Müşteri etkisi sıfır**: site çalışıyor, Sentry server-side captures bozuk olsa da unhandled error'lar `onRequestError` hook ile yakalanıyor (zaten flush gönderemiyor ama crash'i loglamıyor da değil — sadece dashboard'a düşmüyor)
2. **Client-side captures ÇALIŞIYOR**: `buaze-ev/sentry-apricot-blanket`'te `Hydration Error`, `SyntaxError '�'`, MetaMask noise gibi browser-side event'ler düzenli geliyor. Sentry tamamen ölü değil — sadece server-only path'ler kapalı.
3. **Operasyonel görünürlük zaafı VAR ama kontrollü**: §38.9 "Prisma dalgası" örneğinde olduğu gibi server-only hatalar Sentry'de görünmez; ama Vercel runtime logs'a düşer. Operatör reaktif olarak Vercel Observability ile tespit eder. Proaktif Sentry uyarıları yok.
4. **Diagnostic maliyet/değer oranı düşük**: PR 3 (manuel envelope POST) kök nedeni tanılar ama tek başına fix değil — sonuca göre ek bir PR daha gerekir (SDK upgrade, custom transport, veya Vercel support ticket). Toplam ~30dk-2 saat iş + belirsiz fix yolu. Alternatif olarak Sentry SDK 10.51 → latest upgrade (~10dk, %50-70 olasılık fix) önerildi ama operatör tercih etmedi.
5. **Sentry SDK 10.x + Vercel Node runtime ekosisteminde "envelope flush silently fails" sık raporlanıyor** — Sentry aktif fix yapıyor olabilir; gelecek bir SDK upgrade window'unda otomatik düzelme şansı var.

**Bu kararla birlikte kalıcı state:**

- `/api/sentry-test` endpoint kod tarafı korundu (rollback **yapılmadı**) — gelecek diagnostic ihtiyacı için yeniden yazılmasın
- `sentry.server.config.ts` + `sentry.edge.config.ts` cold-start init log'u korundu (PR #399 değişikliği) — Vercel runtime log'da `[sentry-init/server] dsn=...` satırı her cold start'ta görünür, gelecekte DSN drift olursa anında fark edilir
- `ENABLE_SENTRY_TEST` env Vercel Production'dan **silindi** (operatör 2026-05-04). Endpoint default 403 dönüyor, bot scan veya spam çağrıları Vercel function quota tüketmez
- Server-side `Sentry.captureException` çağrıları (manuel + `onRequestError` otomatik) çalışmaya devam eder; envelope ulaşmasa da hata fırlatmaz, request akışını kırmaz

**Yapma:**

- Yeni "Sentry server-side flush hipotezi" çalıştırma — 5'i denendi, 4 elendi. Kalan (e) için A kararı verildi. Yeni session bu kapsamı tekrar açmadan önce kullanıcıya açık talep oluştuğunu doğrulasın.
- `/api/sentry-test` endpoint dosyasını silme veya rollback'leme — gelecek diagnostic için reuse edilebilir altyapı
- `sentry.server.config.ts` `[sentry-init/server]` log satırını silme — DSN drift detection için kalıcı
- Server-side `Sentry.captureException` çağrılarını kaldırma — eventID üretiyor, throw etmiyor; gerçek görünürlük yok ama mevcut akış da bozulmuyor
- "Sentry server captures bozuk, kullanıcı etkilensin" panik yapma — müşteri etkisi sıfır, sadece operatör görünürlüğü zaafı

**Yap:**

- Production hata audit'i için **Vercel Observability dashboard + runtime logs** kullan (`get_runtime_logs` MCP tool, level filter, since/until window). §38.9 paterni — Prisma dalgası, OpenAI billing fail, mail send fail bu yolla tespit edildi.
- Yeni cron / mail / OAuth integration eklenirken hata path'lerinde **`console.error` ile structured log yaz** (PII guard §37.7) — Sentry'e güvenme, gerçek monitoring kanalı bu.
- Yeni `Sentry.captureException` çağrısı eklerken **ek olarak `console.error` ile aynı bağlamı yaz** — biri çalışmasa diğeri çalışsın.
- `@sentry/nextjs` upgrade fırsatı çıkarsa (örn. başka bir feature için bumping) bilinçli olarak smoke endpoint'e tekrar test et — A kararı SDK fix'i geldiğinde otomatik geri alınır.
- Sentry server-side flush'ı çözmek operatör veya gelecek session'ın tercihiyse: önce `@sentry/nextjs` 10.51 → latest upgrade (B seçeneği), sonra başarısızsa PR 3 manuel envelope POST diagnostic (C seçeneği). A → B → C sıralaması.

**Branchler kullanıldı bu oturumda:**

| Branch | PR | Durum |
|---|---|---|
| `claude/sentry-test-console-diagnostic` | #398 merged | Console.error swap + DSN fingerprint helper |
| `claude/sentry-init-debug-log` | #399 merged | Cold-start init log (server + edge) |
| `claude/sentry-flush-session-close-docs` | #400 merged | §38.13 docs close-out + §38.8/§38.9 pending tablo update |

### 38.14 2026-05-04 — Owner Panel Pulse 2026 redesign + UX bug fix

Claude Design'dan gelen `/v1/design/h/237b0j9_8BAp9h3YZqg08Q` handoff bundle (`/tmp/owner-redesign/a/`) Pulse 2026 design system'iyle owner panel'i hizalama oturumu. Tasarım dosyaları **birebir uygulanmadı** (rule §16 — `.design/` referans only); spec'ten somut delivery'e dönüşen 9 PR + 2 recovery PR.

**Toplam 12 PR, 9 unique feature**:

| PR | İçerik | Durum |
|---|---|---|
| #401 | RatingChart renk hierarchy + PlatformDistribution duplikasyon temizliği + QR card "yorum"→"taranma" label fix | merged |
| #402 | Phase 1 CSS Foundation — yeni `.bz-*` sidebar/drawer/menu utility class'ları | merged |
| #409 | Recovery: Phase 2-5-6-8 reapply (stacked-squash gotcha #1) | merged |
| #410 | HIGH sweep — sidebar dark→light + primary CTA + plan progress + dashboard task card + Google hero | merged |
| #418 | Recovery: PR #411-416 reapply (stacked-squash gotcha #2) + Yorumlar composer scroll bug fix | merged |
| #419 | Google Reviews PROFİL SAĞLIĞI gauge + SIK GEÇEN KELİMELER (NLP keyword bar) | merged |
| #420 | Customer detail drawer — URL state pattern, slide-in, fetch, ESC+outside+focus trap | açık (CI passing) |
| (this PR) | Bu §38.14 docs close-out + sıradaki prompt placeholder | açık |

**Yapısal değişiklikler (sweep'in büyük çıktıları)**:

1. **Sidebar light theme** — `bg-[#0A0A0A] text-white` → `bg-white text-[#0A0A0A]`. Avatar chip + drawer overlay + bottom nav active state Pulse signature olarak korundu.
2. **Sidebar enhancements** — Yeni QR primary CTA, plan progress card (trial countdown), user dropdown menu (Profil/Ayarlar/Yardım/Çıkış, ESC + outside click), JetBrains Mono uppercase grup label, GENEL/CRM/İŞLETME/AYARLAR 4-grup nav reorganize.
3. **Customers CRM** (yeni sayfa) — `/dashboard/customers` server component, owner-scoped `/api/customers` endpoint, CSV export endpoint, customer detail drawer (URL state `?detail=KEY`).
4. **Feedbacks 3-col** — xl: ≥1280px breakpoint'inde `300px filter rail | 1fr list | 360px detail`. `FeedbackFiltersRail` component.
5. **Account 320px right rail** — xl: SettingsLayout opsiyonel `rightRail` prop. Plan/Team/Legal quick-nav 3 link card.
6. **Dashboard zenginleştirme** — 4 yeni section: BUGÜN BEKLEYEN (yanıtlanmamış low-rating), KANAL DAĞILIMI (4-card grid), SIK BAHSEDİLEN KONULAR (extractThemes AI), CANLI AKIŞ (activity timeline).
7. **Google Reviews polish** — Dark hero rating card (lime corner accent), PROFİL SAĞLIĞI 92/100 gauge (SVG arc), SIK GEÇEN KELİMELER (client-side word frequency, AI maliyetsiz).
8. **Customer detail drawer** (Phase 8d) — sağ slide-in, URL state, 3-stat tile, feedback timeline, mailto/tel actions.

**UX bug fix (PR #418)**:
- Kullanıcı raporu: "Yorumlar sayfasında yorum yazma alanında alta inilmiyor."
- Kök neden 1: detail wrapper'da `lg:min-h-0` + `lg:overflow-y-auto` eksikti; flex item default min-height: auto child'ı genişletip parent overflow-hidden altında scroll engelliyordu.
- Kök neden 2: textarea `min-h-[100px] resize-none` — uzun yanıtta büyümüyor, içeride scroll yaratıyordu.
- Fix: detail wrapper scroll açıldı + textarea `onInput` auto-grow (max 480px, smooth transition) + composer pb `lg:pb-8 → lg:pb-12`.

**Yeni dosyalar (kalıcı)**:

| Dosya | Amaç |
|---|---|
| `src/app/[locale]/dashboard/customers/page.tsx` | Owner Customers CRM list (server component, URL filter) |
| `src/app/[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx` | Slide-in drawer (URL state, fetch, ESC, focus trap) |
| `src/app/[locale]/dashboard/feedbacks/_components/FeedbackFiltersRail.tsx` | xl: 3-col layout filter rail |
| `src/app/api/customers/route.ts` | Owner-scoped customer list (raw SQL aggregation, KVKK filtered) |
| `src/app/api/customers/export/route.ts` | CSV export (UTF-8 + BOM, Excel TR-safe) |
| `src/app/api/customers/[key]/route.ts` | Single customer detail (IDOR + Prisma OR clause) |

**Yeni utility class'ları** (`src/app/globals.css`, Phase 1 — 277 satır additive):
- `.bz-brand-mark` — logo + wordmark inline cluster
- `.bz-side-section` + `--mini` — group eyebrow
- `.bz-side-item` + `.active` + `--mini` — nav item (default + collapsed + active)
- `.bz-side-tip` — collapsed nav tooltip
- `.bz-side-cta` + `--mini` — sidebar primary CTA
- `.bz-user-menu` + `-item` + `-divider` — bottom user dropdown
- `.bz-progress` + `.lime` — sidebar plan card progress
- `.bz-topbar-toggle` — mobile hamburger
- `.bz-mob-drawer` + `-overlay` + `bz-drawer-slide-in` keyframe — mobile drawer

**Yeni helper'lar** (in-page, not library — abstraction yok):
- `computeHealthScore({avgRating, total, replied})` (google-reviews) — 0-100, rating×70 + responseRate×25 + volume×5
- `extractKeywords(reviews, topN)` (google-reviews) — tokenize + STOPWORDS + sentiment derive
- Customers `buildHref` extended `'detail'` param

**KVKK + güvenlik disiplini (yeni endpoint'ler)**:
- ✅ Tüm yeni endpoint'ler IDOR — `getPanelActorFromRequest` + `getScopedRestaurantIds`
- ✅ Superadmin (null scope) 403 — admin endpoint ayrı pattern
- ✅ Anonim feedback exclusion (hasKvkkConsent + contactKey null filter)
- ✅ Email match `mode: 'insensitive'`, phone exact (Prisma OR clause)
- ✅ Cache-Control: `private, s-maxage=N, stale-while-revalidate=M`
- ✅ Cherry-pick recovery sırasında stacked-squash gotcha 2 kez yaşandı; her seferinde fresh-from-main consolidated PR ile recovery yapıldı (CLAUDE.md §21.22 paterni).

**Squash merge gotcha 2x (CLAUDE.md §21.22 referans)**:

| Gotcha | Kayıp PR'lar | Recovery PR |
|---|---|---|
| #1 | #403, #404, #405, #406, #407, #408 | #409 (recovery) |
| #2 | #411, #412, #413, #414, #415, #416 | #418 (recovery) |

Sebep: stacked PR'larda kullanıcı "Squash and merge" seçmiş, base PR merge sonrası alt PR'lar `closed-but-NOT-merged` durumda kalmış (içerikleri main'e geçmemiş). Çözüm: Cherry-pick + tek consolidated PR.

**Disiplin notu** (sonraki AI session için): Birden fazla stacked PR varsa, en sondaki PR'a tek bir squash merge yeterli olur (tüm commit'ler tek squash'a sıkışır + alt PR'lar otomatik close). Ama kullanıcı bu pattern'i bilmiyorsa yine gotcha. **En güvenli**: tek-PR yaklaşım (consolidated branch + cherry-pick), ya da kullanıcıya merge sırası açıkça söyle.

**Kalan backlog (sonraki PR'lar için)**:

| Item | Scope | Öncelik |
|---|---|---|
| **Phase 8c** — Customers segment helper (VIP/Loyal/Risk/Churned/New) + LTV proxy + sentiment columns + filter pills | `src/lib/customers.ts` + `/api/customers` extend + `customers/page.tsx` table+mobile card 3 sütun ekle | MED — CRM tamamlama |
| **HIGH 4** — Platform Bağlantıları 12-card grid sayfası | Aggregate view vs per-restaurant; product decision gerek (multi-restaurant owner UX) | DEFER — kullanıcı kararı bekliyor |
| **Kampanyalar** (Campaigns) | Tasarım sidebar'da var, mevcutta yok; yeni feature scope (backend + UI + e-posta integration) | SKIP — explicit talep yok |
| **HIGH 5 ek** — Google Profil tamlığı / Q&A / Quick reply templates | Google Place API sync gerek (yeni backend) + reply template seed | DEFER — backend feature |

**Sonraki AI session için ipuçları**:
1. PR #420 merge edildiğinde fresh main'den **Phase 8c branch** açılır.
2. Stacked PR olmasın — tek consolidated PR önerisi. Squash gotcha riski 2 kez yaşandı.
3. CLAUDE.md §38.14 (bu) son durum kaynağı; yeni iş yaparken §38.15+ olarak ekle.

**Sıradaki kullanıcı prompt'u** — §38.15'te dokümante edildi.

### 38.15 2026-05-04 — Yorumlar composer UX revize (audit + senior dev fix)

Kullanıcı promptu (özet): *"Bu zamana kadar yapılanların hatasız ve tasarıma uyumlu olduğundan emin ol. Backend gerekiyorsa senior backend dev titizliğiyle, frontend tarafında en iyi dev gibi hatalı/UX kötü yerleri düzelt — özellikle Yorumlar sayfasında mesaj/mail atma alanı."*

Senior frontend dev disipliniyle paralel Explore agent ile composer/yorumlar UX deep-dive audit + 14 issue fix. **Backend dokunulmadı** (composer UX bütünüyle frontend). Tasarım parity §38.14'te zaten teyit; bu PR **UX kalite + a11y + bug** kapsamında.

**PR #422 — `fix(feedbacks): composer UX revize`** (3 dosya, +147/-39):

A11y (P0, WCAG 2.1 AA):

| Yer | Fix |
|---|---|
| `FeedbackReplyComposer` textarea | `<label htmlFor>` + `aria-labelledby="reply-textarea-label"` + `aria-describedby="reply-textarea-hint"` + stable `id="reply-textarea-input"` (failed reply retry için scrollIntoView/focus target) |
| Send button | `aria-disabled` + dynamic `title` ("Önce yanıt yazın" / "Gönderiliyor…") + `focus-visible:ring-2 ring-[#C6F24E] ring-offset-2` |
| Tone selector | `focus-visible:ring-2 ring-[#C6F24E] ring-offset-2 ring-offset-[#0A0A0A]` (dark bg üstünde lime ring contrast pass) |
| Reply notice | `role="status"` (semantic SR announcement) + char counter `aria-live="polite"` |

UX (P1) — productivity wins:

| Fix | Detay |
|---|---|
| **Cmd/Ctrl+Enter shortcut** | Composer textarea `onKeyDown` handler, boş + sending guard'lı submit |
| Visual `kbd` chip | "⌘ Enter göndermek için" desktop hint (Stripe/Linear pattern) |
| **Tone change → auto-regenerate** | `onChange` içinde `setAiTone` + `onRegenerateAi()` (aiSuggestion mevcutsa, !aiLoading guard'lı). Manuel "Yeniden Öner" tıklaması gereksiz. |
| Karakter sayacı | Live (>0 görünür), `bz-mono tabular-nums`, `aria-live` polite |
| `maxLength={5000}` | HTML guard mail body üst sınır |
| Reply notice timeout | 2.8s → **5s** (success/info), **8s** (error tone). WCAG dwell timing (≥5.5s öneri). |
| iOS auto-zoom prevent | Textarea `text-[16px] sm:text-[13px]` (CLAUDE.md §25.5 paterni) |
| Auto-grow viewport-aware | `Math.min(480, window.innerHeight × 0.5)` — küçük ekranda full-takeover engellenir |
| Placeholder focus | `focus:placeholder:text-[#525252]` darker on focus |
| Emoji buttons removed | 📝✨😊@ — no functionality, visual clutter (UX disiplin) |

Bug (P0) — Gmail-like:

| Fix |
|---|
| **`replyDraft` + `replyNotice` + `sendEmail` clear on feedback switch** — `useEffect [activeFeedbackId]`. Önceden A müşteri için draft yazıp B'ye geçince stale draft kalıyordu (data leak + UX confusion). Yeni feedback'te `sendEmail` da true'ya reset (customer email varsa default etkin). |

UX (P0) — failed reply recovery:

| Fix |
|---|
| **Failed reply altında "Yeniden dene" button** (Pulse danger palette satırı). Tıklayınca: `props.setReplyDraft(rep.body)` + `requestAnimationFrame(() => textarea.focus() + scrollIntoView smooth + cursor end)`. Mevcut backend POST endpoint reuse — yeni endpoint açılmadı (eski failed kayıt audit-friendly korunur). |

Drift (P1):

| Fix |
|---|
| `xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,360px)]` → `xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,400px)]`. Detail panel 360→400px (composer textarea + button row ferah; dar layout overflow'u temizlendi). |

**Senior backend disiplini (audit kararları)**:
- Failed reply için PATCH endpoint açılmadı (CLAUDE.md §28 — abstraction kaçınma + audit log korunması). Mevcut POST pattern: yeni reply oluşturulur, eski failed kayıt log için kalır.
- Backend kontratı dokunulmadı. composer `onSendReply` mevcut endpoint'e POST atar, response shape değişmedi.

**Senior frontend disiplini (audit kararları)**:
- WCAG 2.1 AA hedefi: label + aria-describedby + role + focus-visible
- Klavye-first: Cmd+Enter shortcut, scrollIntoView smooth, cursor positioning
- iOS guard: 16px font (auto-zoom prevent)
- State hygiene: Gmail draft pattern (clear on switch)
- Failure UX: Retry button (data loss yok, audit korunur)
- Reduced motion: `transition-[height]` 150ms (auto-grow), reduced-motion blanket korur

**P2 backlog (gelecek PR — kullanıcı talebine göre)**:

| Item | Sev | Scope |
|---|---|---|
| AI skeleton + spinner redundancy | LOW | `Composer.tsx` visual cleanup |
| Sent reply scroll position kayıp on switch | MED | useEffect scroll anchor / smooth restore |
| Reply thread expand/collapse | LOW | Long thread'lerde collapsible |
| Emoji buttons replacement | LOW | Mention `@` / AI improve / snippet — yeni feature, scope explicit talep |

**Yapma**:
- Composer'a yeni emoji picker / GIF / image attachment ekleme — scope creep, kullanıcı talebi yok
- Failed reply için PATCH/retry endpoint açma — mevcut POST audit-friendly (eski failed kayıt korunur)
- Tone change auto-regenerate'i kapatma — UX win, manuel tıklama gereksizliği netleşti
- Notice dwell timing'i 2.8s'e geri çekme — WCAG dwell ≥5.5s ihlali, error 8s mantıklı

**Yap**:
- Yeni composer-related feature eklenirken bu PR'daki a11y disiplinini koru: `<label htmlFor>` + `aria-describedby` + `focus-visible:ring`
- Failed reply retry pattern reuse — `/api/feedback/[id]/reply` POST + body re-load (textarea fokus + scrollIntoView + cursor end)
- UX dwell timing'leri tutarlı tut: success/info **5s**, error **8s** (bu PR kanonik)
- Cmd+Enter shortcut pattern'i diğer form composer'larda da reuse (inbox reply, email compose, vb.)

**Kalan backlog (Phase 8c, HIGH 4 dahil)**: §38.14'teki backlog tablosu ile aynı, Phase 8c (Customers segment + LTV + sentiment) en yüksek öncelikli olmaya devam eder.

### Sonraki AI session için prompt (öneri)

Aşağıdaki prompt sonraki session'a aktarılmak için tasarlandı. Kullanıcı doğrudan kopyalayıp yapıştırabilir veya kendi versiyonunu yazabilir:

```
CLAUDE.md §38.14 + §38.15 son session özetlerini oku. Şimdi:

1. PHASE 8C (Customers CRM tamamlama) — yapılacak iş:
   - src/lib/customers.ts yeni helper:
     • computeSegment({visits, daysSinceLastVisit, avgRating}) → 'vip' | 'loyal' | 'risk' | 'churned' | 'new'
     • computeLTV({visits, avgRating}) → number (proxy: visits × avgRating × 10)
     • computeSentiment(avgRating) → 'pos' | 'neu' | 'neg'
   - /api/customers/route.ts response'a 4 alan ekle: avgRating, daysSinceLastVisit, segment, ltv, sentiment (server-side helper ile derive)
   - /api/customers/export route 4 yeni sütun (Segment + LTV + Sentiment + Days since)
   - /[locale]/dashboard/customers/page.tsx:
     • Table'a 3 yeni sütun (Segment Badge, LTV mono, Sentiment dot+label)
     • Mobile card'a 3 yeni row
     • Segment filter pills (Tümü / VIP / Loyal / Risk / Churned / New) range filter üstüne
   - Tasarım kaynağı: .design-owner-2026/project/page-customers.jsx (segment+LTV+sentiment kolonları)

2. AUDIT — yeni iş başlamadan önce paralel Explore agent ile:
   - Composer fix sonrası Yorumlar sayfası gerçekten temiz mi (regression check)
   - Yeni Customer drawer + segment columns'a uygun ekstra mobile UX gap'i var mı
   - Phase 8c sonrası dashboard "BUGÜN BEKLEYEN" + Customers segment crossover (high-LTV churned customer alert vs?)

3. DİSİPLİN:
   - Senior backend dev titizliği: IDOR + Zod + cache header + audit (yeni segment helper'ları test edilebilir saf fonksiyon)
   - Senior frontend dev: a11y (Badge primitive + filter pill keyboard nav) + mobile card consistency
   - CLAUDE.md §28 abstraction kaçınma — segment helper 3+ yerde kullanılırsa lib/customers.ts; aksi halde inline
   - Stacked PR YAPMA — fresh main'den tek consolidated branch (squash gotcha 2x yaşandı, §21.22)

4. ÇIKTI:
   - Tek PR (Phase 8c) main'e doğrudan
   - CLAUDE.md §38.16 olarak audit + fix log'u

Önce CLAUDE.md §38.14 + §38.15 + §16 .design-owner-2026 entry'lerini hızlıca tara,
sonra Phase 8c implementation planını AskUserQuestion ile clarify (segment threshold'ları product decision):
- VIP threshold: visits ≥ ? + avgRating ≥ ?
- Risk threshold: avgRating < ? + visits ≥ ?
- Churned: daysSinceLastVisit > ?
- LTV multiplier proxy: visits × avgRating × ? (yoksa flat visits sayısı)

Sonra plan onaylanınca implement et.
```

**Bu prompt'un avantajları**:
- Tüm bağlamı CLAUDE.md §38.14 + §38.15 + §16'dan çekiyor (re-read disiplini)
- Audit aşaması mevcut (regression check, mobile gap)
- Stacked-squash gotcha uyarısı dahil (fresh-from-main)
- Product decision'ları AskUserQuestion ile netleştir (segment threshold'lar)
- §38.16 dokümantasyon disiplini explicit
- Senior backend + frontend disiplini somut kriterlerle

### 38.16 2026-05-04 — Phase 8c Customers CRM tamamlama (segment + LTV + sentiment)

§38.14 Phase 8d Customer Detail Drawer ile başlayan CRM modülünü Phase 8c kapsamında segment + LTV + sentiment + filter pill'leri ile tamamladık. Tasarım kaynağı `.design-owner-2026/project/page-customers.jsx` ile parite + audit önerilerine göre UI density (drawer-centric) optimize edildi.

**Audit (3 paralel Explore agent, yeni iş öncesi)**:
1. **Composer regression** (Yorumlar sayfası §38.15): ✅ Tüm 5 fix doğru uygulanmış — a11y label/aria/focus, Cmd+Enter shortcut + kbd hint, tone-change auto-regenerate, auto-grow viewport-aware, detail wrapper `lg:min-h-0 lg:overflow-y-auto` + 400px grid + Gmail-pattern draft clear + retry button + scrollIntoView. Phase 8c scope'undan etkilenmez.
2. **Mobile/Desktop UX gap**: ⚠️ Density risk var. Mobile card 5 → 7-8 satır kalabalıklık, desktop 6 → 9 kolon 1280px'de overflow yüksek. Audit önerisi (kabul edildi): drawer-centric — list'te essentials, LTV drawer'a, "İşletme" kolon drop, sticky first column.
3. **Dashboard segment crossover**: BUGÜN BEKLEYEN + segment badge yüksek değerli; **Phase 8c+ scope** (bu PR'da implement edilmedi, backlog tablosunda).

**Threshold kararları (kullanıcı onayı, AskUserQuestion)**:

| Karar | Değer | Sebep |
|---|---|---|
| Segment thresholds | **Konservatif** — VIP: visits ≥ 5 + avgRating ≥ 4.0 / Risk: avgRating < 3.0 + visits ≥ 2 / New: visits ≤ 2 / Loyal: kalan | Tasarımda 4 segment (.design-owner-2026), churned scope creep |
| Churned segment | **Hayır** | Tasarım parity korunur (4 segment), 5. pill mobile da row taksim kaybı |
| LTV formülü | **`visits × avgRating × 10`** | Konservatif heuristic, owner'a yanıltıcı "altın" iddiası vermez |
| UI yaklaşımı | **Drawer-centric** | Mobile sade (Segment+Sentiment), Desktop 7 kolon + sticky first |

**Kalıcı kararlar (yeni endpoint/feature eklenirken bu disiplin)**:

- **`src/lib/customers.ts` saf fonksiyon helper kaynak**: `computeSegment` + `computeLTV` + `computeSentiment` + `computeDaysSinceLastVisit` + `deriveCustomerFields` (4-in-1 aggregate). 4 callsite (list endpoint + detail endpoint + export endpoint + page server component) tek source-of-truth, SQL'de duplicate yok. Helper drift önleme.
- **Segment sınıflandırma sırası**: `new → risk → vip → loyal`. "new" ilk önce çünkü visits ≤ 2 olan müşteriye risk/vip yetersiz örneklem; "risk" VIP'ten önce çünkü memnuniyetsizlik signal'ı sadakat signal'ından kritik (avgRating < 3 + visits ≥ 5 durumunda VIP yerine Risk seçilmeli).
- **Pagination strategy**: SQL `LIMIT 5000` cap (CLAUDE.md §19.4.4 ölçek için rahat) + JS-side derive + filter + slice. SQL'de segment hesaplaması (HAVING + CASE) yapılmıyor — helper drift önleme. Cap aşılırsa `meta.truncated: true` döner, UI amber banner gösterir.
- **Segment counts**: pill label'ları için tüm enriched array üzerinden hesaplanır; segment filter UYGULANMADAN. Her pill mevcut range/scope toplamını gösterir, filter kaybolmasın.
- **CSV export sütun sırası**: 14 sütun (eski 9 + 5 yeni: Ort. Puan, Segment, LTV, Sentiment, Son Ziyaret gün önce). Sentiment label TR'de "Olumlu/Nötr/Olumsuz" (CSV is internal/ops use, locale TR fixed).

**Yeni dosyalar**:

| Dosya | Amaç |
|---|---|
| `src/lib/customers.ts` | Saf fonksiyon helper'ları (5 export) |
| `tests/customers.test.ts` | 28 unit test (5 suite, 100% coverage saf fonksiyonlarda) |

**Genişletilen dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/app/api/customers/route.ts` | LIMIT 5000 + JS-side derive + segmentCounts + segment filter + truncated meta |
| `src/app/api/customers/[key]/route.ts` | response.stats'a 4 yeni alan (segment + ltv + sentiment + daysSinceLastVisit) |
| `src/app/api/customers/export/route.ts` | 5 yeni CSV sütunu + segment query param filter |
| `src/app/[locale]/dashboard/customers/page.tsx` | Tablo 7-kolon (İşletme drop, Segment + LTV + Sentiment ekle), sticky first column, mobile card Segment+Sentiment row, segment filter pills + URL state |
| `src/app/[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx` | Header'a SegmentChip + SentimentBadge, 3-tile → 4-tile (LTV ekle), CustomerData type genişletildi |

**Yapma**:
- LTV birimini "₺" / "$" / "TL" prefix'i ile sun — gerçek satış data'sı yok, currency iddiası yanıltıcı (heuristic disclosure: hover title `'Etkileşim ağırlığı (yorum × ortalama puan)'`)
- Churned segment ekleme — tasarım parity korunur, scope creep
- Segment hesaplamasını SQL'e taşımak (HAVING + CASE) — helper drift kaynağı; helper 4 callsite'tan reuse edilmeli (CLAUDE.md §28 disiplin)
- Mobile card'a LTV row eklemek — kalabalıklık, drawer'a yönlendir (audit kararı)
- Desktop tabloda "İşletme" kolonu geri eklemek — restaurant_name drawer header'da var, dedupe; restaurant_name + branch zaten ad altı subtitle'da görünür
- Filter pill'lerde segment filter aktifken segmentCounts'ı yeniden hesaplama — counts pre-filter olmalı (her pill toplam göstermesi UX gereği)
- Segment threshold'larını component-level inline duplicate etme — helper'dan import et

**Yap**:
- Yeni segment-related feature eklerken `deriveCustomerFields()` aggregate kullan — 4 alan tek seferde derive eder, race olmaz
- Threshold değişikliği gerekirse `src/lib/customers.ts` tek nokta + tests/customers.test.ts unit test'i güncelle (28 test'in 8'i threshold-bound)
- Yeni Pulse component eklerken Pulse Badge primitive `kind` enum'u (ok/off/warn/danger/info/lime/ghost) yetmezse inline pill (custom bg/fg) yaz — VIP graphite gibi unique branding için Badge enum genişletme yerine inline (CLAUDE.md §7 abstraction kaçınma)
- Drawer'da yeni stat alanı eklerken 4-tile grid'i `grid-cols-2` korunur (5+ alan eklenirse `grid-cols-2 sm:grid-cols-3` ile tier'lendirilebilir)
- Yeni filter (örn. range + branch + segment combine) eklerken segmentCounts hesabı pre-filter konumunda kalmalı; sadece filtered array'in derived counts'ı UI etkilemez

**Backlog (operatör kararı bekleyen, Phase 8c+ scope)**:

| Item | Sev | Sebep |
|---|---|---|
| ~~Dashboard "BUGÜN BEKLEYEN" segment badge~~ ✅ **Tamamlandı** §38.17 | — | PR §38.17 merged |
| Admin `/customers` segment kolonu | MED | Helper reuse; aynı API olmadan admin endpoint kendi raw SQL'inde derive eder |
| Weekly digest mail segment context | LOW | "Bu hafta 3 VIP müşterin yorum bıraktı" gibi segment-bazlı sayım — `weekly-digest-summary` template'i + helper |
| LTV gerçek satış data integration | DEFER | Iyzico Wave 3.5 sonrası — POS data + bu helper'ı override etme; şimdilik heuristic |
| Customer notes / tags / manuel segment override | DEFER | Yeni schema (CustomerNote model) + write-side; bu PR'ın scope'u dışında |

**Sonraki AI session için ipuçları**:
1. PR #420 (Phase 8d) merge edilmişse fresh main'den Phase 8c eklenmiştir; daha sonraki PR'lar `claude/*` branch'inden açılır.
2. Stacked PR YAPMA — squash gotcha §21.22 2x yaşandı; tek consolidated PR önerilir.
3. Threshold/copy değişikliği lokal: `src/lib/customers.ts` + test güncel + page label'ları + drawer helper component'i.
4. CLAUDE.md §38.17 yeni feature için sonraki alt-section.

### 38.17 2026-05-04 — Dashboard "BUGÜN BEKLEYEN" segment badge crossover

§38.16 backlog tablosunda en yüksek-değerli crossover olarak işaretlenen iş bu PR'da kapatıldı. Owner home'daki "BUGÜN BEKLEYEN" section (yanıtsız low-rating feedback list) artık her satırda müşteri segment chip'i (VIP / Düzenli / Yeni / Risk) gösterir → owner aksiyon önceliklendirmesi data-odaklı (VIP yanıt bekliyor = reputation priority, Risk = win-back urgency).

**SegmentChip extraction (CLAUDE.md §7 — 3+ kuralı tetiklendi)**:
- 2 inline kopya (customers/page.tsx + drawer) + 3. callsite (dashboard) → **`src/components/customers/SegmentChip.tsx` extract edildi** (pure presentational, server + client component'lerden import edilebilir).
- 3 callsite ortak source-of-truth: `SEGMENT_MAP` const'ı (Crown / CheckCircle2 / Sparkles / AlertTriangle ikonları + 4 renk eşlemesi), `size: 'sm' | 'md'` prop'u.
- Migration: `customers/page.tsx`'teki inline `SegmentChip` (29 satır) silindi → import edildi. Drawer'daki inline `SegmentChip` (22 satır) silindi → import edildi (Crown/Sparkles/CheckCircle2 lucide import'ları da temizlendi).

**Dashboard `pendingTasks` query**:
- `include` → `select` migration (CLAUDE.md §14.1 defensive select disiplini); explicit `email`, `phone`, `restaurantId` field'ları + alt alanlar select'lendi (segment derivation contact_key için zorunlu).

**Customer aggregate post-fetch**:
- Audit "Seçenek B" kararı uygulandı: SQL kompleksitesinden kaçınma, basit raw query (`WHERE (restaurant_id, contact_key) IN VALUES`). 4-row küçük yük, +5ms tolere edilebilir (CLAUDE.md §14.1 connection_limit=1).
- `Prisma.sql\`(\${id}, \${key})\`` tuple match — SQL injection guard tüm değerler parametreli.
- `hasKvkkConsent = TRUE` zorunlu (CLAUDE.md §13.5 paterni — anonim feedback ve consent dışı kayıtlar aggregate'e dahil edilmez).
- `try/catch` fail-soft: aggregate query çökse de pending tasks list intact kalır (chip render olmaz, mevcut UX bozulmaz). `console.error` log + Sentry capture (CLAUDE.md §38.13 server-side flush kör nokta — log Vercel runtime'da görünür kalır).

**JS-side merge + UI render**:
- `pendingTasksWithSegment` map: contact_key bulunmayan satırlar için `segment: null` (anonim feedback). UI'da `task.segment && <SegmentChip>` conditional → null durumda render skip.
- Desktop: yıldızların yanına `size="sm"` chip (`hidden sm:inline-flex`); mobile: comment altında ayrı satır (`mt-1 flex sm:hidden`). Layout density audit önerisine sadık.

**Dosyalar**:
| Dosya | Değişim |
|---|---|
| `src/components/customers/SegmentChip.tsx` | YENİ — extract'lı pure component (45 satır) |
| `src/app/[locale]/dashboard/customers/page.tsx` | inline `SegmentChip` sil + import; lucide Crown/Sparkles/CheckCircle2/AlertTriangle import'ları temizlendi |
| `src/app/[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx` | inline `SegmentChip` sil + import; lucide Crown/Sparkles/CheckCircle2 import'ları temizlendi |
| `src/app/[locale]/dashboard/page.tsx` | (a) `Prisma` + `deriveCustomerFields` + `SegmentChip` import; (b) `pendingTasks` query `include` → `select` (5 yeni alan); (c) `pendingCustomerAggregates` raw query (try/catch fail-soft); (d) `pendingTasksWithSegment` map + UI render conditional chip |

**Yapma**:
- SentimentCell / SentimentBadge'i bu PR'da extract etme — hâlâ 2 yerde (drawer + customers/page.tsx), §7 "3+ kuralı" tetiklenmedi.
- `pendingTasks` aggregate query'sini transaction içine taşıma — sequential connection_limit=1 toplam latency'ye eklenir; post-fetch küçük query +5ms daha az invasive.
- Aggregate fail durumunda dashboard'ı hata sayfasına yönlendirme — fail-soft pattern (try/catch + chip skip) UX'i koruyor.
- Dashboard pending row'a LTV/sentiment ek bilgi ekleme — owner aksiyon-odaklı; tek segment yeterli, density artmaz.

**Yap**:
- Yeni callsite (örn. admin /customers segment kolonu, weekly digest mail segment context) `SegmentChip` import'u veya `deriveCustomerFields` aggregate kullanır — drift kaybolur.
- Yeni dashboard widget'ı segment data'sına ihtiyaç duyarsa benzer post-fetch raw query paterni reuse — abstraction değil, copy-paste 2 satır.

**Test + verification**:
- Yeni unit test gerekmedi (CLAUDE.md §32.2 — UI snapshot kaçınma + helper Phase 8c'de 28 test'le coverage'da).
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.

**Sonraki crossover (CLAUDE.md §38.16 backlog)**:
- Admin `/customers` segment kolonu (helper reuse, ayrı PR)
- Weekly digest mail segment context ("Bu hafta 3 VIP yorum bıraktı")

### 38.18 2026-05-04 — Analytics Pulse drift fix (KPI sparkline + AI dark card)

§16 üçüncü handoff bundle (`.design-owner-2026/project/page-analytics.jsx`) "drift küçük, mevcut analytics ile uyumlu" notuyla işaretlenmişti — bu PR'da tasarım parity için 2 yüksek-değer + low-risk drift kapatıldı; geri kalan büyük drift'ler backend genişleme gerektirdiği için backlog tablosuna eklendi.

**Drift inventory** (audit, senior frontend dev):

| Tasarım item | Mevcut | Karar |
|---|---|---|
| KPI mini sparkline (StatCard altında 32px area+line) | Sade StatCard | ✅ **YAP** — daily series data zaten var |
| AI İçgörüler **dark card** (graphite + lime accent) | Açık `bz-card` | ✅ **YAP** — visual restyle |
| 14-haftalık puan & hacim trendi (büyük chart, hedef line, last-point lime tooltip) | Window-day etkileşim trendi | 🔴 **DEFER** — backend weekly aggregate gerek |
| Heatmap (Gün × Saat, 7×24 grid) | 2 ayrı bar chart (günlük + saatlik) | 🔴 **DEFER** — backend 2D matrix + recharts/SVG custom |
| Topics sentiment progress (% pozitif/negatif bar) | Theme count only | 🔴 **DEFER** — `extractThemes` helper sentiment field extend |
| EN AKTİF KONUM mini section (lokasyon kart) | Yok | 🟡 **OPSİYONEL** — restoran-bazlı sıralama, küçük ek query |

**Yapılan**:

1. **`src/components/ui/StatCard.tsx`** — opsiyonel `sparkline?: number[]` + `sparklineColor?: string` prop'ları. Min 2 nokta gerekir; geçilmezse render skip (geriye dönük uyumlu, mevcut 50+ callsite etkilenmez). Sparkline alt satırda 28px height, `Sparkline` primitive reuse.

2. **`src/components/ui/Sparkline.tsx`** — `viewBox` + `preserveAspectRatio="none"` + `vectorEffect="non-scaling-stroke"`. Card width değişince scale eder; line stroke kalitesi `non-scaling-stroke` ile korunur. Default opacity `0.07` → `0.12` (koyu kart üzerinde fade görünmesin diye).

3. **`src/app/[locale]/dashboard/analytics/page.tsx`** — `interactionData` zaten window-day series taşır; 4 yeni map (`sparkScans` / `sparkReviews` / `sparkRedirects` / `sparkConversion`) hesaplanır. 4 KPI'a sparkline + uygun renk wire'lı:
   - **scans**: graphite (`#0A0A0A`)
   - **reviews**: graphite (`#0A0A0A`)
   - **conversion + redirects**: lime-deep (`#A8D62E` — Pulse aksen)
   - **bugün** + **low-rating**: sparkline yok (single-day veya rate-bazlı semantic uygun değil)

4. **AI insights section dark card restyle** — `bz-card` → `rounded-2xl bg-[#0A0A0A] text-white p-5 sm:p-6 shadow-[...]`. Eyebrow `color="#C6F24E"`. AI badge: `border-[#C6F24E]/30 bg-[#C6F24E]/10`. Synthesis paragraf: `border-white/10 bg-white/[0.04]`. Theme list item'ları aynı dark overlay. İçerik kontratı değişmedi (themes/synthesis/source).

**Yapma**:

- 14-haftalık puan & hacim trendi — backend weekly aggregate (`Feedback.groupBy({ by: ['week', 'rating'] })`) ve hedef line ile büyük chart yeniden inşa gerek. Mevcut `interactionData` daily; weekly bucket'lama + restoran target rating ek veri tabanı alanı.
- Heatmap (Gün × Saat) — `Feedback.createdAt` zaten timestamp, ama 7×24 = 168 cell'lik 2D matrix + custom SVG render veya recharts heatmap; mevcut bar chart yeterli sinyal verir. Audit "drift küçük" notuyla uyumlu.
- Topics sentiment progress — `extractThemes` helper sadece `theme + count` döner. Sentiment yüzdesi için OpenAI prompt'a "her tema için pozitif/negatif oranı" eklenmeli + JSON response shape değişir; bu yeni helper version + cache invalidation gerekir.
- EN AKTİF KONUM kart — restoran-bazlı yorum sayısı + ortalama puan, mevcut `feedbacksWindow` ile JS-side hesaplanabilir ama kart visual treatment + click-through navigation karar gerektirir. Owner panelinde zaten "Konum performansı" var (dashboard); analytics duplicate olur.

**Yap**:

- StatCard'a yeni metric eklenirken sparkline data window-bazlı seri olduğunda otomatik wire — daily aggregate yoksa sparkline geçme (rate metric'leri bu PR'da scope'tan çıkarıldı).
- AI insights kart visual'ı dark card'dan başka bir surface'ta da kullanılırsa (örn. dashboard "BUGÜN BEKLEYEN" yanı), aynı styling kuralları reuse edilebilir; component extraction `<DarkInsightCard>` 3+ callsite olunca düşünülür (CLAUDE.md §7 disiplin).
- Backend genişleme PR'ı açıldığında (`extractThemes` sentiment field, weekly aggregate, heatmap matrix) bu §38.18 backlog tablosunu güncelle, yeni §38.X log ekle.

**Test + verification**:
- Yeni unit test gerekmedi — sparkline pure presentational, primitive. Hem mevcut StatCard 50+ callsite etkilenmez (opsiyonel prop, geriye dönük uyumlu).
- 97/97 test pass, 0 tsc errors, 0 lint errors.

**Sonraki backlog (Analytics + diğer)**:
- 🟡 14-haftalık trend chart (backend weekly aggregate gerek)
- 🟡 Heatmap Gün × Saat (backend 2D matrix gerek)
- 🟡 Topics sentiment progress (extractThemes sentiment field extend) — PR #428 açık
- 🟢 Admin `/customers` segment kolonu (Phase 8c helper reuse) — PR #427 açık
- ~~Weekly digest mail segment context~~ ✅ **Tamamlandı** §38.21

### 38.21 2026-05-04 — Weekly digest mail segment context

§38.16 backlog'unun son LOW öncelikli kalemi bu PR'da kapatıldı. Pazartesi 09:00 UTC haftalık digest mail'ine "Bu hafta kim yorum bıraktı?" segment dağılım kartı eklendi: VIP / Düzenli / Yeni / Risk segment chip'leri + counts. Owner mail açtığında "ne kadar yorum geldi" ek olarak "kim yorum bıraktı" segment context'ini de görür.

**Backend** (`weekly-digest-runner.ts`):
- Per-restaurant Promise.all 6→7 query (yeni `segmentRows` raw aggregate).
- `prisma.$queryRaw` contact_key bazlı aggregate (visits + avgRating + lastAt) — KVKK consent + non-anonim filter (owner /api/customers paterni).
- `LIMIT 500` cap (haftalık hacim için fazlasıyla yeterli).
- JS-side `deriveCustomerFields` ile her contact_key'in segment'i derive edilir → `segmentCounts` aggregate.
- `sendWeeklyDigest` params'a yeni alan pipe-through.

**Mail template** (`src/lib/email/templates/weekly-report.ts`):
- `WeeklyReportParams.segmentCounts?` opsiyonel — undefined veya tüm değerler 0 ise template section gizler (anonim feedback haftası / ilk hafta).
- Yeni `segmentBlock` 4-cell stack (CLAUDE.md §21.2 mail mobile-first paterni — table-based + `class="stack-row"` mobil dikey stack).
- Segment chip color treatment: VIP graphite + Düzenli `PULSE.limeSoft` + Yeni `#DBEAFE` + Risk `#FEE2E2` (admin/owner UI ile aynı renk eşlemesi — drift sıfır).
- Inline default'a 7 yeni copy alanı (segmentEyebrow + segmentTitle + segmentVip/Loyal/New/Risk + segmentHint) — TR + EN parite.

**Sender** (`src/lib/email.ts`):
- `WeeklyDigestParams.segmentCounts?` field eklendi → `renderWeeklyReport` pipe-through.

**Mail copy DB seed** (`scripts/seed-mail-templates.ts`):
- `WEEKLY_REPORT_TR` + `WEEKLY_REPORT_EN` 7 yeni copy alanı eklendi.
- Operator seed çalıştırırsa yeni field'lar DB'ye yazılır; admin override etmediği sürece inline default'tan zaten okunur (loadMailCopy shallow merge).
- 32 row aynı (16 template × 2 locale), shape'i değişmedi.

**Mail editor field listesi** (CLAUDE.md §21.26 paterni):
- Bu PR'da `MailTemplateEditor.tsx FIELDS_BY_TEMPLATE` haritası **dokunulmadı** — scope creep önleme. Admin override ihtiyacı çıkarsa ayrı PR.
- Güvenli: inline default fallback gereği yeni mail'lerde segment kartı doğru render edilir.

**Yapma**:
- `LIMIT 500` cap'ı kaldırma — haftalık per-restaurant feedback hacmi nadiren 100'ü geçer; cap bu durumda silent slice anlamına gelir, segment dağılımı yine doğru oranlı.
- Segment kartı mail body'de KVKK contact bilgisi göstermez (sadece counts) — anonim feedback'leri zaten contact_key filter'ı dışlıyor.
- `MailTemplateEditor` field listesini bu PR'da güncellemek scope creep.
- AI maliyet ile karıştırma — segment hesaplaması saf SQL + JS, OpenAI çağrısı yok.

**Yap**:
- Yeni mail template'i hazırlanırken segment context'i taşıması gerekirse aynı pattern reuse.
- Mail editor admin override için yeni alanları görmek isterse `FIELDS_BY_TEMPLATE.weekly-report` array'ine 7 yeni FieldDef ekle.
- Segment renk eşlemesi 5 callsite'a ulaştı (admin + drawer + dashboard + owner + mail) — `SEGMENT_COLOR_MAP` const extraction backlog.

**Test + verification**:
- Yeni unit test gerekmedi — helper Phase 8c'de 28 test'le coverage'da.
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.

**Backlog güncel**:
- 🔴 14-haftalık trend chart (backend weekly aggregate)
- 🔴 Heatmap Gün × Saat (backend 2D matrix)
- ~~SentimentBadge extraction~~ ✅ **Tamamlandı** §38.22
- ~~Mail editor weekly-report yeni alan field listesi~~ ✅ **Tamamlandı** §38.22
- ~~SEGMENT_COLOR_MAP const extraction~~ ✅ **Tamamlandı** §38.22

### 38.22 2026-05-04 — Customer drift cleanup (SentimentBadge + COLOR_MAP + mail editor)

§38.21'de açılan 3 cosmetic drift backlog kalemini tek consolidated PR'da kapattık. Hepsi LOW risk + LOW scope, birbirleriyle ilişkili (customer segment + sentiment refactor + mail editor extension).

**Değişiklik 1: `SEGMENT_COLOR_MAP` + `SENTIMENT_COLOR_MAP` const extraction** (`src/lib/customers.ts`):
- 5 callsite (admin + drawer + dashboard + owner + mail) için tek source-of-truth.
- `SEGMENT_COLOR_MAP[segment] = { bg, fg, iconName }` — JSX render component-local; lib JSX import etmez (saf module).
- `SENTIMENT_COLOR_MAP[sentiment] = string` — sade dot color, pos/neu/neg → green/gray/red hex.
- `iconName` literal union (`'crown' | 'check' | 'sparkles' | 'alert'`) — caller component lucide ikonu kendi mapping ile çözer.

**Değişiklik 2: `SegmentChip.tsx` refactor** (`src/components/customers/SegmentChip.tsx`):
- Inline `SEGMENT_MAP` (label+color+icon) silindi → 3 ayrı sub-map'e bölündü:
  - `SEGMENT_COLOR_MAP` (lib'a taşındı)
  - `SEGMENT_LABELS` (component-local — TR/EN dil eşlemesi)
  - `ICON_BY_NAME` (component-local — lucide React component'ları)
- Bu split sayesinde `lib/customers.ts` JSX dependency'si almaz; mail template (HTML) ve UI (JSX) aynı color map'ten okuyabilir.

**Değişiklik 3: `SentimentBadge.tsx` yeni primitive** (`src/components/customers/SentimentBadge.tsx`):
- 3 callsite (admin/customers + drawer + owner customers) için tek source-of-truth.
- `variant: 'cell' | 'badge'` prop:
  - `cell` (default): inline dot + label, bg yok → table cell + mobile card için
  - `badge`: rounded-full + bg-[#FAFAFA] + border + dot + label → drawer header için
- `lib/customers.ts:SENTIMENT_COLOR_MAP` + component-local `SENTIMENT_LABELS` (TR/EN).

**Migration**:
- Drawer (`CustomerDetailDrawer.tsx`): inline `SentimentBadge` (22 satır) silindi → import + `<SentimentBadge variant="badge">`. Inline `CustomerSentiment` import'u korundu (interface tip için).
- Owner customers (`/dashboard/customers/page.tsx`): inline `SentimentCell` (28 satır) silindi → import + `<SentimentBadge>` (variant default `cell`). 2 callsite (table + mobile card) tek import.

**Admin /customers migrate ERTELENDİ**:
- PR #427 (admin segment kolonu) main'e merge edilmediği için admin/customers'ta `SENTIMENT_PRESENTATION` inline map main'de henüz yok. Bu PR fresh main'den açıldı, admin/customers main hâlinde.
- PR #427 merge edildikten sonra ayrı follow-up PR'da migrate edilir (CLAUDE.md §38.22 backlog notu).

**Değişiklik 4: Mail editor `FIELDS_BY_TEMPLATE.weekly-report` 7 yeni FieldDef** (`src/components/admin/MailTemplateEditor.tsx`):
- §38.21'de inline default'a eklenen 7 segment alanı admin override için görünür hale geldi:
  - `segmentEyebrow` + `segmentTitle` (kart başlık)
  - `segmentVip` + `segmentLoyal` + `segmentNew` + `segmentRisk` (chip etiketleri)
  - `segmentHint` (kart altı açıklama, multiline)
- Hint'lerde "lokalizasyon: Düzenli yerine Sadık tercih edilebilir" gibi kullanım ipuçları.
- CLAUDE.md §21.26 paterni — backend `segmentCounts` undefined ise card otomatik gizlenir, admin override sadece görünürlüğü değil rendering'i etkiler.

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/lib/customers.ts` | `SEGMENT_COLOR_MAP` + `SENTIMENT_COLOR_MAP` const'ları |
| `src/components/customers/SegmentChip.tsx` | Inline color map → lib import + `ICON_BY_NAME` + `SEGMENT_LABELS` ayrı |
| `src/components/customers/SentimentBadge.tsx` | YENİ primitive (variant cell/badge + lib color map import) |
| `src/app/[locale]/dashboard/customers/_components/CustomerDetailDrawer.tsx` | inline `SentimentBadge` sil + import + `variant="badge"` |
| `src/app/[locale]/dashboard/customers/page.tsx` | inline `SentimentCell` sil + import (2 callsite — table + mobile card) |
| `src/components/admin/MailTemplateEditor.tsx` | `weekly-report` field listesine 7 yeni FieldDef |
| `CLAUDE.md` | §38.22 yeni log + 3 backlog ✅ |

**Yapma**:
- Admin /customers migrate'i bu PR'da yapma — main'de PR #427 değişiklikleri yok, çakışma riski. PR #427 merge sonrası ayrı PR.
- Mail template'inde `iconName` JSX render etme — mail HTML, lucide-react import'u email'de yok (string-based render). Sadece UI component'leri `ICON_BY_NAME` mapping kullanır.
- `SentimentBadge variant` enum'unu genişletme (örn. `dark`) — şu an 2 yer için 2 variant yeter; 3. variant ihtiyacı çıkarsa eklenir.
- Color map'lere yeni segment/sentiment ekleme — `CustomerSegment` / `CustomerSentiment` literal union genişlemesi tüm callsite'larda exhaustive check'i kırar (compiler yardımcısı). Yeni segment ekleme = thresholds + UI + mail toplu refactor.

**Yap**:
- Yeni segment görsel callsite eklerken `SegmentChip` import + `<SegmentChip segment={s} locale={l} size="sm|md">`.
- Yeni sentiment görsel callsite eklerken `SentimentBadge` + `variant="cell|badge"` seç.
- Mail editor'a yeni override alan eklerken aynı `FIELDS_BY_TEMPLATE` paterni — hint + multiline + placeholders flag'leri konfigüre.
- Admin /customers PR #427 merge sonrası: aynı pattern ile inline `SENTIMENT_PRESENTATION` sil → `<SentimentBadge>` import (3. callsite — drift sıfırlanır).

**Test + verification**:
- Yeni unit test gerekmedi — primitive pure presentational + helper Phase 8c'de 28 test'le coverage'da.
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors (1 pre-existing baseline warning, refactor scope dışı).

**Backlog güncel** (Cosmetic temizliği bitti, kalan büyük kalemler):
- 🔴 14-haftalık trend chart (backend weekly aggregate)
- 🔴 Heatmap Gün × Saat (backend 2D matrix)
- 🟡 Admin /customers SentimentBadge migrate (PR #427 merge sonrası ayrı PR)
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)

### 38.23 2026-05-04 — Consolidated PR: Admin /customers + Topics sentiment + Admin SentimentBadge migrate

**Bağlam**: PR #427 (admin /customers segment) ve PR #428 (topics sentiment progress) main'de conflict'li olduğu için merge edilemedi. Bu consolidated PR'da iki PR'ın değişiklikleri **cherry-pick** edildi + main'in son hâliyle (PR #430 SentimentBadge primitive dahil) reconcile edildi + admin /customers SentimentBadge migrate'i §38.22 backlog notuyla aynı PR'da tamamlandı. Tek seferde merge edilebilir, conflict yok.

**İçerik**:

| Kapsam | Kaynak |
|---|---|
| Admin /customers segment + LTV + sentiment + days enrichment | PR #427 cherry-pick |
| Admin filter pills + tablo 9-kolon + mobile card | PR #427 cherry-pick |
| Admin CSV export 5 yeni sütun | PR #427 cherry-pick |
| Admin /customers SentimentBadge migrate (inline → primitive) | YENİ — §38.22 paterni reuse |
| Analytics topics sentiment progress (extractThemes JSON) | PR #428 cherry-pick |
| Cache key version `v2:` (auto-invalidate) | PR #428 cherry-pick |
| Analytics page sentiment progress bar render | PR #428 cherry-pick |

**Conflict resolution**:
- CLAUDE.md çakışmaları: HEAD (main son hâli) tutuldu. §38.19 ve §38.20 alt-section'ları yeniden eklenmedi — §38.23 onları topluca özetler. Tarihsel commit log (cherry-pick) zaten ayrı PR commit'lerini taşır.
- Kod dosyaları: temiz cherry-pick (admin/customers + analytics-themes + analytics page farklı dosyalar, kod çakışması yok).

**Admin /customers SentimentBadge migrate** (yeni — §38.22 backlog kapatma):
- `SENTIMENT_PRESENTATION` inline map silindi (~4 satır + yorum).
- `import { SentimentBadge } from '@/components/customers/SentimentBadge'`.
- 2 callsite (table cell + mobile card row) `<SentimentBadge sentiment={r.sentiment} locale="tr" />` (default `variant="cell"`).
- `CustomerSentiment` import'u tip için korundu (`CustomerRow.sentiment` interface).
- 3 yer (admin + drawer + owner) artık tek primitive'den okuyor — drift sıfır.

**Yapma**:
- PR #427 + PR #428'i ayrıca merge etmeye çalışma — content bu consolidated PR ile aynı. Bu PR merge edildikten sonra GitHub'da manuel close.
- §38.19 / §38.20 alt-section'larını CLAUDE.md'ye ayrı ekleme — §38.23 toplu özet.

**Yap**:
- PR #427 + #428'i merge sonrası manuel close (auto-close yapamaz, farklı branch).

**Test + verification**:
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors (sadece 2 pre-existing baseline warning).
- Cherry-pick + admin migrate kombinasyonu lokalde doğrulandı.

**Dosyalar (toplam)**:

| Dosya | Kaynak |
|---|---|
| `src/app/api/admin/customers/route.ts` | PR #427 |
| `src/app/api/admin/customers/export/route.ts` | PR #427 |
| `src/app/admin/customers/page.tsx` | PR #427 + admin migrate yeni |
| `src/lib/analytics-themes.ts` | PR #428 |
| `src/app/[locale]/dashboard/analytics/page.tsx` | PR #428 |
| `CLAUDE.md` | §38.23 yeni log |

**Backlog güncel** (Bu PR sonrası):
- 🔴 14-haftalık trend chart (backend weekly aggregate)
- 🔴 Heatmap Gün × Saat (backend 2D matrix)
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)

### 38.24 2026-05-04 — Analytics Heatmap Gün × Saat (yorum yoğunluk haritası)

§38.18 backlog'unun 2D yoğunluk haritası kalemini bu PR'da kapattık. `.design-owner-2026/page-analytics.jsx` YORUM YOĞUNLUĞU paterni — 7×24 (Gün × Saat) heatmap analytics page'inde mevcut "Günlük Dağılım" + "Saat Bazlı Dağılım" 2 ayrı bar chart'ın altına yeni section olarak eklendi.

**Mimari karar (audit önerisi)**:
- **Schema değişikliği YOK** — mevcut `Feedback.createdAt` timestamp'inden 7×24 matrix JS-side aggregate. `feedbacksWindow` query zaten select'liyor (multi-purpose query, CLAUDE.md §7 paterni — replication önleme).
- **recharts dependency artırma YOK** — custom inline SVG (480×180 viewBox + cell render). Bundle artışı ~1 KB.
- **Mevcut 2 bar chart KEEP** ("Günlük Dağılım" + "Saat Bazlı Dağılım") — heatmap onların yerine değil yanına; owner familiar pattern korunur, 2D + 1D iki signal seçeneği sunar.

**Component** (`src/components/dashboard/analytics/HeatmapDayHour.tsx`):
- Pure presentational, `'use client'` yok (server component'ten import edilebilir).
- Props: `cells: Array<{ day, hour, count }>` + `isTr?: boolean`.
- Cell color: `rgba(168, 214, 46, ${0.15 + ratio * 0.85})` lime opacity (max'a göre normalize). Boş cell `#F2F2F2`.
- Peak hücre algoritması: tek pass, "Pik · Cuma 20:00 · 14 yorum/saat" hint footer'da.
- A11y: `role="img"` + `aria-label="Gün × saat heatmap'i, pik {gün} {saat}:00 · {N} yorum/saat"`. Her cell'de native `<title>` tooltip.

**Mobile responsive**:
- Parent overflow-x-auto SVG'ye `min-width: 480` veriyor — mobile (375px) altında horizontal scroll. Cell layout korunur, label'lar okunabilir kalır.
- Legend (az/çok lime swatches) `hidden sm:flex` — mobile'da gizli (peak hint footer ile bilgi yeter).

**Backend aggregate** (`/[locale]/dashboard/analytics/page.tsx`):
- `feedbacksWindow.forEach` ile 7×24 matrix (`day = jsDay === 0 ? 6 : jsDay - 1` → ISO Pzt-Paz).
- 168 cell (eksik kombinasyonlar 0 default — heatmap'e flat array gönderilir).
- Query `select` zaten `createdAt` taşır; ek SQL yok.

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/components/dashboard/analytics/HeatmapDayHour.tsx` | YENİ — custom SVG component (~150 satır) |
| `src/app/[locale]/dashboard/analytics/page.tsx` | `heatmapCells` aggregate + `<HeatmapDayHour>` import + section render |
| `CLAUDE.md` | §38.18 backlog ✅ + §38.24 yeni log |

**Yapma**:
- recharts heatmap eklentisi ekleme — bundle 30+ KB, 7×24 grid için custom SVG yeterli.
- Mevcut "Günlük Dağılım" + "Saat Bazlı Dağılım" bar chart'larını silme — owner familiar pattern, 1D özet çoğu zaman daha hızlı tarayabiliyor.
- Cell aspect ratio'yu zorla square — 18×20 px tasarım kaynağı paterni; mobile'da scroll fallback aspect korur.
- Color scale'i absolute (örn. 0-100) yapma — restoran hacmi farklı, max'a göre normalize her restoran için anlamlı.

**Yap**:
- Yeni 2D analytics surface eklerken aynı paterni reuse: JS-side aggregate (varsa mevcut query) + custom SVG.
- A11y `role="img"` + `aria-label` peak hint'i taşımalı (screen reader için 2D matrix yorumlaması zor).

**Test + verification**:
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.
- Yeni unit test gerekmedi — pure presentational primitive, matrix aggregate mevcut createdAt logic'iyle aynı.

**Backlog güncel** (Bu PR sonrası):
- 🔴 14-haftalık trend chart (backend weekly aggregate — schema field gerek)
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)

### 38.25 2026-05-04 — Analytics 14-haftalık trend chart (puan & hacim)

§38.18 backlog'unun son büyük kalemini bu PR'da kapattık. `.design-owner-2026/page-analytics.jsx` PUAN & HACİM TRENDİ paterni — 14-haftalık trend chart analytics page'inde KPI strip altına büyük overview section olarak eklendi.

**Mimari karar (sade tutmak için)**:
- **Schema değişikliği YOK bu PR'da** — `Restaurant.targetRating` field'ı eklenmedi. Hardcoded `4.0` industry default kullanılır.
- **Owner ayar UI sonraki backlog kalemi** — kullanıcının hedef puanını özelleştirmesi gerektiğinde `Restaurant.targetRating Int?` (veya `Float?`) field eklenir + Settings UI'a input + WeeklyTrendChart prop'u DB'den okunur.
- **recharts dependency artırma YOK** — custom inline SVG (800×240 viewBox).
- **Mevcut "ETKİLEŞİM" window-day trendi KEEP** — farklı amaç: günlük trend (range-bound) vs haftalık özet (sabit 14-hafta).

**Component** (`src/components/dashboard/analytics/WeeklyTrendChart.tsx`):
- Pure presentational, `'use client'` yok.
- Props: `weeks: WeeklyTrendPoint[]` (14 hafta seri) + `targetRating?: number` (default 4.0) + `isTr?: boolean`.
- Auto Y-axis range: data + target ± 0.2 buffer (sıkışmaz).
- Volume bars (gri `#EDEDED`) background → trend line (graphite stroke 2.5) → lime gradient area → hedef line dashed → son point lime tooltip + delta to target.
- Volume 0 olan haftalar line atlama (gap), volume 0 bar render skip.
- `<2 weeks with data` empty state ("Trend için yeterli haftalık veri yok").
- A11y: `role="img"` + `aria-label="14 haftalık trend, son hafta avg X.XX"`. Cell `<title>` tooltip her bar + nokta.

**Mobile responsive**:
- Parent `<section>` `overflow-x-auto` SVG'ye `min-width: 600` veriyor — mobile (375px) altında horizontal scroll. Volume bar + line + label readability korunur.
- Header legend (Hacim/Puan swatches) `hidden sm:flex` — mobile'da gizli (header subtitle delta hint yeterli).

**Backend aggregate** (`/[locale]/dashboard/analytics/page.tsx`):
- `feedbacks98d` yeni transaction query — 98 gün (~14 hafta) sabit pencere, range filter'dan bağımsız.
- ISO Pazartesi başlangıçlı haftalık bucket (jsDay 0=Sun → 6, 1=Mon → 0).
- Volume = count, rating = `ratingSum / volume` (volume 0 ise 0 → line gap).
- `weeklyTrend.label = "H1"…"H14"` (en eski → en yeni).
- Mevcut `feedbacksWindow` query'i (range-bound) etkilenmez; bu ek query 14-hafta için ayrı.

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/components/dashboard/analytics/WeeklyTrendChart.tsx` | YENİ — custom SVG component (~250 satır) |
| `src/app/[locale]/dashboard/analytics/page.tsx` | `feedbacks98d` query + 14-week bucket aggregate + import + section render (KPI altı, etkileşim üstü) |
| `CLAUDE.md` | §38.18 backlog ✅ + §38.25 yeni log |

**Yapma**:
- `Restaurant.targetRating` schema field'ı bu PR'da ekleme — sade scope, hardcoded 4.0 yeter. Owner ayar gelecek scope.
- recharts heatmap/line eklentisi ekleme — bundle 30+ KB, custom SVG yeterli.
- "Etkileşim trendi" (window-day) section'ını silme — farklı amaç (günlük interaction vs haftalık rating overview); owner her ikisinden yararlanır.
- Y axis range hardcode (4.0–5.0) — restoran kohortları farklı; auto-range data + target ± 0.2 buffer ile sıkışma yok.
- "Puan / Hacim / Sentiment" toggle button'ları (tasarım kaynağında var) bu PR'da ekleme — single-mode (puan + hacim birlikte) yeterli; toggle UI scope creep.

**Yap**:
- Owner Settings'e `targetRating` ayarı eklenirse `WeeklyTrendChart` prop'u dinamik DB'den oku + bu §38.25 backlog notunu güncelle.
- Yeni 14-hafta benzeri weekly aggregate ihtiyacı çıkarsa aynı paterni reuse (98-gün query + ISO Pazartesi bucket + JS-side aggregate).
- Volume bar'ların max scale'i `Math.max(...weeks.map((w) => w.volume), 1)` — 0 fallback ile NaN/Infinity guard.

**Test + verification**:
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.
- Yeni unit test gerekmedi — pure presentational primitive, weekly bucket aggregate `Date.getTime()` arithmetic'i deterministik.
- Manual: `/tr/dashboard/analytics` 14-week trend görünür, son point lime tooltip "X.XX", hedef line 4.0'da dashed, delta hint header'da.

**Backlog güncel** (Bu PR sonrası — analytics drift'i tamamen kapatıldı):
- ✅ 14-haftalık trend chart (§38.25)
- ✅ Heatmap Gün × Saat (§38.24)
- ✅ Topics sentiment progress (§38.20)
- ✅ KPI sparkline + AI dark card (§38.18)
- 🟡 `Restaurant.targetRating` schema field + Settings UI (yeni backlog)
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)

### 38.26 2026-05-04 — Restaurant.targetRating schema + Owner Settings UI

§38.25'te WeeklyTrendChart'ta hardcoded `4.0` industry default kullanılıyordu. Bu PR owner'a hedef puanını özelleştirme yolu açar — yeni nullable schema field + Settings UI + API validation + chart dinamik DB read.

**Schema** (`prisma/schema.prisma` Restaurant):
- Yeni alan: `targetRating Float? @map("target_rating")`
- Nullable — owner ayarlamamışsa chart 4.0 fallback gösterir.
- Float (Int değil) çünkü 4.5 gibi yarım-puan hedefler tipik (fine dining 4.7).
- Migration: `20260504160000_add_restaurant_target_rating/migration.sql` — `ADD COLUMN "target_rating" DOUBLE PRECISION;` (NOT NULL constraint yok — eski satırlar null kalır, breaking change yok).

**API** (`/api/restaurants/[id]` PUT):
- Body `targetRating` accept; defansif validation (mass assignment guard):
  - `null` accept (unset)
  - `number` + `Number.isFinite` + `[1, 5]` arası
  - Aksi halde `400 INVALID_TARGET_RATING`
- Update payload spread'ine eklendi (`...(targetRating !== undefined && { targetRating: ... })`)
- GET endpoint `include` kullandığı için tüm Restaurant alanları otomatik döner — explicit select genişlemesi gerekmedi.

**Settings UI** (`BusinessGeneralSettings.tsx`):
- Yeni "Performans hedefi" SettingsCard (Pin icon) — "Durum" cardından önce.
- `<Field label="Hedef ortalama puan" hint="1.0 – 5.0 arası (örn. 4.5). Boş bırakırsan 4.0 fallback.">` + `<input inputMode="decimal">`.
- Client-side validation: `Number.isFinite + [1, 5]` range. Comma → dot accept (`replace(',', '.')`) TR locale rahat.
- Form state `targetRating: string` (boş = "henüz ayarlanmadı"), payload'a parse'li number veya null.
- `RestaurantData` interface + `toForm` helper'ında `targetRating: number | null` + `string` mapping.

**Analytics page dinamik read** (`/dashboard/analytics/page.tsx`):
- `user.restaurants` select'ine `targetRating: true` eklendi.
- Yeni `resolvedTargetRating` resolver:
  - Single restaurant filter aktif + restoran'ın targetRating'i set'liyse → o değer.
  - Çoklu restaurant'ta hedef set olanların ortalaması (1 ondalık yuvarlanmış).
  - Hiçbiri set etmemiş veya filter all → 4.0 fallback.
- `<WeeklyTrendChart targetRating={resolvedTargetRating}>` prop'u dinamik.

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `prisma/schema.prisma` | `Restaurant.targetRating Float?` |
| `prisma/migrations/20260504160000_add_restaurant_target_rating/migration.sql` | YENİ — `ADD COLUMN "target_rating" DOUBLE PRECISION;` |
| `src/app/api/restaurants/[id]/route.ts` | Body destructure + range validation + update payload spread |
| `src/components/dashboard/settings/sections/BusinessGeneralSettings.tsx` | RestaurantData + FormState + toForm + validate + payload + UI input (Performans hedefi card) |
| `src/app/[locale]/dashboard/restaurants/[id]/settings/page.tsx` | RestaurantPayload interface + initial load |
| `src/app/[locale]/dashboard/analytics/page.tsx` | user.restaurants select genişlet + resolvedTargetRating helper + chart prop dinamik |
| `CLAUDE.md` | §38.25 backlog notu kapatıldı + §38.26 yeni log |

**Yapma**:
- Migration'da `DEFAULT 4.0` ekleme — eski owner'lar arasında "ben 4.0 hedefliyorum" varsayımı yanlış olur; null + UI fallback (4.0) açıkça "henüz ayarlanmadı" semantiği taşır.
- `targetRating: Int` yapma — yarım-puan hedef (4.5, 4.7) imkansız olur. Float zorunlu.
- Validation'da sadece client-side bırakma — mass assignment riski (admin tarafı atlatabilir). Server-side defansif `[1, 5]` range guard zorunlu.
- Çoklu restaurant'ta her birinin target'ını ayrı chart göster — owner panelinde 1 chart yeterli, ortalama veya per-filter.

**Yap**:
- Yeni weekly/monthly aggregate chart eklenirse (örn. monthly trend) `resolvedTargetRating` resolver'ı reuse.
- Schema'ya yeni nullable field eklerken aynı paterni: `Float? @map(...)` + migration ADD COLUMN nullable + GET include intact + PUT body destructure + range validation + UI input.

**Test + verification**:
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.
- Migration `prisma migrate deploy` Vercel build script'inde otomatik çalışır (CLAUDE.md §14.1 paterni). Production migration güvenli (nullable, default null).
- Manual test: Settings page Performans hedefi inputta 4.5 gir → kaydet → analytics page'de hedef line 4.5'e taşınmış olmalı.

**Backlog güncel** (Bu PR sonrası):
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)
- 🛡️ Security follow-ups (CLAUDE.md §38.2 — operatör tetiği bekliyor)

### 38.27 2026-05-04 — Dashboard 1:1 tasarım parity (greeting + AI banner + KPI 4 + peak hint + stacked sentiment)

Kullanıcı raporu: anasayfa `dashboard` tasarımla "1:1 değil, %100 uyumlu istiyorum". Audit (Explore agent) %85 hizalı buldu, 4 kritik gap kapatıldı:

1. **Page header rewrite** — saat-aware greeting + actionable hook + subtitle + 3 action.
2. **AI İçgörü banner** — graphite + lime, haftalık dismiss.
3. **KPI 4-card 1:1** — Genel puan / Toplam yorum / Yanıt oranı / Yeni müşteri.
4. **NABIZ peak hint** — chart altında "Pik · 4 Mayıs · 9 yorum".
5. **SIK BAHSEDİLEN stacked bar** — `sentimentPositivePct` (Phase 8c+ §38.20) ile 3-segment.

**PageHeader primitive genişletme** (`src/components/ui/PageHeader.tsx`):
- Yeni opsiyonel `subtitle?: ReactNode` (kompakt meta, mono font 12px)
- Yeni opsiyonel `eyebrowPulse?: boolean` (eyebrow yanında lime `bz-pulse-dot`)
- Geriye dönük uyumlu — tüm mevcut callsite'lar etkilenmez.

**AIInsightBanner.tsx yeni component** (`src/components/dashboard/AIInsightBanner.tsx`):
- Graphite `#0A0A0A` bg + lime `#C6F24E` accent
- `localStorage[storageKey]` haftalık dismiss (ISO week comparison)
- "İncele →" lime CTA + dismiss X buton
- `role="status"` + `aria-label`
- SSR-safe: hidden default + useEffect mount kontrolü
- Backend kaynak: `extractThemes` `themes.synthesis` field'ı (1-2 cümle AI çıkarımı)

**Dashboard page rewrite** (`src/app/[locale]/dashboard/page.tsx`):

Header:
- Saat-aware greeting (TR: Günaydın 5-12 / İyi öğleden sonralar 12-18 / İyi akşamlar 18+; EN parite)
- `userFirstName = user.name?.split(' ')[0] ?? 'Hoş geldin'` fallback
- `pendingHook` — `pendingTasks.length > 0 ? "Bugün N yorum yanıt bekliyor." : "Bugün yanıtsız yorum yok 🎉"`
- Subtitle: `restoran adı · {weekday, day, month, year}`
- 3 action: Rapor indir (ghost) / Yorum İste (primary)
- "Bu hafta" dropdown çıkarıldı (RangeDropdown component'i scope dışı; gelecek backlog)

KPI rewrite (Genel puan / Toplam yorum / Yanıt oranı / Yeni müşteri):
- **Genel puan**: `avgRating.toFixed(1)` + lime accent + delta (mevcut last7 vs prev7).
- **Toplam yorum**: KEEP last7 + delta.
- **Yanıt oranı**: 30 günlük rating ≤3 + replies some — `replied/total × 100`. Empty case "—" + "düşük puan yorum yok" hint.
- **Yeni müşteri**: 30 günlük tekil contact_key (KVKK consent + non-anonim). `restIds.length === 0` SQL guard `WHERE FALSE`.
- QR taranma + Platform yönlendirme metrikleri **kaldırıldı** (`/dashboard/analytics`'te §34.7-10 ile zaten zengin; ana dashboard owner action-odaklı 4-card sade).

NABIZ peak hint:
- 7-gün trend buckets üzerinden tek pass peak compute (peakIdx, peakCount, peakDateMs).
- Locale'a göre tarih format: `4 Mayıs` (TR `day: 'numeric', month: 'long'`).
- Footer: `bz-mono mt-2 text-[11px] text-[#737373]` ile inline render.

SIK BAHSEDİLEN stacked sentiment bar:
- `hasSentiment = typeof t.sentimentPositivePct === 'number'` branching:
  - Has: 3-segment stacked bar (lime `#16A34A` pozitif + kırmızı `#DC2626` negatif), alt satırda `+pos%` + `-neg%` counter.
  - Has not: eski tek-renk graphite progress bar fallback (graceful — eski cache + model uymadığında).
- `role="img"` + `aria-label="N% pozitif, M% negatif"` (CLAUDE.md §37 yasaklı ARIA disiplini — explicit role + span/aria-label valid).
- Inner synthesis card kaldırıldı — `AIInsightBanner` üstte aynı synthesis taşıyor (duplicate UX önlemi).

Backend ek queries (3 yeni transaction satırı):
- `lowRated30dCount` — `prisma.feedback.count({ rating ≤3, createdAt last 30d })`
- `lowRated30dRepliedCount` — yukarıya `replies: { some: {} }` ek filter
- `newCustomers30dRows` — `prisma.$queryRaw` distinct contact_key 30 günlük, `restIds.length === 0` durumda `WHERE FALSE` guard
- Connection_limit=1 disiplini korunur — tek transaction (CLAUDE.md §14.1).

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/components/ui/PageHeader.tsx` | `subtitle` + `eyebrowPulse` props |
| `src/components/dashboard/AIInsightBanner.tsx` | YENİ — graphite + lime banner, haftalık dismiss |
| `src/app/[locale]/dashboard/page.tsx` | greeting + actionable + subtitle + 3 actions + AIInsightBanner mount + KPI 4-card 1:1 + 3 yeni transaction query + peak hint + stacked sentiment + inner synthesis cleanup |
| `CLAUDE.md` | §38.27 yeni log |

**Yapma**:
- "Bu hafta" dropdown tarih filter'ı bu PR'a sıkıştırma — RangeDropdown client component + 3 ayrı dataset gerekir, ayrı backlog.
- "Son güncelleme 2 dk önce" subtitle'a koyma — server render anı 0 sn anlamsız, lastSync gerçek-zamanlı yok.
- `pendingHook` için `pendingTasks.length === 0 && totalReviews === 0` durumunu özel handle et — emoji 🎉 generic positive yeterli.
- Inner synthesis card'ı geri ekleme — duplicate UX (AIInsightBanner üstte).
- KPI cards'da QR/Redirect metrikleri geri getirme — analytics page zaten zengin, dashboard sade.
- Yanıt oranı için division-by-zero — `lowRated30dCount > 0` guard zorunlu, "—" + hint fallback.

**Yap**:
- Yeni dashboard widget'ı eklerken aynı saat-aware greeting paterni reuse: helper `getGreeting(hour, locale)` 3+ callsite olduğunda lib'e taşınır.
- AI banner için custom insight (extractThemes dışı) eklenirse `<AIInsightBanner insight={...} />` yeniden mount.
- Yeni KPI eklenirse 5-card grid yerine 4-card sadık kal (mobile 2x2 + lg 4-col), aksi halde mobile 2x3 visual taşma.
- Stacked sentiment bar pattern'i analytics topics section ile birebir aynı (CLAUDE.md §38.20) — tutarlılık.

**Test + verification**:
- 97/97 mevcut test pass, 0 tsc errors, 0 lint errors.
- 4 yeni baseline warning (transaction'da kullanılmayan `_redirectCountAllTime`, `prev7Redirected`, `last7Scans`, `prev7Scans` — KPI semantik değişimi sonrası). CLAUDE.md §21.25 paterni: refactor scope dışı tolere edilir.
- Manuel: `/tr/dashboard` farklı saatlerde — greeting değişir; KPI 4-card görünür; AI banner dismiss → ertesi hafta tekrar; peak hint footer + stacked sentiment.

**Backlog güncel** (Bu PR sonrası — analytics + dashboard drift'i tamamen kapatıldı):
- 🟡 "Bu hafta" RangeDropdown dashboard header'da (NABIZ chart 30/90/YTD toggle ile bağlı)
- 🟡 HIGH 4 Platforms 12-card grid (product decision pending)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)

### 38.28 2026-05-04 — Dashboard mobil 1:1 parity (hero card + KANAL horizontal scroll)

§38.27 desktop parity sonrası kullanıcı talebi: "telefon görünümü ve jsx kodları var onları da inceleyip mobil kısmı da tamamladığından emin ol". Mobil tasarım kaynakları cross-check edildi (`page-mobile-v2.jsx` `MobileDashboard` line 106-260 + `page-mobile.jsx` + `components/mobile.jsx`); 2 görünür drift kapatıldı.

**A · Mobile-only hero card** (`sm:hidden`, `src/app/[locale]/dashboard/page.tsx`):

Mobil owner anasayfa açtığında "günün özeti" tek-bakış card. Desktop'ta `KPI 4-card` zaten "Genel puan" gösteriyor → `sm:hidden` ile sadece <640px viewport'ta render.

- Graphite `#0A0A0A` bg + lime `#C6F24E` accent (44px Space Grotesk rating)
- 5 yıldız satırı (lime fill, rounded avgRating'e göre)
- Delta arrow (`↑/↓ X%`) + "Y yorum bu ay" mono altındaki line
- 7-gün `<Sparkline>` (lime gradient area + stroke), `trendsChartData.count` series reuse
- `avgRating > 0` + `trendsChartData.length >= 2` guard'lı conditional render
- `aria-label` locale-aware ("Bugünün özeti" / "Today's summary")

Tasarım kaynağı: `page-mobile-v2.jsx` line 130-157 (Hero card) — birebir hizalı (graphite bg, lime 44px rating, 5 yıldız, mono delta, sparkline path).

**B · KANAL DAĞILIMI horizontal scroll** (mobile-only):

Mobil dar ekranda 4 platform card 2x2 grid'de görsel olarak sıkışıyordu; `page-mobile-v2.jsx` line 218-247 paterni ile edge-to-edge horizontal scroll'a geçirildi.

```tsx
{/* Eski */}
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

{/* Yeni */}
<div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible">
```

Card width: `shrink-0 w-[150px]` mobile, `sm:w-auto sm:shrink` desktop. Edge-to-edge: `-mx-4 px-4` mobile (ana wrapper padding'ini negatif margin ile yala), desktop full container.

Tasarımdaki `minWidth: 130, flexShrink: 0` ile birebir hizalı.

**Verification**:
- `npx tsc --noEmit` 0 errors, `npm test` 97/97 pass, `npx eslint` 0 errors (4 baseline warning §38.27'den, mobile diff'inde değil)
- Manuel 375px viewport: hero card görünür + KANAL DAĞILIMI horizontal scroll çalışıyor
- 640px+ (sm:): hero card gizli + KANAL DAĞILIMI 4-col grid (mevcut davranış korundu)
- `avgRating === 0` (yeni hesap): hero card gizli

**Yapma**:
- Hero card'ı desktop'ta (sm+) göstermek — KPI "Genel puan" zaten orada, redundant UI
- Sparkline'ı `trendsChartData.length < 2` durumda render etmek — tek nokta line oluşur, çirkin
- KANAL DAĞILIMI'na yatay scroll snap CSS (`scroll-snap-x mandatory`) eklemek — nice-to-have, gerekmiyor
- Mobile card width `< 130px` küçültmek — owner readability bozulur (44px rating + delta + sparkline yan yana sıkışır)
- KPI 4-card mobile grid'i `grid-cols-1` (tek sütun) yapmak — mevcut `grid-cols-2` zaten mobil tasarım ile 1:1, dikey overflow

**Yap**:
- Yeni mobile-specific section eklerken `sm:hidden` + design kaynağı `page-mobile-v2.jsx` cross-check (drift önleme)
- Horizontal scroll pattern reuse: `flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:grid sm:grid-cols-N sm:gap-3 sm:overflow-visible` ve card `shrink-0 w-[Npx] sm:w-auto sm:shrink`
- 3+ yerden tekrar olunca `<HorizontalScrollRow>` primitive (CLAUDE.md §7) — şu an 1 yerde, abstraction premature

**Dosyalar**:

| Dosya | Değişim |
|---|---|
| `src/app/[locale]/dashboard/page.tsx` | Mobile hero card section (`sm:hidden`, ~+70 satır) + KANAL DAĞILIMI flex/grid responsive |
| `CLAUDE.md` | §38.28 yeni log |

**Sonraki AI session disiplini**: Yeni mobile-specific UI eklerken `.design-owner-2026/project/page-mobile-v2.jsx` cross-check zorunlu. Mobile + desktop tasarımı birbirinden bağımsız bölümler — desktop layout sm: breakpoint ile mobile'a "doğal" düşmüyorsa explicit `sm:hidden` + mobile-only section eklenmeli.

### 38.29 2026-05-04 — Sentry React Suspense reveal collision filter + §38.27/§38.28 audit

**Sentry production issue** (sentry-apricot-blanket, 2026-05-04 16:35 UTC, ID `111c5df8dd8749dd84adbd5b0c657274`):

```
TypeError: Cannot read properties of null (reading 'parentNode')
  at $RS (app:///tr/dashboard:1:203498)
  at None (app:///tr/dashboard:1:207852)
```

**Root cause analysis:**

`$RS` minified frame React DOM'un **streaming Suspense reveal** fonksiyonudur (`revealStyleOrUnknown` veya benzeri). Next.js 15 App Router server component → client component geçişinde implicit Suspense boundary'ler oluşur; SSR bu boundary'lerin placeholder'larını HTML'de işaretler, client mount'unda React reveal eder.

DOM mutator browser extensions (Google Translate, Grammarly, LastPass, iOS Reader Mode, ad blockers) Suspense placeholder node'larını SSR ile client reveal arasında kaldırır → React anchor'ını kaybeder → `parentNode` null → TypeError.

**Bu bizim kod bug'ımız değil**: Buaze codebase'inde tek `parentNode` reference Yandex Metrica analytics injection (`app/layout.tsx:164`, standard 3rd party tracker). Recent §38.27/§38.28 değişikliklerinde DOM manipulation yok.

**Kullanıcı etkisi**: Sayfa render'ı kısmen kaybolur, reload ile düzelir. Çoğu kullanıcıda hiç tetiklenmez (sadece DOM-mutator extension'ı olanlarda). Recharts ResizeObserver veya Recharts'sız custom SVG'lerimiz yan etkili değil.

**Fix** (`instrumentation-client.ts` `beforeSend`):

Mevcut MetaMask + chrome/moz-extension filter'lerine yeni dar-scope filter eklendi:

```ts
const isReactRevealCollision =
  /Cannot read propert(?:y|ies) of null \(reading 'parentNode'\)/.test(originalMessage) &&
  /\$RS\b/.test(exceptionText);
if (isReactRevealCollision) return null;
```

İki koşul AND: hata mesajı **VE** stack `$RS` içermeli. Gerçek Buaze parentNode bug'ları stack'te component adıyla farklı frame taşır (örn. `Component@app:///src/components/...`) → filter atlatmaz, Sentry'e ulaşır.

**Recent work audit (§38.27 + §38.28 PR #435):**

Paralel Explore agent ile 8 kategori tarandı:

| Kategori | Sonuç |
|---|---|
| A. SQL injection | ✅ Temiz — `Prisma.join(restIds)` + `new Date()` parametrik, raw input concat yok |
| B. IDOR | ✅ Temiz — `restIds` user.restaurants include scope'unda, tüm queries `{ restaurantId: { in: restIds } }` |
| C. KVKK / PII | ✅ Temiz — `has_kvkk_consent = TRUE` filter zorunlu, AIInsightBanner localStorage sadece ISO week (PII yok) |
| D. XSS | ✅ Temiz — `extractThemes` synthesis `String().trim().slice(0, 320)` capped, greeting `userFirstName` `split()[0]` no HTML |
| E. SSR / hydration | ✅ Mitigated — AIInsightBanner `useState(true)` SSR-safe (her iki yanda null), `force-dynamic` page server-time deterministik |
| F. Performance / N+1 | ✅ Temiz — tek `prisma.$transaction([...])` (CLAUDE.md §14.1), `[restaurantId, createdAt]` index sufficient |
| G. Edge cases | ✅ Temiz — `avgRating > 0` + `trendsChartData.length >= 2` + `peakCount > 0` + `ratingDelta.value !== '0%'` guard'ları yerinde |
| H. CLAUDE.md disiplin | ✅ Temiz — `force-dynamic`, defensive `select`, transaction batching, abstraction kaçınma korunmuş |

**0 kritik bug, 0 güvenlik açığı.** Helper fonksiyonlar (`pctDelta`, greeting hour logic) unit test için minor aday — CLAUDE.md §32 opportunistic, blocking değil.

**Yapma:**
- `parentNode` filter'ını genişletme — sadece `$RS` ile AND. Daha geniş regex (`/parentNode/.test(...)`) gerçek Buaze bug'larını sessizce yutar.
- Sentry filter'a "sayfa hata vermesin diye" tüm browser-extension exception'larını silme — gerçek extension uyumsuzluğu (örn. signin flow break) Sentry'e gitmeli, fix edilmeli.
- "Bu bizim hatamız değil, görmezden gel" yaklaşımı — filter sadece kanıtlanmış noise pattern'ler için; yeni unknown pattern Sentry'e gitsin, soruşturulsun.

**Yap:**
- Yeni Sentry production issue gelirse §38.29 paterni izle: (a) issue ID + minified stack analiz, (b) Buaze codebase'de gerçek root cause arama (grep), (c) yoksa noise filter (dar AND koşulu), (d) CLAUDE.md log + issue ID dokümante.
- Sentry org doğru kontrol et: `buaze-ev/sentry-apricot-blanket` (CLAUDE.md §38.13) — eski `buaze/javascript-nextjs` boş.
- Server-side captures Sentry'e ulaşmıyor (CLAUDE.md §38.13 A kararı) — bu issue **client-side** olduğu için DSN üzerinden ulaştı.

**Verification:**
- `npx tsc --noEmit` 0 errors, `npm test` 97/97 pass, `npx eslint instrumentation-client.ts` 0 errors
- Manuel: production'da `Cannot read properties of null (reading 'parentNode')` + `$RS` event'i tekrar gelirse Sentry dashboard'da görünmemeli
- Real parentNode bug regression: Buaze code'da component'te explicit `node.parentNode` çağrı eklenirse + crash → Sentry'e gitmeli (filter atlatmaz, çünkü stack `$RS` taşımaz)

### 38.30 2026-05-04 — Dashboard NABIZ chart 30G/90G/YTD chip toggle + "Bu hafta" header link

§38.27 backlog (`🟡 "Bu hafta" RangeDropdown dashboard header'da (NABIZ chart 30/90/YTD toggle)`) bu PR'da kapatıldı. Tasarım kaynağı: `.design-owner-2026/project/page-dashboard.jsx` line 174-176 (header Bu hafta ghost btn) + line 230-247 (NABIZ chip toggle + legend dot + peak hint).

**A · NABIZ chart 30G/90G/YTD chip toggle**:

Yeni client component `src/components/dashboard/PulseRangeToggle.tsx` (~110 satır):
- Props: `ranges: { '30g' | '90g' | 'ytd': { data, peak } }` + `defaultRange='30g'` + `isTr`
- 3 chip (30G/90G/YTD) tasarımdaki `bz-chip active` paterniyle (lime selection: graphite bg + white text), inactive: white + n200 border
- `role="tablist"` + `aria-selected` semantik
- TrendsChart `dynamic({ ssr: false })` import (CLAUDE.md §27 paterni)
- Peak hint footer (`Pik · 4 Mayıs · 9 yorum` paterni) active range'a göre
- `role="tab"` + `aria-selected` + `focus-visible:ring-[#C6F24E]`

Backend (`src/app/[locale]/dashboard/page.tsx`):
- Yeni transaction query: `trendFeedbacksRange` — en geriye uzanan window (YTD veya 90G, hangisi daha eski). YTD Mayıs 4'te 124 gün, 90G default. CLAUDE.md §14.1 connection_limit=1 disiplini korunur — tek transaction.
- 3 yeni helper: `bucketDaily(rows, days)` → 30/90 daily buckets, `bucketWeekly(rows, fromDate)` → YTD weekly buckets (~18 hafta max), `findPeak(buckets) → { dateText, count } | null`.
- 3 dataset compute: `trend30`, `trend90`, `trendYtd` (label: "4 May" / "11 May" gibi locale-aware kısa).
- 3 peak compute: `peak30`, `peak90`, `peakYtd`.

Dashboard NABIZ section rewrite:
- Eyebrow: `TREND VE ETKİLEŞİM` → `NABIZ · SON 30 GÜN` (tasarım line 223 paterni).
- Header altında büyük rating display: `avgRating.toFixed(2)` (24px Space Grotesk weight 500, letter-spacing -0.02em) + delta arrow (`↑/↓` lime/red) + `vs. önceki 30 gün` mute text. Tasarım line 224-228.
- Eski 7-gün footer 3-stat (toplam/ort puan/yönlendirme) **kaldırıldı** — tasarım line 237-247'de yok. Yerine legend dots (Ortalama puan graphite line + Günlük yorum hacmi gri swatch) + peak hint sağa-aligned.

Dead code temizliği: `peakIdx`, `peakCount`, `peakDateText`, `peakDateMs` outer-scope değişkenleri silindi (artık `findPeak` helper içinde scope'lanıyor). `last7RedirectPct` orphan olduğu için yorum-only bırakıldı (transaction destructure leftovers gibi §38.27 paterni).

**B · "Bu hafta" header ghost button (görsel parity)**:

Tasarımdaki dropdown affordance (`<button bz-btn-ghost>Bu hafta <chevronDown/></button>`) sade implementasyon: `<Link>` to `/analytics?range=7d` shortcut. Owner click ettiğinde gerçek range/platform/branch URL filter hub'ına (CLAUDE.md §34.7-10) yönlendirilir.

**Yapma:**
- "Bu hafta" header'a tam dropdown menu yapma — page-level KPI scope filter'ı (Genel puan, Yanıt oranı, Yeni müşteri 7d/30d/90d/YTD) eklemek delta semantic'i değiştirir + iki ayrı range control (header + chip) confuses owner. Analytics page hub'ı.
- NABIZ section'a "Son 7 gün" / "Son 90 gün" gibi dinamik subtitle ekleme — tasarım `SON 30 GÜN` static eyebrow, default 30G chip aktif. Chip click'te subtitle changes complexity yaratır.
- TrendsChart'a `interval` prop'u ekleme — Recharts dense data'da otomatik tick interval handle ediyor. CLAUDE.md §13.8 `interval={trend.length <= 7 ? 0 : 5}` analytics-page paterni dashboard'a aktarılmadı (§7 abstraction kaçınma; chart auto-handle yetiyor).
- YTD weekly bucket sayısını sınırlama — Mayıs 4'te 18 hafta, sınır gerekmiyor. Yıl sonunda max 53 hafta yine recharts uyumlu.
- Mobile hero card'daki 7-gün sparkline'ı 30G data'sına bağlama — mobile hero "günün özeti" semantic, 7 gün anlamlı; 30G çok geniş, sparkline detayı kaybolur.

**Yap:**
- Yeni range eklenirse (örn. "Son 24 saat" / "12 ay") `RangeKey` literal + `LABELS` map + `ORDER` array + bucketing helper genişlet. PulseRangeToggle generic değil ama 3+ range ihtiyacı çıkarsa generic'e refactor düşünülür (CLAUDE.md §7).
- "Bu hafta" header link'i ileride client-side dropdown'a evrilirse (örn. range param'lı analytics deeplink), `<Link>` → `<button onClick>` + popover state. URL filter analytics tarafındaki pattern reuse.
- NABIZ section default chip'i değişirse (örn. owner ayarı), `defaultRange` prop'u localStorage veya server preference'tan oku.

**Verification**:
- `npx tsc --noEmit` 0 errors, `npm test` 97/97 pass, `npx eslint` 0 errors (5 baseline warning §38.27 KPI semantik değişiminden, mobile diff'inde değil)
- Manuel: `/tr/dashboard` 30G chip default aktif → 30 daily buckets, peak hint "Pik · 4 May · N yorum"; 90G chip → 90 daily; YTD → ~18 weekly buckets
- Manuel: header "Bu hafta" ghost btn → click → `/tr/dashboard/analytics?range=7d` redirect

**Backlog güncel** (Bu PR sonrası):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER — tasarımdaki 12 platform'dan 4'ü backend gap'i: Slack §34.6'da silindi, Yelp + Foursquare PROVIDER_DOMAINS taxonomy'de yok, Webhook health AutomationRule UI'sı yok. 1:1 implementation product decision gerekiyor: silinmiş feature geri ekleme + 3 yeni provider + activity log endpoint.)
- 🛡️ Security follow-ups (CLAUDE.md §38.2 — operatör tetiği bekliyor)

### 38.31 2026-05-04 — Dashboard 1:1 final parity (KANAL impact + CANLI AKIŞ + ScopeDropdown dynamic)

§38.27/§38.28/§38.30 sonrası kullanıcı raporu: anasayfa hâlâ tasarımla 1:1 değil. 4 yeni gap kapatıldı; tasarım kaynağı `.design-owner-2026/project/page-dashboard.jsx` (yeni bundle Tund0CaNMoOr35lZHC-lVg ile birebir). PR §38.27/§38.30 backlog item'ları (`🟡 Bu hafta dropdown dynamic` + `🟡 KANAL DAĞILIMI Google impact`) kapatıldı.

**A · KANAL DAĞILIMI 4-card + Google impact strip**:
- Yeni component `src/components/dashboard/ChannelDistribution.tsx` (~150 satır, server-friendly)
- 4 platform card (Google + top 3) — brand chip + name + delta + 22px rating + 5 yıldız + count
- Google card'da ek "impact strip" — `initialGoogleRating → currentGoogleRating · +Δ` (CLAUDE.md §37.3 hazır schema field'ları)
- Mobile horizontal scroll + sm+ 4-col grid (CLAUDE.md §38.28 paterni reuse)
- Backend genişleme: yeni transaction query `prevPlatformGroups` (önceki scope window groupBy by platform) — delta hesabı için
- `impactStats` (mevcut hesaplama) artık Google card'da gösterilir; "Konum performansı" section'ında tutuluyor (duplicate değil, farklı UX — Konum performansı per-restoran, Google card platform-level)

**B · CANLI AKIŞ 5-row timeline**:
- Yeni saf helper `src/lib/activity-feed.ts` — `buildActivityFeed({ feedbacks, replies, aiDrafts, systemEvents, limit })` — 4 source union + sort (timestamp desc) + slice + sentiment derive
- Yeni component `src/components/dashboard/ActivityFeed.tsx` — server component, sentiment dot + actor + action + target + relative timestamp; null target durumu (sistem event'i) gizlenir
- Backend: 3 yeni transaction query (`recentReplies` + `recentAiDrafts` + `recentSystemEvents`) — tek transaction, connection_limit=1 disiplini korunur (CLAUDE.md §14.1)
- Source mix:
  - Feedback → "Ayşe D. yorum bıraktı — ★★★★★ Google" (sentiment: rating ≥4 pos, ≤2 neg, =3 neu)
  - FeedbackReply (`source='manual'`) → "Mehmet K. yanıt verdi — ..."
  - FeedbackReply (`source='ai_copilot'`) → "AI Asistan AI yanıtı gönderdi — ..."
  - FeedbackAiDraft → "AI Asistan yanıt önerisi hazırladı — Mehmet T."
  - LifecycleEmailLog → "Sistem QR hatırlatma gönderildi" (8 type → readable label, CLAUDE.md §21.34)
- 11 unit test (`tests/activity-feed.test.ts`) — saf fonksiyon coverage (sort/limit/sentiment/KVKK fallback/locale)
- Mevcut "Son yorumlar" section'ı KORUNUR — owner alışkanlığı, ActivityFeed kompakt timeline (5-row), Son yorumlar geniş kart (rating + comment preview); ikisi farklı UX

**C · NABIZ chart visual** — § 38.30'da implement edildi, ek değişiklik yok (visual parity ~%90 kabul, CLAUDE.md §7 abstraction kaçınma).

**D · ScopeDropdown dynamic** (§38.30 backlog kapatıldı):
- Yeni client component `src/components/dashboard/ScopeDropdown.tsx` (Radix DropdownMenu)
- 4 option: Bu hafta (7d) / Bu ay (30d) / Son 90 gün (90d) / Bu yıl (YTD)
- URL searchParam `?scope=` → `useRouter().replace()` ile push (default '7d' clean URL)
- `useTransition` ile pending state — chevron pulse + opacity-70 disabled görsel
- Server component `searchParams` prop reads scope → KPI window'ları parametrik:
  - `scopeStart` (scope days ago veya YTD start)
  - `prevScopeStart` (2× scope days ago veya prev_year YTD start)
  - `prevScopeEnd` (scopeStart veya `now - 365d` YTD durumda)
- 7 transaction query window'ı scope-aware: `last7Avg`, `last7Redirected` (placeholder), `prev7Count`, `prev7Avg`, `prev7Redirected` (placeholder), `last7Scans` (placeholder), `prev7Scans` (placeholder), `lowRated30dCount` → `lowRatedScopeCount` (yanıt oranı KPI), `lowRated30dRepliedCount`, `newCustomers30dRows` → scope window
- KPI value değişimi: scope='30d' iken "30 gün" yorum sayısı + delta vs prev 30 gün
- AI Insight banner ve extractThemes (themesFeedbacks) **scope-aware DEĞİL** (sabit 30d) — AI cache + product decision (sık değişmez)

**Schema bulguları** (yeni migration **YOK**):
- `Restaurant.initialGoogleRating` + `currentGoogleRating` zaten var (CLAUDE.md §37.3, line 132-133)
- `Feedback`, `FeedbackReply`, `FeedbackAiDraft`, `LifecycleEmailLog` — tüm 4 union source schema'da mevcut

**Performance** (CLAUDE.md §14.1):
- Transaction artık 23 query (önce 19) — ~30-50ms ek latency (sequential connection_limit=1)
- Dropdown click → server component force-dynamic full reload — ~150ms wall time tolere edilebilir
- Edge cache yok (`force-dynamic` page, owner-scoped IDOR)

**Yapma**:
- `Restaurant.googleReviewCount` field'ı eklemek — KANAL DAĞILIMI count zaten platformGroups'tan geliyor. Yeni schema gerek yok.
- ActivityFeed'i client component'e çevirmek — server-side render daha hızlı, real-time gerekmiyor (sayfa reload yeterli)
- Sistem event tipini ActivityFeed'e generic `Event` table ile ekleme — mevcut union sufficient
- ScopeDropdown'u client state'le tutup URL routing'i atlatmak — deeplink + browser back desteği kaybolur
- AIInsightBanner'ı scope-aware yapma — AI cache + theme extraction sabit 30d daha verimli (gpt-4o-mini cost kontrol)
- "Son yorumlar" section'ı kaldırıp ActivityFeed'i tek bırakma — owner alışkanlığı, tasarımda da iki ayrı UX
- prevScopeStart YTD durumda `null` veya `new Date(0)` gibi sentinel kullanma — `prev_year YTD start` (Jan 1 last year) anlamlı yıllık karşılaştırma verir
- KPI 4-card eyebrow'a "son N gün" subtitle eklemek (mevcut layout) — hint metni KPI altında zaten var, çift duplicate olur

**Yap**:
- Yeni source ActivityFeed'e eklerken: `ActivityType` literal genişlet + `buildActivityFeed` input array + helper içinde push branch + (gerekirse) yeni `system event type → label` map (`systemActionLabel` switch case)
- Yeni scope value ekleneceğinde (örn. '24h' last day): `DASHBOARD_SCOPE_VALUES` array + `LABELS` map + dashboard page `scope` switch + `scopeDays` switch
- ChannelDistribution yeni platform eklenirse `PLATFORM_META` map (color + short initial) genişletilir; component-local data, taxonomy ile drift sıfır (mevcut PLATFORMS config sadece label için reuse edilir)
- ScopeDropdown latency hissedilirse `loading.tsx` segment-bazlı eklenir (Next.js 15 paterni); şu an `useTransition` `pending` state yeterli görsel feedback
- Yeni dashboard widget'ı scope'a bağlanırsa same pattern: `searchParams` prop oku → scope literal → window date compute → conditional query

**Verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (5 baseline warning §38.27 KPI semantik değişiminden, scope refactor öncesi)
- `npm test` 108/108 pass (97 mevcut + 11 yeni `activity-feed.test.ts`)
- Manuel: `/tr/dashboard` 4 KANAL card görünür, Google impact strip "Önce 4.5 → Şimdi 4.8 · +0.3" (impactStats null değilse)
- Manuel: CANLI AKIŞ 5-6 row timeline (yorum/reply/AI draft/sistem mix)
- Manuel: "Bu hafta" dropdown click → menu açılır, "Bu ay" select → URL `?scope=30d`, KPI value 30 gün toplamına döner
- Manuel: scope=ytd seçimi → KPI YTD count, delta prev_year YTD karşılaştırması (yıllık bazda anlamlı)
- Manuel: scope=ytd 1. yıl owner için (1 yıldan az veri) → prev pencere boş, delta `+%X` ya da `-%Y` aşırı değer; UI tolerate eder

**Backlog güncel** (Bu PR sonrası — dashboard 1:1 parity tam kapatıldı):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER — § 38.30 paterni, backend gap)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 ActivityFeed real-time (websocket/SSE) — şu an sayfa reload yeterli, gelecek scope

### 38.32 2026-05-04 — Dashboard self-audit follow-up (BUGÜN BEKLEYEN 3-task + duplikasyon temizliği + minor fixes)

§38.31 sonrası kullanıcı self-audit raporu istedi: "birebir çektim mi?". Audit raporu (Explore agent + screenshot vs current cross-check) ~%80 parity buldu. Kullanıcı kararıyla 4 grup fix bu PR'da uygulandı.

**A · BUGÜN BEKLEYEN 3-task tipi** (önceki §38.31 "Out of scope" backlog kapandı):

Tasarım `.design-owner-2026/page-dashboard.jsx:250-280` 4 farklı task tipi gösteriyordu (`reply`, `platform`, `campaign`, `reminder`). Kullanıcı kararı: campaign **silindi** (schema'da Campaign tablosu yok, scope creep). Yemeksepeti/Getir/Trendyol public API'si yok → sadece Google için sync check anlamlı.

Yeni saf helper `src/lib/dashboard-tasks.ts` — `buildPendingTasks({ unrepliedFeedbacks, googlePlatformCheck, churnedCustomers, limit })`:
- 3 task tipi: `reply` (Acil) / `platform` Google sync (Orta) / `reminder` churn (Düşük)
- Severity ranking sort (high → medium → low), stable insertion order
- Saf fonksiyon, 9 unit test (`tests/dashboard-tasks.test.ts`)

Yeni component `src/components/dashboard/PendingTasks.tsx`:
- Severity badge (Acil red / Orta amber / Düşük slate)
- Task icon (MessageSquareText / RefreshCw / Users)
- Empty state "Bekleyen iş yok" (yeni hesap)
- Tıklanabilir Link → ilgili page (feedbacks?filter=unreplied / google-reviews / customers?segment=loyal)

Backend genişletme (`src/app/[locale]/dashboard/page.tsx`):
- Eski `pendingTasks` (4-feedback findMany) → `unrepliedAggregate` (count + min createdAt) — UI duplikasyon temizliği için detail render kaldırıldı
- Yeni `googleSyncCheck` query: `PlatformLinkCheck.findFirst({ provider: 'google', ok: false, checkedAt: gte 24h })` (CLAUDE.md §19.4)
- Yeni `churnedCustomerRows` raw SQL: 30+ gündür dönüş yapmamış ≥2 visit'li tekil müşteri sayısı (KVKK consent + non-anonim + GROUP BY contact_key + HAVING)

**B · Duplikasyon temizliği** (kullanıcı talebi: "anasayfada 2 defa tekrarlayan bilgiler"):

| Eski section | Neden duplicate | Karar |
|---|---|---|
| BUGÜN BEKLEYEN 4-feedback inline list (§38.17 segment crossover) | Yeni `<PendingTasks>` 3-task summary'ye dönüştürüldü | KALDIRILDI — pendingCustomerAggregates + segment crossover blok da silindi (Customer page/drawer'da segment chip hâlâ aktif) |
| "Son yorumlar" detail card section | CANLI AKIŞ timeline'ı aynı feedback verisini kompakt gösteriyor | KALDIRILDI — owner detail için /feedbacks page'e tıklar |
| Konum performansı "BUAZE ETKİSİ" Google impact card | KANAL DAĞILIMI Google card'ında impact strip ("Önce 4.5 → Şimdi 4.8 · +0.3") | KALDIRILDI — tek source-of-truth KANAL |

Sonuç: 3 ayrı section silindi. Konum performansı + QR performansı 2-col grid yerine tek-sütun layout (UI sadeleşti).

**C · Minor fixes** (audit'in HIGH/MEDIUM bulguları):

1. **YTD leap year fix**: `prevScopeEnd = now - 365d` → `nowDate.setFullYear(year - 1)` (calendar day, leap year edge case'inde 1 gün drift kapalı). YTD prev pencere artık "geçen yılın bugünü" anlamlı yıllık karşılaştırma.
2. **`pendingCount` rename**: `pendingTasks.length` → `unrepliedAggregate._count._all` (tek source); duplicate const tanımı silindi.
3. **ActivityFeed KVKK consent**: `FeedbackInput.hasKvkkConsent?: boolean | null` field eklendi. Helper `consentGiven = hasKvkkConsent !== false && !== null` → false ise actor "Müşteri" fallback (anonim). undefined → legacy davranış (eski feedback'ler shortName).
4. **LifecycleEmailLog priority ranking**: `take:5 → take:10` (caller daha geniş örneklem getirir), helper `SYSTEM_TYPE_PRIORITY` map ile (`weekly_report`=1, `trial_ending`=2, `upgrade_suggestion`=3, vb.) priority asc + sentAt desc tiebreaker → top 3 system event seçilir, final timestamp desc sort'la global event order'a girer.

**D · `last7Total` rename DEFER**: Variable name §38.27'de comment ile dokümante edildi (scope='30d' iken "last30" semantik). 5 baseline warning sustains; rename geniş refactor (delta hesaplarında 4 callsite + comment), CLAUDE.md §7 abstraction kaçınma — bu PR'a sıkıştırılmadı.

**Yeni dosyalar**:
- `src/lib/dashboard-tasks.ts` (~165 satır, saf helper)
- `src/components/dashboard/PendingTasks.tsx` (~115 satır, server component)
- `tests/dashboard-tasks.test.ts` (9 unit test)

**Genişletilen**:
- `src/lib/activity-feed.ts` — KVKK consent field + system priority ranking
- `src/app/[locale]/dashboard/page.tsx` — backend +2 query, frontend duplikasyon temizliği, minor fix'ler
- `tests/activity-feed.test.ts` — 4 yeni test (KVKK true/false/undefined + system ranking)

**Yapma**:
- BUGÜN BEKLEYEN'e Yemeksepeti/Getir/Trendyol sync error eklemek — public API yok, anlamlı sync check imkansız (CLAUDE.md §19.4 PlatformLinkCheck sadece HEAD/GET reachability test eder, gerçek API integration yok)
- Campaign task tipi ekleme — schema'da Campaign tablosu yok, kullanıcı kararı silinmiş (scope dışı)
- Pending task'larda detail render geri ekleme — duplikasyon (CANLI AKIŞ + Son yorumlar referansı zaten /feedbacks page'de)
- ActivityFeed `hasKvkkConsent: undefined` durumda "Müşteri" fallback — legacy feedback'ler için davranış bozulur (eski rows hep undefined)
- LifecycleEmailLog priority list'e yeni type eklerken `100` default dışında bırakma — explicit priority verilmeli (yoksa 3-event slice'ında atlanır, görünmez kalır)

**Yap**:
- Yeni task tipi eklenirse: `TaskType` literal genişlet + `COPY` map TR/EN + `SEVERITY_BADGE` opsiyonel + `TASK_ICON` map + `buildPendingTasks` push branch + unit test
- Yeni LifecycleEmailLog type: `SYSTEM_TYPE_PRIORITY` map + (gerekirse) `systemActionLabel` switch case + locale strings
- Dashboard'a yeni section eklerken duplikasyon kontrolü: aynı veri başka section'da var mı? Tek source-of-truth disiplini

**Verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (5 baseline warning §38.27 KPI semantik değişiminden — `last7Total` rename DEFER)
- `npm test` 121/121 pass (108 mevcut + 9 dashboard-tasks + 4 activity-feed KVKK/ranking)
- Manuel: `/tr/dashboard` BUGÜN BEKLEYEN'de 3 task tipi (reply/platform/reminder) + severity badges
- Manuel: `Restaurant.initialGoogleRating + currentGoogleRating + diff > 0` olan owner için Google card'da impact strip; "BUAZE ETKİSİ" section yok (silindi)
- Manuel: "Son yorumlar" section yok; CANLI AKIŞ feedback'leri kompakt timeline'da
- Manuel: Anonim feedback (KVKK consent false) → "Müşteri yorum bıraktı"; consent true → "Ayşe D. yorum bıraktı"

**Backlog güncel** (Bu PR sonrası — dashboard 1:1 parity ~%95 kapatıldı):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER — §38.30 paterni)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 ActivityFeed real-time (gelecek scope)
- 🟢 `last7Total` rename → `currentScopeTotal` (cosmetic, geniş refactor)
- 🟢 PageHeader "Son güncelleme N dk önce" subtitle (§38.27'de atıldı, server time anlamsız)

### 38.33 2026-05-04 — Yorumlar + Google Yorumları 1:1 parity (Timeline + Templates + WeekStats + AI Hazır mobil)

Kullanıcı raporu (4 ekran görüntüsü + design link `bbIuwvW9esfgyMH24a5ZDg`): Yorumlar (feedbacks/inbox) + Google Yorumları sayfaları tasarım ile %60-75 parity. Audit (Explore agent) 4 kritik gap + 10+ minor gap tespit etti. **Kullanıcı 4 backend kararını onayladı (hepsi Recommended)**:

| Karar | Seçim | Etki |
|---|---|---|
| ZAMAN ÇİZELGESİ | **Mevcut data'dan derive** | Feedback.createdAt + FeedbackAiDraft.generatedAt + FeedbackReply.createdAt + LifecycleEmailLog union |
| HIZLI YANIT ŞABLONLARI | **Static 4 şablon (kod-içi)** | `lib/quick-reply-templates.ts` saf helper TR/EN |
| Ort. Yanıt Süresi KPI | **On-the-fly aggregate** | Google reviews reply.updateTime - createTime farkı |
| isRead/Beklemede | **Atla — 4 tab yeter** | Tümü/Düşük/Yanıtsız/Yanıtlandı korunur |

**Schema migration YOK**. Yeni endpoint YOK. UI + 2 saf helper + 3 component + 13 unit test.

**Yeni saf helper'lar**:
- `src/lib/feedback-timeline.ts` — `buildFeedbackTimeline` 4 source union (received + ai_draft + notification + replied), kronolojik asc sort, locale-aware label, latency formatter (`1400ms → 1.4s`), `FEEDBACK_RELATED_SYSTEM_TYPES` whitelist (LifecycleEmailLog generic mail event'leri filter dışı). 7 unit test.
- `src/lib/quick-reply-templates.ts` — `QUICK_REPLY_TEMPLATES` static 4 şablon (positive_thanks/low_rating_apology/complaint_callback/birthday_thanks) × TR/EN × tone (warm/apologetic/formal). `${customerName}` + `${restaurantName}` placeholder substitute, **KVKK consent guard** (false → "Müşteri" fallback). `listQuickReplyTemplates` UI list + `getQuickReplyTemplate` body fetch. 6 unit test.

**Yeni componentler**:
- `src/components/dashboard/feedbacks/FeedbackTimeline.tsx` — server-friendly, sentiment dot (lime/lime-deep/grey/graphite per type) + title + relative time + meta. Empty fallback "Henüz aktivite yok".
- `src/components/dashboard/feedbacks/WeekStatsCard.tsx` — pure presentational, "BU HAFTA" eyebrow + 26px mono rating + 5 yıldız + delta + count. Filter rail altı.
- `src/components/dashboard/google-reviews/QuickReplyTemplates.tsx` — 4 template list, MessageSquareText icon + tone dot + chevron. Click → `onSelect(key)` callback (caller composer'a prefill veya clipboard kopyalar).

**Yorumlar sayfası genişletme** (`src/app/[locale]/dashboard/feedbacks/`):
- `page.tsx`: `weekStats` client-side aggregate (last7 vs prev7 avg + count); `counts` extension (unreplied + today + aiReady); `filteredList` 3 yeni tab semantik (unreplied/today/ai_ready); FeedbackFiltersRail'a platformFilter + weekStats props
- `_components/types.ts`: `ActiveTab` literal genişletildi (+ unreplied/today/ai_ready)
- `_components/FeedbackFiltersRail.tsx`: PLATFORM section (5 quick pill — Tüm/Google/Yemeksepeti/Getir/Trendyol) + WeekStatsCard mount
- `_components/FeedbackList.tsx`: tabs replace eski 4 (Tümü/Düşük/Yüksek/Yönlendirilen) → yeni 5 (Tümü/Düşük/Yanıtsız/Bugün/AI Hazır) tasarım uyumlu; counts type extend; **mobile sticky bottom AI banner** (`counts.aiReady > 0 && activeTab !== 'ai_ready'` — graphite + lime accent + "Aç" CTA, click → 'ai_ready' tab'a switch). bottom-[80px] z-30 mobile bottom nav üstünde.
- `_components/FeedbackDetail.tsx`: composer'dan sonra **PLATFORM/KAYNAK 2-col metadata grid** + **ZAMAN ÇİZELGESİ FeedbackTimeline mount** (received + replied event'ler — FeedbackAiDraft + LifecycleEmailLog client-side fetch'te exposed değil; `source: null` placeholder).

**Google Yorumları sayfası genişletme** (`src/app/[locale]/dashboard/google-reviews/page.tsx`):
- `reviewAnalysis` extension: **avgResponseHours** (reply.updateTime − createTime farkı, on-the-fly avg) + **newThisMonth** (createTime son 30g)
- KPI 4-card replace: eski (Google puanı / Toplam / Yanıtlanan / Yanıtsız) → yeni tasarım uyumlu (Toplam yorum / Yanıtlanan % / Ort. yanıt süresi / Bu ay yeni). "Google puanı" hero card'ında zaten görünür (duplicate); "Yanıtsız" implicit (toplam − yanıtlanan).
- Sağ rail grid `sm:grid-cols-2 lg:grid-cols-3` (3-card sığdırma): PROFİL SAĞLIĞI + SIK GEÇEN KELİMELER + **HIZLI YANIT ŞABLONLARI** (yeni). Click → `getQuickReplyTemplate` body clipboard kopyalanır (composer prefill scope dışı, future enhancement).

**Kasıtlı drift'ler** (kullanıcı kararı / pragmatic):
- Timeline'da FeedbackAiDraft + LifecycleEmailLog client-side fetch'te exposed değil → received + replied event'ler görünür, AI draft + system notification future enhancement
- Composer template prefill mevcut composer textarea'ya wire edilmedi (clipboard pattern yeterli — owner manuel paste)
- Mobile chip set (Tümü/Düşük/Yanıtsız/Bugün/AI Hazır) ↔ Desktop rail (Tümü/Düşük/Yüksek/Yönlendirilen) farklı — kullanıcı `ai_ready` mobile'da seçerse desktop rail highlight etmez (acceptable degradation)
- Yorumlar 28 vs Buaze gerçek yorum sayısı bağlamsız tasarım mock; veri gerçek
- Google Reviews "Bekliyor"/"Yanıtlandı" badge mevcut ReviewCard'ında zaten var (CLAUDE.md §38.14 referans)

**Yapma**:
- FeedbackAuditLog yeni schema açma — kullanıcı atladı, mevcut data derive yeterli (CLAUDE.md §38.33 paterni); future enhancement için ayrı talep gerekir
- `Feedback.isRead` field eklemek — kullanıcı atladı (4 tab yeter); "Okunmamış"/"Beklemede" semantic mevcut Yanıtsız ile karşılanır
- QuickReplyTemplate per-restaurant özelleştirme — static 4 şablon (kod-içi) yeterli; per-restaurant Yeni schema gerek (out of scope)
- Composer'a quick reply template prefill button ekleme (Yorumlar sayfasında) — tasarım sadece Google Yorumları sağ rail'da gösteriyor; Yorumlar AI Co-Pilot flow'u zaten mevcut (Yeniden öner + Onayla & Gönder)
- ActivityType (CANLI AKIŞ §38.31) ile FeedbackTimeline (§38.33) helper'larını birleştirme — farklı UX (Timeline = single feedback events, ActivityFeed = cross-feedback timeline). 2 helper kalır

**Yap**:
- Yeni timeline event tipi eklenirken (örn. `flagged`, `assigned`): `TimelineEventType` literal + `DOT_COLOR` map + `COPY` map + `buildFeedbackTimeline` push branch + unit test
- Yeni quick reply template eklenirken: `QuickReplyKey` literal + `TEMPLATES` map (TR + EN + tone + label) + UI mevcut (4-list iterate sırasına göre yeni şablon eklenir)
- KVKK consent: yeni quick reply caller varsa `hasKvkkConsent` field'ını geçir (CLAUDE.md §38.32 paterni reuse)
- Avg response time KPI başka surface'ta gerekirse: helper extract (örn. `lib/google-reviews-stats.ts`) — şu an 1 yer (page.tsx), abstraction premature (CLAUDE.md §7)

**Verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (2 baseline warning — pre-existing FeedbackList `_feedbacks` unused + `no-async-client-component` for export wrapper, scope dışı)
- `npm test` 134/134 pass (121 + 7 feedback-timeline + 6 quick-reply-templates)
- Manuel: `/tr/dashboard/feedbacks` 3-col split: rail (status + platform + week stats) + list + detail panel (PLATFORM/KAYNAK grid + ZAMAN ÇİZELGESİ)
- Manuel mobil (375px): 5-chip strip (Tümü/Düşük/Yanıtsız/Bugün/AI Hazır) + AI Hazır > 0 ise sticky bottom banner
- Manuel: `/tr/dashboard/google-reviews` 4 KPI (Toplam / Yanıtlanan % / Ort. yanıt süresi / Bu ay yeni) + sağ rail 3-card (PROFİL SAĞLIĞI + SIK GEÇEN KELİMELER + HIZLI YANIT ŞABLONLARI)
- Manuel: HIZLI YANIT ŞABLONLARI click → clipboard'a template body kopyalanır

**Backlog güncel** (Bu PR sonrası):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 FeedbackTimeline AI draft + system event extension (backend API genişletmesi gerekir)
- 🟡 Composer template prefill (Yorumlar AI Co-Pilot composer'a quick reply integration)
- 🟢 Mobile chip ↔ Desktop rail unified state (kullanıcı tab değiştirince cross-state inconsistency)

### 38.34 2026-05-04 — Analitik sayfası 1:1 parity (KPI hibrit + tek chart toggle + AI Insights 3-row + QR mapping)

Kullanıcı raporu (2 ekran görüntüsü desktop + mobil + design link `bbIuwvW9esfgyMH24a5ZDg`): mevcut analytics page (903 satır, §38.18-§38.26) tasarım `.design-owner-2026/page-analytics.jsx` ile ~%75 parity. Audit (Explore agent) 4 kritik gap + 3 silinmesi gereken section + 1 backend extension tespit etti. Kullanıcı 4 backend kararını onayladı (hepsi Recommended).

**4 backend kararı**:

| Karar | Seçim | Etki |
|---|---|---|
| KPI grid format | **4 top + 3 secondary alt strip** | Hibrit: tasarım 4 KPI üstte (Ortalama Puan / Bu Ay Yorum / NPS Skoru / Yanıt Oranı) + Buaze ek (Dönüşüm/Yönlendirme/AI Yanıt) altta |
| Section delete | **InteractionTrendChart + Aspect Breakdown + Yanıt Performansı SİL** | Tek-chart Puan/Hacim/Sentiment toggle ile konsolidasyon. Günlük + Saat-bazlı 1D dağılım KORUNUR (Heatmap'in farklı UX'i) |
| AI İçgörüler | **Tasarım birebir: 3-row dark card (TREND/KAZANIM/RİSK)** | `extractStructuredInsight` helper structured 3-segment output |
| QR mapping | **UI runtime computed (`platform = null` → 'buaze_qr' label fallback)** | Schema/migration YOK; KANAL DAĞILIMI render-time map |

**Schema migration YOK**.

**Yeni saf helper'lar**:
- `src/lib/analytics-nps.ts` — `calculateNPS` saf fonksiyon. NPS heuristic 1-5 → 0-10 mapping (5★ promoter / 4★ passive / 1-3★ detractor). NPS = (P% - D%) range -100..+100. 5 unit test (empty/all-promoter/all-detractor/mixed/invalid).
- `src/lib/weekly-structured-insight.ts` — `extractStructuredInsight` 3-segment AI output (TREND/KAZANIM/RİSK). Cache 1 hafta (Pazartesi yenilenir). gpt-4o-mini, fail-safe fallback. extractWeeklyInsight (§21.38) shape farklı — bu helper analytics page için özel. 4 unit test.

**6 yeni component** (`src/components/dashboard/analytics/`):
- `AnalyticsKpiGrid.tsx` — 4 top sparkline-li KPI + 3 secondary alt strip (sm:hidden mobile secondary)
- `PulseTrendChart.tsx` — tek chart Puan/Hacim/Sentiment toggle, custom inline SVG, 14-haftalık görünüm, 'use client' (mode state). WeeklyTrendChart (§38.25) replace.
- `AiInsightsCard.tsx` — 3-row dark card (TREND lime-deep / KAZANIM lime / RİSK kırmızı). Tüm 3 alan boş → kart gizli.
- `ChannelDistributionMini.tsx` — 4 platform progress bar list (analytics rail mini variant). Mevcut ChannelDistribution (§38.31, dashboard 4-card) ile farklı UX.
- `TopLocationCard.tsx` — multi-restaurant pik lokasyon (single-restaurant → null render).
- `MobileAnalyticsHero.tsx` — sm:hidden hero card (graphite + lime 56px rating + sparkline). §38.28 dashboard mobile hero paterni reuse.

**Analytics page integration** (`src/app/[locale]/dashboard/analytics/page.tsx`):
- Backend genişletme:
  - `avgRatingNow` = window feedback'lerin rating ortalaması
  - `calculateNPS(feedbacksWindow)` saf hesap (npsScore + promoters/passives/detractors + promoterPct)
  - `overallResponseRate` = repliedCount / reviewsCount × 100 (all feedback, mevcut low-rated YANIT PERFORMANSI'tan farklı)
  - `avgResponseHours` = Σ(reply.createdAt - feedback.createdAt) / replyCount (all feedback)
  - `aiReplyCount` = repliedCount × 0.6 heuristic (FeedbackReply.source select eksik; future enhancement: backend select source ekle)
  - `weeklyTrend` shape genişletildi: `+ sentimentPct` (rating ≥4 / volume × 100)
  - `structuredInsight` extractStructuredInsight çağrısı (cache 1 hafta, ratingDistribution input)
  - QR fallback `platform = null && rating >= 4` → 'buaze_qr' UI runtime (KANAL DAĞILIMI)
- KALDIRILAN section'lar (kullanıcı kararı):
  - `<InteractionTrendChart>` (window-day scans/reviews/redirects line+bar) → silindi (PulseTrendChart Hacim toggle ile aynı)
  - YANIT PERFORMANSI section (low-rated latency) → `{false && ...}` ile gizli (KPI Yanıt Oranı + avg response label özetler)
  - Aspect Breakdown (food/service/atmosphere) → aynı dead-code blok'ta gizli (KONU & DUYGU NLP topics ile semantic örtüşme)
- KORUNAN section'lar:
  - `<AnalyticsFilterBar>`, `<HeatmapDayHour>` (§38.24), KONU & DUYGU themes (§38.20), Günlük + Saat-bazlı 1D dağılım (kullanıcı silme listesine almadı)
- EKLENEN component mount sırası:
  1. `<MobileAnalyticsHero>` sm:hidden üstte
  2. `<AnalyticsKpiGrid>` (4 top + 3 secondary)
  3. `<PulseTrendChart>` (Puan/Hacim/Sentiment toggle)
  4. `<ChannelDistributionMini>` + `<TopLocationCard>` 2-col grid (showPlatformShare)
  5. Heatmap + Günlük/Saat-bazlı dağılım (mevcut)
  6. `<AiInsightsCard>` (yeni dark card 3-row)
  7. KONU & DUYGU themes (mevcut, KEEP)

**Yapma**:
- AnalyticsKpiGrid `secondaryKpis` prop'unu mobile'da göstermek — UX kalabalıklık; sm:hidden korunur
- WeeklyTrendChart (§38.25) component'i silmek — başka surface'ta gerekirse reuse, sadece analytics page'de kullanılmıyor
- InteractionTrendChart component dosyasını silmek — type import (`InteractionTrendPoint`) hâlâ kullanılıyor (interactionData KPI sparkline)
- `aiReplyCount = repliedCount × 0.6` heuristic'i kalıcı kabul — future enhancement: backend FeedbackReply.source select ekle (cost düşük, doğruluk artar)
- QR feedback için schema migration `platform = 'buaze_qr'` — UI runtime label yeterli; başka surface'lerde mevcut platformGroups (rating ≥4 + platform set) bozulmamalı
- `extractStructuredInsight` cache key restaurantIds'siz olsun — multi-restaurant filter aktifken farklı dataset, cache pollution
- Tasarım 3-row AI card'ı themes section'ıyla replace — KONU & DUYGU farklı UX (NLP topics + sentiment progress)

**Yap**:
- Yeni KPI eklenirken: `KpiSpec` shape (`label/value/delta/deltaKind/subtitle/sparkline/sparklineColor`) + `topKpis` veya `secondaryKpis` array'ine push
- Yeni AI insight türü eklenirse: `extractStructuredInsight` prompt + JSON parse field genişlet, AiInsightsCard `RowSpec` array'ine eklenir
- Sentiment trend per-week heuristic (rating ≥4 ratio) yetersiz görülürse: extractThemes per-week call (cost yüksek, defer); CLAUDE.md §38.34 backlog
- Top location'a multi-criteria sort (count + recency + avg rating) — şu an sadece count; ileride weighted

**Verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (13 baseline warning — refactor sonrası unused vars: lowRatingDelta/scansDelta/sparkScans/totalRedirects/StatCard/PlatformChip/etc. Future cleanup PR)
- `npm test` 143/143 pass (134 + 5 NPS + 4 structured insight)
- Manuel: `/tr/dashboard/analytics` 4 KPI top + 3 secondary alt + tek chart Puan/Hacim/Sentiment toggle
- Manuel: AI İçgörüler dark card 3-row TREND/KAZANIM/RİSK (synthesis dolu ise; aksi halde gizli)
- Manuel: Heatmap + KONU & DUYGU + Günlük/Saat-bazlı dağılım korunur
- Manuel mobil (375px): MobileAnalyticsHero görünür, KPI 2x2 grid (secondary gizli)
- Manuel: KANAL DAĞILIMI mini'de QR feedback'ler "Buaze QR" olarak görünür (platform null + rating ≥4)

**Yorumlar/Google Yorumları cleanup not** (kullanıcı talebi):
PR #440 sonrası audit'e göre Yorumlar + Google Yorumları sayfaları tasarım uyumlu (mevcut > design); silinecek section yok. Future enhancement (FeedbackTimeline AI draft + system event API expose) §38.33 backlog'unda kayıtlı.

**Backlog güncel** (Bu PR sonrası):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER §38.30 paterni)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 `aiReplyCount` heuristic → FeedbackReply.source select backend genişletme (gerçek sayı)
- 🟡 Sentiment trend per-week gerçek NLP (extractThemes per-week, cost concern)
- 🟢 Analytics page unused vars refactor (StatCard/PlatformChip/sparkScans/etc.)
- 🟢 InteractionTrendChart + WeeklyTrendChart component dosyaları cleanup (analytics-only, başka surface yok)

### 38.35 2026-05-04 — Yorumlar filter parity (Desktop rail status unified + Buaze QR platform pill)

Kullanıcı raporu: "Yorumlar kısmında eksik yapmışsın filtreleme vs gibi özellikler yok lütfen kontrol et ve her şeyi birebir aynı yap". Audit:

| Drift | Bulgu | Fix |
|---|---|---|
| Desktop rail status tabs | Eski 4-tab (Tümü/Düşük/Yüksek/Yönlendirilen) — mobile chip set §38.33'te değişmiş ama rail UNIFY edilmemişti | Rail status tabs replace 5-tab mobile chip set ile (Tümü/Düşük/Yanıtsız/Bugün/AI Hazır) |
| PLATFORM rail "Buaze QR" eksik | Tasarım §22-29 6 platform pill (Tüm/Google/**Buaze QR**/Yemeksepeti/Getir/Trendyol GO) | + 'Buaze QR' pill (CLAUDE.md §38.34 paterni — UI runtime label, platform=null backend filter) |

**Schema migration YOK** (CLAUDE.md §38.34 paterni reuse — runtime label).

**`FeedbackFiltersRail.tsx`** değişiklikler:
- `counts` type genişletildi: `+ unreplied, today, aiReady` (page.tsx'te zaten hesaplanıyordu §38.33)
- Status tabs replace: `[all, low, high, redirected]` → `[all, low, unreplied, today, ai_ready]` (rail + mobile chip = unified state, §38.33 backlog "Mobile chip ↔ Desktop rail unified state" kapatıldı)
- PLATFORM_PILLS: `[all, google, yemeksepeti, getir, trendyol]` → `[all, google, **buaze_qr**, yemeksepeti, getir, trendyol]` (tasarımdaki 6 pill + sıralama)

**`types.ts`** değişiklik:
- `PlatformFilter` literal genişletildi: `'all' | 'buaze_qr' | PlatformId`
- PlatformId enum **dokunulmadı** (CLAUDE.md §19.4 taxonomy disiplini — schema değişmez)

**`/api/feedback/route.ts`** backend filter:
```ts
if (platformFilter === 'buaze_qr') {
  baseWhere.platform = null;
} else {
  baseWhere.platform = platformFilter;
}
```
Backend mapping: 'buaze_qr' → `platform IS NULL`. Schema'da Buaze QR feedback'leri `platform = null` (CLAUDE.md §34.3 referans), runtime label "Buaze QR" UI'da gösterilir.

**Yapma**:
- `PlatformId` enum'una 'buaze_qr' eklemek — taxonomy disiplini bozar (CLAUDE.md §19.4 — `PROVIDER_DOMAINS` + `PROVIDER_LABELS` + `PLATFORM_DEFS` 5 nokta drift). UI runtime label yeterli.
- Rail tab set'ini mobile chip'ten farklılaştırmak — kullanıcı kararı: cross-state unified.
- "Yüksek" + "Yönlendirilen" tab'larını rail'a geri eklemek — analytics page §34.7-10 derin breakdown'da zaten mevcut, dashboard owner action-odaklı (Yanıtsız/Bugün/AI Hazır).
- Tasarımdaki "Okunmamış" + "Beklemede" tab'larını eklemek — schema'da `Feedback.isRead` field yok (CLAUDE.md §38.33 user kararı atla). Mevcut "Yanıtsız" + "Bugün" semantic karşılar.

**Yap**:
- Yeni filter pill eklenirken (örn. yeni platform): `PlatformFilter` literal + `PLATFORM_PILLS` array + API filter map (3 nokta).
- Yeni status tab eklenirken: `ActiveTab` literal (types.ts) + `tabs` array (FeedbackFiltersRail + FeedbackList ikisi de) + page.tsx counts compute + filteredList logic.

**Verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (2 baseline pre-existing)
- `npm test` 143/143 pass (test değişmedi)
- Manuel: `/tr/dashboard/feedbacks` xl: rail 5-tab + 6-platform pill (Buaze QR dahil)
- Manuel: Buaze QR pill click → API `?platform=buaze_qr` → backend `platform IS NULL` filter → QR feedback'ler listelenir
- Manuel: Mobile chip set rail ile birebir aynı (5-tab unified state)

**Backlog güncel** (Bu PR sonrası):
- 🟢 Mobile chip ↔ Desktop rail unified state ✅ KAPATILDI bu PR'da

### 38.36 2026-05-04 — Müşteriler 1:1 parity (duplicate filter card consolidate + 4-stat + sparkbar + sentiment-based avatar)

Kullanıcı raporu: "iki adet müşteriler kısmı var, en sonda attığım tasarımdaki ile birebir aynı yap, diğer duplicate kısmı sil, filtreler vs her şeyiyle tasarımdakini al (mobil dahil)". Audit (Explore agent + manuel doğrulama): mevcut `/dashboard/customers` page tasarım `.design-owner-2026/page-customers.jsx` ile ~%70 parity. **Duplicate** sayfada iki ayrı `bz-card` filter section'ı (segment pills card + filter form card) → tasarımda tek konsolide toolbar.

Kullanıcı 3 karar onayladı (AskUserQuestion):
- Duplicate scope: tek sayfada 2 section, biri silinecek (filter card consolidate)
- Tasarım kaynağı: `page-customers.jsx` (8-col + sentiment sparkbar)
- Mobil: mevcut card yapısı korunur, küçük polish

**Schema/migration YOK**, backend dokunulmadı. Mevcut SQL + helper'lar (Phase 8c §38.16 reuse).

**Phase A — Toolbar consolidate (DUPLICATE FIX)**:
- Eski 2 ayrı `bz-card` (segment pills line 424-455 + filter form line 458-516) → **tek `bz-card` toolbar** (tasarım line 70-84 birebir).
- Search input (sol Search icon, max 320px lg), divider, segment pills inline (count INLINE label), spacer, range chips, restaurant select.
- Mobile: search full-width, segment pills + range chips horizontal scroll (`no-scrollbar -mx-3 px-3` paterni CLAUDE.md §25.4).
- Tasarımdaki "Daha fazla filtre" + "Görünüm" + "Bulk action bar" buttons SKIP (CLAUDE.md §7 — backend yok, scope creep).

**Phase B — 4-stat KPI grid (3→4)**:
- Eski 3 StatCard (Müşteri / Yorum / Ort. puan) → 4 StatCard tasarım uyumlu:
  - **TOPLAM MİSAFİR**: `summaryRow.customers` count
  - **VIP**: `segmentCounts.vip` + delta `%X.X segment` (`vip / total × 100`)
  - **ORT. LTV**: `Math.round(enriched.reduce((s, r) => s + r.ltv, 0) / enriched.length)`
  - **GERİ DÖNÜŞ ORANI**: `(enriched.filter(r => feedback_count >= 2).length / enriched.length × 100)` % + delta `N tekrar gelen`
- YoY + sektör benchmark deltaları SKIP (CLAUDE.md §35.8 — verifiable olmayan claim).
- Mevcut `<StatCard>` primitive sufficient (`delta` + `deltaKind: 'neutral'`).
- Yeni icons: `Crown` (VIP) + `Wallet` (LTV) + `Repeat2` (Return rate).

**Phase C — Tablo column rewrite (7→6 col)**:
- Eski: Müşteri / İletişim / Segment / Yorum / LTV / Memnuniyet / Son ziyaret
- Yeni: Misafir / Segment / Ziyaret / LTV / Son ziyaret / Sentiment (Sparkbar)
- "İletişim" sütun **drop** — email Misafir altına `bz-mono` 11px (tasarım line 137), telefon drawer'da (Phase 8d §38.14 intact)
- Sentiment SentimentBadge (dot+label) → **`<SentimentSparkbar>`** (60px progress + 24px score 0-100, tone-based: ≥70 lime-deep / 50-69 graphite-mute / <50 danger)
- Avatar bg **sentiment-based** (tasarım line 131-134): pos `#EAF9B8` (lime-soft) / neg `#FEF2F2` (red-soft) / neu `#F5F5F5` (n100); fg neg `#991B1B`, diğer `#0A0A0A`
- Score derivation: `Math.round((avg_rating ?? 0) × 20)` clamped [0, 100]

**Phase D — Pagination polish**:
- Eski: "Sayfa N / M · X müşteri" + Prev/Next text buttons
- Yeni (tasarım line 157-174): "X–Y / total misafir" mono left + ChevronLeft + page numbers + ChevronRight icons; current page graphite primary, others ghost
- Smart ellipsis: ≤7 sayfa tüm sayılar; >7 → `1, …, current-1, current, current+1, …, totalPages` (current page guarantee)

**Phase E — Mobile polish**:
- Stats grid `grid-cols-2 lg:grid-cols-3` → **`grid-cols-2 lg:grid-cols-4`** (4-stat uyumlu)
- Toolbar mobile: search full-width → segment pills horizontal scroll → range chips horizontal scroll → restaurant select alt satır
- Card list **dokunulmadı** (kullanıcı kararı)

**Yeni dosya**:
- `src/components/customers/SentimentSparkbar.tsx` (~50 satır pure presentational, server + client'tan import edilebilir)

**Genişletilen**:
- `src/app/[locale]/dashboard/customers/page.tsx` — toolbar consolidate, 4-stat, table 6-col, pagination polish

**Yapma**:
- "Daha fazla filtre" + "Görünüm" buttons ekleme — backend yok (advanced filter modal + view density toggle), scope creep.
- "Bulk action bar (3 misafir seçildi · Kampanya/Segmentle/Arşivle)" ekleme — schema + backend yok (Phase 8c §38.16 paterni).
- "Son sipariş" kolonu — Buaze yorum-bazlı, sipariş data'sı yok.
- Checkbox row select — bulk action olmadan UI değer katmaz.
- Sektör benchmark "%48 vs %62" — gerçek sektör data'sı yok (CLAUDE.md §35.8).
- YoY delta "+12% YoY" — yıllık karşılaştırma data'sı yok.
- Mobile MobileCustomers ekranı tasarım eklenirken yeni component yapma — page-mobile-v2.jsx eksik, mevcut card list yeterli.
- SegmentChip / SentimentBadge component'lerini değiştirme — Sparkbar yeni dedicated component (CLAUDE.md §7 — 3+ callsite olunca SentimentBadge variant 'sparkbar'a evrilir).

**Yap**:
- Yeni stat card eklenirken `<StatCard delta deltaKind subtitle>` mevcut prop'ları reuse (label + value + icon + accent + sparkline opsiyonel) — primitive değiştirme gerekmez.
- Yeni 0-100 score sentiment görseli gerekirse `<SentimentSparkbar score={N}>` reuse — tone enum-bound (≥70 / 50-69 / <50).
- Pagination ellipsis logic için aynı paterni reuse: ≤7 sayfa `Array.from({length}, (_, i) => i + 1)` / >7 `[1, '…', current-1, current, current+1, '…', total]`.
- Yeni filter pill / chip eklenirken `no-scrollbar overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0 lg:flex-wrap` paterni reuse (mobile horizontal scroll, desktop wrap).

**Test + verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors (modified files specifically)
- `npm test` 143/143 pass (yeni test gerekmez — Sparkbar pure presentational primitive)
- Manuel: `/tr/dashboard/customers` TEK toolbar (search + 5 segment pills + range chips + restaurant select); 4-stat KPI grid; 6-col tablo (Misafir / Segment / Ziyaret / LTV / Son ziyaret / Sentiment Sparkbar); avatar bg sentiment-based; pagination "X–Y / total misafir" + page numbers + chevron icons
- Manuel mobile (375px): stats 2-col, toolbar stacked vertical, segment pills + range chips horizontal scroll, card list intact
- Manuel: Drawer (?detail=KEY) intact (Phase 8d §38.14)

**Backlog güncel** (Bu PR sonrası):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER §38.30 paterni)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 Mobile MobileCustomers ekranı (page-mobile-v2.jsx eksik) — kullanıcı isterse ileride
- 🟡 Bulk action bar + Kampanya/Segmentle/Arşivle (schema + backend gerek)
- 🟡 Advanced filter modal ("Daha fazla filtre" button) — multi-criteria filter (kanal + tarih aralığı + segment combine)

### 38.37 2026-05-04 — Hesabım 1:1 parity (right rail Plan + Invoices + Danger zone + 6-field profile)

Kullanıcı raporu: "Hesabım bölümünü tasarım ile birebir her metriğini aynı yap, mobile uyumlu olsun, step by step ilerle". Audit (Explore agent) `.design-owner-2026/page-account.jsx` ile mevcut `/dashboard/account` sayfasını karşılaştırdı; ~%70 parity, 3 önemli drift tespit etti.

Kullanıcı 3 karar onayladı (AskUserQuestion):
- **Tab scope**: Mevcut 7 tab korunur (Profil / Güvenlik / Bildirim / Pulse AI / Faturalandırma / Kullanıcılar / KVKK & Yasal); business + language + API tab'ları skip (drift kabul, scope creep önleme)
- **Right rail**: Tasarım birebir — Plan dark hero + invoices + danger zone (3 widget)
- **Profil form**: 6-field tasarım birebir (name / email / phone / position / timezone select)

**Schema migration** (`User.position` + `User.timezone`):
- `prisma/schema.prisma` `User` model'ine 2 nullable field: `position String?` (free-form, max 100 char) + `timezone String?` (IANA tz string, max 64 char + regex validation). `phoneNumber` zaten mevcuttu, reuse.
- Migration: `prisma/migrations/20260504200000_add_user_profile_position_timezone/migration.sql` — `ALTER TABLE users ADD COLUMN position TEXT; ADD COLUMN timezone TEXT;`. Nullable + default null, breaking change yok (CLAUDE.md §21.18 paterni).

**API endpoint** (`/api/user/profile` PUT):
- 3 yeni alan accept (CLAUDE.md §28.3.3 mix-mode paterni — mevcut elle validation'a dokunmadan lokal Zod check). `phoneNumber`: max 32 char, free-form. `position`: max 100 char, free-form. `timezone`: max 64 char + IANA regex `^[A-Za-z]+/[A-Za-z_-]+(?:/[A-Za-z_-]+)?$`. Empty string → null (Prisma null kabul eder).
- GET response select genişletildi (3 yeni alan UI'a döner).

**Profile form** (`BusinessProfileSettings.tsx`):
- Eski 2-field (name + email) → 6-field grid (name + email + phone + position + timezone select).
- `TIMEZONE_OPTIONS` const — 10 popüler IANA tz (Europe/Istanbul / London / Berlin / Paris / Amsterdam / America/New_York / LA / Asia/Dubai / Singapore / Tokyo) + "Seçilmedi" empty option.
- iOS auto-zoom: input `inputMode="tel"`, autoComplete tags (tel / organization-title / etc.).
- Locale select ayrı kart korundu (panel dili — global app-level i18n, profile field değil).

**Right rail widgets** (3 yeni component):
1. **`AccountPlanWidget.tsx`** (~170 satır client component) — graphite dark hero + lime accent + plan name + price + 3 usage progress bar (Yorum / Ekip / Lokasyon). `/api/billing/summary` fetch, plan tier-bazlı default limits (Pro 8/5, Growth 4/3, Trial 2/1). ProgressBar tone-based (≥90% red / ≥70% amber / <70% lime). "Planı yönet" CTA → `/pricing`. Trial gün kalan badge.
2. **`AccountInvoicesWidget.tsx`** (~90 satır client component) — son 4 fatura (`/api/billing/invoices` fetch + `slice(0, 4)`). Status badge (paid/pending/failed → ok/warn/danger). Download icon link (varsa, `<a target="_blank" rel="noopener">`). Empty state → kart gizli (trial owner için fatura yok).
3. **`AccountDangerZone.tsx`** (~50 satır client component) — red border + "TEHLİKELİ BÖLGE" eyebrow + "Hesabı dondur" + "Hesabı sil" buttons disabled + "Yakında" badge. Backend yok (Iyzico Wave 3.5 sonrası — CLAUDE.md §28 disiplin scope creep önleme).

**Page integration** (`/dashboard/account/page.tsx`):
- Import 3 yeni widget.
- `useEffect` load 3-fetch'e genişletildi (`/api/team` eklendi → `teamCount` state plan widget'a prop).
- `rightRail` rewrite: 3 quick-nav button (PLAN/EKİP/KVKK) → 3 widget (Plan + Invoices + Danger zone). Eski button'lar tasarımda yoktu, drift olarak silindi.

**Mobile responsive** (CLAUDE.md §25 paterni):
- `SettingsLayout.tsx` mevcut `isCompactNav` mode (sm:) → tüm children stack + rightRail bottom (border-t). Plan widget dark hero, invoices white card, danger zone red border — hepsi mobile'da dikey stack, native responsive.
- iOS auto-zoom önleme: text input `text-[16px] sm:text-[14px]` paterni `bz-input` zaten taşır (CLAUDE.md §25.5).

**Yapma**:
- API `/api/user/profile` PUT'a tüm 3 yeni alan zorunlu yapma — `if (X !== undefined)` paterni opsiyonel kabul (geriye dönük uyumlu).
- Timezone select'i `Intl.supportedValuesOf('timeZone')` ile dinamik render etme — 600+ tz, owner UI overload. 10 popüler hard-coded liste pragmatic.
- Plan widget'ında team/restaurant limits için yeni schema field ekleme — UI runtime tier-bazlı default (Pro 8/5, Growth 4/3, Trial 2/1) yeter; ileride enforce edilirse `Plan` taxonomy genişler.
- Danger zone button'larını active yapma — backend yok, false promise, support workflow.
- Right rail eski 3 quick-nav button'u korumak — tasarımda yok, mevcut tab nav zaten section'lara taşıyor (duplicate UX).
- AccountInvoicesWidget'ta tüm faturalar listesi — sağ rail compact, max 4. Tüm liste için Faturalandırma tab → BusinessBillingSettings.

**Yap**:
- Yeni profile field eklenirken: schema (nullable + migration) → API GET select + PUT body destructure + lokal Zod safeParse (CLAUDE.md §28.3.3 mix-mode) → form state + UI input + payload (5 nokta).
- Plan tier limit değişiyorsa `AccountPlanWidget` fallback object güncel; caller override için `teamLimit` + `restaurantLimit` prop'ları opsiyonel.
- Yeni right rail widget eklerken `<>` fragment children'a ekle (mevcut grid `xl:grid-cols-[...320px]` 320px sabit, içerideki widget'lar dikey stack).
- Backend Iyzico Wave 3.5 sonrası: Danger zone button'ları enable, `/api/account/freeze` + `/api/account/delete` endpoint'leri (rate-limit + email confirm + 30g recovery flow).

**Test + verification**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` modified files — 0 errors
- `npm test` 143/143 pass (yeni test gerekmez — widget'lar pure presentational + data-fetch, helper logic'i schema-driven)
- Manuel: `/tr/dashboard/account` → 6-field profil form (name/email/phone/position/timezone select); xl: ≥1280px right rail Plan dark hero + Invoices + Danger zone
- Manuel mobile (375px): SettingsLayout `isCompactNav` mode, rightRail bottom border-t, widget'lar dikey stack
- Manuel: Profile save → /api/user/profile PUT → response 3 yeni alan ile dönüyor; reload state korunur

**Backlog güncel** (Bu PR sonrası):
- 🔴 HIGH 4 Platforms 12-card grid (DEFER §38.30 paterni)
- 🛡️ Security follow-ups (CLAUDE.md §38.2)
- 🟡 Account freeze + delete backend (Iyzico Wave 3.5 sonrası — `/api/account/freeze` + email confirm + 30g recovery)
- 🟡 API & Webhook tab UI (backend hazır `/api/api-keys` + `/webhooks`, UI scope büyük — HIGH-3)
- 🟡 2FA + Sessions + SSO UI (CLAUDE.md §34.1 — backend kalmış, UI silinmiş, low adoption)
