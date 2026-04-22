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

## 3. Depolama Mimarisi (Vercel Geçişi Sonrası ÖNEMLİ)

**UYARI:** Vercel, salt-okunur ve geçici (ephemeral) bir dosya sistemi kullanır. Mevcut yerel disk (`public/uploads`) tabanlı görsel yükleme sistemi Vercel'de **çalışmayacaktır**.

| Veri | Nerede | Not |
|---|---|---|
| Veritabanı | Supabase PostgreSQL | Kalıcı |
| Menü/ürün görselleri | Yerel Disk (public/uploads) | **Vercel'de geçicidir, silinir.** |

### Çözüm Önerisi (Storage Migration)
Vercel'e geçiş sonrası görsellerin kalıcı olması için **Supabase Storage** veya **Vercel Blob** entegrasyonu yapılmalıdır.
- Mevcut `src/app/api/menu/upload/route.ts` dosyası Supabase SDK kullanacak şekilde güncellenmelidir.

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

_Son güncelleme: 2026-04 v2 — Brand refresh: Gold/Ink/Navy palette (eski Trust Orange + Deep Navy), Manrope+Inter font (eski DM Sans), yeni sade BuazeLogo (checkmark kaldırıldı), neo-brutalist offset shadow'lar soft shadow'larla değiştirildi. ~120 dosya, ~1800 inline hex migrate edildi. Platform brand hex'leri korundu._

