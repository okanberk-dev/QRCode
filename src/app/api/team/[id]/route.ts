// SCAFFOLDED: Single team member CRUD (TeamMember model).
// PATCH = change role / locations / status.
// DELETE = revoke access.
import { scaffoldedResponse, type TeamInviteInput } from '@/lib/scaffolding';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Partial<TeamInviteInput> & { status?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/team/[id]/route.ts:PATCH', {
    memberId: id,
    received: body,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return scaffoldedResponse('src/app/api/team/[id]/route.ts:DELETE', {
    memberId: id,
  });
}
