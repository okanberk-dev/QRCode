import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { rateLimit } from '@/lib/rate-limit';
import {
  sendCustomerCampaign,
  type CustomerCampaignRecipient,
} from '@/lib/email-customer-campaign';

// §38.48 Wave 2 — Owner-scoped Customers bulk action endpoint.
// Plan: ~/.claude/plans/nerin-ile-devam-et-sprightly-kahn.md Phase E.
//
// 4 action:
//   - archive       → CustomerArchive upsert (soft-delete, ?showArchived=1 ile geri)
//   - unarchive     → CustomerArchive delete
//   - set_segment   → CustomerSegmentOverride upsert (manualSegment 5 enum)
//   - send_campaign → CustomerEmailCampaign create + sendCustomerCampaign batch
//
// Auth: getPanelActorFromRequest + getScopedRestaurantIds (owner-only,
//       superadmin null scope 403; admin'in kendi /api/admin/customers/...
//       yolu var, bu owner endpoint'i).
// IDOR: keys parse → restaurantId whitelist (sahibi olmayan müşteriye operation
//       silently skip; processed counter'da düşülür).
// Rate limit: 10 req/dk/actor (Upstash, CLAUDE.md §14.2).
// Zod: BodySchema strict + ids max 50 (CLAUDE.md §28.4 paterni).
//
// Response: { processed, skipped, action, campaignId? }
//
// maxDuration: 60 (send_campaign batch worst-case 50 × 600ms = 30sn safe).

export const maxDuration = 60;

const SEGMENT_VALUES = ['vip', 'loyal', 'new', 'risk', 'churned'] as const;

