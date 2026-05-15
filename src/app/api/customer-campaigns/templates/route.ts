// Stage 119 §38.199 — Owner-side customer campaign templates.
// GET list: returns global Buaze catalog (restaurantId=null, isPublished=true)
// + owner's own saved templates (restaurantId in scopedIds). Sector + locale
// filters apply to BOTH branches. Result: { global, own } so picker UI can
// section them.
// POST: owner saves a new template (can be fork of a global, or fresh). IDOR
// + master flag gate identical to CustomerEmailCampaign create.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, getScopedRestaurantIds } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { runCampaignTemplateSeed } from '@/lib/customer-campaign-templates/seed-runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Module-level idempotency flag — Stage 119 §38.199 + §38.200 closure log.
 *
 * Vercel serverless cold-start başına bir kez `customerCampaignTemplate`
 * tablosunda global (`restaurantId: null`, `isPublished: true`) satır var
 * mı kontrol edilir; yoksa `runCampaignTemplateSeed()` ile 60-satır canonical
 * catalog otomatik yüklenir. Owner'ın ilk ziyaretinde admin "Varsayılan
 * içeriği yükle" butonuna basmadan da şablon picker'da satır görünür.
 *
 * Sonraki request'ler `templateCatalogChecked = true` flag'i ile hot path'i
 * 1 query bile koşmaz. Aynı instance'da admin seed unpublish ederse veya
 * tabloyu manuel temizlerse cold-start'a kadar etkili olmaz — kabul edilen
 * trade-off (idempotent operatör tetiği `/api/admin/customer-campaign-templates/seed`
 * her zaman elle koşulabilir).
 */
let templateCatalogChecked = false;

async function ensureCatalogSeeded(): Promise<void> {
  if (templateCatalogChecked) return;
  try {
    const cnt = await prisma.customerCampaignTemplate.count({
      where: { restaurantId: null, isPublished: true },
    });
    if (cnt === 0) {
      await runCampaignTemplateSeed();
    }
  } catch (err) {
    // Seed başarısız olsa bile picker boş satırla render edilebilir; owner
    // "Boş şablonla başla" CTA'sını kullanır. Hata log'da kalır, request
    // bloklanmaz.
    console.warn('[customer-campaign-templates] lazy seed failed', err);
  } finally {
    templateCatalogChecked = true;
  }
}

const VALID_SECTORS = [
  'food',
  'delivery',
  'hospitality',
  'clinic',
  'legal',
  'spa',
  'retail',
  'fitness',
  'education',
  'other',
] as const;

const ListQuerySchema = z.object({
  sector: z.enum(VALID_SECTORS).optional(),
  locale: z.enum(['tr', 'en']).optional(),
  restaurantId: z.string().min(1).optional(),
});

const CreateBodySchema = z
  .object({
    restaurantId: z.string().min(1),
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    sector: z.enum(VALID_SECTORS),
    locale: z.enum(['tr', 'en']),
    category: z.enum(['reactivation', 'special-offer', 'feedback-request', 'custom']),
    subject: z.string().min(1).max(150),
    body: z.string().min(1).max(10000),
    forkedFromId: z.string().min(1).optional(),
  })
  .strict();

type CreateBody = z.infer<typeof CreateBodySchema>;

type TemplatePayload = {
  id: string;
  key: string | null;
  title: string;
  description: string | null;
  sector: string;
  locale: string;
  category: string;
  subject: string;
  body: string;
  isPublished: boolean;
  restaurantId: string | null;
  forkedFromId: string | null;
  isOwn: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
};

