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

## 4.5 Admin "Müşteriler" vs "İşletmeciler" ayrımı (2026-04)

İki benzer isimli sayfa var, **farklı veri kaynakları:**

| Sayfa | Kaynak | Amaç |
|---|---|---|
| `/admin/members` ("İşletmeciler") | `User` tablosu (`role='restaurant_owner'`) | SaaS hesap yönetimi — plan, trial, aktiflik |
| `/admin/customers` ("Müşteriler") | `Feedback` tablosu (groupBy email/phone) | Restoran son-müşterileri — QR ile feedback bırakanlar |

**API'ler:**
- `GET /api/admin/members` → User listesi (dokunulmadı, SaaS tarafı)
- `GET /api/admin/customers` → Feedback-derived customer list (2026-04'te yeniden yazıldı). Query: `restaurantId`, `range`, `search`, `hasEmail`, `hasPhone`, `hasComment`, `page`, `limit`. Response: `{ data, meta, summary }`. **Sadece KVKK onaylı satırlar**, IDOR `getScopedRestaurantIds` ile.
- `GET /api/admin/customers/export` → aynı filtrelerle tüm set CSV (UTF-8 BOM).

**Dedupe mantığı:** `(restaurant_id, COALESCE(lower(email), phone))` → aynı müşteri aynı restorana birden fazla feedback bıraksa bile tek satır; email+phone ikisi de boş olan anonim feedback listede yer almaz.

**Sidebar label'ları:** "Üyeler" → "İşletmeciler" olarak değiştirildi; "Müşteriler" label'ı aynı ama anlamı farklılaştı.

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

### Eski renkler → Pulse karşılıkları (v2 → Pulse)
| v2 (Eski) | Pulse (Yeni) |
|---|---|
| `#F4B400` Gold | `#C6F24E` Lime |
| `#D69E00` Gold Deep | `#A8D62E` Lime Deep |
| `#B88800` Dark Gold (text on soft bg) | `#0A0A0A` Graphite |
| `#FFD666` Amber | `#D7F98E` Mid Lime |
| `#FFF8D6` Soft Gold bg | `#EAF9B8` Lime Soft |
| `#1A2332` Navy | `#0A0A0A` Graphite |
| `#0E1525` Ink | `#000000` Pure Black |
| `#2A3444` Slate | `#1A1A1A` N800 |
| `#F8F6F1` Ivory | `#FFFFFF` Pure |
| `#E8ECF2` Cloud | `#EDEDED` N200 |
| `#FFB347`/`#FB923C`/`#F97316` (v1 gradient) | `#C6F24E`/`#A8D62E`/`#8CB81E` |

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

**Opsiyonel:**
- `OPENAI_API_KEY` — AI Co-Pilot yanıt önerileri için (§15). Yoksa endpoint deterministik şablona düşer, UI çalışmaya devam eder.
- `OPENAI_MODEL` — Varsayılan `gpt-4o-mini`.

### 14.2 Rate limit notu

`src/lib/rate-limit.ts` in-memory. Vercel serverless'ta her instance farklı Map tutar — hard limit değil, yumuşak bir koruma. Ciddi abuse'a karşı Upstash Redis veya Vercel Edge Config gerekir (şimdilik opex gereksiz).

---

## 15. AI Co-Pilot (OpenAI) — 2026-04

Restoran panelindeki yorum gelen kutularında (`/[locale]/dashboard/feedbacks` + `/admin/reviews`) "Taslak oluştur" butonu OpenAI'a yanıt taslağı yazdırır.

**Helper:** `src/lib/openai.ts` — `hasOpenAIKey()` + `chatCompletion(messages, opts)`. Doğrudan `fetch` kullanır, `openai` SDK dep yok (CLAUDE.md §7).

**Endpoint:** `POST /api/feedback/[id]/suggest-reply`
- Auth: `getPanelActorFromRequest` + `canAccessRestaurant` (IDOR)
- Rate limit: 30 istek / dk / actor (in-memory)
- Body: `{ locale?: 'tr' | 'en' }` — diğer her şey Prisma'dan çekilir (rating, comment, customerName, platform, restaurant.name/category)
- Response: `{ feedbackId, suggestion, source: 'openai' | 'template' | 'template-fallback' }`
- Fallback: `OPENAI_API_KEY` yoksa veya API hatası olursa `buildReplyTemplate()` deterministik şablonu döner — UI her zaman bir şey alır.

**Prompt:**
- System: Restoran itibar uzmanı rolü; 2-4 cümle, maks. 80 kelime; olumluya teşekkür + yeniden davet, olumsuza özür + somut düzeltme (ücretsiz ikram ÖNERME), emoji yok, müşteri adı ilk adıyla.
- User: İşletme adı + kategori + müşteri + puan + platform + yorum — yapılandırılmış format.
- Model: `gpt-4o-mini` default (hızlı + ucuz). `OPENAI_MODEL` env'iyle override.
- `temperature=0.7`, `max_tokens=300`.

**UI davranışı:**
- Admin reviews sayfası (`src/app/admin/reviews/page.tsx`): butonda loader + `AI` / `ŞABLON` rozeti response source'una göre. Optimistik olarak önce local template doldurur, sonra endpoint cevabını kullanır.
- Owner feedbacks sayfası (`src/app/[locale]/dashboard/feedbacks/page.tsx`): zaten endpoint'i çağırıyordu, OpenAI cevabını otomatik alır.

**Maliyet notu:** 1 öneri ≈ 400 token ≈ $0.0001 (gpt-4o-mini). 10.000 öneri/ay = $1. Kotayı OpenAI dashboard'dan takip et.

**Güvenlik:**
- Anahtar yalnız server-side (`process.env`). Client bundle'a sızmaz (NEXT_PUBLIC_ prefix yok).
- Rate limit + IDOR koruması var. Anahtarı yanlışlıkla commit etmemek için `.env.local` git-ignored; `.env.example`'da boş bırakılmış.

---

_Son güncelleme: 2026-04 (üçüncü dalga) — §15 AI Co-Pilot eklendi, §3 depolama mimarisi güncellendi (base64-in-DB), §12 builder'a görsel/logo upload + visibility toggle + reorder perf notları eklendi, §12.4 backend davranışları (cross-category sortOrder + TR price parser), §13.8 analytics admin UI davranışları (refresh, reset, window date, all-time note, mobile chart responsive)._

---

## 16. Claude Design Handoff — Buaze Site Tasarımı (2026-04)

**Kaynak:** Claude Design (claude.ai/design) üzerinden kullanıcının hazırlattığı Pulse marka kimliği + tam site tasarımı.

### 16.1 Tasarım dosyalarının konumu

Tüm tasarım dosyaları `.design/` klasöründe (git-tracked, kaynak referansı olarak saklanıyor):

```
.design/
├── buaze-site.html          ← Ana canvas (tüm sayfalar için entry point)
├── chat1.md                 ← Tasarım geçmişi & karar log'u (ÖNCE OKU)
├── design-canvas.jsx        ← Canvas layout motoru
├── pulse/
│   ├── pulse-tokens.jsx     ← Renk, tipografi, spacing token'ları
│   ├── pulse-symbols.jsx    ← Logo & sembol SVG varyantları
│   ├── pulse-artboards-1.jsx ← Marka kimliği artboard'ları (1. parça)
│   ├── pulse-artboards-2.jsx ← Marka kimliği artboard'ları (2. parça)
│   ├── pulse-app.jsx        ← Pulse marka sistemi app
│   └── design-canvas.jsx    ← Pulse canvas
└── site/
    ├── site-shared.jsx      ← Ortak nav, footer, illüstrasyonlar
    ├── site-platforms.jsx   ← Platform logo'ları (Google, Yemeksepeti, Getir, Trendyol GO, Yelp, Tripadvisor...)
    ├── site-premium.jsx     ← Premium nav/footer v2 (mega-dropdown, mobile hamburger, animated footer)
    ├── site-homepage-v2.jsx ← Ana sayfa v2 (animasyonlu hero, ECG dashboard, live review ticker, video modal, bento grid)
    ├── site-homepage-v3.jsx ← Ana sayfa v3 (gerçek buaze.com içeriğine uyarlanmış)
    ├── site-onboarding-v2.jsx ← 5 adımlı onboarding wizard (tamamen redesign)
    ├── site-marketing.jsx   ← Marketing sayfaları (fiyatlar, QR, nasıl çalışır, karşılaştır, ROI)
    ├── site-more.jsx        ← Ekstra sayfalar (entegrasyonlar, müşteri hikayeleri, SSS, yardım, kariyer, yasal)
    ├── site-admin.jsx       ← Admin panel sayfaları (dashboard, inbox, QR builder, analitik, konumlar, ayarlar)
    ├── site-pages3.jsx      ← Çözüm sayfaları + sektör detayları + auth
    ├── site-pages4.jsx      ← Daha fazla sayfa (onboarding, 404, admin ek: kampanya, ekip, fatura, API)
    └── site-app.jsx         ← Tüm sayfaları bir araya getiren canvas uygulaması
```

### 16.2 Tasarım kararları & içerik özeti

**Marka:** Pulse kimliği — graphite (#0A0A0A) + lime (#C6F24E) + pure white. Zaten §11'de belgelenmiş.

**Canvas'ta kaç sayfa var:** ~38 sayfa, 5 grup:
1. **Marketing** — Anasayfa v2/v3, özellikler, AI Co-Pilot, fiyatlar, ROI hesaplayıcı, QR studio, entegrasyonlar, karşılaştır, müşteri hikayeleri, EN uluslararası
2. **Çözümler** — Restoran, Paket servis (Yemeksepeti/Getir/Trendyol GO logolarıyla), Otel (Booking/Tripadvisor), Klinik, Hukuk, Spa, Perakende
3. **İçerik** — Blog listesi, blog yazısı, SSS, yardım, hakkımızda, kariyer, iletişim, gizlilik
4. **Auth** — Kayıt, giriş, şifre sıfırla, onboarding (5 adım), 404
5. **Admin** — Dashboard, yorum inbox (AI Co-Pilot), QR builder, analitik, konumlar, kampanyalar, ekip, bildirimler, fatura, API/webhook, ayarlar

**Platform entegrasyonları:** TR için Google, Yemeksepeti, Getir, Trendyol GO + EN için Yelp, Tripadvisor, Foursquare, Facebook.

**Animasyonlar:** ECG banner (SVG stroke-dashoffset), live review ticker, AnimCounter (sayı koşma), marquee logo şeridi, heartbeat pulse, social proof toast, video modal, sticky CTA bar.

**Onboarding wizard (5 adım):** İşletme bilgileri → Sektör → Konum → Platform seçimi → QR oluştur → Done screen.

### 16.3 Implementasyon öncelikleri (bir sonraki oturumda)

Kullanıcı "tasarımı geliştirme planına geçeceğiz" dedi. Implementasyon sırası için önerilen yaklaşım:

1. **Marketing anasayfa** (`src/app/[locale]/page.tsx` veya yeni landing) — hero, nav, conversion öğeleri
2. **Auth sayfaları** (login/register) — Pulse tasarımına uyarla
3. **Onboarding wizard** — 5 adım, mevcut `src/app/[locale]/onboarding/` route'una bak
4. **Admin dashboard** — mevcut `src/app/admin/dashboard/` sayfasını Pulse v2 ile güncelle
5. **Public QR landing** (`/r/[slug]`) — buaze-site.html'deki QR kart tasarımı referans

**ÖNEMLI:** Implementasyon başlamadan kullanıcıdan scope onayı al. Hangi sayfadan başlanacağını sor.

### 16.4 Dikkat edilecekler

- `.design/` klasörü sadece **referans** — bu dosyaları doğrudan `src/`'ye kopyalama, React/Babel prototipleri
- Renk token'ları zaten `globals.css` `@theme {}` blokunda tanımlı (§11'e bak)
- Logo SVG → `src/components/marketing/BuazeLogo.tsx` zaten güncel
- Font'lar zaten yüklü (`src/app/layout.tsx`)

---

## 17. 2026-04 Pulse Redesign Wave — Session Wrap-Up

Tek bir session'da 15 draft PR üretildi (#39 → #53). Bir sonraki oturum bu bölümü okuyunca ne merge edilmesi gerektiğini, hangi component/util/endpoint'in nereye eklendiğini, neyin hâlâ açık known-gap olduğunu görebilsin.

### 17.0 Nerede ne var — hızlı dosya haritası

| Yol | İçerik |
|---|---|
| `.design/` (repo kökü) | **Claude Design handoff bundle** — 21 dosya, JSX prototipleri + canonical site HTML. Git-tracked, referans olarak tutulur. `.design/site/*.jsx` (12 artboard grubu) + `.design/pulse/*.jsx` (token + sembol) + `.design/buaze-site.html` + `.design/chat1.md` (design chat geçmişi). Detaylı dosya haritası §16.1'de. |
| `design.md` (repo kökü) | **Faz log'u** — her faz için "Kapsam / Değişen dosyalar / Backend etkisi / Verification / Sonraki adım" + "Backend açıkları" tablosu. 15 PR'lık zincirin teknik günlüğü. |
| `CLAUDE.md` (bu dosya) | Proje referansı + her yeni sessionda önce okunur. §1-16 mevcut mimari, §17 bu Pulse redesign dalgasının özeti. |
| `src/components/marketing/*` | Yeni marketing component'leri (§17.2) |
| `src/app/globals.css` | Pulse button utility'leri + 5 motion keyframe (§17.3) |
| `src/app/api/**` | Mevcut 68 API + 9 yeni 501 scaffold (§17.4) |
| `src/lib/scaffolding.ts` | Henüz eklenmemiş Prisma modelleri için yorum-önerisi blokları + `scaffoldedResponse()` helper'ı |
| `src/lib/openai.ts` | AI Co-Pilot OpenAI client (§15) |

**Kritik kural:** `.design/*.jsx` React prototipleridir → `src/`'ye **doğrudan kopyalanmaz**. Yalnız referans olarak okunur; Pulse token'lar zaten `globals.css`'te var, font'lar `layout.tsx`'te yüklü.

### 17.1 Draft PR zinciri (merge sırası önemli)

Her PR bir önceki branch'in üzerine açıldı — merge sırayla yapılmalı:

| PR | Başlık | Branch |
|---|---|---|
| #39 | docs(design): Phase 0 — baseline + .design bundle + design.md | `claude/design-phase-0-baseline` |
| #40 | feat(design): Phase 1 — chrome + homepage v3 conversion layer | `claude/design-phase-1-home` |
| #41 | fix(owner): restaurants list vanished after clicking the mini map | `claude/fix-owner-restaurants-accidental-toggle` |
| #42 | feat(design): Phase 2 — onboarding 5-step + confetti + 404 | `claude/design-phase-2-auth-onboarding` |
| #43 | feat(design): Phase 3 — AI Co-Pilot + dynamic case studies + ROI | `claude/design-phase-3-marketing` |
| #44 | feat(design): Phase 4 — retail sector + TR/design slug aliases + footer | `claude/design-phase-4-solutions` |
| #45 | feat(design): Phase 5 — content APIs scaffolded | `claude/design-phase-5-content` |
| #46 | feat(design): Phase 6 — admin core header consistency | `claude/design-phase-6-admin-core` |
| #47 | feat(design): Phase 7 — API & Webhook page + admin headers | `claude/design-phase-7-admin-advanced` |
| #48 | feat(design): Phase 8 — public Pulse sweep + design-intent gap fixes | `claude/design-phase-8-public-polish` |
| #49 | feat(admin): QR page 4-step visual wizard | `claude/post-phase-qr-wizard` |
| #50 | feat(home): animated v2 hero dashboard | `claude/post-phase-hero-v2` |
| #51 | feat(chrome): conversion-led IA redesign for header + footer | `claude/post-phase-nav-footer-ia` |
| #52 | feat(polish): pulse button system + real Unsplash imagery | `claude/post-phase-buttons-imagery` |
| #53 | fix(ux): onboarding polish + QR pages cleanup + api entry scoped | `claude/post-phase-onboarding-qr-fix` |

**Takip dosyası:** Repo kökünde `design.md` — her faz için "Kapsam / Değişen dosyalar / Backend etkisi / Verification / Sonraki faz" kayıtları + "Backend açıkları" tablosu.

### 17.2 Yeni eklenen marketing component'leri (hepsi client-side)

`src/components/marketing/`:

- `AnimatedCounter.tsx` — IntersectionObserver ile 0→hedefe easeOut tween. `locale` prop'u TR `1.284` / EN `1,284` ayrımı yapar. Phase 1.
- `MarqueeRow.tsx` — CSS-only horizontal logo marquee + edge mask. Phase 1.
- `StickyCtaBar.tsx` — 600px scroll sonrası altta koyu "Bugün başla" CTA + session-dismiss. Phase 1.
- `SocialProofToast.tsx` — 3s → 8s döngüyle TR/EN 5 toast gösterir. Phase 1.
- `VideoModal.tsx` — sandboxed iframe + ESC/backdrop close + body-scroll lock. Phase 1.
- `WatchDemoButton.tsx` — hero'daki "Demo izle" client sarıcısı (VideoModal'ı açar). Phase 1.
- `HomeIndustryTabs.tsx` — 8 sektör tab'ı + per-sektör body copy. Phase 1.
- `NewsletterSignup.tsx` — footer email capture, 501'i "başarı" sayar. Phase 1.
- `LiveReviewTicker.tsx` — homepage dark panel'de 4 review 2.8s rotate. Phase 8.
- `HomeHeroDashboard.tsx` — v2 hero'daki animasyonlu canlı dashboard kartı (chart stroke-dashoffset reveal + AnimCounter + floating +184% badge + staggered review rows). Post-phase #50.

