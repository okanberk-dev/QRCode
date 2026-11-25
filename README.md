# Buaze SaaS Platform 🚀

This repository contains the source code for the **Buaze QR Feedback & Restaurant Reputation Management SaaS** platform. 

> **🤖 Note to Future AI Agents:** 
> This repository is highly customized. Please read sections related to *Authentication*, *Database*, and *API Routing* carefully before attempting architectural changes. The platform balances a robust backend securely serving multiple tenants (restaurants) with a premium Marketing/UX facade.

---

## 🏗 System Architecture & Tech Stack

*   **Framework:** Next.js (App Router `src/app`)
*   **Language:** TypeScript
*   **Database ORM:** Prisma
*   **Database:** PostgreSQL 17 on the Coolify server (`buaze-postgres`, internal network only, since 2026-11-24). `DATABASE_URL` and `DIRECT_URL` both point at it. Small public files (logo, favicon, share images) live in the `stored_files` table and are served at `/files/...`; the owner dashboard live feed is Server-Sent Events from the app (`/api/realtime/activity`). See "Veritabanı ve yedekler" below.
*   **Styling:** Tailwind CSS + Lucide React (Icons)
*   **Charts:** Recharts (Interactive visualization)
*   **Authentication:** Custom JWT mechanism using `jose`. JWTs are stored in `httpOnly` secure cookies.
*   **Internationalization (i18n):** Route-based dynamic matching (`src/app/[locale]/...`) governed by `src/lib/translations.ts`.

---

## 🔐 Authentication & Roles (CRITICAL)

The system bypasses standard NextAuth/Auth.js in favor of an optimized, edge-compatible JWT cookie strategy (`src/lib/auth.ts`). 
There are multiple identity types:
1.  **Superadmin:** Global access (from `AdminUser` model).
2.  **Manager:** Local staff/admin for a specific operation.
3.  **Restaurant Owner (Users):** The SaaS clients (from `User` model, role: `restaurant_owner`).

### ⚡ Simultaneous Entity Creation
When a Superadmin creates a new `Manager` from the Admin Panel (`src/app/admin/users/page.tsx`), the API allows for the simultaneous creation of a new `Restaurant` (passing `isNewRestaurant` and `restaurantData` containing name, slug, address, phone). This executes sequentially and binds the new `restaurantId` to the `AdminUser`.

### 🛡️ Security & UX Enhancements
- **Double Password Verification:** The registration form (`RegisterForm.tsx`) implements a "Confirm Password" logic to prevent user entry errors.
- **Admin Stealth:** The Admin Panel entry points are removed from the public Marketing Footer for better security posture and cleaner client-facing UX.
- **IDOR Protection:** Queries in `/api/feedback/*` and `/api/restaurants/*` are strictly scoped to the `admin.restaurantId` or user's authorized IDs.

### 📊 Advanced Analytics Dashboard
The platform features a data-rich administration suite (`src/app/admin/dashboard/page.tsx`):
- **Interaction Trends:** Dual-axis area/line charts showing QR scan counts vs. Average Rating development.
- **Daily Heatmap:** Bar charts identifying peak customer engagement days.
- **Sentiment Analysis:** Word cloud based on actual customer feedback comments.
- **Dynamic Scoping:** Superadmins see global stats; Managers/Owners see strictly scoped data for their own establishments.

---

## 🌎 Environment Variables

To deploy or run the build, the following variables are strictly mapped inside the environment. *Note: `JWT_SECRET` has a hardcoded default fallback in `src/lib/auth.ts` to prevent crashing on Vercel preview environments, but must be set for real production.*

```env
# Database (Coolify PostgreSQL, internal network)
DATABASE_URL="postgresql://postgres:...@<db-uuid>:5432/buaze?connection_limit=10&pool_timeout=20"
DIRECT_URL="postgresql://postgres:...@<db-uuid>:5432/buaze"

# Marketing & Public Assets
NEXT_PUBLIC_APP_URL="https://buaze.com"
NEXT_PUBLIC_RESTAURANT_NAME="Buaze"
NEXT_PUBLIC_GOOGLE_REVIEW_URL="..."

# Nodemailer / SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587 # Uses TLS bypass (rejectUnauthorized: false) in route.ts
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="Buaze <hello@buaze.com>"
NOTIFICATION_EMAIL="..."

# Authentication Secret
JWT_SECRET="your_secure_base64_secret"

# Admin Bootstrap 
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="..."
```

