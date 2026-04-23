// SCAFFOLDED: Single-campaign CRUD (Campaign model).
import { scaffoldedResponse, type CampaignInput } from '@/lib/scaffolding';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return Response.json({ id, name: null, placement: null, status: 'draft' });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Partial<CampaignInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/campaigns/[id]/route.ts:PATCH', {
    campaignId: id,
    received: body,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return scaffoldedResponse('src/app/api/campaigns/[id]/route.ts:DELETE', {
    campaignId: id,
  });
}