function toPayload(
  row: {
    id: string;
    key: string | null;
    title: string;
    description: string | null;
    sector: string;
    locale: string;
    category: string;
    subject: string;
    body: string;
    isPublished: boolean;
    restaurantId: string | null;
    forkedFromId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  scopedIds: string[],
): TemplatePayload {
  const isOwn = row.restaurantId !== null && scopedIds.includes(row.restaurantId);
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    sector: row.sector,
    locale: row.locale,
    category: row.category,
    subject: row.subject,
    body: row.body,
    isPublished: row.isPublished,
    restaurantId: row.restaurantId,
    forkedFromId: row.forkedFromId,
    isOwn,
    isGlobal: row.restaurantId === null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Lazy seed — instance başına 1 kez, tablo boşsa otomatik catalog yükle.
  // CLAUDE.md §38.200: owner şablon picker'ı admin seed butonuna bağımlı
  // olmadan ilk ziyarette dolu görünmeli.
  await ensureCatalogSeeded();

  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds === null) {
    return NextResponse.json({ global: [], own: [] });
  }

  const url = new URL(req.url);
  const queryRaw = {
    sector: url.searchParams.get('sector') ?? undefined,
    locale: url.searchParams.get('locale') ?? undefined,
    restaurantId: url.searchParams.get('restaurantId') ?? undefined,
  };
  const parsed = ListQuerySchema.safeParse(queryRaw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { sector, locale, restaurantId } = parsed.data;

  // Owner filter cross-check (IDOR).
  if (restaurantId && !scopedIds.includes(restaurantId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const globalWhere = {
    restaurantId: null,
    isPublished: true,
    ...(sector ? { sector } : {}),
    ...(locale ? { locale } : {}),
  };
  const ownWhere = {
    restaurantId: restaurantId ? restaurantId : { in: scopedIds.length > 0 ? scopedIds : ['__none__'] },
    ...(sector ? { sector } : {}),
    ...(locale ? { locale } : {}),
  };

  const [globalRows, ownRows] = await prisma.$transaction([
    prisma.customerCampaignTemplate.findMany({
      where: globalWhere,
      orderBy: [{ sector: 'asc' }, { category: 'asc' }, { title: 'asc' }],
      take: 200,
    }),
    prisma.customerCampaignTemplate.findMany({
      where: ownWhere,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
  ]);

  return NextResponse.json(
    {
      global: globalRows.map((r) => toPayload(r, scopedIds)),
      own: ownRows.map((r) => toPayload(r, scopedIds)),
    },
    { headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120' } },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<CreateBody>(CreateBodySchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const access = await canAccessRestaurant(actor, data.restaurantId);
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: { id: true, campaignsEnabled: true },
  });
  if (!restaurant) {
    return NextResponse.json({ error: 'restaurant_not_found' }, { status: 404 });
  }
  if (!restaurant.campaignsEnabled) {
    return NextResponse.json({ error: 'campaigns_disabled' }, { status: 403 });
  }

  // Optional forkedFromId validation — source must exist + be global (we
  // don't allow forking another owner's private template).
  if (data.forkedFromId) {
    const source = await prisma.customerCampaignTemplate.findUnique({
      where: { id: data.forkedFromId },
      select: { id: true, restaurantId: true, isPublished: true },
    });
    if (!source || source.restaurantId !== null || !source.isPublished) {
      return NextResponse.json({ error: 'invalid_fork_source' }, { status: 400 });
    }
  }

  const template = await prisma.customerCampaignTemplate.create({
    data: {
      key: null, // owner templates have no canonical key
      title: data.title.trim(),
      description: data.description?.trim() || null,
      sector: data.sector,
      locale: data.locale,
      category: data.category,
      subject: data.subject.trim(),
      body: data.body,
      isPublished: false, // owner templates are private
      restaurantId: data.restaurantId,
      forkedFromId: data.forkedFromId ?? null,
      createdById: actor.id,
      updatedById: actor.id,
    },
  });

  await writeAdminAuditLog({
    actorId: actor.id,
    actorSource: actor.source,
    action: 'owner.campaign_templates.create',
    targetId: template.id,
    payload: {
      restaurantId: data.restaurantId,
      sector: data.sector,
      category: data.category,
      forkedFromId: data.forkedFromId ?? null,
    },
  }).catch(() => undefined);

  const scopedIds = await getScopedRestaurantIds(actor);
  return NextResponse.json({ template: toPayload(template, scopedIds ?? []) }, { status: 201 });
}
