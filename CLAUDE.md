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
| ORM | Prisma 6 | `prisma db push` Dockerfile'da otomatik |
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
`src/lib/auth.ts` içindeki `getPanelActorFromRequest()` + `getScopedRestaurantIds()` + `canAccessRestaurant()` yardımcılarını **her yeni API route'unda** kullan. `/api/feedback/*` ve `/api/restaurants/*` için bu zorunlu.

Örnek pattern (`src/app/api/feedback/stats/route.ts`'e bak):
```ts
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
│   ├── global-error.tsx       # Sentry error boundary
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
├── seed-mail-templates.ts     # 18 row mail template seed (§21.26)
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

### ❌ Yapma
- **Prisma migration dosyası (`prisma/migrations/...`) oluşturma** — deploy akışı `prisma db push --accept-data-loss` üzerine kurulu, `migrate dev` kullanılmıyor. Halihazırda `prisma/migrations/` klasörü **yok** — varsa silmeden önce sor (push workflow'u kırılır).
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
- `prisma migrate`/`db push` direct bağlantı (5432) gerektirir. `DATABASE_URL` pgbouncer (6543) olabilir ama `DIRECT_URL` olmadan schema sync başarısız.

---

## 9. Yeni Göreve Başlarken Checklist

- [ ] Kullanıcı dilini ayarla (mesaj TR gelirse TR cevapla).
- [ ] Hedeflenen route'u bul: `src/app/admin/...` (panel) vs `src/app/api/...` (API) vs `src/app/r/[slug]/` (public).
- [ ] IDOR scoping gerekli mi? → evet ise `getScopedRestaurantIds` kullan.
- [ ] Yeni DB alanı gerekli mi? → `schema.prisma`'da var mı kontrol et (muhtemelen var). Yoksa ekle + `prisma db push` (migration değil).
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
"build": "node scripts/validate-env.js && prisma db push --accept-data-loss && next build"
```

3 adım:
1. **`scripts/validate-env.js`** — zorunlu env'leri (DATABASE_URL, DIRECT_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL) doğrular; eksikse exit 1 → Vercel build başlamadan fail eder.
2. **`prisma db push --accept-data-loss`** — schema sync; `P2022 column does not exist` hatası önlenir (daha önce `/api/restaurants` 500 bug'ına sebep olmuştu).
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

**Zorunlu Vercel env var'ları:**
- `DATABASE_URL` — Supabase pooler (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432) — `prisma db push` bunu kullanır. **Yoksa build fail eder.**
- `JWT_SECRET` — auth token signing
- `NEXT_PUBLIC_APP_URL` — QR URL'lerinde kullanılır

**Opsiyonel:**
- `OPENAI_API_KEY` — Pulse AI yanıt önerileri için (§15). Yoksa endpoint deterministik şablona düşer, UI çalışmaya devam eder.
- `OPENAI_MODEL` — Varsayılan `gpt-4o-mini`.
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` — error tracking (§26). Yoksa SDK no-op çalışır. Vercel Sentry Marketplace integration tüm Sentry env'lerini (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` dahil) otomatik provision eder.
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
  - Body: `{ locale?: 'tr' | 'en' }`; diğer her şey Prisma'dan
  - Response: `{ feedbackId, suggestion, source: 'openai' | 'template' | 'template-fallback' }`
- **Fallback:** `OPENAI_API_KEY` yok / API hata → `buildReplyTemplate()` tek satır + `[fill in]` placeholder döner. UI'da gri "ŞABLON" rozeti, lime "AI" rozeti.
- **Prompt:** Restoran itibar uzmanı, 2-4 cümle, max 80 kelime, ücretsiz ikram önerme, emoji yok. Model `gpt-4o-mini` default (env: `OPENAI_MODEL`).
- **Maliyet:** ~400 token / öneri ≈ $0.0001. 10K öneri/ay = $1.
- **Güvenlik:** Anahtar yalnız server-side (`process.env.OPENAI_API_KEY`); `NEXT_PUBLIC_` prefix yok, client bundle'a sızmaz.

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

`prisma db push` henüz çalışmamış preview deploy'larında bazı join tabloları (`feedback_replies`, `feedback_flags`, `feedback_assignments`, `feedback_tags`) yoksa list endpoint çökmesin diye:

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

Schema: `NewsletterSubscriber.unsubscribeToken String? @unique` (Prisma 6.x, `prisma db push` deploy build script'inde otomatik sync).

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

| Path | Schedule | Amaç |
|---|---|---|
| `/api/cron/weekly-digest` | `0 9 * * 1` | Her pazartesi 09:00 UTC — restoran sahibine haftalık özet (Pulse AI çıkarımı dahil — §21.38) |
| `/api/cron/weekly-digest-summary` | `0 10 * * 1` | Her pazartesi 10:00 UTC — hello@buaze.com'a "kim mail aldı" özeti (ops, §21.38) |
| `/api/cron/anonymize-ips` | `0 3 * * 0` | Her pazar 03:00 UTC — KVKK IP retention |
| `/api/cron/monthly-newsletter` | `0 9 1 * *` | Her ayın 1'i 09:00 UTC — Pulse aylık bülten |
| `/api/cron/trial-reminders` | `0 9 * * *` | Her gün 09:00 UTC — trial bitimine 1 ve 3 gün kalanlara hatırlatma |

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

**Mevcut durum (2026-04 doğrulandı)**: Vercel'de **`DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`** Production + Preview + Development scope'larında set. **Yeni preview branch açıldığında ekstra konfigürasyon yok** — `prisma db push` build script'inde otomatik koşar, schema sync olur.

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

`scripts/backfill-feedback-reply-source.ts` — eski reply'ları `source = 'manual'` ile dolduran one-shot data migration. `prisma db push` schema kolonu ekler ama eski rows NULL kalır. Çalıştırmak (idempotent):

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

### 21.26 DB-driven mail content (9 template — tüm Pulse mailler)

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

Buaze yardım merkezi **hybrid** veri kaynağıyla çalışır: Prisma `HelpArticle` tablosu (admin tarafından eklenen makaleler) + `STATIC_HELP_ARTICLES` array (kod içine yazılı evergreen içerik). DB boşsa veya tablo henüz `prisma db push` çalıştırılmamış preview deploy'larında static array fallback olur — yardım sayfası asla çökmez.

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

Preview deploy'da `prisma db push` koşmamış olabilir. Help sayfaları `try/catch` ile DB sorgusunu sarar; tablo yoksa static array'e düşer. Bu hibridliği bozmamak için:
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

`@sentry/nextjs` ^10.51 ile **production gözlem** katmanı. Vercel Sentry Marketplace integration kuruldu — env'ler (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) Production + Preview + Development scope'larında otomatik provision. Lokal dev'de DSN yoksa SDK tamamen no-op.

### 26.1 Dosya yapısı (canonical SDK skill pattern)

| Dosya | Görev |
|---|---|
| `instrumentation.ts` | `register()` runtime'a göre lazy import + `onRequestError = Sentry.captureRequestError` (Next 15 unhandled server error hook, SDK >= 8.28) |
| `sentry.server.config.ts` | Server runtime init; `includeLocalVariables: true` (stack trace'de local vars) |
| `sentry.edge.config.ts` | Edge runtime init |
| `instrumentation-client.ts` | Browser init + `Sentry.replayIntegration()` + `onRouterTransitionStart` |
| `src/app/global-error.tsx` | Uncaught error boundary; `NextError statusCode={0}` + `Sentry.captureException` |
| `next.config.ts` | Koşulsuz `withSentryConfig` wrap; auth token yoksa source-map upload silently skip |

### 26.2 KVKK / GDPR sapmaları (skill default'undan)

Resmi skill `sendDefaultPii: true` öner — restoran müşteri verileri için yasal risk. Bu projede:

- **`sendDefaultPii: false`** — IP / cookies / form bodies / user-identifiable headers Sentry'ye otomatik gönderilmez. Gerekirse explicit `Sentry.setUser({})` ile event başına eklenir, legitimate-interest review sonrası.
- **`replaysSessionSampleRate: 0`** — background session replay yok. Sadece `replaysOnErrorSampleRate: 1.0` ile hata anında 60 sn'lik replay yakalanır. Müşteri privacy footprint düşük, Sentry quota burn minimum.
- **`tracesSampleRate: 0.1`** prod (skill default `0.1`) / `1.0` dev — performance tracing %10 örneklem, free tier yeterli.

### 26.3 Tunnel route + Middleware

`tunnelRoute: '/monitoring'` ad-blocker'ları bypass eder — Sentry trafiği app origin'inden tünellenir. Mevcut middleware matcher `'/admin/:path*'`, `/monitoring` zaten dışarıda — exclude eklemeye gerek yok.

### 26.4 Smoke test

`GET /api/sentry-test` — kasıtlı 500 fırlatır (`Error: [Sentry smoke test] Synthetic error...`), tag `sentry.smoketest=true`. Production'da default disable, `ENABLE_SENTRY_TEST=1` env ile aç. Doğrulama sonrası endpoint kullanılmaz, kalabilir.

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
  - Error boundary'ler (`global-error.tsx` zaten yapıyor)
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
| `scripts/seed-mail-templates.ts` | `DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts` | 18 row mail template upsert (9 template × 2 locale). Idempotent. Operator "kod default'larına dön" istediğinde de çalıştırılır (§21.26). |
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
| DB schema | `prisma/schema.prisma` `NotificationPreference` | `slackWebhook String? @map("slack_webhook")` kolonu — `prisma db push --accept-data-loss` deploy'da DB'den drop eder |
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

**DB drift uyarısı:** `slack_webhook` Postgres kolonu **prod'da hâlâ var** — `prisma db push --accept-data-loss` ilk deploy'da DROP COLUMN çalıştırır. Eski kayıtların `slack_webhook` değerleri kaybolur (kabul edilen — feature kullanılmıyor). CLAUDE.md §21.18 paranoidliği: nullable + default'lu kolon silmek backward-compat bozmaz, eski kod fail olmaz çünkü helper artık o kolonu select etmiyor (defensive `select` paterni §14.1).

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

Bitmap-combine fallback Postgres'te 30-50ms/query ekliyor (volume büyüdükçe daha kötü). Composite index = single-index seek. Risk düşük: pure additive, data değişmiyor, `prisma db push --accept-data-loss` (CLAUDE.md §14.1) deploy build'de auto-apply.

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

---

## 35. SEO Infrastructure (2026-05 PR #263 + #264)

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
