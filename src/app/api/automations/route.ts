// SCAFFOLDED: Automation rules (AutomationRule model).
import { scaffoldedResponse, type AutomationInput } from '@/lib/scaffolding';

export async function GET() {
  return Response.json({ data: [] });
}

export async function POST(req: Request) {
  let body: Partial<AutomationInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/automations/route.ts', { received: body });
}
