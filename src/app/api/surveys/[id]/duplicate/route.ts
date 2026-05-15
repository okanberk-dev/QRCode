// Stage 98 — Duplicate a survey (clone questions + settings, fresh slug).
// Useful for owners running an A/B-style follow-up or seasonal variants.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import {
  slugifyTitle,
  resolveUniqueSlug,
  SURVEY_OWNER_SELECT,
} from '@/lib/surveys';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const source = await prisma.survey.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      type: true,
      accentColor: true,
      thankYouMessage: true,
      // Stage B — kvkkText + collectMarketingConsent not selected during
      // duplicate; the copy uses Buaze-managed legal pages (§19.1).
      collectContact: true,
      couponCode: true,
      couponLabel: true,
      restaurantId: true,
      questions: {
        select: { text: true, type: true, options: true, required: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!source) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const canWrite = await canWriteRestaurant(actor, source.restaurantId);
  if (!canWrite) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const newTitle = `${source.title} (kopya)`.slice(0, 140);
  const baseSlug = slugifyTitle(newTitle);
  const existing = await prisma.survey.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
    take: 200,
  });
  const slug = resolveUniqueSlug(baseSlug, new Set(existing.map((s) => s.slug)));

  const created = await prisma.survey.create({
    data: {
      restaurantId: source.restaurantId,
      slug,
      title: newTitle,
      description: source.description,
      type: source.type,
      isPublished: false,
      accentColor: source.accentColor,
      thankYouMessage: source.thankYouMessage,
      collectContact: source.collectContact,
      couponCode: source.couponCode,
      couponLabel: source.couponLabel,
      questions: {
        create: source.questions.map((q) => ({
          text: q.text,
          type: q.type,
          options: q.options ?? undefined,
          required: q.required,
          sortOrder: q.sortOrder,
        })),
      },
    },
    select: SURVEY_OWNER_SELECT,
  });

  return NextResponse.json({ survey: created }, { status: 201 });
}
