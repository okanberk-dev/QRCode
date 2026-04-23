// SCAFFOLDED: Flag a feedback for manual review (FeedbackFlag model).
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/feedback/[id]/flag/route.ts', {
    feedbackId: id,
    reason: body.reason ?? null,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return scaffoldedResponse('src/app/api/feedback/[id]/flag/route.ts:DELETE', {
    feedbackId: id,
  });
}
