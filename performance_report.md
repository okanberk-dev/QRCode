# Buaze QRCode Performans ve Hız Optimizasyon Raporu

**Repo:** `RiosenBeq/QRCode`  
**Proje:** Buaze QR Feedback & Restaurant Reputation Management SaaS  
**Hazırlanma amacı:** Claude Code veya başka bir AI coding agent'a verilecek, `CLAUDE.md` kararlarıyla uyumlu performans raporu ve uygulama promptu  
**Kapsam:** Mobil + masaüstü hız analizi, QR flow, marketing site, admin/owner dashboard, CSS/font/bundle, Prisma/Supabase, analytics ve güvenlik kuralları  
**Önemli not:** Bu doküman kod değişikliği yapmaz. Ama Claude Code'a uygulanabilir, aşamalı ve güvenlik kurallarını bozmayan bir görev planı verir.

---

## 0. CLAUDE.md Okumasından Çıkan Kritik Proje Kuralları

Bu rapor, yalnızca genel Next.js performans önerilerine göre değil, projenin kendi `CLAUDE.md` kurallarına göre güncellenmiştir. Özellikle aşağıdaki kararlar performans çalışmasında **bozulmaması gereken sınırlar** olarak kabul edilmelidir.

### 0.1 Proje kimliği ve ana akış

Buaze çok kiracılı bir QR feedback ve restaurant reputation management SaaS platformudur. Ana müşteri akışı:

1. Müşteri masada QR okutur: `/r/:slug?table=...&platform=...`
2. Puan verir.
3. Yüksek puan seçilen platforma yönlenir.
4. Düşük puan dahili forma düşer ve işletme/panel tarafında görülür.

Bu nedenle performans optimizasyonunda en kritik yüzey **`/r/[slug]` mobil QR feedback flow** olmalıdır. Marketing homepage önemli, admin/dashboard önemli; fakat gerçek müşterinin ilk dokunduğu akış QR flow'dur.

### 0.2 Tech stack ve deployment sınırları

- Next.js 15 App Router
- TypeScript strict; build'de bazı ignore ayarları olabilir ama yeni hata üretilmemeli
- Supabase PostgreSQL
- Prisma 6
- Vercel deployment
- `DATABASE_URL` pgbouncer 6543
- `DIRECT_URL` migration için 5432
- Build akışı `prisma migrate deploy` ile ilerler
- `npm run db:push` yalnız lokal scratch DB için kullanılmalı, production/preview için kullanılmamalı

### 0.3 Auth, role ve IDOR kuralları

Her performans refactor'unda şu kurallar korunmalı:

- `getPanelActorFromRequest()`
- `getScopedRestaurantIds()`
- `canAccessRestaurant()`

gibi helper'lar panel/API route'larında bozulmamalı.

`/api/feedback/*` ve `/api/restaurants/*` scoping açısından hassas alanlardır. Performans amacıyla query sadeleştirilirken **yetki kapsamı genişletilmemeli**.

### 0.4 Admin terminolojisi

`CLAUDE.md` içinde admin terminolojisi kanonik olarak tanımlanmış:

| Terim | URL | Kaynak |
|---|---|---|
| İşletmeler | `/admin/members` | `User` restaurant_owner |
| Yöneticiler | `/admin/users` | `AdminUser` |
| Müşteriler | `/admin/customers` | `Feedback` derived |

Performans raporu veya Claude promptu bu terminolojiyi karıştırmamalı.

### 0.5 Platform parametresi ve QR davranışı

QR flow'da `platform` parametresi şu değerleri taşıyabilir:

```txt
google
yemeksepeti
getir
trendyol_go
tripadvisor
airbnb
booking
yandex
```

Yeni performans refactor'unda bu davranış korunmalı:

- `Feedback.platform` doğru yazılmalı
- QR generation history bozulmamalı
- Public `/r/[slug]` resolver platform önceliklerini ve fallback zincirini korumalı
- `externalPlatformsEnabled=false` olduğunda Google dışı platformlar public resolver tarafında yok sayılmalı
- Kayıtlı URL'ler silinmemeli; gate tekrar açılırsa kaldığı yerden çalışmalı

### 0.6 Entitlement / paket feature gate kuralları

Admin tarafından yönetilen işletme bazlı feature gate'ler korunmalı:

- `googleReviewManagementEnabled`
- `pulseAiEnabled`
- `menuEnabled`
- `menuPublished`
- `aiAnalyticsEnabled`
- `externalPlatformsEnabled`

Performans çalışması sırasında herhangi bir UI/API sadeleştirmesi bu gate'leri bypass etmemeli.

### 0.7 Supabase pooler ve Prisma sorgu kuralı

`CLAUDE.md` içinde önemli bir üretim notu var:

> Supabase pooler production'da `connection_limit=1` ile kullanıldığı için server-render sayfalarda aynı request içinde çoklu Prisma read batch'leri `Promise.all([...])` yerine `prisma.$transaction([...])` ile tek connection üstünden yürütülür.

Bu, admin/dashboard performans refactor'u için kritik.

Yanlış öneri:

```ts
await Promise.all([
  prisma.restaurant.count(),
  prisma.feedback.count(),
]);
```

Daha uyumlu yaklaşım:

```ts
await prisma.$transaction([
  prisma.restaurant.count(),
  prisma.feedback.count(),
]);
```

