// SCAFFOLDED: onboarding wizard progress (OnboardingProgress model).
// Persist the 4-step completion state per user so refresh/re-visit keeps
// the wizard at the right step.
import { NextRequest } from 'next/server';
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function GET() {
  return Response.json({
    step: 1,
    completed: { profile: false, placement: false, platforms: false, team: false },
    scaffolded: true,
  });
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  return scaffoldedResponse('src/app/api/onboarding/state/route.ts', { received: body });
}
