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
| Mail | nodemailer | Bildirim emaili |
| i18n | `src/app/[locale]/...` + `src/lib/translations.ts` | tr / en |
| Deploy | Vercel (Production) | Otomatik Git entegrasyonu |

---

## 3. Depolama Mimarisi (2026-04 güncellendi)

| Veri | Nerede | Not |
|---|---|---|
| Veritabanı | Supabase PostgreSQL | Kalıcı (tüm ana veri) |
| Menü ürün görselleri | **Postgres TEXT kolonu** (`menu_items.image_url`) | Base64 data URL (`data:image/webp;base64,...`) — Vercel ephemeral FS riskini atlatır |
| Menü logosu | **Postgres TEXT kolonu** (`restaurants.menu_logo_url`) | Aynı şekilde base64 data URL |
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

### Upload EACCES
- **Neden:** `public/` dizini root-owned + runtime user nextjs (uid 1001).
- **Çözüm:** Dockerfile satır 44 `--chown=nextjs:nodejs` + `mkdir -p public/uploads/menu` + `chown -R nextjs:nodejs public/uploads`.
- **Ayrıca:** Coolify'da volume mount → `/app/public/uploads`.

### "Upload başarılı ama görsel gitti"
- Volume mount yok. Next deploy'da `public/` tekrar kopyalanıyor, yeni dosyalar kayboldu. → Coolify volume ekle.

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

## 11. Marka Kimliği & Tasarım Sistemi (2026-04 v2 güncellendi)

### Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| Ink | `#0E1525` | En koyu ton, logo ascender, selective text |
| Navy | `#1A2332` | Sidebar, text-main, buton dark variant |
| Slate | `#2A3444` | Secondary UI, muted text |
| Gold | `#F4B400` | Primary accent, buttons, aktif nav, logo curl |
| Amber | `#FFD666` | Soft accent (hover highlight, gradient stops) |
| Ivory | `#F8F6F1` | Sayfa arka planı |
| Cloud | `#E8ECF2` | Border, neutral support |

**CSS token'ları:** `globals.css` → `@theme {}` bloğunda tanımlı (`--color-brand-ink`, `--color-brand-navy`, `--color-brand-gold`, vb.).
**Tailwind:** Inline `bg-[#F4B400]`, `text-[#1A2332]` gibi arbitrary value'lar kullanılıyor — shared PLATFORM_CONFIG modülü gibi abstraction yapılmadı (üç yerden fazla tekrar olunca değerlendirilir).