Cron/outbound per-row isolation gibi özel durumlarda `Promise.allSettled` kullanılabilir; ama server-render dashboard request'lerinde dikkatli olunmalı.

### 0.8 Recharts kuralı

`CLAUDE.md` içinde Recharts `ResponsiveContainer` ölçüm uyarısı için `MeasuredChart` pattern'i belirtilmiş.

Yeni chart kullanımında:

- Önce pozitif `ResizeObserver` ölçümü alınmalı
- Sonra numeric `width/height` ile chart render edilmeli
- `ResponsiveContainer` kaynaklı `width(-1) height(-1)` uyarısı yeniden üretilmemeli

Performans çalışmasında chart lazy load yapılırken bu pattern bozulmamalı.

### 0.9 Sentry ve browser extension noise ayrımı

`CLAUDE.md` içinde MetaMask / browser extension kaynaklı hataların app hatası olmadığı belirtilmiş. Performans veya error-boundary çalışmasında:

- `chrome-extension://...`
- `inpage.js`
- `runtime.lastError`
- MetaMask connect noise

uygulama performans problemi gibi ele alınmamalı. Gerçek app kaynaklı warning/error ayrıştırılmalı.

### 0.10 UI geliştirme kuralı

`CLAUDE.md` açıkça "ortak Button component yazma" gibi aşırı abstraction kaçınma yaklaşımını vurguluyor. Bu nedenle performans refactor'unda:

- Yeni büyük design-system abstraction yazılmamalı
- Tailwind helper class tekrarları proje standardı olarak kabul edilmeli
- Var olan `bz-*`, `pulse-*`, component düzeni korunmalı
- Tasarım dili bozulmamalı

---

## 1. Yönetici Özeti

Bu projedeki hız problemi tek bir dosyadan kaynaklanmıyor. Problem daha çok **global katmanların public, admin, dashboard ve QR flow'u aynı maliyet altında çalıştırmasından** kaynaklanıyor.

En kritik darboğazlar:

1. Root layout seviyesinde `force-dynamic` kullanımı
2. Root seviyede global `QueryProvider`
3. Global analytics/script yükü
4. Marketing hero'nun ağır client-side animasyon yapısı
5. `/r/[slug]` QR flow'un tamamen client-side başlaması
6. Admin dashboard'da aynı request içinde çok sayıda aggregate ve DB sorgusu
7. Font/CSS/bundle bütçesinin public yüzeylere fazla taşınması
8. Base64-in-DB menü görsellerinin public menü sayfaları için gelecekte performans riski yaratması

Doğru strateji:

> **Tasarımı bozma. Güvenlik/scoping'i bozma. Public sayfaları hafiflet. QR flow'u server-first yap. Dashboard verisini aşamalı/lazy yükle.**

---

## 2. Performans Yüzeyleri ve Öncelik Sırası

| Yüzey | Kullanıcı | Performans hedefi | Öncelik |
|---|---|---|---:|
| `/r/[slug]` QR feedback | Restoran müşterisi | İlk HTML hızlı, minimum loader, mobil-first | 1 |
| `/tr`, `/en` homepage | Potansiyel müşteri | LCP hızlı, düşük JS, SEO-friendly | 2 |
| Marketing/blog/legal pages | SEO + müşteri | Static/ISR, minimum client JS | 3 |
| Owner dashboard | İşletme sahibi | Hızlı shell, lazy widget, scoped data | 4 |
| Admin dashboard | Superadmin/manager | KPI önce, ağır aggregate sonra | 5 |
| Public menu `/menu/[slug]` | Restoran müşterisi | Görsel payload kontrolü, hızlı SSR | 6 |

---

## 3. Mevcut Mimari ve Riskli Noktalar

---

# 3.1 Root Layout Global Dinamik Render

## Mevcut durum

`src/app/layout.tsx` içinde root seviyede:

```ts
export const dynamic = 'force-dynamic';
```

Aynı root layout'ta:

- Google fontlar
- Google Analytics
- Yandex Metrica
- Vercel Analytics
- Vercel Speed Insights
- `QueryProvider`
- global body wrapper

bulunuyor.

## Neden sorun?

Root layout en üst segment olduğu için bu ayar yalnızca paneli değil, public marketing, blog, legal ve QR yüzeylerini de etkileyebilir.

Statik olabilecek sayfalar:

- `/tr`
- `/en`
- `/tr/pricing`
- `/tr/features`
- `/tr/kvkk`
- `/tr/gizlilik`
- `/tr/blog/*`
- `/tr/solutions/*`

dinamik davranışa yaklaşırsa CDN/cache avantajı zayıflar.

## Sonuç

Mobilde:

- TTFB artabilir
- LCP gecikebilir
- HTML daha geç gelebilir

Masaüstünde:

- Vercel CPU ve function invocation maliyeti artabilir
- SEO crawl verimliliği azalabilir
- Public sayfa response süreleri stabil olmayabilir

## CLAUDE.md uyumlu çözüm

Root layout'tan `force-dynamic` kaldırılmalı, fakat bu körlemesine yapılmamalı.

Önce şu callsite'lar analiz edilmeli:

