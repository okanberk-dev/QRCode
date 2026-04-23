// SCAFFOLDED: Single automation rule CRUD (AutomationRule model).
import { scaffoldedResponse, type AutomationInput } from '@/lib/scaffolding';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Partial<AutomationInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/automations/[id]/route.ts:PATCH', {
    ruleId: id,
    received: body,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return scaffoldedResponse('src/app/api/automations/[id]/route.ts:DELETE', {
    ruleId: id,
  });
}
