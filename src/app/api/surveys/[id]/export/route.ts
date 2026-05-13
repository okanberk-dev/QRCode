// Stage 98 — Survey CSV export. One row per response; columns are
// fixed metadata + one column per question (matrix). Text answers
// CRLF-stripped; quotes escaped (CSV RFC 4180).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant } from '@/lib/panel-access';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
  return /[,";]/.test(str) ? `"${str}"` : str;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const survey = await prisma.survey.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      restaurantId: true,
      collectContact: true,
      questions: {
        select: { id: true, text: true, type: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!survey) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  const hasAccess = await canAccessRestaurant(actor, survey.restaurantId);
  if (!hasAccess) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id },
    select: {
      id: true,
      email: true,
      phone: true,
      hasKvkkConsent: true,
      hasMarketingConsent: true,
      completedAt: true,
      createdAt: true,
      answers: {
        select: {
          questionId: true,
          textValue: true,
          numberValue: true,
          optionValue: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
  });

  const headers = [
    'Yanıt ID',
    'Tarih',
    'Tamamlandı',
    'KVKK',
    'Pazarlama izni',
    ...(survey.collectContact ? ['E-posta', 'Telefon'] : []),
    ...survey.questions.map((q) => q.text),
  ];

  const rows: string[] = [];
  rows.push(headers.map(csvEscape).join(','));

  responses.forEach((r) => {
    const answerMap = new Map<string, string>();
    r.answers.forEach((a) => {
      if (a.numberValue !== null && a.numberValue !== undefined) {
        answerMap.set(a.questionId, String(a.numberValue));
      } else if (a.optionValue) {
        answerMap.set(a.questionId, a.optionValue);
      } else if (a.textValue) {
        answerMap.set(a.questionId, a.textValue);
      }
    });
    const baseRow: (string | number | null | boolean)[] = [
      r.id,
      r.createdAt.toISOString(),
      r.completedAt ? 'Evet' : 'Hayır',
      r.hasKvkkConsent ? 'Evet' : 'Hayır',
      r.hasMarketingConsent ? 'Evet' : 'Hayır',
    ];
    if (survey.collectContact) {
      baseRow.push(r.email || '', r.phone || '');
    }
    survey.questions.forEach((q) => {
      baseRow.push(answerMap.get(q.id) ?? '');
    });
    rows.push(baseRow.map(csvEscape).join(','));
  });

  // BOM for Excel UTF-8 friendliness.
  const csv = '﻿' + rows.join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="anket-${survey.slug}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