---

## ⭐ Google reviews widget (Google Business Profile)

Each workspace can connect its own Google Business Profile with OAuth and show
its Google reviews in the embed widget `/embed/{slug}/google`. Full rules:
CLAUDE.md §53.

```env
GOOGLE_CLIENT_ID="899672574996-....apps.googleusercontent.com"  # hizlakirala project
GOOGLE_CLIENT_SECRET="..."          # runtime-only secret
GOOGLE_REDIRECT_URI="https://www.buaze.com/api/integrations/google/callback"
ENCRYPTION_KEY="..."                # 32-byte base64; tokens are stored AES-256-GCM
GBP_ALLOWED_TENANTS="owner@example.com"  # owner e-mail, user id or business slug; "*" = everyone; empty = nobody
# GBP_GLOBAL_RPM=120                # shared per-minute Google budget (max 300)
```

- **Access lock**: Google's current approval covers one company, so only
  workspaces in `GBP_ALLOWED_TENANTS` may connect. Everyone else sees "coming
  soon"; connect, callback and every Google request refuse them on the server.
- **Tokens**: the refresh token is encrypted per workspace together with the
  OAuth client id it was issued for. The access token is refreshed on the
  server. If `GOOGLE_CLIENT_ID` changes (moving to another Google Cloud
  project) or Google answers `invalid_grant`, the connection shows
  "reconnect" in the panel and the last cached reviews stay visible.
- **Refresh**: the `google-reviews-refresh` job (Coolify, every 15 min) takes
  the businesses whose turn has come; each refreshes every 6–12 hours and syncs
  every review page (`nextPageToken`, up to 2,000) into `google_reviews`.
  429/403 back off exponentially (15 min doubling, max 12 h) and stop the run;
  a global per-minute budget covers all tenants. The same job resumes bulk
  reply jobs that a request left unfinished.
- **Reply inbox** (`/dashboard/google-reviews`, CLAUDE.md §54): reads only the
  stored reviews; replies (single or a human-approved bulk queue for 4–5★)
  are sent from the server within Google's update limits.
- **Disconnect**: revokes the token at Google and deletes the cached and
  stored reviews, reply jobs and AI reply drafts of that workspace.
- **Admin**: `GET /api/admin/google-business/status` (which project the client
  id belongs to, open tenants, refresh queue, quota errors) and
  `POST /api/admin/restaurants/{id}/google-reviews` with `{"action":"locate"}`
  (finds the account/location; one location is selected automatically) or
  `{"action":"refresh"}`.
- No `AggregateRating` / `Review` JSON-LD: Google's review-snippet rules forbid
  marking up reviews collected from another site.

---

## 🗂 Key Directory Structure

```text
src/
├── app/
│   ├── [locale]/           # Public Marketing & Client Auth Pages (tr/en routes)
│   ├── admin/              # Superadmin / Manager Internal Dashboard
│   ├── api/                # Next.js Serverless Route Handlers
│   ├── r/                  # Public QR Code redirection endpoints
│   ├── robots.ts           # Configured to strictly allow modern LLMs (GPTBot, Anthropic)
│   └── sitemap.ts          # Automated sitemap with URL localization
├── components/
│   ├── admin/              # Components strict to SaaS panel
│   ├── auth/               # LoginForm, RegisterForm matching marketing UI
│   └── marketing/          # Premium landing page UI (BuazeLogo.tsx, Hero, etc.)
└── lib/
    ├── auth.ts             # JWT decoding/encoding & middleware simulations
    ├── prisma.ts           # Singleton Prisma Client
    ├── translations.ts     # Global dictionary for dynamic routes
    └── email.ts            # SMTP abstractions
```

---

