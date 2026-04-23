// SCAFFOLDED: Single API key revoke / rotate (ApiKey model).
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return scaffoldedResponse('src/app/api/api-keys/[id]/route.ts:DELETE', {
    keyId: id,
  });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // "rotate" sub-action — re-issue token
  const { id } = await params;
  return scaffoldedResponse('src/app/api/api-keys/[id]/route.ts:POST (rotate)', {
    keyId: id,
  });
}
