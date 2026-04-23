// SCAFFOLDED: Tag a feedback (aspect label). Used by the inbox tag
// chips "+ Etiket" button. Expected Prisma schema:
//   model FeedbackTag { id, feedbackId, label, score, createdAt }
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { label?: string; score?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/feedback/[id]/tags/route.ts', {
    feedbackId: id,
    received: body,
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const label = url.searchParams.get('label');
  return scaffoldedResponse('src/app/api/feedback/[id]/tags/route.ts:DELETE', {
    feedbackId: id,
    label,
  });
}
