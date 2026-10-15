// Stage 98 — Public survey response submission.
//
// CLAUDE.md §37.2.D paterni: hem session hem IP bazlı rate limit; ham
// X-Forwarded-For yerine getClientIp helper'ı. KVKK consent zorunlu
// (action implies consent). Unique (surveyId, sessionId) DB constraint
// duplicate gönderimi engelliyor (P2002 → 409 friendly).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { validateBody } from '@/lib/api/validate';
import {
  SURVEY_QUESTION_TYPES,
  RATING_MIN,
  RATING_MAX,
  NPS_MIN,
  NPS_MAX,
  SHORT_TEXT_MAX,
  LONG_TEXT_MAX,
} from '@/lib/surveys';

const AnswerInput = z
  .object({
    questionId: z.string().min(1),
    textValue: z.string().max(LONG_TEXT_MAX).optional(),
    numberValue: z.number().int().optional(),
    optionValue: z.string().max(200).optional(),
  })
  .strict();

const Body = z
  .object({
    sessionId: z.string().min(8).max(120),
    email: z.string().email().max(200).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    hasKvkkConsent: z.boolean(),
    hasMarketingConsent: z.boolean().optional().default(false),
    answers: z.array(AnswerInput).min(1).max(50),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimit(`survey-submit:ip:${ip}`, 30, 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit', message: 'Çok fazla istek, lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof Body>>(Body, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // KVKK ZORUNLU — action implies consent ama explicit checkbox değerini
  // kayıt için sakla. False → 400.
  if (!data.hasKvkkConsent) {
    return NextResponse.json(
      { error: 'kvkk_required', message: 'KVKK onayı gereklidir.' },
      { status: 400 },
    );
  }

  const sessionLimit = await rateLimit(
    `survey-submit:session:${data.sessionId}`,
    10,
    60 * 1000,
  );
  if (!sessionLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit', message: 'Çok fazla istek.' },
      { status: 429 },
    );
  }

  const survey = await prisma.survey.findUnique({
    where: { slug },
    select: {
      id: true,
      isActive: true,
      isPublished: true,
      collectContact: true,
      // Stage B — collectMarketingConsent gate dropped. Marketing consent is
      // now always submitter-controlled via the public form checkbox tied
      // to Buaze-managed /acik-riza (same as /r/[slug] flow).
      restaurant: { select: { isActive: true, surveysEnabled: true } },
      questions: {
        select: { id: true, type: true, required: true, options: true },
      },
    },
  });
  if (
    !survey ||
    !survey.isActive ||
    !survey.isPublished ||
    !survey.restaurant.isActive ||
    !survey.restaurant.surveysEnabled
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Build a question index for validation.
  const qMap = new Map(survey.questions.map((q) => [q.id, q]));

  // Validate every answer matches a known question + type contract.
  const sanitizedAnswers: Array<{
    questionId: string;
    textValue: string | null;
    numberValue: number | null;
    optionValue: string | null;
  }> = [];

  for (const a of data.answers) {
    const q = qMap.get(a.questionId);
    if (!q) continue; // Silently drop unknown questionId (no fingerprinting).
    if (!(SURVEY_QUESTION_TYPES as readonly string[]).includes(q.type)) continue;

    let textValue: string | null = null;
    let numberValue: number | null = null;
    let optionValue: string | null = null;

    if (q.type === 'rating') {
      if (
        typeof a.numberValue !== 'number' ||
        a.numberValue < RATING_MIN ||
        a.numberValue > RATING_MAX
      ) {
        if (q.required) {
          return NextResponse.json(
            { error: 'invalid_answer', questionId: q.id, expected: 'rating 1-5' },
            { status: 400 },
          );
        }
        continue;
      }
      numberValue = a.numberValue;
    } else if (q.type === 'nps') {
      if (
        typeof a.numberValue !== 'number' ||
        a.numberValue < NPS_MIN ||
        a.numberValue > NPS_MAX
      ) {
        if (q.required) {
          return NextResponse.json(
            { error: 'invalid_answer', questionId: q.id, expected: 'nps 0-10' },
            { status: 400 },
          );
        }
        continue;
      }
      numberValue = a.numberValue;
    } else if (q.type === 'short_text') {
      const v = (a.textValue || '').trim();
      if (!v) {
        if (q.required) {
          return NextResponse.json(
            { error: 'required', questionId: q.id },
            { status: 400 },
          );
        }
        continue;
      }
      textValue = v.slice(0, SHORT_TEXT_MAX);
    } else if (q.type === 'long_text') {
      const v = (a.textValue || '').trim();
      if (!v) {
        if (q.required) {
          return NextResponse.json(
            { error: 'required', questionId: q.id },
            { status: 400 },
          );
        }
        continue;
      }
      textValue = v.slice(0, LONG_TEXT_MAX);
    } else if (q.type === 'multiple_choice') {
      const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
      if (!a.optionValue || !opts.includes(a.optionValue)) {
        if (q.required) {
          return NextResponse.json(
            { error: 'invalid_option', questionId: q.id },
            { status: 400 },
          );
        }
        continue;
      }
      optionValue = a.optionValue;
    }

    sanitizedAnswers.push({
      questionId: q.id,
      textValue,
      numberValue,
      optionValue,
    });
  }

  // Required coverage check — every required question must have an answer.
  const answeredIds = new Set(sanitizedAnswers.map((a) => a.questionId));
  const missing = survey.questions.filter((q) => q.required && !answeredIds.has(q.id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'missing_required', missing: missing.map((q) => q.id) },
      { status: 400 },
    );
  }

  // A survey whose questions are all optional must still carry at least one
  // real answer — an empty response is noise in the results and the counts.
  if (sanitizedAnswers.length === 0) {
    return NextResponse.json({ error: 'no_answers' }, { status: 400 });
  }

  // Sanitize contact fields (CRLF strip) so they can't poison downstream
  // mail / CSV exports (CLAUDE.md §37.2.G).
  const stripCtl = (v: unknown, max = 200): string | null => {
    if (typeof v !== 'string') return null;
    return v.replace(/[\r\n\t]/g, ' ').trim().slice(0, max) || null;
  };

  const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);

  try {
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        sessionId: data.sessionId,
        email: survey.collectContact ? stripCtl(data.email, 200) : null,
        phone: survey.collectContact ? stripCtl(data.phone, 40) : null,
        hasKvkkConsent: true,
        // Stage B — marketing consent flows directly from the submitter's
        // checkbox (Buaze-managed /acik-riza link), not gated by an owner-
        // configured survey field. Mirrors /r/[slug] consent semantics.
        hasMarketingConsent: !!data.hasMarketingConsent,
        completedAt: new Date(),
        ipAddress: ip || null,
        userAgent,
        answers: {
          create: sanitizedAnswers,
        },
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, responseId: response.id }, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      // (surveyId, sessionId) already exists — same session already submitted.
      return NextResponse.json(
        { error: 'already_submitted', message: 'Bu anket zaten yanıtlanmış.' },
        { status: 409 },
      );
    }
    console.error('[Survey submit] failed:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
