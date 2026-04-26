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
| UI | Tailwind v4 (PostCSS) + lucide-react (ikonlar) | **shadcn/ui kullanılmıyor** — elle yazılmış bileşenler |
| Charts | recharts | |
| Görsel işleme | sharp (WebP dönüşüm + resize) | |
| QR | qrcode | `/api/restaurants/[id]/qr` |
| Mail | Resend HTTP API | `src/lib/email.ts` — SMTP yok, fetch tabanlı |
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

Müşteri QR'dan gelirken URL'de `platform` parametresi taşıyor: `google | yemeksepeti | getir | trendyol_go`. Bu değer:
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
│   ├── [locale]/              # i18n route'ları (tr/en)
│   ├── admin/                 # Admin panel (superadmin/manager/owner)
│   │   ├── dashboard/         # Ana özet + istatistik + tablo
│   │   ├── qr/                # QR oluşturma + history
│   │   ├── restaurants/       # Restoran yönetimi
│   │   └── users/             # Superadmin: admin user yönetimi
│   ├── api/
│   │   ├── auth/              # login / logout / me
│   │   ├── admin/             # superadmin/manager CRUD
│   │   ├── feedback/          # POST (public), GET (scoped), stats, export, branches
│   │   ├── menu/              # categories / items / upload
│   │   └── restaurants/       # restoran CRUD + QR üretim
│   ├── r/[slug]/              # Public QR landing + feedback form
│   └── menu/[slug]/           # Public restoran menüsü
├── components/
│   ├── admin/                 # StatsCards, FeedbackTable, PlatformDistribution, ...
│   ├── dashboard/menu/        # MenuEditor, MenuItemForm, MenuCategoryForm
│   └── menu/                  # PublicMenuView
├── lib/
│   ├── auth.ts                # JWT + actor resolve + IDOR helpers
│   ├── prisma.ts              # Tek instance (HMR-safe)
│   ├── translations.ts        # tr/en string haritası
│   ├── validations.ts         # Zod yok; elle doğrulama
│   └── menu-access.ts         # Menü erişim kontrolü
└── prisma/
    └── schema.prisma          # Tüm modeller
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
- **shadcn/ui veya headless UI ekleme** — mevcut stil deseni Tailwind + basit `<select>`/`<button>`.
- **Zod ekleme** — elle validasyon tercih edilmiş, küçük ölçekli projeye yeterli.
- **Prisma migration dosyası (`prisma/migrations/...`) oluşturma** — deploy akışı `prisma db push --accept-data-loss` üzerine kurulu, `migrate dev` kullanılmıyor.
- **Ortak abstraction'lar** (shared PLATFORM_CONFIG modülü gibi) **üç yerden fazla tekrar** olmadıkça yazma.
- **AI / otomasyon / rol refactor** ekleme — kullanıcının açıkça istediği scope'a sadık kal.
- Tercihlere zıt — `public/uploads/*` dışında bir dizine yazma; Coolify volume hedefi `/app/public/uploads`.

### 📏 Scope disiplini
Kullanıcı genellikle **sade ve anlaşılır** ister ve "scope creep yapma" konusunda nettir. Bir görev tanımlandığında:
- Plan modunda önce onay al
- Yan temizlik (drive-by refactor) yapma
- "Belki faydalı olur" komponenti eklemeyin

---

## 8. Sık Karşılaşılan Tuzaklar

> **Not:** Eski Coolify upload tuzakları (EACCES, public/uploads volume) artık geçerli değil — Vercel + base64-in-DB'ye geçildi (§3).

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
"build": "prisma db push --accept-data-loss && next build"
```

Her deploy'da schema sync edilir → `P2022 column does not exist` hatası oluşmaz (daha önce `/api/restaurants` 500 bug'ına sebep olmuştu).

**Zorunlu Vercel env var'ları:**
- `DATABASE_URL` — Supabase pooler (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432) — `prisma db push` bunu kullanır. **Yoksa build fail eder.**
- `JWT_SECRET` — auth token signing
- `NEXT_PUBLIC_APP_URL` — QR URL'lerinde kullanılır

**Opsiyonel:**
- `OPENAI_API_KEY` — AI Co-Pilot yanıt önerileri için (§15). Yoksa endpoint deterministik şablona düşer, UI çalışmaya devam eder.
- `OPENAI_MODEL` — Varsayılan `gpt-4o-mini`.

### 14.2 Rate limit notu

`src/lib/rate-limit.ts` in-memory. Vercel serverless'ta her instance farklı Map tutar — hard limit değil, yumuşak bir koruma. Ciddi abuse'a karşı Upstash Redis veya Vercel Edge Config gerekir (şimdilik opex gereksiz).

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

`.design/` klasörü Claude Design'dan gelen JSX prototipleri + canvas HTML + chat log içerir (21 dosya, git-tracked). Pulse marka kimliği (graphite/lime/pure white) + ~38 sayfalık site tasarımı kaynağıdır.

**Kritik kural:** `.design/*.jsx` **doğrudan `src/`'ye kopyalanmaz** — yalnız referans olarak okunur. Pulse token'lar zaten `globals.css` `@theme {}` bloğunda, font'lar `src/app/layout.tsx`'te yüklü, logo `src/components/marketing/BuazeLogo.tsx`. Uygulanan kararlar §11 (renk + typography) + §12 (menü temaları) + §15 (AI Co-Pilot) + §17 (utility class'ları).

`design.md` repo kökünde — 15 PR'lık faz log'unu tutar.


---

## 17. Pulse Redesign — Kalıcı Çıktılar

Pulse design 15 draft PR'da uygulandı (PR #39 → #53). Tarihsel commit detayları için `git log` + `design.md`. Aşağıda **kalıcı kararlar** — tasarım kararları için §11, menü için §12, AI Co-Pilot için §15.

21 dosya `.design/` altında (JSX prototipleri + canvas HTML + chat log). **Asla `src/`'ye kopyalanmaz** — yalnız referans. Pulse token'lar zaten `globals.css`, font'lar `layout.tsx`'te yüklü.

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