```bash
grep -R "export const dynamic = 'force-dynamic'" src/app
grep -R "cookies()" src/app
grep -R "headers()" src/app
grep -R "getSiteSettings" src/app src/lib
```

Dinamik kalması mantıklı yüzeyler:

```txt
/admin/*
/[locale]/dashboard/*
/r/[slug] veya QR flow'un data-dependent bölümü
auth/session bağımlı layout/page'ler
```

Public marketing ve legal sayfalar mümkünse statik/ISR olmalı.

## Risk

Orta.

`getSiteSettings()` gibi DB tabanlı site ayarları metadata/layout içinde kullanılıyorsa `force-dynamic` kaldırıldığında davranış değişebilir. Çözüm:

- `unstable_cache`
- `revalidate`
- statik fallback
- admin ayar değişiklikleri için revalidation stratejisi

değerlendirilmeli.

---

# 3.2 QueryProvider'ın Root'ta Olması

## Mevcut durum

`src/app/layout.tsx` içinde:

```tsx
<QueryProvider>{children}</QueryProvider>
```

`QueryProvider` client component'tir ve TanStack React Query kullanır. `CLAUDE.md` içinde bu root yerleşim mevcut durum olarak belirtilmiş; fakat performans açısından tekrar değerlendirilmesi gerekir.

## Neden sorun?

React Query admin/dashboard için doğru araçtır. Ancak public marketing, blog, legal ve bazı static sayfalarda gereksiz client hydration maliyeti yaratabilir.

## Sonuç

Mobilde:

- Gereksiz JS parse/execute
- Gereksiz hydration
- INP/TBT riski

Masaüstünde:

- Public bundle büyümesi
- Static sayfa avantajının zayıflaması

## CLAUDE.md uyumlu çözüm

`QueryProvider` root'tan çıkarılıp yalnız şu layout'lara taşınmalı:

```txt
src/app/admin/layout.tsx
src/app/[locale]/dashboard/layout.tsx
```

Ancak önce tüm callsite'lar çıkarılmalı:

```bash
grep -R "useQuery\|useMutation\|useInfiniteQuery" src
grep -R "QueryProvider" src
```

Public marketing component'lerinde React Query kullanılmıyorsa root'tan çıkarma güvenlidir.

## Risk

Orta.

Provider dışına düşen `useQuery` runtime error verir. Bu yüzden taşıma küçük PR ile yapılmalı ve build + smoke test şarttır.

---

# 3.3 Global Analytics ve Script Yükü

## Mevcut durum

Root layout'ta global olarak şunlar çalışıyor:

- Google Analytics
- Yandex Metrica
- Vercel Speed Insights
- Vercel Analytics

Scriptler `lazyOnload` ile yükleniyor; bu doğru bir başlangıçtır. Ancak scriptlerin global olması hâlâ maliyet yaratır.

## Neden sorun?

Admin/dashboard ve QR feedback gibi yüzeylerde GA/Yandex her zaman gerekli olmayabilir. Özellikle Yandex Metrica mobil main thread'e sonradan yük bindirebilir.

## Sonuç

- Mobil INP etkilenebilir
- Admin/dashboard gereksiz script taşır
- QR flow'da müşteri deneyimi ölçüm ile yavaşlatılabilir

## CLAUDE.md uyumlu çözüm

Analytics route bazlı ayrılmalı:

```txt
Marketing/public layout:
- GA
- Yandex
- Vercel Analytics

Admin/dashboard:
- Sentry/error monitoring kalabilir
- GA/Yandex kaldırılmalı veya ayrıca gerekçelendirilmeli

QR flow:
- Müşteri akışını bloklamayacak minimal telemetry
```

Sentry tarafında `CLAUDE.md` içindeki DSN fallback ve browser-extension noise kararları korunmalı.

---

# 3.4 Homepage Hero Client-Side Animasyon Yükü

## Mevcut durum

`src/components/marketing/HomeHero.tsx` client component olarak çalışıyor ve çok sayıda animasyon/state içeriyor:

- mouse tracking
- cursor spotlight
- count-up
- interval rotator
- requestAnimationFrame
- live signal bars
- SVG/CSS animasyonlar

## Neden sorun?

Homepage LCP alanı büyük ölçüde hero'dur. Hero'nun tamamen client component olması mobilde ilk render maliyetini artırır.

## Sonuç

Mobilde:

- LCP gecikebilir
- İlk scroll akıcılığı düşebilir
- Düşük segment Android cihazlarda main thread yorulur

Masaüstünde:

- Premium efektler iyi görünür fakat JS maliyeti artar

## CLAUDE.md uyumlu çözüm

Tasarımı bozmadan hero iki parçaya bölünmeli:

```txt
HomeHeroStatic.tsx     -> server component
HomeHeroMotion.tsx     -> client component
```

### Static bölüm

- Başlık
- Subtitle
- CTA
- Temel mockup
- SEO için görünen ana copy
- İlk paint'te görünmesi gereken LCP içeriği

### Motion bölüm

- Cursor spotlight
- Parallax
- Count-up
- Rotator
- Live signal
- Decorative motion

Mobilde motion layer:

- hiç yüklenmeyebilir
- veya idle sonrası yüklenebilir
- veya CSS-only sade versiyonla kalabilir

## Dikkat