### Logo
- `src/components/marketing/BuazeLogo.tsx` — SVG bileşeni (API: `size`, `className`).
- Şekil: Küçük harfli `b` → sade ascender + outer ring + **signature Gold curl** (bowl'un sağ-alt çeyreğinde). Checkmark ve speech-bubble kuyruğu **kaldırıldı** (v2).
- Renk: Ink `#0E1525` gövde + Gold `#F4B400` kavis (gradient yok, düz renk).
- **Kullanım alanları (11 import):** admin sidebar, user dashboard shell, marketing navbar & footer, auth (login/register), trial-expired. İmport'lara dokunma, sadece SVG içeriği değiştirildi.
- `public/favicon.svg` — aynı logonun Navy kartla portresi.

### Font
- **Manrope** (heading) + **Inter** (body) — `next/font/google` ile yüklü (`src/app/layout.tsx`).
- `globals.css` içinde `h1..h6` için CSS seçiciyle Manrope otomatik uygulanır, body default Inter'dir.
- Manrope weights: 500, 600, 700, 800. Inter weights: 400, 500, 600, 700.
- CSS variable'ları: `--font-heading` ve `--font-body` (token-based fallback chain).

### UI Stili
- **Neo-brutalist offset shadow'lar (`shadow-[4px_5px_0_0_#...]`) tamamen kaldırıldı** (2026-04 v2) — yerine `shadow-sm/md/lg` geldi.
- Kart border'ları Cloud (`#E8ECF2`) olmalı; Navy/Ink border'lar sadece buton ve high-contrast elemanlarda.
- Typography weight kademeleri: heading `font-semibold`/`font-bold`, body `font-medium`/`font-semibold`. Aşırı `font-black` kullanımından kaçının.

### Eski renkler → Yeni karşılıklar (v1 → v2)
| v1 (Eski) | v2 (Yeni) |
|---|---|
| `#FF9A14` Trust Orange | `#F4B400` Gold |
| `#FFB347` gradient top | `#FFD666` Amber |
| `#0F2348` Deep Navy | `#1A2332` Navy |
| `#243554` Slate Navy | `#2A3444` Slate |
| `#F5F4F1` Soft Mist | `#F8F6F1` Ivory |
| `#C9D0DB` Cool Gray | `#E8ECF2` Cloud |
| `#FDBF1D` / `#EA580C` | `#F4B400` Gold |
| `#1F1E1D` / `#111827` | `#1A2332` Navy |
| `#F7F4F0` / `#FCFBF7` | `#F8F6F1` Ivory |

### Dokunulmayan platform brand hex'leri
`#4285F4` (Google), `#FA0050` (Yemeksepeti), `#5D3EBC` (Getir), `#F27A1A` (Trendyol GO) — `FeedbackTable.tsx`, `PlatformDistribution.tsx`, `admin/qr/page.tsx` içinde resmi marka renkleri olarak korunur.

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

### 12.2.1 Ürün detay modal'ı

**Dosya:** `src/components/menu/ProductDetailModal.tsx`

Ürün kartına tıklayan müşteriye ürünün büyük görseli + tam açıklaması + badge'leri + fiyatı gösterir. Tema-agnostik (restoran accent rengini vurgu için kullanır).

- Mobilde (< 640px): alt-yapışık bottom sheet, `rounded-t-3xl`, `max-h-[92vh]`, yukarı slide animasyonu.
- Desktop'ta (≥ 640px): merkez modal, `max-w-lg`, padding'li.
- Backdrop click + ESC tuşu kapatır.
- `document.body.style.overflow` kilidi ile arka plan scroll önlendi.
- Modal açılırken analytics `menu_product_click` fırlatılır (PublicMenuView'ın `onProductClick` handler'ı).

### 12.2.2 QR splash (açılış animasyonu)

**Dosya:** `src/components/menu/MenuSplash.tsx`

`?source=qr` parametresiyle gelen müşteriye 3 sn markalı splash gösterir: accent gradient arka plan, logo (varsa — yoksa harf initial), restoran adı, ince ilerleme çubuğu.

- `window.history.replaceState` ile `?source=qr` param'ı silinir → yenilemede splash tekrar çıkmaz.
- `setSplashReady` ilk mount'ta tetiklenir → SSR'de hiçbir şey flash etmez, yalnızca client mount sonrası splash veya menü render edilir.
- Animasyon `globals.css`'teki `slide-in-from-bottom-6` + yerel `buaze-splash-fill` keyframe'i ile sürdürülür.

### 12.3 Eski `/r/[slug]/menu` sayfası

**Dosya:** `src/app/r/[slug]/menu/page.tsx`

Magazin stilindeki client-side sayfa. PublicMenuView'den ayrı yaşıyor (kendi search + item detail modal'ı var). Tema desteği **yok** (yalnızca `menuAccentColor` kullanılıyor); tam tema entegrasyonu scope dışı bırakıldı. Analytics eklendi.

**TDZ notu:** `filteredCategories` useMemo'su ilgili useEffect'lerden **önce** tanımlanmalı — aksi halde minify sonrası `Cannot access 'k' before initialization` hatası oluşur.

### 12.4 Backend dikkat edilecek davranışlar