## 🎨 UI/UX Code Name: "Buaze v3"
The main layout relies heavily on a custom color palette defined mostly inline or via standard Tailwind globals:
*   **Primary Accent:** `#FDBF1D` (Golden Yellow).
*   **Dark Core:** `#111827` (Deep Gray/Black), used for premium aesthetics.
*   **Marketing Focus:** Modern glassmorphism, animated mockups without relying on standalone generic PNGs, inline SVGs (`BuazeLogo.tsx`) to avoid asset permission errors. 
*   **Legal Compliance:** Strictly includes `/tr/kvkk`, `/tr/gizlilik`, `/tr/acik-riza`, and `/tr/ticari-ileti` for Turkish laws.

---

## 🔧 Build & Deploy
This project deploys on Coolify (Dockerfile build, see `docs/SELF_HOST.md`) with Prisma migration-based database changes.

*   **Database Migrations:** The `package.json` build script runs `node scripts/validate-env.js && prisma migrate deploy && next build`. Schema changes must be committed under `prisma/migrations/`. Use `npm run db:push` only for local scratch databases where you intentionally do not need migration history.
*   **Auto Admin Bootstrap:** Upon successful deployment, logging into `/admin` with the configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` (default: `admin`/`123456+`) will automatically bootstrap your superadmin credentials to the newly created database tables.
*   **SSR Compliance:** Do not use dynamic browser objects inside Server Components.

```bash
# Local execution
npm install
npm run dev

# Build for production
npm run build
npm run start
```

---

## 🗄 Veritabanı ve yedekler (2026-11-24'ten beri)

Veritabanı Supabase'ten (ABD, Virginia) uygulamayla aynı Coolify sunucusuna (Frankfurt) taşındı. Ayrıntılar: CLAUDE.md §55.

| Parça | Nerede |
|---|---|
| PostgreSQL 17 | Coolify → Buaze projesi → `buaze-postgres` (`wgnqbhlzm6nbftv3qqkvzxv3`), yalnız iç ağ, kalıcı volume |
| Dosyalar (logo, favicon, paylaşım görselleri) | `stored_files` tablosu → `/files/...` (her veritabanı yedeğinde var) |
| Canlı akış | `/api/realtime/activity` (SSE), `src/lib/live-events.ts` |
| Taşıma ve kontrol betikleri | `scripts/db-migration/` (Coolify zamanlanmış görev olarak uygulama konteynerinde çalışır; bağlantı adreslerini yazdırmaz) |
| Taşıma dökümleri, dosya kopyaları, raporlar | Uygulama volume'ü `/app/ops-data` |

### Otomatik yedek

- Coolify → `buaze-postgres` → Backups: her gün 03:30 UTC `pg_dump` (custom format), sunucuda 14 gün / 14 kopya tutulur.
- **Sunucu dışı kopya (yapılacak, hesap gerekir):** Cloudflare R2 (10 GB ücretsiz) ya da Backblaze B2 (10 GB ücretsiz)
  hesabı açın, bir bucket ve yalnız o bucket'a yazabilen bir API anahtarı oluşturun. Coolify → Storages (S3) → Add:
  endpoint (R2: `https://<account-id>.r2.cloudflarestorage.com`, B2: `https://s3.<region>.backblazeb2.com`), bucket, region
  (`auto` / B2 bölgesi), anahtarlar → Validate. Sonra `buaze-postgres` → Backups → yedek ayarı: "Save to S3" açık, bu
  storage, S3 saklama 14 gün.

### Yedekten geri yükleme

1. Önce ayrı bir test veritabanına yükleyip kontrol edin: Coolify'da geçici bir PostgreSQL 17 oluşturun. Yeni sunucuda
   önce iki rolü oluşturun (eski Supabase politikaları bunları anar, yoksa import hata verir):
   `psql <test-db-adresi> -c 'create role anon nologin' -c 'create role authenticated nologin'`. Sonra Import → Server
   path = yedek dosyası (Backups listesindeki dosya yolu) → geçici görevde
   `T=<test-db-adresi> bash scripts/db-migration/verify.sh T new` ile ana veritabanıyla karşılaştırın (yedekten sonra
   yazılan tablolar farklı çıkabilir). İş bitince geçici veritabanını silin. Not: Coolify yeni veritabanını libc
   sıralamasıyla kurar; canlı `buaze` veritabanı ICU `en-US`'tir (Supabase ile aynı). Sıfırdan kurulumda
   `scripts/db-migration/restore.sh` kullanın, o ICU ile kurar.
