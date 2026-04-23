// SCAFFOLDED: Campaign CRUD (Campaign model).
import { scaffoldedResponse, type CampaignInput } from '@/lib/scaffolding';

export async function GET() {
  return Response.json({ data: [] });
}

export async function POST(req: Request) {
  let body: Partial<CampaignInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/campaigns/route.ts', { received: body });
}