`CLAUDE.md` tasarım dilinin korunmasını ve gereksiz abstraction yazılmamasını vurguluyor. Bu nedenle yeni generic animation framework/component yazılmamalı; sadece mevcut component sorumlulukları ayrılmalı.

---

# 3.5 `/r/[slug]` QR Feedback Flow Client-Side Başlıyor

## Mevcut durum

`src/app/r/[slug]/page.tsx` tamamen client component'tir.

Akış:

1. Client page yüklenir
2. `useParams` / `useSearchParams` ile slug ve query okunur
3. `/api/restaurants?slug=${slug}` fetch edilir
4. Restaurant data gelince UI render olur
5. QR scan tracking yapılır
6. Yıldız/form/redirect akışı çalışır

API tarafında `/api/restaurants?slug=` için `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` vardır. Bu iyi bir optimizasyondur.

## Neden sorun?

QR flow mobilde gerçek müşteri akışıdır. İlk anlamlı içerik için JS + API fetch beklemek gereksiz gecikme yaratır.

## Sonuç

- QR okutma sonrası loader süresi uzayabilir
- Restaurant adı/kart ilk HTML'de gelmez
- Zayıf bağlantıda müşteri terk edebilir
- Mobil conversion düşebilir

## CLAUDE.md uyumlu çözüm

QR flow server-first yapılmalı.

Hedef yapı:

```txt
src/app/r/[slug]/page.tsx
src/app/r/[slug]/ReviewClient.tsx
src/app/r/[slug]/types.ts veya local type
```

### Server component sorumluluğu

- `params.slug` al
- restaurant data getir
- inactive/not found kontrol et
- public data'yı client component'e props olarak ver
- ilk HTML'de restaurant adı ve temel kart görünsün

### Client component sorumluluğu

- `platform`, `table`, `source`, `hl` davranışını koru
- yıldız seçimi
- düşük puan formu
- redirect overlay
- reCAPTCHA token
- feedback submit
- QR scan tracking

### Platform ve entitlement dikkatleri

Refactor sırasında:

- `externalPlatformsEnabled=false` davranışı korunmalı
- `defaultRedirectPlatform` fallback zinciri korunmalı
- `latestChecks` broken-skip bilgisi korunmalı
- Google dışı platformlar gate kapalıyken yok sayılmalı
- `Feedback.platform` doğru yazılmalı

### QR scan tracking

UI'ı bloklamamalı:

```ts
requestIdleCallback(() => sendQrScan())
```

veya fallback:

```ts
setTimeout(sendQrScan, 0)
```

`keepalive: true` korunabilir.

## Risk

Orta-yüksek.

Çünkü müşteri akışı ve platform redirect mantığı hassas. Refactor küçük yapılmalı ve tüm query parametreleri test edilmeli.

---

# 3.6 Admin Dashboard DB Sorgu ve Aggregate Yükü

## Mevcut durum

`src/app/admin/dashboard/page.tsx` ilk render sırasında çok sayıda Prisma sorgusu ve aggregate hesaplıyor.

Örnekler:

- total businesses
- new businesses 24h
- weekly review counts
- monthly reviews
- owners
- MRR hesapları
- recent restaurants
- attention metrics
- trial quota
- audit logs
- actor resolve

Bazı yerlerde `prisma.$transaction` kullanımı mevcut; bu `CLAUDE.md` içindeki Supabase pooler kuralıyla uyumludur.

## Neden sorun?

Admin dashboard'da her şeyi ilk server render'da hesaplamak response süresini uzatır. Veri büyüdükçe bu maliyet artar.

## Sonuç

Masaüstü:

- Admin dashboard TTFB artar
- İlk yükleme yavaşlar
- DB CPU artar

Mobil:

- Mobil admin görünümünde bile bazı desktop/ağır metrikler hesaplanabilir

## CLAUDE.md uyumlu çözüm

Dashboard üç katmana ayrılmalı:

### Katman 1 — İlk render KPI

İlk response ile gelsin:

- toplam işletme
- MRR
- aktif trial
- aylık yorum
- temel delta

### Katman 2 — Lazy widget

Sonradan yüklensin:

- recent members
- attention list
- operational signals
- plan distribution
- business growth chart

### Katman 3 — Cache/summary

Cache veya precomputed summary:

- haftalık growth buckets
- quota near full
- MRR trend
- audit summary

## Supabase/Prisma kuralı

Server-render içinde çoklu read batch yapılacaksa `Promise.all` değil, mümkünse `prisma.$transaction([...])` kullanılmalı.

Ancak ağır ve bağımsız widget'lar ayrı route/API üzerinden lazy yüklendiğinde her request kendi küçük query setini taşır.

## Recharts kuralı

Chart bileşenleri lazy load edilirken:

- `MeasuredChart` pattern'i bozulmamalı
- `ResponsiveContainer` negatif ölçüm warning'i tekrar üretilmemeli
- Below-the-fold chartlar dynamic import edilebilir

---

# 3.7 Owner Dashboard ve Polling

`CLAUDE.md` içinde kalan production planında dashboard polling azaltma görevi var. Bu performans raporunda da aynı doğrultu korunmalı.

## Dikkat edilmesi gerekenler