2. Gerçekten geri dönmek gerekirse: bakım modunu açın (aşağıda), `buaze-postgres` → Import → aynı yedek, "replace existing".
   Sonra `select datlocprovider, datlocale from pg_database where datname = 'buaze'` → `i | en-US` olmalı (değilse
   veritabanı libc ile yeniden kurulmuştur: yedeği `restore.sh` ile yükleyin). Bakım modunu kapatın.

### Bakım modu

`MAINTENANCE_MODE=1` (Build + Runtime) ile yeniden deploy: her istek (sayfalar, API'ler, konteyner içi cron çağrıları,
webhook'lar) 503 bakım sayfasına gider; yalnız `/api/health` açık kalır, böylece veritabanına hiçbir şey yazılmaz. Değişkeni
silip yeniden deploy edince kapanır. Ayar derlemeye gömülür; açmak bir deploy sürer (~4 dk). Daha hızlı kapatmak için
değişkeni silip Coolify → Rollback ile bakım öncesi imajı seçin (~1 dk, yeniden derleme yok).

### Supabase'e geri dönüş (en geç 2026-12-08)

Supabase projesi taşıma anındaki (2026-11-24) hâliyle, dokunulmadan bekler. Geri dönmek gerekirse:

1. Bakım modunu açın (yukarıda) ve deploy'un bitmesini bekleyin.
2. Taşımadan sonra gelen verileri Supabase'e kopyalayın: Coolify → buaze → Scheduled Tasks → geçici görev
   `ALLOW_ROLLBACK=yes bash scripts/db-migration/rollback-copy.sh` → çalıştırın. Görev yeni veritabanını döker, Supabase'in
   `public` şemasındaki tabloları bu dökümle yeniden kurar ve her tabloyu karşılaştırır; sonunda `ROLLBACK COPY OK` yazmalı.
3. Coolify → buaze → Environment: `DATABASE_URL` ve `DIRECT_URL`'yi Supabase değerlerine geri alın (Supabase Dashboard →
   Connect: işlem havuzu `...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20`, oturum
   havuzu `...:5432/postgres`). `MAINTENANCE_MODE`'u silin, deploy edin.
4. `https://www.buaze.com/api/health?db=1` → `port` 5432 (kod Supabase işlem havuzu adresini oturum havuzuna çevirir),
   panelde giriş ve yorum listesi çalışmalı.

Dosyalar ve canlı akış Supabase'e bağlı değildir; geri dönüşte de çalışırlar.

### Temizlik (2026-12-08'den sonra, geri dönüş süresi bitince)

- `@supabase/supabase-js` paketini kaldırın (kod artık kullanmıyor).
- Coolify env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_STORAGE_BUCKET`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ve `NEW_DATABASE_URL` silinebilir.
- `/app/ops-data/rollback/supabase-direct-url` dosyasını silin. Supabase projesini silmeden önce son bir yedeğini alın.

## ⚡ Redis (Coolify, 2026-11-25'ten beri)

- Coolify → Buaze → `buaze-redis` (`redis:7.2-alpine`, iç ağ, kalıcı volume, parola Coolify'da). Uygulama `REDIS_URL` (yalnız runtime) ile bağlanır.
- Hız sınırı sayaçları ve ROI içgörü önbelleği burada. Redis kapalıysa site çalışmaya devam eder (sayaçlar o süre işlem belleğinde tutulur).
- Upstash'e geri dönüş (2026-12-09'a kadar): Coolify'da `REDIS_URL`'i sil, uygulamayı yeniden başlat; `KV_REST_API_*` hâlâ tanımlı.
- Panel hız ölçümü: Coolify'da geçici zamanlanmış görev olarak `node scripts/perf/page-load.mjs --base https://www.buaze.com --label <ad>` (CLAUDE.md §56).

