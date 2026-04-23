// SCAFFOLDED: Reply to a feedback. Wire Prisma to persist FeedbackReply
// (see model definition in `src/lib/scaffolding.ts`).
import { scaffoldedResponse, type ReplyInput } from '@/lib/scaffolding';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Partial<ReplyInput> = {};
  try {
    body = (await req.json()) as Partial<ReplyInput>;
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/feedback/[id]/reply/route.ts', {
    feedbackId: id,
    received: body,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Returns empty list until wired. UI must handle 501 or empty shape.
  return Response.json({ feedbackId: id, replies: [] });
}
