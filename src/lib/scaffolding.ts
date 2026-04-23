// ─────────────────────────────────────────────────────────────────────
// Scaffolding types & helpers for features that are UI-ready but not yet
// wired to the backend. Each API route listed below lives as a 501 stub
// under `src/app/api/…/route.ts` — search the repo for `SCAFFOLDED:` to
// find them. Replace the stub body with real Prisma queries when ready.
//
// Prisma schema additions expected (add to `prisma/schema.prisma` and
// run `prisma db push --accept-data-loss` — the project avoids
// migration files per CLAUDE.md §7):
//
// model FeedbackReply {
//   id           String   @id @default(cuid())
//   feedbackId   String   @map("feedback_id")
//   feedback     Feedback @relation(fields: [feedbackId], references: [id], onDelete: Cascade)
//   authorUserId String   @map("author_user_id")
//   body         String   @db.Text
//   channel      String   @default("internal") // internal | google | email
//   status       String   @default("sent")     // draft | sent | failed
//   createdAt    DateTime @default(now())      @map("created_at")
//   @@index([feedbackId, createdAt])
//   @@map("feedback_replies")
// }
//
// model FeedbackFlag {
//   id          String   @id @default(cuid())
//   feedbackId  String   @unique @map("feedback_id")
//   reason      String?
//   flaggedBy   String   @map("flagged_by_user_id")
//   createdAt   DateTime @default(now()) @map("created_at")
//   @@map("feedback_flags")
// }
//
// model FeedbackAssignment {
//   id           String   @id @default(cuid())
//   feedbackId   String   @unique @map("feedback_id")
//   assigneeId   String   @map("assignee_user_id")
//   assignedById String   @map("assigned_by_user_id")
//   createdAt    DateTime @default(now()) @map("created_at")
//   @@map("feedback_assignments")
// }
//
// model Campaign {
//   id             String   @id @default(cuid())
//   userId         String   @map("user_id")
//   restaurantId   String   @map("restaurant_id")
//   name           String
//   placement      String   // table | receipt | door | pack
//   count          Int      @default(1)
//   template       String   @default("lime") // lime | white | dark | minimal
//   color          String   @default("#C6F24E")
//   status         String   @default("draft") // draft | live | archived
//   createdAt      DateTime @default(now()) @map("created_at")
//   @@index([userId, restaurantId])
//   @@map("campaigns")
// }
//
// model TeamMember {
//   id         String   @id @default(cuid())
//   ownerId    String   @map("owner_user_id")
//   email      String
//   name       String?
//   role       String   @default("manager")  // owner | manager | staff
//   locations  Json?    // string[]
//   status     String   @default("invited")  // invited | active | revoked
//   createdAt  DateTime @default(now()) @map("created_at")
//   @@unique([ownerId, email])
//   @@map("team_members")
// }
//
// model AutomationRule {
//   id           String   @id @default(cuid())
//   userId       String   @map("user_id")
//   restaurantId String?  @map("restaurant_id")
//   trigger      String   // rating_lte | rating_gte | keyword | platform
//   threshold    String?  // "3" or "google" depending on trigger
//   action       String   // assign | email | webhook
//   target       String?  // email address / webhook URL / user id
//   isActive     Boolean  @default(true) @map("is_active")
//   createdAt    DateTime @default(now()) @map("created_at")
//   @@index([userId, isActive])
//   @@map("automation_rules")
// }
//
// model NotificationPreference {
//   userId           String  @id @map("user_id")
//   lowRatingEmail   Boolean @default(true)  @map("low_rating_email")
//   dailyDigestEmail Boolean @default(false) @map("daily_digest_email")
//   weeklyReport     Boolean @default(true)  @map("weekly_report")
//   slackWebhook     String? @map("slack_webhook")
//   @@map("notification_preferences")
// }
//
// model ApiKey {
//   id         String   @id @default(cuid())
//   userId     String   @map("user_id")
//   name       String
//   tokenHash  String   @map("token_hash")
//   scopes     Json     // string[]
//   lastUsedAt DateTime? @map("last_used_at")
//   revokedAt  DateTime? @map("revoked_at")
//   createdAt  DateTime @default(now()) @map("created_at")
//   @@index([userId])
//   @@map("api_keys")
// }
//
// model GoogleIntegration {
//   id            String   @id @default(cuid())
//   userId        String   @unique @map("user_id")
//   accessToken   String   @map("access_token")
//   refreshToken  String   @map("refresh_token")
//   expiresAt     DateTime @map("expires_at")
//   accountId     String?  @map("account_id")
//   locationsJson Json?    @map("locations_json")
//   createdAt     DateTime @default(now()) @map("created_at")
//   @@map("google_integrations")
// }
//
// model BrandSettings {
//   restaurantId String  @id @map("restaurant_id")
//   logoUrl      String? @map("logo_url")
//   accentColor  String? @map("accent_color")
//   accentFont   String? @map("accent_font")
//   updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")
//   @@map("brand_settings")
// }
// ─────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