- Önce gerçek callsite ölçülmeli
- `NotificationBell` low-rating poll 60 sn ise gereksiz sıklaştırılmamalı
- Owner-scoped endpoint'lerde public CDN cache kullanılmamalı
- Private/no-store veya client stale/refetch stratejisi açıkça belirlenmeli
- Hedef: aynı dashboard 5 dakika açıkken API çağrı sayısını azaltmak

## Yanlış yaklaşım

Owner-specific dashboard API'larına public cache eklemek güvenlik ve data leak riski doğurabilir.

## Doğru yaklaşım

- React Query `staleTime`
- `refetchOnWindowFocus: false`
- kısa private cache
- visibility-based refetch
- manual refresh
- websocket/realtime varsa event-based update

---

# 3.8 Font Yükü

## Mevcut durum

Root layout global olarak üç font ailesi yükler:

- Space Grotesk
- Inter
- JetBrains Mono

Birden fazla weight vardır.

## Neden sorun?

Üç font ailesi public marketing ve QR gibi hızlı açılması gereken yüzeylerde gereğinden fazla olabilir.

## CLAUDE.md uyumlu çözüm

- Public marketing için Space Grotesk + Inter yeterli olabilir
- JetBrains Mono admin/dashboard veya system monospace'e taşınabilir
- Weight sayısı azaltılmalı
- Tasarım dili bozulmamalı

Öneri:

```txt
Marketing:
- Space Grotesk: 500, 600, 700
- Inter: 400, 500, 600, 700

Admin/dashboard:
- JetBrains Mono gerekiyorsa route-level
```

---

# 3.9 Global CSS Büyüklüğü

## Mevcut durum

`globals.css` içinde:

- theme tokenları
- base typography
- marketing utilities
- blog styles
- animation keyframes
- mobile utilities
- panel `bz-*`
- QR overlay animationları
- dashboard/admin primitives

beraber duruyor.

## Neden sorun?

Global CSS her route'a taşınır. Public sayfa admin CSS'i, admin sayfa marketing CSS'i alabilir.

## CLAUDE.md uyumlu çözüm

Büyük ve riskli bir tek seferlik CSS refactor yapılmamalı. Aşamalı ayrım önerilir:

```txt
globals.css       -> reset, theme token, base typography
marketing.css     -> marketing/blog/help/solutions
dashboard.css     -> owner dashboard
admin.css         -> admin panel
qr.css            -> /r/[slug]
menu.css          -> /menu/[slug]
```

İlk aşamada sadece düşük riskli, net route-specific class grupları taşınmalı.

## Dikkat

- `bz-*` ve `pulse-*` mevcut tasarım sistemleri bozulmamalı
- Yeni ortak Button abstraction yazılmamalı
- Tailwind v4 class üretimi ve arbitrary class kullanımları test edilmeli

---

# 3.10 Base64-in-DB Görseller ve Public Menu Performansı

`CLAUDE.md` içinde menü ürün görsellerinin Postgres TEXT kolonda base64 data URL olarak tutulduğu belirtilmiş. Bu Vercel ephemeral FS riskini çözmek için bilinçli karar.

## Performans etkisi

Bu yaklaşım depolama açısından kabul edilebilir görülmüş; ancak public menü sayfalarında şu riskleri doğurabilir:

- HTML/JSON payload büyüyebilir
- CDN image optimization kullanılamaz
- Browser cache avantajı sınırlı olur
- Çok görselli menülerde mobil veri kullanımı artar

## Bu raporun önerisi

Bu konu **hemen değiştirilmemeli**, çünkü `CLAUDE.md` bunu bilinçli karar olarak açıklıyor.

Ama performans planına şu future task eklenmeli:

- Public menu payload ölçümü
- İlk ekranda sadece gerekli görseller
- lazy image rendering
- düşük kalite placeholder
- ileride Supabase Storage/Blob migration planı

## Yanlış yaklaşım

Base64-in-DB kararını bu performans çalışmasında ani şekilde Storage'a taşımak. Bu scope büyütür ve data migration riski yaratır.

---

# 3.11 Bundle Sızıntısı Riski

## Riskli paketler

Public bundle'a sızmaması gerekenler:

- `recharts`
- `firebase`
- `@react-pdf/renderer`
- `@dnd-kit/*`
- admin-only Radix componentleri
- dashboard analytics componentleri

## İyi mevcut karar

`next.config.ts` içinde `lucide-react` için `optimizePackageImports` kullanılması doğru.

## Öneri

Bundle analyzer eklenmeli ve şu route'lar incelenmeli:

```txt
/tr
/en
/r/[slug]
/menu/[slug]
/admin/dashboard
/[locale]/dashboard
```

Komut:

```bash
ANALYZE=true npm run build
```

---

## 4. Uygulama Fazları

---

# Faz 1 — Ölçüm ve Haritalama

## Amaç

Kör optimizasyon yapmadan önce gerçek bağımlılık ve render haritasını çıkarmak.

## Görevler

```bash
grep -R "export const dynamic = 'force-dynamic'" src/app
grep -R "useQuery\|useMutation\|useInfiniteQuery" src
grep -R "from 'recharts'\|from \"recharts\"" src
grep -R "from 'firebase'\|from \"firebase\"" src
grep -R "@react-pdf/renderer" src
grep -R "@dnd-kit" src
grep -R "QueryProvider" src
grep -R "cookies()" src/app
grep -R "headers()" src/app
```

Ek:

