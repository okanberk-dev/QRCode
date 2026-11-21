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
| Server-state | `@tanstack/react-query` | Admin/dashboard fetch dağınıklığı için cache + dedup + retry. `<QueryProvider>` panel layout'unda (`src/app/[locale]/dashboard/layout.tsx`, CLAUDE.md §27) |
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
| Menü kapağı | **Postgres TEXT kolonu** (`restaurants.menu_cover_url`) + `menu_cover_version` | Raster data URL, en çok 520.000 karakter (`CoverWrite`; SVG / http yok). Herkese açık menüde yalnız `/api/menu/[slug]/img/cover?v=<menu_cover_version>` üzerinden servis edilir; sürüm, kapakla birlikte yazılan sha1 önekidir, böylece sayfa blob'u hiç yüklemez. |
| Menü tasarımı | **JSONB** (`restaurants.menu_design`) | Sürümlü enum seçimleri (stil + 10 ayar + slogan). `readMenuDesign` ile okunur (hiç fırlatmaz), yalnız `MenuDesignWriteSchema` ile yazılır, kayıtta normalize edilir. SQL `NULL` = `menu_theme`'in yenilenmiş klasik görünümü; NULL yazarken `Prisma.DbNull` (asla `JsonNull`). |
| Site ayarları görselleri | Supabase Storage (ayrı yol) | `src/app/api/admin/site-settings/upload` |

### Görsel işleme akışı (menü)
- Endpoint: `POST /api/restaurants/[id]/menu/upload` (scoped, IDOR-safe, `requireRestaurantAccess` ile korunur)
- `sharp` ile resize + WebP dönüşüm: ürün görseli **720px** max (kalite 72 → 55, tavan **90 KB**), logo 512x512 cover, kapak 1600x900
- Hata kodları: `IMAGE_TOO_LARGE` / `IMAGE_UNPROCESSABLE` (UI ham sunucu metnini göstermez, `mapMenuApiError`)
- Response: `{ url: 'data:image/webp;base64,...', bytes, kind }`
- İstemci bu data URL'i `imageUrl` / `menuLogoUrl` alanına doğrudan kaydeder
- **Herkese açık menü** data URL'i HTML/RSC yükünde taşımaz: görseller `GET /api/menu/[slug]/img/[itemId]` (`itemId=logo` dahil, uzun public immutable cache, yayında olmayan menü ve http(s) olarak saklanan değer 404 no-store — yönlendirme yok, `?v=` cache buster) üzerinden servis edilir; JSON-LD'de de data URL yok

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

Örnek pattern (`src/app/api/feedback/counts/route.ts`'e bak):
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

> **Owner panelindeki ekip ayarları** (`/dashboard/account`, Ekip bölümü) ayrı scope: işletme sahibinin kendi ekibi (`TeamMember`). Sidebar label **Ekip**, "Üye davet et" butonu burada doğru.

**API URL'leri değişmedi** (backward compat):
- `/api/admin/members` → User CRUD
- `/api/admin/users` → AdminUser CRUD
- `/api/admin/customers` (+ `/export`) → Feedback-derived; `restaurantId/range/search/hasEmail/hasPhone/hasComment/page/limit` query, `{ data, meta, summary }` response, IDOR `getScopedRestaurantIds`
- **Müşteri dedupe:** `(restaurant_id, COALESCE(lower(email), phone))` — anonim (email+phone null) feedback listede yer almaz

`translations.ts` key'leri: `businesses`, `admins`, `customers` (kanonik) + `users` (legacy backward-compat).

---

## 5. Platform Sistemi (Yorumları Ayrıştırma)

Müşteri QR'dan gelirken URL'de `platform` parametresi taşıyor: **10 yorum platformu** — `google | yemeksepeti | getir | trendyol_go | tripadvisor | airbnb | booking | yandex | yelp | foursquare` (§38.52 closure'da Yelp + Foursquare eklendi, NA/EU pazarları için). Konaklama segmenti (otel) için `tripadvisor | airbnb | booking`, TR pazarı arama alternatifi için `yandex`, US/CA için `yelp`, geo-check-in için `foursquare` desteklenir. Bu değer:
- `Feedback.platform` sütununa yazılır
- İstatistiklerde `groupBy({ by: ['platform'] })` ile ayrıştırılır
- QR oluştururken `QrGeneration.platform` olarak da kaydedilir (history için)
- CSV exportta "Platform" sütununda pretty label ile görünür

Renkler & label haritası şu dosyalarda tekrarlanıyor (ortak modüle çıkarma kararı: **hayır** — abstraction kaçınma ilkesi):
- `src/components/admin/FeedbackTable.tsx` → `PLATFORM_CONFIG`
- `src/components/panel/qr/qr-shared.ts` → `QR_PLATFORM_TO_CHIP` + `QR_PLATFORM_LABELS` (QR kartı + owner/admin QR listesi, 10 platform)
- `src/app/admin/qr/page.tsx` → `PLATFORM_BADGE`

Yeni bir platform eklemek gerekirse (CLAUDE.md §19.4.3 paterni): `PROVIDER_DOMAINS` + `PROVIDER_LABELS` + `PROVIDER_MAP` + `PLATFORM_ID_TO_PROVIDER` + `PROVIDER_FIELDS` + (varsa) `PATH_RULES` + `VALID_PROVIDERS` + `qr-shared.ts QR_PLATFORM_LABELS/TO_CHIP` + `SECTOR_PLATFORMS` + `prisma/schema.prisma` `Restaurant.{provider}Url`/`{provider}Enabled` field + QR public akışına (`/r/[slug]`).

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
- `GET /api/restaurants/[id]/google/business/locations` — Business Profile account/location sync (CLAUDE.md §5.1.1 quota strategy: 30 sn TTL + `?force=true` bypass + per-restaurant rate limit 6/dk + empty-cache 429 → 200+warning graceful degrade + UI auto-retry on countdown)
- `POST /api/restaurants/[id]/google/business/locations/select` — restoranı GBP location'a eşler
- `GET /api/restaurants/[id]/google/business/reviews` — seçili verified location yorumlarını listeler
- `POST /api/restaurants/[id]/google/business/reviews/reply` — Google review reply update
- `POST /api/restaurants/[id]/google/business/reviews/draft` — mevcut Pulse AI draft helper'ıyla cevap taslağı

Notlar:
- Places API sadece arama / link üretimi içindir; Google yorumlarını çekmek veya cevaplamak için yetmez.
- Reviews API yalnızca ilgili Google hesabının owner/manager olduğu **verified** Business Profile location'larda çalışır.
- Google review reply public alana gider; otomatik gönderme yok, owner metni görüp manuel gönderir.
- **Mimari Not (2026-05):** Google yorumları karmaşıklığı nedeniyle `Ayarlar > Platform Bağlantıları` panelinden çıkarılıp tamamen müstakil bir **`/[locale]/dashboard/google-reviews`** sayfasına taşınmıştır. İşletme sahipleri, birden fazla restoranı varsa bu yeni sayfada restoran seçebilir, yorumları tek bir listede analiz edip (AI desteğiyle) cevaplayabilir. Ayarlar sekmesinde sadece eşleştirme (bağlantı ve lokasyon seçimi) bulunur.

### 5.1.1 Google API quota strategy (2026-05)

Google'ın varsayılan kotaları çok dar ve **proje-geneli** (TÜM Buaze kullanıcıları aynı projeyi paylaşır):
- `accounts.list` → **1 istek/dakika/proje**
- `locations.list` → 10 istek/dakika/proje
- `reviews/media/Q&A` → tipik 60-300/dakika/proje

Eski akış tek "konum seç" işleminde **5-6 quota birim** yakıyordu (locations refresh + select endpoint'in `listGoogleReviews` çağrısı + sayfa mount'taki tekrar fetch + media + Q&A). 2-3 owner aynı dakikada işlem yapınca kota patlıyordu.

**Şu anki strateji (4 katman, `/api/restaurants/[id]/google/business/locations/route.ts`):**

1. **Server-side TTL (30 sn)**: `?force=true` query yoksa cache son 30 sn'den taze ve `accounts.length > 0` ise Google'a hiç gidilmez, DB cache döner. Otomatik mount fetch + sub-component remount + status polling Google quota yakmaz.
2. **`?force=true` bypass**: Sadece kullanıcı bilinçli "Konumları yenile" butonu/tekrar dene butonu basınca query'ye eklenir. Otomatik mount fetch'i (page mount + `loadInlineLocations()` auto-call from `selectedLocation === null` effect) cache kullanır.
3. **Per-restaurant rate limit (6 force/dk)**: Upstash sliding-window. Rapid click veya parallel sub-component mount'tan kotaya basmayı önler. Limit aşılırsa cache varsa stale data + `warning: 'CLIENT_THROTTLED'` dön, yoksa 429 + retry-after.
4. **Soft 429 fallback**: Google 429 dönerse (cache var ya da yok) endpoint **hep 200 + `warning: 'GOOGLE_RATE_LIMITED'` + boş/stale arrays + `retryAfterSeconds`** döner. UI sarı banner + countdown + tek-seferlik auto-retry gösterir (kırmızı hard error yerine).

> **Operatör runbook'u:** Kota `quota_limit_value: "0"` dönüyorsa (API
> etkin ama Google sıfır kota vermiş) bu bir kod sorunu değildir —
> `docs/GOOGLE_API_QUOTA_RUNBOOK.md` adım adım erişim başvurusu sürecini
> anlatır. Onay gelene kadar hiçbir owner konum göremez.

**Bonus**: `/api/restaurants/[id]/google/business/locations/select` POST artık `listGoogleReviews()` çağrısını **sadece `initialGoogleRating === null && currentGoogleRating === null`** olduğunda yapar. Rating zaten varsa quota yakmadan geçer; google-reviews sayfası mount olunca `/business/reviews` doğal olarak fresh rating'i getirir. Eski davranış her seçim için 1 quota burn ediyordu.

**UI tarafı**:
- `loadInlineLocations(force)` / `loadLocations(force)` — false default, manuel butonlar `true` geçer
- Countdown 0'a düşünce `autoRetryFiredRef` guard'lı tek-seferlik auto-retry
- "Son senkron: 2 dk önce · Önbellek" rozeti listenin üstünde — kullanıcı kaybolan kontrol hissini transparency ile geri kazanır

**Yapma:**
- Yeni Google API çağıran endpoint eklerken cache TTL'ı atlama — proje-geneli kotada her endpoint katkı yapar
- "Refresh" butonunu otomatik tetikleme (page mount, focus regain, interval polling) — her tetik bir force fetch → quota burn
- `locations/select` endpoint'inde tekrar `listGoogleReviews` veya başka quota-tüketen çağrı ekleme — happy path tek select için 0-1 quota olmalı
- Soft 429 fallback'ini "no cache" durumunda hard 429'a düşürme — UI sarı banner + auto-retry pattern kırılır

**Yap:**
- Yeni `googleBusinessFetch`-tabanlı endpoint eklerken aynı 4-katman desenini uygula (TTL + force + rate-limit + soft 429)
- Quota artışı gerekirse Google Cloud Console → "My Business Account Management API" + "My Business Business Information API" → Quotas → Request increase (24-48 saat onay)
- `cache.syncedAt` her başarılı sync'te güncel kalmalı — UI rozeti güvenilmezse owner refresh dürtüsü artar

### 5.1.2 Places profili — anında bağla + analiz (2026-10, §38.243)

`/[locale]/dashboard/google-reviews` Google girişi istemeden açılır: owner işletme adını yazar, sonuçtan birini seçer; Google puanı, yorum sayısı, en çok 5 gerçek yorum ve 6 maddelik profil kontrol listesi saniyeler içinde görünür. Business Profile (OAuth) ile yorum yanıtlama bölümü **opsiyonel** kalır, sayfanın altındadır; Business Profile kotası 0 iken (§5.1.1, §38.231) bağlan düğmesi gizlenir.

- **Yalnız Places API (New).** `googleReviewManagementEnabled` sadece yanıt özelliklerini kapatır; profil okuma her tenant için açıktır.
- **Endpoint'ler**: `GET /api/restaurants/[id]/google/places/profile` (her zaman 200; `state: ok|not_linked|unavailable|not_found|error`; `Cache-Control: private, no-store`), `POST …/places/select` (seçmeden önce ID'yi Google'a doğrulatır: 422 `PLACE_NOT_FOUND`, 503 `GOOGLE_UNAVAILABLE`; audit `owner|admin.google.place.select`), iki `places/search` route'u (sonuçta `category`; 429 `DAILY_LIMIT`, 503 `GOOGLE_PLACES_BUSY`; `GOOGLE_PLACES_NOT_CONFIGURED` HTTP 400 olarak kalır).
- **Places içeriği saklanmaz.** Kalıcı tek veri Place ID'dir (`googlePlaceId`, `googleReviewUrl`). Puan, yorum metni, yorumcu adı/fotoğrafı yalnız canlı gösterilir: tarayıcıda yalnız bellek içi 10 dk kopya; localStorage/sessionStorage/IndexedDB'ye içerik yazılmaz (sessionStorage'da yalnız "otomatik arama yapıldı" boolean'ı). Sunucuda snapshot tablosu yoktur; eklenmesi (Faz 3) yalnız operatörün Google şartları için yazılı onayından sonra yapılır.
- **Maliyet kapıları Postgres'te.** Her faturalı çağrı Google'a gitmeden `src/lib/google-places-budget.ts` `reservePlacesCall` ile `google_places_usage` sayacından tek atomik deyimle (`INSERT … ON CONFLICT … WHERE count < cap RETURNING`) rezerve edilir; DB hatası ya da geçersiz env değeri → reddet (fail-closed). Varsayılan günlük (UTC) tavanlar: Details 150 global / 30 işletme, Search 200 global / 20 işletme (`PLACES_DETAILS_DAILY_CAP`, `PLACES_DETAILS_RESTAURANT_DAILY_CAP`, `PLACES_SEARCH_DAILY_CAP`, `PLACES_SEARCH_RESTAURANT_DAILY_CAP`); en kötü durum ≈ $10/gün. `rateLimit()` (Upstash) burada yalnız yumuşak burst sınırıdır, tavan değildir (fail-open + instance-local, §14.2). Sayaç satırları günlük `platform-link-retest` cron'unun ilk adımında 7 gün sonra silinir.
- **Yanıt özelliği durumu.** `business/status` `replyAvailability` döner (`available|not_provisioned|disabled`); `Settings` anahtarı `google.business_api_state` (3 gün geçerli) kota-0 durumunu işaretler; operatör şalteri `GOOGLE_BUSINESS_REPLY_ENABLED=false`. Connect route'u kapatılmaz, gizleme yalnız arayüzdedir.
- **Owner metni jargonsuz.** Sunucu mesajları ve sağlık skoru metinleri `src/lib/google-owner-copy.ts` ve `google-business*.ts` içindedir; ham `error.message`, env adı, "kota / API / OAuth" owner'a gösterilmez (§38.233). Her Places kartında görünür "Google Maps" atfı zorunludur.
- **Sayfa yapısı (Faz 2, §38.244).** `page.tsx` ince bir sunucu bileşenidir: yalnız düz `user_token` (admin_token yok) varsa işletme listesini (`isActive: true`, ekip kapsamı dahil), `canWrite` ve `placesConfigured` değerlerini okuyup `GoogleReviewsClient`'a verir; admin / impersonation oturumunda liste istemcide çekilir. Aktif işletme (URL → localStorage → ilk) yine istemcide çözülür; `PlacesProfileSection` ancak çözüldükten sonra bağlanır. Yanıt bölümü `GoogleReplySection`'dır ve `key` ile işletme başına yeniden bağlanır (elle sıfırlama yok); üst bileşene yalnız `onReplyState` ile "ilk durum tamamlandı / yanıt özelliği hazır" bildirir. `GoogleBusinessIntegrationPanel` (ayarlar, platform sihirbazı, admin hub) kendi arama bloğu yerine ortak `PlacesBusinessPicker`'ı kullanır (`autoSearch={false}` — otomatik faturalı arama yalnız Google Yorumları sayfasında).
- **Yapma**: Places içeriğini DB/log/Sentry/tarayıcı depolamaya yazma; Places çağrısını `reservePlacesCall` olmadan ekleme; kota doluyken otomatik yeniden deneme (§38.211); yorum metnine AI/NLP analizi ya da Google fotoğrafı gösterimi ekleme (şartlar).
- **Yayın kapıları (operatör)**: G1 Places şartları/saklama onayı; G2 GCP'de Places API (New) günlük kota tavanı + bütçe uyarısı; G3 gerçek Google yanıtlarıyla fixture kaydı (`tests/fixtures/google-places/` şu an sentetik; `attributions` ve `primaryTypeDisplayName` alan maskeleri doğrulanmadı); G4 Business Profile kotası onaylanana kadar `GOOGLE_BUSINESS_REPLY_ENABLED=false`.

### 5.2 Paket & Özellik Erişimi (2026-05)

İşletme bazlı paket entitlement'ları admin tarafından yönetilir. Bu layer, ileride ücretli plan/paket sistemi otomatik atama yapana kadar superadmin'in her işletme için master şalterleri manuel yönetmesini sağlar.

- Kanonik admin endpoint: `PATCH /api/admin/restaurants/[id]/feature-access` (superadmin only). Response: `{ restaurant: { id, googleReviewManagementEnabled, pulseAiEnabled, menuEnabled, menuPublished, aiAnalyticsEnabled, externalPlatformsEnabled, updatedAt } }`.
- Master alanlar: `googleReviewManagementEnabled` (default `false`), `pulseAiEnabled`, `aiAnalyticsEnabled`, `externalPlatformsEnabled` (üçü de default `true`) + mevcut `menuEnabled/menuPublished`.
- Admin UI konumu: `/admin/restaurants/[id]` içindeki **Paket Özellikleri / Gelişmiş özellik yönetimi** kart grubu. Eski Google yorum ve menü kontrolleri burada toplanır; aynı ayar başka formda tekrar edilmez.
- `menuEnabled=false` olduğunda `menuPublished=false` yapılır ve owner menü oluşturma/düzenleme/publish API'leri server-side 403 döner. Public menü zaten `menuEnabled && menuPublished` ile görünür.
- `pulseAiEnabled=false` olduğunda owner Pulse AI ayarları kilitlenir; feedback draft/suggest-reply ve Google review draft endpoint'leri AI üretmez. Admin master kapatma anında bekleyen `FeedbackAiDraft` kayıtları temizlenir; owner tercih alanları (`enableAiDraft`, `googleAiEnabled`, `aiDraftTone`) silinmez.
- `aiAnalyticsEnabled=false` olduğunda owner analytics sayfası normal KPI/chart akışını korur; sadece AI tema çıkarımı / weekly AI insight çağrıları yapılmaz.
- `surveysEnabled=false` (default `true`, 2026-10) olduğunda owner yeni anket oluşturamaz / yayınlayamaz / kopyalayamaz (`surveys_disabled` 403); yayındaki `/s/[slug]` linkleri 404 döner ve yanıt toplamaz. Mevcut anketler silinmez. Admin toggle `/admin/restaurants/[id]` → Paket Özellikleri.
- `suspendedByAdmin` (default `false`, 2026-10): superadmin işletmeyi duraklattığında (detay formu active→paused geçişi veya bulk "Duraklat") set edilir; owner `PUT isActive:true` → 403 `SUSPENDED_BY_ADMIN`. Superadmin yeniden etkinleştirince temizlenir. Owner'ın kendi duraklatması bu bayrağı set etmez.
- `externalPlatformsEnabled=false` olduğunda Google dışı review platformları (Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Airbnb, Booking, Yandex, Yelp, Foursquare ve "Diğer") owner UI/API, QR üretimi, integration test/retest ve public `/r/[slug]` redirect resolver tarafında yok sayılır. Kayıtlı URL'ler ve owner platform tercihleri silinmez; gate tekrar açılınca kaldığı yerden kullanılabilir.
- **Plan modülleri (2026-11, §38.258)**: `SubscriptionPlan.modulesManaged` açık bir pakette `moduleKeys` (`googleReviews | pulseAi | aiAnalytics | menu | surveys | externalPlatforms`, katalog `src/lib/plan-modules-catalog.ts`) sahibin TÜM işletmelerinde yukarıdaki şalterleri belirler: listede olan açılır, olmayan kapanır (menü kapanınca yayından kalkar, Pulse AI kapanınca bekleyen taslaklar silinir). Uygulama `applyPlanModulesForOwner` (`src/lib/plan-modules.ts`): kartla ödeme sonrası, admin fatura modalı kaydı, yeni işletme oluşturma ve paket düzenleme (`applyPlanModulesForPlan`) anlarında; yalnız aktif abonelikte. `modulesManaged=false` paketlerde şalterler eskisi gibi elle yönetilir. Admin `/admin/plans` → paket formunda modül kutuları.
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
- Owner + admin analitik sayfalarında `ChannelDistributionMini` (`src/components/dashboard/analytics/`). Eski `PlatformDistribution` / `TrendsChart` 2026-11'de kullanılmadığı için silindi (§38.257).

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
│   ├── global-not-found.tsx   # Unmatched URLs (no app/layout.tsx; one root layout per segment, §52)
│   ├── opengraph-image.tsx    # Dynamic 1200x630 OG image
│   ├── robots.ts + sitemap.ts # SEO
│   └── globals.css            # Pulse @theme + bz-* + pulse-* utility'leri
├── components/
│   ├── admin/                 # StatsCards, FeedbackTable, AdminSidebar, ...
│   ├── auth/                  # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
│   ├── dashboard/             # OwnerShell, RestaurantAnalyticsPanel, menu/*
│   ├── marketing/             # MarketingNavbar, MarketingFooter, MobileBottomNav, BuazeLogo, NewsletterSignup, ...
│   ├── menu/                  # PublicMenuView (tek renderer, 12 stil), parts/, menu-fonts, menu-labels, ProductDetailModal, MenuSplash
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
├── seed-mail-templates.ts     # 40 row mail template seed (20 template × 2 locale, §21.26)
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
- **Clash Display** (başlık) + **Inter** (metin) + **JetBrains Mono** (eyebrow / sayı / kod) — site geneli, owner + admin panelleri dahil (2026-11 kullanıcı kararı: seacon.gr tipografisi; Geist kaldırıldı). Hepsi `src/components/root/fonts.ts`'te, tüm kök düzenler `RootHtml` üzerinden kullanır (§52). Inter ve JetBrains Mono `latin-ext` ile yüklenir (Türkçe ğ/ş/İ; yalnız `latin` iken sistem fontuna düşüyordu).
- **Clash Display lisansı (ITF Free Font License)**: kendi sitemizde ticari kullanım + kendi sunucumuzda barındırma serbest. **Yasak**: dosyaları değiştirmek (subset, format dönüşümü dahil), dağıtmak / herkese açık repoya koymak, fontu müşterilerin KENDİ içeriği için sunmak. Bu yüzden `src/fonts/clash-display/*.woff2` Fontshare'in resmi dosyalarıdır, bayt bayt (`next/font/local`, yalnız 500/600/700) ve repo private kalmalıdır.
- **Menü fontları (OFL whitelist, 2026-11 §38.261)**: restoran menüleri yalnız OFL ailelerini kullanır — `fonts.ts`'ten Space Grotesk, Inter ve JetBrains Mono; `src/components/menu/menu-fonts.ts`'ten Fraunces, Newsreader, Instrument Serif, Bricolage Grotesque ve Playfair Display (`preload: false`, `latin` + `latin-ext`, seçenekler literal — `next/font` spread kabul etmez). Hangisinin kullanılacağını `resolveMenuDesign` (`src/lib/menu-design.ts`) seçer; menü kökü (`data-menu-root`) `--font-menu-heading`'i yazar ve `--font-heading`'i ona çevirir. `MENU_FONT_VARIABLES` yalnız menü kökünde ve Studio tasarım panelinde durur. `globals.css`'te `--font-menu-heading` varsayılanı Space Grotesk kalır (`/menu/[slug]/error`, QR görselleri). Clash Display menü kapsamına asla girmez; bu `tests/menu-fonts.test.ts` + `tests/menu-design.test.ts` ile test edilir. Müşterinin içeriği olan yeni bir yüzey (menü, indirilebilir görsel / PDF, müşteri markalı sayfa) eklerken Clash Display KULLANMA.
- `globals.css` içinde `h1..h6` için CSS seçiciyle `--font-heading` + `font-weight: 500` + sıkı `letter-spacing: -0.025em` otomatik uygulanır (panelde 600, §49), body default Inter'dir.
- Clash Display weights: 500, 600, 700 (italic yok → italik başlık sentetik). Space Grotesk weights: 400, 500, 700 (preload yok). Inter weights: 400, 500, 600, 700, 800. JetBrains Mono weights: 400, 500, 600.
- CSS variable'ları: `--font-heading` (Clash Display → Inter yedeği), `--font-menu-heading` (Space Grotesk), `--font-body` (Inter), `--font-mono` (JetBrains Mono).
- **Pulse eyebrow pattern**: `.pulse-eyebrow` utility class — JetBrains Mono, 11px, tracking 0.18em, uppercase. Küçük kategori/label chip'leri için.

### UI Stili
- **Neo-brutalist offset shadow'lar** kaldırıldı, yerine `shadow-sm/md/lg` + soft 20px offset koyu shadow'lar kullanılıyor.
- Kart border'ları `#EDEDED` (n200) olmalı; Graphite border'lar sadece buton ve high-contrast elemanlarda.
- Typography weight kademeleri: heading `font-medium` (500) veya `font-semibold` — Space Grotesk kendisi ince, bold aşırı kalın durur. Body `font-medium`/`font-semibold`. Aşırı `font-black` kullanımından kaçının.
- **Motion**: `.pulse-heartbeat` utility — 1.6s ease infinite scale(1→1.2→1). Logo accent dot, live status indicator vb. için.
- **Signature buton**: `bg-[#C6F24E] text-[#0A0A0A]` (lime CTA) veya `bg-[#0A0A0A] text-white` (koyu CTA); hover'da `bg-[#A8D62E]` / `bg-[#1A1A1A]`.

### Dokunulmayan platform brand hex'leri
`#4285F4` (Google), `#FA0050` (Yemeksepeti), `#5D3EBC` (Getir), `#F27A1A` (Trendyol GO) — `PlatformChip` (`src/components/ui/PlatformChip.tsx`) içinde resmi marka renkleri olarak korunur.

### Ses & Ton (Pulse Voice)
**Yap:** Net · Ölçülü · Güvenli · Doğrudan · Profesyonel Türkçe
**Yapma:** Havalı slogan · Korkutucu · Aşırı teknik · Emoji yığını
Örnek: *"Her yorum bir işarettir."* (❌ *"🚀 Yorumlarınızı devrimci şekilde yönetin!"*)

---

## 12. Menü Sistemi (2026-04 redesign)

Menü yapısı tek tip modern builder etrafında toplandı. Legacy `MenuEditor.tsx` + `MenuCategoryForm.tsx` + `MenuItemForm.tsx` **silindi**; eski admin rotası ve `/dashboard/menu` modern builder'a redirect yapıyor. `/dashboard/menu` işletme seçmez (kart ızgarası Stage 171'de kaldırıldı): `?restaurantId` ya da tek işletme → sunucu yönlendirmesi; aksi halde `MenuHubRedirect` panelin seçili işletmesini (shell → hatırlanan → ilk) çözüp builder'ı açar, bu arada builder iskeleti görünür. Shell'deki "Menü" linkleri doğrudan `/restaurants/<aktif>/menu`'ya gider.

### 12.1 Builder — Menu Studio (2026-11, §38.260)

**Rota:** `src/app/[locale]/dashboard/restaurants/[id]/menu/` — `page.tsx` (`'use client'`) `?preview=1` ise `CustomerPreviewScreen` (tam ekran müşteri görünümü, `disableAnalytics`, "Önizlemeden çık"), değilse `studio/MenuStudio`. `loading.tsx` default export `MenuBuilderSkeleton` (`dashboard/menu/loading.tsx` + `MenuHubRedirect` bu yolu import eder; yol değişmez), stüdyonun DOM'unu aynı sınıflarla kopyalar (satır geometrisi `outline/row-layout.ts`); stüdyo düzeni değişirse aynı commit'te güncellenir (§40.10). `error.tsx` `reportBoundaryError('menu-builder-error-boundary')` + `scheduleTransientRetry('menu-builder')`. Sayfa sarmalayıcı `max-w-[1600px]`.

**Klasör yapısı (`_components/`):**
- Saf modüller (node:test, React yok; testler yolları değiştirmeden import eder): `menu-merge` (yanıt birleştirme, geçici `tmp_` satırlar, taslak üst katmanı), `menu-item-form`, `menu-setup`, `menu-starter-data`, `menu-theme` (`ACCENT_SWATCHES`, ThemeSync, `themeDiff`/`isThemeDirty`), `menu-status` (Satışta/Tükendi/Gizli, tek bayraklı toplu yamalar, eksik bildirimleri), `menu-filter` (Türkçe katlamalı arama, filtre çipleri), `menu-paste`, `menu-undo` (20 kayıt, 29 dk), `menu-dnd`, `menu-bulk-price`, `menu-keys` (`e.key` tabanlı kısayollar), `menu-queue` (anahtar başına seri kuyruk + `runPool`), `menu-setup-preview`, `menu-i18n` (tek TR/EN metin modülü; `tests/menu-i18n.test.ts` eşlik testi), `menu-constants`, `menu-types`, `menu-ui` (medya sorgusu kancaları, dnd-kit sensörleri + TR duyurular, `afterMenuCloses`).
- `data/`: `menu-api` (`apiCall` + tipli uç noktalar, hatalar `mapMenuApiError`), `useMenuData` (React Query `['menu-builder', id]`, `gcTime: 0`), `useSerialQueue`, `useMenuActions` (her yazma: iyimser değişiklik → anahtar kuyruğu → API → yanıtı birleştir → geri al kaydı), `usePhotoUpload` (görsel hattı: `image/*` → `compressImage` ürün 960/0.8, logo 1024/0.85, kapak 1600/0.82 → >5 MB ret → `POST …/menu/upload` → data URL), `useThemeDraft`.
- `kit/` (Sheet, tek yuvalı Toaster + geri al yığını, SaveIndicator, storage, useMenuCopy, pencere dosya bırakma koruması), `studio/` (orkestratör, başlık, durum kartı, araç çubuğu, ViewSwitch/ModeSwitch, ContextBar, kısayollar), `outline/` (tek sürekli liste: kategori bölümleri, 3 kademeli container-query satırları, satır içi ad/fiyat, hızlı ekle, sürükle-bırak, seçim + toplu işlemler, liste yapıştır), `item/` (ürün paneli), `design/` (Görünüm), `share/` (QR), `preview/` (sağ sütun + telefon önizlemesi), `setup/` (boş menü kurulumu). `ThemeThumb.tsx` kökte kalır.

**Yayın ve geri alma modeli:** Taslak anlık görüntü yoktur — yayındaki menüde kaydedilen her değişiklik müşterilere hemen görünür; bunu durum kartı, "● Canlı" göstergesi, toast'lardaki lime nokta ve panel alt satırları söyler. Yayına al / Yayından kaldır yalnız durum kartındadır (`PATCH /menu/publish`; kaldırma tehlike onayı ister, geri alınmaz). Geri alınabilir her işlem bir geri al kaydı bırakır (oturumluk, en çok 20, 29 dk): satır içi ad/fiyat, hızlı ekle ve fotoğraf sessizdir (SaveIndicator "Kaydedildi · canlı" + kısa süreli "Geri al"), anahtarlar / silme / taşıma / toplu işlemler / yapıştırma / panel kaydı / Uygula "Geri al"lı toast gösterir; ⌘/Ctrl+Z ve araç çubuğundaki Geri al son kaydı çalıştırır. Silinen ürün ve kategoriler `POST /menu/restore` ile 30 dakika içinde döner (§12.4). Yazmalar anahtar başına seri kuyruktan geçer (`item:<id>`, `cat:<id>`, `append:<kategori>`, `order:…`, `theme`), böylece hızlı ardışık değişiklikler sunucuda doğru sırayla biter. Toplu işlemler N istek (`runPool`, 4 eşzamanlı) — atomik değildir: başarısızlar geri döner ve bildirilir, başarılılar tek geri al kaydıdır. `fetchAll` yalnız ilk yükleme, tekrar dene, kurulum sihirbazı sonrası, başarısız sıralama/taşıma ve oturum ortasında yetki kaybından sonra.

**Görünüm (stil, ayarlar, renk, marka) — yerel taslak + Uygula (2026-11, §38.261):** panel beş sekmedir — **Stil** (12 stil, `MENU_PRESET_ORDER`; her kart `resolveMenuDesign`'dan çizilen canlı mini menü, sahibin gerçek adı ve taslak rengiyle; önerilen renk çipi "Rengi kullan"; tek seferlik "stiller yenilendi" notu `buaze:menu:design-refresh:v1`), **Renk** (12 adlı renk + özel renk + "Varsayılan" (null → `primaryColor`) + kontrast notu + 8 zemin), **Yazı** (6 OFL yazı karakteri), **Düzen** (Ürünler, Üst alan, Kategori menüsü, Ürün kutusu, Yoğunluk, Köşeler, Fiyat, Rozetler — stil varsayılanı nokta + "(stil varsayılanı)" ile işaretli, seçilince geçersiz kılma silinir; Kapak seçili ama fotoğraf yoksa "Kapak ekle" Marka sekmesine götürür), **Marka** (logo, 16:9 kapak, en çok 80 karakter slogan). Uygulanmamış değişiklik tutan sekmede 6 px nokta. **Stil değişimi** `menuTheme`'i stilin ailesine çeker, stil ayarlarını sıfırlar ve sloganı korur; ayar düştüyse satır içi "Geri al" yalnız taslağı geri getirir. "Bu stilin varsayılanlarına dön" ayarları temizler, sloganı korur. Renk, logo ve kapak stil değişiminden etkilenmez. **Kontrast notu**: çözümleyici sahibin rengini metin, dolgu ya da bant için ayarladıysa "Seçtiğin ● → Menüde ●" gösterilir (ör. Limon beyazda görünür, Siyah beyazda görünmez). Seçimler yalnız önizlemeyi değiştirir (önizleme zemini çözülmüş `bg`; üst alan, logo, kapak, slogan veya zemin değişince önizleme başa kayar); **Uygula** yalnız değişen alanlarla tek `PATCH /theme` gönderir, toast "Geri al" önceki değerleri geri yazar (ikisi de `theme` kuyruğu + ThemeSync). **ThemeSync 5 anahtar** tutar (`THEME_KEYS`: `menuTheme`, `menuAccentColor`, `menuLogoUrl`, `menuDesign`, `menuCoverUrl`; `confirmedSeq` bu listeden kurulur — eksik anahtar asla onaylanmaz ve Uygula görsel olarak geri döner). Tasarımlar normalize + kanonik sırada karşılaştırılır (`designKey(normalizeMenuDesign(…))`), stil varsayılanına eşit ayar fark sayılmaz; başarılı yanıtta `menuTheme`, `menuAccentColor`, `menuDesign` sunucunun kanonik değerleriyle onaylanır. Logo ya da kapak yüklenirken Uygula bekler (`uploading`). QR ve yayındaki menü Uygula'ya kadar kayıtlı değerleri kullanır. ≥1024 panel listenin yerine geçer, sağ sütun taslağı gösterir; <1024 alt sayfa (telefonda üstte önizleme şeridi, tablette ayarlar | 280 px önizleme). Uygulanmamış değişiklikle kapatma (X, Vazgeç, Esc, dışarı tıklama, başlık düğmesi) ve sayfadan ayrılma onay ister. Yalnız `menuEnabled && !viewer`; panel açıkken yetki düşerse kapanır ve taslak atılır. Admin `/admin/restaurants/[id]`: "Stil: {ad} · {n} özelleştirme" satırı + onaylı "Tasarımı sıfırla" (`PATCH …/menu-theme { menuDesign: null }`); admin tasarım yapmaz.

**Düzenle / Servis / Önizle:** `mode: 'edit' | 'service'` izleyici başına saklanır (`buaze:menu:mode`). Servis görünümü yalnız satış durumunu gösterir (satır başına tek dokunuşla Satışta ⇄ Tükendi + Göster); ad/fiyat düzenleme, hızlı ekle, sürükleme, seçim, küçük resim yok. <1024 `ViewSwitch` (Düzenle · Servis · Önizle — Önizle telefon önizlemesini sayfada açar), ≥1024 araç çubuğunda `ModeSwitch`.

**Sağ sütun (≥1024):** müşterinin gördüğü telefon (`PublicMenuView`, bellekteki veriyle; kaydedilmemiş ürün taslağı ve uygulanmamış görünüm görünür; odaklanan ürün vurgulanır; önizlemede ürüne tıklamak onu açar; liste kaydırıldıkça bölümü izler; daraltılabilir). Bir ürün açıkken sütun `[Önizleme | Ürün]` sekmelerine döner: ürün paneli listeyi asla kapatmaz, başka satıra tıklamak o ürünü açar (kaydedilmemiş değişiklik varsa önce sorar — her kapatma yolunda). <1024 ürün paneli sağ (tablet) / alt (telefon) sayfadır, kendi `Düzenle / Önizle` sekmesiyle. **Kural:** `PublicMenuView` `document` üzerinde arama yaptığı için aynı anda yalnız BİR önizleme bağlanır (sağ sütun, ürün sayfası Önizle, Görünüm sayfası, telefon Önizle, kısa pencere sayfası).

**Boş menü:** düzenleyebilen kullanıcıya durum kartı ve araç çubuğu yerine kurulum açılır — Hazır şablonla başla (sektöre göre sıralı 9 şablon, ilk 4 görünür) / Listemi yapıştır (fiyatsız satırlar kategori olur) / Boş başla. Sihirbaz: [Tür | Yapıştır] → Kategoriler → Ürünler (isteğe bağlı) → "Menüyü oluştur" (kategoriler sırayla, her birinin ürünleri tek toplu istekte, ilk hatada durur, her zaman `fetchAll`). Yarım kurulum sekme oturumunda saklanır (`buaze:menu-setup:<id>`). Salt okunur + boş → "Bu işletmenin menüsü henüz boş."

**Değişmeyen sözleşmeler:** DnD `PointerSensor` 8 px + `TouchSensor` 150 ms/5 px + klavye; alternatifler ⋯ menüsü, Alt+↑/↓, dokunmatik "Sırala" modu, Kategorileri sırala sayfası. Sıralama `PATCH /menu/reorder` (`sortOrder = index`). Satır içi ve panel PATCH'leri yalnız değişen alanları gönderir; kategori değişen ürün hedefin sonuna iner (sunucu `MAX+1`). Salt okunur (`!menuEnabled || viewer`, rol yüklenene kadar iskelet): kontroller gizlenmez, devre dışı kalır; "paketi yükselt" vaadi yok. Dolu kategori silme: 409 `CATEGORY_NOT_EMPTY` + `itemCount`, onaydan sonra `?deleteItems=true`. `?edit=<itemId>` (yükleme + rol sonrası bir kez, bilinmeyen id yok sayılır) ve `?share=1` (`menuEnabled` iken bir kez) `router.replace(…, { scroll: false })` ile temizlenir. Menü QR `/menu/qr?format=png|svg` (önizleme svg 400, indirme png/svg 1200; bağlantı `X-Menu-Url` → `SITE_URL/menu/<slug>`, asla `window.location.origin`; `?source=qr` attribution; `X-Qr-Color-Adjusted` notu; `qr-colors.ts` `ensureScannableDark` kontrast tabanı 3.0). Tüm hata metinleri `mapMenuApiError`'dan geçer; ham sunucu metni gösterilmez.

### 12.2 Public menü & PublicMenuView (2026-11, §38.261)

**Dosyalar:** `src/components/menu/PublicMenuView.tsx` (orkestratör) + `parts/` (`MenuDocument`, `Masthead`, `CategoryNav`, `SectionHeader`, `ItemList`, `ItemGrid`, `ItemMedia`, `ItemBits`, `EmptyMenu`, `MenuFooter`), `menu-fonts.ts`, `menu-labels.ts` (TR/EN müşteri metni), `ProductDetailModal.tsx`, `MenuSplash.tsx`.

**Tek, token tabanlı renderer — 7 aile üstünde 12 stil.** `menuTheme` = aile (`MENU_THEMES`, 7 değer; eski kod paylaşılan DB'de yeni stili ailesinin görünümüyle çizer), `menuDesign.preset` = stil (`MENU_PRESETS`, 12: 7 yenilenmiş eski tema + `sokak`, `atelier`, `gallery`, `meyhane`, `noir`). Stilin üstüne sahip 10 enum ayarı geçersiz kılabilir (zemin 8, yazı karakteri 6, ürünler 4, üst alan 4, kategori menüsü 2, ürün kutusu 2, yoğunluk 3, köşeler 3, fiyat 3, rozetler 2) + slogan + vurgu rengi + logo + kapak. Öncelik sırası saf ve deterministiktir (`src/lib/menu-design.ts` `resolveMenuDesign`): geçersiz aile → `classic`; tasarımın stili aileye uymuyorsa ailenin kendi stili + ayarlar + slogan; geçersiz tek ayar düşer; `header: cover` kapak yoksa `centered`. `menuDesign` NULL olan her mevcut restoran hiçbir işlem yapmadan ailesinin yenilenmiş stilini görür.

**Kontrast garantisi (`src/lib/menu-palette.ts`).** Sahip yalnız vurgu rengini seçer; zeminler doğrulanmış sabitlerdir. Çözümleyici her rol için AA'yı otomatik sağlar: `accentText` ≥ 4.5 (bg + surface), `accentUi` ≥ 3 (bg + surface + yarı saydam sticky nav'ın en kötü hali), dolgu üstü yazı ≥ 4.5, bant üstü yazı ≥ 4.5. Ham vurgu rengi asla yazı ya da bu rollerin dışında dolgu olmaz; ayarlandıysa `adjusted.*` Studio'daki kontrast notunu besler. Testler 7.102 renk × 8 zemin × 2 bant tonunda 0 hata doğrular.

**Güvenlik.** Sahipten CSS / HTML alınmaz: yalnız enum değerleri, normalize `#RRGGBB` ve sanitize edilmiş düz metin slogan (React metin düğümü; `dangerouslySetInnerHTML` yok). DOM'a yazılan tek tasarım nesnesi `data-menu-root` `style`'ıdır: kapalı bir custom property kümesi (`MenuStyleVar`) + `color-scheme`; her değer `STYLE_VALUE_RE`'ye ya da `MENU_FONT_STACKS`'e uyar. Görseller yalnız `/api/menu/[slug]/img/[itemId|logo|cover]` üzerinden; HTML, RSC ve JSON-LD'de data URL yok; sayfa sorgusu `menuCoverUrl` seçmez.

**Yalnız container query.** `src/components/menu/**` viewport kırılımı (`sm:`/`md:`/…) kullanmaz, `@sm/menu:` … `@3xl/menu:` kullanır; böylece Studio'daki 375 px önizleme gerçek 375 px telefonla aynıdır. `${hex}AA` birleştirme, `animate-in` ve `--font-heading` doğrudan kullanımı da yoktur — `tests/menu-components-guard.test.ts` zorlar.

**DOM sözleşmesi (Studio ve analitik buna bağlı):** `section#cat-<id>[data-cat-id]`, nav `href="#cat-<id>"`; `article[data-pid]` + `setProductRef` + tıklama → sayfa + `trackProductClick`; `trackMenuView` mount'ta, `trackCategoryClick`, ürün görüntüleme eşiği 0.5; kaynak tespiti `replaceState`'ten önce (`?source=qr` atfı korunur); aynı anda tek `PublicMenuView` (`next/dynamic` `ssr:false`, zoom'lu `contain: layout paint` kaydırıcıda çalışır); alerjenler her kartta, kesilmeden; "Powered by Buaze" altbilgisi. Splash ve ürün sayfası `@container` tuvalinin **kardeşidir** (container containment `position: fixed`'i bozar). Kategori atlamaları `scrollIntoView` kullanmaz (Studio sayfasını da kaydırırdı).

`disableAnalytics` (Studio önizlemesi) tracking'i **ve** splash'i kapatır — builder önizlemesi üretim verisini kirletmez ve beklemeye sokmaz.

**Kaldırıldı (drift notu):** 7 `*Layout` fonksiyonu, `BadgeChipOnDark`, `Placeholder`, `MenuFontScope` ve `${accent}xx` birleştirmeleri. Eski dokümandaki "Elegant Manrope başlık" ve "Gastronomy #0E1525" hiç doğru değildi (Elegant Manrope yüklemiyordu, Gastronomy zemini `#0A0A0A` idi); güncel değerler `SURFACES` / `TYPEFACES` / `PRESETS` tablolarındadır.

### 12.2.1 Yan component'ler

- **`ProductDetailModal.tsx`** — yalnız `PublicMenuView` import eder; ürün kartından açılır (mobilde alt sayfa, geniş ekranda merkez). Diyalog semantiği: odak tuzağı, ESC + arka plan kapatır, kapanınca odak karta döner; açıkken tuval `inert` (yalnız mount sonrası — SSR HTML'de `inert` yok, JS çalışmazsa menü kullanılabilir kalır). Açılışta `menu_product_click`.
- **`MenuSplash.tsx`** — `?source=qr` ile gelen müşteriye markalı splash, **overlay** olarak (tuvalin kardeşi). Sunucu `initialSplash` ile splash'i SSR HTML'e koyar (önce menü sonra splash yanıp sönmesi yok); istemci `replaceState` ile parametreyi siler, `initialSplash` yoksa yalnız istemci yedeği açar. Splash görünürken ürün görüntüleme sayılmaz, tuval `inert`. `prefers-reduced-motion: reduce` altında hiç splash yok.
- **Legacy `/r/[slug]/menu/page.tsx`** — magazin stilli ayrı sayfa (kendi search + modal). Tema desteği yok (sadece `menuAccentColor`). TDZ tuzağı: `filteredCategories` useMemo'su ilgili useEffect'lerden **önce** tanımlanmalı (minify sonrası `Cannot access before initialization`).

### 12.4 Backend dikkat edilecek davranışlar

- **Item PATCH + kategori değişikliği:** Item farklı bir kategoriye taşındığında server tarafı otomatik olarak hedef kategorinin sonuna yerleştirir (`sortOrder = MAX + 1`). Aksi halde sortOrder eski değerinde kalır ve listede yanlış pozisyonda görünür. Bkz. `/api/restaurants/[id]/menu/items/[itemId]` PATCH.
- **sortOrder default:** Yeni item/kategori POST'unda `sortOrder = last + 10` kullanılır (10'luk boşluk manuel ince ayar için ama reorder sonrası `0,1,2...`'e sıkıştırılır). Small quirk, functional.
- **`parsePriceInput`:** TR (`1.234,56`), EN (`1,234.56`) ve basit formatları (`1,50` / `1.50` / `1000`) destekler. Comma varsa decimal, dotlar thousand separator; tersi de geçerli. Tek dot belirsizlik durumunda decimal kabul edilir. Bkz. `src/lib/format.ts`.
- **MenuCategory soft-delete (Sprint 3):** `deletedAt` kolonu ile mantıksal silme. `MenuItem.category onDelete: Restrict` korunur, `MenuCategory.items` cascade `deleteMany` sadece **restoran tamamen silindiğinde** çalışır (`/api/restaurants/[id]` DELETE). Tüm read sayfaları + reorder + item POST/PATCH `deletedAt: null` filtresi uygular; PATCH endpoint'i soft-deleted satırı 404 döner (zombie write koruması). **Geri alma (Menu Studio, 2026-11):** `POST /api/restaurants/[id]/menu/restore` silinen ürünleri (`{ itemIds }`, 1–100) ve kategorileri (`{ categoryId }`) **30 dakika** içinde geri getirir (`src/lib/menu-restore.ts` `MENU_RESTORE_WINDOW_MS` + `canRestore`). Kategori geri alınırken yalnızca onunla **aynı `deletedAt`** ile silinen ürünler (`?deleteItems=true` cascade'i) döner; daha önce tek başına silinmiş ürün silinmiş kalır. Süre dolduysa kategori 410 `RESTORE_EXPIRED`; ürün isteğinde geri gelmeyenler `skipped` listesinde (`NOT_FOUND` / `RESTORE_EXPIRED` / `CATEGORY_DELETED`). Gate `requireMenuModuleAccess` (viewer 403 `forbidden_role`, modül kapalı 403 `MENU_MODULE_DISABLED`), 60/dk rate limit, Zod `.strict()`, `touchMenuUpdated`. 30 dakikadan sonra soft-delete = arşivleme; geri çağırmak DB direct müdahale gerektirir. Route testi: `MENU_TEST_DATABASE_URL=<lokal db> npm test` (`tests/menu-restore-route.test.ts`; değişken yoksa atlanır).

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

`PublicMenuView` (12 stil), `/r/[slug]/menu` (legacy), `/menu/[slug]` (SSR) — hepsi tracking'e bağlı. `disableAnalytics` prop'u admin preview'ı dışarda tutar.

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

**Self-host bağlantı havuzu ve paralel okuma (2026-11, §38.263)**: production Coolify'da tek uzun ömürlü Node örneği ve `connection_limit=10`; canlıda her sorgu Supabase'e ~500-600 ms (pooler 6543 + `pgbouncer=true`; operatör portu 5432'ye çekmeyi deneyecek, `docs/HANDOFF-BUAZE.md` §2.3). Array `$transaction([...])` okumaları sırayla + BEGIN/COMMIT çalıştırır (N+2 tur). Sıcak panel yollarında bağımsız okumalar `readAll([...])` (`src/lib/db-batch.ts`, en çok 5 eşzamanlı, Prisma sorguları tembel olduğu için gerçek sınır) ile çalışır; tutarlı tek anlık görüntü gereken okuma ve yazmalar `$transaction`'da kalır. Asıl kazanç yine sorgu sayısını azaltmaktır.

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

### 15.2 Canonical billing parity (marketing /pricing ↔ admin ↔ owner)

`SubscriptionPlan` tablosu **tek source-of-truth**. Marketing `/pricing` kartları, admin `/admin/plans` editörü, admin `/admin/billing` özet kartı, owner `BillingReadOnlyCard` ve `MemberBillingModal` aynı kanonik veriden beslenir. §38.200'de canonical helper + tier FK eklendi.

**§38.225 Stage 145 — USD-only fiyatlandırma**: Buaze 2026-05'te single-currency USD migration yaptı. Tüm yeni billing akışları USD; locale (tr/en) sadece label/CTA dilini değiştirir, fiyat sabit USD format'ı (`$X.XX`). `priceTry`/`priceYearlyTry` schema field'ları **backwards-compat için** kalır (legacy TRY subscription'lar tutarlarını korur), ama yeni tier oluştururken `priceTry: 0` set edilir; admin UI'da TRY field'ları gizli (modal hidden, InlinePriceCell USD-only hero). `toPublicPlan(row, locale)` artık locale (tr/en) sadece name/description/features dilini belirler — fiyat her iki locale'de USD. `resolveBillingAmount` default `currency: 'USD'`.

**Schema field'ları (`SubscriptionPlan`):**
- `priceTry: Int` + `priceUsd: Int?` — aylık liste fiyatı (TRY backwards-compat, USD primary)
- `priceYearlyTry: Int? @map("price_yearly_try")` — yıllık **TOPLAM** TRY (legacy, admin manuel set)
- `priceYearlyUsd: Int? @map("price_yearly_usd")` — yıllık toplam USD (primary). Null ise formula fallback.

**Paket stratejisi (2026-11, §38.259, kanonik)**: üç paket işletme sayısı ve modüllerle ayrılır; kaynak `src/lib/plan-catalog.ts`. Başlangıç 499 TL/ay (1 işletme, çekirdek: QR, 10 platform, uyarı, yanıt + şablon, analitik), Büyüme 999 TL/ay (3 işletme, + Pulse AI, AI analitik, menü, anket; öne çıkan), Zincir 2.499 TL/ay (10 işletme, + Google yanıtı, öncelikli destek); yıllık = 10 ay; İngilizce sayfa USD 15/29/69. 10+ işletme: iletişim. İşletme sınırı `SubscriptionPlan.maxBusinesses` → `src/lib/plan-limits.ts` (owner işletme eklerken 403 `PLAN_BUSINESS_LIMIT`, yeni işletme sayfası önceden uyarır, sahip olduğundan küçük plana ödeme `?payment=plan_too_small`; admin sınırsız; deneme süresinde sınır yok). TR fiyat sayfası TL gösterir (`PublicPlan.tryPrices`), kartla ödeme düğmesi PayNKolay env yoksa görünmez. Süresi dolan kart dönemi `User.plan='expired'` → panel `/pricing?plan=expired`'e yönlenir. Admin `/admin/plans` → "Önerilen yapıyı uygula" paketleri yerinde günceller (silmez). 2026-11 migration'ı canlı paketleri bu yapıya getirdi.

**`PublicPlan` projeksiyonu (`src/lib/subscription-plans.ts`):**
- `priceMonthly`: aylık liste fiyatı (indirimsiz)
- `priceYearly`: **aylık-eşdeğer** yıllık fiyat (`Math.round(priceYearlyTotal / 12)`) — sadece kart başlığı "₺X/ay" için
- `priceYearlyTotal`: **canonical yıllık toplam** — admin override > formula `discountedMonthly × 12 × 0.8`. Marketing kartı "X TRY/yıl" satırı + billing summary tutar hesabı buradan beslenir
- `discount.discountedMonthly`: indirim sonrası aylık tutar

**Rounding disiplini (CRITICAL):**
- Yıllık toplam tutar gerektiğinde **her zaman `priceYearlyTotal`** kullan; `priceYearly × 12` **YASAK** — `Math.round(total / 12) × 12 ≠ total` rounding error'ı marketing × 12 ≠ admin'in yazdığı tutar bug'ına yol açar.

**Canonical resolver (`resolveBillingAmount(plan, billingCycle, currency)`):**
- Owner billing summary + admin member billing modal aynı helper'ı kullanır
- Input: `AdminPlanRow | null` + `'monthly' | 'yearly' | null` + `'TRY' | 'USD'`
- Output: `{ amount, amountYearlyTotal, amountMonthly, source: 'override' | 'formula' | 'none', tierName, cycle }`

**`BillingSubscription.subscriptionPlanId` FK (§38.200):**
- `String?` → `SubscriptionPlan.id`, `onDelete: SetNull` (audit history korunur)
- Nullable + backwards-compat: mevcut row'lar `null` kalır → legacy `plan` field'ı (lifecycle bucket) intact
- Migration: `prisma/migrations/20260524000000_billing_subscription_plan_link`

**Legacy `BillingSubscription.plan` field anlamı (rewrite):**
- `trial | monthly | yearly | enterprise | free` — **tier'ı değil**, cycle + lifecycle bucket'ını temsil eder
- Yeni billing flow'larında `subscriptionPlanId` (tier) + `billingCycle` (monthly/yearly) ikilisi canonical
- `plan` field'ı `PLAN_QUOTA` / `PLAN_QUOTA_AI_REPLIES` quota lookup için kalır

**Admin endpoint'leri:**
- `GET /api/admin/members/[id]/billing` → `{ user, subscription, catalog }`. `catalog` = aktif tier'lar + pre-computed `monthlyAmount` / `yearlyAmountTotal` / `yearlyAmountMonthly` (modal client-side resolver çalıştırmaz).
- `PUT` body: `subscriptionPlanId?: string | null` + `billingCycle` + manuel `amount` (override). Audit log payload'ında before/after.

**Owner endpoint:**
- `GET /api/billing/summary` → `{ ..., amount, yearlyTotal, currency, billingCycle, subscriptionPlanId, tier: { id, name, isFeatured } | null }`. Tier ismi locale-aware (TR/EN), `planLabel` öncelik sırası: tier name > `PLAN_LABELS[plan]` > raw key.

**Admin form (`src/components/admin/PlansManager.tsx`)** — paket CRUD'da yıllık fiyat input'u. Boş bırakılırsa placeholder canlı hesap gösterir: `Otomatik: ${monthly × 12 × 0.8}`. YearlyDisplayHint admin'e public sayfada görünecek "aylık eşdeğeri"ni önizler. Stale override koruması: admin aylık'ı değiştirip yıllık'a dokunmazsa form auto-clear (`yearlyTryTouchedRef` flag).

**MemberBillingModal (`src/components/admin/MemberBillingModal.tsx`)** — admin per-user billing edit:
- "Paket (marketing tier)" dropdown: `catalog` üzerinden DB-driven (Starter/Growth/Pro), boş = legacy/manuel akış
- "Plan (lifecycle bucket)" dropdown: trial/monthly/yearly/enterprise/free (cycle + lifecycle anlamında)
- Tier seçilince cycle default 'monthly', amount placeholder kanonik tutar; admin elle yazarsa override (`amountTouchedRef` flag, RotateCcw "Kanonik tutara dön" butonu)
- Tier+cycle birlikte set olduğunda "Marketing /pricing eşi" reassurance satırı: tier ismi · cycle · ₺X/ay (+ yıllık toplam)

**Yapma:**
- Public sayfada `priceYearly × 12` ile yıllık toplam üretme — `priceYearlyTotal` kullan (rounding-safe)
- Admin MemberBillingModal'da tier dropdown'unu hardcode etme — `catalog` field'ından gelen tier'ları kullan (DB-driven parity)
- `PLAN_LABELS[plan]` ile tier ismi türetme — eğer `subscription.tier?.name` doluysa onu öncelikle göster
- `BillingSubscription.plan` field'ını tier ismi gibi kullanma — sadece lifecycle/cycle bucket'ı (quota lookup için)
- Tier silinmiş subscription'larda hata atma — `onDelete: SetNull` sonrası `subscriptionPlanId` null'a düşer, legacy `plan` field'ı fallback

**Yap:**
- Yeni billing UI'ı yazarken `resolveBillingAmount()` helper'ından geç → marketing pricing ile parity garanti
- Yeni tier alanı eklerken hem `toPublicPlan` hem `resolveBillingAmount` döner — ikisi de aynı plan row'undan beslenir, drift yok
- Admin override için her zaman `amount` field'ı yaz (tier-derived'in üstüne); UI'da "override aktif" rozeti göster (sezonluk indirim vb. için)

### 15.3 ContactFloat — sağ alt sohbet baloncuğu form'u

`src/components/marketing/ContactFloat.tsx` — marketing surface'inde sticky lead-capture widget (chat-style bubble + inline form, `/contact` sayfasına gitmeden direkt `/api/contact` POST).

**Mount koşulları:**
- `src/app/[locale]/layout.tsx:240` — `[locale]/*` tree'sinin tüm sayfalarında mount edilir (marketing + dashboard); component kendi içinde gizleme kararını verir.
- Component-içi gating — `auth/*`, `onboarding/*`, `dashboard/*` ve `/contact` (tam form zaten orada) path'lerinde **deterministik** gizli; ayrıca auth probe sonrası logged-in user'larda gizli. Sabit CTA şeridi silindiği için ofset mantığı (`buaze:sticky-cta-visibility`) da kaldırıldı; düğme bir kez nabız atar, "çevrimiçi" noktası yok. Path-based dashboard gate kritik: async auth probe çözülene kadar (~50-200ms) baloncuk owner panelde flash etmez. **Homepage hariç değil** — ana conversion surface'ında baloncuk görünür.

**Bot guard parity:** `/contact` sayfasıyla aynı honeypot + dwell-time gate (`MIN_FILL_MS`).

**Yapma:**
- Homepage'de gizleme — eski exclusion (`current === base`) kullanıcı raporu gereği kaldırıldı. Marketing'in en kritik conversion sayfası, bubble orada görünür kalmalı.
- Logged-in kullanıcılar için ContactFloat mount etme — panel kullanıcılarının kendi support kanalları var, sağ alt widget gürültü.
- Bubble auto-show timing'i (6sn) düşürme — çok agresif, dismiss rate yükselir.

---

## 16. Claude Design Handoff — Referans

`.design/` klasörü Claude Design'dan gelen JSX prototipleri + canvas HTML + chat log içerir (22 dosya, git-tracked: root 3 + `pulse/` 6 + `site/` 13). Pulse marka kimliği (graphite/lime/pure white) + ~38 sayfalık site tasarımı kaynağıdır.

**Kritik kural:** `.design/*.jsx` **doğrudan `src/`'ye kopyalanmaz** — yalnız referans olarak okunur. Pulse token'lar zaten `globals.css` `@theme {}` bloğunda, font'lar `src/components/root/fonts.ts`'te yüklü, logo `src/components/marketing/BuazeLogo.tsx`. Uygulanan kararlar §11 (renk + typography) + §12 (menü temaları) + §15 (Pulse AI) + §17 (utility class'ları).

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

Pulse redesign faz log'u (8 phase, PR #39-#48) §38'de konsolide edildi; ayrı `design.md` 2026-05-12'de kaldırıldı, tarihsel ayrıntı `git log` üzerinden erişilebilir.

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

Pulse design 15 draft PR'da uygulandı (PR #39 → #53). Tarihsel commit detayları için `git log`. Aşağıda **kalıcı kararlar** — tasarım kararları için §11, menü için §12, Pulse AI için §15.

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

Güncel (2026-11, §51): `MarketingFooter` / `MarketingNavbar(Client)` / `MobileBottomNav`, `NewsletterSignup`, `ContactFloat`, `BuazeLogo`, `PlatformLogo`, `FeaturePageLayout`, `SolutionPageLayout`, `ComparisonLayout`, klasörler `home/`, `commercial/`, `company/`, `footer/`, `heroes/`, `three/`. **Silindi, geri ekleme**: `AnimatedCounter`, `MarqueeRow`, `StickyCtaBar`, `SocialProofToast`, `VideoModal`, `WatchDemoButton`, `HomeIndustryTabs`, `LiveReviewTicker`, `HomeHeroDashboard`, `HomeHero`, `PulseIllustrations`, `FooterLiveTicker`, `PricingFaq`, hero varyantları (`HeroStarClimb`, `HeroParallax`, `HeroVariantPicker`, `NEXT_PUBLIC_HERO_VARIANT`) ve `src/components/animations/` klasörünün tamamı (§34.5).

### Faz log'u

Pulse redesign 15 draft PR zincirinin tarihsel detayı `git log` üzerinden erişilebilir (eski `design.md` 2026-05-12 cleanup'ta kaldırıldı). Kalıcı kararlar §11 + §12 + §15'te.


---

## 18. E-posta + Storage Env'leri

> **Kanonik kaynak:** `.env.example` — tüm env'lerin tam listesi orada (build script `node scripts/validate-env.js` ile zorunluları doğrular). Aşağıdaki tablo seçilmiş highlight'tır; çatışma halinde `.env.example` baz alınır.

**Stratejik karar:** Yeni external provider eklenmiyor. Resend (mail) + Supabase Storage (dosya) + OpenAI (Pulse AI) + PayNKolay (kartla ödeme, §44; 2026-11'de Dodo Payments'ın yerine) yeterli.

| Env | Zorunluluk | Etki |
|---|---|---|
| `RESEND_API_KEY` | Opsiyonel | Eksikse `sendResendEmail` `false` döner; mail akışı sessizce kapanır ama gözlemlenebilir log basar |
| `RESEND_FROM_EMAIL` | Opsiyonel | Varsayılan `"Buaze <noreply@buaze.com>"`; domain Resend'de doğrulanmış olmalı |
| `NOTIFICATION_EMAIL` | Opsiyonel | Restoran `notification_email` set değilse default alıcı; ROI/contact/careers fallback |
| `CAREERS_INBOX_EMAIL` | Opsiyonel | HR ayrı kutu; yoksa `NOTIFICATION_EMAIL` fallback |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_STORAGE_BUCKET` | Opsiyonel | Careers attachment + site-settings görselleri; eksikse 503 |
| `CRON_SECRET` | Cron kullanılıyorsa | `/api/cron/*` endpoint'leri `Authorization: Bearer ${CRON_SECRET}` zorunlu |
| `IP_RETENTION_DAYS` | Opsiyonel | Default 90; KVKK IP anonimleştirme cron'u için |
| `PAYNKOLAY_ENV` + `PAYNKOLAY_SX` + `PAYNKOLAY_SX_LIST` + `PAYNKOLAY_MERCHANT_SECRET_KEY` + `PAYNKOLAY_MERCHANT_NO` + `PAYNKOLAY_BASE_URL` | Opsiyonel | PayNKolay kartla ödeme (§44). Eksikse kartla ödeme düğmesi `?payment=unavailable`'a düşer; admin manuel fatura akışı çalışır. `PAYNKOLAY_ENV` (`live` \| `test`) zorunlu ve varsayılan sunucu YOK: izinli iki host'tan birini seçer; `PAYNKOLAY_BASE_URL` opsiyonel, verilirse o host'a birebir eşit olmalı (aksi halde config `null`). Gizli değerler yalnız runtime (Coolify'da "Available at Buildtime" kapalı). Kayıtlı kart / otomatik yenileme env'leri (`PAYNKOLAY_CARD_STORAGE`, `BILLING_VAULT_KEY`, `BILLING_HMAC_KEY`, …) `.env.example`'da; hepsi varsayılan kapalı. |
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

### 19.1.2 NAP parity + şirket kimliği (footer + contact + JSON-LD + mail)

**Şirket (2026-11-20, kullanıcı kararı):** Buaze, **NEXTGEN YAZILIM EĞİTİM İNŞAAT SANAYİ VE TİCARET LİMİTED ŞİRKETİ** (NextGen Yazılım Ltd. Şti.) markasıdır — L'Affogato'yu işleten şirketle aynı. Tek kaynak `src/lib/legal/company-entity.ts` (`COMPANY_ENTITY`): unvan, Tuzla adresi, Tuzla V.D. vergi no, MERSİS, telefon; değerler laffogato reposundaki vergi levhasıyla doğrulanmış `src/lib/legal/entity.ts`'ten alındı. Şirket bilgisi değişirse **iki repoyu birlikte** güncelle.

- **Hukuki metinler** `{{COMPANY_NAME}}`, `{{COMPANY_ADDRESS}}`, `{{COMPANY_TAX_ID}}`, `{{COMPANY_PHONE}}` değişkenlerini kullanır (`src/lib/legal/variables.ts`); varsayılanları `COMPANY_ENTITY`'den gelir, canlı değerler `legal_variables` tablosunda (admin → Hukuki metinler → Değişkenler) ve `20261120090000_company_entity_nextgen` migration'ı ile bu değerlere çekildi. `tests/company-entity.test.ts` varsayılan ↔ migration ↔ mail altbilgisi eşliğini korur.
- **Yüzeyler** `getCompanyFacts()` üzerinden: footer `<address>` (unvan · adres · support@buaze.com + MERSİS / vergi satırı), /contact, /about ve /press "şirket bilgileri", locale layout Organization JSON-LD (`legalName`, `taxID`, MERSİS `identifier`, yapılandırılmış `PostalAddress`). Sicil numaraları yalnız admin'deki unvan `COMPANY_ENTITY.legalName` ile aynıyken basılır (`registry`).
- **E-posta altbilgisi** (`renderFooter`) her mailde gönderen kimliğini taşır: "Buaze, <unvan> markasıdır. <adres> · MERSİS <no>" (6563 sayılı Kanun, ticari elektronik ileti).

**Yapma:** `hello@`, `info@`, ad-hoc email'ler kullanma — tek public Buaze kutusu `support@buaze.com` (şirketin `info@nextgenlab.com.tr` adresi Buaze yüzeylerinde kullanılmaz). Unvanı kısaltıp hukuki metne yazma; kısa ad (`shortName`) yalnız dar alanlar içindir. "Buaze Bilişim A.Ş." / "Workinton Maslak" gibi eski yer tutucuları geri getirme — böyle bir tüzel kişi yok.

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

**Kullanım pattern'i (platform sayfası / sihirbazı):**
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
- Yeni provider eklerken: `PROVIDER_DOMAINS` + `PROVIDER_LABELS` (validation) + `PROVIDER_MAP` (field mapping) + `PATH_RULES` (path heuristic, opsiyonel) + platform sayfası listesi güncelle.
- Test endpoint kullanan yeni caller eklerken `runPlatformLinkTest` import et, `source` field'ını yeni bir literal ile geçir (`'manual' | 'cron' | 'retest_all' | <yeni>`). Helper string kabul ediyor — schema değişikliği yok.

#### 19.4.2 Platform Redirect Analytics (Dalga 3a, 2026-05)

> **2026-11 (§38.257)**: `PlatformRedirectsPanel` hiçbir sayfaya bağlı değildi; panel ve tek tüketicisi `GET /api/restaurants/[id]/redirect-stats` silindi. Olay kaydı (`POST /api/platform-redirect`, `PlatformRedirectEvent`) çalışmaya devam ediyor; bir rapor yüzeyi gerekirse yeniden yazılır.

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
- Yeni provider eklerken `VALID_PROVIDERS` set'ini güncelle (`platform-redirect.ts`). Aynı zamanda `integration-domains.ts` `PROVIDER_DOMAINS/LABELS` + `platform-link-test.ts` `PROVIDER_MAP` + platform sayfası listesi + `platform-redirect-resolver.ts` `PROVIDER_FIELDS` + `PLATFORM_ID_TO_PROVIDER` (5 nokta — CLAUDE.md §19.4 / §19.4.3 yapma listesinde).
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

#### 19.4.6 Franchise görünümü — "Tüm işletmeler" + linki diğer işletmelere uygula (2026-11, §49)

- `/dashboard/platforms` çok işletmeli sahipte iki sekme: **Bu işletme** (mevcut tek işletme sayfası) / **Tüm işletmeler** (`?view=all`). Matris `src/lib/platform-portfolio.ts` `buildPlatformPortfolio()` ile kurulur — aynı `platform-link-status` modeli, dolayısıyla hücre ile işletme sayfası asla farklı durum göstermez. Sütun = en az bir işletme için görünür yorum platformu; hücre = o işletmenin platform sayfası linki; "Yalnız düzeltilecekler" filtresi; "Tüm işletmeleri kontrol et" işletme işletme sırayla `/integrations/retest` çağırır (işletme başı rate limit).
- **Düzeltilecek** tanımı: sorunlu link VEYA hiç çalışan yorum linki yok. Eklenmemiş platform bir seçenektir, sorun değildir (restoran sektörü 8 platform önerir; hepsini eklemek gerekmez).
- Sosyal / mesaj platform sayfasında (Instagram, Facebook, WhatsApp) kayıtlı link `ApplyLinkToBusinesses` kartıyla diğer işletmelere kopyalanır: her işletme kendi `PUT /api/restaurants/[id]`'si ile (aynı doğrulama, yetki, audit), sırayla; işletme başı sonuç listelenir. **Yorum platformlarında yok** — her şubenin kendi Google / Yemeksepeti sayfası vardır.

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
- `/[locale]/dashboard/page.tsx` — owner home tek kurulum kartı gösterir: işletme yoksa `<OnboardingNudge>`, varsa `<ActivationChecklistCard>` (seçili işletme, mobilde de görünür; Stage 170).

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

### 21.11 Trial reminder mails

`src/lib/trial-reminders.ts` `runTrialReminders()` — günlük `/api/cron/lifecycle-emails` çalışmasının ikinci adımı (2026-11'e kadar ayrı `trial-reminders` cron'uydu, §21.39).
- `User.lastTrialReminderAt` field'ı dedup için (20-saat threshold)
- **Sadece 1 ve 3 gün kalan trial user'lara mail gönderir** (`TRIAL_REMINDER_DAYS = [1, 3]`). Kullanıcı başına trial sürecinde max 2 mail. SQL window 4 güne kadar geniş, precise filter helper içinde.
- Usage hesabı (tek `$transaction`): son 14 gün vs önceki 14 gün (growth %), ortalama puan, yorum sayısı, **Pulse AI ile gönderilen yanıt sayısı** (`feedbackReply.count({ source: 'ai_copilot' })`).
- Sender: `sendTrialEndingEmail` (Pulse `trial-ending` template); gönderimler arası `MAIL_SEND_GAP_MS` (550 ms, Resend 2 istek/sn).
- **Eşikleri değiştirmek**: `TRIAL_REMINDER_DAYS` tek değişiklik noktası.

### 21.12 Cron path listesi (mevcut)

`vercel.json` `crons` array'inde **14 entry** (2026-11'de 16'dan indi, §21.39). Tek source-of-truth: `vercel.json` — schedule için her zaman ona bak.

**Cron hata maili (§38.241, kanonik)**: Vercel, cron uç noktası 2xx dışı yanıt dönünce "cron run failed" maili atar. Tüm cron route'ları `export const GET = withCronGuard('/api/cron/<ad>', handleCron)` ile sarılır (`src/lib/cron-guard.ts`): gerçek Vercel çağrısında (`user-agent: vercel-cron`) handler'ın 5xx yanıtı veya fırlattığı hata **200 + `{ ok:false }`** olarak döner ve Sentry'ye (`tag cron`, cron başına tek issue fingerprint) yazılır. 401 korunur (CRON_SECRET bozuksa görünür kalmalı). Manuel/admin tetiklemede gerçek status döner. `tests/cron-guard.test.ts` her `vercel.json` cron'unun sarıldığını doğrular — yeni cron eklerken sarmayı unutursan test kırılır. Not: Hobby planda günlük cron saat içinde rastgele dakikada tetiklenir (04:00 → 04:59 gözlendi); Sentry `automaticVercelMonitors` yalnız Pages Router `pages/api` route'larını sardığı için bu projede hiç çalışmıyordu ve kaldırıldı.

| Path | Schedule (UTC) | Amaç |
|---|---|---|
| `/api/cron/expire-impersonation-sessions` | `0 1 * * *` | Süresi dolan destek oturumlarını kapat |
| `/api/cron/monthly-health-snapshot` | `0 2 1 * *` | Aylık sağlık snapshot'ı (§43) |
| `/api/cron/anonymize-ips` | `0 3 * * 0` | KVKK IP retention |
| `/api/cron/process-scheduled-deletions` | `0 3 * * *` | 30 gün dolan hesap silmeleri |
| `/api/cron/platform-link-retest` | `0 4 * * *` | Platform link sağlık kontrolü (§19.4.4) |
| `/api/cron/feedback-autodraft` | `0 5 * * *` | Pulse AI taslak güvenlik ağı (§43) |
| `/api/cron/google-reviews-autodraft` | `0 6 * * *` | Google yorum taslakları (§43) |
| `/api/cron/google-reviews-alert` | `0 7 * * *` | Düşük puanlı Google yorumu uyarısı |
| `/api/cron/lifecycle-emails` | `0 8 * * *` | Owner günlük mailleri: lifecycle kuralları (§21.34) + deneme hatırlatması (§21.11) |
| `/api/cron/weekly-digest` | `0 9 * * 1` | Haftalık rapor (§21.38) + aynı çalışmadan ops özeti |
| `/api/cron/rating-drop-alert` | `0 11 * * 1` | Haftalık puan düşüşü uyarısı |
| `/api/cron/monthly-newsletter` | `0 12 1 * *` | Aylık bülten |
| `/api/cron/monthly-health-report` | `0 13 1 * *` | Aylık sağlık raporu maili (§43) |
| `/api/cron/billing-renewals` | `0 6 * * *` (Vercel test sözleşmesi; üretim Coolify saatlik `25 * * * *`) | Faturalama motoru: mutabakat, dönem sonu, tombstone, tarama, saklama (§44.3) |

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

Yeni grafiklerde `src/components/charts/MeasuredChart.tsx` paterni tercih edilir (§5.3).

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

**Layout metadata** (`src/lib/root-metadata.ts` `siteIcons()` + `src/app/[locale]/layout.tsx`):
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

### 21.26 DB-driven mail content (29 template dosyası, 22 DB-driven — Pulse + lifecycle + ROI + verify-email + audit + Wave B-C + render-only ops surfaces)

> **Güncel sayım (2026-11, §21.39)**: 6 gürültü maili + `onboarding-complete` kaldırıldı → `src/lib/email/templates/` = **29 template dosyası**, `SUPPORTED_MAIL_KEYS` = **22** (seed 44 row). Aşağıdaki sayımlar bu kaldırmadan öncedir.
>
> **Önceki sayım (2026-10, §38.241)**: müşteri kampanya maili özelliği kaldırıldı — `customer-campaign`, `owner-campaign-approved`, `owner-campaign-rejected` template'leri silindi. `src/lib/email/templates/` = **34 template dosyası**, `SUPPORTED_MAIL_KEYS` = **28** (seed 56 row). Aşağıdaki tarihsel sayım bu kaldırmadan öncedir.
>
> **Sayım** (2026-05-15 Wave D, §38.195): `src/lib/email/templates/` toplam **35 aktif template**. DB-driven olan 31'i `SUPPORTED_MAIL_KEYS`'te listelenir ve `scripts/seed-mail-templates.ts` 62 row upsert ile (31 × 2 locale) seedlenir. Wave D yeni template: `new-device-login` (fuzzy UA major + IP /16 fingerprint, login flow sync trigger). Tarihsel: Wave A 24 → Wave B 28 → Wave B4 30 → Wave C 34 → Wave D 35. Geri kalan 4 template **render-only** — public `send*Email` wrapper'ları yok, caller `render*()` + `sendResendEmail` inline kullanır: `contact-admin`, `owner-segment-mail`, `roi-admin-notification`, `roi-customer-report`. Tarihsel evrim: Phase 21.26 9 Pulse template, 21.27-21.34 lifecycle (4) + ROI (2) + verify-email (1) → 16; §38.105 campaign moderation (customer-campaign, owner-campaign-approved, owner-campaign-rejected) + §38.180 audit-completed → 20 DB-driven; Wave A audit 4 render-only render dosyasını da kataloga ekledi → 24; Wave B (§38.192) 4 yeni DB-driven template ekledi — `password-changed` (B1, security alert), `team-member-joined` (B2, owner notification), `team-member-removed` (B3, owner audit), `first-feedback-celebration` (B5, activation moment) → 28. Yeni template eklerken DB-driven ise `SUPPORTED_MAIL_KEYS` + seed + bu sayıyı senkronize tut; render-only ise sadece bu sayıyı + §38.A audit notunu güncelle.

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

Cron-driven, idempotent owner lifecycle email'leri (2026-11 itibarıyla 3 kural, aktif işletme başına; bağlam işletme başına 4 sorgu yerine toplam 2 `groupBy` ile kurulur, kullanıcılar en yeniden eskiye taranır — §21.39). Orijinal 4 email type — welcome (Phase 21.6) + trial-ending (Phase 21.11) zaten mevcut, bu Wave B onların etrafına context-aware reminder + reactivation katmanı ekler.

**4 yeni email:**

| Type | Trigger | Cooldown | Hedef |
|---|---|---|---|
| `qr_not_downloaded` | account ≥ 1 gün, `QrGeneration.count = 0` | lifetime once | onboarding sonrası QR'a hiç dokunmayan owner |
| `first_feedback_tips` | `QrGeneration.count > 0`, ≥ 2 gün önce indirildi, `Feedback.count = 0` | lifetime once | QR var ama yorum yok — yerleştirme/çağrı tipleri |
| `upgrade_suggestion` | `Feedback.count ≥ 50`, `plan ∈ {trial, starter}` | 30 gün | yüksek hacim + düşük plan = upgrade fırsatı |
| ~~`inactive_reactivation`~~ | **2026-11'de kaldırıldı (§21.39)** — aktivite `user.updatedAt`'ten okunuyordu, giriş bunu güncellemiyor; her gün panele giren sahiplere "uzun süredir görüşemedik" gidiyordu | — | — |

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

Pazartesi 09:00 UTC tek cron: işletmelere AI-zenginleştirilmiş haftalık rapor, ardından aynı çalışmanın sonucundan `hello@buaze.com`'a kim mail aldı özeti.

**Akış:**
1. `0 9 * * 1` — `/api/cron/weekly-digest` çalışır → her aktif restoran için son 7 günlük stats + 30 yorum metni (tek `$transaction`) → `extractWeeklyInsight()` (gpt-4o-mini, ~$0.0002/restoran) → Pulse `weekly-report` template'i içine "PULSE AI ÇIKARIMI" section'ı gömülerek gönderilir.
2. Aynı çağrıda `sendWeeklyDigestOpsSummary(result)` → Pulse `weekly-digest-summary` template'i ile `hello@buaze.com`'a (env override `OPS_DIGEST_SUMMARY_EMAIL`) her satırda gerçek gönderim durumuyla özet. **2026-11 (§21.39)**: eskiden ayrı bir 10:00 cron'u `runWeeklyDigest({ dryRun: true })` ile tüm sorguları ve Pulse AI çağrılarını ikinci kez çalıştırıyor, her satırı "gönderildi" diye işaretliyordu.

**Yeni dosyalar:**
- `src/lib/weekly-insight.ts` — `extractWeeklyInsight()` saf helper (gpt-4o-mini + 24h cache + fail-safe fallback). Output: `{ summary, recommendation, source }`. CLAUDE.md §15 `chatCompletion` reuse, `MIN_TOTAL_FOR_AI = 1`, `MAX_COMMENTS_TO_SEND = 30`.
- `src/lib/email/templates/weekly-digest-summary.ts` — ops-internal template (DB-driven copy yok, hardcoded inline; admin override edilemez). Hero counts (sent/skipped/optedOut/failed) + recipient table (restaurant + total + avg + AI badge + status).
- `sendWeeklyDigestOpsSummary()` (`weekly-digest-runner.ts`) — weekly-digest cron'u içinden çağrılır, `OPS_DIGEST_SUMMARY_EMAIL` env yoksa `hello@buaze.com` (ayrı summary cron'u 2026-11'de silindi).

**Genişletilen dosyalar:**
- `src/lib/email/templates/weekly-report.ts` — `WeeklyReportParams.aiInsight?` field eklendi. Render template'i graphite + lime accent dot ile "PULSE AI ÇIKARIMI" section'ı; copy field'ları `aiEyebrow / aiTitle / aiRecommendationLabel` (DB-driven, admin override edilebilir).
- `src/lib/email.ts` — `WeeklyDigestParams` `aiInsight` taşır; yeni `sendWeeklyDigestSummary()` sender.
- `src/app/api/cron/weekly-digest/route.ts` — `runWeeklyDigest()` shared helper'a refactor. `dryRun` parametresi: true → mail göndermez, sadece recipients listesi döner (CLAUDE.md §21.13 self-fetch antipattern bypass). Artık `comment` text'leri de fetch eder (AI bağlamı için, max 30 yorum).

**Idempotency + cost:**
- AI cache key: `${restaurantId}:${ISO-week}` — aynı haftada cron retry'da OpenAI'ya tekrar request gitmez.
- Maliyet: ~$0.0002 × N restoran/hafta = haftalık ~$0.02 (100 restoran). 24h cache ile cron retry yapılırsa cost 0.
- AI key yok / hata → `summary` ve `recommendation` boş string + `source: 'fallback'`. Mail rendering AI section'ı **gizler** (graceful degrade).

**Recipient flow:**
- Ops özeti gerçek `emailSent` değerini gösterir (aynı çalışmadan gelir).
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


### 21.39 Mail temizliği + Gmail-güvenli stil + düşük Vercel yükü (2026-11, kanonik)

**Kaldırılan mailler (geri ekleme, kullanıcı talebi gerekir):** `new-device-login` (Chrome her 4 haftada ana sürüm değiştiriyor, mobil IP dönüyor → sahibin kendi cihazına "başka cihazdan giriş" uyarısı; girişteki 2 ek sorgu da gitti), `first-feedback-celebration` (aynı yorum için düşük puan uyarısıyla birlikte gidiyordu, her public yorumda ek count sorgusu), `first-reply-celebration` (sahip az önce kendisi yanıt verdi), `team-member-removed` (sahip üyeyi kendisi çıkardı; audit log yeter), `qr-no-scans-reminder` (14 günde bir sonsuz tekrar + `first-feedback-tips` ile çakışma; cron silindi), `inactive_reactivation` (yanlış aktivite sinyali), `onboarding-complete` (kayıttaki hoş geldin mailinin ikizi; Google ile kaydolanlar artık `welcome` alıyor). Eski `LifecycleEmailLog`/`MailTemplate` satırları DB'de kalır, okunmaz; `LifecycleEmailType` eski literal'leri yalnız log filtresi için tutar. Korunanlar: password-changed, data-export-confirmation, impersonation-start (gerçek olayda gider).

**Gmail-güvenli `<style>` (`layout.ts`):** Gmail çözemediği CSS'te veya 8192 karakter üstünde bloğun tamamını atar. `CORE_CSS` (ilk blok) yalnız element/sınıf/soy seçici + tek `max-width:600px` media query; `CLIENT_FIX_CSS` (ikinci blok) attribute/id/child seçicili istemci düzeltmeleri. `@import` yok (font yalnız `<link>`), CSS yorumu yok. `tests/mail-render.test.ts` bunu zorlar. Stil tamamen silinirse (Gmail uygulaması + Gmail dışı hesap) bazı mailler 375px'te 20–50px taşar; o istemci varsayılan "sığdır" ile küçültür — bilinen sınır, şablonların hybrid düzene geçişi ayrı iş.

**Güvenilir gönderim:** yanıt sonrası gönderilen her mail `after()` içinde (eskiden `void send…()` — Vercel fonksiyonu dondurursa kayboluyordu); `sendResendEmail` 429'da `retry-after` (500 ms–2 s) bekleyip bir kez dener ve teslim kaydını await eder; cron döngüleri `MAIL_SEND_GAP_MS` (550 ms, Resend 2 istek/sn) bekler.

**Vercel yükü:** cron 16 → 13 (`trial-reminders` → `lifecycle-emails` içine, `weekly-digest-summary` → `weekly-digest` içine, `qr-no-scans-reminder` silindi; özet artık sorguları/AI çağrılarını ikinci kez çalıştırmıyor). Lifecycle bağlamı işletme başına 4 sorgu yerine toplam 2 `groupBy`. Public yorum POST'u mail modülünü yalnız 1–3★'da yükler.

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

**`@layer components` (kanonik, 2026-10)**: `bz-*` bloğu `globals.css`'te
`@layer components { ... }` içindedir. Tailwind v4 utility'leri
`@layer utilities`'te olduğu için artık `bz-*` sınıflarını ezebilir
(`className="bz-input h-9"` gibi bir override gerçekten uygulanır). Önceden
blok katmansızdı ve katmansız CSS katmanlı utility'yi her zaman yendiği için
override'lar sessizce çalışmıyordu. Tek istisna kasıtlı katmansız kalan
mobil iOS guard'ı: `input/textarea/select.bz-input` 640px altında 16px
(auto-zoom önleme) — bu utility'lerle ezilmemeli. Yeni `bz-*` sınıfı
eklerken bloğun **içine** yaz.

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
| `APSwitch` | **Kanonik switch** (sm/md/lg, lime #C6F24E + 240ms Apple easing, locked/loading state, label+sublabel slot). Notification settings görsel referans. Eski `Toggle` primitive Stage 97 §38.177'de silindi. |
| `PulseSelect` | **Kanonik form select** (combobox listbox, iOS chevron fix, lime focus ring, `bz-menu` dropdown). Tek-seçim persistent value için. **Portal-aware** (Stage 105 §38.185): listbox `createPortal` ile `document.body`'ye render edilir, KPI card stacking context trap'leri elimine. Desktop `position: fixed` z-80 + `getBoundingClientRect()` sync hesap; mobile `.bz-menu--sheet` intact. |
| `PulseMenu` + `PulseMenuItem` + `PulseMenuLabel` + `PulseMenuDivider` | **Kanonik action menu** (Radix `DropdownMenu` wrap + `bz-menu` styling). Row actions, header dropdowns, transient command list için. Radix a11y baseline (arrow keys, type-ahead, ESC, portal collision, focus restore). |
| `ProgressBar` | `role="progressbar"` + `aria-valuenow` |
| `Skeleton` (+ `TableSkeleton` + `CardSkeleton`) | Shimmer placeholder primitives |
| `Modal` | Backdrop-blur dialog: ESC handler, body scroll lock, sm:bottom-sheet, focus trap + restore. **`closeGuard?: () => boolean`** (audit §38.B) — when it returns true at close time (backdrop click or ESC), shows an in-place "are you sure?" confirm instead of dropping unsaved form input; the X button still closes directly. `closeConfirm?: {title,body,confirm,cancel}` for i18n (default TR). Wired in owner + admin business-create modals. |
| `Field` | Label + hint + error wrapper |
| `RadioCard` | Büyük tıklanabilir radio (default/platform seçimleri) |
| `Tabs` (+ `TabItem`) | `role="tablist"` + `aria-selected` + Arrow keys keyboard nav |
| `PlatformChip` | Brand chip + label (Google/Yemeksepeti/Getir/Trendyol/Tripadvisor/Foursquare/Custom) |
| `PLATFORMS` | Platform config map (label/short/color/urlHost) |
| `BuazeWordmark` | "buaze." text logo |
| `LegendDot` | Chart legend swatch |
| `StarRow` | 5-star inline display (lucide Star) |
| `PageHeader` | Eyebrow + h1 + description + actions (panel page üstü) |
| `WizardSteps` | Panel sihirbazlarının adım göstergesi (gri iz, aktif adım beyaz, biten adım lime tik; `canSelect` ile tıklanabilir adımlar). Denetim sihirbazı, admin şablon sihirbazı, menü kurulumu ortak kullanır (§38.249). |

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
- **Phase 3.3 (aynı PR)**: AdminDashboard'a `<AdminOverviewWidgets />` eklendi — Recently joined (Avatar + plan Badge ile son 4 kayıt, /api/admin/members'tan client-side fetch) + Needs attention (trial expiring/expired, inactive, no-business, stale empty buckets — sayım hesaplaması client-side derived, ek API yok).
- **Phase 3.4 (aynı PR)**: AdminProfile + AdminApi + AdminSiteSettings + AdminAnalytics header'ları → `<PageHeader>` primitive. AdminAnalytics'de range picker + Export CSV butonu actions slot'unda. AdminSiteSettings'de "Superadmin" lime Badge actions slot'unda. AdminProfile'da italic/uppercase tuhaf header sade Pulse hierarchy'ye geçti. Tüm sayfalarda max-width + page padding standardize (`max-w-[1100px-1200px]` + `px-4 sm:px-7 py-6 lg:py-8`).
- **Phase 4 (PR #99+, branch `claude/phase-4-owner-qr-redesign`)**: OwnerQR (`/[locale]/dashboard/qr`) "Son Üretilenler" history list → 3-col QRCard grid pattern (tasarımdaki "QR yönetimi" görsel hizası). Her kart: tablo/genel label + tarih + platform badge + mono URL preview + Copy/Aç action butonları. Empty state Pulse pattern'ine geçti. OwnerMenu hub (`/[locale]/dashboard/menu`) header → `<PageHeader>` primitive.
- **Phase 5 (PR #100+, branch `claude/phase-5-panel-polish`)**: AdminMailTemplates list + AdminNewsletters list header'ları → `<PageHeader>` + `<StatCard>` migration.
- **Phase 6 (PR #101+, branch `claude/phase-6-final-polish`)**: A11y baseline 2 — `.bz-btn-primary/lime/ghost/icon` `:focus-visible` lime ring eklendi (klavye-only kullanıcılar için).
- **Phase 7 (PR #102+, branch `claude/phase-7-editors-polish`)**: Editor + dev sayfa chrome migration.
- **Phase 8.1 (PR #103, branch `claude/phase-8-alert-banner`)**: Yeni `<AlertBanner>` primitive (`src/components/ui/AlertBanner.tsx`, kind: info/success/warn/danger/lime, opsiyonel onDismiss). 8 sayfada inline alert div'leri tek-satır component çağrısına geçti (announcements, blog, mail-templates, dev/mail-preview, members, customers, users, NewsletterCampaignEditor).
- **Phase 8.2 (PR #104, branch `claude/phase-8-page-header-batch`)**: 7 panel sayfası custom `<header>` + h1 + pulse-eyebrow → `<PageHeader>` primitive. admin/settings, billing, notifications, team, campaigns, reviews + dashboard/restaurants. Page wrapper'lar `mx-auto max-w-[1100-1400px] px-4 sm:px-7 py-6 lg:py-8` standardize.
- **Phase 8.3 (PR #105, branch `claude/phase-8-input-polish`)**: Final cleanup — admin/qr (3 banner), admin/site-settings (3 banner + INPUT const → bz-input), admin/restaurants list + detail (3 banner), admin/page login (1 banner) → AlertBanner primitive. site-settings'in INPUT const'ı `bz-input`'e refactor edildi (8+ field tek değişiklikle). Token-driven hue tutarlılığı %95+ seviyeye ulaştı.
- **Phase 9 (PR #106, branch `claude/phase-9-final-polish`)**: 3 polish iyileştirmesi tek PR'da.
- **Phase 10.1 (PR #107, branch `claude/phase-10-public-review-redesign`)**: Public review surface (`/r/[slug]`) tam yeniden inşa — `.design-pulse-2026/.../admin-and-public.jsx` `PublicReview` ile 1:1. Dark `#0A0A0A` zemin + brand header (logo card initial + isim + adres) + tek beyaz card (24px radius) + 3 step (rating → high redirect/low form → thanks) + `POWERED BY BUAZE`…
- **Phase 10.2 (PR #108 → squash gotcha → restored in PR #109)**: Auth form'larında inline error/notice banner'lar `<AlertBanner>` primitive'ine geçti (4 form × 6 banner: LoginForm 2, RegisterForm 2, ForgotPasswordForm 1, ResetPasswordForm 1).
- **Phase 10.3 (PR #109, branch `claude/phase-10-3-onboarding-polish`)**: Onboarding sayfası (`/[locale]/onboarding`) Pulse polish.
- **Phase 10.4 (PR #110, branch `claude/phase-10-4-menu-magazine-pulse`)**: Legacy customer menu sayfası (`/r/[slug]/menu`, magazin tarzı, 394 satır) Pulse polish'i.
- **Phase 10.5 (PR #111, branch `claude/phase-10-5-trial-expired-polish`)**: `/admin/trial-expired` (kritik conversion sayfası) + `/[locale]/dashboard/guide` step icon brand fix.
- **Phase 10.6 (PR #112, branch `claude/phase-10-6-announcement-banner-pulse`)**: (1) **AnnouncementBanner** (owner dashboard top, 4 severity'li sistem duyurusu): SEVERITY_STYLES paleti `bg-emerald-50/bg-amber-50/bg-red-50/bg-slate-50` Tailwind palette → AlertBanner primitive'in **KIND_PALETTE hex değerleriyle birebir hizalandı** (info: #EFF6FF/#BFDBFE/#1E40AF, success…
- **Phase 11.1 (PR #113, branch `claude/phase-11-a11y-audit`)**: A11y baseline 3 — primitive seviyesinde derin iyileştirmeler.
- **Phase 11.2 (PR #114, branch `claude/phase-11-2-panel-parity`)**: Senior-developer audit'in işaret ettiği parity drift'lerinden 3 yüksek-değerli bulgu kapatıldı.
- **Phase 11.9 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Süperadmin paneli yapısal audit + dashboard rewrite.
- **Phase 11.8 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Final structural audit (Phase 1: Explore agent layout-level compare each owner page vs design source `Owner*` JSX).
- **Phase 11.7 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Restaurant-related screens deep audit.
- **Phase 11.6 (PR #117 add-on, branch `claude/owner-panel-pulse-parity`)**: Phase 11.5 sweep sonrası iki Explore agent ile yapılan derin sub-page audit'i, kalan 9 dosyadaki drift'i kapattı.
- **Phase 11.5 (PR TBD, branch `claude/owner-panel-pulse-parity`, stacked on PR #116)**: İşletme (owner) paneli 1:1 Pulse parity sweep'i.
- **Phase 11.4 (PR #115, branch `claude/implement-buaze-pulse-workspace-odHUj`)**: Süperadmin dashboard 1:1 design parity.
- **Phase 11.3 (PR #115, branch `claude/implement-buaze-pulse-workspace-odHUj`)**: Senior-audit Phase 11.3+ backlog'unun 2 yüksek-değerli kalemi kapatıldı.
- **Phase 11.10 (2026-04-28, sidebar IA pass)**: Owner ve admin sidebar'larında alt plan/abonelik kartı kaldırıldı; bu kart sidebar'ı gereksiz uzatıp dar ekranlarda menüleri aşağı itiyordu.
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
- **Phase 11.21 (PR #277)**: Self-audit follow-up bug bundle.
- **Phase 11.34 (PR #323, branch `claude/ux-polish`)**: 3-bundle UX polish.
- **Phase 11.33 (PR #322, branch `claude/lifecycle-retry`)**: Wave 3+ B — lifecycle email send retry + ops alert. `runRule` artık `sendWithRetry` ile sarılı (`MAX_RETRIES = 1`, `RETRY_DELAY_MS = 3000`); ilk send fail olunca 3sn wait + tek retry.
- **Phase 11.32 (PR #321, branch `claude/audit-fixes`)**: Phase 11.22-11.31 deterministik bug audit fix bundle.
- **Phase 11.31 (PR #320, branch `claude/admin-lifecycle-ui`)**: Wave 3+ A — lifecycle email admin trigger UI (CLAUDE.md §21.37).
- **Phase 11.30 (PR #319, branch `claude/lifecycle-emails`)**: Wave B — lifecycle email infrastructure (CLAUDE.md §21.34). 4 yeni cron-driven idempotent email + `LifecycleEmailLog` model + `applyLifecycleRules` helper + admin editor entegrasyonu.
- **Phase 11.29 (PR #318, branch `claude/activation-checklist`)**: Owner activation checklist (CLAUDE.md §19.5, Wave A — Prompt 3).
- **Phase 11.28 (PR #317, branch `claude/platform-redirect-broken-skip`)**: Wave 4 — broken-skip downstream (CLAUDE.md §19.4.5).
- **Phase 11.27 (PR #316, branch `claude/owner-shell-restore`)**: Owner panel shell restore.
- **Phase 11.26 (PR #315, branch `claude/platform-link-cron`)**: Otomatik retest cron + health API (CLAUDE.md §19.4.4, Dalga 2/3 plan).
- **Phase 11.25 (PR #314, branch `claude/platform-redirect-resolver`)**: Public review platform resolver (CLAUDE.md §19.4.3, Dalga 3b/3 plan).
- **Phase 11.24 (PR #313, branch `claude/platform-redirect-analytics`)**: Platform redirect analytics + owner panel section (CLAUDE.md §19.4.2, Dalga 3a/3 plan).
- **Phase 11.23 (PR #312, branch `claude/platform-link-persist`)**: Persistent platform link tests + manual retest (CLAUDE.md §19.4.1, Dalga 1/3 plan).
- **Phase 11.22 (PR #311, branch `claude/analyze-design-code-BoPyo`)**: Platform Bağlantıları rename + 2-tier link quality (CLAUDE.md §19.4).
- **Phase 10+ (out-of-scope backlog)**: Settings stub pages content (Brand/Integrations/Rules/Team/Billing/Notifications/API), Storybook coverage, visual regression testing (Percy/Chromatic), Mobile native wrap (Capacitor/Expo), Superadmin onboarding flow.

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
| `sentry.server.config.ts` | Server runtime init; DSN fallback `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN`; `includeLocalVariables` yalnız production dışında açık (V8 inspector `Sensitive` sarmalayıcısını aşar, kart token'ı/anahtar sızabilir); `beforeSend`/`beforeSendTransaction` → `scrubSentryEvent`, `beforeSendLog: scrubSentryLog` zorunlu (`src/lib/billing/redact.ts`; edge config da aynı scrubber'ları kullanır) |
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
- `src/app/[locale]/dashboard/layout.tsx` owner panelinin children'ını `<QueryProvider>` ile sarar (pazarlama ve public sayfalar React Query kullanmaz).
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
   - Billing / subscription / invoice flow'ları (PayNKolay §44)
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
  - Önemli integration failure'lar (OpenAI, Resend, PayNKolay — fallback öncesi capture)

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
| `@tanstack/react-query ^5.100` | ✅ Kurulu | `<QueryProvider>` owner panel layout'unda. Yeni client component'lerde `useQuery` ile başla; mevcut fetch+useState pattern'leri opportunistic refactor (§27.1) |
| `@radix-ui/react-{dialog,dropdown-menu,tabs,tooltip,popover,select}` | ✅ Kurulu | Sadece a11y-heavy yeni primitive ihtiyacında. Mevcut `src/components/ui/*` toplu migrate edilmez (§27.2) |
| `firebase ^12.12` | ✅ Kurulu | Sadece Google Sign-in için. Primary auth değil — `jose` JWT + httpOnly cookie (§4) |
| `jose ^6.2` | ✅ Kurulu | Custom JWT auth — edge compatible, Vercel middleware ile uyumlu (§4) |
| `@vercel/speed-insights ^2.0` | ✅ Kurulu | Real-user Core Web Vitals (LCP/CLS/INP/FCP/TTFB). `<SpeedInsights />` `RootHtml` içinde mount'lı (her kök düzen, §52); alt layout'lar inherit eder (§31). Lokal dev'de no-op, sadece Vercel deployment'ta data toplar. Sentry'yi (§26) **replace etmez** — paralel rol |
| `@vercel/analytics ^2.0` | ✅ Kurulu (2026-05) | Page views + custom events. `<Analytics />` `RootHtml` içinde `<SpeedInsights />` ile birlikte mount'lı; ikisi paralel beacon emit eder. RES (Real Experience Score) hesaplaması her iki sample stream'i tüketir — Analytics olmadan RES sample context yetersiz kalıyordu (Vercel dashboard "No data available" uyarısı). Lokal dev'de no-op. Custom event tracking wired değil: 2026-11 itibarıyla projede Web Analytics **kapalı** (Vercel API `web_analytics_not_enabled`) ve özel olaylar Pro plan ister; kurulum hunisi bu yüzden veritabanından hesaplanır (§31.6). |
| `three 0.186.1` (+ `@types/three` dev) | ✅ Kurulu (2026-11, Stage 172) | Yalnız pazarlama sitesinde dekoratif iki sahne (alt bilgi nabız bandı, platform yörüngesi). Kullanıcı açık talebiyle eklendi ("bazı yerlerde three js kullan"); §30.2 gerekçesi: başka bağımlılıkla yapılamayan WebGL sahnesi, sayfa ilk JS'ine girmez (~110 KB brotli ayrı chunk, yalnız yeteneği olan cihazda ve görünüme yaklaşınca). Kurallar §50. `@react-three/fiber`/`drei` EKLENMEZ. |

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
| **shadcn/ui** | ⚠️ Allowed (pattern restricted) | Yasak değil ama 138 mevcut component elle yazılmış (`bz-*` token'larıyla). Yeni complex UI'da yararlı olabilir; eklenirse styled wrapper'ları Pulse token'larıyla **tamamen override etmek zorunda**. 2026-11: shadcn dashboard görünümü paket eklenmeden `bz-*` sınıflarının panel kapsamlı override'ıyla alındı (§49). |

### 30.5 Tetik olduğunda ek edilebilecekler

| Lib | Tetik koşul |
|---|---|
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

`@vercel/speed-insights/next` (Web Vitals) ve `@vercel/analytics/next` (page views) ile gerçek-kullanıcı telemetrisi. Her iki paket `package.json`'da kayıtlı (`@vercel/speed-insights ^2.0.0` + `@vercel/analytics ^2.0.1`); `<SpeedInsights />` ve `<Analytics />` `src/components/root/RootHtml.tsx` body sonunda **birlikte mount'lı** → her kök düzen (`[locale]`, `admin`, `r`, `menu`, `s`, `embed`, `audits`, `dashboard`, `(root)`, §52) bunu kullandığı için tüm panel + marketing + public yüzeyleri kapsar. Yeni layout/route eklerken **ekstra mount koyma** (duplicate beacon).

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
- **Web Analytics proje ayarı (2026-11)**: `qr-code` projesinde Web Analytics **kapalı** — Vercel API sorgusu `web_analytics_not_enabled` döndü. `<Analytics />` bu durumda veri toplamaz; operatör Vercel → proje → Analytics sekmesinden açmalı. Özel olaylar (`track()`) ayrıca Pro plan ister (cron'ların hepsi günlük, proje Hobby planda görünüyor).
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

Yeni route `app/` ağacında otomatik kapsanır (kök düzenler `RootHtml` ile tek `<SpeedInsights />` + `<Analytics />` mount eder, alt layout'lar inherit eder; yeni bir kök düzen de `RootHtml` kullanmalı). Ayrı `<SpeedInsights />` veya `<Analytics />` mount **etme** — duplicate beacon gönderir, quota tüketir + sample drift yapar.

### 31.6 Kurulum hunisi (2026-11, veritabanından)

Kayıt → ilk işletme → ilk QR → ilk müşteri puanı hunisi Vercel olayı yerine veritabanından hesaplanır: `src/lib/activation-funnel.ts` (saf, `tests/activation-funnel.test.ts`) + `getActivationFunnel(days)` (`src/lib/admin-bi.ts`). Seçili aralıkta (30/90/365 gün, NPS ile aynı) kaydolan `restaurant_owner`'lar sayılır; QR ve puan adımları owner kurulum listesiyle (§19.5) aynı tanımı kullanır (işletmelerinden birinde en az bir `QrGeneration` / `Feedback`). Adımlar bağımsız sayılır (QR'sız link ile puan gelebilir). Gösterim `/admin/analytics` → İş zekası → "Kurulum hunisi" kartı ve BI CSV'sinin 5. bölümü. Çerez onayı ve reklam engelleyiciden etkilenmez.

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
| `scripts/seed-mail-templates.ts` | `DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts` | 44 row mail template upsert (22 template × 2 locale, §21.26). Idempotent. Operator "kod default'larına dön" istediğinde de çalıştırılır. |
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

### 34.1 Audit metodu (kanonik)

Yeni ölü kod denetimi yaparken sıra:

1. **3 kategoriye böl** — npm deps, src/ dosyaları, API route'ları + Prisma alanları. Her kategori ayrı agent/pass.
2. **Convention dosyalarını skip** — Next.js auto-load: `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`, `global-error.tsx`, `middleware.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `sentry.{server,edge}.config.ts`.
3. **3-yöntem doğrulama** — statik import + dynamic import + string-action (form action/fetch URL). Üçü de 0 olmalı.
4. **Barrel pattern uyarısı** — `src/lib/X/index.ts` re-export edip caller `import { Helper } from '@/lib/X'` yaparsa, dosya ismi grep'iyle 0 görünür ama aktif. Barrel'i de tara.
5. **CLAUDE.md çapraz kontrol** — §17, §18, §34.2 "hazırda korunan" listesi.
6. **Build doğrulama** — `npx tsc --noEmit` + `npx next build` post-delete (`Compiled successfully` + N static page üretildi).
7. **Stale comment temizliği** — silinen dosyaya yorum referansı parent'larda güncelle.

### 34.2 Hazırda korunanlar (silinmemeli)

Schema'da/kodda var ama 0 aktif callsite — kasten korundu:

| Şey | Sebep |
|---|---|
| `CareerApplication` Prisma modeli | careers/page.tsx form aktive olursa migration gerekmez |
| `AutomationRule` model + `/api/automations/*` route'ları | UI yok, planlı feature |
| `GoogleIntegration` model | OAuth flow setup var, tam bağlantı gelecek |
| `NotificationPreference` model | Schema'da, kod minimal |
| Billing field'ları (`billingAddress`, `taxNumber`, `discountActive`, `discountType`) | PayNKolay ödemesi + admin manual override (§44) tüketiyor |
| `src/lib/api/validate.ts` (`validateBody` Zod helper) | §28 kanonik öneri, yeni high-risk route'lar için |
| 2FA + Sessions backend (`/api/account/2fa/*`, `/api/account/sessions`) | UI silinmiş, magic-code 2FA için backend kalmış |

**Yapma:**
- Geri eklemek için "olabilir gerekir" yetmez — kullanıcı **açık talep** etmeli (§7 scope disiplini)
- `git log --all --diff-filter=D --name-only -- '*FileName*'` ile silme gerekçesini oku, sonra karar ver
- `validate.ts` helper'ını silme — §28 kanonik öneri, gelecek route'lar için bekliyor

### 34.3 False-positive kayıt (silmeden önce dikkat)

`grep -rln "FileName" | wc -l` 0 görünce hemen "orphan" deme:

| Pattern | Yanıltıcı görünüm | Gerçek kullanım |
|---|---|---|
| Barrel re-export | `src/lib/X/index.ts` export, callsite `import { Helper } from '@/lib/X'` | Aktif (3-yöntem doğrulama gerekli) |
| Email template registration | `src/lib/email.ts` `from './email/templates'` barrel | Aktif (24 template `templates/index.ts` üzerinden) |
| Legal template registration | `LEGAL_TEMPLATE_DEFAULTS` from `@/lib/legal/templates` barrel | Aktif (14 template) |
| Cron routes | Frontend `fetch` ref yok | Vercel scheduler tetikliyor (`vercel.json`) |
| Convention dosyaları | Hiç import edilmez | Next.js auto-load (yukarıdaki liste) |
| Comments "git'te korundu" | Stale yorum | Kanıt sayma; gerçek import'a bak |

### 34.4 Kanonik kararlar (tekrarlayan sweep'lerin özü)

Tarihsel her sweep'in özelinde aynı operasyonel kararlar verildi — yeni perf/cleanup pass'i yaparken bunlardan başla:

- **Performance**: `Promise.all` batching, composite index (filter shape match), image `decoding="async"` + below-fold `loading="lazy"`, Recharts AreaChart >14 gün range, Lucide `optimizePackageImports` next.config
- **Lighthouse skip list** (kullanıcı tetiği olmadan dokunma): legacy JS polyfills (browserslist modern target — Lighthouse `nomodule` fetch ediyor), GTM/Yandex tracking (business decision — conversion impact), forced reflow (minified chunk, sourcemap yok), JS execution time (Pulse §11 + Tailwind v4 + Radix kompleksitesi). **Çözüldü (2026-06-03, SEO PR)**: `force-dynamic` root layout kaldırıldı — root layout'tan `export const dynamic = 'force-dynamic'` + `cookies()` read (cookie-banner locale; CookieConsentBanner zaten client-side detect ediyordu §38.110) silindi → `[locale]/*` marketing tree artık ISR'den (`revalidate=3600`) gerçekten faydalanıyor (Vercel CDN edge → crawl budget + CWV kazanımı). Dashboard self-declares force-dynamic; admin layout `cookies()` okur (otomatik dynamic); root `/` page accept-language redirect (dynamic). Ayrıca NAP geo coords Ataşehir→Maslak (address ile parity, §19.1.2) + llms.txt freshness stamp.
- **Cache headers** (§19.3 + §40.6): static asset `public, max-age=31536000, immutable`; owner-scoped `private, s-maxage=N` (15s inbox / 30s KPI / 60s billing); public read `public, s-maxage=60, stale-while-revalidate=300`; mutation no-store
- **Security zero-risk**: X-Permitted-Cross-Domain-Policies + X-Robots-Tag /api+/admin+/r + JSON-LD `jsonLdString()` helper (§37.6) + PII redaction console.error (§37.7) + Permissions-Policy expansion
- **Tracking pixel minimization**: 3rd party `preconnect` (not just dns-prefetch — TLS pre-warm), Sentry release tagging (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`)
- **A11y**: WAI-ARIA 1.2 — non-interactive element + `aria-label` zorunlu `role="img"` (StarRow, LiveReviewTicker, hero rating chips)
- **Auth flow**: bağımsız ön-tetikler `Promise.all` ile paralelize (reCAPTCHA + rate-limit + findUnique). bcrypt sequential kalır (`passwordHash` dependency). OWASP 2024 cost=12.

### 34.5 Historical cleanup timeline (compact)

Detaylı bağlam için `git log` + PR referansı. Bu tablo sadece "neyin silindiği" envanteri.

| Tarih | PR | Scope özet |
|---|---|---|
| 2026-04-30 | #256 | Major orphan sweep — `jsonwebtoken` dep + 14 component (3 root legacy + 2FA UI cards + 8 marketing eski eskiz) + 2 API route (`/api/careers/apply`, `/api/case-studies`) + `zIndex.ts` util + 508KB hero png + 2.1MB public/uploads tasarım dosyaları |
| 2026-05-01 | — | Owner dashboard ana sayfa konsolidasyonu — 4 component (`RestaurantAnalyticsPanel`, `StatsCards`, `DayDistributionChart`, `GoogleConversionPanel`) + 30d window query'ler kaldırıldı; 27→13 Promise.all query |
| 2026-05-01 | — | Slack notification surface removal — webhook field + 4 katman (UI + API + helper + feedback fan-out) |
| 2026-05-01 | — | Analytics chart fix — 90/30g BarChart→Recharts AreaChart; AI sentiment themes (`extract-themes` cache); hour-bazlı dağılım, response time, aspect breakdown |
| 2026-05-01 | — | QR scan tracking — `QrScan` model + `/api/qr-scan` (feedback proxy yerine gerçek conversion funnel) |
| 2026-05-01 | — | Embeddable public review widget — `EmbedView` model + `/embed/[slug]` + `buaze-embed.js` (1-satır iframe + Powered by Buaze footer) |
| 2026-05-01 | #293, #297 | Perf: `/api/feedback/stats` 7-day trend loop → Promise.all; `Feedback` 3 composite index (rating + platform + branch) |
| 2026-05-02 | — | Lighthouse audit: ARIA `role="img"` fix (5 yer); legacy JS + GTM/Yandex + forced reflow skip (operatör tetiği bekliyor) |
| 2026-05-02 | #343 | Hero LCP defer — typing animation 700→2400ms startDelay; subtitle `clamp()`→Tailwind responsive; lucide `optimizePackageImports` |
| 2026-05-02 | — | PageSpeed pass #2: static asset `max-age=31536000, immutable`; 3rd party `preconnect` (TLS pre-warm) |
| 2026-05-02 | — | 3 zero-risk security bundle: X-Permitted-Cross-Domain-Policies + `/api/health` uptime probe + robots `crawlDelay: 2` AI bot; X-Robots-Tag `/api`+`/admin`+`/r`; OG metadata + Apple PWA + Sentry release `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` |
| 2026-05-02 | — | Image attribute sweep — 18 raw `<img>` → `loading="lazy" decoding="async"` (below-fold) veya sadece `decoding="async"` (LCP candidate hero/menu logo) |
| 2026-05-02 | — | Auth flow paralelize — login + Google sign-in 4-tetik `Promise.all` (reCAPTCHA + rate-limit IP/email + findUnique). bcrypt sequential intact. |
| 2026-11-20 | §38.260 | Eski menü oluşturucu bileşenleri (Menu Studio ile değiştirildi): `_components/BulkAddModal`, `CategoryMenu`, `CategoryModal`, `CategoryNav`, `ItemEditorModal`, `ItemList`, `MenuDesignModal` (kaydet-tıklayınca görünüm; yerine yerel taslak + Uygula), `MenuItemRow`, `MenuLivePreview`, `MenuSetupWizard`, `MenuShareModal`, `MenuStatusBar`, `SortableCategoryRow`, `SwitchRow`, `menu-copy.ts` (`buildMenuCopy`; yerine `menu-i18n.ts`), `useMenuBuilder.ts` (yerine `data/*`); `menu-ui.ts` `MENU_INPUT_CLASS`, `MENU_LABEL_CLASS`, `copyText`. Geri eklenmez; yeni menü yüzeyi §12.1 klasör yapısına girer. |
| 2026-11-14 | §38.254 | Pazarlama sitesi yeniden yazımı: `src/components/animations/` (tümü), `HomeHero`, `HomeIndustryTabs`, `MarqueeRow`, `StickyCtaBar`, `WatchDemoButton`, `FooterLiveTicker`, `PulseIllustrations`, `PricingFaq`, hero varyantları, `/blog/google-2026`, 13 yardım makalesi + api-webhook kategorisi (308 yönlendirmeli), `framer-motion` paketi, 30 kullanılmayan çeviri anahtarı (google_compliance_*, siteDescription), ölü CSS (marquee, faq/scb/bzEchoSweep keyframe'leri, brand-ink/paper token'ları). Geri eklemek için kullanıcı talebi gerekir. |
| 2026-10-09 | §38.241 | Müşteri kampanya maili özelliği tamamen kaldırıldı — owner `/dashboard/campaigns` + admin `/admin/campaign-approvals` + `/admin/customer-campaign-templates` + `/admin/notifications` (yalnız kampanya olaylarını taşıyordu) + tüm `/api/customer-campaigns/*`, `/api/admin/campaigns/*`, `/api/admin/customer-campaign-templates/*`, `/api/admin/notifications/*` + 3 mail template + sender + ops alert + `admin-notifications.ts` + `legal/iys.ts` + `/features/campaigns` pazarlama sayfası + `campaignsEnabled` şalteri + rbac `campaigns` kaynağı. **Korunan**: `/api/customers/unsubscribe` (gönderilmiş maillerdeki link, KVKK/ETK) + `customer-unsubscribe-token.ts`; Prisma modelleri/kolonları (veri kaybı yok, DEPRECATED yorumlu); `/admin/campaigns` (QR baskı kampanyası, mail değil); bülten (`/admin/newsletters/campaigns`). Geri eklemek için kullanıcı açık talebi gerekir. |
| 2026-05-12 | (this PR) | Dead code + dead .md sweep — `src/lib/sentiment.ts` (orphan word cloud helper) + `src/lib/buaze/use-in-view.ts` (barrel-only, 0 consumer) + 3 .md dosya (`design.md` 1220 satır 8-phase complete; `performance_report.md` 1189 satır superseded; `docs/RESTAURANT_GUIDE_TR.md` 52 satır help center §22 supersedes); CLAUDE.md §34 compact (880→~200 satır) + §41 future-session note-taking discipline |

---

## 35. SEO Discovery & Structured Data

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

### 35.9 ROI hesaplayıcı (2026-11 modeli)

/roi yalnız **zaman tasarrufu tahmini** yapar: `src/lib/roi/roi-model.ts` (`normalizeRoiInputs`, `computeRoi`) — aylık müşteri × puan oranı × yanıt payı × (elle yazma − Pulse AI taslağıyla) dakika × saatlik maliyet; seçilen planın aylık USD fiyatıyla (DB, `getActivePlans`) karşılaştırılır. Puan artışı, gelir, "filtrelenen yorum", kohort, 12 aylık projeksiyon ve ROI çarpanı yoktur; her çıktı "tahmini" etiketlidir.

- `/api/roi/save` tahmini sunucuda girdilerden yeniden hesaplar (istemcinin sonucuna güvenmez); iki e-posta `after()` ile gönderilir (fonksiyon donunca kesilmesin).
- `generate-insight.ts`: OpenAI yanıtı `BANNED_CLAIMS` ile eşleşirse (filtre, sızma, garanti, kat, kohort, "araştırmaya göre") atılır, `buildRoiTemplateInsight` kullanılır. `leverageKey` kaldırıldı.
- `RoiPdf` iki sayfa, otomatik heceleme kapalı; fontlar gönderimde cdn.jsdelivr.net'ten iner, ulaşılamazsa ek düşer, e-posta yine gider.
- ROI e-posta anahtarları korunur; `netGainEyebrow` artık zaman tasarrufu kartı, `calibrationFooter` tahmin uyarısı. Varsayılanlar `mail-template-defaults.ts`'te şablonla aynı; canlı DB satırı eski metni taşıyorsa admin "Varsayılana dön".
- `revalidatePricing()` /pricing ile birlikte /roi'yi de yeniler.
- **Yapma**: akışı "düşük puanları Google'dan uzak tutar" diye anlatma; tercih oranı (%85 vb.) ya da kohort rakamı yazma.

### 35.10 Bilinçli olarak ertelenen audit bulguları (kullanıcı kararı bekleyen)

Site-wide audit (2026-05) aşağıdaki bulguları işaret etti — fix gerekli ama **marketing pozisyon kararı** olduğu için kullanıcı talebi olmadan dokunulmadı. Stage 94 §38.174 SEO sweep tablonun bir bölümünü kapattı (✅ işaretli satırlar).

| Bulgu | Yer | Karar tetiği / Durum |
|---|---|---|
| `LiveReviewTicker` 4 hardcoded fake testimonial (M.D., A.K., J.A., S.B.) | `src/components/marketing/LiveReviewTicker.tsx` | Component artık `LiveTicker` (generic) ile değiştirildi (Stage 67 §38.148); fake testimonial varyantı reintroduce edilirse kullanıcı UX kararı |
| `SocialProofToast` "Hotel Nora 284 review/month" fake activity feed | `src/components/marketing/SocialProofToast.tsx` | ✅ **KAPATILDI** — Stage 86 §38.166 component removal |
| `customer-stories.ts` 6 fictitious case study (Ark Bistro, Hotel Nora, Derma+, Kahve Dükkan, Law&Co, Spa Ren) Unsplash fotoğraflarla | `src/lib/customer-stories.ts` | ✅ **KAPATILDI** — Stage 94 §38.174 sitemap + ItemList + Article JSON-LD removal; pages remain functional for direct visitors; route-discovery EXCLUDE_DIRS now lists `customer-stories`. Replace with real stories (§19.4.4) before re-indexing |
| Sektör pages metric'leri (+312%, +184%, +62%, +148%, vb.) cohort baseline disclosure'ı zayıf | `src/app/[locale]/solutions/*/page.tsx` (15 sektör) | ✅ **KAPATILDI** — Stage 166 §38.248: rakam kutuları doğrulanabilir ürün gerçekleriyle değiştirildi (10 platform, 14 gün deneme, KVKK, 3 ton Pulse AI, TR + EN); kohort dipnotu kaldırıldı (artık iddia yok) |
| Title length: Contact (16 char) / Solutions (41-44 char) / Pricing (45-48) — `<30` weak signal | İlgili sayfa `generateMetadata` | ✅ **KISMEN KAPATILDI** — Stage 94 §38.174: Contact 16→55, Press 18→58, Careers 15→47, Integrations 22→58, Help 22→52, Case-study 24→53, vs/spreadsheet TR 67→56. Solutions sector titles (41-44) bilinçli kabul (zaten Google range içinde) |
| OG image eksik: Features (fix sonrası), Solutions, Contact, Pricing | İlgili sayfa metadata | ✅ **KAPATILDI** — Stage 94 §38.174 Contact + Pricing + FAQ + Features + features/pulse-ai için `/opengraph-image` root handler wired; analytics-reports + review-management + about hardcoded URL drift'i temizlendi |
| `LiveReviewTicker` + `SocialProofToast` mount call-site doğrulama | Marketing layout / homepage | ✅ **KAPATILDI** — SocialProofToast removed (Stage 86), LiveReviewTicker → LiveTicker generic (Stage 67) |
| `SoftwareApplication` JSON-LD hardcoded TRY 500 price | `src/app/[locale]/layout.tsx` | ✅ **KAPATILDI** — Stage 94 §38.174 `offers` field removed (drift from actual plan DB Pro 1499 / Growth 899 / Starter 499); schema valid without offers, rich result skips price until DB-driven plan injection |

**2026-11 (Stage 172)**: tablodaki kalan maddeler kapandı — LiveTicker ve diğer uydurma canlı akış/alıntı bileşenleri silindi, tüm pazarlama metni §51 kurallarıyla yeniden yazıldı.

**Yapma:** Audit raporu gördüğünde toplu olarak hepsini fixleme — yukarıdaki listede `marketing pozisyon kararı` etiketli olanlar **kullanıcı talebi** gerektirir. Sadece deterministik teknik defect'leri (canonical drift, BCP 47 format, robots.txt host protocol vs.) açık talep olmadan da fix edilir.

### 35.11 SEO içerik pass (2026-06-03, PR #744)

"Site Google'da görünmüyor" raporu sonrası 2 aşamalı SEO PR. **Faz 1 (infra)**: root layout `force-dynamic` + `cookies()` kaldırıldı → `[locale]/*` marketing ISR (`revalidate=3600`) gerçekten devreye girdi (CDN edge, §38.A canary kapandı); NAP geo coords Ataşehir→Maslak parity (§19.1.2). **Faz 2 (content)**, kullanıcı kararıyla:
- **H1 keyword override (§39.3 audit trail)**: kullanıcı marka-slogan H1'lerini SEO için keyword-odaklı yapmayı seçti (Pulse §11 voice override). Hero `HeroCinematic` H1 "Her yorum bir nabız" → "Google yorumlarını QR ile yönet"; `HeroParallax` → "Online itibarını QR ile yönet"; FAQ H1 "Cevaplar" → "Yorum yönetimi SSS"; Blog H1 "İtibar kütüphanesi" → "Yorum yönetimi blogu". Hero animasyon koreografisi etkilenmedi (sadece COPY title metni). `HeroStarClimb` (animated counter yapısı, prod'da render edilmiyor — default cinematic) dokunulmadı.
- **TR blog slug migration**: 4 TR yazı İngilizce slug taşıyordu → Türkçe slug'a çevrildi (DB UPDATE, prod) + `next.config.ts`'e `/tr/`-scoped 301 redirect (link equity korunur; EN postlar `/en/` slug'ını korur).
- **3 pillar TR blog yazısı** (DB-live + `scripts/seed-blog-pillar-posts.ts` idempotent runner, §33): `qr-kod-ile-musteri-geri-bildirimi-toplama-rehberi` / `online-itibar-yonetimi-nedir` / `cok-platformlu-yorum-yonetimi` — 3 ayrı keyword kümesi (QR feedback / itibar yönetimi / çok-platform), cannibalization yok, internal linking + §19.1.1 + §35.8 + §35.9 uyumlu (review-gating wording yok, fake metric yok, customer agency framing). Blog meta TR 170→<160 char + "haftalık" yanlış vaadi kaldırıldı.

**Operatör follow-up (kod dışı, asıl kaldıraç)**: site küçük/yeni domain (6 restoran) + sığ blog otoritesi düşük; Google görünürlüğü rekabetçi nişte aylar alır. Sürekli/derin TR içerik üretimi + backlink + GSC'den sitemap re-submit + URL Inspection "Request Indexing" gerekir. Teknik SEO + on-page artık sağlam.

---

### 35.12 Canonical host = www (kanonik, 2026-09)

**Tek source-of-truth**: `src/lib/site.ts` → `SITE_URL` (env `NEXT_PUBLIC_SITE_URL`,
default `https://www.buaze.com`) + `SITE_HOST` (robots `Host:` için).

**Kural**: Buaze public yüzeyi **www** host'unda servis edilir; apex
(`buaze.com`) hosting katmanında www'ye 301 atar. Yayımladığımız her
`canonical`, `hreflang` alternate, sitemap satırı, JSON-LD `url` ve
`openGraph.url` **www** olmak zorunda.

**Neden**: Apex'i canonical ilan ederken apex'in www'ye 301 atması bir
**canonical döngüsü**dür — Googlebot www'yi çeker (200), HTML apex'i
canonical gösterir, apex tekrar www'ye döner. Google çelişkiyi çözemez ve
sayfayı indeksten düşürür. 2026-09 GSC tablosu bunun sonucuydu: 53 sayfa
indekste, **119** "doğru canonical'a sahip alternatif sayfa" + **24**
"kullanıcı canonical'ı olmadan kopya" = 143 sayfa indekslenmemiş.

**Yapma**:
- Yeni metadata / JSON-LD / sitemap satırında `https://buaze.com` (apex)
  hardcode etme — `SITE_URL` import et. Apex string'i repoda kalmamalı
  (`grep -rn "https://buaze\.com" src/ public/ scripts/` → 0 olmalı).
- Bir sayfada `metadataBase` varken canonical'ı yine mutlak URL yazma;
  `canonical: \`/${locale}\`` relative yeter (metadataBase www'yi ekler).
- `hreflang` `x-default`'u locale başına farklı yazma — **tüm sayfalarda
  `/tr`** (TR primary, CLAUDE.md §22.9). Locale layout eskiden `/en`
  gösteriyordu, diğer sayfalar `/tr` — drift kapatıldı.
- Sayfa `title`'ına marka ön eki koyma. `titleTemplate` zaten `%s | Buaze`
  ekliyor; "Buaze | X" yazmak SERP'te "Buaze | X | Buaze" üretir.

**Yap**:
- Yeni public route eklerken `alternates.canonical` + `languages` (tr/en/
  x-default) ver. Redirect alias route'ları (`solutions/otel` → `hotels`)
  ve `robots: { index: false }` sayfaları (help/search) canonical
  gerektirmez — sadece bu ikisi muaf.
- robots-disallowed endpoint'e `<a href>` verirken `rel="nofollow"` ekle
  (`/api/checkout` paterni) — aksi halde Googlebot linki keşfedip
  "Robots.txt ile engellendi" raporu üretir.
- `WebSite.potentialAction` SearchAction target'ı **gerçekten `?q=` işleyen**
  bir sayfayı göstermeli. Eskiden `/blog?q=` gösteriyordu ama blog yalnız
  `?cat=` okuyor → Googlebot literal `?q={search_term_string}` URL'ini
  taradı. Şimdi `/help/search?q=` (noindex) + robots `Disallow: /*?q=`.

**Deploy sonrası doğrulama** (operatör, GSC):
1. URL Denetimi → `https://www.buaze.com/tr/pricing` → CANLI URL'Yİ TEST ET
   → "beyan edilen standart URL" **www** olmalı. Değilse deploy yayılmamıştır.
2. `robots.txt` → `Sitemap:` + `Host:` www mi?
3. Site Haritaları → `/sitemap.xml` sil + yeniden gönder.
4. "Doğru standart etikete sahip alternatif sayfa" / "kopya" / "404"
   satırlarında **DÜZELTMEYİ DOĞRULA**.
5. GSC'ye **Alan adı (Domain) mülkü** ekle (`buaze.com`, DNS TXT) — www +
   apex tek raporda görünsün, bu karışıklık bir daha gizlenmesin.

Beklenen: ilk hareket 7–14 gün, 143 sayfanın büyük kısmı 3–6 hafta.

**Layout'larda sayfaya özgü metadata yok (§38.245)**: kök ve locale layout'ları
yalnız site geneli varsayılanları verir (metadataBase, titleTemplate, siteName,
varsayılan OG görseli, twitter `card`). Canonical, hreflang, og:url, twitter
başlık/açıklama layout'ta olursa bunları vermeyen her rotaya miras kalır (eskiden
`/menu`, `/r`, `/s` anasayfayı canonical gösteriyordu).

#### 35.12.1 RSC `key` sızıntısı — URL + label birleşen 404'ler

GSC 9 adet `/en/pricingPricing`, `/tr/contactİletişim`, `/en/solutions/hotelsHotel`
tarzı 404 raporladı. Kaynak: `MarketingFooter.tsx` React `key`'i
`key={item.href + item.label}` ile kuruyordu. Footer bir Server Component
olduğu için Next.js bu `key`'i **RSC Flight payload**'una serialize eder ve
payload `self.__next_f.push([...])` olarak HTML'e gömülür; Googlebot inline
script içindeki `/…` ile başlayan string'i URL sanıp kuyruğa alır.

**Yapma**: React `key`'inde URL-şekilli bir alanı başka bir alanla
birleştirme (`key={item.href + item.label}`). Server Component'te `key`
kullanıcıya HTML olarak gider.
**Yap**: `key={item.href}` — zaten benzersiz. Aynı şey `key={\`${slug}-${name}\`}`
gibi slug birleşimleri için de geçerli.

#### 35.12.3 Statik üretim, `<head>` metadata ve sitemap (kanonik, 2026-11)

2026-11 denetiminde "site Google'da çıkmıyor" şikâyetinin üç teknik kök nedeni bulundu:

1. **Kök `src/app/not-found.tsx` `headers()` okuyordu** (2026-05-25'ten beri; 2026-11'den beri kök not-found yerine `global-not-found.tsx` + bölüm `not-found.tsx` dosyaları var, kural aynı, §52). Next.js kök 404 bileşenini HER sayfanın ağacında render eder; tek bir dinamik API çağrısı tüm `[locale]/*` pazarlama sayfalarını istek başı render'a çevirdi (prerender manifest'inde yalnız robots + sitemap vardı; canlıda `cache-control: private, no-store`). **Kural**: `not-found.tsx`, `layout.tsx` ve her sayfada render edilen bileşenler `headers()/cookies()/searchParams` OKUMAZ; dil gerekiyorsa istemcide `usePathname()` (`NotFoundContent` paterni). Doğrulama: `next build` sonrası `.next/prerender-manifest.json` `routes` içinde `/tr`, `/tr/pricing` olmalı.
2. **Streaming metadata**: Next 15.2+ dinamik sayfalarda `<title>`, description, canonical, hreflang ve robots'u `<body>` SONUNA basar; Googlebot ve GPTBot/ClaudeBot/PerplexityBot bu listeye dahil. `next.config.ts` `htmlLimitedBots: /.*/` ile metadata her istekte `<head>` içinde. Kaldırma.
3. **Sitemap çalışma zamanında dosya sistemi tarıyordu**; Vercel fonksiyonunda `src/` olmadığı için anasayfa, fiyatlandırma, özellik ve çözüm sayfaları sitemap'te yoktu. Liste artık `scripts/generate-public-routes.mjs` ile derleme başında `src/lib/seo/public-routes.generated.json`'a yazılır (build script'inde, `next build`'den önce). Yeni sayfa eklerken `node scripts/generate-public-routes.mjs` çalıştır; `tests/public-routes.test.ts` sapmayı yakalar.

Ek: varsayılan hero (`HeroCinematic`) artık doğrudan import edilir (lazy boundary H1'i HTML'in sonuna, `<div hidden>` içine atıyordu); blog/yardım dinamik rotalarına `generateStaticParams` (ISR); sitemap yönlendirilen blog slug'larını ve test/az ürünlü menüleri (`src/lib/seo/indexable-menu.ts`, aynı kural menü sayfasında `noindex`) dışarıda bırakır; blog çiftleri sitemap'te hreflang taşır.

#### 35.12.2 `/[locale]/legal/` segment'i YOK

`src/app/[locale]/` altında **`legal/` dizini yok**; public hukuki sayfalar
kısa slug kullanır: `/kvkk` (`kvkk-aydinlatma` doc), `/cookie`
(`cerez-politikasi` doc), `/ticari-ileti`, `/gizlilik`, `/privacy`, `/terms`.

Buna rağmen 6 canlı link `/legal/...` gösteriyordu ve 404 dönüyordu:
- `CookieConsentBanner.tsx` → `/legal/cerez-politikasi` (root layout'ta mount
  edildiği için **sitedeki her sayfada** kırık link)
- `RegisterForm.tsx` ×4 → `/legal/kvkk-aydinlatma`, `/legal/ticari-ileti`

Hepsi kısa slug'a çevrildi + `next.config.ts`'e 3 adet 301 eklendi (indekste
kalmış URL'ler için). Kanonik public hukuki route mapping (`src/app/[locale]/`):
`/kvkk` → `kvkk-aydinlatma` (TR), `/privacy` → `gizlilik-politikasi` (EN),
`/ticari-ileti` → `ticari-ileti` (TR/EN aynı slug), `/cookie` → `cerez-politikasi`.


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

**Faturalama redaksiyonu ve Sentry temizleyicisi (2026-11, billing spec §14, §44.3)**:
- Faturalama kodu yalnız `billingLog()` ile loglar (`src/lib/billing/redact.ts`): hassas anahtarlar (`token`, `customerKey`, `referenceCode`, `authCode`, `hashDataV2`, `sx`, …; `_`/`-` yok sayılır) `[redacted]`, PAN / uzun base64 / customer-key biçimleri maskelenir, URL sorguları atılır, `Error` yalnız `{ name, code }`; `email`, `ip`, `url`, `body`, `headers` alanları hiç yazılmaz. Sentry'ye giden hata `safeError(err, code)` (orijinal mesaj yok).
- Sunucu + edge Sentry config'leri `beforeSend`, `beforeSendTransaction` ve `beforeSendLog`'da `scrubSentryEvent` / `scrubSentryLog` çalıştırır: `request` sorgusu, çerezleri ve user-agent/content-type dışı başlıkları, faturalama istek gövdesi, breadcrumb/span URL sorguları; **contexts** dahil (kök span'den kopyalanan `trace.data` `http.url`/`http.target`/`url.query`, `nextjs.request_path`): her URL/path sorgusunu kaybeder, `*query` değerleri boşaltılır, `http.client_ip` / `client.address` / `net.peer.ip` ve başlık öznitelikleri silinir. Faturalama olaylarında yığın çerçevelerinin `vars`'ı silinir; üretimde `includeLocalVariables` kapalı.
- PAN koruması ayraç toleranslıdır: kart görüntü alanları (alias, issuer, brand, type) ve onay user-agent'ı için `[0-9]([ .-]?[0-9]){11,}` (UA'da nokta ayraç sayılmaz) hem ayrıştırıcıda hem DB CHECK'lerinde.
- **Yapma**: ham REFERENCE_CODE, dönüş gövdesi ya da sorgu dizgesini log/Sentry'ye verme; yeni bir Sentry config'i `scrubSentryEvent` olmadan açma.

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

#### B grubu — partial (COOP ✅ kapatıldı, CORP backlog)

- ~~`Cross-Origin-Opener-Policy: same-origin-allow-popups`~~ — **✅ KAPATILDI** (Stage 147 §38.227, kullanıcı raporu Firebase Google sign-in popup'unda `window.closed/close` warning'leri + `/api/auth/google` 403). Site-wide enforce; Firebase popup auth intact (`-allow-popups` variant cross-origin popup'a opener context izolasyonu kalır ama same-origin popup'a `.closed/.close` erişimi açar). Resmi Firebase rehberi tam olarak bu değeri öneriyor. **İstisna (§38.245)**: `/__/:path*` (kendi alan adımıza proxy'lenen Firebase `/__/auth/handler` + `/__/auth/iframe`) `unsafe-none` alır — handler'da site COOP'u varken accounts.google.com'a gidiş-dönüş tarayıcı bağlam grubunu değiştirip `window.opener`'ı koparıyordu (pencere kapanmıyor, sonuç iletilemiyordu).
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

**Yap**: Yeni 3rd party script eklenirken (örn. yeni analytics widget, payment provider) C grubu allowlist'i de güncelle.

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

#### Kayıtlı kart tabloları ve hesap silme (2026-11, billing spec §11.6, §44.3)

Hesap silme (`executeUserHardDelete`) artık var; faturalama tabloları bilinçli olarak farklı davranır:

| Tablo | `user_id` FK | Silmede |
|---|---|---|
| `billing_customers` | **RESTRICT** | Kod satırı açıkça siler (önce sağlayıcıda kartlar silinir). Unutulursa `user.delete()` hata verir: mühürlü PayNKolay müşteri anahtarı sessizce yetim kalamaz. |
| `billing_cards` | Cascade | `deleteMany` (yalnız görüntü aynası). |
| `billing_renewals` | — | `deleteMany`. |
| `billing_payments`, `billing_consents` | FK yok | Silinmez; `user_id` = `del_<HMAC(userId)>` takma adı (HMAC anahtarı yoksa rastgele `del_`), tutar ve referans parmak izi kalır: itiraz ödeme kimliğinden izlenir. Onaylar `purgeAfter = now + 10 y`. |
| `billing_vault_tombstones` | FK yok | Sağlayıcı silmesi doğrulanamazsa mühürlü anahtarın **birebir** kopyası (yeniden mühürleme yok, silme anında anahtar gerekmez); motorun faz 6'sı sonra siler. |

Bekleyen ödeme / süren çekim varken silme en çok 7 gün ertelenir (`deferred: 'billing_in_flight'`). Silinmiş hesabın geç gelen başarılı ödemesi dönem açmaz, `needs_review` + iade kuyruğu.

---

## 38. Session History (Stages 1-91) — Compact Timeline

> Bu bölüm 167 stage closure log'unun **compact özetidir**. Detaylı bağlam
> için git log + GitHub PR numarası referansı kullan. Disipline kuralları
> §1-§37'de zaten kanonik; tarihsel "Yapma/Yap" listeleri silindi (drift
> kaynağı). Kalıcı kararlar §40'a (yeni) konsolide edildi.

### 38.0 SESSION CLOSE — 2026-05 Security Audit Final State

5 fazlı audit + 5 follow-up + 1 cascade pass + 1 docs pass = **12 PR,
hepsi merged**.

**Toplam fix sayısı**:
| Severity | Adet |
|---|---|
| 🔴 CRITICAL | 8 (JWT_SECRET fallback, default credentials, dead-code rename, member deactivate session leak, team locations IDOR, Google OAuth CSRF, JSON-LD `</script>` escape, admin session staleness) |
| 🟠 HIGH | 11 (Host header injection, reset session revoke, UserSession DB fail-open, primaryColor XSS, integration URL injection, owner deactivate cookie, members audit log, admin reset weak password, restaurant DELETE owner-only, help body sanitize, render-XSS sweep) |
| 🟡 MEDIUM | 16+ |

**PR index (12 PR `claude/security-vulnerability-audit-x48te` branch'inden merged)**:
#345 Adım 1 public auth hardening · #346 public ingestion · #347 admin auth privileged CRUD · #348 owner multi-tenant IDOR · #349 Google OAuth CSRF · #350 docs · #351 admin session staleness + DELETE owner-only · #352 render-XSS sweep · #353 PII grep · #354 CSP A-group · §38 Prisma cascade audit docs.

**Kalıcı kayıt dosyaları**: `SECURITY_AUDIT_REPORT.md` (5 faz + 5 follow-up
tablolar, deferred rationale, B/C grubu rollout plan) + `CLAUDE.md` §37 +
bu §38.0 özeti.

**Yeni session disiplini**:
1. Yeni endpoint eklerken §37.2 A-H disiplinlerini izle
2. Yeni JSON-LD blok'unda `jsonLdString()` zorunlu (§37.6)
3. Yeni `console.error` PII içeremez (§37.7) — `userId` / `restaurantId` / hash log'la
4. Yeni `@relation` eklerken `onDelete:` explicit yaz (§37.9)
5. Admin password rotate akışlarında `passwordChangedAt: new Date()` zorunlu
6. Restaurant-yıkıcı endpoint için `canDeleteRestaurant` reuse

### 38.A — §38.B Master Backlog (operatör onayı bekleyen + DEFER scope)

🔴 **HIGH (büyük scope, product decision pending)**:
- HIGH 4 Platforms 12-card grid (§38.30) — multi-restaurant aggregate view
- API & Webhook tab UI — owner-facing API erişimi **bilinçle ÇIKARILDI** (Stage 153 §38.233 — kullanıcı kararı: restoran sahibi API erişimi görmemeli, geliştirici konusu, owner için kafa karıştırıcı). Admin `/admin/api` API keys yönetimi canlı + sidebar "Sistem" grubunda. Owner panele API UI **eklenmez**. Kalan: **webhook CRUD** (`/api/webhooks` model + endpoint + delivery log + UI) hâlâ backlog — `/admin/api` + owner platforms webhook "Yakında" honest empty state'te bekliyor.
- 2FA + Sessions + SSO UI (backend kalmış, UI silinmiş, low adoption — §34.1)
- Account freeze + delete backend (Stage 113 §38.193 Wave B4 ile delete grace + cron canlı; freeze ayrı endpoint scope)
- ✅ ~~**Modüler entitlement sistemi**~~ — **KAPATILDI** (Stage 176 §38.258, plan başına modül listesi). Eski not: (Stage 150 §38.230 kullanıcı talebi) — "her pakette modül modül özellik olacak ve modülleri paralı yapacağız". Mevcut `Restaurant.{X}Enabled` master toggle'ları (§5.2) admin manuel; modüler tier-based entitlement gerek (örn. `SubscriptionPlan.features: JSON[]` veya yeni `Entitlement` table). Pattern karar (AskUserQuestion gerek): (a) Stripe/Linear-style metered + usage-based + per-feature limit, veya (b) Notion-style plan tier'ları (Free/Pro/Business/Enterprise) + feature matrix CSV, veya (c) Vercel-style hybrid (plan tier + per-feature top-up). Schema design + admin UI + owner self-service ayrımı + Dodo product mapping (§44 §15.2) + marketing /pricing feature matrix sync gerekecek. Kullanıcı modül listesini belirlediğinde ayrı PR.
- **Marketing feature parity** (Stage 135 §38.215 audit) — owner sidebar'da prominent ama marketing'de detay sayfası yok:
  - `/features/google-reviews` — Google Business Profile entegrasyonu (Stage 125-129 + §43 Reputation OS suite). Auto-draft + rating impact tracking + health snapshot vurgusu.
  - `/features/qr-studio` — QR oluşturma + edit + history + analytics (mevcut `/solutions/qr-generator` sadece design tool).
  - `/features/menu` — DnD builder + 7 tema + analytics (`Restaurant.menuEnabled` master flag + base64-in-DB §3 mimari).
  - Her biri Stage 134 paterniyle ~600 satır + navbar entry + JSON-LD 4-tier (Service + Breadcrumb + FAQPage + HowTo).

🛡️ **Security follow-ups (§38.2)**:
- CSP B grubu (COOP + COEP) — Firebase popup auth runtime test
- CSP C grubu (strict script-src + nonce, Report-Only soak 1-2 hafta)
- RECAPTCHA_ENFORCE flip (1-2 hafta production data sonrası)
- UserSession legacy fail-open re-introduce (Stage 9 backfill + flip)
- Site-settings SVG sanitize (DOMPurify / sharp.png() rasterize)
- KVKK right-to-be-forgotten (User hard-delete + PII anonymize)

🟠 **SEO içerik (Stage 166 §38.248'den kalan)**: sektör sayfalarındaki rakamlar kapandı. Kalan: slogan H1'ler (`sol_*_h1`) ve sektör sayfalarındaki yanlış özellik iddiaları (güzellik: Instagram DM entegrasyonu, randevu yazılımı tetikleyicisi; otel: DE/RU yanıt taslağı, kat/oda tipi analitiği; diş: tedavi bazlı analiz), özellik sayfaları (`features/*`, roi, about, press, pricing, compare, vs/*) rakamları.

🟡 **MEDIUM (cosmetic / minor UX)**:
- Sidebar search input (Cmd+K duplicate gerekçesiyle skip)
- Mobile bottom nav "Yorum İste" FAB (secondary nav drawer migrate koşuluyla)
- KANAL DAĞILIMI shared base component refactor (3+ callsite olunca)
- Customers range filter "30d" default visceral hint
- Site FX deferred: PulseLine + QRScanLoader + RevealHeadline advanced (callsite olunca)
- Mobile MobileCustomers ekranı (page-mobile-v2.jsx eksik)
- Bulk action bar Customers (Kampanya / Segmentle / Arşivle — schema gerek)
- Team invite — pending invites bulk view + toplu resend/revoke (§38.176'da scope dışı bırakıldı, kullanıcı "sadece davetli-side" tercih etti)
- Team invite — email DNS / typo check (`*@gnail.com` öneri) — agent flag etti, scope dışı
- Team invite — "Revoke ≠ delete" distinct action (mevcut hard delete zaten token'ı geçersizleştiriyor, ama UX bug log için ayrı status faydalı olur)

🟢 **LOW (edge case)**:
- 14-haftalık trend chart per-week sentiment gerçek NLP (heuristic kabul §38.34)
- ActivityFeed real-time WebSocket/SSE (sayfa reload yeterli §38.31)
- Server-side Sentry envelope flush (kabullenildi §38.13 — A kararı)
- Prisma 7 upgrade (§5.4 Task 8 — major version, breaking-change rehberi gerek)

### 38.B — Stage Timeline (1-91, 167 closure logs)

Format: `§ref | YYYY-MM-DD | Stage N | scope`. Detaylı bağlam git log +
GitHub PR referansı.

**Stage 1-9 (2026-05-03 → 2026-05-04, Security audit + production fixes)**:
- §38.0 (this) — Security Audit Final State (Stages 1-9, 12 PR)
- §38.7 2026-05-03 — Stage 7 UI temizliği (test-et kaldır, widget admin'e taşı)
- §38.8 2026-05-03 — Stage 8 Görev A/B/C/D Sentry+Google retry+config (PR #377-383)
- §38.9 2026-05-03 — Stage 9 Görev E/F/G cache header + safeParseJson (PR #385-386)

**Stage 10-21 (2026-05-04, Audit pass + cron + prod health + owner panel)**:
- §38.10 — Stage 10 Audit follow-up bundle (4 kod + 4 docs drift fix, PR #390)
- §38.11 — Stage 11 Cron config drift (5 cron'da dynamic/runtime/maxDuration eksik fix)
- §38.12 — Stage 12 Production health (Resend throttle + OpenAI billing alert + connection_limit=1)
- §38.13 — Stage 13 Sentry server-side flush kapatma (A kararı, kabullenildi)
- §38.14 — Stage 14 Owner Panel Pulse 2026 redesign + UX bug fix
- §38.15 — Stage 15 Yorumlar composer UX revize (a11y + Cmd+Enter + auto-regenerate)
- §38.16 — Stage 16 (Phase 8c) Customers CRM (segment + LTV + sentiment)
- §38.17 — Stage 17 Dashboard "BUGÜN BEKLEYEN" segment badge crossover
- §38.18 — Stage 18 Analytics Pulse drift fix (KPI sparkline + AI dark card)
- §38.19, §38.20 — Stage 19/20 (analytics ek paterni — see §38.23 consolidation)
- §38.21 — Stage 21 Weekly digest mail segment context

**Stage 22-31 (2026-05-04 → 05-05, Performance + customer drift + admin platform)**:
- §38.22 — Stage 22 Performance report selective apply (PR-1 minimal scope, PR #523)
- §38.23 — Stage 23 Consolidated PR (admin /customers + topics sentiment + admin badge)
- §38.24 — Stage 24 Analytics heatmap Gün × Saat
- §38.25 — Stage 25 Analytics 14-haftalık trend chart (puan & hacim)
- §38.26 — Stage 26 Restaurant.targetRating schema + Owner Settings UI
- §38.27 — Stage 27 Dashboard 1:1 design parity (greeting + AI banner + KPI 4)
- §38.28 — Stage 28 Dashboard mobile 1:1 parity (hero card + KANAL horizontal scroll)
- §38.29 — Stage 29 Sentry React Suspense reveal collision filter
- §38.30 — Stage 30 Dashboard NABIZ chart 30G/90G/YTD chip toggle
- §38.31 — Stage 31 Dashboard 1:1 final parity (KANAL impact + CANLI AKIŞ + ScopeDropdown)
- §38.32 — Stage 32 Dashboard self-audit follow-up (BUGÜN BEKLEYEN 3-task + duplikasyon temizliği)
- §38.33 — Stage 33 Yorumlar + Google Yorumları 1:1 parity (Timeline + Templates + WeekStats)
- §38.34 — Stage 34 Analytics 1:1 parity (KPI hibrit + tek chart toggle + AI Insights 3-row)
- §38.35 — Stage 35 Yorumlar filter parity (rail status 5-tab unified + Buaze QR platform pill)
- §38.36 — Stage 36 Müşteriler 1:1 parity (filter consolidate + 4-stat + sparkbar)
- §38.37 — Stage 37 Hesabım 1:1 parity (right rail Plan + Invoices + Danger zone)
- §38.38 — Stage 38 5-sayfa audit + PendingTasks → Yorumlar URL drift fix
- §38.39 — Stage 39 Sidebar CTA "Yorum İste" + mobile/sidebar audit
- §38.40 — Stage 40 Leads sayfası tamamen kaldırma + Customers UX iyileştirme
- §38.41 — Stage 41 Dashboard duplicate CANLI AKIŞ + section cleanup
- §38.42 — Stage 42 — see §38.A (deferred Stage)
- §38.43 — Stage 43 Dashboard mobile parity (4 desktop-only section sm:hidden)
- §38.44 — Stage 44 Dashboard masaüstü 2-col grid layout
- §38.45 — Stage 45 Workspace-level Platforms sayfası (HIGH 4 backlog kapanışı)
- §38.46 — Stage 46 Footer brand block duplicate elimination
- §38.47 — Stage 47 Customers tasarım drift kapanışı (churned + lastTopic + lastChannel)
- §38.48 — Stage 48 Wave 1+2 mail churned chip + admin endpoint parity + Bulk Actions

**Stage 49-91 (2026-05-05 → 05-12, HANDOFF migration + design parity + perf cache)**:
- §38.49 — Stage 49 Lint warnings cleanup (78 → 0)
- §38.50 — Stage 50 Analytics tasarım birebir parity
- §38.51 — Stage 51 owner kampanya mail template link audit + 4 broken URL fix
- §38.52 — Stage 52 public review (`/r/[slug]`) auto-advance + mobile UX polish
- §38.53 — Stage 53 anasayfa FAQ section editorial redesign
- §38.54 — Stage 54 footer HANDOFF 1:1 override (fake-data restore, CRITICAL)
- §38.55 — Stage 55 footer compliance rollback (CRITICAL fake-data risk)
- §38.56 — Stage 56 yeni handoff `a/` bundle 7 yüksek-değer drift kapatma
- §38.57 — Stage 57 `a/` bundle minor drift + Campaigns scaffolding + isRead PATCH
- §38.58 — Stage 58 sticky CTA + ContactFloat chat bubble premium editorial
- §38.59 — Stage 59 public review HANDOFF 8-artboard iterasyon
- §38.60 — Stage 60 mobile bottom nav HANDOFF (floating pill + glassmorphism)
- §38.61 — Stage 61 sticky CTA + ContactFloat overlap fix
- §38.62-§38.64 — Stage 62-64 public review HANDOFF iterasyon (8 iterasyon zinciri)
- §38.65-§38.66 — Stage 65-66 HANDOFF §8 step 0/1 (Tokens + Animation engine)
- §38.67-§38.71 — Stage 67-71 HANDOFF §8 step 2-7 (Primitives + Cards + Site FX + Layout)
- §38.72-§38.78 — Stage 72-78 HANDOFF migration (Stage 41 Heroes COMPLETE)
- §38.79-§38.81 — Stage 79-81 owner UX + DangerZone + composer sticky bottom
- §38.82-§38.85 — Stage 82-85 platform filter + marketing perf + frontend drift
- §38.86-§38.88 — Stage 86-88 SocialProofToast removal + Marquee fix + Owner cache batch
- §38.89-§38.91 — Stage 89-91 iOS Safari fixes + bottom nav clearance
- §38.172 — Stage 92 (PR #603) anasayfa Section 4.5 Cohort spacing kompakt (Stage 85 corporate breathing geri çekme, mobile -70px / desktop -108px)
- §38.173 — Stage 93 (PR #604) HeroCinematic eyebrow + rotating caption strip removal (BUAZE PULSE eyebrow + QR oluştur caption + orphan helpers + COPY field cleanup, ~85 satır azalma; cinematic stage 5 sahne intact)
- §38.175 — Stage 95 (PR TBD) Lint cleanup + sector cohort disclosure sweep (2 küçük PR). (Ayrıntı: git log.)
- §38.174 — Stage 94 (PR TBD) SEO audit + marketing content sweep (3 commits). (Ayrıntı: git log.)
- §38.181 — Stage 101 (PR TBD) Skeleton wave 3 — 7 client component'in çift-skeleton anti-pattern fix'i (CLAUDE.md §40.10 server hydration). (Ayrıntı: git log.)

- §38.183 — Stage 103 (PR TBD) Skeleton wave 5 — owner + admin panel structural skeleton sweep (PR #664 "clean slate" reversal). (Ayrıntı: git log.)

- §38.186 — Stage 106 (PR TBD) Owner panel performance + security audit bundle. (Ayrıntı: git log.)

- §38.185 — Stage 105 (PR TBD) PulseSelect portal-aware dropdown fix. (Ayrıntı: git log.)

- §38.184 — Stage 104 (PR TBD) Mobile dropdown audit + 3 fix. Kullanıcı raporu: "dropdown menüler mobilde uyumlu çıkmıyor bu hatayı çözüp tüm componentleri kontrol eder misin mobilde uyumlu mu diye ve tüm owner ve admin panel sayfalarını". 3 paralel Explore agent (dropdown envanteri + owner panel + admin panel) toplam 9… **Disipline (§40.3 ek)**: yeni `PulseSelect` callsite'larında trigger touch target'ı override etme — mevcut `h-11 sm:h-[34px]` mobile 44px + desktop compact 34px pattern intact. Yeni `PulseMenu` className width override'larını mobile için `sm:w-X` paterniyle yaz (mobile sheet variant `width: auto !important` override ediyor). `.bz-menu--sheet` max-height formülüne dokunma — `--dash-bottom-nav-h` CSS variable mobile/desktop otomatik switch ediyor, formül her iki tarafta parity verir. **Audit dokunulmayan (false positive)**: `.bz-input` 16px… (Ayrıntı: git log.)
- §38.182 — Stage 102 (PR TBD) Skeleton wave 4 — owner settings page server hydration. (Ayrıntı: git log.)

- §38.211 — Stage 131 (PR #715) Google Business auto-retry tamamen kaldırıldı — shared API quota anti-pattern. **Disipline (yeni §40.4 ek — shared API quota anti-pattern)**: Proje-geneli quota (Google Business 1/min/proje, OpenAI bulk, Anthropic API tier limit) altında çalışan endpoint'lerde **auto-retry YASAK**. Farklı client'ların retry'ı quota'yı tekrar tüketir → hep birlikte 429 alırlar → owner perspectifinden "hiç çalışmıyor" görünür. Manuel intervention only paterni: sandwich card / alternative action CTA + manuel "Yenile" buton (UI-side cooldown 60s, mash önleyici) + sarı banner (informational). Backend `retryAfterSeconds` field'ı sadece tek-client quota'ları için (rate-limited… **Yapma**: Shared quota durumunda auto-retry tetikleme (exponential backoff bile shared quota'da çalışmaz çünkü cooperative clients arası senkronizasyon yok). Countdown UI'ı auto-retry trigger'ına bağlama — UI cooldown ve retry semantic ayrı concern'ler. `retryAfterSeconds` backend'ten gelmiyorsa "default… (Ayrıntı: git log.)
- §38.229 — Stage 149 (PR TBD) Iyzico removal + checkout JSON→302 redirect fix. **Disipline (yeni §44.5+ ek — provider deprecation pattern)**: Bir external provider planı iptal edildiğinde 3 katman temizliği yapılır: (i) kod tarafı type narrow (TypeScript enum slot drop) + defensive runtime fallback (legacy DB row için 'manual'a düşür), (ii) dokümantasyon (CLAUDE.md backlog item ✅ closed, references future-tense'den past-tense'e, replacement provider'a redirect), (iii) test/migration impact — schema string field'ında migration gerekmez (Prisma enum yerine string kullanılırken yeni constraint yok). **Yapma**: tarihsel closure log Iyzico mentions silme (audit trail bozulur — Stage X §38.X PR # historical context). Schema'dan field tipi drop etmek (DB column'u eski 'iyzico' string'leri tutsa bile defensive runtime narrow ile sorun yok). Migration ile DB'deki eski 'iyzico' row'ları update etmek… (Ayrıntı: git log.)
- §38.230 — Stage 150 (PR TBD) Dodo return-URL 404 hotfix — locale-less `/dashboard/account` segment shim. **Disipline (yeni §44 ek — external return-URL locale-less shim pattern)**: External payment/OAuth provider return-URL'leri tek bir adres kabul eder (pre-flow user locale bilinmez). Locale-aware dashboard route'larında 404 önlemek için **top-level locale-less segment shim** kanonik: (i) Server Component (route handler değil — Vercel finalize çakışma riski yok), (ii) `await searchParams` query string preserve, (iii) `detectLocaleFromAcceptLanguage` (mevcut helper reuse, §7), (iv) `redirect(/${locale}/...)` target locale-aware path'e. Yeni provider eklerken aynı paterni reuse: Stripe… **Yapma**: middleware'de locale-less dashboard redirect eklemek (her request'te overhead — §40 perf disipline ihlali). `DODO_PAYMENTS_RETURN_URL` env'ini locale-spesifik (`https://buaze.com/tr/...`) set etmek (çoklu locale problemi). Cookie-based locale detection eklemek (Buaze'de `NEXT_LOCALE` standardize… (Ayrıntı: git log.)
- §38.231 — Stage 151 (PR TBD) Google Yorumları "işletmem çıkmıyor" — quota=0 (API not provisioned) teşhis + UX fix. **Disipline (yeni §40.4 ek — provisioned vs transient quota ayrımı)**: Proje-geneli shared API quota'larında (Google Business) `quota_limit_value:"0"` = KALICI provision eksikliği (hesap değiştirmek/beklemek çözmez, sadece operatör quota artışı); limit>0 RESOURCE_EXHAUSTED = geçici rate limit (beklemek çözer). UI'da ikisini AYIR — kalıcı durumda owner'ı "farklı hesap/tekrar dene/countdown" ile boşuna uğraştırma, "yapılandırma tamamlanıyor, sizden işlem gerekmez" de. Shared quota 429'unu ASLA retry etme (retry quota'yı katlar). **Yapma**: 429'u tek body imzasıyla (status code) sınıflandırıp tüm 429'ları "geçici rate limit" sanma — `quota_limit_value` parse et. Quota fail'de retry. Owner'a quota=0 durumunda hesap-değiştir önerisi (proje-geneli, hesaba bağlı değil). (Ayrıntı: git log.)
- §38.232 — Stage 152 (PR TBD) Owner + admin panel perf + dead-code/CSS sweep. (Ayrıntı: git log.)
- §38.233 — Stage 153 (PR TBD) Owner + admin panel "bağımsız şeyler" kurgusu — admin honest cleanup (owner API keys UI denendi → kullanıcı talebiyle geri alındı). **Disipline (yeni §40.4 ek — fake/demo data discipline)**: Panel UI'da gerçek görünen hardcoded demo data (DEMO_WEBHOOKS gibi) YASAK — operatör sistem durumu hakkında yanılır (false confidence). Backend henüz yoksa honest empty state + "Yakında" badge; sahte yapılandırılmış kayıt asla. Misleading "API live" claim'leri (route yokken) drift kaynağı — text honest tutulmalı. Çalışan ama nav'da olmayan sayfa = orphan; sidebar'a bağla veya sil. **Disipline (owner audience discipline)**: Owner (restoran sahibi) paneline geliştirici-seviyesi yüzey (API anahtarı, webhook, scope) ekleme — owner için kafa karıştırıcı, kullanıcı net reddetti. Bu tür dev tooling superadmin (`/admin/*`) tarafında kalır. (Ayrıntı: git log.)

- §38.234 — Stage 154 (PR TBD) Backend güvenlik denetimi + öncelikli fix batch + 2 UI fix. **Disipline (yeni §44 ek — webhook idempotency + lazy SDK init)**: SDK-driven webhook handler (eager `Webhooks({secret})` constructor throw'u) modül-load'da hard-fail eder; lazy memoize + missing-secret 503. Idempotency: Svix `webhook-id` header, sadece verified 200 sonrası kayıt (attacker fake id ile dedup tablosunu kirletemez); pre-check existence → short-circuit. Webhook lifecycle handler'larını `source` ile scope et (manuel/provider abonelik izolasyonu). **Disipline (yeni §44 ek — checkout user_id server-inject)**: external payment metadata'sındaki identity claim (`user_id`) ASLA client'tan kabul edilmez; authenticated actor'dan server-inject + client değeri strip (GET query `metadata_user_id` + POST body `metadata.user_id` ikisi de). (Ayrıntı: git log.)
- §38.235 — Stage 155 (PR TBD) Kalan audit bug fix batch + Denetim Merkezi fotoğraf opsiyonu. **Disipline (yeni §40.4 ek — groupBy-for-status-counts)**: bir status/enum kolonunu saymak için `findMany(select status)` + JS reduce yapma; `groupBy({ by: ['status'], _count: { _all: true } })` kullan (bounded, full-table load yok). **Disipline (audit photo)**: yeni soru-tipi medya'sı base64-in-DB (§3); client compress + server size cap çift-katman; documentation-type sorular (file/text correctAnswer'sız) `pass_fail`/`percentage` modunda 0 skorlar — owner scoring mode seçimi sorumluluğu. (Ayrıntı: git log.)
- §38.236 — Stage 156 (PR TBD) İşletme oluşturma: popup → müstakil sayfa + Google Places link arama. **Disipline (yeni §40.4 ek — entity-create: dedicated page > modal)**: çok adımlı/zengin entity oluşturma formlarını modal yerine müstakil route'ta render et — outside-click veri kaybı (closeGuard band-aid) tamamen ortadan kalkar, deeplink/refresh güvenli, mobil daha rahat. Pre-existing kayıt henüz yokken external arama (Places) gerekiyorsa actor-scoped unscoped endpoint aç (`/api/<provider>/...`, restoran-id gerektiren scoped variant'ı klonlama); IDOR-sensitive olmayan (belirli kayıt okumayan, sadece quota riski olan) çağrılarda actor rate-limit yeterli, create-permission gate'ini… (Ayrıntı: git log.)
- §38.239 — Stage 157 (PR TBD) Admin login redesign + Google sign-in hızlandırma + Platform Bağlantıları fix bundle. (Ayrıntı: git log.)
- §38.240 — Stage 158 (PR #760) Owner panel ↔ admin bağlantı + tasarım + backend sweep. **Disipline (yeni §40.4 ek)**: (i) owner server sayfalarında restoran listesi `userId: payload.userId` ile DEĞİL `getScopedRestaurantIdsForUserPayload` ile çekilir (ekip üyeleri dahil); (ii) owner-side kalıcı yazmalar `writePanelAuditLog` ile kaydedilir, targetId = owner userId; (iii) admin'in public yüzeyi etkileyen yazmaları (menü/işletme durumu) `revalidatePublicMenu`; (iv) aynı kod deseni bir dosyada iki kez geçiyorsa betikle ilk eşleşmeyi değiştirme — yenileme kapısı önce yanlışlıkla Google giriş fonksiyonuna düştü, birim testi yakaladı. (Ayrıntı: git log.)
- §38.241 — Stage 159 (PR TBD) Müşteri kampanya maili özelliği tamamen kaldırıldı + Vercel "cron run failed" maili susturuldu. **Disipline (§21.12 + §40.1)**: yeni cron route'u `withCronGuard` ile sarılmadan eklenmez (test kırılır). Bir özelliği kaldırırken dış dünyaya gitmiş linkleri (unsubscribe, indekslenmiş sayfa) kır**ma** — doğrulayıcıyı tut / 301 ver; şema kaldırma ayrı ve açık onaylı karar. (Ayrıntı: git log.)
- **Chat prompt history (Stage 159)**: 2026-10-09 kullanıcı: *"kampanya maili gönderme kısmını da tamamen kaldırır mısın? hepsinden"* → kapsam: owner→müşteri kampanya maili + admin onay/şablon yüzeyleri; bülten ve QR kampanyaları mail-kampanyası olmadığı için kapsam dışı bırakıldı. Ara mesaj: *"ek olarak bana cron run failed hatası geliyor bu hata maili gelmeyecek şekilde de düzenle ve maine push et"*. Hukuki/disipline override yok.
- §38.242 — Stage 160 (PR #762) Owner + admin panel bozuklukları, yorumlar sayfası ve platform bağlantıları. **Disipline**: (i) aynı veri birden çok yüzeyde durum gösteriyorsa durum hesabı tek saf modülde (`platform-link-status` paterni) + test; (ii) panel `<main>` `[&>*]:w-full` kaldırılmaz; (iii) yeni `bz-*` sınıfı `@layer components` bloğunun içine yazılır; (iv) yeni audit aksiyonu → paylaşılan `ACTION_LABELS`'a TR+EN etiket. (Ayrıntı: git log.)
- §38.228 — Stage 148 (PR TBD) Dodo checkout wiring — marketing /pricing CTAs + owner panel inline plan picker. **Disipline (yeni §44 ek — Dodo product ID wiring discipline)**: yeni tier eklenirken admin /admin/plans editöründe `paymentProvider: 'dodo_payments'` + `dodoProductId: 'pdt_xxx'` set ZORUNLU (yoksa marketing + owner panel UI CTA'sı silent fallback'e düşer — kullanıcı "Subscribe" tıklasa register'a gider, beklenmeyen davranış). Bu marketing parity + owner self-service akışı için single config source. Yeni currency eklenmesi gerekirse (EUR/GBP) Dodo dashboard'a yeni product ID + admin paneline yeni field eklemek gerekir (tek-product-per-tier paterni intact). **Yapma**: `<Link>` (Next router) ile `/api/checkout?productId=...` çağırma — `<a>` raw HTML anchor kullan. Next router internal navigation cache + prefetch route handler'ı yanlış yorumlayabilir (Dodo SDK 302 redirect chain'i kesintiye uğrar). API route'a navigate ederken her zaman raw anchor. Wired olmayan… (Ayrıntı: git log.)
- §38.227 — Stage 147 (PR TBD) Firebase Google sign-in COOP fix (CLAUDE.md §37.8 B-grubu kapama). **Disipline (CLAUDE.md §37.8 enforcement)**: yeni 3rd-party popup-based auth/sign-in flow eklerken (Apple Sign-in, GitHub OAuth popup, vb.) COOP `same-origin-allow-popups` site-wide enforce zaten kapsar — özel path override gerekmez. Strict `same-origin` veya `same-origin-allow-popups-to-any-popup` (deneysel) **YASAK** — Firebase popup auth'u koparır. (Ayrıntı: git log.)
- §38.226 — Stage 146 (PR TBD) /admin/plans perf — 3 sequential Prisma read → $transaction batch + production DB rows direct fix. (Ayrıntı: git log.)

- §38.225 — Stage 145 (PR #731) Single-currency USD migration + Pro → Scale tier rename + Dodo product binding. **Disipline (yeni §15.2 ek — USD-only billing)**: tüm yeni billing akışları USD; `priceTry`/`priceYearlyTry` schema field'ları **backwards-compat için** kalır ama yeni tier oluştururken `priceTry: 0` set edilir; admin UI'da gösterilmez (modal hidden + InlinePriceCell USD-only hero). Legacy TRY subscription'lar (mevcut user'lar) tutarlarını korur — `BillingReadOnlyCard.currency` field'ı override path'i (TRY override istenirse admin manuel set edebilir). `toPublicPlan(row, locale)` artık locale (tr/en) sadece **name/description/features dilini** belirler; fiyat her… **Yapma**: Yeni tier'ı TRY fiyatla create etme (priceUsd zorunlu, priceTry: 0 otomatik). Marketing /pricing TRY/USD toggle ekleme (tek currency tasarım kararı). `priceTry` field'ını schema'dan drop etme (backwards-compat — eski user'lar TRY subscription'larında bu field'la kaydedildi). (Ayrıntı: git log.)

- §38.224 — Stage 144 (PR #730) Admin /admin/plans tier card redesign + DB-driven MRR + per-plan user count badge. (Ayrıntı: git log.)

- §38.223 — Stage 143 (PR #728 + this PR) Dodo webhook smoke test fail diagnostic — kök neden apex → www 307 redirect. **Disipline (yeni §44.4+ ek — webhook URL canonical domain)**: External webhook entegrasyonu kurarken provider dashboard'taki webhook URL her zaman **canonical domain** olmalı (Buaze için `https://www.buaze.com/...`). Apex domain → www redirect platform-level 307 dönüyorsa webhook delivery Failed sayar (3xx takip etmez body persistency garantisi yok). Doğrulama: `curl -X POST https://<apex>/api/webhook/xxx` → 307 dönerse provider dashboard URL canonical değişmeli. Vercel apex/www canonical seçimi `vercel.json` veya domain settings'ten 308 (Permanent) vs 307 (Temporary)… **Disipline (yeni §44.4+ ek — webhook handler diagnostic wrapper paterni)**: Yeni webhook entegrasyonu (Iyzico Wave 3.5, Stripe, PayPal, vb.) eklerken signature verify failure path'lerinde Sentry warning + structured diagnostic log (PII-safe — raw secret YOK, sadece length/prefix snippet) ekle. Pattern: SDK Webhooks() → const xWebhookHandler (rename) + yeni POST wrapper → SDK call sonrası status 4xx/5xx ise console.error + Sentry.captureMessage. Bu üretim koşullarında 30 saniyede kök neden tespit sağlar (apex vs canonical, secret mismatch, header eksik, body modification, vb.). (Ayrıntı: git log.)

- §38.222 — Stage 142 (PR #727) Dodo Payments restore — `/api/` path migration + SDK reactivation. **Disipline (yeni §44 ek)**: Vercel App Router'da SDK-driven route handler (Dodo `Checkout`, `CustomerPortal`, `Webhooks` factory exports) eklerken **mutlaka `/api/` altına yerleştir** — top-level `app/<segment>/route.ts` Vercel adapter finalize'da silent çakışma riski (Stage 140 ERROR, runtime log üretmiyor, root cause net değil ama path migration ile geçti). Yeni external provider entegrasyonu (Iyzico Wave 3.5, Stripe, vb.) eklerken aynı disipline uygulanmalı: route handler'lar `src/app/api/<provider>/...` paterniyle. (Ayrıntı: git log.)

- §38.221 — Stage 141 (PR #725 + PR #726) Dodo Payments production deploy ERROR — acute response: dep version downgrade + SDK temp stub. (Ayrıntı: git log.)

- §38.220 — Stage 140 (PR TBD) Lemon Squeezy tam kaldırma + Dodo Payments foundation. (Ayrıntı: git log.)
- §38.219 — Stage 139 (PR TBD) Admin /admin/plans price sync bug + inline price edit + Cmd+K palette. **Disipline (yeni §40.4 ek — admin save → marketing revalidate)**: Admin write endpoint'i public marketing copy etkiliyorsa 4-katmanlı defansif invalidation zorunlu: (i) `revalidatePath(<concrete>)` her locale için, (ii) `revalidatePath('/[locale]/<path>', 'page')` dynamic segment fallback, (iii) response'ta `Cache-Control: no-store, must-revalidate` (admin client refetch fresh data alsın), (iv) public REST endpoint'in `s-maxage` TTL'i admin değişiklik frekansına uygun (10-60s; ISR ile redundant ama defansif). **Disipline (yeni §40.3 ek — inline edit pattern)**: List row'larında sık değişen tek-field state için inline edit (Notion/Stripe paterni). Required vs optional field ayrı handle: required boş submit revert; optional boş submit null (clear override semantic). Auto-focus + select on edit start, Enter/blur commit, Esc revert. Loading state per-row + success toast (downstream impact bilgisi, örn. "marketing'de 30s içinde yansıyacak" — admin "değişmedi" hissi). **Disipline (yeni §40.3 ek — Cmd+K palette mount pattern)**: Tek palette instance + CustomEvent dispatch (CLAUDE.md §38.D) ile çoklu trigger noktası. Desktop topbar + mobile sidebar buttons aynı CustomEvent (`buaze:<panel>-search-open`) dispatch eder; palette tek listener. Fragment root + palette mount OUTSIDE responsive-hidden div (mobile'da display:none gizlerse listener çalışmaz). (Ayrıntı: git log.)
- §38.218 — Stage 138 (PR TBD) Lemon Squeezy Wave 2 — spec audit + 3 API endpoint + admin variant mapping + owner UI CTAs. **Disipline (yeni §44.4+ ek — webhook idempotency single source of truth)**: Self-service action endpoint'leri (cancel/reactivate) Lemon Squeezy çağrısı sonrası DB row'u **preemptive update ETMEZ** — webhook handler 1-2 saniye sonra zaten doğru state'i write eder, double-write drift kaynağı. UI optimism için endpoint response'una `cancelledAt`/`endsAt`/`renewsAt` field'ı dön ama DB tek source webhook. **Disipline (yeni §44.3 ek — JSON:API request shape kanonik)**: Yeni LS endpoint helper'ı eklerken (örn. updateSubscriptionItem) SDK source paterniyle bire-bir hizalan: `{ data: { type, id?, attributes: {...snake_case}, relationships?: {...} } }`. JS SDK `convertKeys` camelCase→snake_case bizde yok — boundary'de manuel snake_case yaz (örn. `test_mode`, `checkout_data`, `product_options`). camelCase boundary'de gönderilirse LS sessizce field'ları drop eder. **Disipline (yeni §44.9 ek — UI 3-state CTA pattern)**: Self-service abone management UI'larında her zaman 3-state branch: (1) no sub → upgrade CTA + /pricing link, (2) active → manage + cancel ikilisi, (3) cancelled-pending grace period → reactivate + "scheduled" caption. cancelAtPeriodEnd flag boolean, edge case değil — UI default state machine. **Yapma**: subscription cancel sonrası DB row update preemptive yapma (webhook tek source). Marketing /pricing checkout butonlarını henüz `/api/billing/checkout`'a bağlama (sonraki PR scope — owner BillingReadOnlyCard'tan link şu an yeterli). Test mode + production mode kombinasyonunda forceTestMode kullanma… (Ayrıntı: git log.)
- **(Stage 140 §38.220'de tamamen kaldırıldı — Dodo Payments'a geçildi. Aşağıdaki Stage 137-139 Lemon Squeezy referansları tarihsel kayıt için korunmuştur, kod artık main'de yok.)**
- §38.217 — Stage 137 (PR TBD) Lemon Squeezy billing foundation — schema + lib + webhook handler + idempotency table + 11 event taxonomy + tests. **Disipline (yeni §40.4 ek — webhook signature + idempotency)**: External webhook handler 3 garantili adım — (i) raw body BEFORE JSON parse (signature exact bytes), (ii) HMAC timing-safe verify (length check first, Buffer.from('hex') try/catch, timingSafeEqual same-length required), (iii) payload hash dedupe via DB UNIQUE constraint (P2002 catch + increment counter, NEVER manual lookup race). Yeni provider için bu 3 adım kanonik. **Yapma**: signature verify atlayıp dispatch'e geçme (fake event → ücretsiz Pro tier mount, security CRITICAL); subscription_cancelled'da DB row silmek (LS cancel = scheduled, owner dönem sonuna kadar erişim); failed handler'da 500 dönmek (LS retry storm); LS amount field'ını MAJOR unit olarak saklamak (LS… (Ayrıntı: git log.)
- §38.216 — Stage 136 (PR TBD) Marketing polish bundle — restoran wording / panelde-nokta / ToastRow card / SectionDivider kompakt / FooterLiveTicker nosnippet. **Disipline (§40.3 ek — hero h1 + h2 noktasız)**: Modern marketing hero h1 + h2 başlıklarında sondaki nokta KALDIRILMALI (Apple/Linear/Stripe pattern). Kullanıcı talebi Stage 136 §38.216 ile pivot edildi; yeni hero/h2 yazılırken nokta KOYMA. **Disipline (§40.4 ek — data-nosnippet pattern)**: SERP snippet'ten gizlemek istediğin dinamik/rotating live content (footer ticker, "az önce çıkan yorum" feed) için `data-nosnippet` attribute root wrapper'a. Visual + SR semantic intact; sadece Google snippet'inde excluded. `aria-hidden` SR'ı bozar (SR kullanıcı içeriği duyamaz); `data-nosnippet` doğru pattern. (Ayrıntı: git log.)
- §38.215 — Stage 135 (PR TBD) Marketing Reputation OS — audit + surveys polish + sitemap priority + feature inventory audit. **Disipline (yeni §40.7 ek — feature page polish 4-item checklist)**: yeni feature detay sayfası eklendiğinde veya mevcut sayfada UX iyileştirmesi yapılacağında 4 kanonik polish item kontrolü — (i) hero h1 cascade `text-[40px] sm:text-[56px] md:text-[52px] lg:text-[76px]` (mobile + smooth cascade + desktop weight), (ii) hero mockup mobile `max-w-[440px] mx-auto sm:max-w-none` (portrait overflow önleme), (iii) AEO H2 pull quote accent (`<blockquote>` border-l-[3px] border-[#C6F24E] + bg-[#EAF9B8]/30 + medium-weight text — featured snippet + visual divider), (iv) sektör cross-link… **Yapma**: 4 polish item'ı tek sayfaya uygulamak yerine farklı sayfalara dağıtma (premium SaaS consistency için tüm feature sayfalarda paralel uygula — Stage 135 audit + surveys başlangıç, gelecek session kalan 4 feature sayfasını sıralı kapatır). Hero mockup `max-w-none` mobile için kullanma (overflow… (Ayrıntı: git log.)
- §38.214 — Stage 134 (PR TBD) Marketing Reputation OS suite — 3 owner panel feature için marketing parity (detay sayfaları + navbar + anasayfa section). **Disipline (yeni §40.4 ek — marketing/panel parity pattern)**: Yeni owner panel feature backend'i tamamlandığında (örn. Stage 100 audit + §38.199 campaigns) marketing parity zaman zaman defer edilir; bu PR sonradan kapatmanın kanonik formu. Çekirdek 4-adım: (i) `/features/<slug>/page.tsx` mevcut paterni (review-management) klonla — hero + AEO H2 + operating loop + spec + FAQ + CTA, (ii) navbar `productCol1` array'ine yeni item ekle (icon + sub label TR/EN), (iii) anasayfa 3-step sonrası "suite" section'a 3-card grid (eğer 3+ feature varsa) veya tekil card mevcut bento'ya… **Yapma**: yeni feature için translations.ts'ye key ekleme (mevcut feature pages 0 key kullanır); navbar'a yeni dropdown column ekleme (mevcut FEATURES sütunu 8 item'a kadar kabul eder); anasayfada yeni section koymadan navbar'a eklemek (UX gap — nav'dan tıklayan kullanıcı detail page'e iner, ama "anasayfada… (Ayrıntı: git log.)
- §38.213 — Stage 133 (PR TBD) Panel fit audit + embed observation removal. **Disipline (yeni §40.4 ek — embed observation pattern)**: SaaS panel'inde "feature × kim/nerede kullanıyor" gözlem UI'larını kullanıcı talebi olmadan ekleme — bilgi asimetrisi (operator vs end-user) güven kırıcı. Buaze pozisyonu "tool, gözetim değil"; feature backbone (tracking endpoint + DB schema) çalışmaya devam, isteyen ileride opt-in analytics ekleyebilir. **Disipline (yeni §40.10 ek — type union sync)**: Yeni page wrapper max-width değeri (Stage 132 tarzı sweep) eklendiğinde `SkPageShell.max?` union'ını da ZORUNLU güncelle (TypeScript invariant). `ignoreBuildErrors: true` (CLAUDE.md §2) bu drift'leri sessizce gizler — type definition + actual usage parity manuel garantide olmalı. **Yapma**: Embed/analytics observation UI'ını operator için "transparency" amacıyla yeniden ekleme (kullanıcı net "isteyen kullansın" dedi). Audit agent'ın "4-col → 5-col" gibi card-count uyumsuz grid önerilerini direkt uygula (design intent verify zorunlu). Stage X sweep'inde type union güncellenmediği… (Ayrıntı: git log.)
- §38.212 — Stage 132 (PR TBD) Panel layout max-width modern SaaS tier (1280/1440/1600). **Disipline (yeni §42.3 modern SaaS tier)**: yeni panel sayfası eklerken **1280 (narrow) / 1440 (default) / 1600 (data-dense)** kullan. Tailwind `max-w-{7xl|6xl|5xl|4xl}` alias'ları ASLA — arbitrary pixel value tercih (pixel-bouncing önleyici). Loading.tsx max prop'u page.tsx wrapper class'ı ile birebir parity (CLS=0, §40.10). Intentional narrow (640 error + 920 wizard) korunur, override talebi closure log'da gerekçesiyle belgelenmeli. **Yapma**: deprecated max-width (1100/1200/1400) yeni callsite'da yazma. Tier hierarchy'yi tek değere indirme (narrow form'lar 1600'de çok geniş hisseder). Marketing sayfalarına panel tier'ı uygulama (marketing kendi `max-w-[1100px]` 64ch readability pattern'ini kullanır, ayrı concern). Page wrapper class'ı… (Ayrıntı: git log.)
- §38.210 — Stage 130 (PR #714) Team list shape drift + missing UI fields in defensive select. **Disipline (yeni §40.4 ek — multi-consumer response shape contract)**: Aynı endpoint birden fazla component'i besliyorsa, response shape contract'ı **tek source-of-truth** olmalı. Defansif multi-shape parser (`data` / `data.data` / `data.members` cascade) drift-tolerant ama kanonik shape comment ile dokümante edilmeli. Yeni consumer eklerken endpoint response shape grep'lenmeli (`grep -rn "fetch.*api/team"` paterni) — header counter vs list rendering gibi paralel akışlarda drift tipik. **Defensive select kuralı**: backend `select` clause "ALL UI-needed projections in, ALL sensitive… **Yapma**: UI'da kullanılan field'ı backend select'inden çıkarma (silent functional gap — UI null/undefined ile çalışmaya devam eder, owner edit modal boş alanlarla açılır). Header counter ile list rendering'i farklı shape parser'larla okutmak (drift kaynağı, header doğru list boş). Sensitive field'ı… (Ayrıntı: git log.)
- §38.209 — Stage 129 (PR #713) Google Business quota resilience — cache TTL strategy overhaul + negative cache + exponential backoff. **Disipline (yeni §40.4 ek — cache TTL strategy for project-shared API quota)**: Proje-geneli API quota (Google Business, Anthropic API, vb.) altında çalışan endpoint'lerde **cache TTL quota window'undan uzun olmalı**: ratio ≥ 2x güvenli (CACHE_FRESH_SECONDS ≥ 2 × quota_window_seconds). Aksi halde aynı dakikada 2+ user cache miss → 2+ Google call → quota burn → infinite loop. **Negative cache zorunlu**: empty response (no results) durumunda DA TTL respect et — `accounts.length > 0` gate gibi koşullar "no results" response'unu hiçbir zaman cache hit yapmaz → her request Google'a gider → quota… **Yapma**: Cache TTL'i kısa tutmak ("data fresh kalsın") — proje-geneli quota'lı API'lerde freshness < availability. Cache HIT ratio yüksek tutmak owner deneyimini iyileştirir, dakikalık veri fark etmez. Empty response'u cache'lememek ("belki sonraki request veri getirir") — quota window içinde belki false… (Ayrıntı: git log.)
- §38.208 — Stage 128 (PR TBD) Google reviews sandwich hint kart koşulunu kaldır — countdown-blocked UX bug fix. **Disipline (§40.4 ek — UI gating + state derived conditions)**: Smart fallback CTA'ları **passive state event'lerine bağlı tutma** (`hasX` flag countdown'a bağlıysa kullanıcı pasif bekler). CTA görünürlüğü kullanıcının **şu an** gördüğü duruma bağlı olmalı (banner var + data boş = direkt alternative sun). Auto-retry tetiklenmesi ek bir gateway olmamalı — eğer eklenirse copy variant ile zenginleştir (örn. "Auto-retry de denedi" vs "Direkt alternative"). (Ayrıntı: git log.)
- §38.207 — Stage 127 (PR TBD) Google reviews auto-retry sonsuz loop fix + manuel intervention hint. **Disipline (yeni §40.4 ek — auto-retry self-reset antipattern)**: Tek-seferlik auto-retry pattern'inde **reset trigger'ı asla auto-retry kendisi olmamalı**. Auto-retry'ın doğası "kullanıcı manuel intervention etmesin diye 1 deneme" — kendini sıfırlarsa "tek-seferlik" anlamını kaybeder ve recursive loop'a düşer. Reset noktaları: (i) mount + scope change (restaurant ID değişimi), (ii) explicit manual button click, (iii) external trigger (OAuth callback success). Auto-retry kendisi → asla. **Smart fallback hint pattern**: auto-retry kullanıldı ama sonuç boş ise, banner içine değil… (Ayrıntı: git log.)
- §38.206 — Stage 126 (PR TBD) Google reviews empty state — CTA hierarchy flip + smart "Bu hesapla devam et" akışı (gerçek dünya gözlemi). **Disipline (§40.4 ek — empty state CTA hierarchy gerçek dünya gözlemi)**: Empty state'lerde **CTA hierarchy product team'in mental model'ine değil, gerçek kullanıcı niyetine göre kurgulanmalı**. Örn. Google Business "no accounts" durumu: product team default varsayım "user yeni profil yaratacak" → "Create profile" primary CTA önerebilir. Gerçek dünya: kullanıcı zaten Business Profile sahibi, sadece farklı hesapta. Bu yüzden "Switch account" primary, "Create profile" tertiary. Empty state'in PRIMARY CTA'sı kullanıcının %80 senaryosunu çözmeli, edge case'ler (no-op, opposite intent)… (Ayrıntı: git log.)
- §38.205 — Stage 125 (PR TBD) Google reviews empty state — false-positive fix + Pulse lime UX + OAuth account switcher. **Disipline (§40.4 ek — Google API rate limit + empty state)**: Quota fail (200 + warning + cache empty) durumlarında "no data" semantic'li final-state mesajlar (e.g., "no business", "no location", "no reviews") **suppressed kalmalı** — sadece quota uyarısı (sarı banner + countdown) gösterilir. Empty state mesajı yalnız `source !== 'empty'` + `retryAfter === null` koşullarında doğru karar veir. Aksi halde owner false-positive "yok" mesajı görür, ürünün gerçek durumunu sorgular. OAuth flow'larında **multi-account scenario** için `prompt=select_account` opsiyonel değil zorunlu… (Ayrıntı: git log.)
- §38.204 — Stage 124 (PR TBD) OG image build hotfix — Stage 123 `new URL(import.meta.url)` paterni Vercel production build'i kırdı. **Disipline (§40.4 ek — Next.js dynamic OG route + static asset)**: Vercel serverless'ta `opengraph-image.tsx` dynamic route + `process.cwd() + 'public/...'` YASAK (`public/` runtime'da resolve etmez). Alternatif YASAK: `new URL(..., import.meta.url)` + co-located asset (webpack PNG asset module rule yok, build pre-render fail). DOĞRU: Static PNG'yi `public/images/` altında tut + layout metadata `openGraph.images = '/images/X.png'` (Vercel CDN-served, her zaman 200 PNG döner). Dynamic OG route sadece ImageResponse + JSX template generation için (runtime SVG/canvas) gerekli… (Ayrıntı: git log.)
- §38.203 — Stage 123 (PR TBD) Vercel production logs audit + 5 fix bundle. **Disipline (yeni §40.4 ek — Vercel runtime log noise discipline)**: (i) Caller-side handled error (timeout fallback, missing optional input) `console.error` + `captureException` YERİNE `console.warn` + `captureMessage` warning-level kullan — Vercel `level=error` filter false-alarm spam'i önler. Real error sinyali korunmalı (network down, auth missing). (ii) Public path'lerde recaptcha token optional ise client tarafında `getRecaptchaToken(...)` fire-and-forget + `keepalive: true` paterni — UX bekletmez, backend log noise sıfırlanır, redirect senaryolarında request kaybolmaz. (iii)… (Ayrıntı: git log.)
- §38.202 — Stage 122 (PR TBD) Owner panel pixel-perfect layout sweep. **Disipline (yeni §40.4 ek — panel select migration scope policy)**: Native `<select>` → PulseSelect migration kuralı 2 istisnayı kabul eder — (i) dark theme container içindeki select (PulseSelect light-tabanlı, dark variant ayrı PR scope), (ii) uncontrolled form select (`name` + `defaultValue` submit-based, controlled state paterniyle compatible değil). Her iki istisna closure log'da gerekçesiyle belgelenmeli; toplu kural ihlali değil, scope creep önleyici disipline. (Ayrıntı: git log.)

- §38.201 — Stage 121 (PR #704) Google Business connection — 7 finding fix bundle. **Disipline (yeni §40 ek — at-rest token encryption pattern)**: (i) Format prefix (`v1:`) zorunlu — version migration için, (ii) Key-missing graceful (production'a güvenli rollout, ops Sentry uyarısı görsün), (iii) Plain text backward-compat decrypt path (lazy migration, schema değişikliği gerekmez), (iv) Decrypt fail Sentry capture + throw (corruption detection, sessizce yutma yasak), (v) Tek konum: helper'da inline message map, abstraction zorlamayalım (§7). (Ayrıntı: git log.)
- §38.200 — Stage 120 (PR TBD) Canonical billing parity + owner campaign template auto-seed. **Disipline (§40 ek — canonical billing parity)**: marketing /pricing kart + admin /admin/plans editör + admin per-member billing modal + admin /admin/billing özet + owner BillingReadOnlyCard **aynı 3 source-of-truth kaynağından** beslenir: (i) `SubscriptionPlan` tablosu (tier definition), (ii) `BillingSubscription.subscriptionPlanId` (tier link) + `billingCycle` (monthly/yearly), (iii) `resolveBillingAmount` helper (cycle-aware amount resolver). Yeni billing UI/endpoint eklerken **canonical helper'dan geç** — manuel hesap YASAK. **Yapma**: marketing'de `priceYearly × 12` (rounding-safe değil); admin modal'da hardcoded plan tier listesi (DB-driven catalog kullan); subscription'da `plan` field'ını tier ismi gibi yorumlama (sadece lifecycle/cycle bucket). (Ayrıntı: git log.)

- §38.199 — Stage 119 (PR TBD) Customer campaign templates — sektör-aware catalog + admin/owner bridge. **Disipline (§40.4 ek — sektör-aware catalog pattern)**: yeni sektör-aware catalog ekleneceğinde 3 garantili adım — (i) tek source-of-truth seed data file (CLI + admin trigger + GET fallback aynı array'i tüketsin), (ii) admin/owner boundary net (admin global yönetir + owner kendi private library + cross-domain CRUD 403 reject), (iii) compliance check zorunlu (CLAUDE.md §19.1.1 + §35.8 + §35.9 — review-gating wording / fake metrics / customer agency). **Yapma**: admin endpoint'inden owner template'ine PATCH (cross-domain ihlali). Owner template'i `isPublished: true` default ile create etme (private library, global picker'a sızar). Seed override'ında `isPublished` reset (admin custom unpublish kararını silmek). Owner UI'da sector picker'ı zorunlu yapma… (Ayrıntı: git log.)

- §38.198 — Stage 118 (PR TBD) Mail brand cleanup + visual breathing room. (Ayrıntı: git log.)

- §38.197 — Stage 117 (PR TBD) Mail system audit — overlap + link drift + mobile guard + cron clustering. (Ayrıntı: git log.)

- §38.196 — Stage 116 (PR TBD) Mail system Wave F — MailDeliveryLog audit table + every sender wired with template name. **Disipline (§40.4 ek — audit log pattern)**: (i) telemetri write fail mail send'i bloklamaz (swallow + Sentry), (ii) Subject / HTML / IP YAZILMAZ tabloya — recipient + template + status + minimal metadata yeter, (iii) her exit path log yazmalı (success path unutulursa "kaybolan mail" forensik query'sinde miss). (Ayrıntı: git log.)

- §38.195 — Stage 115 (PR TBD) Mail system Wave D — new-device-login fuzzy fingerprint. **Disipline (§40.4 ek)**: device fingerprint pattern 3 prereq — (i) fuzzy match window (UA major + IP /16) — strict eq false-positives üretir, browser-only IP signal kaybeder, (ii) first-session skip — `priorAny === 0` durumunda alert fire ETME (UX bug), (iii) human-readable device label (Chrome 120 · 88.123.x.x) mail body'sinde, raw UA + full IP göstermek privacy/length sorunu. **Yapma**: Refresh endpoint'ten `isNewDevice` alert fire etme (token renewal, yeni cihaz değil). Register endpoint'ten alert (hesap yeni, baseline yok). Full IP veya full UA mail body'sine yazma (KVKK §13.9 IP retention disipline'i). (Ayrıntı: git log.)

- §38.194 — Stage 114 (PR TBD) Mail system Wave C — lifecycle expansion (qr-no-scans + rating-drop + first-reply + data-export). 4 yeni template, 2 yeni cron, 2 yeni sync trigger. **Disipline (§40.4 ek)**: weekly threshold-based alert akışlarında 3 prereq — (i) statistical floor (minimum review count) — düşük volume restoranda single review noise alert'lemez, (ii) overlapping baseline yasak — current window baseline'a dahil olamaz (self-dampening), (iii) cooldown ≥ baseline window — aynı sinyalden iki kere fire etme. **Yapma**: cron throttle'sız send (Resend 10/s, 120ms safe). Lifetime cooldown'a sync trigger'da `record-then-check` yapma — `alreadySent` check her zaman send'den önce. Statistical floor'u kaldırma — 1-2 yorumlu restoran rating drop alert spam'ler. (Ayrıntı: git log.)

- §38.193 — Stage 113 (PR TBD) Mail system Wave B4 — account deletion flow (30g grace + cancel-by-token + cron). **Disipline (yeni §40.4 ek)**: destructive lifecycle action akışlarında 3 garantili adım — (i) state mutation `$transaction`'da kilitle (kısmi state'i önle), (ii) session revoke + token mint + mail send + (varsa) UI redirect 4sn buffer ile arka arkaya, (iii) cancel path her zaman idempotent + token timing-attack hygiene (geçersiz/expired generic mesaj, token varlığı leak edilmez). **Yapma**: cron'u in-app cancel path'ine bağlama (cron path independent, in-app fail durumu cron'u etkilemez). Token'ı in-app cancel'da kullanma (auth zaten yeterli). UI'da modal yerine native confirm — destructive action 30g geri-alınabilir olduğu için modal overhead'i gereksiz. (Ayrıntı: git log.)

- §38.192 — Stage 112 (PR TBD) Mail system Wave B — security + team + activation sync triggers. (Ayrıntı: git log.)

- §38.191 — Stage 111 (PR TBD) Mail system audit + Wave A cron hardening + lifecycle opt-out + orphan toggle removal. **Disipline (yeni §40.4)**: Cron için per-row isolation paterni 3 kontrol içerir — (i) outer `try` mail send'i değil **fetch-compute-send**'in tamamını sarmalı; (ii) Prisma fan-out `Promise.all` yerine `prisma.$transaction([...])` ile single-connection (§40.1); (iii) fail path'inde `notifyOpsOfMailFailure` (kullanıcı-facing kritik mail için, §21.33). Yeni opt-out field eklerken **negatif schema field ↔ pozitif UI toggle** paterni: DB `disable*` / UI `receive*` çift-yönlü inversion form boundary'sinde yapılır (her toggle'ı "ON = enabled"… (Ayrıntı: git log.)

- §38.190 — Stage 110 (PR TBD) Auth redirect loop hotfix — login/register sayfaları da `verifyUserTokenForLayout` kullanmalı. **Disipline (§40.4.A genişletme)**: "zaten giriş yapmış mı?" kontrol eden HER sayfa (login/register/oauth callback redirect target'ları) layout ile **aynı** auth verifier'ı kullanmalı. Asimetrik gate redirect loop riski. Yeni page eklerken kontrol et: page hem login-redirect (token varsa dashboard'a) hem auth-required (token yoksa login'e) mantığı varsa, ikisi de `verifyUserTokenForLayout` / `verifyAdminTokenForLayout` üzerinden gitmeli. (Ayrıntı: git log.)

- §38.189 — Stage 109 (PR TBD) Audit API 401 — dashboard/admin layout session check parity. **Disipline (§40.4.A genişletme)**: yeni server-side layout/page eklerken auth gate için bare `verifyJwt` KULLANMA — `verifyUserTokenForLayout` veya `verifyAdminTokenForLayout` tercih et (API gate ile parity zorunlu). `verifyUserTokenForLayout` tier matrix `isUserSessionRevoked` ile parity tutmak ZORUNDA — birinin değişmesi diğerini de değiştirir, aksi halde 401-spam bug'ı yeniden çıkar. (Ayrıntı: git log.)

- §38.188 — Stage 108 (PR #677) Owner + admin panel perf sweep — Promise.all → $transaction batch + cache headers + defensive select + redirect dynamic removal. (Ayrıntı: git log.)

- §38.187 — Stage 107 (PR #677) Marketing perf sweep — orphan asset purge + survey CSS extraction + BuazeLogo decoding. (Ayrıntı: git log.)

- §38.180 — Stage 100 (PR TBD) Admin Denetim Merkezi seed expansion + UI trigger. (Ayrıntı: git log.)

**Out-of-scope**: per-sektör selective seed (sadece health yükle), seed'i geri al (manuel DELETE mevcut), EN locale çevirileri, Vercel cron otomatik koşum. tsc + lint clean.

- §38.179 — Stage 99 (PR TBD) Admin Denetim Merkezi genişletme (stats dashboard + question builder + sidebar IA). (Ayrıntı: git log.)

- §38.178 — Stage 98 (PR TBD) QR template PNG/PDF download capture timing fix. (Ayrıntı: git log.)

- §38.177 — Stage 97 (PR TBD) Panel dropdown + toggle unification (Foundation + demo). (Ayrıntı: git log.)

- §38.176 — Stage 96 (PR TBD) Team invite acceptance wizard + cross-tenant guard. (Ayrıntı: git log.)

- §38.243 — Stage 161 (PR #763) Google Places anında bağlama + analiz, Denetim Merkezi / Anketler / Menü sadeleştirme. **Disipline**: (i) Places içeriği saklanmaz, her faturalı çağrı `reservePlacesCall` ile rezerve edilir (§40.4-J); (ii) düzenleme uçları mevcut soru/seçenek id'lerini korur, kayıp silmeyi onaysız yapmaz; (iii) puan hesabı tek saf modülde, panel puanları 0-100 gösterir (saklama 0-10000). (Ayrıntı: git log.)

- §38.244 — Stage 162 (PR #764) Google Faz 2 + anket/denetim küçük sorunları. **Disipline**: (i) kardeş bileşenlere aynı `key` verme (iki bileşen aynı id'yi kullanıyorsa önek ekle); (ii) sunucu bileşeninde `useSearchParams` kullanan istemciyi `Suspense` içine al; (iii) `useEffect` ile bir kez çalışacak isteği StrictMode çift çağrısına karşı `ref` ile koru; (iv) sürekli geçerli ama koşullu düzen (genişlik + yükseklik) için `[@media(...)]:` değişkenini kullan, tek bir sabit sorguyla JS tarafını eşle. (Ayrıntı: git log.)
- §38.246 — Stage 164 (PR TBD) Kurgusal sayfaların silinmesi (SEO). (Ayrıntı: git log.)
- §38.247 — Stage 165 (PR #769) "Site Google'da çıkmıyor": kök 404'teki `headers()` tüm siteyi dinamiğe çeviriyordu, metadata `<body>` sonundaydı, sitemap'te ana sayfalar yoktu (kurallar §35.12.3); anasayfa metni doğrulanabilir hale getirildi; unvan admin `COMPANY_NAME`'e bağlandı, küfür engeli + e-posta sorumluluk reddi (§47); sektör/özellik sayfası metinleri ertelendi (§38.A). Ayrıca CLAUDE.md sıkıştırıldı: uzun aşama kayıtları ilk cümle + "Disipline/Yapma" kurallarına indirildi (ayrıntı git log). **Operatör**: admin'de COMPANY_NAME/COMPANY_ADDRESS'e laffogato.net'teki unvanı gir; deploy sonrası GSC'de sitemap'i yeniden gönder.
- §38.248 — Stage 166 (PR TBD) Sektör sayfalarındaki doğrulanamayan rakamlar (+%184, %91, 8.2→9.1, "~%85 özel kanalı tercih eder", "üst sıralara çıkarsınız", kurulum dakikaları) ürün gerçekleriyle değiştirildi; `SolutionPageLayout` varsayılanı ve kohort dipnotu güncellendi. **Disipline**: rakam kutusuna yalnız ürünün kendisinden doğrulanabilen değer (platform sayısı, deneme süresi, tema sayısı, saklama süresi); sonuç vaadi (artış %, puan, süre) yok.
- §38.249 — Stage 167 (PR TBD) Denetim Merkezi sihirbazı + yanıt risk kapısı + menü kurulum sihirbazı. (i) Owner `AuditBuilderClient` tek sayfadan 3 adımlı sihirbaza döndü: **Başla** (sıfırdan Kontrol listesi / Test + ad + dil tek kartta; altında işletme sektörüne göre 4 hazır şablon → `?from=` ile 2. adımda açılır, `new/page.tsx` `key` ile yeniden kurar) → **Maddeler** → **Yayınla** (özet + düzenle kalemleri, açıklama, geçme puanı, ek ayarlar). "İleri" yalnız o adımı doğrular, kaydet ilk hatalı adıma döner (`firstErrorInStep` / `stepForTarget` / `pickStarterTemplates`, `tests/audits-wizard-steps.test.ts`). Düzenle modunda adımlar serbest, "Kaydet" her adımda. Adımlar `hidden` ile gizlenir (madde listesinin iç durumu korunur). (ii) Admin `CreateTemplateWizard`: Kimlik → **Sorular** (`AuditQuestionList`, owner ile aynı) → Puanlama & özet; şablon sorularıyla birlikte taslak oluşur; native select → `PulseSelect`; `closeGuard`. (iii) Yanıt e-postası / Google yanıtı risk kapısı (§48). (iv) Menü: `MenuStarter` → `MenuSetupWizard` (§12.1); `applyStarterPreset` yerine `createMenuFromSetup` (kategori + toplu ürün sırayla, ilk hatada durur). (v) Ortak `WizardSteps` primitive'i (§23.3). **Disipline**: sihirbaz adımlarında state'i kaybetmemek için adım içeriğini `hidden` ile gizle (koşullu render değil); doğrulama "İleri"de yalnız o adım, kaydette tümü + ilk hatalı adıma odak; boş durum sihirbazı görünürken aynı adımları gösteren ikinci bir yönlendirici (durum şeridi) gösterme.
- **Chat prompt history (Stage 167)**: 2026-11-08 kullanıcı: *"Panellerseki denerim merkezini daha kolay ui uz ve wizard yap ayrıca kötü yoruma mail yollarken uygunsuz harfleri vs bizi eiske atacak her hardi engelle vw mail gönderilemesin. Sonra menü kısmının wizardını da geliştie ve maine push et"*. Yorum: "uygunsuz harfler" hem uygunsuz kelimeler hem görünmeyen / başka alfabeden benzer / süslü harfler olarak ele alındı. Hukuki/disipline override yok.
- §38.250 — Stage 168 (PR TBD) Panel shadcn teması + franchise geçişi + Platform Bağlantıları + işletme yönetimi. (i) Panel tipografisi Geist / Geist Mono (`src/lib/panel-fonts.ts` + `PanelTheme`, yalnız panel layout'larında), `bz-*` sınıfları `:root:has(.bz-panel)` ile shadcn yoğunluğuna çekildi (8px düğme, 12px kart + ince gölge, segment sekmeler, düz tablo başlığı, 10px menü); `PageHeader` başlık ölçeği küçüldü; kenar çubuğu öğeleri 8px + aktif öğede lime ikon (dış lime şerit kalktı); üst çubuk `h-14` tek satır ekmek kırıntısı. (ii) `BusinessSwitcher` (kenar çubuğu, daraltılmış kenar çubuğu, masaüstü + mobil üst çubuk tek bileşen): arama (5+), son kullanılanlar (6+), klavye, "İşletmeleri yönet / Yeni işletme ekle"; eski daraltılmışta açılmayan dropdown + iki `PulseSelect` kaldırıldı. (iii) `/dashboard/restaurants` kart ızgarası → sıralanabilir franchise tablosu (30 gün yorum + puan, bekleyen düşük puan, platform sağlığı, son yorum, "Panele geç", satır menüsü, "Dikkat" sekmesi; mobilde kart). (iv) Platform Bağlantıları "Tüm işletmeler" matrisi + sosyal linki diğer işletmelere uygula (§19.4.6). (v) Admin + owner üst çubuk flex item olduğu için uzun sayfada 37px'e eziliyordu → `shrink-0`. **Disipline**: panel-özel görsel değişikliği `bz-*` sınıfının kendisine değil `:root:has(.bz-panel)` kapsamına yaz (pazarlama / `/r` aynı sınıfları kullanır); flex sütun içindeki sabit yükseklikli çubuklara `shrink-0`; işletme listesi gösteren yeni yüzeyde `BusinessSwitcher` / `business-switcher.ts` yeniden kullan.
- **Chat prompt history (Stage 168)**: 2026-11-08 kullanıcı: *"paneldeki  https://github.com/shadcndashboard/shadcndashboard bu shadcnyi kullan yazı tipi vs ve component elementleri sistemimize uygun şekilde geliştir ve platform bağlantılarını daha iyi yapıp franchise'lar içinde geçişleri ve sistemi daha klaylaştır ayrıca yönetimi de kolaylaştırıp maine gönder"*. Yorum: referans repo (Vite + base-ui) bağımlılık olarak eklenmedi; yazı tipi (Geist) ve bileşen ölçüleri Pulse renkleriyle panel kapsamında uygulandı. **Disipline override**: §11 font listesi panel için Geist ile değişti (kullanıcı kararı; pazarlama aynı kaldı).
- §38.251 — Stage 169 (PR TBD) Admin franchise yönetimi + çakışma temizliği. (i) `/admin/restaurants`: üç sekme satırı (plan / menü / durum) tek araç çubuğuna indi (görünüm sekmesi + arama + 3 `PulseSelect`); "İşletmeler" görünümü masaüstünde tablo (sahip sütunu + "N işletme · hepsini gör"), mobilde kart; yeni "Franchise'lar" görünümü (`?view=franchise`, `src/lib/admin-franchise.ts` `groupByOwner`) sahip başına grup kartı: işletme/yorum/puan/menü özeti, grup onay kutusu ile zincirin tüm şubelerini seçip toplu duraklat / özellik aç-kapat, "Sahip" / "Şube ekle" (oluşturma formu sahip dolu açılır) / "Listele"; sahip filtresi `?owner=` → API `ownerId` (admin `GET /api/restaurants`, kapsam korunur). Satır menüleri elle konumlanan sabit menü yerine `PulseMenu` (Radix, çakışma algılamalı); oluşturma formundaki iki yerel `<select>` → `PulseSelect`. (ii) `/admin/members`: başlıkta tek ana düğme + "Diğer" menüsü (yenile / CSV / toplu mail), satırda "Düzenle" + menü (detay / fatura / işletmelerini gör), işletme sayısı franchise filtresine bağlı, siyah tablo başlığı sade başlığa döndü. Sahip detayı "İşletmeler" sekmesinde "İşletmeler tablosunda yönet". (iii) `/admin/restaurants/[id]`: aynı sahibin şubeleri arasında "Şube" seçici + "Zincirin tüm şubeleri"; 24px kartlar `bz-card`; yapışkan kaydet çubuğu mobilde alt menünün üstünde. (iv) Çakışmalar: mobil alt menü (owner + admin) yarı saydam cam yüzey yüzünden arkadaki metni gösteriyordu → düz beyaz hap + arkasında sayfa renginde tam genişlik bant (yalnız hap dokunma alır); `PanelSelectionBar` masaüstünde tek satır ve görünürken sayfa sonuna boşluk bırakır (`reserveSpace`, admin yorumlar kendi kaydırma alanı olduğu için kapalı). Playwright ile tüm admin + owner sayfalarında otomatik çakışma taraması: masaüstünde 0 bulgu; mobilde yalnız geliştirme aracı (React Query simgesi). **Disipline**: satır işlemleri için yeni menüde `PulseMenu` kullan (elle `position: fixed` hesabı yok); sabit alt öğe (seçim çubuğu, yapışkan kaydet) mobilde `bottom-[calc(var(--dash-bottom-nav-h)+12px)]`; çok-işletmeli sahibe ait yeni admin yüzeyi `?owner=` / `groupByOwner` kullanır.
- **Chat prompt history (Stage 169)**: 2026-11-08 kullanıcı: *"admin paneli de aynı şekilde franchise yönetimine göre geliştir ve overlapleri vs basit kullanım yap temiz bir kulalnım olsun maine gönder"*. Yorum: "franchise" = birden çok işletmesi olan sahip hesabı; "overlap" için otomatik tarama + ekran görüntüsü, gerçek sorun mobil alt menünün saydamlığı ve seçim çubuğuydu. **Disipline override**: Stage 60 §38.141 cam efektli (glassmorphism) alt menü hapı düz beyaz yüzeye çevrildi (kullanıcının çakışma şikâyeti).
- §38.252 — Stage 170 (PR TBD) Owner paneli sadeleştirme (admin ile aynı kurallar, §49 "Owner sayfa düzeni"). 11 sayfa grubu (ana panel, yorumlar, Google, analitik, müşteriler, QR, menü, denetim, anket, ayarlar, işletme/platform) iş akışıyla uygulandı, ayrı ajanlarla gözden geçirildi ve düzeltildi. Öne çıkanlar: sayfa içi işletme seçicileri kaldırıldı (Google, analitik, anketler, platformlar, QR); başlıklarda tek ana düğme + "Diğer"; yorumlarda "Diğer filtreler" penceresi yerine aç-kapat çipleri, detayda tekrarlanan zaman çizelgesi ve yıldız şeridi yok; müşterilerde filtreler anında uygulanır; analitikte tek araç çubuğu, "Rapor indir", günlük dağılım seçili döneme göre, NPS alt metni kelimelerle; QR listesi sunucudan gelir, satırda "PNG" + "…"; menü oluşturucuda tek satır başlık ("Önizle", "Paylaş ve QR", "Diğer"), önizleme çerçevesi kesilmiyor; denetimlerde "Yeni denetim" tek ana düğme, hazır şablon filtreleri araç çubuğunda; anket detayında "Düzenle / Yayınla / Diğer"; Hesabım sağ widget'ları kaldırıldı; işletme detayında yinelenen sayılar 3 bağlantı kartında birleşti. Düzeltilen hatalar: QR görüntülemesi geçmiş tarihini değiştiriyordu (`save=1`), menüler mobil alt menünün altında açılıyordu (`z-[70]`), görev bağlantıları seçili işletmeyi taşımıyordu, ana panel "BUGÜN" etiketi tüm zamanların ortalamasını gösteriyordu, StatCard alt metni hiç görünmüyordu, sunucuda render edilen üç tarih (QR kartı, işletme detayı, fatura kartı) hidrasyon hatası veriyordu, "Bildirimler" açıkken "Hesabım" da vurgulanıyordu, dosya adlarında "ı" düşüyordu ("Kad-koy"). Doğrulama: tsc (kaynakta 0 hata), eslint (0 hata), 1863 test, üretim derlemesi, 25 owner sayfasında masaüstü + mobil çakışma taraması (yalnız yapışkan çubuk altından kayan içerik), iki uzak saat diliminde hidrasyon taraması (0 hata). **Disipline**: yeni owner sayfası kendi işletme seçicisini eklemez; başlıkta 1 ana + "Diğer"; filtre tıklayınca uygulanır; sunucuda render edilen tarihe `timeZone: resolveDisplayTimeZone()`; görüntüleme isteği (küçük resim, indirme) kayıt yazmaz.
- **Chat prompt history (Stage 170)**: 2026-11-12 kullanıcı: *"owner panelindeki diğer sayfaları da aynı şekilde sadeleştir ve maine gönder"* (Stage 169 admin sadeleştirmesinin owner karşılığı). Kullanıcı ayrıca "ui-ux-pro-max" beceri metnini yapıştırdı; betikleri kurulu olmadığı için öncelik tablosu (erişilebilirlik, 44px dokunma alanı, yatay kaydırma yok, görünür etiket, yükleme geri bildirimi) yerleşik varsayılan olarak uygulandı ve kullanıcıya söylendi. Hukuki/disipline override yok. Ürün kararı gerektirdiği için yapılmayanlar: analitikteki iki dağılım grafiği ile ısı haritasının birleştirilmesi, menü merkezindeki işletme kartlarının kaldırılması, shell'de durdurulmuş işletme seçimi.
- §38.253 — Stage 171 (PR TBD) Menü merkezindeki işletme kartları kaldırıldı. `/dashboard/menu` artık kendi sayfasını çizmez: geçerli `?restaurantId` veya tek işletme → builder'a sunucu yönlendirmesi; çok işletmede parametre yoksa `MenuHubRedirect` (shell kapsamı → `localStorage` hatırlanan işletme → ilk aktif işletme) builder'ı açar, builder iskeleti ekranda kalır. Shell `hrefWithActiveRestaurant` "Menü" linkini (kenar çubuğu, mobil alt menü) doğrudan `/restaurants/<aktif>/menu`'ya çevirir; aktif durum yine `/dashboard/menu` href'i + `onMenuBuilder` ile eşleşir. Builder hata sayfasındaki "Menülere dön" → "Panele dön" (`/dashboard`; menü listesi artık yok, eski link aynı hatalı sayfaya dönerdi). Doğrulama: 5 işletmenin her biri için hatırlanan işletmeyle `/tr/dashboard/menu` doğru builder'ı açtı, eski seçici metni hiç render edilmedi (MutationObserver), masaüstü + mobil "Menü" tıklaması doğru builder + `aria-current`. **Disipline**: işletmeye bağlı bir sayfaya ikinci bir işletme seçici (kart ızgarası dahil) ekleme; gerekiyorsa panelin seçili işletmesini çözüp ilgili sayfayı aç.
- **Chat prompt history (Stage 171)**: 2026-11-13 kullanıcı: *"menü sayfasındaki işletme kartlarını da kaldır ve maine gönder ve sitenin pazarlama sayfalarındaki yazıları vs. footer tasarımını daha düzenli invoatif güzel yap bazı yerlerde three js kullan ve ayrıca google'da indeks alsın kötü düşünülmsisn. sonra maine at."* Bu kayıt yalnız ilk kısmı (menü kartları) kapsar; pazarlama/footer/three.js kısmı ayrı aşamada. Hukuki/disipline override yok.
- §38.254 — Stage 172 (PR TBD) Pazarlama sitesi yeniden yazımı + three.js + Google'da güvenilirlik. Alt bilgi, menü, ana sayfa, 7 özellik, 15 sektör + sektörler + QR oluşturucu, 8 ticari, şirket/blog ve yardım merkezi sayfaları iş akışıyla birim birim yeniden yazıldı, her birim bağımsız gözden geçirildi (§51). Uydurma içerik kaldırıldı (isimli ekip/yazar/alıntı, canlı akış, "+%184", "340K", "5 dakikada kurulum", 7/24, hello@/legal@/kvkk@), yorum akışı tek doğru anlatımla (D1), uyum davranışla (D2). three.js iki sahne (§50). SEO: kök Organization `disambiguatingDescription`, sabit koordinatlar kaldırıldı, paylaşım görselleri doğrulanabilir bilgilerle yeniden üretildi, RSS (sıralama, tarih, dc:creator), hukuk başlıklarında `#` CSS'e taşındı, 28 yardım yönlendirmesi, sitemap kaldırılan kategorileri dışlar. Yan düzeltmeler: tek iletişim adresi (support@), onay e-postaları gerçek destek saatleriyle, giriş/kayıt uydurma alıntı, deneme sonu sayfasındaki eski TL fiyatları, panel "PDF yazdır" (noopener) hatası, müşteri formundaki "AKŞAM ZİYARETİ", anket "KVKK uyumlu" rozeti, "Masa No" → "QR etiketi" (e-posta + CSV), Pulse AI taslak sıklığı "günde bir kez", hero duraklatma o anki karede (`Stage paused`), ROI e-postaları `after()`, onay günlüğünde e-posta gizleme. Doğrulama: tsc 0, eslint 0, 1868 test, üretim derlemesi (pazarlama sayfaları statik), üretim sunucusunda 194 sayfalık tarama (canonical www, hreflang, tek H1, JSON-LD, kırık bağlantı yok; tek uyarı panelden gelen bir hukuk başlığı), three.js sayfa paketlerinde yok. **Disipline**: §51 içerik kuralları; yeni pazarlama metni için sonuç vaadi ve doğrulanamayan rakam yok; iş akışı devam ettirirken önbellek çağrı sırasına bağlıdır — sırayı değiştirecek betik için önceki raporları dosyaya yazıp yeni çalıştırma başlat.
- **Chat prompt history (Stage 172)**: 2026-11-13 kullanıcı: *"menü sayfasındaki işletme kartlarını da kaldır ve maine gönder ve sitenin pazarlama sayfalarındaki yazıları vs. footer tasarımını daha düzenli invoatif güzel yap bazı yerlerde three js kullan ve ayrıca google'da indeks alsın kötü düşünülmsisn. sonra maine at."* (bu kayıt pazarlama/footer/three.js kısmı); ara mesajlar *"Devam"*, *"Continue"*; 2026-11-14 *"Kaldırabilirsin"* (framer-motion paketinin kaldırılmasına onay, CLAUDE.md §10 bağımlılık kuralı). Hukuki/disipline override yok; yorum akışındaki eşik yönlendirmesi ürün kararı olarak kullanıcıya bildirildi.
- §38.255 — Stage 173 (PR TBD) Küçük teknik borçlar. (i) **Sunucudan doğru `<html lang>`**: `src/app/layout.tsx` kaldırıldı; `[locale]/layout.tsx` kök düzen oldu (`<RootHtml lang={locale}>`), diğer üst düzey bölümlere (`admin` = ADMIN_LOCALE, `r`, `menu`, `s`, `embed`, `audits`, `dashboard`, `(root)`) kendi kök düzenleri eklendi; `app/not-found.tsx` → `global-not-found.tsx` (`experimental.globalNotFound`) + `[locale]`/`r`/`embed` `not-found.tsx` (`BrandedNotFound`); DocumentLang ve kök inline lang betiği kaldırıldı; `/r/[slug]` istemcide seçtiği dili `<html lang>`'a yazar (§52). Pazarlama sayfaları statik kaldı (prerender manifest'inde /tr, /en, /tr/pricing). Gözlem: sayfa içinden `notFound()` 404'leri Next'in `__next_error__` kabuğuyla dönüyor (durum 404 + noindex, içerik istemcide çiziliyor); önceki kodda da aynı, bu aşamada değişmedi. (ii) **CSV**: yorumlar sayfasında "Tüm zamanlar" 90 gün gönderiyordu, artık `days=all` (uç nokta tavanı 10.000 satır); CSV platform etiketleri 10 platforma tamamlandı. (iii) **Kurulum hunisi**: Vercel Web Analytics projede kapalı (`web_analytics_not_enabled`) ve özel olaylar Pro ister, bu yüzden huni veritabanından hesaplanır (§31.6): `activation-funnel.ts` + `getActivationFunnel`, `/admin/analytics` kartı + BI CSV 5. bölüm. **Disipline**: yeni üst düzey bölüm = yeni kök düzen (`RootHtml`); sunucu tarafı ölçümü üçüncü taraf araca bağlamadan önce aracın projede açık olduğunu doğrula.
- **Chat prompt history (Stage 173)**: 2026-11-15 kullanıcı: *"Önerilerin neler"* → öneri listesi; ardından *"5. Küçük teknik borçları yap maine göndee"*. Madde 5'teki "Vercel Analytics olaylarıyla ölçmek" Web Analytics kapalı olduğu için veritabanı hunisine çevrildi (kullanıcıya bildirildi). Hukuki/disipline override yok.
- §38.256 — Stage 174 (PR yok, main'e doğrudan) Mail sistemi temizliği: 6 gürültü maili + kurulum-tamamlandı ikizi kaldırıldı, Gmail-güvenli iki `<style>` bloğu, `after()` ile güvenilir gönderim, Resend 429 tekrar denemesi, cron 16 → 13, lifecycle 2 `groupBy` (§21.39). Görsel denetim: stil açıkken 1110 render'da 0 taşma. **Disipline**: yeni mail ancak sahibin bilmesi gereken, kendisinin tetiklemediği bir olay için eklenir; yanıt sonrası gönderim `after()`; ilk `<style>` bloğuna attribute/id/pseudo seçici yazılmaz.
- **Chat prompt history (Stage 174)**: 2026-11-17 kullanıcı: *"sistemde gönderilen mailleri kontrol et düzen kayma vs. olmasın ve başka cihazdan giriş yapıldı gibi saçma sapan mailleri de iptal et mail sistemini düzgünleştirip maine gönder ve vercel'de çok fazla enerji harcamasın"*; ara mesaj *"devam et medium mod ile token harcama fazla"*. Hangi maillerin "saçma" sayılacağı keşifle belirlendi (CLAUDE.md §10). Disipline override yok.
- §38.257 — Stage 175 (PR yok, `claude/adoring-bell-kka7ez`) Owner ↔ admin panel paralellik denetimi ve temizlik. Üç ayrı ajanla yorum gelen kutusu, müşteriler + QR, işletmeler + analitik karşılaştırıldı; bulgular kodla doğrulanıp düzeltildi. (i) **Admin menüsü tek katalog** (`src/components/admin/admin-nav.ts`): kenar çubuğu, mobil alt menü ve Cmd+K paleti aynı listeyi okur (rol + `staff` izinleri + boş grup ayıklama, TR/EN etiket); eskiden üç ayrı kopyaydı, `staff` için mobil menü boştu, palet müşteri bulamıyordu (`key` yerine `id`, `?focus=` yerine `?detail=`) ve yalnız son 8 kaydı süzüyordu (artık sunucuda arar). Rol adları `adminRoleLabel` (Superadmin / Yönetici / Görevli). (ii) **Güvenlik**: `/admin/dashboard` (MRR, tüm işletmeler) yalnız superadmin + `analytics:read`'li staff; manager ilk izinli sayfasına yönlenir (`src/lib/admin-landing.ts`). `/admin/analytics` staff için `analytics:read` ister. Owner müşteri API'leri (`/api/customers/[key]`, `export`, `bulk`) admin hesabı için `customers:read/write` ister (manager izin olmadan PII okuyabiliyordu). (iii) **Gelen kutusu**: owner ton değişince eski tonla yeniden üretiyordu; iki tarafta da cevap gelmeden yorum değişince taslak/yanıt yanlış yoruma düşüyordu (`activeIdRef`); admin "Düşük puan" 1–2★ → 1–3★ (counts API dahil), "Yanıt bekliyor" → "Yanıtsız"; admin başarısız e-posta yanıtında "Yeniden dene"; toplu AI taslağı yalnız ≤3★ ve yalnız kaydedilen taslaklara rozet; ortak `src/components/reply/reply-errors.ts`; admin detaydaki yinelenen yıldız şeridi + zaman çizelgesi kaldırıldı. (iv) **QR**: ortak `src/components/panel/qr/qr-shared.ts` (10 platform etiketi, dosya adı, düz PNG indirme) — admin QR artık tüm işletmeleri yükler (20'de kalıyordu), kullanılmayan SVG ön yüklemesi (QR hız sınırını yakıyordu) kaldırıldı, platform filtresi veriden, geçmiş hatası görünür, TR/EN. (v) **Diğer**: analitik CSV özel aralıkta son günü dahil eder; owner panelde 5 kullanılmayan sorgu silindi; `restaurant.delete` denetim olayı admin özetinde görünür; admin işletme silme `res.ok` kontrol eder, silmede public menü yenilenir; iki kırık gelen kutusu bağlantısı (`?filter=low`, `?tab=unreplied`). (vi) **Silinenler** (hiçbir yerden kullanılmıyordu): admin `team`/`settings`/`billing`/`campaigns`/`trial-expired` sayfaları (yalnız admin paneline giremeyen `restaurant_owner` rolüne açıktı) + `SuperadminBlock` + `/api/campaigns` (Prisma `Campaign` modeli veri kaybı olmasın diye duruyor); bileşenler `PlatformDistribution`, `TrendsChart`, `PulseTrendChart`, `PlatformLowFeedbackPanel`, `PlatformProviderManager`, `BusinessIntegrationSettings`, `PlatformRedirectsPanel`, `FeedbackTimeline`, `ui/icons`; lib `feedback-timeline`, `admin-notification-read-state`, `qr-premium-template`, `audits/access`, `i18n`, `anim/index`, `buaze/`; API `feedback/stats`, `feedback/branches`, `feedback/[id]/tags`, `analytics/export`, `admin/analytics/export`, `admin/me/permissions`, `admin/customers/[id]`, `admin/restaurants/[id]/menu-settings`, `restaurants/[id]/redirect-stats`, `restaurants/[id]/qr/batch`, `restaurants/[id]/qr/export`, `dashboard/platforms/[provider]/low-feedback`, `admin/legal-documents/…/revisions/[id]` (GET; `revert` duruyor). **Bilinçli korunan**: 2FA API (§34.2), `/api/health`, `embed-stats`, `integrations/health`, denetim API'leri. **Disipline**: admin menüsüne sayfa eklemek = `admin-nav.ts`'e tek kayıt; birden çok tenant gösteren admin sayfası sunucuda rol/izin kontrolü yapar (menüde gizlemek yetmez); owner uç noktası admin hesabına açıksa admin rotasıyla aynı `hasPermission` kapısı.
- **Chat prompt history (Stage 175)**: 2026-11-19 kullanıcı: *"projeyi detaylıca analiz et owner ve admin paneli burda paralellik olmayanları düzelt gereksiz olanları kaldır geliştirilebilir kodları geliştir ve eklenmesi gereken önnerdiğin özellikleri de bana söyleyebilir misin?"*; ara mesajlar *"kullanılmayanları silebilirsin sana tam yetki"*, *"opus ile devam et"*. Silme yetkisi verildi; yine de CLAUDE.md'de bilinçli korunduğu yazan parçalar (2FA, embed izleme, entegrasyon sağlık API'si) silinmedi. Disipline override yok.
- §38.258 — Stage 176 (main'e doğrudan) PayNKolay, plan modülleri, yanıt şablonları, şube raporu, destek görünümü. (i) **Ödeme**: Dodo Payments kodu, paketi ve dönüş kök düzeni silindi; PayNKolay barındırılan ödeme sayfası + sunucudan PaymentList doğrulaması (§44), `BillingPayment` tablosu, süre dolunca `free`. (ii) **Plan modülleri** (§5.2): paket başına modül listesi sahibin işletme şalterlerini belirler (§38.A "Modüler entitlement" maddesi bu şekilde kapandı: kullanıcı modülleri seçti, metered/usage yok). (iii) **Yanıt şablonları**: `ReplyTemplate` (sahip başına en çok 50, ekip paylaşır, görüntüleyici yazamaz, kayıtta §48 risk kapısı), owner yanıt kutusunda `ReplyTemplatesMenu`. (iv) **Şube raporu**: `/dashboard/restaurants/report` (7/30/90 gün; yorum, puan + değişim, düşük puan ve yanıt oranı, QR okutma, platform yönlendirme, bozuk link; yazdır/PDF). (v) **Admin destek görünümü**: işletme sahibi detayında oturumlar (IP maskeli), son 30 gün başarısız mailler, bozuk linkler, Google bağlantısı, ödemeler (`/api/admin/members/[id]/support`, superadmin). (vi) **Paralellik**: admin işletme detayında 6 ek platform, şehir, sektör seçimi, Google linki yalnız değişince gönderilir, geçici kapalı rozeti; admin menü teması da marka ayarına yazılır + public menü yenilenir; `/r/[slug]` geçici kapalı uyarısı; CSV dışa aktarımları İngilizce başlık/etiketle. (vii) **Küfür + sorumluluk** (§47). (viii) **Coolify**: `.github/workflows/deploy-verify.yml` push'tan sonra `/api/health` commit'ini bekler, gerekirse deploy webhook'unu çağırır (docs/SELF_HOST.md). **Disipline**: ödeme sonucunu yalnız sağlayıcıya sunucudan sorarak kabul et; plan şalterlerini tek yerden (`applyPlanModulesForOwner`) değiştir; şemadan çıkan tabloyu/kolonu aynı deploy'da DROP etme.
- **Chat prompt history (Stage 176)**: 2026-11-19 kullanıcı: *"henüz yapılmayanları da düzelt ve maine gönder ve aşağıdakileri ekleyebilirsin. 3, 4, 5, 6, ayrıca maillere cevaplarda türkçe ingilizce vs. tüm dillerdeki küfürlü kelimeler yazılırsa vs. engelle ve sorumluluk olmasın sorumluluk reddi ver ver türk hukukuna genel hukuna uygun yapıp maine gönder"*; ara mesajlar *"coolify'da da otomatik deploy olduğundan emin ol ayrıca; laffogato reposundaki nkolay sanal pos altyapısına bak ve tüm sanal posu qrcodedan kaldır nkolaya göre uyarlayıp yapar mısın?"*, *"ayrıca gereksiz token kullanımından kaçın"*. 3–6 = önceki turda önerilen şube raporu, yanıt şablonları, admin destek görünümü, plan modülleri. **Disipline override**: §15.2 USD-only kararı kısmen değişti — pazarlama USD gösterir ama kartla ödeme TL'dir (PayNKolay yalnız TL); "sorumluluk olmasın" hukuken mutlak muafiyet olamayacağı için yer sağlayıcı + işletme sorumluluğu + tazmin olarak yazıldı (kullanıcıya bildirildi).
- §38.259 — Stage 177 (main'e doğrudan) Paket stratejisi ve yönetimi (§15.2): katalog, işletme sınırı, TL fiyat gösterimi, süresi dolan dönem kapısı, yerinde güncelleyen öneri düğmesi, data migration (yerel Postgres'te eski paketlerle denendi). **Disipline**: paket maddesi yalnız kodda uygulanan farkı söyler; plan verisini migration ile değiştirirken satırı silme, yerinde güncelle (abonelik bağı korunur).
- **Chat prompt history (Stage 177)**: 2026-11-19 kullanıcı: *"sen paket yönetimini ve paketleri düzenle en iyi şekilde ve strateji yap"*; ara mesaj *"token fazla harcamadan devam et"*. Fiyatlar kullanıcı yetkisiyle belirlendi. **Disipline override**: §15.2 USD-only → TR sayfada TL.
- §38.260 — Stage 178 (yığın PR 1, `claude/billing-1-foundation`) Kayıtlı kart + otomatik yenileme temeli (§44.3, spec `billing-spec-final.md` §16.4 PR 1): migration, `billing_settings` bağlaması, bayraklar, kasa + HMAC kriptosu, redaksiyon + Sentry temizleyicisi (§37.7), istemci IP yardımcısı, `decidePayment` yeniden yazımı, settle/expiry/hesap silme (§37.9), dönüş rotası, iade kuyruğu, çekimsiz motor fazları. Üç bağımsız incelemenin bulguları aynı PR'da kapandı: aynı paket + `active` döngü değişse de üstüne eklenir (yıllık abonenin aylık "Süreyi uzat" ödemesi kalan yılı silmez); ilk eşzamanlı iki settle iki dönem verir (upsert yerine `create` + P2002 yeniden deneme); settle kilit sırası abonelik → ödeme; bayat çapa yok sayılır, admin PUT çapayı sıfırlar; `provider_duplicate` iadesi owner faturasını `refunded` yapmaz, kuyruk `refundAmountMinor` gösterir; günlük tarama 09:00 İstanbul; D18 checkout → dönüş → settle'da (`hostedPaymentEnvCheck`); Sentry contexts sorgu/IP temizliği; site host açıkça yazılmalı + Coolify/Vercel önizleme sinyali; ayraçlı PAN koruması; HMAC anahtarı faz 0'dan denetlenir; SELF_HOST.md `billing-renewals` + env listesi. **Disipline**: Prisma `upsert` eşzamanlı ilk yazımda P2002 vermez (`ON CONFLICT DO UPDATE`); kilitlenecek satır yoksa `create` kullan. Birden çok tabloyu kilitleyen faturalama işlemlerinde sıra hep abonelik → ödeme. Bayraksız çalışan ödeme yolları da ortam bağlamasını denetler.
- §38.261 — Stage 179 (branch `claude/menu-studio-rebuild`, parça başına commit, PR yok) Menu Studio: owner menü oluşturucusu yeniden yazıldı (§12.1). (i) **Commit 1 — temeller**: saf modüller (`menu-status`, `menu-filter`, `menu-paste`, `menu-undo`, `menu-dnd`, `menu-bulk-price`, `menu-keys`, `menu-queue`, `menu-setup-preview`, tek TR/EN `menu-i18n`), `menu-merge`/`menu-theme`/`menu-types` ek dışa aktarımları, tek yeni API `POST /api/restaurants/[id]/menu/restore` (30 dk, 410 `RESTORE_EXPIRED`, kategori yalnız kendi cascade'iyle döner; §12.4) + `menu-api-error` iki kod, `bz-row-flash`/`bz-toast-in`. (ii) **Commit 2 — stüdyo çekirdeği**: rota yeni stüdyoya geçti; tek sürekli liste, 3 kademeli container-query satırları (`row-layout.ts`, iskeletle ortak), satır içi ad/fiyat (Enter ile sonraki satırın fiyatı), tek dokunuş Satışta/Tükendi + Göster, iyimser hızlı ekle (bekleyen satır, seri `append:` kuyruğu), ürün paneli (≥1024 sağ sütunda `Önizleme | Ürün` sekmesi, liste açık kalır; <1024 sayfa), sağ sütun önizlemesi (taslak üst katmanı, odak vurgusu, tıkla-düzenle), Servis modu, SaveIndicator + geri al yığını, durum kartı, QR paylaşımı (`navigator.share` dahil), çevrimdışı/dosya bırakma korumaları. (iii) **Commit 3 — düzenle ve toplu**: kategoriler arası sürükle-bırak, kategori rayı (≥1400), seçim + toplu satışa aç/tükendi/gizle/göster/fiyat/taşı/sil (5+ onay), toplu fiyat (yüzde/tutar/sabit + yuvarlama), liste yapıştır (başlıklar kategori olur), klavye kısayolları + "Tek tuş kısayolları" kapatma anahtarı (WCAG 2.1.4). (iv) **Commit 4 — görünüm, kurulum, temizlik**: `useThemeDraft` + `design/*` (tema/renk/logo yalnız önizlemede, **Uygula** tek PATCH yalnız değişen alanlar, toast Geri al; ≥1024 listenin yerine, <1024 alt sayfa), `setup/*` (Hazır şablon / Listemi yapıştır / Boş başla, oturumda saklanan sihirbaz, `createMenuFromSetup` sıralı + her zaman `fetchAll`), başlıkta Görünüm etkin; eski 16 dosya silindi (§34), `menu-ui.ts`'ten `MENU_INPUT_CLASS`/`MENU_LABEL_CLASS`/`copyText` çıktı. Kısıtlar: yeni npm paketi yok, şema değişikliği yok, `PublicMenuView` ve mevcut menü rotaları değişmedi, `loading.tsx` import yolu ve `max-w-[1600px]` korundu, mevcut 5 builder testi import değişmeden geçer. **Disipline**: (a) menüde yayındaki her kayıt canlıdır — geri alınabilir her işlem geri al kaydı bırakır, geri alınamayan (yayından kaldırma) onay ister; (b) yazmalar `useMenuActions` üzerinden anahtar başına seri kuyruktan geçer, bileşen doğrudan `fetch` etmez; (c) aynı anda tek `PublicMenuView` (önizleme yuvası kuralı); (d) sahip metni (kategori/ürün adı, panel ürün başlığı) Inter (`font-body`, başlık etiketinin içindeki span'de — `:where(h1..h6)` katmansız kuralı yardımcı sınıfları ezer), Clash yalnız Buaze çerçevesi; (e) menü metni yalnız `menu-i18n.ts`'te, iki dil eşit; (f) stüdyo düzeni değişince `loading.tsx` aynı commit'te (§40.10); (g) toplu uç nokta (`items/batch`) ayrı backend onayı ister, istemci toplu işleri `bulkSetFlags`/`bulkSetPrices`/`bulkDelete` içinde toplar.

- §38.262 — Stage 180 (branch `claude/menu-design-themes`, `claude/menu-studio-rebuild` üstüne, parça başına commit, PR yok) Herkese açık menü yeniden tasarımı + sahip tasarım esnekliği (spec `menu-design-final.md`). (i) **Parça 1 — veri, çözümleyici, API**: additive migration `20261121090000_menu_design` (`menu_design` JSONB, `menu_cover_url` TEXT, `menu_cover_version`; eski `#RGB` vurgular `#RRGGBB`'ye genişletildi), saf `menu-design.ts` (12 stil, 10 ayar, `readMenuDesign`/`normalizeMenuDesign`/`resolveMenuDesign`), `menu-palette.ts` (AA çözümleyici), sunucuya özel `menu-design-schema.ts` (zod), `/theme` yeniden yazımı (strict gövde, 409 `DESIGN_CONFLICT`, kapak sürümü, blob dönmez), admin `menu-theme` yalnız sıfırlar, görsel rotası `cover`. (ii) **Parça 2 — herkese açık çizim**: tek token tabanlı renderer + `parts/`, OFL `menu-fonts.ts`, container query, overlay splash + odak tuzaklı ürün sayfası, sayfa başına `theme-color`, monogram yer tutucular (§12.2). (iii) **Parça 3 — Studio tasarım paneli + doküman**: 5 sekmeli Görünüm (§12.1), token'dan çizilen `ThemeThumb`, `SurfacePicker`/`TypefacePicker`/`OptionGroup`/`CoverField`/`TaglineField`/`ContrastNote`, `THEME_KEYS` tabanlı ThemeSync, saf taslak düzenlemeleri (`withPreset`/`withKnob`/`withoutKnobs`/`withTagline`, `tests/menu-theme-sync.test.ts`), önizleme zemini + başa kaydırma, admin stil özeti + "Tasarımı sıfırla". Kısıtlar: yeni npm paketi yok, sahipten CSS/HTML yok, Clash Display menüde yok, AA otomatik. **Disipline**: (a) yeni stil yalnız `PRESETS` + `MENU_PRESET_LABELS` satırıdır, çizim kodu gerekmez (`ThemeThumb` ve renderer token okur); `MENU_THEMES` 7'de kalır; (b) ThemeSync'e yeni alan eklerken `THEME_KEYS`'e ekle; (c) `menu_design`'a NULL yazarken `Prisma.DbNull`; (d) menü bileşenlerinde viewport kırılımı ve hex+alfa birleştirme yok (guard testi).
- §38.263 — Stage 181 (branch `claude/gracious-pascal-vs99tu`) Panel hızı + Menu Studio / müşteri menüsü estetiği + yarım kalan menü tasarımı incelemesinin tamamlanması. Ölçüm (yerel üretim derlemesi, SQL ifadesi/istek): owner ana sayfa 40 → 18, analitik 13 → 9, yorumlar 4 → 3; ilk yük JS owner ana sayfa 422 → 256 kB, owner/admin analitik ~356 → ~240 kB, admin şablonlar 308 → 246 kB, yorum kutuları −23 kB. **Hız**: shell `?restaurantId`'yi varsayılan işletmede `history.replaceState` ile yazar (setTimeout 0, Next history yamasından sonra; eskiden `router.replace` sayfayı ikinci kez render ediyordu); recharts `TrendChartCanvas` (`next/dynamic`, ssr:false), supabase-js tembel import, `buildReplyTemplate` → `src/lib/reply-template.ts` (istemci paketine `next/server` girmez); zil yalnız `/api/feedback/counts?only=lowUnread` yoklar, liste açılınca; ana sayfa istatistikleri tek ham SQL (`_lib/home-feedback-stats.ts`, eşdeğerlik 3 saat diliminde doğrulandı); `_lib/panel-data.ts` + `panel-access` React `cache()` (yalnız ilkel argüman); `/api/feedback` liste + sayım + `aiDraft` include tek `$transaction`. Admin: `/admin/restaurants`, `/admin/qr`, `/admin/members/[id]` sunucu hidrasyonu (`RestaurantsClient`, `AdminQrClient`, `MemberDetailClient`; aynı sayfada filtre değişiminde sunucu sorgusu atlanır), `authenticateAdminLayout` (tek admin satırı okuması, `isAdminTokenStale` ile aynı karar), dashboard tek `$transaction`, `getBiSnapshot` saf builder'lar. API: `/api/restaurants` listesi `menuLogoUrl` döndürmez, `?fields=options` hafif mod (id, name, slug, isActive, category); `/api/restaurants/[id]` kapak blob'unu yalnız `?withCover=1` ile döndürür (Studio geçer). **Müşteri menüsü**: QR splash süresi sayfa başlangıcından (`splash-timing.ts`), kategori atlaması en yakın kaydırıcıda (`nav-jump.ts`; Studio'yu kaydırmaz, hash yazmaz), satır ayraçları düz, nötr monogram yer tutucu, ızgarada fiyat çipi her kartta, `book-serif`'te fiyat sans (₺ "Ł" görünüyordu), genel "Restoran" etiketi gizli, görsel rotası http(s) değerlerde 302 yerine 404 (açık yönlendirme kapandı), owner `/theme` vurgu + logoyu `BrandSettings`'e yansıtır, slogan ZWJ emojiyi bozmaz. **Studio**: canlı durum kartı tek satır başlık + birleşik uyarı, ray ve tek satır araç çubuğu 1600 px'ten itibaren, açık ürün satırı vurgulanır, çip şeritlerinde kenar solması, satırda tek nötr rozet + `+N`, fiyat ile anahtar arası boşluk, tasarım panelinde önizleme menü başında, tasarım taslağı Uygula geri alındıktan sonra anahtar bazında yeniden kurulur (`rebaseThemeDraft`), önizleme çerçevesi ile kaydırıcı ayrı (ürün sayfası telefonda sabit). **Disipline**: (a) sayfa başına SQL ifadesi sayısı ana hız ölçütüdür, yeni panel sorgusu eklerken mevcut `$transaction` / ham SQL'e katıl; (b) liste uçlarına blob kolonu (logo/kapak/görsel) ekleme; seçenek listesi için `fields=options`; (c) istemci bileşenine `next/server` içeren modül import etme; (d) owner kabuğunda URL senkronu için `router.replace` yalnız sunucu verisi değişecekse.
- **Chat prompt history (Stage 181)**: 2026-11-20 kullanıcı: *"Aşağıdaki promptu geliştir ve uygula: Sistemi tamamen kontrolmet owner panelini admin panelini hızlandıe kodlardan vs en hızlı hale getir ve ekstra menü oluşturma kısnını eatetikleştir ve araştırıp en iyi kullanışlı halde getir müşteriye sunulan menü de estetik olsun sonra maine gönder. Gereksiz token kullanımından kaçın"*; ara mesaj *"Limit %97 olursa sonraki sıfırlamaya tetikleyicii kur sıfırlanınca başlasın"* → kullanım yüzdesi okunamadığı için saatlik devam görevi kuruldu (iş bitince silindi). İki kez 5 saatlik limite takıldı; ara durum dalda commit'lenip devam edildi. Disipline override yok.
- **Chat prompt history (Stage 179)**: Menu Studio yeniden yazımı, onaylı tasarım belirtimine (`menu-spec-final.md`) göre 4 parçalı bir iş akışıyla yürütüldü; bu kayıt 4. parçada (görünüm, kurulum, temizlik, belgeler) yazıldı. Asıl kullanıcı mesajı bu oturumda yoktu; belirtimdeki sabit kararlar (yayın modeli aynı, her işlem için geri al, görünüm Uygula'ya kadar yerel) uygulandı. Disipline override yok.
- §38.245 — Stage 163 (PR TBD) Google girişi penceresi kapanmıyor + yavaş giriş, site hızı, SEO ve Google uyumu. **Disipline**: (i) proxy'lenen üçüncü taraf sayfalara (`/__/*`) site güvenlik başlıklarını körlemesine uygulama — özellikle COOP opener'ı koparır; (ii) layout metadata'sına sayfaya özgü alan (canonical, hreflang, og:url, twitter başlığı) koyma, miras kalır; (iii) `'use client'` dosyası `@/lib/prisma` içeren modülü dolaylı da olsa import etmemeli (sabitleri ayrı modüle al); (iv) IntersectionObserver hedefi gerçek kutu olmalı (`display: contents` asla). **Not**: Firebase `authDomain` ve OAuth ayarlarına dokunulmadı; düzeltme… (Ayrıntı: git log.)

#### Stage 41 HANDOFF Heroes COMPLETE (Stage 32-41 final summary)

| PR | Stage | HANDOFF step | Code | Highlights |
|---|---|---|---|---|
| #535 | 32 | bonus | ✓ | Cookie banner premium editorial |
| #536 | 33 | §39 | docs | Auto-merge + chat prompt logging |
| #537 | 34 | 1 Tokens | docs gap | %95 mevcut |
| #538 | 35 | 2 Lib | ✓ | Animation engine, 10 dosya, +68 test |
| #539 | 36 | 3 Primitives | docs gap | 4/5 mevcut |
| #540 | 37 | 4 Panel atoms | ✓ | 4 yeni primitive, +9 test |
| #541 | 38 | 5 Panel cards | ✓ | 2 yeni card, +14 test |
| #542 | 39 | 6 Site FX | docs gap | 9/12 mevcut |
| #543 | 40 | 7 Layout chrome | docs gap | %85 basic mevcut |
| #544 | 40b | backlog roadmap | docs | Session handoff prompts |
| #545 | 41 | 8 Heroes | ✓ | 3 variant + ENV flag, +18 test |

Toplam: test count 274 → 383 (+109), 0 schema migration, 0 yeni dep,
0 breaking change. Pulse §11 + §23.3 design system intact.

### 38.C — Critical Production Incidents & Lessons

**Stage 75 §38.155 production crash hotfix** (2026-05-08):
- Root cause: `<SweepCTA onClick={() => window.location.href = ...}>` inline
  arrow function Server Component → Client Component prop. Next.js 15
  "Event handlers cannot be passed to Client Component props" hard error.
- Fix: SweepCTA polymorphic `href?: string` prop + Server caller `href`
  geçer (button → anchor branch). 11 anasayfa animation callsite cross-
  check: tek smoking gun SweepCTA.
- Disipline: Server Component caller'lardan ASLA inline callback prop
  geçirme; href + Server Action veya client wrapper paterni.

**Stage 14 §38.84 UserSession fail-closed rollback** (2026-05-06):
- Stage 9 §38.79 fail-closed flip (`return true` if missing session)
  production'da yeni + eski cookie'leri tümünü 401'liyordu — login
  akışı `prisma.userSession.create` silent fail (try/catch swallow).
- Acute fix: Stage 14'te `return false` rollback + JWT iat-based boundary
  pattern (Stage 18 §38.89 closure). Stage 9 re-introduce için login
  assertion gerek (operatör tetiği bekliyor §38.B).

**Stage 28 §38.158 dashboard overlap fix**:
- Desktop sticky topbar z-30 + sidebar collapse toggle z-50 + mobile
  bottom nav z-40. Mobile drawer + More sheet body scroll lock zorunlu.

### 38.D — Canonical Patterns Summary (from session history)

**Custom Event broadcast paterni** (§38.141 Stage 60):
- `window.dispatchEvent(new CustomEvent('buaze:X', { detail }))` +
  listener with `base` field filter (locale/admin/owner channel ayrımı).
- 5 callsite örnek: `buaze:notification-count` + `buaze:sticky-cta-visibility`
  + `buaze:feedback-read` + `buaze:cookie-consent-changed`.

**Bottom-anchored padding paterni** (§38.169 Stage 89):
- iOS Safari `env(safe-area-inset-bottom)` toolbar transition'da reflow
  ediyor. `bottom: calc(N + env(...))` yerine `bottom: 0 +
  padding-bottom: calc(...)` (outer wrapper viewport-anchored + inner
  spacing değişir).

**HANDOFF compliance disipline** (Stage 49-91, 22 iterasyon stable):
- §35.8 cohort disclosure (Buaze gerçek 10-50 müşteri, fake metric YASAK)
- §35.10 fake testimonial YASAK (LiveTicker default = generic platform event)
- §19.1.1 review-gating wording YASAK
- §38.114 Instrument Serif italic YASAK (synthetic italic Space Grotesk)
- Override gerekirse AskUserQuestion + closure log "Hukuki/disipline override" flag

**Numerotaj çakışması protokolü** (§38.140, §38.143, §38.144, §38.146,
§38.151, §38.158, §38.159, §38.169, §38.170 paterni):
- Paralel session'larda Stage X numarası alındıysa rebase sırasında
  renumber. Branch + commit cosmetic intact, closure log canonical numara.

**Production crash diagnostic chain** (Stage 75 §38.155 paterni):
- Sentry Issue (`buaze-ev/sentry-apricot-blanket`, BOUNDARY tag + RELEASE
  SHA + transaction route) + Vercel runtime logs (status code filter +
  error level + since=1-2h) + git log + manuel callsite verify. 4 paralel
  kanal smoking gun gösterir.

---

## §39 — Auto-merge & Chat Prompt Logging Disipline (kanonik)

**Stage 33 §38.113'te tanımlandı.** Future session'lar bu §'yi referans alır.

### §39.1 Auto-merge pattern (PR sonrası)

Kullanıcı "otomatik main merge'e gönder" benzeri talep iletirse:

1. **Pre-flight check**:
   ```bash
   gh pr view <num> --json state,mergeable,mergeStateStatus,statusCheckRollup
   ```
   - `mergeable: MERGEABLE` zorunlu, `state: OPEN` zorunlu
   - `statusCheckRollup` Validate workflow `IN_PROGRESS`/`SUCCESS` OK;
     `FAILURE` ise auto-merge **ETKİNLEŞTİRME** (kullanıcıya rapor et)

2. **Enable auto-merge**:
   ```bash
   gh pr merge <num> --squash --delete-branch
   ```
   - `--squash` zorunlu (CLAUDE.md §21.22 squash gotcha mitigation)
   - `--delete-branch` auto memory `feedback_auto_merge_after_ci.md`'de
     ZORUNLU (CI yeşil → otomatik merge + branch sil)

3. **Post-merge confirm**: `gh pr view <num> --json state,mergedAt,mergedBy`
   → `state: MERGED` ile final doğrulama.

4. **Branch protection 403 fallback**: free GitHub tier private repo
   branch protection desteklemiyor (HTTP 403). Auto-merge yine çalışır —
   Validate CI yeşil yeterli, Vercel deploy PENDING blocking değil.

### §39.2 Chat prompt logging pattern (her major PR closure'da)

Major design handoff (HANDOFF.md, JSX prototip 100+ satır paste, ekran
görüntüsü + spec) içeren PR'larda CLAUDE.md §38.X closure log'a **"Chat
prompt history" mini-section** zorunlu:

```markdown
**Chat prompt history (Stage X)**:
- YYYY-MM-DD kullanıcı: *"<verbatim quote, max 200 char>"* + bağlam
- AskUserQuestion N kritik karar netleştirildi: <karar 1> / <karar 2>
- Hukuki / disipline override: <varsa, örn. JSX claim KVKK accurate copy ile değiştirildi>
- YYYY-MM-DD follow-up: *"<verbatim>"* → next Stage scope
```

**Verbatim quote zorunluluğu**: yazım hatası dahil korunur (future
session bağlamı). AskUserQuestion karar zinciri özet; detay ana log'da.
Disipline override audit trail kalıcı kayıt.

### §39.3 Disipline rationale

- **Future session bağlam koruması**: kullanıcının orijinal niyeti
  bilinmeden HANDOFF'tan tekrar gelen aynı dosya scope drift yaratır
  (§38.39 + §38.69 paterni paralel — 3-paralel agent + manuel verify
  yeterli değil; kullanıcı niyeti authoritative).
- **Disipline override audit trail**: Buaze disipline'i (Pulse §11
  tipografi, §10 translations.ts, §13.5 KVKK) JSX prototip ile
  çakıştığında karar gerekçesi closure log'da belge altına alınır.
- **Auto-merge audit trail**: PR merge timestamp + Validate CI status
  + branch protection state closure log'da → future debug tek lookup.

### §39.4 Yapma / Yap

**Yapma**:
- Major design handoff PR'ında "Chat prompt history" eklemeden closure
  log atma
- Auto-merge'i `--delete-branch` olmadan çalıştırma (auto memory zorunlu)
- Branch protection HTTP 403 görünce panik yapma — free tier feature
- Verbatim kullanıcı quote'unu "düzeltme" — yazım hatası korunur

**Yap**:
- Yeni HANDOFF.md veya JSX paste 100+ satır geldiğinde §39.2 paterni
- Yeni PR otomatik merge talebi geldiğinde §39.1 paterni
- §39 disipline kuralını gerekirse genişlet — Stage X §38.Y closure
  log'da notla

---

## §40 — Kanonik Cross-stage Disipline Patterns (compact)

Stage 1-91 closure log'larından konsolide edilen, future session'ların
tekrarlamaması gereken kanonik kurallar. Detaylı kaynak referansı
parantezde.

### §40.1 Code disipline

**Server Component → Client Component prop serialization** (Stage 75
§38.155):
- ASLA inline arrow function (`onClick={() => ...}`) Server Component'ten
  Client Component prop'una geçme — Next.js 15 "Event handlers cannot
  be passed to Client Component props" hard error.
- Server caller `href` ile `<Link>` veya Server Action; Client caller
  `onClick` callback intact.

**Prisma `connection_limit=1` paterni** (§14.1 + §38.99):
- Server Component / API request içinde paralel Prisma read'leri
  `Promise.all([...prisma...])` yerine `prisma.$transaction([...])` —
  Supabase pooler tek connection üstünde sıralı çalışır.
- Cron / outbound HTTP per-row isolation için `Promise.allSettled`
  pattern intact.

**Defensive `select`** (§14.1):
- `prisma.X.findUnique({ where })` çağrılarına HER ZAMAN explicit
  `select` ekle. Schema↔DB drift'inde `P2022` ile 500 atar.

**Route modülü yalnız handler export eder** (§38.242):
- `src/app/**/route.ts` dosyası yalnız HTTP handler'ları (`GET/POST/...`) ve
  route config'i (`dynamic`, `runtime`, `maxDuration`, `revalidate`) export
  eder. Paylaşılan yardımcıyı (`issueLoginSession` gibi) route'tan export
  edip başka route'ta import etme — Next'in route tip kontrolü
  (`.next/types`) kırılır. Yardımcıyı `src/lib/` altına taşı
  (`src/lib/login-session.ts` paterni).

**Cron route 3-directive** (§38.11):
- `export const dynamic = 'force-dynamic'` + `runtime = 'nodejs'` +
  `maxDuration = 300`. CRON_SECRET fail-closed (`||` fallback YASAK).
  `runX()` shared helper export (admin manuel trigger için).
- `export const GET = withCronGuard('/api/cron/<ad>', handleCron)` zorunlu
  (§21.12 / §38.241) — 5xx Vercel "cron run failed" maili üretmesin.

**JSON-LD safe stringify** (§37.6):
- `<script type="application/ld+json">` blok'una giden HER
  `JSON.stringify(...)` çağrısı **`jsonLdString()`** helper'ından geçer.

**PII redaction in logs** (§37.7):
- `console.error` Sentry'nin `extra` field'ı ile otomatik kapılır.
  `email/phone/ipAddress` log'lama YASAK; `userId/restaurantId/hash` log'la.

**`safeParseJson` helper** (§38.9):
- Yeni `JSON.parse` callsite'ı eklerken (özellikle AI yanıtı, OAuth
  state, external API body) `safeParseJson` helper'ı kullan. Sentry tag
  `kind: 'json-parse-failure'`.

### §40.2 Schema + Migration disipline

**Schema değişiklikleri**:
- `prisma/migrations/...` migration dosyası commit zorunlu
- `npm run db:push` sadece lokal scratch DB (production'da YASAK)
- Yeni nullable + default'lu field tercih edilir (preview deploy crash
  önleme)
- `@relation` `onDelete:` explicit yaz (§37.9)

**Migration pattern**:
- ADD COLUMN nullable + default null (breaking change yok)
- Vercel build script `prisma migrate deploy` otomatik apply

### §40.3 UI/UX + Pulse §11 disipline

**Pulse design system intact** (§11 + §38.114):
- Space Grotesk + Inter + JetBrains Mono (Instrument Serif italic YASAK)
- Synthetic italic Space Grotesk: `style={{ fontFamily: 'var(--font-heading)',
  fontStyle: 'italic' }}` (Google Fonts italic kaynağı yok)
- Pulse hex palette inline + Tailwind v4 utility (lime #C6F24E +
  graphite #0A0A0A + N50 #FAFAFA + lime-soft #EAF9B8)

**Heading element**: ASLA inline `style={{ fontFamily: 'var(--font-heading)' }}`
ekleme. globals.css `:where(h1..h6) { font-family: var(--font-heading) }`
auto-applies. Non-heading için `bz-h-tight` utility class.

**Mobile touch target** (§38.74 + §38.169):
- WCAG 2.5.5 (44×44 mobile primary actions) + dense chip exception
  32-36px
- iOS auto-zoom prevention: input mobile 16px font (`text-[16px] sm:text-[14px]`)
- Mobile keyboard hints quad: `inputMode` + `autoCapitalize` +
  `autoCorrect` + `spellCheck` + `enterKeyHint`
- iOS Safari env() reflow için bottom-anchored padding paterni
  (§38.169) — `bottom: 0 + padding-bottom: calc(...)` outer wrapper

**Z-index hierarchy** (§38.158):
- z-30: desktop sticky topbar
- z-40: mobile sticky + bottom nav
- z-[45]: notification backdrop modal hint
- z-50: modals, drawers, palette, sidebar collapse toggle
- z-[60]: impersonation banner global priority
- z-[100]: cookie banner

**Reduced motion** (§38.61):
- globals.css universal `*` reset blanket → tüm transition'lar 0.001ms
- Yeni keyframe eklerken `[style*='X']` selector reduced-motion blanket'a
  ZORUNLU (inline `style={{ animation }}` callsite'lar için)

**`html-to-image` capture timing** (§38.178):
- Off-screen DOM rasterize ederken `requestAnimationFrame` × 2 yeterli
  DEĞİL — web font (`Inter`, `Helvetica Neue`) yüklenmesi ve mount commit
  ayrı garanti edilmeli. Yeni callsite eklerken `src/lib/qr-template-
  download.ts:waitForCapturable(node)` paterni reuse: `document.fonts.ready`
  + 2× rAF + `getBoundingClientRect` 0×0 retry guard. Aksi halde PNG boş
  (mount race) veya text genişlik bozuk (font fallback) sonucu çıkar.

**Panel form select + action menu + switch — kanonik primitive seçimi**
(§23.3 + §38.177):
- Form select (persistent value, single-choice form input) → `PulseSelect`
  (iOS chevron fix + `bz-menu` dropdown + listbox a11y). ASLA yeni native
  `<select>` ekleme — mevcut 37 callsite kademeli migrate edilir.
  **Stage 105 §38.185 portal-aware**: dropdown listbox `createPortal` ile
  `document.body`'ye render edilir; desktop `position: fixed` z-80, mobile
  `.bz-menu--sheet` CSS `!important` override'larıyla intact. Sibling
  stacking context (KPI card `transform/opacity` motion) artık dropdown'u
  clip edemez. Yeni callsite eklerken portal davranışı şeffaf — sadece
  trigger className (`min-w-X sm:min-w-Y sm:max-w-Z`) ayarla.
- Action menu (transient command list, row actions, header dropdown) →
  `PulseMenu` + `PulseMenuItem` (Radix DropdownMenu wrap + `bz-menu`
  styling). ASLA yeni `useState(openMenu)` + outside-click listener +
  custom positioning paterni — Radix tüm bunları handle eder. Mevcut
  2 custom dropdown (UserDashboardShell + admin/restaurants row actions)
  defer; yeni callsite'lar PulseMenu kullanır.
- Switch / toggle → `APSwitch` (lime #C6F24E, 240ms Apple easing, locked/
  loading slot). Inline `<button role="switch">` veya eski `<Toggle>`
  yazma — `APSwitch` tek kanonik.

**Compliance disipline** (Stage 49-91 zinciri 22+ iterasyon stable):
- §35.8 cohort disclosure: Buaze gerçek müşteri 10-50 (§19.4.4), fake
  metric YASAK
- §35.10 fake testimonial: müşteri-spesifik claim YASAK, generic
  platform event source attribution OK
- §19.1.1 review-gating wording: "filter / leak / X kat / Xx multiply"
  guarantee language YASAK
- HANDOFF prototip fake-data 4 kategori (PhoneFrame chrome + hardcoded
  owner name + recovery actions + loyalty card) SKIP intact

### §40.4 Backend security + auth disipline (§37.2 A-H özet)

**A. Auth boundary**:
- `getSecret()` production'da `JWT_SECRET` yokken throw
- `UserSession` revoke checks fail-closed (DB error → return true)
- Password reset / member deactivate → UserSession revoke zorunlu
- Server-side layout/page auth gate'i bare `verifyJwt` ile YAPMA —
  API'lerle parity için `verifyUserTokenForLayout` / `verifyAdminTokenForLayout`
  kullan (§38.189). `verifyJwt` sadece JWT signature kontrol eder;
  layout admit eder, API revoke check'iyle reddeder → 401 spam'i.
- "Zaten giriş yapmış mı?" kontrolü yapan login/register/oauth redirect
  target sayfaları AYNI strict verifier'ı kullanmalı (§38.190). Asimetrik
  gate (layout strict + login lax) infinite redirect loop yaratır:
  dashboard → login → dashboard → login... HAR'da `?_rsc` çağrıları
  yığılır, Sentry session event'leri 100+ olur, user beyaz ekran görür.

**B. IDOR — restaurant whitelist**:
- Owner-controlled `locations: string[]` ASLA verbatim kabul (Stage A4
  CRITICAL §38.94). `findMany where: { id: { in: requested }, userId:
  actor.id }` whitelist filter.

**C. Rate limit + audit log** (privileged actions):
- Yeni admin destructive bulk + privileged CRUD → AdminAuditLog
  row + `rateLimit('endpoint:actor:${actor.id}', N, 60_000)`

**D. Public POST'larda IP-bazlı rate limit**:
- `sessionId` rate limit tek başına yetersiz; IP katmanı zorunlu
- Ham `req.headers.get('x-forwarded-for')` YASAK — `getClientIp()` parse

**E. Restaurant CRUD validation**:
- `primaryColor` → `isValidHexColor`
- `googleReviewUrl/yemekSepetiUrl/...` (8 platform URL) → `checkProviderUrl`
- `notificationEmail` → `isValidEmail` + 256 char cap
- `menuLogoUrl` → 300 KB cap + non-data URL `http(s)://`
- Slug regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

**F. OAuth flow** — `state` nonce zorunlu (§37.2 F + Stage 5 §38.85):
- `/connect`: nonce cookie + base64url state
- `/callback`: nonce match + actor match + cookie clear

**G. Mail recipient guard**:
- User input CRLF strip + `isValidEmail` kontrolü
- PII `console.error` YASAK — `userId` log

**H. CRON_SECRET sağlam pattern**:
- `||` fallback YASAK — env yoksa fail-closed (401)
- Shared helper export (admin manuel trigger için)

**I. Cross-tenant active uniqueness** (§38.176, team invite):
- DB-level unique constraint `[ownerId, email]` farklı owner'ları engellemez
  (her birinin kendi row'u olur). Tek-tenant per user modellerinde **accept
  zamanında** `findFirst({ email, status: 'active', NOT: { id: self } })`
  ile diğer aktif satır var mı kontrol edilir → varsa 409 reject.
- "Tek-tenant per user" varsayımı kıran benzer akış (örn. team transfer,
  ownership change) aynı disipline ile gate edilir.

**J. Google Places içeriği ve maliyet kapısı** (§5.1.2, §38.243):
- Places içeriği (puan, yorum metni, yorumcu adı/fotoğrafı) DB/log/Sentry/tarayıcı
  depolamaya yazılmaz; kalıcı tek Google Maps verisi Place ID'dir.
- Her faturalı Places çağrısı Google'a gitmeden `reservePlacesCall`
  (`google_places_usage`, atomik tek deyim, fail-closed) ile rezerve edilir.
  `rateLimit()` (Upstash) burada tavan değil yalnız yumuşak burst sınırıdır.
- Paylaşılan kotalı Google yüzeylerinde otomatik yeniden deneme yok (§38.211).

### §40.5 Validation disipline (§28)

**Yeni endpoint** (kanonik):
```ts
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';

const Body = z.object({ ... }).strict();   // ← mass assignment kapatma

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
}
```

**Karar matrisi**:
| Senaryo | Aksiyon |
|---|---|
| Yeni endpoint | `validateBody` + `.strict()` zorunlu |
| Yeni billing/oauth/mass-action route | Zod must-have + unit test |
| Mevcut endpoint'e yeni alan | Lokal `z.X.safeParse(body.newField)` (mix-mode) |
| Mevcut endpoint refactor | **Dokunma**, elle validation çalışıyor |
| Toplu sweep | **Yapma**, regression test maliyeti değer üstü |

### §40.6 Caching disipline (§19.3 + §38.100/104/167)

**Owner-scoped read endpoint**: `Cache-Control: private, s-maxage=N,
stale-while-revalidate=M`
- 15s fresh (high frequency — inbox/badge/onboarding)
- 30s fresh (medium — KPI/team/sessions/qr-history/overview)
- 60s fresh (low — billing/profile/api-keys/brand)

**Public read endpoint**: `public, s-maxage=N, stale-while-revalidate=M`
- `/api/restaurants?slug=` (60s/300sw, §19.3)
- Marketing pages ISR `revalidate=3600` (§38.163)

**Mutation endpoint** (POST/PATCH/PUT/DELETE): cache header ALMAZ —
origin always fresh.

**ISR + revalidatePath** (§38.103):
- Owner save endpoint marketing copy etkiliyorsa
  `revalidatePath(`/<surface>`)` çağır
- `marketing-revalidate.ts` helper: `revalidateBlog`, `revalidateLegalDocument`

### §40.7 HANDOFF migration disipline (Stages 32-41)

**Pulse design system intact** (Stage 34 §38.114 kararı):
- HANDOFF Instrument Serif italic font yükleme YASAK
- BZ tokens object Buaze'ye taşıma YASAK (Tailwind v4 `@theme` block
  + inline hex kanonik)
- AP_T translation map + apt() helper Buaze'ye taşıma YASAK
  (`lib/translations.ts` intact)
- Showcase fonksiyonları (BZ tokens dependent) production'a taşıma YASAK

**Compliance variation** (Stage 49-91 zinciri 22+ iterasyon stable):
- HANDOFF prototip fake-data 4 kategori SKIP intact:
  1. PhoneFrame device chrome (prototip-only)
  2. Hardcoded owner name (jenerik "İşletme yönetimi")
  3. Recovery actions (callback + voucher — backend yok)
  4. Loyalty card (backend yok)
- Fake metric/testimonial (12.482 işletme, "Mehmet K. 5★") YASAK —
  compliance-safe variation (Buaze cohort framing veya generic platform
  event)

### §40.8 Audit + scope disipline

**Audit metodu** (§38.39 + §38.69 + §38.161):
1. Lokal baseline (tsc + lint + test) — yeşilse "yüzeysel temiz"
2. 3 paralel Explore agent — paralel çağır, sonuçları triage
3. Her agent finding'ini manuel verify — false positive yaygın
4. Kategorize: CRITICAL / HIGH / MEDIUM / LOW / FALSE POSITIVE
5. Tek "audit fix bundle" PR'ı — multiple PR yerine tek narrative
6. CLAUDE.md güncellemesi son adım — §38'e yeni alt-section

**Scope kontrolü**:
- AskUserQuestion 2-4 kritik karar netleştir
- "Mega PR" talebi tehlikeli (Stage 73 §38.153 örneği — 700+ callsite
  tek session'da regression test edilemez)
- Kademeli migrate (PR0 base + PR1-5 callsite + PR6 cleanup) tercih

### §40.9 Cleanup Log disipline (§34)

**0 callsite component sil**:
- `grep -rln "ComponentName"` + manuel verify (statik + dynamic import +
  string-action araması)
- **`src/` + `tests/` İKİSİNİ DE grep'le** (§38.232 dersi) — bir test
  dosyası component'in/helper'ın tek kalan importer'ı olabilir; sadece
  `src/`'e bakmak `npm test`'i import-error ile kırar. Component'in yan
  export'larını (helper fn + data type) da tara, sadece component adını değil.
- Convention dosyalarını skip (Next.js framework auto-load)
- Barrel (`index.ts`) export satırlarını da temizle (file sil + export sil)
- CLAUDE.md çapraz kontrol (§17, §18, §34.1 hazırda listesi)
- Build doğrulama post-delete (lokal node_modules yoksa CI Validate'e bırak)

**Geri eklemek için**: kullanıcı **açık talep** etmeli (§7 scope
disiplini). git history `git log --all --diff-filter=D --name-only --
'*FileName*'` ile silme kararının gerekçesi okunur.

### §40.10 Skeleton / loading.tsx disipline (kanonik)

Premium SaaS hissi için skeleton loading **gerçek sayfanın strüktürel
klonu** olmalıdır — wrapper, grid, gap, kart chrome, satır yüksekliği
birebir; sadece görsel içerik shimmer ile değişir. Aksi halde Cumulative
Layout Shift (CLS) Core Web Vitals'i bozar ve "zıplama" hissi premium
algıyı düşürür.

**Drift kuralı (Maintenance)**: Yeni `page.tsx` yazarken veya mevcut
sayfanın wrapper'ını (`max-w-*`, `px-*`, `py-*`, `space-y-*`, grid
template, gap) değiştirirken **aynı segment'in `loading.tsx`'i de
güncellenmek zorunda**. Bu zorunlu — drift olursa loading→loaded geçişte
CLS sıçraması oluşur. Pre-merge code review checklist:

- [ ] `page.tsx` wrapper class'ı değişti mi? → `loading.tsx` aynı class'a güncelle.
- [ ] Yeni section eklendi mi? → loading skeleton'a structural placeholder ekle.
- [ ] Section silindi mi (örn. KPI strip §38.56)? → loading'den de sil.
- [ ] Grid template (`grid-cols-[...]`) değişti mi? → loading'de aynı template.

**Çift skeleton anti-pattern**:

Eğer parent server-component (`page.tsx`) içinde `loading.tsx` varsa VE
sayfa içindeki client component kendi `useState(true)` initial loading
state'i ile **ikinci kez** skeleton render ediyorsa → çift skeleton flash:

1. İlk: Next.js segment `loading.tsx` görünür (server fetch sırasında)
2. İkinci: Page mount olur → client component mount olur → `loading=true` skeleton görünür
3. Üçüncü: `useEffect` fetch tamamlanır → gerçek içerik

Çözüm — **server hydration pattern**:

```ts
// Parent server-component (page.tsx):
const initialData = await prisma.X.findUnique({ ... });
return <ChildComponent initialData={initialData} />;

// Child client component:
interface Props {
  initialData?: DataType;
}
const [data, setData] = useState(initialData ?? null);
const [loading, setLoading] = useState(initialData === undefined);
useEffect(() => {
  if (initialData === undefined) load();  // ← sadece SSR data yoksa fetch
}, []);
```

Mevcut canonical örnekler:
- `AdminOverviewWidgets` — parent `members` + `attention` prop'larıyla
  server-data geçirir; component `useState(!hasServerData)` ile skeleton
  atlatır (CLAUDE.md §23.7 Phase 3.3 paterni)
- `ActivationChecklistCard` — `initialResult?: ActivationResult` prop;
  owner `dashboard/page.tsx` `prisma.$transaction` ile activation hesaplar
  ve geçirir
- **Wave 3 (PR #TBD, 2026-05-14)**: 7 list page'i pattern'e geçti — admin
  (blog/members/users/announcements) + owner (account/qr/restaurants/[id]).
  Her birinde `page.tsx` server component oldu (auth + `prisma.findMany`),
  `XClient.tsx` rename + `initialData?: T[]` prop kabul eder. `skipFirstFetchRef`
  ile mount'taki ilk useEffect SSR data'yı atlar; subsequent filter/refresh
  fetch'leri client-side intact.
- **Wave 4 (PR #TBD, 2026-05-14)**: 1 detail page eklendi —
  `dashboard/restaurants/[id]/settings`. `RestaurantSettingsClient.tsx` rename
  + `initialRestaurant?: RestaurantPayload | null` prop. Server `page.tsx`
  cookies + verifyJwt + `prisma.restaurant.findFirst({ where: { id, userId },
  select: { ...50 fields } })`. Wave 3 not-found → `null` paterninden sapma:
  bu PR `undefined` kullanır → team_member fallback senaryolarında client-fetch
  çalışır (settings page security/danger section'ları team_member erişimi
  için kritik). `if (loading) return null` clean-slate (eski "Yükleniyor…"
  spinner kaldırıldı).
- **Wave 5 (PR #TBD, 2026-05-14) — STRUCTURAL SKELETON REINTRODUCTION**:
  PR #664 "clean slate" kararı reverse edildi — owner + admin panel'in tüm
  segment'lerine `loading.tsx` structural skeleton dosyaları eklendi (29 owner +
  47 admin = 76 dosya). Sebep: kullanıcı YouTube/Vercel/Linear tarzı "önce
  gri placeholder kutular → sonra real content" davranışını istedi. Server
  hydration (Wave 3+4) instant content veriyordu ama page-to-page navigation
  sırasında server fetch window'unda blank kalıyordu — bu skeleton'lar o
  window'u doldurur. Çift skeleton riski yok çünkü server-hydrated client
  component'ler `skipFirstFetchRef` ile mount-fetch atlar (content anında
  geldiğinde skeleton görünmez bile). Skip edilenler: 3 owner redirect
  (`profile`, `notifications`, `integrations` — sadece `redirect()` çağırır)
  + 4 admin auth/special (`admin/page.tsx` login, `forgot-password`,
  `reset-password`, `trial-expired`). **Shared primitive**: yeni
  `src/components/ui/skeletons/PageSkeleton.tsx` — 9 export (`SkBox`,
  `SkPageHeader`, `SkPageShell`, `SkStatGrid`, `SkCard`, `SkTable`,
  `SkCardGrid`, `SkForm`, `SkTabStrip`). Flat `bg-[#EDEDED]` (Pulse n200),
  **animation YOK** (kullanıcı tercihi "düz gri placeholder"). Tailwind v4
  dinamik class problem'i için `SHELL_MAX_CLASS` + `STAT_GRID_COLS` +
  `TABLE_COLS_CLASS` static map'leri (literal class names compile-time
  visible). Her loading.tsx ortalama 25-40 satır, tek-source-of-truth
  primitive'leri kompoze eder. Drift kuralı (§40.10 mevcut): page wrapper
  class değişirse loading.tsx'i de güncelle. Backend dokunulmadı.

**searchParams-aware hydration** (list page'lerde filter deeplink): Server
component `searchParams: Promise<Record<string, string>>` alır,
`parseListMembersParams` / `buildMembersWhere` gibi shared helper'larla
prisma query'sini filter-aware yapar. Deeplink (örn. `?status=passive`)
ilk paint'te doğru data ile gelir, skeleton flash yok. Client tarafında
useUrlFilter URL'i source of truth tutar; sonraki filter değişiminde
fetchMembers client-side çalışır.

**Cross-token hydration scope**: Owner panel sayfaları (`dashboard/**`)
hem `user_token` (workspace owner) hem `admin_token` (admin impersonation)
ile erişilebilir. Server-side hydration **sadece `user_token && !adminToken`**
durumunda yapılır — admin sessions client-fetch path'ini kullanır (admin
actor scope'unun mevcut /api gate'leriyle yönetilmesi için, leak önleyici).

**Yapma**:
- Yeni `useState(true)` initial loading state'i olan client component'i
  parent server-data hydration olmadan loading.tsx olan bir sayfaya
  mount etmek (otomatik çift skeleton).
- "Sadece loading.tsx koy, client component kendi skeleton'ını da göstersin
  zaten yüklenir" — kullanıcı 2 adım skeleton görür, premium hissi
  bozulur.
- `loading.tsx`'i wrapper'ı page.tsx'ten kopyalamadan yazmak — drift
  başlangıcı.

**Yap**:
- Yeni client component fetch'i için `initialData` prop pattern'i
- Yeni `loading.tsx` yazarken bire-bir page.tsx wrapper'ı klonla
- 3+ wrapper class değişince hemen loading.tsx'i de güncelle
- Eksik `loading.tsx` olan segment'lerin root fallback'leri (`admin/loading.tsx`,
  `dashboard/loading.tsx`) en yaygın değerleri (1200, space-y-4) kullanır;
  outlier sayfa (max-w-1280/1100) için kendi loading.tsx'ini yaz.

**Vercel preview deploy disable**: `vercel.json`'a `"git": {
"deploymentEnabled": { "main": true } }` eklenir — sadece main branch
production deploy alır. PR'lar otomatik preview deploy yapmaz; main'e
merge olunca tek production deploy tetiklenir. Maliyet + gereksiz build
sayısı + Sentry release noise azalır. Operatör spesifik branch için
preview gerekirse Vercel dashboard'dan manuel "Deploy" tetikleyebilir.

### §40.11 Segment-scoped CSS extraction (kanonik, Stage 107 §38.187)

`src/app/globals.css` her marketing + admin + owner + public sayfada
yüklenir (root layout `import './globals.css'`). Tek bir route family'sinde
kullanılan büyük CSS bloğu (≥100 satır) global bundle'a girince marketing
surface'leri o chrome'u hiç kullanmasa bile cold load'da indirir.

**Kanonik pattern** — segment-level layout + co-located CSS:

```ts
// src/app/<segment>/layout.tsx (4 satır):
import './<segment>.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
```

```css
/* src/app/<segment>/<segment>.css */
.bz-<segment>-* { ... }
@keyframes <segment>* { ... }
```

Next.js App Router CSS'i o segment + children'ında **otomatik inject eder**.
Diğer route'lar bu CSS'i indirmez (build'de ayrı chunk olur).

**Mevcut canonical örnek** (Stage 107 §38.187):
- `src/app/s/[slug]/survey.css` (173 satır, 8 selector + 6 keyframe + reduced-motion)
- `src/app/s/[slug]/layout.tsx` (4 satır passthrough + import)
- globals.css'ten 163 satır taşındı, marketing 67 sayfası ~1.2 KB gzip indirmiyor

**Eşik kuralı** (CLAUDE.md §7 abstraction kaçınma + §40.10 wave disipline):
- ≥100 satır + sadece tek route family'sinde kullanılan CSS → segment-scoped extract
- <100 satır veya 2+ route family'sinde kullanılan CSS → globals.css kalır
- Tailwind utility class'ları ASLA segment-scoped CSS'te yazılmaz (Tailwind v4 JIT
  global content scanner bekler — segment-scoped sheet utility yazarsan o utility
  marketing'de kullanılınca compile edilmez)

**Yapma**:
- Yeni route eklerken büyük CSS bloğunu globals.css'e default ekleme — önce
  "tek family'de mi kullanılacak" sor, evet ise segment-scoped başla
- Segment-scoped CSS dosyasında Tailwind `@apply` veya utility class tanımı
  (Tailwind global content scanner'a güveniyor)
- Layout dosyasını full RootLayout pattern'iyle yazma — sadece import + children
  passthrough yeter (children'a inherit eder)

**Yap**:
- Yeni segment-scoped CSS eklerken header comment'inde "extracted from
  globals.css §X.Y rationale" notu (drift'i önler — gelecek session
  global'a geri taşımak isterse rationale görsün)
- PublicXxxView component'i kullanan tüm class isimlerini segment-scoped
  CSS'te doğrula (grep selector + verify) — silmeden önce
- Reduced-motion blanket'lar segment-scoped CSS'te de korunur (animation +
  inline `[style*="..."]` selectors ikisi de)

---

## §41 — Future Session Note-Taking Disipline (kanonik)

Bu §, yeni session'ların CLAUDE.md'yi nasıl güncelleyeceğini tanımlar. §38 ve §40 örneklerinden çıkarılan kalıcı not-tutma kuralları.

### §41.1 Closure log: ne zaman, nereye, nasıl

**Yaz**:
- Yeni `## §X` kanonik bölüm (disipline kuralı, runtime davranışı değiştiren karar)
- Mevcut `## §X` bölümüne kısa update (yeni alt-pattern, hazırda korunan ek liste vb.)

**Yazma**:
- Stage-by-stage detaylı PR log'u (§38'in 167 closure log paterni **artık tekrarlanmıyor** — git log + PR description kaynak)
- "Bonus" / "by the way" notlar (varsa `mcp__ccd_session__spawn_task` ile flag'le)
- Bug fix tek satırlık açıklama (commit message kaynak)
- Test sonucu / lint output (CI workflow + git log kaynak)

### §41.2 Closure log template (yeni major karar için)

```markdown
### §X.Y — YYYY-MM-DD <başlık 1 satır>

<2-3 cümle "neden bu karar verildi" özet — runtime/güvenlik/UX etkisi>

**Disipline**:
- <Yapma 1>: <gerekçe>
- <Yapma 2>: <gerekçe>
- <Yap 1>: <pattern + ref>

**Etki**: <hangi dosyalar/route'lar/component'ler etkilendi — kısa>

**Ref**: PR #XXX | git log --grep="<keyword>"
```

200 kelimeyi geçmemeli. Detay PR'da; CLAUDE.md disipline + audit trail.

### §41.3 Compaction sinyalleri

CLAUDE.md > 5000 satıra yaklaşırsa, compaction zamanı. Sinyaller:

1. **Aynı pattern 3+ §'de tekrar** → kanonik §'ye taşı, diğerleri cross-ref olsun (`→ §X.Y`)
2. **Stage-by-stage detay 50+ satır** → §38 paterniyle compact timeline'a indir, detay git log'a teslim
3. **"Bonus" / "out-of-scope" liste 30+ satır** → §38.A master backlog'a konsolide
4. **Code example 20+ satır** → minimum pattern (5-10 satır) + git ref
5. **Tarihsel rationale 100+ satır** → "kanonik karar" özetine indir + git ref

### §41.4 Hangi disipline kuralları kanonik §-lere taşınmalı

Yeni session bir kural belirlediyse, hangi §'ye gider:

| Konu | Kanonik § |
|---|---|
| Scope/quality genel | §7 |
| Brand / Pulse design | §11 |
| Menu sistemleri | §12 |
| Menu analytics | §13 |
| Vercel/build | §14 |
| Mail system | §21 |
| Pulse panel | §23 |
| Mobil uyum | §25 |
| Sentry | §26 |
| React Query / Radix | §27 |
| Validation Zod | §28 |
| Dep policy | §30 |
| Speed Insights | §31 |
| Testing | §32 |
| Scripts | §33 |
| Cleanup history + method | §34 |
| SEO discovery | §35 |
| Security boundaries | §37 |
| Session history (compact timeline) | §38 |
| Auto-merge / chat logging | §39 |
| Cross-stage patterns | §40 |
| Note-taking disiplini (bu §) | §41 |
| Panel teması (Geist + shadcn yoğunluğu), işletme/franchise geçişi ve yönetimi | §49 |
| three.js dekoratif sahneler | §50 |
| Pazarlama sitesi içerik doğruluğu ve sayfa düzenleri | §51 |
| Kök düzenler, `<html lang>`, global 404 | §52 |

Yeni konu ortaya çıkarsa yeni `## §X` ekle; ama önce `grep -n "^## " CLAUDE.md` ile mevcut §-lere baktıktan sonra (overlap riski).

### §41.5 Audit cadence

3-6 ayda bir veya CLAUDE.md > 5000 satıra çıkınca §41.3 sinyalleri sweep'i yapılır:

1. **Inventory** — 3 paralel Explore agent (dead code + dead .md + CLAUDE.md compaction candidates)
2. **Plan** — kullanıcıya AskUserQuestion ile kritik kararlar (silinecek mi compact mı, hangi §'ye konsolide)
3. **Execute** — tek PR (kod sil + doc sil + CLAUDE.md compact + yeni disipline)
4. **Verify** — tsc + lint + build + git diff stat (line balance)
5. **Auto-merge** — §39 paterni

Tarihsel referans: 2026-05-12 ilk büyük sweep (PR #605, 25.7K→5.3K satır), 2026-05-12 ikinci sweep (bu PR, 5.3K→~4.6K satır + 5 dead file).

### §41.6 Yapma / Yap

**Yapma**:
- "Belki yararlı olur" §'si ekleme — kullanıcı open talep etmedikçe abstraction
- Stage-by-stage closure log paterni geri getirme — §38 compact timeline kanonik
- Aynı pattern'i 4. §'de tekrar etme — 3+ tekrar = kanonik §'ye taşı + cross-ref
- Code example'da full implementation göstermek — pattern göster (5-10 satır + ellipsis)
- "Geçmişte yaptığımız X" anlatma — git log kaynak

**Yap**:
- Yeni major karar → §41.2 template ile closure log
- Yeni disipline → §41.4 tablosundaki uygun kanonik §'ye taşı
- CLAUDE.md > 5000 satır → §41.3 sinyalleri sweep
- PR sonrası auto-merge (§39 + `feedback_auto_merge_after_ci`)
- Response sonunda 2-section change summary (`feedback_response_format`)

---

## §42 — Panel Layout Chrome (canonical, 2026-05)

Owner + admin panel sayfalarında **tek tip** layout sistemi. Drift'i
tetikleyici şeyler (admin shell double-wrap, eksik scrollbar gutter, 5
ayrı max-width değeri, padding outlier'ları) Stage closure'da kapatıldı.
Yeni panel sayfası eklerken bu §'ye göre yaz.

### §42.1 Shell chrome (sadece chrome, içerik wrap'leme)

**Owner shell** `src/components/dashboard/UserDashboardShell.tsx` ve
**admin shell** `src/app/admin/layout.tsx` SADECE chrome render eder:
sidebar + topbar + TrialBanner + AnnouncementBanner + drawer + bottom
nav. **`<main>` içine başka `mx-auto max-w-*` wrapper KOYMA**. Children
kendi wrapper'ını uygular.

Tarihsel hata (Stage closure'da kapatıldı): admin shell `<div
className="max-w-7xl mx-auto w-full pt-2 sm:pt-6">` ile çocukları
sarıyordu. Sonuç:
- `max-w-[1400px]` page'leri 1280px (max-w-7xl) sınırına takılıyordu
- `mx-auto` page wrapper'ı `mx-auto` parent içinde double-centered olup
  sidebar genişliği ile content edge'i drift yaratıyordu
- `pt-2 sm:pt-6` her sayfaya ekstra üst padding ekliyordu (page'in kendi
  `py-6 lg:py-8` üstüne)

Owner shell hiç double-wrap kullanmıyordu (zaten doğru pattern). Admin
artık owner ile parity.

**`[&>*]:w-full` (kanonik, 2026-10)**: her iki panelin `<main>`'i flex-column.
Flex-column içindeki `mx-auto max-w-[N]` bir çocuk **içeriği kadar daralır**
(auto margin + flex item = shrink-to-fit) → sayfalar dar görünür, wizard
adımlar arasında yana kayar. Bu yüzden owner shell main column'u ve admin
`<main>` className'i `[&>*]:w-full` taşır: doğrudan çocuklar tam genişlik
alır, `max-w-[N]` yine üst sınırı koyar. Bu sınıfı **kaldırma**; yeni bir
shell/nested layout eklerken aynısını uygula.

### §42.2 Sidebar (her iki panel parity)

| Değer | Owner | Admin |
|---|---|---|
| Desktop expanded | `w-[248px]` | `w-[248px]` |
| Desktop collapsed | `w-[68px]` | `w-[68px]` |
| Mobile drawer | `w-[280px] max-w-[85vw]` | `w-[280px] max-w-[85vw]` |
| Transition | `transition-all duration-300` | `transition-all duration-300` |
| Sticky | `lg:flex` + `h-full` (flex parent) | `lg:flex` + flex parent |

**Yapma:** Sidebar width'ini değiştirme — Pulse §11 + Phase 11.10
canonical. Sidebar collapse toggle button `z-50`, sidebar kendisi flex
parent içinde — `position: fixed` veya `position: absolute` KULLANMA.

### §42.3 Page wrapper canonical (3 max-width — Modern SaaS, Stage 132 §38.212)

```tsx
<div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
  {/* page content */}
</div>
```

**Max-width seçimi** (Linear / Stripe / Vercel pattern):

| Token | Kullanım | Örnek |
|---|---|---|
| `max-w-[1280px]` | Settings / forms / profile / billing — narrow content | `/admin/profile`, `/admin/site-settings`, `/dashboard/account` |
| `max-w-[1440px]` | **DEFAULT** — most pages (dashboard, list, detail) | `/admin/dashboard`, `/admin/restaurants`, `/admin/qr` |
| `max-w-[1600px]` | Data-dense tables (8+ kolon) + DnD builders | `/admin/audits/stats`, `/dashboard/restaurants/[id]/menu` (DnD) |
| full-bleed (max-w yok) | İki panelli yorum gelen kutusu (liste + detay paneli tam yükseklik, panel genişliğini doldurur) | `/dashboard/feedbacks`, `/admin/reviews` only (§38.242) |
| `max-w-[640px]` | Error states (intentionally narrow centered) | `/dashboard/menu/error.tsx`, segment `error.tsx` files |
| `max-w-[920px]` | SurveyWizardClient (intentional focused single-flow wizard) | `/[locale]/s/[slug]` only |

**Yasak** (deprecated values, Stage 132 sweep):
- `max-w-[980px]` / `max-w-[1100px]` → kullanma, `1280px` tercih
- `max-w-[1200px]` → kullanma, `1440px` tercih (modern SaaS default)
- `max-w-[1400px]` → kullanma, `1600px` tercih (data-dense)
- Tailwind `max-w-{7xl|6xl|5xl|4xl}` alias'ları → kullanma, arbitrary pixel value tercih

### §42.4 Padding canonical (tek pattern)

```
px-4 sm:px-7 py-6 lg:py-8
```

- **Mobile** (`<640px`): 16px horizontal · 24px vertical
- **Tablet+** (`sm:` ≥640px): 28px horizontal
- **Desktop** (`lg:` ≥1024px): 32px vertical

**Yasak** (drift kaynakları):
- `px-5` (mobile) → her zaman `px-4`
- `sm:px-8` → her zaman `sm:px-7`
- `py-12` → her zaman `py-6 lg:py-8` (sayfa wrapper'ı)
- `py-8 lg:py-12` → her zaman `py-6 lg:py-8` (owner home Stage closure'da
  düzeltildi)
- `lg:py-12` / `lg:py-16` → SADECE error state (`max-w-[640px]` wrapper)

**Space-y serbestlik**: `space-y-4` (compact) / `space-y-5` (default) /
`space-y-6` (breath) seçilebilir — içerik yoğunluğuna göre. Tek değer
zorlanmaz (Stage closure'da explicit kabul).

### §42.5 Globals.css (root scroll behavior)

```css
html { scrollbar-gutter: stable; }       /* §42.5 — initial-load shift fix */
body { min-height: 100dvh; overflow-x: hidden; ... }
```

- `scrollbar-gutter: stable` — scrollbar lane'i rezerve eder, content
  fetch sırasında scrollbar görünüp viewport width'ini ~15px daraltma
  bug'ını eliminate eder. **Pure CSS, zero JS, 1 satır**. Initial-load
  CLS=0 kazanımı. Mobile (touch overlay scrollbar) etkilenmez.
- `body { min-height: 100dvh }` — mobile address bar handling (`100vh`
  yerine `100dvh`). Root layout `min-h-dvh`, locale layout `min-h-dvh`,
  owner shell `min-h-dvh` — hepsi parity.
- `body { overflow-x: hidden }` — global horizontal scroll önleyici,
  table overflow `overflow-x-auto` wrapper içinde scoped (Phase 11.14
  pattern).

**Yapma:**
- `min-h-screen` (Tailwind) kullanma — `min-h-dvh` tercih (mobile-safe).
- `scrollbar-gutter` overrides ekleme — html selector tek source.
- `overflow-x: auto` body'ye ekleme (table'lar scoped wrapper kullanır).

### §42.5.1 Panel scroll container — yatay scroll yasak (kanonik, 2026-06)

`html { scrollbar-gutter: stable }` (§42.5) yalnız **document** scroll'ünü
korur. Ama `lg`'de panel document scroll **etmez** — owner shell + admin
layout outer `lg:h-screen lg:overflow-hidden`, asıl vertical scroll
**panel-içi scroll container**'dadır (owner shell: main column; admin
layout: `<main>`). Bu container'lar üzerinde scrollbar-gutter yok +
`overflow-y-auto` tek başına CSS'e `overflow-x: auto` **compute** ettirir
(bir kutu bir eksende `visible` + diğerinde scrollable olamaz; `visible` →
`auto`). Sonuç: panel **yatay scroll edilebilir** hâle gelir.

**Bug zinciri (kullanıcı raporu "panel kayması"):** uzun içerik → container
dikey scrollbar → clientWidth ~15px daralır → sticky topbar (owner) veya
geniş tablo/chart (admin) container'ı yatay taşırır → trackpad'de tek bir
kazara iki-parmak yatay swipe (Mac'te çok kolay) container'ı sağa
kaydırır → **topbar + sayfa içeriği birlikte sola kayar, sidebar'ın
altına girer** (h1.left 276 → negatif). Headless repro ile kanıtlandı:
eski `overflow-x: auto` + wheel deltaX=300 → `h1.left=-24` (sidebar
altında); `overflow-x: hidden` ile → `scrollLeft=0`, `h1.left=276` (sabit).

**Kanonik fix — panel scroll container'ları:**
```
lg:overflow-y-auto lg:overflow-x-hidden lg:[scrollbar-gutter:stable]
```
- `lg:overflow-x-hidden` — `overflow-y-auto`'nun `overflow-x: auto`
  compute etmesini engeller; kullanıcı yatay scroll **edemez** (wheel/
  trackpad/scrollbar). Taşan içerik sağda **clip** edilir, panel kaymaz.
- `lg:[scrollbar-gutter:stable]` — dikey scrollbar lane'ini önden rezerve
  eder; scrollbar görününce clientWidth **jump etmez** → topbar overflow
  tetiği ortadan kalkar (§42.5 mantığı, ama gerçek scroll container'a
  uygulanmış).

Uygulanan yerler: `UserDashboardShell.tsx` main column +
`admin/layout.tsx` `<main>` (eski `lg:overflow-auto` = iki-eksen scroll).

**Güvenli — geniş tablolar:** Wide tablolar (`min-w-[1080px]` vb.) kendi
`overflow-x-auto` wrapper'larında scroll eder (§23.6); bunlar ayrı scroll
container, shell'in `overflow-x-hidden`'ından **etkilenmez** (içlerinde
scroll, main'e taşmaz). Yeni geniş tablo eklerken `overflow-x-auto`
wrapper **zorunlu** — aksi halde shell clip'i kolonları gizler (scroll
imkânı kalmaz).

**Yapma:**
- Panel scroll container'ında `lg:overflow-auto` veya tek `lg:overflow-y-auto`
  bırakma — yatay scroll/kayma riski. Her zaman `lg:overflow-x-hidden`
  birlikte.
- Geniş içeriği (tablo/chart, min-w-[Npx]) `overflow-x-auto` wrapper'sız
  bırakma — shell clip'i sağı keser.

**Yap:**
- Yeni panel scroll container (yeni shell/nested layout) eklerken kanonik
  3-class kombinasyonunu kullan.
- Chart'ları `overflow-x-auto no-scrollbar` wrapper'da render et (mevcut
  `MainTrendChart` / `PulseTrendChart` paterni).

### §42.6 Mobile breakpoint behavior

| Element | < `lg` (1024px) | `lg:` desktop |
|---|---|---|
| Sidebar | hidden, hamburger drawer | `lg:flex` visible |
| Bottom nav | floating pill `fixed bottom-3 z-40` | `lg:hidden` |
| Topbar | sticky `z-40` | sticky `z-30` |
| Trial banner | within scrollable main | within scrollable main |
| Content `<main>` pb | `pb-[calc(96px+env(safe-area-inset-bottom,0px))]` (clear bottom nav) | `lg:pb-0` |

Mobile breakpoint asimetrisi yok — hem owner hem admin aynı kuralları
kullanır.

### §42.7 Yeni panel sayfası checklist (kanonik)

1. **Wrapper**: `mx-auto max-w-[1280|1440|1600] px-4 sm:px-7 py-6 lg:py-8 space-y-{4|5|6}` (§42.3 modern SaaS tier, Stage 132)
2. **Header**: `<PageHeader eyebrow="..." title="..." description="..." actions={...} />` (§23.3 primitive)
3. **Loading**: aynı segment'te `loading.tsx` — wrapper class'ı page.tsx
   ile birebir clone (CLS=0, §40.10 disipline)
4. **Error**: aynı segment'te `error.tsx` — `<ErrorState onRetry>` veya
   `max-w-[640px] px-4 sm:px-7 py-12 lg:py-16` wrapper (intentionally
   narrow)
5. **Table'lar**: `<div className="hidden overflow-x-auto lg:block">`
   wrapper + `<div className="lg:hidden">` card-list fallback
   (§23.6 + Phase 11.14)
6. **Bulk actions**: floating bottom toolbar (Phase 11.12 + 11.19
   pattern, §23.3.1)
7. **Form input + select + menu + switch**: §23.3 kanonik primitive'ler
   (PulseSelect / PulseMenu / APSwitch — native `<select>` veya
   `<Toggle>` YASAK)

### §42.8 Yapma / Yap (özet)

**Yapma**:
- Admin shell veya owner shell'e içerik wrapping ekleme — chrome only
- Page wrapper'da deprecated max-width (1100/1200/1400/980) veya padding
  outlier (`px-5`, `py-12`, `sm:px-8`) yazma — §42.3 + §42.4 enforce
- `min-h-screen` Tailwind utility kullanma — `min-h-dvh` tercih
- Sidebar width'i değiştirme veya `position: fixed` yapma
- `body { overflow-x: auto }` veya `overflow: scroll` ekleme

**Yap**:
- Yeni page eklerken §42.7 checklist'i takip et (1280/1440/1600 tier)
- Max-width pattern'i değiştirirken aynı PR'da
  `loading.tsx`'i de güncelle (CLS=0)
- AnnouncementBanner / TrialBanner shell tarafından mount edilir,
  page tarafında mount etme (duplicate)
- Yeni shell yapısı ekleyen Phase'lerde `lg:overflow-hidden` + inner
  `lg:overflow-y-auto` pattern intact tutulmalı (sidebar fixed, main
  scrolls)

---

## §43 — Reputation Operating System Suite (kanonik, 2026-05)

Buaze'nin "Reputation OS" pozisyonunu somut feature setine bağlayan
4 katmanlı sistem.

### §43.1 Mimari (4 katman)

1. **Auto-draft sistemi** — Hem Buaze (internal) feedback hem Google
   Business Profile reviews için arka planda AI yanıt taslağı.
2. **Health snapshot history** — Baseline (Google connect anında) +
   aylık snapshot + "Buaze öncesi vs şimdi" delta.
3. **Monthly health report email** — Her ayın 1'i 10:00 UTC, owner'a
   Pulse template ile sağlık skoru + öneriler.
4. **Profile recommendations + UI** — Deterministik kurallar (Vision
   API yok), öncelik sıralı 5 öneri kart'ı.

### §43.2 Schema (yeni 2 tablo + 1 enum extension)

- **`GoogleReviewAiDraft`** (`google_review_ai_drafts`):
  `restaurantId` + `reviewName` `@@unique`; `body/tone/source/commentHash/generatedAt/latencyMs`; cascade on Restaurant delete.
- **`RestaurantHealthSnapshot`** (`restaurant_health_snapshots`):
  `kind: 'baseline' | 'monthly'`, Google + Feedback metric'leri, computed `healthScore`, `[restaurantId, kind, capturedAt] @@unique`.
- **`LifecycleEmailType`** union'a `'monthly_health_report'` eklendi.

Migration: `prisma/migrations/20260518000000_reputation_os_suite`.
Tüm field'lar nullable + default'lu (CLAUDE.md §21.18).

### §43.3 Health score formülü (saf fonksiyon)

`src/lib/reputation/health-score.ts:computeHealthScore()`:
- Profile completeness (40%): `profileComplete` 60% + `googleMediaCount` (10+→100, 4+→70, 1+→40, 0→0) 40%
- Responsiveness (30%): feedback reply rate 60% + unanswered Q&A 40%
- Reputation (30%): Google rating × confidence + feedback rating × confidence (weighted by count)
- Composite: `profile×0.4 + responsiveness×0.3 + reputation×0.3`
- Yeni restoranlar 30-40 başlar (room-to-grow). Test edilebilir, DB-agnostic.

### §43.4 Cron schedule (4 yeni cron, vercel.json)

| Path | Schedule | Görev |
|---|---|---|
| `/api/cron/feedback-autodraft` | `0 5 * * *` (günlük) | Son 48h içinde draft'sız Buaze feedback'leri tara (safety net) |
| `/api/cron/google-reviews-autodraft` | `0 6 * * *` (günlük) | Bağlı tüm Google integrations × unreplied reviews → draft |
| `/api/cron/monthly-health-snapshot` | `0 2 1 * *` | Aylık snapshot — 02:00 UTC |
| `/api/cron/monthly-health-report` | `0 10 1 * *` | Aylık rapor maili — 10:00 UTC (snapshot'tan 8 saat sonra) |

Auth: `Bearer ${CRON_SECRET}`. Self-fetch antipattern yok — `run*` shared helper export'lu.
Google reviews auto-draft hard-cap 30 review/restaurant + sequential per-restaurant. 429 → skip cycle.

### §43.5 Baseline hook (OAuth callback)

`POST /api/restaurants/[id]/google/business/locations/select` — owner ilk Google location seçtiğinde fire-and-forget `captureBaselineSnapshot(restaurantId)` çağırır. Idempotent — baseline yalnız bir kez.

### §43.6 Endpoints + UI

- `GET /api/restaurants/[id]/reputation/health` — score + breakdown + recommendations (owner-scoped, 5min cache).
- `GET /api/restaurants/[id]/google/business/reviews` **EXTENDED** — response'a `drafts: Record<reviewName, {body, tone, source, generatedAt}>` eklendi.
- `<ReputationHealthCard>` — Google Reviews sayfasında üstte mount. Score + delta + 3-pillar breakdown + öneri top 4.
- `BusinessPulseAiSettings` (Account → Pulse AI) — 2 toggle "AKTİF" badge'i + "saat başı çalışır" açıklama. Cron'la bağlantı transparency.

### §43.7 Mail template

`src/lib/email/templates/monthly-health-report.ts`:
- Dark hero + lime score (Pulse §11), 4-stat grid (Google/Buaze/reply-rate/photos), vs-last-month delta, top 5 recommendations (severity badge), CTA → panel.
- Locale: TR + EN parity. Inline copy (DB-driven override gelecek scope).
- Sender: `sendMonthlyHealthReportEmail`. Idempotency: `LifecycleEmailLog` cooldown 25 gün.

### §43.8 Yapma / Yap

**Yapma**:
- Vision API entegrasyonu (deterministik kurallar mevcut, maliyet + KVKK + hata riski)
- Auto-send Google'a yorum gönderme — owner onayı zorunlu
- Cron'da paralel Google API call — quota patlatma
- Baseline'ı OAuth response'una senkron bağlama

**Yap**:
- Yeni metric: `HealthSnapshotInput` + migration + `computeHealthScore` ağırlığı
- Yeni öneri: `getProfileRecommendations()` içine deterministik threshold
- Yeni cron: `vercel.json` + `run*` shared helper + CRON_SECRET guard (§14.1 + §21.13)

---

## §44 — PayNKolay kartla ödeme (kanonik, 2026-11, Stage 176 §38.258)

> Dodo Payments (Stage 140–150) ve önceki Lemon Squeezy tamamen kaldırıldı;
> tek kartlı ödeme sağlayıcısı PayNKolay (Nkolay Ödeme Kuruluşu). Entegrasyon
> laffogato reposundaki PayNKolay altyapısından uyarlandı. Aşağıdaki eski
> §38.217–§38.230 kayıtları tarihseldir.

### §44.1 Akış

1. Owner `/pricing` kartından ya da Hesabım → fatura kartından
   `GET /api/billing/paynkolay/checkout?planId&cycle&locale` açar. Yalnız
   `restaurant_owner` (ekip üyesi / admin → `?payment=owner_only`); hız sınırı
   10/10 dk. Tutar istemciden alınmaz: `paynkolayCheckoutAmounts()` DB'deki
   TL fiyatından (`resolveBillingAmount(plan, cycle, 'TRY')`) hesaplanır.
2. Rota `BillingPayment` (pending) satırı yazar ve PayNKolay barındırılan
   ödeme sayfasına kendini gönderen bir form döner (`${base}/Vpos`,
   `hashDataV2` = SHA-512 base64 `sx|ref|amount|successUrl|failUrl|rnd|customerKey|secret`).
3. PayNKolay `POST /api/billing/paynkolay/return`'a döner. Dönüş gövdesine
   güvenilmez: `confirmPayment()` `/Vpos/Payment/PaymentList` ile (sxList)
   ödemeyi sunucudan sorgular ve `decidePayment()` yalnız aynı
   `CLIENT_REFERENCE_CODE` satırlarına bakar: tutar (ve para birimi, 3D, tek
   taksit) birebir tutan tek SUCCESS satışı `succeeded`, birden çoğu
   `duplicate`, tutmayan `charged_mismatch` (inceleme), sonuçsuz olan
   `not_found|indeterminate` (pending kalır, motor mutabakatı karar verir).
   `settlePaynkolayPayment()` idempotenttir: abonelik satırını `FOR UPDATE`
   kilitler, ödemeyi `status IN ('pending','failed')` koşuluyla sahiplenir
   (`needs_review` asla), aboneliği bir dönem uzatır, `User.plan`'ı günceller,
   `BillingInvoice` (`PNK-YYYYMM-xxxx`) yazar ve plan modüllerini uygular (§5.2).
   303 → `?payment=success|failed|pending|review` (süresi dolmuş owner
   `/pricing?plan=expired&payment=…`'e gider, §44.3).
4. Otomatik yenileme yok (kayıtlı kart / otomatik yenileme altyapısı bayraklar
   arkasında kapalı, §44.3): her ödeme bir ay / bir yıl alır; owner "Süreyi
   uzat" ile öder. Süresi geçen PayNKolay dönemleri `expireLapsedPaynkolayPeriods`
   ile `expired`'a çekilir (`lifecycle-emails` günlük + `billing-renewals` saatlik).

### §44.2 Kurallar

- Yalnız TL (para birimi 949), tutarlar kuruş tam sayı. Pazarlama fiyatı USD
  gösterir (§15.2); kartla ödeme düğmesi TL tutarı yazar. Bir paket ancak
  admin `/admin/plans`'ta `paymentProvider: 'paynkolay'` + TL fiyat girerse
  kartla satılır; aksi halde eski kayıt/iletişim akışı.
- CSP: site `form-action 'self'` checkout rotasına uygulanmaz (`next.config.ts`
  CSP kaynağı `/((?!api/billing/paynkolay/checkout).*)`); Chrome form-action'ı
  3D Secure yönlendirmelerinde de uygular. Checkout HTML'i kendi dar CSP'sini taşır.
- Env (hepsi opsiyonel, `validate-env.js`): `PAYNKOLAY_ENV`, `PAYNKOLAY_SX`,
  `PAYNKOLAY_SX_LIST`, `PAYNKOLAY_MERCHANT_SECRET_KEY`, `PAYNKOLAY_MERCHANT_NO`,
  `PAYNKOLAY_BASE_URL`. `PAYNKOLAY_ENV=live|test` zorunlu, varsayılan host yok:
  live → `https://paynkolay.nkolayislem.com.tr`, test →
  `https://paynkolaytest.nkolayislem.com.tr`; `PAYNKOLAY_BASE_URL` verilirse bu
  host'a birebir eşit olmalı. Eksik/hatalıysa checkout `?payment=unavailable`
  döner; herhangi bir `PAYNKOLAY_*` `PAYNKOLAY_ENV`'siz verilirse build hata verir.
  Fiyat sayfası kart düğmesini gizli değer gerektirmeyen `paynkolayAdvertised()`
  ile gösterir. Gizli değerler yalnız runtime'da (Coolify: "Available at
  Buildtime" kapalı); başlangıç kontrolü `checkBillingRuntime()` (instrumentation).
- Admin `MemberBillingModal` manuel akışı (kurumsal, iade, eski fiyat) korunur;
  `BillingSubscription.source` `'manual' | 'paynkolay'`.
- DB'de eski `subscription_plans.dodo_product_id` kolonu ve `dodo_webhook_events`
  tablosu bırakıldı (şemadan çıkarıldı, DROP yok — deploy sırasında eski
  sürümün kırılmaması için). Ayrı bir temizlik migration'ı ile silinebilir.
- Kart bilgisi Buaze'ye hiç gelmez; log/Sentry'ye yalnız `paymentId` ve
  `userId` yazılır (§37.7). Ham REFERENCE_CODE asla (csTranId gibi
  çalışabilir, D7; `referencecode` `SENSITIVE_KEYS`'te); gerekirse yalnız
  `rf1_` parmak izi.

### §44.3 Kayıtlı kart + otomatik yenileme altyapısı (temel, PR 1; spec `billing-spec-final.md`)

Owner'a görünmez temel katman. Kart saklama, otomatik çekim, hatırlatma ve
onay ekranları sonraki PR'larda gelir; bu katman hiçbir kartı çekmez, owner'a
mail atmaz.

- **Modüller** (`src/lib/billing/`): `flags.ts` (tek okuyucu; bağlama),
  `billing-settings.ts` (singleton: tick lease, breaker, günlük işaretler),
  `vault-crypto.ts` + `sensitive.ts` + `redact.ts` (mühürleme, HMAC kimlikler,
  log/Sentry temizleme), `renewal-policy.ts` (saf: İstanbul takvimi,
  `addPeriod`, deneme takvimi, durum makinesi `canTransition`,
  `evaluateRenewal`), `renewal-store.ts` + `renewal-store-prisma.ts`,
  `renewal-engine.ts` (`runRenewalTick`), `paynkolay-billing.ts` (settle /
  post-settle / expiry), `card-vault.ts` (şimdilik yalnız sağlayıcı silme),
  `retention.ts`, `refund-queue.ts`, `return-flow.ts`. Ödeme kararı
  `src/lib/payment/paynkolay.ts` `decidePayment` (`PaymentDecision`: yalnız
  aynı `CLIENT_REFERENCE_CODE` satırları; `succeeded|duplicate|failed|not_found|indeterminate|charged_mismatch`).
- **Bayraklar (adlar)**: `PAYNKOLAY_CARD_STORAGE`, `PAYNKOLAY_HOSTED_CARD_SELECT`,
  `PAYNKOLAY_AUTO_CHARGE` (hepsi varsayılan kapalı; bilinmeyen değer = kapalı),
  `PAYNKOLAY_AUTO_CHARGE_DRY_RUN` (yalnız tam `off` iken kapalı). Diğer adlar:
  `PAYNKOLAY_ENV`, `BILLING_VAULT_KEY`, `BILLING_HMAC_KEY` (+`_PREVIOUS`),
  `BILLING_ALLOWED_HOSTS`, `BILLING_LIVE_DB_REF`, `TRUSTED_PROXIES`,
  `PAYNKOLAY_MIT_*`, `PAYNKOLAY_NON3D_LIMIT_TRY`. Gizliler yalnız runtime.
- **Bağlama (D18)**: `billing_settings.provider_env` yalnız
  `scripts/billing-bind-env.ts` ile yazılır. `binding.ok` için: izinli
  PayNKolay host'u + açık `PAYNKOLAY_ENV`; **açıkça yazılmış**
  `NEXT_PUBLIC_SITE_URL` host'u `BILLING_ALLOWED_HOSTS`'ta (SITE_URL'in üretim
  varsayılanı sayılmaz); Coolify `COOLIFY_FQDN`/`COOLIFY_URL` verirse en az biri
  listede; `NODE_ENV=production` ve Vercel önizlemesi değil (`VERCEL_ENV`)
  ya da `PAYNKOLAY_ENV=test`; satır eşleşmesi. Tutmazsa motor hiçbir şey yapmaz
  (`skipped: 'binding'`, Sentry uyarısı `billing-binding-skipped`). Ödeme/yenileme
  satırları `provider_env` taşır; NULL = `live`.
- **Barındırılan ödeme ortamı (D18, bayraksız akış)**: `hostedPaymentEnvCheck`
  checkout, dönüş ve settle'da: test ödemesi üretim veritabanında
  (`BILLING_LIVE_DB_REF`) ya da `test`'e bağlanmamış veritabanında asla
  oluşturulmaz / sonuçlanmaz; bağlı veritabanında ortam eşleşmeli; G0'dan önce
  (satır yok) yalnız `live`. Checkout `?payment=unavailable`, dönüş `pending` +
  Sentry `billing-env-mismatch`, settle yazmadan `BillingEnvMismatchError`.
  `validate-env` `PAYNKOLAY_ENV=test` + üretim DB'sini bayraklardan bağımsız reddeder.
- **Cron**: `GET /api/cron/billing-renewals` (`withCronGuard`,
  `isCronAuthorized` sabit zamanlı). Coolify saatlik `25 * * * *`;
  `vercel.json` günlük `0 6 * * *` yalnız test sözleşmesi. Tick: lease (advisory
  lock değil), 240 sn bütçe; fazlar: reconcile (bekleyen ödeme PaymentList ile
  kapanır; terk edilmiş hosted ödeme 45 dk sonra `failed('no_transaction')`,
  7 gün geç-başarı kontrolü; 48 sa çözülmeyen → inceleme), lapse (+expiry),
  tombstone, günlük tarama (İstanbul günü başına bir kez, 09:00 İstanbul'dan
  sonraki ilk tick; red oranı, geciken iade; tarih aralığı taraması Q-16
  doğrulanana dek kapalı), retention (İstanbul günü başına bir kez).
  **Çekim fazı yok.**
- **Settle (§11.2)**: kilit sırası abonelik → ödeme (`disableAutoRenew` ve
  expiry ile aynı): önce abonelik `FOR UPDATE`, sonra sahiplenme ve ödemenin
  yeniden okunması (`refundOnSuccess` kilit altında). Abonelik satırı yoksa
  `create` (upsert değil: Prisma upsert'i `ON CONFLICT DO UPDATE` olur, eşzamanlı
  iki ilk ödemeden biri sessizce ezilirdi) → kaybeden P2002 → bir kez yeniden.
  Dönem İstanbul takviminde ve çapa günüyle (`billingAnchorDay`, 31 Oca → 28 Şub
  → 31 Mar); çapa yalnız `renewsAt`'e uyuyorsa kullanılır (admin düzenlemesi
  bayatlatır; admin fatura PUT'u dönem/döngü/paket değişince çapayı sıfırlar).
  Aynı paket + `active` → döngü değişse de mevcut dönemin üstüne eklenir (ödenmiş
  günler kaybolmaz; döngü değişince çapa `renewsAt` gününe). past_due / 7 gün
  içinde düşmüş aynı paket + döngü E'ye çapalanır; aynı dönem için ikinci ödeme
  `duplicate_period` → iade kuyruğu (D19, `scripts/billing-refund-queue.ts`);
  PayNKolay aynı `clientRefCode`'u birden çok çektiyse `provider_duplicate`
  (`refundAmountMinor` = fazla çekimler; owner'ın faturası `paid` kalır) ya da,
  ödemenin kendisi iade ediliyorsa, tüm çekimler; silinmiş hesap (`del_…`) ve
  tekrar kullanılan referans → `needs_review`. REFERENCE_CODE yalnız `rf1_`
  parmak izi (anahtar yoksa `paynkolay:<id>` + Sentry `billing-vault-key`,
  süreç başına bir kez).
- **Expiry (§11.3)**: `active` ve `past_due`; ödemesi süren ya da grace'i
  bitmemiş onaylı yenileme atlanır; settle ile aynı satır kilidi.
- **Silme (§11.6)**: bekleyen ödeme / süren çekim varken en çok 7 gün ertelenir
  (`deferred: 'billing_in_flight'`, admin 409); kartlar önce sağlayıcıda silinir,
  olmazsa mühürlü anahtarın birebir kopyasıyla tombstone; ödeme ve onaylar `del_`
  takma adıyla saklanır.
- **Kapılar**: G0 — gizliler runtime-only ve imaj incelendi; `BILLING_HMAC_KEY`
  + `BILLING_VAULT_KEY` üretildi, ayarlandı, çevrimdışı yedeklendi (HMAC anahtarı
  PayNKolay yapılandırılır yapılandırılmaz gerekir: settle parmak izi, silmede
  sabit takma ad; yoksa başlangıçta `billing-vault-key`); `NEXT_PUBLIC_SITE_URL`
  açıkça, `BILLING_ALLOWED_HOSTS=www.buaze.com,buaze.com`, `BILLING_LIVE_DB_REF`;
  Coolify Scheduled Task `billing-renewals` (`25 * * * *`, docs/SELF_HOST.md);
  `billing-bind-env --env live`; `backfill-reference-fingerprints`, ardından
  `prisma/migrations-gated` migration'ı; ilk tick yanıtında `skipped` yok.
  Çekim kodu (PR 3) yalnız sandbox soruları (Q-1, Q-3, Q-6, Q-7, Q-9, Q-16)
  doğrulanınca birleşir.

**Yapma**: dönüş POST'undaki durum alanına güvenip aboneliği açma (her zaman
PaymentList); tutarı istemciden alma; checkout rotasına site CSP'sini geri
uygulama; otomatik yenileme varmış gibi metin yazma; onay gelmemesini "ödenmedi"
sayma; token, TranId veya ham REFERENCE_CODE saklama; `customerKey`'i JSON, URL
ya da loga koyma; faturalamada `ENCRYPTION_KEY` kullanma; dönüş gövdesini ya da
sorgu dizgesini Sentry'ye / loga verme.
**Yap**: yeni ödeme yüzeyi checkout rotasına link verir (`<a>`, Next `<Link>`
değil); yeni plan alanı eklenirse `paynkolayCheckoutAmounts` ve `toPublicPlan`
birlikte güncellenir.

### §44.4 Kayıtlı kart (PR 2, `PAYNKOLAY_CARD_STORAGE`, varsayılan kapalı)

Bayrak kapalıyken owner bugünkü akışı görür (GET checkout → aktarım sayfası); kart arayüzü, inceleme sayfası ve
hatırlatma maili yoktur. Yalnız şu düzeltmeler her durumda geçerlidir: aktarım sayfası sabit betik/stil + SHA-256
CSP ile (`checkout-interstitial.ts`, `unsafe-inline` yok), `cardHolderIP` güvenilir istemci IP'si, eski "Admin
tarafından yönetilir" etiketi yalnız `source='manual'`, "Destek üzerinden" rozeti yok, plan seçicide aylık/yıllık.

- **Kart yalnız ödeme sırasında, PayNKolay'ın sayfasında kaydedilir** (`customerKey` + `csAutoSave` + `csCardAlias`,
  D2). `customerKey` tarayıcıya yalnız kart kaydeden ödemede gider (D13). Kayıt PayNKolay listesiyle doğrulanır
  (`reconcileCardsAfterSave`: alias eşleşmesi ya da yeni kimlik + `card_save` onayı); sonra diğer bağlanmamış
  kartlar silinir (D1). Doğrulanamazsa `cardSaveResult='pending'` kalır, motor tekrar dener; yeni kart listede
  görünmüyorsa 1 saat `pending` kalır (tek liste kanıt değildir), sonra `not_saved`. D1 silmesi doğrulanmazsa
  (silme zaman aşımı, yeniden liste boş ya da eski kartı hâlâ gösteriyor) eski kart `replaced` işaretlenmez;
  motor faz 1(f) `retryCardCleanup` ile 7 gün boyunca her saat tekrar dener.
- **Sayfalar** (`src/app/billing/[locale]/`, kendi kök düzeni, `RootHtml secure`): `/billing/{l}/checkout` inceleme +
  onay (yerel form → `POST /api/billing/paynkolay/checkout`), `/billing/{l}/result` sonuç (yalnız ödemenin sahibine
  ayrıntı), `/billing/{l}/card` kayıtlı kart + "Kartı kaldır" (panel kapısının dışında: planı biten sahip de kartını
  silebilir; saklama maili buraya gider). Middleware nonce + `'strict-dynamic'` CSP (`page-csp.ts`),
  `Referrer-Policy: same-origin` (`no-referrer` DEĞİL: o politikada tarayıcı form POST'unda `Origin: null` yollar ve
  her ödeme origin kontrolünden düşer; checkout route `Origin: null`'u yalnız `Sec-Fetch-Site: same-origin` ile
  kabul eder), Session Replay kapalı, `robots` dışı. Bayrak açıkken GET checkout inceleme sayfasına 303 yapar,
  dönüş sonuç sayfasına gider. İnceleme sayfası giriş skoru kapısını ödeme düğmesinden ÖNCE gösterir
  ("Yeniden giriş yap"); yenileme linki dönem bittikten sonra aynı paketi yeni ödeme olarak açar.
- **Checkout POST** (`checkout-post.ts`): Origin, sahip (impersonation yok), D18, hız sınırları + kart deneme
  kontrolleri (hesap 5/24 sa, 7 günden genç hesap 3/24 sa, 3 başarısız/24 sa, IP 10/24 sa + IP başına 5 başarısız
  ödeme/24 sa — DB'de `billing_payments.client_ip_fp` HMAC parmak izi ile sayılır, ham IP yok, saklama 2 gün sonra siler),
  reCAPTCHA giriş skoru (`users.last_login_risk_score` ≥ 0,5, < 24 sa; login/register/Google yazar — ödeme
  sayfasına Google betiği girmez), kart kaydı yalnız doğrulanmış ve ≥ 24 sa hesap, onay metni hash'i, sayfadaki
  tutar. Tek işlem: abonelik `FOR UPDATE`, ödeme, `card_save` onayı (metin + hash + hukuki metin sürümleri + IP + UA),
  açık yenileme varsa `owner_paying` kilidi (D19). Sahibin kendi bekleyen ödemesi (PayNKolay sayfasından dönmüş
  olabilir) yeni ödemeyi engellemez: yeni ödeme kilidi devralır; ikisi de geçerse ikincisi `duplicate_period` ile
  iade kuyruğuna girer. Giriş skoru olmayan giriş (reCAPTCHA yapılandırılmışken) skoru `null` yazar: eski iyi skor
  sonraki değerlendirilmemiş girişe kefil olamaz. Otomatik yenileme kutusu bu sürümde yok (`autoRenew` → unavailable).
- **API**: `GET /api/billing/payment-method` (sahip; impersonation yalnız okur), `DELETE /api/billing/cards/[handle]`
  (handle yalnız sahibin kendi listesinde çözülür → başka sahibin handle'ı ya da tek listenin göstermediği kart 404,
  sağlayıcıya silme gitmez, `card_delete` onayı yazılmaz; silme yeniden listeyle doğrulanır, değilse 502
  `delete_unconfirmed`). `/api/billing/summary` kart etiketini (marka + son 4) yalnız sahibe döner (D9). Yanıtlar `private, no-store`; token, TranId,
  customerKey asla. Ortak tipler `card-types.ts` (istemci bunları import eder, `card-vault`'u değil).
- **Hatırlatma modu** (motor faz 2-3): kart saklama niyeti açıkken her PayNKolay aboneliğine E−7g'de satır;
  09:00–21:00 İstanbul içinde E−7g ve E−1g mailleri (`billing-renewal-upcoming`; gönderimde uygunluk yeniden
  değerlendirilir, iptal / manuel / dönem sonu iptali satırı `canceled` yapar), düşen dönemde `billing-period-ended`
  (sahip bu arada yenilediyse gönderilmez), saklı kart silinmeden 14 gün önce `billing-card-retention` (faz 8
  yalnız pencere içindeki ilk tick'te çalışır, D10). Çekim fazı yok (PR 3).
- **Panel**: `src/components/dashboard/billing/` (`CardVisual`, `SavedCardPanel`, `RenewalNotice`,
  `usePaymentMethod`, `billing-copy` → `src/lib/billing/billing-copy.ts` TR/EN). Ekip üyesi kart görmez (D9).

**Yapma**: inceleme/sonuç sayfasına üçüncü taraf betik veya `RootHtml`'siz düzen ekleme; aktarım betiğine/stiline
değer gömme (hash değişir); kartı ödeme dışında kaydetmeye çalışma; handle'ı başka sahibin listesinde arama.

## §45 — Reply Content Safety Gate + Responsibility Consent (kanonik, 2026-09)

Owner/admin replies go out under the Buaze brand (email sender, Google
Business Profile reply, in-app record) — a threat or hate-speech reply is a
legal exposure for Buaze, not just the sender. Two independent controls,
both hard gates with no override:

1. **Content safety** — `src/lib/content-safety.ts` `moderateReplyContent()`.
   Primary detector: OpenAI Moderation endpoint (`omni-moderation-latest`,
   free, purpose-built for harassment/threatening/hate/violence — multi-
   language). Before it, the deterministic risk gate (§48,
   `src/lib/reply-risk.ts`) — runs with or without `OPENAI_API_KEY`. Wired
   into `/api/feedback/[id]/reply` POST (422 `content_blocked`) and
   `/api/restaurants/[id]/google/business/reviews/reply` POST (Zod
   `confirmResponsibility: z.literal(true)` + moderation before the Google
   API call). AI_QUOTAS (§15.1) do **not** apply — this is a safety
   control, not a generative feature; gating it behind a user quota would
   open a bypass window once quota is exhausted.
2. **Per-message responsibility checkbox** — required on every send (not
   persisted): owner/admin composers (`FeedbackReplyComposer.tsx`,
   `AdminFeedbackReplyComposer.tsx`) and the Google review `ReviewCard`
   composer all render a checkbox linking to the existing **Kabul
   Edilebilir Kullanım Politikası** (`/kabul-edilebilir-kullanim` — no new
   legal doc was authored, the existing AUP already lists threats/hate/
   defamation as prohibited and carries an indemnity clause). State resets
   to unchecked after every successful send and on every feedback switch.
   Server-side: `/api/feedback/[id]/reply` rejects `confirmResponsibility
   !== true` with 400 `consent_required`; the Google route enforces it via
   Zod `z.literal(true)`.
3. **Registration** — `RegisterForm.tsx` gained a 5th checkbox (4 now
   mandatory): "I am solely responsible for the content of every reply/
   message I send" linking to the same AUP page. `register/route.ts` logs
   `kabul-edilebilir-kullanim` consent unconditionally (defense-in-depth,
   same pattern as the other 3 mandatory docs). `ensureOnboardingConsents`
   (`src/lib/legal/consent.ts`) — the backfill that already covers Google
   OAuth sign-up (which has no consent-checkbox UI) — got the same key
   added to `requiredKeys`, so Google sign-ups are covered without
   touching the OAuth flow itself.

**Yapma**: AI_QUOTAS gate on the moderation call (bypass risk). New
threat-keyword patterns broader than unambiguous phrases (false-positive
blocks a legit reply outright, no override exists). A new legal document
for this — the AUP already covers it.

**Yap**: New reply-send surface → wire `moderateReplyContent()` +
`confirmResponsibility` before any DB write / outbound call, reset the
checkbox after success only (not on transient failure).

---

## §47 — Şirket unvanı ve kullanıcı e-postalarında küfür engeli (kanonik, 2026-11)

**Şirket unvanı tek kaynaktan**: admin → Hukuki metinler → Değişkenler → `COMPANY_NAME` (+ `COMPANY_ADDRESS`). Hukuki metinler, pazarlama footer'ı ve Organization JSON-LD `legalName` (layout + about) aynı değeri `getCompanyLegalInfo()` (`src/lib/legal/variables.ts`) ile okur. Değer varsayılan ("Buaze") veya `[yer tutucu]` iken yalnız marka adı gösterilir; kayıtsız bir "A.Ş." asla yayınlanmaz. Kodda unvan hardcode etme. ISR nedeniyle footer'a yansıması en geç 1 saat.

**Küfür engeli**: `src/lib/profanity.ts` (`containsProfanity`) TR, EN, DE, FR, ES, PT, IT, RU, AR ve 2026-11'den beri NL, PL, RO, EL, Balkan dilleri, FA, HI/UR, ZH, JA, KO küfürlerini yakalar (Çince/Japonca/Korece kelime sınırı olmadığı için düz alt dize; masum kelime listesi testte) (leet, uzatılmış harf ve "f.u.c.k" ayraç varyantları dahil). `moderateReplyContent` önce bunu çalıştırır (`reason: 'profanity'`, ağsız; OpenAI anahtarı yokken de çalışır), sonra OpenAI moderasyonu. İşletmenin müşteriye e-postayla yanıtı ve Google yanıtı 422 `content_blocked` ile durur. Yanlış pozitif kuralı: "sık", "sıkı", "sıkıntı", "sıkışık" ve "Amina" gibi masum kelimeler ASCII yazımda bile engellenmez — yeni kelime eklerken `tests/profanity.test.ts` masum listesine örnek ekle.

**Sorumluluk reddi**: müşteriye giden yanıt e-postasının (`customer-reply`) HTML ve düz metin sürümünde sabit (admin'de düzenlenemez) not: içerikten yalnız gönderen işletme sorumludur, Buaze içeriği yazmaz/onaylamaz, uygunsuz içerik support@buaze.com'a bildirilir. 2026-11'den beri metin Buaze'nin 5651 sayılı Kanun kapsamında yer sağlayıcı olduğunu (EN sürüm: Law 5651 + AB Dijital Hizmetler Yasası md. 4–6) belirtir. Kabul Edilebilir Kullanım Politikası §5.4 "Müşterilere gönderilen yanıtlar" (TCK 106/125/216, KVKK, TBK; filtreler sorumluluğu Buaze'ye geçirmez; gönderim başına onay; tazmin) aynı kuralı sözleşmeye bağlar. DB'deki yayımlanmış hukuki metin kopyası kod varsayılanından eskiyse admin → Hukuki metinler → "Varsayılana dön". Gönderim başına sorumluluk onayı (§45) ile birlikte çalışır.

## §46 — Zaman Damgası Saat Dilimi (kanonik, 2026-09)

Yorum/aktivite zaman damgaları **işletmenin yerel saatinde** gösterilir ve
saat dilimi tek noktadan gelir: `src/lib/timezone.ts`.

**Sorun**: `new Date(iso).toLocaleTimeString('tr-TR')` çalıştığı ortamın
TZ'sini kullanır. Vercel serverless process TZ = UTC, tarayıcı ise cihaz
TZ'si. Aynı yorum üç farklı saat gösteriyordu — düşük puan uyarı mailinde
11:32 (UTC, sunucuda render), owner panelinde 14:32, yurt dışındaki
owner'da bambaşka. Ek olarak `low-rating-alert` damgası `new Date()` ile
**mail render anını** basıyordu, yorumun bırakıldığı anı değil (cron/retry
akışlarında saatlerce sapma).

**Kanonik helper** (`src/lib/timezone.ts`):
`DEFAULT_DISPLAY_TIME_ZONE` (`Europe/Istanbul`) · `resolveDisplayTimeZone(pref?)`
(pref → `NEXT_PUBLIC_DISPLAY_TIMEZONE` → default; geçersiz IANA sessizce
default'a düşer) · `formatClock` · `formatStampInTimeZone` ·
`formatFullDateTimeInTimeZone` · `formatCompactStampInTimeZone` ·
`isSameDayInTimeZone`. Hepsi geçersiz girdide `''`/`false` döner, throw
etmez. `tests/timezone.test.ts` host TZ'sinden bağımsızlığı sabitler.

**Yapma**:
- Yorum/aktivite damgası için `toLocaleTimeString` / `toLocaleString` /
  date-fns `isSameDay`'i doğrudan çağırma — çalıştığı ortamın TZ'sine kayar.
- Mail template'inde zaman damgasını `new Date()` ile üretme — olayın
  gerçek zamanını (`Feedback.createdAt`, `review.createTime`) parametre
  olarak geçir.
- Damgayı `useState`+`useEffect` hydration gate'i arkasına saklama
  (§38.237 paterni) — TZ sabitlendiği için sunucu ve tarayıcı aynı
  string'i üretir, gate gereksiz.
- `User.timezone` (§38.37) alanını gösterimde tek başına kullanma: owner'ın
  kişisel TZ'si ile işletmenin saati ayrışırsa mail ile panel yine farklı
  saat gösterir. Alan profil formunda saklanmaya devam eder; restoran
  bazlı TZ gerekirse helper'ın `pref` parametresine tek noktadan bağlanır.

**Yap**:
- Yeni zaman damgası yüzeyinde helper'lardan birini kullan.
- Yeni mail template'i olay zamanı gösteriyorsa `submittedAt` + `timeZone`
  parametrelerini kabul et (`low-rating-alert` / `new-review` paterni) ve
  caller gerçek `createdAt`'i geçsin.
- Gün gruplaması ("Bugün / Dün") `isSameDayInTimeZone` ile — gece yarısına
  yakın olaylar aksi halde yanlış gruba düşer.
- Sunucuda render edilen her tarih (`toLocaleDateString`, `Intl.DateTimeFormat`)
  `timeZone: resolveDisplayTimeZone()` alır; almazsa uzak saat dilimindeki
  tarayıcıda hidrasyon hatası olur (Stage 170: QR kartı, işletme detayı, fatura kartı).

## §48 — Yanıt risk kapısı (kanonik, 2026-11)

İşletmenin müşteriye Buaze üzerinden gönderdiği her yanıt (düşük puana e-posta, dahili yanıt, Google yanıtı) Buaze adıyla çıkar; hukuki ya da gönderici itibarı riski taşıyan her şey **engellenir ve gönderilmez/kaydedilmez** — geçersiz kılma yok. Kaynak: `src/lib/reply-risk.ts` `checkReplyRisk(text, { allowedHosts })` — saf (ağ yok, Prisma yok), sunucu ve istemci aynı kuralları çalıştırır. `moderateReplyContent` (§45) önce bunu, sonra OpenAI moderasyonunu çalıştırır; anahtar yokken de kapı tam çalışır.

Kategoriler (`ReplyRiskKind`): `threat`, `hate`, `profanity` (§47 sözlüğü + yıldızla gizlenmiş küfür + 🖕), `insult` (hakaret: aptal, yalancı, gerizekalı… — "yalancı dolma", "aptalca" gibi masum biçimler geçer), `legal_intimidation` (dava/mahkeme/savcılık/polis + müşteriye yönelik aynı cümlede), `review_pressure` (yorumu sil/kaldır/geri çek, puanı değiştir/yükselt, "5 yıldız verirseniz", "karşılığında indirim" — geçmiş zaman teşekkürü "5 yıldız verdiğiniz için" geçer), `personal_data` (geçerli TCKN, Luhn kart no, mod-97 IBAN), `link` (yalnız işletmenin kayıtlı web sitesi / platform / sosyal linkleri + `buaze.com`; kısaltıcı, IP, `user@host` hilesi, punycode, `[.]` gizleme engellenir; e-posta adresleri link sayılmaz), `markup` (`<script>`, `javascript:`, `onerror=`), `unusual_characters` ("uygunsuz harfler": yön değiştiren / kontrol / tag karakterleri, kelime içinde görünmeyen karakter, aynı kelimede Latin + Kiril/Yunan karışımı, süslü yazı tipi harfleri, zalgo).

- Sunucu: `/api/feedback/[id]/reply` 422 `{ error: 'content_blocked', reason, issues, messages }`; Google yanıtı 400 `{ code: 'CONTENT_BLOCKED', issues, messages }`. İzinli hostlar `loadReplyAllowedHosts(restaurantId)` (`src/lib/reply-allowed-hosts.ts`; DB hatasında boş liste = yalnız buaze.com).
- İstemci: `src/components/reply/ReplyRiskNotice.tsx` — `useReplyRisk(text)` canlı önizleme (linkler istemcide uyarı, sunucuda engel), kırmızı kutu hangi kuralın tetiklendiğini söyler, Gönder kapanır. Owner + admin yorum yanıtı, Pulse AI "Olduğu gibi gönder", Google yanıtı kutularında bağlı. Hata metni sunucunun ham metninden değil `issues` anahtarlarından üretilir (`blockedReplyMessage`).
- Testler: `tests/reply-risk.test.ts` (engellenmesi gereken ~60 cümle + geçmesi gereken ~25 gündelik yanıt), `tests/content-safety.test.ts`.

**Yapma**: Yeni kural eklerken geçmesi gereken gündelik cümleyi test etmeden ekleme (yanlış pozitif = engellenen meşru yanıt, geçersiz kılma yok); kuralı AI kotasına bağlama (§45); istemci önizlemesini tek kapı sanma (sunucu her zaman yeniden kontrol eder).

**Yap**: İşletme adına müşteriye metin gönderen yeni her yüzey → `moderateReplyContent(text, { allowedHosts: await loadReplyAllowedHosts(id) })` + `ReplyRiskNotice`; engel durumunda yazma/gönderme yok.

## §49 — Panel teması (Geist + shadcn yoğunluğu), işletme geçişi ve franchise yönetimi (kanonik, 2026-11)

**Tipografi (2026-11 güncel)**: paneller sitenin font çiftini kullanır (§11: Clash Display başlık + Inter metin + JetBrains Mono). Geist (`src/lib/panel-fonts.ts`, `PanelTheme`) kaldırıldı; geri ekleme. Panel başlıkları ve sayılar Clash Display Semibold (600).

**Tema anahtarı**: `globals.css` `:root:has(.bz-panel)` bloğu (`@layer components` içinde; başlık ağırlığı katmansız). `.bz-panel` sınıfı owner shell kökünde, admin layout kökünde ve dashboard admin-önizleme sarmalayıcısındadır. Bu blok fontlara dokunmaz; `bz-card` (12px + ince gölge), `bz-btn*` (8px, 500), `bz-input` (8px + ince gölge, lime odak halkası korunur), `bz-tabs` (segment kontrol), `bz-table` (düz başlık), `bz-menu` (10px / 6px öğe), `bz-badge` (500) görünümünü shadcn'e çeker. Renkler Pulse (§11) olarak kalır.

**Yapma**: panel-özel görünümü doğrudan `.bz-card` / `.bz-btn-*` kuralına yazma — pazarlama, auth, `/r`, `/menu`, `/audits/[token]` aynı sınıfları kullanır; `:root:has(.bz-panel)` kapsamına yaz. Panel dışı bir yüzeye `.bz-panel` ekleme. Marka önizlemesinde (`BrandIdentityCard`) `--font-heading` kullanma — müşterinin markası Clash Display ile gösterilemez (lisans, §11); `--font-space-grotesk` / `--font-inter`'i doğrudan kullan. Shadcn / base-ui paketlerini ekleme (§30.4); görünüm token düzeyinde alınır.

**İşletme geçişi**: `src/components/dashboard/BusinessSwitcher.tsx` tek bileşen (varyant `sidebar | collapsed | topbar | mobile`). Panel `<body>`'ye portal + `position: fixed`; 640px altında `.bz-menu--sheet`. Arama ≥5 işletme, "Son kullanılanlar" ≥6 (`localStorage['buaze.owner.recentRestaurants']`, en çok 4). Saf mantık `src/lib/business-switcher.ts` (`tests/business-switcher.test.ts`; aksan/büyük-küçük harf duyarsız arama). Seçim shell'in `selectRestaurantScope`'una gider (aynı sayfada kalır, `/restaurants/<id>/…` yolunu yeni işletmeye çevirir). "Yeni işletme ekle" ekip üyelerinde gizli (`canAddBusiness`).

**Franchise yönetimi**: `/dashboard/restaurants` sıralanabilir tablo (lg) / kart (mobil). Sunucu tek `$transaction`: işletmeler + 30 gün `groupBy` (sayı + ortalama puan) + bekleyen düşük puan (`rating ≤ 3 AND isRead = false`, bildirim zili tanımı) + son yorum + platform kontrolleri → `summarizeReviewPlatformLinks`. Saf mantık `src/lib/business-overview.ts` (`attentionReasons`, `portfolioTotals` — puan yorum sayısıyla ağırlıklı, `sortPortfolioRows`; `tests/business-overview.test.ts`). "Panele geç" aktif işletmeyi yazar + `/dashboard?restaurantId=` açar. Sayfa §22 gereği scope-blind kalır (tüm işletmeler listelenir).

**Üst çubuk**: owner + admin masaüstü üst çubuğu `h-14 shrink-0` (flex sütun içinde; `shrink-0` yoksa uzun sayfada 37px'e ezilir). Owner'da tek satır ekmek kırıntısı ("Panel › Sayfa"); her sayfa kendi `PageHeader` h1'ini taşır. Masaüstü üst çubuktaki işletme seçici yalnız kenar çubuğu daraltılmışken ve 2+ işletme varken görünür (açık kenar çubuğunda zaten var).

**Admin franchise yönetimi (Stage 169)**: `/admin/restaurants` tek araç çubuğu (görünüm sekmesi `İşletmeler | Franchise'lar` + arama + Durum / Plan / Menü `PulseSelect`; filtre seçili değilken seçici yalnız adını gösterir). Franchise = birden çok işletmesi olan sahip hesabı; gruplama `src/lib/admin-franchise.ts` (`groupByOwner`, `countChains`; zincirler önce, sahipsizler sonda, puan yorum sayısıyla ağırlıklı; `tests/admin-franchise.test.ts`). Sahip filtresi URL'de `?owner=<userId>` → API `GET /api/restaurants?ownerId=` (admin dalı, `getScopedRestaurantIds` kapsamı korunur). Gruplama ve arama yalnız yüklenen sayfada (100'lük) çalışır; sayfada bunu söyleyen not var. İşletme Sahipleri → işletme sayısı ve satır menüsü bu filtreye gider; işletme detayında aynı sahibin şubeleri arasında "Şube" seçici.

**Mobil alt menü (owner + admin)**: düz beyaz hap (`background: #FFFFFF`, backdrop-filter yok) + `fixed inset-x-0 bottom-0` sayfa renginde gradyan bant (`pointer-events-none`, hap `pointer-events-auto`). Yarı saydam yüzey geri getirilmez — arkadaki metin etiketlerin içinden görünüyordu. `PanelSelectionBar` görünürken akışta boşluk bırakır (`reserveSpace`, varsayılan açık).

**Admin menüsü (Stage 175)**: kenar çubuğu, mobil alt menü ve Cmd+K paleti tek kaynaktan beslenir: `src/components/admin/admin-nav.ts` (`ADMIN_NAV`, `getAdminNav`, `getAdminMobileNav`, `getActiveAdminHref`, `adminRoleLabel`). Admin oturumu yalnız `superadmin | manager | staff` olabilir; `restaurant_owner` admin menüsünde yer almaz. Yeni admin sayfası = bu dosyaya tek kayıt (rol + gerekiyorsa `resource:action` izni + TR/EN etiket + palet anahtar kelimeleri). Menüden gizlemek yetki değildir: birden çok işletmenin verisini gösteren sayfa sunucuda rol/izin kontrolü yapar ve izinsiz hesabı `adminLandingPath` ile ilk izinli sayfasına yollar.

**Owner sayfa düzeni (Stage 170)**: admin ile aynı sade kurallar, her owner sayfasında:
- **İşletme seçimi tek yerde**: sayfa kendi "İşletme" seçicisini ya da işletme kartı ızgarasını taşımaz (menü merkezi dahil, Stage 171); kenar çubuğu / mobil üst çubuk `BusinessSwitcher`'ını izler (`?restaurantId` + değişim olayı). Birden çok işletmeli sahipte gerekiyorsa yalnız "Bu işletme / Tüm işletmeler" sekmesi (QR, anketler, platformlar). Durdurulmuş işletmeler shell'de seçilemediği için sayfa listelerinde de gösterilmez (hepsi durdurulmuşsa gösterilir).
- **Başlık**: en çok 1 ana + 1 ikincil düğme, gerisi "Diğer" `PulseMenu`. Üst çubuktaki "Panel › Sayfa" kırıntısını tekrarlayan eyebrow yok.
- **Araç çubuğu**: filtreler tek satırda ve tıklayınca uygulanır ("Uygula" düğmesi yok); tek seçenekli filtre gizlenir. `InboxToolbar` `toggles` prop'u (Yanıtsız / İşaretli / Atanmış gibi aç-kapat çipleri) ile "Diğer filtreler" penceresi gerekmez; admin `onOpenMoreFilters` yolu da çalışır.
- **Satır işlemleri**: 1 satır içi düğme + "…" `PulseMenu`. `PulseMenu` varsayılan `z-[70]` (mobil alt menü z-40 ve pencereler z-50 üstünde); panelde telefon genişliğinde menü satırları 44px.
- **QR kartı** (`src/components/panel/qr/QRCard.tsx`, owner + admin): "PNG indir" + "PDF yazdır" satır içi, kopyala / müşteri sayfası / sil "…" menüsünde; sabit "Aktif" rozeti yok. QR geçmişine (`QrGeneration`) yalnız oluşturma sihirbazı yazar (`GET /api/restaurants/[id]/qr?save=1`); küçük resim ve indirme istekleri geçmişi değiştirmez (eskiden her görüntüleme `createdAt`'i yenileyip listeyi karıştırıyordu).
- **Hesabım**: sağdaki plan / fatura widget'ları kaldırıldı (kullanım sayıları `BillingReadOnlyCard` `usage` prop'unda); `SettingsLayout` artık `groups` / `rightRail` almaz. İşletme ayarları sekmeleri: general / platforms / brand / website / operations ("Çalışma saatleri") / status ("Durum ve silme"); eski `security` ve `danger` adresleri bunlara yönlenir. Mobilde derin bağlantılı bölüm görünür alana kaydırılır.
- **Ana panel**: tek kurulum kartı (işletme yoksa karanlık karşılama kartı, varsa `ActivationChecklistCard`, mobilde de); hızlı bağlantı kutuları kaldırıldı (kenar çubuğu / alt menü zaten var); masaüstünde iki bağımsız sütun.
- **Sunucuda render edilen tarih**: `toLocaleDateString` / `Intl.DateTimeFormat` her zaman `timeZone: resolveDisplayTimeZone()` alır (§46); almazsa uzak saat dilimindeki tarayıcıda hidrasyon hatası (#418) olur.

## §50 — three.js dekoratif sahneler (kanonik, 2026-11, Stage 172)

Pazarlama sitesinde yalnız iki sahne vardır: `pulse-field` (alt bilgi üst bandı, her sayfada, `FooterPulseHorizon`) ve `platform-orbit` (ana sayfa platform bölümü koyu tema + /integrations hero açık tema yalnız masaüstü, `PlatformOrbitStage`). Kod `src/components/marketing/three/` altında.

- **Yükleme**: `ThreeStage` ('use client') sunucuda yalnız SVG yedeği (`fallbacks.tsx`) basar; three ve sahne modülü `import()` ile, kutu görünüme bir ekran kala (`loadMargin` '100% 0px') ve tarayıcı boştayken yüklenir. Üst kısımdaki kutular `afterLoad` ile window `load` sonrasını bekler. Yalnız `src/components/marketing/three/scenes/*` `three`'den değer import edebilir; sahneler yalnız ThreeStage'in import haritasından yüklenir — `tests/three-boundary.test.ts` zorunlu kılar (tek statik import her sayfaya ~130 KB gzip ekler).
- **Kapı** (`three-support.ts`, saf + test): WebGL2 yoksa, veri tasarrufu / 2G / <2 GB bellek / `media` eşleşmiyorsa → `off` (three hiç inmez). Azaltılmış hareket veya <4 çekirdek → tek statik kare. Yüklemeden önce WebGL2 bağlamı açılır, renderer adı okunur; yazılım rasterleyici (SwiftShader, llvmpipe, Microsoft Basic Render Driver) → yedek kalır (başsız tarayıcı, tarayıcı-render'lı tarayıcılar, GPU'su kara listede makineler). Aynı HTML herkese gider; kapı yeteneğe göredir, user-agent'a göre değil (cloaking değil). Test için `window.__BZ_THREE_ALLOW_SOFTWARE__ = true` (Playwright: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`).
- **Çalışma**: yükleme adımları arasında `scheduler.yield`; `KHR_parallel_shader_compile` varsa `compileAsync`, yoksa `compile`; döngü yalnız kutu ekrandayken ve sekme görünürken, `maxFps` 30; tek ortak duraklat düğmesi (`AmbientMotionToggle`, WCAG 2.2.2) yalnız sahne gerçekten oynarken görünür, seçim sessionStorage'da; unmount'ta önce `webglcontextlost` dinleyicisi kaldırılır, sonra `dispose()` + `forceContextLoss()`.
- **Renk**: özel `ShaderMaterial` fragment'larının sonunda `#include <colorspace_fragment>` zorunlu (yoksa lime #C6F24E soluk ve yanlış görünür, SVG yedekten geçişte renk değişir).
- **Anlam**: sahnelerde metin, logo, sayaç veya bağlantı yok; `aria-hidden`. Platform yörüngesinde nabız merkezden platforma gider (müşteri seçilen platformun yorum sayfasına gönderilir) — "yorumlar Buaze'ye akar / içe aktarılır" izlenimi verme (§19.4: Buaze yalnız bağlantı yönetir). Platform adları yanında HTML olarak yazılır.
- **Yapma**: hero'ya, fiyatlandırma / ROI / uyum / sektör sayfalarına yeni sahne ekleme; sunucuda Save-Data / Device-Memory başlığı okuma (ISR bozulur, §35.12.3); MarketingFooter'ı client component yapma; aynı sayfada 2'den fazla canvas.

## §51 — Pazarlama sitesi: içerik doğruluğu ve sayfa düzeni (kanonik, 2026-11, Stage 172)

Pazarlama sitesi (alt bilgi, menü, ana sayfa, özellik, sektör, ticari, şirket ve yardım sayfaları) 2026-11'de baştan yazıldı. Amaç: her cümle bugünkü ürün için doğru olsun, Google uydurma içerik görmesin, sayfalar statik üretilsin.

**İçerik kuralları (her yeni metin için):**
- **Yorum akışı (D1)** tek anlatım: müşteri QR'ı okutup puan verir; işletmenin belirlediği eşik (varsayılan 5★, isteğe göre 4★) ve üzerindeki puanda seçilen platformun yorum sayfası açılır; eşiğin altında müşteri önce işletmeye özel geri bildirim yazabilir ve herkese açık yorum bağlantısı aynı ekranda durur. "Düşük puanları filtreler / Google'dan uzak tutar" deme.
- **Uyum (D2)** davranışla anlatılır ("yorumları düzenlemez, gizlemez, silmez; yorum karşılığında ödül vermez"); "tam uyum", mühür, rozet yok.
- **Uydurma yok (D3):** isimli ekip/müşteri/yazar, kurgusal vaka, alıntı, canlı akış, sayaç yok. Blog yazarı DB'de gerçek değilse "Buaze ekibi" (`blog/_lib/author.ts`).
- **Rakam yalnız üründen doğrulanabilir olanlar:** 10 yorum platformu, 14 gün ücretsiz deneme, TR + EN, 3 ton Pulse AI, 6 denetim soru tipi / 3 puanlama modu, 5 anket soru tipi / 8 şablon, analitik dönemleri 7/30/90 gün + 12 ay + özel. Sonuç vaadi (puan artışı %, gelir, "X dakikada kurulum", kohort, "%85 tercih eder") yasak.
- **Tek iletişim:** `SUPPORT_EMAIL` (support@buaze.com) ve `SUPPORT_HOURS` (`src/lib/company-constants.ts`); şirket unvanı/adresi `getCompanyFacts()` (§47). Başka posta kutusu yazma.
- **Pulse AI:** "taslak, siz onaylamadan gönderilmez". Google yanıtı yalnız "Google erişim onayına bağlı" diye anılır. Yorum içe aktarma iddiası yok (Buaze yalnız bağlantı yönetir, bağlantıları her gün kontrol eder).
- **Türkçe:** resmi "siz", cümle düzeni doğal, başlık sonunda nokta yok, H1 anahtar kelimeyle başlar.

**Sayfa düzenleri:**
- **Alt bilgi** (`MarketingFooter.tsx`, sunucu bileşeni, `id="site-footer"`): FooterPulseHorizon bandı (logo) → marka satırı + aylık "Pulse bülteni" kartı (onay kutusu boş gelir) → tek `<nav>` site haritası (gizli h2, h3 sütunlar, sektörler `RELATED_SOLUTIONS_LIST`'ten) → alt şerit: `<address>` (getCompanyFacts), hukuk bağlantıları, "Çerez tercihleri" düğmesi, taranabilir dil bağlantısı. Mobil alt boşluğu alt bilgi verir; MobileBottomNav'da ara boşluk yok.
- **Menü:** Ürün / Çözümler / Kaynaklar / Fiyatlandırma / İletişim. Açılır paneller kapalıyken `inert` ama HTML'de durur; bu yüzden alt bilgi, açılır menü, çekmece ve /auth bağlantıları `prefetch={false}`. /auth bağlantıları `rel="nofollow"`. İstemciye yalnız `{locale, logoUrl}` gider (çeviri nesnesi gönderilmez).
- **Çerez tercihleri:** alt bilgideki düğme `buaze:open-cookie-preferences` olayını yayar (`footer/events.ts`); CookieConsentBanner kayıtlı seçimlerle ayar penceresini açar. Analitik kapatılınca _ga/_gid/_gat/_ym çerezleri silinir.
- **Bülten:** `/api/newsletter` `consent: true` ister, ticari-ileti + kvkk-aydinlatma onayını kaydeder; içerik ayda bir son blog yazılarıdır.
- **Ana sayfa:** 10 bölüm, `src/components/marketing/home/*` (hero → nasıl çalışır → özellikler → platform bağlantıları (koyu, three.js yörüngesi) → yorumların ötesinde → güven → sektörler → ücretsiz QR → SSS → son CTA). `HOME_FAQ` (`home-faq.ts`) hem görünür SSS'yi hem FAQPage'i besler. HeroCinematic sunucu bileşeni + `HeroStage` istemci adası (duraklat düğmesi three.js ile aynı `AMBIENT_MOTION_*` tercihini paylaşır).
- **Özellik sayfaları:** `FeaturePageLayout` sabit sıra: hero ("Örnek ekran" etiketli HTML maket) → "… nedir?" → yetenekler → görünür adımlar (`id="step-N"`) → doğrulanabilir bilgiler → sektör bağlantıları → SSS → ilgili özellikler → son CTA. Meta + JSON-LD `src/lib/seo/feature-schema.ts`; açıklamalar `features/_components/feature-catalog.ts`.
- **Sektör sayfaları:** `SolutionPageLayout` içerik odaklı şablon (`SolutionPageContent`); her sayfa sektöre özgü (QR'ı nereye koyarsınız, ne sormalısınız, sektör platformları `SECTOR_PLATFORMS`, şablonlar, gizlilik notu, ≥5 SSS, `getRelatedSolutions`). `solution-schema.ts` HowTo / hasOfferCatalog / areaServed üretmez; meta `buildSolutionMetadata`. 15 sektör sayfasının hepsi bu şablonu kullanır (7 özel sayfa da taşındı); sektörler sayfası `RELATED_SOLUTIONS_LIST` + `SECTOR_COUNT`'tan, kart verisi `solutions/_components/sector-directory.ts`. Etiket örnekleri panel kuralına uyar (ASCII harf, rakam, `-`, `_`, en çok 20 karakter). Ücretsiz QR oluşturucu PNG + A5 PDF yazdırma (§24.3) sunar, tarama verisi tutmaz.
- **Ticari sayfalar:** ortak parçalar `src/components/marketing/commercial/` (PageHero, SectionHeader, FaqList, CtaBand, ComparisonTable, PlatformChips). ROI modeli §35.9.
- **Şirket sayfaları:** JSON-LD organizasyonu yalnız `@id` ile anar (AboutPage, ContactPage, Blog, BlogPosting); /blog searchParams okumaz (kategori filtresi istemcide).
- **Yardım merkezi:** `src/lib/help-articles.ts` TR/EN tek `pair()` çağrısıyla; api-webhook kategorisi ve var olmayan özellikleri anlatan 13 makale kaldırıldı, eski adresler `next.config.ts`'te en yakın makaleye 308. `tests/help-articles.test.ts` TR/EN eşliğini, iç bağlantıları ve kaldırılan adresleri korur. /help/search istemcide eşleşir (noindex).

**Paylaşım görseli:** `public/images/open-graph-{tr,en}.png` (1200×630) yalnız doğrulanabilir bilgi taşır. Yeniden üretmek için HTML + yerel woff2 fontlarıyla Playwright ekran görüntüsü alınır, sharp ile palet PNG'ye sıkıştırılır (~60 KB). Sosyal ağ önbelleği için Facebook Sharing Debugger / LinkedIn Post Inspector'da yeniden çek.

**Yapma:** sayfaya sahte "canlı" sayaç, isimli alıntı, müşteri logosu, mühür ekleme; yeni posta kutusu adı yazma; HowTo'yu görünür adım olmadan ekleme; SoftwareApplication / AggregateRating ekleme; pazarlama sayfasında `headers()/cookies()/searchParams` okuma (§35.12.3).

## §52 — Kök düzenler ve `<html lang>` (kanonik, 2026-11, Stage 173)

`src/app/layout.tsx` yok; her üst düzey bölümün kendi kök düzeni var, hepsi aynı kabuğu kullanır: `src/components/root/RootHtml.tsx` (`<html>/<body>`, `globals.css`, `fonts.ts`, ConditionalAnalytics, çerez bandı, Speed Insights + Analytics). Metadata varsayılanları ve viewport `src/lib/root-metadata.ts` (`buildBaseMetadata`, `APP_METADATA`, `siteIcons`, `ROOT_VIEWPORT`).

- **Neden**: tek kök düzen `[locale]`'in üstünde kaldığı için dili bilemiyordu (`headers()` okumak ISR'ı bozar, §35.12.3); /en sayfaları sunucudan `lang="tr"` geliyordu ve yalnız JS ile düzeltiliyordu. Artık `src/app/[locale]/layout.tsx` kök düzendir ve `<RootHtml lang={locale}>` basar.
- **Kök düzenler** (2026-11: Dodo dönüş adresi için duran locale'siz `dashboard` kök düzeni ve `/dashboard/account` yönlendirmesi silindi): `[locale]` (lang = locale), `admin` (lang = `ADMIN_LOCALE` çerezi; düzen zaten çerez okuyor), `r`, `menu`, `s`, `embed`, `audits`, `(root)` (`/` yönlendirmesi) — bunlarda lang `tr`. `billing/[locale]` (§44.4): `<RootHtml lang={locale} secure>` — analitik, çerez bandı ve Vercel betikleri yok, middleware nonce CSP. `/r/[slug]` dili istemcide seçtiği için `<html lang>`'ı kendisi günceller.
- **404**: `app/not-found.tsx` yerine `app/global-not-found.tsx` (`experimental.globalNotFound`, kendi `<html>`'i; /en için `langFromPath` küçük betiği). `notFound()` çağıran bölümlerin kendi `not-found.tsx`'i var (`[locale]`, `r`, `embed` → `BrandedNotFound`; `admin`, `menu/[slug]`, `s/[slug]`, `audits/[token]` kendi tasarımları). Hiçbiri `headers()/cookies()/searchParams` okumaz. Global 404 bir kez statik üretildiği için istenen adresi bilmez: `BrandedNotFound detectLocaleOnClient` Türkçe başlar, dili mount sonrası adresten seçer (ilk render'da adres okumak React #418 hidrasyon hatası verir).
- **Gezinme**: iki farklı kök düzen arasında geçiş tam sayfa yüklemesidir (Next.js); /tr ↔ /en aynı kök düzende kalır.
- **Yapma**: `src/app/layout.tsx` geri ekleme (tüm kök düzenler iç içe `<html>` olur); yeni üst düzey bölümü kök düzensiz bırakma (derleme "missing root layout" ile durur) — `RootHtml` + `buildBaseMetadata` + `ROOT_VIEWPORT` ile 15 satırlık düzen ekle; `RootHtml`'e `<head>` yazma (kaynak ipuçları `react-dom` `prefetchDNS` ile).
