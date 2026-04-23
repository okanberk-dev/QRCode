// SCAFFOLDED: Personal access tokens (ApiKey model). Generate the raw
// token server-side and return it ONCE; persist `tokenHash` only.
import { scaffoldedResponse, type ApiKeyInput } from '@/lib/scaffolding';

export async function GET() {
  return Response.json({ data: [] });
}

export async function POST(req: Request) {
  let body: Partial<ApiKeyInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/api-keys/route.ts', { received: body });
}