const BodySchema = z
  .object({
    keys: z.array(z.string().min(3).max(256)).min(1).max(50),
    action: z.enum(['archive', 'unarchive', 'set_segment', 'send_campaign']),
    payload: z
      .object({
        // set_segment için
        segment: z.enum(SEGMENT_VALUES).optional(),
        // send_campaign için
        subject: z.string().min(1).max(150).optional(),
        body: z.string().min(1).max(10_000).optional(),
        locale: z.enum(['tr', 'en']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

type BodyInput = z.infer<typeof BodySchema>;

interface ParsedKey {
  restaurantId: string;
  contactKey: string;
  raw: string;
}

function parseKeys(rawKeys: string[]): ParsedKey[] {
  const parsed: ParsedKey[] = [];
  for (const raw of rawKeys) {
    const idx = raw.indexOf('|');
    if (idx <= 0) continue;
    const restaurantId = raw.slice(0, idx);
    const contactKey = raw.slice(idx + 1).trim();
    if (!restaurantId || !contactKey) continue;
    parsed.push({ restaurantId, contactKey, raw });
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  // Owner-only — superadmin (null scope) admin endpoint kullanır.
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  // Rate limit (CLAUDE.md §14.2 + §28.4 paterni).
  const limit = await rateLimit(`customers-bulk:user:${actor.id}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar dene.' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<BodyInput>(BodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // Owner whitelist filter (IDOR).
  const parsedKeys = parseKeys(data.keys).filter((k) => scopedIds.includes(k.restaurantId));
  if (parsedKeys.length === 0) {
    // §38.78 — Eski davranış: silent 200 + processed:0 + skipped:N (false-
    // success UX). Yeni: 400 no_valid_keys. data.keys.length > 0 zaten Zod
    // min(1) ile garanti; bu yüzden empty filter sebebi:
    //   (a) malformed key format ("abc|def" parse fail) — operator data drift
    //   (b) whitelist bypass denemesi (başkasının restaurantId|contactKey)
    // Her iki durumda da 200 ok yanıltıcı; 400 explicit sinyal verir.
    // Frontend (CustomersBulkBar) `res.ok` check'i mevcut error notice yolu
    // ile kullanıcıya görünür hale getirir.
    return NextResponse.json(
      { error: 'no_valid_keys', message: 'Geçerli müşteri seçilmedi' },
      { status: 400 },
    );
  }

  try {
    if (data.action === 'archive') {
      // Upsert per (restaurantId, contactKey). Promise.allSettled per-row
      // isolation; unique constraint kazara double-archive olduğunda update
      // path'e düşer (idempotent).
      const results = await Promise.allSettled(
        parsedKeys.map((k) =>
          prisma.customerArchive.upsert({
            where: {
              restaurantId_contactKey: {
                restaurantId: k.restaurantId,
                contactKey: k.contactKey,
              },
            },
            create: {
              restaurantId: k.restaurantId,
              contactKey: k.contactKey,
              archivedById: actor.id,
            },
            update: {
              archivedAt: new Date(),
              archivedById: actor.id,
            },
          }),
        ),
      );
      const processed = results.filter((r) => r.status === 'fulfilled').length;
      const skipped = data.keys.length - processed;
      return NextResponse.json(
        { processed, skipped, action: 'archive' },
        { status: 200 },
      );
    }

    if (data.action === 'unarchive') {
      const result = await prisma.customerArchive.deleteMany({
        where: {
          OR: parsedKeys.map((k) => ({
            restaurantId: k.restaurantId,
            contactKey: k.contactKey,
          })),
        },
      });
      return NextResponse.json(
        {
          processed: result.count,
          skipped: data.keys.length - result.count,
          action: 'unarchive',
        },
        { status: 200 },
      );
    }

    if (data.action === 'set_segment') {
      const segment = data.payload?.segment;
      if (!segment) {
        return NextResponse.json(
          { error: 'set_segment için payload.segment zorunlu' },
          { status: 400 },
        );
      }
      const results = await Promise.allSettled(
        parsedKeys.map((k) =>
          prisma.customerSegmentOverride.upsert({
            where: {
              restaurantId_contactKey: {
                restaurantId: k.restaurantId,
                contactKey: k.contactKey,
              },
            },
            create: {
              restaurantId: k.restaurantId,
              contactKey: k.contactKey,
              manualSegment: segment,
              setById: actor.id,
            },
            update: {
              manualSegment: segment,
              setById: actor.id,
              setAt: new Date(),
            },
          }),
        ),
      );
      const processed = results.filter((r) => r.status === 'fulfilled').length;
      const skipped = data.keys.length - processed;
      return NextResponse.json(
        { processed, skipped, action: 'set_segment' },
        { status: 200 },
      );
    }

    if (data.action === 'send_campaign') {
      const subject = data.payload?.subject?.trim();
      const messageBody = data.payload?.body?.trim();
      const locale = data.payload?.locale ?? 'tr';
      if (!subject || !messageBody) {
        return NextResponse.json(
          { error: 'send_campaign için payload.subject ve body zorunlu' },
          { status: 400 },
        );
      }

      // Single restaurant scope kuralı: campaign belirli bir restaurantId'ye
      // bağlı (FK). Eğer keys çoklu restaurantId içeriyorsa ilkini al + filtrele.
      // Owner panel UI checkbox'lar tek restaurant'ta seçildiğinden tipik tek
      // restaurantId; multi-restaurant filtre nadiren karışık seçim yaratır.
      const primaryRestaurantId = parsedKeys[0].restaurantId;
      const sameRestaurantKeys = parsedKeys.filter(
        (k) => k.restaurantId === primaryRestaurantId,
      );

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: primaryRestaurantId },
        select: { name: true },
      });
      if (!restaurant) {
        return NextResponse.json({ error: 'Restoran bulunamadı' }, { status: 404 });
      }

      // Recipients: feedback rows içinde son email + KVKK marketing consent.
      // Per-key son feedback'in `email` + `hasMarketingConsent` alanları (LIST
      // endpoint paterni reuse — ARRAY_AGG değil basit query, çünkü 50 kişi
      // sınırı + sadece email dolu olanlar).
      const recipients: CustomerCampaignRecipient[] = [];
      for (const k of sameRestaurantKeys) {
        // Find the latest feedback for this contact_key with valid email.
        const fb = await prisma.feedback.findFirst({
          where: {
            restaurantId: k.restaurantId,
            email: { not: null },
            // Match contact key — email lower-case OR phone exact.
            OR: [
              { email: { equals: k.contactKey, mode: 'insensitive' } },
              { phone: k.contactKey },
            ],
            hasKvkkConsent: true,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            email: true,
            hasMarketingConsent: true,
          },
        });
        if (!fb || !fb.email) continue;
        recipients.push({
          key: `${k.restaurantId}|${k.contactKey}`,
          restaurantId: k.restaurantId,
          contactKey: k.contactKey,
          email: fb.email,
          hasMarketingConsent: Boolean(fb.hasMarketingConsent),
        });
      }

      if (recipients.length === 0) {
        return NextResponse.json(
          {
            processed: 0,
            skipped: data.keys.length,
            action: 'send_campaign',
            error: 'Geçerli e-posta adresi bulunamadı',
          },
          { status: 200 },
        );
      }

      // Create campaign row first (audit trail).
      const campaign = await prisma.customerEmailCampaign.create({
        data: {
          restaurantId: primaryRestaurantId,
          subject,
          body: messageBody,
          recipientCount: recipients.length,
          status: 'sending',
          createdById: actor.id,
        },
      });

      // Send batch (helper handles KVKK gate + Resend throttle + log).
      const result = await sendCustomerCampaign({
        campaignId: campaign.id,
        restaurantId: primaryRestaurantId,
        restaurantName: restaurant.name,
        subject,
        body: messageBody,
        recipients,
        locale,
      });

      return NextResponse.json(
        {
          processed: result.sentCount,
          failed: result.failedCount,
          skipped: result.skippedCount + (data.keys.length - sameRestaurantKeys.length),
          action: 'send_campaign',
          campaignId: campaign.id,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[OWNER_CUSTOMERS_BULK]', { actorId: actor.id, action: data.action, error });
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