- **Item PATCH + kategori değişikliği:** Item farklı bir kategoriye taşındığında server tarafı otomatik olarak hedef kategorinin sonuna yerleştirir (`sortOrder = MAX + 1`). Aksi halde sortOrder eski değerinde kalır ve listede yanlış pozisyonda görünür. Bkz. `/api/restaurants/[id]/menu/items/[itemId]` PATCH.
- **sortOrder default:** Yeni item/kategori POST'unda `sortOrder = last + 10` kullanılır (10'luk boşluk manuel ince ayar için ama reorder sonrası `0,1,2...`'e sıkıştırılır). Small quirk, functional.
- **`parsePriceInput`:** TR (`1.234,56`), EN (`1,234.56`) ve basit formatları (`1,50` / `1.50` / `1000`) destekler. Comma varsa decimal, dotlar thousand separator; tersi de geçerli. Tek dot belirsizlik durumunda decimal kabul edilir. Bkz. `src/lib/format.ts`.

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

- `PublicMenuView.tsx` → 4 tema layout'u da tracking'e bağlı. `disableAnalytics` prop'u admin preview'ı dışarda tutar.
- `/r/[slug]/menu` (legacy magazine) → tracking eklenmiş durumda.
- `/menu/[slug]` (SSR) → PublicMenuView üzerinden.

### 13.8 Admin UI davranışları

**Dosya:** `src/app/[locale]/dashboard/restaurants/[id]/menu/analytics/page.tsx`

- **Window date display:** Header altında `window.start → window.end` tarih aralığı görünür (ISO → locale formatla).
- **Refresh butonu:** `fetchAnalytics()` tekrar çağırır — manuel yenileme isteyen kullanıcılar için.
- **Reset filters:** Kategori veya kaynak filtresi aktifken "Filtreleri temizle" butonu çıkar, tek tıkla ikisini de sıfırlar.
- **All-time trend:** `range=all` seçildiğinde trend chart yerine bilgilendirme kartı gösterilir (sonsuz aralık için gün bazlı seri bucket'lamak pahalı olduğundan server zaten `trend=[]` döner).
- **Mobile chart:**
  - AreaChart x-axis tick interval trend uzunluğuna göre (`≤7 gün: 0`, `≤30 gün: 5`, `>30: length/6`) — 375px ekranda etiketler çakışmaz.
  - BarChart Y-axis kategori etiketleri 14 karakterden uzunsa truncate edilir, tam ad tooltip'te görünür.

### 13.9 Retention (TODO)

Event tablosu **temizlenmiyor**. 10 restorana + günde 1K event varsayımı ile 1 yıl ~3.6M satır — partition yerine şimdilik kabul ediliyor. İleride:
- 180 gün sonrası event'leri daily rollup tablosuna aggregate et
- Raw event'leri 90 gün sonra sil
- Cron: `/api/cron/analytics-compact` (örnek path, henüz yok)

### 13.10 Eklememe kuralları (scope disiplini)

- **Customer UI'da sayaç, badge, debug bilgisi ekleme.** Analytics tamamen görünmezdir.
- **Heuristic eşiklerini component içine hardcode etme** — `ANALYTICS_THRESHOLDS` objesi kullan.
- **AI/ML insights ekleme** — kurallı heuristics proje tercihidir.

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

### 14.2 Rate limit notu

`src/lib/rate-limit.ts` in-memory. Vercel serverless'ta her instance farklı Map tutar — hard limit değil, yumuşak bir koruma. Ciddi abuse'a karşı Upstash Redis veya Vercel Edge Config gerekir (şimdilik opex gereksiz).

---

_Son güncelleme: 2026-04 (ikinci dalga) — §3 depolama mimarisi güncellendi (base64-in-DB), §12 builder'a görsel/logo upload + visibility toggle + reorder perf notları eklendi, §12.4 backend davranışları (cross-category sortOrder + TR price parser), §13.8 analytics admin UI davranışları (refresh, reset, window date, all-time note, mobile chart responsive)._

