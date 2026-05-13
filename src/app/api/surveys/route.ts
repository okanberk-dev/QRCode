// Stage 98 — Surveys CRUD (list + create).
//
// IDOR scoping via getScopedRestaurantIds; Zod with .strict() per CLAUDE.md
// §28; slug uniqueness with retry; safe defaults for KVKK / accent.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds, canWriteRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import {
  SURVEY_TYPES,
  SURVEY_QUESTION_TYPES,
  TITLE_MAX,
  DESCRIPTION_MAX,
  THANK_YOU_MAX,
  KVKK_TEXT_MAX,
  QUESTION_TEXT_MAX,
  OPTIONS_MIN,
  OPTIONS_MAX,
  OPTION_TEXT_MAX,
  MAX_QUESTIONS_PER_SURVEY,
  slugifyTitle,
  resolveUniqueSlug,
  validateOptions,
  SURVEY_OWNER_SELECT,
} from '@/lib/surveys';

const QuestionInput = z
  .object({
    text: z.string().min(1).max(QUESTION_TEXT_MAX),
    type: z.enum(SURVEY_QUESTION_TYPES),
    options: z.array(z.string().max(OPTION_TEXT_MAX)).optional(),
    required: z.boolean().optional().default(true),
  })
  .strict();

const CreateBody = z
  .object({
    restaurantId: z.string().min(1),
    type: z.enum(SURVEY_TYPES),
    title: z.string().min(1).max(TITLE_MAX),
    description: z.string().max(DESCRIPTION_MAX).optional().nullable(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Geçersiz renk')
      .optional()
      .nullable(),
    thankYouMessage: z.string().max(THANK_YOU_MAX).optional().nullable(),
    kvkkText: z.string().max(KVKK_TEXT_MAX).optional().nullable(),
    collectMarketingConsent: z.boolean().optional().default(false),
    collectContact: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(false),
    questions: z.array(QuestionInput).min(1).max(MAX_QUESTIONS_PER_SURVEY),
  })
  .strict();

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const restaurantIdParam = searchParams.get('restaurantId');

  const scopedIds = await getScopedRestaurantIds(actor);
  if (!scopedIds || scopedIds.length === 0) {
    return NextResponse.json({ surveys: [] });
  }

  const where: { restaurantId: string | { in: string[] } } = {
    restaurantId: { in: scopedIds },
  };
  if (restaurantIdParam && scopedIds.includes(restaurantIdParam)) {
    where.restaurantId = restaurantIdParam;
  }

  const surveys = await prisma.survey.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      isActive: true,
      isPublished: true,
      publishedAt: true,
      accentColor: true,
      createdAt: true,
      updatedAt: true,
      restaurantId: true,
      restaurant: { select: { id: true, name: true, slug: true } },
      _count: { select: { responses: true, questions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json(
    { surveys },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof CreateBody>>(CreateBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // IDOR: actor must own / manage the target restaurant.
  const canWrite = await canWriteRestaurant(actor, data.restaurantId);
  if (!canWrite) {
    return NextResponse.json({ error: 'Yetkisiz işletme' }, { status: 403 });
  }

  // Per-type question validation (multiple_choice options).
  for (const q of data.questions) {
    if (q.type === 'multiple_choice') {
      const valid = validateOptions(q.options);
      if (!valid) {
        return NextResponse.json(
          {
            error: 'invalid_options',
            message: `Çoktan seçmeli soru için ${OPTIONS_MIN}-${OPTIONS_MAX} seçenek gereklidir.`,
            question: q.text,
          },
          { status: 400 },
        );
      }
    }
  }

  // Tek-soru anket için tam 1 soru zorunlu.
  if (data.type === 'single' && data.questions.length !== 1) {
    return NextResponse.json(
      { error: 'single_requires_one', message: 'Tek soruluk anket için tam 1 soru girin.' },
      { status: 400 },
    );
  }

  // Slug uniqueness — title'dan türet, çakışma varsa suffix ekle.
  const baseSlug = slugifyTitle(data.title);
  const existing = await prisma.survey.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
    take: 200,
  });
  const taken = new Set(existing.map((s) => s.slug));
  const slug = resolveUniqueSlug(baseSlug, taken);

  const survey = await prisma.survey.create({
    data: {
      restaurantId: data.restaurantId,
      slug,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      isActive: true,
      isPublished: !!data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
      accentColor: data.accentColor || null,
      thankYouMessage: data.thankYouMessage?.trim() || null,
      kvkkText: data.kvkkText?.trim() || null,
      collectMarketingConsent: !!data.collectMarketingConsent,
      collectContact: data.collectContact !== false,
      questions: {
        create: data.questions.map((q, idx) => ({
          text: q.text.trim(),
          type: q.type,
          options:
            q.type === 'multiple_choice'
              ? (validateOptions(q.options) as string[])
              : undefined,
          required: q.required ?? true,
          sortOrder: idx * 10,
        })),
      },
    },
    select: SURVEY_OWNER_SELECT,
  });

  return NextResponse.json({ survey }, { status: 201 });
}
