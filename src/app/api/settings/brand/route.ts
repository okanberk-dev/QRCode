// SCAFFOLDED: Brand identity per restaurant (BrandSettings model).
// Accepts logo data URL / accent color / accent font.
import { scaffoldedResponse, type BrandInput } from '@/lib/scaffolding';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get('restaurantId');
  return Response.json({
    restaurantId,
    logoUrl: null,
    accentColor: null,
    accentFont: null,
  });
}

export async function PUT(req: Request) {
  let body: Partial<BrandInput> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/settings/brand/route.ts', { received: body });
}
