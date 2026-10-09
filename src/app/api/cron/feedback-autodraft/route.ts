// CLAUDE.md §X — Reputation OS Suite (Feedback auto-draft safety-net cron).
//
// Feedback POST anında generateAiDraftBackground çağrılır ama bazı durumlarda
// (OpenAI 5xx, network hiccup, feedback POST'tan sonra owner enableAiDraft
// toggle'ı) draft oluşturulmamış olabilir. Bu cron son 48 saatte yanıtlanmamış
// + draft'ı olmayan feedback'leri tarayıp eksikleri tamamlar.
//
// Idempotent: FeedbackAiDraft unique (feedbackId), generateAiDraftBackground
// upsert eder. enableAiDraft + pulseAiEnabled toggle'ları runtime check'lenir.

import { NextRequest, NextResponse } from 'next/server';
import { withCronGuard } from '@/lib/cron-guard';
import { prisma } from '@/lib/prisma';
import { generateAiDraftBackground, type AiDraftTone } from '@/lib/ai-draft';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const LOOK_BACK_HOURS = 48;
const BATCH_SIZE = 200;

interface FeedbackAutoDraftSummary {
  feedbacksChecked: number;
  draftsCreated: number;
  failures: number;
  durationMs: number;
}

export async function runFeedbackAutoDraft(): Promise<FeedbackAutoDraftSummary> {
  const start = Date.now();
  const since = new Date(Date.now() - LOOK_BACK_HOURS * 60 * 60 * 1000);

  // Eligible: son 48h içinde yaratılmış, draft yok, reply yok, restoran
  // toggle açık. Düşük puan filter'ı KASTEN yok — owner istediği akış için
  // toggle var; kullanıcı talebi: "tüm yorumlara taslak hazırla".
  const candidates = await prisma.feedback.findMany({
    where: {
      createdAt: { gte: since },
      restaurant: {
        isActive: true,
        pulseAiEnabled: true,
        enableAiDraft: true,
      },
      aiDraft: null,
      replies: { none: {} },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      restaurant: { select: { aiDraftTone: true } },
    },
  });

  let draftsCreated = 0;
  let failures = 0;

  for (const fb of candidates) {
    try {
      const tone = (fb.restaurant?.aiDraftTone as AiDraftTone | undefined) ?? 'warm';
      await generateAiDraftBackground(fb.id, tone, 'tr');
      draftsCreated += 1;
    } catch (err) {
      failures += 1;
      Sentry.captureException(err, {
        tags: { module: 'feedback-autodraft-cron' },
        extra: { feedbackId: fb.id },
      });
    }
  }

  return {
    feedbacksChecked: candidates.length,
    draftsCreated,
    failures,
    durationMs: Date.now() - start,
  };
}

async function handleCron(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runFeedbackAutoDraft();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[feedback-autodraft] cron failed', err);
    const message = err instanceof Error ? err.message : 'cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withCronGuard('/api/cron/feedback-autodraft', handleCron);
