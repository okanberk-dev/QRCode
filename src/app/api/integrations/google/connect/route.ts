// SCAFFOLDED: Starts Google OAuth (Business Profile scope) and returns
// the consent URL. Wire up with `google-auth-library` or equivalent, and
// persist the returned tokens in `GoogleIntegration`.
import { scaffoldedResponse } from '@/lib/scaffolding';

export async function POST() {
  return scaffoldedResponse('src/app/api/integrations/google/connect/route.ts', {
    nextStep:
      'Replace with redirect to Google OAuth consent URL using client_id, redirect_uri and scopes (e.g. https://www.googleapis.com/auth/business.manage).',
  });
}
