# Buaze SaaS Platform 🚀

This repository contains the source code for the **Buaze QR Feedback & Restaurant Reputation Management SaaS** platform. 

> **🤖 Note to Future AI Agents:** 
> This repository is highly customized. Please read sections related to *Authentication*, *Database*, and *API Routing* carefully before attempting architectural changes. The platform balances a robust backend securely serving multiple tenants (restaurants) with a premium Marketing/UX facade.

---

## 🏗 System Architecture & Tech Stack

*   **Framework:** Next.js (App Router `src/app`)
*   **Language:** TypeScript
*   **Database ORM:** Prisma
*   **Database Provider:** Supabase (PostgreSQL) - Uses `DATABASE_URL` (Port 6543 pgbouncer for connections) & `DIRECT_URL` (Port 5432 for migrations).
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
# Supabase DB
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."

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
  the businesses whose turn has come; each refreshes every 6–12 hours. 429/403
  back off exponentially (15 min doubling, max 12 h) and stop the run; a
  global per-minute budget covers all tenants.
- **Disconnect**: revokes the token at Google and deletes the cached reviews
  and AI reply drafts of that workspace.
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
This project deploys on Vercel with Prisma migration-based database changes.

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
