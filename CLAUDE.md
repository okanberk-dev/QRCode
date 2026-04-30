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
`src/lib/auth.ts`'de `JWT_SECRET` için hardcoded fallback var — Vercel preview için. **Production'da `JWT_SECRET` env set edilmeli.**

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
│   ├── openai.ts              # AI Co-Pilot (§15)
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
- `OPENAI_API_KEY` — AI Co-Pilot yanıt önerileri için (§15). Yoksa endpoint deterministik şablona düşer, UI çalışmaya devam eder.
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

## 15. AI Co-Pilot (OpenAI)

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

---

## 16. Claude Design Handoff — Referans

`.design/` klasörü Claude Design'dan gelen JSX prototipleri + canvas HTML + chat log içerir (22 dosya, git-tracked: root 3 + `pulse/` 6 + `site/` 13). Pulse marka kimliği (graphite/lime/pure white) + ~38 sayfalık site tasarımı kaynağıdır.

**Kritik kural:** `.design/*.jsx` **doğrudan `src/`'ye kopyalanmaz** — yalnız referans olarak okunur. Pulse token'lar zaten `globals.css` `@theme {}` bloğunda, font'lar `src/app/layout.tsx`'te yüklü, logo `src/components/marketing/BuazeLogo.tsx`. Uygulanan kararlar §11 (renk + typography) + §12 (menü temaları) + §15 (AI Co-Pilot) + §17 (utility class'ları).

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

Pulse design 15 draft PR'da uygulandı (PR #39 → #53). Tarihsel commit detayları için `git log` + `design.md`. Aşağıda **kalıcı kararlar** — tasarım kararları için §11, menü için §12, AI Co-Pilot için §15.

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

**Stratejik karar:** Yeni external provider eklenmiyor. Resend (mail) + Supabase Storage (dosya) + OpenAI (AI Co-Pilot) yeterli. POS (Iyzico/Stripe) kasıtlı ertelenmiş — billing read-side canlı, write-side yok.

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


---

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
- **low-rating-alert**: graphite alert bar with warning dot + timestamp, avatar circle (FEF3C7) review card, hashtag chips, AI Co-Pilot dark editor card with tone label + edit/approve buttons, 3-col quick actions grid
- **new-review**: "● Canlı · Az önce geldi" status pill, gradient quote card (limeSoft → pure 2-stop with MSO solid fallback), avatar initials, primary "Teşekkür yaz" + secondary "Google'da paylaş" CTAs
- **weekly-report**: dark hero with 3 deltaed stats, 7-day bar chart (HTML/CSS bars with peak highlight), "Bu haftanın sözleri" 3-quote gallery, side-by-side limeSoft CTA card
- **newsletter**: dark featured article card (tek sütun: okuma süresi + başlık + excerpt + lime CTA), 4-item numbered list, stats band, future teaser, lime-highlight title positioning. **Not (2026-04 düzeltme)**: JSX prototipindeki sağ sütun "AI Co-Pilot demo code block" (`> input.tone / > model.draft / latency: 1.2s`) **kaldırıldı** — statik içerikti, her ay farklı featured post seçildiğinde uyumsuz görünüyordu. Default preheader artık featured post excerpt'inden çekilir, fallback generic.
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
- Usage hesabı: ilgili restoran için son 14 gün vs önceki 14 gün (growth %), ortalama puan, yorum sayısı, **AI Co-Pilot ile gönderilen yanıt sayısı** (`prisma.feedbackReply.count({ where: { source: 'ai_copilot', ... } })`).
- Auth: `Bearer ${CRON_SECRET}` (mevcut pattern)
- Sender: `sendTrialEndingEmail` (Pulse `trial-ending` template)
- **Eşikleri değiştirmek**: `TRIAL_REMINDER_DAYS` array'i tek değişiklik noktası. Yeni eşik (örn. 7 gün) eklendiğinde SQL window otomatik genişler.

### 21.12 Cron path listesi (mevcut)

| Path | Schedule | Amaç |
|---|---|---|
| `/api/cron/weekly-digest` | `0 9 * * 1` | Her pazartesi 09:00 UTC — restoran sahibine haftalık özet |
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
- [ ] Tüm panel sayfaları — sidebar drawer açılır, bottom nav 5-item görünür, tablo `md:hidden` badges ile dikey stack
- [ ] Auth + onboarding — input'larda iOS auto-zoom yok, klavye keyboard hint'leri (Next/Send) doğru, form submit tek tap
- [ ] `/r/[slug]` review surface — yıldız tap, low-rating form, redirect overlay
- [ ] `/r/[slug]/menu` + `/menu/[slug]` — kategori chip'leri yatay scroll, ürün kart grid 2-col, modal bottom-sheet

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

// AI Co-Pilot fallback (src/app/api/feedback/[id]/suggest-reply)
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
| `@vercel/analytics` | Marketing funnel analysis lazım olduğunda — page-view + conversion tracking. Speed Insights (§31) zaten kurulu, Web Vitals tarafını karşılıyor |
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

## 31. Vercel Speed Insights — Real-User Web Vitals

`@vercel/speed-insights/next` ile gerçek-kullanıcı Core Web Vitals takibi. Paket `package.json`'da kayıtlı (`@vercel/speed-insights ^2.0.0`) ve `<SpeedInsights />` root layout'ta mount'lanır → `[locale]/layout.tsx` + `admin/layout.tsx` dahil tüm panel + marketing + public surface'leri kapsar. Yeni layout/route eklerken **ekstra mount koyma** (duplicate beacon).

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

Manuel `track()` çağrısı yok; sadece otomatik Web Vitals beacons. `@vercel/analytics`'ın `track()` API'si ayrıdır (custom event); şu an kurulmadı (§30.5'te tetik koşulu marketing funnel ihtiyacı).

### 31.5 Yeni layout / SSG sayfa eklerken

Yeni route `app/` ağacında otomatik kapsanır (root layout'ta tek `<SpeedInsights />` mount, alt layout'lar inherit eder). Ayrı bir `<SpeedInsights />` mount **etme** — duplicate beacon gönderir, quota tüketir.

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
