// Stage 98 — Surveys CRUD (list + create).
//
// IDOR scoping via getScopedRestaurantIds; Zod with .strict() per CLAUDE.md
// §28; slug uniqueness with retry; safe defaults for KVKK / accent.
//
// Phase 1: the survey `type` is derived from the question count (a client
// `type` is still accepted and ignored — when it disagrees with the stored one
// the 201 body carries a `warnings` entry saying so), a coupon code needs a
// description, the write is rate limited and audited, and the list carries the
// time of each survey's latest response.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds, canWriteRestaurant } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { buildSurveyListWhere, listSurveys } from '@/lib/surveys-query';
import {
  SURVEY_TYPES,
  SURVEY_QUESTION_TYPES,
  TITLE_MAX,
  DESCRIPTION_MAX,
  THANK_YOU_MAX,
  QUESTION_TEXT_MAX,
  OPTION_TEXT_MAX,
  MAX_QUESTIONS_PER_SURVEY,
  COUPON_LABEL_REQUIRED_MESSAGE,
  OPTIONS_COUNT_MESSAGE,
  OPTIONS_DUPLICATE_MESSAGE,
  deriveSurveyType,
  isCouponLabelMissing,
  surveyTypeIgnoredWarning,
  validateOptions,
  validateOptionsForWrite,
  SURVEY_OWNER_SELECT,
  type SurveyQuestionType,
} from '@/lib/surveys';
import { createWithUniqueSlug, surveyWriteLimitResponse } from './_shared';
import { withServerTiming } from '@/lib/server-timing';

const QuestionInput = z
  .object({
    text: z.string().trim().min(1).max(QUESTION_TEXT_MAX),
    type: z.enum(SURVEY_QUESTION_TYPES),
    options: z.array(z.string().max(OPTION_TEXT_MAX)).optional(),
    required: z.boolean().optional().default(true),
  })
  .strict();

const CreateBody = z
  .object({
    restaurantId: z.string().min(1),
    // Accepted for old clients and IGNORED: the type is derived from the
    // question count (deriveSurveyType), never chosen. A value that differs from
    // what gets stored is reported back in `warnings` (never silent).
    type: z.enum(SURVEY_TYPES).optional(),
    title: z.string().trim().min(1).max(TITLE_MAX),
    description: z.string().max(DESCRIPTION_MAX).optional().nullable(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Geçersiz renk')
      .optional()
      .nullable(),
    thankYouMessage: z.string().max(THANK_YOU_MAX).optional().nullable(),
    // Stage B — kvkkText + collectMarketingConsent removed from owner UI/API.
    // Public survey form uses Buaze-managed /kvkk + /acik-riza pages (§19.1).
    // Schema columns are kept (deprecated) for backward compat; new rows
    // never write to them.
    collectContact: z.boolean().optional().default(true),
    couponCode: z.string().max(40).optional().nullable(),
    couponLabel: z.string().max(120).optional().nullable(),
    isPublished: z.boolean().optional().default(false),
    questions: z.array(QuestionInput).min(1).max(MAX_QUESTIONS_PER_SURVEY),
  })
  .strict();

async function handleGET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const scopedIds = await getScopedRestaurantIds(actor);
  if (!scopedIds || scopedIds.length === 0) {
    return NextResponse.json({ surveys: [] });
  }

  const surveys = await listSurveys(
    buildSurveyListWhere(scopedIds, searchParams.get('restaurantId')),
  );

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

  const limited = await surveyWriteLimitResponse(actor.id);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof CreateBody>>(CreateBody, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // IDOR: actor must own / manage the target restaurant.
  const canWrite = await canWriteRestaurant(actor, data.restaurantId);
  if (!canWrite) {
    return NextResponse.json({ error: 'Yetkisiz işletme' }, { status: 403 });
  }

  // Admin master switch (feature-access → surveysEnabled). §5.2 pattern:
  // the owner keeps their surveys but cannot create/publish while it is off.
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: { surveysEnabled: true, userId: true },
  });
  if (!restaurant?.surveysEnabled) {
    return NextResponse.json(
      {
        error: 'surveys_disabled',
        message: 'Anketler bu işletme için Buaze yönetimi tarafından kapatıldı.',
      },
      { status: 403 },
    );
  }

  // A coupon code without terms reads like an unconditional offer.
  if (isCouponLabelMissing(data.couponCode, data.couponLabel)) {
    return NextResponse.json(
      { error: 'coupon_label_required', message: COUPON_LABEL_REQUIRED_MESSAGE },
      { status: 400 },
    );
  }

  // Per-type question validation. A new survey has no earlier option list, so
  // the duplicate check (R3) is strict.
  const questions: Array<{
    text: string;
    type: SurveyQuestionType;
    options?: string[];
    required: boolean;
    sortOrder: number;
  }> = [];
  for (const [idx, q] of data.questions.entries()) {
    let options: string[] | undefined;
    if (q.type === 'multiple_choice') {
      const valid = validateOptionsForWrite(q.options);
      if (!valid) {
        return NextResponse.json(
          {
            error: 'invalid_options',
            message: validateOptions(q.options)
              ? OPTIONS_DUPLICATE_MESSAGE
              : OPTIONS_COUNT_MESSAGE,
            question: q.text,
          },
          { status: 400 },
        );
      }
      options = valid;
    }
    questions.push({
      text: q.text,
      type: q.type,
      options,
      required: q.required ?? true,
      sortOrder: idx * 10,
    });
  }

  const survey = await createWithUniqueSlug(data.title, (slug) =>
    prisma.survey.create({
      data: {
        restaurantId: data.restaurantId,
        slug,
        title: data.title,
        description: data.description?.trim() || null,
        type: deriveSurveyType(questions.length),
        isActive: true,
        isPublished: !!data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        accentColor: data.accentColor || null,
        thankYouMessage: data.thankYouMessage?.trim() || null,
        collectContact: data.collectContact !== false,
        couponCode: data.couponCode?.trim() || null,
        couponLabel: data.couponLabel?.trim() || null,
        questions: { create: questions },
      },
      select: SURVEY_OWNER_SELECT,
    }),
  );

  // targetId = the owning user, so the row shows in the owner's own activity
  // log. No title / contact data in the payload (CLAUDE.md §37.7).
  await writePanelAuditLog(actor, 'owner.survey.create', restaurant.userId ?? null, {
    surveyId: survey.id,
    restaurantId: data.restaurantId,
  });

  // Not an error — the survey was created. Tells an old client that picked a
  // `type` what the server stored instead.
  const typeWarning = surveyTypeIgnoredWarning(data.type, deriveSurveyType(questions.length));
  return NextResponse.json(
    typeWarning ? { survey, warnings: [typeWarning] } : { survey },
    { status: 201 },
  );
}

// Server-Timing: auth, db, ratelimit, google, total (CLAUDE.md §56).
export const GET = withServerTiming(handleGET);