- bundle analyzer ekle
- `ANALYZE=true npm run build`
- route bazlı chunk incele
- public bundle'a ağır paket sızıyor mu listele

## Kabul kriterleri

- Build geçer
- Public bundle riskleri listelenir
- Dinamik route listesi çıkarılır
- QueryProvider bağımlılık haritası çıkarılır

---

# Faz 2 — Root Layout ve Provider Ayrıştırması

## Amaç

Public sayfaları gereksiz provider/script/dynamic maliyetinden kurtarmak.

## Görevler

1. Root layout'taki `force-dynamic` kullanımını kaldırmayı değerlendir.
2. Gereken dynamic ayarları segmentlere taşı.
3. `QueryProvider` root'tan çıkar.
4. QueryProvider'ı admin/dashboard layout'larına taşı.
5. GA/Yandex scriptlerini marketing/public layout'a taşı.
6. Admin/dashboard script yükünü sadeleştir.
7. Sentry DSN fallback ve browser-extension noise kararlarını bozma.

## Kabul kriterleri

- `/tr`, `/en`, legal/blog sayfaları provider'sız render olur
- Dashboard/admin React Query hatası vermez
- Auth/session davranışı bozulmaz
- Build geçer

---

# Faz 3 — QR Flow Server-First Refactor

## Amaç

Mobil QR müşteri deneyimini hızlandırmak.

## Hedef dosya yapısı

```txt
src/app/r/[slug]/page.tsx
src/app/r/[slug]/ReviewClient.tsx
```

## Görevler

1. `page.tsx` server component olsun.
2. Restaurant data server'da alınsın.
3. Inactive/not found server'da handle edilsin.
4. İlk HTML'de restaurant adı ve temel feedback kartı görünsün.
5. Yıldız/form/redirect/reCAPTCHA client component'e taşınsın.
6. Query parametre davranışı korunsun:
   - `platform`
   - `table`
   - `source`
   - `hl`
7. Platform resolver davranışı korunsun.
8. `externalPlatformsEnabled` gate'i korunmalı.
9. QR scan tracking UI'ı bloklamadan çalışmalı.
10. Düşük/yüksek puan akışı birebir çalışmalı.

## Test senaryoları

```txt
/r/demo-slug
/r/demo-slug?platform=google
/r/demo-slug?platform=yemeksepeti
/r/demo-slug?table=12&source=qr
/r/demo-slug?hl=en
```

Fonksiyonel test:

- 1 yıldız -> form
- 3 yıldız -> form
- 4 yıldız -> redirect overlay
- 5 yıldız -> redirect overlay
- KVKK unchecked -> submit disabled/error
- reCAPTCHA submit anında çalışır
- feedback API doğru payload alır

---

# Faz 4 — Homepage Hero Mobil Optimizasyonu

## Amaç

Marketing homepage LCP ve mobile main-thread maliyetini azaltmak.

## Görevler

1. `HomeHero` static + motion olarak böl.
2. LCP alanı server-rendered gelsin.
3. Mobile motion sadeleştirilsin.
4. Count-up/rotator/parallax desktop veya idle sonrası yüklensin.
5. Motion decorative kalmalı; SEO/copy motion'a bağlı olmamalı.
6. Tasarım premium hissi korunmalı.

## Kabul kriterleri

- Desktop görünüm bozulmaz
- Mobilde hero daha hızlı ve sakin açılır
- LCP metni opacity delay ile gizlenmez
- Build geçer

---

# Faz 5 — Admin / Owner Dashboard Data Loading

## Amaç

Panel açılışlarını hızlandırmak ve DB yükünü azaltmak.

## Görevler

1. Admin dashboard KPI'ları ilk render'da bırak.
2. Heavy widgets lazy/Suspense/API ile ayrıştır.
3. Recharts bileşenlerini dynamic import et.
4. `MeasuredChart` pattern'ini koru.
5. Prisma read batch'lerde pgbouncer kuralına uy.
6. Owner-scoped endpoint'lerde public cache kullanma.
7. Polling callsite'larını ölç ve azalt.

## Kabul kriterleri

- Admin dashboard ilk KPI'ları hızlı gösterir
- Manager/superadmin scoping doğru kalır
- Owner dashboard data leak riski oluşmaz
- API çağrı sayısı azalır
- Build/test geçer

---

# Faz 6 — Font / CSS / Bundle Bütçesi

## Amaç

Route bazlı daha hafif public deneyim.

## Görevler

1. JetBrains Mono global gerekliliğini değerlendir.
2. Font weight azalt.
3. CSS'i aşamalı route bazlı ayır.
4. Public bundle'a ağır paket sızıntılarını kapat.
5. Görsel regression kontrolü yap.

## Kabul kriterleri

- Public sayfalarda admin/dashboard CSS/JS azalır
- Tasarım bozulmaz
- Build geçer

---

## 5. Risk Matrisi