/**
 * Uniform 501 response for scaffolded endpoints. Frontend callers can
 * handle this shape gracefully and fall back to static UI.
 */
export function scaffoldedResponse(
  endpoint: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      error: 'not_implemented',
      endpoint,
      message: `Scaffolded endpoint — wire up Prisma body in ${endpoint}`,
      ...(extra ?? {}),
    },
    { status: 501 },
  );
}

// ── Shared request/response interfaces ──────────────────────────────

export interface ReplyInput {
  body: string;
  channel?: 'internal' | 'email';
}

export interface CampaignInput {
  restaurantId: string;
  name: string;
  placement: 'table' | 'receipt' | 'door' | 'pack';
  count?: number;
  template?: 'lime' | 'white' | 'dark' | 'minimal';
  color?: string;
}

export interface TeamInviteInput {
  email: string;
  name?: string;
  role?: 'owner' | 'manager' | 'staff';
  locations?: string[];
}

export interface AutomationInput {
  restaurantId?: string | null;
  trigger: 'rating_lte' | 'rating_gte' | 'keyword' | 'platform';
  threshold?: string;
  action: 'assign' | 'email' | 'webhook';
  target?: string;
  isActive?: boolean;
}

export interface NotificationPreferences {
  lowRatingEmail: boolean;
  dailyDigestEmail: boolean;
  weeklyReport: boolean;
  slackWebhook?: string | null;
}

export interface ApiKeyInput {
  name: string;
  scopes: string[];
}

export interface BrandInput {
  restaurantId: string;
  logoUrl?: string;
  accentColor?: string;
  accentFont?: string;
}

/**
 * Deterministic frontend AI reply generator. When a real LLM backend is
 * connected via `/api/feedback/:id/suggest-reply`, this can be replaced
 * with the server response. Until then, the UI calls this helper to
 * pre-populate the reply box.
 */
export function buildReplyTemplate(opts: {
  name: string | null;
  rating: number;
  locale: 'tr' | 'en';
}): string {
  const { name, rating, locale } = opts;
  const firstName = (name ?? (locale === 'tr' ? 'Değerli müşterimiz' : 'Valued customer'))
    .split(' ')[0];
  if (locale === 'tr') {
    return rating >= 4
      ? `Merhaba ${firstName}, değerli geri bildiriminiz için çok teşekkür ederiz. Yorumunuzu tüm ekibimize ileteceğiz — yeniden ağırlamak için sabırsızlanıyoruz.`
      : `Merhaba ${firstName}, yaşadıklarınız için özür dileriz. Geri bildiriminiz doğrudan işletme yönetimine iletilecek; sizi tekrar ağırlamak ve bu deneyimi düzeltmek için fırsat verirseniz memnun oluruz.`;
  }
  return rating >= 4
    ? `Hi ${firstName}, thank you for taking the time to share your experience. We will pass this on to the team and look forward to seeing you again.`
    : `Hi ${firstName}, we're sorry your experience fell short — we're forwarding your note to management and would love a chance to make it right on your next visit.`;
}
