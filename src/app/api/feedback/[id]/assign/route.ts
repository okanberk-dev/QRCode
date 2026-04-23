// SCAFFOLDED: Assign a feedback to a team member (FeedbackAssignment).
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { assigneeId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/feedback/[id]/assign/route.ts', {
    feedbackId: id,
    assigneeId: body.assigneeId ?? null,
  });
}