| İş | Risk | Etki | Öncelik |
|---|---:|---:|---:|
| Bundle analyzer eklemek | Düşük | Orta | Çok yüksek |
| Root `force-dynamic` kaldırmak | Orta | Çok yüksek | Çok yüksek |
| QueryProvider'ı layout bazlı taşımak | Orta | Yüksek | Çok yüksek |
| QR flow server-first yapmak | Orta-yüksek | Çok yüksek | Çok yüksek |
| HomeHero static/motion ayırmak | Orta | Yüksek | Yüksek |
| Analytics'i public route'a taşımak | Düşük-orta | Orta | Orta |
| Admin dashboard lazy widget | Orta | Yüksek | Yüksek |
| Owner polling azaltmak | Orta | Orta-yüksek | Yüksek |
| CSS route bazlı ayırmak | Orta-yüksek | Orta | Orta |
| Font azaltmak | Düşük | Orta | Orta |
| Base64 menü görsel migration | Yüksek | Orta | Düşük / future |

---

## 6. Claude Code İçin Güncel Uzun Prompt

Aşağıdaki prompt doğrudan Claude Code'a verilebilir.

```text
QRCode reposunda performans optimizasyonu yapmanı istiyorum. İlk adım olarak CLAUDE.md dosyasını tamamen oku ve proje kurallarına uy. Özellikle şu kuralları bozma:

- Auth/role/IDOR scoping: getPanelActorFromRequest, getScopedRestaurantIds, canAccessRestaurant helper'ları korunacak.
- /api/feedback/* ve /api/restaurants/* route'larında scoping bypass edilmeyecek.
- Supabase pooler production'da connection_limit=1 olduğu için server-render request içinde çoklu Prisma read batch'lerde Promise.all yerine mümkün olduğunda prisma.$transaction kullanılacak.
- Owner-scoped dashboard endpoint'lerine public CDN cache eklenmeyecek.
- Recharts kullanımlarında MeasuredChart / pozitif ölçüm pattern'i korunacak; ResponsiveContainer width(-1)/height(-1) warning'i yeniden üretilmeyecek.
- Platform parametreleri ve QR redirect resolver davranışı korunacak: google, yemeksepeti, getir, trendyol_go, tripadvisor, airbnb, booking, yandex.
- externalPlatformsEnabled, googleReviewManagementEnabled, pulseAiEnabled, menuEnabled, menuPublished, aiAnalyticsEnabled gibi entitlement gate'leri bypass edilmeyecek.
- Tasarım dili bozulmayacak; gereksiz ortak Button/design-system abstraction yazılmayacak.
- Build/deploy akışında prisma migrate deploy kuralı korunacak; production/preview için db:push kullanılmayacak.
- Sentry/MetaMask/browser-extension noise ayrımı korunacak.

Amaç:
Yapıyı ve tasarımı bozmadan mobil + masaüstü performansını iyileştir. En kritik öncelik mobil /r/[slug] QR feedback flow, sonra public marketing homepage, sonra owner/admin dashboard.

Önce analiz yap:
1. Şu dosyaları incele:
   - src/app/layout.tsx
   - src/app/[locale]/layout.tsx
   - src/app/[locale]/page.tsx
   - src/components/marketing/HomeHero.tsx
   - src/app/r/[slug]/page.tsx
   - src/app/api/restaurants/route.ts
   - src/app/admin/dashboard/page.tsx
   - src/components/providers/QueryProvider.tsx
   - src/app/globals.css
   - next.config.ts
   - package.json
   - CLAUDE.md

2. Tüm dynamic kullanımlarını çıkar:
   grep -R "export const dynamic = 'force-dynamic'" src/app

3. Tüm React Query callsite'larını çıkar:
   grep -R "useQuery\|useMutation\|useInfiniteQuery" src

4. Public bundle'a ağır paket sızıyor mu kontrol et:
   - recharts
   - firebase
   - @react-pdf/renderer
   - @dnd-kit/*
   - admin-only Radix componentleri
   - dashboard analytics componentleri

5. Bundle analyzer ekle ve ANALYZE=true npm run build ile /tr, /en, /r/[slug], /menu/[slug], /admin/dashboard ve /[locale]/dashboard chunklarını incele.

Uygulama aşamaları:

Aşama 1 — Root layout ve provider ayrıştırması:
- Root layout'taki force-dynamic kullanımını kaldırmanın güvenli olup olmadığını analiz et; güvenliyse kaldır.
- Dinamik olması gereken route segmentlerinde dynamic ayarını segment seviyesinde koru.
- QueryProvider'ı root'tan çıkarıp sadece admin/dashboard gibi gerçekten React Query kullanan layout'lara taşı.
- GA/Yandex gibi public analytics scriptlerini admin/dashboard'da çalışmayacak şekilde marketing/public layout'a taşı.
- Vercel Analytics/Speed Insights kararını bozmadan değerlendir.
- Build çalıştır.

Aşama 2 — /r/[slug] QR flow server-first:
- src/app/r/[slug]/page.tsx server component olsun.
- Interaktif yıldız/form/redirect/reCAPTCHA mantığını ReviewClient.tsx adlı client component'e taşı.
- Restaurant data server'da alınsın ve ilk HTML'de restaurant adı/kart görünsün.
- platform, table, source, hl search parametreleri korunmalı.
- 1-3 yıldız düşük puan formu, 4-5 yıldız platform redirect'i, feedback submit, reCAPTCHA ve QR scan tracking bozulmamalı.
- externalPlatformsEnabled ve defaultRedirectPlatform/fallback resolver zinciri korunmalı.
- QR scan tracking UI'ı bloklamadan mount sonrası veya idle sonrası çalışmalı.
- Build ve manuel smoke test yap.

Aşama 3 — Homepage HomeHero mobil optimizasyonu:
- HomeHero'yu HomeHeroStatic server component ve HomeHeroMotion client component olarak böl.
- İlk ekranda başlık, subtitle, CTA ve temel mockup server-rendered gelsin.
- Cursor/parallax/count-up/rotator/live signal gibi animasyonları desktop-only veya idle sonrası client layer'a taşı.
- Mobilde animasyonları azalt; premium tasarım dili korunacak.
- LCP metni opacity/delay animasyonlarıyla gizlenmeyecek.
- Build ve görsel kontrol yap.

Aşama 4 — Admin/owner dashboard optimizasyonu:
- Admin dashboard'da KPI'ları ilk render'da bırak, ağır widgetları lazy/Suspense/API ile ayır.
- Recharts kullanan below-the-fold chart bileşenlerini dynamic import et.
- MeasuredChart pattern'ini koru.
- Prisma sorgularında Supabase pgbouncer kuralına uy; aynı request içinde batch read gerekiyorsa prisma.$transaction kullan.
- Owner-scoped endpoint'lerde public cache kullanma; staleTime/refetch stratejisi veya private/no-store kararını açık yaz.
- Polling callsite'larını ölç ve gereksiz olanları azalt.
- Build/test yap.

Aşama 5 — Font/CSS/bundle bütçesi:
- JetBrains Mono'nun globalde gerekip gerekmediğini kontrol et; mümkünse admin/dashboard'a taşı veya system monospace kullan.
- Font weight sayısını azalt.
- globals.css'i tek seferde büyük kırmadan aşamalı ayırma planı uygula:
  - base/global
  - marketing
  - admin
  - dashboard
  - qr
  - menu
- Public bundle'a Recharts/Firebase/react-pdf/dnd-kit sızıntısı varsa route-level dynamic import veya import boundary ile düzelt.
- Tasarım regression kontrolü yap.

Çalışma kuralları:
- Büyük refactor'u küçük aşamalarla yap.
- Her aşamadan sonra npm run build çalıştır.
- Mümkünse npm run test çalıştır.
- TypeScript/ESLint ignore ayarlarına güvenip yeni hata üretme.
- Auth, role scoping, entitlement gate ve platform redirect davranışını bozma.
- Kodu değiştirdikten sonra CLAUDE.md'ye kısa bir not ekle: yapılan performans değişiklikleri, dosyalar, riskler ve test sonucu.
- Son raporu şu formatta ver:
  1. Yapılan değişiklikler
  2. Neden yapıldı
  3. Performans etkisi
  4. Güvenlik/scoping etkisi
  5. Test/build sonucu
  6. Kalan riskler ve öneriler
```

