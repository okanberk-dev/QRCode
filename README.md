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
When a Superadmin creates a new `Manager` from the Admin Panel (`src/app/admin/users/page.tsx`), the API allows for the simultaneous creation of a new `Restaurant` (passing `isNewRestaurant` and `restaurantData` containing name, slug, address, phone). This executes sequentially and binds the new `restaurantId` to the `AdminUser`. Do NOT separate this logic without implementing Prisma Transactions (which is currently handled async block sequentially).

### ⚠️ IDOR & Prisma Scoping Rules
When fetching records in `/api/feedback/*` and `/api/restaurants/*`:
*   Always extract `admin` token via `getAdminFromRequest(req)`.
*   Ensure that if `admin.role === 'restaurant_owner'`, queries are STRICTLY scoped (`where: { restaurantId: { in: userRestIds } }`) to prevent IDOR (Insecure Direct Object Reference) data leakage between different SaaS clients.

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
This project deploys on Vercel. 
If modifying components used in SSR (e.g. `PricingFaq.tsx`), ensure strict hydration compliance. Do not use dynamic browser objects inside Server Components.

```bash
npm install
npm run build
npm run start
```