`src/components/admin/`:

- `SuperadminBlock.tsx` — workspace-scoped admin sayfalarını (`/admin/{billing,campaigns,team,notifications,settings}`) superadmin için "Yönetici için değil" kartıyla gate'ler. Phase 5.

### 17.3 Yeni Pulse utility class'ları (`src/app/globals.css`)

**Button system** (Post-phase #52):
- `.pulse-btn-primary` — lime `#C6F24E`, hover `#A8D62E`, active scale 0.98
- `.pulse-btn-dark` — graphite `#0A0A0A`, hover `#1A1A1A`
- `.pulse-btn-ghost` — transparent, hover border `#0A0A0A`
- `.pulse-card-hover` — `translateY(-3px)` lift + soft shadow + border highlight

**Motion keyframes:**
- `@keyframes slideIn` + `.animate-slide-in` — sticky CTA / toast giriş (Phase 0)
- `@keyframes marqueeSlide` + `.animate-marquee` — logo strip (Phase 0)
- `@keyframes ecgDraw` — footer lime heartbeat line reveal (Phase 1)
- `@keyframes confettiFly` — onboarding finish burst, `--cf-x/y/rot` per-particle custom properties (Phase 2)
- `@keyframes bzFloat` + `.bz-float` — hero +184% badge ±6px Y oscillation (Post-phase #50)

Tüm animasyonlar `prefers-reduced-motion: reduce` altında devre dışı (tek bir `@media` bloğu hepsini kapsar).

### 17.4 Yeni scaffolded API endpoint'leri (501 döner)

Hepsi `scaffolding.ts` helper'ını kullanır. Prisma model önerileri scaffolding.ts başındaki yorum bloğunda tanımlı.

| Endpoint | Method | Prisma model (öneri) | Faz |
|---|---|---|---|
| `/api/newsletter` | POST | `NewsletterSubscriber` | Phase 1 |
| `/api/admin/analytics/export` | GET | `AnalyticsExport` | Phase 5 |
| `/api/roi/save` | POST | `ROIRequest` | Phase 3 |
| `/api/help/articles` | GET | `HelpArticle` | Phase 5 |
| `/api/careers/apply` | POST | `CareerApplication` | Phase 5 |
| `/api/billing/summary` | GET | `BillingSubscription` | Phase 5 |
| `/api/billing/invoices` | GET | `BillingInvoice` | Phase 5 |
| `/api/onboarding/state` | GET/PATCH | `OnboardingProgress` | Phase 5 |
| `/api/onboarding/complete` | POST | `OnboardingProgress` | Phase 5 |

**OpenAI / AI Co-Pilot canlı:** `POST /api/feedback/[id]/suggest-reply` gerçek OpenAI gpt-4o-mini'ye bağlı (rate-limit 30/dk/actor + IDOR koruması + template fallback). §15'e bak.

### 17.5 Yeni UI route'ları

**Public:**
- `/features/ai-copilot` — AI Co-Pilot ürün sayfası (Phase 3)
- `/case-study/[slug]` — dinamik vaka çalışmaları (3 mock: `kadikoy-bistro`, `hotel-nora`, `derma-klinik`) (Phase 3)
- `/[locale]/onboarding` — 5-step wizard + confetti (Phase 2, polished Post-phase #53)

**Solutions aliasları (7 redirect + 1 yeni):**
- `/solutions/retail` yeni sektör sayfası
- `/solutions/{hotel,clinic,legal,spa,otel,klinik,hukuk,perakende}` → kanonik slug'lara redirect

**Admin workspace-scoped (SuperadminBlock'lu):**
- `/admin/reviews`, `/admin/analytics`, `/admin/settings`, `/admin/campaigns`, `/admin/team`, `/admin/billing`, `/admin/notifications`, `/admin/api`

### 17.6 IA değişiklikleri

**Header (`MarketingNavbarClient.tsx`, tamamen yeniden yazıldı Post-phase #51):**
- 5 top entry: Ürün / Çözümler / Müşteriler / Kaynaklar / Fiyatlandırma
- 3 mega-dropdown (Ürün + Çözümler + Kaynaklar) + 1 mini dropdown (Müşteriler)
- Logo yanında "2.400+ işletme" trust chip
- Ürün dropdown'unda AI Co-Pilot lime featured card + inline Demo izle

**Footer (`MarketingFooter.tsx`, 4 → 5 kolon):**
- Yeni **Resources** kolonu (Help / FAQ / ROI / Compare / Ücretsiz QR / Pricing)
- Ürün kolonuna "Review Management" + "API & Webhook" eklendi
- Company kolonuna "Vaka çalışmaları" + "Kariyer · 5 POZİSYON" badge
- Brand kolonuna "★ 2.400+ işletme" + "KVKK · GDPR" trust pill'leri
- Bottom rail: 7-link legal mini-strip (Gizlilik / KVKK / Şartlar / Çerez / Açık-Rıza / Ticari-İleti / Google Uyumu)

### 17.7 Gerçek görseller (Post-phase #52)

Unsplash CC0 fotoğrafları 3 stratejik yerde:
- **About → Takım**: 4 inisiyal placeholder → portrait fotoğraflar (CEO/CTO/Product/Growth), hover scale 1.02
- **Customer Stories grid**: 6 düz renkli stat bloğu → gerçek mekan fotoğrafları + dark gradient + metric overlay + `pulse-card-hover`
- **Case Study `/[slug]`**: 3 mock için magazine-style cover photo (16:9 → 21:9 → 3:1 responsive) + sektör eyebrow + brand h1

`next.config.ts` zaten `remotePatterns: [{ hostname: '**' }]` — Unsplash config eklemedi. `<img>` tag kullanıldı (next/image değil) — external CC0 asset'ler için optimizer hop'unu atlamak için.

### 17.8 PlatformLogo iyileştirmeleri (Post-phase #53)

`src/components/marketing/PlatformLogo.tsx`:
- **Yemeksepeti**: abstract üçgenler → "ys" monogram (brand kırmızı)
- **Trendyol GO**: jenerik T + nokta → "ty" + beyaz "GO" puck (brand turuncu)
- Diğer 14 platform (Google, Getir, Migros Hemen, Yelp, Tripadvisor, Booking, Trustpilot, Facebook, Foursquare, OpenTable, Uber Eats, DoorDash, Instagram, Zomato) dokunulmadı

### 17.9 Backend güvenliği (dokunulmayan)

Hiçbir post-phase PR bu bölümü etkilemedi:
- **68 API route** (`src/app/api/**` mevcut) — sadece yeni scaffold'lar eklendi
- **Prisma schema** — sıfır değişiklik; tüm yeni modeller `scaffolding.ts` yorum bloğunda önerilir
- **Auth helpers** (`src/lib/auth.ts`, `panel-access.ts`) — dokunulmadı
- **IDOR**: `getScopedRestaurantIds` + `canAccessRestaurant` her yeni API'de uygulanıyor
- **Rate-limit**: `rateLimit()` helper'ı newsletter/careers/roi'de per-IP, openai'de per-actor
- **JWT cookie flow**: `MarketingNavbar.tsx` server wrapper'da `verifyJwt` korundu
- **OpenAI anahtarı**: `src/lib/openai.ts` + `process.env.OPENAI_API_KEY`, client bundle'a sızmıyor

### 17.10 Bilinen açık gap'ler (production öncesi)

`design.md` "Backend açıkları" tablosunda detaylı — özet (2026-04 beşinci dalga'dan sonra güncel durum):

1. ~~**Sektör bespoke content** — CaseStudy modeli ve CMS bağlantısı.~~ **§18.1'de kısmen kapatıldı** (CaseStudy modeli + seed + DB-backed `/case-study/[slug]`). SolutionPageLayout ↔ CaseStudy `sector` alanı ile "Related" bağlama henüz yapılmadı.
2. ~~**501 scaffold'larının gerçek backend'i**~~ — **§18'de 7/9 kapatıldı**. 9 scaffolddan 7'si artık Prisma + mevcut provider'lara bağlı (Resend, Supabase Storage). Sadece billing tarafı yarım kaldı (POS entegrasyonu yok).
3. **Sanal POS entegrasyonu** — Billing read-side (§18.3) canlı ama `POST /api/billing/checkout` ve `POST /api/billing/webhook/iyzico` henüz yok. Iyzico/Stripe seçimi + provider hesabı + webhook secret'ı gerekiyor.
4. **Mobile QA cihazda** — dev server 200/307 doğruladı, ama 375/768/1280 breakpoint'lerde görsel QA gerçek cihazda yapılmalı.

### 17.11 Design handoff referans dosyaları

`.design/` klasörü (21 dosya, branch `save-design-files-moe8c`'den Phase 0'da alındı, §16'da dosya haritası):
- `site/site-homepage-v2.jsx` — hero dashboard animasyon referansı (HeroDashboard, AnimCounter, LiveTicker)
- `site/site-homepage-v3.jsx` — canonical copy (trust tickler, 3-step, ticker)
- `site/site-premium.jsx` — PremiumNav / PremiumFooter / ConversionLayer (sticky CTA + toast)
- `site/site-onboarding-v2.jsx` — 5-step canonical + OnboardingProgress + Confetti
- `site/site-admin.jsx` — AdminShell, AdminDashboard, AdminReviews, AdminQRBuilder, AdminAnalytics, AdminLocations, AdminSettings
- `site/site-pages3.jsx`, `site-pages4.jsx` — sektör + legal + admin advanced

**Dikkat:** `.design/*.jsx` React prototipleridir, `src/`'ye direkt kopyalanmaz — yalnız referans olarak okunur.

---

## 18. Backend Wiring Wave — §17.10 kapanışı (2026-04)

Session özeti: CLAUDE.md §17.10'daki üç gap'ten ikisi (CaseStudy + 9 scaffold) dalga dalga bağlandı. Branch: `claude/connect-prisma-providers-3ytkP`. Üç commit:

| Commit | Kapsam |
|---|---|
| `6f1a05a` | Wave 1 — CaseStudy + Onboarding + Newsletter + ROI |
| `a048615` | Wave 2 — HelpArticle + Admin Analytics CSV + Careers |
| `f8a8f1c` | Wave 3 kısmi — Billing read-side (POS YOK) |

**Stratejik karar:** Hiçbir yeni external provider eklenmedi. Zaten kurulu olan Resend (mail) + Supabase Storage (dosya) + OpenAI (AI Co-Pilot) yeterli. POS (Iyzico/Stripe) kasıtlı olarak ertelendi (§18.3'e bak).

### 18.1 Wave 1 — Hızlı win'ler (commit `6f1a05a`)

Tek dış bağımlılık yok; sadece Prisma + mevcut helper'lar.

**Yeni Prisma modelleri:**
- `CaseStudy` — `slug @unique, brand, sector, sectorEn, location, heroImage, heroTr/En, subtitleTr/En, stats Json, highlights Json, quoteTr/En, personName, personRole Json, isPublished, publishedAt`
- `OnboardingProgress` — `userId @id, step Int, data Json?, completedAt` (UI kontratına hizalandı; scaffolding'deki 4 boolean kolon bu wizard'a uymuyordu)
- `NewsletterSubscriber` — `email @unique, locale, source, ip, createdAt, unsubscribedAt`
- `ROIRequest` — `email, restaurantName, tables, avgTicket Decimal, noShowRate, projection Json, ip, createdAt`

**Yeni/değişen endpoint'ler:**
- `GET /api/case-studies[?slug=]` — list veya tek kayıt; `isPublished=true` filtresi.
- `src/app/[locale]/case-study/[slug]/page.tsx` — inline `STUDIES` array silindi, `prisma.caseStudy.findUnique` + `notFound()`; JSX 1:1 korundu.
- `prisma/seed-case-studies.ts` — 3 mock (`kadikoy-bistro`, `hotel-nora`, `derma-klinik`) idempotent `upsert`. **Manuel çalıştır:** `npx ts-node prisma/seed-case-studies.ts` (migration file kullanılmaz).
- `GET/PATCH /api/onboarding/state` — `getPanelActorFromRequest` ile scoped; `prisma.onboardingProgress.upsert` pattern.
- `POST /api/onboarding/complete` — `completedAt = new Date()`; actor email varsa Resend ile welcome mail (`sendMail`).
- `POST /api/newsletter` — `prisma.newsletterSubscriber.upsert(email)` (duplicate-safe, unsubscribed olanı yeniden aktifleştirir); mevcut `rateLimit()` korundu.
- `POST /api/roi/save` — insert + `NOTIFICATION_EMAIL` env set ise sales inbox'a mail; `Prisma.Decimal` ile fiyat alanı.

### 18.2 Wave 2 — Orta karmaşıklık (commit `a048615`)

**Yeni Prisma modelleri:**
- `HelpArticle` — `slug + locale @@unique, category, title, excerpt, body Text, searchTags String[], isPublished, order`
- `CareerApplication` — `name, email, roleSlug, message, portfolio, attachment, locale, ip, status, createdAt`

**Yeni/değişen endpoint'ler:**
- `GET /api/help/articles?locale=&category=&slug=` — kategoriye göre gruplu liste VEYA tek makale (`slug` + `locale` bileşik key ile). Seed yok — mevcut `/help` sayfası statik hub. Admin CRUD sonra.
- `GET /api/admin/analytics/export?format=csv&range=7d|30d|90d|all` — **stream-only CSV** (`AnalyticsExport` model eklenmedi, premature). `getScopedRestaurantIds` ile IDOR; restoran başına toplam/ort./düşük/yüksek + 4 platform dağılımı. UTF-8 BOM + `attachment` Content-Disposition.
- `POST /api/careers/apply` — JSON body (multipart değil; frontend henüz form göndermemiş durumda). Data URL attachment varsa (`^data:mime;base64,...`) → `uploadToStorage('careers/...')` ile Supabase Storage'a kaydeder, URL döner. 5 MB limit; PDF/DOC/DOCX/PNG/JPG. `isStorageConfigured()` false ise 503. `CAREERS_INBOX_EMAIL` (fallback `NOTIFICATION_EMAIL`) ile HR mail'i.

**Dikkat:** `HelpArticle` arrayField (`searchTags String[]`) sadece PostgreSQL'de native destek alır — Supabase Postgres kullanıldığı için sorun yok.

### 18.3 Wave 3 — Billing read-side (commit `f8a8f1c`, POS YOK)

Kullanıcı sanal POS entegrasyonunu bilinçli ertelemek istedi. Read-side canlı — POS bağlanınca webhook bu tablolara yazacak, UI değişmeden çalışacak.

**Yeni Prisma modelleri:**
- `BillingSubscription` — `userId @id, plan, status, trialEndsAt, renewsAt, providerRef @unique, paymentBrand, paymentLast4`. `providerRef @unique` webhook idempotency için.
- `BillingInvoice` — `id, userId, amount Decimal(10,2), currency @default("TRY"), status, providerRef @unique, pdfUrl, issuedAt`.

**Yeni sabitler (`src/lib/constants.ts`):**
- `PLAN_QUOTA: Record<string, number>` — `trial: 500, monthly: 2000, yearly: 50000, enterprise: 999999` (Infinity UI progress bar için kötü; sabit yüksek tavan).
- `PLAN_LABELS: Record<string, {tr, en}>` — UI rozetleri için.

**Değişen endpoint'ler:**
- `GET /api/billing/summary` — `resolveOwnerUserId(actor)` ile owner userId çözer (user → actor.id; manager → `restaurant.userId`). `BillingSubscription` source-of-truth; yoksa `User.plan` + `trialEndsAt` fallback (trial user). Quota: ay başından beri owner'ın tüm restoranlarındaki `Feedback.count`. Response shape admin UI'ın beklediği `{ plan, planLabel, status, trialDaysLeft, renewsAt, quota, paymentMethod }`.
- `GET /api/billing/invoices` — `userId`-scoped `findMany`; response'u admin UI'ın beklediği `{date, amount, status, url}` shape'ine map eder (`issuedAt → date`, `pdfUrl → url`).

**Henüz YOK (POS geldiğinde):**
- `POST /api/billing/checkout` — Iyzico subscription create + redirect URL.
- `POST /api/billing/webhook/iyzico` — imza doğrula → `subscription + invoice` `upsert` (`providerRef @unique` ile idempotent).
- Env: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` (sandbox/prod), `IYZICO_WEBHOOK_SECRET`. Stripe parite ikinci iterasyon.

### 18.4 Schema sync & dağıtım

- 4 wave'in tamamı `prisma/schema.prisma`'ya toplam **10 yeni model** ekledi: `CaseStudy`, `OnboardingProgress`, `NewsletterSubscriber`, `ROIRequest`, `HelpArticle`, `CareerApplication`, `BillingSubscription`, `BillingInvoice`.
- Migration dosyası **üretilmedi** (CLAUDE.md §7 kuralı) — deploy sırasında `package.json::build` scripti `prisma db push --accept-data-loss` çalıştırır, Supabase'teki şema otomatik senkronize olur.
- Local dev için: `npx prisma generate` yeterli (bu session'da yapıldı, TypeScript tipleri hazır).
- Case study seed **manuel çalıştırılmalı:** `npx ts-node prisma/seed-case-studies.ts` (veya `tsx prisma/seed-case-studies.ts`). Deploy akışına eklenmedi — 3 kayıt küçük, bir kere çalışır.

### 18.5 Kasten atlanmış kararlar (scope disiplini)

Aşağıdakilerin hiçbiri **eklenmedi** — her biri ayrı iş kalemi:

- Admin CRUD (CaseStudy, HelpArticle, CareerApplication için) — mevcut seed/scaffolded read yeterli
- `AnalyticsExport` modeli + Supabase Storage job path — stream-only ilk sürüm
- Resend Audiences sync (newsletter subs) — DB source of truth; Wave 2.4 opsiyonel katmanı yapılmadı
- `shared helper` dört DB-insert endpoint için — benzer görünse de şemalar farklı, 3+ tekrar kuralına henüz ulaşılmadı
- `zod` / `shadcn/ui` — proje kararına sadık, manuel validation + Tailwind arbitrary values
- Stripe parite — Iyzico TR öncelik, Stripe ikinci iterasyon
- Plan enforcement (quota aşımı durumunda feedback POST'u reddet) — şu an read-only yerinde; write-time enforcement ayrı scope

### 18.6 Yeni env var'ları (hiçbiri zorunlu değil, hepsi opsiyonel)

- `CAREERS_INBOX_EMAIL` — HR başvuru maili için; yoksa `NOTIFICATION_EMAIL` fallback.
- `NOTIFICATION_EMAIL` — zaten mevcut; ROI save ve Careers apply kullanır.
- `RESEND_API_KEY` — zaten mevcut; newsletter/welcome/ROI/careers mail gönderimleri bunu kullanır.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — zaten mevcut; careers attachment upload bunu kullanır.

POS için gerekli env'ler (Wave 3.5+): yukarıda §18.3'te listelendi.

### 18.7 Verification checklist

POS'suz halde çalıştığı doğrulandı:
- [x] `npx tsc --noEmit` — sadece 2 pre-existing hata (globals.css + menu analytics JSON tip), yeni kod temiz
- [x] `npx prisma generate` — 10 yeni model tipli
- [ ] `prisma db push` — local DB'de çalışmadı (bu sandbox'ta Supabase bağlantısı yok); Vercel deploy'da otomatik uygulanır
- [ ] Seed — deploy sonrası `npx ts-node prisma/seed-case-studies.ts` manuel çalıştırılmalı
- [ ] Mobile QA — dev server'da 375/768/1280 breakpoint'leri kontrol edilmeli

---

_Son güncelleme: 2026-04 (beşinci dalga) — §18 Backend Wiring Wave eklendi (3 commit, 10 yeni Prisma model, 9'dan 7 scaffold bağlandı, POS kasıtlı ertelendi). §17.10 gap listesi güncellendi. Daha önceki güncelleme §17 Pulse Redesign idi._