---

## 7. Claude Code İçin Kısa Prompt

```text
CLAUDE.md'yi tamamen oku ve proje kurallarına uy. QRCode reposunda yapıyı/tasarımı bozmadan mobil + masaüstü performans optimizasyonu yap.

Öncelik:
1. /r/[slug] QR feedback flow'u mobil için server-first yap.
2. Root layout'taki global force-dynamic, QueryProvider ve analytics/script yükünü public sayfalardan ayır.
3. HomeHero'yu static server + motion client olarak böl; mobilde animasyonları azalt.
4. Admin/owner dashboard'da ağır Prisma aggregate ve Recharts yükünü lazy/cached hale getir.
5. Bundle analyzer ile public bundle'a Recharts/Firebase/react-pdf/dnd-kit sızıntısı var mı kontrol et.
6. Font/CSS yükünü aşamalı azalt.

Kurallar:
- IDOR/scoping helper'ları bozulmayacak.
- Supabase pgbouncer için server request içinde çoklu Prisma read batch'lerde transaction pattern'i korunacak.
- Owner-scoped endpoint'lere public cache eklenmeyecek.
- Platform parametreleri ve externalPlatformsEnabled/defaultRedirectPlatform davranışı korunacak.
- Entitlement gate'leri bypass edilmeyecek.
- Recharts MeasuredChart pattern'i korunacak.
- Tasarım dili bozulmayacak; gereksiz ortak Button abstraction yazılmayacak.
- Her aşamada build/test çalıştır.
- Sonunda yapılanları, performans etkisini, riskleri ve test sonucunu raporla.
```

---

## 8. Sonuç

Bu projede en doğru performans stratejisi minify veya rastgele paket silmek değildir. Asıl kazanım **route segment ayrıştırması** ve **server/client sorumluluklarının doğru bölünmesi** ile gelecektir.

Beklenen en yüksek kazanım sırası:

1. QR flow server-first
2. Root `force-dynamic` ve global QueryProvider ayrıştırması
3. Homepage hero mobil sadeleştirme
4. Admin/dashboard lazy data loading
5. Bundle/font/CSS bütçesini azaltma
6. Public menu görsel payload ölçümü ve gelecekte Storage/Blob migration planı

Bu plan uygulandığında:

- Mobil QR açılışı hızlanır
- Homepage LCP/INP iyileşir
- Public site daha cache-friendly olur
- Admin/dashboard ilk açılışları daha hızlı hissedilir
- Vercel CPU ve client JS maliyeti azalır
- Projenin `CLAUDE.md` güvenlik ve mimari kararları korunur
